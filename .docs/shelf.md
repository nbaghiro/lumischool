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
