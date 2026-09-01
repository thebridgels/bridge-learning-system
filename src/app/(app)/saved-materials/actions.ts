"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteSourceMaterial(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/saved-materials");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: material } = await supabase
    .from("source_materials")
    .select("file_path")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (material?.file_path) {
    await supabase.storage.from("source-materials").remove([material.file_path]);
  }

  await supabase.from("source_materials").delete().eq("id", id).eq("teacher_id", user.id);

  redirect("/saved-materials");
}
