-- Supabase RLS full reset-and-recreate hotfix
-- Run this in Supabase SQL Editor when sync permissions/policies are broken.

-- 0) Ensure RLS enabled on all app tables
alter table if exists public.programmes enable row level security;
alter table if exists public.programme_access enable row level security;
alter table if exists public.modules enable row level security;
alter table if exists public.learning_outcomes enable row level security;
alter table if exists public.assessments enable row level security;
alter table if exists public.assessment_los enable row level security;

-- 1) Drop ALL existing policies on target tables to remove drift/conflicts
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('programmes', 'programme_access', 'modules', 'learning_outcomes', 'assessments', 'assessment_los')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 2) Recreate helper functions
create or replace function public.is_programme_owner(prog_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.programmes p
    where p.id = prog_id
      and p.owner_id = auth.uid()
  );
$$;

create or replace function public.can_access_programme(prog_id uuid)
returns boolean
language sql
security definer
as $$
  select public.is_programme_owner(prog_id)
  or exists (
    select 1
    from public.programme_access pa
    where pa.programme_id = prog_id
      and pa.grantee_id = auth.uid()
  );
$$;

create or replace function public.can_edit_programme(prog_id uuid)
returns boolean
language sql
security definer
as $$
  select public.is_programme_owner(prog_id)
  or exists (
    select 1
    from public.programme_access pa
    where pa.programme_id = prog_id
      and pa.grantee_id = auth.uid()
      and pa.role = 'editor'
  );
$$;

alter function public.is_programme_owner(uuid) set search_path = public;
alter function public.can_access_programme(uuid) set search_path = public;
alter function public.can_edit_programme(uuid) set search_path = public;

-- 3) Recreate policies: programmes
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

drop policy if exists "Shared users can read programmes" on public.programmes;
create policy "Shared users can read programmes"
  on public.programmes
  for select
  using (
    exists (
      select 1
      from public.programme_access pa
      where pa.programme_id = id
        and (
          pa.grantee_id = auth.uid()
          or lower(pa.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

create policy "Editors can update programmes"
  on public.programmes for update
  using (
    exists (
      select 1
      from public.programme_access pa
      where pa.programme_id = id
        and (
          pa.grantee_id = auth.uid()
          or lower(pa.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
        and pa.role = 'editor'
    )
  )
  with check (
    exists (
      select 1
      from public.programme_access pa
      where pa.programme_id = id
        and (
          pa.grantee_id = auth.uid()
          or lower(pa.grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
        and pa.role = 'editor'
    )
  );

-- Optional public readonly sharing
create policy "Anon can read publicly shared programmes"
  on public.programmes for select
  to anon
  using (public_access_enabled = true and public_access_token is not null);

-- 4) Recreate policies: programme_access
create policy "Users can read access rows"
  on public.programme_access for select
  using (
    grantee_id = auth.uid()
    or granted_by = auth.uid()
    or lower(grantee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Owners can insert access grants"
  on public.programme_access for insert
  with check (
    public.is_programme_owner(programme_id)
    and granted_by = auth.uid()
  );

create policy "Owners can update access grants"
  on public.programme_access for update
  using (public.is_programme_owner(programme_id))
  with check (public.is_programme_owner(programme_id));

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

create policy "Owners can delete access grants"
  on public.programme_access for delete
  using (public.is_programme_owner(programme_id));

-- 5) Recreate policies: modules
create policy "Read access for programme members"
  on public.modules for select
  using (public.can_access_programme(programme_id));

create policy "Write access for programme editors"
  on public.modules for insert
  with check (public.can_edit_programme(programme_id));

create policy "Update access for programme editors"
  on public.modules for update
  using (public.can_edit_programme(programme_id));

create policy "Delete access for programme editors"
  on public.modules for delete
  using (public.can_edit_programme(programme_id));

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

-- 6) Recreate policies: learning_outcomes
create policy "Read access for programme members"
  on public.learning_outcomes for select
  using (public.can_access_programme(programme_id));

create policy "Write access for programme editors"
  on public.learning_outcomes for insert
  with check (public.can_edit_programme(programme_id));

create policy "Update access for programme editors"
  on public.learning_outcomes for update
  using (public.can_edit_programme(programme_id));

create policy "Delete access for programme editors"
  on public.learning_outcomes for delete
  using (public.can_edit_programme(programme_id));

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

-- 7) Recreate policies: assessments
create policy "Read access for programme members"
  on public.assessments for select
  using (public.can_access_programme(programme_id));

create policy "Write access for programme editors"
  on public.assessments for insert
  with check (public.can_edit_programme(programme_id));

create policy "Update access for programme editors"
  on public.assessments for update
  using (public.can_edit_programme(programme_id));

create policy "Delete access for programme editors"
  on public.assessments for delete
  using (public.can_edit_programme(programme_id));

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

-- 8) Recreate policies: assessment_los
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

-- 9) Grants
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.programmes to authenticated;
grant select, insert, update, delete on table public.modules to authenticated;
grant select, insert, update, delete on table public.learning_outcomes to authenticated;
grant select, insert, update, delete on table public.assessments to authenticated;
grant select, insert, update, delete on table public.programme_access to authenticated;
grant select, insert, update, delete on table public.assessment_los to authenticated;

grant select on table public.programmes to anon;
grant select on table public.programme_access to anon;
grant select on table public.modules to anon;
grant select on table public.learning_outcomes to anon;
grant select on table public.assessments to anon;

grant execute on function public.is_programme_owner(uuid) to anon, authenticated;
grant execute on function public.can_access_programme(uuid) to anon, authenticated;
grant execute on function public.can_edit_programme(uuid) to anon, authenticated;
