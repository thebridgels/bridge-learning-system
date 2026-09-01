"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/settings?error=${encodeURIComponent(message)}`);
}

export async function updateProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const schoolYearEndDate = String(formData.get("school_year_end_date") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("teacher_profiles")
    .update({
      display_name: displayName || null,
      school_year_end_date: schoolYearEndDate || null,
    })
    .eq("id", user.id);

  if (error) fail(error.message);

  revalidatePath("/settings");
  redirect("/settings?notice=" + encodeURIComponent("Settings saved."));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    fail("Password must be at least 8 characters.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail(error.message);

  redirect("/settings?notice=" + encodeURIComponent("Password updated."));
}
