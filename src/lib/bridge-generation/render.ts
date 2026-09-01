import type { GeneratedDocument } from "./schema";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSections(doc: GeneratedDocument): string {
  return doc.sections
    .map((section) => {
      if (section.type === "heading") {
        const tag = section.level === "3" ? "h3" : "h2";
        return `<${tag}>${escapeHtml(section.text ?? "")}</${tag}>`;
      }
      if (section.type === "list") {
        const tag = section.ordered ? "ol" : "ul";
        const items = (section.items ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
      }
      return `<p>${escapeHtml(section.text ?? "")}</p>`;
    })
    .join("\n");
}

const STYLES = `
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #111; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.2rem; margin-top: 1.75rem; }
  h3 { font-size: 1.05rem; margin-top: 1.25rem; }
  p { margin: 0.5rem 0; }
  ul, ol { padding-left: 1.5rem; }
  .alias-header { font-size: 1rem; color: #555; margin-bottom: 1rem; }
  .doc { page-break-after: always; }
  .doc:last-child { page-break-after: avoid; }
  hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0; }
  @media print { body { margin: 0; padding: 1rem; } }
`;

export function renderDocumentBody(
  doc: GeneratedDocument,
  options?: { studentAlias?: string; classAlias?: string; languageSupportDoc?: GeneratedDocument | null },
): string {
  const header = options?.studentAlias
    ? `<p class="alias-header">${escapeHtml(options.studentAlias)}${
        options.classAlias ? ` &middot; ${escapeHtml(options.classAlias)}` : ""
      }</p>`
    : "";

  const languageSupport = options?.languageSupportDoc
    ? `<hr /><h1>${escapeHtml(options.languageSupportDoc.title)}</h1>${renderSections(options.languageSupportDoc)}`
    : "";

  return `<div class="doc">${header}<h1>${escapeHtml(doc.title)}</h1>${renderSections(doc)}${languageSupport}</div>`;
}

export function renderDocumentPage(
  doc: GeneratedDocument,
  options?: { studentAlias?: string; classAlias?: string; languageSupportDoc?: GeneratedDocument | null },
): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(
    doc.title,
  )}</title><style>${STYLES}</style></head><body>${renderDocumentBody(doc, options)}</body></html>`;
}

export function renderCombinedPage(
  docs: { doc: GeneratedDocument; studentAlias?: string; classAlias?: string; languageSupportDoc?: GeneratedDocument | null }[],
  pageTitle: string,
): string {
  const body = docs.map((d) => renderDocumentBody(d.doc, d)).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(
    pageTitle,
  )}</title><style>${STYLES}</style></head><body>${body}</body></html>`;
}
