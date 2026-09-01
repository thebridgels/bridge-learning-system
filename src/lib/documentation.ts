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
 * Creates/updates one documentation_event per in-scope student, keyed on
 * (teacher, student, adaptation_request) — stable across regenerations of
 * the same request, so re-analyzing/regenerating updates the existing event
 * instead of creating a duplicate for what is really the same lesson/
 * assignment event. System-applied support rows are replaced to match the
 * latest analysis; teacher-confirmed rows (real-world confirmations) are
 * left untouched by a regeneration.
 */
export async function recordGenerationDocumentation(
  supabase: SupabaseClient,
  params: {
    teacherId: string;
    adaptationRequestId: string;
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
          adaptation_request_id: params.adaptationRequestId,
          source_material_id: params.sourceMaterialId,
          generated_material_id: student.generatedMaterialId,
          title: params.title,
        },
        { onConflict: "teacher_id,student_id,adaptation_request_id" },
      )
      .select("id")
      .single();

    if (error || !event) {
      throw new Error(error?.message ?? "Could not create documentation event.");
    }

    // Replace system-applied supports to match the latest analysis; a
    // support relevant in a prior generation but not this one shouldn't
    // linger. Teacher-confirmed rows are untouched here.
    const { error: clearError } = await supabase
      .from("documentation_event_supports")
      .delete()
      .eq("documentation_event_id", event.id)
      .eq("system_applied", true);
    if (clearError) throw new Error(clearError.message);

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
