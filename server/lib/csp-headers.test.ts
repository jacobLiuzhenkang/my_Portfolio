import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

/** Pages stay unframeable. Direct /downloads/*.pdf files are the exception. */
const pageSource = "/((?!downloads/[^/]+\\.[pP][dD][fF]$).*)";
const pdfSource = "/downloads/([^/]+\\.[pP][dD][fF])";

/**
 * Output of @vercel/routing-utils 6.5.0 (path-to-regexp 6.1.0, strict +
 * sensitive) for the sources above. Header routes are emitted with
 * continue:true, so two matching Content-Security-Policy values would both
 * be present and the browser would enforce the stricter one. These patterns
 * are disjoint. The PDF header value itself is only `frame-ancestors 'self'`:
 * site directives such as object-src 'none' make Chrome's built-in viewer
 * refuse a framed PDF.
 */
const pagePattern = /^(?:\/((?!downloads\/[^/]+\.[pP][dD][fF]$).*))$/;
const pdfPattern = /^\/downloads(?:\/([^/]+\.[pP][dD][fF]))$/;

describe("download PDF framing policy", () => {
  it("gives /downloads/*.pdf its own CSP and keeps page framing closed", async () => {
    const config = JSON.parse(
      await readFile(path.join(root, "vercel.json"), "utf8")
    );
    const headers = config.headers as Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
    const csp = headers.flatMap(rule =>
      rule.headers
        .filter(header => header.key === "Content-Security-Policy")
        .map(header => ({ source: rule.source, value: header.value }))
    );

    expect(csp.map(rule => rule.source)).toEqual([pageSource, pdfSource]);
    const [page, pdf] = csp;
    expect(page.value).toContain("frame-ancestors 'none'");
    expect(page.value).toContain("object-src 'none'");
    expect(page.value).not.toContain("frame-ancestors 'self'");
    expect(pdf.value).toBe("frame-ancestors 'self'");
    expect(pdf.value).not.toMatch(
      /default-src|script-src|style-src|img-src|font-src|connect-src|worker-src|base-uri|form-action|object-src/
    );

    const catchAll = headers.find(rule => rule.source === "/:path*");
    expect(
      catchAll?.headers.some(header => header.key === "Content-Security-Policy")
    ).toBe(false);
    expect(catchAll?.headers.map(header => header.key)).toEqual([
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
  });

  it("assigns each public path a single framing policy", () => {
    const samples = [
      ["/", "none"],
      ["/work/shang-ye-ping-mian-she-ji-he-ji", "none"],
      ["/index.html", "none"],
      ["/api/trpc", "none"],
      ["/downloads/portfolio-2025.preview.webp", "none"],
      ["/downloads/foo.pdf/bar", "none"],
      ["/downloads/nested/file.pdf", "none"],
      ["/downloads/portfolio-2025.pdf", "self"],
      ["/downloads/portfolio-2025.PDF", "self"],
      ["/downloads/resume-cn.pdf", "self"],
    ] as const;

    for (const [pathname, policy] of samples) {
      expect({
        pathname,
        page: pagePattern.test(pathname),
        pdf: pdfPattern.test(pathname),
      }).toEqual({
        pathname,
        page: policy === "none",
        pdf: policy === "self",
      });
    }
  });
});
