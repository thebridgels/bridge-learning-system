import { z } from "zod";

export const SUPPORT_TYPES = ["accommodation", "modification"] as const;
export const APPLY_METHODS = ["system_applied", "teacher_confirmed"] as const;
export const TELPAS_DOMAINS = ["listening", "speaking", "reading", "writing"] as const;

export const PlannedSupportSchema = z.object({
  support: z
    .string()
    .describe("Plain-language description of the support Bridge plans to apply."),
  sourceWording: z
    .string()
    .nullable()
    .describe(
      "The teacher's exact accommodation wording this support is derived from, verbatim. Null only if this is a Bridge-proposed instructional strategy not tied to any specific teacher-entered accommodation.",
    ),
  supportType: z
    .enum(SUPPORT_TYPES)
    .describe(
      "'accommodation' changes access without changing the standard, cognitive demand, or expected mastery. 'modification' changes the academic standard itself. Default to 'accommodation' unless the teacher's wording explicitly authorizes a curriculum change.",
    ),
  applyMethod: z
    .enum(APPLY_METHODS)
    .describe(
      "'system_applied' if Bridge can implement this directly in the adapted material (chunking, graphic organizers, vocabulary support, formatting). 'teacher_confirmed' if it can only happen in the physical classroom and must be manually confirmed later (extended time, small group, preferential seating, oral directions, read-aloud, breaks).",
    ),
  rationale: z.string().describe("Why this support is relevant to this material and these students."),
  appliesToAllStudents: z.boolean(),
  appliesToStudentAliases: z
    .array(z.string())
    .describe("Student aliases this applies to. Empty array if appliesToAllStudents is true."),
});

export const LanguageSupportSchema = z.object({
  studentAlias: z.string(),
  homeLanguage: z.string(),
  domainsAddressed: z
    .array(z.enum(TELPAS_DOMAINS))
    .min(1)
    .describe("Only the TELPAS domains actually relevant to this material's task demands."),
  supports: z
    .array(z.string())
    .describe(
      "Plain descriptions of language supports planned for this student: home-language academic vocabulary, student-friendly definitions, sentence stems, functional classroom language, background/context support. Never just 'translate the material'.",
    ),
});

export const VersionGroupSchema = z.object({
  label: z.string().describe("e.g. 'Standard', 'Version A', 'Version B'."),
  studentAliases: z.array(z.string()),
  supportNames: z
    .array(z.string())
    .describe("Which plannedSupports (matched by their `support` text) apply to this version."),
});

export const BridgeAnalysisResultSchema = z.object({
  summary: z
    .string()
    .describe("Plain-language summary of what Bridge plans to do, written for the teacher to review."),
  rigorPreserved: z
    .boolean()
    .describe("False only if at least one planned support is a 'modification'."),
  rigorNote: z
    .string()
    .describe("One or two sentences explaining the rigor determination for this material."),
  plannedSupports: z.array(PlannedSupportSchema),
  languageSupports: z
    .array(LanguageSupportSchema)
    .describe("One entry per student with a language profile relevant to this material. Empty array if none."),
  versionGroups: z
    .array(VersionGroupSchema)
    .describe(
      "Only for assignment/material kind: the minimum number of genuinely necessary versions, grouping students who need equivalent treatment. Empty array for lesson plans.",
    ),
  reviewNotes: z
    .array(z.string())
    .describe("Anything Bridge is unsure about or wants the teacher's attention on before generating."),
});

export type PlannedSupport = z.infer<typeof PlannedSupportSchema>;
export type LanguageSupport = z.infer<typeof LanguageSupportSchema>;
export type VersionGroup = z.infer<typeof VersionGroupSchema>;
export type BridgeAnalysisResult = z.infer<typeof BridgeAnalysisResultSchema>;
