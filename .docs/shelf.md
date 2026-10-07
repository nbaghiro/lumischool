# The shelf

Status: measured and proposed on 13 September 2026, with a proof set built in the scratchpad. This document looks at the art shelf as the groundwork everything else is drawn from. It measures the shelf drawing by drawing, sets out the bar a drawing is held to and names the drawings below it, lists where the shelf is inconsistent and what the apps, lessons and worlds ask for that it does not have, and then proposes the kit: the small set of building blocks every later drawing is made from, with a style guide for drawing to it. It ends with a ranked plan and with what the second phase builds once the shelf has moved into `engine/parts/`.

The first phase, which this document reports, built three drawings on the shelf as a proof of the direction: one person in any look and pose, a set of ten icons for the apps' own controls, and one picture for an empty page. They are in the scratchpad because the shelf still is. Nothing else on the shelf was changed. The second phase builds the rest of the plan straight into `engine/parts/` and is described at the end.

It is written against [animation.md](animation.md), whose rules for motion it keeps, [brand.md](brand.md), whose lantern set the single-stroke line the kit uses, [audit.md](audit.md), whose sections 6 and 8 rank the drawings that would let harder questions be written, and [structure.md](structure.md), whose "The order from here" decides when each part of the plan can be built.

## Where it lives

| File | What it holds |
|---|---|
| `engine/parts/people/person.ts` | `person`, the kit's figure: a child, a grown-up or an older person in seven poses, six skin tones, eleven heads of hair, glasses, a hearing aid or a cochlear implant, a wheelchair, forearm crutches or a walking stick, and eight faces. `describePerson` is what a screen reader says for one, and its `describe`. It moved to the root on the drawing contract (15 September 2026), with the figure's construction beside it in `figure.ts` (the build by age, the head, hair and face, hands, arms, legs, the aids, and `placePerson`, which draws one at another size inside a group drawing), and its rules in `engine/parts/people/__tests__/`. |
| `engine/parts/apps/icon.ts` | `icon`, the apps' controls as one drawing with a `name`: home, journal, pictures, map, print, settings, back, sign out, add, help and sound. `ICON_LABEL` is the word each one sits beside. It moved to the root on the drawing contract (15 September 2026), with its tests in `engine/parts/apps/__tests__/`. |
| `engine/parts/apps/newbook.ts` | `newbook`, the picture for an empty page: a new exercise book with a pencil and a sprig, blank, named or open at its first page. Its description is its own `describe`. It moved to the root with the icon. |
| `.scratchpad/src/art/catalog.ts` | A new section, "The kit", holding the three drawings and their twenty-four takes. |
| `.scratchpad/src/art/shelf-groups.ts` | A new shelf, "The apps' own drawings", and a line for each of the three. |
| `.scratchpad/src/art/animation.ts` | The person's declaration (idle, a blink and a waving hand), and the new shelf's default, which is still. |
| `engine/parts/people/__tests__/person.test.ts` | The person's rules as tests: boxes in every pose, age and aid, every look one of the declared settings, descriptions that never name a feeling, and no em-dash or exclamation mark in any of it. The icon's and the empty page's rules are in `engine/parts/apps/__tests__/`. The scratchpad's `test/kit.test.ts` is gone. |

In phase 2 each drawing moves to a file of its own under `engine/parts/`, and the kit's shared construction (the figure, the palette's skin and hair values, the calm line) moves with it; the section on phase 2 says where.

## The shelf today

The shelf held 489 drawings when this work started and holds 492 now: 464 drawn in code and 25 hand-drawn files, in 41 sections of the catalogue, with 1,433 takes between them. Every drawing has at least two takes; 181 have two, 204 have three, 83 have four and 21 have five or more. 351 appear in at least one lesson and 138 in none. By the resolver in `src/art/animation.ts`, 76 have a motion of their own, 280 move by their shelf's default and 133 are still, each for a stated reason.

We measured it the way the shelf page draws it. A script opened the shelf in headless Chrome through the DevTools protocol, rendered every drawing's first take on screen and on paper, and read the stroke widths, colours and text sizes off the SVG. It then laid every shelf out three ways and photographed each: as the shelf's tiles (a drawing fitted into 150 by 110 pixels, which is how a card or an app shows it), at question size (20 pixels a square, which is how a lesson shows it) and in ink on white with the print grid (which is how it prints). The contact sheets and the script were kept in the session's work folder, outside the repository.

| Shelf | Drawings | Takes | In a lesson | Own motion | Shelf default | Still |
|---|---|---|---|---|---|---|
| Science | 64 | 211 | 63 | 1 | 58 | 5 |
| Outdoors and nature | 38 | 93 | 15 | 11 | 20 | 7 |
| Animals | 35 | 78 | 22 | 22 | 13 | 0 |
| Getting about and maps | 31 | 69 | 17 | 8 | 18 | 5 |
| Counting and number | 27 | 92 | 22 | 4 | 20 | 3 |
| Buildings and places | 27 | 59 | 12 | 5 | 0 | 22 |
| Art and painting | 24 | 66 | 23 | 0 | 10 | 14 |
| Notes, stickers and answer boxes | 21 | 70 | 5 | 8 | 12 | 1 |
| Sport and games | 18 | 53 | 4 | 2 | 14 | 2 |
| Shapes, angles and space | 17 | 60 | 13 | 0 | 14 | 3 |
| Music | 17 | 61 | 14 | 0 | 3 | 14 |
| Coding | 17 | 50 | 17 | 0 | 15 | 2 |
| Food and the kitchen | 16 | 51 | 15 | 5 | 9 | 2 |
| At home and at play | 15 | 37 | 6 | 8 | 6 | 1 |
| Writing | 15 | 35 | 15 | 0 | 2 | 13 |
| Charts, sorting and chance | 13 | 41 | 7 | 0 | 12 | 1 |
| Stories and things to read | 13 | 31 | 12 | 0 | 1 | 12 |
| Letters, sounds and words | 13 | 40 | 13 | 0 | 0 | 13 |
| Fractions, decimals and percent | 10 | 38 | 10 | 0 | 10 | 0 |
| Time and the calendar | 10 | 35 | 6 | 0 | 7 | 3 |
| Money and shopping | 10 | 32 | 9 | 0 | 8 | 2 |
| Sums and missing numbers | 10 | 29 | 7 | 0 | 8 | 2 |
| Tens and ones | 9 | 34 | 8 | 0 | 9 | 0 |
| Measuring | 9 | 32 | 8 | 0 | 4 | 5 |
| Puzzles and patterns | 6 | 20 | 5 | 0 | 5 | 1 |
| People and feelings | 4 | 16 | 3 | 2 | 2 | 0 |

The catalogue's own sections, which are closer to the families the drawings were made in, run from 60 drawings in "Physics and chemistry" and 47 in "Places and creatures" down to two in "Teacher's pen" and one in "Where the child answers". Hand-drawn files are the ones most likely to move (19 of 25 have motion of their own, most of them in "The cast" and "Hand-drawn objects"), and the reading, writing and music families are almost all still, because they are read.

The maths shelves are the strongest part of the shelf. Ten frames, bonds, number lines, bar models, the hundred square, towers, the balance, the coordinate grid and the tools that measure are drawn at the ruler level, read cleanly at question size and print well, and they share a construction: things counted sit one to a square, and marks fall on the grid. The buildings and vehicles are the next strongest, drawn as flat front elevations with one marker to a wall and printing as clean hatches.

## The bar

"The highest beauty bar, in the house style" needs a working definition before a drawing can be held to it. We use eight tests, drawn from the shelf's own best drawings and from the sources at the end.

- It is a specific thing. A basket of apples is woven and has a handle; a jug has its scale on the outside. A drawing that could be any object of its kind is below the bar, because children transfer what they learn from a drawing more readily the more it resembles the real thing (Strouse, Nyhout and Ganea, 2018).
- It reads at every size it is used at: a tile of about seven pixels a square, a question at twenty, and a printed sheet at five millimetres. A detail that disappears at the smallest size is either redrawn for it or left out.
- It is drawn in one hand: the seeded pen, a line weight that follows the role of the line rather than the size of the drawing, the roughness that suits its size, and the one palette.
- Its silhouette is clear, and whatever a child counts or compares is plain: identical shapes with space round each, no faces or texture on a counted thing, nothing decorative touching it (Kaminski and Sloutsky, 2013; McNeil and others, 2009).
- It prints in ink without turning to grey, and every colour a question depends on survives as its hatch or as a written name.
- It has warmth where warmth belongs, in people's faces and gestures, and nowhere near a value a child reads.
- It describes itself to a screen reader, saying what is seen and never giving the answer away.
- It moves, if it moves, by the rules in [animation.md](animation.md), and it is complete when it is still.

## What falls below the bar

People are the thinnest part of the shelf and the part most in need of the kit. The people shelf holds four drawings (`children`, `heads`, `face` and `skater`), and at least seven more drawings draw a person with a helper of their own: the winner on the podium and the jumper in `sports.ts`, the runners on the race track seen from above, the passengers in the bus and train windows, the children in the comic and on the story map through `kid()` in `story.ts`, and the profile head in `light.ts` that `seeing` and `periscope` share. None of them shares a construction with another. Every face is filled with the paper colour, the children in a row differ only in the colour of their shirts, and arms and legs are single pen lines, so people are the one family on the shelf that reads as a placeholder beside the animals and the buildings around it. We propose one figure for all of them, built from a head, a body and limbs that have width, with a skin tone from a scale of six, a hair style from a set of nine (or a bald head, or a headscarf), and glasses, a hearing aid or a mobility aid as settings rather than as separate drawings, so that a child who uses a wheelchair can appear in any line-up a lesson draws. That figure is `person`, built in phase 1.

The other drawings below the bar, with the reason for each:

- `animals`: the sheep are faceted blobs that read as rocks, with heads that do not join their bodies.
- `mice`: too small to read at question size; the mouse is a smudge with a tail.
- `seal`, `geese`, `dolphins`: scribbled hatching in place of a shape, so the animal has no clean silhouette on screen and turns grey on paper.
- `eagle` and `camel`: heavy, stiff outlines and legs that do not carry the body; on paper the tang cross-hatch turns both nearly black.
- `bumblebee`, `fox`, `seaturtle`, `fennec`: fine on screen, but in ink the glow dots and the tang cross-hatch sit on top of the drawn stripes and spots, and the animal prints as dark texture with its features lost.
- `glowworms` and `manta`: abstract; neither is recognisable without its title.
- `cloud`: a flat bumpy slab, and one of four different ways the shelf draws a cloud (`cloud`, the day sky's clouds, the water cycle's `cloudShape` and the rainbow's puffs), with a fifth painted by the worlds.
- `moon`: a dashed half circle that reads as a diagram of a phase rather than as the moon.
- `crops`, `frogcycle`: their parts are too small to read at question size.
- `volcano`: a flat grey triangle with two orange stripes.
- `strokes.hills`, `strokes.sun`, `strokes.bunting`: pressure strokes at three to four times the shelf's weight, a different hand from everything round them.
- `excalidraw.house`: dropped on 19 September 2026, by the owner's decision of 16 September, since nothing drew it. It was a sample drawing that carried its own label ("house for 4 people") and a child's scribbled sun.
- `tablet`: drawn as a monitor on a stand, so it reads as a desktop computer rather than the tablet a family sets up.
- `sledge`: thin and faint beside the other vehicles.
- `arcade.road`, `arcade.ground`: game pieces that read as diagrams on a shelf of pictures. They belong to the games and are not about anything, which is acceptable for game furniture but should be said on their shelf lines.
- `cake`: a plain slab with candles, weaker than the cake on the hand-drawn birthday table beside it.
- `postcard`, `comic`: exclamation marks in child copy ("this morning!", "Woof!" and "You found it!"), in their defaults and their takes. `ribbon`, which carried "Well done!" and "Go!", was dropped on 19 September 2026 by the owner's decision of 16 September, since nothing drew it.
- Twenty-two drawings write text below 11 units, which is 2.75 mm printed and under 8 point: `protractor`, `money`, `postmark`, `howto`, `contents`, `lane`, `prism`, `beam`, `bands`, `globe`, `parachute`, `wrapped`, `cabbage`, `variable`, `longjump`, `weatherstation`, `sundial`, `picsteps`, `stamps`, `rubbing`, `stencil` and `sunprint`. The protractor's inner scale is the worst case, and it is also the drawing the audit asks to be redrawn.
- `arttools` prints a colour (`#F2D3A2`, a pencil's wood) on the ink-only sheet; it is the one drawing whose paper output is not ink.
- No drawing describes itself. `render()` gives a drawing's SVG no role and no name, and the scene renderer gives a whole scene `role="img"` with no name, which a screen reader announces as an unlabelled image. This is below the bar for every drawing at once.

## Where the shelf is inconsistent

Line weight. The pen's default is 1.8 units, and the median stroke by shelf runs from 1.2 (animals, outdoors, places, time) to 2.0 (sums, art). Animals and outdoors draw 16 and 11 per cent of their marks thinner than 0.8 units, which is 0.2 mm printed and near the limit of a home printer, and twenty-two drawings have more than a quarter of their marks that fine (among them `mice`, `crops`, `dolphins`, `seal`, `octopus`, `starfish`, `citywalls` and `glowworms`). The hand-drawn files draw at 2.8 and the stroke files at three to four times that. The deeper cause is that most coded drawings multiply their stroke widths by the same scale as their geometry (`strokeWidth: 2.2 * s + 0.4`), so the same kind of line is a different weight in a small drawing and a large one, and a tile that fits a small drawing up makes it heavy and a large drawing down makes it faint.

Roughness. The three levels (ruler 0.35, pencil 1.0, doodle 1.9) are the same for a 30-unit head and a 300-unit hill, but rough.js's wobble is a fixed distance, so on a small shape it is a large share of the shape. The pencil's double stroke turns a cheek or a sleeve into fur at the sizes figures and icons are drawn at. The brand's lantern already answered this with one stroke to a line and the roughness turned down, and the kit adopts that answer as a fourth level, calm.

Scale on the grid. There is no rule for how much of the world a square holds. A mouse, a cat and an owl are drawn at whatever size suited their file, the shelf's tiles fit every drawing to the same box, and a lesson placing two of them together has to guess. The kit fixes a scale for people (a child is five squares tall, a grown-up about seven) and proposes that everything a person handles is drawn to that scale.

Faces and eyes. We counted ten ways the shelf draws a face or an eye: `faceAt` in `speech.ts`, the separate inline face in `children`, the smileys in `heads`, `pip()` for the dog, rabbits and mice, `eye()` in `nature.ts`, the side-on eye with a blue iris in `light.ts`, the ringed eyes of the writing track's creatures, the large ringed eyes of the hand-drawn cat and owl, the guides' faces, and the smiley sticker. Eyes are solid dots, dots in rings, rings with pupils or side-on almonds, and only the profile head in `light.ts` has a skin colour, which is tang hatching.

Perspective. It is mostly consistent within a family and written down nowhere. Buildings and vehicles are flat front elevations, cubes and solids are oblique at 45 degrees, containers show an elliptical top, maps and tracks are seen from above, and the exercise book lies flat and is seen from above. The kit writes these down as rules.

Palette. 42 drawings use colours outside the palette. Twenty-one are the painting shelf's real paint colours, which [art.md](art.md) chose on purpose because paint has to mix like paint. The rest are drift: the guitar and ukulele's woods, the science shelf's indicator colours and rust, the coding shelf's magenta, amber and four pale greys and blues, the tape's cream in four drawings, and the dot guide's near-black. On paper the berry hatch runs at 0 degrees and ink-soft's at 90, parallel to the grid's own lines; we have not printed a test, but the risk is that both merge with the grid on a home printer.

Since then, on 17 September 2026, the maze, the turtle and the pixels were redrawn on palette tokens (the art shelf's batch 4.17), which takes out of the count above the greys their grid lines printed in (`#9A9A9A` and `#8A8A8A`), the turtle's target line (`#D0D0D0` on paper and `#DCEBF7` on screen) and the maze's rock (`#C9D1DA` on screen and `#D6D6D6` on paper). What is left of the coding shelf's drift is the magenta the blocks, the cups, the program and the variable draw on screen (`#C2185B`), the lamp's amber rays (`#E0A800`), and the pale washes of the fork, the lamps and the stage (`#E9EEF3`, `#E7EBF0` and `#EAF4FB`). The 42 has not been counted again.

The pieces of the world. Clouds are drawn four ways and painted a fifth, leaves four ways, trees at least five and water at least five, each by the family that first needed one. This is the clearest case for a kit: the pieces are small, they recur in every world, and a world assembled from five kinds of tree does not read as one place.

## What the apps, lessons and worlds ask for

The evidence is the documents' own wish lists, the worlds' `wants`, and what the apps and pages draw for themselves because the shelf has nothing to give them.

The audit's harder questions wait on drawings. Section 8 of [audit.md](audit.md) lists them: a protractor with degree ticks or with neither arm on zero, an L-shape that can hide a side, a change line and a percent bar that can hide their labels, a number line labelled in fractions, a ruler in millimetres, a caption strip that wraps, a codepad that can lock a tray block's number, and the clue picture its section 6 ranks sixth. Section 6 also ranks cube buildings seen from a corner, stepping stones across a river, a number balance with pegs, a pond food chain and a garden bed on a grid.

The subject documents add their own. Reading asks for a phrase-cued sentence, an index and a glossary, a play script and a dictionary page ([reading.md](reading.md)); writing for letter joins and a poster, and an oven with a window and a timer ([writing.md](writing.md)); physics for sound fading with distance, a marble down a track, the sun, the earth and the moon from above, shapes falling through a tank, magnets through materials, shadows the shape of the thing and circuit bench pieces ([physics.md](physics.md)); chemistry for weathering on the rocks or the strata ([chemistry.md](chemistry.md)); the curriculum for a food chain, weather symbols and a chart, the five senses and the body, a hen and chick life cycle and a river crossing ([curriculum.md](curriculum.md), [tracks.md](tracks.md)); music for a pedal mark, a practice chart and a child at the keyboard ([piano.md](piano.md)); coding for a child's own character on the stage, a garden robot, a traffic light and a parcel ([coding.md](coding.md), [activities.md](activities.md)); and art for a sketchbook page and a frame for the child's own painting ([art.md](art.md)).

Every world names two drawings it wants and does not have, 21 worlds and 42 drawings, from the meadow's stile and hedge to the old city's fountain and storks. Worlds also declare seasons that nothing on the shelf draws ([journal.md](journal.md)), and [motion.md](motion.md) asks for parts the drawings do not yet separate (the owl's eyes, the bus's wheels, the chimneys).

The apps have the sharpest needs, because they are about to be rebuilt in Solid (step 5 of the order in [structure.md](structure.md)) and their drawings will come from `engine/parts/`:

- Picture keys, three drawings in order from a grid of nine, were to be how a child on a shared tablet opened their own journal. The owner dropped them with the tablets (14 September 2026): a grown-up opens a child's view and the family PIN leaves it ([auth.md](auth.md)), so the apps need no picture keys and no grown-up gate.
- A child's picture on the switcher and the family page comes from `pictureOf` in `src/bridge/art.ts`, which cycles four creatures, so a fifth child gets the first child's picture, which [auth.md](auth.md) rules out.
- Controls are words, emoji and Unicode. The journal's tools are ✋, ✏️ and 🖍️, undo is ↶ and zoom is − and +; the parents' pages mark a wrong answer with ✕ and navigate with ←, ‹ and ›. There is no icon anywhere in the apps.
- Every empty state is a sentence ("No children yet", "Add a child first", "Nothing has been sent yet", "Ask a grown-up to set this up"), and there is no loading state at all.
- The world behind the sign-in page is the meadow, painted by `worldBehind` with its sky, ground and grass drawn inline rather than from the shelf, and the meadow's `wants` are exactly its missing pieces: a stile and a hedge.
- The parents' pages redraw in CSS what the shelf has or should have: tape, photo corners, a fridge and its magnets, a planner's rings, an envelope and a stamp.

## The kit

The kit is the set of pieces every other drawing is made from. A piece is small, drawn once, takes its variety from settings, and is placed at its own scale so its line weight holds. A drawing built from the kit (a word problem, a world, an empty page) composes pieces rather than drawing its own person, tree or cloud.

People. One figure (`person`, built) for everyone a question or a page is about. It is a child, a grown-up or an older person, drawn to school-age proportions rather than a toddler's: a child's head is a quarter of their height and a grown-up's about a fifth. It stands, waves, points, holds something out, thinks with a hand at the chin, raises both arms or sits on a stool. Skin is one of six tones, hair one of nine styles in six colours or a bald head or a headscarf, and glasses, a hearing aid or a cochlear implant, a wheelchair, forearm crutches or a walking stick are settings. The wheelchair is a child's own active chair seen from the side, a rigid frame with no push handles, big rear wheels with push rims and small casters, with the child's hand on the rim, because that is the chair a child who uses one uses, and the crutches are forearm crutches with a cuff below the elbow. Clothes are plain and no colour is tied to a gender. Groups (a line-up to share between, a queue, a family, a comic's cast) are compositions of the one figure; they are the next pieces to build, and they replace the ten inline figures listed above.

Hands. A hand counting on its fingers from one to ten, a pointing hand and a hand holding a pencil, drawn in the person's tone or as an outline when it belongs to nobody, as the hand guide already is. Counting on fingers is the first picture of number for a five-year-old and the shelf has none.

Faces. The kit's face is drawn with the figure, and `face` becomes a close-up of the same head, so the eight feelings a reading lesson asks about have skin and hair and are the same people the child meets elsewhere. The feeling is in the brows and the mouth, as [reading.md](reading.md) requires, so it survives print.

Foliage, water, sky, weather and ground. One leaf with a species setting, one tree with a species and a season, one cloud, a sun, a moon with its phase, rain, snow, wind and fog, a water surface with a wave line and ripples, stepping stones, grass, a hedge, a path, sand and snow on the ground, and the time of day as a setting of the sky rather than a separate sky. These replace the four clouds, four leaves and five trees and waters, and they are what the world behind the sign-in page and every world are painted from.

Containers and everyday objects. A jar, a box, a bag, a basket, a cup, a bowl, a bottle and a tub, each sized by what it holds so that a jar of twenty sweets always fits twenty, which is the class of defect the audit found in the bus; and the objects a child's day is made of (a pencil, a book, scissors, a glue stick, a plate, a spoon, a coat, a bag), drawn to the figure's scale.

Frames, tape and stickers. Three tapes (clear, cream and patterned), photo corners, a card with a clip, a frame for a child's painting and a polaroid, and quiet stickers: a star, a tick, a leaf and a "part done" mark. These are what the parents' pages now draw in CSS and what the painter's hut asks for.

The apps' own drawings. The icon set (ten built, about twenty-two needed), a set of at least twelve child pictures with a picker, the empty-state and first-visit pictures (`newbook` built), a loading picture that is a pencil drawing its line, and a picture for being offline with the work saved on the tablet.

Seasons and times of day. Settings on the tree, the ground and the sky, so a world in winter or at dusk is the same world with different settings, and a lesson can ask which season a picture shows.

## Clothes and Charlie (26 September 2026)

The figure kit in `engine/parts/people/figure.ts` now dresses a person as well as shaping them. A top
is white or one of the five markers, with long sleeves, short sleeves or none (a small frill at the
shoulder), and may carry a bear, a star, a heart or a flower on its front. Below it a person wears
trousers, a dress, a skirt or shorts, in grey, white or a marker, plain, striped, spotted or in rainbow
stripes, with legs in leggings or bare, and shoes, bare feet or yellow wellies. Hair gained a fringe,
a ponytail and bunches, and poses gained a balance with the arms out and a jump. Every setting is on
`person` as well, and a person with none of them set is drawn as before.

A rainbow is the one pattern that uses all five markers on one thing, where a thing otherwise carries
at most two. It is decoration and not a category a question tells apart, and on paper it prints as
the lines between its bands with the card under them, so it never becomes five hatches.

Charlie (`engine/parts/people/charlie.ts`) is the first named character on the shelf: a small girl
with long fair hair and a fringe, first drawn from a doll in a white sleeveless top with a bear on it
and a rainbow skirt. Her look is fixed and her clothes, pose, mood and the way she faces are
settings, so a game, a lesson or a world can dress her for itself. Each pose that is itself a
movement is drawn inside a part that moves it: she hops when she cheers or jumps, wobbles when she
balances and bobs as she walks, and her loose hair and her skirt swing a little behind her. Her
description names what is seen and never the feeling, and drops what is on her feet, then the words that say
she is a girl, then the print on her top, when it would run past thirty words.

Charlie gained a `hang` pose on 27 September 2026 for her rope swings: both arms straight up, as she
holds a rope, with no movement of its own, since the game swings her. It is a pose of the figure kit,
so any person can hang too.

## Rope swings (27 September 2026)

Three drawings on the outdoors shelf carry Charlie's rope swings. `swingrope` is a thick twisted rope
with a loop at the top and a fat knot near its frayed end, as long as a setting says, with a small
white tag that can carry a number. `swingbranch` is the bough the ropes hang from, thick where it
leaves the trunk and thin at the tip, with its underside level so every rope is tied at the same
height. `streambank` is the ground at the edge of water, seen from the side: grass along the top,
earth with pebbles below, and a bank that slopes a square out into the water or, for a ravine, a
rocky cliff that drops straight. It is filled with paper under its hatching, so the water it stands in
does not show through, and it is as deep as a scene needs, so a game can run it to the foot of its
world. The bridge's plank and sack stay on the shelf though no game uses them now.

## The Pup family (26 September 2026)

The Pup family (`engine/parts/animals/pupfamily.ts`) is a family of four dogs who stand on their hind
legs, drawn as one drawing with the member as a setting: Rufus the dad, a tan dog with long grey floppy
ears; Maple the mum, curly and yellow; Pip, the older pup, a white terrier with pointed grey ears and a
patch over one eye; and Dot, the youngest, white with black spots and short black floppy ears. They are
our own characters, asked for as a family of cartoon dogs and deliberately unlike any family on
television in their breeds, colours and names. Each stands, waves, sits, walks, jumps or cheers, and
for Fetch with the pups also runs flat out, leaps with its legs stretched behind, paddles, carries a
thing home in its paws or shakes off water in a spray of drops, with five faces told by the mouth;
their eyes blink and their tails wag, a wave waves, a cheer or a jump hops, a walk bobs and a shake
shivers, each drawn inside a part of its own. A run, a leap, a paddle and a carry face the way `dir`
says. The feet anchor stays on the floor in every
pose, so a scene stands them on a line. The wooden toy block they build with is `woodblock` on the
home shelf.

## The wolf (27 September 2026)

The wolf (`engine/parts/animals/wolf.ts`) is a grey wolf on his hind legs with pointed ears, a long
snout and a big bushy tail, drawn for the pups' building game after the wolf of the three little pigs.
He stands with a sly grin, breathes in with his cheeks puffed and his eyes shut, blows with a round
mouth and three lines of breath, or walks; his eyes blink and his tail sways. `dir` turns him to face
and blow either way. He and `woodblock` stay on the shelf now that the pups' game is Fetch with the
pups, which uses neither.

## The pups' park (27 September 2026)

Fetch with the pups is played in a park drawn from the shelf. `fetchtoy` (sport) is the thing thrown:
a yellow tennis ball with its seams, a blue frisbee seen edge on, or a forked stick. On the outdoors
shelf, `parkhill` is a smooth grassy or snowy mound whose slope is `hillAt` in its file, so the game's
ground and the drawing agree; `parkslide` is a ladder, a railed platform and a pink chute, its shape
given by `slideShape`; `parkbench` is a slatted bench with its seat at `BENCH_SEAT`; `parkbush` is a
round leafy bush with a few berries; and `parkfence` is a picket fence, low or tall, which can have two
boards broken short at the bottom to leave a hole `FENCE_HOLE` of its height. `arcade.ground` takes
`snow` for a snowy strip.

## The sound train's pieces (26 September 2026)

`soundwagon` (letters) is a flat wooden wagon a carriage's length, standing on the yard's rail, that
carries one sound of up to three letters on a big card; the sound train pushes it along and couples it
on. `railbank` (travel) is a stretch of line that leaves the level, over a hump, down into a dip or up a
ramp, with its rise and length as settings; the shape is `bankHeight` in `engine/motion/rail.ts`, so the
drawing and the rolling agree. The `railway` gained a `bank` setting, the squares of grassy earth under
it, for a line on raised ground beside a ramp; at nought it is drawn as before.

## The hump yard's board (27 September 2026)

`sidingboard` (travel) is the sign at the end of a siding, on one short post beside the buffer stop:
the siding's letter in a yellow ring, what the siding wants (a number its wagons must add up to, the
order they must stand in, or the word spare), and on a line under it what the siding holds so far, with
a tick once it is made up. The shunting yard's old lift, pit and order board (`liftpit`,
`orderboard`) were deleted with the yard they served. `yardlever` is back on the shelf, as the points
lever the yard is now worked by. `railcurve` (travel) is a lead that bends down in an S from a higher
siding to the main line, rail and sleepers on ballast with no grass of its own, in the same S as the
rail module's ramp, so a fan of sidings seen from the side reads as tracks parting at the points.

## The pony (27 September 2026)

The pony (`engine/parts/animals/pony.ts`) replaces the unicorn, which was drawn in one heavy outline
and read as rough at a game's size. It is drawn the way the Pup family is, with round-ended legs, an
oval barrel and a few firm lines, seen from the side in nine poses: standing, three beats of the
canter, the gather before a jump, the push off, the air with the legs folded, the landing and a sudden
stop with the forelegs braced. The coat is chestnut, palomino, grey, pink or blue, and `horn` makes it a
unicorn. Every pose keeps the same box and the feet anchor on the floor, so a game moves the whole box
along its own arc, and the eyes blink, the tail swishes and the head nods on a page. The show jumping
upright, `jumpstand`, gained a red or white flag on top, and the water tray was deleted, since Clear
round now draws its water jump as water.

## The lemonade stand (27 September 2026)

`lemonadestand` (food) is a stand seen from the front: a wooden booth under a striped awning with its
name on a board above, a lemon and its price painted on the front, and a long plank counter running on
from it on trestles, as long as a setting says; `STAND_ROOF` says how high the board stands over the
counter, so a game can put someone under the awning. `pitcher` (food) is a tall glass jug with its
spout to the right, its handle to the left and a slice of lemon on the rim, and `lemoncup` (food) a
straight-sided tumbler marked in halves, in quarters or in millilitres. Both are drawn empty, and
`PITCHER` and `LEMONCUP` say where their insides are, so a game draws the drink inside and pours it.
The market stall's drawings (`stallcounter`, `coindish`, `garment`, `clothesrail`) stay on the shelf;
the lemonade stand still uses `coindish` for the dishes on its counter.

## Pocket pool (27 September 2026)

`pooltable` (sport) is a small pool table seen from above: coloured cloth (mint, sky or berry) inside a
wooden rail, with round dark pockets at the corners and halfway along the long sides. It is an oblong
or an L with its top right cut away, and `tableOutline` and `tablePockets` in its file are the
cushions and pockets the game plays on, so the drawing and the table cannot disagree. Dressed, it has
a triangle of balls and a cue, which is the Games page's cover. `poolball` is a ball as big as its
box, white for nought, a colour for one to eight and a colour band on white from nine, with its number
in a white spot. `poolcue` lies pointing right with its tip at the end of its box (`POOLCUE`),
`poolbumper` is a round rubber bumper, `pocketsign` is a small card with a word such as even,
`poolpatch` is a patch of soft cloth or a slope marked with arrows downhill, and `poolspinner` is a
bar on a round pivot that the game turns. On the home shelf, `fruitbowl` is a bowl of fruit seen from
above and `floorboards` a room's floor, wooden boards or kitchen tiles, quiet enough that what stands
on it reads first. The game no longer lays the floor, so the table stands on the page's squared paper
as every other game does; the drawing stays on the shelf.

## Rescue pups (28 September 2026)

The Pup family gained a `gear` setting for a rescue: a red fire helmet, a blue flying cap with goggles,
a yellow hard hat or an orange life vest, drawn over any pose, with `none` leaving every earlier pose as
it was. The vehicles face right and are drawn from the side. `firetruck` is a small red fire engine
with a flat deck at the back to stand on, a hose reel and a light bar; `rescuecopter` an orange
helicopter with an open bubble canopy the pilot shows through and a winch under its body;
`digger` a yellow digger on tracks with an open cab window, whose arm is `diggerarm`, drawn apart so the
game can turn it at the pivot; `dumptruck` a green truck with a deep open bed; and `rescueboat` an
orange boat with a railed deck and a blue cabin. The files export where the deck, the winch, the seat,
the pivot and the bed are, so a game places a pup or a load on the drawing rather than on a guess.
`lifering` is a ring with white bands, `helipad` a landing pad with a number or an H on its front,
`blaze` a fire of two to four tongues of flame, `rubble` a lumpy grey rock seen from the side, and
`rescuebase` (places) a low rescue station with a green roof, garage doors, a bell and a flag. None of
them is drawn after any show's vehicles or buildings.

## The road's delivery round (30 September 2026)

Three drawings on the travel shelf for The road. `parcel` is a small cardboard parcel tied with string both ways, drawn square so it reads from above on the car's roof rack and from the side on a doorstep, with or without a blank address tag; it carries no number, since lettering at its size would be under eleven units. `finishline` is a chequered line across the road's three lanes, seen from above, a square wide. `deliverylist` is a clipboard of up to five stops, each with a box that is ticked when its parcel is delivered and an arrow at the stop that comes next; the card is twelve squares wide so a stop written in words ("then 2 more than 10") fits, and the game draws it smaller in the corner of the view.

## Bridge builder (5 October 2026)

Six drawings on the travel shelf for Bridge builder. `trussbeam` is one beam of a bridge seen from the
side and laid between two joints: a wooden strut, a stretch of dark road deck with a dashed white line,
or a twisted rope. Its length is a setting in whole squares and the game draws it at the beam's own
length. Under strain it glows in a band under the beam, yellow, then orange, then red, so the beam's own
look still reads; a snapped one has a jagged end, and a beam being laid is washed green where it fits
or red and crossed out at both ends where it cannot go, so the red is never the only sign.
`trussjoint` is a round white plate with a bolt where beams meet, or an anchor, a square blue plate
bolted into a bank. `pupcar` is the Pup family's little red open-topped car, facing right, with two
seats a pup sits in, a spare wheel and two big wheels; the file exports where the seats and the road
under the wheels are, so a game sits Rufus and Pip in it rather than on a guess. `bridgetray` is the
tray of three tiles, wood, road and rope, each with a short piece and its name, the one in use marked
with a thick outline and a green wash. `strainkey` is the key to the colours, easy, working, hard and
snapping, with a pointer under the hardest any beam is working now. `bridgecover` is the game's cover:
the car with two pups halfway over a little bridge of road and wooden triangles above a stream, drawn
from `pupcar` and `pupfamily` themselves. The banks are `streambank`, the rock in the river is a
`streambank` with two cliff edges, and the boat waiting to pass under is `mailboat`.

## The style guide

Roughness. Use the ruler level for anything counted or measured and for any part under about two squares, which includes faces, hands and eyes. Use the calm level (roughness 0.6, bowing 0.8, one stroke to a line with its corners kept, as the lantern is drawn) for figures, the kit's objects and the icons, where the icons turn it down further to 0.45. Use the pencil level for scenery bigger than about four squares, where its double line reads as a pencil rather than as fur. Keep the doodle level for marks a teacher's pen makes. A line that has to close, such as an outline drawn with one stroke, keeps its vertices (`preserveVertices`), or it opens at every corner.

Line weight. A line's weight follows its role and not its drawing's size: 1.7 to 1.8 units for the outline of a thing, 1.5 to 1.6 for a figure's clothes and limbs, 1.1 to 1.3 for features and inner detail, 0.6 to 0.8 for hatching and texture, and 2.8 for an icon in its 40-unit box (about 1.7 pixels at 24 pixels, the weight of the label beside it). A piece that is drawn larger or smaller changes its geometry and keeps these weights, which is the opposite of what most coded drawings do today. Nothing a child must see is thinner than 0.8 units, which prints at 0.2 mm.

The grid and anchors. A drawing's box is a whole number of squares, one square is 20 units and 5 mm, and a drawing never draws outside its box, which the kit's sweep checks for every setting. A person stands on the bottom of the box with four units under their shoes. Anchors are named for what a scene attaches to them, as nouns in lower case: `head`, `face`, `hand`, `hands`, `tip`, `feet`, `lap`, `label`, `page`, `centre`, with an index for a repeated part (`child(2)`), and each has the side a bubble's tail or an arrow leaves from. A drawing that holds something names where it is held.

Perspective. People, buildings and vehicles are drawn from the front; a thing that travels along a line, such as a wheelchair or a train, is drawn from the side, with a person's face still turned to the viewer; things lying on the page (a book, a pencil, a sheet) are drawn from straight above and square to the grid, as a flat lay, so the page they lie on is the paper they are drawn on; solids and containers are oblique at 45 degrees or show an elliptical top; maps, boards and tracks are seen from above.

Marker colours. The five markers name categories: what a question tells apart, a child's top, a team. A thing has at most two markers, besides the values of skin and hair. A held thing never shares its holder's marker, and a worn thing beside the top (a scarf, a hair band) takes a different one. A colour a question depends on also appears as its hatch or as a written name. The painting shelf keeps its paint colours; nothing else adds a colour outside the palette, and the drift listed above is cleared in phase 2.

Skin and hair. Skin is one of six tones spaced evenly in lightness (OKLCH 0.94 to 0.46, `#F7E9D6`, `#E8CCAF`, `#D5AB86`, `#BC8965`, `#98674C` and `#744D3C`), taken from the range the Monk scale spans without copying its values, and hair one of six colours (black, brown, auburn, blonde, grey and white). Both are values, not categories, so on paper skin prints as a flat grey of its lightness (from white to `#A8A8A8`) and hair as a hatch at 60 degrees whose spacing follows its darkness, with blonde as dots and grey and white as outline. On the two deepest tones the features are drawn a quarter heavier, and every open eye has a small highlight, because ink on the deepest tone has a contrast of about 1.8 to 1. Skin and hair are described in plain words (light brown, dark brown, short black hair) and never with the names of food. The values are `SKIN` and `HAIR` in `engine/paper.ts` beside the palette, each tone with its print grey (decided 14 September 2026, landed with the person's move on 15 September); they go into `palette.css` only when a stylesheet reads them.

Faces. Eyes are ink dots with a highlight; they become white rings with a smaller dot only when the eyes are wide. The brows and the mouth carry the feeling. There is a small nose, which is what separates a person from a smiley, and a blush that shows on screen only. An older person has two small lines at the eyes and nothing else that makes age a costume.

Motion. A drawing declares its motion once, in the format of [animation.md](animation.md). People take their shelf's idle, blink, and wave a raised hand from the shoulder; the apps' controls and pictures are still, because a control answers a press and not the clock; nothing that carries a reading moves to a different reading. Everything stops under reduced motion and on paper.

Print. Everything prints in ink. A marker becomes its hatch at its angle. A value (skin, trousers, an icon's wash) becomes a flat grey. An area larger than about four squares opens its hatch to twice the spacing, so a book's cover or a sky stays light rather than grey. A value a child reads gets a white patch under it so no hatch crosses it. Text is never under 11 units (2.75 mm printed), and anything a child reads is at least 13.

Screen readers. A drawing describes itself from its settings: who or what first, then what they are doing, then how they look, in fifteen to thirty words. It describes what is seen and not what it means: a face by its brows and mouth rather than by the feeling a question asks about, and a group of things by their arrangement rather than their number when the number is the answer. A drawing that sits beside its word, as every icon does, is hidden from the screen reader and the word names the control. A lesson may replace a description, and a scene composes its drawings' descriptions in reading order. `describePerson` and `describeBook` are the first two; phase 2 makes `describe` part of every drawing.

Words. No em-dashes anywhere, no exclamation marks in anything a child reads, and a label is the word a person would say ("Sign out", not "Log off").

Targets. An icon is two squares, 40 pixels at question size, and sits in a target of at least 44 pixels beside its word.

## Harbour cargo (30 September 2026)

`barge` is a flat cargo barge seen from the side: a blue hull with a white stripe and portholes, a
planked deck and a rail post at each end. `load` stands numbered crates on its deck, spread evenly,
and `hook` adds a crane hook lowering one more, which is the Games page cover for Harbour cargo. Empty,
it is the barge the game floats, its box a whole square taller than the hull for the rail posts. The
`crane` drawing's width now reaches 48 squares, so it spans the harbour from the quay.

## The proof set

Three drawings on the shelf, with twenty-four takes between them, are the proof that the direction holds at the bar. They are on the Art shelf tab: the person on "People and feelings", and the icons and the empty page on the new shelf "The apps' own drawings".

`person` shows ten takes: a child waving with coily hair, a grown-up in glasses pointing, a child in a wheelchair, a child with braids holding an apple, a child on forearm crutches, an older person waving with a walking stick, a grown-up in a headscarf holding a star, a child resting their chin on one hand with a hearing aid, a child on a stool, and a child with both arms up. Every pose, age, aid and hair style was rendered in both directions and on screen and paper, 3,696 drawings in all, and every one stays inside its box.

`icon` shows the ten icons and one in the state for the page the viewer is on, which lays a disc of highlighter behind it. Each is drawn on the same box with one weight and one marker laid slightly off the line, and each sits beside its word. At 24 pixels all ten read, and the map is the busiest.

`newbook` is the empty page. New, its label is blank, which is the grown-ups' family page before a child is added; named, it carries the child's name, which is the first visit; open, it shows the first squared page with its margin rule, which is the child's journal before the first lesson. It is a flat lay, a book, a pencil and a sprig on the squared paper, so the empty page is drawn on the paper the lessons are drawn on.

The contact sheets, on screen and on paper, and an A4 print of the paper sheet, were made in the session's work folder. The kit's rules are tests in `engine/parts/people/__tests__/` and `engine/parts/apps/__tests__/` (they were the scratchpad's `test/kit.test.ts` until the kit moved), and the shelf's own catalogue, grouping and animation tests pass with the three drawings on the shelf.

## The plan, ranked

We ranked additions by what each unlocks against what it costs. The first places go to what the audit's harder questions wait on and to what the grown-ups' and the child's apps need when they are rebuilt in Solid: icons, children's pictures, empty states and first visits, and the world behind the sign-in page. After them come the pieces that replace the inconsistent drawings, then the subjects' wish lists, then the worlds'.

| Rank | Addition | Family | Who needs it | The bar it must meet |
|---|---|---|---|---|
| 1 | The rest of the icon set: close, search, edit, undo, zoom in and out, next and previous, done, child, family, mark, week, letter and sticker | The apps | Both apps, the journal's tools (emoji today), the parents' pages (Unicode today) | Reads at 24 px beside its word; one weight; prints as outline and grey |
| 2 | Dropped: picture keys, with the tablets they opened (14 September 2026) | The apps | Nothing now; a grown-up opens a child's view ([auth.md](auth.md)) | None |
| 3 | Children's pictures: at least twelve portraits with a picker | The apps | The switcher and the family page | No two alike on one tablet; each a kit creature or a kit face, never a photograph |
| 4 | Empty states and first visits: no plan this week, nothing to mark, offline and saved, loading | The apps | Both apps, the e2e journey in step 5 | One picture, one sentence, one action; still; hidden from the screen reader when the sentence carries it |
| 5 | The protractor with 1° ticks and arms off zero | Maths instruments | Grade 4 angles ([audit.md](audit.md) section 8) | A reading between marks at 20 px a square; text at 11 units at least; still |
| 6 | The L-shape that can hide a side | Maths shapes | Grades 3 and 4 perimeter and area | The hidden side is a blank the verifier knows; the grid stays exact |
| 7 | The percent bar and the change line that can hide their labels | Maths | Grade 4 percent and money | The same drawing with and without its labels; nothing moves |
| 8 | The clue picture: a kitchen after the cake, footprints to the door, a spilled jug | Stories, from the kit | Grade 1 reading inference, writing recounts | Every clue countable in ink; still, as clues are |
| 9 | Line-ups from the figure: children to share between, a queue, a comic's cast, the podium and the long jump | People | Sharing and division, reading comics, sport | The one figure; any look in any line-up; counted people plain and evenly spaced |
| 10 | Hands: counting on fingers to ten, pointing, holding a pencil | People | Grade 1 counting on, first visits, the hand guide | Fingers countable at 20 px; the hand in a tone or as an outline |
| 11 | `face` redrawn on the kit head | People | Eleven reading lessons on feelings | The brows and the mouth carry the feeling in ink; the description never names it |
| 12 | The world behind the sign-in page from kit pieces: the meadow's sky, ground, hedge and stile | Worlds | Both apps' sign-in and frames, the site | Clear of every card; still under reduced motion; one hand with the shelf |
| 13 | Sky and weather: one cloud, sun, moon and phase, rain, snow, wind, fog, rainbow, and the time of day | Nature | Every world, science weather, reading | Replaces the four clouds; phases read in ink |
| 14 | Foliage and ground: one leaf, one tree with species and season, grass, hedge, path, sand, snow | Nature | Every world, the nature strand, art | Replaces the four leaves and five trees; seasons as settings |
| 15 | Water and stepping stones | Nature and maths | Addition paths, coding routes, worlds | A number on each stone readable in ink; one wave line for the shelf |
| 16 | A number line labelled in fractions, and a ruler in millimetres | Maths instruments | Grades 3 and 4 | Marks one square apart as `lineTicks` requires; labels at 11 units at least |
| 17 | Containers on one volume rule: jar, box, bag, basket, cup, bowl, bottle, tub | Things | Word problems, science | A container of n always draws n; the verifier can ask its capacity |
| 18 | Frames, tape and stickers, with a quiet "part done" mark | The page | The parents' pages (CSS today), the journal, the painter's hut | Kept at the edges of a page; nothing decorative near a value |
| 19 | Cube buildings seen from a corner, with the front and top views | Maths shapes | Spatial reasoning from grade 1, grade 4 volume, art | Hidden cubes provable; oblique at 45 degrees as the solids are |
| 20 | The number balance with pegs one to ten | Maths | The equals sign in grades 1 and 2, the see-saw rule | Pegs countable; the tilt is the answer, so it never moves |

After the first twenty, in order:

- Redraw the drawings below the bar on the kit: the sheep, the mice, the seal, the geese, the dolphins, the eagle, the camel, the cloud, the moon, the crops, the volcano and the cake; take the exclamation marks out of the postcard and the comic; raise the twenty-two drawings' text to 11 units; stop `arttools` printing a colour; and move the hand-drawn stroke files onto the shelf's weight.
- The rest of audit section 8: the caption strip that wraps, and the codepad that can lock a tray block's number.
- Reading and writing layouts: the phrase-cued sentence, the index and glossary, the play script, the dictionary page, letter joins and the poster.
- Science: sound at three distances and the string telephone, the marble track, the sun, earth and moon from above, the falling-shapes tank, magnets through materials and the chain of clips, shadows, circuit bench pieces, weathering, a pond food chain, weather symbols and a chart, the five senses and the body, and a hen and chick life cycle.
- Maths and logic: the garden bed on a grid, and the river crossing.
- Music and coding: the pedal mark, a practice chart, a child at the keyboard; a child's own character for the stage, a garden robot, a traffic light and a parcel.
- The worlds' 42 wants, two a world, built from kit pieces where they can be, starting with the meadow and the harbour because the sign-in page and the first term stand in them.
- Parts that motion needs: the owl's eyes, the bus's wheels, the chimneys, the goal's ball, the chest's lid and the whale's tail.

## Phase 2

Phase 2 builds the plan straight into `engine/parts/` once the shelf has moved there (step 3 of the order in [structure.md](structure.md)), and the apps' pieces before step 5, when the apps are rebuilt in Solid on them. It would do the following, each with its tests green before the next.

- Move the kit. The figure's construction (limbs, heads, hair, hands, the aids) becomes one file, `engine/parts/people/figure.ts`, since it is one concept that several drawings use, and each drawing built from it is a file beside it: `person.ts`, then the line-ups, the hands and the face. The icons, children's pictures and the apps' pictures go in `engine/parts/apps/`. `people.ts`, `icons.ts` and `moments.ts` are deleted from the scratchpad in the same change, as structure.md requires.
- Put the kit's rules in the engine. The calm level joins `LEVELS` in `engine/paper.ts`, and the pen draws it with one stroke and its vertices kept, so no drawing carries its own copy. The line weights become a table of roles in `engine/paper.ts` (the `WEIGHT` that did not move for want of a reader would have its readers), and a piece's size setting scales its geometry and never its weights. The skin tones and hair colours join the palette in `engine/paper.ts` and `palette.css`, with their print greys in `PRINT`, if the owner agrees to widen the palette for them; the alternative is to keep them as the one exception, declared in one file.
- Make every drawing describe itself. `Visual` gains `describe(p)`, `engine/ui/svg.ts` gives a rendered drawing `role="img"` and its description as its name, or hides it when it sits beside its word, and the scene renderer composes a scene's name from its drawings in reading order. A drawing without a description fails the catalogue test.
- Hold the bar in a test. `engine/ink/surface.ts` already has a `recorder` surface that keeps what the pen draws; once text is drawn through the surface rather than through the page, every part can be drawn in Node and checked for ink outside its box, colour on paper, lines under 0.8 units and text under 11, for every take. This replaces the headless sweep this document used.
- Build the ranked plan in order: the apps' pieces (ranks 1 to 4) first, so step 5 has icons, children's pictures and empty states to build its screens with; then the audit's instruments and shapes (5 to 7, 16, 19, 20) and the clue picture; then the people that replace the inline figures, which retires `children`, `heads`, `kid()` and the other helpers; then the nature kit, which the worlds (step 4) are painted from; then the drawings below the bar and the subjects' and worlds' lists.
- Make `person` writable in a lesson. The notation's vocabulary is derived from the parts (`src/lang/parts.ts` today), so moving the figure into `engine/parts/` with its choices makes `person pose=point hair=braids` a scene a lesson can write, with the verifier checking every choice.

## Sources

- American Library Association, ALSC, Caldecott Medal terms and criteria: https://www.ala.org/alsc/awardsgrants/bookmedia/caldecott
- Quentin Blake, "How I draw": http://quentinblake.com/about-drawing/how-i-draw
- Fisher, Godwin and Seltman (2014), "Visual environment, attention allocation, and learning in young children", Psychological Science: https://doi.org/10.1177/0956797614533801; Godwin and others (2022): https://eric.ed.gov/?id=EJ1343736
- Kaminski and Sloutsky (2013), extraneous perceptual information and graph reading: https://eric.ed.gov/?id=EJ1007940; Kaminski, Sloutsky and Heckler (2009): https://eric.ed.gov/?id=EJ833621
- McNeil, Uttal, Jarvin and Sternberg (2009), realistic money and problem solving: https://eric.ed.gov/?id=EJ826505
- Fyfe, McNeil, Son and Goldstone (2014), concreteness fading: https://eric.ed.gov/?id=EJ1036777
- Meta-analyses of spatial contiguity and signalling in multimedia learning: https://eric.ed.gov/?id=EJ1186641, https://eric.ed.gov/?id=EJ1269127, https://eric.ed.gov/?id=EJ1263249
- Strouse, Nyhout and Ganea (2018), "The role of book features in young children's transfer of information from picture books", Frontiers in Psychology: https://www.frontiersin.org/articles/10.3389/fpsyg.2018.00050/full
- NCETM, five big ideas in teaching for mastery: https://www.ncetm.org.uk/teaching-for-mastery/mastery-explained/five-big-ideas-in-teaching-for-mastery/
- Deci, Koestner and Ryan (1999), rewards and intrinsic motivation, Psychological Bulletin: https://doi.org/10.1037/0033-2909.125.6.627
- Nielsen Norman Group, icon usability: https://www.nngroup.com/articles/icon-usability/; children's websites: https://www.nngroup.com/articles/childrens-websites-usability-issues/; physical development: https://www.nngroup.com/articles/children-ux-physical-development/; empty states: https://www.nngroup.com/articles/empty-state-interface-design/
- Apple, Human Interface Guidelines, icons: https://developer.apple.com/design/human-interface-guidelines/icons
- Lucide, icon design guide: https://lucide.dev/contribute/icon-design-guide
- W3C, WCAG 2.2 Understanding 2.5.5, 1.4.11 and 1.4.1: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html, https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html, https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html; W3C WAI images tutorial: https://www.w3.org/WAI/tutorials/images/
- Heather Migliorisi, "Accessible SVGs": https://css-tricks.com/accessible-svgs/
- Cooper Hewitt, guidelines for image description: https://www.cooperhewitt.org/cooper-hewitt-guidelines-for-image-description/
- DCMP, Description Key: https://dcmp.org/learn/descriptionkey/618
- Google, the Monk Skin Tone Scale: https://blog.google/products/search/monk-skin-tone-scale/
- Teaching for Change, guide for selecting anti-bias children's books: https://www.teachingforchange.org/guide-for-selecting-anti-bias-childrens-books
- Cooperative Children's Book Center, diversity statistics: https://ccbc.education.wisc.edu/literature-resources/ccbc-diversity-statistics/books-by-about-poc-fnn/
- GOV.UK, inclusive communication, portraying disability: https://www.gov.uk/government/publications/inclusive-communication/portraying-disability
- Wikipedia, wheelchair, cochlear implant, hair type and hatching (for the heraldic tinctures): https://en.wikipedia.org/wiki/Wheelchair, https://en.wikipedia.org/wiki/Cochlear_implant, https://en.wikipedia.org/wiki/Hair_type, https://en.wikipedia.org/wiki/Hatching

## Fetch target (2 October 2026)

`fetchmark` is a wooden stake pegged into the grass with a round sign carrying a number (or a short word such as "+5" or "half"), and a pink dog bowl at its foot. Fetch with the pups stands one where a throw is meant to land, and lights it yellow (`lit`) when a throw lands there.

## Garden golf hazards (3 October 2026)

Three drawings for the new mini-golf holes. `golfpond` is a hazard seen from above, either still water washed blue with short ripples, which sends a ball back, or brown mud dabbed with dark lumps, which slows it hard; its width and height are the area the game plays on. `golfpipe` is one end of a pipe under the course, a dark round mouth in a blue collar, with a pale arrow pointing into the way in or out of the way out. `golfgnome` is a small garden gnome with a red or blue pointed hat, a white beard and a coat on a green base, who walks his track across a gap. The windmill hole reuses `windmill`, turning its sails. A slope is `golfslope`, a rise in the lawn seen from above: green that deepens towards the low side in bands, faint contour lines bowed downhill and closer together on a steeper slope, a light high edge and a shaded bank on the low one, and a few grass tufts leaning downhill, with no outline, so it reads as a hill without arrows. It takes one of eight ways downhill, a steepness from 0.4 to 2 matching the rolling slope's strength, and a width and height. `poolpatch` keeps its arrowed slope for Pocket pool.

## Curling on the pond (4 October 2026)

Four drawings and two icons for the curling game. `curlsheet` (sport) is a sheet of pond ice seen from above, pale with skate scratches and a little frost, with the house's four rings painted under it at the far end, the tee, hog and back lines, and the hack at the near end; its length, width and the places of the lines are settings, and the game draws its own pond to the same numbers. `curlstone` is a granite stone seen from above, with a speckled top, a darker band and a soft shadow on the ice, and a handle across it in tangerine for the child's team or sky blue for the other; the game turns it as it spins. `curlbroom` is a broom seen from above, a long handle and a flat pad at its foot, drawn swung from side to side ahead of a swept stone. `snowbank` (outdoors) is a low bank of snow along the edge of a pond seen from above, its rounded drifts facing the ice, above or below it, as long as it is asked to be. The icons are `broom`, labelled Sweep, which the big button shows while a stone glides, and `curl`, labelled Change the curl, a stone and the curve it bends along, for the second big button. The rest of the park is already on the shelf: firs, the snowman, a bench, the pups and people, Charlie, the scoreboard, and `golfpond`'s mud for a rough patch on the ice.

Four icons for Charlie's garden, whose one Action button shows what it would do. `seed`, labelled Plant, is a sprout with two leaves coming up out of a mound of soil, for planting and sowing. `water`, labelled Water, is a watering can tipped with three drops falling from its rose. `basket`, labelled Pick, is a basket with its handle over it, for picking and for sharing into a crate. `sun`, labelled Next day, is the sun with its rays, for ending the day at the sundial. Taking a thing and putting it down keep `grab`.

The polish pass added `frozenpond`, a frozen pond seen from above with a soft shore, drifted snow, skate loops, pebbles and reeds, sized by its width and height; `snowflake`, a single pale flake, a six-armed star or a soft round one, for snow falling over a scene; and a `sweep` pose in the figure kit, striding with both hands held low in front, which Charlie and every person can take. `curlsheet` now paints brighter ice with a fine pebble, a glaze over the rings and soft side lines on screen (the whole outline stays on paper), and `curlstone` has a band of its team's colour round the granite.

## The dollhouse (4 October 2026)

Five drawings under home for Charlie's dollhouse. `dollroom` is one room of a cut-away house, three squares tall and 2 to 8 wide: a back wall in one of the papers (plain, stripes, spots, leaves), a floor of boards or tiles, an optional window, and side walls; as `stairs` it is a flight of steps rising to the right. `dollroof` is a pitched roof over a run of rooms, in a tone, with an optional chimney. `furniture` is one piece in thirteen kinds (bed, sofa, table, chair, lamp, bath, fridge, plant, rug, picture, shelf, television, cooker), each in a tone and with an `on` setting that lights a lamp, fills a bath, shows hills and a sun on the television and lights the cooker's rings; it is drawn at twice the size the game shows it, so a catalogue card reads. `dollcard` is the catalogue's card, a taped card or a coin with a price. `dollhouse` is the game's cover, a bedroom over a living room with stairs and a roof, and Charlie standing in the living room, waving. The apps' icons gained `who`, a head and shoulders, for the "Who lives here" button.

The dollhouse's rework added two drawings and two settings. `dollroom` gained `left` and `right`, each a wall or a doorway, a thick outer wall, a darker back wall on screen, a ceiling band and a heavy floor, and `dollhouse`, the cover, shows a doorway between its living room and its stairs. `dollshell` is the stone plinth a dollhouse stands on, as wide as the house, or a soft green glow drawn on screen only over a place a held room or piece fits. `dollchip` holds the game's controls: a round furniture chip, a tab, the two-way switch between building and decorating, the slim drawer, a list card, a round button, the keys' highlight ring, a readout pill and a tick circle. `dollcard` stays on the shelf and is still the drawer's room card and the coin.

## The domino machine (4 October 2026)

One drawing under science for the domino machine. `machinepart` is one part of a chain-reaction toy, chosen by `part`: a domino, a ball, a weight, a spring, a fan, a bell, a marble bag, a pulley wheel, a toy boat and a round grip for a drag. Each has a box in whole squares (a domino 1 by 3, a fan and a bell 2 by 3, the boat 3 by 2), a `colour` from the palette and an optional `label` drawn as a small number tag, which is how a weight shows how many marbles it is as heavy as. The ramps and shelves the game draws are `marblerun`'s, so a ramp looks the same in both workshops. The `icon` drawing gained `less`, a minus in a berry wash, for the machine's "Fewer" button beside the existing `add`.

`toyroom` under home, also on the science shelf, furnishes the machine's room in twelve parts: a window with curtains, a toy chest, a stack of blocks, a teddy, a wooden wall ledge, a wooden post that holds the bell, a run of skirting board, the toy tray under the floor, a round chip for one of the tray's parts, a low wooden step, a tin pail and a beam on the wall that pulley wheels hang from. The ledge, the skirting, the tray, the step and the beam take a width and the post a height, in whole squares, and the rest are fixed sizes. The pictures, the books, the lamp, the plant and the rug come from `furniture`.

## Charlie's garden (4 October 2026)

Nine drawings under outdoors for Charlie's garden, all seen from above. `gardenbed` is a raised bed of soil in a plank frame, 1 to 10 cells across and down at two squares a cell, with furrows and crumbs; `wet` darkens the soil in four steps and `puddle` leaves standing water on it. `gardencrop` is one plant in five crops (carrot, lettuce, strawberry, sunflower, pumpkin) at four stages (a seed in its hole, a sprout, growing, ripe), and `droop` bends its leaves for a dry night. `seedpacket` is a packet with a picture of its crop. `wateringcan` is a can with its rose to the left, in a tone; the game tips it by turning the sprite, and the rose's place is exported so the water leaves from it. `gardenbasket` is a basket or a crate, empty or holding up to twelve of a crop. `weed` is a dandelion-like weed, with or without its flower. `gardensnail` is a snail, out or hiding in its shell. `greenhouse` is a greenhouse's frame of glazing bars over a pale tint of glass, as wide and long as asked, with the beds inside showing through. `gardencover` is the game's cover, Charlie in wellies tipping a watering can over a bed of seedlings. The rest of the plot is already on the shelf: the cottage, the hedge, the sundial and the flowers. Six more dress the plot: `pottingbench`, a slatted bench as tall as asked with pots on it, where the packets lie; `gardenpath`, a strip of pale gravel; `waterbutt`, a barrel with its lid, full or low; `compostbin`, a slatted bin whose heap grows in four steps; `plantlabel`, a wooden stake with the crop's picture and name; and `butterfly` under animals, open or closed, in a tone. The beds are drawn off paper with a wooden rim and darker soil.

## Charlie's climb (4 October 2026)

Six drawings for Charlie's climb. `climbledge` (outdoors) is one piece of a platform seen from the side, up to 12 squares long, in ten kinds: grass over earth, a plank, a roof's tiles over a wall, a branch, a cloud, stone blocks, a mushroom cap, a crate, a market stall's awning and a coin box's button; a longer platform is laid in pieces end to end. `climbcoin` (sport) is a gold coin with its value, 1, 2, 3, 5 or 10, on its face. `climbdoor` is a wooden door in an arched stone frame with a card that says what opens it, a number, a sum, odd, even or a comparison, its lettering shrinking to stay on the card; `open` swings it back. `coinslot` is a coin box on a post with the word give on its front and, while `dropping`, a coin going in. `climbladder` is a ladder of a given number of rungs. `climbcover` (people) is the game's cover, Charlie leaping from one red roof towards another with one to three coins in the air ahead of her. The backdrops are the shelf's existing trees, houses, firs, clock tower, windmill, city walls, lamp posts and clouds, and the flags and the cottage at the end are the ones the other games use.

## Pinball garden (4 October 2026)

Twelve drawings under sport for Pinball garden, all seen from above. `pinballtable` is the table: a wooden rim, an arch over the top, a shooter lane down the right, two inlanes, and two slingshots whose kicking faces are drawn in berry, round a lawn in one of five places (a lawn, a pond in the middle, a yellow meadow, an orchard lawn and a pale evening lawn). `PINBALL`, `pinballWalls` and `pinballFlippers` in its file are the measures, walls and flippers the game plays on, so the drawing and the table cannot disagree. `flowerbumper` is a bumper drawn as a flower with its number in the middle, plain, lit, or wilted grey, and `bloom` opens its petals out when it is struck. `leafflipper` is a flipper drawn as a leaf, its pivot exported as `LEAF` so the game turns it about the right point. `plunger` is the plunger with its spring, plate and knob, and `pull` draws the plate down. `ladybird` is a numbered drop target that tucks flat and goes grey when knocked down. `snailtarget` is a snail with a number on its shell that slides to and fro, and `canramp` a watering can on its side that the ball runs up and round; both are kept apart from the garden game's `gardensnail` and `wateringcan`, which are drawn for a different use. `sunflower` is a spinner that the game turns by `turn`, `beehive` a straw hive that catches the ball and kicks it back out, `rollover` a short lane with its label (×2 or +10) that glows when lit, `marble` a glass marble as big as its box, and `pinballboard` the backbox over the table with a panel left empty for the game to write the target and the total. The cover is a lit, blooming flower bumper. The garden round the table is the shelf's existing hedges, trees, flowers, garden gate and Charlie.

## Feed the pup (5 October 2026)

`feedpup` under home is the game's pieces in nine parts: a golden dog biscuit with dark specks; a round yellow peg and a curved grey hook that the ropes hang from; a numbered star, pale once caught; a bellows that `on` squeezes shut; a soap bubble; Pip's pink bowl with a card that carries its number or a sum such as 6+?=10, the lettering shrinking to stay on the card; a wall of white tiles as wide as `w`, for the kitchen and the bath; and the cover, a biscuit on a rope from a peg beside a star, over the bowl. `pupfamily` gained two poses for Pip and the family: `catch`, arms up and the mouth wide open with its tongue showing, and `chomp`, a biscuit held in a closed mouth with the eyes shut and a quick munching bob (the `munch` part). `icon` gained `cut`, a pair of scissors across a line, for the game's big button. The places are the shelf's existing window, fridge, bath, bubbles, tree, washing line, slide, swing, hills, clouds, dandelions, treehouse platform, skirting and ground.

## Hoops in the yard (5 October 2026)

Seven drawings for the basketball game. Under sport, `basketball` is an orange ball with black seams, new or scuffed, and as its `shadow` part the soft grey oval it throws on the ground; the game turns the ball as it spins. `backboard`, titled Basketball hoop, is a backyard hoop seen from the side: a white board seen a little from its edge with its painted square, an orange rim, a cord net and a pole, or brackets to a wall for a hoop on a garage. It is drawn whole for the shelf, as `cover` with a ball dropping in at the end of a dotted arc for the game's cover, or in parts for the game: `back` (the pole, the board and the rim's far half) behind the ball, and `front` (the rim's near half) and `net` in front of it, the net's foot moved by `swing`, `stretch` and `open`. `BACKBOARD` in the same file holds the rim's middle, its half width and the board's face, which the game's physics uses, so the drawing and the bounces agree. `chalkcourt` is a tarmac drive seen from the side and a little above with chalk lines across it, its length and the lines' places as settings, and `chalkspot` is a chalk spot with the points a basket from it is worth, 1, 2 or 3, lit when someone stands on it. Under home, `garage` is a garage from the front with a sloping roof, an up-and-over door to the left and a plain stretch of wall with a lamp, and `chalkslate`, titled Chalk scoreboard, is a small blackboard on a nail with a line at the top and a sum chalked large under it, the lettering shrinking to fit. Under outdoors, `tallhedge` is a clipped garden hedge seen from the side, as wide and as tall as asked. The figure kit gained two poses that Charlie and every person can take: `shoot`, both hands holding a ball up over the head, and `release`, the follow-through, one arm reaching up and forward after the ball and the other raised. The rest of the yard was already on the shelf: the houses, the picket fence, bushes, a tree, clouds, the wind sock, Maple of the pup family and the `launch` and `locate` icons.

The game's rework added two drawings and widened one. `yardstep` under home, titled Kerb, step or crate, is something low to stand on, seen from the side: a stone kerb half a square high, a concrete step a square high or an upturned crate a square and a half high; `STEP_LIFT` in its file holds those heights, which the game lifts a shooter by, so the drawing and the throw agree. `ballrack` under sport is a low wire rack with up to five basketballs along a sloping rail, beside the drive on the level against the clock. `chalkspot` now takes 0 to 5: a plain spot with no number for the level where the hoop sets a basket's worth, and 4 and 5 for the walk round the world. The evening level uses the shelf's `moon`, `prop.star` and lit `lamppost`, Copy Pip uses Pip of the pup family, and the branch over the drive is the shelf's `swingbranch` in its `limb` look, a leafy limb hatched like the tree's trunk and flared where it leaves it, drawn behind a `tree`'s crown so it grows out of it, with its underside on the same line as the bough's.

For a map tile export the new files are `engine/parts/home/yardstep.ts` and `engine/parts/sport/ballrack.ts`, and the changed one is `engine/parts/sport/chalkspot.ts`.

## Charlie's aquarium (5 October 2026)

Three drawings for the aquarium game. `tankfish` under animals is the fish of a home aquarium seen from the side, facing either way: a slim neon with its blue stripe and pink belly, a round goldfish with a double tail, a tall angelfish with long fins and dark stripes, a guppy whose colour is in its big fan of a tail, and a long whiskered catfish; `tone` colours the goldfish, the guppy and the catfish, and `happy` set false droops the fins and half closes the eyes, which the game shows for a fish whose tank is not right. The shelf's `fish` stays as Gone fishing's weighed fish, since a tank's fish have other shapes and nothing a fishing game uses changed.

`aquarium` under home is the game's pieces in twenty three parts: a glass tank with a dark frame along its rim and base, marked up one side in litres or in fractions of the whole (`marks`, `scale` and `most`), with the unit on the highest written mark; a wooden stand with doors; a strip of gravel; three water plants (tall grass, a sword plant and a fern); a lily pad; a rock arch; a treasure chest that `on` opens; a diver; a pond snail; a heater; the heater's dial, marked from 18 to 30 degrees with its pointer at `value` and a minus and a plus at its sides; a filter that `on` lights and bubbles; a hand net; a tub of flakes and a single flake; the water meter with a bar for oxygen (`value`) and one for cleanness (`level`), green past the line where each becomes fine; a pet-shop bag; a jug; a colour tag for a sorting tank; the stone edge of a garden pond; and the cover, a bright tank with a shoal and a net dipping in. The water itself is not a drawing: the game draws it with the view's water, so it ripples and fills.

`aquaroom` under places is the room behind a tank, wide enough to stand behind several: the pet shop's back wall of little tanks on shelves over a sign, the tunnel of a public aquarium with fish and a ray beyond its arched window, and a classroom with a board, a window and the children's pictures of fish. The bedroom is the shelf's `toyroom` window and ledge, and the pond is the shelf's clouds, hedges, stream banks, meadow, reeds and frogs. Charlie and Pip watch from outside the glass.

For a map tile export the new files are `engine/parts/animals/tankfish.ts`, `engine/parts/home/aquarium.ts` and `engine/parts/places/aquaroom.ts`.

## Marble pegs (5 October 2026)

Six drawings under sport for Marble pegs. `marbleboard` is the upright board: a wooden frame, a header with a pale panel for the target and the sum, a launcher's mount at the top of the field, the bucket's rail and a hatched gutter at the foot, round a field in one of nine places (a garden with a picket fence, a sweet jar, the seaside with sky, sea, sand and shells, a pale starry sky with a moon, faint clockwork cogs, a wall of planks, a brick wall, a striped fairground tent with bunting, and plain squared paper). `MARBLEBOARD` in its file is the measures the game plays on, so the drawing and the board cannot disagree. `numberpeg` is a peg with its number: round as a peg, a sweet, a shell, a star, a cog or a bulb, or long as a plank or a brick with its number on a round badge, plain in one of four colours, lit yellow, or greyed with hatching when it does not count; a long peg's box is two squares for each square of its length and one more at each end, so it draws at half its box as a round one does. `peglauncher` is the turning hub with its barrel pointing down, `pegbucket` the sliding pail with a rim each side that glows when it catches a marble, its rim's reach exported as `BUCKET_HALF`, and `marbletray` a row of ten dips holding the marbles left. The cover, `pegscene`, is a marble bouncing through five numbered pegs, three of them lit, with a dotted trail behind it. The marble is pinball's `marble`, and the places round the board are the shelf's existing trees, hedge, flowers, sweet jars, balloons, lighthouse, palms, starfish, crabs, lamp posts, houses, shooting star, clock tower and carousel, with Charlie and Pip from the Pup family watching.

## Kite flying (5 October 2026)

Twelve drawings for Kite flying. Under sport: `flyingkite` is a kite in the air as its flyer sees it, a diamond, a delta or a box kite in one bright colour and white, with a `shadow` look that is the same shape lying flat along the foot of its box; `kitebow` is one bow of its tail, which the game strings behind the kite; `kitereel` is the reel in Charlie's hands, turned by the game as the line goes in and out; `skyballoon` is a balloon with a number on it; `numberbird` is a bird carrying a number card in its beak; `heightpole` is ten metres of a striped measuring pole, a square to a metre, which the game stacks to fifty; `kiteboard` is the card the target and the sum are written on; and `kitecover` is the cover, a diamond kite with a long tail over a meadow with numbered balloons round it. Under outdoors: `kiteground` is the field's ground as grass, sand, autumn leaves or a paved path; `guststreak` is the lines a gust is drawn with; and `kitetree` is the tree that eats kites, a round crown with a sulky face and old kites in its branches. Under places: `powerline` is two poles with wires sagging between them, the sag the same one the game keeps a kite off. The wind sock is the shelf's existing `windsock`, and the places round the field are its hills, hedges, houses, autumn trees, bunting, sea, trees and clouds, with Charlie and the pups.

For a map tile export the new files are `engine/parts/sport/flyingkite.ts`, `engine/parts/sport/kitebow.ts`, `engine/parts/sport/kitereel.ts`, `engine/parts/sport/skyballoon.ts`, `engine/parts/sport/numberbird.ts`, `engine/parts/sport/heightpole.ts`, `engine/parts/sport/kiteboard.ts`, `engine/parts/sport/kitecover.ts`, `engine/parts/outdoors/kiteground.ts`, `engine/parts/outdoors/guststreak.ts`, `engine/parts/outdoors/kitetree.ts` and `engine/parts/places/powerline.ts`.

## Treasure island (5 October 2026)

Twelve drawings for Treasure island, and one setting on an old one. Under outdoors: `islandground` is the island seen from above in lengths that meet, as the meadow is drawn: the open sea, the pale shallows, a sandy beach all round with grains and shells, grass with tufts and clover, a thick jungle to the north-east and a pond, with the map's grid pegged out faintly over the land, three paper squares to a map square. The island's outline, its grid, its pond, its jetty and where each landmark stands are exported from the same file (`COAST`, `GRASS`, `JUNGLE`, `POND`, `DOCK`, `WALK`, `GRID` and `SPOTS`), so the game walks the same ground the drawing draws and the map card draws the same island. `islandcave` is a low hill of grey boulders with a cave mouth at its foot, `bigrock` one big mossy rock, `shovel` (titled Spade) a child's spade with sand on its blade once it has dug, `sandprint` one shoe print in the sand that the game turns the way she walked, `shorewave` a curl of foam the game moves up and down the beach, and `treasurecover` the cover: Charlie with her spade by a red X on a little island. Under places, `islanddock` is a wooden dock from straight above. Under travel, `shipwreck` is an old ship run aground on its side with its mast snapped, and `gridpost` a stake with a white board painted with one letter or number of the grid. Under measuring, `ropecoil` is a coil of rope knotted at every square. Under writing, `cluemap` is the parchment map of the island: the landmarks drawn small, the grid's letters and numbers when asked, a ring round where to start, a dotted way to walk, Xs where to dig and ringed Xs for what has been found, torn at one corner for the measuring level, and the clue written underneath when it is held up big. The `bottle` under home gained `sea`, set false for a bottle dug up and lying in the sand.

The rest is the shelf's own: the palm tree is `palms`, the parrot's tree is `tree` with the `parrot` on it, the lighthouse, the treasure `chest`, the dug hole is `dig`, the `compass` rose at her feet, the `crabs`, the flying `gull`, the `rowboat` at the dock with a friend in it, Charlie and Pip of the Pup family. The icons gained `dig`, a spade in a heap, and `bag`, a satchel for swapping the tool in her hand.

For a map tile export the new files are `engine/parts/outdoors/islandground.ts`, `engine/parts/outdoors/islandcave.ts`, `engine/parts/outdoors/bigrock.ts`, `engine/parts/outdoors/shovel.ts`, `engine/parts/outdoors/sandprint.ts`, `engine/parts/outdoors/shorewave.ts`, `engine/parts/outdoors/treasurecover.ts`, `engine/parts/places/islanddock.ts`, `engine/parts/travel/shipwreck.ts`, `engine/parts/travel/gridpost.ts`, `engine/parts/measuring/ropecoil.ts` and `engine/parts/writing/cluemap.ts`, with the changed `engine/parts/home/bottle.ts` and `engine/parts/apps/icon.ts`.

## Knock it down (5 October 2026)

Five drawings under sport for Knock it down. `knockframe` is the tall wooden frame the game is played in: a post each side and a beam across the top that the ball bounces off, a pale sign over it for the target and the sum, and the field open at its foot, in one of nine places (a summer meadow with a sun, a town sky over a pavement, a playroom wall over a wooden floor, an orchard, a hillside under a high sky, a winter sky with snow, a pale night sky with stars, the sea's waves, and plain squared paper). `KNOCKFRAME` in its file is the measures the game plays on, so the drawing and the field cannot disagree. `knockblock` is one block of a structure, from one to six squares wide and one to three tall: a brick, a window pane, a roof tile, a door, a plank, a toy block, a clump of leaves, an apple among leaves, a block of snow, a riveted metal panel, a striped piece of sail or a castle stone, in one of five colours where the look takes one, with its number on a pale disc, a crack across it after a first hit, or greyed with hatching while it does not count; a rock with a grassy top, a trunk, a mast and a launch pad are the looks that never break, drawn hatched. `knocktray` is the catching tray, a flat board with a raised lip at each end, glowing when it has grown wide and dripping honey when it is sticky. `knockgift` is what drops from a broken block: a star, with a number on it on the rocket's level, a token with a second ball in it, arrows pointing out for a wider tray, and a honey pot for a sticky one. The cover, `knockcover`, is a little brick house on a grassy rock with a ball flying up from the tray along a dotted path and bricks tumbling off the corner it struck.

The ball is pinball's `marble` and the balls left are Marble pegs' `marbletray`. The places round the frame are the shelf's existing trees, hedge, flowers, clouds, houses, toy `blocks`, sweet jar, balloons, `tower`, `snowman`, `moon`, `rocket`, lighthouse and palms, and Charlie carries the tray in the `shoot` pose, arms up, with Pip from the Pup family running alongside.

For a map tile export the new files are `engine/parts/sport/knockframe.ts`, `engine/parts/sport/knockblock.ts`, `engine/parts/sport/knocktray.ts`, `engine/parts/sport/knockgift.ts` and `engine/parts/sport/knockcover.ts`.

## Bolt's rescue (5 October 2026)

Eight drawings under travel for Bolt's rescue. `boltbot` is Bolt, a small white robot with a round helmet, a dark visor with two blue eyes, an antenna and a glowing chest light, standing, running, jumping, hovering, spinning or cheering, and wearing the planet's gadget: red spring gloves, a rocket pack or a magnet. `crewbot` is one of the crew, a round robot in one of five colours with an eye screen and the number it counts for on its tummy, waiting, asleep or cheering; the corner's seats are crewbots without numbers. `boltship` is the round ship with a red nose, a big window Charlie waves from and a deck window, landed with its ramp down or lifting off on a flame. `spacecrate` is what stands in Bolt's way: a wooden crate, a metal block for the magnet, a cracked tile, a cracked wall, a boulder, and a broken plank for the pieces. `spacekit` is the small things: a bounce spring, the gloves' handle, a checkpoint beacon, a crew gate with its number, a battery, a jet flame and the ring of jet fuel. `planetground` is a length of ground or a ledge on one planet, moon rock, ice, jungle moss, cooled lava, sand, cloud, junk plates, crystal or a metal plank. `skyplanet` is what hangs in the sky, drawn soft: a ringed planet, a gas giant, a small moon, home far away, or stars. The cover, `boltcover`, is Bolt hovering on two jet flames over a grey moon with a ringed planet behind and numbered crew waiting below.

Charlie is the shelf's `charlie` in the window. The `apps/icon` drawing gained a `spin` icon and a `magnet` icon for the pad.

For a map tile export the new files are `engine/parts/travel/boltbot.ts`, `engine/parts/travel/crewbot.ts`, `engine/parts/travel/boltship.ts`, `engine/parts/travel/spacecrate.ts`, `engine/parts/travel/spacekit.ts`, `engine/parts/travel/planetground.ts`, `engine/parts/travel/skyplanet.ts` and `engine/parts/travel/boltcover.ts`, and `engine/parts/apps/icon.ts` changed.

## Nutmeg's winter store (5 October 2026)

Eight drawings for Nutmeg's winter store. `chipmunk` is Nutmeg, an orange chipmunk with dark and white stripes down her back, a bushy tail, a dark stripe through her eye and cheek pouches that swell from nought to six as she fills them, and her little sister Hazel in pale yellow; the poses are standing, sitting, running, leaping, climbing a trunk, shaking a branch, spitting out a cheekful, hiding low and cheering. They are our own characters and nothing of any film or cartoon chipmunks. `squirrel` is a grey squirrel sitting up, running, or running with two acorns in its mouth. `hawk` is a brown hawk gliding with its wings spread, or the soft dark shadow it casts. Under outdoors, `acorn` is one acorn in its cap or one pinecone, a square each, for counting in a pile; `burrow` is the cut-away the burrow is built from, in lengths on the half square: earth, grass along the top of earth, a tunnel, a shaft with root footholds, a bedded room, the door's mound and a stepping stone; `hollowlog` is a fallen log hollow right through; and `oaktree` is a climbing tree in two pieces, a trunk with roots and a crown of autumn leaves or fir needles, so the game can lay a branch between them. The cover, `chipmunkcover`, is Nutmeg on an oak branch with her cheeks full, acorns falling, and Hazel in a room of acorns below. The branch is the shelf's `climbledge`, and the backdrops are the shelf's houses, firs, reeds, toadstools, flowers, windmill, fence and clouds.

The `apps/icon` drawing gained a `shake` icon for the pad.

For a map tile export the new files are `engine/parts/animals/chipmunk.ts`, `engine/parts/animals/squirrel.ts`, `engine/parts/animals/hawk.ts`, `engine/parts/animals/chipmunkcover.ts`, `engine/parts/outdoors/acorn.ts`, `engine/parts/outdoors/burrow.ts`, `engine/parts/outdoors/hollowlog.ts` and `engine/parts/outdoors/oaktree.ts`, and `engine/parts/apps/icon.ts` changed.

## Bolt's sky flight (5 October 2026)

Six drawings under travel for Bolt's sky flight. `skyband` is the sky high up, drawn soft behind the play: an aurora's curtains hanging from rippling ribbons, a nebula's soft blooms of colour and stars, the Earth from the edge of space with its lands, wisps of cloud and a glow of air along its rim, two comets, a wash of sky colour fading at its top and foot that a climb lays in overlapping bands, or a tall cumulus cloud of puffs on a flat foot, shaded blue underneath. `spacestation` is a station with a round middle, portholes, a docking ring, an antenna and one or two blue solar panels on each side. `spacerock` is what a flyer bumps off: an asteroid, a crystal rock from a belt, a satellite or a comet. `altpole` is fifty metres of an altitude pole at five metres to a square, ticked every ten metres with its top's height written, stood one on another as tall as the climb. `numberstar` is a fat star with its number on a white middle, for catching. The cover, `boltflycover`, is Bolt jetting straight up past clouds on two long flames, a ringed planet above, with numbered stars to catch.

`boltbot` gained a flying pose, its arms reaching up and its feet trailing. The clouds and decks are `planetground`'s cloud, metal and moon, and the backdrops reuse `skyplanet`, `cloud`, `balloon`, `starlings`, `parkhill`, `houses`, `tree`, `hedge` and `kiteground`.

For a map tile export the new files are `engine/parts/travel/skyband.ts`, `engine/parts/travel/spacestation.ts`, `engine/parts/travel/spacerock.ts`, `engine/parts/travel/altpole.ts`, `engine/parts/travel/numberstar.ts` and `engine/parts/travel/boltflycover.ts`, and `engine/parts/travel/boltbot.ts` changed.


## Christmas deliveries

`santasleigh` in `travel/` draws Santa, his red sleigh, gift sack, reins and a leaping reindeer.
Its `stride` has four discrete leg poses and `wave` changes Santa's arm at the finish. `snowhouse`
in `home/` has one to three floors, an open chimney, snowy roof, wreath and windows that light when
a delivery is complete. `christmasgift` in `home/` has two wrapping and ribbon combinations. All
three have catalogue entries, shelf groupings, descriptions and multiple takes; the sleigh game
moves their sprites rather than drawing private art inside the game.

## Paper boats and bowling

`paperboat` in `travel/` is folded paper with a pointed middle and overlapping sides, with plain
and striped takes for two racers. `bowlingpin`, `bowlingball` and `bowlinglane` in `sport/` provide
numbered standing and fallen skittles, a ball with three finger holes, and timber boards with aiming
arrows and either bumpers or gutters. Each drawing has catalogue and shelf entries, descriptions,
multiple takes and an ink rendering. The games move their sprites; river banks, reeds, flowers,
bunting and lanterns reuse existing shelf drawings.
