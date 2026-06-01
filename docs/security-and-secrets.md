# Security and Secrets

## Client Boundary

The mobile app must not contain AI API keys, APNs credentials, FCM service account JSON, App Store shared secrets, or Google Play service account credentials.

Allowed client environment variables must use the `EXPO_PUBLIC_` prefix and must be safe to expose in a compiled app. The foundation currently allows only:

- `EXPO_PUBLIC_API_BASE_URL`

## Server-Only Credentials

These values belong only in backend runtime secret storage:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `APNS_PRIVATE_KEY`
- `APNS_KEY_ID`
- `APNS_TEAM_ID`
- `FCM_SERVICE_ACCOUNT_JSON`
- `APP_STORE_SHARED_SECRET`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

## Enforcement

- `.env` files are ignored by git.
- Example environment files may document variable names but must not contain real values.
- `npm run lint` fails if server-only secret names appear under `apps/mobile`.
- AI generation, push dispatch, and billing verification are backend responsibilities.

## Data Access

All user-owned records must be scoped by authenticated user ID. Later data model work must add tests proving that users cannot read or mutate each other's reminders, characters, notification history, billing state, folders, or tags.
