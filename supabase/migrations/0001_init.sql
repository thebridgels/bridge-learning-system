-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type telpas_level as enum ('beginning', 'intermediate', 'advanced', 'advanced_high');
create type source_material_kind as enum ('lesson_plan', 'material');

-- Shared trigger: keep updated_at current
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- teacher_profiles
-- =========================================================================
create table teacher_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  school_year_end_date date,
  plan_status text not null default 'beta',
  subscription_tier text,
  billing_customer_id text,
  subscription_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table teacher_profiles enable row level security;

create policy "teachers manage own profile"
  on teacher_profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create trigger set_teacher_profiles_updated_at
  before update on teacher_profiles
  for each row execute function set_updated_at();

-- Auto-provision a teacher_profiles row for every new auth user.
create function handle_new_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teacher_profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_teacher();

-- =========================================================================
-- classes
-- =========================================================================
create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  alias text not null,
  school_year text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, alias, school_year),
  unique (id, teacher_id)
);

create index classes_teacher_id_idx on classes (teacher_id);

alter table classes enable row level security;

create policy "teachers manage own classes"
  on classes for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_classes_updated_at
  before update on classes
  for each row execute function set_updated_at();

-- =========================================================================
-- students
-- =========================================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  class_id uuid not null,
  alias text not null,
  school_year text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, alias, school_year),
  unique (id, teacher_id),
  foreign key (class_id, teacher_id) references classes (id, teacher_id) on delete cascade
);

create index students_teacher_id_idx on students (teacher_id);
create index students_class_id_idx on students (class_id);

alter table students enable row level security;

create policy "teachers manage own students"
  on students for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_students_updated_at
  before update on students
  for each row execute function set_updated_at();

-- =========================================================================
-- language_profiles (one per student, optional)
-- =========================================================================
create table language_profiles (
  student_id uuid primary key,
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  home_language text not null,
  listening_level telpas_level not null,
  speaking_level telpas_level not null,
  reading_level telpas_level not null,
  writing_level telpas_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (student_id, teacher_id) references students (id, teacher_id) on delete cascade
);

create index language_profiles_teacher_id_idx on language_profiles (teacher_id);

alter table language_profiles enable row level security;

create policy "teachers manage own language profiles"
  on language_profiles for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_language_profiles_updated_at
  before update on language_profiles
  for each row execute function set_updated_at();

-- =========================================================================
-- accommodation_library (teacher-owned generic phrase library)
-- =========================================================================
create table accommodation_library (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  wording text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, wording),
  unique (id, teacher_id)
);

create index accommodation_library_teacher_id_idx on accommodation_library (teacher_id);

alter table accommodation_library enable row level security;

create policy "teachers manage own accommodation library"
  on accommodation_library for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_accommodation_library_updated_at
  before update on accommodation_library
  for each row execute function set_updated_at();

-- =========================================================================
-- student_accommodations (assignment of a library phrase to a student)
-- =========================================================================
create table student_accommodations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  accommodation_library_id uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, accommodation_library_id),
  foreign key (student_id, teacher_id) references students (id, teacher_id) on delete cascade,
  foreign key (accommodation_library_id, teacher_id) references accommodation_library (id, teacher_id) on delete cascade
);

create index student_accommodations_teacher_id_idx on student_accommodations (teacher_id);
create index student_accommodations_student_id_idx on student_accommodations (student_id);

alter table student_accommodations enable row level security;

create policy "teachers manage own student accommodations"
  on student_accommodations for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_student_accommodations_updated_at
  before update on student_accommodations
  for each row execute function set_updated_at();

-- =========================================================================
-- source_materials (teacher-owned; survives year-end deletion)
-- =========================================================================
create table source_materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  title text not null,
  kind source_material_kind not null,
  file_path text,
  pasted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);

create index source_materials_teacher_id_idx on source_materials (teacher_id);

alter table source_materials enable row level security;

create policy "teachers manage own source materials"
  on source_materials for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_source_materials_updated_at
  before update on source_materials
  for each row execute function set_updated_at();

-- =========================================================================
-- generated_materials (student-linked outputs; deletable at year end)
-- =========================================================================
create table generated_materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  source_material_id uuid not null,
  version_label text not null,
  content jsonb,
  analysis_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id),
  foreign key (source_material_id, teacher_id) references source_materials (id, teacher_id) on delete cascade
);

create index generated_materials_teacher_id_idx on generated_materials (teacher_id);
create index generated_materials_source_material_id_idx on generated_materials (source_material_id);

alter table generated_materials enable row level security;

create policy "teachers manage own generated materials"
  on generated_materials for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_generated_materials_updated_at
  before update on generated_materials
  for each row execute function set_updated_at();

-- =========================================================================
-- material_student_routes (which students get which generated version)
-- =========================================================================
create table material_student_routes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  generated_material_id uuid not null,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  unique (generated_material_id, student_id),
  foreign key (generated_material_id, teacher_id) references generated_materials (id, teacher_id) on delete cascade,
  foreign key (student_id, teacher_id) references students (id, teacher_id) on delete cascade
);

create index material_student_routes_teacher_id_idx on material_student_routes (teacher_id);
create index material_student_routes_student_id_idx on material_student_routes (student_id);

alter table material_student_routes enable row level security;

create policy "teachers manage own material student routes"
  on material_student_routes for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- =========================================================================
-- documentation_events (one lesson/assignment event per student)
-- =========================================================================
create table documentation_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  -- Single-column, nullable: tenant isolation comes from teacher_id + RLS,
  -- not from these FKs. Deleting a source/generated material must not erase
  -- the historical documentation_events row it produced (event_date, title,
  -- and each support's wording_snapshot stay intact regardless).
  source_material_id uuid references source_materials (id) on delete set null,
  generated_material_id uuid references generated_materials (id) on delete set null,
  event_date date not null default current_date,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id),
  foreign key (student_id, teacher_id) references students (id, teacher_id) on delete cascade
);

create index documentation_events_teacher_id_idx on documentation_events (teacher_id);
create index documentation_events_student_id_idx on documentation_events (student_id);

-- One documentation event per student per generation run.
create unique index documentation_events_student_generation_uidx
  on documentation_events (teacher_id, student_id, generated_material_id)
  where generated_material_id is not null;

alter table documentation_events enable row level security;

create policy "teachers manage own documentation events"
  on documentation_events for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_documentation_events_updated_at
  before update on documentation_events
  for each row execute function set_updated_at();

-- =========================================================================
-- documentation_event_supports (accommodations/modifications used in an event)
-- =========================================================================
create table documentation_event_supports (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles (id) on delete cascade,
  documentation_event_id uuid not null,
  -- Optional traceability only; wording_snapshot is the source of truth and
  -- must not change if the library entry is later edited or removed.
  accommodation_library_id uuid references accommodation_library (id) on delete set null,
  wording_snapshot text not null,
  support_type text,
  system_applied boolean not null default false,
  teacher_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (documentation_event_id, teacher_id) references documentation_events (id, teacher_id) on delete cascade
);

create index documentation_event_supports_teacher_id_idx on documentation_event_supports (teacher_id);
create index documentation_event_supports_event_id_idx on documentation_event_supports (documentation_event_id);

alter table documentation_event_supports enable row level security;

create policy "teachers manage own documentation event supports"
  on documentation_event_supports for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create trigger set_documentation_event_supports_updated_at
  before update on documentation_event_supports
  for each row execute function set_updated_at();

-- =========================================================================
-- Storage: private bucket for uploaded source material files
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('source-materials', 'source-materials', false)
on conflict (id) do nothing;

create policy "teachers manage own files in source-materials"
  on storage.objects for all
  using (bucket_id = 'source-materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'source-materials' and (storage.foldername(name))[1] = auth.uid()::text);
