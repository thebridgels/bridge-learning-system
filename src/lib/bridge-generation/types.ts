import type { PlannedSupport, LanguageSupport } from "@/lib/bridge-analysis/schema";

export type GenerationInput = {
  materialKind: "lesson_plan" | "material";
  materialTitle: string;
  materialText: string;
  versionLabel: string;
  studentAliases: string[];
  supports: PlannedSupport[];
  languageSupports: LanguageSupport[];
};
