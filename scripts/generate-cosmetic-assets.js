const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const assets = path.join(root, "assets");
const temp = path.join(root, ".asset-temp");
const cardOut = path.join(assets, "card-cosmetics");
const characterOut = path.join(assets, "character-cosmetics");
const packOut = path.join(assets, "pack-art");

const packSources = {
  standard: "/var/folders/db/9__2q_ln4z15ng7r3kkckvrh0000gn/T/codex-clipboard-e767f4c7-a179-42ad-8aa3-141cd2fc6b83.png",
  novelty: "/var/folders/db/9__2q_ln4z15ng7r3kkckvrh0000gn/T/codex-clipboard-305ceacc-5209-4839-be59-00c16666ad73.png",
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const tiers = [
  null,
  [12, 194, 34],
  [42, 126, 238],
  [146, 68, 218],
  [230, 189, 42],
  [219, 45, 45],
];

fs.mkdirSync(cardOut, { recursive: true });
fs.mkdirSync(characterOut, { recursive: true });
fs.mkdirSync(packOut, { recursive: true });
fs.mkdirSync(temp, { recursive: true });

for (const [name, source] of Object.entries(packSources)) {
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(packOut, `${name}-extension-pack.png`));
}

const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const cards = [
  ...matches(/hero\("([^"]+)",\s*"[^"]+",\s*"[^"]+",\s*"([^"]+\.png)"/g, appSource),
  ...matches(/armor\("([^"]+)",\s*"[^"]+",\s*"[^"]+",\s*\d+,\s*"([^"]+\.png)"/g, appSource),
  ...matches(/weapon\("([^"]+)",\s*"[^"]+",\s*"[^"]+",\s*\d+,\s*"([^"]+\.png)"/g, appSource),
];

for (const card of cards) {
  const image = readPng(path.join(assets, card.file));
  for (let tier = 1; tier < tiers.length; tier += 1) {
    const variant = cloneImage(image);
    tintCardArtWindow(variant, tiers[tier]);
    writePng(path.join(cardOut, `${card.id}_tier${tier}.png`), variant);
  }
}

const characterFiles = fs.readdirSync(path.join(assets, "character-art")).filter((file) => /\.(png|jpe?g)$/i.test(file));
for (const file of characterFiles) {
  const id = path.basename(file).replace(/\.(png|jpe?g)$/i, "");
  const source = path.join(assets, "character-art", file);
  const pngSource = /\.png$/i.test(file) ? source : convertToPng(source, path.join(temp, `${id}.png`));
  const image = readPng(pngSource);
  for (let tier = 1; tier < tiers.length; tier += 1) {
    const variant = cloneImage(image);
    tintConnectedBackground(variant, tiers[tier]);
    writePng(path.join(characterOut, `${id}_tier${tier}.png`), variant);
  }
}

fs.rmSync(temp, { recursive: true, force: true });
console.log(`Generated ${cards.length * 5} card variants and ${characterFiles.length * 5} character variants.`);

function matches(regex, source) {
  const found = [];
  for (const match of source.matchAll(regex)) found.push({ id: match[1], file: match[2] });
  return found;
}

function convertToPng(source, output) {
  execFileSync("sips", ["-s", "format", "png", source, "--out", output], { stdio: "ignore" });
  return output;
}

function tintCardArtWindow(image, target) {
  const x1 = Math.round(image.width * 0.18);
  const x2 = Math.round(image.width * 0.82);
  const y1 = Math.round(image.height * 0.26);
  const y2 = Math.round(image.height * 0.58);
  const visited = new Uint8Array(image.width * image.height);
  const seeds = [
    [x1 + 42, y1 + 42],
    [x2 - 42, y1 + 42],
    [x1 + 42, y2 - 42],
    [x2 - 42, y2 - 42],
    [Math.round((x1 + x2) / 2), y1 + 38],
    [Math.round((x1 + x2) / 2), y2 - 38],
  ];
  const queue = seeds.filter(([x, y]) => x >= x1 && x < x2 && y >= y1 && y < y2 && isCardBackdropPixel(image, x, y));
  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < x1 || y < y1 || x >= x2 || y >= y2) continue;
    const key = y * image.width + x;
    if (visited[key] || !isCardBackdropPixel(image, x, y)) continue;
    visited[key] = 1;
    const index = pixelIndex(image, x, y);
    const max = Math.max(image.data[index], image.data[index + 1], image.data[index + 2]);
    const shade = Math.max(0.52, Math.min(1, max / 255));
    image.data[index] = Math.round(target[0] * shade);
    image.data[index + 1] = Math.round(target[1] * shade);
    image.data[index + 2] = Math.round(target[2] * shade);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

function isCardBackdropPixel(image, x, y) {
  const index = pixelIndex(image, x, y);
  const r = image.data[index];
  const g = image.data[index + 1];
  const b = image.data[index + 2];
  const a = image.data[index + 3];
  if (a < 20) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 145 && max - min < 92;
}

function tintConnectedBackground(image, target) {
  const quantized = new Map();
  const border = [];
  for (let x = 0; x < image.width; x += 1) {
    border.push([x, 0], [x, image.height - 1]);
  }
  for (let y = 0; y < image.height; y += 1) {
    border.push([0, y], [image.width - 1, y]);
  }
  for (const [x, y] of border) {
    const index = pixelIndex(image, x, y);
    const key = `${image.data[index] >> 4},${image.data[index + 1] >> 4},${image.data[index + 2] >> 4}`;
    quantized.set(key, (quantized.get(key) || 0) + 1);
  }
  const backgroundKey = [...quantized.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "15,15,15";
  const base = backgroundKey.split(",").map((value) => Number(value) * 16 + 8);
  const visited = new Uint8Array(image.width * image.height);
  const queue = [];
  for (const point of border) queue.push(point);
  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
    const key = y * image.width + x;
    if (visited[key]) continue;
    const index = pixelIndex(image, x, y);
    const a = image.data[index + 3];
    if (a < 20) {
      visited[key] = 1;
      continue;
    }
    const r = image.data[index];
    const g = image.data[index + 1];
    const b = image.data[index + 2];
    const distance = Math.hypot(r - base[0], g - base[1], b - base[2]);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const similarFlatBackdrop = distance < 92 || (max > 170 && max - min < 64);
    if (!similarFlatBackdrop) continue;
    visited[key] = 1;
    const shade = Math.max(0.7, Math.min(1.12, (max || 180) / 210));
    image.data[index] = Math.min(255, Math.round(target[0] * shade));
    image.data[index + 1] = Math.min(255, Math.round(target[1] * shade));
    image.data[index + 2] = Math.min(255, Math.round(target[2] * shade));
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

function cloneImage(image) {
  return { width: image.width, height: image.height, data: Buffer.from(image.data) };
}

function pixelIndex(image, x, y) {
  return (y * image.width + x) * 4;
}

function readPng(file) {
  const buffer = fs.readFileSync(file);
  const signature = buffer.subarray(0, 8);
  if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${file} is not a PNG`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) throw new Error(`${file} uses an unsupported PNG format`);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
    offset += 12 + length;
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const raw = Buffer.alloc(height * stride);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[source++];
    const row = inflated.subarray(source, source + stride);
    source += stride;
    const target = raw.subarray(y * stride, (y + 1) * stride);
    const previous = y > 0 ? raw.subarray((y - 1) * stride, y * stride) : null;
    unfilter(filter, row, target, previous, channels);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < raw.length; i += channels, j += 4) {
    rgba[j] = raw[i];
    rgba[j + 1] = raw[i + 1];
    rgba[j + 2] = raw[i + 2];
    rgba[j + 3] = channels === 4 ? raw[i + 3] : 255;
  }
  return { width, height, data: rgba };
}

function unfilter(filter, source, target, previous, bpp) {
  for (let x = 0; x < source.length; x += 1) {
    const left = x >= bpp ? target[x - bpp] : 0;
    const up = previous ? previous[x] : 0;
    const upLeft = previous && x >= bpp ? previous[x - bpp] : 0;
    let value = source[x];
    if (filter === 1) value = (value + left) & 255;
    else if (filter === 2) value = (value + up) & 255;
    else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) value = (value + paeth(left, up, upLeft)) & 255;
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
    target[x] = value;
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function writePng(file, image) {
  const stride = image.width * 4;
  const filtered = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    filtered[y * (stride + 1)] = 0;
    image.data.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunks = [
    chunk("IHDR", (() => {
      const data = Buffer.alloc(13);
      data.writeUInt32BE(image.width, 0);
      data.writeUInt32BE(image.height, 4);
      data[8] = 8;
      data[9] = 6;
      return data;
    })()),
    chunk("IDAT", zlib.deflateSync(filtered, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ];
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]));
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return out;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
