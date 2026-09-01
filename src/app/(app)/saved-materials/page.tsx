import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteSourceMaterial } from "./actions";

const KIND_LABELS: Record<string, string> = {
  lesson_plan: "Lesson Plan",
  material: "Assignment / Material",
};

export default async function SavedMaterialsPage(props: PageProps<"/saved-materials">) {
  const { notice } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: materials } = await supabase
    .from("source_materials")
    .select("id, title, kind, file_path, pasted_text, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Saved Materials</h1>

      {notice && (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          {notice}
        </p>
      )}

      {materials && materials.length > 0 ? (
        <ul className="space-y-3">
          {materials.map((m) => (
            <li
              key={m.id}
              className="space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    {KIND_LABELS[m.kind] ?? m.kind} &middot;{" "}
                    {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/materials/new?kind=${m.kind}&source_material_id=${m.id}`}
                    className="text-xs underline"
                  >
                    Start adaptation
                  </Link>
                  <form action={deleteSourceMaterial}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="text-xs text-gray-500 underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              {m.file_path ? (
                <a
                  href={`/api/materials/${m.id}/file`}
                  className="text-sm underline"
                >
                  Download file
                </a>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                  {m.pasted_text && m.pasted_text.length > 300
                    ? `${m.pasted_text.slice(0, 300)}…`
                    : m.pasted_text}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Generic worksheets, lesson plans, and reusable templates you keep
          will appear here.
        </p>
      )}
    </div>
  );
}
