import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderDocumentBody } from "@/lib/bridge-generation/render";
import type { GeneratedDocument } from "@/lib/bridge-generation/schema";
import { PrintButton } from "@/components/print-button";

export default async function GeneratedMaterialPage(
  props: PageProps<"/generated-materials/[id]">,
) {
  const { id } = await props.params;
  const { student: studentId } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: material } = await supabase
    .from("generated_materials")
    .select("id, version_label, content, analysis_summary, adaptation_request_id, source_material_id")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();
  if (!material) redirect("/saved-materials");

  let studentAlias: string | undefined;
  let classAlias: string | undefined;
  if (typeof studentId === "string" && studentId) {
    const { data: student } = await supabase
      .from("students")
      .select("alias, classes(alias)")
      .eq("id", studentId)
      .eq("teacher_id", user.id)
      .single();
    studentAlias = student?.alias;
    classAlias = (student?.classes as unknown as { alias: string } | null)?.alias;
  }

  const doc = material.content as GeneratedDocument;
  const languageSupportDoc =
    (material.analysis_summary as { languageSupportDocument: GeneratedDocument | null } | null)
      ?.languageSupportDocument ?? null;

  const html = renderDocumentBody(doc, {
    studentAlias,
    classAlias,
    languageSupportDoc,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/adaptation-requests/${material.adaptation_request_id}`}
          className="text-sm underline"
        >
          &larr; Back to results
        </Link>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/generated-materials/${material.id}/download${
              studentAlias ? `?student=${studentId}` : ""
            }`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Download
          </a>
        </div>
      </div>

      <div
        className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 text-gray-900 print:border-0 print:p-0 dark:border-gray-800 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_hr]:my-8"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
