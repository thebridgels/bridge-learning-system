"use client";

import { useState } from "react";
import { createAdaptationRequest } from "@/app/(app)/materials/new/actions";
import { SubmitButton } from "@/components/submit-button";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900";

type ClassOption = { id: string; alias: string };
type StudentOption = { id: string; alias: string; class_id: string };
type SavedMaterial = { id: string; title: string };

export function NewMaterialForm({
  kind,
  classes,
  students,
  savedMaterials,
  preselectedSourceMaterialId,
}: {
  kind: "lesson_plan" | "material";
  classes: ClassOption[];
  students: StudentOption[];
  savedMaterials: SavedMaterial[];
  preselectedSourceMaterialId?: string;
}) {
  const [materialSource, setMaterialSource] = useState<"new" | "existing">(
    preselectedSourceMaterialId ? "existing" : "new",
  );
  const [inputMethod, setInputMethod] = useState<"paste" | "file">("paste");
  const [scopeType, setScopeType] = useState<"all_students" | "class" | "selected_students">(
    "all_students",
  );

  return (
    <form action={createAdaptationRequest} className="space-y-6">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="material_source" value={materialSource} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Material</legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMaterialSource("new")}
            aria-pressed={materialSource === "new"}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium " +
              (materialSource === "new"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800")
            }
          >
            New material
          </button>
          <button
            type="button"
            onClick={() => setMaterialSource("existing")}
            aria-pressed={materialSource === "existing"}
            disabled={savedMaterials.length === 0}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 " +
              (materialSource === "existing"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800")
            }
          >
            Use saved material
          </button>
        </div>

        {materialSource === "existing" ? (
          <select
            name="existing_source_material_id"
            required
            defaultValue={preselectedSourceMaterialId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Choose a saved material
            </option>
            {savedMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="title" className="block text-sm font-medium">
                Title
              </label>
              <input id="title" name="title" required className={inputClass} />
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInputMethod("paste")}
                  aria-pressed={inputMethod === "paste"}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium " +
                    (inputMethod === "paste"
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800")
                  }
                >
                  Paste text
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod("file")}
                  aria-pressed={inputMethod === "file"}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium " +
                    (inputMethod === "file"
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800")
                  }
                >
                  Upload file
                </button>
              </div>

              {inputMethod === "paste" ? (
                <textarea
                  name="pasted_text"
                  rows={8}
                  maxLength={50000}
                  placeholder="Paste the lesson plan or assignment text"
                  className={inputClass}
                />
              ) : (
                <div className="space-y-1">
                  <input
                    name="file"
                    type="file"
                    accept=".pdf,.docx,image/png,image/jpeg,image/webp,image/gif"
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500">PDF, DOCX, or image. Max 15 MB.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Scope</legend>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope_type"
            value="all_students"
            checked={scopeType === "all_students"}
            onChange={() => setScopeType("all_students")}
          />
          All students
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope_type"
            value="class"
            checked={scopeType === "class"}
            onChange={() => setScopeType("class")}
          />
          One class
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope_type"
            value="selected_students"
            checked={scopeType === "selected_students"}
            onChange={() => setScopeType("selected_students")}
          />
          Selected students
        </label>

        {scopeType === "class" && (
          <select name="scope_class_id" required defaultValue="" className={inputClass}>
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

        {scopeType === "selected_students" && (
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-3 dark:border-gray-800">
            {classes.map((c) => {
              const classStudents = students.filter((s) => s.class_id === c.id);
              if (classStudents.length === 0) return null;
              return (
                <div key={c.id}>
                  <p className="text-xs font-medium text-gray-500">{c.alias}</p>
                  {classStudents.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="student_ids" value={s.id} />
                      {s.alias}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </fieldset>

      <SubmitButton
        pendingText="Saving…"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
      >
        Save
      </SubmitButton>
    </form>
  );
}
