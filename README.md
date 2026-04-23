# Alignment Draft MVP

React Native first, published to web through Expo's web export path.

## What is implemented

- Expo + React Native scaffold with web output enabled
- One playable alignment puzzle screen
- Prompt field with sample prompts
- Local demo board generator that stands in for live AI generation
- Palette selection, board placement, reveal, and scoring
- Responsive layout for mobile and desktop web

## What is intentionally stubbed

- Live AI roster generation
- Portrait fetching or image generation
- Server-side hidden answer keys
- Persistent saves, auth, leaderboards, and share cards

## Run locally

1. Install dependencies:

```bash
npm install
```

If Expo reports a web dependency mismatch, align the web packages with:

```bash
npx expo install react-dom react-native-web @expo/metro-runtime
```

2. Start the Expo dev server:

```bash
npm run web
```

3. Export a static web build:

```bash
npm run export:web
```

The exported site lands in `dist/`.

## Suggested next implementation steps

1. Replace `buildDemoBoard` with a server-backed generation endpoint.
2. Move the hidden answer key off the client.
3. Add portrait fetching, caching, and attribution metadata.
4. Upgrade placement from tap-to-place to drag-and-drop for web and touch drag for native.
