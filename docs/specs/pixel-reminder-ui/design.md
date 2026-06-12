# Design: Pixel Reminder UI

## Overview

The selected direction is a practical mobile reminder app with restrained pixel-art accents. CueUp should not become a game shop or character gallery. The app's primary surface is a clear reminder list; fictional personas provide small flavor through pixel avatar chips, tone labels, badges, and notification copy.

The design uses ordinary system fonts for now. Pixel identity comes from shape language, small icons, badges, borders, and simple decorative motifs. A future issue may introduce pixel fonts after readability and licensing are decided.

## Requirements Traceability

| Requirement | Design Coverage                                                         |
| ----------- | ----------------------------------------------------------------------- |
| REQ-001     | Home and History are list-first; previews are compact.                  |
| REQ-002     | Pixel accents are implemented through chips, badges, icons, and motifs. |
| REQ-003     | Onboarding is simple and avoids giant character art.                    |
| REQ-004     | Copy and sample data frame personas as fictional archetypes only.       |
| REQ-005     | Character picker is tone selection with small pixel persona cards.      |
| REQ-006     | Pro hierarchy emphasizes organization, usage, sync, and history.        |
| REQ-007     | Existing routes/actions remain intact.                                  |
| REQ-008     | New copy is routed through the i18n registry.                           |
| REQ-009     | Tests cover affected view models and states.                            |
| REQ-010     | Implementation uses Expo-compatible React Native primitives.            |
| REQ-011     | Accessibility and viewport fit constraints shape components.            |

## Product Design Direction

### Visual Artifacts

- `artifacts/simple-login.png`: simple brand-led login with small pixel motif.
- `artifacts/home-reminder-list.png`: reminders as the primary screen, with small pixel avatar chips and badges.
- `artifacts/character-picker.png`: fictional archetype picker as notification tone selection.
- `artifacts/history-list.png`: compact archive of past AI notifications.
- `artifacts/pro-organization-upsell.png`: Pro as organization and usage power, not character-pack-first monetization.

### Selected Direction Rationale

This direction directly addresses the critique of the previous designs:

- It removes the unnecessary giant top card from Home.
- It keeps login simple and avoids adding a character where it does not help.
- It returns the product hierarchy to reminders and organization.
- It preserves the delight of AI persona notifications through small pixel flavor.
- It keeps famous-person-like appeal safe by using fictional archetypes instead of real celebrity references.

### Rejected Alternatives

| Direction                                        | Reason Rejected                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Pop-star giant hero card                         | Too pop, too character-heavy, and weakens the reminder-list hierarchy.                        |
| Backstage-pass store as the main visual language | Makes character packs feel like the core product, conflicting with the subscription strategy. |
| Full game UI                                     | Increases implementation complexity and can harm daily productivity usability.                |
| Real celebrity-like portraits                    | Conflicts with safety, likeness, and impersonation constraints.                               |

## Architecture / Structure

The first implementation should remain client-side:

- `apps/mobile/src/domain/mainFlow.ts`
  - Add view-model fields for pixel persona chips, list-first Home states, character picker tone labels, and onboarding safety/helper copy.
- `apps/mobile/src/domain/secondaryFlow.ts`
  - Add view-model fields for history list presentation, Pro organization benefits, Store add-on framing, and settings row presentation.
- `apps/mobile/src/i18n/uiText.ts`
  - Add copy groups for onboarding, common actions, reminder rows, pixel persona framing, Pro organization benefits, Store add-ons, History, and safety helper copy.
- `apps/mobile/src/App.tsx`
  - Add reusable visual components and replace plain cards with the pixel-accent list system.
- `apps/mobile/test/*.test.ts`
  - Update view-model tests and i18n tests.

No backend schema, API, billing verifier, or push notification changes are required.

## Screen Structure

| Screen / Region  | Purpose                               | Primary Actions                                            | States                                                           |
| ---------------- | ------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Onboarding       | Introduce CueUp simply.               | Login/start, continue/later, notification permission path. | Default, permission denied.                                      |
| Home             | Manage reminders.                     | Create, filter, complete, snooze, edit/open row.           | With reminders, empty, loading, error, permission denied.        |
| Reminder form    | Create or edit a reminder.            | Save, select persona, cancel.                              | Create, edit, validation error, saving, free-limit.              |
| Character picker | Select notification tone/persona.     | Select, create custom, unlock pack.                        | Selected, available, locked, owner-only.                         |
| Custom character | Create an original fictional persona. | Generate preview, save.                                    | Empty, invalid, preview loading, preview ready, safety rejected. |
| History          | Browse past generated notifications.  | Reuse, chat, delete.                                       | Default, empty, loading, failed.                                 |
| Chat             | Chat with selected fictional persona. | Send, convert to Cue.                                      | Empty, messages, loading, failed, quota exhausted.               |
| Pro              | Explain subscription value.           | Purchase, restore.                                         | Default, loading, purchased, purchase failed, restore failed.    |
| Store            | Browse add-on character packs.        | Purchase pack, restore, view availability.                 | Default, loading, purchased, failed.                             |
| Settings         | Account/legal/settings management.    | Open rows.                                                 | Default, selected detail, destructive row.                       |

## Component Model

### `PixelShell`

Shared screen wrapper.

- Off-white or pale neutral background.
- Deep teal foreground.
- Small pixel motifs in corners or section headers.
- No large decorative character hero.
- Preserves safe-area and scroll behavior.

### `PixelReminderRow`

Main Home list item.

- Time and status.
- Reminder title and optional note/detail.
- Small pixel persona chip.
- Folder/tag chips where available.
- State badge such as active, snoozed, done, next, failed.
- Compact row actions.

### `PixelPersonaChip`

Reusable small persona indicator.

- Abstract pixel avatar or initials-style shape.
- Persona/archetype label such as Coach, Mentor, Friend, Boss, Creator, Calm Guide.
- Optional selected/locked state.
- Must not use real-person names or likenesses.

### `PixelBadge`

Reusable state label.

- Selected, locked, sent, fallback, purchased, failed, destructive, restore, Pro.
- Includes text or icon-like shape so state is not color-only.

### `PixelCard`

Reusable compact surface.

- Used for reminders, history rows, Pro benefits, Store add-ons, settings rows.
- Should be tighter than current large cards.
- Can use stepped/square-corner accents while retaining readable radius and spacing.

### `PixelActionButton`

Reusable action button.

- Primary, secondary, compact, destructive, disabled variants.
- Minimum 44 pt tap target.
- Text remains ordinary font.

## Copy and Persona Rules

Allowed copy patterns:

- "fictional persona"
- "pixel persona"
- "voice archetype"
- "Coach style"
- "Mentor tone"
- "Creator energy"
- "Boss nudge"

Disallowed copy patterns:

- Real celebrity names.
- Public figure names.
- "本人風" or "sounds like [real person]".
- "celebrity voice" as a literal product claim.
- Trademarked character/brand names.
- Lyrics or direct quote promises.

## Interaction Model

- Onboarding:
  - Primary action continues current sign-in simulation path.
  - Secondary/later path remains available.
  - No giant persona visual is introduced.
- Home:
  - Reminder filters remain compact.
  - Create action remains visible without covering essential list content.
  - Reminder rows remain scannable in the first viewport.
- Reminder form:
  - Selected persona is visible as a small chip near the character selector.
  - Validation errors remain near the relevant form/action area.
- Character picker:
  - Selecting a persona updates existing selected character behavior.
  - Locked pack states route to existing Pro/Store behavior where applicable.
  - Custom character entry displays original-fictional-persona guidance.
- History:
  - Reuse, chat, and delete actions remain available and distinguishable.
- Pro:
  - Organization and usage benefits appear before character pack add-ons.
- Store:
  - Packs remain add-ons and do not overtake Pro subscription messaging.

## State Model

Implementation should derive display models before JSX where practical:

- `PixelReminderRowModel`
  - id, title, detail, scheduledLabel, personaLabel, personaPixelKey, stateLabel, folderLabel, tagLabels, actions.
- `PixelPersonaModel`
  - id, name, archetypeLabel, traitLabel, availability, selected, safetyLabel, actionLabel.
- `PixelHistoryRowModel`
  - id, title/body, detail, personaLabel, statusLabel, canReuse, canChat, canDelete.
- `PixelProBenefitModel`
  - label, freeValue, proValue, iconKey, priority.
- `PixelEmptyStateModel`
  - title, body, actionLabel, motifKey.

Exact type names may differ if behavior and tests are equivalent.

## Visual Rules

- Use ordinary system fonts.
- Use pixel accents sparingly: small square motifs, stepped borders, tiny avatars, badges.
- Avoid giant illustrated characters.
- Avoid full-screen dark game-shop surfaces as the default Home style.
- Keep Home and History list density practical.
- Use a calm base palette with limited cyan, magenta, and yellow accents.
- Do not make the palette one-note.
- Do not use visible text that explains the design system itself.

## Accessibility and Platform Constraints

- Minimum tap targets: 44 pt where practical.
- No negative letter spacing.
- Text must not clip under common mobile widths or larger text settings.
- State differences cannot rely only on color.
- Destructive actions must include text and distinct visual treatment.
- Expo iOS simulator smoke QA is required.
- Playwright browser QA is not required unless future web support is added.

## Testing Strategy

- Unit/view-model tests:
  - Onboarding simple default and permission-denied states.
  - Home list-first with reminders, empty, loading, permission denied, and error states.
  - Reminder form selected persona chip and validation states.
  - Character picker selected, available, locked pack, owner-only, and custom persona safety copy.
  - History default, empty, loading, failed, sent, fallback states.
  - Pro organization benefit hierarchy and Store add-on states.
  - i18n key parity for all new copy groups.
- Manual / simulator checks:
  - `npm run format:check`
  - `npm run lint`
  - `npm run quality:check`
  - `npm test`
  - `npm run build`
  - `EXPO_NO_TELEMETRY=1 npx expo export --platform ios --output-dir /private/tmp/cueup-expo-export --clear`
  - Expo Go or simulator smoke screenshots for onboarding, Home, character picker, History, Pro/Store.

## Implementation Sequencing

1. Copy and view-model foundation.
2. Onboarding and Home list-first UI.
3. Reminder form and character picker.
4. History and chat polish.
5. Pro, Store, and Settings hierarchy.
6. Visual QA and release gate cleanup.

## Risks

- Pixel accents could become noisy. Mitigation: keep reminders list-first and accents small.
- Famous-person-like archetypes could drift into impersonation. Mitigation: safety copy and sample data tests.
- Large `App.tsx` edits could be risky. Mitigation: implement issue by issue, with view-model tests before styling expansion.
- Generated visual references may include details not allowed by safety rules. Mitigation: text spec is normative; images are inspiration only.

## Open Questions

- Release gate decision, 2026-06-12: v1 keeps ordinary system fonts. Pixel fonts remain deferred until a future typography issue resolves readability, licensing, and Expo packaging.
- Release gate decision, 2026-06-12: v1 keeps primitive React Native pixel avatars and motifs. Generated, bundled, or marketplace-style pixel avatar assets remain deferred to a future asset pipeline issue.
- Release gate decision, 2026-06-12: v1 keeps the CueUp brand name and current shared Pro/free limits. Naming and limit changes remain separate product decisions.
- Should the final brand name remain CueUp or change to a TapIn-like name later?
- Should future pixel avatars be generated assets, primitive shapes, or a bundled icon set?
- Should Pro limits be revised in shared constants to match the attached product memo, or should the UI continue displaying current backend limits?
