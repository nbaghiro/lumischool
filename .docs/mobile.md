# The mobile app

Status: decided on 2 October 2026, phase 0 in progress. This document is the plan for the iOS, iPadOS
and Android app and the record of what it decided. It was written from a survey of every screen,
route and flow in both apps, the lesson sheet, the games, painting and sound, the server's
authentication, and the state of Expo, the web view and Skia in October 2026.

## What the app is

The app is a native shell around the screens we already have. Sign-in, the switch between a
grown-up and a child, and the map are drawn natively, because they are what the phone has to get
right and because the map does not fit inside a web view's memory on an iPhone
([overworld-gpu.md](overworld-gpu.md)). Everything else is the same Solid page the browser loads,
served from our own origin so that its cookies, its origin check and its secure-context features
behave exactly as they do on the web, with a small bridge for printing, sharing, speech and the
keyboard. When a screen moves to native later, it replaces its web view only once it matches it on
the same checks.

One app carries both modes. A grown-up signs in, and the app opens in parent mode; opening a child's
view switches the whole app into child mode until a grown-up leaves it with the parent PIN.

The web pages are loaded from the production origin over HTTPS rather than bundled into the app. A
page loaded from `file://` or a custom scheme has a different origin, so every state-changing request
fails the origin check in `server/http.ts`, the `__Host-` cookies are no longer sent, and
`navigator.locks` and `crypto.randomUUID`, which sign-in and the answer queue need, are not
guaranteed outside a secure context. Loading from the origin changes nothing in the request path,
and a web deploy reaches the app without a store release.

## Decisions taken on 2 October 2026

- The app lives at `apps/mobile`, as its own package (below, "Where it lives").
- The companion is left out of the app entirely for now. No clip, no call and no microphone
  permission ship in the app until the consent and vendor questions in [companion.md](companion.md)
  are settled and the call can use Daily's React Native SDK.
- The app is listed under Education with an age rating and a parental gate, not in Apple's Kids
  Category, whose age bands (5 and under, 6 to 8, 9 to 11) do not fit a product for five to twelve.
- The app is online-first, as the web is. The shell, the map and its bundled tiles open without a
  network, the answer queue survives the app being closed, and opening a lesson needs a connection.
  Fetching days of lessons ahead is a separate decision for later.
- The app sells nothing in its first version.
- The app is universal: one binary for iPhone, iPad and Android phones and tablets. The decision in
  [auth.md](auth.md) that there is no tablet was about pairing a dedicated device; an iPad running the
  app is one more signed-in device.
- Phase 1 runs the existing web map inside the app for internal builds only, so the whole product is
  in testers' hands early and the WebGL map is measured on a real phone for the first time.

## Where it lives

- `apps/mobile/` is an Expo app with its own `package.json` and lock file, holding React, React
  Native and the Expo modules. It is the one app that is not SolidJS. Its screens are in
  `apps/mobile/app/` (Expo Router), and the native code that is not a screen (the web view host, the
  bridge, the credential store, later the Skia map) sits beside them in `apps/mobile/`, because the
  React Native packages resolve only from the app's own `node_modules`.
- The app imports the shared run-time modules of `engine/` and `school/` by relative path, as the
  other apps do. It never imports `engine/ui/`, `server/` or `engine/notation/`; `boundaries.ts`
  withholds `engine/ui/` from it by naming `ui` in the other apps' rows.
- `engine/host.ts` is the bridge's protocol: every message between the app and a hosted page, its
  version, and the checker each side runs on what arrives. Both `engine/ui/native.ts` (the page's side)
  and the app import it, so the two sides cannot disagree.
- The root `tsconfig.json` leaves `apps/mobile` out, and the app type checks with its own
  `tsconfig.json` (React's JSX, React Native's types). Prettier, oxlint, the suppression guard and the
  boundary check cover it like any other code.
- Expo SDK 57 now, moving to SDK 58 when it is stable. The New Architecture and Hermes v1 are the only
  options. The minimum is iOS 16.4 (which also brings `OffscreenCanvas` to the web view) and Android
  API 24. The config is `app.json`, since Expo cannot compile `app.config.ts` while TypeScript 7 is
  installed (expo/expo#47627).
- Metro serves on 8566 ([local.md](local.md)).

## What is native and what is the web

| Layer | Where | Why |
|---|---|---|
| The chrome: tabs, headers, back, the offline line, loading and failure | Native | Small, and it is what makes the app feel like one |
| Welcome, sign in, start a family, choose and switch family, accept an invitation, kid sign-in, Who, the parental gate, the mode switch | Native | The credential has to be held natively, and these are the parental gate the stores ask for |
| The child's map and the parent's map, flying, going into a world and rising back | Native from phase 2, Skia with Reanimated and Gesture Handler | The camera runs on the UI thread, so pan and pinch never wait for JavaScript, and memory stays under our own budget |
| Today, the journal, marking, Lessons and the lesson look, the calendar, the account, members, kid logins, the weekly letter, games, painting, the world's roll, the sheets, books | The web page in a web view, in host mode | About ninety-five per cent of `engine/ui` and `apps/*` reused as they are |
| Printing, sharing a picture, speech, haptics, orientation, the keyboard, the app's state | Native, reached through the bridge | The browser's versions are missing or poor in a web view |

The native parts are also what keep the app inside the stores' rules against an app that only shows
a website (Google Play's Families policy, Apple's 4.2).

## The server's part

The app holds a credential of its own, made from the key kinds `server/db/keys.ts` already has, so no
migration is needed.

1. On a sign-in from the app, the server issues an ordinary `session` key and a `browser` key, bound
   to each other by the existing `bindToBrowser`, and returns both credentials in the body. The app
   keeps them in the device's secure store and sends them as `Authorization: Bearer <session>` and
   `X-Lumi-Device: <browser>`. A child's requests send `X-Kid-Session` and `X-Lumi-Device`.
2. A request with a bearer header skips the origin check, because a browser never adds that header on
   its own, so a cross-site page cannot forge one. It never reads a cookie, and it is refused when it
   also carries a `Cookie` or a `Sec-Fetch-Site` header, so page script cannot use it. JSON only and
   the 1 MB limit stay.
3. Sign-in uses the existing routes: `/api/auth/email/start` with `tab: true` (the challenge comes back
   in the body), then `verify` and `choose` with a new `device: true` flag, which the server refuses
   when a browser sends it. Kid sign-in already returns its credential.
4. `GET /api/native/web?to=<path>` hands the session to a web view. It accepts only the app's headers,
   sets `__Host-ls_session` and `__Host-ls_browser` to the same credentials, and answers 303 to the
   path, which `nextFrom` validates. The web view sends the headers on its first load, which is the
   only load on which react-native-webview sends custom headers. No credential appears in a URL or in
   page script. For a child's web view the app also writes the kid credential into `sessionStorage`
   before the page loads.
5. `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are served from
   `server/static.ts`, for `/join`, `/sign-in`, `/explore/*` and `/map`.
6. Every response carries `x-lumi-build`, so the app reloads a web view whose page belongs to an
   earlier deploy.
7. `deviceName` recognises the app's user agent, so a family's devices read "the lumischool app on an
   iPhone".

The app handles `put-away` by asking for the parent PIN, and `fresh-sign-in` by sending a new email
code before an action that grants or deletes. The kid sign-in budget of twenty a network in fifteen
minutes can trip behind a phone carrier's shared addresses, so an app request is counted by its device
instead.

## Host mode in the web apps

`engine/ui/native.ts`, imported by both apps' `main.tsx`, turns on when the page runs inside the app.

- It exposes `go(path)` and `back()` over the router, and tells the app each route, its title and
  whether it can go back. Titles come from a `TITLE` record keyed by screen in `apps/home/routes.ts`.
- It sets `data-host="native"` on the document, which hides the web bar, keeps the map that sits
  behind every screen from starting (a second GPU context is what gets a phone's page killed), and
  applies the safe area.
- A link to another app (`/kids`, `/open-child`, `/sign-in`) and a `target=_blank` link become requests
  to the app instead of page loads.
- The kids app has no paths, only a state machine, so host mode adds the states the app opens
  directly: a world's roll (with the world, the term and the box it grows from), the games and the
  painting. The web map is never mounted in host mode once phase 2 has shipped.
- The companion is off in host mode.
- `voice()` becomes injectable and speaks through the app, since Android's web view has no
  `speechSynthesis`.
- Printing renders the look sheet, serialises it with its styles and fonts inlined, and hands it to
  the app, which prints it with `expo-print` at A4 or Letter as `paperFor` says. `sheet-printed` is
  recorded once the print succeeds, not before it is attempted, as the web does today.
- A painting's download goes to the share sheet.
- The roll's reveal event becomes `scrollIntoView` with the keyboard's height taken off.
- The app's foreground and background feed the paths that already listen for `visibilitychange`:
  pausing a game, the answer queue, and the time a child spent away from the page.

## The bridge

Messages are small, typed in `engine/host.ts`, checked on arrival, and versioned. A web deploy keeps
working with the previous version of the app.

| From the app to the page | From the page to the app |
|---|---|
| `go`, `back`, `insets` (the safe area and the keyboard), `appState`, `reducedMotion`, `enter` (a world and the box it grows from), `printed` (whether a print the page asked for went through) | `ready`, `route` (path, title, whether it can go back), `open` (a link to another app's page), `childMode` and `parentMode`, `out` (the child left a world), `finished` (a sitting's answers were sent), `told` (for haptics), `speak` and `hush`, `print`, `share`, `playing` (a game's portrait rule), `unsent`, `failed` |

## The native map

1. `engine/ui/map.ts` is split so that its layout and decisions produce a `MapScene`: the places with
   their drawings and settings, the ways as paths with their styles, the reach and colour masks, the
   words, stamps, life, the guide and the sail. The web renderer and the native one both draw it. The
   styles the painters now read from `overworld.css` move into it, which also removes the web's
   per-frame `getComputedStyle`. It is to the map what `Frame` is to the games.
2. A Skia surface implements `engine/ink/surface.ts`, so every drawing on the shelf renders natively
   in the same hand, as a recorded picture. Who and the map's buttons use it first.
3. Tile levels 0 to 4 and the vector line chunks are bundled in the app. Levels 5 and 6 are fetched
   from `/assets/map-tiles/<hash>/` and kept on the device by content hash, so a re-export downloads
   only the tiles that changed. Tiles are drawn as an atlas packed into as few sheets as possible.
4. The camera is a set of Reanimated shared values with the web's feel: 10 px of slop, a 90 ms
   velocity window, the `0.9^(dt/16)` glide, a double tap that zooms by two, a pinch into a place that
   goes in at 62 per cent of the screen, the van Wijk and Nuij flight, and the fence that keeps the sea
   filling the window. The camera functions in `engine/space.ts` carry the `'worklet'` directive.
5. Every behaviour the child and the parent have now is kept: the place states and the rules for
   which open, a first tap that flies and a second that goes in, the note on a locked place, "You are
   here" with its followers, the day's stamps, roads and landmarks played after the first frame, the
   colour wash, the sail, the life within its budget, the balloon, flight with its lever, stars and
   landing fields, words that scale and hide with zoom, the map parked for ten minutes while a child
   is inside a world, spoken lines and labels for a screen reader, and reduced motion cutting every
   move.
6. Going into a world, the app dives onto the place and the child's web view opens the roll from the
   place's box, in its page form on a phone, and the two cross-fade. Only one surface that holds GPU
   memory runs at a time.
7. The gate, on an older iPhone and a mid-range Android: pan, pinch and flight at 60 frames a second
   (120 on a ProMotion screen), a 95th-percentile frame under 16 ms, under 300 MB after ten minutes,
   and the behaviours that `map-smoothness`, `map-resources` and `map-continuity` check, run as device
   flows.

## Phone layout

Parent mode has native tabs, drawn as the web's bar draws its places: each tab's icon from the shelf's icon set, its name in the reading face, and the current one in a white pill ringed in ink. The tabs are Home (`/`), Lessons (`/explore`, with the print handed to the app), Map (native), Calendar (`/calendar`, the day view on a phone, lessons moved by tap), Games (`/games`) and Painting (`/painting`). Above them is the web's bar: the mark, a Back pill when the page can go back, and the grown-up's stamp, whose menu holds the account, switching family when there is more than one, opening a child's view and signing out, as the web's stamp menu does. While a game is on screen the bar and the tabs step aside and the page keeps itself inside the phone's safe area, so the game has the whole phone and leaves by its own back arrow.

Child mode has the same bar and tabs as parent mode, drawn by the same code: the mark, the child's name on a tag like the ones under the stamps on Who, and the tabs Map, Today, Games and Painting. Each tab is the children's own web page opened for that child and that place (`engine/host.ts`, `Start`), with the page's own bar hidden, kept alive once opened. A view of several children first shows the web's Who page under the app's bar; the page tells the app which child was chosen (`child`), and Switch child on the name tag's menu goes back to it. The same menu holds For grown-ups, which opens only after a two-second hold and then asks for the parent PIN, as [auth.md](auth.md) describes; a tap only says to hold it. Leaving a world's roll in the Today tab returns to the Map tab, and a finished sitting reloads the map so its stamps and roads are drawn. Games are full screen as in parent mode.

## Every function, and where it is in the first version

N is native, W the web page as it is, W+ the web page with the phone fixes below, NR a native
replacement for a browser feature, and D left out of the app.

| Area | Function | Where |
|---|---|---|
| Entry | Welcome, sign in, start a family, choose and switch family, accept an invitation by link, kid sign-in, Who | N |
| Entry | Unsubscribe from the weekly letter | stays on the web, from the email |
| Child | The map and everything on it, flight, Today | N (W in phase 1) |
| Child | The roll, today's sheets, resuming, past days read back, books and sittings, journeys | W+ |
| Child | Every way of answering: typed, picked, several answers, dictation, arranged, program, handed in, worked, done with a grown-up | W+ |
| Child | Game cards in a lesson | W |
| Child | Finishing, the queue draining, the map's rewards redrawn | W and N |
| Child | Offline, not yet open, loading and failure | N |
| Child | Games: levels, challenges, a new arrangement, watch it again, checkpoints, undo, the pause menu, hints | W, full screen |
| Child | Painting, kept on the device | W, in a persistent store |
| Child | For grown-ups: leave, add a sibling | N |
| Child | The companion | D |
| Parent | Hello card, the morning's order, children's cards, the journal, marking, a grade move, language and nation | W+ |
| Parent | Print one lesson, print the day for the children and the grown-up | W layout, NR print |
| Parent | Lessons, its search and filters, the lesson look | W+ |
| Parent | The parent's map | N (W in phase 1) |
| Parent | The calendar in four views, day cards, school days, term dates | W+, dragging hidden on touch |
| Parent | Games, the painting gallery (share in place of download), the account, members, kid logins, PINs, the weekly letter, delete the family | W |
| Parent | The tutoring preview, the development outbox, the painting trial layouts | D |
| System | Reduced motion, fonts, safe areas, haptics on answers and in games, reloading after a deploy | N |
| System | Push notifications | not in the first version |

The phone fixes, which help the phone's browser as much as the app:

- At a 300 px column, 5,621 of the 7,868 input and choice boxes drawn in scenes are under 44 px tall.
  Their hit areas get a floor, and on a narrow sheet an answer drawn in the picture is entered in the
  strip's box.
- A negative whole number gets the decimal keyboard, which has no minus key on iOS.
- Type under 16 px in an answer box makes iOS zoom when it is focused.
- The calendar's drag and drop is hidden on touch in host mode; moving by tap already works.
- Add a child has no place on a phone today, since the bar's button is hidden at 700 px.
- A hint can be opened today only through the companion's desk, so with the companion off a child has
  no hint. The sheet needs a hint button of its own.

## Phases

| Phase | What | Gate |
|---|---|---|
| 0, foundations | This document, `structure.md`, `boundaries.ts` and `local.md`; `engine/host.ts`; the app scaffolded with a development build; the server's credential, hand-off, `.well-known` files and build header, with tests | `npm run check` passes; the app signs in and opens `/` in a web view with its session |
| 1, the whole product in the app | Host mode and the bridge; the native chrome, tabs, sign-in, Who, the parental gate and the mode switch; the web map inside the app | Internal TestFlight and Android builds where every row above works, and the first phone measurement of the WebGL map |
| 2, the native map | `MapScene`, the Skia surface, tiles, the camera, every behaviour, flight, going in and rising out | The map's gate on two real devices; it replaces the web map in both modes |
| 3, fitted to the phone | The phone fixes; print, share and speech; orientation; haptics; reloading after a deploy; device flows for sign-in, a whole lesson day, the mode switch, printing and a game | Every row passes on a phone, and the device flows pass on both platforms |
| 4, the stores | Privacy labels and Play's data safety form, account deletion reachable in the app, listings, a beta with families | Submitted to both stores |
| 5, after launch | A Skia renderer for `Frame` (plain sprite games, then water, liquid and lights, then the turn game), game sound through `react-native-audio-api`, a child's paintings kept as files, the companion through Daily's SDK once it is decided | Each replaces its web view only when it matches it |

Phases 0 and 1 run as three streams that touch different files: the server's credential (`server/`),
host mode (`engine/ui/`, `apps/home`, `apps/kids`), and the app (`apps/mobile`). The `MapScene` split
and the Skia surface can start during phase 1, since nothing in phase 1 waits for them.

## Where it stands

On 2 October 2026 phase 0 and the code of phase 1 were written and nothing was yet run on a device.
The server takes the app's credential, hands it to a web view at `/api/native/web` and serves the
`.well-known` files, with tests in `server/__tests__/native.itest.ts`. The one difference from the
plan above is that `/api/auth/email/start` also needs `device: true` from the app. Host mode is in
`engine/ui/native.ts`, `native-bridge.ts` and `printable.ts`. The app in `apps/mobile` is on Expo SDK
57 with react-native-webview 13.16 (the version the SDK pins), and has sign-in, family choice and
switching, kid sign-in, the parent's tabs, the child's view with the held grown-ups button and PIN pad,
and every bridge message handled.

Still to do for phase 1: a development build on a phone and the first measurement of the web map
there; the Apple team id, the Android signing fingerprint (both placeholders in `public/.well-known/`),
an EAS project, and the app's icon and splash; the fonts, since fontsource ships only woff and woff2,
which `expo-font` cannot load; tab icons; Who and the invitation drawn natively; moving the roll by the
keyboard's height. The app restates three types from `server/api.ts`, because a type import from
there reaches `server/db/keys.ts` and Node's types; once `server/api.ts` imports nothing that needs
Node, the app should import them instead.

## Store submission

Started on 5 October 2026, in the order of the submission checklist.

The site serves `/privacy`, `/terms`, `/support` and `/delete-account` (`apps/site/legal.tsx`),
which `server/pages.ts` routes to it for everyone and the site's foot links to. The app's avatar menu
opens Help and support and Privacy in the phone's browser. The pages describe what the code does
today: what is kept for grown-ups and children, the processors (Render, Neon, Cloudflare, Resend, and
Gemini for the grown-ups' teaching features, with no name or account identifier), no analytics,
advertising or tracking, and deletion. Export, withdrawing consent and deleting one child's record
have no screen yet, so the pages say to write to support@lumischool.ai for them. Three things need
the owner before submission: the operating company's legal name and address (`OPERATOR` in
`legal.tsx`), a lawyer's review of the privacy and terms text, and a retention period, which the
consent notice in `school/family/privacy.ts` still calls a draft.

The app is at version 1.0.0. `apps/mobile/eas.json` has development, preview and production build
profiles, with the build number kept by EAS (`appVersionSource: remote`) and raised on every
production build, and a production submit profile for Play's internal track as a draft, reading the
service account from `google-service-account.json`, which git ignores. `app.json` carries the iOS
privacy manifest (the UserDefaults, file timestamp and boot time reasons React Native and Expo need,
the data types the privacy page lists, all linked to the user for the app's function, and no
tracking), and Android's blocked permissions include external storage. `eas init` needs the owner's
Expo account, which writes the project id into `app.json`; App Store Connect's app id goes into the
iOS submit profile once the app record exists.

## Risks and what we have not measured

- No phone has measured the games, the map or a lesson sheet. Phase 1's builds are the first chance.
- Daily's Expo plugin lists support only up to SDK 55, which matters once the companion returns.
- Under the amended COPPA rule a child's voice is personal information, which is part of why the
  companion is out.
- A web view's content process can be killed under memory pressure without warning; the app reloads
  it, and the answer queue in IndexedDB survives that.
- Android's web view disables WebGL2 on some budget devices. The turn game falls back to its still
  view, and an action game says it needs a newer device, as it does in a browser.
