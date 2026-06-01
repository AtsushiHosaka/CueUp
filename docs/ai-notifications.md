# AI Notification Generation

AI notification generation runs on the backend only.

## Flow

1. Build a prompt from reminder content, character persona, usage category, user locale/timezone, strictness, warmth, catchphrases, and prohibited style.
2. Call an `AiTextProvider` implementation.
3. Retry provider failures.
4. Run generated text through the safety filter.
5. Save a `NotificationMessage` with `success` or `fallback`.
6. Increment `UsageQuota.aiNotificationCount` only when provider generation succeeds and passes safety.

## Fallback

If the AI provider fails or returns unsafe content, CueUp saves and returns a deterministic fallback message. Fallback messages are not counted against the monthly AI notification quota.

## Safety

The initial safety filter blocks empty text and known unsafe categories such as self-harm, sexual content, hate speech, and violent instruction markers. Provider-level safety controls should be added by concrete OpenAI/Gemini adapters.

## Credentials

AI provider keys are read only by backend runtime adapters. The mobile app must never contain `OPENAI_API_KEY`, `GEMINI_API_KEY`, or equivalent provider secrets.
