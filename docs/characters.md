# Character Catalog and Selection

Character catalog logic lives in `services/api/src/characters`.

## Catalog

The initial seed includes built-in characters and one pack character:

- Strict Boss
- Gentle Friend
- Momentum Coach
- Focus Sage in `pack-deep-work`

Custom characters are listed only for their owner.

## Availability

Catalog items return one of:

- `available`
- `pack_required`
- `owner_only`

Pack characters include `purchaseTargetPackId` when a Character Pack purchase is needed.

## Selection Rules

`assertCanSelectCharacter` enforces:

- character exists
- custom characters are owner-only
- pack characters require active pack entitlement
- Free active character limit uses unique `characterId` values from active reminders
- selecting a fourth unique active character returns `CHARACTER_SELECTION_LIMIT_EXCEEDED` with `upgradeTarget: "pro"`

The service accepts `currentReminderId` so editing an existing reminder does not over-count the reminder's current character.
