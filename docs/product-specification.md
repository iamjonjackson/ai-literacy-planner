# UNESCO AI Competency Explorer — Product Specification

**Version:** 2.1 (v2 — Supabase Backend, Multi-User + CSV Import)
**Stack:** Next.js · IndexedDB (local cache) · Supabase · Tailwind CSS · TypeScript
**Last updated:** June 2026

---

## 1. Overview

A web application that helps university academics and curriculum designers:

1. **Explore** the UNESCO AI Competency Framework for Students (12 competencies across 4 dimensions)
2. **Design** programme-specific Learning Outcomes (LOs) mapped to those competencies
3. **Map** by setting up a degree programme structure (years + modules) and then map LOs into modules with full coverage tracking
4. **Assess** module assessments with priority and RAG ratings
5. **Implement** export the full plan to PDF and XLSX, plus JSON backup/restore

All data is persisted in **Supabase** (Postgres) as the source of truth, with **IndexedDB** used as a local cache for offline support and performance. Users authenticate via **magic link email** (passwordless). Programmes can be shared with other users at Viewer or Editor access level.

The current view/state should be maintained on refresh so that the current tab is automatically selected (pick up where the user left off).

---

## 2. Tech Stack

| Concern               | Choice                                                          |
| --------------------- | --------------------------------------------------------------- |
| Framework             | Next.js (App Router)                                            |
| Language              | TypeScript                                                      |
| Styling               | Tailwind CSS (light mode only)                                  |
| Auth                  | Supabase Auth (magic link / passwordless email)                 |
| Database              | Supabase (Postgres) — source of truth                           |
| Local cache           | IndexedDB via `idb` (offline support + performance)             |
| Supabase client       | `@supabase/supabase-js`                                         |
| Drag and drop         | `@dnd-kit/core` + `@dnd-kit/sortable`                           |
| PDF export            | `jsPDF` + `jspdf-autotable`                                     |
| XLSX export           | `xlsx` (SheetJS)                                                |
| Markdown rendering    | `react-markdown` + `remark-gfm`                                 |
| Autocomplete / search | `fuse.js` (fuzzy search)                                        |
| CSV parsing           | `papaparse` (client-side, handles quoted fields)                |
| Icons                 | `lucide-react`                                                  |
| Content source        | `.md` files in `/content/` compiled to JSON at build time       |
| Static export         | `next export` (`output: 'export'`) — deployable to GitHub Pages |
| CI/CD                 | GitHub Actions (build + deploy)                                 |

---

## 3. Authentication

### 3.1 Magic Link Flow

- Users authenticate via **passwordless magic link**:
  1. User enters their email address on the login page
  2. Supabase sends a one-time login link to that email
  3. Clicking the link logs them in and redirects to `/dashboard`

- No password is ever set or stored
- Supabase manages sessions via JWT stored in `localStorage`
- On app load, the session is restored automatically from `localStorage`; if expired or absent, the user is redirected to `/login`

### 3.2 Pages

- `/login` — email input form with "Send magic link" button; shown to unauthenticated users
- All other routes are protected; unauthenticated requests redirect to `/login`
- On first login, no additional setup is required — the user's account is created implicitly by Supabase Auth

### 3.3 User Identity

- The user's `auth.users.id` (UUID) from Supabase Auth is used as the `userId` foreign key throughout the data model
- `displayName` is derived from the email address (portion before `@`) by default, and can be updated in a future profile page

---

## 4. Data Architecture

### 4.1 Sync Strategy: Supabase + IndexedDB

Supabase is the **source of truth**. IndexedDB acts as a **local read cache** and **offline write buffer**.

**Read path:**

1. On page load, serve data from IndexedDB immediately (fast)
2. Fetch latest data from Supabase in the background
3. Merge into IndexedDB (last-write-wins on `updatedAt`)
4. Re-render UI with any updated data

**Write path:**

1. Write immediately to IndexedDB (optimistic UI update)
2. Push to Supabase asynchronously
3. On success: update IndexedDB record with the confirmed `updatedAt` from Supabase
4. On failure: mark record in IndexedDB as `syncStatus: 'pending'`; retry on next sync cycle

**Auto-refresh:** Poll Supabase every **5 seconds** for changes to the current programme. Only data visible on the current tab needs to be polled actively. Stale data that differs from the local cache is merged silently (last-write-wins on `updatedAt`); no disruptive UI refresh occurs unless data has actually changed.

**Offline support:**

- While offline, all writes are made to IndexedDB with `syncStatus: 'pending'`
- A connection status indicator is shown in the UI when offline
- On reconnection, all pending records are pushed to Supabase in `updatedAt` order, then the latest data is pulled to resolve any conflicts
- Conflict resolution: **last-write-wins** based on `updatedAt` timestamp

**`syncStatus` field** (IndexedDB only, not stored in Supabase):

- `'synced'` — matches Supabase
- `'pending'` — local change not yet pushed
- `'conflict'` — (reserved for future use; not surfaced in v2)

---

## 5. Content Architecture

All framework content (UNESCO competencies, dimension descriptions, level descriptors) is stored as **Markdown files** in a `/content/` directory in the repo. This makes it easy for non-developers to update content without touching application code.

### 5.1 Static Build Pipeline (GitHub Pages compatible)

Because the app is deployed as a fully static site, `.md` files **cannot** be read at runtime using Node's `fs` module. Instead, a build-time script compiles all content into a single static JSON file before Next.js builds the app.

**Build pipeline:**

```javascript
/content/**/*.md
       ↓
scripts/build-content.ts   ← runs via "prebuild" npm script
       ↓
/public/framework-content.json   ← static asset, imported by the app at runtime
```

- `scripts/build-content.ts` reads all `.md` files, parses YAML frontmatter and body, and writes `public/framework-content.json`
- This script runs automatically before every build via `"prebuild": "ts-node scripts/build-content.ts"` in `package.json`
- The app fetches `framework-content.json` via a standard `fetch('/framework-content.json')` call
- **Editors update `.md` files only** — the JSON is generated, never hand-edited
- GitHub Actions triggers a fresh build+deploy on every push to `main`

**`next.config.js`** must include:

```javascript
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: "/repo-name",
};
module.exports = nextConfig;
```

### 5.2 File Structure

```javascript
/content/
  framework/
    overview.md
    dimensions/
      01-human-centred-mindset.md
      02-ethics-of-ai.md
      03-ai-techniques-and-applications.md
      04-ai-system-design.md
    competencies/
      01-01-human-agency.md
      01-02-human-accountability.md
      ... (12 files total, 3 per dimension)
  help/
    explore.md
    design.md
    plan.md
    map.md
    assess.md
    implement.md
/scripts/
  build-content.ts
/public/
  framework-content.json   ← generated at build time, do not edit manually
```

### 5.3 Competency File Format

Each competency `.md` file contains YAML frontmatter:

```yaml
---
id: "1.1"
dimension: "human-centred-mindset"
dimensionLabel: "Human-Centred Mindset"
title: "Human Agency"
levels:
  understand: "Students can describe..."
  apply: "Students can demonstrate..."
  create: "Students can design..."
---
```

The body of the file contains richer narrative from the UNESCO PDF, rendered as HTML in the Explore tab.

> **Note for developers:** The source PDF (`UNESCO Students 391105eng.pdf`) is committed to the repo under `/reference/`. Content `.md` files are manually extracted/curated from it. Do not auto-parse the PDF at runtime.

---

## 6. Supabase Schema

### 6.1 Schema Creation Script

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- auth.users is managed by Supabase Auth.
-- We maintain a public profile table for display names.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can view and update their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── PROGRAMMES ──────────────────────────────────────────────────────────────
create table public.programmes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  years       int not null default 3 check (years >= 1),
  ai_agent_url text,
  public_access_enabled boolean not null default false,
  public_access_token text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.programmes enable row level security;
create index on public.programmes (public_access_enabled, public_access_token);

-- ─── PROGRAMME ACCESS ────────────────────────────────────────────────────────
-- Tracks which users have been granted access to a programme (beyond the owner).
create type public.access_role as enum ('viewer', 'editor');

create table public.programme_access (
  id             uuid primary key default gen_random_uuid(),
  programme_id   uuid not null references public.programmes(id) on delete cascade,
  granted_by     uuid not null references auth.users(id),
  grantee_email  text not null,          -- email address the invite was sent to
  grantee_id     uuid references auth.users(id),  -- null until invite is accepted
  role           public.access_role not null,
  invited_at     timestamptz not null default now(),
  accepted_at    timestamptz,
  unique (programme_id, grantee_email)
);
alter table public.programme_access enable row level security;

-- ─── RLS HELPER: is_programme_owner (non-recursive) ───────────────────────
-- SECURITY DEFINER avoids policy recursion when policy checks traverse
-- programme/programme_access relationships.
create or replace function public.is_programme_owner(prog_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.programmes p
    where p.id = prog_id and p.owner_id = auth.uid()
  );
$$;

-- Programme RLS policies:
create policy "Owners can read their programmes"
  on public.programmes for select
  using (public.is_programme_owner(id));

create policy "Owners can insert their programmes"
  on public.programmes for insert
  with check (owner_id = auth.uid());

create policy "Owners can update their programmes"
  on public.programmes for update
  using (public.is_programme_owner(id))
  with check (public.is_programme_owner(id));

create policy "Owners can delete their programmes"
  on public.programmes for delete
  using (public.is_programme_owner(id));

-- Viewers and editors can read programmes they have access to
DROP POLICY IF EXISTS "Shared users can read programmes" ON public.programmes;
CREATE POLICY "Shared users can read programmes"
  ON public.programmes FOR SELECT
  USING (public.can_access_programme(id));

-- Optional public readonly sharing (anon role) via tokenized link
create policy "Anon can read publicly shared programmes"
  on public.programmes for select
  to anon
  using (public_access_enabled = true and public_access_token is not null);

-- Editors can update programmes (but not delete or change owner)
create policy "Editors can update programmes"
  on public.programmes for update
  using (
    exists (
      select 1 from public.programme_access pa
      where pa.programme_id = id
        and (
          pa.grantee_id = auth.uid()
          or lower(pa.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
        and pa.role = 'editor'
    )
  );

-- Programme access RLS:
create policy "Owners can manage access for their programmes"
  on public.programme_access for all
  using (public.is_programme_owner(programme_id))
  with check (public.is_programme_owner(programme_id));

create policy "Users can view their own access grants"
  on public.programme_access for select
  using (grantee_id = auth.uid());

create policy "Invitees can accept pending access grants"
  on public.programme_access for update
  using (
    grantee_id is null
    and lower(grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    grantee_id = auth.uid()
    and lower(grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ─── MODULES ─────────────────────────────────────────────────────────────────
create table public.modules (
  id             uuid primary key default gen_random_uuid(),
  programme_id   uuid not null references public.programmes(id) on delete cascade,
  name           text not null,
  code           text,
  year           int not null check (year >= 1),
  "order"        int not null default 0,
  credits        int,
  description    text,         -- user-authored notes
  aims           text,         -- institutional module aims (from CSV import)
  scheme         text,         -- e.g. "Undergraduate" (from CSV import)
  organiser      text,         -- staff name(s), comma-separated (from CSV import)
  url            text,         -- link to institutional curriculum page (from CSV import)
  is_compulsory  boolean not null default false,  -- true if CSV "compulsory" = "Yes"
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.modules (programme_id);
create index on public.modules (programme_id, year);
alter table public.modules enable row level security;

-- ─── LEARNING OUTCOMES ───────────────────────────────────────────────────────
create table public.learning_outcomes (
  id             uuid primary key default gen_random_uuid(),
  programme_id   uuid not null references public.programmes(id) on delete cascade,
  competency_id  text,          -- e.g. "1.1"; NULL for LOs imported from CSV before mapping
  category       text,          -- institutional category from CSV (e.g. "Disciplinary Skills"); NULL for manually-authored LOs
  lo_number      text,          -- position / label within category from CSV or manual entry; NULL when not supplied
  text           text not null,
  module_id      uuid references public.modules(id) on delete set null,
  status         text check (status in ('to_delete')), -- NULL for active LOs; set when flagged for removal but retained in UI/history
  "order"        int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.learning_outcomes (programme_id);
create index on public.learning_outcomes (programme_id, competency_id);
create index on public.learning_outcomes (module_id);
alter table public.learning_outcomes enable row level security;

-- ─── ASSESSMENTS ─────────────────────────────────────────────────────────────
create table public.assessments (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules(id) on delete cascade,
  programme_id     uuid not null references public.programmes(id) on delete cascade,
  assessment_code  text,            -- institutional reference code from CSV (e.g. "001")
  title            text not null,
  description      text,
  weight           text,            -- free-text weight from CSV/manual entry (e.g. "25%")
  duration         text,            -- free-text duration from CSV/manual entry (e.g. "1,500 Words")
  priority_rating  text check (priority_rating in ('low', 'medium', 'high')),
  rag_status       text check (rag_status in ('red', 'amber', 'green')),  -- nullable: NULL for imported assessments not yet rated
  status           text check (status in ('to_delete')), -- NULL for active assessments; set when flagged for removal but retained in UI/history
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.assessments (module_id);
create index on public.assessments (programme_id);
alter table public.assessments enable row level security;

-- Existing deployment migration (run once if assessments table already exists)
alter table public.programmes
  add column if not exists ai_agent_url text;

alter table public.assessments
  add column if not exists assessment_code text;

alter table public.assessments
  add column if not exists duration text;

alter table public.assessments
  add column if not exists status text check (status in ('to_delete'));

alter table public.assessments
  alter column weight type text
  using case
    when weight is null then null
    else regexp_replace(weight::text, '\\.?0+$', '') || '%'
  end;

alter table public.assessments
  drop column if exists type;

-- ─── ASSESSMENT LO LINKS ─────────────────────────────────────────────────────
-- Many-to-many: which LOs are covered by which assessment
create table public.assessment_los (
  assessment_id       uuid not null references public.assessments(id) on delete cascade,
  learning_outcome_id uuid not null references public.learning_outcomes(id) on delete cascade,
  primary key (assessment_id, learning_outcome_id)
);
alter table public.assessment_los enable row level security;

-- ─── RLS HELPER: can_access_programme ────────────────────────────────────────
-- Reusable function to check read access (owner OR granted user)
CREATE OR REPLACE FUNCTION public.can_access_programme(prog_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT public.is_programme_owner(prog_id)
  OR EXISTS (
    SELECT 1
    FROM public.programme_access pa
    WHERE pa.programme_id = prog_id
      AND (
        pa.grantee_id = auth.uid()
        OR lower(pa.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

-- ─── RLS HELPER: can_edit_programme ──────────────────────────────────────────
create or replace function public.can_edit_programme(prog_id uuid)
returns boolean language sql security definer as $$
  select public.is_programme_owner(prog_id)
  or exists (
    select 1 from public.programme_access pa
    where pa.programme_id = prog_id
      and (
        pa.grantee_id = auth.uid()
        or lower(pa.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      and pa.role = 'editor'
  );
$$;

alter function public.is_programme_owner(uuid) set search_path = public;
alter function public.can_access_programme(uuid) set search_path = public;
alter function public.can_edit_programme(uuid) set search_path = public;

-- ─── GRANTS FOR SUPABASE API ROLES ─────────────────────────────────────────
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.programmes to authenticated;
grant select, insert, update, delete on table public.modules to authenticated;
grant select, insert, update, delete on table public.learning_outcomes to authenticated;
grant select, insert, update, delete on table public.assessments to authenticated;
grant select, insert, update, delete on table public.programme_access to authenticated;
grant select, insert, update, delete on table public.assessment_los to authenticated;

-- Public read for shared-link mode (optional)
grant select on table public.programmes to anon;
grant select on table public.modules to anon;
grant select on table public.learning_outcomes to anon;
grant select on table public.assessments to anon;

grant execute on function public.is_programme_owner(uuid) to anon, authenticated;
grant execute on function public.can_access_programme(uuid) to anon, authenticated;
grant execute on function public.can_edit_programme(uuid) to anon, authenticated;

-- ─── RLS POLICIES: child tables ──────────────────────────────────────────────
-- Modules
create policy "Read access for programme members"
  on public.modules for select using (public.can_access_programme(programme_id));
create policy "Anon can read modules for publicly shared programmes"
  on public.modules for select
  to anon
  using (
    exists (
      select 1 from public.programmes p
      where p.id = modules.programme_id
        and p.public_access_enabled = true
        and p.public_access_token is not null
    )
  );
create policy "Write access for programme editors"
  on public.modules for insert with check (public.can_edit_programme(programme_id));
create policy "Update access for programme editors"
  on public.modules for update using (public.can_edit_programme(programme_id));
create policy "Delete access for programme editors"
  on public.modules for delete using (public.can_edit_programme(programme_id));

-- Learning Outcomes
create policy "Read access for programme members"
  on public.learning_outcomes for select using (public.can_access_programme(programme_id));
create policy "Anon can read LOs for publicly shared programmes"
  on public.learning_outcomes for select
  to anon
  using (
    exists (
      select 1 from public.programmes p
      where p.id = learning_outcomes.programme_id
        and p.public_access_enabled = true
        and p.public_access_token is not null
    )
  );
create policy "Write access for programme editors"
  on public.learning_outcomes for insert with check (public.can_edit_programme(programme_id));
create policy "Update access for programme editors"
  on public.learning_outcomes for update using (public.can_edit_programme(programme_id));
create policy "Delete access for programme editors"
  on public.learning_outcomes for delete using (public.can_edit_programme(programme_id));

-- Assessments
create policy "Read access for programme members"
  on public.assessments for select using (public.can_access_programme(programme_id));
create policy "Anon can read assessments for publicly shared programmes"
  on public.assessments for select
  to anon
  using (
    exists (
      select 1 from public.programmes p
      where p.id = assessments.programme_id
        and p.public_access_enabled = true
        and p.public_access_token is not null
    )
  );
create policy "Write access for programme editors"
  on public.assessments for insert with check (public.can_edit_programme(programme_id));
create policy "Update access for programme editors"
  on public.assessments for update using (public.can_edit_programme(programme_id));
create policy "Delete access for programme editors"
  on public.assessments for delete using (public.can_edit_programme(programme_id));

-- Assessment LO links
create policy "Read access"
  on public.assessment_los for select
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.can_access_programme(a.programme_id)
    )
  );
create policy "Write access"
  on public.assessment_los for insert
  with check (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.can_edit_programme(a.programme_id)
    )
  );
create policy "Delete access"
  on public.assessment_los for delete
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.can_edit_programme(a.programme_id)
    )
  );

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.programmes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.modules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.learning_outcomes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assessments
  for each row execute function public.set_updated_at();
```

### 6.2 IndexedDB Schema (Local Cache)

IndexedDB mirrors the Supabase tables and adds a `syncStatus` field to each record. It is used for optimistic UI updates and offline support only — Supabase is always the source of truth.

#### Object Stores

Each store mirrors its Supabase table, with two additional fields:

```typescript
syncStatus: "synced" | "pending"; // local sync state
localUpdatedAt: string; // ISO 8601 — time of last local write
```

**Stores:** `profiles`, `programmes`, `programme_access`, `modules`, `learning_outcomes`, `assessments`, `assessment_los`

#### IndexedDB Indexes

| Store                | Index Name          | Key Path                        | Unique |     |                      |             |             |       |
| -------------------- | ------------------- | ------------------------------- | ------ | --- | -------------------- | ----------- | ----------- | ----- |
| programmes           | `by-owner`          | `owner_id`                      | false  |     |                      |             |             |       |
| programme\\\_access  | `by-programme`      | `programme_id`                  | false  |     |                      |             |             |       |
| programme\\\_access  | `by-grantee`        | `grantee_id`                    | false  |     |                      |             |             |       |
| modules              | `by-programme`      | `programme_id`                  | false  |     |                      |             |             |       |
| modules              | `by-programme-year` | `[programme_id, year]`          | false  |     |                      |             |             |       |
| learning\\\_outcomes | `by-programme`      | `programme_id`                  | false  |     |                      |             |             |       |
| learning\\\_outcomes | `by-competency`     | `[programme_id, competency_id]` | false  |     |                      |             |             |       |
| learning\\\_outcomes | `by-category`       | `[programme_id, category]`      | false  |     | learning\\\_outcomes | `by-module` | `module_id` | false |
| assessments          | `by-module`         | `module_id`                     | false  |     |                      |             |             |       |
| assessments          | `by-programme`      | `programme_id`                  | false  |     |                      |             |             |       |
| assessment\\\_los    | `by-assessment`     | `assessment_id`                 | false  |     |                      |             |             |       |

#### Sync Notes

- All primary keys are UUIDs — safe for distributed merge
- `updatedAt` (from Supabase) is used for last-write-wins conflict resolution
- On pull, if `supabase.updatedAt > indexedDB.updatedAt`, overwrite local record and set `syncStatus: 'synced'`
- On push, if `syncStatus === 'pending'`, send to Supabase; on success set `syncStatus: 'synced'`

---

## 7. Sharing & Permissions

### 7.1 Roles

| Role       | Can view | Can edit | Can share | Can delete programme |
| ---------- | -------- | -------- | --------- | -------------------- |
| **Owner**  | ✅       | ✅       | ✅        | ✅                   |
| **Editor** | ✅       | ✅       | ❌        | ❌                   |
| **Viewer** | ✅       | ❌       | ❌        | ❌                   |

- Only the **original creator** (owner) can delete a programme or change/revoke access
- There is only one owner per programme; ownership cannot be transferred in v2
- Editors can create, edit, and delete modules, LOs, and assessments, but cannot modify programme metadata (name, year count) or manage sharing

### 7.2 Sharing Flow

1. Owner opens the **Share** panel for a programme (accessible from the programme card on the dashboard and from the top navbar within a programme)
2. Owner enters an email address and selects a role (Viewer / Editor), then clicks **Send Invite**
3. **If the email is already a registered user:** the programme immediately appears in their dashboard on next sync
4. **If the email is not yet registered:** Supabase sends them a magic link invite email; on first login, the `grantee_id` in `programme_access` is populated and the programme becomes accessible
5. The Share panel lists all current collaborators (email, role, status: Pending / Active) with options for the owner to **change role** or **revoke access**
6. Owners can enable **Public readonly access** and copy a friendly share URL in the format `/share/[token]`

### 7.3 Access Indicators in the UI

- Programmes that are **shared with you** (not owned by you) are shown with an avatar/badge indicating the owner's email on the dashboard card
- A small **collaborator count badge** is shown on programmes you own that have active shares
- A subtle **read-only banner** is shown at the top of all tabs when the user has Viewer access, making it clear they cannot make changes

---

## 8. Application Structure

### 8.1 Pages & Routing

```javascript
/login                   → magic link login page (unauthenticated only)
/                        → redirect to /dashboard
/dashboard               → programme list + create new
/share/[token]           → public readonly entry route for shared programmes
/programme/[id]/explore  → Tab 1: Explore framework
/programme/[id]/design   → Tab 2: Design LOs
/programme/[id]/plan     → Tab 3: Plan structure
/programme/[id]/map      → Tab 4: Map LOs to modules
/programme/[id]/assess   → Tab 5: Assess
/programme/[id]/implement→ Tab 6: Implement / export
```

### 8.2 Global Layout

- **Top navbar:** App logo/name · Programme switcher dropdown (lists all programmes the user owns or has access to) · "New Programme" button · Current programme name · **AI Agent button** (visible to all programme roles when `ai_agent_url` is set; opens in a new tab) · **Share button** (owner only) · **Logged-in user email + Sign Out**
- **Tab bar** (below navbar, within a programme): Explore · Design · Plan · Map · Assess · Implement — all always accessible, no locking
- **Sidebar** (optional, collapsible): contextual help pulled from `/content/help/[tab].md`
- **Offline indicator:** A subtle banner or icon in the navbar when the app detects no network connection, with a count of pending unsynced changes

### 8.3 Connection & Sync Status

- A small sync indicator in the navbar shows:
  - ✅ **Synced** — all local changes have been pushed
  - 🔄 **Syncing…** — a push or pull is in progress
  - ⚠️ **Offline** — no connection; local changes are queued
  - A tooltip on the indicator shows the timestamp of the last successful sync

---

## 9. Feature Specifications

### 9.1 Login Page (`/login`)

- Simple centred card with app name/logo
- Email input + "Send magic link" button
- On submit: calls `supabase.auth.signInWithOtp({ email })` and shows a confirmation message: "Check your email — we've sent you a login link"
- No password field; no sign-up flow (account created automatically on first magic link use)

---

### 9.2 Dashboard (`/dashboard`)

- Lists all programmes the user **owns or has been granted access to** as cards showing: name, number of years, number of modules, LO coverage %, date modified, owner email (if not owned by current user), collaborator count badge (if owned and shared)
- "New Programme" button opens a modal with fields: Programme Name (required), Description (optional), Number of Years (number input, min 1, default 3)
- Each programme card actions:
  - **Owner:** Open · Rename · Delete (with confirmation) · Share · Export JSON · Import JSON
  - **Editor:** Open · Export JSON
  - **Viewer:** Open
- "Import Programme" button on dashboard allows importing a previously exported JSON file (creates a new owned programme)

---

### 9.3 Tab 1 — EXPLORE

**Purpose:** Help users understand the UNESCO framework before designing LOs.

- Renders content from `/content/framework/` markdown files
- **Left panel:** Dimension list (4 dimensions). Clicking a dimension shows its competencies.
- **Right panel:** Competency detail view showing:
  - Competency title and ID (e.g. "1.1 Human Agency")
  - Dimension badge
  - Three level tabs: **Understand** · **Apply** · **Create** — each showing the level descriptor
  - Full narrative from the `.md` body, rendered as HTML
- **Top:** A search bar (Fuse.js fuzzy search across competency titles and descriptors) with results highlighting matching competencies
- **Visual overview:** A 4×3 grid card view of all 12 competencies (switchable with the detail view via a toggle button), colour-coded by dimension. Clicking a card opens the detail view.
- No data is written in this tab.
- Include a panel for references and reading with the following links/refs:

```javascript
https://www.unesco.org/en/articles/ai-competency-framework-students

Nicola-Richmond, K. et al. (2026) "Implementing a collaborative program-wide approach to redeveloping assessment in response to generative artificial intelligence (GenAI)," Assessment & Evaluation in Higher Education, 0(0), pp. 1–17. https://doi.org/10.1080/02602938.2026.2653886

Corbin, T. et al. (2025) "The wicked problem of AI and assessment," Assessment & Evaluation in Higher Education, 0(0), pp. 1–17. https://doi.org/10.1080/02602938.2025.2553340

Corbin, T., Dawson, P. and Liu, D. (2025) "Talk is cheap: why structural assessment changes are needed for a time of GenAI," Assessment & Evaluation in Higher Education [Preprint]. https://www.tandfonline.com/doi/abs/10.1080/02602938.2025.2503964
```

---

### 9.4 Tab 2 — DESIGN (Learning Outcomes)

**Purpose:** Create at least one programme-specific LO per UNESCO competency.

**Layout:**

- Left panel: list of all 12 competencies grouped by dimension, each showing a small badge indicating how many LOs have been created for it (e.g. "2 LOs")
- Right panel: LO editor for the selected competency, showing:
  - Competency title and level descriptors (collapsed/expandable) for reference
  - List of existing LOs for this competency (for this programme), each with edit and delete icons
  - "Add Learning Outcome" button → inline text area to write the LO text, confirm with Save
  - LOs can be reordered within a competency via drag-and-drop

**Coverage tracker (persistent, shown at top of tab):**

- Visual progress bar: "X of 12 competencies covered"
- Percentage label (e.g. "75%")
- Colour: grey until 100%, green at 100%
- A competency counts as "covered" when it has ≥ 1 LO

**Behaviour:**

- LO text field has a minimum of 10 characters
- Warn (not block) if a competency has 0 LOs when the user navigates away. Don't show a popup or toast, but add an "incomplete" icon in the tab
- Edit and delete actions are hidden for Viewer-role users

**Imported LOs (from CSV):**

When modules are imported via CSV (see §9.5), the LOs embedded in the CSV are imported as `learning_outcomes` records with `competency_id = null` and a `category` field (e.g. "Disciplinary Skills") sourced from the CSV. These imported LOs appear in the DESIGN tab under a special **"Unassigned — Imported LOs"** section at the bottom of the competency list. The user can:

- Click an imported LO to assign it to a UNESCO competency (moves it into that competency's LO list)
- Edit or delete the LO
- Leave it unassigned (it will appear as uncovered in coverage tracking)

An imported LO's `category` and `lo_number` fields are preserved for reference but are not used in UNESCO coverage calculations.

---

### 9.5 Tab 3 — MAP (Programme Structure)

**Purpose:** Define the degree programme's year-and-module grid and then assign each LO to exactly one module.

**Layout:**

- Programme appears as a vertical stack of year rows, each containing module cards side by side
- Each **year row** has a header label ("Year 1", "Year 2", etc.) and an "Add Module" button
- Number of years is set at programme creation but can be increased via an "Add Year" button at the bottom of the grid, or decreased (with a warning if the year contains modules)
- **Right panel (LOs):** All LOs for the programme, grouped by competency. Each LO shows its text and either a badge showing which module it's mapped to, or an "Unmapped" badge.

**Module card** displays:

- Module name, code (if set), credits (if set)
- LOs currently mapped to it as chips, each showing the related UNESCO competency
- Edit and Delete buttons (hidden for Viewer-role users)

**Adding/editing a module** opens a side panel or modal with fields:

- Module Name (required), Module Code (optional), Credits (optional), Description (optional), Year assignment (dropdown)

**Drag and drop** (Editor/Owner only):

- Modules can be dragged within a year row to reorder (updates `order` field)
- Modules can be dragged between year rows (updates `year` and `order` fields)
- LOs can be dragged from the left panel onto a module card

**Delete module:** Shows confirmation modal. If the module has mapped LOs, warns: "This module has X LOs mapped to it. Deleting the module will unmap those LOs." LOs are not deleted, just set to `module_id: null`.

**Mapping interactions** (Editor/Owner only, two methods):

1. **Drag and drop:** Drag an LO from the right panel onto a module card
2. **Autocomplete search:** Click an LO's "Assign to module" button → autocomplete dropdown (Fuse.js) searches by module name or code

**Coverage tracker (persistent, shown at top of tab):**

- Visual progress bar: "X of Y LOs mapped to a module"
- Percentage label
- Colour: grey until 100%, green at 100%

---

#### Quick Import (CSV)

**Purpose:** Speed up programme structure setup by importing module data from an institutional curriculum CSV export.

**CSV format expected:**

```javascript
(module_code,
  module_name,
  level,
  compulsory,
  credits,
  scheme,
  fheq_level,
  organiser,
  aims,
  learning_outcomes,
  assessments,
  url);
```

**Sample row:**

```javascript
LAW4001, Public Law, 4, Yes, 30, Undergraduate, Level 4, "Bob Bobinson, Jack Jackinson", Long description...,
  Academic Content | 1 | First LO; Disciplinary Skills | 2 | Another LO,
  001 | Examination (in-person computer based) | 75% | 3 Hours; 002 | Practical | 25%,
  https://curriculum.example.ac.uk/LAW4001
```

**Column mapping:**

| CSV column          | Maps to                  | Notes                                                                                             |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `module_code`       | `modules.code`           |                                                                                                   |
| `module_name`       | `modules.name`           |                                                                                                   |
| `level`             | `modules.year`           | `year = level - 3` (level 4→1, 5→2, 6→3, 7→4, 8→5). Levels outside 4–8: skip row, add to warnings |
| `compulsory`        | `modules.is_compulsory`  | `true` if value = "Yes" (case-insensitive)                                                        |
| `credits`           | `modules.credits`        |                                                                                                   |
| `scheme`            | `modules.scheme`         | e.g. "Undergraduate"                                                                              |
| `fheq_level`        | _(ignored)_              | Redundant with `level`                                                                            |
| `organiser`         | `modules.organiser`      | Stored as plain text; may contain multiple comma-separated names                                  |
| `aims`              | `modules.aims`           | Long-form text; distinct from `description`                                                       |
| `learning_outcomes` | `learning_outcomes` rows | See LO parsing below                                                                              |
| `assessments`       | `assessments` rows       | See assessment parsing below                                                                      |
| `url`               | `modules.url`            | Reference link; display only                                                                      |

**LO parsing:** Each LO entry is separated by `;`. Each entry is split by `|` into `category | lo_number | text` (e.g. `Disciplinary Skills | 2 | Apply critical thinking...`). Creates a `learning_outcomes` record with `competency_id = null`, preserving `category` and `lo_number`.

**Assessment parsing:** Each assessment entry is separated by `;`. Each entry is split by `|` into `assessment_code | title | weight [| duration]` (duration is optional). Creates an `assessments` record with `rag_status = null` and `priority_rating = null`.

**Import behaviour:**

- Parsing is done entirely client-side using `papaparse`
- Missing columns are silently ignored; only the available columns are used
- **Level mapping:** `year = level - 3`. Levels outside 4–8 cause the row to be skipped with a warning entry
- **Duplicate handling:** If a module with the same `code` already exists within the programme, the import performs an **upsert** — updating the existing module's fields and replacing its imported LOs and assessments (user-added LOs and any assessments with RAG/priority ratings are preserved)
- A **preview table** is shown before confirming, listing each module (name, code, year, is_compulsory, LO count, assessment count) with any skipped rows highlighted
- Import is processed in **batches of 10 modules** to keep the UI responsive; a progress indicator is shown during the operation (e.g. "Importing 34 of 100 modules…")
- After import, a summary is shown: "X modules imported, Y rows skipped" with a list of skipped rows and reasons
- Malformed rows (missing required fields like `module_name`) are **skipped with a warning**; the rest of the import proceeds
- Available to **Owners and Editors**. Viewers cannot import.

**CSV Import button location:** Shown in the MAP tab toolbar alongside "Add Module", labelled "Import from CSV".

---

#### Delete / Reset Structure

**Purpose:** Allow bulk or individual removal of modules to support re-importing or starting fresh.

**Individual module deletion:**

- Each module card has a **Delete** button (trash icon), hidden for Viewer-role users
- Clicking shows a confirmation modal
- **Protection rule:** A module **cannot** be deleted if any of its assessments have `rag_status IS NOT NULL` or `priority_rating IS NOT NULL` (i.e. the user has already rated the assessment in the ASSESS tab). A clear message is shown: "This module has assessments with ratings — remove the ratings first before deleting the module."
- If the module has mapped LOs but no rated assessments, deletion is allowed with the warning: "This module has X LOs mapped to it. They will be unmapped (not deleted)."

**Bulk delete — all modules in a year row:**

- Each year row header has a "Clear year" option (e.g. via a ⋯ menu)
- Shows a confirmation modal listing: how many modules will be deleted vs skipped (protected by ratings)
- Protected modules remain; unprotected modules are deleted
- Post-action summary: "X modules deleted. Y modules were skipped — they have assessment ratings."

**Bulk delete — all modules in programme:**

- A "Reset all modules" option is accessible from the MAP tab toolbar (e.g. a ⋯ overflow menu), labelled "Reset structure"
- Shows a strong confirmation modal (e.g. requires typing "RESET" or clicking a second confirm button)
- Same protection logic applies: only unprotected modules are deleted
- Post-action summary shown as above

> **Note:** Deleting a module never deletes its LOs or assessments — assessments are cascade-deleted with the module (per schema), but LOs are only unmapped (`module_id` set to null). If the module is protected, nothing is deleted.

---

### 9.6 Tab 4 — ASSESS

**Purpose:** Add assessments to modules and rate them for redesign prioritisation.

**Layout:**

- Programme grid (same module card structure as MAP)
- Each module card is expandable to show its assessments
- "Add Assessment" button on each module card (hidden for Viewer-role users)

**Assessment form** (inline or in side panel):

- Assessment Code (optional), Title (required), Description (optional), Weight (optional), Duration (optional)
- LOs (list LOs mapped to module, default all checked)
- **Priority Rating:** Low / Medium / High (optional) — radio or segmented button. Tooltip: "How urgently does this assessment need to be reviewed for AI readiness?"
- **RAG Status:** Red / Amber / Green (required when saving from the form) — colour-coded selector. Tooltip:
  - 🔴 Red: Secure assessment — AI use is not permitted
  - 🟡 Amber: Optional AI usage — students may use AI but are not required to
  - 🟢 Green: Mandatory AI usage — students are required to engage with AI as part of this assessment

**Assessment card** shows: assessment code, title, weight, duration, priority badge, RAG dot indicator, edit/delete icons (hidden for Viewers)

**Summary view (top of tab):**

- Total assessments across programme
- Breakdown counts: High / Medium / Low priority
- Breakdown counts: Red / Amber / Green RAG
- Coverage (count and %) of LOs against assessments

---

### 9.7 Tab 5 — IMPLEMENT

**Purpose:** Export the full programme plan.

**Section A — PDF Export**

Two separate PDF download buttons:

1. **Summary PDF:** Cover page · Programme grid · Coverage stats · Assessment summary table. Landscape where content is wider than tall; optimise page breaks.
2. **Full Detail PDF:** Everything in summary, plus all 12 competencies with LOs · LO-to-module mapping table · Per-module assessment details · RAG and risk breakdown charts

**Section B — XLSX Export**

Two separate XLSX download buttons:

1. **Summary XLSX:** Sheet 1: Programme overview · Sheet 2: Coverage stats · Sheet 3: Assessment summary
2. **Full Detail XLSX:** Sheet 1: Programme info · Sheet 2: All LOs · Sheet 3: Module list · Sheet 4: Assessments · Sheet 5: Coverage matrix

**Section C — JSON Backup / Restore**

- **Export JSON:** Downloads a complete programme record (programme + modules + LOs + assessments + assessment LO links). Filename: `[programme-name]-backup-[YYYY-MM-DD].json`
- **Import JSON:** File picker to restore from a previously exported JSON file. Generates new UUIDs for all records. Shows a preview modal before confirming. Imported programme is owned by the current user.

> Export and import are available to all roles (Owner, Editor, Viewer). Import always creates a new programme owned by the importing user.

---

## 10. UI/UX Guidelines

### 10.1 Theme

- Light mode only
- Clean, professional aesthetic appropriate for academic users
- Primary colour: `#2563EB` (Tailwind `blue-600`)
- Dimension colour coding (consistent across all tabs):
  - Human-Centred Mindset: `blue`
  - Ethics of AI: `purple`
  - AI Techniques & Applications: `emerald`
  - AI System Design: `orange`

### 10.2 Multi-User Indicators

- On the dashboard, shared programmes display the owner's email in a subtle subheading
- The Share panel (owner only) is accessible via a **Share** button in the top navbar and on each owned programme card
- When a Viewer is accessing a programme, a non-intrusive banner reads: "You have view-only access to this programme"
- No avatar presence indicators or live cursors are required in v2 (polling-based sync does not support this gracefully)

### 10.3 Accessibility

- All interactive elements must be keyboard-navigable
- Colour is never the sole means of conveying information (RAG status also uses icons/labels)
- Minimum contrast ratio of 4.5:1 for body text

---

## 11. Environment Configuration

The following environment variables must be set (e.g. in `.env.local`):

```javascript
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These are safe to expose to the browser because Supabase Row Level Security (RLS) enforces all access control on the database side.

---

## 12. Future Considerations (Post-v2)

- **Realtime sync** via Supabase Realtime (replace polling)
- **Conflict UI** for surfacing and resolving write conflicts
- **Ownership transfer** between users
- **Organisation/team accounts** — group programmes under a shared workspace
- **Profile page** — allow users to update their display name
- **Comment threads** on LOs or assessments for collaborative annotation
