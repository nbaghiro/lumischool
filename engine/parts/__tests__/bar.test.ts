import assert from "node:assert/strict";
import { test } from "node:test";
import { PRINT, SKIN, U } from "../../paper";
import { READING_WORDS } from "../drawing";
import { catalogued, coloursIn, drawn, isRecord, letteringIn, reachOf } from "./check";

const SMALL = "It writes text under 11 units, which prints under 8 point.";
const PERSON =
    "It draws a person with a helper of its own rather than the kit's figure, so it reads as a placeholder.";
const INK =
    "In ink its glow dots and tang cross-hatch sit on its stripes and spots, and it prints as dark texture.";
const HATCHED =
    "Scribbled hatching stands in for a shape, so it has no clean silhouette and turns grey on paper.";

/**
 * The drawings below the bar in .docs/shelf.md. Each moves as it is and is redrawn later as a change
 * of its own. A flag lets it off the rule this suite would hold it to, and its line goes when it is
 * redrawn; a new drawing never gets one.
 */
const BELOW: Readonly<Record<string, { why: string; lettering?: true; ink?: true }>> = {
    heads: { why: PERSON },
    children: { why: PERSON },
    face: { why: `${PERSON} Its feelings are on a smiley, with no skin or hair.` },
    skater: { why: PERSON },
    periscope: { why: `${PERSON} It shares the profile head in science/optics.ts with seeing.` },
    seeing: { why: `${PERSON} It shares the profile head in science/optics.ts with periscope.` },
    protractor: { why: `${SMALL} Its inner scale is the worst case.`, lettering: true },
    money: { why: SMALL, lettering: true },
    postmark: { why: SMALL, lettering: true },
    howto: { why: SMALL, lettering: true },
    newbook: {
        why: `${SMALL} The caps on its label, Name and Belongs to, are 8 to 8.5 units; it was built as the kit's proof before the rule was written.`,
        lettering: true,
    },
    contents: { why: SMALL, lettering: true },
    lane: { why: SMALL, lettering: true },
    prism: { why: SMALL, lettering: true },
    beam: { why: SMALL, lettering: true },
    bands: { why: SMALL, lettering: true },
    globe: { why: SMALL, lettering: true },
    parachute: { why: SMALL, lettering: true },
    wrapped: { why: SMALL, lettering: true },
    cabbage: { why: SMALL, lettering: true },
    variable: { why: SMALL, lettering: true },
    longjump: { why: SMALL, lettering: true },
    weatherstation: { why: SMALL, lettering: true },
    boat: { why: SMALL, lettering: true },
    seesaw: { why: SMALL, lettering: true },
    sundial: { why: SMALL, lettering: true },
    picsteps: { why: SMALL, lettering: true },
    stamps: { why: SMALL, lettering: true },
    rubbing: { why: SMALL, lettering: true },
    stencil: { why: SMALL, lettering: true },
    sunprint: { why: SMALL, lettering: true },
    colourwheel: { why: `${SMALL} Its warm and cool labels are 10 units.`, lettering: true },
    mirrorpick: { why: `${SMALL} The block's name under its print is 10 units.`, lettering: true },
    cake: {
        why: "A plain slab with candles, weaker than the cake on the hand-drawn birthday table.",
    },
    animals: {
        why: "Its sheep are faceted blobs that read as rocks, with heads that do not join their bodies.",
    },
    tablet: {
        why: "A monitor on a stand, so it reads as a desktop computer rather than a tablet.",
    },
    postcard: { why: "Its copy for a child carries exclamation marks." },
    comic: { why: "Its copy for a child carries exclamation marks." },
    "arcade.road": { why: "A game piece that reads as a diagram on a shelf of pictures." },
    "arcade.ground": { why: "A game piece that reads as a diagram on a shelf of pictures." },
    fox: { why: INK },
    seaturtle: { why: INK },
    fennec: { why: INK },
    bumblebee: { why: INK },
    mice: { why: "Too small to read at question size: the mouse is a smudge with a tail." },
    moon: {
        why: "A dashed half circle that reads as a diagram of a phase rather than as the moon.",
    },
    eagle: {
        why: "Heavy, stiff outlines and legs that do not carry the body, and nearly black on paper.",
    },
    camel: {
        why: "Heavy, stiff outlines and legs that do not carry the body, and nearly black on paper.",
    },
    volcano: { why: "A flat grey triangle with two orange stripes." },
    cloud: { why: "A flat bumpy slab, and one of four ways the shelf draws a cloud." },
    frogcycle: { why: "Its stages are too small to read at question size." },
    crops: { why: "Its plants are too small to read at question size." },
    sledge: { why: "Thin and faint beside the other vehicles." },
    dolphins: { why: HATCHED },
    geese: { why: HATCHED },
    seal: { why: HATCHED },
    manta: { why: "Abstract, and not recognisable without its title." },
    glowworms: { why: "Abstract, and not recognisable without its title." },
    arttools: { why: "It prints a pencil's wood colour on the ink-only sheet.", ink: true },
    "strokes.bunting": { why: "Pressure strokes at three to four times the shelf's weight." },
    "strokes.hills": { why: "Pressure strokes at three to four times the shelf's weight." },
    "strokes.sun": { why: "Pressure strokes at three to four times the shelf's weight." },
    "guide.dot": {
        why: "Its pupils and shut eyes print in a near-black of their own (#1A1A1A) rather than the ink token, kept so its face never inverts with a theme.",
        ink: true,
    },
};

const GUIDE =
    "Its marks (sparkles, thought dots, a beam, speed lines) sit round its box, which the frame a page draws a guide in leaves room for.";

/** Drawings that reach past their box on purpose, and why. */
const REACHES: Readonly<Record<string, string>> = {
    bubble: "Its tail points past its box at the speaker a scene places beside it.",
    "guide.firefly": "Its halo and antennae reach past its box, as the marks round every guide do.",
    "guide.bird": GUIDE,
    "guide.dot": GUIDE,
    "guide.glow": GUIDE,
    "guide.hand":
        "Its cuff sits on the box's edge, and its marks sit round the box, as every guide's do.",
    "guide.snail": GUIDE,
    "guide.stub": GUIDE,
    badger: "Its rump sits on the box's edge, and the pencil's wobble takes it a few units past.",
    hedge: "Its end clumps bulge past the box's sides, as a hedge overhangs the edge of its field.",
    log: "The leaves it lies in spread a little below the box's floor.",
    saltlake: "After rain, the ripples at its front run a little below the box's floor.",
    treeplatform:
        "Its crown of big leaves spreads past the box's top and left edge, as a forest tree's does.",
    basket: "Filled to the brim, what it holds rises a little above the box's top.",
    boxes: "Its flaps fold out past the box's sides, as an open box's do.",
    well: "The curve of its wall's foot dips a little below the box's floor.",
    dolphins: "The last crest of its wave line runs a few units past the box's right edge.",
    fox: "Facing left, the white tip of its brush reaches a few units past the box's edge.",
    geese: "In a V of nine, the top goose's raised wing tip rises past the box's top.",
    glowworms: "The outermost threads and lights hang a few units past the box's sides.",
    heron: "Facing right, the tip of its beak reaches a few units past the box's edge.",
    coral: "The sea fans and the branching coral's tips reach past the box's right edge.",
    crystals: "The halo round a lit crystal at the edge spreads a few units past the box's sides.",
    dandelion: "Blowing away, the farthest seed's parachute reaches past the box's right edge.",
    frogcycle: "Named and in a row, the stages' names sit a little below the box's floor.",
    oasis: "The tallest palm's fronds rise past the box's top, as they were drawn.",
    rainbow: "Its outer band and the clouds at its feet spread a few units past the box's edges.",
    stalactites:
        "The lumpy roof and floor rock, and the columns, run a few units past the box's edges.",
    cloud: "Raining, the last drops fall a few units below the box's floor.",
    paperplane: "Banking, the raised wing's tip rises a few units past the box's top.",
    beadstring:
        "The number under its cut, and the last bead's edge, sit a few units below the box's floor.",
    fan: "The outermost cards of the spread reach a few units past the box's sides.",
    balance: "The pans swing a few units past the box's sides, as the beam was drawn.",
    terms: "The count written under each term sits a few units below the box's floor.",
    stickers:
        "Its box is sized for the words Well done, so a longer word's label runs past the box's right edge.",
    choice: "The loop round the chosen card reaches a few units past the box's top and bottom.",
    construction: "The perpendicular bisector's arcs reach a few units below the box's floor.",
    coords: "With four quadrants, the axis labels at the left run a few units past the box's edge.",
    plotpoint:
        "With four quadrants, the axis labels at the left run a few units past the box's edge.",
    circuit: "The rays of the lit bulb on the top run reach a few units above the box's top.",
    globe: "The sun's edge at the left runs a few units past the box's edge, as it was drawn.",
    planets: "The sun's edge at the left runs a few units past the box's edge, as it was drawn.",
    ramp: "On paper, the height's patch at the slope's back runs a few units past the box's edge.",
    ricedrum:
        "The drum's base sits a few units below the box's floor, and a hard hit throws rice above its top.",
    series: "A motor at the end of the loop, and its label, run a few units past the box's edge.",
    passage:
        "With a title, the longest line of the prose runs a few units past the box's right edge.",
    blocks: "The ring round the block running now reaches a few units past the box's left edge.",
    sortcards: "The ring round the pair being compared dips a few units below the box's floor.",
    drum: "The tips of the two sticks resting on top reach a few units below the box's floor.",
    fretboard:
        "The neck's art is drawn to its full length and clipped at the box, so the pegs and the body reach past its edges under the clip.",
    hand: "The tip of the thumb, and the number over it, rise a few units past the box's top.",
    "strokes.hedgehog":
        "The pen strokes of its spines and its feet run a few units below the box's floor, as it was drawn.",
    "strokes.hills":
        "The wash of the hills runs a few units past the box's sides, as it was drawn.",
    handdrum: "The rope lacing round the shell runs a few units past the box's edges.",
    swimmingrabbit: "The tips of its ears rise a few units past the box's top, as it was drawn.",
    "arcade.ground":
        "Its hatched earth and the last tuft of grass run a few units past the box's right edge and floor, as it was drawn.",
    "arcade.road":
        "The numbers at either end of its number line are written past the box's sides, since a length of road carries on into the next.",
    sea: "On paper the hatching of its wash runs a few units past the box's right edge and floor.",
    railway:
        "The hatching of its ballast and its grass runs a few units past the box's right edge and floor.",
    rowboat: "With its oars in the water, the near blade dips a few units below the box's floor.",
    die: "Turned on the table or tipping over an edge, its corners and the shadow under it reach past the box's edges.",
    racecar: "Its arrow is as long as its speed, so it runs past the box into the cells ahead.",
    joindots: "The numbers written beside its outermost dots sit a few units past the box's edges.",
    scalepole: "On paper the patch under a label at its left runs a few units past the box's edge.",
    arttools: "Standing in a jar, the tools lean past the box's right edge, as they were drawn.",
    palette:
        "The palette's right edge sits on the box's edge, and the pencil's wobble takes it a unit past.",
    rubbing:
        "The first leaf's bulge reaches a few units past the box's left edge, as it was drawn.",
    sunprint:
        "The lowest leaflets of the first fern reach a few units past the box's left edge, as it was drawn.",
    flask: "With the biggest balloon on its neck, the pen's curve over the balloon's top rises a few units past the box's top.",
    fossilsteps:
        "On paper, the pen's wobble on the last panel's frame runs a unit past the box's right edge.",
    mixture: "Named, the caption for three things in water runs a few units past the box's sides.",
    nails: "The streak of light along a new nail is drawn on the nail's own axis and turned with it, so on the first day it runs a few units past the box's left edge.",
    safety: "The apron's neck strap curves a few units above the box's top.",
    watercycle:
        "In plain words, the key's longest line runs a few units past the box's right edge.",
};

// the print greys a stroke with pressure is drawn in, the tape's, and the flat grey a skin tone prints as
const PRINTS = new Set([
    ...Object.values(PRINT),
    ...SKIN.map((t) => t.print),
    "none",
    "",
    "#D6D6D6",
    "#C8C8C8",
    "#E6E6E6",
]);

test("every take stays inside its box, and prints in ink unless its drawing is listed for it", async () => {
    for (const d of await catalogued()) {
        let out = false;
        for (const take of d.takes) {
            const box = d.box(take.params);
            for (const paper of [false, true]) {
                const { marks } = drawn(d, take.params, { paper });
                const r = reachOf(marks);
                // rough.js's wobble may leave a shape by a unit or two; a square is twenty
                const slack = 3;
                const inside =
                    r.x0 >= -slack &&
                    r.y0 >= -slack &&
                    r.x1 <= box.w * U + slack &&
                    r.y1 <= box.h * U + slack;
                const at = `${d.id} "${take.label}"${paper ? " on paper" : ""}`;
                if (d.id in REACHES) out ||= !inside;
                else {
                    assert.ok(
                        inside,
                        `${at} reaches ${JSON.stringify(r)} outside ${box.w} by ${box.h}`,
                    );
                }
                if (paper && !BELOW[d.id]?.ink) {
                    assert.deepEqual(
                        [...coloursIn(marks)].filter((c) => !PRINTS.has(c)),
                        [],
                        `${at} prints a colour`,
                    );
                }
            }
        }
        if (d.id in REACHES) assert.ok(out, `${d.id} stays in its box, so its REACHES line goes`);
    }
});

test("no lettering is under 11 units unless its drawing is listed for it, and a listed drawing still has some", async () => {
    for (const d of await catalogued()) {
        const small = d.takes.some((t) =>
            [false, true].some((paper) =>
                letteringIn(drawn(d, t.params, { paper }).marks).some((l) => l.size < 11),
            ),
        );
        const listed = BELOW[d.id]?.lettering === true;
        assert.equal(
            small,
            listed,
            listed
                ? `${d.id} has been redrawn, so its BELOW line goes`
                : `${d.id} letters under 11 units`,
        );
    }
});

test("every drawing describes itself in 15 to 30 plain words, or is hidden beside its word", async () => {
    for (const d of await catalogued()) {
        for (const take of d.takes) {
            const said = d.describe(take.params);
            if (said === null) continue;
            const words = said.split(/\s+/).length;
            assert.ok(
                words >= 15 && words <= 30,
                `${d.id} "${take.label}" says ${words} words: ${said}`,
            );
            assert.doesNotMatch(said, /[—!]/, `${d.id} "${take.label}": ${said}`);
        }
    }
});

/** Values a lesson may give a setting other than `now`, read off its declaration. */
function othersFor(setting: unknown, now: unknown): unknown[] {
    if (!isRecord(setting)) return [];
    const { kind, min, max, of } = setting;
    if (kind === "flag") return [now !== true];
    if (
        (kind === "whole" || kind === "number") &&
        typeof min === "number" &&
        typeof max === "number"
    ) {
        return [min, max].filter((v) => v !== now);
    }
    if (kind === "one of" && Array.isArray(of)) return (of as unknown[]).filter((v) => v !== now);
    return [];
}

test("a description says the same whatever a setting that holds a reading is set to", async () => {
    for (const d of await catalogued()) {
        const { settings } = d;
        if (!isRecord(settings)) continue;
        for (const take of d.takes) {
            const params = take.params;
            if (!isRecord(params)) continue;
            const said = d.describe(params);
            for (const [name, setting] of Object.entries(settings)) {
                if (!READING_WORDS.includes(name)) continue;
                for (const other of othersFor(setting, params[name])) {
                    assert.equal(
                        d.describe({ ...params, [name]: other }),
                        said,
                        `${d.id} "${take.label}" says its ${name} when it is ${String(other)}`,
                    );
                }
            }
        }
    }
});
