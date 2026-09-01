import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Isolated from the Bridge Analysis/Generation providers on purpose — swapping
// this for a dedicated OCR service later shouldn't touch either of those.
const client = new Anthropic();

const SUPPORTED_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export async function extractImageText(
  buffer: Buffer,
  mimeType: string,
): Promise<{ text: string | null; error: string | null }> {
  if (!SUPPORTED_MEDIA_TYPES.includes(mimeType as SupportedMediaType)) {
    return { text: null, error: "Unsupported image type for text extraction." };
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system:
        "Transcribe the visible text in the image exactly as written, preserving reading order and structure. Do not summarize, interpret, or add commentary. If the image contains no legible text, respond with exactly: NO_TEXT_FOUND",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as SupportedMediaType,
                data: buffer.toString("base64"),
              },
            },
            { type: "text", text: "Transcribe all visible text from this image." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock?.text?.trim();

    if (!text || text === "NO_TEXT_FOUND") {
      return { text: null, error: "No legible text was found in this image." };
    }

    return { text, error: null };
  } catch {
    return { text: null, error: "Could not extract text from this image." };
  }
}
