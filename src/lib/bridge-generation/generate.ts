import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveScopeStudents, type ScopedStudent } from "@/lib/scope";
import type { BridgeAnalysisResult, PlannedSupport, LanguageSupport } from "@/lib/bridge-analysis/schema";
import { generateVersion } from "./provider";
import type { GeneratedDocument } from "./schema";

export class GenerationInputError extends Error {}

type AdaptationRequestRow = {
  id: string;
  teacher_id: string;
  scope_type: "all_students" | "class" | "selected_students";
  scope_class_id: string | null;
};

type SourceMaterialRow = {
  title: string;
  kind: "lesson_plan" | "material";
  pasted_text: string | null;
};

export type VersionResult = {
  label: string;
  students: ScopedStudent[];
  supportNames: string[];
  document: GeneratedDocument;
  languageSupportDocument: GeneratedDocument | null;
};

function relevantSupports(supports: PlannedSupport[], aliases: string[]): PlannedSupport[] {
  return supports.filter(
    (s) =>
      s.applyMethod === "system_applied" &&
      (s.appliesToAllStudents || s.appliesToStudentAliases.some((a) => aliases.includes(a))),
  );
}

function relevantLanguageSupports(languageSupports: LanguageSupport[], aliases: string[]): LanguageSupport[] {
  return languageSupports.filter((ls) => aliases.includes(ls.studentAlias));
}

export async function generateVersions(
  supabase: SupabaseClient,
  request: AdaptationRequestRow,
  material: SourceMaterialRow,
  analysis: BridgeAnalysisResult,
): Promise<VersionResult[]> {
  if (!material.pasted_text) {
    throw new GenerationInputError("Source material has no text to generate from.");
  }

  const { students: roster } = await resolveScopeStudents(supabase, request);
  if (roster.length === 0) {
    throw new GenerationInputError("No students are in scope for this adaptation request.");
  }
  const rosterByAlias = new Map(roster.map((s) => [s.alias, s]));

  type Group = { label: string; students: ScopedStudent[] };
  let groups: Group[];

  if (material.kind === "material") {
    if (analysis.versionGroups.length === 0) {
      throw new GenerationInputError(
        "The approved analysis didn't define any versions for this material. Re-run Bridge Analysis.",
      );
    }

    const seenAliases = new Set<string>();
    groups = analysis.versionGroups.map((vg) => {
      const students = vg.studentAliases
        .map((alias) => {
          if (seenAliases.has(alias)) {
            throw new GenerationInputError(
              `Analysis assigned "${alias}" to more than one version. Re-run Bridge Analysis.`,
            );
          }
          seenAliases.add(alias);
          const student = rosterByAlias.get(alias);
          if (!student) {
            throw new GenerationInputError(
              `Analysis referenced a student ("${alias}") who is no longer in scope. Re-run Bridge Analysis.`,
            );
          }
          return student;
        })
        .filter((s): s is ScopedStudent => s !== undefined);
      return { label: vg.label, students };
    });

    const missing = roster.filter((s) => !seenAliases.has(s.alias));
    if (missing.length > 0) {
      throw new GenerationInputError(
        `Analysis didn't assign every student to a version (missing: ${missing.map((s) => s.alias).join(", ")}). Re-run Bridge Analysis.`,
      );
    }
  } else {
    groups = [{ label: "Adapted Lesson Plan", students: roster }];
  }

  const results: VersionResult[] = [];

  for (const group of groups) {
    const aliases = group.students.map((s) => s.alias);
    const supports = relevantSupports(analysis.plannedSupports, aliases);
    const languageSupports = relevantLanguageSupports(analysis.languageSupports, aliases);

    const generation = await generateVersion({
      materialKind: material.kind,
      materialTitle: material.title,
      materialText: material.pasted_text,
      versionLabel: group.label,
      studentAliases: aliases,
      supports,
      languageSupports,
    });

    results.push({
      label: group.label,
      students: group.students,
      supportNames: supports.map((s) => s.support),
      document: generation.document,
      languageSupportDocument: generation.languageSupportDocument,
    });
  }

  return results;
}
