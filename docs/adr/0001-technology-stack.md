# ADR 0001: Technology Stack

## Status

Accepted for the project foundation.

## Decision

CueUp will use React Native with Expo and TypeScript for the mobile app, and Node.js 22 with TypeScript for backend services.

The backend starts as a small dependency-light HTTP service in this foundation issue. Future feature issues can add a focused API framework or persistence layer when the data model and operational requirements need it, but server-only integration boundaries are established now.

## Rationale

- The product must ship on iOS and Android from one mobile codebase.
- React Native/Expo fits the available local toolchain: Node.js and Xcode are present, while Flutter is not installed in the current environment.
- TypeScript can be shared across app, API, tests, and CI without adding a second language runtime.
- Expo keeps the first native footprint small while still allowing iOS/Android native projects through prebuild/EAS when push, billing, and store requirements demand it.
- Backend-owned AI generation, push dispatch, and receipt validation keep sensitive credentials out of the client.

## Backend Baseline

- Runtime: Node.js 22
- Language: TypeScript
- API shape: HTTP JSON service with health/ready endpoints
- Shared domain package: `@cueup/shared`
- CI gates: format check, custom repository lint, TypeScript checks, tests, build

## External Integration Policy

- AI: provider interface on the backend; OpenAI and Gemini remain supported candidates until cost and latency are measured.
- Push: APNs and FCM credentials are backend-only.
- Billing: App Store and Google Play receipt validation happens on the backend.
- Auth: Apple and Google sign-in are first-class candidates; tokens are verified server-side before private data access.

## Consequences

- Mobile development can start with Expo Go and move to prebuild when native push/billing work begins.
- Backend code must treat AI, push, and billing credentials as server-only from the start.
- CI can run on Linux for the foundation; iOS-specific Xcode build checks are local until native iOS project files are generated.
