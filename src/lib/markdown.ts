import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});

export function renderMarkdown(markdown: string) {
  const html = parser.render(markdown);

  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "h3", "img", "table", "thead", "tbody", "tr", "th", "td"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      th: ["align"],
      td: ["align"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noreferrer", target: "_blank" })
    }
  });
}
