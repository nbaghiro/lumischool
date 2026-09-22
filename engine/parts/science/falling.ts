import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { penned, soft } from "../lettering";

/**
 * How many squares each thing falls in one of the drawing's moments, as a model rather than a
 * measurement: the order is the one a child's test finds, the fastest first, and no two are the same.
 */
export const FALL_SPEEDS = {
    stone: 5.5,
    crumpled: 4.2,
    leaf: 3.2,
    flat: 2.4,
    parachute: 1.6,
    feather: 1,
} as const;
type Thing = keyof typeof FALL_SPEEDS;
const THINGS = Object.keys(FALL_SPEEDS) as Thing[];
const isThing = (s: string): s is Thing => s in FALL_SPEEDS;

const NAMES: Record<Thing, { label: string; words: string }> = {
    stone: { label: "stone", words: "a stone" },
    crumpled: { label: "paper ball", words: "a crumpled sheet of paper" },
    leaf: { label: "leaf", words: "a leaf" },
    flat: { label: "flat paper", words: "a flat sheet of paper" },
    parachute: { label: "parachute", words: "a small parachute" },
    feather: { label: "feather", words: "a feather" },
};

const TOP = 3.2 * U;
const GROUND = 14.6 * U;
/** The furthest a thing's middle can fall before it lies on the ground. */
const DROP = GROUND - 1.05 * U - TOP;

/** How far a thing has fallen after `time` moments, in user units, stopping at the ground. */
const fallen = (thing: Thing, time: number): number =>
    Math.min(DROP, FALL_SPEEDS[thing] * Math.max(0, Math.round(time)) * U);

/** A thing's own size: a square and a third, so each reads at question size. */
const S = 1.3 * U;

function drawThing<G>(c: Ctx<G>, thing: Thing, x: number, y: number): void {
    const { pen, g } = c;
    if (thing === "stone") {
        pen.path(
            g,
            `M${x - 0.8 * S} ${y + 0.1 * S}C${x - 0.8 * S} ${y - 0.6 * S} ${x - 0.1 * S} ${y - 0.75 * S} ${x + 0.4 * S} ${y - 0.6 * S}C${x + 0.9 * S} ${y - 0.45 * S} ${x + 0.85 * S} ${y + 0.5 * S} ${x + 0.3 * S} ${y + 0.65 * S}C${x - 0.3 * S} ${y + 0.8 * S} ${x - 0.8 * S} ${y + 0.6 * S} ${x - 0.8 * S} ${y + 0.1 * S}Z`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.7 },
        );
    } else if (thing === "crumpled") {
        pen.path(
            g,
            `M${x - 0.75 * S} ${y}L${x - 0.55 * S} ${y - 0.5 * S}L${x - 0.1 * S} ${y - 0.75 * S}L${x + 0.45 * S} ${y - 0.6 * S}L${x + 0.75 * S} ${y - 0.1 * S}L${x + 0.6 * S} ${y + 0.5 * S}L${x + 0.1 * S} ${y + 0.75 * S}L${x - 0.5 * S} ${y + 0.6 * S}Z`,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.7 },
        );
        pen.path(
            g,
            `M${x - 0.55 * S} ${y - 0.5 * S}L${x - 0.15 * S} ${y - 0.05 * S}L${x + 0.45 * S} ${y - 0.6 * S}M${x - 0.15 * S} ${y - 0.05 * S}L${x + 0.1 * S} ${y + 0.75 * S}M${x - 0.15 * S} ${y - 0.05 * S}L${x - 0.75 * S} ${y}M${x + 0.2 * S} ${y + 0.25 * S}L${x + 0.6 * S} ${y + 0.5 * S}`,
            "ruler",
            null,
            { strokeWidth: 1, stroke: c.t["ink-soft"] },
        );
    } else if (thing === "leaf") {
        pen.path(
            g,
            `M${x - 0.9 * S} ${y + 0.3 * S}C${x - 0.4 * S} ${y - 0.7 * S} ${x + 0.6 * S} ${y - 0.6 * S} ${x + 0.9 * S} ${y - 0.3 * S}C${x + 0.5 * S} ${y + 0.6 * S} ${x - 0.4 * S} ${y + 0.7 * S} ${x - 0.9 * S} ${y + 0.3 * S}Z`,
            "ruler",
            pen.fill("mint", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.6 },
        );
        pen.line(g, x - 0.9 * S, y + 0.3 * S, x + 0.7 * S, y - 0.25 * S, "ruler", {
            strokeWidth: 1,
        });
    } else if (thing === "flat") {
        pen.polygon(
            g,
            [
                [x - 1.1 * S, y - 0.1 * S],
                [x + 0.9 * S, y - 0.35 * S],
                [x + 1.1 * S, y + 0.1 * S],
                [x - 0.9 * S, y + 0.35 * S],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
    } else if (thing === "parachute") {
        pen.path(
            g,
            `M${x - 1 * S} ${y - 0.2 * S}A${1 * S} ${0.8 * S} 0 0 1 ${x + 1 * S} ${y - 0.2 * S}Z`,
            "ruler",
            pen.fill("glow"),
            { strokeWidth: 1.6 },
        );
        pen.path(
            g,
            `M${x - 1 * S} ${y - 0.2 * S}L${x - 0.15 * S} ${y + 0.55 * S}M${x + 1 * S} ${y - 0.2 * S}L${x + 0.15 * S} ${y + 0.55 * S}M${x} ${y - 0.2 * S}V${y + 0.55 * S}`,
            "ruler",
            null,
            { strokeWidth: 0.9 },
        );
        pen.rect(g, x - 0.25 * S, y + 0.55 * S, 0.5 * S, 0.4 * S, "ruler", pen.fill("berry"), {
            strokeWidth: 1.3,
        });
    } else {
        // the feather: a curved quill with its vane either side
        pen.path(
            g,
            `M${x - 0.9 * S} ${y + 0.5 * S}C${x - 0.3 * S} ${y + 0.1 * S} ${x + 0.3 * S} ${y - 0.2 * S} ${x + 0.9 * S} ${y - 0.5 * S}`,
            "ruler",
            null,
            { strokeWidth: 1.4 },
        );
        pen.path(
            g,
            `M${x - 0.6 * S} ${y + 0.35 * S}C${x - 0.5 * S} ${y - 0.3 * S} ${x + 0.3 * S} ${y - 0.75 * S} ${x + 0.9 * S} ${y - 0.5 * S}C${x + 0.7 * S} ${y + 0.1 * S} ${x - 0.1 * S} ${y + 0.45 * S} ${x - 0.6 * S} ${y + 0.35 * S}Z`,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.1 },
        );
    }
}

export const falling = defineDrawing({
    id: "falling",
    family: "science",
    title: "Falling things",
    group: "Structures",
    about: "Two to four things let go together from a branch, one in each column, with a dashed line at the height they started from. At `time` 0 they all hang level under the branch; at 1 and 2 each has fallen by its own fixed speed, so the air's push shows as how far each has come. From fastest to slowest the order is the stone, the crumpled paper ball, the leaf, the flat sheet of paper, the parachute and the feather, and at 2 the stone lies on the ground. Streaks above the stone and the paper ball are the only other sign of speed. With `show` at 0 they wait at the top over a question mark, and `names` writes each thing's name under its column.",
    params: { things: ["stone", "feather"], time: 1, show: 1, names: 1 },
    settings: {
        things: { kind: "words", most: 4, of: THINGS },
        time: { kind: "whole", min: 0, max: 2 },
        show: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A stone and a feather",
            params: { things: ["stone", "feather"], time: 1, show: 1, names: 1 },
        },
        {
            label: "Four things, later",
            params: { things: ["leaf", "stone", "parachute", "flat"], time: 2, show: 1, names: 1 },
        },
        {
            label: "Flat or crumpled, let go",
            params: { things: ["flat", "crumpled"], time: 0, show: 1, names: 1 },
        },
        {
            label: "Which lands first?",
            params: { things: ["feather", "crumpled", "leaf"], time: 1, show: 0, names: 0 },
        },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(4, p.things.length)) * 5 + 2, h: 17 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            list = p.things.slice(0, 4).filter(isThing),
            n = Math.max(1, list.length),
            w = (n * 5 + 2) * U,
            time = p.show > 0 ? p.time : 0;
        // the branch they were let go from, reaching in from the left
        pen.path(
            g,
            `M0 ${1.2 * U}C${0.3 * w} ${1.5 * U} ${0.6 * w} ${1.7 * U} ${w - 0.6 * U} ${1.9 * U}`,
            "pencil",
            null,
            { strokeWidth: 5, stroke: c.t.ink },
        );
        pen.path(
            g,
            `M${0.35 * w} ${1.55 * U}c${0.4 * U} ${-0.9 * U} ${1.2 * U} ${-0.9 * U} ${1.3 * U} ${-0.6 * U}c${-0.3 * U} ${0.5 * U} ${-0.8 * U} ${0.7 * U} ${-1.3 * U} ${0.6 * U}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.2 },
        );
        pen.line(g, 0.4 * U, TOP, w - 0.4 * U, TOP, "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
            strokeLineDash: [6, 5],
        });
        pen.line(g, 0, GROUND, w, GROUND, "pencil", { strokeWidth: 2.2 });
        list.forEach((thing, i) => {
            const x = (1 + 2.5 + i * 5) * U,
                d = fallen(thing, time),
                y = TOP + d;
            if (FALL_SPEEDS[thing] >= 4 && d > 1.5 * U) {
                for (const dx of [-0.4 * U, 0.4 * U])
                    pen.line(
                        g,
                        x + dx,
                        y - 1.2 * U,
                        x + dx,
                        y - 1.2 * U - Math.min(2 * U, d / 2),
                        "pencil",
                        {
                            strokeWidth: 1.2,
                            stroke: c.t["ink-soft"],
                            strokeLineDash: [5, 5],
                        },
                    );
            }
            drawThing(c, thing, x, y);
            if (p.names > 0) soft(c, x, GROUND + 1.3 * U, NAMES[thing].label, 12);
            a[`thing(${i})`] = [x, y - 1.05 * U, "up"];
        });
        if (p.show <= 0) penned(c, w / 2, GROUND - 1.2 * U, "?", 30);
        a.branch = [w / 2, 1.6 * U, "up"];
        a.ground = [w / 2, GROUND, "down"];
        return a;
    },
    describe: (p) => {
        const words = p.things
            .slice(0, 4)
            .filter(isThing)
            .map((t) => NAMES[t].words);
        const last = words.pop();
        const list = words.length ? `${words.join(", ")} and ${last}` : (last ?? "nothing");
        return `Things let go together from a branch above the ground, one in each column: ${list}.`;
    },
    reads: true,
});
