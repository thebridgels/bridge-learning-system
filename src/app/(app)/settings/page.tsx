import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateProfile, updatePassword } from "./actions";

export default async function SettingsPage(props: PageProps<"/settings">) {
  const { error, notice } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("teacher_profiles")
    .select("display_name, school_year_end_date, plan_status")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          {notice}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Profile</h2>
        <form action={updateProfile} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="display_name" className="block text-sm font-medium">
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="school_year_end_date" className="block text-sm font-medium">
              School year end date
            </label>
            <input
              id="school_year_end_date"
              name="school_year_end_date"
              type="date"
              defaultValue={profile?.school_year_end_date ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <p className="text-xs text-gray-500">
              Student-linked data is deleted after this date, per year.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Save
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Account</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Plan: {profile?.plan_status ?? "beta"}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Password</h2>
        <form action={updatePassword} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Update password
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Data &amp; deletion</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Student-linked records (classes, students, accommodations, language
          profiles, generated materials, documentation) are automatically
          deleted at school-year end. Export options will be available before
          deletion runs.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Delete account</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Account deletion is not yet available in this beta. Contact support
          to request account deletion.
        </p>
      </section>
    </div>
  );
}
