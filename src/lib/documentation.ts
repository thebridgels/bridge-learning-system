import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BridgeAnalysisResult, PlannedSupport } from "@/lib/bridge-analysis/schema";

export type StudentRoute = { id: string; alias: string; generatedMaterialId: string };

function relevantSupports(
  supports: PlannedSupport[],
  alias: string,
  method: "system_applied" | "teacher_confirmed",
): PlannedSupport[] {
  return supports.filter(
    (s) => s.applyMethod === method && (s.appliesToAllStudents || s.appliesToStudentAliases.includes(alias)),
  );
}

/** Candidate teacher-confirmable supports for a student — derived live from analysis, never pre-persisted. */
export function teacherConfirmableCandidates(
  analysis: BridgeAnalysisResult,
  alias: string,
): PlannedSupport[] {
  return relevantSupports(analysis.plannedSupports, alias, "teacher_confirmed");
}

/**
 * Creates/updates one documentation_event per in-scope student plus
 * documentation_event_supports rows for the system-applied supports Bridge
 * actually embedded for them. Idempotent — safe to call again for the same
 * (teacher, student, generated_material) after a regeneration.
 */
export async function recordGenerationDocumentation(
  supabase: SupabaseClient,
  params: {
    teacherId: string;
    sourceMaterialId: string;
    title: string;
    analysis: BridgeAnalysisResult;
    studentRoutes: StudentRoute[];
  },
): Promise<void> {
  for (const student of params.studentRoutes) {
    const { data: event, error } = await supabase
      .from("documentation_events")
      .upsert(
        {
          teacher_id: params.teacherId,
          student_id: student.id,
          source_material_id: params.sourceMaterialId,
          generated_material_id: student.generatedMaterialId,
          title: params.title,
        },
        { onConflict: "teacher_id,student_id,generated_material_id" },
      )
      .select("id")
      .single();

    if (error || !event) {
      throw new Error(error?.message ?? "Could not create documentation event.");
    }

    const systemApplied = relevantSupports(params.analysis.plannedSupports, student.alias, "system_applied");
    if (systemApplied.length === 0) continue;

    const rows = systemApplied.map((s) => ({
      teacher_id: params.teacherId,
      documentation_event_id: event.id,
      wording_snapshot: s.sourceWording ?? s.support,
      support_type: s.supportType,
      system_applied: true,
      teacher_confirmed: false,
    }));

    const { error: supportsError } = await supabase
      .from("documentation_event_supports")
      .upsert(rows, { onConflict: "documentation_event_id,wording_snapshot" });
    if (supportsError) throw new Error(supportsError.message);
  }
}
