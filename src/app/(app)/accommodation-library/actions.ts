"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/accommodation-library?error=${encodeURIComponent(message)}`);
}

export async function renameAccommodation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const wording = String(formData.get("wording") ?? "").trim();
  if (!id || !wording) fail("Wording is required.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("accommodation_library")
    .update({ wording })
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) fail(error.message);

  revalidatePath("/accommodation-library");
  redirect("/accommodation-library");
}

export async function deleteAccommodation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/accommodation-library");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("accommodation_library")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  redirect("/accommodation-library");
}

export async function mergeAccommodation(formData: FormData) {
  const fromId = String(formData.get("from_id") ?? "");
  const intoId = String(formData.get("into_id") ?? "");
  if (!fromId || !intoId || fromId === intoId) {
    fail("Choose a different entry to merge into.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignments } = await supabase
    .from("student_accommodations")
    .select("id, student_id")
    .eq("teacher_id", user.id)
    .eq("accommodation_library_id", fromId);

  for (const assignment of assignments ?? []) {
    const { error: insertError } = await supabase
      .from("student_accommodations")
      .insert({
        teacher_id: user.id,
        student_id: assignment.student_id,
        accommodation_library_id: intoId,
      });
    // Ignore unique-violation: the student already has the target accommodation.
    if (insertError && insertError.code !== "23505") fail(insertError.message);

    await supabase.from("student_accommodations").delete().eq("id", assignment.id);
  }

  const { error: deleteError } = await supabase
    .from("accommodation_library")
    .delete()
    .eq("id", fromId)
    .eq("teacher_id", user.id);
  if (deleteError) fail(deleteError.message);

  revalidatePath("/accommodation-library");
  redirect("/accommodation-library");
}
