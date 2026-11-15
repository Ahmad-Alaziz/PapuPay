// Copies the landing page's static export (apps/landing/out) into the Vite output
// (apps/web/dist) that Vercel serves. Fails instead of overwriting a demo file.
import { cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const landing = "apps/landing/out";
const dist = "apps/web/dist";

for (const dir of [landing, dist]) {
  if (!existsSync(dir)) throw new Error(`${dir} is missing; build both apps first.`);
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const conflicts = files(landing)
  .map((path) => relative(landing, path))
  .filter((path) => existsSync(join(dist, path)));

if (conflicts.length > 0) {
  console.error(`Landing files would overwrite the web demo:\n  ${conflicts.join("\n  ")}`);
  process.exit(1);
}

cpSync(landing, dist, { recursive: true });
console.log(`Merged ${landing} into ${dist}.`);
