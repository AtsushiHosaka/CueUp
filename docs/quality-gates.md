# Quality Gates

This document tracks the non-functional checks that must stay visible in CI and release review.

## Performance

- Primary mobile screens should render their initial state within 2 seconds on a current iOS simulator.
- Notification generation and snooze jobs must preserve scheduled timestamps and expose retry/failure state.
- Provider latency and job delay events are recorded through observability events so slow paths can be trended.

## Security

- API handlers must resolve an authenticated actor before accessing user-owned data.
- User-scoped repositories and services need tests proving other users cannot read or mutate private records.
- AI prompts must send only the reminder, character, and short history context needed for generation.
- Server-only credentials remain outside `apps/mobile`; `npm run lint` enforces this boundary.
- HTTPS is required for production API traffic and external custom character icon URLs.

## Failure Coverage

- AI provider failures fall back or surface `ai_unavailable` without storing unsafe output.
- Push provider failures cover sent, permission denied, invalid token, and retryable failure states.
- Billing and Character Pack UI must show purchase failure, restore failure, and purchased/available states.
- Free plan limits route users to Pro guidance with a clear action.

## Accessibility

- Mobile screens use Dynamic Type-compatible text, high-contrast foreground/background pairs, and minimum 44 pt tap targets.
- VoiceOver and TalkBack labels must identify navigation tabs, destructive actions, form fields, and purchase/restore actions.
- Empty, loading, saving, and error states must be represented by text, not color alone.
- Copy must avoid negative letter spacing and must fit under larger text settings.

## Legal And Store Review

- Settings must expose Terms, Privacy Policy, notification settings, plan management, logout, and data deletion destinations.
- Price, legal text, and review-sensitive claims are fixture-backed until final legal and store-review copy is approved.
- Character creation and AI output must avoid real-person likeness, trademark imitation, direct quotations, and unsafe content.

## Test Plan

- Unit tests cover user isolation for reminders, custom characters, organizer data, notification history, and chat.
- Unit tests cover representative AI, push, chat, billing/pack, auth, and persistence failure cases.
- Mobile view-model tests cover onboarding, empty states, loading states, Pro routing, purchase/restore failures, AI response failures, and settings destinations.
- `npm run quality:check` verifies that the required documentation, tests, and i18n structure remain present.
