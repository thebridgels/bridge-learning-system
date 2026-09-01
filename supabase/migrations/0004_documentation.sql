-- Phase 6: idempotent documentation writes.
--
-- documentation_events already has a partial unique index (0001) on
-- (teacher_id, student_id, generated_material_id) WHERE generated_material_id
-- IS NOT NULL. Postgres can only use a partial index as an ON CONFLICT
-- arbiter if the INSERT's ON CONFLICT clause repeats the same WHERE
-- predicate, which PostgREST's upsert (and therefore supabase-js) has no way
-- to express. Replace it with a plain UNIQUE constraint on the same columns:
-- NULLs are never considered duplicates under standard unique-constraint
-- semantics, so multiple generated_material_id IS NULL rows per student
-- remain allowed — identical enforcement, now upsert-compatible.
drop index if exists documentation_events_student_generation_uidx;

alter table documentation_events
  add constraint documentation_events_teacher_student_generation_uidx
  unique (teacher_id, student_id, generated_material_id);

-- Same idempotency guarantee for supports within one event, keyed on the
-- preserved wording. Both system-applied creation at generation time and
-- teacher-confirmed checkbox toggles upsert against this constraint.
alter table documentation_event_supports
  add constraint documentation_event_supports_event_wording_uidx
  unique (documentation_event_id, wording_snapshot);
