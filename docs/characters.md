# Character Catalog and Selection

Character catalog logic lives in `services/api/src/characters`.

## Product Intent

Character personas exist to make a reminder feel like it came from a motivating presence:
someone the user would listen to, respect, feel accountable to, or feel personally encouraged by.
The original product idea can be summarized as "a cue from a famous-person-like or familiar-person-like
presence," but the implementation must translate that feeling into safe fictional archetypes.

Pixel art is an abstraction layer for mood, role, and distance. It is not a loophole for using a
real person's name, portrait, catchphrases, public identity, or "sound-alike" promise. Built-in and
pack characters should therefore read as fictional motivational roles, for example a visionary
founder type, trusted senior type, deadline editor type, study captain type, or calm mentor type.
Each seed or mock character should answer: "Why would receiving a notification from this kind of
person make the user move now?"

Custom characters may support a familiar-person-like feeling through relationship, tone, and role,
but they must not recreate a real person's identity or likeness. Treat consent, privacy, and
abstraction as product requirements: prefer "strict older-sibling energy" or "supportive teammate"
over names, photos, portraits, or direct imitation.

## Catalog

The initial seed includes built-in characters and one pack character:

- Strict Boss
- Gentle Friend
- Momentum Coach
- Focus Sage in `pack-deep-work`

Custom characters are listed only for their owner.

## Visual Tone

All built-in and pack character icons must use abstract pixel-art avatars. They should feel
like compact game UI portraits, not photos, painted portraits, generated headshots, or direct
likenesses of real people.

Design requirements:

- use a small fixed pixel grid with crisp edges and no blur
- make the avatar and copy communicate a motivating relationship or aspirational role
- keep silhouettes symbolic and archetypal, even when the persona is inspired by a familiar role
- avoid celebrity names, real-person likeness, trademarked outfits, and direct portrait references
- give each persona a distinct palette, outline, and accent color
- render local app icons from deterministic pixel data where possible instead of remote AI images

If a future native iOS renderer needs extra polish, Swift Package Manager dependencies are allowed,
but the default mobile implementation should keep the pixel avatar system local, deterministic, and
portable across iOS and Android.

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
