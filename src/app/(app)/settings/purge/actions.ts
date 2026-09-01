"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { purgeStudentData } from "@/lib/purge";

const CONFIRM_PHRASE = "DELETE STUDENT DATA";

export async function confirmPurge(formData: FormData) {
  const phrase = String(formData.get("confirm_phrase") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (phrase !== CONFIRM_PHRASE) {
    redirect(`/settings/purge?error=${encodeURIComponent(`Type "${CONFIRM_PHRASE}" exactly to confirm.`)}`);
  }

  try {
    await purgeStudentData(supabase, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Purge failed.";
    redirect(`/settings/purge?error=${encodeURIComponent(message)}`);
  }

  redirect("/settings?notice=" + encodeURIComponent("Student data purged for the new school year."));
}
