import { z } from "zod";

// Structured, renderer-agnostic document shape: supports HTML rendering now
// and PDF generation later without re-shaping stored content.
export const DocumentSectionSchema = z.object({
  type: z.enum(["heading", "paragraph", "list"]),
  text: z
    .string()
    .nullable()
    .describe("Body text. Used for 'heading' and 'paragraph' types; null for 'list'."),
  items: z
    .array(z.string())
    .nullable()
    .describe("List items. Used only for 'list' type; null otherwise."),
  ordered: z
    .boolean()
    .nullable()
    .describe("Whether a 'list' is numbered (true) or bulleted (false/null)."),
  level: z
    .enum(["2", "3"])
    .nullable()
    .describe("Heading level. Used only for 'heading' type; null otherwise."),
});

export const GeneratedDocumentSchema = z.object({
  title: z.string(),
  sections: z.array(DocumentSectionSchema),
});

export const GenerationResultSchema = z.object({
  document: GeneratedDocumentSchema,
  languageSupportDocument: GeneratedDocumentSchema.nullable().describe(
    "A separate student-facing language support document, only when relevant to the students in this version. Null otherwise.",
  ),
});

export type DocumentSection = z.infer<typeof DocumentSectionSchema>;
export type GeneratedDocument = z.infer<typeof GeneratedDocumentSchema>;
export type GenerationResult = z.infer<typeof GenerationResultSchema>;
