import { useState } from "react";
import { canEmbedPdf, pdfLabel, pdfPreviewSource } from "@contracts/pdf-asset";

export default function CasePdf({
  href,
  label,
  initiallyOpen = false,
}: {
  href: string;
  label?: string;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [previewFailed, setPreviewFailed] = useState(false);
  const preview = pdfPreviewSource(href);
  const title = label?.trim() || pdfLabel(href);
  const embed = canEmbedPdf(href);
  return (
    <span className="case-pdf">
      <span className="case-pdf-sheet">
        {preview && !previewFailed ? (
          <img
            src={preview}
            alt=""
            width={1200}
            height={800}
            loading="lazy"
            decoding="async"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <span className="case-pdf-placeholder">
            <b>PDF</b>
            <small>封面预览</small>
          </span>
        )}
      </span>
      <span className="case-pdf-meta">
        <strong>{title}</strong>
        <span>先看封面，打开后再加载全文</span>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)}>
            查看完整 PDF
          </button>
        ) : embed ? (
          <span className="case-pdf-status">全文已加载</span>
        ) : (
          <a
            className="case-pdf-open"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            在新标签打开 PDF
          </a>
        )}
      </span>
      {open && embed ? (
        <iframe
          className="case-pdf-frame"
          title={title}
          src={href}
          loading="lazy"
        />
      ) : null}
    </span>
  );
}
