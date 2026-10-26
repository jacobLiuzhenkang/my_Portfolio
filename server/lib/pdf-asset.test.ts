import { describe, expect, it } from "vitest";
import {
  PDF_EAGER_BUDGET_BYTES,
  canEmbedPdf,
  displayCoverUrl,
  isPdfReference,
  pdfLabel,
  pdfPreviewSource,
} from "@contracts/pdf-asset";

describe("case PDF references", () => {
  it("recognizes pdf paths and ignores ordinary images", () => {
    expect(isPdfReference("/downloads/portfolio-2025.pdf")).toBe(true);
    expect(isPdfReference("/downloads/portfolio-2025.PDF?download=1")).toBe(
      true
    );
    expect(isPdfReference("/images/other/1.webp")).toBe(false);
    expect(isPdfReference("javascript:alert(1).pdf")).toBe(false);
    expect(PDF_EAGER_BUDGET_BYTES).toBe(1_500_000);
  });

  it("points same-origin covers at a sibling preview and never at the pdf", () => {
    expect(pdfPreviewSource("/downloads/portfolio-2025.pdf")).toBe(
      "/downloads/portfolio-2025.preview.webp"
    );
    expect(pdfPreviewSource("/downloads/portfolio-2025.pdf#page=3")).toBe(
      "/downloads/portfolio-2025.preview.webp"
    );
    expect(pdfPreviewSource("https://files.example/deck.pdf")).toBeNull();
    expect(displayCoverUrl("/images/other/cover.webp")).toBe(
      "/images/other/cover.webp"
    );
    expect(displayCoverUrl("/downloads/portfolio-2025.pdf")).toBe(
      "/downloads/portfolio-2025.preview.webp"
    );
    expect(displayCoverUrl("https://blob.example/cover.pdf")).toBeNull();
  });

  it("embeds only same-origin pdf paths", () => {
    expect(canEmbedPdf("/downloads/portfolio-2025.pdf")).toBe(true);
    expect(canEmbedPdf("//files.example/deck.pdf")).toBe(false);
    expect(canEmbedPdf("https://blob.example/deck.pdf")).toBe(false);
    expect(canEmbedPdf("/downloads/portfolio-2025.pdf\\evil")).toBe(false);
    expect(pdfLabel("/downloads/portfolio-2025.pdf")).toBe("portfolio 2025");
  });
});
