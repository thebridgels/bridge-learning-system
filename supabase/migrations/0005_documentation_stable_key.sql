-- Fix: documentation_events was keyed on (teacher_id, student_id,
-- generated_material_id). generated_material_id changes on every
-- regeneration (Phase 5's retry deletes and recreates generated_materials),
-- so re-analyzing/regenerating the same adaptation request produced a
-- second documentation_event for what is really the same lesson/assignment
-- event, discovered live during Phase 7 testing. adaptation_request_id is
-- stable across regenerations of the same request, so key on that instead.

alter table documentation_events
  add column adaptation_request_id uuid;

alter table documentation_events
  add constraint documentation_events_adaptation_request_id_fkey
    foreign key (adaptation_request_id, teacher_id) references adaptation_requests (id, teacher_id) on delete set null;

alter table documentation_events
  drop constraint documentation_events_teacher_student_generation_uidx;

alter table documentation_events
  add constraint documentation_events_teacher_student_request_uidx
  unique (teacher_id, student_id, adaptation_request_id);

create index documentation_events_adaptation_request_id_idx on documentation_events (adaptation_request_id);
