# Social

Status: built in `.scratchpad/social/` on 27 and 28 September 2026, with twenty-six Instagram posts
and seven reels. This document says what we post, how it is made and how it grows to LinkedIn and X.
The working rules for anyone making posts are in `.scratchpad/social/BRIEF.md`.

## What a shoot is

A shoot is a scene the studio can draw at any size, not a picture it crops. Most of what we would
post is already drawn in code on 5 mm squares, so the renderer asks the scene for the frame it needs
(4:5 for the feed, 9:16 for a story) and the scene lays itself out on whole squares at that size. Only
the apps are photographed, because a screen is only honest as the screen, and those shots are placed
on a plate rather than stretched to fill a format they were not made for. We chose this over
galleo's approach, where every surface is captured and then cropped, because a crop of a drawing loses
the grid it was drawn on, and because it lets LinkedIn and X take new sizes later without a second set
of captures.

Every slide stands on the map, as every page of the product does. `map.mjs` aims the product's own
MapBackdrop at a world, through the harness `npm run map:snapshots` builds, and draws it at each
format's size; a post names the world it stands on, text sits on a taped card, and drawings on a
taped sheet of squared paper drawn in to their size, so the map shows round them. The covers keep one
lockup and stand on different worlds, so the profile grid reads as one set without repeating.

One square is 20 CSS px, as in the product, rendered at a device pixel ratio of 1.5, so a square is 30
device px. That divides 1080, 1350 and 1920, so the feed is 36 by 45 squares, a story is 36 by 64, and
the page's grid lands on whole pixels in both. The map is the one full-bleed surface; it is drawn per
format in a window of that shape, so a story gets a taller map rather than a stretched one.

## Series

Each series is a source of posts rather than a schedule. The owner picks which post goes out and when.

| Series | What it shows | Built so far |
|---|---|---|
| The country | the map, a world at a time, and the path to the island | `the-country`, `fly-the-paper-plane`, `lanterns-along-the-road`, the `across-the-country` reel |
| The worlds | the twelve worlds, three a year, and one world up close with its moment, secret and rare sight | `twelve-worlds`, `the-harbour-up-close`, `the-railway-up-close`, the `moments` and `the-lighthouse-is-lit` reels |
| From the shelf | the drawings, the creatures that recur, the nine subjects, how a drawing moves | `the-creatures`, `nine-subjects`, `everyone-in-the-drawings`, the `the-shelf-wakes` and `nine-subjects` reels |
| On squared paper | a lesson on screen and the same lesson printed | `on-paper`, `a-map-for-the-wall` |
| Games | one game at a time, with the maths each level asks for | `rope-swings`, `fetch-with-the-pups`, the `four-games` reel |
| For grown-ups | a day, what the product refuses, the home page | `what-we-leave-out`, `a-day`, `the-guide-points`, `three-levels`, `plan-the-week`, `two-grown-ups`, `a-childs-own-view`, the `a-day-in-four-lines` reel |
| Subjects | one subject at a time, by the principle it is built on | `music-on-the-page`, `science-the-drawing-is-the-apparatus`, `reading-with-pictures`, `coding-that-runs` |
| Characters | Charlie, with her poses, moods and games | `meet-charlie` |
| How it is made | the notation and the check of every value a question can take | not yet, and mainly for LinkedIn |
| Paint | mixing like real pigment, the colour wheel, responding rather than marking | `paint-that-mixes` |

The material is large. There are 618 drawings on the shelf, 38 worlds each with a moment, a secret
and a rare sight, 24 games and 336 lessons, so every series can run for months without repeating.

## Formats

- Instagram feed: 1080 by 1350 (4:5). The profile grid crops covers to 3:4, so nothing that matters
  sits within a square and a half of either side.
- Instagram story: 1080 by 1920, with type kept inside the rows from 270 to 1650 device px, since
  Instagram's own controls cover the rest. The story frame is also a reel's cover.
- Reels: 1080 by 1920, 30 frames a second, H.264 in yuv420p without B-frames. A reel is recorded by
  seeking the page's clock frame by frame (`engine/ui/animate.ts` with `?animdebug`, and the logo's
  CSS animations paused and set), so the same reel comes out on every run.
- LinkedIn, built: document posts, each a PDF of feed slides (1080 by 1350, the page size LinkedIn
  recommends) taken from any post and ended on a LinkedIn closing page, with the company page's
  cover image (1128 by 191, drawn at twice that) and its details. Nine documents so far, reusing the
  Instagram scenes, plus one made for LinkedIn on how every question is checked.
- X, planned: single 4:5 images, because X crops every image after the first in a post, so a carousel
  becomes one frame or a thread of single images.

A new format is one line in `formats.js`. Every layout reads its size from there, and any slide can
be rendered at the new size without being captured again, except the map, which is captured per
format.

## Copy

Captions are written for search and for sending on: the first line says what the post is about in
words a parent would search for, the body explains without hype, and the close says where to go
next (the link in the bio). Copy gives the age range as 5 to 12, for grades one to six as offered today, and avoids
lesson counts and year counts that go stale as grades are added. Instagram gets five hashtags.
LinkedIn and X get their own copy, written for their readers, with no hashtags and no link in the body.

Every claim is checked against the code or these documents before it is written, and the brief lists
where each one in the first slice comes from. A slide never shows a child's name, work or face; the
only child on any frame is the sample child from `/home`.

## Order of work

1. The owner reviews the first slice in `review.html`, chooses the posts to publish, and edits the
   captions.
2. Fix the two scratchpad faults the slice found: lesson scenes drawn without some of their drawings,
   and the Worlds tab failing to load, so a printed sheet and a world roll can be photographed.
3. Record the paper plane's flight over the country as a reel, on the same harness `map.mjs` uses.
4. Record a game as a reel with the game's clock stepped, starting with the rope swings.
5. X's single images, with their own manifest and copy.
6. A download path from a phone, as galleo's studio has, since reels are posted from the mobile app.
   The review page already opens a post as a carousel and downloads a post's zip on a laptop.
