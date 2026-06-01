# Local Development

## Prerequisites

- Node.js 22.x
- npm 10.x
- Xcode for iOS simulator checks

Confirm the local toolchain:

```sh
node --version
npm --version
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -version
```

## Install

```sh
npm install
```

## Verify

```sh
npm run format:check
npm run lint
npm test
npm run build
```

## API

Create a local backend environment file from the example:

```sh
cp services/api/.env.example services/api/.env
```

Build and start the API:

```sh
npm run build -w services/api
npm run start -w services/api
```

The service listens on `PORT` or `3000` by default.

Endpoints:

- `GET /health`
- `GET /ready`
- `GET /v1/bootstrap`

## Mobile

Create a local mobile environment file from the example:

```sh
cp apps/mobile/.env.example apps/mobile/.env
```

Start Expo:

```sh
npm run start -w apps/mobile
```

The mobile app reads only public Expo environment variables such as `EXPO_PUBLIC_API_BASE_URL`.
