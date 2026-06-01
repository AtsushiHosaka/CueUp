-- Snooze support and notification job scheduling.

alter table reminders
  add column snoozed_until timestamptz,
  add column snooze_count integer not null default 0 check (snooze_count >= 0);

create table notification_jobs (
  id uuid primary key,
  user_id uuid not null references users(id),
  reminder_id uuid not null references reminders(id),
  type text not null check (type in ('reminder', 'snooze')),
  scheduled_for timestamptz not null,
  status text not null check (status in ('scheduled', 'retry_scheduled', 'sent', 'failed', 'canceled')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index notification_jobs_user_scheduled_idx
  on notification_jobs(user_id, scheduled_for)
  where status in ('scheduled', 'retry_scheduled');

create unique index notification_jobs_reminder_active_idx
  on notification_jobs(reminder_id)
  where status in ('scheduled', 'retry_scheduled');

alter table notification_jobs enable row level security;

create policy notification_jobs_user_isolation on notification_jobs
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
