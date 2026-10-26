#!/usr/bin/env node
/**
 * Shrink an oversized case-study PDF and write a same-origin cover preview.
 *
 *   node scripts/compress-case-pdf.mjs public/downloads/portfolio-2025.pdf
 *
 * Ghostscript rewrites the PDF. The cover is a WebP of page 1
 * (`name.pdf` → `name.preview.webp`). cwebp is preferred; sharp is the fallback.
 * The original file is replaced only when the derivative is a smaller valid PDF.
 */
import { spawn } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PDF_EAGER_BUDGET_BYTES = 1_500_000;

const presets = {
  // Design exports often store pixel pages as points, so /ebook leaves
  // full-resolution images. The screen preset forces a 72 dpi JPEG rewrite.
  ebook: ["-dPDFSETTINGS=/ebook", "-dPassThroughJPEGImages=false"],
  screen: [
    "-dPassThroughJPEGImages=false",
    "-dDownsampleColorImages=true",
    "-dDownsampleGrayImages=true",
    "-dColorImageDownsampleType=/Bicubic",
    "-dGrayImageDownsampleType=/Bicubic",
    "-dColorImageResolution=72",
    "-dGrayImageResolution=72",
    "-dMonoImageResolution=200",
    "-dColorImageDownsampleThreshold=1.0",
    "-dGrayImageDownsampleThreshold=1.0",
    "-dEncodeColorImages=true",
    "-dEncodeGrayImages=true",
    "-dAutoFilterColorImages=false",
    "-dAutoFilterGrayImages=false",
    "-dColorImageFilter=/DCTEncode",
    "-dGrayImageFilter=/DCTEncode",
    "-dJPEGQ=45",
  ],
};

function run(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.on("error", error => resolve({ code: 127, stderr: error.message }));
    child.on("close", code => resolve({ code: code ?? 1, stderr }));
  });
}

export function isPdfHeader(bytes) {
  return (
    bytes.length >= 5 &&
    Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-"
  );
}

export function previewPathFor(pdfPath) {
  const parsed = path.parse(pdfPath);
  return path.join(parsed.dir, `${parsed.name}.preview.webp`);
}

async function commandWorks(command, args) {
  const result = await run(command, args);
  return result.code === 0;
}

async function writePreview(pdfPath, webpPath) {
  const dir = await mkdtemp(path.join(tmpdir(), "pdf-preview-"));
  const png = path.join(dir, "page.png");
  try {
    const rendered = await run("gs", [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-dQUIET",
      "-sDEVICE=png16m",
      "-r80",
      "-dFirstPage=1",
      "-dLastPage=1",
      `-sOutputFile=${png}`,
      pdfPath,
    ]);
    if (rendered.code !== 0) {
      throw new Error(rendered.stderr.trim() || "封面渲染失败");
    }
    const cwebp = await run("cwebp", [
      "-quiet",
      "-q",
      "70",
      png,
      "-o",
      webpPath,
    ]);
    if (cwebp.code === 0) return;
    const sharpModule = await import("sharp").catch(() => null);
    const sharp = sharpModule?.default;
    if (!sharp) {
      throw new Error("需要 cwebp 或 sharp 才能写出 .preview.webp");
    }
    await sharp(png)
      .rotate()
      .resize({
        width: 1400,
        height: 1400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 70 })
      .toFile(webpPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function renderPreset(input, preset) {
  const dir = await mkdtemp(path.join(tmpdir(), "pdf-compress-"));
  const output = path.join(dir, "out.pdf");
  try {
    const result = await run("gs", [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-dQUIET",
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.6",
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      "-dSubsetFonts=true",
      "-dAutoRotatePages=/None",
      ...presets[preset],
      `-sOutputFile=${output}`,
      input,
    ]);
    if (result.code !== 0) return null;
    const bytes = await readFile(output);
    return isPdfHeader(bytes) ? bytes : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function compressCasePdf(pdfPath, { preview = true } = {}) {
  const absolute = path.resolve(pdfPath);
  const before = await stat(absolute);
  const original = await readFile(absolute);
  if (!isPdfHeader(original)) throw new Error("不是 PDF 文件");
  if (!(await commandWorks("gs", ["--version"]))) {
    throw new Error(
      "未找到 Ghostscript。安装 ghostscript 后重试，或使用 README 中的一次性容器命令。"
    );
  }
  let next = original;
  let preset = "unchanged";
  if (original.byteLength >= PDF_EAGER_BUDGET_BYTES) {
    const ebook = await renderPreset(absolute, "ebook");
    const screen =
      !ebook || ebook.byteLength > 4 * 1024 * 1024
        ? await renderPreset(absolute, "screen")
        : null;
    const candidates = [ebook, screen].filter(Boolean);
    candidates.sort((a, b) => a.byteLength - b.byteLength);
    if (candidates[0] && candidates[0].byteLength < original.byteLength) {
      next = candidates[0];
      preset = candidates[0] === screen ? "screen" : "ebook";
    }
  }
  if (next !== original) {
    const temp = `${absolute}.next`;
    await writeFile(temp, next);
    await rename(temp, absolute);
  }
  const cover = previewPathFor(absolute);
  if (preview) await writePreview(absolute, cover);
  return {
    path: absolute,
    preview: preview ? cover : null,
    before: before.size,
    after: next.byteLength,
    preset,
  };
}

function help() {
  console.log(
    "用法: node scripts/compress-case-pdf.mjs <file.pdf> [--no-preview]"
  );
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== "--");
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    help();
    process.exit(args.length === 0 ? 1 : 0);
  }
  const preview = !args.includes("--no-preview");
  const file = args.find(arg => !arg.startsWith("--"));
  if (!file) {
    help();
    process.exit(1);
  }
  const result = await compressCasePdf(file, { preview });
  console.log(
    JSON.stringify({
      path: result.path,
      preview: result.preview,
      before: result.before,
      after: result.after,
      preset: result.preset,
    })
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : "PDF 压缩失败");
    process.exit(1);
  });
}
