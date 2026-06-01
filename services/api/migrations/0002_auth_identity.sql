-- Persist provider account identity for Apple/Google/email sign-in.

alter table users add column provider_account_id text;

update users
set provider_account_id = id::text
where provider_account_id is null;

alter table users alter column provider_account_id set not null;

create unique index users_provider_account_uidx on users(provider, provider_account_id);
create unique index users_email_active_uidx on users(lower(email)) where email is not null and deleted_at is null;
