import DOMPurify from "isomorphic-dompurify"

/**
 * Sanitizes HTML content for safe storage in the database.
 * Configures DOMPurify to allow safe HTML tags and attributes for email signatures.
 * Removes potentially dangerous content (scripts, event handlers, etc.)
 * while preserving formatting (bold, italic, links, colors, etc.)
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // Allowed tags for email signatures
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "span",
      "div",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "hr",
      "blockquote",
      "font",
    ],
    // Allowed attributes
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "style",
      "class",
      "id",
      "src",
      "alt",
      "width",
      "height",
      "color",
      "face",
      "size",
      "align",
      "valign",
      "colspan",
      "rowspan",
      "border",
      "cellpadding",
      "cellspacing",
    ],
    // Allow data attributes for CKEditor
    ALLOW_DATA_ATTR: false,
    // Remove scripts and event handlers
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    // Keep relative URLs
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Keep relative URLs
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  })
}
