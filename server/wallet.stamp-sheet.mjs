import { crc32, deflateSync } from "node:zlib";
import sweetoInk from "./wallet-assets/sweeto-strip-ink.json" with { type: "json" };

const width = 375;
const height = 144;
const border = 1;
const emptyRing = 4;
const stamp = 7;
const earnedGlyph = 10;
const goalRing = 13;
const ticketEdge = 16;
const insetRim = 19;

const classic = {
  paper: [242, 231, 212], detail: [204, 186, 153], guide: [114, 132, 112],
  ink: [16, 46, 36], glyph: [255, 171, 120], goal: [183, 77, 33], edge: [16, 46, 36],
};

const sweeto = {
  paper: [245, 229, 210], detail: [194, 126, 84], guide: [114, 132, 112],
  ink: [255, 122, 56], glyph: [16, 46, 36], goal: [167, 64, 27], edge: [16, 46, 36],
};

function shades(background, foreground) {
  return [1 / 3, 2 / 3, 1].flatMap((coverage) =>
    background.map((channel, index) => Math.round(channel + coverage * (foreground[index] - channel))));
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  return chunk;
}

// Our indexed template puts its palette immediately after IHDR. Recolour only
// the occupied seals. Every balance preserves the identical compressed raster.
export function inkSweetoStrip(template, stamps) {
  const result = Buffer.from(template);
  const chunk = 33;
  if (result.toString("ascii", chunk + 4, chunk + 8) !== "PLTE") throw Error("Missing Sweeto strip palette");
  const end = chunk + 8 + result.readUInt32BE(chunk);
  const palette = result.subarray(chunk + 8, end);
  const { firstSlot, earnedColours } = sweetoInk;
  for (let slot = 0; slot < Math.min(6, stamps); slot++) {
    for (const [index, source] of earnedColours.entries()) {
      const offset = (firstSlot + slot * earnedColours.length + index) * 3;
      palette.copy(palette, offset, source * 3, source * 3 + 3);
    }
  }
  result.writeUInt32BE(crc32(result.subarray(chunk + 4, end)), end);
  return result;
}

export function encodePng(pixels, pixelWidth, pixelHeight, palette, subFilter = false) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(pixelWidth);
  header.writeUInt32BE(pixelHeight, 4);
  header[8] = 8;
  header[9] = 3;

  const rows = Buffer.alloc((pixelWidth + 1) * pixelHeight);
  for (let y = 0; y < pixelHeight; y += 1) {
    const start = y * (pixelWidth + 1);
    const source = y * pixelWidth;
    pixels.copy(rows, start + 1, source, source + pixelWidth);
    if (subFilter) {
      rows[start] = 1;
      for (let x = 1; x < pixelWidth; x++) rows[start + 1 + x] = pixels[source + x] - pixels[source + x - 1];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("PLTE", palette),
    pngChunk("IDAT", deflateSync(rows, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function segmentDistance(x, y, startX, startY, endX, endY) {
  const dx = endX - startX;
  const dy = endY - startY;
  const projection = ((x - startX) * dx + (y - startY) * dy) / (dx * dx + dy * dy);
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(x - startX - t * dx, y - startY - t * dy);
}

export function renderStampSheet({ stamps, goal }, scale = 1, style = "classic") {
  if (![1, 2, 3].includes(scale)) throw new RangeError("Wallet artwork density must be 1x, 2x, or 3x.");
  const pixelWidth = width * scale;
  const pixelHeight = height * scale;
  const pixels = Buffer.alloc(pixelWidth * pixelHeight);
  const total = Math.max(1, Math.floor(goal) || 1);
  const earned = Math.max(0, Math.min(total, Math.floor(stamps) || 0));
  const isSweeto = style === "sweeto";
  const { paper, detail, guide, ink, glyph, goal: goalInk, edge } = isSweeto ? sweeto : classic;
  const colors = Buffer.from([
    ...paper, ...shades(paper, detail), ...shades(paper, guide), ...shades(paper, ink),
    ...shades(ink, glyph), ...shades(paper, goalInk), ...shades(paper, edge), ...shades(ink, detail),
  ]);
  const colorsPerSlot = isSweeto ? 12 : 9;
  // Reserving indices for each slot keeps the raster identical as stamps change.
  // Only the palette changes, so bundled offline passes share their pixel data.
  const palette = Buffer.alloc(colors.length + (total <= 12 ? total * colorsPerSlot * 3 : 0));
  colors.copy(palette);
  const invisible = Buffer.from([...paper, ...paper, ...paper]);

  function slotColor(number, part, color, visible) {
    const index = colors.length / 3 + (number - 1) * colorsPerSlot + part * 3;
    const shades = visible ? colors.subarray(color * 3, (color + 3) * 3) : invisible;
    shades.copy(palette, index * 3);
    return index;
  }

  function draw(color, left, top, right, bottom, distance) {
    const minX = Math.max(0, Math.floor(left * scale) - 1);
    const minY = Math.max(0, Math.floor(top * scale) - 1);
    const maxX = Math.min(pixelWidth, Math.ceil(right * scale) + 1);
    const maxY = Math.min(pixelHeight, Math.ceil(bottom * scale) + 1);
    for (let y = minY; y < maxY; y += 1) {
      for (let x = minX; x < maxX; x += 1) {
        const coverage = 0.5 - distance((x + 0.5) / scale, (y + 0.5) / scale) * scale;
        const shade = Math.min(3, Math.round(coverage * 3));
        if (shade > 0) pixels[y * pixelWidth + x] = color + shade - 1;
      }
    }
  }

  function circle(x, y, radius, color) {
    draw(color, x - radius, y - radius, x + radius, y + radius,
      (px, py) => Math.hypot(px - x, py - y) - radius);
  }

  function line(x1, y1, x2, y2, thickness, color) {
    const r = thickness / 2;
    draw(color, Math.min(x1, x2) - r, Math.min(y1, y2) - r, Math.max(x1, x2) + r, Math.max(y1, y2) + r,
      (x, y) => segmentDistance(x, y, x1, y1, x2, y2) - r);
  }

  function ring(x, y, radius, color, dashed = false, thickness = 1.8) {
    const r = radius + 1;
    draw(color, x - r, y - r, x + r, y + r, (px, py) => {
      const dx = px - x;
      const dy = py - y;
      const stroke = Math.abs(Math.hypot(dx, dy) - radius) - thickness / 2;
      if (!dashed) return stroke;
      const dash = (Math.abs(Math.atan2(dy, dx) * 5 + Math.PI) % Math.PI) - Math.PI * 0.77;
      return Math.max(stroke, dash * radius / 5);
    });
  }

  function seal(x, y, radius, color) {
    const r = radius + 1;
    draw(color, x - r, y - r, x + r, y + r, (px, py) => {
      const dx = px - x;
      const dy = py - y;
      const rim = radius + Math.cos(Math.atan2(dy, dx) * 16) * 0.95;
      return Math.hypot(dx, dy) - rim;
    });
  }

  function cake(x, y, unit, color) {
    const r = 9 * unit;
    draw(color, x - r, y - r, x + r, y + r, (px, py) => {
      const dx = (px - x) / unit;
      const dy = (py - y) / unit;
      const slice = Math.min(
        segmentDistance(dx, dy, -6.8, -0.5, 3.1, -6.4),
        segmentDistance(dx, dy, 3.1, -6.4, 6.8, -0.5),
        segmentDistance(dx, dy, -6.8, -0.5, -6.8, 6),
        segmentDistance(dx, dy, 6.8, -0.5, 6.8, 6),
        segmentDistance(dx, dy, -6.8, 6, 6.8, 6),
        segmentDistance(dx, dy, -6.8, -0.5, 6.8, -0.5),
        segmentDistance(dx, dy, -6.8, 2.8, 6.8, 2.8),
      );
      return (slice - 0.7) * unit;
    });
  }

  function papaya(x, y, unit, color) {
    const r = 11 * unit;
    draw(color, x - r, y - r, x + r, y + r, (px, py) => {
      const dx = (px - x) / unit;
      const dy = (py - y) / unit;
      const cross = 0.866 * dx + 0.5 * dy;
      const along = -0.5 * dx + 0.866 * dy;
      const belly = 5.2 + 0.23 * Math.max(-7, Math.min(7, along));
      const fruit = (Math.hypot(cross / belly, (along - 1) / 7.6) - 1) * 5;
      const leaf = (Math.hypot((cross - 1.5) / 1.5, (along + 7.9) / 2.4) - 1) * 1.5;
      const seeds = Math.min(
        Math.hypot(cross + 1.55, along - 0.7),
        Math.hypot(cross - 1.6, along - 1.9),
        Math.hypot(cross + 0.4, along - 4.1),
      ) - 1;
      return Math.max(Math.min(fruit, leaf), -seeds) * unit;
    });
  }

  function gift(x, y, unit, color) {
    const r = 9 * unit;
    draw(color, x - r, y - r, x + r, y + r, (px, py) => {
      const dx = (px - x) / unit;
      const dy = (py - y) / unit;
      const box = Math.min(
        segmentDistance(dx, dy, -6.7, -2.5, 6.7, -2.5),
        segmentDistance(dx, dy, -6.7, -2.5, -6.7, 0),
        segmentDistance(dx, dy, 6.7, -2.5, 6.7, 0),
        segmentDistance(dx, dy, -6.7, 0, 6.7, 0),
        segmentDistance(dx, dy, -5.5, 0, -5.5, 6),
        segmentDistance(dx, dy, 5.5, 0, 5.5, 6),
        segmentDistance(dx, dy, -5.5, 6, 5.5, 6),
        segmentDistance(dx, dy, 0, -2.5, 0, 6),
      );
      const bowX = Math.abs(dx) - 2.2;
      const bowY = dy + 4.55;
      const bow = Math.abs(Math.hypot((bowX + 0.65 * bowY) / 2.2, bowY / 1.9) - 1) * 1.9;
      return (Math.min(box, bow) - 0.7) * unit;
    });
  }

  function stampRow(count, first, centerY, radius, spacing) {
    for (let index = 0; index < count; index += 1) {
      const centerX = width / 2 + (index - (count - 1) / 2) * spacing;
      const number = first + index + 1;
      const final = number === total;
      const stamped = number <= earned;
      const fill = slotColor(number, 0, stamp, stamped);
      const glyph = slotColor(number, 1, stamped ? earnedGlyph : goalRing, stamped || final);
      const outline = slotColor(number, 2, final ? goalRing : emptyRing, !stamped);
      const unit = radius / 17;
      if (isSweeto) {
        seal(centerX, centerY, radius - 1.5, fill);
        const rim = slotColor(number, 3, insetRim, stamped);
        ring(centerX, centerY, radius - 4.5, rim, false, 0.7);
      } else {
        circle(centerX, centerY, radius - (final ? 3.6 : 1.8), fill);
      }
      if (final) gift(centerX, centerY, unit, glyph);
      else if (isSweeto) cake(centerX, centerY, unit, glyph);
      else papaya(centerX, centerY, unit, glyph);
      ring(centerX, centerY, radius, final && !isSweeto ? goalRing : outline, !final);
    }
  }

  if (isSweeto) {
    for (const y of [0, height]) {
      for (let x = 0; x <= width; x += 7.5) circle(x, y, 3.25, ticketEdge);
    }
    for (const y of [25, height - 25]) {
      line(24, y, 61, y, 1, border);
      line(width - 61, y, width - 24, y, 1, border);
      for (let x = 72.5; x < width - 69; x += 5.75) circle(x, y, 0.85, border);
    }
    circle(0, height / 2, 8, ticketEdge);
    circle(width, height / 2, 8, ticketEdge);
  } else {
    for (const y of [26.5, 117.5]) {
      line(26, y, 72, y, 0.8, border);
      line(width - 72, y, width - 26, y, 0.8, border);
      for (let x = 84.5; x < width - 80; x += 6) circle(x, y, 0.9, border);
    }
  }

  if (total <= 8) {
    const radius = total <= 6 ? (isSweeto ? 18.5 : 17) : 15;
    stampRow(total, 0, height / 2, radius, total <= 6 ? (isSweeto ? 50 : 45) : 40);
  } else if (total <= 12) {
    const first = Math.ceil(total / 2);
    stampRow(first, 0, 52.5, 14, 43);
    stampRow(total - first, first, 91.5, 14, 43);
  } else {
    const start = 46;
    const end = width - 54;
    const y = height / 2;
    line(start, y, end, y, 9, border);
    if (earned > 0) line(start, y, start + (end - start) * earned / total, y, 9, stamp);
    ring(end, y, 10, goalRing);
  }

  return encodePng(pixels, pixelWidth, pixelHeight, palette);
}
