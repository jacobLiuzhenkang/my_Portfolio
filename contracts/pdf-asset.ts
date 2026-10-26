/** Same-origin case PDFs stay under this size before readers open them. */
export const PDF_EAGER_BUDGET_BYTES = 1_500_000;

function parsed(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^(?:javascript|data|vbscript|blob):/i.test(trimmed))
    return null;
  try {
    return { trimmed, url: new URL(trimmed, "https://portfolio.local") };
  } catch {
    return null;
  }
}

export function isPdfReference(value: string) {
  const item = parsed(value);
  return !!item && /\.pdf$/i.test(item.url.pathname);
}

/** Cover image that can be requested without fetching the PDF. Cross-origin URLs stay blank. */
export function pdfPreviewSource(value: string) {
  const item = parsed(value);
  if (!item || !/\.pdf$/i.test(item.url.pathname)) return null;
  if (
    !item.trimmed.startsWith("/") ||
    item.trimmed.startsWith("//") ||
    item.trimmed.includes("\\")
  )
    return null;
  return item.url.pathname.replace(/\.pdf$/i, ".preview.webp");
}

/** CSP allows same-origin frames and blocks object/embed plus foreign blob frames. */
export function canEmbedPdf(value: string) {
  const item = parsed(value);
  if (
    !item ||
    !item.trimmed.startsWith("/") ||
    item.trimmed.startsWith("//") ||
    item.trimmed.includes("\\") ||
    item.url.origin !== "https://portfolio.local"
  )
    return false;
  return /\.pdf$/i.test(item.url.pathname);
}

export function pdfLabel(value: string, fallback = "案例 PDF") {
  const item = parsed(value);
  if (!item) return fallback;
  try {
    const name = decodeURIComponent(item.url.pathname.split("/").pop() || "");
    const stem = name
      .replace(/\.pdf$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    return stem || fallback;
  } catch {
    return fallback;
  }
}

/** Use a real image URL for cards. A PDF cover resolves to its preview, never the file itself. */
export function displayCoverUrl(url: string | null | undefined) {
  if (!url) return null;
  if (!isPdfReference(url)) return url;
  return pdfPreviewSource(url);
}
