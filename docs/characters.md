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

## Custom Character Creation

`CustomCharacterService` accepts the custom character fields used by the mobile creation flow:

- name
- relationship
- tone
- strictness and warmth from 0 to 10
- catchphrases
- prohibited style
- HTTPS icon URL

The service builds and stores `personaPrompt` for preview generation and later AI notification/chat prompts. Prompts explicitly describe the original fictional persona and include a guardrail to avoid real people, portraits, trademarks, and direct quotations.

Free users can create one custom character. Higher plan limits come from `EntitlementSnapshot.limits.customCharacters`.

Custom characters are always saved with `ownerUserId`, listed only for their owner, and editable only by their owner. Other users receive `CHARACTER_ACCESS_DENIED`.

## Safety and Icon Handling

Custom character input goes through a deterministic review gate before saving:

- inappropriate or abusive settings are rejected
- real-person, celebrity, and "本人風" references are rejected
- photo, portrait, and likeness requests are rejected
- trademark and brand-style references are rejected
- direct quote and lyric requests are rejected

These failures return `CHARACTER_SAFETY_REVIEW_REQUIRED` with a machine-readable reason. Icon URL validation is handled through the `CharacterIconValidator` boundary; upload or asset lookup failures return `CHARACTER_ICON_UNAVAILABLE`.
