import { copyFile, readdir, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Vercel packages public/ separately. Copy shared artwork into its disposable
// checkout so its packager does not follow a link back onto the original file.
const root = fileURLToPath(new URL("../", import.meta.url));
async function prepare(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await prepare(path);
    } else if (entry.isSymbolicLink()) {
      const source = await realpath(path);
      if (!source.startsWith(root)) throw new Error(`Public asset outside project: ${path}`);
      const copy = join(dirname(path), `.${basename(path)}.vercel-copy`);
      try {
        await copyFile(source, copy);
        await rename(copy, path);
      } finally {
        await rm(copy, { force: true });
      }
    }
  }
}

await prepare(join(root, "public"));
