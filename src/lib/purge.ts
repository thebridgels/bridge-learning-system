import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deletes all student-linked data for a teacher's school year. Relies on the
 * cascade graph rooted at classes/adaptation_requests: deleting a class
 * cascades to its students, which cascades to language_profiles,
 * student_accommodations, adaptation_request_students, material_student_routes,
 * and documentation_events (-> documentation_event_supports); deleting an
 * adaptation_request cascades to its generated_materials (-> routes).
 * teacher_profiles, accommodation_library, and source_materials are never
 * touched here.
 *
 * Runs as the authenticated teacher's own client (RLS-scoped) — no
 * service-role. Kept as a standalone function so a future scheduled job can
 * call it the same way once it can authenticate as the target teacher.
 */
export async function purgeStudentData(supabase: SupabaseClient, teacherId: string): Promise<void> {
  const { error: adaptationError } = await supabase
    .from("adaptation_requests")
    .delete()
    .eq("teacher_id", teacherId);
  if (adaptationError) throw new Error(adaptationError.message);

  const { error: classesError } = await supabase.from("classes").delete().eq("teacher_id", teacherId);
  if (classesError) throw new Error(classesError.message);
}
