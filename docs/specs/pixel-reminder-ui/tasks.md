# Tasks: Pixel Reminder UI

## 1. Pixel UI Copy and View-Model Foundation

- [x] Expand `apps/mobile/src/i18n/uiText.ts` with onboarding, common action, pixel persona, reminder row, history, Pro organization, Store add-on, and safety helper copy for Japanese and English. Covers REQ-004, REQ-008.
- [x] Add or update mobile view models for pixel reminder rows, persona chips, history rows, Pro benefit rows, and empty states. Covers REQ-001, REQ-002, REQ-005, REQ-006.
- [x] Add tests for i18n key parity, locale fallback, fictional persona safety copy, and model output for selected/locked/fallback/purchased states. Covers REQ-004, REQ-008, REQ-009.

## 2. Simple Login and Home Reminder List

- [x] Redesign onboarding/login as a simple brand-led screen with small pixel motif and no giant character. Covers REQ-003, UI-REQ-001.
- [x] Redesign Home as a reminder-list-first screen with compact filters, create action, pixel persona chips, state badges, and list-shaped loading/empty states. Covers REQ-001, REQ-002, UI-REQ-002, UI-REQ-003.
- [x] Preserve current onboarding, permission, sign-in simulation, filter, create, complete, snooze, edit, and free-limit behaviors. Covers REQ-007.
- [x] Add or update tests for onboarding default/permission states and Home with reminders, empty, loading, permission denied, and error states. Covers REQ-009.
- [x] Capture Expo iOS simulator screenshots for onboarding and Home. Covers REQ-011.

## 3. Reminder Form and Character Picker

- [x] Add pixel persona chip treatment to reminder creation/editing without making the form character-led. Covers UI-REQ-004.
- [x] Redesign character picker as notification tone selection with compact pixel archetype cards/chips. Covers REQ-005, UI-REQ-005.
- [x] Add original-fictional-persona helper copy to custom character creation. Covers REQ-004.
- [x] Preserve save, select, locked pack, owner-only, custom character, validation, safety, and free-limit behavior. Covers REQ-007.
- [x] Add tests for selected persona chip, available/selected/locked/owner-only states, custom persona safety helper, and validation errors. Covers REQ-009.

## 4. History and Chat Pixel Polish

- [x] Redesign History as compact notification archive rows/cards with pixel persona chips and status badges. Covers REQ-001, UI-REQ-006.
- [x] Preserve reuse, chat, delete, sent, fallback, empty, loading, and failed states. Covers REQ-007, REQ-009.
- [x] Refresh Chat with small pixel persona header and readable user/persona bubbles, without turning the app into a chat-first product. Covers REQ-002, REQ-007.
- [x] Add or update tests for history row states, empty/loading/error states, chat empty/messages/error/quota states. Covers REQ-009.

## 5. Pro, Store, and Settings Hierarchy

- [x] Redesign Pro screen so organization and usage benefits appear before character add-ons. Covers REQ-006, UI-REQ-007.
- [x] Refresh Store as an add-on surface compatible with the pixel system, while preserving purchase/restore/purchased/failure states. Covers UI-REQ-008.
- [x] Refresh Settings rows with calm pixel accents while preserving account, plan, notifications, data deletion, legal, privacy, logout, and destructive-state behavior. Covers UI-REQ-009.
- [x] Add or update tests for Pro benefit hierarchy, Store add-on states, purchase/restore failures, purchased states, and Settings rows. Covers REQ-006, REQ-009.

## 6. Visual QA and Release Gates

- [x] Run repository checks: `npm run format:check`, `npm run lint`, `npm run quality:check`, `npm test`, `npm run build`. Covers REQ-009, REQ-011.
- [x] Run Expo iOS export: `EXPO_NO_TELEMETRY=1 npx expo export --platform ios --output-dir /private/tmp/cueup-expo-export --clear`. Covers REQ-010.
- [x] Run Expo Go or simulator smoke QA for onboarding, Home, reminder form, character picker, History, Chat, Pro/Store, and Settings. Covers REQ-011.
- [x] Capture and review screenshots for initial and dense states, checking clipping, contrast, tap target spacing, and first-viewport reminder-list hierarchy. Covers UI-REQ-002, UI-REQ-003, UI-REQ-010.
- [x] Document deferred pixel fonts and avatar asset decisions. Covers open questions.
- [x] Document naming and Pro-limit deferrals against `design.md` and `release-qa.md`. Covers open questions.
