# Data Model and Access Control

## Schema Source

The initial PostgreSQL schema lives in `services/api/migrations/0001_initial_schema.sql`.

It covers the spec entities:

- User
- Reminder
- Character
- NotificationMessage
- Folder
- Tag
- ReminderTag
- Subscription
- CharacterPackPurchase
- UsageQuota
- ChatMessage

Shared TypeScript model contracts live under `packages/shared/src/models.ts`.

## Ownership Boundary

User-owned tables include `user_id` and have row-level security enabled in the migration. Authenticated API requests must set `app.current_user_id` before querying user data.

The API layer also uses `services/api/src/data/accessControl.ts` for request-level checks:

- owners can read/update/delete their own records
- other users receive an access-denied error
- soft-deleted records are hidden as not found
- admin access is explicit through `role: "admin"`

## Logical Deletion

`users.deleted_at` and `reminders.deleted_at` represent logical deletion. Reminder deletion also moves `status` to `deleted` in API-layer helpers.

Later account deletion work must either delete or anonymize dependent records according to the privacy policy.

## Entitlements and Usage

Plan, subscription, pack purchase, and quota models are available through `packages/shared/src/entitlements.ts`.

The entitlement snapshot combines:

- user plan
- active subscription state
- active Character Pack purchases
- monthly usage quota
- plan limits

Feature-specific issues should use this snapshot instead of trusting client-reported plan state.

## Logging

Reminder titles, notes, notification bodies, chat bodies, prompts, email addresses, and token usage are treated as sensitive. Use `redactForLog` before writing operational logs that include user-owned records.
