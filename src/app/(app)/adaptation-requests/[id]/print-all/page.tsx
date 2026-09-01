import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderDocumentBody } from "@/lib/bridge-generation/render";
import type { GeneratedDocument } from "@/lib/bridge-generation/schema";
import { PrintButton } from "@/components/print-button";

export default async function PrintAllPage(
  props: PageProps<"/adaptation-requests/[id]/print-all">,
) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: materials } = await supabase
    .from("generated_materials")
    .select("id, content, analysis_summary")
    .eq("adaptation_request_id", id)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });
  if (!materials || materials.length === 0) redirect(`/adaptation-requests/${id}`);

  const html = materials
    .map((m) => {
      const doc = m.content as GeneratedDocument;
      const languageSupportDoc =
        (m.analysis_summary as { languageSupportDocument: GeneratedDocument | null } | null)
          ?.languageSupportDocument ?? null;
      return renderDocumentBody(doc, { languageSupportDoc });
    })
    .join("\n");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/adaptation-requests/${id}`} className="text-sm underline">
          &larr; Back to results
        </Link>
        <PrintButton label="Print all" />
      </div>

      <div
        className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 text-gray-900 print:border-0 print:p-0 dark:border-gray-800 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_hr]:my-8 [&_.doc]:border-b [&_.doc]:pb-8 [&_.doc:last-child]:border-0 print:[&_.doc]:break-after-page"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
