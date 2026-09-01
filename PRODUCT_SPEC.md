You are the primary developer for the first production MVP of **Bridge Learning System**.

Build the product below faithfully and efficiently.

Do **not** redesign the product, add speculative features, or expand scope unless technically necessary. Prefer simple, maintainable implementation.

Keep explanations concise. Prioritize working code over commentary.

# 1. Product

Bridge Learning System is a curriculum-independent teacher tool.

Teachers bring their own lesson plans, worksheets, assignments, PDFs, DOCX files, images, or pasted text.

Bridge uses anonymous student accommodation and language-support profiles to:

1. adapt lesson plans for instruction;
2. create accommodated versions of assignments/materials;
3. generate emergent-bilingual supports;
4. automatically build accommodation/modification documentation as teachers work.

Core promise:

**Any lesson. Any worksheet. Your students’ supports. Done.**

Bridge supports teacher judgment rather than replacing it.

---

# 2. MVP Stack

Use:

* Next.js
* TypeScript
* Supabase
* PostgreSQL through Supabase
* Supabase Auth
* Supabase Storage
* Tailwind or similarly lightweight styling
* an LLM API behind server-side endpoints

Keep architecture simple.

---

# 3. Identity and Privacy — Hard Rules

Bridge must never collect or store real student identities.

Do not create fields for:

* real student name
* student ID
* birthdate
* parent information
* school email
* diagnosis
* evaluation information
* real class period
* real class name

Bridge generates:

* anonymous internal teacher account ID
* random class aliases
* random student aliases

Teachers may manually enter/change only **their own display name**.

Teachers may not manually name classes or students.

Student aliases must be unique across the teacher’s active account for that school year.

Use memorable, neutral aliases from a curated vocabulary.

Examples:

* Morning Coffee
* Blue Lantern
* Quiet River
* Copper Moon

Allow the teacher to request another generated alias, but never manually type one.

Do not build any real-name-to-alias mapping feature.

Every student-specific output should display the student alias prominently and, when useful, the anonymous class alias.

---

# 4. Data Retention

Student-linked data has a hard maximum retention period of one school year.

At school-year end, after warning/export opportunity, delete:

* classes
* students
* student accommodation assignments
* language profiles
* student-linked generated documents
* accommodation logs
* reports
* student-linked history

Do not offer permanent student archives.

Teacher-owned generic data may remain:

* personal accommodation phrase library
* generic lesson plans/materials
* reusable templates
* account preferences

---

# 5. Cookies / Tracking

Use only cookies or browser storage necessary for:

* authentication
* security
* session persistence
* user-requested convenience/preferences

Do not add:

* advertising cookies
* cross-site tracking
* behavioral profiling
* ad pixels
* unnecessary analytics

Do not track users merely because tracking is possible.

---

# 6. Teacher Accommodation Library

Do not ship a required standardized accommodation checklist.

Teachers type accommodations using their district/school wording.

Example:

**Break lengthy assignments into smaller manageable sections**

When a teacher enters a new phrase:

1. assign it to the current student;
2. save that exact phrase to that teacher’s personal accommodation library.

Future accommodation entry should autocomplete from that teacher’s library.

Teacher may:

* rename
* delete
* merge duplicates

Preserve exact teacher wording for documentation.

Internally the AI may normalize/interpret accommodations, but teacher-facing records retain original wording.

---

# 7. Student Profile

Student record contains:

* generated alias
* anonymous class ID
* accommodation assignments
* optional emergent-bilingual profile

No free-text student notes in MVP.

## Emergent Bilingual Profile

If enabled, collect:

* home language

Four independent TELPAS domains:

* Listening
* Speaking
* Reading
* Writing

Each domain:

* Beginning
* Intermediate
* Advanced
* Advanced High

Do not reduce this to one overall language level.

The AI must use relevant domains based on task demands.

---

# 8. Main Navigation

Use a simple left sidebar:

* Dashboard
* Classes
* Accommodation Library
* Saved Materials
* Reports
* Settings

Below Classes, show anonymous active classes plus:

**+ New Class**

Sidebar = where the teacher is.

Main workspace = what the teacher is doing.

Do not build an LMS-style dashboard.

Avoid unnecessary charts, badges, calendars, announcements, or engagement metrics.

---

# 9. Public Pages

## Landing Page

Headline:

**Bridge Learning System**

**Any lesson. Any worksheet. Your students’ supports. Done.**

Briefly explain:

* curriculum independence
* anonymous student profiles
* accommodation generation
* multilingual support
* documentation

Primary actions:

* **Sign Up**
* **Log In**
* **Learn More**

## Learn More Page

Brief workflow:

1. Create anonymous class.
2. Add anonymous students.
3. Enter accommodations.
4. Add language profile if needed.
5. Upload/paste lesson or assignment.
6. Choose scope.
7. Bridge adapts it.
8. Bridge documents supports.

---

# 10. Dashboard

Main prompt:

**What do you want to accommodate?**

Two main actions:

* Lesson Plan
* Assignment / Material

Keep dashboard minimal.

---

# 11. Scope Selection

For both lesson plans and materials, support:

* All students
* One class
* Selected students

Selected students must allow arbitrary combinations.

---

# 12. File / Material Input

Support MVP input:

* PDF
* DOCX
* image
* pasted text

Use private storage.

Do not add Google Classroom, SIS, Canvas, HMH, or publisher integrations in MVP.

---

# 13. Bridge Analysis

Before generating, analyze:

* source material
* selected student accommodations
* TELPAS profiles
* language demands
* instructional demands

Show a concise preview of intended changes before generation.

Example:

Bridge plans to:

* chunk directions
* add vocabulary preview
* add visual support
* add Spanish academic vocabulary
* provide sentence stems

Teacher then clicks:

**Generate**

Teacher remains in control.

---

# 14. Lesson Plan Behavior

Lesson plans should be adapted based on the selected students collectively.

Prefer supports that can be incorporated into normal instruction without reducing rigor.

Possible supports:

* vocabulary preview
* chunking
* modeling
* visual supports
* checks for understanding
* sentence stems
* structured discussion
* processing time
* language scaffolds

Do not blindly insert every accommodation everywhere.

Use relevance and instructional context.

---

# 15. Emergent-Bilingual Lesson Support

Do not merely translate the lesson.

Generate supports appropriate to the student’s language and TELPAS domains.

Possible output:

* learning target
* home-language clarification
* academic vocabulary
* student-friendly definitions
* home-language equivalents
* functional classroom vocabulary
* sentence stems
* task expectations
* background/context support

Preserve academic rigor.

---

# 16. Assignment / Material Behavior

Bridge should generate the **minimum number of genuinely necessary versions**.

Students requiring equivalent treatment may share a version.

Example:

* Standard — 14 students
* Version A: chunking + graphic organizer — 6 students
* Version B: Spanish vocabulary + sentence stems — 4 students

Maintain routing from anonymous students to the correct version.

Allow:

* alias-labeled student copies
* generic Version A / B / C copies

---

# 17. Rigor Rule — Hard Requirement

**Bridge changes access before it changes rigor.**

Do not reduce:

* academic standard
* cognitive demand
* learning objective
* expected mastery

unless the teacher-entered support explicitly represents a curriculum modification.

Accommodations and modifications must be treated differently.

---

# 18. Documentation — Core MVP Feature

Documentation is one of the primary reasons teachers will use Bridge.

It must be built into the workflow from the beginning.

Do not treat documentation as a later reporting feature.

Every lesson/assignment event should generate its documentation record when the teacher creates or confirms accommodations.

## Documentation Event Structure

For each student and each assignment/lesson event, create **one documentation entry**, not one row per accommodation.

The entry should contain:

* date
* assignment/lesson title
* all accommodations/modifications documented for that event
* whether each was system-applied or teacher-confirmed internally

Default printable format:

| Date     | Assignment / Lesson | Accommodations / Modifications Used                                  |
| -------- | -------------------- | ---------------------------------------------------------------------|
| Sept. 12 | Theme Analysis       | Chunked directions; graphic organizer; sentence stems; extended time |
| Sept. 18 | Argument Writing     | Vocabulary support; extended time; frequent checks for understanding |

Do not create separate line items for every accommodation.

## System-Applied Accommodations

If Bridge actually implements the support digitally, record it automatically.

Examples:

* chunked directions
* graphic organizer
* sentence stems
* vocabulary support
* language support
* formatting changes

## Teacher-Confirmed Accommodations

If Bridge cannot verify whether the support occurred physically, show it as an empty checkbox.

Examples:

* extended time
* small-group setting
* frequent breaks
* oral directions
* teacher read-aloud
* checks for understanding
* preferential seating

Never auto-check these.

When the teacher checks one, add it to that lesson/assignment documentation event.

Unchecked means only:

**not documented as provided**

It does not mean noncompliance.

## Documentation Workflow

Normal workflow:

**Generate/adapt material → Bridge records system-applied supports → teacher checks any manual supports actually provided → documentation event is complete**

Reports should organize these records later.

---

# 19. Reports

Reports are a core MVP feature.

Teacher selects:

### Scope

* all students
* one class
* one anonymous student

### Reporting period

* six weeks
* nine weeks
* semester
* custom date range

Generate a simple documentation report using the event structure above.

For each student:

| Date | Assignment / Lesson | Accommodations / Modifications Used |
| ---- | -------------------- | ------------------------------------ |

Use the teacher’s exact accommodation wording.

Do not make the default report an analytics summary.

The primary purpose is clear evidence of what was documented for each assignment/lesson.

Allow:

* print
* PDF export

This report should be immediately useful for:

* end-of-term compliance documentation
* ARD/IEP discussions
* administrator requests
* parent concerns or complaints
* teacher recordkeeping

Bridge should provide the factual record only. It should not make legal or compliance conclusions.

---

# 20. Results — Lesson Plan

Show:

**Adapted Lesson Plan**

Actions:

* View Changes
* Print
* Download

Show any generated language-support materials.

Then show documentation:

* system-applied supports
* manual teacher-confirmation checkboxes

---

# 21. Results — Assignment / Material

Show:

**Versions Generated**

Example:

**Version A**
Chunking + graphic organizer
6 students

**Version B**
Spanish vocabulary support + sentence stems
4 students

**Standard**
14 students

Teacher can open each version and see the anonymous students assigned to it.

Actions:

* Download All
* Print All
* View Version

Student-specific copies should display assigned aliases prominently.

---

# 22. Saved Materials

Teachers may retain generic materials that are not student-linked.

Examples:

* original worksheets
* generic lesson plans
* reusable templates

Do not retain student-specific versions beyond the school-year retention period.

---

# 23. Settings

Keep MVP settings minimal.

Include:

* teacher display name
* email/account information
* password/security
* school-year end date
* student-data deletion information
* export options
* delete account

---

# 24. Security — MVP Requirements

Required:

* Supabase Row Level Security
* tenant isolation by authenticated internal teacher ID
* private storage buckets
* no service-role key in client
* protected server-side generation endpoints
* input validation
* upload type/size restrictions
* sanitized filenames
* short-lived signed URLs where appropriate
* rate limiting for expensive endpoints
* minimal logging
* do not log accommodation content unnecessarily
* secure authentication
* secure password reset
* encryption in transit
* provider-supported encryption at rest

Design assuming a breach is possible.

Store as little useful identifying information as possible.

---

# 25. Payment / Subscription Architecture

Do **not** implement payments in the MVP.

However, structure teacher accounts so subscription support can be added later without changing core ownership or data models.

It is acceptable to reserve nullable/default account-level fields such as:

* plan_status
* subscription_tier
* billing_customer_id
* subscription_end_date

Default beta users may simply have a status such as:

**beta**

Do not build Stripe checkout, subscription management, pricing tiers, usage billing, or payment UI yet.

---

# 26. Out of Scope

Do not build now:

* SIS integration
* Google Classroom sync
* district administrator dashboards
* enterprise SSO
* parent accounts
* student login
* attendance
* grading
* LMS features
* curriculum delivery
* longitudinal student profiles
* advertising
* behavioral analytics
* student data monetization
* real-name roster import
* payment processing

---

# 27. Initial Database Entities

Design a clean schema around at least:

* users / teacher_profiles
* classes
* students
* accommodation_library
* student_accommodations
* language_profiles
* source_materials
* generated_materials
* material_student_routes
* documentation_events
* documentation_event_supports

Important documentation design:

**documentation_events** should represent one lesson/assignment event per student.

Example fields:

* id
* teacher_id
* student_id
* source_material_id
* event_date
* title
* created_at

**documentation_event_supports** should associate all accommodations/modifications used with that one event.

Example fields:

* documentation_event_id
* accommodation wording snapshot
* support type
* system_applied boolean
* teacher_confirmed boolean

Preserve a wording snapshot so later edits to the teacher’s accommodation library do not rewrite historical documentation.

Reporting periods may be calculated by date query rather than stored as permanent entities unless there is a technical reason to persist them.

---

# 28. Implementation Order

## Phase 1

* Next.js project
* Supabase setup
* auth
* RLS
* teacher profile
* layout/sidebar

## Phase 2

* anonymous class creation
* anonymous student creation
* alias generator
* student profiles
* teacher accommodation library
* TELPAS profile

## Phase 3

* upload/paste workflow
* scope selection
* private file storage

## Phase 4

* Bridge Analysis API contract
* structured AI response
* initial LLM integration
* lesson/material generation

## Phase 5

* generated-version grouping
* student routing
* alias-labeled output

## Phase 6

* documentation events created automatically during generation
* manual accommodation checkboxes
* report generation
* print/PDF output

## Phase 7

* year-end deletion workflow
* security review
* error handling
* UX cleanup

---

# 29. Core Implementation Principles

**Teacher independence**
Bridge works with the teacher’s materials.

**Student anonymity**
Bridge never needs the student’s identity.

**Curriculum independence**
Bridge must not require a specific curriculum ecosystem.

**Different access, same rigor**
Accommodations change access before expectations.

**Language support is more than translation**
Bridge identifies the language required to access the lesson.

**Documentation follows action**
Documentation is created while accommodations are provided, not reconstructed later.

**Teachers document what only teachers can observe**
Physical/classroom accommodations remain manually confirmed.

**Minimal data**
Do not collect information the product does not need.

**Automatic expiration**
Student-linked records are temporary by design.

---

# 30. First Response Only

Before writing large amounts of code, respond with **ONLY**:

1. proposed folder architecture;
2. database schema/tables and important fields;
3. RLS ownership model;
4. implementation sequence;
5. any truly blocking technical issue.

Do not:

* restate this product specification;
* generate the whole application;
* propose new product features;
* redesign the workflow;
* produce lengthy rationale.

If a technical choice is not genuinely blocking, make the simplest reasonable choice.

Keep the response concise so the architecture can be approved once and implementation can proceed with minimal revision and token usage.
