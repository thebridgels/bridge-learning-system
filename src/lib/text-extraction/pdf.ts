import "server-only";

export async function extractPdfText(buffer: Buffer): Promise<{ text: string | null; error: string | null }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = result.text?.trim();

    if (!text) {
      return {
        text: null,
        error:
          "This PDF has no extractable text layer (it's likely a scanned document). Scanned PDFs aren't supported yet.",
      };
    }

    return { text, error: null };
  } catch {
    return { text: null, error: "Could not read this PDF file." };
  } finally {
    await parser.destroy();
  }
}
