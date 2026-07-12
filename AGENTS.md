# AI Literacy Planner - Project Context for Mistral Vibe

## Overview

This is the **AI Competency Explorer and AI Literacy Programme Redesign Tool** - a Next.js application that helps educational institutions design degree programmes aligned with the UNESCO AI Competency Framework for Students.

## Key Concepts

### Data Model

- **Programme**: A degree programme with years, description, and associated modules/LOs/assessments
- **Module**: A course within a programme, belonging to a specific year
- **Learning Outcome (LO)**: A competency or skill that students should achieve
  - `competencyId`: Links to UNESCO AI competency (null for old/imported LOs)
  - `moduleId`: Links to module (null for programme-level LOs)
  - `status`: "to_delete" marks LOs for removal
  - `category`: Legacy field from CSV imports (previously "Imported Category")
- **Assessment**: Module assessments with RAG and priority ratings
  - `rag`: Red/Amber/Green - AI usage taxonomy (Red=no AI, Amber=optional, Green=mandatory)
  - `priority`: High/Medium/Low - assessment priority
  - `status`: "to_delete" marks assessments for removal

### UNESCO Framework

- 12 competencies across 4 dimensions
- Framework data loaded from `/lib/framework.ts`
- Full framework documentation: https://www.unesco.org/en/articles/ai-competency-framework-students
- App's explore page: `/explore`

### "New" vs "Old" Items

- **New LOs**: Have `competencyId !== null` (mapped to UNESCO competency)
- **Old LOs**: Have `competencyId === null` (typically from CSV imports before mapping)
- **New Assessments**: Identified by having `priority !== null && priority !== ""`
- **Removed Items**: Have `status === "to_delete"`
- **Programme-level LOs**: Have `moduleId === null`

## File Structure

- `/app/programme/[id]/` - Programme-specific pages (explore, plan, design, map, assess, implement)
- `/lib/xlsx-export.ts` - XLSX export functionality
- `/lib/pdf-export.ts` - PDF export functionality
- `/lib/app-data.tsx` - State management, data types, and CRUD operations
- `/lib/framework.ts` - UNESCO competency framework data
- `/lib/supabase.ts` - Supabase client configuration
- `/components/` - React components

## Environment Configuration

Required environment variables (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_REQUIRE_AUTH=true (optional)
```

## XLSX Export Specifics

The `downloadFullDetailXlsx` function in `/lib/xlsx-export.ts` exports 7 tabs:

1. **Programme Info** - Programme overview with counts in two-column layout (excludes old LOs from counts)
2. **Stats** - Coverage statistics with counts and percentages
3. **AI coverage matrix** - Competency coverage across modules with UNESCO URL
4. **All LOs** - All learning outcomes with competency mapping
5. **Module List** - Modules with counts and full clickable URLs
6. **Assessments** - Sorted by priority then RAG, with autofilter and color coding
7. **Coverage Matrix** - Competency coverage matrix

### Colour Coding (Assessments Tab)

Applied via inline cell styling in the XLSX worksheet:

**Priority:**
- High: Dark gray background (#374151) with white text
- Medium: Medium gray background (#6B7280) with white text
- Low: Light gray background (#E5E7EB) with dark text

**RAG:**
- Red: Light red background (#FEE2E2) with dark red text
- Amber: Light amber background (#FDE68A) with dark amber text
- Green: Light green background (#D1FAE5) with dark green text

## Common Patterns

- **Filtering new LOs**: `los.filter(lo => lo.competencyId !== null)`
- **Filtering removed items**: `items.filter(item => item.status === "to_delete")`
- **Filtering programme LOs**: `los.filter(lo => lo.moduleId === null)`
- **App origin**: `window.location.origin` (client-side only)
- **Sort order**: Priority (High > Medium > Low > null), then RAG (Red > Amber > Green > null)

## Implementation Notes

- Colour coding uses inline cell styling via `aoa_to_sheet` with cell objects containing style definitions
- The `getAppOrigin()` helper uses `window.location.origin` for client-side URL generation
- Programme Info uses two-column layout with merged field/value pairs per row
- Module URLs are converted to full URLs for clickability in spreadsheets
- New LOs identified by `competencyId !== null`, old LOs have `competencyId === null`
