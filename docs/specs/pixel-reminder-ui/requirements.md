# Requirements: Pixel Reminder UI

## Overview

CueUp should feel like a practical reminder app first, with playful AI character nudges expressed through restrained pixel-art accents. The current mobile UI is functional but visually plain; the previous pop-star exploration overcorrected toward giant character hero cards and game-store spectacle. This spec establishes the selected direction: a reminder-list-first mobile UI where fictional famous-person-like archetypes appear as tiny pixel portraits, voice labels, and notification tone flavor.

The redesign must not imply real celebrity impersonation. "Famous-person-like" means translating the motivational reason a user might listen to a famous founder, respected creator, strict editor, trusted senior, old teacher, or close teammate into a broad fictional archetype. Pixel art softens the presentation, but it does not make real names, portraits, "本人風", sound-alike claims, catchphrases, or direct likeness acceptable.

The same rule applies to familiar-person-like custom characters. The product may support the feeling of a notification from someone the user knows through relationship, tone, and role, but not through recreating a real person's identity, photo, portrait, private details, or direct imitation.

## Goals

- Make reminders, folders, tags, history, and organization the primary product surface.
- Add a distinctive pixel-art visual identity without making the app feel like a full game UI.
- Use fictional persona flavor as a lightweight differentiator through tiny pixel portraits, chips, badges, and AI notification copy that explains why this persona would motivate action.
- Keep login/onboarding simple and avoid unnecessary character hero content.
- Position Pro subscription around reminder convenience: AI quota, active reminders, folders, tags, smart lists, history, sync, and chat.
- Keep ordinary system fonts for now; pixel fonts are explicitly deferred.
- Produce an implementation-ready spec that can be split into independently mergeable GitHub issues.

## Non-Goals

- Do not introduce pixel fonts in this pass.
- Do not add real celebrities, real-person likenesses, celebrity names, "本人風" claims, voice cloning, portrait generation, trademarked characters, lyrics, or direct quotations.
- Do not make character packs the main billing story.
- Do not add Expo Web support.
- Do not change backend billing, AI generation, push notification, authentication, or data ownership contracts unless required for UI state display.
- Do not implement new native modules or create an `ios/` project.

## Users

- Daily reminder user: wants fast access to today's reminders and completion/snooze actions.
- Character-curious user: wants reminders to feel more personal without losing productivity clarity.
- Aspirational reminder user: wants a cue that feels like it came from a respected or familiar motivating presence, without real-person impersonation.
- Pro candidate: wants to understand that paid value comes from managing more reminders, folders, tags, history, sync, and AI usage.
- Safety-conscious user: needs to understand that personas are fictional and not real celebrity impersonations.

## User Stories

- As a daily reminder user, I want my reminders to be listed clearly, so that I can manage my day without hunting through decorative UI.
- As a character-curious user, I want small pixel persona chips beside reminders, so that each reminder has personality without becoming a character gallery.
- As an aspirational reminder user, I want persona options that feel like motivating roles I would listen to, so that choosing a character changes my willingness to act.
- As a new user, I want login/onboarding to be simple, so that I can understand the product without a giant mascot or hero card.
- As a Pro candidate, I want the upgrade screen to explain organization and usage benefits, so that I understand why subscription is useful for a reminder app.
- As a safety-conscious user, I want the UI to call personas fictional, so that I do not mistake them for real celebrities.

## Functional Requirements

| ID      | Requirement                                                                                                                                                                                   | Priority | Source                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| REQ-001 | The mobile UI shall adopt a reminder-list-first hierarchy across Home, History, and management screens.                                                                                       | Must     | User input                      |
| REQ-002 | The mobile UI shall use pixel-art accents through small avatar chips, status badges, icons, dividers, and empty-state motifs.                                                                 | Must     | Product Design exploration      |
| REQ-003 | The mobile UI shall keep login/onboarding simple and shall not require a large character illustration or large notification hero card.                                                        | Must     | User input                      |
| REQ-004 | The mobile UI shall treat personas as fictional motivational archetypes and shall not imply real celebrity, public-figure, or acquaintance impersonation.                                     | Must     | Existing safety docs            |
| REQ-005 | The character picker shall frame character choice as notification tone selection, not as celebrity selection.                                                                                 | Must     | User input and safety docs      |
| REQ-006 | Pro and billing screens shall prioritize reminder organization, usage limits, history, sync, and productivity convenience over character pack merchandising.                                  | Must     | User-provided product direction |
| REQ-007 | The redesign shall preserve current route behavior for onboarding, Home, reminder form, character selection, custom character creation, history, chat, Store, Pro, and Settings.              | Must     | Repository context              |
| REQ-008 | The i18n registry shall include all new visible copy for Japanese and English, including safety helper text.                                                                                  | Must     | Existing i18n structure         |
| REQ-009 | The redesign shall include view-model or component tests for default, empty, loading, error, permission, locked, purchased, selected, and disabled states that are affected by the UI change. | Must     | Quality gates                   |
| REQ-010 | The redesign shall be implemented with Expo-compatible React Native primitives and existing dependencies.                                                                                     | Must     | Repository context              |
| REQ-011 | The redesign shall remain accessible with ordinary system fonts, Dynamic Type-compatible sizing, 44 pt tap targets, and non-color-only state indicators.                                      | Must     | Quality gates                   |

## Acceptance Criteria

### REQ-001

- When a signed-in user opens Home, the system shall show reminder rows as the primary content in the first viewport.
- When a user opens History, the system shall show past notification rows/cards as the primary content, with reuse and chat actions available per item where applicable.
- If the UI includes a next reminder or preview treatment, then it shall be compact and shall not dominate the screen above the reminder list.

### REQ-002

- The system shall show pixel-style persona chips or icons at small sizes on reminder, history, and character-selection surfaces.
- The system shall use pixel-style badges for states such as selected, locked, sent, fallback, purchased, and failed where visually appropriate.
- The system shall not require custom pixel fonts; ordinary text must remain readable.

### REQ-003

- When a user opens onboarding, the system shall show CueUp branding, a concise value proposition, primary login/start action, and secondary later/continue action without a giant character illustration.
- If the onboarding screen includes decoration, then it shall be limited to small pixel notification or avatar motifs.

### REQ-004

- The system shall use copy such as fictional persona, pixel persona, voice archetype, or localized equivalents.
- The UI shall not show real celebrity names, public-figure names, celebrity-like portrait claims, "本人風", real-person likeness claims, trademarked character names, lyrics, or direct quotes.
- Built-in, pack, demo, and seed characters shall explain a motivational relationship or aspirational role, not only a generic job class.
- Custom character helper copy shall warn users to create original fictional personas through relationship/tone abstraction instead of real-person identity recreation.

### REQ-005

- When selecting a character, each option shall show a small pixel portrait/chip, archetype label, tone/trait summary, availability, and action.
- Character names, descriptions, and prompts shall answer why receiving a notification from this kind of presence could help the user move now.
- If a pack character is locked, then the system shall show a locked or upgrade state without implying the locked character is a real celebrity.
- If a custom persona can be created, then the entry point shall make the original-fictional-persona rule visible.

### REQ-006

- Pro screens shall show benefits for active reminders, AI notification quota, folders, tags, smart lists, history, sync, chat, and advanced recurrence where current product scope supports the concept.
- Character packs may appear as add-ons, but shall not be the dominant element on the primary Pro subscription screen.
- Store/pack screens shall remain available for add-ons, but their presentation shall be secondary to the core subscription value.

### REQ-007

- Existing route transitions and actions shall continue to work after the redesign.
- Existing view-model tests shall be updated rather than bypassed.
- The implementation shall not remove current error, loading, permission-denied, free-limit, purchase-failed, restore-failed, or destructive-action states.

### REQ-008

- All new user-visible strings shall be available in Japanese and English through the mobile i18n registry.
- Unsupported locale fallback behavior shall continue returning Japanese copy.

### REQ-009

- Unit tests shall verify Home list-first models, onboarding simplicity, character picker state labels, Pro organization benefits, history list presentation, and i18n parity.
- Manual QA shall include Expo iOS simulator screenshots for onboarding, Home, character picker, History, and Pro/Store surfaces.

### REQ-010

- The implementation shall use React Native `View`, `Text`, `Pressable`, `ScrollView`, `StyleSheet`, and existing project patterns.
- The implementation shall not add native-only dependencies without a separate approved issue.

### REQ-011

- Tap targets for primary, secondary, row, and tab actions shall remain at least 44 pt where practical.
- Selected, locked, failed, fallback, purchased, destructive, and disabled states shall use text or icon/badge differences in addition to color.
- Text shall not clip or overlap at common mobile widths.

## UI Requirements

| ID         | UI Requirement                                                                                                                          | Priority | Source                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| UI-REQ-001 | Login/onboarding shall be simple, brand-led, and lightly pixel-accented.                                                                | Must     | User input                      |
| UI-REQ-002 | Home shall be a reminder list first, with compact filters and create action.                                                            | Must     | User input                      |
| UI-REQ-003 | Reminder rows shall include small pixel persona chips, time, title, note/detail, state badge, and primary row actions where applicable. | Must     | Product Design exploration      |
| UI-REQ-004 | Reminder creation shall preserve form clarity while showing selected fictional persona tone as small contextual flavor.                 | Must     | Existing flow                   |
| UI-REQ-005 | Character selection shall use small pixel archetype cards/chips and shall avoid large character art.                                    | Must     | User input                      |
| UI-REQ-006 | History shall present past notifications as compact archive rows/cards.                                                                 | Must     | Product Design exploration      |
| UI-REQ-007 | Pro subscription shall focus on organization and usage benefits.                                                                        | Must     | User-provided product direction |
| UI-REQ-008 | Character Pack Store shall be visually compatible with the pixel system but shall remain an add-on surface.                             | Should   | Product Design exploration      |
| UI-REQ-009 | Settings shall stay calm, readable, and aligned with the pixel-accent system.                                                           | Should   | Existing flow                   |
| UI-REQ-010 | Ordinary fonts shall be used until a future pixel-font issue is approved.                                                               | Must     | User input                      |

## UI States

| State                        | Expected Behavior                                                                                               | Priority |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| Onboarding default           | Shows CueUp brand, concise app value, primary login/start, secondary continue/later, and small pixel motif.     | Must     |
| Onboarding permission denied | Shows recovery copy without adding a large character or hero panel.                                             | Must     |
| Home with reminders          | Shows filters and reminder list as the main content; each reminder can show pixel persona chip and state badge. | Must     |
| Home empty                   | Shows a useful empty state with create action and small pixel motif.                                            | Must     |
| Home loading                 | Shows list-shaped skeletons, not a large hero skeleton.                                                         | Must     |
| Reminder form                | Shows title, note, time, selected persona tone, validation state, and save action clearly.                      | Must     |
| Character picker             | Shows selected, available, locked, owner-only, and custom persona entry states.                                 | Must     |
| Custom character form        | Shows original fictional persona safety helper and preview states.                                              | Must     |
| History default              | Shows compact sent/fallback notification archive rows with reuse/chat/delete actions.                           | Must     |
| History empty/loading/error  | Uses list-shaped empty, skeleton, and error states.                                                             | Must     |
| Chat default                 | Keeps chat readable; persona flavor appears through small chip/header and bubble style.                         | Should   |
| Pro default                  | Shows organization and usage benefits before add-ons.                                                           | Must     |
| Store default                | Shows character packs as add-ons with purchase/restore/purchased/failure states.                                | Should   |
| Settings default             | Shows existing account, plan, notifications, data deletion, legal, privacy, and logout rows.                    | Must     |

## Product Design Artifacts

Product Design exploration selected the "Pixel Reminder UI" direction.

- Simple login reference: `artifacts/simple-login.png`
- Home reminder-list reference: `artifacts/home-reminder-list.png`
- Character picker reference: `artifacts/character-picker.png`
- History list reference: `artifacts/history-list.png`
- Pro organization upsell reference: `artifacts/pro-organization-upsell.png`

These images are supporting visual references only. The normative behavior is defined by this requirements file, `design.md`, and `tasks.md`.

## Constraints

- App is an Expo React Native app without a native iOS project.
- Current supported app platforms are iOS and Android, not web.
- Existing safety docs reject real-person, celebrity, "本人風", portrait, trademark, lyric, and direct quote references.
- Pixel-art abstraction does not relax likeness, public-figure, privacy, consent, or impersonation constraints.
- Existing quality gates require accessibility, i18n, security, and representative state coverage.
- GitHub issue implementation must follow `AGENTS.md`.

## Assumptions

- The first implementation pass can use simple pixel-like square motifs and tiny abstract avatars drawn with React Native primitives or static text-free shapes.
- Existing built-in/demo personas are placeholders and should be revised in a future implementation issue if they do not clearly express the motivational-persona logic above.
- Pixel fonts are deferred and should not block this UI direction.
- Current route structure is adequate.
- Billing copy can be repositioned without changing entitlement logic.

## Open Questions

- [ ] Should the final app name remain CueUp, or is a TapIn-like rename still being considered separately?
- [ ] Should future character packs include generated pixel avatar assets, or should v1 use primitive/icon-like avatars only?
- [ ] Should Pro plan limits be adjusted to match the latest product thinking, or should this UI pass display the current backend/shared limits?
