import { letter, type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, penned, say, soft } from "../lettering";

/** The instrument families a section's tune can be given to, in the order `tune` numbers them. */
const FAMILIES = ["strings", "woodwind", "brass", "percussion"] as const;
/** The loudness marks `loud` numbers, from 0. */
const LOUD = ["pp", "p", "mp", "mf", "f", "ff"] as const;
/** What `tempo` numbers: steady, getting faster, getting slower. */
const TEMPO = ["", "accel.", "rit."] as const;
const LETTERS = "ABCD";
const COLOURS: Marker[] = ["sky", "berry", "mint", "tang"];

const W = 34,
    H = 12,
    LEFT = 1,
    STRIP = 32;

interface ListenMapParams {
    title: string;
    /** Each section's letter, 0 for A to 3 for D. */
    sections: number[];
    /** Each section's length in bars; empty draws every section the same length. */
    bars: number[];
    /** The family with the tune in each section, -1 for none marked. */
    tune: number[];
    /** Each section's loudness, 0 (pp) to 5 (ff), -1 for none. */
    loud: number[];
    /** 0 steady, 1 getting faster, 2 getting slower, at each section's end. */
    tempo: number[];
    count: number;
    /** A section whose letter waits under a question mark, or -1. */
    ask: number;
}

const within = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

/** Where each section starts and ends along the strip, in squares from its left: in step with its bars. */
export function spans(sections: readonly number[], bars: readonly number[]): [number, number][] {
    const n = Math.min(8, sections.length);
    const lengths = Array.from({ length: n }, (_, i) =>
        bars.length ? within(bars[i] ?? 1, 1, 64) : 1,
    );
    const total = lengths.reduce((s, l) => s + l, 0) || 1;
    let at = 0;
    return lengths.map((l) => {
        const from = at;
        at += (l / total) * STRIP;
        return [from, at];
    });
}

/** The letters that come back later in the piece, in the order they first come. */
export const returning = (sections: readonly number[]): string[] =>
    [...new Set(sections.map((s) => within(s, 0, 3)))]
        .filter((s) => sections.filter((t) => within(t, 0, 3) === s).length > 1)
        .map((s) => LETTERS.charAt(s));

/** A section's shape: each letter has its own, so a section that returns looks the same again. */
function shape(kind: number, x0: number, x1: number, top: number, bottom: number): string {
    const m = (x0 + x1) / 2,
        r = Math.min(0.9 * U, (x1 - x0) / 3);
    switch (kind) {
        case 1:
            return `M${x0} ${(top + bottom) / 2}L${x0 + r} ${top}L${x1 - r} ${top}L${x1} ${(top + bottom) / 2}L${x1 - r} ${bottom}L${x0 + r} ${bottom}Z`;
        case 2:
            return `M${x0} ${bottom}L${x0} ${top + r}Q${(x0 + m) / 2} ${top - r * 0.6} ${m} ${top + r}T${x1} ${top + r}L${x1} ${bottom}Z`;
        case 3:
            return `M${x0} ${bottom}L${m} ${top}L${x1} ${bottom}Z`;
        default:
            return `M${x0 + r} ${top}L${x1 - r} ${top}Q${x1} ${top} ${x1} ${top + r}L${x1} ${bottom - r}Q${x1} ${bottom} ${x1 - r} ${bottom}L${x0 + r} ${bottom}Q${x0} ${bottom} ${x0} ${bottom - r}L${x0} ${top + r}Q${x0} ${top} ${x0 + r} ${top}Z`;
    }
}

/** A small picture of an instrument family, about a square and a half high, standing on `base`. */
function family<G>(c: Ctx<G>, kind: number, x: number, base: number): void {
    const { pen, g } = c,
        w = { strokeWidth: 1.4 };
    if (kind === 0) {
        // a violin standing up, its neck and scroll above, and the bow beside it
        pen.path(
            g,
            `M${x - 3} ${base - 25}C${x + 5} ${base - 27} ${x + 7} ${base - 22} ${x + 4} ${base - 17}C${x + 10} ${base - 13} ${x + 9} ${base - 2} ${x - 3} ${base - 2}C${x - 15} ${base - 2} ${x - 16} ${base - 13} ${x - 10} ${base - 17}C${x - 13} ${base - 22} ${x - 11} ${base - 27} ${x - 3} ${base - 25}Z`,
            "ruler",
            pen.fill("tang"),
            w,
        );
        pen.line(g, x - 3, base - 25, x - 3, base - 36, "ruler", { strokeWidth: 2.2 });
        pen.circle(g, x - 3, base - 37, 3.4, "ruler", null, { strokeWidth: 1.2 });
        pen.line(g, x - 3, base - 22, x - 3, base - 6, "ruler", { strokeWidth: 0.9 });
        pen.line(g, x + 11, base - 36, x + 11, base - 1, "ruler", { strokeWidth: 1.4 });
        pen.line(g, x + 14, base - 33, x + 14, base - 3, "ruler", { strokeWidth: 0.9 });
    } else if (kind === 1) {
        // a recorder-like pipe with its finger holes
        pen.rect(g, x - 3, base - 36, 6, 32, "ruler", pen.fill("card"), w);
        pen.path(
            g,
            `M${x - 3} ${base - 4}L${x - 5} ${base}L${x + 5} ${base}L${x + 3} ${base - 4}`,
            "ruler",
            null,
            w,
        );
        for (let k = 0; k < 4; k++)
            pen.circle(g, x, base - 28 + k * 6, 2.4, "ruler", pen.fill("ink"), {
                strokeWidth: 0.8,
            });
    } else if (kind === 2) {
        // a trumpet on its side: mouthpiece, tube and a flared bell
        pen.line(g, x - 16, base - 16, x + 4, base - 16, "ruler", { strokeWidth: 2 });
        pen.rect(g, x - 10, base - 22, 12, 12, "ruler", null, { strokeWidth: 1.2 });
        pen.path(
            g,
            `M${x + 4} ${base - 19}L${x + 16} ${base - 26}L${x + 16} ${base - 6}L${x + 4} ${base - 13}Z`,
            "ruler",
            pen.fill("glow"),
            w,
        );
    } else {
        // a drum with two sticks
        pen.ellipse(g, x, base - 20, 26, 8, "ruler", pen.fill("card"), w);
        pen.path(
            g,
            `M${x - 13} ${base - 20}L${x - 13} ${base - 5}Q${x} ${base + 1} ${x + 13} ${base - 5}L${x + 13} ${base - 20}`,
            "ruler",
            null,
            w,
        );
        pen.line(g, x - 12, base - 34, x - 2, base - 21, "ruler", { strokeWidth: 1.6 });
        pen.line(g, x + 12, base - 34, x + 2, base - 21, "ruler", { strokeWidth: 1.6 });
    }
}

const HANDEL: ListenMapParams = {
    title: "Handel, Water Music: Alla Hornpipe",
    sections: [0, 1, 0],
    bars: [],
    tune: [-1, -1, -1],
    loud: [4, 1, 4],
    tempo: [0, 0, 0],
    count: 0,
    ask: -1,
};

export const listenMap = defineDrawing<ListenMapParams>({
    id: "listenmap",
    family: "music",
    title: "Listening map",
    group: "Structures",
    about: "A piece of music drawn as a strip of shapes from left to right in the order it is heard. `sections` gives each section's letter (0 for A to 3 for D), and a letter that comes back has the same shape and colour. `bars` sets each section's length in bars, and the shapes are as long as their bars (empty draws them the same length); `count` writes the bars in each. Under each shape `tune` draws the instrument family that has the tune (0 strings, 1 woodwind, 2 brass, 3 percussion, -1 none), `loud` its loudness (0 pp to 5 ff, -1 none) and `tempo` a change at its end (1 accel., 2 rit.). `ask` puts a question mark in one section's shape.",
    params: HANDEL,
    settings: {
        title: { kind: "text", most: 40 },
        sections: { kind: "numbers", min: 0, max: 3, most: 8 },
        bars: { kind: "numbers", min: 1, max: 64, most: 8 },
        tune: { kind: "numbers", min: -1, max: 3, most: 8 },
        loud: { kind: "numbers", min: -1, max: 5, most: 8 },
        tempo: { kind: "numbers", min: 0, max: 2, most: 8 },
        count: { kind: "whole", min: 0, max: 1 },
        ask: { kind: "whole", min: -1, max: 7 },
    },
    takes: [
        { label: "Handel's Alla Hornpipe, A B A", params: HANDEL },
        {
            label: "A rondo in bars, one letter asked",
            params: {
                title: "A rondo",
                sections: [0, 1, 0, 2, 0],
                bars: [8, 8, 8, 12, 8],
                tune: [0, 1, 0, 2, 0],
                loud: [3, 1, 3, 5, 4],
                tempo: [0, 0, 0, 0, 2],
                count: 1,
                ask: 3,
            },
        },
        {
            label: "Getting faster, drums at the end",
            params: {
                title: "A march",
                sections: [0, 0, 1, 0],
                bars: [4, 4, 8, 4],
                tune: [2, 2, 1, 3],
                loud: [4, 4, 2, 5],
                tempo: [0, 0, 1, 0],
                count: 1,
                ask: -1,
            },
        },
    ],
    box: () => ({ w: W, h: H }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            top = 2.6 * U,
            bottom = 5.4 * U,
            at = spans(p.sections, p.bars),
            ask = Math.round(p.ask);
        say(c, LEFT * U, 1.2 * U, p.title, 15, "start");
        at.forEach(([s0, s1], i) => {
            const kind = within(p.sections[i] ?? 0, 0, 3),
                x0 = (LEFT + s0) * U + 3,
                x1 = (LEFT + s1) * U - 3,
                m = (x0 + x1) / 2;
            pen.path(
                g,
                shape(kind, x0, x1, top, bottom),
                "ruler",
                pen.fill(COLOURS[kind] ?? "sky", "hachure", { hachureGap: 6 }),
                { strokeWidth: 1.8 },
            );
            const big = 1.9 * U;
            patch(c, m, (top + bottom) / 2 + 2 - big * 0.34, 1.6 * U, big * 1.1);
            if (i === ask) penned(c, m, (top + bottom) / 2 + 12, "?", 30);
            else num(c, m, (top + bottom) / 2 + 12, LETTERS.charAt(kind), 30);
            if (Math.round(p.count) === 1 && p.bars.length)
                soft(c, m, 6.2 * U, `${within(p.bars[i] ?? 1, 1, 64)} bars`, 11);
            const t = Math.round(p.tune[i] ?? -1);
            if (t >= 0 && t <= 3) {
                family(c, t, m, 9 * U);
                soft(c, m, 9.9 * U, FAMILIES[t] ?? "", 11);
            }
            const l = Math.round(p.loud[i] ?? -1);
            if (l >= 0 && l <= 5)
                letter(c, {
                    x: m,
                    y: 11.5 * U,
                    s: LOUD[l] ?? "",
                    italic: true,
                    face: "hand",
                    weight: 800,
                    size: 22,
                    fill: c.t.ink,
                    anchor: "middle",
                    informal: 40,
                });
            const tempo = TEMPO[within(p.tempo[i] ?? 0, 0, 2)] ?? "";
            if (tempo) say(c, x1 - 2, 2.3 * U, tempo, 13, "end", c.t["ink-soft"]);
            a[`section(${i})`] = [m, top, "up"];
        });
        const end = (LEFT + STRIP) * U;
        pen.arrow(g, [LEFT * U, 6.8 * U], [end, 6.8 * U], c.t["ink-soft"], 0);
        cap(c, LEFT * U, 7.5 * U, "time", 11, "start");
        a.strip = [(LEFT * U + end) / 2, bottom, "down"];
        return a;
    },
    motion: {
        still: "A listening map is read along its strip in order, and holds still as text does.",
    },
    describe: (p) =>
        `A listening map of ${p.title}: ${Math.min(8, p.sections.length)} sections drawn as lettered shapes from left to right, with pictures of the instruments and loudness marks underneath.`,
});
