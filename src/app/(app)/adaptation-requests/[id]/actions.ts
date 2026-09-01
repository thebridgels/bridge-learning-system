"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gatherAnalysisInput, AnalysisInputError } from "@/lib/bridge-analysis/gather";
import { analyzeMaterial } from "@/lib/bridge-analysis/provider";
import type { BridgeAnalysisResult } from "@/lib/bridge-analysis/schema";
import { generateVersions, GenerationInputError } from "@/lib/bridge-generation/generate";
import { recordGenerationDocumentation, type StudentRoute } from "@/lib/documentation";

const ANALYSES_PER_HOUR = 20;
const GENERATIONS_PER_HOUR = 20;

function fail(id: string, message: string): never {
  redirect(`/adaptation-requests/${id}?error=${encodeURIComponent(message)}`);
}

export async function runBridgeAnalysis(formData: FormData) {
  const id = String(formData.get("adaptation_request_id") ?? "");
  if (!id) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: request } = await supabase
    .from("adaptation_requests")
    .select("id, teacher_id, source_material_id, scope_type, scope_class_id")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();
  if (!request) redirect("/dashboard");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("adaptation_requests")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", user.id)
    .gte("analyzed_at", since);
  if ((count ?? 0) >= ANALYSES_PER_HOUR) {
    fail(id, "Analysis rate limit reached for this hour. Try again later.");
  }

  let input;
  try {
    input = await gatherAnalysisInput(supabase, request);
  } catch (err) {
    if (err instanceof AnalysisInputError) fail(id, err.message);
    fail(id, "Could not gather context for analysis.");
  }

  let result;
  try {
    result = await analyzeMaterial(input);
  } catch (err) {
    console.error("Bridge Analysis failed for adaptation request", id, err instanceof Error ? err.message : err);
    fail(id, "Bridge Analysis failed. Try again.");
  }

  const { error } = await supabase
    .from("adaptation_requests")
    .update({ analysis: result, status: "analyzed", analyzed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) fail(id, error.message);

  revalidatePath(`/adaptation-requests/${id}`);
  redirect(`/adaptation-requests/${id}`);
}

export async function runGeneration(formData: FormData) {
  const id = String(formData.get("adaptation_request_id") ?? "");
  if (!id) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: request } = await supabase
    .from("adaptation_requests")
    .select("id, teacher_id, source_material_id, scope_type, scope_class_id, status, analysis, analyzed_at")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();
  if (!request) redirect("/dashboard");

  if (!request.analysis || !request.analyzed_at) {
    fail(id, "Run Bridge Analysis before generating.");
  }

  const { data: material } = await supabase
    .from("source_materials")
    .select("title, kind, pasted_text, updated_at")
    .eq("id", request.source_material_id)
    .eq("teacher_id", user.id)
    .single();
  if (!material) fail(id, "Source material not found.");

  if (new Date(material.updated_at) > new Date(request.analyzed_at)) {
    fail(id, "The source material changed since analysis. Re-run Bridge Analysis before generating.");
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("adaptation_requests")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", user.id)
    .eq("status", "generated")
    .gte("updated_at", since);
  if ((count ?? 0) >= GENERATIONS_PER_HOUR) {
    fail(id, "Generation rate limit reached for this hour. Try again later.");
  }

  // Atomic compare-and-swap: only one in-flight generation per request.
  const { data: claimed } = await supabase
    .from("adaptation_requests")
    .update({ status: "generating" })
    .eq("id", id)
    .eq("teacher_id", user.id)
    .in("status", ["analyzed", "failed"])
    .select("id")
    .maybeSingle();
  if (!claimed) {
    fail(id, "Generation is already in progress, or this request isn't ready to generate.");
  }

  // Idempotent retry: clear any partial output from a previous attempt.
  await supabase
    .from("generated_materials")
    .delete()
    .eq("adaptation_request_id", id)
    .eq("teacher_id", user.id);

  let versions;
  try {
    versions = await generateVersions(
      supabase,
      request,
      material,
      request.analysis as BridgeAnalysisResult,
    );
  } catch (err) {
    const message =
      err instanceof GenerationInputError ? err.message : "Generation failed. Try again.";
    if (!(err instanceof GenerationInputError)) {
      console.error("Generation failed for adaptation request", id, err instanceof Error ? err.message : err);
    }
    await supabase.from("adaptation_requests").update({ status: "failed" }).eq("id", id).eq("teacher_id", user.id);
    fail(id, message);
  }

  const studentRoutes: StudentRoute[] = [];

  for (const version of versions) {
    const { data: generated, error: insertError } = await supabase
      .from("generated_materials")
      .insert({
        teacher_id: user.id,
        source_material_id: request.source_material_id,
        adaptation_request_id: id,
        version_label: version.label,
        content: version.document,
        analysis_summary: {
          supportNames: version.supportNames,
          hasLanguageSupport: version.languageSupportDocument !== null,
          languageSupportDocument: version.languageSupportDocument,
          generatedAt: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (insertError || !generated) {
      await supabase.from("adaptation_requests").update({ status: "failed" }).eq("id", id).eq("teacher_id", user.id);
      fail(id, insertError?.message ?? "Could not save generated material.");
    }

    const routeRows = version.students.map((s) => ({
      teacher_id: user.id,
      generated_material_id: generated.id,
      student_id: s.id,
    }));
    const { error: routeError } = await supabase.from("material_student_routes").insert(routeRows);
    if (routeError) {
      await supabase.from("adaptation_requests").update({ status: "failed" }).eq("id", id).eq("teacher_id", user.id);
      fail(id, routeError.message);
    }

    for (const s of version.students) {
      studentRoutes.push({ id: s.id, alias: s.alias, generatedMaterialId: generated.id });
    }
  }

  try {
    await recordGenerationDocumentation(supabase, {
      teacherId: user.id,
      sourceMaterialId: request.source_material_id,
      title: material.title,
      analysis: request.analysis as BridgeAnalysisResult,
      studentRoutes,
    });
  } catch (err) {
    console.error("Documentation recording failed for adaptation request", id, err instanceof Error ? err.message : err);
    await supabase.from("adaptation_requests").update({ status: "failed" }).eq("id", id).eq("teacher_id", user.id);
    fail(id, "Generated materials were saved, but documentation could not be recorded. Try again.");
  }

  await supabase.from("adaptation_requests").update({ status: "generated" }).eq("id", id).eq("teacher_id", user.id);

  revalidatePath(`/adaptation-requests/${id}`);
  redirect(`/adaptation-requests/${id}`);
}

export async function confirmSupport(formData: FormData) {
  const adaptationRequestId = String(formData.get("adaptation_request_id") ?? "");
  const documentationEventId = String(formData.get("documentation_event_id") ?? "");
  const wordingSnapshot = String(formData.get("wording_snapshot") ?? "");
  const supportType = String(formData.get("support_type") ?? "accommodation");
  if (!adaptationRequestId || !documentationEventId || !wordingSnapshot) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("documentation_event_supports").upsert(
    {
      teacher_id: user.id,
      documentation_event_id: documentationEventId,
      wording_snapshot: wordingSnapshot,
      support_type: supportType,
      teacher_confirmed: true,
    },
    { onConflict: "documentation_event_id,wording_snapshot" },
  );
  if (error) fail(adaptationRequestId, error.message);

  revalidatePath(`/adaptation-requests/${adaptationRequestId}`);
  redirect(`/adaptation-requests/${adaptationRequestId}`);
}

export async function unconfirmSupport(formData: FormData) {
  const adaptationRequestId = String(formData.get("adaptation_request_id") ?? "");
  const documentationEventId = String(formData.get("documentation_event_id") ?? "");
  const wordingSnapshot = String(formData.get("wording_snapshot") ?? "");
  if (!adaptationRequestId || !documentationEventId || !wordingSnapshot) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Never touch a system-applied record — this can only remove a
  // teacher-confirmed-only row.
  await supabase
    .from("documentation_event_supports")
    .delete()
    .eq("teacher_id", user.id)
    .eq("documentation_event_id", documentationEventId)
    .eq("wording_snapshot", wordingSnapshot)
    .eq("system_applied", false);

  revalidatePath(`/adaptation-requests/${adaptationRequestId}`);
  redirect(`/adaptation-requests/${adaptationRequestId}`);
}
