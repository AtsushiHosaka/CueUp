# Authentication and Account Management

## Providers

CueUp supports Apple, Google, and optional email identities through a backend token verifier interface. Mobile clients send provider tokens to the API; the API verifies the token before creating a session.

Provider credentials and verification secrets are server-only.

## User Initialization

New users are created with:

- provider
- provider account ID
- email and display name when provided
- locale
- timezone
- `free` plan
- created/updated timestamps

The auth identity migration adds `provider_account_id` and active email uniqueness to `users`.

## Protected Access

API handlers must call `AuthService.requireActor(sessionId, now)` before accessing user-owned data. This returns the `Actor` used by access-control helpers and Reminder CRUD.

Unauthenticated, revoked, expired, or deleted sessions fail before data access.

## Logout

Logout revokes the session. The mobile auth reducer moves back to `signedOut`, and `canAccessProtectedScreens` returns `false`.

## Account Deletion

Account deletion currently anonymizes the user record by clearing email and display name, then setting `deletedAt`. Future data retention work can extend this to dependent reminders, history, logs, and billing records.

## Error Handling

API auth errors use stable codes:

- `AUTH_REQUIRED`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_ACCOUNT_DUPLICATE`
- `AUTH_ACCOUNT_DELETED`

The mobile auth state maps these failures into UI-safe states for settings and protected navigation.
