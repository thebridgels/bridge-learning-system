import "server-only";
import mammoth from "mammoth";

export async function extractDocxText(buffer: Buffer): Promise<{ text: string | null; error: string | null }> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim();

    if (!text) {
      return { text: null, error: "This DOCX file has no extractable text." };
    }

    return { text, error: null };
  } catch {
    return { text: null, error: "Could not read this DOCX file." };
  }
}
