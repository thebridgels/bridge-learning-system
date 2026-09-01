"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900";

type ClassOption = { id: string; alias: string };
type StudentOption = { id: string; alias: string; class_id: string };

export function ReportFilterForm({
  classes,
  students,
  initialScope,
  initialClassId,
  initialStudentId,
  initialPeriod,
  initialStart,
  initialEnd,
}: {
  classes: ClassOption[];
  students: StudentOption[];
  initialScope: string;
  initialClassId?: string;
  initialStudentId?: string;
  initialPeriod: string;
  initialStart: string;
  initialEnd: string;
}) {
  const [scope, setScope] = useState(initialScope);
  const [period, setPeriod] = useState(initialPeriod);

  return (
    <form action="/reports" className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Scope</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope"
            value="all_students"
            checked={scope === "all_students"}
            onChange={() => setScope("all_students")}
          />
          All Students
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope"
            value="class"
            checked={scope === "class"}
            onChange={() => setScope("class")}
          />
          One Class
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope"
            value="student"
            checked={scope === "student"}
            onChange={() => setScope("student")}
          />
          One Anonymous Student
        </label>

        {scope === "class" && (
          <select name="class_id" defaultValue={initialClassId ?? ""} className={inputClass}>
            <option value="" disabled>
              Choose a class
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.alias}
              </option>
            ))}
          </select>
        )}

        {scope === "student" && (
          <select name="student_id" defaultValue={initialStudentId ?? ""} className={inputClass}>
            <option value="" disabled>
              Choose a student
            </option>
            {classes.map((c) => {
              const classStudents = students.filter((s) => s.class_id === c.id);
              if (classStudents.length === 0) return null;
              return (
                <optgroup key={c.id} label={c.alias}>
                  {classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.alias}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Date range</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["6weeks", "6 weeks"],
              ["9weeks", "9 weeks"],
              ["semester", "Semester"],
              ["custom", "Custom"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="period"
                value={value}
                checked={period === value}
                onChange={() => setPeriod(value)}
              />
              {label}
            </label>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex gap-3">
            <input type="date" name="start_date" defaultValue={initialStart} className={inputClass} />
            <input type="date" name="end_date" defaultValue={initialEnd} className={inputClass} />
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
      >
        Run Report
      </button>
    </form>
  );
}
