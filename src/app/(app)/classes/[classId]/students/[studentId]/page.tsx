import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  regenerateStudentAlias,
  addStudentAccommodation,
  removeStudentAccommodation,
  upsertLanguageProfile,
  deleteLanguageProfile,
} from "./actions";

const TELPAS_OPTIONS = [
  { value: "beginning", label: "Beginning" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "advanced_high", label: "Advanced High" },
] as const;

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900";

export default async function StudentPage(
  props: PageProps<"/classes/[classId]/students/[studentId]">,
) {
  const { classId, studentId } = await props.params;
  const { error } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, alias, class_id, classes(alias)")
    .eq("id", studentId)
    .eq("teacher_id", user.id)
    .single();
  if (!student || student.class_id !== classId) redirect(`/classes/${classId}`);

  const classAlias = (student.classes as unknown as { alias: string } | null)?.alias;

  const [{ data: assignments }, { data: library }, { data: languageProfile }] =
    await Promise.all([
      supabase
        .from("student_accommodations")
        .select("id, accommodation_library(id, wording)")
        .eq("student_id", studentId)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("accommodation_library")
        .select("wording")
        .eq("teacher_id", user.id)
        .order("wording", { ascending: true }),
      supabase
        .from("language_profiles")
        .select("home_language, listening_level, speaking_level, reading_level, writing_level")
        .eq("student_id", studentId)
        .eq("teacher_id", user.id)
        .maybeSingle(),
    ]);

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link href={`/classes/${classId}`} className="text-sm underline">
          &larr; {classAlias ?? "Class"}
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{student.alias}</h1>
          <p className="text-xs text-gray-500">{classAlias}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/reports?scope=student&student_id=${studentId}`} className="text-sm underline">
            Documentation
          </Link>
          <form action={regenerateStudentAlias}>
            <input type="hidden" name="class_id" value={classId} />
            <input type="hidden" name="student_id" value={studentId} />
            <button type="submit" className="text-sm underline">
              Regenerate alias
            </button>
          </form>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Accommodations</h2>

        {assignments && assignments.length > 0 ? (
          <ul className="space-y-2">
            {assignments.map((a) => {
              const accommodation = a.accommodation_library as unknown as {
                id: string;
                wording: string;
              } | null;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                >
                  <span>{accommodation?.wording}</span>
                  <form action={removeStudentAccommodation}>
                    <input type="hidden" name="class_id" value={classId} />
                    <input type="hidden" name="student_id" value={studentId} />
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <button type="submit" className="text-xs text-gray-500 underline">
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No accommodations assigned yet.
          </p>
        )}

        <form action={addStudentAccommodation} className="flex gap-2">
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="student_id" value={studentId} />
          <input
            name="wording"
            list="accommodation-library-options"
            placeholder="Accommodation wording"
            required
            className={inputClass}
          />
          <datalist id="accommodation-library-options">
            {(library ?? []).map((entry) => (
              <option key={entry.wording} value={entry.wording} />
            ))}
          </datalist>
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Add
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Emergent Bilingual Profile</h2>

        <form action={upsertLanguageProfile} className="space-y-3">
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="student_id" value={studentId} />

          <div className="space-y-1">
            <label htmlFor="home_language" className="block text-sm font-medium">
              Home language
            </label>
            <input
              id="home_language"
              name="home_language"
              defaultValue={languageProfile?.home_language ?? ""}
              className={inputClass}
            />
          </div>

          {(
            [
              ["listening_level", "Listening", languageProfile?.listening_level],
              ["speaking_level", "Speaking", languageProfile?.speaking_level],
              ["reading_level", "Reading", languageProfile?.reading_level],
              ["writing_level", "Writing", languageProfile?.writing_level],
            ] as const
          ).map(([name, label, value]) => (
            <div key={name} className="space-y-1">
              <label htmlFor={name} className="block text-sm font-medium">
                {label}
              </label>
              <select
                id={name}
                name={name}
                defaultValue={value ?? ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a level
                </option>
                {TELPAS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {languageProfile ? "Save" : "Add language profile"}
          </button>
        </form>

        {languageProfile && (
          <form action={deleteLanguageProfile}>
            <input type="hidden" name="class_id" value={classId} />
            <input type="hidden" name="student_id" value={studentId} />
            <button type="submit" className="text-sm text-gray-500 underline">
              Remove language profile
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
