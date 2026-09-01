export type StudentAccommodationContext = {
  wording: string;
};

export type LanguageProfileContext = {
  homeLanguage: string;
  listening: string;
  speaking: string;
  reading: string;
  writing: string;
};

export type StudentAnalysisContext = {
  alias: string;
  accommodations: StudentAccommodationContext[];
  languageProfile: LanguageProfileContext | null;
};

export type BridgeAnalysisInput = {
  materialKind: "lesson_plan" | "material";
  materialTitle: string;
  materialText: string;
  scopeSummary: string;
  students: StudentAnalysisContext[];
};
