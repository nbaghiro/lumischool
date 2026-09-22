# Gaps

Status: measured, September 2026. This document audits the whole lesson catalogue against the whole art shelf and writes down what is missing: drawings on the shelf that no lesson uses, kinds of lesson we do not have, and subjects that are short of lessons worth looking at. It is written for someone deciding what to build next, so the headline numbers come first, then a ranked list of about fifteen things to build with the reason and the cost of each, and then the detail behind every finding, ending with lesson ideas for the unused art.

Superseded on 13 September 2026 by [audit.md](audit.md), which recounts the shelf against 212 lessons and 452 items, grades every item's difficulty against published benchmarks, and reports a pilot on grade one maths. The numbers below are the September count and are kept as the record of that state. Of the ranked list that follows, as the audit found it:

| Item | Still holds? |
|---|---|
| 1. The two defects (the cube keyed as a sphere, the sentence strips' `gap=`) | No. Both are fixed, and the checker now refuses both mistakes. |
| 2. Places and creatures in the lessons their worlds stand beside | Partly. 14 of the 47 world drawings are now used; 33 are not. |
| 3. Draw what reading and writing questions talk about | Mostly no. Reading scenes with a picture went from 18 to 74 per cent and writing from 12 to 86 per cent. |
| 4. Pictures for the nine written-method maths lessons | Yes. All nine still draw no picture. |
| 5. The music lessons | Partly. There are 11 music lessons; `music.rhythm` is still used by no item. |
| 6. Parts stood on hand-drawn settings, and `scale` and `count` on `art` | Yes. |
| 7. A nature and living things track | Yes. Science still has two lessons, both at grade two. |
| 8. Drawings whose settings are lists of objects | Yes. |
| 9. A lesson naming a game, and the nine missing paper items | Yes. |
| 10. A maps and journeys track | Yes. Geography has one lesson. |
| 11. Logic to one lesson a grade | Yes. The one logic lesson still draws nothing. |
| 12. Hands-on lessons with a range checker | Yes. |
| 13. A story told across a lesson (a lesson-level `let`) | Yes. |
| 14. Making something | Yes. |
| 15. Drawing and design as an art strand | Being built: twelve art lessons with paint checkers and a grown-up mark arrived during the audit. |

Every number here was counted rather than estimated. The counts come from a script that loads the content the way the tests do (`new Workspace(content())` from `test/helpers.ts`), instantiates every question a lesson shows, and walks every scene; the shelf was counted on `index.html` in the development server, and twenty two lessons were rendered on `lessons.html` and looked at. The scripts were kept outside the repository. Where a sentence is a judgement rather than a count (which drawings are the most beautiful, what separates a strong lesson from a weak one), it says so.

The short version is that the gap is mostly content rather than capability. The shelf holds 267 drawings and 170 of them appear in a lesson. Most of the 97 that do not can be written in a scene today with every setting a number a question can vary, and they include the richest drawings we have: all twenty eight made for the journal's worlds, six of the nine hand-drawn settings, the tree through the year, the pond and the sailing ship. The cheapest large improvement available to us is to write questions that use drawings we already have, starting with the lessons the worlds already stand those drawings beside. The capability gaps are real but narrower: nothing can be stood on a hand-drawn setting, a list of objects has no spelling in the notation, a lesson cannot name a game, and there is no drawing answer.

## Headline numbers

- The shelf page shows 250 drawings in 32 categories: 225 drawn in code and 25 hand-drawn files. Seventeen more code-drawn parts are used by lessons but not shown on the shelf (the drawings made for the physics, chemistry, coding, reading and writing tracks, and the plotted point), so there are 267 drawings in all.
- 170 of the 267 are placed by at least one lesson and 97 by none. Only one of the 239 items (`reading.passage-count`) sits in no lesson, and it draws nothing the lessons do not, so no drawing is used only by an orphaned item.
- Of the 97 unused drawings, 62 can be placed today with every setting writable, 21 can be placed only with part of their content frozen at the drawing's default (14 because a setting is a list of objects, 7 because it defaults to an empty list), 13 are hand-drawn files reachable only through the `art` node, and one, the US coins prop, only through the `props` node. None is unplaceable outright, and no drawing still has a setting named like a placement key.
- Whole categories are untouched or nearly so. Places and creatures: 0 of 28 used. Hand-drawn settings: 3 of 9, and those three only as the picture in one writing prompt. Rewards and page furniture 1 of 8, Sports and scores 3 of 9, Sorting and chance 3 of 8, Nature through the year 3 of 7, Journeys 5 of 11, Hand-drawn objects 5 of 11.
- The marketing page says the notation can place 258 drawn parts, 164 of them in use. The 258 counts scene node types, and sixteen of them are node types rather than drawings: text, equations, number boxes, column sums, rows, columns, arrows, components, the three pen marks, the `art` node, and the nodes that wrap the fraction, prop, dice and guide drawings. The 164 counts node types lessons use, text and number boxes included. Counted as drawings, the pair is 267 and 170.
- There are 142 lessons: maths 60; physics, chemistry, reading, writing and coding 15 each; music 2; science 2, both at grade two; geography, a second language and logic 1 each, all at grade three; art, history and nature none. Grades one to four hold 34, 38, 38 and 32. By format, 113 teach, 16 worked, 9 puzzles and 4 review, and only 4 lessons use the story section.
- The lessons show 744 scenes (each scene a lesson draws itself, plus one per question). 65 per cent carry a picture, 30 per cent carry only a written layout such as a column sum, a passage or a sentence strip, and 4 per cent are text and an input box. 36 lessons draw no picture at all: 13 of the 15 writing lessons, 8 of the 15 reading lessons, 9 maths lessons (every written method), 2 in chemistry and one each in coding, music, science and logic. In 40 lessons the first section has no picture, which is the bar [curriculum.md](curriculum.md) sets for a look section.
- 31 of the 191 drawings [curriculum.md](curriculum.md) names for the maths lessons are missing from the lessons as built, across 22 of 56 lessons, including base ten in all four column lessons. Separately, 21 items in 25 lessons name a thing we have a drawing of (hens, eggs, a bus, a cat, a dog, a pond, pots) and draw nothing.
- Of the 239 items, 160 are answered with a number, 62 with a picked option, one with both, 9 with a typed word, 4 are marked by a grown-up, 2 are matchstick moves checked by code, and one is played on the keyboard. None takes a drawing.
- No lesson can name a game, and nine of the ten activities name a paper item that does not exist. By the journal's own matching rule, 13 lessons reach a game (all maths) and 129 reach none. One lesson places the playable keyboard, none uses the drawing pad, and 13 of the 25 games designed in [games.md](games.md) have no lesson that teaches with their board drawing.
- The journal's worlds draw 88 shelf drawings around the lessons, and 51 of those appear in no lesson. Where a world stands a landmark beside the lesson it belongs to (60 pairings), the lesson itself draws that landmark 15 times.
- Two defects surfaced while measuring. The solid-naming question draws a cube in every version while its answer key says sphere, cone or cylinder, and it ships in the grade two shapes lesson with wrong keys for two of its three questions. And all 19 sentence strips in the content set a setting the drawing no longer has, so every one draws a five-square blank, including the complete sentences in five look sections.

## What to build next

Ranked by what each buys against what it costs. The first five need no core work at all, and the item counts given as costs are our estimates rather than measurements.

1. Fix the two defects. The solid-naming item writes `solid kind=k`, and because `kind` is a word setting, the drawing receives the letter k rather than the value of the parameter, falls back to its default and draws a cube; the answer key follows the parameter, so in `g2-flat-and-solid-shapes` question 1 shows a cube keyed "sphere" and question 2 a cube keyed "cylinder". The sentence strips write `gap=`, which since the drawing's own setting was renamed to `blank` is read as a placement key and ignored, so every strip keeps the default blank of five squares. It costs one item rewritten (a number setting, or four items), a rename in 14 files, and two checker warnings that would have caught both: a word setting whose value is the name of one of the item's parameters, and `gap` on a node with no relative placement. [product.md](product.md) calls a wrong answer key the failure that loses a family permanently, which is why this is first.

2. Put the Places and creatures drawings into the lessons their worlds already stand beside. None of the 28 is used by a lesson, every one of them is placeable today with only number settings, and the journal already puts 45 landmark and lesson pairings in front of the child where the lesson does not draw the landmark: the crab beside equal groups, the clock tower beside quarter past, the iceberg beside decimals. The pairings section below gives a question for each. It costs content only, roughly twenty to thirty items added to existing lessons. One limit to design around: a part derived from the shelf offers the checker no named anchors, so feedback can point at the drawing but not at one of its parts.

3. Draw what the reading and writing questions talk about. Pictures appear in 18 per cent of reading scenes and 12 per cent of writing scenes, against 75 per cent in maths and 96 per cent in physics, and 21 items in 25 lessons, most of them reading and writing, name a hen, eggs, a dog, a pond or a bus that the shelf already draws. The hand-drawn cast of five is used only in grade one reading and writing. The passage about Ada's hens is the clearest case: the hen is on the shelf and the passage sits alone in a frame. It costs content only.

4. Give the nine written-method maths lessons the pictures the plan named. All nine draw no picture. [curriculum.md](curriculum.md) names base ten for the four column lessons and plates and egg boxes for division, and the built lessons dropped them. `baseten` takes its counts rather than digits, so it can show twelve ones in a column just before an exchange, and `boxes` draws a remainder as the ones left standing outside. This also gives Break a ten, the first mechanic in the ranking in [games.md](games.md), a lesson to lead from, which today it does not have. It costs content only.

5. Write the eight music lessons [sound.md](sound.md) plans. Two of ten exist, the playable keyboard is placed by one lesson, one item takes a played answer, and the `music.rhythm` checker, built and tested, is used by no item. Music is the one subject where the child makes the answer on an instrument, and the kernel, the part, the checkers and the guided playing all exist. It costs content for seven of them; the rhythm-writing lesson waits on its bar-building mechanic.

6. Let a scene stand parts on a hand-drawn setting, and let `art` draw more than one of a thing. Six of the nine settings are unused and the other three appear only as a picture to write a sentence about. We tried it: a price tag placed at the market stall's sign, or a plate at the birthday table's plate, is refused as an overlap, and `at=stall.table` resolves to the middle of the stall's box, because before drawing only the nine box anchors are known. An `art` node has no size setting, so a setting is always drawn at its file's own ten to sixteen squares, and it has no count, so a question cannot ask about three bicycles or five rockets. Six designed games use a setting as their sheet. It costs a small core change: read anchor positions from the SVG and Excalidraw text in `lang/assets.ts` (the files already carry them), resolve `at=` against them, let a node placed on another overlap it, and add `scale` and `count` settings to `art`.

7. Build the nature and living things track. It is the strongest of the three proposals in [tracks.md](tracks.md), science has two lessons and both are at grade two, and about thirty drawings serve it, nineteen of them unused: the tree through the year, leaves, the pond, how a plant grows, flowers, animals in a field, the hedgehog, the fish tank, and the rabbits, fox, gull, crabs, dog, mice, firs, eagle, whale, parrot and palms, beside the minibeasts, birds, sky, fruit tree, garden, plant diagram and four hand-drawn animals that lessons already use. Its questions count, order, sort and label, which are all provable. It costs fifteen lessons and about twenty five items, with no new drawing needed for the first ten.

8. Let the frozen drawings take their contents. 38 drawings keep some of their content at the default because a list of objects, or an empty list, has no spelling in the notation. 21 of them are unused, among them the sorting rings, the Carroll diagram, the bag of counters, the probability scale, dominoes, playing cards, the recipe card, the suitcases, the coordinate grid and the calendar's shading. The other 17 are used, and every question that uses them shows the same default contents: every spinner has the same wedges, every signpost points to Ash, Bray and Cole, and every departure board lists the same trains to Leeds, York, Hull and Bray. It costs a change per drawing, replacing a list of objects with parallel lists of numbers or words, or declaring what an empty list holds, which the parts index already supports; no notation change.

9. Let a lesson name a game, and write the nine missing paper items. [activities.md](activities.md) designs this as a block in `try` or `puzzle` and it is not built. Nine of the ten activities name a paper companion that does not exist, 129 lessons reach no game by the journal's rule, and 13 of the 25 designed games have no lesson that teaches with their board. It costs a `play` block in the registry, a verifier check that the activity exists and that its grade band covers the lesson, a card on screen and a rule that keeps it off paper, plus nine items.

10. Build maps and journeys as a track. Geography has one lesson, at grade three. The compass rose, the map with a scale, the ticket, the mountain peaks, the volcano, the iceberg and the palms are unused, and the road distances and the signpost are used only by physics. It costs content; the route and grid-reference lessons want the signpost's arms and the coordinate grid's points from item 8.

11. Grow logic to one lesson a grade, then to a puzzles track. The one logic lesson draws nothing in any of its five scenes, and the maths puzzle sheets are four of sixty. The puzzle drawings exist (matchsticks, the number pyramid, the balance, the row of heads, the Venn diagram, the temple, the crabs), but the sorting rings, the Carroll diagram, dominoes and cards wait on item 8, and the temple needs a `cells` setting to be the number wall its own description promises. It costs content, item 8 and one setting on the temple.

12. Hands-on lessons: measure it at home, count it outside. No child's page asks for a real thing. Seven lessons suggest one (a real thermometer inside and outside, a real pencil on the printed ruler, real coins, a real clock, a real timetable, a family trip, the family's shopping receipt), and all seven put it in the grown-ups note. The printed ruler is already life size. It costs two code checkers (a reading that falls inside a stated range, and answers that agree with each other, such as the longer thing having the larger number) and blanks on the `table` part so a child can record into it; then content.

13. A story told across a lesson. Four lessons use the story section, each for one question, and none of them is in the five tracks built this month. A lesson cannot draw a number once and carry it through its sections, because the settings on `show` and `worked` are evaluated with no parameters, so a story either keeps fixed numbers or changes between pages. It costs a lesson-level `let` that block settings can read, and the verifier building each version of the lesson; small to medium.

14. Making something: a net to cut and fold, a map, a recipe. Print is life size, the solid and its net are drawn (the net is used once), and the recipe card, the measuring spoons and the mixing bowl are drawn. No lesson has the child make a thing. It costs content, the recipe's items from item 8, and a print rule that a cut-out prints at its true size rather than scaled into a question card.

15. Drawing and design, as a thin art strand. There is no art lesson. The drawing pad exists as a page, the drawing answer is specified in `engine/answer.ts` and not built, and the tessellation, pattern blocks, tangram, reflection grid and bunting are drawn, three of them unused. It costs a drawing input node that collects strokes with the grown-up as the marker, and, for the half that can be proved, a colour-the-squares answer on `grid` or `reflect`; medium, and the input is shared with handwriting.

Not ranked, because each needs a design decision before it can be costed: a lesson a sibling pair does together, a project that runs across a week, a history strand, and a second language beyond picture words. Each is discussed below.

## The detail

### How the numbers were taken

A drawing counts as used by a lesson when a scene the lesson draws itself places it, or when the lesson includes an item that places it in any of its versions. Components are expanded, props drawn inside a balance, a pattern, a choice or a picture graph count as used, and a hand-drawn file counts when an `art` node names it, including through a template such as `asset="{w}"`. Counting over every version means a lesson that shows three versions of an item may not show every drawing counted for it; we accepted that, because a drawing that some version of a lesson's question draws is not wasted.

For how a lesson looks, every scene a child sees was instantiated: the lesson's own scenes, and one scene per question for exactly the versions the lesson picks. Each node was classed as a picture, a written layout, or neither. Neither means text, equations, number and word boxes, a choice of words, the guide and its bubble, notes, pen marks, arrows, rows and columns. A written layout is a drawn part that is mostly letters, digits or boxes to write in: passages, sentence strips, word and letter cards, the alphabet, word sorts, writing lines and frames, handwriting rules, sequence and match lists, tables, column sums, the bus stop, the grid method, the number pyramid, program listings, sound buttons and boxes, syllable arcs, the place value chart, arrow cards, digit cards, place names, in and out tables, term sequences, unknown boxes, letters, balance equations, arrow chains, comparison and sign chains, tally tables, steps, recipes, receipts, departure boards, schedules, the digital clock and the rhythm bar. Everything else is a picture. The line is a judgement and it is drawn on purpose so that a page of words in boxes does not count as a drawing. We checked how much it matters at the closest calls: counting the digital clock, the day timetable, the departure board and the recipe card as pictures instead moves the scenes with a picture from 486 to 488 and leaves the 36 lessons with no picture unchanged.

To rank lessons we used one number, stated so it can be argued with: half the share of scenes with a picture, plus three tenths of the number of different pictures (capped at six), plus a fifth if the first section has a picture, minus a tenth of any share above a half taken by one drawing, minus a fifth of the share of scenes that are text and an input box. Ties among the 36 lessons with no picture were broken by fewer kinds of layout, then more scenes.

Placeability was tested by writing every code-drawn part into a lesson scene on its own and running the checker and the layout, and by reading which of its settings the parts index can spell.

### Unused art

#### By category

| Category | Drawings | Used by a lesson | Unused |
|---|---|---|---|
| Number | 7 | 7 | |
| Shape and fraction | 7 | 7 | |
| Measure and money | 4 | 3 | US coins prop |
| Data | 5 | 5 | |
| Puzzles | 3 | 3 | |
| Written methods | 4 | 4 | |
| Things to count | 5 | 5 | |
| Guide and talk | 2 | 2 | |
| Teacher's pen | 2 | 2 | |
| Where the child answers | 1 | 1 | |
| Time and the calendar | 8 | 6 | calendar, year wheel |
| Place value | 9 | 6 | abacus, Gattegno chart, place name |
| Geometry and construction | 9 | 7 | coordinate grid, shape marks |
| Capacity, mass and temperature | 7 | 7 | |
| Money as objects | 7 | 6 | notes and coins (`money`) |
| Fractions, decimals and percent | 8 | 8 | |
| Sorting and chance | 8 | 3 | Carroll diagram, sorting rings, probability scale, bag, tally table |
| The world a problem happens in | 11 | 6 | boxes, cake, flowers, animals in a field, sticker row |
| Reading and phonics | 17 | 17 | |
| Music | 4 | 2 | beat track, fretboard |
| Rewards and page furniture | 8 | 1 | stickers, badge, ribbon, brace, callout, divider, pinned card |
| Manipulatives | 10 | 6 | pattern blocks, tangram, dominoes, playing cards |
| Function machines and the unknown | 8 | 4 | in and out table, unknown box, arrow chain, letter |
| Comparing and ordering | 8 | 5 | compare, sign chain, order track |
| The kitchen | 8 | 7 | recipe card |
| Sports and scores | 9 | 3 | race circuit, race car, target, team shirts, podium, medals |
| Nature through the year | 7 | 3 | tree through the year, leaves, pond, how a plant grows |
| Journeys | 11 | 5 | sidings, carriage, engine, ticket, map with a scale, suitcases |
| Places and creatures | 28 | 0 | all 28 |
| The cast | 5 | 4 | hedgehog |
| Hand-drawn objects | 11 | 5 | bicycle, rocket, fish tank, sandcastle, wheelbarrow, bunting |
| Hand-drawn settings | 9 | 3 | kitchen counter, shop front, bedroom shelf, birthday table, hills, house |
| Written, not on the shelf | 17 | 17 | |
| All | 267 | 170 | 97 |

The seventeen parts that lessons use and the shelf does not show are `beaker`, `particles`, `funnel`, `flame`, `forces`, `tank`, `ramp`, `shadows`, `circuit`, `magnet`, `seesaw`, `program`, `turtle`, `passage`, `wordsort`, `writingframe` and `plotpoint`. They are the reverse of the problem this document is about, and indexing them is a line each in `src/art/catalog.ts`.

The hand-drawn files that are used are used narrowly. The cat, duck, hen, owl, kite, boat, cup and sun appear only in grade one reading and writing and the Spanish lesson, the pencil appears once in grade one coins, and the garden, treehouse and market stall appear only as the three pictures a child may be asked to write one sentence about. No maths lesson draws an animal from the cast or a setting.

#### How each unused drawing can be placed

Placeable today with every setting writable, 62: all 28 of Places and creatures; boxes, cake, flowers, animals in a field and the sticker row; the tree through the year, leaves, the pond and how a plant grows; the race car, team shirts and medals; sidings, the carriage, the engine, the ticket and the map with a scale; pattern blocks and the tangram; the year wheel, abacus, place name, shape marks, notes and coins, compare and the unknown box; the fretboard; and the seven pieces of page furniture. The fretboard can be placed but not played, because only `piano` is declared as an input.

Placeable only with part of their content frozen, 21. Because a setting is a list of objects, which has no spelling in the notation: the Carroll diagram's cells, the sorting rings' items, the probability scale's marks, the tally table's rows, dominoes' tiles, playing cards, the in and out table's rows, the arrow chain's steps, the letter's values, the recipe's items, the podium's places, the target's shots, and the bag of counters and the suitcases, which have no other setting and so can only be drawn as their default picture. Because a setting defaults to an empty list and so cannot show what its elements are: the calendar's shading and rings, the Gattegno chart's picks, the coordinate grid's points, the sign chain's signs, the order track's filled slots, the beat track's taps (which come from a performance at run time and never belonged in a file) and the race circuit's trail.

Reachable only through the `art` node, 13: the hedgehog, the bicycle, rocket, fish tank, sandcastle, wheelbarrow and bunting, and the kitchen counter, shop front, bedroom shelf, birthday table, hills and house. A hand-drawn file has no parameters, so a question built on one has one version unless its numbers come from a part beside it: the fish tank always has three fish and the bunting seven flags.

Through another node, 1: the US coins prop draws through `props prop=quarter`, one kind of coin to a row.

Of the three things that can stop a setting being written (a list of objects, an empty list default, and a setting named like a placement key), the first two freeze part of a drawing as listed above, and none makes a drawing unplaceable outright. The placement-key clash was fixed in the drawings (the inequality line, race track, steps, ticket and sentence strip no longer have settings named like a placement key), but the content was not moved to the new name for the sentence strip, which is the second defect above. The ten drawings whose ids contain a dot (the props, the firefly guide and the two fraction drawings) are not node type names, and each has a hand-written node that draws it.

#### The unused drawings that matter most

This is a judgement from looking at the shelf page, not a count. The drawings whose absence from every lesson costs us most are the ones a child would stop and look at: the street of houses in five colours, the sailing ship, the railway station and the clock tower, the lighthouse, the grandstand full of people, the whale, the fir trees in snow, the palms and the volcano; the tree through the year, the pond seen from above and how a plant grows; the shop front, market stall, birthday table and kitchen counter; the fish tank, sandcastle, bicycle and rocket; the cake with its candles, the team shirts and the tangram. Several of them also carry more mathematics than the drawings the lessons use instead. The houses and the grandstand are arrays, the crabs and rabbits are counting in tens and twos, the moon and the iceberg are fractions a child can point to, and the station and the clock tower read any time.

The page furniture is the one unused category that should stay unused in questions. [product.md](product.md) keeps rewards small, and a rosette or a banner is chrome rather than a subject.

### Coverage by subject and grade

| Subject | Lessons | Grade 1 | Grade 2 | Grade 3 | Grade 4 | Items | Formats |
|---|---|---|---|---|---|---|---|
| Maths | 60 | 15 | 15 | 15 | 15 | 106 | teach 43, worked 9, puzzles 4, review 4 |
| Physics | 15 | 4 | 4 | 4 | 3 | 31 | teach 12, worked 2, puzzles 1 |
| Chemistry | 15 | 3 | 4 | 4 | 4 | 25 | teach 11, worked 3, puzzles 1 |
| Coding | 15 | 3 | 4 | 4 | 4 | 24 | teach 13, worked 1, puzzles 1 |
| Reading | 15 | 4 | 4 | 4 | 3 | 20 | teach 14, puzzles 1 |
| Writing | 15 | 4 | 4 | 4 | 3 | 17 | teach 13, worked 1, puzzles 1 |
| Music | 2 | 1 | 1 | | | 4 | teach 2 |
| Science | 2 | | 2 | | | 6 | teach 2 |
| Geography | 1 | | | 1 | | 2 | teach 1 |
| Language | 1 | | | 1 | | 3 | teach 1 |
| Logic | 1 | | | 1 | | 1 | teach 1 |
| Art, history, nature | 0 | | | | | | |

Items are counted per subject as the items that subject's lessons use; one item is shared between two subjects. Outside maths no subject has a review lesson, and of the five built tracks only reading has no worked example. The four thin subjects each sit in one grade: a child meets science only at grade two, and geography, the second language and logic only at grade three. Music has two of the ten lessons its own plan calls for.

### How the lessons look

#### By the numbers

| Subject | Scenes shown | With a picture | Layout only | Text only | Lessons with no picture | Lessons with one picture throughout |
|---|---|---|---|---|---|---|
| Geography | 7 | 100% | 0 | 0 | 0 of 1 | 0 |
| Physics | 74 | 96% | 3 | 0 | 0 of 15 | 7 |
| Coding | 70 | 90% | 7 | 0 | 1 of 15 | 8 |
| Maths | 347 | 75% | 65 | 21 | 9 of 60 | 5 |
| Chemistry | 72 | 69% | 22 | 0 | 2 of 15 | 3 |
| Language | 8 | 50% | 1 | 3 | 0 of 1 | 0 |
| Science | 13 | 46% | 3 | 4 | 1 of 2 | 1 |
| Music | 8 | 38% | 5 | 0 | 1 of 2 | 0 |
| Reading | 71 | 18% | 58 | 0 | 8 of 15 | 4 |
| Writing | 69 | 12% | 61 | 0 | 13 of 15 | 0 |
| Logic | 5 | 0% | 0 | 5 | 1 of 1 | 0 |
| All | 744 | 65% | 225 | 33 | 36 of 142 | 28 |

A scene carries 0.87 pictures on average. Repetition is common rather than rare: 28 lessons draw one picture from start to finish (seven of the fifteen physics lessons and eight of the fifteen coding lessons among them), and in 81 lessons a single drawing takes at least half of all the pictures the lesson places. A drawing that appears in a lesson appears 2.4 times in that lesson on average.

How a lesson opens: in 100 lessons the first block of the first section is a scene or question with a picture, in 40 it is a written layout, and in 2 it is text. 102 lessons have a picture somewhere in their first section, so 40 do not meet the bar that the look section shows the idea with a picture before any question is asked.

#### Twenty two lessons looked at

We rendered the ten weakest lessons by the measure above, two more from reading and writing because those subjects are the weakest as a group, and the ten strongest, on `lessons.html?lesson=<id>` at 1440 pixels wide, and read every one of them.

The ten weakest, in order: `thinking-in-words` (logic), `science-materials-and-forces`, `g3-dividing-with-a-remainder`, `g4-long-division`, `g3-adding-in-columns`, `chemistry-what-things-are-made-of`, `chemistry-a-fair-test-dissolving`, `g2-adding-with-an-exchange`, `g2-taking-away-with-an-exchange` and `g3-taking-away-in-columns`, with `reading-what-it-does-not-say` and `writing-joined-with-and` added. The ten strongest: `g3-angles-and-symmetry`, `writing-a-sentence-about-a-picture`, `g2-flat-and-solid-shapes`, `g1-coins-and-prices`, `g4-adding-fractions`, `g2-year-review`, `g1-year-review`, `g1-shape-puzzles`, `g4-coordinates` and `g2-grams-and-kilograms`. We also looked at `physics-magnets` as the plainest case of one drawing repeated.

What separates them, as we read the screenshots. The strongest open with a look scene that puts four to six different drawings in colour on one sheet: an angle, a set square, a folded rectangle, a reflected shape and a tessellation; or a purse, a price tag, a shelf of priced things and a count of coins. Each question's drawing is the question itself (a dial to read, a shape to fold, coins to count), the objects are ones a child knows, and the marker colour covers a real share of the card. The second strongest by the measure is a writing lesson, and it is strong because of the hand-drawn duck, boat and garden and the basket and tree: a child is asked to write about something worth looking at.

The weakest repeat one written layout in every card, a column sum, a bus stop, a sentence strip, a passage in a frame or a two-column word sort, in small type. Because a scene is scaled to fit a half-width question card, a three-digit column sum is drawn at about the size of the question's own text, and most of every card is empty squared paper. In the look section the guide and a speech bubble stand in for a picture. And the questions talk about things they do not draw: eggs packed into boxes of three, pots of different heights, Ada's nine hens, a spoon and a door.

Even the strongest lessons show the weaker habits. `g2-grams-and-kilograms` asks "how heavy is the bag?" beside a spring scale with no bag on it. `g2-flat-and-solid-shapes` draws the same cube three times running, which is the first defect above. `physics-magnets` draws the same bar magnet seven times, correctly and clearly, and the page reads as a diagram repeated rather than as a place.

#### Art the plan named and the lessons dropped

[curriculum.md](curriculum.md) lists the art each maths lesson leans on. Comparing that list with what each built lesson places (year reviews excluded, since they draw from the whole year):

| Lesson | Planned but not placed |
|---|---|
| g1 counting to twenty | ten frame, tub of counters |
| g1 bonds to ten | ten frame |
| g1 adding to twenty | rekenrek |
| g1 taking away to twenty | bar model, number line |
| g1 halves and quarters | cake |
| g1 balance and shape puzzles | tangram, pattern blocks |
| g2 adding with an exchange | base ten |
| g2 taking away with an exchange | base ten |
| g2 flat and solid shapes | tangram |
| g2 halves, quarters and thirds | chocolate bar |
| g2 sorting and chance puzzles | Carroll diagram, sorting rings, probability scale |
| g3 numbers to a thousand | number ladder |
| g3 adding in columns | base ten |
| g3 taking away in columns | base ten |
| g3 times tables | in and out table |
| g3 multiplying by ten | place name |
| g3 dividing with a remainder | plate, egg box |
| g3 function machine puzzles | machine chain, arrow chain, unknown box |
| g4 numbers to a million | place name |
| g4 long division | plate |
| g4 coordinates | coordinate grid |
| g4 thinking problems | balance, dominoes |

That is 31 of 191 planned drawings across 22 of 56 lessons. Seven of the 31 are frozen drawings (the Carroll diagram, sorting rings, probability scale, in and out table, arrow chain, coordinate grid and dominoes), which is why the plan could not be followed there; the rest were simply not written.

#### Things a question names and does not draw

Twenty one items whose scene has no picture name something the shelf draws. Reading: a passage about Ada's hens and eggs (in three lessons), a passage with children, a bus and a shop, a sight-word sentence about a cat and a bus, a title question about a cat and a pond, two syllable questions about a cat, a rabbit and a dog. Writing: sentences about a dog, an apple and a shop in six lessons. Maths: eggs packed into boxes in both division lessons, two buses in multiples, a shop in the grade four review, and red and blue counters packed into bags in factors, where the bag of counters is drawn but frozen. Science and chemistry: pots of plants ordered by height, an egg in a life cycle, spoons in a dissolving table and a spoon in a sort. Spanish: the cat. Each is a place where a drawing we own would turn a sentence into a picture.

### Answers and interaction

Answer kinds, one per item: a number 160, a picked option 62, both 1, a typed word 9, collected for a grown-up to mark 4, a matchstick move checked by code 2, notes played on the keyboard 1. By subject, reading and writing are the only ones that type words, writing the only one the grown-up marks, and music the only one that plays; everything else is numbers and picks. `engine/answer.ts` specifies a drawing answer and a performance answer beside the number and the pick, and the corpus holds no drawing answers and one performance.

Games. A lesson file has no way to name an activity, so the only link between a lesson and a game is the one the journal computes: the game whose paper companion is one of the day's questions, or failing that one that shares a skill. Nine of the ten activities name a paper companion that is not in the content: `numberline.missing-jump`, `inout.find-the-rule`, `numberline.count-in-tens`, `coords.plot-the-route`, `sequence.put-in-order`, `jug.read-the-scale`, `change.count-up`, `fraction.fair-shares` and `soundboxes.spell-it`. Only `balance.chain` exists, and it reaches one lesson, the grade one review. Twelve more maths lessons reach a game through a shared skill. No lesson in any other subject reaches a game, and no lesson reaches a game on the Games tab, `play.html`, except through the same activities.

Instruments and drawing. One lesson, `music-keyboard`, places the playable keyboard, and one item is answered by playing it. Five writing lessons collect handwriting or a writing frame, and four items are marked by the grown-up. No lesson uses the drawing pad, and no lesson follows a phrase on the keyboard, which `src/sound/lesson.ts` can do on the music page. Physics, chemistry, reading, science, geography, the second language and logic have no game, no instrument and no drawing or writing task at all, and coding has only one lesson that gives the child lines to write a program on.

### Worlds and games

#### The worlds' landmarks

Each world names which of its landmarks and creatures reach into which lessons. Counted against each world's own term:

| Grade and term | World | Lessons in the term | Lessons a landmark reaches | Reaches with no lesson in the term | Landmarks and creatures that reach nothing |
|---|---|---|---|---|---|
| 1, 1 | Meadow | 10 | 2 | birds, minibeasts | season tree, pond, treehouse, flowers, sheep, wheelbarrow, hedgehog, hen |
| 1, 2 | Harbour | 11 | 3 | lighthouse | sandcastle, kite, bunting, fish tank, gull, duck |
| 1, 3 | Railway | 13 | 2 | signpost, suitcases | departures, sidings, bus, bicycle, fox, cat |
| 2, 1 | Woods | 4 | 2 | season tree, rabbits, owl | pond, tree, fox, hedgehog |
| 2, 2 | Kitchen | 12 | 5 | scales, jug | birthday table, cat, mouse |
| 2, 3 | Town | 22 | 6 | | bicycle, bunting, dog, cat, birds |
| 3, 1 | Night sky | 8 | 2 | telescope (on light) | firs, pond, owl, fox, hedgehog |
| 3, 2 | Sports ground | 10 | 2 | long jump, race track, scoreboard, grandstand | target, medals, dog, birds |
| 3, 3 | Laboratory | 20 | 6 | spring balance | ramp, mouse |
| 4, 1 | Mountains | 6 | 6 | | signpost, hares, fox |
| 4, 2 | Open sea | 15 | 13 | | two gulls |
| 4, 3 | Volcano island | 11 | 7 | | palms, gull |

Of 62 reaches, 46 find a lesson in their own term and 16 do not; every reach finds a lesson somewhere in the corpus. Fifty landmark and creature places across the twelve worlds reach no lesson at all. The worlds' own wants lists ask for 24 more drawings, two a world, from a stile and a hedge for the meadow to a sea turtle and a rope bridge for the island.

The finding that matters more is the one in the headline. A reach puts a landmark beside the top of a lesson's sheet with a line in the world's hand, and in 45 of the 60 pairings the lesson under it does not draw that landmark: the harbour's crab stands beside equal groups, whose questions draw trains, arrays and an egg box; the town's clock tower stands beside quarter past and quarter to, whose questions draw a plain clock face. Of the 88 shelf drawings the worlds use, 51 appear in no lesson, so the world around the child's page is richer than the page. Item 2 in the ranking closes most of this with content alone.

#### The designed games

[games.md](games.md) designs twenty five games and names each one's board drawing and the lesson whose mathematics it plays. Twelve have a lesson that teaches that mathematics with the same board drawing: Make the train, Weigh out five hundred grams, Down to minus four, Make it to the next town, Count up the change, Two pizzas five people, Get it back, Make the connection, Stretch the band, Sit further out, Make the average and Fold it in half.

Thirteen do not. Cover the hexagon (pattern blocks are unused), Up the ladder (the number ladder appears only at grade two, the treehouse only as a writing picture), Cross the hundred square (the hundred square is in numbers to a hundred, not in adding tens and ones), Land on the note (no music lesson above grade one places the pitched staff, `notes`), Land the long jump (tenths never draws the long jump), Spell it out of the siding (carriages and sidings are unused), Heaviest at the back (suitcases are unused and frozen), Spend it all (the shop front is unused), Measure the spoonful (the spoons appear only in chemistry), Everyone the same (the birthday table and cake are unused), Two machines (no grade four maths lesson has a machine chain), Break a ten (no column lesson draws base ten) and Fill the tray (the baking tray appears only at grades one and two). Four of the games [games.md](games.md) recommends building first are in this list: Up the ladder, Spell it out of the siding, Everyone the same and Break a ten.

### Lesson types we do not have

| Kind of lesson | Lessons today | Can the notation and engine express it today | Smallest thing that would let it |
|---|---|---|---|
| A story told across a lesson | 4 lessons have a story section, each one question | Partly. The same characters can appear on every page, but a lesson cannot choose a number once and carry it through, because block settings are fixed constants | A lesson-level `let` that `show` and `worked` settings can read, with the verifier building each version of the lesson |
| An investigation at home with real things | None; 7 lessons suggest one in the grown-ups note | Partly. The page can say what to do and collect what the child writes, marked by the grown-up | A code checker for answers that agree with each other, and blanks on `table` so a result can be recorded |
| Making something: a paper model, a map, a recipe | None | Yes for a printed net and questions about it; no for a recipe, whose items are frozen | The recipe's items as lists, and a print rule that a cut-out prints at true size |
| Measuring things around the house | None | Partly. The printed ruler is life size, but an answer must equal one value | A code checker that accepts a reading inside a stated range |
| Going outside | None | Partly, as for an investigation. Questions about the child's own counts cannot be proved in advance | The same consistency checker; the proved questions stay on drawn data such as the birds on a wire |
| A project across a week | None | No. A lesson is one sitting, and the plan schedules lessons rather than parts of one | A format whose sections are days, and a plan that gives one section a day; the plan side is the larger part |
| Led by a game | None | No. There is no block that names an activity | The `play` block from [activities.md](activities.md), and the nine missing paper items |
| Led by the keyboard | 1 | Yes for playing named notes. No for following a phrase, which only the music page can do | A `phrase` setting on `piano` that uses `follow` from `src/sound/lesson.ts` |
| A drawing or design lesson | None | No. There is no drawing input | A drawing input node collected for the grown-up, and a colour-the-squares answer for symmetry and pattern |
| Built around a hand-drawn setting | 1, as a picture to write about | Only with parts beside the setting, never on it | Anchor positions read from the file, placement on them, an overlap exemption, and `scale` and `count` on `art` |
| A sibling pair together | None | No. A lesson has one grade, and a sitting belongs to one child | Practice blocks that name which child they are for, and a sitting shared by two children in the data model |

### Subjects to deepen, add or keep thin

Nature and living things deserves a full track, and it should come first among new subjects. The art is drawn and almost all of it unused, the worlds already walk the child past it, its questions are counting, ordering, sorting and labelling, which the verifier proves, and a five-year-old wants to look at a pond. Science as a separate subject label should be folded into it and into physics and chemistry: of the two science lessons, both at grade two, one covers materials and push and pull, which chemistry lessons one and two and physics lesson one already teach, and the other, living things, is a nature lesson in all but name.

Music deserves its planned ten rather than a full fifteen. The instrument, the checkers and guided playing are built and tested, so the cost is content, and ten was sized in [sound.md](sound.md) against what a child can take alongside everything else.

Maps and journeys deserves a track, after nature. The objection in [tracks.md](tracks.md), that half of it is maths in a hat, still holds for scale and timetables. The other half is not maths: a map from above, the compass points, a route, a grid reference, where the mountains and the sea are. The compass rose, the map with a scale, the ticket and the world places are drawn and unused, and the lessons that need the signpost's arms and the coordinate grid's points wait on the frozen settings.

Logic and puzzles can honestly grow from one lesson to one a grade at once, and to a track once the sorting drawings take their contents. The one lesson today is text only, which is the opposite of what the puzzle art is for.

Art can honestly be added as a thin strand of four or so lessons, not a track. [tracks.md](tracks.md) turned down an art track because most answers would be judgements, and that stays true of a free drawing. But symmetry, tessellation, pattern and composition with pattern blocks and the tangram have provable questions, and a drawing collected for the grown-up to mark is the same promise writing already makes. It needs the drawing input first.

A second language should stay thin: picture vocabulary using the cast and the creatures (el gato, el perro, la ballena) is writable today, but [sound.md](sound.md) defers recorded speech until this strand forces the decision, and a language without its sounds is matching.

History should stay out for now. There are no drawings for it beyond the timeline and a clock tower, the rule in [curriculum.md](curriculum.md) is that a topic waits for its picture, and the facts we could prove would mostly be dates.

### Pairings: lesson ideas for the unused art

Each idea names the drawing, the grade and subject, what the child does, and whether it can be written today. Settings are written as a scene would write them. "Today" means with the notation and engine as they are; where an idea needs one of the ranked items, it says which. To check the word, seven of these (the rabbits, the grandstand, the houses, the row of lanterns, the parrot with its bubble, the rocket beside a number line counting back, and the clock tower) were written as items outside the repository and passed the checker and the verifier over every version, once each scene was sized to fit.

#### Places and creatures

| Drawing | Grade and subject | What the child does | Today |
|---|---|---|---|
| `rabbits count=n` | 1, maths, counting in steps | Counts the ears in twos along a row of two to nine rabbits and writes the total; writing the number of rabbits gets "each one has two ears". The meadow's rabbit already stands beside this lesson. | Yes |
| `crabs count=n` | 1, maths, counting in tens | Counts a crab's eight legs and two claws as ten, then counts the limbs of up to five crabs in tens. | Yes |
| `houses count=a windows=b` | 2, maths, threes and fours | Finds how many upstairs windows there are along the street as a lots of b, and in a second question the same street with the rows read the other way. | Yes |
| `grandstand rows=r seats=s filled=f` | 3, maths, times tables | Works out how many the stand holds and how many more people can sit down, two blanks, r times s and then take away f. | Yes |
| `clocktower hour=h minute=m` | 2, maths, quarter past and to | Picks the time the tower shows from four written times, with minutes at 15 or 45. The town's clock tower stands beside this lesson. | Yes |
| `station hour=h minute=m` with `train` below | 1, maths, o'clock and half past | Reads the station clock, at an o'clock or a half past, and picks the time the train comes in. The railway's station stands beside this lesson. | Yes |
| `moon phase=p` | 1, maths, halves and quarters | Picks how much of the moon is lit: a quarter, a half or all of it. | Yes |
| `iceberg under=1` | 4, maths, decimals and percentages | Picks the decimal of the iceberg above the water, then writes the percentage that is under it. | Yes |
| `compass needle=d` | 4, maths, angles, and maps | Writes how many degrees the needle has turned from north, in right angles and then in halves of them; in the maps track, picks the direction it points. | Yes |
| `ship sails=a portholes=b` | 2, maths, equal groups | Counts the portholes on two ships and the sails on three. | Yes |
| `chest open=1 coins=k` | 2, maths, amounts; 4, money with decimals | Each coin is a quarter (grade two) or 2.50 (grade four): writes what the chest holds. | Yes |
| `lighthouse stripes=n` beside a `program` | 4, coding, repeats | Reads a program that paints a red and a white stripe inside a repeat and writes how many times the repeat runs to paint this lighthouse. The open sea's lighthouse stands beside the repeat lessons. | Yes |
| `whale spout=1` beside a `passage` | 4, reading, what it does not say | Reads that the whale came up at ten past two and stays down twenty minutes, and works out when it will next spout. | Yes |
| `parrot` with a `bubble` from it | 4, reading, fact and opinion | Picks whether what the parrot says, "Green is the best colour", is a fact or an opinion. | Yes |
| `volcano smoke=1` beside a `table` of melting points | 4, chemistry, melting and boiling points | Picks which of the things in the table would melt in lava at the temperature given. | Yes |
| `tent lit=1` | 4, maths, long division | Twenty seven climbers sleep four to a tent: writes how many tents are needed, which is the remainder read as one more. | Yes |
| `telescope tilt=d` | 4, maths, angles | Picks whether the telescope is tipped up by an acute, a right or an obtuse angle. | Yes |
| `lantern lit=...`, a row of five | 4, coding, a number that changes | Traces a program that lights one lantern for each time round, and writes how many are lit when it stops; each lantern's `lit` is an expression of the count. | Yes |
| `mice count=a` and `mice count=b` | 1, maths, adding to twenty | Two groups of mice by the jar: writes how many there are in all. | Yes |
| `dog`, `fox`, `gull` | 1, writing, a word you can hear | Says the picture's name slowly and writes it one letter to a box, extending the hand-drawn animals to three more short words. | Yes |
| `firs count=3 snow=1` beside `seasontrees` | 2, nature | Picks which trees keep their needles through the winter. | Yes |
| `peaks count=n` | 3, maths, ordering and rounding | Puts the peaks in order by height, or rounds each height. | Needs a heights setting on the drawing |
| `temple rows=r` | 4, maths, thinking problems | Fills in the stones of the temple so each is the sum of the two below it. | Needs `cells` and `blanks` on the temple; until then a `pyramid` beside it |
| `goalposts`, `palms`, `eagle`, `gull` | Any, as scenery | Best used as the look picture beside a question rather than as the question. | Yes |

#### Nature, the story shelf and sport

| Drawing | Grade and subject | What the child does | Today |
|---|---|---|---|
| `seasontrees seasons=[...]` in a shuffled order, with `sequence` | 1, nature | Numbers the four trees from spring to winter. | Yes |
| `growstages stages=4 numbers=false`, with `sequence` | 1, nature; 2, science | Puts seed, shoot, leaves and flower in order; replaces the "pots" question that draws nothing. | Yes |
| `pond pads=a fish=b` | 1, maths or nature | Writes how many things are on top of the water (the pads and the frog) and how many are under it. | Yes |
| `leafrow kinds=[oak, maple, holly] labels=false` | 2, nature | Picks the holly by its edge, since the leaves are one colour on purpose. | Yes |
| `cake candles=a` | 1, maths, making ten | The cake has a candles on it: writes how many more would make ten. | Yes |
| `flowers count=n petals=5` | 2, maths, counting in fives | Counts the petals in fives and writes the total. | Yes |
| `animals kind=sheep count=n` | 2, maths, twos and fours | Writes how many legs, four each; a second item uses ducks at two each. | Yes |
| `boxes boxes=q per=d loose=r` | 3, maths, dividing with a remainder | Writes how many were packed, and in the reverse question how many boxes are full and how many are left outside. The picture the division lessons lack. | Yes |
| `starrow slots=10 filled=f` | 1, maths, bonds to ten | Writes how many more stickers fill the chart. | Yes |
| `teamgrid rows=r cols=c second=s` | 3, maths, times tables | Writes how many shirts there are and how many belong to the striped team. | Yes |
| `medalrow labels=[...]` | 1, maths, first, second and third | Picks who came second from the ribbons and discs. | Yes |
| a row of `racecar vx=a` | 3, physics, speed | Picks which car will travel furthest in the next turn by the length of its arrow. | Yes |
| `target` with shots | 2, maths, adding | Adds the score of three darts. | Needs item 8 |
| `podium` with names | 1, maths, ordinal numbers | Writes who stood on which place. | Needs item 8 for its places |

#### Journeys and manipulatives

| Drawing | Grade and subject | What the child does | Today |
|---|---|---|---|
| a row of `carriage label="c"` and `loco` | 1, reading, blending sounds | Picks the carriage that carries the first sound of the word on the engine's sign; it is the paper version of Spell it out of the siding. | Yes |
| `sidings slots=5 siding=2` | 1, maths, ordering | Told which two carriages were pushed into the siding and in what order, writes which one comes out first. | Yes, with the carriages beside the drawing; in the siding needs item 6 |
| `ticket time="9:15" price="$4.50"` | 3, maths, minutes and money | The journey takes forty minutes: picks the arrival time, then works out the change from five dollars. | Yes |
| `mapscale km=k step=s` | 4, maps, scale | Writes how far the route is from the scale bar. | Yes |
| `tangram apart=true` | 2, maths, shapes | Counts the triangles among the seven pieces, then names the one square. | Yes, one version |
| `patternblocks mode=thirds` | 2, maths, halves, quarters and thirds | Writes how many rhombuses cover the hexagon and what fraction one of them is; one item per mode until the mode is a number. | Yes |
| `suitcases` | 2, maths, grams and kilograms | Orders the cases from lightest to heaviest. | Needs item 8 |
| `dominoes`, `cards` | 1 to 2, maths, adding | Adds the two ends of each tile, or the three cards in a hand. | Needs item 8 |

#### The hand-drawn files

| Drawing | Grade and subject | What the child does | Today |
|---|---|---|---|
| `art asset="rocket"` beside a `numberline` counting back | 1, maths, taking away to twenty | Counts down from the number on the launch pad in jumps and writes where it lands. | Yes |
| `art asset="bicycle"` | 1, maths, counting in twos | Counts the wheels on a row of bicycles. | Needs `count` on `art` |
| `art asset="fish-tank"` | 1, maths, how long and how heavy | Picks the longest fish; best as the look picture, since the tank always holds the same three fish. | Yes, one version |
| `art asset="sandcastle"` | 1, maths, how long and how heavy | Picks the tallest tower and counts the flags. | Yes, one version |
| `art asset="bunting"` | 1, maths, shape puzzles | The look picture for continuing a pattern, before the pattern strip asks the question. | Yes, one version |
| `art asset="wheelbarrow"` | 1, maths, taking away | Three things are in the barrow and one falls out: the look picture for taking away. | Yes, one version |
| `art asset="hedgehog"` | 2, reading, clapping the beats | Claps hedge-hog and writes how many beats. | Yes |
| `art asset="shop-front"` with a row of `pricetag now=p` below | 1, maths, coins and prices | Picks the two things in the shop that fifty cents will buy, with the prices as parameters (the `shop` drawing's own prices are frozen); with item 6 the tags stand in the window. | Yes, beside; on it with item 6 |
| `art asset="market-stall"` with `dialscale` | 2, maths, grams and kilograms | Reads what the fruit from the stall weighs, and later plays Weigh out five hundred grams on the same sheet. | Yes, beside; on it with item 6 |
| `art asset="birthday-table"` with `children` and `cake slices=s` | 2, maths, sharing equally | Shares the slices between the children at the table and writes how many each has. | Yes, beside; on it with item 6 |
| `art asset="kitchen-counter"` with `jug` and `containers` | 2, maths, litres and millilitres | Reads the jug standing on the counter. | Needs item 6 |
| `art asset="bedroom-shelf"` | 1, maths, position | Says what is to the left of the plant and between the books and the box. | Needs item 6 |
| `art asset="treehouse"` beside a `numberline` | 1, maths, adding to twenty | Sam is on rung five of twelve: writes how many rungs are left to the platform; the sheet for Up the ladder. | Yes, beside |
| `art asset="hills"` with `roaddistances` | 3, physics, how far and how long | Adds the legs of the walk over the hills. | Yes |

#### The rest of the unused shelf

The year wheel (`mark="October"`, pick the month three months later), the calendar (`first=f`, pick the weekday of the tenth), the place name (`value="2405" ring=k`, write what the ringed digit is worth, which the plan named for grade three and grade four), compare (`left` and `right` with a choice of sign), the unknown box (a missing number), notes and coins (`money`, write the total), shape marks (name the quadrilateral from its marks) and the abacus (read the number) can all be written today into the lessons they were drawn for. The Gattegno chart, sign chain, order track, in and out table, arrow chain, letter, probability scale, bag, tally table, Carroll diagram, sorting rings and recipe each get their question once item 8 lands. The fretboard wants a playable declaration like the keyboard's before a guitar lesson can be written. The beat track belongs to the run time rather than to a file.

#### Three to start with

A counting-on-legs-and-ears lesson for grade one counting in steps: rabbits for twos, flowers for fives and crabs for tens, each with its count as a parameter, in place of the baking tray the lesson draws four times today.

A grandstand lesson for grade three times tables: the street of houses as the look picture, then rows times seats and how many more can sit down, which is the two-step question the grade three set lacks.

A year by the pond for grade one nature: the tree through the year in order, how a plant grows in order, and the pond with what is on the water and what is under it, all provable and all drawn.

### Defects found along the way

The solid-naming item draws the default cube in every version, because `kind=k` hands the drawing the word "k". Its answer key follows the parameter, so `g2-flat-and-solid-shapes` shows a cube keyed "sphere" as question 1 and a cube keyed "cylinder" as question 2. A scan of every word setting in every item found this one case. The checker could catch it by warning when a word setting's value is the name of one of the item's parameters.

The sentence strips set `gap`, which the drawing no longer has. All 19 strips in 8 lessons and 6 items are affected, and the nine that set `gap=0` to show a complete sentence draw an empty blank before the full stop instead, in the look sections of reading lessons 4 and 14 and writing lessons 2, 8 and 10. The writing lesson on joining sentences shows "I had toast and an apple ____ ." as its model. The checker accepts `gap` because it is a placement key on every node; a warning when `gap` appears with no relative placement would have caught all nineteen.

Nine activities name paper items that do not exist, listed under answers and interaction. The journal's rule for choosing a day's game falls back to skills as a result.

The ticket's price still defaults to £4.50, which [curriculum.md](curriculum.md) says should change to dollars. A lesson can set `price` as text, so this does not block the ticket idea above.

The rail on `lessons.html` lists every scene node type under "the art it draws", including text, number boxes, rows and columns, and the marketing page's figure is computed the same way. Both overstate how drawn a lesson is. `artOf` also does not look inside components, so the balances in the balance chain component are reported as `use`.

### What we did not measure

Beauty beyond the twenty two lessons we rendered and looked at. Print: [tracks.md](tracks.md) reports thirty one maths scenes wider than the printed page, and we did not recount them. Reading load. Whether a question that passes the verifier is well taught, which is the risk [product.md](product.md) names first. How long any item in the ranking would take in days; the costs above say what changes, not how long it takes.
