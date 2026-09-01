import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renameAccommodation, deleteAccommodation, mergeAccommodation } from "./actions";

export default async function AccommodationLibraryPage(
  props: PageProps<"/accommodation-library">,
) {
  const { error } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: library } = await supabase
    .from("accommodation_library")
    .select("id, wording")
    .eq("teacher_id", user.id)
    .order("wording", { ascending: true });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Accommodation Library</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your saved accommodation wording, in your own words. Add new phrases
          from a student&rsquo;s profile.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {library && library.length > 0 ? (
        <ul className="space-y-3">
          {library.map((entry) => (
            <li
              key={entry.id}
              className="space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-800"
            >
              <form action={renameAccommodation} className="flex gap-2">
                <input type="hidden" name="id" value={entry.id} />
                <input
                  name="wording"
                  defaultValue={entry.wording}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Rename
                </button>
              </form>

              <div className="flex items-center justify-between gap-2">
                <form action={mergeAccommodation} className="flex items-center gap-2">
                  <input type="hidden" name="from_id" value={entry.id} />
                  <label className="text-xs text-gray-500">Merge into</label>
                  <select
                    name="into_id"
                    defaultValue=""
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="" disabled>
                      Choose entry
                    </option>
                    {library
                      .filter((other) => other.id !== entry.id)
                      .map((other) => (
                        <option key={other.id} value={other.id}>
                          {other.wording}
                        </option>
                      ))}
                  </select>
                  <button type="submit" className="text-xs underline">
                    Merge
                  </button>
                </form>

                <form action={deleteAccommodation}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button type="submit" className="text-xs text-gray-500 underline">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your saved accommodation wording will appear here once you start
          adding accommodations to students.
        </p>
      )}
    </div>
  );
}
