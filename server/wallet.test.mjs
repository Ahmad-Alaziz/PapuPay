import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, X509Certificate } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { crc32, gzipSync } from "node:zlib";
import { buildPassArchive, buildStorePassFiles, signManifest, storePassDocument } from "./wallet.mjs";

const openssl = promisify(execFile);
const brand = { id: "berry-counter", name: "Berry Counter", theme: { ink: "#64344e", background: "#fff8fb", accent: "#98546d" } };
const card = { checkout: "pp_fixture_checkout_identifier", code: "TESTCARD", stamps: 2, goal: 6 };
const config = { passTypeId: "pass.test.papupay", teamId: "TESTTEAM01", origin: "https://example.test" };

test("the Papupay Wallet pass shows progress and venue identity with the original checkout code", () => {
  const pass = storePassDocument(brand, card, config);
  assert.equal(pass.organizationName, "Papupay");
  assert.equal(Object.hasOwn(pass, "logoText"), false);
  assert.equal(pass.description, "Papupay loyalty card · Berry Counter");
  assert.equal(pass.backgroundColor, "rgb(16, 46, 36)");
  assert.equal(pass.storeCard.primaryFields, undefined);
  assert.deepEqual(pass.storeCard.secondaryFields, [
    { key: "venue", label: "Collect at", value: brand.name },
    { key: "remaining", label: "Reward in", value: "4 stamps" },
  ]);
  assert.deepEqual(pass.barcodes[0], {
    format: "PKBarcodeFormatQR", message: card.checkout, messageEncoding: "iso-8859-1", altText: card.code,
  });
  assert.equal(pass.storeCard.backFields[1].value, "https://example.test/v/berry-counter/card");
  assert.equal(pass.storeCard.backFields.find(({ key }) => key === "balanceSource").label, "Balance when saved");
  assert.equal(pass.serialNumber, storePassDocument(brand, { ...card, stamps: 3 }, config).serialNumber);
  assert.notEqual(pass.serialNumber, storePassDocument({ ...brand, id: "forest-counter" }, card, config).serialNumber);
  assert.equal(pass.sharingProhibited, undefined);
  const recovery = storePassDocument(brand, card, config, { recoveryUrl: "https://example.test/v/berry-counter/restore#token=fixture" });
  assert.equal(recovery.sharingProhibited, true);
  assert.match(recovery.storeCard.backFields[1].attributedValue, /#token=fixture/);
  const live = storePassDocument(brand, card, config, {
    webServiceURL: "https://example.test/api/v/berry-counter/wallet", authenticationToken: "fixture",
  });
  assert.equal(live.authenticationToken, "fixture");
  assert.equal(live.storeCard.backFields.find(({ key }) => key === "balanceSource").label, "Live balance");
  assert.equal(live.serialNumber, pass.serialNumber);
  assert.equal(storePassDocument(brand, { ...card, stamps: 0, goal: 9 }, config).storeCard.secondaryFields[1].value, "9 stamps");
  assert.equal(storePassDocument(brand, { ...card, stamps: 8, goal: 9 }, config).storeCard.secondaryFields[1].value, "1 stamp");
  assert.deepEqual(storePassDocument(brand, { ...card, stamps: 9, goal: 9 }, config).storeCard.secondaryFields[1],
    { key: "reward", label: "Reward", value: "Ready" });
});

test("Wallet bundles native-size artwork and localized terms and recovery links", async () => {
  const recoveryUrl = "https://example.test/v/berry-counter/restore#token=fixture";
  const files = await buildStorePassFiles(brand, card, config, { recoveryUrl });
  for (const [image, width, height] of [["icon", 38, 38], ["logo", 160, 50], ["strip", 375, 144]]) {
    for (const scale of [1, 2, 3]) {
      const png = files.get(`${image}${scale === 1 ? "" : `@${scale}x`}.png`);
      assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(png.readUInt32BE(16), width * scale);
      assert.equal(png.readUInt32BE(20), height * scale);
    }
  }
  const polish = files.get("pl.lproj/pass.strings").toString("utf16le");
  assert.match(polish, /"Reward in" = "Do nagrody"/);
  assert.match(polish, /"4 stamps" = "4 pieczątki"/);
  assert.match(polish, /"Balance when saved" = "Stan przy zapisie"/);
  assert.match(polish, /Karta lojalnościowa Papupay · Berry Counter/);
  assert.ok(polish.includes(JSON.stringify(`<a href="${recoveryUrl}">Otwórz kartę lojalnościową</a>`)));
  assert.ok(files.get("en.lproj/pass.strings"));
  assert.match(files.get("ru.lproj/pass.strings").toString("utf16le"), /"Reward in" = "До награды"/);
});

test("only updatable Sweeto passes announce their actual stamp balance", async () => {
  const sweeto = { id: "sweeto", name: "Sweeto" };
  const live = { webServiceURL: "https://example.test/", authenticationToken: "fixture" };
  for (const stamps of [0, 1, 6]) {
    const pass = storePassDocument(sweeto, { ...card, goal: 6, stamps }, config, live);
    assert.deepEqual(pass.storeCard.headerFields, [{
      key: "stamps", label: "Stamp balance", value: `${stamps} / 6`, changeMessage: "Stamp balance: %@.",
    }]);
    assert.ok(!pass.storeCard.backFields.some(({ key }) => key === "stamps"));
  }
  const files = await buildStorePassFiles(sweeto, card, config, live);
  for (const [lang, message] of [["pl", "Stan pieczątek: %@."], ["ru", "Отметки: %@."]]) {
    assert.ok(files.get(`${lang}.lproj/pass.strings`).toString("utf16le").includes(`"Stamp balance: %@." = "${message}"`));
  }
  for (const pass of [storePassDocument(sweeto, card, config),
    storePassDocument(sweeto, card, config, { ...live, offlineDemo: true }), storePassDocument(brand, card, config, live)]) {
    assert.equal(pass.storeCard.headerFields, undefined);
    assert.ok(!JSON.stringify(pass).includes("changeMessage"));
  }
});

test("offline demo passes keep their identity and fit the TestFlight bundle", async () => {
  const sweeto = { id: "sweeto", name: "Sweeto" };
  const passes = [];
  const strips = new Set();
  const certificateFixture = createHash("shake256", { outputLength: 3000 }).update("shared certificate chain").digest();
  const [sweetoLogo, sweetoIcon] = await Promise.all(["logo", "icon"].map((name) =>
    readFile(new URL(`./wallet-assets/sweeto-${name}@2x.png`, import.meta.url))));
  for (let stamps = 0; stamps <= 6; stamps += 1) {
    const files = await buildStorePassFiles(sweeto, { ...card, stamps }, config, {
      offlineDemo: true, serialNumber: "fixture-demo", webServiceURL: "https://example.test/", authenticationToken: "fixture",
    });
    const demo = JSON.parse(files.get("pass.json"));
    assert.equal(demo.organizationName, "Sweeto");
    assert.equal(demo.description, "Sweeto · Demo card");
    assert.equal(demo.backgroundColor, "rgb(16, 46, 36)");
    assert.equal(demo.labelColor, "rgb(255, 122, 56)");
    assert.deepEqual(demo.storeCard.secondaryFields[0], { key: "checkout", label: "At checkout", value: "Show this code" });
    assert.equal(demo.storeCard.backFields.at(-1).label, "Papupay support");
    assert.equal(demo.serialNumber, "fixture-demo");
    assert.equal(demo.barcodes[0].message, card.checkout);
    assert.equal(demo.storeCard.backFields.find(({ key }) => key === "stamps").value, `${stamps} / 6`);
    assert.equal(demo.storeCard.secondaryFields[1].key, stamps < 6 ? "remaining" : "reward");
    assert.equal(demo.webServiceURL, undefined);
    assert.equal(demo.authenticationToken, undefined);
    assert.equal(demo.sharingProhibited, true);
    assert.equal(Object.hasOwn(demo, "logoText"), false);
    const polish = files.get("pl.lproj/pass.strings").toString("utf16le");
    assert.match(polish, /"Sweeto · Demo card" = "Sweeto · Karta demo"/);
    assert.match(polish, /"Show this code" = "Pokaż ten kod"/);
    const logo = files.get("logo@2x.png");
    assert.deepEqual(logo, sweetoLogo);
    assert.deepEqual(files.get("icon@2x.png"), sweetoIcon);
    assert.equal(logo.readUInt32BE(16), 320);
    assert.equal(logo.readUInt32BE(20), 100);
    strips.add(createHash("sha256").update(files.get("strip@2x.png")).digest("hex"));
    const archive = await buildPassArchive(files, async (manifest) => Buffer.concat([
      certificateFixture, createHash("sha256").update(manifest).digest(),
    ]), { compress: true });
    assert.ok(archive.length <= 50 * 1024);
    passes.push(archive);
  }
  assert.equal(strips.size, 7);
  assert.ok(gzipSync(Buffer.concat(passes)).toString("base64").length < 48 * 1024);
});

test("ZIP package hashes exactly the source files and passes the same manifest to the signer", async () => {
  const pass = Buffer.from('{"formatVersion":1}');
  const icon = Buffer.from("fake-icon-for-archive-test");
  const source = new Map([["pass.json", pass], ["icon.png", icon]]);
  let signed;
  const signature = Buffer.from([0x30, 0x00]);
  const zip = await buildPassArchive(source, async (manifest) => {
    signed = manifest;
    return signature;
  });
  const entries = new Map();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const size = zip.readUInt32LE(offset + 18);
    const length = zip.readUInt16LE(offset + 26);
    const name = zip.subarray(offset + 30, offset + 30 + length).toString();
    const data = zip.subarray(offset + 30 + length, offset + 30 + length + size);
    assert.equal(zip.readUInt32LE(offset + 14), crc32(data));
    entries.set(name, data);
    offset += 30 + length + size;
  }
  assert.equal(zip.readUInt32LE(offset), 0x02014b50);
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
  assert.deepEqual(entries.get("pass.json"), pass);
  assert.deepEqual(entries.get("icon.png"), icon);
  assert.deepEqual(entries.get("manifest.json"), signed);
  assert.deepEqual(entries.get("signature"), signature);
  assert.deepEqual(JSON.parse(signed), Object.fromEntries([...source].map(([name, data]) => [name, createHash("sha1").update(data).digest("hex")])));
});

test("the Wallet signature independently verifies as detached DER against its manifest", async (t) => {
  try { await openssl("openssl", ["version"]); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    t.skip("OpenSSL is unavailable on this test machine");
    return;
  }
  const directory = await mkdtemp(join(tmpdir(), "papupay-wallet-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const keyPath = join(directory, "fixture.key");
  const certPath = join(directory, "fixture.pem");
  const dataPath = join(directory, "manifest.json");
  const sigPath = join(directory, "signature");
  await openssl("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj",
    "/CN=PapuPay Signing Test", "-keyout", keyPath, "-out", certPath]);
  const certificate = new X509Certificate(await readFile(certPath));
  const key = await readFile(keyPath);
  const manifest = Buffer.from('{"pass.json":"fixture"}');
  const signature = await signManifest({ openssl: "openssl" }, { certificate, key, wwdr: certificate }, manifest);
  await Promise.all([writeFile(dataPath, manifest), writeFile(sigPath, signature)]);
  const verified = await openssl("openssl", ["smime", "-verify", "-binary", "-inform", "DER", "-in", sigPath,
    "-content", dataPath, "-noverify"], { encoding: "buffer" });
  assert.deepEqual(verified.stdout, manifest);
  await writeFile(dataPath, '{"pass.json":"modified"}');
  await assert.rejects(openssl("openssl", ["smime", "-verify", "-binary", "-inform", "DER", "-in", sigPath,
    "-content", dataPath, "-noverify"]));
});
