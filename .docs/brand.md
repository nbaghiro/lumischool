# Brand

Status: the logo is the paper bird, chosen by the owner on 13 September 2026, and its tab favicon is the bird on no ground, chosen on 14 September 2026. This document is about the logo: the ideas we sketched, the five directions we took on and the thinking behind each, what we checked them against, how the logo behaves from a 16 px favicon to a 1500 px banner, the rules its motion keeps, and where the apps' files come from and how the apps use them. The product draws it from `engine/parts/brand.ts`. The four directions not chosen stay on the scratchpad's Logo tab, `brand.html`, as the record of the exploration.

## The decision

On 13 September 2026 the owner settled the logo on the paper bird, from the Logo tab, with one change: the favicon should be like the app icon and the social profile picture of the same bird, which the owner found looked much better than the favicon did. The small drawings for 16, 24 and 32 px were redrawn from the app icon for that ("Every size", below). The bird's word, lockups, icon, profile picture and loop are as the direction was built.

On 14 September 2026, after comparing the candidates in "Choosing the favicon", the owner chose the paper bird on no ground for the tab favicon: the bird as the scratchpad's top bar shows it, with no tile. Only the tab favicon changed. The app icons keep the yellow tile, so the two differ on purpose, as "In the apps" explains.

The bird and the machinery it needs moved to the root as `engine/parts/brand.ts`, which starts `engine/parts/` ahead of the shelf's drawings ([structure.md](structure.md)). The lantern, the road, the snail and the highlighted word were not deleted, because `.scratchpad/` is not in git and deleting them would lose them. They stay on the Logo tab, drawn with the root's machinery, and any of them can still be previewed in the scratchpad's top bar.

## Where it lives

At the root:

| File | What it holds |
|---|---|
| `engine/parts/brand.ts` | The paper bird as SVG text: the mark, the word, both lockups, the small drawings for 16, 24 and 32 px, the app icon, the profile picture, the link preview, the one-colour versions and the loop's keyframes, with the machinery that lays them out and the word's outlines in the logo's setting of Shantell Sans. Everything is a pure function with no DOM, and every colour is `engine/paper.ts`'s palette or one of two shades of its glow. |
| `engine/parts/__tests__/brand.test.ts` | The rules in this document, as tests. |
| `engine/ui/logo.tsx`, `engine/ui/logo.css` | `<Logo>`, the Solid component that draws the logo inline on a page. |
| `tools/brand.ts` | A Vite plugin that makes the apps' files from `brand.ts`, serves them in dev and writes them into the build. Run on its own, it writes the files we upload by hand. |
| `tools/__tests__/brand.test.ts` | The files' sizes, and each app's head against what is served, with no manifest in any. |

In the scratchpad, the record of the exploration:

| File | What it holds |
|---|---|
| `src/brand/marks.ts` | The four directions not chosen, drawn with the root's machinery, and all five by name for the Logo tab, the top bar and the export. |
| `src/brand/letters.ts` | The word's outlines in the other three settings of Shantell Sans. |
| `src/brand/ideas.ts` | The seventeen ideas we sketched, each with its sketch and the reason it was kept or left. |
| `src/brand/wear.ts` | The logo in the scratchpad's own top bar and browser tab, or a direction not chosen previewed there. `topBar()` in `src/core/chrome.ts` calls it. |
| `brand.html`, `src/pages/brand.ts`, `src/styles/brand.css` | The Logo tab. `?export` lays every raster file out at its real size for the export. |
| `scripts/export-brand.mjs` | Writes every file of all five into `brand/<variation>/`. |
| `test/brand.test.ts` | The same rules, for the four directions not chosen. |
| `brand/lantern/`, `brand/bird/`, `brand/road/`, `brand/snail/`, `brand/word/` | The exported files, 27 for each variation. |

None of the marks is built with `defineVisual`. They are brand files rather than drawings a lesson places, so they are not on the art shelf, the shelf's catalogue does not carry them, and the catalogue test does not apply to them. `brand.ts` is in `engine/parts/` because it is drawing that runs in the apps, not because it is a shelf drawing. If a lesson or a world ever wants to place the bird, it gets a shelf entry then.

## What we started from

The name is lumischool, at lumischool.ai, and "lumi" suggests light. The top bar's wordmark today is the word set in Shantell Sans at weight 760 with its informal and bounce axes turned up, and a yellow highlighter band under "school", drawn in CSS. Everything else we draw sits on 5 mm squared paper and is drawn with the seeded rough.js pen in one palette. The owner's favourites were the art shelf, the journal's worlds and the illustrated map of the country, Site W, the seven guides and the paint tool, so every idea was meant to grow out of one of those rather than arrive from outside.

## The ideas we sketched

We sketched seventeen ideas with the shelf's pencil before choosing five. The sketches are on the Logo tab under "Every idea we sketched".

| Idea | What it grew from | Outcome |
|---|---|---|
| A firefly carrying its light | The firefly guide, and "lumi" as light | Left. SMART's Lumio, a classroom product whose name is one letter from ours, uses a line-drawn firefly with a yellow glow as its app icon. |
| The glow, a light with a face | The glow guide | Left. A yellow round face is Lumi Academy's star mascot and Doodle Learning's star, a glowing creature with eyes is Learn with Lumi's, and rays round a circle are Brightwheel's and Kodable's. |
| The paper bird | The paper bird guide | Chosen, and the logo since 13 September 2026. |
| The walked road on the map | The map's highlighted roads | Chosen. |
| One 5 mm square and a pencil tick | The squared paper | Left. A square with a tick is a checkbox, at 16 px it is a plain square nobody can own, and Brilliant's mark is a square in a shape. |
| The lantern at the end of the map | The lanterns on the map and the one on the island | Chosen. |
| A lighthouse and its beam | The harbour | Left. A striped tower is a building, and a building with a beam turns to a smudge below 24 px. |
| Squared paper folding into a world | The paper and the map | Left. At small sizes a sheet with a turned corner is the file icon every computer already has. |
| The yellow highlighter swash | The top bar's wordmark | Chosen, as the highlighted word. |
| A monogram l drawn as one path | The wordmark | Left. Lumos Learning's mark is a swooping L with a star at its tip, Prodigy's is a looped P, and a lone l reads as a capital L or a 1. |
| A pencil stub with a light at its tip | The pencil stub guide | Left. Pencils are common in the category (Education.com's mark is one). |
| The snail and its house | The snail guide | Chosen. |
| The dot, an ink blot with eyes | The dot guide | Left. A blob with eyes is Learn with Lumi's mascot and close to ClassDojo's, and a face filling a tile is the category's habit. |
| The map's compass rose | The map | Left. A four-pointed star now reads as the sparkle of an AI product, and stars belong to Twinkl, Starfall and Hooked on Phonics. |
| An open book with light between the pages | School | Left. Books are the most used picture in education marks, so it would say school and nothing about us. |
| A lit window of four panes | The cottage on the map | Left. Four panes in a square is the Windows logo. |
| The paper plane between the worlds | The map's paper plane | Left. A paper plane is the send button in every app and Telegram's whole logo. |

Three of the losses share one cause. Names built on "lumi" are crowded in this market, and the three brands closest to our name (Lumio, Lumi Academy and Learn with Lumi) all show light as a glowing creature or a glowing insect. We concluded that the light in our logo has to come from something only we have, the map's lantern or the highlighter on the page, rather than from a character that glows.

## The five

Each variation has a primary lockup, horizontal and stacked; the mark alone; the wordmark alone; a favicon as SVG and as PNG at 16, 32 and 48 px, the smallest drawn by hand; an Apple touch icon at 180 px; icons at 192 and 512 px with a maskable version of each; a 400 by 400 profile picture; a 1200 by 630 link preview; a 1500 by 500 banner; a loop for the top bar and the loading moment; and one-colour versions for print.

### The lantern

Every world on the map has a lantern by the road into it, lit on the day its last lesson is finished, and the road from the garden gate ends at the lantern at the top of the island ([story.md](story.md)). It is the one light in the story that belongs to the child's work, which makes it the most honest reading of "lumi" we found. It is an object rather than a character, so no guide becomes the company's face, which keeps to the rule in story.md that no single guide follows a child across four years.

The mark is the map's lantern redrawn for a logo: a carrying ring, a solid cap, a glass of three panes, an orange flame and a solid base, inside a pale disc of highlighter glow. It is drawn with our seeded pen at a fixed seed (5303), single-stroked and nearly straight (rough.js at roughness 0.55 and bowing 0.6, one stroke to a line where the shelf draws two, with the corners kept where they are drawn), because it is the map's own lantern and the pen's slight wobble is what makes it ours. The glass and the glow are clean fills laid a little off the pen line, the way a marker sits under pencil. The wordmark is Shantell Sans at 760 with no bounce, steadier than today's, and the dot on the i is a small lit lamp: a glow disc with an ink ring, which reads as a plain dot below about 40 px.

Its weakness is that it is the quietest of the five: at a glance it is a lantern, and it needs the story to mean more than that.

### The paper bird

The bird is folded from a page of the exercise book: flat facets in paper white with the 5 mm grid ruled inside the body and head, a hatched tail, a raised wing with one yellow fold, and an orange beak. It is already in Site W's top bar, and straight creases print perfectly in one colour. It keeps today's wordmark exactly, bounce and all, with the highlighter under "school", so this is the option that changes least.

It is drawn with clean paths. Origami is straight folds, and the pen's wobble made the creases look crumpled. Its icons stand on a yellow page with a darker yellow grid, the only variation whose ground is the highlighter rather than white paper.

Its weaknesses are that it makes one guide the brand's face, and that it is a bird: Duolingo's owl owns the bird in this category. We kept it because it is a folded paper profile in ink rather than a face filling a green tile, and the two read nothing alike at any size we tried.

This is the logo. The owner chose it on 13 September 2026, and its favicon was then redrawn twice, as "Every size" describes: first from its app icon, and then, on 14 September, as the bird on no ground.

### The road

The map is drawn as the child goes, and the highlighter under a road is the part they have walked ([overworld.md](overworld.md)). The mark is that one idea on a round patch of squared paper: a lit stamp where the child started, the road highlighted as far as they have walked, a blue dot where they stand (the map's "You are here" is in the same pen blue), and pencil dashes on to an empty stamp, the next world. It says what the product does rather than what it is called.

The two stamps are drawn with the seeded pen at a fixed seed (8839), as the map draws its stamps. The road is a clean curve, so its highlighter and its dashes stay even at every size. The wordmark is Shantell Sans at 700 with the informal axis at 60 and no bounce, the neatest of the four settings, so the drawing carries the character.

The shape took three tries. The first road curled into a question mark, and the second read as a thin hook next to the word; the third is wider, kept diagonal between its two stamps so it never reads as a letter (Seesaw's mark is an S, Zearn's a Z and Lumos Learning's a swooping L), and stands on its own patch of grid so it has an outline. It is still the weakest of the five at 16 px, where it reads as two rings joined by a yellow line more than as a road.

### The snail

School at home is a snail's arrangement: the house goes where the learning goes. The spiral shell is the strongest silhouette of the seven guides at 16 px and in print, and nothing in the category we checked uses one. The mark is the snail guide cleaned up: an orange wash laid a little off the shell's outline as the guide's is, one even spiral, a white foot and two eye stalks ending in dots rather than eyes, so it is a sign rather than a face. The wordmark is Shantell Sans at 600 with a little bounce, the softest of the four.

It is drawn with clean paths, because the spiral has to be a single even line to survive at 16 px and the pen would double it. Its risk is slowness: it reads as patience to some parents and as slow to others, and the snail guide's own notes already say slow is a good feeling for being stuck and a poor one for finishing.

### The highlighted word

The name already has a sign: the highlighter under "school" in every top bar. This variation makes that the whole logo and draws the highlighter properly, with a chisel tip at each end and a darker second pass over its right half, where a real highlighter goes over itself. The wordmark is today's letters, turned to outlines. Its horizontal lockup is the wordmark alone, and its stacked lockup is the word on two lines, "lumi" over "school", with the marker under the second. Where there is no room for the word (favicons, app icons, the profile picture) its mark is the pair "ls" standing on the marker.

We tried a lone "l" first. In Shantell the l has a foot that curls to the right, so on its own it reads as a capital L, which is also too close to Lumos Learning's L. The pair reads as initials at every size down to 16 px. This is the plainest of the five and the cheapest to live with, and the one with the least to say beyond the name.

### Side by side

| | The lantern | The paper bird | The road | The snail | The highlighted word |
|---|---|---|---|---|---|
| Grows from | The map and the story | A guide | The map | A guide | The top bar |
| Mark drawn with | The seeded pen, seed 5303 | Clean paths | The pen for the stamps, seed 8839 | Clean paths | Type outlines |
| Wordmark | 760, no bounce, lamp on the i | 760 with bounce, flat highlighter | 700, informal 60, no bounce | 600, bounce 30 | 760 with bounce, marker stroke |
| Icon ground | Squared paper | Yellow squared page | Plain paper | Squared paper | Squared paper |
| Change from today | New mark, steadier word | Bird added, word unchanged | New mark, neater word | New mark, softer word | Word unchanged, marker redrawn |
| Best at | Print, the story | App icon, print | Social images, meaning | 16 px, print | Top bar, letterheads |
| Weakest at | Saying anything at a glance | Being a bird next to Duolingo | 16 px | The word slow | Small sizes without the word |

## What we checked them against

We fetched the favicons, touch icons and logos of the brands below straight from their own sites and looked at each beside ours. The session's web search budget ran out after the first queries, so this was done by fetching a list of sites directly rather than by searching; the list is what we checked and nothing more. It is a look for resemblance, not a trademark search, which still needs doing before any money is spent on the brand.

| Brand | Its mark | What it means for ours |
|---|---|---|
| Duolingo | A green owl's face filling a rounded square | None of ours is a face in a tile; the bird is a folded profile in ink. |
| Khan Academy | A green hexagon with a leaf figure | No hexagons here. |
| Brilliant | A green rounded shape with a square in it | Why the one-square idea was left. |
| Outschool | A purple infinity loop | Nothing close. |
| Epic | A wordmark | We could not fetch its icon (the site returned a page instead). Nothing of ours is a bold italic word. |
| ABCmouse | A cartoon mouse's face | Nothing close. We could not fetch its touch icon either, only its favicon. |
| SMART Lumio | A line-drawn firefly with a yellow glow | Why the firefly was left. |
| Lumi Academy | A yellow owl on light blue, and a yellow star with a face | Why the glow with a face was left. |
| Learn with Lumi | A glowing blob with eyes | Against the glow and the dot. |
| Lumos Learning | A blue swooping L with a red star at its tip | Why a lone l became ls, and one reason the road stays between two stamps. |
| Lumen Learning, Lumi (H5P), Lumosity | A green and yellow wave, a teal hexagon with the word Lumi, an orange circle | None close. |
| Seesaw, Zearn, Hooked on Phonics, Prodigy | An S path, a Z of two chevrons, a star drawn as one stroke, a looped P | The road is kept diagonal and between two stamps so it never reads as a letter. |
| Firefly Learning, Adobe Firefly | A red circle with an f, and "Fi" in a red square | Two more fireflies near education and design tools. |

We also looked at Lingokids, Twinkl, ClassDojo, Starfall, IXL, BrainPOP, Highlights, Brightwheel, Reading Eggs, SplashLearn, Doodle Learning, Time4Learning, Homer, Adventure Academy, Tynker, Kodable, PBS Kids, Osmo, Oak National Academy, Night Zookeeper, Mathseeds, Beast Academy, Toca Boca, Book Creator, Education.com, Mathletics, Moshi, Teach Your Monster, Spiral, Beanstack, Acellus, K12, Teaching Textbooks, GoZen and The Good and the Beautiful. None of them came close to any of the five.

What we did not check: trademark registers (USPTO, EUIPO, UKIPO), the app stores, and lanterns, paper birds and snails outside education, where each is common enough that a register search is the only real answer.

## Every size

A mark is never shown below 48 px. Below that each variation has its own drawings, made on the pixel grid for 16, 24 and 32 px rather than shrunk: the 16 px drawing is the SVG favicon and the 16 px PNG, the 32 px drawing is the 32 px PNG, and the 24 px drawing doubled is the 48 px PNG, which keeps it on whole pixels. The directions not chosen carry their own ground in their favicons (a yellow disc or a white tile with a pale edge), so they hold on a light tab strip and a dark one. The logo's tab favicon has none, and holds by its white facets and its ink outline instead.

| | 16 px | 24 and 32 px | 48 px to 180 px | Print |
|---|---|---|---|---|
| The lantern | Cap, frame, cream glass and an orange flame on a yellow disc. The panes go. | The ring and the panes come back. | The mark on squared paper in its pale glow. | The glass is left open, so the paper's grid shows through it; the flame is solid. |
| The paper bird | The bird on no ground, filling the square: white facets inside one ink outline round the whole bird, the wing's line, the yellow fold, the orange beak, a one-pixel eye and two legs. | The outline and the legs grow a little heavier, and at 32 px the wing's crease and the head's edge come back. | The mark on the yellow page; the grid inside the facets shows from about 100 px. | The tail is hatched at 45 degrees and the beak is solid. |
| The road | Two stamps, the yellow road and the blue dot. The dashes and the unwalked road go. | The dashes come back, and at 32 px a hint of grid. | The mark on plain paper, since it brings its own round patch of grid. | The highlighter becomes the road's two edges, and the grid patch is left out because the form is already squared. |
| The snail | The orange shell with a hint of spiral, the foot and two stalks. | The spiral turns twice. | The mark on squared paper. | The shell is left open and the spiral is the drawing. |
| The highlighted word | "ls" on a marker band. | The marker's darker second pass appears at 32 px. | "ls" on the marker on squared paper. | The marker becomes two ruled lines under the letters. |

### The bird's favicon, redrawn

The favicon the bird was first built with was its own small drawing: a dark silhouette with one white wing on a yellow tile. At 16 px it read as a dark bird, but not as the bird on the app icon and the profile picture, which is white paper with ink edges on a yellow page. The small sizes were redrawn as that bird, simplified until it reads. They are one drawing in a 16 unit square, scaled to 16, 24 and 32 px, so the three sizes are the same bird. At 16 px the grid goes, since it turns to haze; the head and the beak are drawn bigger than the mark's; the tail, body and head share one outline, drawn outside the shapes so it takes nothing from the white; the only line inside the bird is the wing's; and the eye is one whole pixel. From 24 px the page is ruled in the app icon's darker yellow and the wing has its pale yellow fold, and at 32 px the wing's crease and the line between the head and the body come back.

We compared it in headless Chrome with the old favicon and with the app icon shrunk to the same sizes, at 16, 32 and 48 px, at 1x and 2x, on a light and a dark tab strip. The old favicon had the strongest silhouette at 16 px but looked like a different mark. The shrunk app icon turned faint and grey at 16 px, since its lines are drawn for 180 px. The new drawing reads as the app icon's bird at every size, and it holds on both strips because it carries its own yellow tile. A browser on a 2x screen draws the SVG favicon, the 16 px drawing, at 32 device pixels, where it stays clean.

### Choosing the favicon

The owner was not a fan of the redrawn white bird either. The likely cause is contrast: white on the yellow tile is little different in lightness, so the bird goes soft at 16 px, where the first dark bird read strongest. The Logo tab's "Choosing the favicon" section draws six other candidates for 16, 24 and 32 px, beside today's favicon and the app icon, each in a tab strip at 16 and 32 px, at 1x and 2x, on a light strip and a dark one: the folded bird in ink on the yellow tile, the white bird on an ink tile, the head alone, the paper plane from the journal's flight, the wordmark's l on the highlighter, and a sheet of squared paper with a corner turned down. Two of them bring back ideas the first sketches left, the plane and the lone l, for the reasons in "The ideas we sketched", and at small sizes a turned corner is the file icon. The owner then asked to try the paper bird with no tile at all, as the scratchpad's top bar shows it, so two more candidates draw it on no ground: white facets with one ink outline round the whole bird, the yellow fold and the orange beak, and the same bird with a thin light edge outside the outline. The strips on the Logo tab add a mid-grey one, since some browsers draw an inactive tab that way. Either of those would change only the tab favicon, `favicon.svg` and its 16 and 32 px PNGs, so the tab favicon and the app icons would differ on purpose: the Apple touch icon, the 192 and 512 px icons, the maskable icon and the profile pictures keep the yellow tile, because iOS fills a transparent touch icon with black and Android crops a maskable icon to its own shape. On 14 September 2026 the owner chose the paper bird on no ground, and it is now the bird's small art in `engine/parts/brand.ts`. It holds on all three strips: on the light and mid-grey ones by its ink outline and its white facets, and on the dark one by its white facets alone, where the outline and the legs sink into the ground. The other candidates stay in the scratchpad's `src/brand/favicons.ts` as the record, with the white bird on yellow it replaced.

The one-colour files use the print ink of `engine/paper.ts` (#161616) and nothing else, which the tests check. On the Logo tab they are shown on a 5 mm grid at the sizes a form would use them: the horizontal lockup three squares tall, the mark two and three squares.

The horizontal lockup should not go below 24 px tall, where the word's counters start to close; the scratchpad's top bar wears it at 34 px. Clear space round any lockup is half the mark's height on every side. The link preview and the banner are laid out on squared paper with the map's highlighted road and a few shelf drawings drawn live (a balloon, a windmill, a tree, the lantern, a gull, a cottage, the rabbits and the lighthouse), and the banner keeps its lower left clear for the profile picture that most sites lay over it. The busy-ground tests on the tab show that every lockup fails on a photograph, as expected, and that the icons and the profile picture hold; we keep no photographs, so the photograph is a painted stand-in and says so.

## Motion

Each variation has one loop, used in two places: the site's top bar, where it plays twice a moment after the page opens and then rests, and the app's loading moment, where it loops until the page is ready and then finishes the loop it is in.

| | What moves | One loop |
|---|---|---|
| The lantern | The flame flickers twice about its base and the glow breathes once, to 1.08 times its size and 0.7 opacity. | 3.6 s |
| The paper bird | The wing lifts a little, beats down 24 degrees, overshoots and settles, while the body rises three and a half units and lands and the head follows a moment behind. | 3.4 s |
| The road | A light runs along the highlighted road from the start to the blue dot, the dot hops with a crouch and a squash, and the next stamp nods. | 4.2 s |
| The snail | The eye stalks look about, one a moment after the other, the eyes blink once, shut in 0.07 s and open in 0.12 as the shelf's blink does, and the foot stretches forward five per cent with the shell riding two units on it. | 4.4 s |
| The highlighted word | The letters hop once, one after another from left to right, 55 ms apart, and land with a squash. | 3.8 s |

The rules each loop keeps:

- It moves only by `transform`, `opacity` and, for the road's light, one `stroke-dashoffset`. Nothing is redrawn, and no element is ever replaced. The flash the owner saw on Site W came from the bar's guide being drawn again with `replaceChildren` on every hover and from its boil, which swaps three drawings a few times a second; neither exists here. Wearing a variation writes its lockup into the top bar once, and after that only classes and animation timing change.
- It ends as it began. The first and last keyframes of every loop are the same drawing, so a copy that stops after two loops, or is stopped, is the drawing and nothing else. The road's light is one dash in a pattern that repeats once per loop, parked off the start of the road at the beginning and one pattern further on, off the end, at the finish, which draws the same.
- Nothing flashes and nothing fades below half. The lantern's glow is the only thing that changes brightness, once a loop, to 0.7.
- The numbers are the shelf's ([animation.md](animation.md)): loops between 3.4 and 4.4 seconds, inside the shelf's 2.9 to 4.5; a flap of 24 degrees; a hop's crouch before it leaves the ground and its squash as it lands; the first movement a moment after the drawing appears (0.6 s in a file, 1.4 s in the top bar, after the page's own work).
- It stops completely under reduced motion. Every loop's stylesheet sets `animation: none` under `prefers-reduced-motion: reduce` and in print, and the Logo tab has its own switch. A stopped loop is the drawing as drawn, so nothing is missing.
- In the top bar a pointer over the lockup plays one more loop, but only once the last one has finished, so it never jumps. The loading moment finishes the loop it is in by setting the loop's count to the current loop plus one, rather than cutting.

The loops are CSS keyframes inside the SVG, not declarations for the shelf's animation module (`src/core/animate.ts`). The files have to move on their own: in an `<img>`, in a loading screen that runs before any script, in an email. The module plays drawings from JavaScript and moves a drawing's parts at most 30 times a second, where CSS keyframes on these few groups run at the display's rate. We kept the module's rules and its numbers, and the tests hold every loop to them: rest to rest, only compositing properties, nothing under half opacity, a loop length inside the shelf's range, and the reduced-motion and print rules present.

## Using the files

### In the apps

The apps' files are made from `engine/parts/brand.ts` by `tools/brand.ts`, a Vite plugin, rather than kept in the repository. The dev server on 8500 serves them and the build writes them at the root of its output, so there is nothing to remake by hand and nothing that can go stale. The PNGs are drawn with resvg (`@resvg/resvg-js`), a dev dependency that nothing in the apps ships with. We chose this over committing the generated files, which would have needed a check that fails when they are stale; the plugin makes them from the same code the tests read, every time.

| Path | What it is |
|---|---|
| `/favicon.svg` | The 16 px drawing, the bird on no ground, which a browser scales for a 2x screen |
| `/favicon-16.png`, `/favicon-32.png` | The 16 and 32 px drawings on a transparent ground, for a browser that does not take an SVG favicon |
| `/apple-touch-icon.png` | The app icon at 180 px, opaque, for an iPhone or iPad home screen |
| `/icon-192.png`, `/icon-512.png` | The app icon at two sizes, for any purpose |
| `/icon-maskable-512.png` | The app icon with the mark inside the central circle every mask keeps |
| `/social.png` | The site's link preview, 1200 by 630: the horizontal lockup on the squared page |

The tab favicon has no ground and every other file keeps the yellow tile, on purpose. A browser draws a tab's icon on its own strip, light, mid-grey or dark, where the bird holds by its white facets and its outline; iOS fills a transparent touch icon with black, and Android crops a maskable icon to its own shape, so the icons for a home screen need their ground.

Each app's `index.html` links to the SVG favicon, the two PNGs and the touch icon, and sets `theme-color` to the palette's card, the white the pages are drawn on. No app links a web app manifest. The child's app had one, with the Apple web app tags, while an iPad had to run it from the home screen to keep its work; both went when the children's view became something a parent opens in any browser, which keeps nothing of a child's but the answers it has not sent yet ([auth.md](auth.md), flow 5). The site's head adds the Open Graph and Twitter tags for `/social.png`, with the page's own title and description. `tools/__tests__/brand.test.ts` fails if a head links to a file that is not served, or links a manifest, and if the tab favicon's PNGs lose their transparent ground or an app icon loses its opaque one.

On a page the logo is `<Logo>` from `engine/ui/logo.tsx`: the horizontal lockup, or with `kind` the stacked lockup or the mark alone, drawn inline from `brand.ts` so it needs no file and no font. A screen reader names it "lumischool". It is 34 px tall unless a class says otherwise, and it keeps the loop's rules below: in a top bar it plays twice a moment after the page opens and then rests, a pointer over it plays one more loop from rest, and with `loading` it loops until that turns false and then finishes the loop it is in. It never moves under reduced motion or in print.

The apps' bars and the site's use `Mark` from `engine/ui/mark.tsx` instead of the horizontal lockup: the guide who is a paper bird, from the shelf through the seam ([structure.md](structure.md)), idling beside `<Logo kind="word">`. The word alone carries no loop, so it does not move; the bird idles, and stops under reduced motion. The bird's box is sized before it is drawn, so the word never shifts when the bird arrives, which is once the page is idle. Given a link, the whole of `Mark` is one link named "lumischool site".

The files we upload by hand are written by `npm run brand:export -- <folder>`: square profile pictures at 400 and 800 px for social accounts, which are never served, and every vector file (the lockups, the mark, the word, their one-colour versions and the moving ones) for print, letterheads and anyone who asks for the logo.

Emails are text only today (`server/email.ts`), so none carries the logo. An HTML email would put the horizontal lockup at its top.

### The exploration's files

Each `brand/<variation>/` folder in the scratchpad holds the same 27 files, exported from the Logo tab. They are the record of the five directions, and the apps do not read them.

| File | Use |
|---|---|
| `lockup-horizontal.svg` | The site's header, letterheads, the top of an email. |
| `lockup-stacked.svg` | Square spaces, the loading screen, a printed cover. |
| `mark.svg` | The mark alone, at 48 px and above. |
| `wordmark.svg` | The word alone, where the mark is already on the page. |
| `*-ink.svg` | One colour, for print, faxed forms, stamps and embossing. |
| `mark-animated.svg`, `lockup-horizontal-animated.svg` | The loop, self-contained, with its reduced-motion rule inside. The mark is for the loading moment, the lockup for the top bar. |
| `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon.ico` | The browser tab. The .ico holds the three hand-drawn sizes. |
| `apple-touch-icon.png` | 180 px, opaque, for iOS home screens. |
| `icon-192.png`, `icon-512.png`, `icon.svg` | Any-purpose icons for the web app manifest. |
| `icon-maskable-192.png`, `icon-maskable-512.png`, `icon-maskable.svg` | Maskable icons: the mark sits inside the central circle every mask keeps. |
| `profile-400.png` | Social profile pictures; it holds in a circle crop. |
| `link-preview-1200x630.png` | The Open Graph and Twitter card image. |
| `banner-1500x500.png` | Social banners. |
| `animation.gif`, `animation-frames.png` | One loop at 20 frames a second, and eight frames of it, for anywhere a moving SVG will not play. |

To remake these files after changing `src/brand/marks.ts` or `engine/parts/brand.ts`, start the scratchpad with `npm run dev` and run `node scripts/export-brand.mjs`. It opens `brand.html?export` in headless Chrome on a port Chrome picks, writes the page's own SVG text, photographs each raster file as one element at its real size, films the loop frame by frame from the page's own clock and joins the frames with ffmpeg, and builds the .ico with ImageMagick. Nothing is sent anywhere. Chrome sometimes stops answering screenshots after many in one session, as `scripts/check-print.mjs` found with PDFs, so a screenshot that does not answer gets a fresh browser and one more try. It takes one to two minutes.

The word's outlines, `BOLD` in `engine/parts/brand.ts` and the other three settings in the scratchpad's `src/brand/letters.ts`, were made once: each setting of the word was set in Shantell Sans in headless Chrome and printed to PDF, which instantiates the variable font at those settings, and `pdftocairo -svg` turned the PDF's glyphs into paths, which were rounded to a tenth of a pixel and stored letter by letter. Shantell Sans is under the SIL Open Font License, which allows a logo to be made from it. A change of weight or axis means doing that again; the script for it was a working file and is not in the repository.

## In the scratchpad's top bar

Every scratchpad page wears the logo. `topBar()` writes the bird's horizontal lockup into the bar at 34 px with its loop set to play twice, and sets the tab's icon to the 16 px drawing, both drawn from the root. The Logo tab's "In the top bar" switch, and the "Preview in the top bar" button on each card, put one of the four directions not chosen there instead, so it can still be compared. A preview is kept in this browser's storage under `lumischool.brand.wear` and nowhere else, and choosing the paper bird clears it. The four directions' drawings are loaded only while one is previewed, and the bar's wordmark is hidden while they load, so it never shows one lockup and then swaps it. The pages' HTML still has the old CSS wordmark in it, which the bird replaces as the page starts. Site W and Site L carry their own headers and are not changed by it.

## What is not done

- A trademark search on the paper bird and the name, now that the choice is made.
- The bars' bird from `engine/parts`. The bird in `Mark` is the shelf's guide, drawn through the seam, until the guides move into `engine/parts` with the rest of the shelf.
- The tab favicon in Safari and Firefox. Everything so far was seen in headless Chrome.
- In Chrome the loops play inside an `<img>`, and the reduced-motion rule stops them when a file is opened on its own and on the Logo tab. Headless Chrome's reduced-motion setting does not reach into an SVG shown as an image, so we have not seen that one case stop, and we have not looked at any of it in Safari or Firefox.
- The busy-ground test uses a painted stand-in, because we keep no photographs.
- The script that made the letters is not in the repository; the steps are above.
- Epic's and ABCmouse's touch icons could not be fetched, so each was judged from its wordmark or favicon.
- Site W and Site L, which are prototypes, still carry the old wordmark in their own headers.
- An HTML email with the logo, if emails stop being text only.
