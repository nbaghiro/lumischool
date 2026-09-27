import { type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

export const MARBLE_PARTS = [
    "chute",
    "ramp",
    "bouncer",
    "funnel",
    "seesaw",
    "stand",
    "cup",
    "marble",
    "wall",
    "peg",
    "splitter",
    "flap",
    "bucket",
] as const;
export type MarblePart = (typeof MARBLE_PARTS)[number];

interface MarbleRunParams {
    part: MarblePart;
    w: number;
    h: number;
    label: string;
    colour: Marker;
}

/** Each part's box in squares; a game lays a part's middle where its body's middle is. */
export function marbleBox(p: Pick<MarbleRunParams, "part" | "w" | "h">): { w: number; h: number } {
    switch (p.part) {
        case "chute":
            return { w: 3, h: 3 };
        case "ramp":
        case "seesaw":
            return { w: whole(p.w, 2, 16, 6), h: 1 };
        case "bouncer":
            return { w: 3, h: 1 };
        case "funnel":
            return { w: 4, h: 2 };
        case "stand":
            return { w: 2, h: 2 };
        case "cup":
            return { w: whole(p.w, 2, 8, 4), h: 3 };
        case "marble":
        case "peg":
            return { w: 1, h: 1 };
        case "wall":
            return { w: whole(p.w, 1, 16, 1), h: whole(p.h, 1, 12, 4) };
        case "splitter":
            return { w: 3, h: 2 };
        case "flap":
            return { w: 2, h: 1 };
        case "bucket":
            return { w: 3, h: 3 };
    }
}

/** A number on a white tag, so print's hatching never crosses it. */
function tag<G>(c: Ctx<G>, x: number, y: number, text: string): void {
    if (!text) return;
    const w = Math.max(18, text.length * 9 + 10);
    c.pen.rect(c.g, x - w / 2, y - 9, w, 17, "ruler", c.pen.fill("card"), {
        strokeWidth: 1.1,
        disableMultiStroke: true,
        preserveVertices: true,
    });
    patch(c, x, y - 1, w, 17);
    num(c, x, y + 5, text, 14);
}

export const marbleRun = defineDrawing<MarbleRunParams>({
    id: "marblerun",
    family: "science",
    title: "Marble run parts",
    group: "Props",
    about: "The parts of a marble run a child builds on a workbench: a hopper that drops a numbered batch of marbles, wooden ramps, a springy bouncer, a funnel, a see-saw on its stand, a splitter with a flap that sends every other marble the other way, a bucket that tips out a handful at a time, pegs and blocks to get round, cups at the bottom with the number each one wants, and the marbles themselves.",
    params: { part: "ramp", w: 6, h: 1, label: "", colour: "sky" },
    settings: {
        part: { kind: "one of", of: MARBLE_PARTS },
        w: { kind: "whole", min: 1, max: 16 },
        h: { kind: "whole", min: 1, max: 12 },
        label: { kind: "text", most: 4 },
        colour: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "A hopper of five",
            params: { part: "chute", w: 3, h: 3, label: "5", colour: "sky" },
        },
        { label: "A long ramp", params: { part: "ramp", w: 9, h: 1, label: "", colour: "sky" } },
        { label: "A bouncer", params: { part: "bouncer", w: 3, h: 1, label: "", colour: "berry" } },
        { label: "A funnel", params: { part: "funnel", w: 4, h: 2, label: "", colour: "sky" } },
        { label: "A see-saw", params: { part: "seesaw", w: 5, h: 1, label: "", colour: "sky" } },
        { label: "Its stand", params: { part: "stand", w: 2, h: 2, label: "", colour: "sky" } },
        {
            label: "A cup that wants eight",
            params: { part: "cup", w: 4, h: 3, label: "8", colour: "tang" },
        },
        {
            label: "A green marble",
            params: { part: "marble", w: 1, h: 1, label: "", colour: "mint" },
        },
        { label: "A block", params: { part: "wall", w: 2, h: 5, label: "", colour: "sky" } },
        { label: "A peg", params: { part: "peg", w: 1, h: 1, label: "", colour: "sky" } },
        {
            label: "A splitter",
            params: { part: "splitter", w: 3, h: 2, label: "", colour: "sky" },
        },
        { label: "Its flap", params: { part: "flap", w: 2, h: 1, label: "", colour: "tang" } },
        {
            label: "A bucket that tips at five",
            params: { part: "bucket", w: 3, h: 3, label: "5", colour: "sky" },
        },
    ],
    box: marbleBox,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            box = marbleBox(p),
            w = box.w * U,
            h = box.h * U;
        const wood = pen.fill("tang", "hachure", {
            hachureGap: 4.5,
            hachureAngle: 90,
            fillWeight: 0.6,
        });
        switch (p.part) {
            case "chute": {
                pen.path(
                    g,
                    `M${0.1 * U} ${0.2 * U}H${w - 0.1 * U}L${w * 0.62} ${h - 0.6 * U}V${h - 0.1 * U}H${w * 0.38}V${h - 0.6 * U}Z`,
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1.8),
                );
                for (const [dx, dy] of [
                    [-0.55, 0.75],
                    [0, 0.7],
                    [0.55, 0.75],
                    [-0.25, 1.15],
                    [0.25, 1.15],
                ] as const)
                    pen.circle(g, w / 2 + dx * U, dy * U, 0.5 * U, "ruler", pen.fill(p.colour), {
                        strokeWidth: 0.9,
                        disableMultiStroke: true,
                    });
                tag(c, w / 2, 1.85 * U, p.label);
                return { out: [w / 2, h, "down"] };
            }
            case "ramp":
                pen.rect(g, 1, 0.3 * U, w - 2, 0.4 * U, "ruler", wood, calm(c, 1.6));
                pen.line(g, 2, 0.28 * U, w - 2, 0.28 * U, "ruler", calm(c, 1.1));
                return { left: [0, h / 2, "left"], right: [w, h / 2, "right"] };
            case "seesaw":
                pen.rect(g, 1, 0.3 * U, w - 2, 0.4 * U, "ruler", pen.fill(p.colour), calm(c, 1.6));
                pen.circle(g, w / 2, h / 2, 0.35 * U, "ruler", pen.fill("card"), calm(c, 1.1));
                return { pivot: [w / 2, h / 2, "down"] };
            case "bouncer":
                pen.rect(g, 1, 0.1 * U, w - 2, 0.35 * U, "ruler", pen.fill(p.colour), calm(c, 1.6));
                for (let k = 0; k < 4; k++) {
                    const x = 0.5 * U + (k * (w - U)) / 3;
                    pen.path(
                        g,
                        `M${x} ${0.45 * U}l${0.18 * U} ${0.12 * U}l${-0.36 * U} ${0.12 * U}l${0.36 * U} ${0.12 * U}l${-0.18 * U} ${0.12 * U}`,
                        "ruler",
                        null,
                        { strokeWidth: 1, disableMultiStroke: true },
                    );
                }
                pen.rect(g, 1, 0.92 * U, w - 2, 0.06 * U, "ruler", null, { strokeWidth: 1.2 });
                return {};
            case "funnel":
                pen.path(
                    g,
                    `M${0.1 * U} ${0.1 * U}L${w / 2 - 0.35 * U} ${h - 0.1 * U}M${w - 0.1 * U} ${0.1 * U}L${w / 2 + 0.35 * U} ${h - 0.1 * U}`,
                    "ruler",
                    null,
                    calm(c, 2.6),
                );
                return { out: [w / 2, h, "down"] };
            case "stand":
                pen.path(
                    g,
                    `M${w / 2} ${0.2 * U}L${w - 0.2 * U} ${h - 0.1 * U}H${0.2 * U}Z`,
                    "ruler",
                    wood,
                    calm(c, 1.6),
                );
                return { top: [w / 2, 0.2 * U, "up"] };
            case "cup": {
                pen.path(
                    g,
                    `M${0.1 * U} ${0.4 * U}L${0.25 * U} ${h - 0.1 * U}H${w - 0.25 * U}L${w - 0.1 * U} ${0.4 * U}`,
                    "ruler",
                    null,
                    calm(c, 2),
                );
                pen.rect(
                    g,
                    0.3 * U,
                    h - 0.55 * U,
                    w - 0.6 * U,
                    0.35 * U,
                    "ruler",
                    pen.fill(p.colour),
                    {
                        strokeWidth: 0.8,
                        disableMultiStroke: true,
                    },
                );
                tag(c, w / 2, h * 0.45, p.label);
                return { mouth: [w / 2, 0.4 * U, "up"] };
            }
            case "marble":
                pen.circle(g, w / 2, h / 2, 0.84 * U, "ruler", pen.fill(p.colour), calm(c, 1.3));
                if (!c.paper)
                    pen.circle(g, w * 0.38, h * 0.36, 0.18 * U, "ruler", pen.fill("card"), {
                        strokeWidth: 0,
                        stroke: "none",
                    });
                return {};
            case "wall":
                pen.rect(g, 1, 1, w - 2, h - 2, "ruler", pen.fill("card"), calm(c, 1.8));
                for (let y = U; y < h - 2; y += U)
                    pen.line(g, 3, y, w - 3, y, "ruler", {
                        strokeWidth: 0.7,
                        stroke: c.t["ink-soft"],
                    });
                return {};
            case "peg":
                pen.circle(g, w / 2, h / 2, 0.6 * U, "ruler", wood, calm(c, 1.4));
                return {};
            case "splitter":
                // two short sides meeting over a gap, with the bolt the flap turns on under it
                pen.path(
                    g,
                    `M${0.15 * U} ${0.15 * U}L${w / 2 - 0.45 * U} ${U}M${w - 0.15 * U} ${0.15 * U}L${w / 2 + 0.45 * U} ${U}`,
                    "ruler",
                    null,
                    calm(c, 2.6),
                );
                pen.circle(g, w / 2, 1.9 * U, 0.3 * U, "ruler", pen.fill("card"), calm(c, 1.1));
                return { out: [w / 2, h, "down"] };
            case "flap":
                pen.rect(g, 1, 0.4 * U, w - 2, 0.22 * U, "ruler", pen.fill(p.colour), calm(c, 1.4));
                pen.circle(g, w / 2, h / 2, 0.14 * U, "ruler", pen.fill("card"), calm(c, 0.9));
                return { pivot: [w / 2, h / 2, "down"] };
            case "bucket":
                pen.path(
                    g,
                    `M${0.3 * U} ${0.4 * U}V${h - 0.35 * U}H${w - 0.3 * U}V${0.4 * U}`,
                    "ruler",
                    null,
                    calm(c, 2.2),
                );
                pen.circle(g, w / 2, 0.4 * U, 0.2 * U, "ruler", pen.fill("card"), calm(c, 1));
                tag(c, w / 2, h * 0.62, p.label);
                return { pivot: [w / 2, 0.4 * U, "up"] };
        }
    },
    describe: (p) => {
        const colour = MARKER_WORD[p.colour];
        switch (p.part) {
            case "chute":
                return "A hopper at the top of a marble run, full of marbles, with the number it drops written on a white tag.";
            case "ramp":
                return "A wooden ramp from a marble run, a long board with a lip along its top for a marble to roll along.";
            case "seesaw":
                return `A ${colour} see-saw plank from a marble run, with a bolt in its middle where it turns on its stand.`;
            case "bouncer":
                return `A ${colour} springy pad on coiled springs, from a marble run, that sends a falling marble bouncing up again.`;
            case "funnel":
                return "A funnel from a marble run, two sloping sides that gather falling marbles into a narrow gap between them.";
            case "stand":
                return "A small wooden stand shaped like a triangle, from a marble run, that a see-saw plank turns on.";
            case "cup":
                return `A glass cup at the bottom of a marble run with a ${colour} band, and the number of marbles it wants written on a tag.`;
            case "marble":
                return `A small round ${colour} glass marble with a bright spot where the light catches it.`;
            case "wall":
                return "A wooden block standing in a marble run for the marbles to go round, over or bounce off.";
            case "peg":
                return "A round wooden peg fixed in a marble run for a marble to knock against as it falls past it.";
            case "splitter":
                return "A splitter from a marble run, two short sides gathering marbles onto a flap that sends every other marble the other way.";
            case "flap":
                return `A small ${colour} flap from a marble run's splitter, a paddle on a bolt that tips one way and then the other.`;
            case "bucket":
                return "A bucket hung by its rim in a marble run, with the number of marbles it holds before it tips them out written on a tag.";
        }
    },
    motion: {
        still: "A game places, turns and tips these parts itself; on the shelf they hold still so their numbers can be read.",
    },
});
