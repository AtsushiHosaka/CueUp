# Environment Variables

## Mobile

| Name                       | Required | Description                                                               |
| -------------------------- | -------: | ------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` |       No | Public API base URL used by the app. Defaults to `http://localhost:3000`. |

## API

| Name                               |           Required | Description                                                |
| ---------------------------------- | -----------------: | ---------------------------------------------------------- |
| `PORT`                             |                 No | Local API port. Defaults to `3000`.                        |
| `NODE_ENV`                         |                 No | `development`, `test`, or `production`.                    |
| `AI_PROVIDER`                      |                 No | `openai`, `gemini`, or `disabled`. Defaults to `disabled`. |
| `OPENAI_API_KEY`                   | Provider-dependent | Server-only OpenAI key.                                    |
| `GEMINI_API_KEY`                   | Provider-dependent | Server-only Gemini key.                                    |
| `APNS_PRIVATE_KEY`                 |    Production push | Server-only APNs private key.                              |
| `APNS_KEY_ID`                      |    Production push | Server-only APNs key ID.                                   |
| `APNS_TEAM_ID`                     |    Production push | Server-only Apple team ID.                                 |
| `FCM_SERVICE_ACCOUNT_JSON`         |    Production push | Server-only Firebase service account JSON.                 |
| `APP_STORE_SHARED_SECRET`          | Production billing | Server-only App Store receipt verification secret.         |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Production billing | Server-only Google Play service account JSON.              |
| `BILLING_VERIFICATION_ENABLED`     |                 No | Set `true` only when server receipt verification is wired. |
| `BILLING_PRODUCTS_JSON`            |                 No | JSON array of Pro and Character Pack product IDs/prices.   |

`BILLING_PRODUCTS_JSON` entries use this shape:

```json
[
  {
    "id": "pro-ios",
    "displayName": "CueUp Pro",
    "kind": "pro_subscription",
    "platform": "app_store",
    "priceLabel": "$4.99/mo",
    "productId": "com.example.cueup.pro.monthly"
  },
  {
    "id": "focus-pack-ios",
    "displayName": "Focus Pack",
    "kind": "character_pack",
    "packId": "focus-pack",
    "platform": "app_store",
    "priceLabel": "$1.99",
    "productId": "com.example.cueup.pack.focus"
  }
]
```
