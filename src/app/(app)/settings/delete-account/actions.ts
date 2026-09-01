"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAllTeacherStorageObjects } from "@/lib/account-deletion";

function fail(message: string): never {
  redirect(`/settings/delete-account?error=${encodeURIComponent(message)}`);
}

export async function deleteAccount(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmed = formData.get("confirm") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  if (!confirmed) fail("Confirm you understand this is permanent.");
  if (!password) fail("Enter your password to confirm.");

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError) fail("Incorrect password.");

  try {
    await deleteAllTeacherStorageObjects(supabase, user.id);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Could not delete stored files.");
  }

  // Deleting teacher_profiles cascades to every table that references it:
  // classes, students, accommodation_library, source_materials,
  // adaptation_requests, generated_materials, documentation, etc.
  const { error: deleteError } = await supabase.from("teacher_profiles").delete().eq("id", user.id);
  if (deleteError) fail(deleteError.message);

  // Only ever deletes the caller's own id (from the authenticated session,
  // never client input) — the one place in this app that uses the
  // service-role key.
  const admin = createAdminClient();
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);

  await supabase.auth.signOut();

  if (authDeleteError) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Your account data was deleted, but we couldn't remove your login. Contact support to finish deleting your account.",
      )}`,
    );
  }

  redirect("/login?notice=" + encodeURIComponent("Your account has been permanently deleted."));
}
