import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ScopedStudent = { id: string; alias: string };

type ScopeSource = {
  id: string;
  teacher_id: string;
  scope_type: "all_students" | "class" | "selected_students";
  scope_class_id: string | null;
};

/** Resolves which students an adaptation request's scope selection refers to. */
export async function resolveScopeStudents(
  supabase: SupabaseClient,
  scope: ScopeSource,
): Promise<{ students: ScopedStudent[]; scopeSummary: string }> {
  let students: ScopedStudent[] = [];
  let scopeSummary = "";

  if (scope.scope_type === "all_students") {
    const { data } = await supabase
      .from("students")
      .select("id, alias")
      .eq("teacher_id", scope.teacher_id);
    students = data ?? [];
    scopeSummary = "All students";
  } else if (scope.scope_type === "class") {
    const { data: klass } = await supabase
      .from("classes")
      .select("alias")
      .eq("id", scope.scope_class_id ?? "")
      .eq("teacher_id", scope.teacher_id)
      .single();
    const { data } = await supabase
      .from("students")
      .select("id, alias")
      .eq("teacher_id", scope.teacher_id)
      .eq("class_id", scope.scope_class_id ?? "");
    students = data ?? [];
    scopeSummary = `One class: ${klass?.alias ?? "unknown class"}`;
  } else {
    const { data } = await supabase
      .from("adaptation_request_students")
      .select("students(id, alias)")
      .eq("adaptation_request_id", scope.id)
      .eq("teacher_id", scope.teacher_id);
    students = (data ?? [])
      .map((row) => row.students as unknown as ScopedStudent | null)
      .filter((s): s is ScopedStudent => s !== null);
    scopeSummary = `${students.length} selected student${students.length === 1 ? "" : "s"}`;
  }

  return { students, scopeSummary };
}
