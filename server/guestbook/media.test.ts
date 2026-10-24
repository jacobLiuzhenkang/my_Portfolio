import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { normalizeImage, boundedBytes, sourceLeaseExpired } from "./media";
describe("untrusted image processing", () => {
  it("keeps source objects until the PUT capability has expired", () => {
    expect(sourceLeaseExpired(new Date(0), 5 * 60000)).toBe(false);
    expect(sourceLeaseExpired(new Date(0), 6 * 60000 + 1)).toBe(true);
  });
  it("decodes and re-encodes raster data, stripping metadata", async () => {
    const png = await sharp({
      create: { width: 24, height: 20, channels: 3, background: "#66d8f4" },
    })
      .png()
      .withMetadata({ exif: { IFD0: { Artist: "private camera metadata" } } })
      .toBuffer();
    const result = await normalizeImage(png, "image/png");
    const meta = await sharp(result.bytes).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(result.width).toBe(24);
  });
  it("rejects SVG disguised as a PNG and mismatched formats", async () => {
    await expect(
      normalizeImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>alert(1)</script></svg>'
        ),
        "image/png"
      )
    ).rejects.toThrow();
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(normalizeImage(png, "image/jpeg")).rejects.toThrow();
  });
  it("enforces the actual stream length", async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(32));
        c.close();
      },
    });
    await expect(boundedBytes(stream, 16)).rejects.toThrow();
  });
});
