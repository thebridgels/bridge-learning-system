import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewMaterialForm } from "@/components/new-material-form";

export default async function NewMaterialPage(props: PageProps<"/materials/new">) {
  const { kind: kindParam, error, source_material_id: sourceMaterialId } =
    await props.searchParams;
  const kind = kindParam === "lesson_plan" ? "lesson_plan" : "material";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classes }, { data: students }, { data: savedMaterials }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, alias")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("students")
      .select("id, alias, class_id")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("source_materials")
      .select("id, title")
      .eq("teacher_id", user.id)
      .eq("kind", kind)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">
        {kind === "lesson_plan" ? "New Lesson Plan" : "New Assignment / Material"}
      </h1>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <NewMaterialForm
        kind={kind}
        classes={classes ?? []}
        students={students ?? []}
        savedMaterials={savedMaterials ?? []}
        preselectedSourceMaterialId={
          typeof sourceMaterialId === "string" ? sourceMaterialId : undefined
        }
      />
    </div>
  );
}
