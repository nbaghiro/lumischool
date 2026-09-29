import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, say, soft } from "../lettering";

/** The energy each band carries, with the blank one worked out from the rest: what goes in all comes out. */
export function energyBands(p: {
    input: number;
    useful: number;
    wasted: readonly number[];
    blank: number;
}): { input: number; useful: number; wasted: number[] } {
    const wasted = p.wasted.slice(0, 2).map((w) => Math.max(0, w));
    const out = { input: Math.max(0, p.input), useful: Math.max(0, p.useful), wasted };
    const b = Math.round(p.blank);
    const lost = (skip: number): number => wasted.reduce((s, w, i) => (i === skip ? s : s + w), 0);
    if (b === 0) out.input = out.useful + lost(-1);
    else if (b === 1) out.useful = out.input - lost(-1);
    else if (b >= 2 && b - 2 < wasted.length) wasted[b - 2] = out.input - out.useful - lost(b - 2);
    return out;
}

/** Of every hundred parts that go in, how many come out as the useful one. */
export const efficiencyOf = (input: number, useful: number): number =>
    input > 0 ? (useful * 100) / input : 0;

const BOX_X = 8 * U;
const BOX_W = 5 * U;
const TOP = 2.4 * U;
/** The input band's thickness; every other band is its share of this. */
const T = 3.6 * U;

function band<G>(c: Ctx<G>, pts: [number, number][], fill: "glow" | "berry" | "ink-soft"): void {
    c.pen.polygon(
        c.g,
        pts,
        "ruler",
        c.pen.fill(fill, fill === "ink-soft" ? "hachure" : "solid", { hachureGap: 5 }),
        { strokeWidth: 1.6 },
    );
}

export const energyFlow = defineDrawing({
    id: "energyflow",
    family: "science",
    title: "Where the energy goes",
    group: "Structures",
    about: "A machine as a box with the energy going into it on the left and coming out of it as bands, each as wide as the energy it carries: the useful part out to the right, and the wasted parts, usually heating the surroundings and sound, down below. Energy is never made or lost, only passed on, so the bands out add up to the band in, and one band can be left as a question mark (`blank`, 0 the input, 1 the useful band, 2 and 3 the wasted ones) to be worked out from the others. The share of the input that comes out useful is the machine's efficiency.",
    params: {
        thing: "water wheel",
        from: "moving water",
        to: "turning millstone",
        input: 1000,
        useful: 600,
        wasted: [300, 100],
        wastes: ["heating", "sound"],
        blank: -1,
        unit: "J",
    },
    settings: {
        thing: { kind: "text", most: 16 },
        from: { kind: "text", most: 18 },
        to: { kind: "text", most: 20 },
        input: { kind: "whole", min: 1, max: 1000000 },
        useful: { kind: "whole", min: 0, max: 1000000 },
        wasted: { kind: "numbers", min: 0, max: 1000000, most: 2 },
        wastes: { kind: "words", most: 2 },
        blank: { kind: "whole", min: -1, max: 3 },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "The water wheel",
            params: {
                thing: "water wheel",
                from: "moving water",
                to: "turning millstone",
                input: 1000,
                useful: 600,
                wasted: [300, 100],
                wastes: ["heating", "sound"],
                blank: -1,
                unit: "J",
            },
        },
        {
            label: "A bulb, one band to find",
            params: {
                thing: "filament bulb",
                from: "electricity",
                to: "light",
                input: 100,
                useful: 10,
                wasted: [90],
                wastes: ["heating"],
                blank: 1,
                unit: "J",
            },
        },
        {
            label: "A turbine, the input to find",
            params: {
                thing: "turbine",
                from: "moving water",
                to: "electricity",
                input: 2000,
                useful: 1800,
                wasted: [150, 50],
                wastes: ["heating", "sound"],
                blank: 0,
                unit: "J",
            },
        },
    ],
    box: () => ({ w: 22, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            e = energyBands(p),
            blank = Math.round(p.blank),
            whole = Math.max(1, e.input),
            share = (x: number): number => Math.max(0.35 * U, (Math.max(0, x) / whole) * T),
            label = (x: number, i: number): string => (blank === i ? "?" : `${x} ${p.unit}`);
        const mid = TOP + T / 2,
            right = BOX_X + BOX_W;
        // the energy in, an arrow as thick as T into the box
        band(
            c,
            [
                [0.4 * U, TOP],
                [BOX_X - 1.2 * U, TOP],
                [BOX_X, mid],
                [BOX_X - 1.2 * U, TOP + T],
                [0.4 * U, TOP + T],
            ],
            "glow",
        );
        soft(c, 0.5 * U, TOP - 0.4 * U, p.from, 12, "start");
        if (blank === 0) {
            patch(c, 3.6 * U, mid, 24, 28);
            penned(c, 3.6 * U, mid + 8, "?", 24);
        } else {
            patch(c, 3.6 * U, mid - 5, 70, 20);
            num(c, 3.6 * U, mid + 1, label(e.input, 0), 15);
        }
        a.input = [3.6 * U, TOP, "up"];
        // the useful energy out to the right, along the top of the box
        const u = share(e.useful);
        band(
            c,
            [
                [right, TOP],
                [20.2 * U, TOP],
                [21.6 * U, TOP + u / 2],
                [20.2 * U, TOP + u],
                [right, TOP + u],
            ],
            "berry",
        );
        soft(c, 21.6 * U, TOP - 0.4 * U, p.to, 12, "end");
        const uy = TOP + u + 0.9 * U;
        if (blank === 1) {
            patch(c, 17 * U, uy - 4, 24, 28);
            penned(c, 17 * U, uy + 4, "?", 24);
        } else {
            patch(c, 17 * U, uy - 5, 70, 20);
            num(c, 17 * U, uy + 1, label(e.useful, 1), 15);
        }
        a.useful = [17 * U, TOP, "up"];
        // the wasted energy, each band turning down out of the bottom of the box
        let x = BOX_X + 0.4 * U;
        e.wasted.forEach((w, i) => {
            const t = share(w),
                bottom = 10.4 * U;
            band(
                c,
                [
                    [x, TOP + T],
                    [x + t, TOP + T],
                    [x + t, bottom - 0.8 * U],
                    [x + t / 2, bottom],
                    [x, bottom - 0.8 * U],
                ],
                "ink-soft",
            );
            const lx = x + t / 2 + (i === 0 ? -0.2 * U : 0.2 * U),
                align = i === 0 && e.wasted.length > 1 ? "end" : "start",
                side = align === "end" ? -0.5 * U : t / 2 + 0.4 * U;
            soft(
                c,
                i === 0 && e.wasted.length > 1 ? x - 0.3 * U : x + t + 0.3 * U,
                bottom + 0.2 * U,
                p.wastes[i] ?? "wasted",
                12,
                align,
            );
            if (blank === i + 2) penned(c, lx + side, 8.3 * U, "?", 22);
            else
                num(
                    c,
                    i === 0 && e.wasted.length > 1 ? x - 0.3 * U : x + t + 0.3 * U,
                    8.3 * U,
                    label(w, i + 2),
                    14,
                    align,
                );
            a[`wasted(${i})`] = [x + t / 2, bottom, "down"];
            x += t + 1.4 * U;
        });
        pen.path(
            g,
            roundedRect(BOX_X, TOP - 0.6 * U, BOX_W, T + 1.2 * U, 10),
            "ruler",
            pen.fill("card"),
            {
                strokeWidth: 2.2,
            },
        );
        say(c, BOX_X + BOX_W / 2, mid + 5, p.thing, p.thing.length > 11 ? 12 : 14);
        a.box = [BOX_X + BOX_W / 2, TOP - 0.6 * U, "up"];
        return a;
    },
    describe: (p) =>
        `Energy going into a ${p.thing} as ${p.from} and coming out as ${p.to}, with the wasted part turning down, each band as wide as the energy it carries.`,
    reads: true,
});
