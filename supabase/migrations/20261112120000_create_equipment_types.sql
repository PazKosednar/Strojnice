-- Equipment catalogue: one row per equipment type of a user. The catalogue belongs to the
-- user (not to a project) and is available in all of their projects. `definition` holds the
-- full type (shape, dimensions, mounting, ports, clearances) as validated by the app.
-- Row Level Security: every user can see and modify only their own types.

create table public.equipment_types (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.equipment_types is 'Per-user equipment catalogue; definition holds the type (lengths in mm).';

-- Supports RLS filtering and the catalogue list sorted by name.
create index equipment_types_owner_id_name_idx on public.equipment_types (owner_id, name);

-- Reuses public.set_updated_at() from the projects migration.
create trigger equipment_types_set_updated_at
  before update on public.equipment_types
  for each row
  execute function public.set_updated_at();

alter table public.equipment_types enable row level security;

revoke all on table public.equipment_types from anon;
grant select, insert, update, delete on table public.equipment_types to authenticated;

create policy "equipment_types_select_own"
  on public.equipment_types for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "equipment_types_insert_own"
  on public.equipment_types for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "equipment_types_update_own"
  on public.equipment_types for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "equipment_types_delete_own"
  on public.equipment_types for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
