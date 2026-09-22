# Sound and playable instruments

Status: proposed, September 2026. Built in the scratchpad: `src/sound/` for the audio model and the mount, `src/art/music.ts` for the keyboard, the staff, the beat track and the fretboard, `music.html` for the demo, `test/sound.test.ts` for the tests, and `scripts/check-privacy.mjs` for the microphone guard. Everything below the summary is decided; the last section lists what is left for somebody else to place.

## Summary

The product has no audio at all today. [product.md](product.md) names sound as the obvious example of a capability we add to the core once rather than building a second product around, and [curriculum.md](curriculum.md) names it as one of two capabilities the forty non-maths lessons want and cannot have yet. This document decides what that capability is.

The short form. Sound is produced by synthesis through the Web Audio API, with no recorded assets and no asset pipeline. A sound is declared as data and played through a `Sounder`, which is the same rule the drawings already follow: a drawing targets a surface rather than the DOM, and a sound targets a sounder rather than an `AudioContext`, so both can be tested in a plain node run. An instrument is a part in exactly the sense a ten frame is, with one addition: it declares which pitch each of its anchors plays. What the child plays comes back as a performance, which is data an exercise can check. Every exercise is answerable with the volume at zero, and the reason it is answerable is structural rather than a promise we make: the verifier has no ears, so anything it can prove is provable from the drawing.

The microphone is a no. It is already a no in three places in the tree, and nothing in a music strand is worth reopening it for.

## Why synthesis and not recordings

Tuned notes are the thing we need first, and they are the case where synthesis is unambiguously right.

A synthesised note costs no bytes, needs no licence, needs no CDN and needs no loader, which matters because the child's build is not allowed to talk to an outside host and carries no third-party code. Anything recorded would have to ship inside the bundle, and [structure.md](structure.md) already records that the marketing page ships 161 kB of JavaScript to draw one hero, which is the kind of number a sample set makes worse by an order of magnitude. Synthesis also gives us any pitch in any octave from one small piece of code, where a sample set gives us the pitches somebody recorded.

The argument against synthesis is that a synthesised piano is not a piano, and that is true. We think it is the right trade for this product rather than a compromise we are stuck with. The drawings are sketches: a ten frame drawn with a shaking hand, a clock whose rim is not quite round. A sampled concert grand under a sketched keyboard would be the one photorealistic thing on the page. The tone we want is a soft struck tone with a fast attack and a decay, close to a toy glockenspiel or a thumb piano, and that is a handful of partials and an envelope.

Two things synthesis does not cover, and we are not covering them now:

Percussion and unpitched sound. A drum, a click, a shaker. These are noise plus an envelope rather than partials plus an envelope, and the code is nearly the same, so we will add a noise voice when a lesson needs one. The metronome click in the rhythm lessons is the first case, and it is one voice.

Speech, and a recorded human voice generally. Reading a question aloud for a pre-reader, and pronouncing a Spanish word, are both real needs and neither is solved by an oscillator. They are also a different decision, because a human voice is either an asset or a text-to-speech service, and a service means a host. The browser's own `speechSynthesis` runs on the device and is not a third-party host, so it is the only option that does not break the privacy rule, and its voices vary by platform in a way we have not surveyed. We are leaving this open and naming the trigger: the decision has to be made when the second-language strand is built, not before, and it should be made as its own document rather than inside this one.

### What a recorded asset kind would cost, if we ever add one

Writing this down so the option is priced rather than argued about later. It would be a fourth asset kind beside `art/svg`, `art/excalidraw` and `art/strokes`, so `art/sound/` with a manifest per file carrying the licence, the source and the duration, and a `check:sound-assets` guard the way `check:art` guards the drawings. A size budget of the order of 300 kB per strand, counted in the same budget as the code, with a hard rule that a lesson never waits on an audio download, which means either the audio is in the bundle or the lesson runs without it. All of that is affordable. What makes us not want it is that it puts a second kind of thing in the catalogue that the AI rules were written for drawings, where `ai.md` says the art catalogue is both the palette and the boundary and that there is no generated art. The same sentence has to hold for sound, and it holds more cleanly if the only sounds in the product are pitches from a fixed set of voices.

## The audio core

### A sound is declared, not played

The kernel holds pitch, intervals, note values and voices as data, and none of it touches an `AudioContext`. The one interface between that data and a noise is:

```ts
export interface Sounder {
  /** Whether anything will actually be heard. False in a test, on paper, or with sound off. */
  readonly live: boolean;
  /** Start a note. `at` is on the performance.now() clock; 0 or absent means now. */
  on(note: Note, o?: Sounding): void;
  /** Stop a note started with on(). */
  off(note: Note, o?: { at?: number }): void;
  /** A note of a known length, on and off in one call. */
  note(note: Note, seconds: number, o?: Sounding): void;
  /** Stop everything and release held notes. */
  hush(): void;
}
```

There are three implementations. `webSounder()` is the real one and is the only file in `src/sound/` that mentions Web Audio. `silentSounder()` does nothing and reports `live: false`, which is what a print render, a test and a page with the sound switched off all get. `recordSounder()` keeps every call in a list, which is how a test asserts that a tune played the right notes at the right times with no browser and no audio hardware.

This is deliberately the same shape as the surface rule, and for the same reason. [structure.md](structure.md) records that nine drawings added in one sitting could not be tested and two of them were wrong. A tune scheduled against a recorder is a unit test; a tune played into an `AudioContext` is something we check by ear once and then never again.

### When a sound is allowed to play

Six rules, and the first three are not ours to choose.

A sound plays only after the child has touched something. Browsers suspend a new `AudioContext` until a user gesture, so the context is created on the first pointer or key press on the instrument rather than on page load, and warmed with a silent tick so the first real note is not the one that pays for the resume.

Nothing plays on load, ever. There is no autoplay, no page that greets a child with a noise, and no sound attached to a page transition.

Nothing plays while the tab is hidden. On `visibilitychange` to hidden we call `hush()`, which releases held notes, because a note held by a pointer that left with the tab rings forever otherwise.

Sound is off until it is asked for, per device, and remembered. This is a real decision with a cost on both sides. Off by default means a music lesson opens silent and the child has to turn it on, which is a worse first thirty seconds. On by default means a page can make a noise in a room where that is not welcome, which is the single most likely reason a parent closes a tab and does not come back, and it means a child sharing a room cannot open the product at all. We take the safe default and pay for it inside the lesson: a lesson that wants sound asks for it once, in a large control drawn as part of the page rather than a browser prompt, and the answer sticks. The switch is `soundSwitch()` in the top bar, built the same way `themeSwitch()` is and stored in `localStorage` under `lumi-sound`.

We do not claim to know whether the device is muted, because a browser cannot tell us. There is no API for the hardware mute switch or the system volume, and guessing from the absence of anything is not possible. The consequence is handled by the accessibility rule below rather than by detection: because nothing depends on hearing, a muted device is not a broken lesson, it is a quieter one. What we owe the child is an honest indicator, so the switch shows that the product believes it is making a sound, which is what lets a parent work out that the volume is down rather than that the page is broken.

There is no `prefers-reduced-sound`, so the switch is the whole of our answer. `prefers-reduced-motion` governs motion and we do not read it for audio, because a child who cannot tolerate movement has not told us anything about noise.

### Limits

Eight notes at once. A child pressing every key with a forearm should produce a chord rather than a clipped roar, so the engine caps voices at eight and releases the oldest when a ninth arrives. Master gain sits at a level where eight notes together do not clip, which costs a little loudness on a single note and is worth it.

Pitch range C2 to C7, which is five octaves either side of nothing a lesson needs. The instruments we draw use C3 to C6, and the default octave is C4 to C5 because that is roughly where a child sings.

A4 is 440 Hz, equal temperament, and the canonical representation of a pitch is the MIDI integer, so middle C is 60. Everything else, including the frequency, is derived. We keep the integer rather than the frequency because intervals, scales and transposition are integer arithmetic on it, and because two notes are equal when their integers are equal, which floating-point frequencies are not.

Sharps and flats in text are a small trap worth naming now. The notation treats `#` as the start of a comment, so `F#4` cannot appear in a content file. In the notation a black key is written `Fs4` or `Gf4`. The pitch parser accepts `F#4`, `Fs4`, `Fsharp4` and `Gb4`, `Gf4`, and prints `F#4` canonically for anything a person reads on screen.

## The accessibility rule

A deaf or hard of hearing child has to be able to do a music lesson, and a hearing child in a quiet room has to be able to do it too. Those are the same requirement, which is useful, because it means we are not building an accommodation, we are building the lesson.

The rule, in the form the ink rule takes:

**Sound is a second channel and never the only one.** Everything a sound carries is also on the page at the same moment. The key that sounds also lights. The note that sounds is also on the staff. The interval that sounds is also drawn as a distance between two note heads. The beat that sounds is also a mark filling along a bar. A sound may confirm, reinforce, reward or make the lesson a pleasure. It may never be the only place the information an answer depends on exists.

The test is the print test, run again: turn the volume to zero and the exercise is still answerable, still checkable and still worth doing. A lesson that fails it is redesigned, not captioned.

What makes this hold rather than a thing we remember to do: the verifier has no ears. It proves an answer from the scene and the parameters, and there is no path by which a sounded event can reach it. So an item that passes the gate is answerable from the drawing, by construction. The one way to break that would be a sound that is not attached to something drawn, which gives us the enforcement point.

**A sound is a property of a drawn node, never a node of its own.** There is no `play` node in a scene and there never will be. A `piano` node can sound, because it draws the key that sounds. A `notes` node can sound, because it draws the note head that sounds. A `text` node cannot sound. This is checkable in the same guard that already checks parts: a part that declares pitches must return an anchor for every pitch it declares, so a sound that nothing draws cannot be declared.

Two further consequences, because they are easy to get wrong.

The reward for playing correctly is visible. A correct note is a tick and a lit key, not a chime, and the chime is the extra. The failure mode we are avoiding is the one where a deaf child does everything right and the page appears not to notice.

The exercises that would obviously depend on hearing are not written that way. "Which of these two sounds is higher" is not an exercise we ship. "Which of these two notes is higher" is, drawn on the staff and on the keyboard, and sound is what happens when you press them. High and low is a genuinely aural idea and it is also a spatial one in every notation ever invented, which is why a staff has a vertical axis, so we teach the spatial version and let the sound agree with it.

We considered haptic feedback as a third channel and are leaving it out. Vibration is unavailable on a desktop, inconsistent on iOS Safari, and it would be a channel we could not hold to the same rule, since a lesson designed around a buzz stops working on a laptop. The visible channel already carries everything.

## Instruments as parts

An instrument is a part in the full sense: one declaration holding its id, its settings, its box in whole squares, its draw function and its anchors, drawn by the same seeded pen, appearing on the shelf, placeable by the notation, and printing in ink. The keyboard on the marketing site, the keyboard in a lesson, the keyboard on a printed sheet a child points at, and the keyboard on the shelf are one declaration.

What being played adds is one field:

```ts
export interface Instrument<P> extends Visual<P> {
  /** Which pitches this instrument offers, in playing order, each with the anchor it lights. */
  keys(p: P): Key[];
  /** The voice it sounds with unless the caller says otherwise. */
  voice: VoiceName;
}

export interface Key {
  /** Stable within one instrument: "C4" on a keyboard, "s2f3" on a fretboard. */
  id: string;
  note: Note;
  /** The anchor this key lights, which the draw function also returns. */
  anchor: string;
  /** What is written on it, and what a screen reader says. */
  label: string;
  /** Where a finger has to land, in user units, so the mount can hit test without the DOM. */
  hit: { x: number; y: number; w: number; h: number };
}
```

That is the whole addition to the part contract. `keys()` is pure, derived from the settings the same way `box()` is, so the set of pitches an instrument offers is testable without rendering it and the guard can compare it against the anchors.

### State, and why it is not in the part

Which keys are down is not part of the declaration, because a part is a function of its settings. It reaches the part in two ways.

As settings, for anything static. `down=[C4, E4, G4]` draws those keys pressed, which is what a printed answer key needs, what a chord in a worked example needs and what the shelf shows. `lit=[G4]` draws a ring round a key, which is how "play this one" is said without colour and without sound.

As a live attribute write, for anything played. The mount does not re-render on a key press. The part draws, for every key, a face, a pressed overlay and a lit overlay, with the overlays hidden unless the settings name them, and the mount toggles the `visibility` attribute on one group per press. That keeps the pen's seeded strokes stable, so a key does not change shape when you press it, and it makes the latency of a press one attribute write rather than a render of the whole keyboard. It also means the lighting works with no stylesheet, so the part behaves the same in the lesson renderer, on the demo page and in print.

The pressed mark had to be redesigned to hold the ink rule, and it is worth recording why. The obvious drawing is a coloured wash over the whole key, which is what we built first. On paper a colour becomes hatching, so a pressed key came out as a field of dots with its letter and the ring round middle C somewhere underneath it, illegible. The mark is now a short bar in the empty band between where the black keys reach and where the letter is written, which is clear on every key at every size and reads the same in colour and in hatching. On a black key it is a light bar rather than a fill, because hatching on top of hatching is nothing. This is the ink rule doing what product.md says it does: anything that only works in colour gets redesigned until it works in ink.

### The input contract

Pointer, including touch, is the primary path. `pointerdown` on a key presses it and captures the pointer, so sliding a finger across the keys glissandos the way a real keyboard does. `pointerup`, `pointercancel` and leaving the instrument release it. Every pointer id is tracked separately, so a chord with three fingers is three notes. `touch-action: none` on the instrument, because a press that scrolls the page is not a press.

The computer keyboard has two maps, and the reason there are two is the age range. The musician's map, where the home row is the white keys and the row above is the black keys, is standard and is meaningless to a five-year-old. So the default map is the number row: `1` to `8` are the first eight white keys, which a child who can read numbers can use immediately, and the letter map is available for an older child. Both live in `src/sound/keys.ts` as data.

Keyboard access, separately from playing with the keyboard, is arrow keys and space. The instrument is one tab stop with a roving `tabindex`, left and right move a focus ring from key to key, space or enter plays the focused key, and the focus ring is drawn as a ring rather than a colour. That is the same pattern the activities use, and it is what makes the instrument usable by a child who navigates with a keyboard rather than one who wants to play music with it.

Screen readers get the container as a group with a label naming the range, and each key as a button whose label is the note name with middle C called out, plus `aria-pressed` while it sounds.

What a five-year-old can actually hit is the constraint that sets the drawing. [activities.md](activities.md) fixes forty four device pixels as the floor for a tap target and refuses drags, double taps, long presses and gestures. An instrument is not a mechanic, so that rule does not bind it literally, but the finger is the same finger. Three consequences:

| Setting | White key at 20 px to the square | Black keys | Where it is used |
|---|---|---|---|
| `wide=2` | 40 by 120 px | not drawn | a hero or a thumbnail: a size to look at |
| `wide=3` | 60 by 180 px | drawn, hit region widened to 60 px | the default in a lesson |
| `wide=5` | 100 by 300 px | drawn | 25 mm wide on paper, which is a real white key |

Black keys are drawn only from `wide=3` up, because a black key is drawn at sixty per cent of a white key's width and at `wide=2` that is 24 px, which no child can hit. The hit region of a black key is wider than the key that is drawn, filling the gap between the white keys either side, which is what every keyboard app does and what a real finger does anyway. At `wide=5` the width of a white key is that of a real one, so a printed keyboard can have real fingers put on it, and the length is foreshortened because a real key is 145 mm long and would eat half the page. A printed keyboard is five keys rather than eight: at `wide=5` an octave is 40 squares and a page is 36 across, so C to G is as much of a life size keyboard as fits, which the shelf's take now shows.

Whether a target is big enough is a fact about a pair rather than about the part, because the part declares its targets in squares and the page chooses how many pixels a square is. So the rule is one piece of arithmetic, `minSquarePx` in `src/sound/keys.ts`: a target clears the floor when the square size is at least 44 divided by the target's smaller dimension in squares. Three squares to a white key needs 15 px to the square, which the pages' 20 px clears easily. Two squares needs 22 px, which they do not, so `wide=2` is a size to look at rather than a size to play, and a lesson uses the size above it. A fretboard's shortest target is two squares where a white key's is three, so a fretboard needs a larger square for the same floor.

The number of white keys is what decides whether a key is big enough once the size is fixed, because the drawing scales to the width it is given. At 400 px, with the sheet running to the edge of the page, there are 384 px to draw in, and eight white keys gives each one 48 px while nine gives 43 px. Eight is the most that fits, and eight is the octave, so the default is an octave and a lesson never asks for more than one. The gutter is what gives way to reach that: on a narrow screen the sheet goes to the page edge, because every pixel of margin comes off the width of a key and the floor is the finger.

### The output

What was played is a performance, and it is data.

```ts
export interface Struck {
  note: Note;
  /** Milliseconds on the performance.now() clock, from the event, not from the handler. */
  at: number;
  /** When it was let go, absent while it is still held. */
  off?: number;
  how: "pointer" | "key" | "focus" | "code";
}

export interface Performance {
  /** The instrument, so a check knows what was available to play. */
  instrument: string;
  started: number;
  struck: Struck[];
}
```

Onsets are read from `event.timeStamp` rather than from `performance.now()` inside the handler, because the event carries a timestamp set closer to the hardware event than the moment our code runs. We use no wall clock anywhere, which also means a performance can be replayed and judged again from the record.

### What belongs where

| Layer | What | Why |
|---|---|---|
| kernel, pure | pitch names and frequencies, intervals, scales, note values, bars, tempo, tunes and their schedules, voices as data, the `Sounder` interface, the silent and recording sounders, `Performance` and the judges | runs in a node test, no DOM, no audio hardware |
| kernel, parts | the piano, the staff, the beat track, later the fretboard: box, draw, anchors, `keys()` | a part is a part |
| ui | the Web Audio sounder, the playable mount and its events, the sound switch | touches the DOM and the audio hardware |
| authoring | the registry entries, the code checker for a played answer, the golden performances a rhythm item is verified against | never reaches a child's bundle |

In the kernel's strict order, sound sits after `pen` and before `parts`, because a part needs to name a pitch and nothing before `pen` needs to know what a pitch is.

### An instrument is not an activity

We checked whether an instrument fits the `Mechanic` interface in [activities.md](activities.md), because the brief for this work suspected it might, and it does not. A mechanic declares a finite move set the prover enumerates, a position graph small enough to search, a branching cap because a child choosing between forty things is lost, and a win condition. An instrument offers twelve moves in every position, has a position graph that is every sequence of notes, and in free play has no win condition at all, which is the point of it. Forcing it in would either break the branching cap or produce a graph in which every position is one move from a win, and the document is explicit that a mechanic needing its own answer to the keyboard question should be refused.

The fit is the one already in the tree. An instrument is an input, beside `number-input`, `choice` and `word-input`, in the `Inputs` group on the shelf. What it produces is an answer, so it goes through the verifier rather than the prover, and it uses the promise machinery that exists.

Where an instrument does become an activity is the other direction, and we name it here so the two pieces of work meet rather than overlap. Building a bar out of note values until the bar adds to four beats is a genuine mechanic: the moves are the note values, the position is the bar so far, it is reversible, the graph is small and the win is that the bar is full. That is the grade two lesson on reading a rhythm, and it belongs in `features/play` as a mechanic rather than here. This document's contribution to it is the note values, the bar arithmetic and the drawing.

## What a music exercise can promise

[curriculum.md](curriculum.md) says sound has no weaker promise available because there is nothing to verify about a sound. That is true and it is also narrower than it sounds. There is nothing to verify about the noise. There is a great deal to verify about the pitches, the note values and the drawing, and because the verifier cannot hear, everything it proves is proved on those.

Three tiers, and the page says which one it is on, the way the reading strand already says that a grown-up is the marker.

### Proved, with no tolerance

These are provable today, on the existing gate, because the answer is a discrete value.

Name the note drawn on the staff. Name the white key the arrow points at. Which of two drawn notes is higher. Put three drawn notes in order from low to high. How many beats are in this bar. What note finishes this bar. How many semitones from this note to that one, and what that interval is called. Which key is a semitone above this one.

Playing is also in this tier when only the pitches matter. "Play the C" is proved: the performance contains middle C and nothing else. "Play C, then D, then E" is proved: the distinct pitches in order are those three, and no timing is examined. This is a set comparison and a sequence comparison on integers, with a stated policy on extra notes, and none of it needs a tolerance.

Two properties of an instrument are also checkable at build time, and they belong to this tier because they are what makes an exercise well formed. Every pitch a part offers is inside the instrument's declared range, and every pitch it offers has an anchor drawn for it. Both fall out of comparing `keys()` against `draw()`.

### Proved against a tolerance we have to justify

Rhythm. "Play this rhythm" and "clap four steady beats" cannot be exact, because no child and no adult plays a beat to the millisecond, and because the browser does not give us the millisecond anyway.

The definition we propose. A target rhythm is a list of onsets in beats. A performance is a list of onsets in milliseconds. First the count has to match, and a mismatch is reported as a count rather than as a timing problem, because "you played five and the bar has four" is better feedback than "you were out of time". Then we fit one number, milliseconds per beat, by least squares across all the onsets with the first onset as the anchor, and every onset has to land within the tolerance of where that fit puts it. Fitting the tempo rather than imposing it is the important half: a child who plays the rhythm correctly and slowly is playing the rhythm correctly, and a child who speeds up evenly throughout is doing something a musician would recognise as not wrong.

The tolerance. A quarter of a beat at grades one and two, a sixth of a beat at grades three and four, with a floor of sixty milliseconds so that a faster tempo cannot make the window smaller than the input jitter. At eighty beats a minute a beat is 750 ms, so those are windows of about 190 ms and 125 ms.

The justification, and the hedge, because this needs to be honest. The numbers come from the general literature on tapping variability, which puts young children well above adults and adults well above the precision a musician would want, and we have not measured a single child on this product. They are a starting point chosen to be generous, and they must be checked against real attempts before they are used to mark anything that a parent reads. The floor of sixty milliseconds has a different and firmer basis: pointer and key events are delivered on the main thread and quantised by the input and frame pipeline, so an onset carries tens of milliseconds of error before the child has done anything, and a tolerance tighter than about fifty milliseconds would be measuring our own latency.

What the verifier can actually prove about a tolerance is narrower than what it proves about an answer, and saying so is part of the promise. It cannot prove that a tolerance is the right tolerance. It can prove that the check is well formed, that a synthetic perfect performance passes it and that a named wrong performance fails it, which is the same shape as the existing rule that a feedback line firing on a correct answer is a bug. So every rhythm item carries golden performances: one exact, one with a beat missed, one with a note doubled, one played at half speed, and the gate asserts pass, fail, fail, pass. That is buildable on the verifier as it stands and it catches the failure that matters, which is a check that accepts anything or rejects everything.

Two limits came out of building it, and both are worth stating because neither is obvious from the description above.

A bar of one or two notes has no rhythm to judge. Two onsets fix a tempo exactly, so the fit is perfect whatever the child did, and there is nothing left to be wrong about. Such a bar is judged on its count and the page says so, rather than pretending to have measured something.

A generous window accepts a bar clapped evenly. On a bar whose note values are only mildly uneven, playing every note the same length lands inside a quarter of a beat everywhere, so the exercise would mark a child correct for not having read the rhythm at all. That is not a fault in the check, it is a bar that does not teach what it claims to, which is exactly the "correct but badly taught" risk product.md names as the thing verification alone does not catch. So the gate reports it: `teachesRhythm` asks whether this bar at this window can tell a child who read the values from one who did not, and a bar that cannot is one for an author to replace. At the grade one window a bar of two quavers, a crotchet and a minim (onsets 0, 0.5, 1, 2) cannot; at the grade three window it can. Of the bars that can be written from quavers, crotchets, dotted crotchets and minims in four beats, 24 change verdict between the two windows, and every one of them opens on a quaver, which is the note the wider window swallows.

The other half of the tolerance question is the child's, not the verifier's, and it is answered by the accessibility rule. The judgement is drawn. A beat track shows the target onsets above the line, the child's onsets below it, and the tolerance as a band, so a near miss is a visible distance rather than a verdict. A deaf child gets the whole of rhythm this way, and so does a hearing child who cannot tell what went wrong.

### Not checkable, and not pretending to be

Make up a tune. Play something that sounds happy. Play it like a lullaby. Play along with this and make it your own.

These are not marked, they are collected. The page says that the grown-up is the marker, which is what the reading strand already says for a written sentence, and the performance is kept as evidence for the parent's sheet so there is something to look at and talk about. This tier is not a lesser part of the strand. Making something up is most of what a child with an instrument should be doing, and a product that only ever asks a child to reproduce a written note has missed the subject. What we refuse is the pretence: no score, no stars, no "well done, that was in the key of C".

The line between this tier and the first is the line the whole strand rests on, so we state it plainly. An exercise may be marked when the right answer is a fact about pitches, note values or the drawing. It may be marked against a tolerance when the right answer is a timing and the tolerance is declared and verified. Anything else is a grown-up's judgement, and it is said on the page rather than implied by the absence of a mark.

## The microphone

The decision is no. No microphone, in the child's build or the parent's, for the music strand or for anything else, and this document does not treat it as open.

It is already decided in three places. `src/family/privacy.ts` lists "Audio, camera, or anything from the microphone" among what we do not collect, and that list is shown to parents, which makes it a commitment rather than a note. [ai.md](ai.md) says no microphone by default, no audio retained, no voiceprint, no image of a child, and sets out the only conditions under which speech could ever ship: on the device, a closed grammar of a handful of intents, nothing retained past the matched intent, and nothing resembling a voiceprint ever computed. [parents.md](parents.md) repeats the same list. Reopening it for a guitar lesson would be trading the clearest promise in the product for a feature we can build another way.

The reasoning specific to music, beyond the promise. The amended COPPA rule treats a biometric identifier as personal information, and a voiceprint is one. An audio stream from a seven-year-old's bedroom is the highest-consequence data the product could ever touch, it carries every other person in the room, and no amount of on-device processing changes what has to be true about the code path for the parent's consent to mean anything. Pitch detection would also be a poor feature even if it were free: detecting the pitch of a guitar note in a room is a hard signal processing problem, a child's first attempts at a fretted note are genuinely ambiguous, and a lesson that tells a child they played the wrong note when they played the right one badly is worse than no lesson.

What we do instead, which is not a consolation prize. The child plays the instrument we drew. That gives exact pitch and exact onset data with no audio anywhere, which is better data than pitch detection would produce, and it means the exercise can be verified. The real instrument stays in the room, where a grown-up hears it: "play the C on your guitar and let someone hear it" is a perfectly good exercise in the third tier, and it is honest about who the marker is. A guitar strand teaches the fretboard, the string names, where a note lives and what a chord shape is, all of which are drawings and all of which are provable, and the part it does not teach is the part a person in the room teaches better than a microphone would.

One concrete recommendation. `check:privacy` should refuse `getUserMedia`, `MediaRecorder` and `MediaDevices` in the child's and parent's builds, so the decision is enforced in the repository the way the no-outside-host rule is, rather than held in three documents.

[guitar.md](guitar.md) prices listening to a real ukulele or guitar on the device, with what it would take and what the law says about it, because the owner asked for the option to be set out. It does not reopen the decision on its own authority: the decision stays the owner's, the guard still refuses capture, and nothing that listens has been built.

## Music content

### The shape of the strand

[curriculum.md](curriculum.md) gives music two of the forty non-maths lessons, one at grade one and one at grade two, both on the rhythm bar. Ten lessons across four grades does not fit inside two slots, so this is a change to that table and not something this document can settle. The two ways it can go: music becomes a strand of ten beside the forty, which makes the non-maths set forty eight, or it takes slots from the other strands, which the owner has to choose. We recommend the first, because the other strands were each sized against what they needed and none of them has a slot going spare.

Ten lessons, three at grade one, three at grade two, two at grade three and two at grade four. The weighting is deliberate: the instrument is most valuable early, where a child who cannot yet read is perfectly able to hear that one note is higher than another and to find it with a finger, and by grade four music is competing with a great deal else.

| Grade | Lesson | What it asks | Tier |
|---|---|---|---|
| 1 | High and low | Which note is higher, and where the high notes live on the keyboard | proved |
| 1 | The white keys, C to C | Find middle C, name a key, play the key that was named | proved |
| 1 | Beats in a bar | Count the beats in a written bar, clap along, finish the bar | proved |
| 2 | Writing a rhythm | Build a four-beat bar out of note values, then play it | proved, and the activity mechanic |
| 2 | Steps and skips | C to D is a step and C to E is a skip, drawn as a distance and played | proved |
| 2 | Loud and soft, fast and slow | The words on the page, and what they do to a phrase | proved for the reading, third tier for the playing |
| 3 | Reading the treble staff | A note on a line and a note in a space, middle C up to G | proved |
| 3 | The black keys | Why there are five, tones and semitones, two names for one key | proved |
| 4 | Scales and keys | The major scale as a pattern of tones and semitones; play C major, then G major and find the F sharp | proved |
| 4 | Playing a short phrase | Read four bars and play them, pitch and time together | tolerance |

Of the ten, High and low, Reading the treble staff and The black keys are written (`music-high-and-low`, `music-reading-the-treble-staff`, `music-the-black-keys`, 16 September 2026, with their played answers checked by `music.plays`); the white keys and the beats are `music-keyboard` and `music-rhythm` in their own shape; Steps and skips and Loud and soft are [piano.md](piano.md)'s `music-piano-steps-skips` and `music-piano-loud-soft`; and Writing a rhythm, Scales and keys and Playing a short phrase are `music-writing-a-rhythm`, `music-scales-and-keys` and `music-playing-a-short-phrase` (17 September 2026). Writing a rhythm is written for paper, choosing and counting note values, and the bar-building mechanic still waits. The short phrase checks its notes with `music.plays` and its last bar's rhythm with `music.rhythm` as two questions, since no check yet judges pitch and time together, and a run with a repeated note cannot be played, since `music.plays` hears a repeat as one note.

### What changes by grade

The verb changes, in the same order the maths years use. Grade one finds and names. Grade two counts and writes. Grade three reads. Grade four plays what is written and explains the pattern behind it.

The reading load falls the same way it does in maths, which for grade one means the question is short enough that a child can start without an adult reading it, and it is why the grade one lessons are about a finger on a key rather than about notation.

The promise tier moves once, at the last lesson. Nine of the ten are provable with no tolerance, which is a better position than we expected when this work started, and it is because naming, counting, ordering and playing a named pitch are all discrete. The tenth is the first exercise that needs pitch and time together, and it is deliberately last so that the tolerance has one lesson resting on it rather than a strand.

Guitar arrives as a second instrument rather than a second strand, most naturally at grade three where the staff is already being read, and it fits because a fretboard is the same declaration with the keys renamed. The one real difference is that a fretboard has several places for one pitch, so "play the C" has several right answers, which the judge already handles because it compares pitches and not key ids.

## What to place, exactly

The code is built and tested against everything in this section. None of it is ours to place, so it is written out in the form it goes in.

### The parts index

`src/lang/parts.ts` derives the vocabulary from a fixed list of art modules, so the new module has to join it: one `import * as music from "../art/music.ts";` beside the others, and `music` added to `MODULES`. That alone makes `piano`, `notes`, `beattrack` and `fretboard` writable in a scene, because a part already declares its settings, their kinds and its box.

### The two scene nodes worth declaring by hand

The derived entries are enough to place a drawing. These two want a hand-written entry in `REGISTRY`, because their anchor names depend on their values and the inference cannot guess that.

`piano`, an input node. Settings `from` (word), `whites` (num), `wide` (num), `labels` (pick: `letters`, `solfa`, `numbers`, `none`), `down` (words), `lit` (words). Anchors: `key(<note>)` for every key it draws, where the note is written the notation-safe way (`C4`, `Fs4`, never `F#4`), plus `home` for middle C, `top` and `under`. The anchor list is `pianoKeys.keys(v).map(k => k.anchor)`, so `anchorsOf` can call the part rather than repeating it. Box `keyboardShape(v).box`. Marked `input: true` when the child plays it, so its id names the answer.

`notes`, a staff with pitched notes. Settings `clef` (pick: `treble`, `bass`), `notes` (words), `values` (exprs), `letters` (flag), `lit` (words). Anchors `note(0)` upwards, which is what `staff` already uses for the rhythm bar, plus `staff` and `under`. Box from `staffWidth`. This is the part that makes the accessibility rule hold for pitch, so it should be placed at the same time as the piano rather than after it.

`beattrack` and `fretboard` need nothing by hand. The beat track has no reason to be written in a content file at all, since its `played` setting comes from a performance at run time, and the fretboard's spot anchors follow the same `anchorsOf` pattern as the piano when a guitar lesson wants them.

### The catalogue

One new category in `src/art/catalog.ts`, after `reading`, since it is the other strand whose art is not maths:

```
id: "music", name: "Music", blurb: "The instruments a child plays and the page that shows what they played: a keyboard whose keys light as they sound, a staff at one square to the space, and the track a rhythm is judged along."
```

with `entry(pianoKeys, ...)` taking takes at `wide` 2, 3 and 5, one with `down` set to a chord and one with `lit` set to a single key; `entry(staffNotes, ...)` taking a middle C, a scale, and a bar with a sharp in it; `entry(beatTrack, ...)` taking an empty track and a judged one; and `entry(fretboard, ...)`. The shelf page needs no change: these are ordinary `Visual` declarations and `Instrument` only adds fields the shelf does not read.

### The two code checkers

This is the cheap path for a played answer, and it is how we suggest the strand ships first. A performance answer is exactly the case the existing `check <checker>` mechanism was built for, and the rule that a code checker must be able to list at least one solution is met by generating a synthetic perfect performance, which is also the first of the golden performances the rhythm tier needs.

```
check music.plays notes=[C4, E4, G4] ordered=true
check music.rhythm beats=[0, 1, 2, 3] grade=1
```

`music.plays` calls `judgePitches` and lists `notes` as its solution. `music.rhythm` calls `judgeRhythm` with `toleranceFor(grade)` and lists `goldenPerformance(beats)` as its solution; the gate should also run `goldens(beats, tolerance)` and refuse the item if any of them does not come back as declared, and report `teachesRhythm(beats, tolerance)` as a warning rather than an error. Both functions are in `src/sound/judge.ts` and both are already tested.

The right shape for the longer term is a third kind of answer beside a number and an option, which is the gap [product.md](product.md) names as the next piece of core work. We have not invented it: a played answer is one of three cases alongside a typed word and a produced drawing, and it should be designed once with all three in view.

### One lesson-level change, which is none

A lesson that contains a sounding node gets the sound switch automatically, so there is no `sound` setting to write and no way for a content file to turn a child's speakers on.

### Two guards

`check:parts`, extended so that a part declaring `keys()` returns an anchor for every key it offers. That is what makes a sound impossible to declare without drawing it, and it is the enforcement point for the accessibility rule. The test for it is already written, in `test/sound.test.ts` under "every key the keyboard offers has an anchor drawn for it": it checks that every key's anchor is `key(<its id>)`, that the ids are unique, that no id carries a `#`, and that the ids round trip through the pitch parser. Moving that into `check:parts` is a matter of running it over every part that has a `keys` field rather than over the two we have.

`check:privacy` is built, in `scripts/check-privacy.mjs`, and wired into `npm run check`. It refuses `getUserMedia`, `getDisplayMedia`, `MediaRecorder`, `MediaDevices`, `mediaDevices`, `MediaStreamTrack`, `SpeechRecognition`, the audio capture nodes and the analyser node, in code but not in comments, so the decision can still be written down. It plants cleanly: adding one call to any file under `src/` fails it with the file, the line and the reason. The other half of `check:privacy` in [structure.md](structure.md), that the child's build loads nothing from an outside host, needs the app split that does not exist in the scratchpad, and the script says so rather than pretending to cover both.

### One rule for generation

One line long, and it mirrors the one that exists. There is no generated sound. A model composes pitches from the voices and instruments that exist, and a request for a new instrument or a new timbre is refused the same way a request for art we have not drawn is refused.

## The piano curriculum, extended, and the second instrument

Two documents take the strand further, and this section says what they changed here.

[piano.md](piano.md) sets the keyboard against how children of five to ten are taught in the method books and the early grades of three examining boards, finds what the ten lessons above leave out (finger numbers on both hands, the left hand and the grand staff, landmark reading by steps and skips, rests, dots and three beats in a bar, loud and soft, and the habits every syllabus tests beside pieces), and designs the extension. Built with it: the `hand`, `grandstaff` and `dynamics` drawings, a `fingers` row on `piano`, and a time signature, bar lines, dots and rests on `notes`; four sections on `music.html`; and four lessons, on finger numbers and C position, steps and skips, loud and soft, and the grand staff. The ten lessons in the table above stay the plan for the strand's spine, and piano.md's lessons fill in around them.

[guitar.md](guitar.md) makes the fretboard the second instrument this document expected, as a ukulele for five to seven and a guitar from eight. Four things changed in this folder for it. The fretboard moved from `src/art/music.ts` to `src/art/strings.ts`, and its places are numbered from the thinnest string, as a teacher numbers them, so string 1 is the guitar's high E and the ukulele's A. There are two plucked voices, `nylon` and `uke`, declared in `pluck.ts` and rendered to samples by Karplus-Strong, and the wave voice called `string` is gone. `Sounding` has a `channel`, so a new note on a string stops the note that string was ringing. And `Struck` has a `place`, because on a neck the pitch alone does not say where a note was played. The one real difference this document predicted, several right places for one pitch, is handled the way it said: the judge compares pitches.

## Order of work

Items one to five, and nine, are built. The others are not, and the music experience below adds its own list.

1. The pure core and its tests. Pitch, intervals, scales, note values, bars and tempo, tunes and their schedules, voices as data, the `Sounder` interface with the silent and recording implementations, performances and the judges. Forty three tests, all of it in a plain node run.
2. The Web Audio sounder and the sound switch. Verified by measurement rather than by ear, since the browser we test in is headless: the chime voice at middle C, rendered into an `OfflineAudioContext`, has its strongest component at 261.63 Hz by a factor of two hundred over an off-pitch probe, a peak at 0.50 falling to a sustain of 0.17, and no clipping. Pressing keys on the page creates one context and starts one oscillator per note at the right frequency.
3. The parts. The keyboard, the staff with pitched notes, the beat track, and the fretboard as the second instrument. All four in whole squares, drawn by the pen, working in ink.
4. The playable mount. Pointer, touch, both computer keyboard maps, arrow key access with a drawn focus ring, the lit and pressed overlays, and the performance it returns.
5. `music.html`, which drops the same keyboard onto a page that is not a lesson, at two sizes, with a note naming exercise, a rhythm exercise and the gate run in the page.
6. The registry and catalogue entries, and the two code checkers, as set out above.
7. The content: the three grade one lessons, and the rhythm lesson that exists rewritten as a played one.
8. The bar building mechanic, in `features/play`, against the note values this document defines.
9. A percussion voice. Built as three noise voices, a drum, a click and a shaker, in `src/sound/hit.ts`, with the transport a metronome runs on; see "The music experience".
10. Recorded audio and speech, deferred, with the trigger named: the second language strand forces the decision and it should be made as its own document.

## The music experience

Status: built in the scratchpad, September 2026. The Music tab is now the child's music home at `music.html`, with four pieces played from it (`?i=echo`, `?i=keep`, `?i=compose` and `?i=play`), and the pages that show how each instrument is built have moved to `?i=piano`, `?i=glock`, `?i=uke` and `?i=guitar`. The pure parts are `src/sound/transport.ts`, `hit.ts`, `echo.ts`, `keep.ts` and `compose.ts`, with their tests in `test/transport.test.ts`, `percussion.test.ts`, `echo.test.ts`, `keep.test.ts` and `compose.test.ts`. The pages are `src/pages/music-home.ts`, `music-scene.ts`, `music-echo.ts`, `music-keep.ts`, `music-compose.ts` and `music-play.ts`. The drawings added are `handdrum`, `countrow` and `tunegrid`, and the glockenspiel gained an `off` setting.

### What already delighted, and the bar

We played the tab as a child and as a parent would, in Chrome with real pointer input at 1024 by 768 and at 1440 by 900: every instrument, the rhythm bar, the guided phrase, and all 42 notes of Twinkle on the piano and the glockenspiel. Four things delighted. The instruments are drawn in one hand on squared paper and answer a tap with one attribute write, so a key or a bar lights the moment it is pressed, and the glockenspiel is a specific instrument, with bars that shorten as they rise, felt rails and pins. Timing is drawn as a distance: the beat track puts the child's taps under the notes they were meant for, with the window as a band and a tick or a cross under each, which a child who cannot hear can read. Guided playing rings the next key and waits for as long as it takes, and a wrong note says which way to move rather than buzzing. And Twinkle's song sheet (sol-fa, letters, fingers, chords and words in one table), with the table of which instrument can play it in which key, shows what writing a song once buys.

That sets the bar every piece is held to. It is played with one finger on a drawing that answers at once. It is readable with the volume at zero, because whatever sounds also lights. It is one scene with one sentence from the guide. And nothing in it is counted, timed against the child or carried from one round to the next.

What fell short of that bar was the page around the instruments. The piano view was 12,700 pixels tall, with twenty sections and 1,460 words written for the people building it, including a code block, the gate's tables and the inventory. The child met a voice picker, a key map and a tempo slider before any instrument, the ukulele view offered more than twenty buttons, and the song's key buttons were 33 by 31 pixels. Lines a child reads named octaves and milliseconds ("C, octave 6", "the window was 188 ms"), and one mark contradicted itself ("1 of 5 played. That is all of C4, D4, E4, F4, G4"). The rhythm exercise was one bar with no running beat and no count-in for the child, tapped on a yellow button rather than a drum. The lights followed `setTimeout` rather than the audio clock, there was no percussion, and nothing was a place or played like a game.

### The direction

Music is one place for a child rather than a set of tabs. The home is a page of cards, each with its drawing on squared paper: the games, the instruments and the songs, with a quiet link at the foot for a grown-up to the pages that show how each instrument is built. A game or an instrument opens as one scene in the frame the Games tab uses: the guide and its sentence above, the drawings on a sheet of squared paper, and a tray of large controls beside it that folds under the sheet on a narrow screen.

The instruments are the shelf's drawings at their most beautiful and at the size a hand wants: the drum 11 to 17 squares across, the glockenspiel at three squares a bar, and the tune grid at 54 by 45 pixels a cell. The staff and the rhythm are drawn on the squared paper they sit on, and the beat is a row of squares.

Motion follows the beat, and it is a reading rather than an animation. The square for the beat being played fills, the bar or the drum that sounds lights at the moment it is heard, and the column being played in a tune is washed. Each of these is a layer shown and hidden from the transport's clock, the way a lit key is, so [animation.md](animation.md)'s rule that nothing on the shelf keeps a beat still holds: those drawings are still, and the page shows a reading on them. Under reduced motion nothing moves, and the fills still change, because they carry what the child needs.

Everything is readable at zero volume, by the rule above. A child's words name letters rather than octaves, say "early" and "late" rather than milliseconds, and say the tempo as "slow", "walking", "quick" or "fast" beside the number. Every line is written, and none has an exclamation mark.

### The pieces

| Piece | Verb and controls | Scene | Learning, and its tier | Refusals it keeps | Status |
|---|---|---|---|---|---|
| Music home | tap a card | cards on squared paper: three games, five instruments, five songs | none of its own | nothing counted or locked; every card open | built, `music.html` |
| Echo the drum | hear a bar, tap it back on the drum; Play, which bars, slower and faster | the hand drum, the bar written, the count of eight, and the last echo drawn under the drum's | reading and keeping a rhythm; against a stated window | a bar comes round again until played back, with nothing lost; the drum rests after two quiet bars | built, `?i=echo` |
| Keep the beat | tap the drum with a song going round; which song, every beat, beat 1 or the words, one line round, slower and faster | the line's count with its words and marks, the drum, and the glockenspiel lighting the tune | the beat and the strong beat, and syllables as rhythm; against a stated window | marks clear when a line comes round, nothing added up | built, `?i=keep` |
| Make a tune | tap a square or play a bar; play my tune, the low drone, start a new tune, put it back | the glockenspiel with F and B lifted off, and the tune grid | making up, in the pentatonic scale; not marked | a tune is the child's, kept on the device, and never judged | built, `?i=compose` |
| Play an instrument | play; a song to be shown, a steady click, slower and faster | the drum, glockenspiel or piano at the size of the board | high and low, and a song's notes; pitch proved with no clock | nothing timed | built, `?i=play` |
| Play it back | hear three or four notes, play them back | the glockenspiel, with the notes lit as they sound and hidden when it is the child's turn | aural memory with the drawing as the second channel; pitch proved | a phrase comes again until played back | brief below |
| Find the note | step up and down the bars to land on the note the staff shows | the staff above the glockenspiel | steps and skips, reading the staff; proved | the dead end is shown, not scored | brief below |
| Meet the instruments | tap each drawing to hear it, and sort them by how they are played | the instruments on the shelf | how sound is made: struck, plucked, blown; proved on the drawing | no exercise that needs hearing | brief below |
| The song library | choose a song | the song sheet | a small repertoire, arranged for each instrument | public domain or ours, with the source said | five songs; brief below |
| Practice companion | go round a bar or a line, slower, count-in, a steady click | inside Keep the beat and Play an instrument | practising in small pieces | no minutes, no days in a row, no chart of time | transport built; brief below |
| What prints | print | the song sheet, rhythm cards, the chord chart, the child's tune | reading away from the screen | a printed page never shows a score | brief below |
| The grown-up's view | see what was played; mark singing and a real instrument | the parent's pages | the third tier, marked by a person | no score, no streak, nothing to compare children by | brief below |
| Where music lives | walk to the bandstand | the park in the worlds | none of its own | the map follows the lessons | proposal below |

### The transport

`createTransport` is pure. It is given a clock in milliseconds, a tempo, a meter, the pattern's length, cues at beats and a loop, and it hands each cue to `play` with the time it will be heard, a little ahead of that time. A page ticks it every 25 milliseconds and it hands over everything due in the next 120, so a late timer is covered. Times mean when a sound is heard: `web.ts` maps a time on the `performance.now()` clock to the audio clock through `getOutputTimestamp`, which pairs the two clocks at the speaker, and takes the reported output latency off by hand where an engine does not give one. `WebSounder.latency()` reads it. So a light switched on at a time and a note sounded at that time reach the child together, and a tap's `event.timeStamp` can be placed against the beat with `where(ms)`, which is the same arithmetic.

Two counts are kept. `count` goes up from the start and never folds, and `beat` is where that count is in the pattern after the loop has folded it. A tempo change takes effect from the first beat not yet handed to the sounder, so nothing already scheduled moves and nothing is heard twice. A loop the music is not inside is joined at the next whole beat. A count-in clicks before the music whether or not the metronome is on, and the first beat of a bar is accented by a brighter click rather than a louder one. The tests drive it with a timer that fires unevenly and check that each cue is heard once at its beat, that a loop comes round without a gap, that a tempo change moves nothing already handed over, and that `where` agrees with what is heard at every cue.

### Percussion

`hit.ts` declares three voices of a fifth kind: a struck skin, which is a sine starting half as high again as its note and falling onto it, and a band of seeded white noise. The drum's two strokes are two notes, `DUM` (45) in the middle and `TA` (57) at the edge, and the edge is brighter because its noise is louder, which is the difference between a palm and flat fingers. The click is a woodblock tick, brighter on the first beat of a bar. Letting go of a drum does not damp it. The tests render each voice and measure it: the skin settles on its note, the edge is brighter and shorter than the middle, the click is gone within sixty milliseconds, and eight hard hits in phase do not clip at the engine's level.

### The drawings

`handdrum` is a djembe seen from above and in front, with a skin wide enough for a hand, its rope laced to the waist, and "dum" and "ta" written where they are played. It is a playable part: the middle is a raised key inside the edge, and at the lesson size the middle is five squares by three. `countrow` is the count, a square a beat with a bar line after each bar, a fill for the beat being played, the child's taps drawn as distances with the window as a band, and the words under the beats. `tunegrid` is squared paper a tune is written on, a row for each bar of the glockenspiel with the high notes at the top, a column a beat, and each note a head with its letter on it. The glockenspiel's `off` lifts bars off the frame and draws their empty pins, which is what a music class does before a child makes up a tune. Each is on the Music shelf with its takes, its grouping and a still line in `animation.ts`; the glockenspiel draws exactly as it did when `off` is empty.

### The four built pieces

Echo the drum loops eight beats: the drum plays a bar and the child plays it back. Taps count for the child's bar from a window's width before it begins until beat 7.8, and the bar is judged then, against the beat the transport kept, by `judgeOnBeat`. When it matches, a new bar comes; when it does not, the same bar comes again and the guide says what happened ("The drum played 4 and you played 3. Listen again."). There are four versions, chosen and never unlocked: long and short, quick pairs, with a gap, and middle and edge, where the stroke has to match too. `test/echo.test.ts` holds it to named invariants and a seeded replay: every bar fills four beats and starts with the middle of the drum on beat one, which is what lets the lookahead sound the next bar's first hit before the judgement lands; two bars of a version with the same number of taps differ by more than the wider window; the same seed gives the same bars and no bar follows itself; a bar played back is judged right at 50, 80 and 140 beats a minute at either window, and a tap missed, doubled or well late is not; the round moves on only after a bar is played back; and the drum rests after two quiet bars.

Keep the beat plays a song from the library arranged for the glockenspiel, with a bass on its chords, round and round. The child taps the drum on every beat, on beat 1, or once for each word, and each tap is placed against the nearest of those beats and drawn under its square. A line's marks clear half a beat before it comes round again, so a tap a little early for its first beat is kept, and a second tap on a beat does not replace a nearer one. `test/keep.test.ts` checks that every song plans cleanly, that a tap just before the end belongs to the first beat round again, and, through the transport with a tempo change part way and a seeded jitter, that tapping on the heard beat marks every beat inside the window while the taps between the beats replace nothing.

Make a tune gives the child the glockenspiel with F and B lifted off and eight beats of the grid. A tapped square takes the note, the same note taps it off, and a bar played on the glockenspiel is written in the washed column, which then moves on. The tune goes round until it is stopped, with a low drone on C and G if the child wants one, and a change is heard the next time round. It is kept on the device as a line of letters, read back through `readTuneText`, so anything else in storage reads as an empty page. Nothing is marked.

Play an instrument is the drum, the glockenspiel or the piano at the size of the board, with any song in the library to be shown how to play through `follow`, a steady click on the transport, and slower and faster.

We played all four through in Chrome with real input at both sizes, with the sound on and with the sound off under reduced motion, and the echo was judged the same both ways. No child has played them yet. The window is the unmeasured one set out above, and the drum, the click and the shaker were measured by rendering rather than listened to on a tablet.

### Briefs for the rest

Each brief names what to build, where, what it needs, and what holds it. Every one keeps the bar above, and none needs a new voice or a new rule.

Play it back. On the glockenspiel in the home's scene frame, as `?i=back` in `src/pages/music-back.ts` with its rules in `src/sound/back.ts`. The page plays three or four notes on the transport, lighting each bar as it is heard, then hides the lights and waits; the child plays them back, and the bars light under the finger. A phrase comes again until it is played back, and a wrong note says which way to move, as `guide.ts` does. Versions: two bars a step apart, three notes of the pentatonic scale, four notes, and do to so. Pitch is proved with no clock, through `judgePitches`. It needs `follow`'s listening moved onto the transport, which removes its `setTimeout` lights. Tests: every phrase is inside the bars offered, the same seed gives the same phrases, the phrase advances only when played back, and a phrase played back is judged right whatever the timing.

Find the note. The glockenspiel under a staff, `?i=find`. The staff rings a note and the child moves a marker up and down the bars with step and skip cards until it lands there, which is `jump` in [games.md](games.md) with the number line replaced by the staff. It is a Music tab activity rather than a Games tab entry unless the owner lists it there. Proved on pitches. Tests are the jump mechanic's: winnable from every start, no dead end hidden, and random play rarely lands.

Meet the instruments. The drum, the glockenspiel, the piano, the ukulele and the guitar on the shelf, `?i=meet`. Tapping a drawing plays it, and the exercise is sorting them by how the sound is made (struck, plucked, pressed), which is answerable from the drawings. Naming an instrument from its sound alone depends on hearing, so we do not ship it as a marked exercise; it can be offered as listening with the grown-up as the marker. It needs the recorder drawn as a fingering chart before a blown instrument is on the shelf.

The song library. Five songs are written: Twinkle, Hot Cross Buns, Mary Had a Little Lamb, London Bridge and the tune of Ode to Joy, each public domain with its source said in `songs.ts`. The library should grow to about twelve, chosen so each sits inside the glockenspiel's octave in C, F or G, has words without exclamation marks, and is public domain in its tune and its words. Once the notation has a `song` node the library moves into content and `readSong` becomes its checker. Tests: every song reads, fits the glockenspiel in some key, and has a source of more than forty characters.

Practice companion. The transport already goes round a bar or a line, changes tempo while playing, counts in and clicks. What remains is the song sheet as the control: tapping a bar in the table from `music-song.ts` to go round it, and a second tap to extend the loop to the next bar. It keeps no minutes and no days, and the practice chart in [piano.md](piano.md) becomes a printed card of the bars to go round, with a place for a grown-up's tick for "played it to someone".

What prints. Four sheets, each drawn with `output: "paper"` on the 5 mm squares and checked by `check:print`: the song sheet (the table from `music-song.ts` with the first line on the staff), rhythm cards (every bar of one echo version, written and as beat track dots, eight to an A4 page), a chord chart (the song's chords as `chordbox` cards for the ukulele and the guitar), and the child's tune from Make a tune, as the grid with its letters. None shows a mark.

The grown-up's view. On the parent's pages rather than the child's: which instrument the child plays, the songs played, the last echo drawn as it was, and the tune written. The grown-up marks singing a song and playing it on a real instrument, which is a later event in [data-model.md](data-model.md), and sets whether a device starts with sound on. Nothing shown is a score, a count of rounds or a comparison with another child.

Where music lives. The park in the worlds is the music world, and the bandstand is its gate. We propose that the bandstand opens the Music home, and that the band arriving at the bandstand follows the music lessons finished, as the park's plans already say. The worlds are another agent's, so this is a proposal rather than a change.

What remains in the pieces built: the window has not been measured on children; the drum shows the pointer's focus ring after a tap, which a child may read as a mark; the song select in the tray is a browser control rather than a drawing; and there is no print of a tune yet.

## Open questions

- Whether the tempo a lesson plays at is a lesson setting or a child's control. We have it as the child's, on the grounds that a metronome nobody can slow down is a machine to fail against, but a grade four phrase written at a tempo has a reason to be played at it.
- Whether a performance is stored as evidence, and in what form. It is the first evidence in the product that is not an answer, it is small, and [parents.md](parents.md) would have to say what it is. The third tier needs it and the first tier does not.
- What happens on a device with no audio output at all, which is not the same as a muted one. We can detect the failure to create a context and should probably show the switch as unavailable rather than as off.
- Whether the lit ring and the pressed overlay should be one thing. They are drawn differently on purpose, but a child may not need the distinction, and two overlays per key is twice the ink.
