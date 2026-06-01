# Reminder CRUD

Reminder CRUD lives in `services/api/src/reminders`.

## Covered Operations

- create reminder
- list owned reminders
- get reminder detail
- update reminder fields
- logical delete
- complete reminder
- create the next reminder when a recurrence rule exists

## Access Control

All operations call the API-layer ownership helpers from `services/api/src/data/accessControl.ts`.

Non-owner access returns a `REMINDER_ACCESS_DENIED` service error. Soft-deleted reminders are hidden as `REMINDER_NOT_FOUND`.

## Validation

The service validates:

- non-empty title
- non-empty character ID
- valid future `scheduledAt`
- supported recurrence frequency
- recurrence interval between 1 and 365

## Free Limit

Creation checks the caller's entitlement snapshot. When the active reminder count reaches the plan limit, the service returns `REMINDER_FREE_LIMIT_EXCEEDED` with `upgradeTarget: "pro"` in the error details.

## Recurrence

Completion stores `completedAt` on the current reminder. If a recurrence rule exists, a new active reminder is created with the next `scheduledAt`.
