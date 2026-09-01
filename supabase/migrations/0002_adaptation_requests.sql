-- Scope belongs to a request to adapt a source material, not to the source
-- material itself: the same reusable worksheet/lesson can be adapted
-- repeatedly for different classes or student subsets. source_materials
-- stays generic, reusable, and free of any student/class scope.
--
-- Source Material -> Adaptation Request -> Bridge Analysis -> Generated
-- Material(s) -> Student Routes -> Documentation Events

create table adaptation_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  source_material_id uuid not null,
  scope_type text not null default 'all_students'
    check (scope_type in ('all_students', 'class', 'selected_students')),
  scope_class_id uuid,
  status text not null default 'draft',
  -- Structured Bridge Analysis result (Phase 4) once computed.
  analysis jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id),
  foreign key (source_material_id, teacher_id) references source_materials (id, teacher_id) on delete cascade,
  -- Tenant-consistent: scope_class_id can only ever reference a class
  -- belonging to the same teacher_id, never another teacher's class.
  -- Adaptation requests are school-year/student-context records, so it's
  -- acceptable for a deleted class to take its pending requests with it.
  foreign key (scope_class_id, teacher_id) references classes (id, teacher_id) on delete cascade
);

create index adaptation_requests_teacher_id_idx on adaptation_requests (teacher_id);
create index adaptation_requests_source_material_id_idx on adaptation_requests (source_material_id);

alter table adaptation_requests enable row level security;

create policy "teachers manage own adaptation requests"
  on adaptation_requests for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_adaptation_requests_updated_at
  before update on adaptation_requests
  for each row execute function set_updated_at();

create table adaptation_request_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  adaptation_request_id uuid not null,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  unique (adaptation_request_id, student_id),
  foreign key (adaptation_request_id, teacher_id) references adaptation_requests (id, teacher_id) on delete cascade,
  foreign key (student_id, teacher_id) references students (id, teacher_id) on delete cascade
);

create index adaptation_request_students_teacher_id_idx on adaptation_request_students (teacher_id);
create index adaptation_request_students_request_id_idx on adaptation_request_students (adaptation_request_id);

alter table adaptation_request_students enable row level security;

create policy "teachers manage own adaptation request students"
  on adaptation_request_students for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());
