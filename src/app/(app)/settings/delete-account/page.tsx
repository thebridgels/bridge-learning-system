import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { deleteAccount } from "./actions";

export default async function DeleteAccountPage(props: PageProps<"/settings/delete-account">) {
  const { error } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/settings" className="text-sm underline">
          &larr; Settings
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">Delete Account</h1>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        <p className="font-medium">This permanently deletes your account:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Every class and student, and everything linked to them</li>
          <li>Your accommodation phrase library</li>
          <li>Your saved source materials and uploaded files</li>
          <li>Your teacher profile and settings</li>
          <li>Your login itself — you will not be able to sign in with this email and password again</li>
        </ul>
        <p className="mt-3">This cannot be undone.</p>
      </div>

      <form action={deleteAccount} className="space-y-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirm" required className="mt-1" />
          I understand this permanently deletes my account and cannot be undone.
        </label>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium">
            Enter your password to confirm
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <SubmitButton
          pendingText="Deleting…"
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Permanently delete my account
        </SubmitButton>
      </form>
    </div>
  );
}
