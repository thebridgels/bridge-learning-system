import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClass } from "./actions";

export default async function ClassesPage(props: PageProps<"/classes">) {
  const { error } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, alias, school_year, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Classes</h1>
        <form action={createClass}>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            + New Class
          </button>
        </form>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {classes && classes.length > 0 ? (
        <ul className="space-y-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/classes/${c.id}`}
                className="block rounded-md border border-gray-200 px-4 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <p className="font-medium">{c.alias}</p>
                <p className="text-xs text-gray-500">{c.school_year}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No classes yet. Click &ldquo;+ New Class&rdquo; to create one.
        </p>
      )}
    </div>
  );
}
