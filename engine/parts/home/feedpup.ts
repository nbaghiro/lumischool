import type { Ctx, RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.5 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const FEEDPUP_PARTS = [
    "biscuit",
    "peg",
    "hook",
    "star",
    "bellows",
    "bubble",
    "bowl",
    "tiles",
    "cover",
] as const;
export type FeedpupPart = (typeof FEEDPUP_PARTS)[number];

interface FeedpupParams {
    part: FeedpupPart;
    /** A star's number, or what a bowl's card says. */
    text: string;
    /** A star already caught is drawn faint; a bellows squeezed shut. From nought to one. */
    on: number;
    /** Squares across, for the tiled wall. */
    w: number;
}

/** Each part's box in squares; the tiled wall is as wide as `w`. */
export function feedpupBox(p: FeedpupParams): { w: number; h: number } {
    switch (p.part) {
        case "biscuit":
            return { w: 2, h: 2 };
        case "peg":
            return { w: 1, h: 1 };
        case "hook":
            return { w: 1, h: 2 };
        case "star":
            return { w: 2, h: 2 };
        case "bellows":
            return { w: 3, h: 2 };
        case "bubble":
            return { w: 3, h: 3 };
        case "bowl":
            return { w: 4, h: 2 };
        case "tiles":
            return { w: p.w, h: 4 };
        case "cover":
            return { w: 6, h: 6 };
    }
}

function biscuit<G>(c: Ctx<G>, cx: number, cy: number, r: number): void {
    const { pen, g } = c;
    pen.circle(g, cx, cy, 2 * r, "pencil", pen.fill("tang", "solid"), calm(c, 1.4));
    for (const [dx, dy] of [
        [-0.35, -0.3],
        [0.3, -0.25],
        [-0.1, 0.25],
        [0.35, 0.3],
        [-0.4, 0.2],
    ] as const)
        pen.circle(g, cx + dx * r, cy + dy * r, 0.16 * r, "ruler", pen.fill("ink"), {
            strokeWidth: 0.4,
        });
}

function star<G>(c: Ctx<G>, cx: number, cy: number, r: number, faint: boolean): void {
    const { pen, g } = c,
        pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
            k = i % 2 ? 0.48 : 1;
        pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
    }
    pen.polygon(g, pts, "pencil", pen.fill(faint ? "card" : "glow", "solid"), calm(c, 1.3));
}

export const feedpup = defineDrawing<FeedpupParams>({
    id: "feedpup",
    family: "home",
    title: "Feed the pup",
    group: "Props",
    about: "The pieces of a game where a biscuit hangs on ropes and is cut down to a hungry pup: the biscuit, a peg and a hook the ropes hang from, a numbered star, a bellows that puffs, a soap bubble, the pup's bowl with its number, a tiled wall, and the game's cover.",
    params: { part: "biscuit", text: "3", on: 0, w: 12 },
    settings: {
        part: { kind: "one of", of: FEEDPUP_PARTS },
        text: { kind: "text", most: 7 },
        on: { kind: "number", min: 0, max: 1, step: 0.05 },
        w: { kind: "whole", min: 4, max: 48 },
    },
    takes: [
        { label: "A biscuit", params: { part: "biscuit", text: "", on: 0, w: 12 } },
        { label: "A peg", params: { part: "peg", text: "", on: 0, w: 12 } },
        { label: "A hook", params: { part: "hook", text: "", on: 0, w: 12 } },
        { label: "A star for 3", params: { part: "star", text: "3", on: 0, w: 12 } },
        { label: "A star caught", params: { part: "star", text: "5", on: 1, w: 12 } },
        { label: "A bellows", params: { part: "bellows", text: "", on: 0, w: 12 } },
        { label: "A bellows squeezed", params: { part: "bellows", text: "", on: 1, w: 12 } },
        { label: "A soap bubble", params: { part: "bubble", text: "", on: 0, w: 12 } },
        { label: "A bowl for 10", params: { part: "bowl", text: "10", on: 0, w: 12 } },
        { label: "A bowl for a sum", params: { part: "bowl", text: "6 + ?", on: 0, w: 12 } },
        { label: "A tiled wall", params: { part: "tiles", text: "", on: 0, w: 12 } },
        { label: "The cover", params: { part: "cover", text: "", on: 0, w: 12 } },
    ],
    box: feedpupBox,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            on = Math.max(0, Math.min(1, Number(p.on) || 0));
        switch (p.part) {
            case "biscuit":
                biscuit(c, U, U, 0.82 * U);
                return { middle: [U, U, "up"] };
            case "peg":
                pen.circle(
                    g,
                    0.5 * U,
                    0.5 * U,
                    0.7 * U,
                    "pencil",
                    pen.fill("glow", "solid"),
                    calm(c, 1.2),
                );
                pen.circle(g, 0.5 * U, 0.5 * U, 0.22 * U, "ruler", pen.fill("ink"), {
                    strokeWidth: 0.5,
                });
                return { rope: [0.5 * U, 0.5 * U, "down"] };
            case "hook":
                pen.circle(g, 0.5 * U, 0.35 * U, 0.4 * U, "ruler", pen.fill("ink-soft"), {
                    strokeWidth: 0.5,
                });
                pen.path(
                    g,
                    `M${0.5 * U} ${0.5 * U}V${1.3 * U}Q${0.5 * U} ${1.8 * U} ${0.85 * U} ${1.75 * U}Q${1.0 * U} ${1.65 * U} ${0.9 * U} ${1.45 * U}`,
                    "pencil",
                    null,
                    calm(c, 1.6),
                );
                return { rope: [0.5 * U, 1.5 * U, "down"] };
            case "star": {
                star(c, U, U * 1.05, 0.92 * U, on > 0.5);
                const t = String(p.text).slice(0, 3);
                say(c, U, 1.32 * U, t, t.length > 1 ? 11 : 13);
                return { middle: [U, U, "up"] };
            }
            case "bellows": {
                // squeezed, the boards close towards the nozzle
                const open = 0.65 - 0.35 * on;
                pen.polygon(
                    g,
                    [
                        [0.2 * U, (1 - open) * U],
                        [2.1 * U, 0.86 * U],
                        [2.1 * U, 1.14 * U],
                        [0.2 * U, (1 + open) * U],
                    ],
                    "pencil",
                    pen.fill("tang", "solid"),
                    calm(c, 1.3),
                );
                pen.path(
                    g,
                    `M${0.7 * U} ${(1 - open * 0.75) * U}L${0.7 * U} ${(1 + open * 0.75) * U}M${1.2 * U} ${(1 - open * 0.5) * U}L${1.2 * U} ${(1 + open * 0.5) * U}`,
                    "pencil",
                    null,
                    calm(c, 0.9),
                );
                pen.rect(g, 2.1 * U, 0.88 * U, 0.75 * U, 0.24 * U, "ruler", pen.fill("ink-soft"), {
                    strokeWidth: 0.8,
                });
                return { nozzle: [2.85 * U, U, "right"] };
            }
            case "bubble":
                pen.circle(
                    g,
                    1.5 * U,
                    1.5 * U,
                    2.7 * U,
                    "pencil",
                    pen.fill("sky", "solid"),
                    calm(c, 1.2),
                );
                pen.path(
                    g,
                    `M${0.75 * U} ${1.1 * U}Q${0.95 * U} ${0.6 * U} ${1.45 * U} ${0.5 * U}`,
                    "pencil",
                    null,
                    { ...calm(c, 1.4), stroke: c.t.card },
                );
                return { middle: [1.5 * U, 1.5 * U, "up"] };
            case "bowl": {
                pen.path(
                    g,
                    `M${0.2 * U} ${0.5 * U}H${3.8 * U}L${3.3 * U} ${1.8 * U}H${0.7 * U}Z`,
                    "pencil",
                    pen.fill("berry", "solid"),
                    calm(c, 1.4),
                );
                pen.path(
                    g,
                    roundedRect(0.9 * U, 0.7 * U, 2.2 * U, 0.85 * U, 4),
                    "ruler",
                    pen.fill("card"),
                    {
                        strokeWidth: 1,
                        disableMultiStroke: true,
                    },
                );
                const t = String(p.text).slice(0, 7);
                say(
                    c,
                    2 * U,
                    1.32 * U,
                    t,
                    Math.min(15, Math.floor((2.1 * U - 6) / (t.length * 0.56))),
                );
                return { food: [2 * U, 0.5 * U, "up"] };
            }
            case "tiles": {
                const w = Math.max(4, Math.min(48, Math.round(p.w)));
                for (let i = 0; i < w; i += 2)
                    for (let j = 0; j < 4; j += 2)
                        pen.rect(
                            g,
                            (i + 0.1) * U,
                            (j + 0.1) * U,
                            1.8 * U,
                            1.8 * U,
                            "ruler",
                            pen.fill("card"),
                            {
                                strokeWidth: 0.7,
                                disableMultiStroke: true,
                            },
                        );
                return { top: [(w / 2) * U, 0, "up"] };
            }
            case "cover":
                pen.circle(
                    g,
                    3 * U,
                    0.6 * U,
                    0.6 * U,
                    "pencil",
                    pen.fill("glow", "solid"),
                    calm(c, 1.2),
                );
                pen.line(g, 3 * U, 0.7 * U, 3.4 * U, 2.6 * U, "pencil", calm(c, 1.2));
                biscuit(c, 3.5 * U, 3.1 * U, 0.65 * U);
                star(c, 1.3 * U, 2.6 * U, 0.6 * U, false);
                pen.path(
                    g,
                    `M${1.8 * U} ${4.6 * U}H${5.2 * U}L${4.8 * U} ${5.6 * U}H${2.2 * U}Z`,
                    "pencil",
                    pen.fill("berry", "solid"),
                    calm(c, 1.3),
                );
                return { middle: [3 * U, 3 * U, "up"] };
        }
    },
    describe: (p) => {
        switch (p.part) {
            case "biscuit":
                return "A round golden dog biscuit with a few dark specks baked into it, the treat that hangs on ropes until it is cut down to a pup.";
            case "peg":
                return "A round yellow peg with a dark middle fixed to a wall, the place a rope is tied from so that a biscuit can swing below it.";
            case "hook":
                return "A curved grey hook hanging from a small ring on a wall, the place a rope is tied from so that a biscuit can swing below it.";
            case "star":
                return Number(p.on) > 0.5
                    ? `A pale star with the number ${String(p.text).slice(0, 3)} written on it, already caught by the biscuit on its way down to the pup.`
                    : `A bright yellow star with the number ${String(p.text).slice(0, 3)} written on it, waiting to be caught by a falling biscuit for the pup's sum.`;
            case "bellows":
                return Number(p.on) > 0.5
                    ? "A small orange bellows squeezed nearly shut with a grey nozzle, blowing a puff of air that pushes a hanging biscuit along."
                    : "A small orange bellows open wide with folds in its side and a grey nozzle, ready to puff air at a hanging biscuit.";
            case "bubble":
                return "A big round soap bubble with a pale blue shine and a white glint, which floats whatever it swallows gently upward until it pops.";
            case "bowl":
                return `A pink dog bowl with a white card on its side that reads ${String(p.text).slice(0, 7)}, the number the stars have to make for the pup.`;
            case "tiles":
                return "A wall of white square tiles in neat rows, like a kitchen or a bathroom wall behind a game of cutting ropes.";
            case "cover":
                return "A golden biscuit hanging on a rope from a yellow peg beside a numbered star, above a pink dog bowl waiting for it.";
        }
    },
    motion: {
        still: "The pieces stay still; the game swings the biscuit, cuts the ropes and floats the bubble.",
    },
});
