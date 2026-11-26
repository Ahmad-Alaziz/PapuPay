import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { encodePng } from "../server/wallet.stamp-sheet.mjs";

// The seven passes share the same indexed raster. Only ink colours change on the
// occupied stamps, keeping all of their signed copies small enough for the Clip.
const assets = new URL("../server/wallet-assets/", import.meta.url);
const source = new URL("../public/assets/", import.meta.url);
const fruit = await readFile(new URL("papupay-mark.svg", source), "utf8");
const signature = await readFile(
  new URL("papupay-wordmark.svg", source),
  "utf8",
);
const artwork = (svg) =>
  svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
const fruitArt = artwork(fruit);
const signatureArt = artwork(signature)
  .replaceAll("#102E24", "#FFF0CF")
  .replaceAll("#B64C20", "#FF9E47");

const colours = [
  "102e24",
  "184535",
  "2a6449",
  "32754c",
  "70865c",
  "95a07e",
  "b26735",
  "cd8347",
  "e89a55",
  "ff7938",
  "ff9e47",
  "ffb373",
  "ffc990",
  "ffddac",
  "fff0cf",
].map((hex) => Buffer.from(hex, "hex"));
const width = 375,
  height = 144;
const centers = [
  [162, 43],
  [235, 43],
  [308, 43],
  [162, 101],
  [235, 101],
  [308, 101],
];
const gift =
  '<path d="M-8 0h16v9H-8zM-10-4h20v4h-20zM0-4v13M0-5c-1-4-3-6-6-6-5 0-3 7 6 6 9 1 11-6 6-6-3 0-5 2-6 6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>';
const seal = Array.from({ length: 48 }, (_, i) => {
  const angle = (i * Math.PI) / 24;
  const radius = i % 2 ? 20.6 : 22.4;
  return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
}).join(" ");

function stamp(x, y, index, inked) {
  const last = index === 5;
  const illustration = inked
    ? `<polygon points="${seal}" fill="#184535"/><circle r="17.2" fill="none" stroke="#70865c" stroke-width=".9"/>`
    : '<circle r="20.4" fill="#ffddac" stroke="#b26735" stroke-width="1.2" stroke-dasharray="3.4 2.2"/>';
  let center;
  if (last)
    center = gift.replace("currentColor", inked ? "#fff0cf" : "#184535");
  else if (inked)
    center = `<svg x="-11.5" y="-12" width="23" height="24" viewBox="0 0 100 104">${fruitArt}</svg>`;
  else
    center = `<text x="0" y="5.6" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#184535">${index + 1}</text>`;
  return `<g transform="translate(${x} ${y})">${illustration}${center}</g>`;
}

function banner(inked) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 144" width="375" height="144">
    <rect width="375" height="144" fill="#ffc990"/>
    <path d="M0 0H135Q111 43 124 74Q134 101 107 144H0Z" fill="#184535"/>
    <path d="M128 -2Q107 42 118 73Q129 103 100 146" fill="none" stroke="#70865c" stroke-width="1.1"/>
    <path d="M0 10H373M0 134H373" fill="none" stroke="#cd8347" stroke-width="1" stroke-dasharray="1 4" opacity=".65"/>
    <svg x="22" y="13" width="81" height="84" viewBox="0 0 100 104">${fruitArt}</svg>
    <svg x="20" y="102" width="80" height="18" viewBox="28 185 3693 748">${signatureArt}</svg>
    ${centers.map(([x, y], i) => stamp(x, y, i, inked)).join("")}
  </svg>`;
}

const nearest = new Map();
const stampPalette = [1, 5, 6, 9, 12, 13, 14];
function colourIndex(r, g, b, stampPixel) {
  const rgb = (stampPixel ? 1 << 24 : 0) | (r << 16) | (g << 8) | b;
  if (nearest.has(rgb)) return nearest.get(rgb);
  let best = 0,
    minimum = Infinity;
  for (const [index, colour] of colours.entries()) {
    if (stampPixel && !stampPalette.includes(index)) continue;
    const distance =
      (r - colour[0]) ** 2 + (g - colour[1]) ** 2 + (b - colour[2]) ** 2;
    if (distance < minimum) {
      best = index;
      minimum = distance;
    }
  }
  nearest.set(rgb, best);
  return best;
}

async function indexed(inked, scale) {
  const rgb = await sharp(Buffer.from(banner(inked)), { density: 72 * scale })
    .removeAlpha()
    .raw()
    .toBuffer();
  const indices = Buffer.alloc(width * height * scale * scale);
  for (let i = 0; i < indices.length; i++) {
    const x = (i % (width * scale)) / scale;
    const stampPixel = x > 132;
    indices[i] = colourIndex(
      rgb[i * 3],
      rgb[i * 3 + 1],
      rgb[i * 3 + 2],
      stampPixel,
    );
  }
  return indices;
}

const pairs = [];
const renders = [];
for (const scale of [1, 2, 3]) {
  const empty = await indexed(false, scale);
  const full = await indexed(true, scale);
  const pixels = Buffer.from(empty);
  for (let i = 0; i < pixels.length; i++) {
    if (empty[i] === full[i]) continue;
    const pair = empty[i] * colours.length + full[i];
    if (!pairs.includes(pair)) pairs.push(pair);
  }
  renders.push({ empty, full, pixels, scale });
}

const defaultPalette = Buffer.concat(colours);
const transitions = pairs.map((pair) => [
  Math.floor(pair / colours.length),
  pair % colours.length,
]);
const stride = transitions.length;
if (colours.length + stride * 6 > 256)
  throw Error(`Too many palette entries: ${stride} per stamp`);
const firstSlot = colours.length;
const palette = Buffer.concat([
  defaultPalette,
  ...centers.flatMap(() => transitions.map(([empty]) => colours[empty])),
]);
for (const { empty, full, pixels, scale } of renders) {
  const row = width * scale;
  for (let i = 0; i < pixels.length; i++) {
    if (empty[i] === full[i]) continue;
    const x = (i % row) / scale,
      y = Math.floor(i / row) / scale;
    const slot = centers.findIndex(
      ([cx, cy]) => Math.abs(x - cx) < 24 && Math.abs(y - cy) < 24,
    );
    if (slot < 0) throw Error("A changed pixel falls outside its stamp");
    pixels[i] =
      firstSlot +
      slot * stride +
      pairs.indexOf(empty[i] * colours.length + full[i]);
  }
  const suffix = scale === 1 ? "" : `@${scale}x`;
  await writeFile(
    new URL(`sweeto-strip${suffix}.png`, assets),
    encodePng(pixels, row, height * scale, palette, true),
  );
}
await writeFile(
  new URL("sweeto-strip-ink.json", assets),
  JSON.stringify({
    firstSlot,
    earnedColours: transitions.map(([, full]) => full),
  }) + "\n",
);
