import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderDocumentPage } from "@/lib/bridge-generation/render";
import type { GeneratedDocument } from "@/lib/bridge-generation/schema";

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "material";
}

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/generated-materials/[id]/download">,
) {
  const { id } = await params;
  const url = new URL(request.url);
  const studentId = url.searchParams.get("student");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const { data: material } = await supabase
    .from("generated_materials")
    .select("version_label, content, analysis_summary")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();
  if (!material) return new NextResponse(null, { status: 404 });

  let studentAlias: string | undefined;
  let classAlias: string | undefined;
  if (studentId) {
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

  const html = renderDocumentPage(doc, { studentAlias, classAlias, languageSupportDoc });
  const filenameParts = [material.version_label, studentAlias].filter(Boolean).map(sanitizeFilePart);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameParts.join(" - ")}.html"`,
    },
  });
}
