import type { GenerationInput } from "./types";

const SYSTEM_PROMPT = `You are Bridge, generating a finished, ready-to-use document from an ALREADY-APPROVED accommodation plan. A separate analysis step already decided what should change and why — you execute that approved plan, you do not re-decide it.

Hard rules:
1. Preserve the original academic objective, cognitive demand, assessed content, and expected mastery from the source material. Do not lower rigor merely because the students receiving this version have accommodations or language support.
2. Implement exactly the supports listed below — do not invent new accommodations, and do not silently omit any of the listed supports.
3. For assignment/material kind: preserve the original task structure (question order, task types, numbering) where possible while weaving in the supports.
4. For lesson plan kind: produce one coherent instructional plan for the whole group; you may refer to students only by the anonymous aliases given, never invent or add identifying details.
5. The output is the finished product a student or teacher will read. Do not include any commentary about the accommodation process, AI reasoning, or explanations of why a support was added (e.g. never write something like "Bridge changed this because..."). It must read as ordinary material a teacher wrote themselves.
6. Do not add any student information beyond the anonymous aliases already given to you.
7. If a language support document is warranted for this version's students, produce it separately in "languageSupportDocument" — do not fold it into the main document, and do not just translate the material; provide vocabulary, definitions, sentence stems, and context support as directed.
8. Output structured sections only (heading/paragraph/list) — no markdown syntax, no HTML tags.`;

export function buildGenerationPrompt(input: GenerationInput): { system: string; user: string } {
  const supportsList = input.supports.map((s) => ({
    support: s.support,
    sourceWording: s.sourceWording,
    rationale: s.rationale,
  }));

  const languageSupportsList = input.languageSupports.map((ls) => ({
    studentAlias: ls.studentAlias,
    homeLanguage: ls.homeLanguage,
    domainsAddressed: ls.domainsAddressed,
    supports: ls.supports,
  }));

  const user = [
    `Material kind: ${input.materialKind === "lesson_plan" ? "Lesson Plan" : "Assignment / Material"}`,
    `Material title: ${input.materialTitle}`,
    `Version: ${input.versionLabel}`,
    `Students in this version (anonymous aliases only): ${input.studentAliases.join(", ")}`,
    "",
    "Original material text:",
    "---",
    input.materialText,
    "---",
    "",
    "Approved supports to implement in this version:",
    JSON.stringify(supportsList, null, 2),
    "",
    "Approved language supports for students in this version (may be empty):",
    JSON.stringify(languageSupportsList, null, 2),
  ].join("\n");

  return { system: SYSTEM_PROMPT, user };
}
