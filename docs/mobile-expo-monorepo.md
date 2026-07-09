# Native Expo Monorepo Loop

## Structure

- `apps/web`: existing Next.js app and API routes.
- `apps/mobile`: native Expo app. It does not use WebView.
- `packages/shared`: common types, Bible API client, book metadata, search normalization/highlighting, reading-plan helpers, translation-feedback contracts, fixture data, and user-data storage helpers.

## Local Compare Loop

Install once:

```powershell
npm install
```

Run the web app and Expo side by side:

```powershell
npm run dev:compare -- --mobile=android
```

Use these variants when needed:

```powershell
npm run dev:compare -- --mobile=ios
npm run dev:compare -- --mobile=web
npm run dev:compare -- --mobile=start
npm run dev:compare -- --mobile=android --web-port=3001
```

Default API base URLs:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator and Expo Web: `http://localhost:3000`

Override manually:

```powershell
npm run dev:compare -- --mobile=android --api-base-url=http://10.0.2.2:3000
```

The compare script reads root `.env` and forwards these public values to Expo when present:

- `NEXT_PUBLIC_SUPABASE_URL` -> `EXPO_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Visual And Click Verification

Verify that the React Native color tokens still match the web CSS variables:

```powershell
npm run style:mobile
```

Verify that the native app still exposes the web mobile structure and action labels:

```powershell
npm run structure:mobile
```

Compare a browser mobile screenshot against an Android emulator screenshot:

```powershell
npm run visual:mobile -- --web=.tmp/web-mobile.png --mobile=.tmp/android-mobile-home-css.png --out=.tmp/mobile-home-diff.png --json=.tmp/mobile-home-diff.json --threshold=0.32
```

Run the Android click audit while `npm run dev:compare -- --mobile=android` is active:

```powershell
npm run audit:mobile-clicks
```

The click audit writes screenshots and a report to `.tmp/mobile-click-audit/`. It currently covers home segments, reader navigation, favorites, quick move, search, search-result opening, and settings.
After the reader action panel and settings sections were aligned, the click audit also covers reader EN/KR switching, selected-verse highlight/favorite/note actions, highlight filters/actions, favorite search/sort/actions, and settings `account/tts/text/view` sections.

## Parity Checklist

- Open `http://localhost:3000/app` in the browser and the Expo app in the simulator.
- The mobile first screen should match the web mobile layout: header, `오늘/통독/활동/공부` home tabs, continue-reading card, reading-plan card, and bottom navigation.
- Reader loads the same chapter source through `/api/bible/books/:bookId/chapters/:chapter`.
- Chapter navigation changes the same book/chapter in both surfaces.
- KO/EN language toggle shows Korean when approved/public Korean text is returned.
- Quick move exposes the same mobile entry points: home today, today's reading-plan assignment, progress, highlights, and Bible search.
- Search calls `/api/bible/search` with `ko`, `en`, and `all`, plus testament and book filters.
- Search result text highlights spaced and compact query matches using the shared highlighter.
- Opening a search, highlight, or favorite result preserves the target verse selection after the chapter API response loads.
- Progress tab can start a reading plan, show today's assignment, jump to the next unread chapter, and mark today's assignment complete.
- Highlight, favorite, note, completed chapter, font size, theme, and reading-plan progress persist after app reload.
- TTS speaks the selected verse in `ko-KR` or `en-US`.
- Account settings can sign in or sign up through Supabase Auth when the public Supabase config is available.
- Translation feedback uses `/api/translation-feedback` with the mobile Supabase Bearer token. Logged-out users see the same login boundary as the web app.

## Verified Locally

On 2026-07-06:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run doctor -w @kjv/mobile`
- `npm run style:mobile`
- `npm run structure:mobile`
- `npm run visual:mobile -- --web=.tmp/web-mobile.png --mobile=.tmp/android-mobile-home-css.png --out=.tmp/mobile-home-diff.png --json=.tmp/mobile-home-diff.json --threshold=0.32`
- `npm run audit:mobile-clicks`
- `npm exec -w @kjv/mobile -- expo export --platform web --output-dir ../../.tmp/mobile-export`
- Android Expo Go opened through `npm run dev:compare -- --mobile=android --web-port=3001`.
- Browser mobile screenshot was compared against Android emulator screenshots for the home screen.
- Android emulator verified home segments, reader navigation, quick move, Bible search with `love`, API results, opening a result into the native reader with the target verse selected, and settings.

## Native Contract

The mobile app imports `@kjv/shared` and calls the existing web API. It intentionally does not include `react-native-webview` or embed the Next.js UI.
