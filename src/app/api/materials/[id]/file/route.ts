import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/materials/[id]/file">,
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const { data: material } = await supabase
    .from("source_materials")
    .select("file_path")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!material?.file_path) return new NextResponse(null, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from("source-materials")
    .createSignedUrl(material.file_path, 60);

  if (error || !signed) return new NextResponse(null, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
