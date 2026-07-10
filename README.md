# AI Literacy Planner

Repository for the AI Competency Explorer and AI Literacy Programme Redesign tool.

## Documents

- [Product specification](docs/product-specification.md)
- [UNESCO source PDF](reference/UNESCO%20Students%20391105eng.pdf)

## App development

```bash
npm install
npm run dev
```

## Supabase setup

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_REQUIRE_AUTH=true
# Localhost-only quick login (optional; uses Supabase email/password)
NEXT_PUBLIC_DEV_LOGIN_EMAIL=dev-user@example.com
NEXT_PUBLIC_DEV_LOGIN_PASSWORD=your-dev-password
```

For localhost you can bypass magic links while still syncing to Supabase by
using the "Quick dev login" button on `/login`.

- This still creates a real authenticated Supabase session (RLS applies).
- Keep these dev credentials local-only; do not set them in production.

In Supabase Auth settings:

- Enable Email provider.
- Enable passwordless magic links (OTP).
- Add redirect URL for local development:
	- `http://localhost:3000/auth/callback`
- Add your production callback URL when deploying.

Run the full SQL setup script from one place:

- [Supabase Schema Script](docs/product-specification.md#61-schema-creation-script)

This single SQL block includes tables, RLS, sharing, and public readonly link support.

If your Supabase logs show errors like `42P17 infinite recursion detected` or
`42501 permission denied` for `programmes`, `programme_access`, `modules`,
`learning_outcomes`, or `assessments`, run:

- [RLS Hotfix Script](docs/supabase-rls-hotfix.sql)

The hotfix performs a full policy reset + recreate for all app tables, restores
function/grant permissions, and corrects programme INSERT ownership checks
(`owner_id = auth.uid()`).

## Local testing checklist

1. Configure `.env.local` with Supabase URL and anon key.
2. Run the schema script from the product spec in Supabase SQL Editor.
3. Start app locally:

```bash
npm run dev
```

4. Open `/login`, enter your email, and complete magic-link sign in.
5. Confirm `/dashboard` only works after sign in.
6. Create a programme, open Share, enable public access, copy the generated `/share/{token}` URL.
7. Open the share URL in an incognito window and confirm:
	- Read-only badge is visible.
	- You can navigate tabs and export files.
	- You cannot add/edit/delete data.

## Initial admin user and dashboard protection

- The first person who signs in and creates a programme becomes the owner of that programme (owner = admin for that programme).
- To set up your initial admin, sign in with your institutional admin email first and create the first programme from that account.
- If `/dashboard` is currently public, your app is running in local-only mode because Supabase env vars are missing or empty.
- Protection is enabled automatically once both env vars are set and the app restarts:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- To force protection even when Supabase is missing, set:
	- `NEXT_PUBLIC_REQUIRE_AUTH=true`

## Validation

```bash
npm run lint
npm run build
```
