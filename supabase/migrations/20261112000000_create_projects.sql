-- Projects: one row per user project; the whole scene model lives in `scene` (jsonb).
-- Row Level Security: every user can see and modify only their own projects.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  scene jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is 'User projects; scene holds the full scene model (lengths in mm).';

-- Supports RLS filtering and the "my projects, newest first" list.
create index projects_owner_id_updated_at_idx on public.projects (owner_id, updated_at desc);

-- Keep updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- Access: signed-in users only; anonymous role gets nothing.
alter table public.projects enable row level security;

revoke all on table public.projects from anon;
grant select, insert, update, delete on table public.projects to authenticated;

create policy "projects_select_own"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "projects_insert_own"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "projects_update_own"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "projects_delete_own"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
