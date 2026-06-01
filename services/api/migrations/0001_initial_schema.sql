-- CueUp initial data model.
-- PostgreSQL is the target dialect. User-scoped tables enable RLS and expect
-- the API to set app.current_user_id for authenticated requests.

create table users (
  id uuid primary key,
  email text,
  provider text not null check (provider in ('apple', 'google', 'email')),
  display_name text,
  locale text not null,
  timezone text not null,
  plan text not null check (plan in ('free', 'pro')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table characters (
  id uuid primary key,
  owner_user_id uuid references users(id),
  type text not null check (type in ('built_in', 'custom', 'pack')),
  name text not null,
  description text,
  persona_prompt text not null,
  strictness integer not null check (strictness between 0 and 10),
  warmth integer not null check (warmth between 0 and 10),
  catchphrases jsonb,
  prohibited_style jsonb,
  icon_url text,
  pack_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint custom_character_requires_owner check (type <> 'custom' or owner_user_id is not null)
);

create table folders (
  id uuid primary key,
  user_id uuid not null references users(id),
  name text not null,
  color text,
  sort_order integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table reminders (
  id uuid primary key,
  user_id uuid not null references users(id),
  title text not null,
  note text,
  scheduled_at timestamptz not null,
  recurrence_rule jsonb,
  character_id uuid not null references characters(id),
  folder_id uuid references folders(id),
  status text not null check (status in ('active', 'completed', 'snoozed', 'deleted')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  deleted_at timestamptz
);

create table notification_messages (
  id uuid primary key,
  user_id uuid not null references users(id),
  reminder_id uuid not null references reminders(id),
  character_id uuid not null references characters(id),
  body text not null,
  generation_status text not null check (generation_status in ('success', 'fallback', 'failed')),
  sent_at timestamptz,
  completed_at timestamptz,
  ai_model text,
  token_usage jsonb,
  hidden_at timestamptz,
  created_at timestamptz not null
);

create table tags (
  id uuid primary key,
  user_id uuid not null references users(id),
  name text not null,
  color text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, name)
);

create table reminder_tags (
  reminder_id uuid not null references reminders(id),
  tag_id uuid not null references tags(id),
  primary key (reminder_id, tag_id)
);

create table subscriptions (
  id uuid primary key,
  user_id uuid not null references users(id),
  platform text not null check (platform in ('app_store', 'google_play')),
  product_id text not null,
  status text not null check (status in ('active', 'canceled', 'expired', 'refunded')),
  expires_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table character_pack_purchases (
  id uuid primary key,
  user_id uuid not null references users(id),
  pack_id uuid not null,
  platform text not null check (platform in ('app_store', 'google_play')),
  purchased_at timestamptz not null,
  status text not null check (status in ('active', 'refunded')),
  unique (user_id, pack_id, platform)
);

create table usage_quotas (
  id uuid primary key,
  user_id uuid not null references users(id),
  period text not null,
  ai_notification_count integer not null default 0 check (ai_notification_count >= 0),
  chat_message_count integer not null default 0 check (chat_message_count >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, period)
);

create table chat_messages (
  id uuid primary key,
  user_id uuid not null references users(id),
  character_id uuid not null references characters(id),
  role text not null check (role in ('user', 'assistant', 'system')),
  body text not null,
  created_at timestamptz not null
);

create index users_deleted_idx on users(deleted_at);
create index reminders_user_active_idx on reminders(user_id, scheduled_at) where deleted_at is null and status <> 'deleted';
create index notification_messages_user_created_idx on notification_messages(user_id, created_at desc) where hidden_at is null;
create index folders_user_sort_idx on folders(user_id, sort_order);
create index tags_user_name_idx on tags(user_id, name);
create index subscriptions_user_status_idx on subscriptions(user_id, status);
create index character_pack_purchases_user_status_idx on character_pack_purchases(user_id, status);
create index usage_quotas_user_period_idx on usage_quotas(user_id, period);
create index chat_messages_user_created_idx on chat_messages(user_id, created_at desc);

alter table reminders enable row level security;
alter table notification_messages enable row level security;
alter table folders enable row level security;
alter table tags enable row level security;
alter table subscriptions enable row level security;
alter table character_pack_purchases enable row level security;
alter table usage_quotas enable row level security;
alter table chat_messages enable row level security;

create policy reminders_user_isolation on reminders
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy notification_messages_user_isolation on notification_messages
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy folders_user_isolation on folders
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy tags_user_isolation on tags
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy subscriptions_user_isolation on subscriptions
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy character_pack_purchases_user_isolation on character_pack_purchases
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy usage_quotas_user_isolation on usage_quotas
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy chat_messages_user_isolation on chat_messages
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
