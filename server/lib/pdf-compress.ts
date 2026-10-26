import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDF_EAGER_BUDGET_BYTES } from "@contracts/pdf-asset";

export type PdfByteWriter = (bytes: Uint8Array) => Promise<Uint8Array | null>;

let ghostscript: Promise<boolean> | undefined;

export function ghostscriptAvailable() {
  ghostscript ??= new Promise(resolve => {
    const child = spawn("gs", ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", code => resolve(code === 0));
  });
  return ghostscript;
}

function isPdfHeader(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 5 &&
    Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-"
  );
}

/** Runs the repo script. Missing Ghostscript or a missing script keeps the upload unchanged. */
export async function writeDerivativeWithScript(bytes: Uint8Array) {
  if (!(await ghostscriptAvailable())) return null;
  const script = path.join(process.cwd(), "scripts/compress-case-pdf.mjs");
  const dir = await mkdtemp(path.join(tmpdir(), "pdf-upload-"));
  const input = path.join(dir, "in.pdf");
  try {
    await writeFile(input, bytes);
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, [script, input, "--no-preview"], {
        stdio: "ignore",
      });
      child.on("error", reject);
      child.on("close", status => resolve(status ?? 1));
    });
    if (code !== 0) return null;
    return new Uint8Array(await readFile(input));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function compressPdfBytes(
  bytes: Uint8Array,
  writeDerivative: PdfByteWriter = writeDerivativeWithScript
) {
  if (bytes.byteLength < PDF_EAGER_BUDGET_BYTES || !isPdfHeader(bytes)) {
    return { bytes, compressed: false };
  }
  try {
    const next = await writeDerivative(bytes);
    if (!next || next.byteLength >= bytes.byteLength || !isPdfHeader(next)) {
      return { bytes, compressed: false };
    }
    return { bytes: next, compressed: true };
  } catch {
    return { bytes, compressed: false };
  }
}
