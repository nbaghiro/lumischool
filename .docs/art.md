# Art

Status: proposed, with a first set built in `scratchpad/` in September 2026 and a second round
built later the same month. This document is the plan for art: what current teaching asks of art
and painting between the ages of five and ten, the principles we build art lessons to, the painting
tool and the options we compared for it, what other children's painting tools do and which of their
ideas we took, how its colour mixing works, what stays on screen and what prints, what the tool
records and who sees it, how a grown-up looks at a finished painting, a scope and sequence for each
grade, the eighteen lessons we wrote and how hard they are, the drawings we added, and the order to
build the rest in. It answers the art gap in [gaps.md](gaps.md) (item 15, "drawing and
design, as a thin art strand") and the painter's hut in [overworld.md](overworld.md), which had
been waiting for an art track.

What is built is in `scratchpad/`: a Paint tab (`paint.html`) with the painting tool, the tool's
five modules in `src/paint/` (`mix.ts`, `surface.ts`, `easel.ts`, `lesson.ts`, and `look.ts` for the
grown-up's view) and its checkers in `src/paint/prove.ts`, twenty four drawings in
`src/art/painting.ts`, eighteen lessons and 115 items in `content/`, and in `engine/answer.ts` one
answer kind, `painting`, and one event, `responded`.

## The short version

Art had no lessons. [tracks.md](tracks.md) turned down an art track because most of its answers
would be judgements rather than facts, and that stays true of a free painting. What changed is that
more of art can be proved than it first appears. Which two paints make green, whether a mix is a
tint or a shade, which half finishes a butterfly, which way a print faces, which layer of a
landscape is furthest away: each has one answer. We wrote a paint model that mixes the way pigment
does, so blue and yellow come out green rather than grey, and the verifier answers colour questions
with the same arithmetic the child's brush uses. Every lesson pairs those proved questions with a
painting or two, made with the tool on screen or with real paint on the printed sheet, that a
grown-up responds to rather than marks.

The painting tool has four brushes (pencil, crayon, felt pen and a watercolour brush), a blender,
an eraser, a pour, stamps and stencils cut from shelf drawings, a dropper that takes a paint back
off the sheet, a mirror in two, four or six, undo, and squared or plain paper. Its paint box is the
palette as paint: the pans are our colours, and white turns our red into the shelf's berry and our
blue into its sky. It needs no reading, every button is at least 44 pixels, and every tool has a
key. A painting is recorded as the marks the child made, a few kilobytes, and it stays on the device
and in the family's log. A grown-up can watch it being made again, mark by mark, and record what
they noticed in it.

In the second round every lesson was raised to the difficulty model in [audit.md](audit.md): a way
in any child can start, the grade's core work with the unknown moved about, and a stretch of a
two-star question that needs a reason and a three-star question that is non-routine, with hints that
ask rather than tell. Each lesson now has ten or eleven questions drawn from six or seven items,
with one or two paintings among them, and by our own grading each grade meets the shares the audit
proposes.

## What was thin

[gaps.md](gaps.md) counted no art, history or nature lessons among 142, and ranked a thin art
strand fifteenth of its recommendations: "the drawing pad exists as a page, the drawing answer is
specified in `engine/answer.ts` and not built". The drawing pad (`draw.html`) is an author's tool
for making stroke files for the shelf, with an anchor tool and a JSON export, not something a child
would use. The tessellation, pattern blocks, tangram, reflection grid and bunting were drawn, and
three of them were unused. The painter's hut, one of the eleven worlds to come, had "most of its
answers are a grown-up's judgement" as its reason for waiting.

## What current practice asks

We read the national curriculum for England, Ofsted's research review, the US National Core Arts
Standards, the Virginia Standards of Learning (the most explicit grade-by-grade sequence we found),
the Getty's teaching handouts, Tate's pages on techniques, the published schemes of Oak National
Academy, AccessArt and NSEAD, three sources on colour, and the literature on responding to young
children's art. Each is listed at the end with what we read in it.

### The curricula

England's programme of study (Department for Education, 2013) asks that pupils "produce creative
work, exploring their ideas and recording their experiences", "become proficient in drawing,
painting, sculpture and other art, craft and design techniques", "evaluate and analyse creative
works using the language of art, craft and design", and "know about great artists, craft makers and
designers". At key stage 1 they are taught "to develop a wide range of art and design techniques in
using colour, pattern, texture, line, shape, form and space" and "about the work of a range of
artists, craft makers and designers"; at key stage 2 they keep sketchbooks and work towards
"mastery of art and design techniques". NSEAD points out that the curriculum names no techniques,
genres or movements, and leaves those choices to schools.

Ofsted's research review (2023) divides what pupils learn into practical knowledge ("in painting:
concepts such as colour mixing"), theoretical knowledge (artists and their work) and disciplinary
knowledge (how art is talked about and judged). It asks for guided instruction for beginners,
"purposeful, deliberate practice", worked examples of techniques, and feedback that is "timely,
frequent and bite size", and it warns that generic assessment is "likely to be too generic to
capture the forms of knowledge" built in art. It also warns against a narrow set of artists.

The US standards (NCCAS, 2014) organise visual arts into four processes (creating, presenting,
responding and connecting) and eleven anchor standards. At grade 1 a child uses "observation and
investigation in preparation for making a work of art" (VA:Cr1.2.1a) and "art vocabulary to
describe choices while creating art" (VA:Cr3.1.1a); by grade 4 they "revise artwork in progress on
the basis of insights gained through peer discussion" and "apply one set of criteria to evaluate
more than one work of art" (VA:Re9.1.4a). The standards are about making, looking and talking, and
they leave techniques to the school as England's do.

### The elements, grade by grade

The elements are line, shape, colour (hue, value and intensity), texture, form and space, with
pattern often added in English schools; the Getty's handout gives short definitions a lesson can
use, such as line as "a mark with greater length than width". The Virginia standards place them by
grade, and we follow their order because it matches the rest of what we read:

| Grade | What Virginia's standards put there |
|---|---|
| 1 | Primary and secondary colour; zigzag, dotted, wavy and spiral lines; geometric and organic shape; texture; alternating and repeating pattern; drawing people and objects from observation |
| 2 | Warm, cool and neutral colour; form; line direction; more complex pattern; foreground and background |
| 3 | Intermediate colours; positive and negative space; symmetry, asymmetry and radial balance; foreground, middle ground and background; shapes in observational drawing |

We could not open grade 4. Oak teaches tints and shades in Year 1, which Virginia's colour lines do
not name, so we place them at grade two, after the secondaries and before warm and cool.

### Colour

Primary schemes teach red, yellow and blue as primaries, the secondaries they make in pairs, tints
(adding white) and shades (adding black), then warm and cool, and later the colour wheel's
complementary pairs, which "neutralize each other to make brown" when mixed (Getty). Oak names two
misconceptions worth designing against: that "pupils may struggle with purple mixing", and that
warm and cool colours change the temperature rather than how a picture feels.

Red, yellow and blue are not the best subtractive primaries. Christopher Baird (West Texas A&M)
calls them "not very good primary colors for any application" and names cyan, magenta and yellow;
Bruce MacEvoy (handprint.com) traces the red, yellow and blue doctrine to an anonymous claim of
1708 and says painters now prefer a yellow, a rose and a phthalo blue. Cathy Jennings (Golden
Artist Colors) explains the dull purple: most reds lean towards orange, and the hidden yellow in them
greys a mix with blue. We kept red, yellow and blue, because that is what children, parents and
every scheme we read call the primaries, and we chose a red that leans slightly towards crimson so
red and blue make a purple a child will call purple. The dull purple is still there, and the first
lesson's note tells the grown-up it is worth talking about.

Seurat's dots are a second kind of mixing. Tate describes neo-impressionism as placing "the
primary-colour components of each colour ... separately on the canvas in tiny dabs so they would
mix in the spectator's eye". Dots side by side average their light; paint in a tray absorbs it. The
two give different answers, and the dots lesson uses the eye's.

### Drawing from looking

Ofsted says "drawing is central to art and design curriculums" and lists phrases children learn,
such as "observational drawing" and "outer edges". Oak's key stage 1 units "focus on the ability to
observe and record simple lines and shapes". AccessArt treats short drawing exercises as warm-ups
that "underpin all creativity": continuous line drawing, which matches "the speed of looking with
speed of drawing", and blind contour drawing, which lets children "focus upon careful looking,
without the worry of what your drawing looks like". Ofsted's 2012 survey found that "the notion that
everyone can draw is not being kept alive beyond the early years", which is a reason to keep drawing
from looking in every year rather than only the first.

### Printmaking, pattern and symmetry

Tate describes frottage as "creating a rubbing of a textured surface". AccessArt runs mono print,
press print and foam print with children of five to eight, and printmaker Kate Watkins, who has
printed with five and six year olds, notes that a design prints "in reverse on paper". NSEAD's unit
on a simple printed pattern has children print with cotton reels and building bricks and warns that
young children "will find it hard to repeat the sequence all the way down a sheet of paper". Oak's
Year 3 unit runs from patterns in nature to a motif to "a repeating pattern using a motif", and its
kaleidoscope lesson teaches repeating and rotating shapes. The Metropolitan Museum's guide to Islamic
geometric design builds infinitely repeating patterns from circles and grids with a straightedge and
a compass, which is where symmetry and pattern meet at grade four.

### Learning from artists and cultures

Ofsted suggests pupils "use knowledge of the forms and conventions of past art to reflect on their
own drawing techniques", and the Studio Habits "I can" statements include "connect with other
artists through their processes, techniques, stories, and ideas". A small study with adult students
(Ishibashi and Okada) found that copying an artist's drawings and then making an original one gave
more creative work than being told to draw "in the painter's style". We take that as a reason to
teach the technique and then ask for the child's own picture, never a copy of the artist's.

The cautions are specific. NSEAD's anti-racist checklist asks whether artists are properly
contextualised, and says Aboriginal paintings "should not be reproduced"; Creative Australia's
protocols centre consultation and consent. Adinkra stamping carries meanings tied to funerals
(Cooper Hewitt), so a child designing a symbol of their own is better than copying one as
decoration. Copyright needs care too: Matisse's cut-outs entered the public domain in the United
Kingdom and most of the European Union in 2025 but remain in copyright in the United States, where
works published after 1930 are protected for 95 years. We use only artists who died long before
that and whose techniques suit this age: Seurat's dots, which the third-grade lesson is built on,
and for later lessons Anna Atkins's cyanotypes (1843), Hokusai's and Hiroshige's woodblock prints,
William Morris's repeats, Monet's changing light, Cézanne's shapes and Turner's washes.

### Approaches worth borrowing

Reggio Emilia's atelier offers several materials for one idea, which suggests letting the same
picture be made with a crayon, a brush or a print. Montessori's colour tablets grade one hue in
eight steps, which is exactly a tint ladder. Waldorf wet-on-wet painting introduces colours one or
two at a time on damp paper with no expectation of a form, so the secondaries appear by themselves,
which is the first lesson's try section. Teaching for Artistic Behavior holds that "the child is the
artist", and the Studio Habits of Mind (develop craft, engage and persist, envision, express,
observe, reflect, stretch and explore, understand art worlds) give a grown-up words for what they are
looking at.

### Responding rather than grading

Schirrmacher's article for NAEYC (1986) sets out six common responses to a child's art and the
trouble with each: compliments are empty, judgements and corrections discourage, and "what is it?"
is "unwise and even harmful" because much young children's art "is private ... and not intended to
look like something". What he recommends is to pause and let the child speak, then describe what is
there in the language of art (colour, line, shape, pattern, space, texture): "You have filled your
paper with many lines and shapes." Lowenfeld's stages put children of four to seven in a
preschematic stage and seven to nine in a schematic one, which is why a six year old draws a cat
from memory as a circle with two triangles, and why drawing from looking starts there rather than
being expected. NSEAD's primary framework assesses on a three-point scale (developing, meeting,
exceeding) against generating ideas, making, evaluating and knowledge, and says the old national
levels were "used inappropriately to label individual pieces of work".

## Principles

1. The machine proves what has one answer, and a grown-up responds to what is a judgement. Every
   lesson has both: proved questions about colour, pattern, symmetry, looking or printing, and one
   painting or drawing that is the child's.
2. Paint behaves like paint. A mix on the screen is worked out the way pigment mixes, white makes a
   tint and black a shade, and the verifier uses the same model, so the screen, the printed answer
   and the real paint agree.
3. The tool needs no reading. Its buttons are drawings from the shelf, its words are for a screen
   reader, every target is at least 44 pixels, and every tool has a key.
4. A painting is kept as what the child did, as marks, not as an image. It stays on the device and
   in the family's log, and nothing else sees it.
5. Every lesson works on paper with real materials. The printed sheet is a place to paint with a
   brush, and the screen is never required.
6. On paper, colour is never the only clue. Every pot, pan, well and segment carries its name, and
   each colour family prints as its own hatch.
7. Artists are learned from by technique, in our own drawings, and only where the work is long out
   of copyright; no culture's restricted forms are reproduced.
8. A painting is responded to: describe it, name what the child chose, ask a question about it,
   and never ask what it is.
9. It stays calm. There are no sounds, no rewards for painting and no timers; the only movement is a
   stroke settling into the paper and a replay a grown-up asks for, and both stop under reduced
   motion.
10. Every lesson has three bands, as [audit.md](audit.md) sets out: a way in any child can start,
    the grade's core, and a stretch of one question that needs a reason and one that is
    non-routine. In art the non-routine question is usually the painting, made to a constraint the
    child has to plan for.

## The painting tool

The tool is `mountEasel` in `src/paint/easel.ts`, mounted on the Paint tab and inside a lesson.
Ten tools sit in a toolbar: pencil, crayon, felt pen, paintbrush, blender, pour, stamp, stencil,
dropper and eraser. Three sizes sit under them, then the mirror (off, two sides, four ways, or six
times round the middle), take back, squared or plain paper, and a button that lifts the stencils,
shown only while one is down. Beside the sheet are the paint box, a tray of three wells to mix in, the paint on the brush
shown as a round swatch, and a water drop that washes a well. The tool buttons are the shelf's
`arttools` drawing, one tool at a time, with its working end in the colour on the brush; the paint
box and the tray are the shelf's `paintbox` and `mixingtray` drawings with transparent buttons laid
over each pan and well.

Mixing works the way a child mixes at a table. Tapping a pan puts that paint on the brush. Tapping a
well puts the brush's paint into it and stirs, and the brush then carries what is in the well, so
yellow, a well, blue and the same well make green on the brush. Each tap adds one part, which is
what the fourth-grade lesson on proportion is about.

Four tools arrived in the second round, each for a lesson or a technique rather than for effect:

- The blender pushes the paint under the stroke together with its neighbours, averaging their
  recipes, so a yellow band and a red one blended where they meet turn orange. It adds no paint of
  its own, and what it makes is a real mix that the dropper can read back.
- The dropper takes the paint under a point back onto the brush, in the smallest whole parts that
  say it, and says the recipe ("yellow 2 and blue 1"), so it shows how a colour on the sheet was
  made rather than replacing the mixing. The tool then goes back to the brush the child was using.
- A stencil is a card with a shelf shape cut out of it, or the shape itself lying on the paper,
  chosen with its own button beside the shapes. It is laid with a tap, every mark after it is
  clipped by it, and the lift button takes it off. Several can lie at once, as Anna Atkins laid
  several plants on one sheet, and a card is a square 1.6 times its shape across, so two cards side
  by side each let paint through their own hole and paint lands on the paper around them.
- The mirror in six copies every stroke six times round the middle, turned rather than flipped, as
  Procreate's rotational symmetry does. A petal-shaped stroke makes a flower that also has mirror
  lines, and a curved one makes a pinwheel that has none, which is the grade three lesson.

On the Paint tab the tray, the paint on the brush, the tool, the size and the mirror are kept with
the painting in the browser, so a reload comes back with the same paint on the brush and the same
mixes in the wells.

### The options we compared

For drawing the stroke itself:

| Option | What it is | Why we did or did not use it |
|---|---|---|
| perfect-freehand | MIT, about 2 KB gzipped, no dependencies; turns points with pressure into an outline polygon | Used. It is already a dependency, Excalidraw uses it and tldraw ships a copy, and its outline can be filled on a canvas as one shape, so a translucent stroke does not darken where it crosses itself |
| Stamping a brush image along the path | How Procreate, Krita and MyPaint build strokes | Not used for the stroke's shape, which perfect-freehand gives more smoothly; its texture idea is used, below |
| rough.js strokes | The shelf's pen | Not used: it is built for outlines, and a child's stroke needs pressure and a smooth width |
| SVG paths with filters | Each stroke an SVG path, textured with feTurbulence | Not used: SVG filters are known to be slow on iOS, and Safari leaves the canvas filter off by default |

For texture and watercolour:

| Option | What it is | Why we did or did not use it |
|---|---|---|
| A paper grain fixed to the sheet | One tileable noise tile, applied at the paper's position, as Procreate's "texturized" grain | Used for pencil, crayon, prints and the watercolour's granulation. Layers of crayon show the same paper tooth, which is how real crayon looks |
| Curtis et al.'s watercolour model (1997) | Shallow water, pigment deposition and capillary layers, simulated | Not used: its authors say it "runs too slowly for interactive painting". Its edge darkening, the mask less its blur, is used |
| Tyler Hobbs's layered polygons | Thirty to a hundred translucent layers of a deformed polygon | Not used live: about a million vertices a stroke. A wandering edge from low-frequency noise gives a similar edge for one stroke |
| A wet edge by SVG filter | `feGaussianBlur` and `feComposite arithmetic` | Not used, for the filter cost above; the same arithmetic runs on the stroke's mask in JavaScript once, when the stroke is finished |

For colour mixing:

| Option | Licence and size | Why we did or did not use it |
|---|---|---|
| Mixbox (Sochorová and Jamriška, 2021) | CC BY-NC 4.0, non-commercial use only; commercial licence sold separately | Not used. We are a commercial product and would have to buy a licence |
| spectral.js (van Wijnen) | MIT, about 5.8 KB gzipped, 38 bands | Not used, though it would work. Our model is the same idea at 19 bands, written for our ten pans, and it is small enough to own |
| Kubelka-Munk on the three RGB channels | A five-line formula | Not used. Three channels are too coarse: a pure blue and a pure yellow come out black, and our pen blue and glow yellow a dark teal (#3B6361) |
| Averaging the colours | One line | Not used. Blue and yellow average to grey, which is the mistake a painting tool must not make |
| Our own: 19-band Kubelka-Munk | Written for this, in `src/paint/mix.ts` | Used, and described in the next section |

For the fill, stamps, mirror and undo:

| Choice | What we did | What we set aside |
|---|---|---|
| Fill | A scanline flood fill on the sheet as it looks, stopped by paint of another colour and by the sheet's printed outline; small gaps in a line are closed first by growing the boundary, and the paint then reaches a little under the line so no white rim shows. Tux Paint keeps a colouring sheet's outline above the paint for the same reason, and so do we | Tracing the filled area back into a vector (marching squares, or Potrace, which is GPL); a fill is kept as the point it was poured at and recomputed |
| Stamps | Print blocks cut from the shelf's `stamps` motifs, printed in the paint on the brush with the carved lines left as paper and the paper's grain showing through; tapping the chosen stamp again turns it over | Coloured stickers of shelf drawings, which are not printing |
| Stencils | A mask the surface keeps while it lies there: each pixel has how open it is, from 0 to 1, paint is laid through it, and a second stencil keeps the smaller opening. It is a mark of its own (`stencil`, and `lift` to take them off), so a painting replays with it | Painting the stencil into the picture as a shape, which cannot be lifted; a card as big as the sheet, which was our first version and made two cards side by side cover each other's holes |
| Mirror | A mark repeats across the sheet's middle, across both middles, or six times round the middle; a mirrored print faces the other way, as a turned block does | Eight copies round the middle: the four-way mirror already shows most of what eight would, and six pairs with snowflakes and with a sixth of a turn at grade three |
| Blender and dropper | The blender averages the recipes under its stroke with their neighbours; the dropper reads the recipe under a point | A smudge that moves pixels, which would blur the colour without mixing it, and a dropper that samples any colour off the screen, which would stand in for mixing |
| Undo | Each mark saves the pixels it changes; take back restores them, and replays from the start only past sixty marks | Keeping a whole image per step, which costs megabytes a step |
| Record | The marks, in squares, with each paint as its recipe | A picture file: larger, and it cannot be replayed, read as recipes or checked |

From the children's painting apps we took ideas, not visuals; the section after this one compares
them properly. We left out what the reviews warn about: advertising, virtual currency,
subscriptions for basic tools, sharing buttons, and voice or camera capture.

### How it is built

The sheet is a grid of pixels that each hold a paint and a thickness, never a colour (`Surface` in
`src/paint/surface.ts`). A paint is a recipe of the ten pigments, kept to forty-eighths, and its
colour is worked out once by the mixing model and cached. When paint is laid on a pixel that
already has paint, the two recipes are mixed in proportion to how much of each is there, to
sixteenths, so yellow brushed over blue on the sheet turns green the way it does in the tray. The
page draws the sheet from those two numbers per pixel, with the thickness as how much of the paper
shows through.

Each brush turns its outline into a coverage mask on a canvas and lays paint through it:

- The pencil lays thin paint that catches only the high points of the paper's grain.
- The crayon lays thick paint that skips the grain's hollows, with a slightly ragged edge.
- The felt pen lays even paint that deepens where two strokes cross.
- The paintbrush lays a thin wash, darker where it dried at its edge (the mask less its own blur),
  granular where it settled into the paper, and with a slowly wandering outline.
- The eraser thins what is there.

While a stroke is being drawn it is shown as a translucent shape on a layer above the sheet; when
the finger lifts, the finished mark is laid into the sheet and the shape fades over a fifth of a
second, which reads as the paint settling. Under reduced motion it is replaced at once.

Measured on a desktop Mac in headless Chrome at a device pixel ratio of 2, on a 30 by 20 square
sheet (1200 by 800 canvas pixels), a watercolour stroke thirty squares long took 32 ms to lay down,
a pencil, crayon or felt pen line 2 to 3 ms, a print 3 ms, a fill of most of the sheet 47 ms, a
four-way mirrored stroke 19 ms, and taking a mark back 1.6 ms. We have not measured a tablet, and
expect it to be several times slower; the fill is the first thing to move to a worker if it needs
to.

### Touch, a stylus and the keyboard

The sheet takes pointer events with touch actions turned off, captures the pointer, and reads the
coalesced moves a browser merges, falling back to the event itself when that list is empty. Only a
stylus reports pressure; a finger or a mouse gets pressure simulated from speed. A touch that
arrives within a second and a half of a stylus is taken to be a resting hand and ignored, which is
the pen mode Excalidraw discussed. A second finger while one is drawing is ignored.

Every tool has a key: P, C, M, B, L, F, S, T, D and E for the pencil, crayon, felt pen, brush,
blender, pour, stamp, stencil, dropper and eraser, 1 to 3 for the sizes, R for the mirror, U to
lift the stencils and Control Z to take back. The toolbar is one tab stop whose arrow keys move along it. On the sheet
the arrow keys move a pen cursor half a square at a time (two with Shift), Space puts the pen down
and lifts it, and Enter pours or prints where the cursor is. A screen reader hears the tool, the
paint on the brush in words ("yellow and blue"), what is in each well, and a count of marks on the
sheet.

### Where it lives

Both. The Paint tab (`paint.html`, beside Music in the nav) is free painting on a sheet of thirty
by twenty squares, or twenty by twenty four on a phone, with a wall of up to twelve earlier
paintings kept in the browser. In a lesson, a question asks for a painting by placing a
`paintsheet` in its scene: its size, squared or plain paper, a guide printed on it (a mirror line,
both middles, the three layers of a landscape, or a row for a repeat), an outline to paint in, the
paints the question gives, and the stamps and stencils it offers. `wakePainting` in `src/paint/lesson.ts` finds
those sheets on the lesson page and lays the tool's sheet exactly over the printed one, with the
tools and the question's own paints under the scene; a mirror sheet starts with the mirror on. It
is one import and one call in `src/pages/lessons.ts`, as the coding runner is. The child's sheet in
the app has no easel yet, since its drawings move with the painting shelf: there a painting question
says to paint it on paper, and "I have painted it" records it as collected for a grown-up to look at,
as a piece of writing is ([writing.md](writing.md), "How writing is marked").

## Other painting tools for children, and what we took

In the second round we looked at the painting and drawing tools children use, and at the research
on software for young children, to find what our tool lacked and what it should not grow. The survey
read the primary documentation where there is one (the Tux Paint manual, the Procreate handbook, the
ScratchJr paint editor guide), Common Sense Media's reviews, first-hand accounts of Kid Pix and Toca
Boca, and the papers listed at the end. Some pages would not open (Craig Hickman's own essay on Kid
Pix, NAEYC on process art, Adobe Fresco's help pages, Weave Silk), and Common Sense Education
withdrew its teacher reviews in 2026, so a few details rest on search summaries; the sources say
which.

### The tools we compared

| Tool | What children love in it | What it gave us, or why not |
|---|---|---|
| Tux Paint (free, since 2002) | Stamps with sounds and spoken names, dozens of Magic tools, a mixer of red, yellow and blue with white, grey and black, a pipette, starters whose outline stays on top of the paint, saving with no file names, and settings a teacher can change | The dropper, from its pipette. The outline that paint cannot cover and the wall with no file names we already had. Its sound on every stroke and most of its Magic tools we left out, below |
| Kid Pix (1989 to today) | Wacky brushes, an undo that says "oops", stamps in three sizes, erasers that explode, and sounds everywhere | Hickman's first rule, that no manual should be needed and every feature should explain itself, which is why a stencil's card is its own button rather than a second tap on the shape. The noise and the destruction we left out |
| Procreate | QuickShape, a symmetry guide with a rotational option, ColorDrop, a touch-and-hold eyedropper, and a time-lapse of every painting | The mirror in six, which turns as its rotational symmetry does; the grown-up's replay, from its time-lapse; the eyedropper, as a tool of its own. QuickShape we left out |
| Crayola Create and Play | Colour that stays between the lines, waxy crayon texture, special-effect crayons, and a lab for mixing primaries | Staying in the lines is our pour stopping at the printed outline, which we had. Its subscription and its effect crayons we left out |
| Sago Mini Doodlecast | Drawing while recording your own voice, with spoken prompts | Nothing: it needs the microphone, and reviewers note it can upload to YouTube if a parent allows it |
| Draw and Tell | Over sixty stencils, over a hundred and fifty stickers, backgrounds, and spoken stories | Stencils, as a handful of shelf shapes rather than sixty ready-made pictures |
| Tayasui Sketches School | Realistic media, a smudge tool, symmetry and a ruler | The blender is our smudge, working on the paint's recipe. Its App Store label lists identifiers used to track, which we do not do |
| ScratchJr's paint editor | Shapes with corners that can be dragged, a fill and forty colours | Nothing new: stamps, stencils and the pour cover it at this age |
| Artie's Magic Pencil | Tracing shapes from dot to dot to rebuild things, then colouring them | Nothing: its reviewers found little freedom and little reason to come back, which is the risk in tracing |
| Toca Boca | "We don't make games: we make toys"; almost no text, no scores, and testing with children in three or four rounds | Its rule that children are watched rather than asked, for the tablet pass still to come |
| Rebelle and Amaziograph (for adults) | Paint that runs, dries and can be blown; over 180 papers; pigment mixed from the light spectrum; twenty kinds of symmetry | Spectral mixing is what our model already does. Wet paint and papers we left out for now, below |

Four pieces of research shaped the judgements. Resnick and Silverman (2005) ask for "wide walls"
more than high ceilings and treat "diversity of outcomes" as the sign of success: if a class's
pictures all look alike, something has gone wrong. Hirsh-Pasek and colleagues (2015) call an app
educational when learning is active, engaged, meaningful and social, warn that bells and whistles
distract young children, and ask designers to let parents turn distracting features off. Radesky
and colleagues (2022) found that 98.8 per cent of the apps preschoolers used had at least one
manipulative design feature, among them lures such as sparkles and badges. And Project Zero's work
on documentation, with the reflect step in Resnick's spiral of learning, is the case for a replay a
child and a grown-up watch together.

### The features we weighed

For each feature children love, we asked four things: whether it fits the one hand-drawn look and
the palette; whether it serves the learning or is only novelty; whether the painting stays the
family's own, on the device and in the log; and whether it works with a finger on a tablet.

| Feature | Where children meet it | What we judged | Decision |
|---|---|---|---|
| Stencils | Draw and Tell, Rebelle's masking fluid, Tux Paint's starters | Fits: shelf shapes on a card in the card colour. Serves positive and negative shape, collage and the sun prints of the grade two lesson. A tap lays one. A large library would turn into ready-made pictures, so there are eight shapes | Built |
| Symmetry beyond the mirror | Tux Paint's kaleidoscope and rosette, Procreate's radial and rotational guides, Amaziograph | Serves rotational symmetry and fractions of a turn at grade three. A radial pattern looks impressive whatever goes in, which is the minds-off risk Hirsh-Pasek names, so the lesson asks for two patterns that differ in kind | Built, as a mirror in six |
| Textures and papers | Drawing Pad, Draw and Tell backgrounds, Rebelle's papers, black paper in glow apps | Squared or plain paper is the product's one look, on screen and in print, and black or kraft paper would break the palette and the printed sheet. The grain already gives each medium its tooth. Little to learn from it | Left out |
| A colour dropper | Procreate, Tux Paint's pipette | The survey warns that a dropper can stand in for mixing. Ours reads the recipe back in words, so it teaches how a colour on the sheet was made | Built |
| Shapes that snap into place | Procreate's QuickShape, Amaziograph | It replaces the child's line with a perfect one, and Tux Paint's option to drop its rotation step suggests shape tools are hard for young children. Stamps and stencils already give shapes | Left out |
| Tracing a shelf drawing | Tux Paint starters, Artie's Magic Pencil, letter tracing in Sago Mini School | Contested: Wilson and Wilson argued children learn drawing's conventions by copying, and Lowenfeld opposed colouring books and copying. Our third unit is drawing from looking, and a traced cat is not that. The outline sheets in a few lessons (a butterfly, a leaf) are as far as we go | Left out for now, and an open question for grade four |
| Paint that dries, wet into wet | Rebelle; Waldorf wet-on-wet painting | Real watercolour behaviour, but the sheet would have to remember which paint is still wet, and paint that runs by itself is movement that has to stop under reduced motion. The survey found no evidence on learning, and unwanted bleeding is the likely complaint | Deferred, still on the build list |
| Smudging and blending | Tux Paint's smudge and blur, Tayasui's smudge, Kid Pix's Electric Mixer | Blending two colours where they meet is mixing on the sheet, which the lessons teach. Ours mixes recipes, so the blend is a real paint | Built, as the blender |
| Stickers from the shelf | Kid Pix, Tux Paint, Draw and Tell, Toca Mini | Resnick warns that specialised pieces lead every child to the picture on the box, and shelf drawings are finished pictures. Stamps and stencils already bring shelf shapes in as parts to print and paint through | Left out |
| A gentle sound, off by default | Tux Paint (the bigger the brush, the lower the pitch, with a mute), Kid Pix | Danna and Velay found sound tied to pen speed helped adults learning to write and, in a pilot, children with dysgraphia, but Hirsh-Pasek warns that sound effects distract young children, and principle 9 says no sounds. An option off by default is still an option to find and argue about | Left out; worth trying only as a handwriting aid in writing |
| A time-lapse replay | Procreate, Kids Doodle's movie mode, Doodlecast | It is replayed from the marks already kept, so nothing new is stored, and it is offered, never required, which Resnick asks of any reflection | Built, as the grown-up's view |
| A gallery | Tux Paint's thumbnails; Seesaw and Artsonia in the cloud | The wall on the Paint tab is ours and stays on the device. A cloud portfolio is out | Kept as it was; the painter's hut's wall is still on the build list |
| Magic effects: rainbow, glitter, neon | Tux Paint, Kids Doodle, Draw and Tell, Crayola, Kid Pix's wacky brushes | The lures Radesky found, and a picture made by the brush rather than the child | Left out |

## Colour mixing, and how it works

Each of the ten pans (yellow, orange, red, pink, blue, sky, green, brown, black and white) is a
reflectance curve: how much light it reflects in each of nineteen bands, every twenty nanometres
from 380 to 740. The curves were found offline as the smoothest curve that paints the pan's colour,
which is Scott Burns's idea for recovering a reflectance from an sRGB colour; we implemented it from
his papers rather than his code, which is under a share-alike licence. A test holds each curve to its
pan within two units in 255.

To mix, each curve is turned into the Kubelka-Munk ratio of absorption to scattering, K/S =
(1 − R)² / 2R, band by band. The ratios are averaged, weighted by how many parts of each pigment
there are times its tinting strength, and turned back into a reflectance with R = 1 + K/S −
√((K/S)² + 2K/S). The reflectance is then seen under daylight: each band is weighted by the CIE 1931
colour matching functions and the D65 illuminant, converted to linear sRGB, and scaled so that a
surface reflecting everything is exactly white. Tinting strength is why one part of white makes a
tint rather than a grey, and why a drop of black darkens a pot of yellow without swallowing it.

The same function mixes the tray, the sheet, the colours on the shelf's drawings (the colour wheel's
secondaries are mixed from its primaries, and a tint ladder from its paint and white) and the
verifier. What it gives, against averaging the two colours:

| Paints | Our mix | Named | Averaging the bytes |
|---|---|---|---|
| Blue and yellow | #729F62 | green | #95A182, which reads as grey |
| Red and yellow | #F47B4D | orange | #ED8646 |
| Red and blue | #664B73 | purple | #83518C |
| Red, yellow and blue | #8D765D | brown | #AC7D71, which reads as a dull red |
| Red and white | #FFA6BA | pink | #EB98A4 |
| Blue and white | #9DC6F0 | blue, close to the palette's sky #8CC7EF | #93B4E0 |
| Green and white | #B2DCBC | green, close to the palette's mint #93D5B3 | #A5CDB0 |
| Red and green | #825E5D | brown | #956A5C |

The model's purple is dark and a little dull, as real paint's is. Its greens are soft rather than
bright, because our blue sits between the shelf's pen blue and a cerulean; a phthalo blue would give
brighter greens and duller purples, and a palette can only choose one trade.

A question about colour needs a name for a colour, and a name needs boundaries. `nameOf` works in
Björn Ottosson's OKLCH space: below a lightness of 0.3 a colour is black; below a chroma of 0.03 it
is grey or white; a light red is pink; a dark, dull orange or yellow is brown; and otherwise the hue
decides between red, orange, yellow, green, blue and purple. A colour within five degrees of a hue
boundary, or just either side of the pink or brown line, is named but marked close, and the
verifier refuses a question that rests on it: our model's two parts of red to one of yellow sits
between red and orange, so no question asks what it makes. Warm is red through yellow and the pinks;
cool is green through purple; a yellow-green or a magenta is neither, and the warm and cool checker
refuses it.

Dots are mixed differently, because they are not mixed as paint. The dots lesson averages the dots'
light in linear sRGB, which is what the eye does at a distance, and red and yellow dots come out
orange (#EEA147). Blue and yellow dots come out a warm grey (#BEAC97), and green and yellow dots sit
on the line between yellow and green, so the lesson asks what red and yellow dots look like and no
more.

## Screen and paper

| | On screen | On paper |
|---|---|---|
| The tool | The whole tool: brushes, the paint box, mixing in the tray, fill, stamps, mirror, undo | Nothing. The child paints with real paint, crayon or pencil |
| A paint sheet in a lesson | The tool's sheet over the printed frame, with its guide and outline drawn on it | The frame, squared or plain, with its guide and outline printed, and the paints named under it |
| Colour on a drawing | The mixed colour | Each colour family's own hatch (a yellow is dotted, a blue leans, a red lies flat), with its name written on it; a pale tint prints as a sparse hatch |
| The mirror and the print questions | The drawing, with the choice to tap | The same drawing, with the choice to ring |
| A finished painting | On the Paint tab's wall, and in a lesson on its card | Not printed by the lesson. A family can print one from the browser; it prints in grey on a black and white printer |
| The grown-ups' sheet | The key on the card: what to look for, and a question to ask | A separate sheet with the same words, never on the child's pages |

The tool records the painting as marks: a stroke is its brush, its paint as a recipe, its size in
squares, its mirror and its points (x, y and pressure in squares, to two places); a fill is its paint
and the point it was poured at; a print is its block, its paint, its place, size and whether it was
turned over. A painting of six marks with two long watercolour strokes was 4.2 KB; fourteen marks
was 11.4 KB. A long brush stroke is about one to two kilobytes. We have not measured a real child's
painting, and a busy one may reach a hundred kilobytes. A painting replays to the same picture at any
size, and a fill replayed at a very different size can differ where a gap in a line is only a pixel
or two wide.

## Privacy

A child's painting is the family's own. On the Paint tab it is kept in the browser's storage on the
device and nowhere else; in a lesson it becomes an `answered` event in the family's log, which syncs
only through our own `withFamily` path and is unreachable from another family. It is never sent to a
third party and never to a model: [ai.md](ai.md) rules out AI marking of work that is a judgement,
and a painting is exactly that. The tool has no camera, no upload, no import of a photograph, no
share button and no analytics. The grown-up's view replays a painting on the device from its marks,
and what the grown-up records is a `responded` event in the same log, read under the same rule as a
mark entered from paper.

The FTC's COPPA guidance supports keeping it this way. Information an app uses that "is stored on the
device and is never transmitted" is not collected (FAQ F.5), while a painting app with buttons that
send the painting by email or to a social network needs verifiable parental consent, with "no
exception" (FAQ D.12). A drawing is not a category of personal information in the rule, but a
painting can carry a child's name or a picture of their family, so we treat every painting as
personal. One practical point follows: WebKit deletes a site's storage after seven days without a
visit, so the device's copy alone is not a safe home, and the family's log is. This needs a lawyer's
reading before launch, as the rest of [auth.md](auth.md)'s consent questions do.

## A grown-up's view

A finished painting can be looked at by a grown-up, with `mountLook` in `src/paint/look.ts`. On the
Paint tab it opens under the wall; in a lesson it opens under the painting when the answer key is
on, which is how the scratchpad stands in for the parent's page until there is one. It shows the
painting large and plays it back from its marks, with a slider to step through them and a button
to watch it being made; under reduced motion the button moves one mark at a time and nothing plays
by itself. Beside it are the paints the painting used, each as its recipe in words with a swatch
and the number of marks it made, and the tools, with how often each was used ("stencil 3,
paintbrush 11"). Then what to look for: in a lesson, the question's own look-for sentence, its two
to five points as boxes to tick, and its question to ask; on the Paint tab, where nothing was
asked, the elements after Schirrmacher (colours mixed on purpose, lines of more than one kind,
shapes that fill the sheet, a pattern, near and far, the paper showing through). A line of advice
sits under them: let the child speak first, say what you see, name a choice they made, and do not
ask what it is. The grown-up can add a line of their own and save.

Saving appends a `responded` event, added to `engine/answer.ts` in this round:

```ts
responded: {
    q: QuestionRef;
    answer: string | null;
    sheet: string | null;
    noticed: string[];
    note: string | null;
};
```

It points at the painting's `answered` event, or at the printed sheet for a painting done on paper,
and records only the points ticked and the note. It is never right or wrong and adds nothing to a
score. `school/family/access.ts` gives it the same rule as `marked`, since both are a grown-up
writing about a child's work from paper, and the database test's sample carries one.

We decided it together with writing, as the first round said we should. [writing.md](writing.md)
proposed a checklist for a piece a grown-up marks by eye, recorded in the `rule` of a `marked`
event. The two are the same act: a grown-up looks at a piece against a stated look-for and says
what they saw. So `responded` is for every piece marked by eye, a painting or a piece of writing,
with the item's `notice` list as the checklist, and `marked` stays what it was, right or wrong for a
question answered on paper. `art.by-eye` now requires the list; `writing.by-eye` does not yet, and
adding it is writing's to do. The general grown-up mark the audit proposes for any subject (item 6
of its list) would use the same event.

## How art is marked

Six checkers in `src/paint/prove.ts` are registered with the others:

- `paint.mixes` works out what paints make with the model above. `of` names a paint pots drawing, or
  a dots picture whose dots mix in the eye, and `pick=name` binds a choice to the option that names
  the colour; `pick=warmth` binds it to warm or cool; with a pot drawn as a question mark,
  `pick=missing` binds it to the one paint that, put in that pot, makes the colour the drawing shows.
  For options that are paints, `pick=makes target=green` binds the one whose paints make green,
  `pick=warm` or `pick=cool` the one warm or cool option, `pick=lighter` or `pick=darker` the one
  clearly lightest or darkest, `pick=same` the one that mixes to exactly the colour of a given
  recipe (a mix made bigger; one more of each is a different green, however close), `pick=between`
  the one whose lightness lies between two recipes, and `pick=most` the one with the biggest share
  of a paint. `with` adds a paint to every option first. With `of` naming a paint box, `pick=cannot`
  binds the one colour no mix of its pans makes, found by mixing every combination of up to three
  parts. A number set to `kinds` counts the different colours two or three paints make with up to
  so many parts of each. It refuses a question where two options fit, where none does, or where a
  colour is too close to a line.
- `paint.mirror` rebuilds a mirror drawing's three halves from its seed and requires exactly one to
  be the mirror, which refuses a pattern that is the same both ways round. It proves the whole
  butterflies too, which are the same halves drawn joined on.
- `art.shapes` reads the pieces off a cut-paper picture, counting a shape, the geometric or organic
  pieces, all of them, or how many more of one kind there are, and says whether a stencil's shape is
  geometric or organic.
- `art.one-line` says which figure can, or cannot, be drawn without lifting the pencil, by Euler's
  rule: the lines join up and at most two corners have an odd number of lines.
- `art.print` says which letter or word prints the right way round from a block carved as it is
  written: only one that reads the same backwards in letters that are the same in a mirror (A, H,
  I, M, O, T, U, V, W, X and Y).
- `art.by-eye` is a painting a grown-up responds to. It requires `look-for`, what a good attempt
  shows in the art's own words, `notice`, two to five points a grown-up can tick, and `ask`, a
  question to start the talk; the sentence and the question print on the grown-ups' sheet.

Ninety five of the 115 items are proved by the machine (thirty eight through these checkers and
fifty seven by an expression over the question's own settings, which the drawing is drawn from
too), and twenty are paintings. A painting
is an answer kind in `engine/answer.ts`:

```ts
export type Brush = "pencil" | "crayon" | "marker" | "water" | "blend" | "eraser";
export type Mirror = "none" | "two" | "four" | "six";
export interface PaintPart {
    pigment: string;
    parts: number;
}
export type PaintMark =
    | ({ k: "stroke"; brush: Brush; paint: PaintPart[]; size: number; mirror: Mirror } & Stroke)
    | { k: "fill"; paint: PaintPart[]; x: number; y: number; mirror: Mirror }
    | { k: "stamp"; stamp: string; paint: PaintPart[]; x: number; y: number; size: number; flip: boolean; mirror: Mirror }
    | { k: "stencil"; shape: string; x: number; y: number; size: number; hole: boolean; mirror: Mirror }
    | { k: "lift" };

export type Given =
    ...
    | { k: "painting"; paper: "squared" | "plain"; w: number; h: number; marks: PaintMark[] }
    ...
```

with its entry in `GIVEN`, which checks the paper, the size, and every mark by its kind (a stroke of
paint needs a paint, while the blender and the eraser may have none, points come in threes, a fill
needs the point it was poured at, a stencil its shape and place). A stroke reuses `Stroke`'s points
rather than declaring them again. It is recorded with the existing `answered` event, with `right`
null, which is the ordinary state for a drawing or a performance. A painting done on paper is
recorded as `unmarked` when the grown-up enters it, as writing is, and a grown-up's response to
either is the `responded` event above.

## Scope and sequence

The strand has four units, numbered across all four grades as the other tracks do: 1 Colour, 2
Pattern and print, 3 Looking and drawing, and 4 Learning from artists. The elements are carried by
them: colour and value in unit 1; pattern, texture and symmetry in unit 2; line, shape, space and
tone in unit 3.

| Grade | Colour | Pattern and print | Looking and drawing | Learning from artists |
|---|---|---|---|---|
| 1 | Primaries and the secondaries they make; the paint a mix is missing | A repeat of two and of three; the part that repeats; a print far along the strip | Comparing a drawing with what it was drawn from; geometric and organic shapes cut from paper | A line for a walk, after Paul Klee |
| 2 | Tints and shades; what went into a tint | Symmetry with a mirror; rubbings and prints, and telling them apart | Matching a rubbing to its leaf by its veins | Anna Atkins's blue prints from the sun |
| 3 | Warm and cool, and mixes that lean either way | A pattern that turns, in fractions of a turn | A landscape in layers: paler, cooler and smaller further back | Seurat's dots, mixed in the eye |
| 4 | Mixing in parts; opposite colours | A print is the block turned over, and the words that survive it | Light and shadow, in tones | A repeat like William Morris's wallpapers |

## The lessons

Six lessons were added in the second round (collage, a line for a walk, the blue prints, a
pattern that turns, light and shadow, and William Morris), and all eighteen were rewritten to the
three bands. Each has ten or eleven questions from six or seven items. The first two columns are
proved by the machine; the three-star question is a painting a grown-up responds to except where
it says otherwise.

| Grade | Lesson | Way in and core | Try this ★★ | Try this ★★★ |
|---|---|---|---|---|
| 1 | Mixing new colours | What two pots make; which two make a colour; the paint missing from a pot; three mixed stripes, painted | The colour a box of three paints cannot make | A picture in the primaries with two colours mixed for it |
| 1 | A pattern that repeats | The print in a gap, in repeats of two and three; the part that repeats; which print is number twelve | The one wrong print in a strip | A border whose repeat is three prints long |
| 1 | Drawing from looking | Spots and petals counted; what a drawing left out; which of three drawings is right | Whether a drawing is right, with the reason | The cat drawn big, with three details found by looking |
| 1 | Shapes cut from paper | Count a shape; geometric or organic; how many pieces are geometric; enough pieces for two | How many more pieces are geometric than organic | An animal built from stencil shapes of both kinds |
| 1 | A line for a walk | Find a kind of line; name one; count where a line crosses itself; five kinds of line, drawn | Which figure cannot be drawn in one line | A line for a walk, coloured so no two touching shapes match |
| 1 | Thick and thin lines (18 September 2026) | Which line is thicker; a thick or a thin line for a thing near or far; which of three things is furthest back; which of two drawings puts a thing nearer | Which drawing puts a thing nearer, and why | Two things of their own, one near and heavy and one far and light, told apart by the line |
| 2 | Tints and shades | Tint or shade; what red and white make; what was added to a pot; the next step of a ladder | The lightest pink, comparing the white with the red | A sky in four or more bands |
| 2 | Symmetry with a mirror | Which half finishes a butterfly, small and large; which whole butterfly matches; which way the copy faces | How many squares to paint for a total with the mirror on | A butterfly with three shapes a wing and a mixed colour |
| 2 | Rubbings and prints | Which leaf was rubbed; which way a rubbing faces; which way a print faces; rubbed or printed | Which rubbing came out blank, and why | Rubbings of three textures |
| 2 | Blue prints from the sun | Which fern made the print; where the sun reached; through a hole or round a shape; leaflets counted from one side | What colour the paper is where two ferns crossed | A print of three shapes, two of them overlapping |
| 2 | Cezanne's shapes (16 September 2026) | The shape inside a thing; circles counted on the table; cut shapes ordered back to front; geometric or organic; shapes in a paper picture | Whether the apple is a cone, with the reason | A still life from four stencilled shapes, the box at the back |
| 2 | Over and under (18 September 2026) | Which strip is on top; the overs counted along a row; the row that goes wrong; over or under in an empty row | Which of two weaves would hold together | A woven pattern of their own that holds in every row |
| 3 | Warm and cool | Warm or cool; which mix is warm; which paint makes a mix cool; paint for the weather; whether red and blue are always cool | Which mix of red and blue is warm | A warm sun over a cool sea, each with something of the other |
| 3 | A pattern that turns | How many repeats; one repeat as a fraction of a turn; whether a turn leaves it the same; half a turn; strokes with the mirror | Which mirror paints it in the fewest strokes | A flower and a pinwheel with the mirror in six |
| 3 | A landscape in three layers | Which layer; the paint for far hills; the paint for the middle hills; big and small; which two layers swapped paints | Mountains even further away | Three layers, pale and cool behind, one thing overlapping in front |
| 3 | Pictures made of dots | Which two colours of dots; close up or from afar; what they make; which dots make a colour; putting wrong dots right | Why blue and yellow dots look grey, not green | A tree in dots with a colour that is not in the tray |
| 3 | Hokusai's wave (16 September 2026) | The line that makes the foam; one curl printed and counted; the deep blue and the palest tint on the ladder; the lighter of two mixes; tint or shade; the next print | Which of two wave lines is about to break, and why | A wave in two blues and white, the hooks repeated along the crest |
| 3 | Monet's light (18 September 2026) | Which picture is dusk; which has no shadow; three hours put in order; the warmer of two mixes | Whether two paintings were made at the same time of day | The meadow at an hour of their own, told by the light alone |
| 4 | Mixing in parts | What two to one makes; the same green made bigger; enough blue for the same green; a leaf in three greens, painted | Which of two greens is yellower | How many different greens up to three parts of each, proved by mixing rather than painted |
| 4 | Opposite colours | Opposite on the wheel; opposites mixed; the missing opposite; an opposite without a wheel; the opposite of the opposite | A brown with no brown in the box | An orange fish in a blue sea, shaded with opposites |
| 4 | A print is the other way round | Which way it faces; which print a block makes; letters on a block; a print of a print; a row that turns over, printed | Which way to carve for the print you want | Which word prints true, proved rather than painted |
| 4 | Light and shadow | Lighter or darker; where the light is; the paint for the lit and the shaded side; tones in between | Where the shadow goes when the lamp moves | A ball in four tones with its shadow |
| 4 | A repeat like William Morris | How many tiles; straight or half-drop; tiles to cover a wall; rows of tiles; whole tiles in a half-drop | Whole tiles left in a dropped column | A tile whose edges are hard to find |
| 4 | Hiroshige's rain (18 September 2026) | How many directions the rain falls in; near rain or far; which print draws the far bank; what is different between two prints | Which of two prints cannot be right, and why | A print of their own with rain falling one way and something near and far |

Each lesson's grown-ups note says what the machine marks, what to do with real materials, and how
to respond to the painting in words: let the child speak first, describe what is there in the
language of colour, line and shape, name a choice the child made, ask one question about it, and
avoid "what is it?" and "lovely". It also says that a child who gets stuck on a star question has
not failed the lesson. The art lessons sit on the painter's hut's path in the journal, all eighteen
of them, and the worlds work put art skills on two of its reaches.

## How hard the lessons are

The audit graded the first round's 34 items against the US arts standards and England's curriculum
and found that none asked for a reason, 23 sat below their grade and 13 gave their answer away. The
second round answered each finding. Every item past the way in has a ladder of two hints that ask
rather than tell: the first points at the drawing or asks a question, the second offers a first
step. The items the audit named were changed: which mix has more yellow now compares 2 to 1 with 3
to 2, where the mix with more yellow in it is the less yellow one; the warm pick is among mixes, not
pans; every paint offered for the far hills is pale, so the child also has to choose the cool one;
the two-to-one question lost its repeated version; and the labelled wheel stays only as a way in.
The questions that turn the unknown round (the missing pot, what was added to a tint, which dots
make a colour, the block for a print you want) carry the core.

We graded the new slots ourselves on the audit's five levels, as the audit's pilot graded its own
new items, and the audit's graders have not seen them. Counted by question slot, the shares are:

| Grade | Slots | Recall | One step | Several steps | Reasoning | Non-routine | The audit's proposed targets |
|---|---|---|---|---|---|---|---|
| 1 | 53 | 8 (15%) | 17 (32%) | 15 (28%) | 8 (15%) | 5 (9%) | recall at most 15%, reasoning at least 12%, non-routine at least 8% |
| 2 | 40 | 0 | 11 (28%) | 17 (42%) | 8 (20%) | 4 (10%) | at most 10%, at least 15%, at least 10% |
| 3 | 42 | 2 (5%) | 6 (14%) | 19 (45%) | 11 (26%) | 4 (10%) | at most 5%, at least 20%, at least 10% |
| 4 | 53 | 2 (4%) | 8 (15%) | 21 (40%) | 16 (30%) | 6 (11%) | as grade 3 |

Every lesson has a reasoning and a non-routine question. Most of the non-routine ones are paintings
made to a constraint the child has to plan for, such as a border whose repeat is three long or a
line coloured so no two touching shapes match; two are proved, how many greens and which word
prints true. The share of reasoning at grade one is the thinnest, and the grade one reasoning is
mostly finding a mistake or predicting a print further along a strip.

## The drawings added

All twenty four are in `src/art/painting.ts`, in a Painting category on the shelf and on the Art and
painting shelf, each with at least two takes and a line in `shelf-groups.ts`. Every colour on them
is mixed by the model. Fourteen came in the first round:

- `paintbox`: a tin of pans in rows; the tool's paints are drawn with it.
- `mixingtray`: a tray of round wells, each empty, a pan's paint, or a mix written as its recipe.
- `palette`: a wooden palette with blobs of paint and a brush.
- `paintpots`: pots with a plus between them and an equals before the pot they make, which is the
  mix, a question mark, or empty; two pots of yellow and one of blue is two parts to one. A pot can
  now be a question mark itself, with the pot at the end showing what the whole mix made.
- `arttools`: the drawing and painting tools, in a row, in a jar, or one at a time as the tool's
  buttons, now with the blender, the stencil and the dropper.
- `colourwheel`: six or twelve segments mixed from the three primaries, any left empty (its name
  then printed as a question mark), one ringed, with the warm half marked or an arrow to the
  opposite colour.
- `tintladder`: steps from a colour towards white or black, each doubling what is added, with a
  question mark under a step left empty.
- `paintsheet`: the sheet a lesson asks for a painting on, now with the stencils it offers.
- `stamps`: a print block and the print it makes, facing the other way, or a rubbing of it facing
  the same way, or a result not named so a question can ask how it was made.
- `printrow`: a printed repeat with one print left out, or one printed with the wrong block.
- `mirrorpick`: half a pattern of painted squares and three halves to choose from, as wings, as a
  block and its prints, or as three whole butterflies of which one is the same both sides.
- `dots`: a sun or a tree painted in dots, with a magnifying glass.
- `layers`: a landscape of far, middle and near hills.
- `rubbing`: three leaves with different numbers of veins and a crayon rubbing of one.

Ten came in the second round, for the new lessons:

- `stencil`: a card with a shape cut out and the shape that came out of it, with what each prints,
  or one shape alone for the geometric and organic question.
- `sunprint`: three ferns and the white print one of them left on blue paper, or a print of
  several.
- `lines`: kinds of line, lettered: straight, wavy, zigzag, dotted, spiral, loopy and dashed.
- `linewalk`: one line that wanders and loops back over itself, each loop crossing it once so the
  crossings can be counted, with the loops coloured in or not.
- `oneline`: figures to draw without lifting the pencil (a square, a house, the house with a cross,
  an envelope, two squares, a window, a cross, a bow and a star).
- `collage`: a boat, a fish or a house made of shapes cut from painted paper, which the checker reads
  its pieces from.
- `radial`: a shape repeated from three to twelve times round a centre, with one left out if asked.
- `tilerepeat`: a tile repeated straight or as a half-drop, with one tile ringed or missing.
- `stilllife`: an apple, a cup, a ball or a box lit from one side, with its dark side, its shadow and
  the lamp, or without the lamp so a question asks where the light is.
- `tonescale`: squares shaded from the white of the paper to as dark as a pencil goes.

The owner's list also named an easel. The worlds work drew one for the painter's hut the same day,
so we did not draw a second.

Three settings were added on 17 September 2026 for the last four art lessons of the catalog plan
(batch 6), each defaulting to what its drawing draws today, since lessons already written draw all
three:

- `stilllife` takes `weights`, a list of the words thick and thin, one for each of `things` and in
  the same order. A thick outline is drawn at 2.8 and a thin one at 1.4, twice the width rather than
  a lighter grey, so the difference survives the hatch on paper, and the details of a thing (the
  cup's handle, the apple's stalk) follow their outline's weight. An empty list, the default, draws
  every outline at 1.8 as before. It serves the grade 1 lesson on thick and thin lines.
- `layers` takes `light`, one of noon, morning and dusk. Noon is the landscape as it was already
  drawn: the sun high on the right and no shadow on the ground. At morning the sun is low on the
  left and the tree's shadow reaches three squares to the right, and at dusk the sun is low on the
  right and the shadow reaches three squares to the left, so the three can be put in order by the
  shadows alone, which is what survives without colour. It serves the grade 3 Monet lesson, which
  draws the same scene three times in a row.
- `bridge` takes `rain`, `weight` and `far`. `rain` is 0 for none, 1 for rain in one direction and 2
  for rain in two directions crossing, which is the print a question asks what is wrong with. The
  near rain is drawn at twice the width of the far rain, and `weight` draws the near lines, the far
  lines or both, so one print can carry both weights. `far` at 1 draws a bank behind the arches and
  a bank at the front, the far one hatched twice as open as the near one, and takes the box from
  five squares to six. It serves the grade 4 Hiroshige lesson.

One drawing was added on 18 September 2026 for the grade 2 lesson on over and under. `weave` draws
paper strips running down and strips woven across them in numbered rows, each row going over `step`
strips and then under `step`, starting over unless its entry in `start` is 1. `wrong` names a row
that breaks the pattern at the crossing `wrongat`, `float` a row that lies over every strip and so
is not woven in, and `blank` a row left as an empty strip to weave; 0 in any of the three means
none. On paper the strips across are white and the strips down are hatched.

## The order to build the rest

1. A tablet pass: measure the tool on an iPad and a low-cost Android tablet, move the fill to a
   worker if it is slow, and test the palm rule with a real stylus and a real hand. Watch children
   use the stencil button and the blender rather than asking them, as Toca Boca does.
2. The grown-up's view on the parent's page of the product, from the `responded` events and the
   paintings' marks, once that page exists; the scratchpad shows it under the painting today.
3. `notice` lists for `writing.by-eye`, so a piece of writing is responded to the same way.
4. A sketchbook: the child's drawings from looking kept in order, one page a lesson, which Ofsted and
   NSEAD both treat as the record of progress in art.
5. Wet into wet: two washes that meet while wet bleed into each other, which would need the sheet to
   remember which paint is still wet for a second or two, and would have to stop under reduced
   motion.
6. The painter's hut's wall filled from the family's own paintings, which is the one place on the map
   the child makes.
7. A review lesson a grade, which no track outside maths has.

## Open questions

- Whether art becomes one of the tracks. It is a subject with lessons today, counted apart from the
  seven tracks in `src/family/tracks.ts`, with the glow marker it shares with coding.
- Whether tracing has a place at grade four, when children start to want their drawings to look like
  their subject and some find that frustrating.
- Whether the mirror should also turn in eight, and whether the six-way mirror should offer a
  flipped version as well as the turned one.
- Whether a finished painting should print in colour for the wall. Everything else prints in black on
  white, and a painting printed that way loses what it is.
- Whether the paint box should offer a split primary set (a warm and a cool of each) at grade four,
  which gives brighter greens and purples and is how painters work.
- How long the device keeps a painting that is not in a lesson, given the seven-day storage limit in
  Safari.

## Sources

Teaching art:

- Department for Education (2013). [National curriculum in England: art and design programmes of study](https://www.gov.uk/government/publications/national-curriculum-in-england-art-and-design-programmes-of-study/national-curriculum-in-england-art-and-design-programmes-of-study). Opened: the purpose, aims and key stage 1 and 2 content.
- Ofsted (2023). [Research review series: art and design](https://www.gov.uk/government/publications/research-review-series-art-and-design/research-review-series-art-and-design). Opened: the three kinds of knowledge, pedagogy, assessment and diversity. Ofsted (2012), [Making a mark](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/413336/Making_a_mark_-_art_craft_and_design_education_2008-11_-_leaflet.pdf), for the finding on drawing.
- NCCAS (2014). [Visual Arts at a Glance](https://www.nationalartsstandards.org/sites/default/files/2021-11/Visual%20Arts%20at%20a%20Glance%20rev.pdf) and the [anchor standards](https://www.nationalartsstandards.org/content/national-core-arts-standards-anchor-standards). Opened: all eight pages.
- Virginia Board of Education (2020). Visual Arts Standards of Learning, [grade 1](https://resources.finalsite.net/images/v1722963407/frederickcountyschoolsvanet/taowsiuigxej0bvvd1zt/1st_grade_visual_arts_2020_102621.pdf), with grades 2 and 3 at parallel addresses. Grade 4 could not be opened.
- J. Paul Getty Museum (2011). [Elements of Art](https://www.getty.edu/education/teachers/building_lessons/elements_art.pdf) and [principles of design](https://www.getty.edu/education/teachers/building_lessons/formal_analysis2.html).
- NSEAD. [Primary framework](https://www.nsead.org/files/8608849141653ba98fcb20e1e196289e.pdf) (2014), [A simple printed pattern](https://www.nsead.org/resources/teaching-inspiration/units-of-work/uow-a-simple-printed-pattern/) (2018), [response to the Ofsted review](https://www.nsead.org/files/9f1311767d7a5252766fe2a266f1e78e.pdf) (2023) and the [anti-racist curriculum checklist](https://www.nsead.org/resources/anti-racist-art-education/curriculum-checklist/) (2023).
- AccessArt. [Drawing exercises for ages 5 to 7](https://www.accessart.org.uk/drawing-journey-children-5-7-exercises/), [continuous line drawing](https://www.accessart.org.uk/continuous-line-drawing-exercise/), [blind contour drawing](https://www.accessart.org.uk/making-a-blind-contour-drawing/), [printmaking](https://www.accessart.org.uk/curriculum-planning-printmaking/) and [mono print](https://www.accessart.org.uk/exploring-the-world-through-mono-print/). Some detail is for members only and was not seen.
- Oak National Academy. [Primary art curriculum](https://www.thenational.academy/teachers/curriculum/art-primary/overview), including the Year 1 colour lessons and the Year 3 pattern unit.
- Tate. [Neo-impressionism](https://www.tate.org.uk/art/art-terms/n/neo-impressionism), [frottage](https://www.tate.org.uk/art/art-terms/f/frottage), [monotype](https://www.tate.org.uk/art/art-terms/m/monotype) and the [Matisse cut-outs](https://www.tate.org.uk/press/press-releases/henri-matisse-cut-outs).
- Kate Watkins. [Polystyrene tile printing](https://www.katewatkins.co.uk/blog/polystyrene-tile-printing-on-paper-and-fabric).
- Metropolitan Museum of Art (2004). [Islamic Art and Geometric Design](https://resources.metmuseum.org/resources/metpublications/pdf/Islamic_Art_and_Geometric_Design_Activities_for_Learning.pdf), pages 1 to 11.
- Cooper Hewitt (2018). [Adinkra: Message and Medium](https://www.cooperhewitt.org/2018/09/07/adinkra-message-and-medium/). Creative Australia, [First Nations protocols](https://creative.gov.au/first-nations-arts/protocols-for-using-first-nations-cultural-and-intellectual-property-in-the-arts).
- Ishibashi, K. and Okada, T. [How copying artwork affects students' artistic creativity](https://escholarship.org/content/qt8bq69315/qt8bq69315_noSplash_5d0a4488df6fd27a48a8a43b5040570d.pdf). Pages 1 and 2.
- Jaquith, D. (2018). [The Studio Habits of Mind](https://www.studiothinking.org/uploads/1/1/7/5/117528172/studio_thinking_i_can_studio_habits.pdf), after Hetland, Winner, Veenema and Sheridan. [Teaching for Artistic Behavior](https://teachingforartisticbehavior.org/). Reggio Children, [ateliers](https://www.reggiochildren.it/en/rc/ateliers/). Montessori, M. (1914), [Dr. Montessori's Own Handbook](https://www.gutenberg.org/files/29635/29635-h/29635-h.htm). Waldorf practitioner pages ([Waldorfish](https://waldorfish.com/blog/waldorfgradeonepainting), [Seattle Waldorf School](https://seattlewaldorf.org/2022/03/10/wet-on-wet-watercolor/)), which are not primary texts.
- Schirrmacher, R. (1986). [Talking with young children about their art](https://www.moma.org/momaorg/shared/pdfs/docs/learn/courses/Schirrmacher_Talking_with_Young_Children.pdf), Young Children 41(5). All five pages. Lowenfeld, V. (1964), [Creative and Mental Growth](https://archive.org/details/creativementalgr0000lowe), fourth edition, table of contents only.
- Public Domain Review (2025), [Public Domain Day 2025](https://publicdomainreview.org/blog/2025/01/public-domain-day-2025/), and Hirtle, P. B., [Copyright term and the public domain in the United States](https://guides.library.cornell.edu/copyright/publicdomain), for the copyright dates. Artists' dates are from their Wikipedia entries.

Colour:

- Baird, C. S. (2015). [Why are red, yellow, and blue the primary colors in painting](https://www.wtamu.edu/~cbaird/sq/2015/01/22/why-are-red-yellow-and-blue-the-primary-colors-in-painting-but-computer-screens-use-red-green-and-blue/).
- MacEvoy, B. [Do "primary" colors exist?](https://www.handprint.com/HP/WCL/color6.html), handprint.com.
- Jennings, C. (2016, updated 2021). [Just Six Paints](https://justpaint.org/just-six-paints-the-almost-double-primary-approach-to-a-qor-color-wheel-2/), Golden Artist Colors.
- Sochorová, Š. and Jamriška, O. (2021). [Practical Pigment Mixing for Digital Painting](https://dcgi.fel.cvut.cz/wp-content/wpallimport-dist/publications/pdf/publications-2021-sochorova-tog-pigments-paper.pdf), ACM TOG 40(6), and the [Mixbox repository and licence](https://github.com/scrtwpns/mixbox).
- van Wijnen, R. [spectral.js](https://github.com/rvanwijnen/spectral.js), MIT.
- Burns, S. A. [Generating Reflectance Curves from sRGB Triplets](https://arxiv.org/pdf/1710.05732) and [Subtractive Color Mixture Computation](https://arxiv.org/pdf/1710.06364). His own site could not be opened.
- Curtis, C. J., Anderson, S. E., Seims, J. E., Fleischer, K. W. and Salesin, D. H. (1997). [Computer-Generated Watercolor](https://grail.cs.washington.edu/projects/watercolor/paper_tiny.pdf), SIGGRAPH.
- Hobbs, T. (2017). [A Guide to Simulating Watercolor Paint with Generative Art](https://www.tylerxhobbs.com/words/a-guide-to-simulating-watercolor-paint-with-generative-art).
- Ottosson, B. (2020). A perceptual color space for image processing (OKLab), from what we knew rather than re-read. The CIE 1931 colour matching functions and D65 at twenty nanometres are the standard tables.

Tools, apps and privacy:

- Ruiz, S. [perfect-freehand](https://github.com/steveruizok/perfect-freehand), MIT. Excalidraw [issue 4202 on pen mode](https://github.com/excalidraw/excalidraw/issues/4202). MDN on [coalesced events](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents) and pointer events.
- Procreate, [Brush Studio settings](https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings) and the symmetry guide. Krita, [texture](https://docs.krita.org/en/reference_manual/brushes/brush_settings/texture.html). MyPaint, [brush settings](https://github.com/mypaint/libmypaint/blob/master/brushsettings.json). Codrops (2019) on [feTurbulence](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/), and a [GSAP forum thread](https://gsap.com/community/forums/topic/33075-gsap-and-feturbulence-mobile-performance/) on its cost on iOS.
- Tux Paint, [README](https://tuxpaint.org/docs/en/html/README.html) and [fill.c](https://sourceforge.net/p/tuxpaint/tuxpaint/ci/master/tree/src/fill.c?format=raw) (GPL, read for ideas only). Krita's [gap-closing fill](https://invent.kde.org/graphics/krita/-/merge_requests/2050). MyPaint's [gap-closing demo](https://community.mypaint.app/t/floodfill-gap-closing-demo/1215). Wikipedia on [flood fill](https://en.wikipedia.org/wiki/Flood_fill).
- Pketh, [The Kid Pix Way](https://pketh.org/kid-pix.html), and Wikipedia on [Kid Pix](https://en.wikipedia.org/wiki/Kid_Pix). Common Sense Media on [Sago Mini Doodlecast](https://www.commonsensemedia.org/app-reviews/sago-mini-doodlecast), Doodle Buddy and Crayola Create and Play. Motionographer (2016) on [Toca Boca's design process](https://motionographer.com/2016/04/27/the-design-process-behind-toca-bocas-infectious-apps/).
Children's painting tools and the research on them, read in the second round (a page marked "not
opened" was known only from a search summary):

- Tux Paint. [README](https://tuxpaint.org/docs/en/html/README.html), [the Magic tools](https://tuxpaint.org/docs/en/magic-docs/html/index.html), [OPTIONS](https://tuxpaint.org/docs/en/html/OPTIONS.html), [EXTENDING](https://tuxpaint.org/docs/en/html/EXTENDING.html), and the [0.9.28 release](https://tuxpaint.org/latest/tuxpaint-0.9.28-press-release.php) for the colour mixer and the pipette.
- Kid Pix. Winograd, T. (ed.) (1996), [Bringing Design to Software, the Kid Pix profile](https://hci.stanford.edu/publications/bds/3p-kidpix.html); Siddall, L. (2021), [Kid Pix anniversary](https://wepresent.wetransfer.com/stories/kid-pix-anniversary), WePresent; [slides quoting Hickman's principles](https://slides.com/cubeghost/kidpix/fullscreen); Berlin, D. (2022), [a generative drawing app for kids](https://dianaberlin.com/posts/2022/10/27/request-for-startup-a-generative-drawing-app-for-kids); [Amiga Format and CU Amiga reviews](https://www.amigareviews.leveluphost.com/kidpix.htm) (1993). Hickman's own [Kid Pix: The Early Years](http://red-green-blue.com/kid-pix-the-early-years), not opened.
- Procreate. Handbook pages on [symmetry](https://help.procreate.com/procreate/handbook/guides/guides-symmetry), QuickShape, video and colours, and the [Pocket QuickShape page](https://help.procreate.com/pocket/handbook/guides/quickshape).
- Common Sense Media reviews of [Sago Mini Doodlecast](https://www.commonsensemedia.org/app-reviews/sago-mini-doodlecast), [Sago Mini School](https://www.commonsensemedia.org/app-reviews/sago-mini-school), [Crayola Create and Play](https://www.commonsensemedia.org/app-reviews/crayola-create-and-play), [Artie's Magic Pencil](https://www.commonsensemedia.org/app-reviews/arties-magic-pencil), [Drawing Pad](https://www.commonsensemedia.org/app-reviews/drawing-pad), [Draw and Tell HD](https://www.commonsensemedia.org/app-reviews/draw-and-tell-hd-by-duck-duck-moose) and [Toontastic 3D](https://www.commonsensemedia.org/app-reviews/toontastic-3d). The Toy Insider (2018) on [Crayola's Color Lab](https://thetoyinsider.com/create-and-play-app/).
- Toca Boca. Solomon, A. (2013), [Toca Mini review](https://www.148apps.com/toca-mini/toca-mini-review/), 148Apps; Jeffery, B. (2013), [Being a Toca Builder](https://joanganzcooneycenter.org/2013/11/07/being-a-toca-builder-creating-construction-play-on-touchscreen-devices/), Joan Ganz Cooney Center; Parkin, S. (2013), [How Toca Boca is leading the kid app revolution](https://www.pocketgamer.biz/childs-play-how-toca-boca-is-leading-the-kid-app-revolution/).
- [Tayasui Sketches School](https://apps.apple.com/us/app/tayasui-sketches-school/id1354087061) on the App Store, for its tools and privacy label; the [ScratchJr paint editor guide](https://www.scratchjr.org/pdfs/paint-editor-guide.pdf); [Rebelle](https://www.escapemotions.com/products/rebelle/); [Amaziograph](https://amaziograph.com/); [Seesaw](https://seesaw.com/) and [Artsonia](https://www.artsonia.com/) for cloud portfolios.
- Resnick, M. and Silverman, B. (2005). [Some Reflections on Designing Construction Kits for Kids](https://web.media.mit.edu/~mres/papers/IDC-2005.pdf). Resnick, M. (2007). [All I Really Need to Know (About Creative Thinking) I Learned (By Studying How Children Learn) in Kindergarten](https://web.media.mit.edu/~mres/papers/kindergarten-learning-approach.pdf), pages 1 to 3.
- Hirsh-Pasek, K. et al. (2015). [Putting Education in "Educational" Apps](https://kathyhirshpasek.com/wp-content/uploads/sites/9/2019/06/HirshPasek_ScienceofLearningApps.pdf), Psychological Science in the Public Interest. Pages 1 to 10 and 13 to 16.
- Radesky, J. et al. (2022). [Prevalence and Characteristics of Manipulative Design in Mobile Applications Used by Children](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2793493), JAMA Network Open.
- Danna, J. and Velay, J.-L. (2015). [Basic and supplementary sensory feedback in handwriting](https://www.frontiersin.org/articles/10.3389/fpsyg.2015.00169/full), Frontiers in Psychology.
- Harvard Project Zero. [Making Learning Visible](https://pz.harvard.edu/projects/making-learning-visible).
- Wikipedia on [Tux Paint](https://en.wikipedia.org/wiki/Tux_Paint), [Kid Pix](https://en.wikipedia.org/wiki/Kid_Pix), [tracing](https://en.wikipedia.org/wiki/Tracing_(art)), [child art](https://en.wikipedia.org/wiki/Child_art) and the [cyanotype](https://en.wikipedia.org/wiki/Cyanotype). Wilson, B. and Wilson, M. (1977), An iconoclastic view of the imagery sources in the drawings of young people, Art Education 30(1), and Lowenfeld's book above, for the copying debate, from what we knew rather than read again.

The three artists added in the second round:

- Wikipedia on [Anna Atkins](https://en.wikipedia.org/wiki/Anna_Atkins), for her dates and for Photographs of British Algae, published in parts from October 1843 and considered the first book illustrated with photographic images.
- Wikipedia on [Paul Klee](https://en.wikipedia.org/wiki/Paul_Klee), for his dates and his years at the Bauhaus, and on the [Pedagogical Sketchbook](https://en.wikipedia.org/wiki/Pedagogical_Sketchbook), for the dot that goes for a walk.
- Wikipedia on [William Morris](https://en.wikipedia.org/wiki/William_Morris), for his dates and his first wallpaper, Trellis, in 1862, and the V&A on [William Morris and wallpaper design](https://www.vam.ac.uk/articles/william-morris-and-wallpaper-design), for the hand-cut woodblocks. Neither says how often he used a half-drop, so the lesson teaches the half-drop as a way of laying out a repeat rather than as his.

- FTC. [Complying with COPPA: Frequently Asked Questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), F.5 and D.12. [16 CFR 312.2](https://www.law.cornell.edu/cfr/text/16/312.2). WebKit (2020), [Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/), for the seven-day storage limit.
