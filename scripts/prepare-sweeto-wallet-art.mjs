import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { encodePng } from "../server/wallet.stamp-sheet.mjs";

// Wallet draws its logo and balance at the top, QR near the bottom and reward in its footer.
// Keep these areas clear in the 358 × 448 pt poster artwork.
const output = new URL("../server/wallet-assets/", import.meta.url);
const assets = new URL("../public/assets/", import.meta.url);
const merchantLogo = await readFile(new URL("sweeto/logo-white.png", assets));
const sweetoPhoto = await sharp(
  await readFile(new URL("sweeto/matylda-table.webp", assets)),
)
  .resize(780)
  .png()
  .toBuffer();
const signature = await readFile(
  new URL("papupay-wordmark.svg", assets),
  "utf8",
);
const wordmark = signature
  .slice(signature.indexOf(">") + 1, signature.lastIndexOf("</svg>"))
  .replaceAll("#102E24", "#214736")
  .replaceAll("#B64C20", "#9E441B");
const boxEdge =
  "M136 196Q136 185 154 173Q180 151 211 135Q232 124 254 129L351 150Q376 156 385 167Q393 177 382 191L367 253Q365 265 350 278L316 306Q306 315 292 316Q277 319 258 312L177 292Q164 288 161 277L144 216Q136 210 136 196Z";
const contours = Array.from(
  { length: 13 },
  (_, n) =>
    `<ellipse cx="178" cy="117" rx="${93 + n * 14}" ry="${44 + n * 8}" transform="rotate(-13 179 116)"/>`,
).join("");

const layouts = [
  {
    name: "artwork",
    width: 358,
    height: 448,
    cardTop: -24,
    inset: 16,
    band: 147,
    boxScale: 0.62,
    boxY: 90,
    cy: 168,
  },
  {
    name: "strip",
    width: 375,
    height: 144,
    cardTop: -24,
    inset: 0,
    band: 101,
    boxScale: 0.51,
    boxY: 54,
    cy: 122,
  },
];

function background({ width, height, cardTop, inset, band, boxScale, boxY }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <clipPath id="stock"><rect x="${inset}" y="${cardTop}" width="${width - 2 * inset}" height="${band + 41 - cardTop}" rx="17"/></clipPath>
      <clipPath id="box"><path d="${boxEdge}"/></clipPath>
      <linearGradient id="green" x2="1" y2=".65" gradientUnits="objectBoundingBox"><stop stop-color="#dce8cf"/><stop offset=".65" stop-color="#e4eac8"/><stop offset="1" stop-color="#d2dfbd"/></linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="#fff5e5"/>
    <g clip-path="url(#stock)">
      <rect width="${width}" height="${band + 41}" fill="url(#green)"/>
      <g fill="none" stroke="#98b694" stroke-width=".65" opacity=".75">${contours}</g>
      <g transform="translate(${Math.round(width / 2) + 2} ${boxY}) rotate(-7) scale(${boxScale}) translate(-263 -223)">
        <path d="${boxEdge}" fill="#0c2d25" stroke="#0c2d25" stroke-width="6" transform="translate(-3 6)"/>
        <path d="${boxEdge}" fill="#f8cca0" stroke="#f8cca0" stroke-width="3" stroke-linejoin="round"/>
        <image width="420" height="420" clip-path="url(#box)" xlink:href="data:image/png;base64,${sweetoPhoto.toString("base64")}"/>
      </g>
      <path d="M0 ${band}H${width}v45H0Z" fill="#123a2f"/>
      <path d="M7 ${band + 1}H${width - 7}" fill="none" stroke="#67866d" stroke-width=".7" stroke-dasharray="1.4 3.1"/>
    </g>
    <g transform="translate(${width - 79} ${band - 23}) rotate(-9)">
      <rect x="-29" y="-9" width="58" height="18" rx="9" fill="#ffcc8b" stroke="#8e572d" stroke-width=".8"/>
      <svg x="-22" y="-5" width="44" height="10" viewBox="28 185 3693 748">${wordmark}</svg>
    </g>
  </svg>`;
}

const diameter = 30;
const centers = Array.from({ length: 6 }, (_, i) => Math.round(57 + i * 49));

const stampColours = ["#123a2f", "#80927a", "#ffedc9", "#ff9e55", "#173f32"];
const rgb = (hex) => Buffer.from(hex.replace("#", ""), "hex");
const seal = Array.from({ length: 44 }, (_, i) => {
  const angle = (i * Math.PI) / 22;
  const r = i % 2 ? 13.1 : 14.6;
  return `${(Math.cos(angle) * r).toFixed(2)},${(Math.sin(angle) * r).toFixed(2)}`;
}).join(" ");
function slot(slot, earned) {
  const gift =
    '<path d="M-6-2h12v8H-6zM-7-5H7v3H-7zM0-5V6M0-5c-8 0-8-8-4-6 2 0 3 3 4 6 2-3 3-6 5-6 4-1 4 6-5 6Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>';
  const figure = earned
    ? `<polygon points="${seal}" fill="#ff9e55"/>${slot === 5 ? gift : '<path d="M-5 .2l3.5 4L6-5" fill="none" stroke="#173f32" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'}`
    : `<circle r="13.2" fill="none" stroke="#80927a" stroke-dasharray="2 1.6" stroke-width="1.15"/>${slot === 5 ? gift : '<text y="3.9" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="11" fill="#ffedc9">' + (slot + 1) + "</text>"}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="#123a2f"/><g transform="translate(15 15)" color="${earned ? "#173f32" : "#ffedc9"}">${figure}</g></svg>`;
}

function nearest(buffer, index, palette) {
  let best = 0,
    min = Infinity;
  for (const [i, entry] of palette.entries()) {
    const delta =
      (entry[0] - buffer[index]) ** 2 +
      (entry[1] - buffer[index + 1]) ** 2 +
      (entry[2] - buffer[index + 2]) ** 2;
    if (delta < min) {
      best = i;
      min = delta;
    }
  }
  return best;
}
const stampPalette = stampColours.map(rgb);
const variants = [];
const transitions = [];
for (const scale of [1, 2, 3]) {
  const stamps = [];
  for (let i = 0; i < centers.length; i++) {
    const [empty, full] = await Promise.all(
      [false, true].map((earned) =>
        sharp(Buffer.from(slot(i, earned)), { density: 72 * scale })
          .removeAlpha()
          .raw()
          .toBuffer(),
      ),
    );
    const pairs = Array.from({ length: empty.length / 3 }, (_, pixel) => {
      const a = nearest(empty, pixel * 3, stampPalette),
        b = nearest(full, pixel * 3, stampPalette);
      const key = a * 5 + b;
      if (a !== b && !transitions.includes(key)) transitions.push(key);
      return key;
    });
    stamps.push(pairs);
  }
  variants.push({ scale, stamps });
}

const firstSlot = 256 - transitions.length * centers.length;
if (firstSlot < 50)
  throw Error(
    "Poster stamp treatment leaves too few colours for the photograph.",
  );
for (const { scale, stamps } of variants) {
  const suffix = scale === 1 ? "" : `@${scale}x`;
  for (const layout of layouts) {
    const w = layout.width * scale,
      h = layout.height * scale;
    // Quantize the box photograph and engraved background together. Reserve a fixed
    // section of the palette for the stamp ink, which changes independently for each balance.
    const base = await sharp(Buffer.from(background(layout)), {
      density: 72 * scale,
    })
      .png({
        palette: true,
        colours: 2 ** Math.floor(Math.log2(firstSlot - 5)),
        dither: 0,
        effort: 8,
      })
      .toBuffer();
    const raw = await sharp(base).removeAlpha().raw().toBuffer();
    const frequency = new Map();
    for (let p = 0; p < raw.length; p += 3) {
      const key = raw.readUIntBE(p, 3);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
    const mostUsed = [...frequency]
      .sort((a, b) => b[1] - a[1])
      .slice(0, firstSlot - stampPalette.length);
    const palette = [
      ...stampPalette,
      ...mostUsed.map(([key]) =>
        Buffer.from([key >> 16, (key >> 8) & 255, key & 255]),
      ),
    ];
    const lookup = new Map(
      palette.map((entry, index) => [entry.readUIntBE(0, 3), index]),
    );
    const pixels = Buffer.alloc(w * h);
    for (let p = 0; p < pixels.length; p++) {
      const offset = p * 3,
        key = raw.readUIntBE(offset, 3);
      if (!lookup.has(key)) lookup.set(key, nearest(raw, offset, palette));
      pixels[p] = lookup.get(key);
    }
    while (palette.length < firstSlot) palette.push(stampPalette[0]);
    for (const [i, pairs] of stamps.entries()) {
      const x0 =
          (centers[i] + Math.round((layout.width - 358) / 2) - diameter / 2) *
          scale,
        y0 = (layout.cy - diameter / 2) * scale,
        sw = diameter * scale;
      for (let p = 0; p < pairs.length; p++) {
        const key = pairs[p],
          a = Math.floor(key / 5),
          b = key % 5;
        pixels[(y0 + Math.floor(p / sw)) * w + x0 + (p % sw)] =
          a === b
            ? a
            : firstSlot + i * transitions.length + transitions.indexOf(key);
      }
      palette.push(
        ...transitions.map((pair) => stampPalette[Math.floor(pair / 5)]),
      );
    }
    await writeFile(
      new URL(`sweeto-${layout.name}${suffix}.png`, output),
      encodePng(pixels, w, h, Buffer.concat(palette), true),
    );
  }
  // Both PassKit styles sit the merchant logo on a light field.
  for (const [name, width, height] of [
    ["primaryLogo", 113, 30],
    ["logo", 160, 50],
  ]) {
    await sharp(merchantLogo)
      .trim({ background: "#00000000", threshold: 10 })
      .resize({
        width: width * scale,
        height: height * scale,
        fit: "contain",
        background: "#00000000",
      })
      .ensureAlpha()
      .linear([0, 0, 0, 1], [19, 55, 44, 0])
      .png({ palette: true, colours: 32 })
      .toFile(new URL(`sweeto-${name}${suffix}.png`, output).pathname);
  }
}
await writeFile(
  new URL("sweeto-strip-ink.json", output),
  JSON.stringify({
    firstSlot,
    earnedColours: transitions.map((pair) => pair % 5),
  }) + "\n",
);
