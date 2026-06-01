-- Device token and push delivery state.

create table device_tokens (
  id uuid primary key,
  user_id uuid not null references users(id),
  platform text not null check (platform in ('ios', 'android')),
  token text not null,
  status text not null check (status in ('active', 'disabled', 'invalid')),
  last_registered_at timestamptz not null,
  invalidated_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (platform, token)
);

create table push_deliveries (
  id uuid primary key,
  user_id uuid not null references users(id),
  device_token_id uuid not null references device_tokens(id),
  notification_message_id uuid not null references notification_messages(id),
  status text not null check (status in ('sent', 'failed', 'permission_denied')),
  provider_message_id text,
  failure_reason text,
  retry_after timestamptz,
  created_at timestamptz not null
);

create index device_tokens_user_active_idx on device_tokens(user_id, platform) where status = 'active';
create index push_deliveries_user_created_idx on push_deliveries(user_id, created_at desc);
create index push_deliveries_retry_idx on push_deliveries(retry_after) where status = 'failed' and retry_after is not null;

alter table device_tokens enable row level security;
alter table push_deliveries enable row level security;

create policy device_tokens_user_isolation on device_tokens
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy push_deliveries_user_isolation on push_deliveries
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
