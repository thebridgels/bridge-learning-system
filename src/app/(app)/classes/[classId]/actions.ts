"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateAlias } from "@/lib/aliases";

const UNIQUE_VIOLATION = "23505";
const MAX_ATTEMPTS = 5;

export async function createStudent(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  if (!classId) redirect("/classes");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: klass } = await supabase
    .from("classes")
    .select("id, school_year")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single();
  if (!klass) redirect("/classes");

  const { data: existingRows } = await supabase
    .from("students")
    .select("alias")
    .eq("teacher_id", user.id)
    .eq("school_year", klass.school_year);
  const existing = new Set((existingRows ?? []).map((r) => r.alias));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const alias = generateAlias(existing);
    if (!alias) {
      redirect(`/classes/${classId}?error=${encodeURIComponent("Ran out of unique student aliases for this school year.")}`);
    }

    const { data: created, error } = await supabase
      .from("students")
      .insert({
        teacher_id: user.id,
        class_id: klass.id,
        alias,
        school_year: klass.school_year,
      })
      .select("id")
      .single();

    if (!error && created) {
      redirect(`/classes/${classId}/students/${created.id}`);
    }
    if (error && error.code !== UNIQUE_VIOLATION) {
      redirect(`/classes/${classId}?error=${encodeURIComponent(error.message)}`);
    }
    existing.add(alias);
  }

  redirect(`/classes/${classId}?error=${encodeURIComponent("Could not generate a unique student alias. Try again.")}`);
}
