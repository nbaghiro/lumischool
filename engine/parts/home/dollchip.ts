import { plain, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = [
    "chip",
    "tab",
    "switch",
    "drawer",
    "card",
    "button",
    "ring",
    "pill",
    "tick",
] as const;
type Kind = (typeof KINDS)[number];

export interface ChipParams {
    kind: Kind;
    tone: Marker;
    /** A tab or a tick that is chosen, or a switch turned to its right half. */
    on: boolean;
    /** Squares across and down, for the pieces drawn to a length. */
    w: number;
    h: number;
    /** Where a switch's knob has slid to, from its left half at nought to its right at one; below nought it follows `on`. */
    slide: number;
}

/** How far in from a switch's edge its knob sits, in squares: the outline's own margin and an even gap inside it, so a game can centre its words on each half. */
export const SWITCH_INSET = 0.27;

const kindOf = (v: unknown): Kind => KINDS.find((k) => k === v) ?? "chip";
const toneOf = (v: unknown): Marker => MARKERS.find((m) => m === v) ?? "sky";
const whole = (v: unknown, least: number, most: number, d: number): number =>
    Math.max(least, Math.min(most, Math.round(Number(v) || d)));

/** A chip is three squares a side, drawn round inside it, in step with CHIP in school/games/dollhouse.ts. */
export const CHIP_SIDE = 3;

const boxOf = (p: ChipParams): { w: number; h: number } => {
    const k = kindOf(p.kind);
    if (k === "chip" || k === "ring") return { w: CHIP_SIDE, h: CHIP_SIDE };
    if (k === "button") return { w: 2, h: 2 };
    if (k === "tick") return { w: 1, h: 1 };
    if (k === "drawer" || k === "card")
        return { w: whole(p.w, 4, 36, 12), h: whole(p.h, 2, 12, 4) };
    return { w: whole(p.w, 2, 12, 5), h: 2 };
};

/** A pill's outline as a path, `w` by `h` units at `x`, `y`, its ends round. */
const pill = (x: number, y: number, w: number, h: number): string => {
    const r = h / 2;
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
};

/**
 * The pieces a dollhouse game is worked with: a round chip a piece of furniture sits on in the
 * drawer, a tab over the drawer, the two-way switch between building and decorating, the drawer
 * itself, a card for a job's list, a round button, the ring the keys' highlight draws, a pill a
 * readout sits in, and the circle a job's line is ticked in.
 */
export const dollChip = defineDrawing<ChipParams>({
    id: "dollchip",
    family: "home",
    title: "Dollhouse controls",
    group: "Props",
    about: "The pieces a dollhouse is played with: round chips for furniture, tabs, a two-way switch for building and decorating, a slim drawer, a list card, a round button and a tick.",
    params: { kind: "chip", tone: "sky", on: false, w: 5, h: 2, slide: -1 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        tone: { kind: "one of", of: MARKERS },
        on: { kind: "flag" },
        w: { kind: "whole", min: 2, max: 36 },
        h: { kind: "whole", min: 2, max: 12 },
        slide: { kind: "number", min: -1, max: 1, step: 0.05 },
    },
    takes: [
        {
            label: "A furniture chip",
            params: { kind: "chip", tone: "mint", on: false, w: 5, h: 2, slide: -1 },
        },
        {
            label: "A chosen tab",
            params: { kind: "tab", tone: "sky", on: true, w: 5, h: 2, slide: -1 },
        },
        { label: "A tab", params: { kind: "tab", tone: "sky", on: false, w: 5, h: 2, slide: -1 } },
        {
            label: "The switch set to build",
            params: { kind: "switch", tone: "glow", on: false, w: 9, h: 2, slide: -1 },
        },
        {
            label: "The switch set to decorate",
            params: { kind: "switch", tone: "glow", on: true, w: 9, h: 2, slide: -1 },
        },
        {
            label: "The drawer",
            params: { kind: "drawer", tone: "sky", on: false, w: 30, h: 6, slide: -1 },
        },
        {
            label: "A list card",
            params: { kind: "card", tone: "sky", on: false, w: 12, h: 4, slide: -1 },
        },
        {
            label: "A round button",
            params: { kind: "button", tone: "sky", on: false, w: 5, h: 2, slide: -1 },
        },
        {
            label: "The highlight",
            params: { kind: "ring", tone: "sky", on: false, w: 5, h: 2, slide: -1 },
        },
        {
            label: "A readout pill",
            params: { kind: "pill", tone: "glow", on: false, w: 8, h: 2, slide: -1 },
        },
        {
            label: "A ticked circle",
            params: { kind: "tick", tone: "mint", on: true, w: 5, h: 2, slide: -1 },
        },
        {
            label: "An empty circle",
            params: { kind: "tick", tone: "mint", on: false, w: 5, h: 2, slide: -1 },
        },
    ],
    box: boxOf,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        const k = kindOf(p.kind),
            tone = toneOf(p.tone),
            b = boxOf(p),
            w = b.w * U,
            h = b.h * U;
        const soft = (d: string, opacity: number) => {
            if (!c.paper) plain(c, { kind: "path", d, fill: c.t[tone], opacity });
        };
        if (k === "chip") {
            const r = w / 2 - 2;
            pen.circle(g, w / 2, h / 2, 2 * r, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            pen.circle(
                g,
                w / 2,
                h / 2,
                2 * r - 0.35 * U,
                "pencil",
                pen.fill(tone, "hachure", {
                    hachureGap: 9,
                }),
                { strokeWidth: 0.8, roughness: 0.4 },
            );
            return { middle: [w / 2, h / 2, "up"], price: [w - 0.6 * U, h - 0.6 * U, "up"] };
        }
        if (k === "ring") {
            pen.circle(g, w / 2, h / 2, w - 4, "pencil", null, { strokeWidth: 3.2 });
            return { middle: [w / 2, h / 2, "up"] };
        }
        if (k === "button") {
            pen.circle(g, w / 2, h / 2, w - 3, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
            return { middle: [w / 2, h / 2, "up"] };
        }
        if (k === "tick") {
            pen.circle(g, w / 2, h / 2, w - 3, "pencil", p.on ? pen.fill(tone) : pen.fill("card"), {
                strokeWidth: 1.4,
                roughness: 0.4,
            });
            if (p.on)
                pen.linear(
                    g,
                    [
                        [0.27 * w, 0.52 * h],
                        [0.44 * w, 0.7 * h],
                        [0.74 * w, 0.32 * h],
                    ],
                    "ruler",
                    { strokeWidth: 1.8 },
                );
            return { middle: [w / 2, h / 2, "up"] };
        }
        if (k === "drawer" || k === "card") {
            const d = `M${0.4 * U} 2H${w - 0.4 * U}Q${w - 2} 2 ${w - 2} ${0.4 * U}V${h - 0.4 * U}Q${w - 2} ${h - 2} ${w - 0.4 * U} ${h - 2}H${0.4 * U}Q2 ${h - 2} 2 ${h - 0.4 * U}V${0.4 * U}Q2 2 ${0.4 * U} 2Z`;
            pen.path(g, d, "pencil", pen.fill("card"), { strokeWidth: k === "drawer" ? 2 : 1.4 });
            if (k === "drawer") {
                soft(`M${0.4 * U} 3H${w - 0.4 * U}V${0.5 * U}H${0.4 * U}Z`, 0.25);
                // the drawer's handle along its top edge
                pen.line(g, w / 2 - 1.2 * U, 0.3 * U, w / 2 + 1.2 * U, 0.3 * U, "ruler", {
                    strokeWidth: 2.2,
                });
            }
            return { middle: [w / 2, h / 2, "up"] };
        }
        if (k === "switch") {
            // one clean outline, and a knob exactly half of the inside, inset evenly all round
            const edge = 3,
                inset = SWITCH_INSET * U,
                knob = (w - 2 * inset) / 2,
                at = Number(p.slide) >= 0 ? Math.min(1, Number(p.slide)) : p.on ? 1 : 0;
            const one = { strokeWidth: 1.8, roughness: 0.15, disableMultiStroke: true };
            pen.path(
                g,
                pill(edge, edge, w - 2 * edge, h - 2 * edge),
                "ruler",
                pen.fill("card"),
                one,
            );
            pen.path(
                g,
                pill(inset + at * knob, inset, knob, h - 2 * inset),
                "ruler",
                pen.fill(tone, "solid"),
                {
                    ...one,
                    strokeWidth: 1.2,
                },
            );
            return {
                left: [inset + knob / 2, h / 2, "up"],
                right: [inset + knob * 1.5, h / 2, "up"],
            };
        }
        // a tab or a pill
        pen.path(
            g,
            pill(4, 3, w - 8, h - 6),
            "ruler",
            k === "pill" || p.on ? pen.fill(tone) : pen.fill("card"),
            { strokeWidth: p.on ? 2 : 1.4 },
        );
        return { middle: [w / 2, h / 2, "up"] };
    },
    describe: (p) => {
        const k = kindOf(p.kind),
            colour = MARKER_WORD[toneOf(p.tone)];
        if (k === "chip")
            return `A round white chip with a ${colour} hatched middle, where a piece of dollhouse furniture sits in the drawer with its price beside it.`;
        if (k === "tab")
            return `A rounded tab over a dollhouse drawer${p.on ? `, filled ${colour} because it is the one chosen` : ", white because another is chosen"}, naming the kind of furniture below it.`;
        if (k === "switch")
            return `A rounded two-way switch with its ${p.on ? "right" : "left"} half filled ${colour}, for choosing between building a dollhouse's rooms and decorating them with furniture.`;
        if (k === "drawer")
            return "A slim white drawer with rounded corners and a handle along its top edge, sliding up from the bottom to hold dollhouse rooms or furniture.";
        if (k === "card")
            return "A white card with rounded corners that a dollhouse job's short list is written on, one line for each thing the job asks for.";
        if (k === "button")
            return "A round white button with a firm outline, the size of a fingertip, for going back from a room to the whole dollhouse.";
        if (k === "ring")
            return "A heavy round ring drawn around a chip or a card, showing which one the keys have highlighted and will take next.";
        if (k === "pill")
            return `A rounded ${colour} pill that a dollhouse readout sits in, such as the coins left or the coins spent against a job's target.`;
        return p.on
            ? `A small ${colour} circle with a tick drawn in it, showing that one line of a dollhouse job's list is done.`
            : "A small empty circle at the start of a dollhouse job's line, waiting for its tick when that part of the job is done.";
    },
    motion: { still: "Controls stay where a hand expects them; only the game moves them." },
});
