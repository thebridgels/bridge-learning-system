-- Phase 5: generation, version grouping, student routing.

-- File-based source materials get their text auto-extracted at upload time
-- into the existing pasted_text column; these track whether that succeeded.
alter table source_materials
  add column extraction_status text,
  add column extraction_error text;

-- Every generated_materials row now traces back to the adaptation request
-- (and its approved analysis) that produced it. Table has no rows yet, so
-- this can be added NOT NULL directly.
alter table generated_materials
  add column adaptation_request_id uuid not null;

alter table generated_materials
  add constraint generated_materials_adaptation_request_id_fkey
    foreign key (adaptation_request_id, teacher_id) references adaptation_requests (id, teacher_id) on delete cascade;

create index generated_materials_adaptation_request_id_idx on generated_materials (adaptation_request_id);
