-- Custom character creation and safety review metadata.

alter table characters
  add column relationship text,
  add column tone text,
  add column safety_review_status text not null default 'approved'
    check (safety_review_status in ('approved', 'needs_review', 'rejected')),
  add column safety_review_reason text;

create index characters_owner_custom_idx
  on characters(owner_user_id, created_at desc)
  where type = 'custom';

alter table characters enable row level security;

create policy characters_catalog_read on characters
  for select
  using (
    type in ('built_in', 'pack')
    or owner_user_id = current_setting('app.current_user_id', true)::uuid
  );

create policy characters_custom_owner_insert on characters
  for insert
  with check (
    type = 'custom'
    and owner_user_id = current_setting('app.current_user_id', true)::uuid
  );

create policy characters_custom_owner_update on characters
  for update
  using (
    type = 'custom'
    and owner_user_id = current_setting('app.current_user_id', true)::uuid
  )
  with check (
    type = 'custom'
    and owner_user_id = current_setting('app.current_user_id', true)::uuid
  );
