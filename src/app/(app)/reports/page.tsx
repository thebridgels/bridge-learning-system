import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchReportEvents, computeDateRange, renderReportBody, type ReportScope } from "@/lib/reports";
import { ReportFilterForm } from "@/components/report-filter-form";
import { PrintButton } from "@/components/print-button";

export default async function ReportsPage(props: PageProps<"/reports">) {
  const sp = await props.searchParams;
  const scopeType = typeof sp.scope === "string" ? sp.scope : "all_students";
  const classId = typeof sp.class_id === "string" ? sp.class_id : undefined;
  const studentId = typeof sp.student_id === "string" ? sp.student_id : undefined;
  const period = typeof sp.period === "string" ? sp.period : "6weeks";
  const startParam = typeof sp.start_date === "string" ? sp.start_date : undefined;
  const endParam = typeof sp.end_date === "string" ? sp.end_date : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classes }, { data: students }] = await Promise.all([
    supabase.from("classes").select("id, alias").eq("teacher_id", user.id).order("created_at", { ascending: true }),
    supabase
      .from("students")
      .select("id, alias, class_id")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const range = computeDateRange(period, startParam, endParam);
  const scope: ReportScope =
    scopeType === "class" && classId
      ? { type: "class", classId }
      : scopeType === "student" && studentId
        ? { type: "student", studentId }
        : { type: "all_students" };

  const events = await fetchReportEvents(supabase, user.id, scope, range);
  const showStudentColumn = scope.type !== "student";
  const html = renderReportBody(events, { showStudentColumn });

  const downloadParams = new URLSearchParams({
    scope: scopeType,
    period,
    start_date: range.start,
    end_date: range.end,
    ...(classId ? { class_id: classId } : {}),
    ...(studentId ? { student_id: studentId } : {}),
  }).toString();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold print:hidden">Reports</h1>

      <div className="print:hidden">
        <ReportFilterForm
          classes={classes ?? []}
          students={students ?? []}
          initialScope={scopeType}
          initialClassId={classId}
          initialStudentId={studentId}
          initialPeriod={period}
          initialStart={range.start}
          initialEnd={range.end}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {range.start} to {range.end}
        </p>
        <div className="flex gap-2 print:hidden">
          <PrintButton />
          <a
            href={`/api/reports/download?${downloadParams}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Download
          </a>
        </div>
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-6 text-gray-900 print:border-0 print:p-0 dark:border-gray-800 [&_table]:w-full [&_th]:border-b [&_th]:pb-2 [&_th]:text-left [&_th]:text-xs [&_th]:text-gray-500 [&_td]:border-b [&_td]:border-gray-100 [&_td]:py-2 [&_td]:text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
