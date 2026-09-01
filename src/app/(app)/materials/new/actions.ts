"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, sanitizeFilename } from "@/lib/uploads";
import { extractText } from "@/lib/text-extraction";

const SCOPE_TYPES = ["all_students", "class", "selected_students"] as const;
const MAX_PASTED_TEXT = 50000;
const EXTRACTIONS_PER_HOUR = 30;

function fail(kind: string, message: string): never {
  redirect(`/materials/new?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(message)}`);
}

export async function createAdaptationRequest(formData: FormData) {
  const kind = String(formData.get("kind") ?? "material") === "lesson_plan" ? "lesson_plan" : "material";
  const materialSource = String(formData.get("material_source") ?? "new");
  const scopeType = String(formData.get("scope_type") ?? "all_students");
  const scopeClassId = String(formData.get("scope_class_id") ?? "").trim();
  const studentIds = formData.getAll("student_ids").map(String).filter(Boolean);

  if (!SCOPE_TYPES.includes(scopeType as (typeof SCOPE_TYPES)[number])) {
    fail(kind, "Invalid scope selection.");
  }
  if (scopeType === "class" && !scopeClassId) fail(kind, "Choose a class.");
  if (scopeType === "selected_students" && studentIds.length === 0) {
    fail(kind, "Select at least one student.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let sourceMaterialId: string;

  if (materialSource === "existing") {
    sourceMaterialId = String(formData.get("existing_source_material_id") ?? "").trim();
    if (!sourceMaterialId) fail(kind, "Choose a saved material.");

    const { data: existing } = await supabase
      .from("source_materials")
      .select("id")
      .eq("id", sourceMaterialId)
      .eq("teacher_id", user.id)
      .single();
    if (!existing) fail(kind, "Saved material not found.");
  } else {
    const title = String(formData.get("title") ?? "").trim();
    const pastedText = String(formData.get("pasted_text") ?? "").trim();
    const file = formData.get("file");

    if (!title) fail(kind, "Title is required.");
    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && !pastedText) fail(kind, "Paste text or upload a file.");
    if (pastedText.length > MAX_PASTED_TEXT) {
      fail(kind, `Pasted text is too long (${MAX_PASTED_TEXT.toLocaleString()} character limit).`);
    }

    let filePath: string | null = null;
    let extractedText: string | null = null;
    let extractionStatus: string | null = null;
    let extractionError: string | null = null;

    if (hasFile) {
      const uploadFile = file as File;
      if (uploadFile.size > MAX_UPLOAD_BYTES) {
        fail(kind, "File is too large (15 MB limit).");
      }
      const extension = ALLOWED_UPLOAD_TYPES[uploadFile.type];
      if (!extension) {
        fail(kind, "Unsupported file type. Upload a PDF, DOCX, or image.");
      }

      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("source_materials")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", user.id)
        .not("extraction_status", "is", null)
        .gte("created_at", since);
      if ((count ?? 0) >= EXTRACTIONS_PER_HOUR) {
        fail(kind, "File upload rate limit reached for this hour. Try again later, or paste text instead.");
      }

      const safeName = sanitizeFilename(uploadFile.name);
      filePath = `${user.id}/${randomUUID()}-${safeName}`;
      const fileBuffer = Buffer.from(await uploadFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("source-materials")
        .upload(filePath, fileBuffer, { contentType: uploadFile.type });
      if (uploadError) fail(kind, uploadError.message);

      const extraction = await extractText(fileBuffer, uploadFile.type);
      if (extraction.text) {
        extractedText = extraction.text;
        extractionStatus = "succeeded";
      } else {
        extractionStatus = "failed";
        extractionError = extraction.error;
      }
    }

    const { data: material, error } = await supabase
      .from("source_materials")
      .insert({
        teacher_id: user.id,
        title,
        kind,
        file_path: filePath,
        pasted_text: hasFile ? extractedText : pastedText,
        extraction_status: extractionStatus,
        extraction_error: extractionError,
      })
      .select("id")
      .single();

    if (error || !material) {
      fail(kind, error?.message ?? "Could not save material.");
    }
    sourceMaterialId = material.id;
  }

  const { data: request, error: requestError } = await supabase
    .from("adaptation_requests")
    .insert({
      teacher_id: user.id,
      source_material_id: sourceMaterialId,
      scope_type: scopeType,
      scope_class_id: scopeType === "class" ? scopeClassId : null,
    })
    .select("id")
    .single();

  if (requestError || !request) {
    fail(kind, requestError?.message ?? "Could not create adaptation request.");
  }

  if (scopeType === "selected_students") {
    const rows = studentIds.map((studentId) => ({
      teacher_id: user.id,
      adaptation_request_id: request.id,
      student_id: studentId,
    }));
    const { error: scopeError } = await supabase
      .from("adaptation_request_students")
      .insert(rows);
    if (scopeError) fail(kind, scopeError.message);
  }

  redirect(`/adaptation-requests/${request.id}`);
}
