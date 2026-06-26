# Pending Tasks — AI Literacy Programme Redesign Tool

Full spec audit against `docs/product-specification.md`. Tracks what is implemented, in progress, and still to do.

---

## ✅ Implemented

### Authentication (§3)
- [x] Magic link login page (`/login`) with Supabase `signInWithOtp`
- [x] Auth callback page (`/auth/callback`) with PKCE `token_hash` and legacy hash fallback
- [x] `AuthProvider` context with session restoration, `signInWithMagicLink`, `signOut`
- [x] Graceful degradation — local-only mode when Supabase env vars are absent
- [x] Client-side route protection via `AuthGuard` (redirects to `/login` when Supabase is configured and no session)

### Data / IndexedDB (§4)
- [x] Full IndexedDB schema (`lib/idb-store.ts`) with stores for `programmes`, `modules`, `learning_outcomes`, `assessments`
- [x] `syncStatus` (`pending` / `synced`) and `localUpdatedAt` fields on every record
- [x] CRUD helpers: `upsertProgramme`, `upsertModule`, `upsertLearningOutcome`, `upsertAssessment`, and matching `delete*FromIdb` functions
- [x] `loadAllFromIdb` / `saveAllToIdb` for bulk reads/writes
- [x] `getPendingRecords` to retrieve all unsynced writes
- [x] `markSynced` to update sync status after a successful push
- [x] `mergeFromSupabase` for last-write-wins pull merge with local-wins when pending
- [x] `app-data.tsx` loads from IndexedDB on mount (replaces localStorage)
- [x] `app-data.tsx` saves to IndexedDB on every state change
- [x] Offline detection via `navigator.onLine` events
- [x] `syncState` (`idle` / `syncing` / `offline`) and `pendingCount` exported from context
- [x] Supabase background sync: push pending on mount + 5-second poll, pull and merge

### Sharing / Access Control (§7)
- [x] `ShareModal` component (`components/share-modal.tsx`) — invite by email + role selector
- [x] Lists current collaborators with Pending/Active status
- [x] Revoke access (deletes row from `programme_access`)
- [x] Upserts to Supabase `programme_access` table on invite
- [x] Local-only mode simulation (no Supabase call, still updates UI)
- [x] Share button shown in `ProgrammeShell` for owners
- [x] Viewer read-only banner in `ProgrammeShell`
- [x] `role` field on `Programme` type (`owner` / `editor` / `viewer`)

### Site Header (§8.2, §8.3)
- [x] Logged-in user email shown in header
- [x] Sign Out button calling `useAuth().signOut()`
- [x] Sync status indicator with `Synced` / `Syncing…` / `Offline · N pending` labels
- [x] Login link shown when not authenticated

### Modal-based editing (all tabs)
- [x] Reusable `Modal` (portal, Escape key, focus trap) and `ConfirmModal` components
- [x] Dashboard — Edit Programme modal (name, description, years)
- [x] Dashboard — Delete programme `ConfirmModal`
- [x] Plan tab — Edit Module modal (name, code, credits, description)
- [x] Plan tab — `ConfirmModal` for delete module, clear year, reset structure, remove year
- [x] Plan tab — Info `Modal` replacing `window.alert` for import/reset results
- [x] Design tab — Edit LO modal with min-length validation
- [x] Assess tab — Edit Assessment modal (title, type, description, weight, priority, RAG)

---

## ⚠️ Partially Implemented

### Supabase Schema / RLS (§6.1)
- [ ] **Supabase schema SQL** — the spec includes a full schema creation script (§6.1). This needs to be run in the Supabase dashboard or applied via migrations. It is not automated.
- [ ] **Row Level Security** — RLS policies from §6.1 must be applied manually in Supabase. The app relies on RLS for all access control enforcement but does not create or verify policies.
- [ ] `programme_access` table — used by `ShareModal` but table must be created in Supabase first.

### Dashboard (§9.2)
- [x] Programme cards with create / open / edit / delete
- [ ] Dashboard cards do not yet show: LO coverage %, date modified, owner email (for shared programmes), collaborator count badge
- [ ] **Share button on dashboard programme cards** — the Share panel is accessible from the programme shell navbar, but the spec also requires it on each owned card on the dashboard
- [ ] "Import Programme" button (import from exported JSON to create a new programme) — not yet implemented
- [ ] "Export JSON" action on dashboard programme cards — not yet implemented
- [ ] Editor/Viewer role restrictions on dashboard card actions (only Owner sees Rename/Delete)

### Sharing (§7.2, §7.3)
- [ ] **`ShareModal` does not load existing collaborators from Supabase on open** — it starts empty. Needs a `useEffect` to query `programme_access` on mount.
- [ ] Change role for an existing collaborator (currently only Revoke is available)
- [ ] Owner email shown on shared programme cards in dashboard
- [ ] Collaborator count badge on owned+shared programme cards

### Navbar / Programme Switcher (§8.2)
- [ ] **Programme switcher dropdown** in top navbar — lists all programmes the user owns or has access to; not yet implemented
- [ ] Share button in the top navbar (currently only in the programme shell header area, not the global navbar)

---

## ❌ Not Yet Implemented

### Content Architecture (§5)
- [ ] `/content/` directory with Markdown files for UNESCO framework content (dimensions, competencies, help pages)
- [ ] `scripts/build-content.ts` — prebuild script that compiles `.md` files to `public/framework-content.json`
- [ ] `"prebuild"` npm script wiring in `package.json`
- [ ] Explore tab reading from `public/framework-content.json` at runtime via `fetch`
- [ ] Help sidebars in each tab reading from `/content/help/[tab].md`

### Tab 1 — EXPLORE (§9.3)
- [ ] Left panel: Dimension list (4 dimensions)
- [ ] Right panel: Competency detail with Understand / Apply / Create level tabs
- [ ] 4×3 visual grid card view of all 12 competencies, colour-coded by dimension
- [ ] Toggle between grid view and detail view
- [ ] Full narrative from `.md` body rendered as HTML (requires `react-markdown`)
- [ ] Fuzzy search across competency titles and descriptors (requires `fuse.js`)
- [ ] References and reading panel with the 4 required links/citations (§9.3)
- [ ] Dimension colour coding (blue / purple / emerald / orange per §10.1)

### Tab 2 — DESIGN (§9.4)
- [x] LO list, add, edit, delete
- [ ] Left panel: Competency list with LO count badges — competencies come from static content, not yet wired
- [ ] Right panel: Competency level descriptors (collapsed/expandable) for reference alongside LO editor
- [ ] Drag-and-drop reordering of LOs within a competency (requires `@dnd-kit`)
- [ ] Coverage tracker progress bar ("X of 12 competencies covered") — blocked by static content not being loaded
- [ ] "Incomplete" icon in tab bar for competencies with 0 LOs (warn-on-navigate)
- [ ] Edit/delete hidden for Viewer-role users

### Tab 3 — PLAN/MAP (§9.5 / §8.1)
- [x] Year grid, add/remove modules, edit module, delete module, clear year, reset structure
- [ ] **CSV Import** (`papaparse` integration) — full column mapping, LO/assessment parsing, preview table, batched import with progress, skipped-row warnings (§9.5 Quick Import)
- [ ] Module protection rule: cannot delete if assessments have ratings (§9.5 Delete/Reset)
- [ ] `papaparse` package not yet installed
- [ ] Post-delete summary modal ("X deleted, Y skipped")
- [ ] "Import from CSV" button in MAP tab toolbar
- [ ] Edit/delete/import hidden for Viewer-role users
- [ ] Module fields from spec not yet in UI: `is_compulsory`, `scheme`, `organiser`, `aims`, `url` (§6.1 schema)

### Tab 4 — ASSESS (§9.6)
- [x] Assessment list, add, edit, delete per module
- [ ] Assessment form: LO multi-select (list LOs mapped to module, default all checked) — LO mapping not yet implemented
- [ ] Assessment card: priority badge, RAG dot indicator (currently plain text)
- [ ] Summary view at top of tab: total count, High/Medium/Low breakdown, Red/Amber/Green breakdown, LO coverage %
- [ ] Edit/delete hidden for Viewer-role users

### Tab 5 — IMPLEMENT (§9.7)
- [ ] **PDF Export** — Summary PDF and Full Detail PDF (requires `jspdf` or similar)
- [ ] **XLSX Export** — Summary and Full Detail XLSX (requires `xlsx` / `exceljs`)
- [ ] **JSON Export** — full programme backup download
- [ ] **JSON Import** — restore from backup with new UUID generation and preview modal
- [ ] Current Implement tab content is a placeholder

### Tab 6 — MAP (LO-to-module mapping) (§8.1)
- [ ] The MAP tab (`/programme/[id]/map`) — spec describes LO-to-module mapping functionality; current implementation is a placeholder
- [ ] Mapping interface: for each module, show which LOs are mapped; allow adding/removing LO mappings
- [ ] Used by ASSESS tab (LO multi-select) and IMPLEMENT tab (coverage matrix)

### Accessibility (§10.3)
- [ ] Audit all interactive elements for keyboard navigation
- [ ] Verify RAG status never relies on colour alone (add icons/labels where missing)
- [ ] Contrast ratio audit

### Supabase Realtime / Polling Improvements
- [ ] Current polling is every 5 seconds regardless of activity — consider back-off or visibility-based polling
- [ ] Last-sync timestamp tooltip on the sync indicator (§8.3)
- [ ] Supabase Realtime as future replacement for polling (§12)

---

## 📦 Dependencies to Add

| Package | Purpose | Spec reference |
|---|---|---|
| `@dnd-kit/core`, `@dnd-kit/sortable` | Drag-and-drop LO reordering in DESIGN tab | §9.4 |
| `fuse.js` | Fuzzy search in EXPLORE tab | §9.3 |
| `react-markdown` | Render competency narrative HTML in EXPLORE | §9.3 |
| `papaparse` | CSV import in MAP tab | §9.5 |
| `jspdf` + `jspdf-autotable` | PDF export in IMPLEMENT tab | §9.7 |
| `xlsx` or `exceljs` | XLSX export in IMPLEMENT tab | §9.7 |

---

## 🗄️ Supabase Setup Required (Manual Steps)

Before the app can use Supabase, a project admin must run the schema SQL from **§6.1** of the spec in the Supabase SQL Editor. This creates:

- `programmes` table
- `modules` table
- `learning_outcomes` table
- `assessments` table
- `assessment_learning_outcomes` join table
- `programme_access` table (required for sharing)
- All RLS policies (row-level security for owner/editor/viewer roles)
- All indexes

The Supabase project URL and anon key must be set in `.env.local` (see `.env.local.example`).

---

*Last updated: 2026-06-18 — reflects state after PR #2 implementation sprint.*
