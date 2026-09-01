"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/get-base-url";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your email address.")}`);
  }

  const supabase = await createClient();
  const baseUrl = await getBaseUrl();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/confirm?next=/reset-password`,
  });

  // Always show the same message, whether or not the email exists, so we
  // don't reveal which addresses have accounts.
  redirect(
    `/forgot-password?notice=${encodeURIComponent("If an account exists for that email, a reset link is on its way.")}`,
  );
}
