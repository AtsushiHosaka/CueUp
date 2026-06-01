# Push Notifications

Push notification delivery is backend-owned. APNs and FCM credentials stay in server secret storage and are never exposed to the mobile app.

## Device Tokens

`device_tokens` links iOS APNs and Android FCM tokens to users.

Token states:

- `active`
- `disabled`
- `invalid`

Invalid tokens are removed from future send attempts by changing status to `invalid`.

## Delivery Records

Each send attempt creates a `push_deliveries` row with:

- `sent`
- `failed`
- `permission_denied`

Transient failures may include `retry_after` so a job runner can retry later. Permission-denied state is kept as delivery state for in-app notification-permission guidance.

## AI Fallback Compatibility

Push sending accepts any saved `NotificationMessage`, including `generationStatus: "fallback"`, so AI provider failures do not block notifications.

## Provider Boundary

`PushProvider` abstracts APNs/FCM. Concrete adapters should map provider responses into `sent`, `permission_denied`, `invalid_token`, or retryable `failed` results.
