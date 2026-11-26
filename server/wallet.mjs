import { execFile } from "node:child_process";
import { createHash, createPublicKey, X509Certificate } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { deflateRawSync } from "node:zlib";
import { createApnsSender } from "./wallet-apns.mjs";
import { renderStampSheet } from "./wallet.stamp-sheet.mjs";

const run = promisify(execFile);
const artworkFiles = ["icon", "logo", "strip"].flatMap((slot) => (
  ["", "@2x", "@3x"].map((scale) => `${slot}${scale}.png`)
));
const demoArtworkFiles = artworkFiles.filter((name) => !name.endsWith("@3x.png"));
const walletPalettes = {
  classic: { paper: "#fff9ee", body: "#102e24", label: "#ff9b66" },
  sweeto: { paper: "#fff6e6", body: "#102e24", label: "#ff7a38" },
};
const supportUrl = "https://papupay.com/#contact";
// Apple publishes WWDR G4 as the Wallet Pass Type ID issuing CA.
const wwdrG4Fingerprint = "EA:47:57:88:55:38:DD:8C:B5:9F:F4:55:6F:67:60:87:D8:3C:85:E7:09:02:C1:22:E4:2C:08:08:B5:BC:E1:4C";
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value;
});

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

// Offline passes need compact ZIP entries so consecutive states share a gzip window.
function zipFiles(files, compress) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [path, content] of files) {
    const name = Buffer.from(path);
    const checksum = crc32(content);
    // Let the enclosing demo gzip find the shared certificate and strip data across states.
    const deflated = compress && path !== "signature" && !path.startsWith("strip")
      ? deflateRawSync(content) : content;
    const compression = deflated.length < content.length ? 8 : 0;
    const packed = compression ? deflated : content;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(compression, 8);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(packed.length, 18);
    header.writeUInt32LE(content.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, packed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(compression, 10);
    entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(checksum, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(content.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + packed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

export async function buildPassArchive(sourceFiles, detachedSignature, { compress = false } = {}) {
  const files = new Map(sourceFiles);
  const hashes = Object.fromEntries([...files].map(([path, data]) => [path, createHash("sha1").update(data).digest("hex")]));
  const manifest = Buffer.from(JSON.stringify(hashes));
  files.set("manifest.json", manifest);
  files.set("signature", await detachedSignature(manifest));
  return zipFiles(files, compress);
}

function rgb(hex) {
  return `rgb(${[1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)).join(", ")})`;
}

export function walletSerial(brand, card) {
  const serial = createHash("sha256").update(`${brand.id}:${card.checkout}`).digest("hex").slice(0, 32);
  return `${brand.id}-${serial}`;
}

export function publicHttpsOrigin(value) {
  try {
    const url = new URL(value);
    const domain = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash
      || !domain.includes(".") || /\.(?:localhost|local|internal)$/.test(domain) || isIP(domain)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function passLink(url, text) {
  const href = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<a href="${href}">${text}</a>`;
}

function passTitle(brand, demo, translations = {}) {
  if (brand.id === "sweeto") {
    const type = demo ? "Demo card" : "Loyalty card";
    return `${brand.name} · ${translations[type] ?? type}`;
  }
  const type = demo ? "Papupay demo card" : "Papupay loyalty card";
  return `${translations[type] ?? type} · ${brand.name}`;
}

export function storePassDocument(brand, card, { passTypeId, teamId, origin }, profile = {}) {
  const cardUrl = new URL(`/v/${brand.id}/card`, origin);
  const demo = profile.offlineDemo === true;
  const isSweeto = brand.id === "sweeto";
  const palette = isSweeto ? walletPalettes.sweeto : walletPalettes.classic;
  const liveUpdates = !demo && Boolean(profile.webServiceURL && profile.authenticationToken);
  const remaining = Math.max(0, card.goal - card.stamps);
  const next = remaining
    ? { key: "remaining", label: "Reward in", value: stampCount(remaining) }
    : { key: "reward", label: "Reward", value: "Ready" };
  const webLink = profile.recoveryUrl ? {
    key: "website", label: "Restore your card", value: "Open loyalty card",
    attributedValue: passLink(profile.recoveryUrl, "Open loyalty card"),
  } : { key: "website", label: "Browser card", value: cardUrl.href };
  const stampBalance = { key: "stamps", label: "Stamp balance", value: `${card.stamps} / ${card.goal}` };
  const notifyBalance = isSweeto && liveUpdates;
  const firstField = isSweeto
    ? { key: "checkout", label: "At checkout", value: "Show this code" }
    : { key: "venue", label: "Collect at", value: brand.name };
  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    teamIdentifier: teamId,
    serialNumber: (demo && profile.serialNumber) || walletSerial(brand, card),
    organizationName: isSweeto ? brand.name : "Papupay",
    description: passTitle(brand, demo),
    foregroundColor: rgb(palette.paper),
    backgroundColor: rgb(palette.body),
    labelColor: rgb(palette.label),
    ...(brand.walletLocation ? {
      locations: [{ ...brand.walletLocation, relevantText: "You can collect stamps here." }],
    } : {}),
    ...(demo || profile.recoveryUrl ? { sharingProhibited: true } : {}),
    ...(liveUpdates ? {
      webServiceURL: profile.webServiceURL, authenticationToken: profile.authenticationToken,
    } : {}),
    barcodes: [{ format: "PKBarcodeFormatQR", message: card.checkout, messageEncoding: "iso-8859-1", altText: card.code }],
    storeCard: {
      ...(notifyBalance ? { headerFields: [{ ...stampBalance, changeMessage: "Stamp balance: %@." }] } : {}),
      secondaryFields: [firstField, next],
      backFields: [
        ...(demo ? [{ key: "instructions", label: "TestFlight demo", value: "Use this card to try the checkout flow." }] : [
          { key: "instructions", label: "At checkout", value: "Show this QR code to collect stamps or redeem your reward." },
          webLink,
        ]),
        ...(notifyBalance ? [] : [stampBalance]),
        {
          key: "balanceSource",
          label: liveUpdates ? "Live balance" : "Balance when saved",
          value: liveUpdates
            ? "Stamp progress updates automatically in Wallet."
            : demo
              ? "Add this pass again after collecting a stamp or claiming a reward to update it."
              : "Open your browser card for the latest progress or download an updated pass.",
        },
        { key: "code", label: "Card code", value: card.code },
        { key: "support", label: "Papupay support", value: supportUrl },
      ],
    },
  };
}

const translations = {
  en: {},
  pl: {
    "You can collect stamps here.": "Tu możesz zbierać pieczątki.",
    "Loyalty card": "Karta lojalnościowa",
    "Demo card": "Karta demo",
    "Papupay loyalty card": "Karta lojalnościowa Papupay",
    "Papupay demo card": "Karta demonstracyjna Papupay",
    "TestFlight demo": "Demo TestFlight",
    "Use this card to try the checkout flow.": "Użyj tej karty, aby przetestować obsługę przy kasie.",
    "Collect at": "Zbieraj w",
    "Reward in": "Do nagrody",
    "Reward": "Nagroda",
    "Ready": "Gotowa",
    "Stamp balance": "Liczba pieczątek",
    "Stamp balance: %@.": "Stan pieczątek: %@.",
    "Live balance": "Aktualne pieczątki",
    "Balance when saved": "Stan przy zapisie",
    "Stamp progress updates automatically in Wallet.": "Liczba pieczątek aktualizuje się automatycznie w Portfelu.",
    "Add this pass again after collecting a stamp or claiming a reward to update it.": "Dodaj kartę ponownie po zebraniu pieczątki lub odebraniu nagrody, aby ją zaktualizować.",
    "Open your browser card for the latest progress or download an updated pass.": "Sprawdź aktualną liczbę pieczątek w przeglądarce lub pobierz kartę ponownie.",
    "At checkout": "Przy kasie",
    "Show this code": "Pokaż ten kod",
    "Show this QR code to collect stamps or redeem your reward.": "Pokaż ten kod QR, aby zebrać pieczątki lub odebrać nagrodę.",
    "Browser card": "Karta w przeglądarce",
    "Restore your card": "Odzyskaj kartę",
    "Open loyalty card": "Otwórz kartę lojalnościową",
    "Card code": "Kod karty",
    "Papupay support": "Pomoc Papupay",
  },
  ru: {
    "You can collect stamps here.": "Здесь можно получить отметку.",
    "Loyalty card": "Карта лояльности",
    "Demo card": "Пробная карта",
    "Papupay loyalty card": "Карта лояльности Papupay",
    "Papupay demo card": "Пробная карта Papupay",
    "TestFlight demo": "Демо TestFlight",
    "Use this card to try the checkout flow.": "Используйте эту карту, чтобы проверить обслуживание на кассе.",
    "Collect at": "Где собирать",
    "Reward in": "До награды",
    "Reward": "Награда",
    "Ready": "Готова",
    "Stamp balance": "Количество отметок",
    "Stamp balance: %@.": "Отметки: %@.",
    "Live balance": "Актуальные отметки",
    "Balance when saved": "Отметки при сохранении",
    "Stamp progress updates automatically in Wallet.": "Количество отметок обновляется в Wallet автоматически.",
    "Add this pass again after collecting a stamp or claiming a reward to update it.": "Добавьте карту снова после получения отметки или награды, чтобы обновить её.",
    "Open your browser card for the latest progress or download an updated pass.": "Проверьте актуальные отметки в браузере или скачайте обновлённую карту.",
    "At checkout": "На кассе",
    "Show this code": "Покажите код",
    "Show this QR code to collect stamps or redeem your reward.": "Покажите этот QR-код, чтобы получить отметки или забрать награду.",
    "Browser card": "Карта в браузере",
    "Restore your card": "Восстановить карту",
    "Open loyalty card": "Открыть карту лояльности",
    "Card code": "Код карты",
    "Papupay support": "Поддержка Papupay",
  },
};

const stampWords = {
  en: { one: "stamp", other: "stamps" },
  pl: { one: "pieczątka", few: "pieczątki", other: "pieczątek" },
  ru: { one: "отметка", few: "отметки", other: "отметок" },
};

function stampCount(count, language = "en") {
  const words = stampWords[language];
  const form = new Intl.PluralRules(language).select(count);
  return `${count} ${words[form] ?? words.other}`;
}

export async function buildStorePassFiles(brand, card, config, profile = {}) {
  const pass = storePassDocument(brand, card, config, profile);
  const isSweeto = brand.id === "sweeto";
  const images = await Promise.all((profile.offlineDemo ? demoArtworkFiles : artworkFiles).map(async (name) => {
    if (name.startsWith("strip")) {
      const scale = Number(name.match(/@(\d)x/)?.[1] ?? 1);
      return [name, renderStampSheet(card, scale, isSweeto ? "sweeto" : "classic")];
    }
    const file = isSweeto ? `sweeto-${name}` : name;
    return [name, await readFile(new URL(`./wallet-assets/${file}`, import.meta.url))];
  }));
  const files = new Map([["pass.json", Buffer.from(JSON.stringify(pass))], ...images]);
  const remaining = Math.max(0, card.goal - card.stamps);
  const fields = [...(pass.storeCard.headerFields ?? []), ...pass.storeCard.secondaryFields, ...pass.storeCard.backFields];
  for (const [language, values] of Object.entries(translations)) {
    const localized = { [pass.description]: passTitle(brand, profile.offlineDemo === true, values) };
    for (const { relevantText } of pass.locations ?? []) localized[relevantText] = values[relevantText] ?? relevantText;
    for (const { label, value, changeMessage } of fields) {
      if (changeMessage && Object.hasOwn(values, changeMessage)) localized[changeMessage] = values[changeMessage];
      if (Object.hasOwn(values, label)) localized[label] = values[label];
      if (Object.hasOwn(values, value)) localized[value] = values[value];
    }
    if (remaining > 0) localized[stampCount(remaining)] = stampCount(remaining, language);
    if (!profile.offlineDemo && profile.recoveryUrl) {
      const linkText = values["Open loyalty card"] ?? "Open loyalty card";
      localized[passLink(profile.recoveryUrl, "Open loyalty card")] = passLink(profile.recoveryUrl, linkText);
    }
    const strings = Object.entries(localized)
      .map(([key, value]) => `${JSON.stringify(key)} = ${JSON.stringify(value)};`)
      .join("\n");
    files.set(`${language}.lproj/pass.strings`, Buffer.from("\uFEFF" + strings + "\n", "utf16le"));
  }
  return files;
}

async function withTempFolder(work) {
  const temp = await mkdtemp(join(tmpdir(), "papupay-wallet-"));
  try { return await work(temp); }
  finally { await rm(temp, { recursive: true, force: true }); }
}

function current(certificate) {
  const now = Date.now();
  return now >= Date.parse(certificate.validFrom) && now <= Date.parse(certificate.validTo);
}

function walletConfiguration(env) {
  const passTypeId = env.PAPUPAY_WALLET_PASS_TYPE_ID;
  const teamId = env.PAPUPAY_WALLET_TEAM_ID;
  const p12 = env.PAPUPAY_WALLET_P12_PATH;
  const wwdr = env.PAPUPAY_WALLET_WWDR_PATH;
  if (!/^pass\.[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(passTypeId ?? "") || !/^[A-Z0-9]{10}$/.test(teamId ?? "") || !p12 || !wwdr) return null;

  try {
    const url = new URL(env.PAPUPAY_WALLET_ORIGIN || "https://papupay.com");
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return {
      passTypeId, teamId, p12, wwdr, origin: url.origin,
      openssl: env.PAPUPAY_WALLET_OPENSSL || "openssl",
      p12Password: env.PAPUPAY_WALLET_P12_PASSWORD ?? "",
    };
  } catch {
    return null;
  }
}

function openssl(config, args, password) {
  return run(config.openssl, args, {
    env: { PATH: process.env.PATH, ...(password === undefined ? {} : { PAPUPAY_PKPASS_PASSWORD: password }) },
    timeout: 10_000,
    maxBuffer: 65_536,
    windowsHide: true,
  });
}

async function loadSigningMaterial(config) {
  return withTempFolder(async (temp) => {
    const certificatePath = join(temp, "signer.pem");
    const keyPath = join(temp, "key.pem");
    const extract = async (flags) => {
      const common = ["pkcs12", ...flags, "-in", config.p12, "-passin", "env:PAPUPAY_PKPASS_PASSWORD"];
      const results = await Promise.allSettled([
        openssl(config, [...common, "-clcerts", "-nokeys", "-out", certificatePath], config.p12Password),
        openssl(config, [...common, "-nocerts", "-nodes", "-out", keyPath], config.p12Password),
      ]);
      if (results.some(({ status }) => status === "rejected")) throw new Error("Pass credential extraction failed");
    };
    try { await extract([]); }
    catch { await extract(["-legacy"]); }

    const [pem, key, wwdrFile] = await Promise.all([readFile(certificatePath), readFile(keyPath), readFile(config.wwdr)]);
    const certificate = new X509Certificate(pem);
    const wwdr = new X509Certificate(wwdrFile);
    const subject = certificate.subject.split("\n");
    const hasPassType = ["UID", "userId", "0.9.2342.19200300.100.1.1"].some((name) => subject.includes(`${name}=${config.passTypeId}`));
    const hasTeam = subject.includes(`OU=${config.teamId}`);
    const chainLooksCorrect = wwdr.ca && wwdr.fingerprint256 === wwdrG4Fingerprint && certificate.checkIssued(wwdr);
    const publicKey = (value) => value.export({ type: "spki", format: "der" });
    if (!hasPassType || !hasTeam || !chainLooksCorrect || !certificate.verify(wwdr.publicKey)
      || !publicKey(certificate.publicKey).equals(publicKey(createPublicKey(key)))) return null;
    return { certificate, key, wwdr };
  });
}

export async function signManifest(config, material, manifest) {
  return withTempFolder(async (temp) => {
    const files = {
      manifest: join(temp, "manifest.json"), signer: join(temp, "signer.pem"),
      key: join(temp, "key.pem"), wwdr: join(temp, "wwdr.pem"), signature: join(temp, "signature"),
    };
    await Promise.all([
      writeFile(files.manifest, manifest, { mode: 0o600 }),
      writeFile(files.signer, material.certificate.toString(), { mode: 0o600 }),
      writeFile(files.key, material.key, { mode: 0o600 }),
      writeFile(files.wwdr, material.wwdr.toString(), { mode: 0o600 }),
    ]);
    await openssl(config, ["smime", "-sign", "-binary", "-in", files.manifest, "-signer", files.signer,
      "-inkey", files.key, "-certfile", files.wwdr, "-outform", "DER", "-out", files.signature]);
    return readFile(files.signature);
  });
}

export function createWalletSigner(env) {
  const config = walletConfiguration(env);
  const updateOrigin = config ? publicHttpsOrigin(env.PAPUPAY_WALLET_WEBSERVICE_ORIGIN) : null;
  let signingMaterial;
  async function material() {
    if (!config) return null;
    signingMaterial ??= loadSigningMaterial(config).catch(() => null);
    const signer = await signingMaterial;
    return signer && current(signer.certificate) && current(signer.wwdr) ? signer : null;
  }
  const push = createApnsSender(material);
  return {
    passTypeId: config?.passTypeId,
    updateOrigin,
    deliver: push.send,
    close: push.close,
    async available() { return Boolean(await material()); },
    async issue(brand, card, profile) {
      const signer = await material();
      if (!signer) return null;
      const files = await buildStorePassFiles(brand, card, config, profile);
      return buildPassArchive(files, (manifest) => signManifest(config, signer, manifest), { compress: profile?.offlineDemo === true });
    },
  };
}
