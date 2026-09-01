import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportScope =
  | { type: "all_students" }
  | { type: "class"; classId: string }
  | { type: "student"; studentId: string };

export type ReportEventRow = {
  id: string;
  eventDate: string;
  title: string;
  studentAlias: string;
  classAlias: string | null;
  supports: string[];
};

export function computeDateRange(
  period: string,
  start?: string,
  end?: string,
): { start: string; end: string } {
  const endDate = end || new Date().toISOString().slice(0, 10);
  if (period === "custom" && start) return { start, end: endDate };
  const days = period === "9weeks" ? 63 : period === "semester" ? 126 : 42;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { start: startDate.toISOString().slice(0, 10), end: endDate };
}

export async function fetchReportEvents(
  supabase: SupabaseClient,
  teacherId: string,
  scope: ReportScope,
  range: { start: string; end: string },
): Promise<ReportEventRow[]> {
  let studentIds: string[] | null = null;

  if (scope.type === "student") {
    studentIds = [scope.studentId];
  } else if (scope.type === "class") {
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("class_id", scope.classId);
    studentIds = (data ?? []).map((s) => s.id);
  }

  let query = supabase
    .from("documentation_events")
    .select(
      "id, event_date, title, students(alias, classes(alias)), documentation_event_supports(wording_snapshot)",
    )
    .eq("teacher_id", teacherId)
    .gte("event_date", range.start)
    .lte("event_date", range.end)
    .order("event_date", { ascending: true });

  if (studentIds) query = query.in("student_id", studentIds);

  const { data } = await query;

  return (data ?? []).map((row) => {
    const student = row.students as unknown as {
      alias: string;
      classes: { alias: string } | null;
    } | null;
    return {
      id: row.id,
      eventDate: row.event_date,
      title: row.title,
      studentAlias: student?.alias ?? "",
      classAlias: student?.classes?.alias ?? null,
      supports: (row.documentation_event_supports ?? []).map((s) => s.wording_snapshot),
    };
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STYLES = `
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #111; }
  h1 { font-size: 1.4rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { font-size: 0.85rem; color: #555; }
  td { font-size: 0.9rem; }
  @media print { body { margin: 0; padding: 1rem; } }
`;

export function renderReportBody(
  events: ReportEventRow[],
  options: { showStudentColumn: boolean },
): string {
  const headerCols = options.showStudentColumn
    ? "<th>Date</th><th>Student</th><th>Assignment / Lesson</th><th>Accommodations / Modifications Used</th>"
    : "<th>Date</th><th>Assignment / Lesson</th><th>Accommodations / Modifications Used</th>";

  const rows = events
    .map((e) => {
      const studentCell = options.showStudentColumn
        ? `<td>${escapeHtml(e.studentAlias)}${e.classAlias ? ` &middot; ${escapeHtml(e.classAlias)}` : ""}</td>`
        : "";
      const supportsCell = e.supports.length > 0 ? e.supports.map(escapeHtml).join("; ") : "&mdash;";
      return `<tr><td>${escapeHtml(formatDate(e.eventDate))}</td>${studentCell}<td>${escapeHtml(e.title)}</td><td>${supportsCell}</td></tr>`;
    })
    .join("\n");

  const colspan = options.showStudentColumn ? 4 : 3;
  const body =
    rows || `<tr><td colspan="${colspan}">No documented events in this date range.</td></tr>`;

  return `<table><thead><tr>${headerCols}</tr></thead><tbody>${body}</tbody></table>`;
}

export function renderReportPage(
  events: ReportEventRow[],
  options: { title: string; showStudentColumn: boolean },
): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(
    options.title,
  )}</title><style>${STYLES}</style></head><body><h1>${escapeHtml(options.title)}</h1>${renderReportBody(events, options)}</body></html>`;
}
