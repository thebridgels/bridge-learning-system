import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { regenerateClassAlias } from "../actions";
import { createStudent } from "./actions";

export default async function ClassPage(props: PageProps<"/classes/[classId]">) {
  const { classId } = await props.params;
  const { error } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: klass } = await supabase
    .from("classes")
    .select("id, alias, school_year")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single();
  if (!klass) redirect("/classes");

  const { data: students } = await supabase
    .from("students")
    .select("id, alias, created_at")
    .eq("class_id", klass.id)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/classes" className="text-sm underline">
          &larr; Classes
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{klass.alias}</h1>
          <p className="text-xs text-gray-500">{klass.school_year}</p>
        </div>
        <form action={regenerateClassAlias}>
          <input type="hidden" name="class_id" value={klass.id} />
          <button type="submit" className="text-sm underline">
            Regenerate alias
          </button>
        </form>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Students</h2>
          <form action={createStudent}>
            <input type="hidden" name="class_id" value={klass.id} />
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
            >
              + New Student
            </button>
          </form>
        </div>

        {students && students.length > 0 ? (
          <ul className="space-y-2">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/classes/${klass.id}/students/${s.id}`}
                  className="block rounded-md border border-gray-200 px-4 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
                >
                  {s.alias}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No students yet. Click &ldquo;+ New Student&rdquo; to add one.
          </p>
        )}
      </section>
    </div>
  );
}
