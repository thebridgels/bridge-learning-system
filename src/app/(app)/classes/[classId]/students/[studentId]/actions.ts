"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateAlias } from "@/lib/aliases";

const UNIQUE_VIOLATION = "23505";
const MAX_ATTEMPTS = 5;
const TELPAS_LEVELS = ["beginning", "intermediate", "advanced", "advanced_high"] as const;

function studentPath(classId: string, studentId: string) {
  return `/classes/${classId}/students/${studentId}`;
}

function fail(classId: string, studentId: string, message: string): never {
  redirect(`${studentPath(classId, studentId)}?error=${encodeURIComponent(message)}`);
}

export async function regenerateStudentAlias(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!classId || !studentId) redirect("/classes");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("school_year")
    .eq("id", studentId)
    .eq("teacher_id", user.id)
    .single();
  if (!student) redirect("/classes");

  const { data: existingRows } = await supabase
    .from("students")
    .select("alias")
    .eq("teacher_id", user.id)
    .eq("school_year", student.school_year);
  const existing = new Set((existingRows ?? []).map((r) => r.alias));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const alias = generateAlias(existing);
    if (!alias) fail(classId, studentId, "Ran out of unique student aliases for this school year.");

    const { error } = await supabase
      .from("students")
      .update({ alias })
      .eq("id", studentId)
      .eq("teacher_id", user.id);

    if (!error) redirect(studentPath(classId, studentId));
    if (error.code !== UNIQUE_VIOLATION) fail(classId, studentId, error.message);
    existing.add(alias);
  }

  fail(classId, studentId, "Could not generate a unique student alias. Try again.");
}

export async function addStudentAccommodation(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const wording = String(formData.get("wording") ?? "").trim();
  if (!classId || !studentId) redirect("/classes");
  if (!wording) fail(classId, studentId, "Enter accommodation wording.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("accommodation_library")
    .select("id")
    .eq("teacher_id", user.id)
    .eq("wording", wording)
    .maybeSingle();

  let libraryId = existing?.id as string | undefined;

  if (!libraryId) {
    const { data: created, error } = await supabase
      .from("accommodation_library")
      .insert({ teacher_id: user.id, wording })
      .select("id")
      .single();
    if (error) fail(classId, studentId, error.message);
    libraryId = created!.id;
  }

  const { error: assignError } = await supabase
    .from("student_accommodations")
    .insert({
      teacher_id: user.id,
      student_id: studentId,
      accommodation_library_id: libraryId,
    });
  if (assignError && assignError.code !== UNIQUE_VIOLATION) {
    fail(classId, studentId, assignError.message);
  }

  revalidatePath(studentPath(classId, studentId));
  redirect(studentPath(classId, studentId));
}

export async function removeStudentAccommodation(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const assignmentId = String(formData.get("assignment_id") ?? "");
  if (!classId || !studentId) redirect("/classes");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("student_accommodations")
    .delete()
    .eq("id", assignmentId)
    .eq("teacher_id", user.id);

  redirect(studentPath(classId, studentId));
}

export async function upsertLanguageProfile(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const homeLanguage = String(formData.get("home_language") ?? "").trim();
  const listening = String(formData.get("listening_level") ?? "");
  const speaking = String(formData.get("speaking_level") ?? "");
  const reading = String(formData.get("reading_level") ?? "");
  const writing = String(formData.get("writing_level") ?? "");

  if (!classId || !studentId) redirect("/classes");
  if (!homeLanguage) fail(classId, studentId, "Home language is required.");
  for (const level of [listening, speaking, reading, writing]) {
    if (!TELPAS_LEVELS.includes(level as (typeof TELPAS_LEVELS)[number])) {
      fail(classId, studentId, "Select a level for each language domain.");
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("language_profiles").upsert({
    student_id: studentId,
    teacher_id: user.id,
    home_language: homeLanguage,
    listening_level: listening,
    speaking_level: speaking,
    reading_level: reading,
    writing_level: writing,
  });
  if (error) fail(classId, studentId, error.message);

  redirect(studentPath(classId, studentId));
}

export async function deleteLanguageProfile(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!classId || !studentId) redirect("/classes");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("language_profiles")
    .delete()
    .eq("student_id", studentId)
    .eq("teacher_id", user.id);

  redirect(studentPath(classId, studentId));
}
