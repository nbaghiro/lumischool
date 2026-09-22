import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { LIMITS, movesOf } from "../../motion/animation";
import { U } from "../../paper";
import { VOICE_NAMES } from "../../sound/voices";
import { FAMILIES, isInstrument, motionOf } from "../drawing";
import { LINES, catalogued, drawn, everyMark, partsIn } from "./check";

const PARTS = new URL("..", import.meta.url);

/**
 * Files in a family's folder that are construction several drawings share rather than drawings,
 * each with the reason, so the catalogue does not list them. A helper one drawing uses stays in
 * that drawing's file; one that drawings of two families share goes in the folder of the family
 * that uses it most.
 */
const SHARED: Readonly<Record<string, string>> = {
    "imported/files":
        "The hand-drawn files in content/art/, compiled by tools/scripts/art.ts, which the imported drawings draw.",
    "imported/hand":
        "How a hand-drawn file is read, sized and drawn, facing either way: an SVG file as it is written, an Excalidraw scene by the pen and a stroke file from the drawing pad.",
    "people/figure":
        "The figure's construction (build, head, hair, face, hands, arms, legs, aids) and placePerson, which person, umbrellas and the runners draw with.",
    "guide/design":
        "The guide designs' contract (the poses, a design's context and anchors) and guideDrawing, which puts a design on the shelf.",
    "guide/kit":
        "The guides' shared construction: the pen that keeps its weight when scaled, the geometry of aiming, inked strokes, eyes, mouths and the marks round a character.",
    "stories/pictures":
        "The small pictures the stories draw with: the reading cast, the icons a story map and a stamp carry, the pictures a child pins up and their caption lines, which the animals and the places draw with too.",
    "animals/nature":
        "The hand the nature drawings share: a ring through points, lumps round an ellipse, a blade, a point along a direction, a clamp, an eye, a tapered stroke, a spline and a halo, which the animals, the outdoors and the bird hide draw with.",
    "travel/yard":
        "The yard the shunting game is played in: a carriage's length, where its rail is, how far the siding sits below the main line, and the wheels and coupling bar the carriage and the engine share.",
    "sport/dice":
        "The dice game's hand: the faces a die shows on top as it rolls, the pips, a rounded rectangle, a die drawn part way through a roll and a hinged number standing on its hinge, which the die, the number tile and the shut-the-box draw with.",
    "outdoors/wash":
        "A marker's wash over the squared paper, no stronger than a world's, and a number fixed by two whole numbers so a scatter over lengths that meet is the same where they meet, which the meadow, the sea and the sheep pen draw with.",
    "puzzles/dots":
        "The join-the-dots layout: the pictures, the box they are drawn in, a count's labels and where each dot and decoy stands, which the drawing and a round in a world's sky in the scratchpad's game lay out with.",
    "counting/numonfill":
        "A number written on a fill, with the white patch it gets on paper so no hatching crosses it, which the bar model and the number bond write with.",
    "counting/sign":
        "A greater-than, less-than or equals sign drawn as strokes, which the pair and the chain of signs draw.",
    "place/columns":
        "The columns of place value: their names, the short names, the colour each place is coded in, and the columns a written value needs, which the chart, the abacus, the arrow cards and the digit's worth draw with.",
    "fractions/bar":
        "The bar every fraction drawing is built on, twelve squares long, and the colour each row takes.",
    "money/price":
        "A value in cents written as a price is, and a written amount read back into cents, which the tag, the receipt, the shelf and the change line write with.",
    "sums/hopper":
        "The function machine's parts, the arrow that feeds it and the hopper with the rule on it, which the machine and the chain of two draw.",
    "sums/blank":
        "A blank the child fills in with the answer in pen when the key is on, and the pen it is written with at the size these sums write, which the pyramid, the bus stop and the area grid draw with.",
    "time/spans":
        "The names of the days, a time read into minutes and a span of minutes written as hours and minutes, which the calendar, the day strip, the schedule and the elapsed line share.",
    "science/wiring":
        "The parts a circuit is built from: cells on a run of wire, a switch, the glass of a bulb and the rays round a lit one, a crocodile clip and the everyday things held across a gap, which the circuit, the series circuit, the conductor tester and the things to test draw with.",
    "science/push":
        "A force arrow straight down onto a point with its size written beside it, which the lever, the pulleys and the wheel and axle draw the push with.",
    "science/optics":
        "What the light drawings share: a ray with its arrow, a flat mirror, a torch, an eye seen from the side and a child's head in profile, which the mirror maze, the periscope, the torch through a sheet and how we see draw with.",
    "science/sound":
        "Rings of sound spreading from a point, more of them for a louder sound, which the stretched bands and the drum with rice on it draw with.",
    "science/substances":
        "The tables the chemistry drawings are drawn from and the chemistry checker marks by: what things are made of, what a change does, what a rock does, the fossil and water cycle steps, what a mixture holds, the indicator's bands, ice and rust rates, the molecules and the safety kit.",
    "science/apparatus":
        "The chemistry drawings' hand: the liquid in a glass and the glass round it, its gleam, a bubble, a paint-box fill, a lettered tag, a crystal, an ice cube, steam, a nail, a candle, the pieces of a mixture and an atom as a ball, which the beakers, jars, tubes and the pictures of a change share.",
    "letters/glyphs":
        "A letter set large at a point, the cell a letter of a word takes, and where each letter of a word sits, which the letter cards, the sound buttons, the sound boxes, the syllable arcs and the alphabet line draw with.",
    "letters/pairs":
        "A ruled box for the number a child writes, with the answer in pen when the key is on, and the width in squares of a run of text, which put in order and match the pairs draw with.",
    "stories/rows":
        "Prose broken into rows of at most so many characters, which the instructions and the postcard set their text with.",
    "writing/lines":
        "A ruled line to write on, with what is written on it in pen when there is, and prose wrapped to a width, which the story mountain, the pictures of the steps, the acrostic, the caption strip, the growing sentence, the letter and the list share.",
    "coding/listing":
        "The hand a program is drawn with: a line of code in the mono face, the kind of each block and its colour, the icons on the blocks, a bug, an oval number, the words of a block and their widths, and the block's body and label, which the blocks, the tray, the listing, the code pad, the pixels, the variable and the dance draw with.",
    "coding/grid":
        "The grid a robot or a turtle walks and where its squares are, the group a drawing is made facing right and turned to its heading in, the burst where a robot bumps, and the cast that stands on the stage, which the maze, the turtle, the stage and the dance draw with and the runner animates.",
    "coding/setup":
        "What a coding item runs: the program, the world and the event a drawing's settings name, built the same way for the drawing, the checker and the runner, so the three cannot disagree.",
    "music/clefs":
        "The staff's hand: the space between its lines, notes read from their names, the treble and bass clefs and the sharp sign, which the staff and the grand staff draw with.",
    "music/fretting":
        "The fretted instruments' hand: a finger's colour, the tunings and chords a setting may name, a chord shape for a tuning, the dots, crosses and rings over the strings, the chord box's frame and size, a note's name and the stack of places a tab entry holds, which the fretboard, the chord box, the chord change, the strum track, the tab and the lane draw with.",
    "music/luthier":
        "The wood and the strings: a tint, a string's gauge, two colours mixed, the woods a fill is cut from, a rosette round a sound hole and a string at its thickness, which the fretboard, the lane, the guitar and the ukulele draw with.",
    "music/whole":
        "A whole instrument stood up facing you, drawn from its plan: the guitar's and the ukulele's shapes, a fret's place, the body's outline and the drawing itself, which the guitar and the ukulele share.",
    "art/kit":
        "The painting drawings' hand and what the easel and the art checker read: the print blocks' shapes and the motif drawn from one, the shine on wet paint and a puddle of it, the tools' kinds, a tint ladder's recipe, the paint sheet's guides and printed lines, the mirror halves, the one-line figures and the cut-paper pictures.",
    "guide/firefly":
        "The redrawn firefly design, which the worlds and the pages draw through engine/ui/guide.ts; its place on the shelf is held by the placeholder guide.firefly until one is retired.",
};

test("an instrument's keys lie inside its box, and its voice is a name the sounder has", async () => {
    for (const d of await catalogued()) {
        if (!isInstrument(d)) continue;
        assert.ok(
            (VOICE_NAMES as readonly string[]).includes(d.voice),
            `${d.id} plays with "${d.voice}", which is not a voice`,
        );
        for (const take of d.takes) {
            const box = d.box(take.params);
            for (const k of d.keys(take.params)) {
                const inside =
                    k.hit.x >= 0 &&
                    k.hit.y >= 0 &&
                    k.hit.x + k.hit.w <= box.w * U &&
                    k.hit.y + k.hit.h <= box.h * U;
                assert.ok(
                    inside,
                    `${d.id} "${take.label}": key ${k.id} lies outside ${box.w} by ${box.h}`,
                );
            }
        }
    }
});

// a hand-drawn file's drawing is in imported/, named by its id, and listed under the family it declares
const HAND_DRAWN = /^(?:svg|excalidraw|strokes)\./;

test("the catalogue lists every drawing file once, under its family and its id, in the families' order", async () => {
    const listed = Object.entries(LINES).flatMap(([family, lines]) =>
        Object.keys(lines ?? {}).map((id) =>
            HAND_DRAWN.test(id) ? `imported/${id}` : `${family}/${id}`,
        ),
    );
    const files = readdirSync(PARTS, { withFileTypes: true })
        .filter(
            (e) => e.isDirectory() && (e.name === "imported" || FAMILIES.some((f) => f === e.name)),
        )
        .flatMap((dir) =>
            readdirSync(new URL(`${dir.name}/`, PARTS))
                .filter((f) => f.endsWith(".ts"))
                .map((f) => `${dir.name}/${f.slice(0, -3)}`),
        )
        .filter((f) => !(f in SHARED));
    assert.deepEqual([...listed].sort(), [...files].sort());
    const order = Object.keys(LINES);
    assert.deepEqual(
        order,
        FAMILIES.filter((f) => order.includes(f)),
    );
    for (const [family, lines] of Object.entries(LINES)) {
        for (const [id, load] of Object.entries(lines ?? {})) {
            const d = await load();
            assert.equal(d.id, id, `${family}/${id}.ts draws "${d.id}"`);
            assert.equal(d.family, family, `${id} says it is in "${d.family}"`);
        }
    }
});

test("every drawing shows a range of takes, each labelled once and in whole squares on a page", async () => {
    for (const d of await catalogued()) {
        assert.ok(
            d.takes.length >= 2,
            `${d.id} shows ${d.takes.length} take(s): the shelf shows a range`,
        );
        const labels = d.takes.map((t) => t.label);
        assert.deepEqual([...new Set(labels)], labels, `${d.id} repeats a take label`);
        for (const take of d.takes) {
            const box = d.box(take.params);
            for (const [side, most] of [
                ["w", 36],
                ["h", 46],
            ] as const) {
                const n = box[side];
                assert.ok(
                    Number.isInteger(n) && n > 0 && n <= most,
                    `${d.id} "${take.label}": ${side} is ${n}`,
                );
            }
        }
    }
});

test("every drawing moves by its declaration or its family's within the limits, or is still for a reason", async () => {
    for (const d of await catalogued()) {
        const m = motionOf(d);
        if (m.still !== null) {
            assert.ok(m.still.length > 20, `${d.id} is still with no reason`);
            continue;
        }
        for (const move of movesOf(m.anim)) {
            if (!move.units)
                assert.ok((move.deg ?? 0) <= LIMITS.bodyDeg, `${d.id} turns ${move.deg} degrees`);
        }
        for (const [name, move] of Object.entries(m.anim.parts ?? {})) {
            assert.ok(
                (move.deg ?? 0) <= LIMITS.partDeg,
                `${d.id}'s ${name} turns ${move.deg} degrees`,
            );
        }
    }
});

test("a part a declaration moves is drawn on screen, and nothing is a part on paper", async () => {
    for (const d of await catalogued()) {
        const coded = Object.entries(motionOf(d).anim.parts ?? {}).filter(
            ([, p]) => !p.of && !p.pick,
        );
        const onScreen = new Set(
            d.takes.flatMap((t) => partsIn(drawn(d, t.params, { paper: false }).marks)),
        );
        for (const [name] of coded)
            assert.ok(onScreen.has(name), `${d.id} declares "${name}" and never draws it`);
        for (const t of d.takes) {
            assert.deepEqual(
                partsIn(drawn(d, t.params, { paper: true }).marks),
                [],
                `${d.id} "${t.label}" on paper`,
            );
        }
    }
});

test("one seed draws the same marks every time, and another seed draws others", async () => {
    for (const d of await catalogued()) {
        const take = d.takes[0];
        if (!take) continue;
        for (const paper of [false, true]) {
            const a: ReturnType<typeof drawn> = drawn(d, take.params, { paper, seed: 9 });
            assert.deepEqual(drawn(d, take.params, { paper, seed: 9 }), a, d.id);
            // a drawing that is all lettering in its first take (the dynamics marks) has nothing the seed can move,
            // and a hand-drawn file is drawn as it was drawn: an SVG file as the file writes it, and an
            // Excalidraw scene on each element's own seed, so the page's seed moves neither
            if (d.group === "Imported") continue;
            if (![...everyMark(a.marks)].some(({ mark }) => mark.kind === "shape")) continue;
            assert.notDeepEqual(drawn(d, take.params, { paper, seed: 10 }).marks, a.marks, d.id);
        }
    }
});
