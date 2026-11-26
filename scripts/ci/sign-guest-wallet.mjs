import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildPassArchive, buildStorePassFiles, createWalletSigner } from "../../server/wallet.mjs";
import { loadVenues, venueRegistry } from "../../server/venues.mjs";

async function main() {
  const directory = process.argv[2];
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const { cardCode, checkout, serialNumber, passTypeIdentifier, teamIdentifier } = JSON.parse(input);
  const validIdentity = (value) => typeof value === "string" && value.length > 0 && value.length <= 240;
  if (!directory || !validIdentity(cardCode) || !validIdentity(checkout) ||
      (serialNumber !== undefined && (!validIdentity(serialNumber) || serialNumber.length > 128))) {
    throw new Error("An enabled demo identity and output directory are required.");
  }
  const signatureDirectory = process.argv[3] === "--signatures" ? process.argv[4] : undefined;
  const origin = "https://papupay.com";
  const signer = signatureDirectory ? undefined : createWalletSigner({ ...process.env, PAPUPAY_WALLET_ORIGIN: origin });
  try {
    if (signer && !await signer.available()) throw new Error("Configure a valid Apple Wallet signing certificate first.");
    if (signer && serialNumber && (passTypeIdentifier !== signer.passTypeId || teamIdentifier !== process.env.PAPUPAY_WALLET_TEAM_ID)) {
      throw new Error("The signing certificate must match the existing demo pass identity.");
    }
    const { brand } = venueRegistry(loadVenues()).get("sweeto");
    for (let stamps = 0; stamps <= 6; stamps += 1) {
      const card = { code: cardCode, checkout, stamps, goal: 6 };
      const profile = {
        offlineDemo: true, serialNumber,
        recoveryUrl: `${origin}/v/sweeto/restore#demo=sweeto-testflight-v1.${stamps}`,
      };
      let pass;
      if (signer) {
        pass = await signer.issue(brand, card, profile);
      } else {
        const files = await buildStorePassFiles(brand, card, { origin, passTypeId: passTypeIdentifier, teamId: teamIdentifier }, profile);
        pass = await buildPassArchive(files, () => readFile(join(signatureDirectory, `${stamps}.der`)), { compress: true });
      }
      if (!pass) throw new Error("Unable to generate the demo pass.");
      await writeFile(join(directory, `${stamps}.pkpass`), pass, { flag: "wx", mode: 0o600 });
    }
  } finally {
    signer?.close();
  }
}

try {
  await main();
} catch (error) {
  // Signing commands and their diagnostic output can contain credential paths.
  const messages = new Set([
    "An enabled demo identity and output directory are required.",
    "Configure a valid Apple Wallet signing certificate first.",
    "The signing certificate must match the existing demo pass identity.",
    "A demo pass could not be signed within its size limit.",
  ]);
  console.error(messages.has(error.message) ? error.message : "Unable to sign the demo passes.");
  process.exitCode = 1;
}
