# Game cards: a round of a game inside a lesson

A game card is one round of a game played inside a lesson, in whatever box the lesson gives it. It shows a still picture of the game until the child taps it, and only one card on a page holds a live WebGL view at a time, since a browser allows about sixteen. The card plays a single round, one variation of one level and, where a level has several asks, only the first, and it reports one result when the round ends. A card never blocks a lesson from finishing: it is something to try, and the lesson counts it as evidence when it is played.

This document is the plan for building cards and putting them into lessons. [activities.md](activities.md) describes what an activity is and why the moves are the mathematics; this document is how a game reaches a lesson page.

## Where things stand

No lesson holds a game today. A compiled lesson block (`PackBlock` in `engine/pack.ts`) is text, a note for grown-ups, a picture or questions, and nothing else. `school/games/activities.ts` lists eight activities as hand-written data, and nine games point at them through `plays: { activity, levels }`, but nothing in the notation, the pack or the lesson page reads either. A game played from the library is recorded only from a grown-up's page.

## Decisions

- A game block may sit in any section of a lesson, and a lesson may hold several, but only one plays at a time.
- A lesson names a game by its activity (`game: jump.land-on`) or by the game and a level (`game: fish, level 2`).
- A card never blocks the lesson from finishing.
- A round played in a lesson is recorded as a `played` event: the game, its rules version and challenge, whether it was won, the tries, the seconds and any help given.
- On paper a card prints as its still picture with the line "Play this on screen".
- The game engine loads only when a lesson holds a game, so the child's first-view budget is unchanged.
- The map's side node for an activity is left for later.

## The card

`engine/ui/game-card.tsx` mounts the same runtime the Games page uses (`game-play.ts` and `game-view.ts`) in the lesson's box, with logic a test covers in `game-card.ts` beside it. Its shell is a one-line goal over the field and a restart icon; there is no page toolbar, so `game-play.ts` takes its shell from the caller rather than assuming the Games page. Until it is tapped the card shows the game's first frame through `still-view.ts`. A page keeps at most one live view: starting a card stills the one that was playing. The card follows its box through a resize observer and the portrait framing and `focus` the games already declare. Sound is off unless the page has it on, keys reach the game only while the card has focus, and reduced motion holds as it does on the Games page.

## The one-round contract

Every game declares how it plays as a card:

```ts
card: {
    // the level and how many asks a lesson plays, and how much of the world fits the box
    round: { level: 0, asks: 1 },
    keep: 18,
    minutes: 2,
}
```

A lesson's block can name another level; the card plays one variation of it, and a game whose levels hold several asks (Fetch with the pups, the road, Rescue pups, Gone fishing, the lemonade stand) starts and ends on a single ask.

## The card standard

A test mounts every listed game in a card-sized box and fails the build on any that does not meet this:

- At 360 by 240 pixels a square is at least about 12 pixels, words are at least 14 pixels, and the game's focus is in view.
- One round can be won through the field alone, with no on-screen buttons, and the solver proves it as it proves every layout today.
- The solver's round finishes within the declared minutes.
- A win is reported once, reduced motion settles, and a restart costs nothing.
- The still picture renders without WebGL2.

The compiler refuses a lesson that names a game failing the standard.

## Notation and the pack

The vocabulary gains a `game` block. The compiler checks that the game or activity exists, the level is in range and the game meets the standard, and the goal line goes through the voice check. The pack gains `{ k: "game", game, level, asks, goal }`, which the pack checker reads like any other block.

## On the page

`engine/ui/lesson.tsx` draws a game block as a card in the section's flow. The child's lesson view records `played` through the sync queue; the grown-ups' preview shows the card; print shows its still picture.

## The record

`engine/answer.ts` gains the `played` event kind and its checker, and the database type test follows. `school/record.ts` counts a played round as evidence for its lesson, and the parent's week view and journal show it in words, such as "Played Rabbit crossing, won on the second try".

## Content

About twelve lessons gain a game block, at least one for each game that meets the standard, matched by topic: number lines to Rabbit crossing and Paper plane, money to Penny shove and the lemonade stand, capacity to Measure it out, equal shares to Marble workshop, skip counting to Firefly trail, phonics to the Sound train, ordering to the Shunting yard, and number bonds to Pocket pool and Garden mini-golf. The exact lessons are chosen from the curriculum as it stands.

## Order of work

| Part | Work | Starts |
|---|---|---|
| A | the card and the shell it takes | at once |
| B | the contract, the standard and the games that fall short | at once |
| C | the notation, the pack, the `played` event and the record | at once |
| D | lessons on screen and the content | when A and C have landed |

Each part runs the type check, lint on its files, its own tests and its own end-to-end tests on desktop; one full check runs at the end.

## Status

Part A is built. `engine/ui/game-card.tsx` is `GameCard`, also the module's default export for a lazy import, with `game`, `level`, `asks`, `seed`, `goal`, `sound` and `onResult`; its rules apart from the page are in `game-card-rules.ts` (the one live card a page in `claim` and `release`, the states in `next`, the round in `roundOf`, the buttons in `showsButtons`, the goal in `goalOf`, the result in `resultOf`, as `CardResult`: game, rules version, challenge, won, tries, seconds and assistance). The runtime in `game-play.ts` already took its shell from its caller; a shell may now set `card: { keep }`, and the field and the still picture then crop to that many squares across round the frame's focus. The views and the drawing loader the Games page and the card share moved to `game-surface.ts`. A card reports a round once, when it is won or when it is left after a move. tools/e2e/games/game-card-harness.tsx mounts three cards over a page for tools/e2e/games/game-card.e2e.ts.

Part C is built. The notation's `game` block is `game jump level=2` (a game and a level from 1) or `game jump.land-on version=2` (an activity and a version from 1), with optional `asks=` and `goal=`, allowed in any section. The workspace reads it against the games as plain data (`CardGame` in engine/notation/games.ts, the catalogue's by default), and refuses an unknown game or activity, a level or version out of range, a mixed form, `asks` below 1, and a game whose `card` is null, each at its line and column. It compiles to the pack block `{ k: "game", game, level, asks, goal }` with the level from 0 and the goal the level's own when none is written, which the pack's checker reads, and a refused block compiles to nothing. A card prints as `GAME_PRINT_ROWS` rows in engine/pack.ts, in step with the print rule part D adds to lesson.css, and its goal goes through check:voice held to the marks, as a question's words are. The `played` event in engine/answer.ts names its child and holds the sitting, the lesson with its hash, the section and the card from 1, the game, its level from 0, the rules version, the challenge or null, won, tries, seconds and assistance; a child's view writes it and reads it back, as `answered`, and a lesson's own read carries it. school/record.ts folds it into `Folded.played`, the last round of each card in a sitting counting once, with `playedIn` for a child's cards in a lesson and `playedWords` for the parent's line, "Played Rabbit crossing, won on the second try". Part D draws the block on the lesson page.

Part B is built. `Card` in school/games/game.ts is `{ round: { level, asks? }, keep, minutes }`, and every game declares `card`, as one or as `null` with the reason in a comment; a game whose levels hold several asks starts a card's round through the optional `round(level, asks)` (the road, Fetch with the pups and Rescue pups). `cardSquare` in engine/motion/camera.ts is the square a card shows a view at: `keep` squares across, cropping the height as well round the focus, never less than the whole view's. school/games/__tests__/card.test.ts holds the standard: every game declares a card, a card game's square is at least 12 px in a 360 by 240 card, and one round is won by the field alone, every pad one a finger or the mouse on the field gives (no held arrow, no other big button, no space bar, a tap only where the field presses the big button), within the card's minutes, with the win told once and the game settling after. The hands that play each round are in school/games/__tests__/card-hands.ts: the river and the firefly by their pointer pilots, the cargo by dragging, the road by holding and swiping, the plane by a finger held below each flag, Pocket pool and Fetch with the pups by a pull to the aim the keys' solver found, the swings by a finger on the rope's line at the keys' angle, Rescue pups by a finger where the hose's stream is lined up, Clear round by a tap a fence, and the rabbit by pulls tried on a copy first. Eleven games are cards: Harbour cargo, Rabbit crossing, Down the river, Firefly trail, The road, Paper plane, Pocket pool, Charlie's rope swings, Fetch with the pups, Rescue pups and Clear round. Fifteen are not: Marble workshop, the Sound train, The number machine, the Shunting yard, Measure it out, Slingshot, Penny shove, Rafts, Gone fishing, Garden mini-golf, Pocket rally and Charlie's lemonade stand are too wide to crop into 30 squares and keep their play in view, and wait for the turned or overview view; See-saw and Cut the cake are off the list and as wide; and Shut the box is about 35 squares wide on a turn board that is never cropped, which a card would draw at 9 px a square.

Part D is built. `engine/ui/lesson.tsx` draws a game block as a `GameCard` loaded with `lazy`, so a lesson without a card never loads the game engine; the card sits in its section's flow at 16 to 10, no taller than most of a phone's screen. Each card is named by its section's index and its place among that section's cards from 1, counted over the whole section so a printed sitting that cuts the section does not renumber it. `SheetActs` gained `played`, which the child's own sheet in `apps/kids/lesson.tsx` turns into a `played` event through the sitting's queue, built by `played` in `school/lessons.ts`; a grown-up's preview and a past sheet have no acts, so a card there plays and records nothing. On paper a card is its still picture in eleven rows with "Play this on screen" in the twelfth, in step with `GAME_PRINT_ROWS`, and a card that is live when the page prints, or when the page turns to print media, goes back to its still picture first, since a printer may draw a GPU canvas blank. A sheet that came back carries its cards' last rounds in `SheetBack.played` (school/family/sheets.ts, read by `readSheet` in engine/ui/grown.ts), and the journal's card for the sheet and the How it went card under it say each in `playedWords`, with the game's name loaded when one was played.

### Lessons with a game

Each card sits at the end of the lesson's first `try` section.

| Lesson | Game | Level |
|---|---|---|
| k-03 A bead string | Down the river | Count to five |
| g1-01 Counting to twenty | Rabbit crossing (`jump.land-on`, version 1) | 0 to 20, land on 13 |
| g1-02 Bonds to ten | Pocket pool | Pot ten |
| g1-04 Adding to twenty | The road | Back again (one stop) |
| g1-07 Counting in steps | Firefly trail | Count in twos |
| g1-08 Equal groups | Charlie's rope swings | Stones in twos |
| g1-10 How long, how heavy | Clear round | Count the strides |
| g2-01 Numbers to a hundred | Paper plane | Tens to a hundred |
| g2-05 Threes and fours | Firefly trail | Threes in the hedge maze |
| g2-09 Metres and centimetres | Fetch with the pups | The open meadow (one ask) |
| g2-10 Grams and kilograms | Harbour cargo | First delivery |
| g2-11 Litres and millilitres | Rescue pups | Fire at the cottage (one ask) |
| g3-08 Equivalent fractions | Paper plane | Halves, quarters and eighths |

### For the owner's pass

For each lesson above, open it from Explore and from a child's map, and check:

- the card shows its still picture and a Play button, and nothing on the page moves until it is pressed;
- Play starts the round in the card's box, the goal line reads as the lesson wrote it, and the field alone plays it, with no buttons under it;
- playing a second card on the same page stills the first;
- a won round shows "Well played!", and the restart icon plays it again;
- on a phone the card fits the column and its squares are big enough to play;
- printing the lesson shows the still picture with "Play this on screen" and no buttons;
- after a child plays a card, the journal's card for that sheet and How it went say "Played <game>, won on the first try" or "not won yet".
