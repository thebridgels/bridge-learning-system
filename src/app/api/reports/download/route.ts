import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchReportEvents, computeDateRange, renderReportPage, type ReportScope } from "@/lib/reports";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scopeType = url.searchParams.get("scope") || "all_students";
  const classId = url.searchParams.get("class_id") ?? undefined;
  const studentId = url.searchParams.get("student_id") ?? undefined;
  const period = url.searchParams.get("period") || "6weeks";
  const startParam = url.searchParams.get("start_date") ?? undefined;
  const endParam = url.searchParams.get("end_date") ?? undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const range = computeDateRange(period, startParam, endParam);
  const scope: ReportScope =
    scopeType === "class" && classId
      ? { type: "class", classId }
      : scopeType === "student" && studentId
        ? { type: "student", studentId }
        : { type: "all_students" };

  const events = await fetchReportEvents(supabase, user.id, scope, range);
  const html = renderReportPage(events, {
    title: "Bridge Documentation Report",
    showStudentColumn: scope.type !== "student",
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="documentation-report-${range.start}-to-${range.end}.html"`,
    },
  });
}
