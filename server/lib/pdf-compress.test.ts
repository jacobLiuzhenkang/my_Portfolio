import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDF_EAGER_BUDGET_BYTES } from "@contracts/pdf-asset";
import { compressPdfBytes, ghostscriptAvailable } from "./pdf-compress";

const header = new TextEncoder().encode("%PDF-");

describe("upload PDF compression", () => {
  it("leaves small or non-pdf payloads untouched", async () => {
    const small = header;
    const calls: Uint8Array[] = [];
    const result = await compressPdfBytes(small, async bytes => {
      calls.push(bytes);
      return bytes;
    });
    expect(result.compressed).toBe(false);
    expect(result.bytes).toBe(small);
    expect(calls).toHaveLength(0);
  });

  it("keeps the original when the derivative is missing, larger, or invalid", async () => {
    const bytes = new Uint8Array(PDF_EAGER_BUDGET_BYTES);
    bytes.set(header);
    const missing = await compressPdfBytes(bytes, async () => null);
    expect(missing.compressed).toBe(false);
    const larger = new Uint8Array(bytes.byteLength + 10);
    larger.set(header);
    const grown = await compressPdfBytes(bytes, async () => larger);
    expect(grown.compressed).toBe(false);
    const broken = new Uint8Array([1, 2, 3, 4]);
    const invalid = await compressPdfBytes(bytes, async () => broken);
    expect(invalid.compressed).toBe(false);
    const failed = await compressPdfBytes(bytes, async () => {
      throw new Error("gs missing");
    });
    expect(failed.bytes).toBe(bytes);
    expect(failed.compressed).toBe(false);
  });

  it("replaces an oversized PDF when the derivative is a smaller PDF", async () => {
    const bytes = new Uint8Array(PDF_EAGER_BUDGET_BYTES + 20);
    bytes.set(header);
    const smaller = new Uint8Array(header.byteLength + 1);
    smaller.set(header);
    const result = await compressPdfBytes(bytes, async () => smaller);
    expect(result.compressed).toBe(true);
    expect(result.bytes).toEqual(smaller);
  });
});

describe("pdf compress script", () => {
  it("prints usage without touching files", async () => {
    const result = await new Promise<{ code: number; stdout: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          ["scripts/compress-case-pdf.mjs", "--help"],
          { stdio: ["ignore", "pipe", "pipe"] }
        );
        let stdout = "";
        child.stdout.on("data", chunk => {
          stdout += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", code => resolve({ code: code ?? 1, stdout }));
      }
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("compress-case-pdf.mjs");
  });

  it("keeps the shipped case PDF smaller than the original export and beside a cover", async () => {
    const pdf = await readFile("public/downloads/portfolio-2025.pdf");
    const preview = await readFile(
      "public/downloads/portfolio-2025.preview.webp"
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeLessThan(8 * 1024 * 1024);
    expect(preview.subarray(0, 4).toString()).toBe("RIFF");
    expect(preview.subarray(8, 12).toString()).toBe("WEBP");
    expect(preview.byteLength).toBeLessThan(200 * 1024);
  });

  it("writes a cover preview when ghostscript is available", async () => {
    if (!(await ghostscriptAvailable())) return;
    const dir = await mkdtemp(path.join(tmpdir(), "pdf-script-"));
    const pdf = path.join(dir, "note.pdf");
    try {
      const created = await new Promise<number>((resolve, reject) => {
        const child = spawn(
          "gs",
          [
            "-q",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=pdfwrite",
            `-sOutputFile=${pdf}`,
            "-c",
            "showpage",
          ],
          { stdio: "ignore" }
        );
        child.on("error", reject);
        child.on("close", code => resolve(code ?? 1));
      });
      expect(created).toBe(0);
      const compressed = await new Promise<number>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ["scripts/compress-case-pdf.mjs", pdf],
          { stdio: "ignore" }
        );
        child.on("error", reject);
        child.on("close", code => resolve(code ?? 1));
      });
      expect(compressed).toBe(0);
      const cover = await readFile(path.join(dir, "note.preview.webp"));
      expect(cover.subarray(0, 4).toString()).toBe("RIFF");
      const body = await readFile(pdf);
      expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
