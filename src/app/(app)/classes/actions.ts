"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateAlias } from "@/lib/aliases";
import { getCurrentSchoolYear } from "@/lib/school-year";

const UNIQUE_VIOLATION = "23505";
const MAX_ATTEMPTS = 5;

export async function createClass() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolYear = getCurrentSchoolYear();

  const { data: existingRows } = await supabase
    .from("classes")
    .select("alias")
    .eq("teacher_id", user.id)
    .eq("school_year", schoolYear);
  const existing = new Set((existingRows ?? []).map((r) => r.alias));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const alias = generateAlias(existing);
    if (!alias) {
      redirect(`/classes?error=${encodeURIComponent("Ran out of unique class aliases for this school year.")}`);
    }

    const { data: created, error } = await supabase
      .from("classes")
      .insert({ teacher_id: user.id, alias, school_year: schoolYear })
      .select("id")
      .single();

    if (!error && created) {
      redirect(`/classes/${created.id}`);
    }
    if (error && error.code !== UNIQUE_VIOLATION) {
      redirect(`/classes?error=${encodeURIComponent(error.message)}`);
    }
    existing.add(alias);
  }

  redirect(`/classes?error=${encodeURIComponent("Could not generate a unique class alias. Try again.")}`);
}

export async function regenerateClassAlias(formData: FormData) {
  const classId = String(formData.get("class_id") ?? "");
  if (!classId) redirect("/classes");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: klass } = await supabase
    .from("classes")
    .select("school_year")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single();
  if (!klass) redirect("/classes");

  const { data: existingRows } = await supabase
    .from("classes")
    .select("alias")
    .eq("teacher_id", user.id)
    .eq("school_year", klass.school_year);
  const existing = new Set((existingRows ?? []).map((r) => r.alias));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const alias = generateAlias(existing);
    if (!alias) {
      redirect(`/classes/${classId}?error=${encodeURIComponent("Ran out of unique class aliases for this school year.")}`);
    }

    const { error } = await supabase
      .from("classes")
      .update({ alias })
      .eq("id", classId)
      .eq("teacher_id", user.id);

    if (!error) redirect(`/classes/${classId}`);
    if (error.code !== UNIQUE_VIOLATION) {
      redirect(`/classes/${classId}?error=${encodeURIComponent(error.message)}`);
    }
    existing.add(alias);
  }

  redirect(`/classes/${classId}?error=${encodeURIComponent("Could not generate a unique class alias. Try again.")}`);
}
