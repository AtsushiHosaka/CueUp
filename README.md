# CueUp

CueUp is an iOS/Android reminder app where backend-generated AI notification copy speaks in the selected character's voice.

## Repository Layout

- `apps/mobile`: React Native/Expo mobile app
- `services/api`: Node.js API service for health checks and server-only integrations
- `packages/shared`: shared domain constants and types
- `docs`: architecture decisions, local development, and security notes

## Quick Start

Prerequisites:

- Node.js 22.x
- npm 10.x
- Xcode for iOS simulator checks

Install dependencies:

```sh
npm install
```

Run verification:

```sh
npm run format:check
npm run lint
npm test
npm run build
```

Run the API locally:

```sh
npm run build -w services/api
npm run start -w services/api
```

Run the mobile app locally:

```sh
npm run start -w apps/mobile
```

See [Local Development](docs/local-development.md), [Security and Secrets](docs/security-and-secrets.md), and [ADR 0001](docs/adr/0001-technology-stack.md) for the foundation decisions.
