import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { confirmPurge } from "./actions";

export default async function PurgePage(props: PageProps<"/settings/purge">) {
  const { error } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ count: classCount }, { count: studentCount }] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("teacher_id", user.id),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("teacher_id", user.id),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/settings" className="text-sm underline">
          &larr; Settings
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">Purge Student Data</h1>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        <p className="font-medium">This will permanently delete:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{classCount ?? 0} class{classCount === 1 ? "" : "es"}</li>
          <li>{studentCount ?? 0} student{studentCount === 1 ? "" : "s"} and their accommodation assignments, language profiles</li>
          <li>All generated materials, routing, documentation events, and documentation supports tied to those students</li>
        </ul>
        <p className="mt-3">This cannot be undone. There is no option to keep this data for another year.</p>
      </div>

      <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
        <p className="font-medium text-gray-900 dark:text-gray-100">This will NOT delete:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your teacher account and settings</li>
          <li>Your accommodation phrase library</li>
          <li>Saved generic source materials</li>
        </ul>
      </div>

      <p className="text-sm">
        <Link href="/reports" className="underline">
          Print or download your reports
        </Link>{" "}
        before purging if you need a record.
      </p>

      <form action={confirmPurge} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="confirm_phrase" className="block text-sm font-medium">
            Type <span className="font-mono">DELETE STUDENT DATA</span> to confirm
          </label>
          <input
            id="confirm_phrase"
            name="confirm_phrase"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <SubmitButton
          pendingText="Purging…"
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Permanently purge student data
        </SubmitButton>
      </form>
    </div>
  );
}
