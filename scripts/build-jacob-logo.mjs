import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

// The editable SVG paths are the production source; no fonts or embedded raster images.
// Run in Docker: node scripts/build-jacob-logo.mjs <SVG source folder> <output folder>
const [source = "public/brand/jacob", destination = source] =
  process.argv.slice(2);
await fs.mkdir(destination, { recursive: true });
const wordmark = await fs.readFile(path.join(source, "wordmark.svg"), "utf8");
const symbol = await fs.readFile(path.join(source, "symbol.svg"), "utf8");
for (const [name, svg] of [
  ["wordmark", wordmark],
  ["symbol", symbol],
]) {
  if (/<(?:text|image|script|foreignObject)\b/i.test(svg))
    throw new Error("The logo source must contain vector paths only.");
  if (path.resolve(source) !== path.resolve(destination))
    await fs.writeFile(path.join(destination, name + ".svg"), svg);
}
await sharp(Buffer.from(wordmark))
  .resize(832, 256, { fit: "contain", background: "#00000000" })
  .png()
  .toFile(path.join(destination, "wordmark.png"));
await sharp(Buffer.from(symbol))
  .resize(512, 512, { fit: "contain", background: "#00000000" })
  .png()
  .toFile(path.join(destination, "symbol.png"));
const viewBox = symbol.match(/viewBox="([^"]+)"/)[1];
const body = symbol
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" rx="38" fill="#05090d"/><svg x="44" y="25" width="92" height="126" viewBox="${viewBox}">${body}</svg></svg>`;
await fs.writeFile(path.join(destination, "favicon.svg"), favicon);
for (const size of [32, 64, 180]) {
  await sharp(Buffer.from(favicon))
    .resize(size, size)
    .png()
    .toFile(
      path.join(
        destination,
        size === 180 ? "apple-touch-icon.png" : `favicon-${size}.png`
      )
    );
}
console.error(
  "Prepared clean Jacob SVG paths and transparent PNG/icon exports."
);
