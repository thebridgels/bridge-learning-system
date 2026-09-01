import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Deletes every object under this teacher's storage folder. Runs as the authenticated teacher's own client (RLS-scoped) — no service-role. */
export async function deleteAllTeacherStorageObjects(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from("source-materials")
    .list(teacherId, { limit: 1000 });
  if (listError) throw new Error(listError.message);
  if (!files || files.length === 0) return;

  const paths = files.map((f) => `${teacherId}/${f.name}`);
  const { error: removeError } = await supabase.storage.from("source-materials").remove(paths);
  if (removeError) throw new Error(removeError.message);
}
