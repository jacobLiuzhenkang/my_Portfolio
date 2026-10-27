import type { ReactNode } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import { caseMarkdown, inlineImageSources } from "@contracts/project-content";
import { isPdfReference, pdfLabel } from "@contracts/pdf-asset";
import CasePdf from "./CasePdf";
import { caseOverview } from "@/lib/case-overview";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { children?: ReactNode };
    return nodeText(props.children);
  }
  return "";
}

export default function CaseStudy({
  content,
  gallery,
  title,
  description = "",
}: {
  content: string;
  gallery: string[];
  title: string;
  description?: string;
}) {
  const body = caseMarkdown(content);
  const overview = caseOverview(content, description);
  const referenced = inlineImageSources(body);
  for (const match of body.matchAll(/\[[^\]]*\]\(\s*([^)\s]+)\s*\)/g)) {
    if (isPdfReference(match[1])) referenced.add(match[1]);
  }
  const remaining = gallery.filter(src => !referenced.has(src));
  const extraLabel = remaining.every(isPdfReference)
    ? "案例 PDF"
    : remaining.some(isPdfReference)
      ? "补充图片与 PDF"
      : "补充图片";
  return (
    <div className="project-story case-study">
      <section className="case-overview" aria-label="案例概览">
        {overview.map(item => {
          const lead =
            item.text.match(/^[\s\S]*?[。！？](?:[”」])?/)?.[0] || item.text;
          return (
            <section className="case-overview-step" key={item.label}>
              <h3>
                {item.label}
                <small>{item.source}</small>
              </h3>
              <p className={item.text ? undefined : "text-muted-foreground"}>
                {lead || "详见下文"}
              </p>
              {lead !== item.text && (
                <details className="case-overview-detail">
                  <summary>展开{item.source}原文</summary>
                  <p>{item.text}</p>
                </details>
              )}
            </section>
          );
        })}
      </section>
      <Markdown
        skipHtml
        allowedElements={[
          "h2",
          "h3",
          "h4",
          "p",
          "strong",
          "em",
          "ul",
          "ol",
          "li",
          "blockquote",
          "hr",
          "img",
          "a",
          "br",
        ]}
        urlTransform={url => {
          const safe = defaultUrlTransform(url);
          return safe && /^(?:https?:\/\/|\/[^/]|#)/.test(safe) ? safe : "";
        }}
        components={{
          img: ({ src, alt }) => {
            if (!src) return null;
            if (isPdfReference(src)) {
              const caption = alt && !/^配图\d+$/.test(alt) ? alt : "";
              return <CasePdf href={src} label={caption || pdfLabel(src)} />;
            }
            return (
              <span className="case-image">
                <img
                  src={src}
                  alt={alt || title + " 项目画面"}
                  loading="lazy"
                  decoding="async"
                />
                {alt && !/^配图\d+$/.test(alt) && <small>{alt}</small>}
              </span>
            );
          },
          a: ({ href, children }) =>
            href && isPdfReference(href) ? (
              <CasePdf
                href={href}
                label={nodeText(children).trim() || pdfLabel(href)}
              />
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
        }}
      >
        {body}
      </Markdown>
      {remaining.length > 0 && (
        <section
          className="project-gallery case-extra-gallery"
          aria-label={extraLabel}
        >
          <h3>{extraLabel}</h3>
          {remaining.map((src, index) =>
            isPdfReference(src) ? (
              <CasePdf
                key={src}
                href={src}
                label={pdfLabel(src, title + " PDF")}
              />
            ) : (
              <img
                key={src}
                src={src}
                alt={title + " 补充图片 " + (index + 1)}
                loading="lazy"
                decoding="async"
              />
            )
          )}
        </section>
      )}
    </div>
  );
}
