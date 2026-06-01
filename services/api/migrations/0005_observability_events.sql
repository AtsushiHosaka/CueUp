create table audit_events (
  id uuid primary key,
  user_id uuid references users(id),
  event_type text not null,
  outcome text not null check (outcome in ('success', 'failure')),
  resource_type text,
  resource_id uuid,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create table analytics_events (
  id uuid primary key,
  user_id uuid not null references users(id),
  event_type text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create table operational_logs (
  id uuid primary key,
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  user_id uuid references users(id),
  event_type text not null,
  message text not null,
  failure_reason text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index audit_events_user_created_idx on audit_events(user_id, created_at desc);
create index analytics_events_user_created_idx on analytics_events(user_id, created_at desc);
create index operational_logs_event_created_idx on operational_logs(event_type, created_at desc);

alter table audit_events enable row level security;
alter table analytics_events enable row level security;
alter table operational_logs enable row level security;

create policy audit_events_service_only on audit_events
  using (false)
  with check (false);

create policy analytics_events_service_only on analytics_events
  using (false)
  with check (false);

create policy operational_logs_service_only on operational_logs
  using (false)
  with check (false);
