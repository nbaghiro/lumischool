import { letter, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineInstrument } from "../drawing";
import {
    letterOf,
    noteOf,
    noteText,
    readNote,
    spokenNote,
    whiteKeys,
    type Note,
} from "../../sound/pitch";
import { solfaOf } from "../../sound/scale";
import { type Key } from "../../sound/keys";

const LABELS = ["letters", "solfa", "numbers", "none"] as const;

export interface GlockParams {
    /** The lowest bar. A black note is rounded up to the white one above it: these bars are the white notes. */
    from: string;
    /** How many bars. Eight is C to C, the glockenspiel a family is most likely to have. */
    bars: number;
    /** Squares from one bar to the next. Three is the lesson size, two a size to look at, five life size. */
    wide: number;
    labels: (typeof LABELS)[number];
    /** Bars drawn struck, for two notes played together or an answer key. */
    down: string[];
    /** Bars ringed, which is how "play this one" is said without colour and without sound. */
    lit: string[];
    /** The beater, resting below the short bars when there is room for it. */
    mallet: boolean;
    /**
     * Bars lifted off the frame, drawn as their empty pins and not played. A class lifts F and B off to
     * leave the pentatonic scale, whose notes sound well in any order, before a child makes up a tune.
     */
    off: string[];
}

/** The node of a bar's fundamental, as a fraction of its length from either end: where it is pinned. */
const NODE = 0.224;

/** The drawn bar's share of the distance from one bar to the next; the rest is the gap a finger can also land in. */
const BAR = 0.8;

/** Squares of frame beyond the bars on every side. */
const SIDE = 1;

interface Bar {
    note: Note;
    /** The bar as drawn, in user units. */
    draw: { x: number; y: number; w: number; h: number };
    /** Where a finger lands: the bar's length, and its share of the row including the gap beside it. */
    hit: { x: number; y: number; w: number; h: number };
}

interface BarShape {
    wide: number;
    notes: Note[];
    bars: Bar[];
    box: { w: number; h: number };
    /** The line every bar is centred on, in user units. */
    cy: number;
}

/**
 * The geometry, worked out once and read by `box`, `keys` and `draw`, so the rectangle a finger
 * lands in and the bar that was drawn cannot disagree. A bar's length goes as one over the square
 * root of its pitch, which is the physics of a bar in bending; the longest is three squares long for
 * every square of width, so the bottom bar is as long at every size relative to its width.
 */
export function barShape(
    p: Pick<GlockParams, "from" | "bars" | "wide"> & Partial<Pick<GlockParams, "mallet">>,
): BarShape {
    const wide = Math.max(1, Math.round(p.wide || 3));
    const count = Math.max(3, Math.min(15, Math.round(p.bars || 8)));
    const notes = whiteKeys(readNote(p.from) ?? noteOf("C5"), count);
    const longest = 3 * wide * U;
    const cy = (SIDE + 1.5 * wide) * U;
    const pitch = wide * U;
    const barW = BAR * pitch;
    const bars = notes.map((note, i): Bar => {
        const h = longest * 2 ** (-(note - (notes[0] ?? note)) / 24);
        const x = SIDE * U + i * pitch;
        return {
            note,
            draw: { x: x + (pitch - barW) / 2, y: cy - h / 2, w: barW, h },
            hit: { x, y: cy - h / 2, w: pitch, h },
        };
    });
    // One square more below the frame for the beater, which is where a child finds it lying.
    const below = p.mallet !== false && count >= 4 ? 1 : 0;
    return {
        wide,
        notes,
        bars,
        box: { w: count * wide + 2 * SIDE, h: 3 * wide + 2 * SIDE + below },
        cy,
    };
}

function capOf(p: GlockParams, n: Note, i: number, tonic: Note): string {
    if (p.labels === "none") return "";
    if (p.labels === "numbers") return String(i + 1);
    if (p.labels === "solfa") return solfaOf(n, tonic) ?? "";
    return letterOf(n);
}

/** A group the mount can find and show or hide, the same four kinds the keyboard draws. */
const layer = <G>(
    c: Ctx<G>,
    key: string,
    kind: "face" | "down" | "lit" | "focus",
    shown: boolean,
): G =>
    group(c, { data: { key, layer: kind }, ...(kind !== "face" && !shown ? { hidden: true } : {}) })
        .g;

const names = (list: readonly string[]): Note[] =>
    list.map(readNote).filter((n): n is Note => n !== null);

/** The calm line of .docs/shelf.md: one stroke to a line, the corners kept, for the frame and the beater. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** A bar with its corners rounded a little, as a cut and filed metal bar has them. */
const barPath = (x: number, y: number, w: number, h: number): string => {
    const r = Math.min(w, h) * 0.16;
    return (
        `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}` +
        `H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
    );
};

export const glockenspiel = defineInstrument<GlockParams>({
    id: "glockenspiel",
    family: "music",
    title: "Glockenspiel",
    group: "Inputs",
    about:
        "A glockenspiel that is played: metal bars on a wooden frame, long and low on the left and short " +
        "and high on the right, each with its letter stamped on it and pinned where it rests. Tap a bar " +
        "and it lights and rings, so the whole of it works with the volume at zero. Three squares to a " +
        "bar is the lesson size.",
    voice: "glock",
    params: {
        from: "C5",
        bars: 8,
        wide: 3,
        labels: "letters",
        down: [],
        lit: [],
        mallet: true,
        off: [],
    },
    settings: {
        from: { kind: "text", most: 3 },
        bars: { kind: "whole", min: 1, max: 13 },
        wide: { kind: "whole", min: 1, max: 5 },
        labels: { kind: "one of", of: LABELS },
        down: { kind: "words", most: 13 },
        lit: { kind: "words", most: 13 },
        mallet: { kind: "flag" },
        off: { kind: "words", most: 13 },
    },
    takes: [
        {
            label: "C to C, lesson size",
            params: {
                from: "C5",
                bars: 8,
                wide: 3,
                labels: "letters" as const,
                down: [],
                lit: [],
                mallet: true,
                off: [],
            },
        },
        {
            label: "One bar to play",
            params: {
                from: "C5",
                bars: 8,
                wide: 3,
                labels: "letters" as const,
                down: [],
                lit: ["G5"],
                mallet: true,
                off: [],
            },
        },
        {
            label: "F and B lifted off, for making up a tune",
            params: {
                from: "C5",
                bars: 8,
                wide: 3,
                labels: "letters" as const,
                down: [],
                lit: [],
                mallet: true,
                off: ["F5", "B5"],
            },
        },
        {
            label: "Two mallets, two bars",
            params: {
                from: "C5",
                bars: 8,
                wide: 3,
                labels: "none" as const,
                down: ["C5", "G5"],
                lit: [],
                mallet: false,
                off: [],
            },
        },
        {
            label: "Do to la, for singing",
            params: {
                from: "C5",
                bars: 6,
                wide: 3,
                labels: "solfa" as const,
                down: [],
                lit: [],
                mallet: true,
                off: [],
            },
        },
        {
            label: "Numbers, for the number keys",
            params: {
                from: "C5",
                bars: 8,
                wide: 3,
                labels: "numbers" as const,
                down: [],
                lit: [],
                mallet: true,
                off: [],
            },
        },
        // Five squares is a real child's bar, about 25 mm, and five bars is as much of one as a page holds.
        {
            label: "Life size, C to G",
            params: {
                from: "C5",
                bars: 5,
                wide: 5,
                labels: "letters" as const,
                down: [],
                lit: [],
                mallet: true,
                off: [],
            },
        },
        {
            label: "Too small to play",
            params: {
                from: "C5",
                bars: 8,
                wide: 2,
                labels: "none" as const,
                down: [],
                lit: [],
                mallet: false,
                off: [],
            },
        },
    ],
    box: (p) => barShape(p).box,

    keys(p) {
        const s = barShape(p);
        const off = new Set(names(p.off ?? []));
        return s.bars.flatMap((b, i): Key[] =>
            off.has(b.note)
                ? []
                : [
                      {
                          id: noteText(b.note),
                          note: b.note,
                          anchor: `bar(${noteText(b.note)})`,
                          label: capOf(p, b.note, i, s.notes[0] ?? b.note),
                          spoken: spokenNote(b.note),
                          raised: false,
                          hit: b.hit,
                      },
                  ],
        );
    },

    draw: (c, p) => {
        const { pen, g } = c;
        const s = barShape(p);
        const down = new Set(names(p.down ?? []));
        const lit = new Set(names(p.lit ?? []));
        const a: RawAnchors = {};
        const W = s.box.w * U,
            H = s.box.h * U;
        const first = s.bars[0],
            last = s.bars[s.bars.length - 1];
        if (!first || !last) return a;
        const margin = 0.45 * U;

        // The frame: a tray that narrows with the bars, so its outline is the outline of the instrument.
        // On paper it is a large area, so its hatch opens to twice the spacing and it stays light.
        const edge = (b: Bar, end: "top" | "bottom") =>
            end === "top" ? b.draw.y - margin : b.draw.y + b.draw.h + margin;
        const left = first.hit.x - 0.55 * U,
            right = last.hit.x + last.hit.w + 0.55 * U;
        const frame: [number, number][] = [
            [left, edge(first, "top")],
            [right, edge(last, "top")],
            [right, edge(last, "bottom")],
            [left, edge(first, "bottom")],
        ];
        pen.polygon(
            g,
            frame,
            "pencil",
            pen.fill(
                "tang",
                "hachure",
                c.paper ? { hachureGap: 10 } : { hachureGap: 5.5, hachureAngle: -12 },
            ),
            calm(c, 1.8),
        );

        // The two felt rails along the nodes, which show in the gaps between the bars.
        for (const at of [NODE, 1 - NODE]) {
            const y0 = first.draw.y + first.draw.h * at,
                y1 = last.draw.y + last.draw.h * at;
            const t = 0.18 * U;
            pen.polygon(
                g,
                [
                    [first.hit.x, y0 - t],
                    [last.hit.x + last.hit.w, y1 - t],
                    [last.hit.x + last.hit.w, y1 + t],
                    [first.hit.x, y0 + t],
                ],
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: c.paper ? 5 : 3 }),
                { strokeWidth: 1.1 },
            );
        }

        const size = Math.max(13, s.wide * 5.4);
        const lifted = new Set(names(p.off ?? []));
        s.bars.forEach((b, i) => {
            const id = noteText(b.note);
            const { x, y, w, h } = b.draw;
            const cx = x + w / 2;
            if (lifted.has(b.note)) {
                for (const at of [NODE, 1 - NODE])
                    pen.circle(g, cx, y + h * at, Math.max(5, 0.3 * U), "ruler", pen.fill("card"), {
                        strokeWidth: 1.2,
                    });
                return;
            }
            const face = layer(c, id, "face", true);
            pen.path(face, barPath(x, y, w, h), "ruler", pen.fill("card"), { strokeWidth: 1.7 });
            // A highlight down one side, which is what makes a white bar read as metal.
            pen.line(face, x + w * 0.2, y + h * 0.1, x + w * 0.2, y + h * 0.9, "ruler", {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
            });
            for (const at of [NODE, 1 - NODE]) {
                pen.circle(face, cx, y + h * at, Math.max(5, 0.3 * U), "ruler", pen.fill("card"), {
                    strokeWidth: 1.2,
                });
            }
            const cap = capOf(p, b.note, i, s.notes[0] ?? b.note);
            const capY = y + h * 0.66;
            if (cap)
                letter(
                    { ...c, g: face },
                    {
                        x: cx,
                        y: capY + size * 0.35,
                        s: cap,
                        face: "read",
                        weight: 600,
                        size,
                        fill: c.t.ink,
                        anchor: "middle",
                    },
                );

            // Struck: a short bar of highlighter between the upper pin and the middle, clear of the letter,
            // for the reason the keyboard's pressed mark sits where it does: a wash over the whole bar
            // would turn to hatching on paper and bury the letter.
            const wash = layer(c, id, "down", down.has(b.note));
            pen.rect(
                wash,
                cx - w * 0.28,
                y + h * 0.33,
                w * 0.56,
                h * 0.15,
                "ruler",
                pen.fill("glow"),
                { strokeWidth: 1.4 },
            );

            const ring = layer(c, id, "lit", lit.has(b.note));
            pen.ellipse(ring, cx, capY, w * 1.0, Math.max(size * 2.2, h * 0.3), "doodle", null, {
                strokeWidth: 2.6,
                stroke: c.t.pen,
            });

            const focus = layer(c, id, "focus", false);
            pen.rect(focus, x - 3, y - 3, w + 6, h + 6, "ruler", null, {
                strokeWidth: 1.8,
                stroke: c.t.pen,
                strokeLineDash: [5, 4],
            });

            a[`bar(${id})`] = [cx, y, "up"];
        });

        // The beater, lying parallel to the frame's lower edge under the short bars, only where it clears
        // the frame and stays inside the box. Nothing a child counts is touched by it.
        if (p.mallet && s.bars.length >= 4) {
            const head = 0.46 * U;
            const long = Math.min(6 * U, (right - left) * 0.42);
            const x1 = right - 0.7 * U - head,
                x0 = x1 - long;
            const lower = (x: number) =>
                edge(first, "bottom") +
                (edge(last, "bottom") - edge(first, "bottom")) * ((x - left) / (right - left));
            const gap = 0.6 * U + head;
            const y0 = lower(x0) + gap,
                y1 = lower(x1) + gap;
            if (Math.max(y0, y1) + head + 0.15 * U <= H && x0 > left) {
                pen.line(g, x0, y0, x1, y1, "ruler", { ...calm(c, 3.2), stroke: c.t.tang });
                pen.line(g, x0, y0, x1, y1, "ruler", { ...calm(c, 1.1), stroke: c.t.ink });
                pen.circle(
                    g,
                    x1 + head * 0.6,
                    y1,
                    head * 2,
                    "ruler",
                    pen.fill("berry"),
                    calm(c, 1.5),
                );
                a.mallet = [x1, y1, "down"];
            }
        }

        a.top = [W / 2, 0, "up"];
        a.under = [W / 2, H, "down"];
        return a;
    },
    describe: (p) =>
        `A glockenspiel of ${p.bars} metal bars on a wooden frame, long and low on the left to short and high on the right${p.labels === "none" ? "" : ", each bar lettered"}${p.mallet ? ", a mallet beside it" : ""}.`,
});
