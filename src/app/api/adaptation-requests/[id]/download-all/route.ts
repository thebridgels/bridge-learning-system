import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderCombinedPage } from "@/lib/bridge-generation/render";
import type { GeneratedDocument } from "@/lib/bridge-generation/schema";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/adaptation-requests/[id]/download-all">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const { data: request } = await supabase
    .from("adaptation_requests")
    .select("id, source_materials(title)")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();
  if (!request) return new NextResponse(null, { status: 404 });

  const { data: materials } = await supabase
    .from("generated_materials")
    .select("content, analysis_summary")
    .eq("adaptation_request_id", id)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });
  if (!materials || materials.length === 0) return new NextResponse(null, { status: 404 });

  const title = (request.source_materials as unknown as { title: string } | null)?.title ?? "Materials";

  const docs = materials.map((m) => ({
    doc: m.content as GeneratedDocument,
    languageSupportDoc:
      (m.analysis_summary as { languageSupportDocument: GeneratedDocument | null } | null)
        ?.languageSupportDocument ?? null,
  }));

  const html = renderCombinedPage(docs, title);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "materials"}.html"`,
    },
  });
}
