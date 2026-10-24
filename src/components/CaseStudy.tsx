import Markdown, { defaultUrlTransform } from "react-markdown";
import { caseMarkdown, inlineImageSources } from "@contracts/project-content";
export default function CaseStudy({
  content,
  gallery,
  title,
}: {
  content: string;
  gallery: string[];
  title: string;
}) {
  const body = caseMarkdown(content);
  const referenced = inlineImageSources(body);
  const remaining = gallery.filter(src => !referenced.has(src));
  return (
    <div className="project-story case-study">
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
          img: ({ src, alt }) =>
            src ? (
              <span className="case-image">
                <img
                  src={src}
                  alt={alt || title + " 项目画面"}
                  loading="lazy"
                  decoding="async"
                />
                {alt && !/^配图\d+$/.test(alt) && <small>{alt}</small>}
              </span>
            ) : null,
          a: ({ href, children }) => (
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
          aria-label="补充项目图片"
        >
          <h3>补充图片</h3>
          {remaining.map((src, index) => (
            <img
              key={src}
              src={src}
              alt={title + " 补充图片 " + (index + 1)}
              loading="lazy"
              decoding="async"
            />
          ))}
        </section>
      )}
    </div>
  );
}
