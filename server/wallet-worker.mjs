import { existsSync } from "node:fs";
import { createDatabase } from "./postgres.mjs";
import { loadVenues, venueRegistry } from "./venues.mjs";
import { openLoyalty } from "./loyalty.mjs";
import { startWalletWorker } from "./wallet-apns.mjs";
import { createWalletSigner } from "./wallet.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const env = process.env;
const wallet = createWalletSigner(env);
if (!wallet.updateOrigin || !await wallet.available()) {
  wallet.close();
  throw new Error("Configure Apple Wallet signing and the public Wallet Web Service URL before starting the worker.");
}
const database = createDatabase(env.DATABASE_URL);
const venues = [...venueRegistry(loadVenues(env.PAPUPAY_VENUES_FILE, env.PAPUPAY_VENUES_JSON)).keys()];
const shutdowns = [];
try {
  for (const id of venues) {
    const venue = database.venue(id);
    await venue.query("SELECT 1 FROM wallet_notifications LIMIT 1");
    shutdowns.push(startWalletWorker(openLoyalty(venue).wallet, wallet));
  }
} catch (error) {
  shutdowns.forEach((stop) => stop());
  wallet.close();
  await database.close();
  throw error;
}

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  shutdowns.forEach((stopWorker) => stopWorker());
  wallet.close();
  await database.close();
}
process.once("SIGINT", () => void stop());
process.once("SIGTERM", () => void stop());

// An idle pool drops connections, and the worker's polling timer is unref'd.
// Keep the supervisor alive without depending on either implementation detail.
await new Promise((resolve) => {
  const lifetime = setInterval(() => {}, 60_000);
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
    clearInterval(lifetime);
    resolve();
  });
});
