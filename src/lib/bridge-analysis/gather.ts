import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveScopeStudents } from "@/lib/scope";
import type { BridgeAnalysisInput, StudentAnalysisContext } from "./types";

type AdaptationRequestRow = {
  id: string;
  teacher_id: string;
  source_material_id: string;
  scope_type: "all_students" | "class" | "selected_students";
  scope_class_id: string | null;
};

export class AnalysisInputError extends Error {}

export async function gatherAnalysisInput(
  supabase: SupabaseClient,
  request: AdaptationRequestRow,
): Promise<BridgeAnalysisInput> {
  const { data: material } = await supabase
    .from("source_materials")
    .select("title, kind, pasted_text")
    .eq("id", request.source_material_id)
    .eq("teacher_id", request.teacher_id)
    .single();

  if (!material) throw new AnalysisInputError("Source material not found.");
  if (!material.pasted_text) {
    throw new AnalysisInputError(
      "This material has no extracted or pasted text yet, so it can't be analyzed.",
    );
  }

  const { students: studentRows, scopeSummary } = await resolveScopeStudents(supabase, request);

  if (studentRows.length === 0) {
    throw new AnalysisInputError("No students are in scope for this adaptation request.");
  }

  const studentIds = studentRows.map((s) => s.id);

  const [{ data: accommodationRows }, { data: languageRows }] = await Promise.all([
    supabase
      .from("student_accommodations")
      .select("student_id, accommodation_library(wording)")
      .eq("teacher_id", request.teacher_id)
      .eq("active", true)
      .in("student_id", studentIds),
    supabase
      .from("language_profiles")
      .select("student_id, home_language, listening_level, speaking_level, reading_level, writing_level")
      .eq("teacher_id", request.teacher_id)
      .in("student_id", studentIds),
  ]);

  const accommodationsByStudent = new Map<string, { wording: string }[]>();
  for (const row of accommodationRows ?? []) {
    const wording = (row.accommodation_library as unknown as { wording: string } | null)?.wording;
    if (!wording) continue;
    const list = accommodationsByStudent.get(row.student_id) ?? [];
    list.push({ wording });
    accommodationsByStudent.set(row.student_id, list);
  }

  const languageByStudent = new Map<string, StudentAnalysisContext["languageProfile"]>();
  for (const row of languageRows ?? []) {
    languageByStudent.set(row.student_id, {
      homeLanguage: row.home_language,
      listening: row.listening_level,
      speaking: row.speaking_level,
      reading: row.reading_level,
      writing: row.writing_level,
    });
  }

  const students: StudentAnalysisContext[] = studentRows.map((s) => ({
    alias: s.alias,
    accommodations: accommodationsByStudent.get(s.id) ?? [],
    languageProfile: languageByStudent.get(s.id) ?? null,
  }));

  return {
    materialKind: material.kind,
    materialTitle: material.title,
    materialText: material.pasted_text,
    scopeSummary,
    students,
  };
}
