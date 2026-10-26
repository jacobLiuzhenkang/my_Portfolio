import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const symbol = await readFile(path.join(root, "public/brand/jacob/symbol.svg"), "utf8");
const paths = [...symbol.matchAll(/<path\b[^>]*\/>/g)].map(match => match[0]).join("");
if (!paths) throw new Error("Brand symbol paths were not found");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#05090d"/>
  <svg x="128" y="176" width="196" height="264" viewBox="-3 -3 128 172">${paths}</svg>
  <text x="404" y="292" fill="#f0f4f3" font-family="WenQuanYi Micro Hei, Noto Sans CJK SC, sans-serif" font-size="84">刘振康</text>
  <rect x="408" y="324" width="42" height="3" fill="#d8fa45"/>
  <text x="408" y="372" fill="#abb9bf" font-family="JetBrains Mono, Cascadia Mono, DejaVu Sans, sans-serif" font-size="22" letter-spacing="6">PORTFOLIO</text>
</svg>`;

const output = path.join(root, "public/og.png");
const png = await sharp(Buffer.from(svg)).png().toBuffer();
if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) {
  throw new Error(`Unexpected PNG size ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
}
await sharp(png).toFile(output);
console.log(`wrote ${output} (${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, ${png.length} bytes)`);
