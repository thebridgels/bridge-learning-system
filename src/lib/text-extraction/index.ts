import "server-only";
import { extractPdfText } from "./pdf";
import { extractDocxText } from "./docx";
import { extractImageText } from "./image";

export type ExtractionResult = { text: string | null; error: string | null };

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Dispatches to the right extractor by MIME type. Returns { text: null, error } for unsupported types. */
export async function extractText(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") return extractPdfText(buffer);
  if (mimeType === DOCX_MIME) return extractDocxText(buffer);
  if (mimeType.startsWith("image/")) return extractImageText(buffer, mimeType);

  return { text: null, error: "Text extraction is not supported for this file type." };
}
