// The construction of one figure for every person the shelf draws: the build by age, the head with
// its hair and face, hands, arms, legs and the aids, and `placePerson`, which draws one at another
// size inside a group drawing. A look (skin tone, hair, age, glasses, a hearing aid, a mobility aid)
// is a setting and never a separate drawing, so any line-up a lesson draws can hold any child. The
// drawing itself is person.ts; the kit and its rules are in .docs/shelf.md.
import { Pen, type Fill, type PenOptions } from "../../ink/pen";
import { group, part, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import {
    HAIR,
    HAIR_COLOURS,
    MARKERS,
    SKIN,
    type HairColour,
    type Level,
    type Marker,
} from "../../paper";
import { drawProp } from "../props";
import { MOODS, type Mood } from "../speech";

type Pt = [number, number];

export const HAIRS = [
    "short",
    "crop",
    "curly",
    "coily",
    "puffs",
    "bun",
    "braids",
    "long",
    "bob",
    "bald",
    "scarf",
] as const;
export type Hair = (typeof HAIRS)[number];
export const POSES = [
    "stand",
    "wave",
    "point",
    "hold",
    "think",
    "cheer",
    "sit",
    "walk",
    "run",
] as const;
export type Pose = (typeof POSES)[number];
export const AGES = ["child", "grownup", "older"] as const;
export type Age = (typeof AGES)[number];
export const AIDS = ["none", "wheelchair", "crutches", "cane"] as const;
export type Aid = (typeof AIDS)[number];
export const HEARING = ["none", "aid", "implant"] as const;
export type Hearing = (typeof HEARING)[number];
export const WEAR = ["trousers", "dress"] as const;

/**
 * Heights above the ground and half-widths, in drawing units. A child's head is a quarter of their
 * height, a school child rather than a toddler, and a grown-up's about a fifth.
 */
export interface Build {
    r: number;
    head: number;
    shoulder: number;
    hip: number;
    sw: number;
    hw: number;
    leg: number;
    gap: number;
    ua: number;
    fa: number;
    arm: number;
    hand: number;
    seat: number;
}
const BUILD: Record<Age, Build> = {
    child: {
        r: 12.5,
        head: 86,
        shoulder: 67,
        hip: 39,
        sw: 11.5,
        hw: 12.5,
        leg: 4.6,
        gap: 1.3,
        ua: 15,
        fa: 14,
        arm: 3.3,
        hand: 4.1,
        seat: 27,
    },
    grownup: {
        r: 13,
        head: 129,
        shoulder: 110,
        hip: 66,
        sw: 15.5,
        hw: 14.5,
        leg: 5.8,
        gap: 1.6,
        ua: 21,
        fa: 20,
        arm: 3.9,
        hand: 4.6,
        seat: 36,
    },
    older: {
        r: 13,
        head: 124,
        shoulder: 105,
        hip: 63,
        sw: 15.5,
        hw: 15.5,
        leg: 5.8,
        gap: 1.6,
        ua: 20,
        fa: 19,
        arm: 3.9,
        hand: 4.6,
        seat: 36,
    },
};

export interface PersonParams {
    pose: string;
    age: string;
    /** 1 (lightest) to 6 (deepest). */
    tone: number;
    hair: string;
    colour: string;
    top: string;
    wear: string;
    glasses: boolean;
    hearing: string;
    aid: string;
    mood: string;
    /** Which way a pointing arm, a wave or a wheelchair faces: 1 to the right, -1 to the left. */
    dir: number;
    holding: string;
}

export const pick = <T extends string>(list: readonly T[], v: string, fallback: T): T =>
    list.find((x) => x === v) ?? fallback;
const toneOf = (n: number) =>
    SKIN[Math.max(0, Math.min(SKIN.length - 1, Math.round(n) - 1))] ?? {
        screen: "#D5AB86",
        print: "#E4E4E4",
    };
const markerOf = (v: string): Marker => MARKERS.find((m) => m === v) ?? "sky";
/** A second marker for a thing worn beside the top (a scarf, a band, a frame), never the same one. */
const beside = (m: Marker, k = 2): Marker =>
    MARKERS[(MARKERS.indexOf(m) + k) % MARKERS.length] ?? "mint";

export interface Look {
    age: Age;
    b: Build;
    tone: number;
    hair: Hair;
    colour: HairColour;
    top: Marker;
    dress: boolean;
    glasses: boolean;
    hearing: Hearing;
    aid: Aid;
    mood: Mood;
    dir: 1 | -1;
}

export function lookOf(p: PersonParams): Look {
    const age = pick(AGES, p.age, "child");
    const hair = pick(HAIRS, p.hair, "short");
    return {
        age,
        b: BUILD[age],
        tone: p.tone,
        hair,
        colour: pick(HAIR_COLOURS, p.colour, "brown"),
        top: markerOf(p.top),
        dress: p.wear === "dress",
        glasses: p.glasses,
        hearing: hair === "scarf" ? "none" : pick(HEARING, p.hearing, "none"),
        aid: pick(AIDS, p.aid, "none"),
        mood: pick(MOODS, p.mood, "happy"),
        dir: p.dir < 0 ? -1 : 1,
    };
}

const skin = <G>(c: Ctx<G>, tone: number): Fill => ({
    fill: c.paper ? toneOf(tone).print : toneOf(tone).screen,
    fillStyle: "solid",
});

function hairFill<G>(c: Ctx<G>, colour: HairColour): Fill {
    const h = HAIR[colour];
    if (!c.paper) return { fill: h.screen, fillStyle: "solid" };
    if (h.print === "open") return { fill: c.t.card, fillStyle: "solid" };
    if (h.print === "dots")
        return { fill: c.t.ink, fillStyle: "dots", hachureGap: 3.4, fillWeight: 0.9 };
    return {
        fill: c.t.ink,
        fillStyle: "hachure",
        hachureAngle: 60,
        hachureGap: h.print,
        fillWeight: 0.7,
    };
}

/**
 * Trousers and leggings in the grid's own blue-grey, so the top and the face stay the loud things. On
 * paper they are a flat light grey, a value like skin rather than a colour a question tells apart.
 */
const bottoms = <G>(c: Ctx<G>): Fill => ({ fill: c.t.grid, fillStyle: "solid" });

/**
 * A figure is drawn with one stroke to a line and the pen's wobble turned down, as the lantern mark
 * is: at a figure's size the shelf's double pencil line turns a sleeve or a cheek into fur.
 */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});
/** One stroke, with its corners kept where they are drawn so a single line closes. */
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** The outline of a limb of half-width w along a polyline: mitred joints and a round end at each end. */
function limb(pts: Pt[], w: number, ends: [boolean, boolean] = [true, false]): Pt[] {
    const left: Pt[] = [],
        right: Pt[] = [];
    const angle = (i: number) => {
        const p = pts[i] ?? [0, 0],
            q = pts[i + 1] ?? p,
            o = pts[i - 1] ?? p;
        return pts[i + 1]
            ? Math.atan2(q[1] - p[1], q[0] - p[0])
            : Math.atan2(p[1] - o[1], p[0] - o[0]);
    };
    pts.forEach((p, i) => {
        const a = i ? angle(i - 1) : angle(0),
            b = angle(i);
        const m = (a + b) / 2 + (Math.abs(a - b) > Math.PI ? Math.PI : 0);
        const k = w / Math.max(0.5, Math.cos((b - a) / 2));
        left.push([p[0] + Math.sin(m) * k, p[1] - Math.cos(m) * k]);
        right.push([p[0] - Math.sin(m) * k, p[1] + Math.cos(m) * k]);
    });
    const cap = (at: Pt, a: number, from: number): Pt[] =>
        Array.from({ length: 7 }, (_, j) => {
            const t = a + from + (j / 6) * Math.PI;
            return [at[0] + Math.cos(t) * w, at[1] + Math.sin(t) * w];
        });
    const first = pts[0] ?? [0, 0],
        last = pts[pts.length - 1] ?? first;
    const endCap = ends[1] ? cap(last, angle(pts.length - 1), -Math.PI / 2) : [];
    const startCap = ends[0] ? cap(first, angle(0), Math.PI / 2) : [];
    return [...left, ...endCap, ...right.reverse(), ...startCap];
}

/** A path through points with the corners rounded, for a body that should not look cut out. */
function soft(pts: Pt[], round = 0.35): string {
    const n = pts.length;
    let d = "";
    for (let i = 0; i < n; i++) {
        const p = pts[i] ?? [0, 0],
            a = pts[(i - 1 + n) % n] ?? p,
            b = pts[(i + 1) % n] ?? p;
        const s: Pt = [p[0] + (a[0] - p[0]) * round, p[1] + (a[1] - p[1]) * round];
        const e: Pt = [p[0] + (b[0] - p[0]) * round, p[1] + (b[1] - p[1]) * round];
        d += `${i ? "L" : "M"}${s[0].toFixed(1)} ${s[1].toFixed(1)}Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
    }
    return `${d}Z`;
}

/** A closed path round a centre with `n` bumps, for curls and a puff of coils. */
function bumpy(cx: number, cy: number, rx: number, ry: number, n: number, bump: number): string {
    const at = (t: number, k = 1): Pt => [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k];
    const start = at(0);
    let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
        const t0 = (i / n) * Math.PI * 2,
            t1 = ((i + 1) / n) * Math.PI * 2;
        const mid = at((t0 + t1) / 2, 1 + bump),
            end = at(t1);
        d += `Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
    }
    return `${d}Z`;
}

/** Features are a little heavier on the two deepest tones, where the ink sits on less contrast. */
const featureWeight = (tone: number, w: number) => (tone >= 5 ? w * 1.25 : w);

/** Hair that sits behind the head: long hair down the back, a bob, braids, a puff of coils, bunches, a bun. */
function hairBehind<G>(c: Ctx<G>, x: number, cy: number, r: number, look: Look): void {
    const { pen, g } = c,
        f = hairFill(c, look.colour),
        o = calm(c, 1.6);
    if (look.hair === "long") {
        pen.path(
            g,
            `M${x - r * 1.02} ${cy - r * 0.35}Q${x - r * 1.32} ${cy + r * 0.9} ${x - r * 1.24} ${cy + r * 2.2}Q${x - r * 0.6} ${cy + r * 2.36} ${x} ${cy + r * 2.14}` +
                `Q${x + r * 0.6} ${cy + r * 2.36} ${x + r * 1.24} ${cy + r * 2.2}Q${x + r * 1.32} ${cy + r * 0.9} ${x + r * 1.02} ${cy - r * 0.35}Z`,
            "pencil",
            f,
            o,
        );
    } else if (look.hair === "bob") {
        pen.path(
            g,
            `M${x - r * 1.06} ${cy - r * 0.3}Q${x - r * 1.24} ${cy + r * 0.55} ${x - r * 1.12} ${cy + r * 0.98}Q${x} ${cy + r * 1.06} ${x + r * 1.12} ${cy + r * 0.98}Q${x + r * 1.24} ${cy + r * 0.55} ${x + r * 1.06} ${cy - r * 0.3}Z`,
            "pencil",
            f,
            o,
        );
    } else if (look.hair === "coily") {
        pen.path(g, bumpy(x, cy - r * 0.34, r * 1.48, r * 1.3, 12, 0.07), "pencil", f, o);
        if (!c.paper)
            for (const [dx, dy] of [
                [-1.05, -0.95],
                [-0.45, -1.4],
                [0.3, -1.42],
                [0.95, -1.05],
                [-1.25, -0.2],
                [1.24, -0.3],
            ] as const) {
                plain(c, {
                    kind: "circle",
                    cx: x + dx * r,
                    cy: cy + dy * r,
                    r: r * 0.1,
                    fill: "none",
                    stroke: HAIR[look.colour].strand,
                    width: 0.9,
                });
            }
    } else if (look.hair === "puffs") {
        for (const s of [-1, 1])
            pen.path(
                g,
                bumpy(x + s * r * 1.0, cy - r * 0.8, r * 0.62, r * 0.6, 8, 0.1),
                "pencil",
                f,
                o,
            );
    } else if (look.hair === "bun") {
        pen.circle(g, x, cy - r * 1.22, r * 1.0, "pencil", f, o);
    } else if (look.hair === "braids") {
        for (const s of [-1, 1]) {
            for (let k = 0; k < 4; k++)
                pen.ellipse(
                    g,
                    x + s * r * (0.95 + k * 0.02),
                    cy + r * (0.5 + k * 0.42),
                    r * 0.44,
                    r * 0.5,
                    "ruler",
                    f,
                    { strokeWidth: 1.3, ...FIRM },
                );
            pen.rect(
                g,
                x + s * r * 1.03 - r * 0.2,
                cy + r * 2.0,
                r * 0.4,
                r * 0.18,
                "ruler",
                c.pen.fill(beside(look.top, 1)),
                { strokeWidth: 1, ...FIRM },
            );
            pen.path(
                g,
                `M${x + s * r * 1.03 - r * 0.16} ${cy + r * 2.18}L${x + s * r * 1.03} ${cy + r * 2.5}L${x + s * r * 1.03 + r * 0.16} ${cy + r * 2.18}Z`,
                "ruler",
                f,
                { strokeWidth: 1, ...FIRM },
            );
        }
    }
}

/** A headscarf's drape over the neck and shoulders, drawn after the body so it lies over it. */
function scarfDrape<G>(c: Ctx<G>, x: number, cy: number, r: number, look: Look): void {
    c.pen.path(
        c.g,
        `M${x - r * 1.16} ${cy - r * 0.1}Q${x - r * 1.3} ${cy + r * 1.2} ${x - r * 1.55} ${cy + r * 2.05}Q${x} ${cy + r * 2.45} ${x + r * 1.55} ${cy + r * 2.05}` +
            `Q${x + r * 1.3} ${cy + r * 1.2} ${x + r * 1.16} ${cy - r * 0.1}A${r * 1.18} ${r * 1.22} 0 0 0 ${x - r * 1.16} ${cy - r * 0.1}Z`,
        "pencil",
        c.pen.fill(beside(look.top)),
        calm(c, 1.6),
    );
}

/** The hood of a headscarf, drawn whole before the face, which is then drawn inside it. */
function scarfHood<G>(c: Ctx<G>, x: number, cy: number, r: number, look: Look): void {
    c.pen.path(
        c.g,
        `M${x - r * 1.18} ${cy + r * 0.95}Q${x - r * 1.34} ${cy - r * 0.65} ${x} ${cy - r * 1.26}Q${x + r * 1.34} ${cy - r * 0.65} ${x + r * 1.18} ${cy + r * 0.95}Q${x} ${cy + r * 1.55} ${x - r * 1.18} ${cy + r * 0.95}Z`,
        "pencil",
        c.pen.fill(beside(look.top)),
        calm(c, 1.6),
    );
}

/** Hair that sits on the head, in front of it: the cap, the fringe and the curls round the face. */
function hairOver<G>(c: Ctx<G>, x: number, cy: number, r: number, look: Look): void {
    const { pen, g } = c,
        f = hairFill(c, look.colour),
        o = calm(c, 1.5);
    const strands = (pts: [Pt, Pt, Pt][]) => {
        for (const q of pts)
            pen.curve(g, q, "ruler", {
                strokeWidth: c.paper ? 0.7 : 0.9,
                stroke: c.paper ? c.t.ink : HAIR[look.colour].strand,
                ...FIRM,
            });
    };
    const at = (rr: number, t: number): Pt => [x + Math.cos(t) * rr, cy + Math.sin(t) * rr];
    const arcOver = (rr: number, from: number, to: number) => {
        const p = at(rr, from),
            q = at(rr, to);
        return `M${p[0]} ${p[1]}A${rr} ${rr} 0 0 1 ${q[0]} ${q[1]}`;
    };
    switch (look.hair) {
        case "short": {
            const s = at(r * 1.07, Math.PI * 1.03);
            pen.path(
                g,
                `${arcOver(r * 1.07, Math.PI * 1.03, Math.PI * 1.97)}Q${x + r * 0.78} ${cy - r * 0.62} ${x + r * 0.28} ${cy - r * 0.5}Q${x - r * 0.3} ${cy - r * 0.34} ${x - r * 0.55} ${cy - r * 0.52}Q${x - r * 0.9} ${cy - r * 0.3} ${s[0]} ${s[1]}Z`,
                "pencil",
                f,
                o,
            );
            strands([
                [
                    [x - r * 0.1, cy - r * 1.0],
                    [x + r * 0.2, cy - r * 0.8],
                    [x + r * 0.35, cy - r * 0.58],
                ],
                [
                    [x + r * 0.35, cy - r * 0.98],
                    [x + r * 0.62, cy - r * 0.78],
                    [x + r * 0.72, cy - r * 0.58],
                ],
            ]);
            break;
        }
        case "crop": {
            const s = at(r * 1.03, Math.PI * 1.08);
            pen.path(
                g,
                `${arcOver(r * 1.03, Math.PI * 1.08, Math.PI * 1.92)}Q${x + r * 0.7} ${cy - r * 0.66} ${x} ${cy - r * 0.68}Q${x - r * 0.7} ${cy - r * 0.66} ${s[0]} ${s[1]}Z`,
                "pencil",
                f,
                o,
            );
            break;
        }
        case "curly": {
            const s = at(r * 1.0, Math.PI * 1.02);
            pen.path(
                g,
                `${arcOver(r * 1.0, Math.PI * 1.02, Math.PI * 1.98)}Q${x} ${cy - r * 0.6} ${s[0]} ${s[1]}Z`,
                "pencil",
                f,
                { ...calm(c, 0.1), stroke: "none" },
            );
            for (let k = 0; k <= 8; k++) {
                const t = Math.PI * (1.0 + k / 8),
                    edge = k === 0 || k === 8,
                    p = at(r * 0.98, t);
                pen.circle(
                    g,
                    p[0],
                    p[1] + (edge ? r * 0.1 : 0),
                    (edge ? r * 0.3 : r * 0.36) * 2,
                    "ruler",
                    f,
                    { strokeWidth: 1.2, ...FIRM },
                );
            }
            for (const [dx, dy] of [
                [-0.42, -0.6],
                [0.05, -0.68],
                [0.5, -0.58],
            ] as const)
                pen.circle(g, x + dx * r, cy + dy * r, r * 0.52, "ruler", f, {
                    strokeWidth: 1.1,
                    ...FIRM,
                });
            break;
        }
        case "coily":
            pen.path(
                g,
                `${arcOver(r * 1.01, Math.PI, Math.PI * 2)}Q${x + r * 0.9} ${cy - r * 0.42} ${x + r * 0.45} ${cy - r * 0.58}Q${x} ${cy - r * 0.7} ${x - r * 0.45} ${cy - r * 0.58}Q${x - r * 0.9} ${cy - r * 0.42} ${x - r * 1.01} ${cy}Z`,
                "pencil",
                f,
                calm(c, 1.2),
            );
            break;
        case "puffs":
        case "bun":
        case "braids": {
            const s = at(r * 1.03, Math.PI * 1.03);
            pen.path(
                g,
                `${arcOver(r * 1.03, Math.PI * 1.03, Math.PI * 1.97)}Q${x + r * 0.62} ${cy - r * 0.5} ${x + r * 0.08} ${cy - r * 0.64}Q${x - r * 0.62} ${cy - r * 0.5} ${s[0]} ${s[1]}Z`,
                "pencil",
                f,
                o,
            );
            pen.line(g, x + r * 0.05, cy - r * 1.02, x + r * 0.08, cy - r * 0.66, "ruler", {
                strokeWidth: 1,
                stroke: c.paper ? c.t.card : HAIR[look.colour].strand,
                ...FIRM,
            });
            if (look.hair === "bun")
                pen.rect(
                    g,
                    x - r * 0.3,
                    cy - r * 1.05,
                    r * 0.6,
                    r * 0.14,
                    "ruler",
                    c.pen.fill(beside(look.top, 1)),
                    { strokeWidth: 1, ...FIRM },
                );
            break;
        }
        case "long":
            pen.path(
                g,
                `${arcOver(r * 1.06, Math.PI, Math.PI * 2)}Q${x + r * 0.95} ${cy - r * 0.3} ${x + r * 0.5} ${cy - r * 0.52}Q${x - r * 0.1} ${cy - r * 0.78} ${x - r * 0.62} ${cy - r * 0.2}Q${x - r * 0.9} ${cy + r * 0.2} ${x - r * 1.06} ${cy}Z`,
                "pencil",
                f,
                o,
            );
            strands([
                [
                    [x - r * 0.5, cy - r * 0.85],
                    [x - r * 0.72, cy - r * 0.45],
                    [x - r * 0.8, cy],
                ],
                [
                    [x + r * 0.2, cy - r * 0.98],
                    [x + r * 0.6, cy - r * 0.8],
                    [x + r * 0.85, cy - r * 0.35],
                ],
            ]);
            break;
        case "bob": {
            const q = at(r * 1.08, Math.PI * 1.94);
            pen.path(
                g,
                `M${x - r * 1.07} ${cy + r * 0.8}V${cy - r * 0.2}A${r * 1.08} ${r * 1.08} 0 0 1 ${q[0]} ${q[1]}V${cy + r * 0.8}` +
                    `H${x + r * 0.84}V${cy - r * 0.3}Q${x} ${cy - r * 0.46} ${x - r * 0.84} ${cy - r * 0.3}V${cy + r * 0.8}Z`,
                "pencil",
                f,
                o,
            );
            break;
        }
        case "bald":
            for (const s of [-1, 1])
                pen.path(
                    g,
                    `M${x + s * r * 1.0} ${cy + r * 0.12}Q${x + s * r * 1.12} ${cy - r * 0.35} ${x + s * r * 0.8} ${cy - r * 0.62}Q${x + s * r * 0.92} ${cy - r * 0.2} ${x + s * r * 0.86} ${cy + r * 0.1}Z`,
                    "ruler",
                    f,
                    { strokeWidth: 1.2, ...FIRM },
                );
            if (!c.paper)
                pen.arc(
                    g,
                    x - r * 0.3,
                    cy - r * 0.62,
                    r * 0.5,
                    r * 0.3,
                    Math.PI * 1.1,
                    Math.PI * 1.5,
                    "ruler",
                    { strokeWidth: 1.4, stroke: c.t.card, ...FIRM },
                );
            break;
        case "scarf":
            break;
    }
}

const showsEars = (hair: Hair) => hair !== "long" && hair !== "bob" && hair !== "scarf";

/** A head: the ears, the face in its tone, the hair, the features for a mood, and what is worn on it. */
function head<G>(c: Ctx<G>, x: number, cy: number, r: number, look: Look, drape: () => void): void {
    const { pen, g } = c,
        t = skin(c, look.tone),
        w = featureWeight(look.tone, 1.3);
    if (look.hair !== "long") hairBehind(c, x, cy, r, look);
    drape();
    const earSide = -look.dir;
    const ears = showsEars(look.hair) ? [-1, 1] : look.hearing !== "none" ? [earSide] : [];
    for (const s of ears)
        pen.ellipse(g, x + s * r * 0.97, cy + r * 0.14, r * 0.46, r * 0.56, "ruler", t, {
            strokeWidth: 1.3,
            ...FIRM,
        });
    if (look.hair === "scarf") {
        scarfHood(c, x, cy, r, look);
        pen.ellipse(g, x, cy + r * 0.08, r * 1.74, r * 1.96, "ruler", t, {
            strokeWidth: 1.4,
            ...FIRM,
        });
        pen.arc(g, x, cy + r * 0.08, r * 1.98, r * 2.2, Math.PI * 1.08, Math.PI * 1.92, "ruler", {
            strokeWidth: 1.1,
            ...FIRM,
        });
    } else pen.ellipse(g, x, cy, r * 2, r * 2.1, "ruler", t, { strokeWidth: 1.6, ...FIRM });
    hairOver(c, x, cy, r, look);

    const ey = cy + r * 0.1,
        ex = r * 0.36,
        dot = Math.max(3.1, r * 0.25),
        ink = c.t.ink;
    const m = look.mood;
    const catchlight = (e: Ctx<G>, cx: number, cy2: number, d: number) =>
        plain(e, {
            kind: "circle",
            cx: cx + d * 0.22,
            cy: cy2 - d * 0.22,
            r: d * 0.17,
            fill: c.t.card,
        });
    if (m === "tired" || m === "excited") {
        for (const s of [-1, 1]) {
            if (m === "tired")
                pen.arc(
                    g,
                    x + s * ex,
                    ey - r * 0.02,
                    r * 0.3,
                    r * 0.2,
                    0.2,
                    Math.PI - 0.2,
                    "ruler",
                    { strokeWidth: w, ...FIRM },
                );
            else
                pen.arc(
                    g,
                    x + s * ex,
                    ey + r * 0.06,
                    r * 0.3,
                    r * 0.26,
                    Math.PI + 0.2,
                    Math.PI * 2 - 0.2,
                    "ruler",
                    { strokeWidth: w * 1.1, ...FIRM },
                );
        }
    } else {
        const eyes = part(c, "eyes", [x, ey]);
        const wide = m === "scared" || m === "surprised";
        for (const s of [-1, 1]) {
            if (wide)
                pen.circle(eyes.g, x + s * ex, ey, r * 0.42, "ruler", c.pen.fill("card"), {
                    strokeWidth: w * 0.9,
                    ...FIRM,
                });
            const d = wide ? dot * 0.8 : dot;
            pen.circle(
                eyes.g,
                x + s * ex,
                ey,
                d,
                "ruler",
                { fill: ink, fillStyle: "solid" },
                { strokeWidth: 0.5, ...FIRM },
            );
            catchlight(eyes, x + s * ex, ey, d);
        }
    }
    const brow = (y: number, lift: number, len = 0.3) => {
        for (const s of [-1, 1])
            pen.line(
                g,
                x + s * (ex + r * len * 0.55),
                cy - y * r,
                x + s * (ex - r * len * 0.55),
                cy - (y + lift) * r,
                "ruler",
                { strokeWidth: w, ...FIRM },
            );
    };
    const browArc = (y: number) => {
        for (const s of [-1, 1])
            pen.arc(
                g,
                x + s * ex,
                cy - y * r,
                r * 0.36,
                r * 0.18,
                Math.PI * 1.15,
                Math.PI * 1.85,
                "ruler",
                { strokeWidth: w, ...FIRM },
            );
    };
    if (m === "happy" || m === "tired") brow(0.3, 0.02);
    else if (m === "excited" || m === "surprised") browArc(0.44);
    else if (m === "sad" || m === "worried") brow(0.28, 0.12);
    else if (m === "cross") brow(0.34, -0.14);
    else if (m === "scared") brow(0.46, 0.1);
    pen.curve(
        g,
        [
            [x - r * 0.04, cy + r * 0.3],
            [x + r * 0.08, cy + r * 0.42],
            [x - r * 0.05, cy + r * 0.47],
        ],
        "ruler",
        { strokeWidth: w * 0.85, ...FIRM },
    );
    const my = cy + r * 0.64;
    const mouth = (d: string, fill: Fill = null) =>
        pen.path(g, d, "ruler", fill, { strokeWidth: w, ...FIRM });
    if (m === "happy")
        mouth(
            `M${x - r * 0.26} ${my - r * 0.05}Q${x} ${my + r * 0.2} ${x + r * 0.26} ${my - r * 0.05}`,
        );
    else if (m === "excited")
        mouth(
            `M${x - r * 0.3} ${my - r * 0.1}H${x + r * 0.3}Q${x + r * 0.26} ${my + r * 0.3} ${x} ${my + r * 0.3}Q${x - r * 0.26} ${my + r * 0.3} ${x - r * 0.3} ${my - r * 0.1}Z`,
            c.pen.fill("berry"),
        );
    else if (m === "sad")
        mouth(
            `M${x - r * 0.22} ${my + r * 0.1}Q${x} ${my - r * 0.1} ${x + r * 0.22} ${my + r * 0.1}`,
        );
    else if (m === "cross")
        mouth(
            `M${x - r * 0.22} ${my + r * 0.04}Q${x} ${my - r * 0.03} ${x + r * 0.22} ${my + r * 0.04}`,
        );
    else if (m === "worried")
        pen.curve(
            g,
            [
                [x - r * 0.24, my],
                [x - r * 0.1, my - r * 0.06],
                [x + r * 0.04, my + r * 0.02],
                [x + r * 0.2, my - r * 0.05],
            ],
            "ruler",
            { strokeWidth: w, ...FIRM },
        );
    else if (m === "tired")
        pen.ellipse(g, x, my, r * 0.16, r * 0.12, "ruler", null, { strokeWidth: w, ...FIRM });
    else
        pen.ellipse(
            g,
            x,
            my + r * 0.04,
            r * (m === "surprised" ? 0.22 : 0.26),
            r * (m === "surprised" ? 0.28 : 0.16),
            "ruler",
            c.pen.fill("card"),
            { strokeWidth: w, ...FIRM },
        );
    if (!c.paper && m !== "cross" && m !== "sad")
        for (const s of [-1, 1])
            plain(c, {
                kind: "ellipse",
                cx: x + s * r * 0.62,
                cy: cy + r * 0.42,
                rx: r * 0.18,
                ry: r * 0.1,
                fill: c.t.berry,
                opacity: 0.45,
            });
    if (look.age === "older")
        for (const s of [-1, 1])
            pen.line(
                g,
                x + s * (ex + r * 0.2),
                ey + r * 0.02,
                x + s * (ex + r * 0.3),
                ey + r * 0.1,
                "ruler",
                { strokeWidth: 0.8, stroke: c.paper ? c.t.ink : c.t["ink-soft"], ...FIRM },
            );

    if (look.glasses) {
        for (const s of [-1, 1])
            pen.circle(g, x + s * ex, ey, r * 0.62, "ruler", null, { strokeWidth: 1.3, ...FIRM });
        pen.arc(g, x, ey - r * 0.02, r * 0.1, r * 0.1, Math.PI * 1.1, Math.PI * 1.9, "ruler", {
            strokeWidth: 1.2,
            ...FIRM,
        });
        for (const s of [-1, 1])
            pen.line(
                g,
                x + s * (ex + r * 0.31),
                ey - r * 0.04,
                x + s * r * 0.96,
                ey - r * 0.08,
                "ruler",
                { strokeWidth: 1.1, ...FIRM },
            );
    }
    if (look.hearing !== "none") {
        const s = earSide,
            hx = x + s * r * 1.12;
        pen.path(
            g,
            `M${hx} ${cy - r * 0.26}Q${hx + s * r * 0.26} ${cy - r * 0.1} ${hx + s * r * 0.08} ${cy + r * 0.42}Q${hx - s * r * 0.02} ${cy + r * 0.2} ${hx} ${cy - r * 0.26}Z`,
            "ruler",
            c.pen.fill("tang"),
            { strokeWidth: 1.1, ...FIRM },
        );
        if (look.hearing === "implant") {
            pen.line(g, hx + s * r * 0.02, cy - r * 0.24, x + s * r * 0.86, cy - r * 0.5, "ruler", {
                strokeWidth: 0.9,
                ...FIRM,
            });
            pen.circle(g, x + s * r * 0.84, cy - r * 0.56, r * 0.42, "ruler", c.pen.fill("tang"), {
                strokeWidth: 1.1,
                ...FIRM,
            });
        }
    }
}

type HandShape = "fist" | "open" | "point";

/** A hand in the person's tone, laid along the forearm: a mitten, an open palm with its thumb, or a pointing finger. */
function hand<G>(c: Ctx<G>, from: Pt, at: Pt, r: number, tone: number, shape: HandShape): Pt {
    const { pen, g } = c,
        t = skin(c, tone),
        o = { strokeWidth: 1.3, ...FIRM };
    const a = Math.atan2(at[1] - from[1], at[0] - from[0]);
    const along = (d: number, side = 0, turn = 0): Pt => [
        at[0] + Math.cos(a + turn) * d - Math.sin(a) * side,
        at[1] + Math.sin(a + turn) * d + Math.cos(a) * side,
    ];
    if (shape === "open") {
        const inward = Math.cos(a) > 0 ? -1 : 1;
        pen.polygon(
            g,
            limb(
                [along(0, inward * r * 0.45), along(r * 1.2, inward * r * 0.95, inward * -0.9)],
                r * 0.36,
                [true, true],
            ),
            "ruler",
            t,
            o,
        );
        pen.polygon(
            g,
            limb([along(-r * 0.2), along(r * 1.2)], r * 0.92, [true, true]),
            "ruler",
            t,
            o,
        );
        return along(r * 2.1);
    }
    if (shape === "point") {
        const tip = along(r * 2.6);
        pen.polygon(
            g,
            limb([along(r * 0.2, -r * 0.2), tip], r * 0.38, [true, true]),
            "ruler",
            t,
            o,
        );
        pen.circle(g, at[0], at[1], r * 1.9, "ruler", t, o);
        return tip;
    }
    pen.circle(g, at[0], at[1], r * 2, "ruler", t, o);
    return at;
}

type ArmKey =
    | "rest"
    | "wave"
    | "point"
    | "hold"
    | "chin"
    | "up"
    | "lap"
    | "grip"
    | "cane"
    | "wheel"
    | "pump"
    | "drive"
    | "raise"
    | "race";

/** Where an arm on side s bends and ends, from the shoulder, for each thing an arm can do. */
function armPoints(
    key: ArmKey,
    s: number,
    S: Pt,
    b: Build,
    x: number,
    o: { headY: number; hipY: number; grip: Pt; wheel?: Pt },
): [Pt, Pt] {
    const { ua, fa } = b;
    switch (key) {
        case "rest": {
            const E: Pt = [S[0] + s * 3.5, S[1] + ua];
            return [E, [E[0] + s * 1.5, E[1] + fa]];
        }
        case "wave": {
            const E: Pt = [S[0] + s * ua * 0.82, S[1] - ua * 0.28];
            return [E, [E[0] + s * 2.5, E[1] - fa * 0.92]];
        }
        case "point": {
            const E: Pt = [S[0] + s * ua * 0.98, S[1] + 2];
            return [E, [E[0] + s * fa * 0.95, E[1] - 1]];
        }
        case "hold": {
            const E: Pt = [S[0] + s * 3, S[1] + ua * 0.92];
            return [E, [x + s * b.hand * 1.4, E[1] - fa * 0.2]];
        }
        case "chin": {
            const E: Pt = [S[0] + s * 4, S[1] + ua * 0.85];
            return [E, [x + s * b.r * 0.42, o.headY + b.r * 1.05]];
        }
        case "up": {
            const E: Pt = [S[0] + s * ua * 0.55, S[1] - ua * 0.78];
            return [E, [E[0] + s * fa * 0.3, E[1] - fa * 0.88]];
        }
        case "lap": {
            const E: Pt = [S[0] + s * 3, S[1] + ua * 0.92];
            return [E, [x + s * b.hand * 1.8, o.hipY - 1]];
        }
        case "grip":
            return [[S[0] + s * 7, S[1] + ua * 0.72], o.grip];
        case "cane":
            return [[S[0] + s * 5, S[1] + ua * 0.9], o.grip];
        case "wheel": {
            const H = o.wheel ?? [S[0], S[1] + ua + fa];
            return [[S[0] + s * 4, S[1] + ua * 0.8], H];
        }
        case "pump": {
            const E: Pt = [S[0] + s * ua * 0.45, S[1] + ua * 0.85];
            return [E, [E[0] + s * fa * 0.75, E[1] - fa * 0.62]];
        }
        case "drive": {
            const E: Pt = [S[0] + s * ua * 0.62, S[1] + ua * 0.72];
            return [E, [E[0] + s * fa * 0.35, E[1] + fa * 0.88]];
        }
        case "raise": {
            const E: Pt = [S[0] + s * ua * 0.55, S[1] + ua * 0.8];
            return [E, [E[0] + s, E[1] - fa * 0.8]];
        }
        case "race": {
            const H: Pt = o.wheel ?? [S[0], S[1] + ua + fa],
                away = H[0] < S[0] ? 1 : -1;
            return [[S[0] + (H[0] - S[0]) * 0.3 + away * 4, S[1] + (H[1] - S[1]) * 0.55], H];
        }
    }
}

/** The top: shoulders, the roots of the sleeves and a hem, as one soft shape; a dress carries on to the knee. A lean moves the shoulders and leaves the hem. */
function top<G>(
    c: Ctx<G>,
    x: number,
    shoulderY: number,
    hemY: number,
    b: Build,
    look: Look,
    lean = 0,
): void {
    const flare = look.dress ? 7 : 1,
        u = x + lean;
    const pts: Pt[] = [
        [x - b.hw - flare, hemY],
        [u - b.sw - 0.5 - lean * 0.2, shoulderY + 7],
        [u - b.sw + 2.5, shoulderY],
        [u - b.r * 0.35, shoulderY - 1],
        [u, shoulderY + 3.5],
        [u + b.r * 0.35, shoulderY - 1],
        [u + b.sw - 2.5, shoulderY],
        [u + b.sw + 0.5 - lean * 0.2, shoulderY + 7],
        [x + b.hw + flare, hemY],
    ];
    c.pen.path(c.g, soft(pts, 0.32), "pencil", c.pen.fill(look.top), calm(c, 1.7));
    c.pen.curve(
        c.g,
        [
            [u - b.r * 0.34, shoulderY - 0.5],
            [u, shoulderY + 3.8],
            [u + b.r * 0.34, shoulderY - 0.5],
        ],
        "ruler",
        { strokeWidth: 1.1, ...FIRM },
    );
}

const shoe = <G>(c: Ctx<G>, cx: number, cy: number, w: number) =>
    c.pen.ellipse(
        c.g,
        cx,
        cy,
        w,
        5.2,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1.1, ...FIRM },
    );

function standingLegs<G>(c: Ctx<G>, x: number, base: number, b: Build, look: Look): void {
    const hipY = base - b.hip,
        ank = base - 4.5,
        g2 = b.gap,
        L = b.leg;
    if (look.dress) {
        for (const s of [-1, 1])
            c.pen.polygon(
                c.g,
                limb(
                    [
                        [x + s * (g2 + L), base - b.hip * 0.62],
                        [x + s * (g2 + L * 0.95), ank],
                    ],
                    L * 0.82,
                    [false, false],
                ),
                "pencil",
                bottoms(c),
                calm(c, 1.4),
            );
    } else {
        c.pen.path(
            c.g,
            soft(
                [
                    [x - b.hw + 1, hipY - 2],
                    [x + b.hw - 1, hipY - 2],
                    [x + g2 + L * 2 + 0.6, ank],
                    [x + g2, ank],
                    [x, hipY + b.hip * 0.28],
                    [x - g2, ank],
                    [x - g2 - L * 2 - 0.6, ank],
                ],
                0.12,
            ),
            "pencil",
            bottoms(c),
            calm(c, 1.6),
        );
    }
    for (const s of [-1, 1]) shoe(c, x + s * (g2 + L + 1.2), base - 2.6, L * 2 + 3.5);
}

function seatedLegs<G>(c: Ctx<G>, x: number, base: number, hipY: number, b: Build): void {
    const { pen, g } = c;
    for (const s of [-1, 1]) {
        const kx = x + s * (b.gap + b.leg + 0.8);
        pen.polygon(
            g,
            limb(
                [
                    [kx, hipY + 5],
                    [kx + s * 0.6, base - 4.5],
                ],
                b.leg,
                [false, false],
            ),
            "pencil",
            bottoms(c),
            calm(c, 1.5),
        );
        pen.ellipse(g, kx, hipY + 4, b.leg * 2.3, b.leg * 1.9, "ruler", bottoms(c), {
            strokeWidth: 1.4,
            ...FIRM,
        });
        shoe(c, kx + s * 1.8, base - 2.6, b.leg * 2 + 3.5);
    }
}

/**
 * Legs seen from the side in mid-stride, the front one reaching and the back one pushing off, for a
 * walk or a run. The trousers are a leg each here, since a stride parts them.
 */
function strideLegs<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    hipY: number,
    b: Build,
    look: Look,
    run: boolean,
): void {
    const { pen, g } = c,
        s = look.dir,
        h = b.hip,
        w = look.dress ? b.leg * 0.82 : b.leg + 0.3;
    const top = hipY + (look.dress ? h * 0.3 : -1);
    // hip, knee, ankle, and the way the foot points from the ankle; the leg behind is drawn first
    const legs: [Pt, Pt, Pt, Pt][] = run
        ? [
              [
                  [x - s * 2, top],
                  [x - s * h * 0.2, hipY + h * 0.46],
                  [x - s * h * 0.62, hipY + h * 0.6],
                  [s * 0.2, 1],
              ],
              [
                  [x + s * 2, top],
                  [x + s * h * 0.5, hipY + h * 0.2],
                  [x + s * h * 0.4, hipY + h * 0.66],
                  [s, 0.25],
              ],
          ]
        : [
              [
                  [x - s * 1.5, top],
                  [x - s * h * 0.08, hipY + h * 0.5],
                  [x - s * h * 0.3, base - 10],
                  [s * 0.9, 1],
              ],
              [
                  [x + s * 1.5, top],
                  [x + s * h * 0.16, hipY + h * 0.5],
                  [x + s * h * 0.3, base - 4.5],
                  [s, 0],
              ],
          ];
    for (const [H, K, A, t] of legs) {
        pen.polygon(g, limb([H, K, A], w, [true, false]), "pencil", bottoms(c), calm(c, 1.6));
        const n = Math.hypot(t[0], t[1]),
            u: Pt = [t[0] / n, t[1] / n],
            len = b.leg * 2 + 3;
        const heel: Pt = [A[0] - u[0] * 2.5, A[1] - u[1] * 2.5 + 2];
        pen.polygon(
            g,
            limb([heel, [heel[0] + u[0] * len, heel[1] + u[1] * len]], 2.7, [true, true]),
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1.1, ...FIRM },
        );
    }
}

/**
 * A person standing, sitting on a stool or in a wheelchair, walking or running, whose anchors say
 * where the hands went. `raised` lifts the near hand round a handle that the drawing placing the
 * person draws itself.
 */
export function figure<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    look: Look,
    pose: Pose,
    holding: string,
    raised = false,
): RawAnchors {
    const { pen, g } = c,
        b = look.b,
        r = b.r,
        s0 = look.dir;
    const racing = pose === "run" && look.aid === "wheelchair";
    const seated = pose === "sit" || look.aid === "wheelchair";
    const striding = !seated && (pose === "walk" || pose === "run");
    const a: RawAnchors = {};
    const hipH = racing
        ? 26 * (look.age === "child" ? 1 : 1.3)
        : look.aid === "wheelchair"
          ? b.seat + 3
          : pose === "sit"
            ? b.seat + 2
            : striding && pose === "run"
              ? b.hip - 1.5
              : b.hip;
    const lift = hipH - b.hip;
    const bx = racing
        ? x - s0 * 4 * (look.age === "child" ? 1 : 1.3)
        : look.aid === "wheelchair"
          ? x - s0 * 4
          : x;
    // a runner leans into the run and a wheelchair racer far over the wheels: the shoulders and head go forward and down
    const lean = racing ? s0 * b.sw * 1.7 : striding && pose === "run" ? s0 * b.sw * 0.4 : 0;
    const stoop = racing ? 16 : lean ? 1.5 : 0,
        hx = bx + lean * 1.15;
    const shoulderY = base - (b.shoulder + lift) + stoop,
        hipY = base - hipH,
        headY = base - (b.head + lift) + stoop;
    const hemY = look.dress && !seated ? base - b.hip * 0.6 : hipY + 3;

    // the arm on the side the person faces does the pose; the other rests, holds or pushes
    const arms: Record<number, ArmKey> = { [-1]: "rest", 1: "rest" };
    const near = s0,
        far = -s0;
    if (pose === "wave") arms[near] = "wave";
    if (pose === "point") arms[near] = "point";
    if (pose === "think") arms[near] = "chin";
    if (pose === "hold") {
        arms[near] = "hold";
        arms[far] = "hold";
    }
    if (pose === "cheer") {
        arms[near] = "up";
        arms[far] = "up";
    }
    if (striding && pose === "run") {
        arms[near] = "pump";
        arms[far] = "drive";
    }
    if (seated && arms[far] === "rest") arms[far] = "lap";
    if (seated && arms[near] === "rest") arms[near] = look.aid === "wheelchair" ? "wheel" : "lap";
    if (racing) {
        arms[near] = "race";
        arms[far] = "race";
    }
    if (raised) arms[near] = "raise";
    if (look.aid === "crutches") {
        arms[near] = "grip";
        arms[far] = "grip";
    }
    if (look.aid === "cane") arms[far] = "cane";

    if (look.hair === "long") hairBehind(c, hx, headY, r, look);
    const chair = look.aid === "wheelchair" && !racing ? wheelchair(c, x, base, look) : null;
    const racer = racing ? racingChair(c, x, base, look) : null;
    const arm = (s: number) => {
        const S: Pt = [bx + lean + s * (b.sw - 2), shoulderY + b.arm + 1];
        const key = arms[s] ?? "rest";
        const grip: Pt =
            key === "grip"
                ? [bx + s * (b.sw + 7), base - b.hip * 1.05]
                : [bx + s * (b.sw + 6), base - b.hip * 1.22];
        const rim: Pt | undefined = racer
            ? s === far
                ? [racer.rim[0] - s0 * 3, racer.rim[1] - 1]
                : racer.rim
            : chair?.rim;
        const [E, H] = armPoints(key, s, S, b, bx, { headY, hipY, grip, wheel: rim });
        if (key === "grip") crutch(c, s, grip, base);
        if (key === "cane") cane(c, s, grip, base);
        const moving = key === "wave" ? part(c, "wave", S, { dir: s }) : c;
        moving.pen.polygon(
            moving.g,
            limb([S, E, H], b.arm),
            "pencil",
            c.pen.fill(look.top),
            calm(c, 1.5),
        );
        const shape: HandShape =
            key === "point" ? "point" : key === "wave" || key === "up" ? "open" : "fist";
        const end = hand(moving, E, H, b.hand, look.tone, shape);
        if (key === "grip") cuff(c, s, E, H);
        if (key === "point") a.tip = [end[0], end[1], s > 0 ? "right" : "left"];
        if (key === "wave" || key === "up" || key === "chin") a.hand = [end[0], end[1], "up"];
        if (key === "wheel" || (key === "race" && s === near)) a.hand = [H[0], H[1], "up"];
        if (key === "raise") a.hand = [H[0], H[1] - b.hand, "up"];
    };

    if (racer) arm(far);
    else if (chair) {
        const knee: Pt = [x + s0 * b.seat * 0.5, hipY - 0.5],
            ankle: Pt = [knee[0] + s0 * 2.5, chair.foot[1] - 3.5];
        pen.polygon(
            g,
            limb([[bx - s0 * 2, hipY + 1], knee, ankle], b.leg, [true, false]),
            "pencil",
            bottoms(c),
            calm(c, 1.5),
        );
        shoe(c, ankle[0] + s0 * 3.5, chair.foot[1] - 2.2, b.leg * 2 + 4);
    } else if (pose === "sit") {
        const seatY = base - b.seat,
            sw = b.hw + 5;
        for (const s of [-1, 1])
            pen.line(g, x + s * (sw - 4), seatY + 3, x + s * sw, base, "pencil", calm(c, 2.2));
        pen.line(
            g,
            x - sw + 2.5,
            base - b.seat * 0.36,
            x + sw - 2.5,
            base - b.seat * 0.36,
            "pencil",
            calm(c, 1.5),
        );
        pen.path(
            g,
            soft(
                [
                    [x - sw, seatY - 2],
                    [x + sw, seatY - 2],
                    [x + sw, seatY + 3.5],
                    [x - sw, seatY + 3.5],
                ],
                0.4,
            ),
            "pencil",
            c.pen.fill(beside(look.top, 3)),
            calm(c, 1.6),
        );
    } else if (striding) strideLegs(c, x, base, hipY, b, look, pose === "run");
    else standingLegs(c, x, base, b, look);

    pen.rect(
        g,
        hx - r * 0.26,
        headY + r * 0.8,
        r * 0.52,
        shoulderY - headY - r * 0.6,
        "ruler",
        skin(c, look.tone),
        { strokeWidth: 1.2, ...FIRM },
    );
    top(c, bx, shoulderY, hemY, b, look, lean);
    if (pose === "sit" && !chair) seatedLegs(c, x, base, hipY, b);
    if (chair) chair.front();
    if (racer) {
        racer.shell();
        racer.front();
    }
    for (const s of racer ? [near] : [far, near]) arm(s);
    if (pose === "hold") {
        const hy = hipY - b.ua * 0.42;
        if (holding) drawProp(c, holding, bx, hy - b.hand * 0.6, r * 1.2);
        a.hands = [bx, hy - r * 0.8, "up"];
    }

    head(c, hx, headY, r, look, () => {
        if (look.hair === "scarf") scarfDrape(c, hx, headY, r, look);
    });
    const above: Partial<Record<Hair, number>> = {
        coily: 1.66,
        bun: 1.72,
        puffs: 1.42,
        curly: 1.34,
        scarf: 1.26,
    };
    a.head = [hx, headY - r * (above[look.hair] ?? 1.1), "up"];
    a.face = [hx + s0 * r * 1.1, headY, s0 > 0 ? "right" : "left"];
    a.chest = [bx + lean * 0.5, shoulderY + (hipY - shoulderY) * 0.4, s0 > 0 ? "right" : "left"];
    a.feet = [x, base, "down"];
    if (seated && !racer) a.lap = [bx + s0 * 4, hipY - 2, "up"];
    // a racer's number goes on the side of the chair: side on, a bib would hide the lean that makes the chair a racer
    if (racer) a.chair = [racer.plate[0], racer.plate[1], "down"];
    return a;
}

/**
 * A child's own active wheelchair seen from the side: a rigid frame with no push handles, a low
 * back, big rear wheels with push rims just inside the tyre, small casters and a footplate. It is
 * drawn in two passes, the back before the body and the near wheel after it.
 */
function wheelchair<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    look: Look,
): { front: () => void; rim: Pt; foot: Pt } {
    const { pen, g } = c,
        b = look.b,
        s = look.dir,
        big = look.age === "child" ? 1 : 1.3;
    const X = (u: number) => x + s * u * big;
    const seatY = base - b.seat,
        R = 17 * big,
        wc: Pt = [X(-6), base - R];
    const frame = c.pen.fill(look.top === "mint" ? "sky" : "mint");
    const thin = c.paper ? c.t.ink : c.t["ink-soft"];
    pen.circle(g, wc[0] + s * 4, wc[1] - 1.5, R * 2, "ruler", null, {
        strokeWidth: 1.5,
        stroke: thin,
        ...FIRM,
    });
    pen.line(g, X(-13), seatY + 1, X(-15), seatY - 19 * big, "ruler", {
        strokeWidth: 2.4,
        ...FIRM,
    });
    const foot: Pt = [X(21), base - 9 * big];
    return {
        rim: [wc[0] - s * R * 0.3, wc[1] - R * 0.8],
        foot,
        front: () => {
            pen.linear(
                g,
                [[X(-13), seatY + 2], [X(12), seatY + 2], [X(15), base - 10 * big], foot],
                "ruler",
                { strokeWidth: 2.4, ...FIRM },
            );
            pen.line(g, X(15), base - 10 * big, X(16), base - 7.5 * big, "ruler", {
                strokeWidth: 1.8,
                ...FIRM,
            });
            pen.circle(g, X(16.5), base - 4 * big, 8 * big, "ruler", c.pen.fill("card"), {
                strokeWidth: 1.8,
                ...FIRM,
            });
            pen.circle(
                g,
                X(16.5),
                base - 4 * big,
                2,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6, ...FIRM },
            );
            pen.line(g, foot[0] - s * 7, foot[1], foot[0] + s * 2, foot[1], "ruler", {
                strokeWidth: 3,
                ...FIRM,
            });
            pen.circle(g, wc[0], wc[1], R * 2, "ruler", null, { strokeWidth: 2.8, ...FIRM });
            pen.circle(g, wc[0], wc[1], R * 1.62, "ruler", null, {
                strokeWidth: 1.5,
                stroke: thin,
                ...FIRM,
            });
            for (let k = 0; k < 6; k++) {
                const t = (k / 6) * Math.PI;
                pen.line(
                    g,
                    wc[0] - Math.cos(t) * R * 0.78,
                    wc[1] - Math.sin(t) * R * 0.78,
                    wc[0] + Math.cos(t) * R * 0.78,
                    wc[1] + Math.sin(t) * R * 0.78,
                    "ruler",
                    { strokeWidth: 0.7, stroke: thin, ...FIRM },
                );
            }
            pen.circle(g, wc[0], wc[1], 5 * big, "ruler", frame, { strokeWidth: 1.2, ...FIRM });
            pen.path(
                g,
                `M${X(-14)} ${seatY + 1}Q${X(-6)} ${seatY - 7} ${X(3)} ${seatY + 1}Z`,
                "ruler",
                frame,
                { strokeWidth: 1.4, ...FIRM },
            );
        },
    };
}

/**
 * A racing wheelchair seen from the side: big rear wheels with small push rims, a low shell the racer
 * kneels in, and a long frame out to one small front wheel. The far wheel is drawn first, the shell
 * over the hips and the near wheel after the body.
 */
function racingChair<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    look: Look,
): { shell: () => void; front: () => void; rim: Pt; plate: Pt } {
    const { pen, g } = c,
        s = look.dir,
        big = look.age === "child" ? 1 : 1.3;
    const X = (u: number) => x + s * u * big,
        Y = (v: number) => base - v * big;
    const R = 21 * big,
        wc: Pt = [X(-8), base - R],
        thin = c.paper ? c.t.ink : c.t["ink-soft"];
    const frame = c.pen.fill(look.top === "mint" ? "sky" : "mint");
    pen.circle(g, wc[0] - s * 3, wc[1] - 1, R * 2, "ruler", null, {
        strokeWidth: 1.5,
        stroke: thin,
        ...FIRM,
    });
    return {
        rim: [wc[0] + s * R * 0.68, wc[1] - R * 0.18],
        plate: [X(22), Y(14)],
        shell: () => {
            pen.path(
                g,
                `M${X(-14)} ${Y(31)}Q${X(6)} ${Y(30)} ${X(22)} ${Y(21)}L${X(43)} ${Y(10)}Q${X(48)} ${Y(7)} ${X(44)} ${Y(5.5)}L${X(10)} ${Y(8)}Q${X(-12)} ${Y(9)} ${X(-14)} ${Y(31)}Z`,
                "pencil",
                frame,
                calm(c, 1.7),
            );
        },
        front: () => {
            const fw: Pt = [X(47), base - 6.5 * big];
            pen.line(g, X(41), Y(10), fw[0], fw[1], "ruler", { strokeWidth: 2.4, ...FIRM });
            pen.circle(g, fw[0], fw[1], 13 * big, "ruler", c.pen.fill("card"), {
                strokeWidth: 1.8,
                ...FIRM,
            });
            pen.circle(
                g,
                fw[0],
                fw[1],
                2,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6, ...FIRM },
            );
            pen.circle(g, wc[0], wc[1], R * 2, "ruler", null, { strokeWidth: 2.8, ...FIRM });
            pen.circle(g, wc[0], wc[1], R * 1.4, "ruler", null, {
                strokeWidth: 1.5,
                stroke: thin,
                ...FIRM,
            });
            for (let k = 0; k < 4; k++) {
                const t = (k / 4) * Math.PI + 0.3;
                pen.line(
                    g,
                    wc[0] - Math.cos(t) * R * 0.9,
                    wc[1] - Math.sin(t) * R * 0.9,
                    wc[0] + Math.cos(t) * R * 0.9,
                    wc[1] + Math.sin(t) * R * 0.9,
                    "ruler",
                    { strokeWidth: 0.8, stroke: thin, ...FIRM },
                );
            }
            pen.circle(g, wc[0], wc[1], 5 * big, "ruler", frame, { strokeWidth: 1.2, ...FIRM });
        },
    };
}

/** A forearm crutch on side s, from its rubber foot up to the grip the hand holds. */
function crutch<G>(c: Ctx<G>, s: number, grip: Pt, base: number): void {
    const { pen, g } = c,
        tip: Pt = [grip[0] + s * 4, base - 1];
    pen.line(g, tip[0], tip[1], grip[0] + s * 0.8, grip[1], "ruler", { strokeWidth: 2.6, ...FIRM });
    pen.line(g, grip[0] + s * 2.5, grip[1], grip[0] - s * 4, grip[1] + 0.5, "ruler", {
        strokeWidth: 3,
        ...FIRM,
    });
    pen.ellipse(
        g,
        tip[0],
        tip[1] - 1,
        5,
        4,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1, ...FIRM },
    );
}

/** The crutch past the hand: the shaft along the outside of the forearm and the cuff below the elbow. */
function cuff<G>(c: Ctx<G>, s: number, elbow: Pt, grip: Pt): void {
    const { pen, g } = c,
        at: Pt = [
            elbow[0] + (grip[0] - elbow[0]) * 0.22 + s * 2.2,
            elbow[1] + (grip[1] - elbow[1]) * 0.22,
        ];
    pen.line(g, grip[0] + s * 1.6, grip[1] - 3, at[0], at[1], "ruler", {
        strokeWidth: 2.4,
        ...FIRM,
    });
    const a = Math.atan2(grip[1] - elbow[1], grip[0] - elbow[0]);
    const n: Pt = [-Math.sin(a) * 5.2, Math.cos(a) * 5.2];
    pen.line(g, at[0] - n[0], at[1] - n[1], at[0] + n[0] * 0.6, at[1] + n[1] * 0.6, "ruler", {
        strokeWidth: 3.4,
        ...FIRM,
    });
}

/** A walking stick with a crook, in the hand on side s. */
function cane<G>(c: Ctx<G>, s: number, grip: Pt, base: number): void {
    const { pen, g } = c;
    pen.line(g, grip[0] + s * 2, grip[1], grip[0] + s * 4, base - 1, "ruler", {
        strokeWidth: 2.6,
        ...FIRM,
    });
    pen.arc(g, grip[0] + s * 6, grip[1] + 1, 9, 9, Math.PI, Math.PI * 2, "ruler", {
        strokeWidth: 2.6,
        ...FIRM,
    });
    pen.ellipse(
        g,
        grip[0] + s * 4,
        base - 1.5,
        4.5,
        3.5,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1, ...FIRM },
    );
}

type PenOpts = NonNullable<Fill>;

/**
 * The pen for a person drawn at another size inside a group: the group's transform scales the
 * geometry and every weight is divided back, so a line keeps the weight of its role.
 */
class KeptPen<G> extends Pen<G> {
    readonly k: number;

    constructor(pen: Pen<G>, o: PenOptions, k: number) {
        super(pen.ink, o);
        this.k = k;
    }

    private kept(f: Fill): Fill {
        if (!f) return f;
        const out: PenOpts = { ...f };
        if (f.strokeWidth !== undefined) out.strokeWidth = f.strokeWidth / this.k;
        if (f.fillWeight !== undefined) out.fillWeight = f.fillWeight / this.k;
        if (f.hachureGap !== undefined) out.hachureGap = f.hachureGap / this.k;
        return out;
    }

    override opt(level?: Level, extra?: PenOpts): PenOpts {
        return this.kept(super.opt(level, extra)) ?? {};
    }
    override rect(
        p: G,
        x: number,
        y: number,
        w: number,
        h: number,
        level?: Level,
        fill: Fill = null,
        extra?: PenOpts,
    ): void {
        super.rect(p, x, y, w, h, level, this.kept(fill), extra);
    }
    override circle(
        p: G,
        cx: number,
        cy: number,
        d: number,
        level?: Level,
        fill: Fill = null,
        extra?: PenOpts,
    ): void {
        super.circle(p, cx, cy, d, level, this.kept(fill), extra);
    }
    override ellipse(
        p: G,
        cx: number,
        cy: number,
        w: number,
        h: number,
        level?: Level,
        fill: Fill = null,
        extra?: PenOpts,
    ): void {
        super.ellipse(p, cx, cy, w, h, level, this.kept(fill), extra);
    }
    override polygon(p: G, pts: Pt[], level?: Level, fill: Fill = null, extra?: PenOpts): void {
        super.polygon(p, pts, level, this.kept(fill), extra);
    }
    override path(p: G, d: string, level?: Level, fill: Fill = null, extra?: PenOpts): void {
        super.path(p, d, level, this.kept(fill), extra);
    }
}

/**
 * A person inside a group drawing (a line of runners, people under umbrellas): feet at `x, base`,
 * drawn at `size` of the kit's own scale with every line keeping the weight of its role, as the
 * style guide asks of a piece drawn smaller. `grip` raises the near hand round a handle the group
 * draws itself, at the `hand` anchor. Anchors come back in the group's units.
 */
export function placePerson<G>(
    c: Ctx<G>,
    p: PersonParams,
    x: number,
    base: number,
    o: { size?: number; grip?: boolean; seed?: number } = {},
): RawAnchors {
    const k = o.size ?? 1;
    // placed to the hundredth, as it was written when the group's transform was a string
    const t = group(c, {
        turn: [
            ["translate", Number(x.toFixed(2)), Number(base.toFixed(2))],
            ["scale", k],
        ],
    });
    const pen =
        k !== 1
            ? new KeptPen(c.pen, { ...c.pen.o, seed: c.pen.o.seed + (o.seed ?? 1) * 7919 }, k)
            : c.pen;
    const raw = figure(
        { ...t, pen },
        0,
        0,
        lookOf(p),
        pick(POSES, p.pose, "stand"),
        p.holding,
        o.grip ?? false,
    );
    const out: RawAnchors = {};
    for (const [name, [ax, ay, side]] of Object.entries(raw))
        out[name] = [x + ax * k, base + ay * k, side];
    return out;
}
