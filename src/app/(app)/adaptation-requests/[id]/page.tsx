import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BridgeAnalysisResult } from "@/lib/bridge-analysis/schema";
import { teacherConfirmableCandidates } from "@/lib/documentation";
import { SubmitButton } from "@/components/submit-button";
import { runBridgeAnalysis, runGeneration, confirmSupport, unconfirmSupport } from "./actions";

const KIND_LABELS: Record<string, string> = {
  lesson_plan: "Lesson Plan",
  material: "Assignment / Material",
};

const SCOPE_LABELS: Record<string, string> = {
  all_students: "All students",
  class: "One class",
  selected_students: "Selected students",
};

export default async function AdaptationRequestPage(
  props: PageProps<"/adaptation-requests/[id]">,
) {
  const { id } = await props.params;
  const { error } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: request } = await supabase
    .from("adaptation_requests")
    .select("id, source_material_id, scope_type, scope_class_id, status, analysis, analyzed_at")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();
  if (!request) redirect("/saved-materials");

  const [{ data: material }, { data: klass }] = await Promise.all([
    supabase
      .from("source_materials")
      .select("title, kind, pasted_text, extraction_status, extraction_error, updated_at")
      .eq("id", request.source_material_id)
      .eq("teacher_id", user.id)
      .single(),
    request.scope_class_id
      ? supabase
          .from("classes")
          .select("alias")
          .eq("id", request.scope_class_id)
          .eq("teacher_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const canAnalyze = Boolean(material?.pasted_text);
  const analysis = request.analysis as BridgeAnalysisResult | null;
  const isStale = Boolean(
    material && request.analyzed_at && new Date(material.updated_at) > new Date(request.analyzed_at),
  );
  const canGenerate =
    Boolean(analysis) && !isStale && (request.status === "analyzed" || request.status === "failed");

  const { data: generatedMaterials } =
    request.status === "generated"
      ? await supabase
          .from("generated_materials")
          .select("id, version_label, analysis_summary, material_student_routes(students(id, alias))")
          .eq("adaptation_request_id", id)
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: true })
      : { data: null };

  const roster = (generatedMaterials ?? []).flatMap((gm) =>
    (gm.material_student_routes ?? [])
      .map((r) => r.students as unknown as { id: string; alias: string } | null)
      .filter((s): s is { id: string; alias: string } => s !== null)
      .map((s) => ({ ...s, generatedMaterialId: gm.id })),
  );

  const generatedMaterialIds = roster.map((s) => s.generatedMaterialId);
  const { data: docEvents } =
    generatedMaterialIds.length > 0
      ? await supabase
          .from("documentation_events")
          .select(
            "id, student_id, generated_material_id, documentation_event_supports(wording_snapshot, support_type, system_applied, teacher_confirmed)",
          )
          .eq("teacher_id", user.id)
          .in("generated_material_id", generatedMaterialIds)
      : { data: null };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/saved-materials" className="text-sm underline">
          &larr; Saved Materials
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div>
        <h1 className="text-2xl font-semibold">{material?.title}</h1>
        <p className="text-xs text-gray-500">
          {material ? KIND_LABELS[material.kind] ?? material.kind : ""} &middot;{" "}
          {SCOPE_LABELS[request.scope_type] ?? request.scope_type}
          {klass?.alias ? `: ${klass.alias}` : ""}
        </p>
      </div>

      {!canAnalyze && (
        <p className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
          {material?.extraction_status === "failed"
            ? material.extraction_error
            : "This material has no text yet, so it can't be analyzed."}
        </p>
      )}

      {isStale && (
        <p className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
          The material has changed since this analysis. Re-run Bridge Analysis before generating.
        </p>
      )}

      {canAnalyze && (
        <form action={runBridgeAnalysis}>
          <input type="hidden" name="adaptation_request_id" value={request.id} />
          <SubmitButton
            pendingText="Analyzing…"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {analysis ? "Re-run Bridge Analysis" : "Run Bridge Analysis"}
          </SubmitButton>
        </form>
      )}

      {analysis && (
        <div className="space-y-6">
          <section className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="text-lg font-medium">Summary</h2>
            <p className="text-sm">{analysis.summary}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span
                className={
                  "mr-2 inline-block rounded px-2 py-0.5 text-xs font-medium " +
                  (analysis.rigorPreserved
                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300")
                }
              >
                {analysis.rigorPreserved ? "Rigor preserved" : "Modification detected"}
              </span>
              {analysis.rigorNote}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Planned Supports</h2>
            <ul className="space-y-3">
              {analysis.plannedSupports.map((support, i) => (
                <li
                  key={i}
                  className="space-y-1 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{support.support}</span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                      {support.supportType}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                      {support.applyMethod === "system_applied"
                        ? "Bridge applies"
                        : "Teacher confirms"}
                    </span>
                  </div>
                  {support.sourceWording && (
                    <p className="text-xs italic text-gray-500">
                      &ldquo;{support.sourceWording}&rdquo;
                    </p>
                  )}
                  <p className="text-gray-600 dark:text-gray-400">{support.rationale}</p>
                  <p className="text-xs text-gray-500">
                    Applies to:{" "}
                    {support.appliesToAllStudents
                      ? "all students in scope"
                      : support.appliesToStudentAliases.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {analysis.languageSupports.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Language Supports</h2>
              <ul className="space-y-3">
                {analysis.languageSupports.map((ls, i) => (
                  <li
                    key={i}
                    className="space-y-1 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800"
                  >
                    <p className="font-medium">
                      {ls.studentAlias} &middot; {ls.homeLanguage}
                    </p>
                    <p className="text-xs text-gray-500">
                      Domains: {ls.domainsAddressed.join(", ")}
                    </p>
                    <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                      {ls.supports.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {analysis.versionGroups.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Versions Bridge Plans to Create</h2>
              <ul className="space-y-3">
                {analysis.versionGroups.map((vg, i) => (
                  <li
                    key={i}
                    className="space-y-1 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800"
                  >
                    <p className="font-medium">
                      {vg.label} &middot; {vg.studentAliases.length} student
                      {vg.studentAliases.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-gray-500">{vg.studentAliases.join(", ")}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Supports: {vg.supportNames.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {analysis.reviewNotes.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-medium">For Your Review</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
                {analysis.reviewNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </section>
          )}

          <div>
            {canGenerate && (
              <form action={runGeneration}>
                <input type="hidden" name="adaptation_request_id" value={request.id} />
                <SubmitButton
                  pendingText="Generating…"
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                >
                  {request.status === "failed" ? "Retry Generate" : "Generate"}
                </SubmitButton>
              </form>
            )}
            {request.status === "generating" && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generating&hellip; reload this page in a moment.
              </p>
            )}
          </div>
        </div>
      )}

      {request.status === "generated" && generatedMaterials && generatedMaterials.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Versions Generated</h2>
            <div className="flex gap-3 text-sm">
              <Link href={`/adaptation-requests/${id}/print-all`} className="underline">
                Print All
              </Link>
              <a href={`/api/adaptation-requests/${id}/download-all`} className="underline">
                Download All
              </a>
            </div>
          </div>

          <ul className="space-y-3">
            {generatedMaterials.map((gm) => {
              const supportNames =
                (gm.analysis_summary as { supportNames?: string[] } | null)?.supportNames ?? [];
              const students = (gm.material_student_routes ?? [])
                .map((r) => r.students as unknown as { id: string; alias: string } | null)
                .filter((s): s is { id: string; alias: string } => s !== null);

              return (
                <li
                  key={gm.id}
                  className="space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{gm.version_label}</p>
                      {supportNames.length > 0 && (
                        <p className="text-xs text-gray-500">{supportNames.join(", ")}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {students.length} student{students.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3 text-sm">
                      <Link href={`/generated-materials/${gm.id}`} className="underline">
                        View
                      </Link>
                      <a
                        href={`/api/generated-materials/${gm.id}/download`}
                        className="underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                  {students.length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-xs">
                      {students.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/generated-materials/${gm.id}?student=${s.id}`}
                            className="rounded bg-gray-100 px-2 py-0.5 hover:underline dark:bg-gray-800"
                          >
                            {s.alias}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {request.status === "generated" && analysis && roster.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Documentation</h2>
          <ul className="space-y-3">
            {roster.map((student) => {
              const event = (docEvents ?? []).find(
                (e) => e.student_id === student.id && e.generated_material_id === student.generatedMaterialId,
              );
              const supports = event?.documentation_event_supports ?? [];
              const systemApplied = supports.filter((s) => s.system_applied);
              const confirmedWording = new Set(
                supports.filter((s) => s.teacher_confirmed).map((s) => s.wording_snapshot),
              );
              const candidates = teacherConfirmableCandidates(analysis, student.alias);

              if (!event) return null;

              return (
                <li
                  key={student.id}
                  className="space-y-2 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <p className="font-medium">{student.alias}</p>

                  {systemApplied.length > 0 && (
                    <ul className="space-y-1">
                      {systemApplied.map((s) => (
                        <li key={s.wording_snapshot} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <span aria-hidden>✅</span>
                          <span>{s.wording_snapshot}</span>
                          <span className="text-xs text-gray-500">(Bridge applied)</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {candidates.length > 0 && (
                    <ul className="space-y-1">
                      {candidates.map((c) => {
                        const wording = c.sourceWording ?? c.support;
                        const checked = confirmedWording.has(wording);
                        return (
                          <li key={wording}>
                            <form action={checked ? unconfirmSupport : confirmSupport} className="flex items-center gap-2">
                              <input type="hidden" name="adaptation_request_id" value={id} />
                              <input type="hidden" name="documentation_event_id" value={event.id} />
                              <input type="hidden" name="wording_snapshot" value={wording} />
                              <input type="hidden" name="support_type" value={c.supportType} />
                              <button type="submit" className="flex items-center gap-2 text-left hover:underline">
                                <span aria-hidden>{checked ? "☑" : "☐"}</span>
                                <span className="text-gray-600 dark:text-gray-400">{wording}</span>
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {systemApplied.length === 0 && candidates.length === 0 && (
                    <p className="text-xs text-gray-500">No supports recorded for this event.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
