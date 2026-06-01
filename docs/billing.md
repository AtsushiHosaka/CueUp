# Billing and Entitlements

Billing state is backend-owned. Clients submit store receipts or purchase tokens to
`POST /v1/billing/verify`, but Pro and Character Pack access is granted only after
the configured server-side verifier accepts the transaction.

## Product Catalog

`GET /v1/billing/products` returns the configured Pro and Character Pack products.
Product IDs and display prices are placeholders by default and can be replaced with
`BILLING_PRODUCTS_JSON` without code changes.

## Purchase Verification

`POST /v1/billing/verify` accepts:

```json
{
  "platform": "app_store",
  "productId": "cueup.pro.monthly",
  "receipt": "store-receipt-or-token"
}
```

The API rejects unknown products and unverified receipts with
`billing_verification_failed`. The response includes `details.restoreAction` so the
mobile app can show a restore path.

Raw receipts should not be stored in application tables. Store only the normalized
subscription or pack purchase state needed for entitlement checks.

## Entitlements

`GET /v1/billing/entitlements` returns the current server-side entitlement snapshot:

- active or canceled-but-unexpired Pro subscriptions unlock Pro limits
- expired or refunded subscriptions fall back to Free limits
- active Character Pack purchases unlock their `packId`
- refunded Character Pack purchases are removed from active pack IDs
- monthly AI notification and chat counts come from `UsageQuota`

Feature services should use the entitlement snapshot instead of trusting client plan
claims.

## Usage Quota

`POST /v1/billing/usage` with `{"kind":"ai_notification"}` or
`{"kind":"chat_message"}` increments the monthly quota when still under the current
plan limit. Free limit failures return `plan_limit_exceeded` with
`upgradeTarget: "pro"`.
