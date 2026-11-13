-- Private storage for manufacturer 3D models (glTF binary) attached to equipment types.
-- Files are stored as <user id>/<type id>/<file name>.glb. Every user can read and write
-- only the files in their own folder. Files are kept when a catalogue type is deleted,
-- because equipment already placed in projects still refers to them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment-models', 'equipment-models', false, 20971520, array['model/gltf-binary'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "equipment_models_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'equipment-models'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "equipment_models_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'equipment-models'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "equipment_models_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'equipment-models'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'equipment-models'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "equipment_models_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'equipment-models'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
