# Pixel Reminder UI QA Report

Date: 2026-06-12
Issue: #46

## Visual QA

- Source references:
  - `docs/specs/pixel-reminder-ui/artifacts/simple-login.png`
  - `docs/specs/pixel-reminder-ui/artifacts/home-reminder-list.png`
  - `docs/specs/pixel-reminder-ui/artifacts/character-picker.png`
- Simulator screenshots:
  - `/private/tmp/cueup-46-01-onboarding.png`
  - `/private/tmp/cueup-46-02-home-empty.png`
  - `/private/tmp/cueup-46-03-home-dense.png`
  - `/private/tmp/cueup-46-04-reminder-form.png`
  - `/private/tmp/cueup-46-05-character-picker.png`
  - `/private/tmp/cueup-46-06-character-create.png`
  - `/private/tmp/cueup-46-07-history.png`
  - `/private/tmp/cueup-46-08-chat.png`
  - `/private/tmp/cueup-46-09-store.png`
  - `/private/tmp/cueup-46-10-settings.png`
  - `/private/tmp/cueup-46-11-pro.png`
  - `/private/tmp/cueup-46-visual-pass-3.png`
  - `/private/tmp/cueup-46-home-sample-final-candidate.png`
  - `/private/tmp/cueup-46-character-picker-candidate.png`
  - `/private/tmp/cueup-46-form-candidate.png`
- Result: Passed for this issue. The UI now uses a reminder-list-first pixel shell with off-white paper, deep teal frames, hard shadows, pixel persona chips, dense reminder rows, and a dark bottom navigation bar.

## Tooling Notes

- XcodeBuildMCP `session_show_defaults` worked and showed `iPhone 17 Pro` simulator `2A7B3079-33A6-4735-8C7E-79A360ECA175`.
- XcodeBuildMCP `list_sims`, `snapshot_ui`, and `screenshot` were blocked because `xcode-select -p` points to `/Library/Developer/CommandLineTools`; idb requires full Xcode selection.
- Fallback used `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl` plus Expo Go.
- Expo Go smoke ran at `exp://127.0.0.1:8081`.
- Expo iOS export succeeded at `/private/tmp/cueup-expo-export-46-final`.
- After merging `origin/main`, Expo iOS export also succeeded at `/private/tmp/cueup-expo-export-46-final-merged`.

## Command Results

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run quality:check`: passed.
- `npm test`: passed.
- `npm run build`: passed.
- `EXPO_NO_TELEMETRY=1 npx expo export --platform ios --output-dir /private/tmp/cueup-expo-export-46-final --clear`: passed.
- `EXPO_NO_TELEMETRY=1 npx expo export --platform ios --output-dir /private/tmp/cueup-expo-export-46-final-merged --clear`: passed after merging `origin/main`.

## Deferred Decisions

- Pixel font selection remains deferred by product direction.
- Richer generated avatar image assets remain deferred; current avatars are original abstract pixel portraits and avoid real celebrity likeness.
