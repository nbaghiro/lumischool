import { plain, clip, group, type Ctx, type RawAnchors, type Turn } from "../../ink/surface";
import { U } from "../../paper";
import { defineInstrument } from "../drawing";
import { say, soft } from "../lettering";
import { letterOf } from "../../sound/pitch";
import {
    fingersOf,
    noteAt,
    placeId,
    readPlace,
    spokenPlace,
    stringName,
    tuningOf,
    type Finger,
    type Shape,
    type TuningName,
} from "../../sound/fretted";
import { type Key } from "../../sound/keys";
import { CHORD_PICK, shapeFor, fingerDot, muteMark } from "./fretting";
import { gauge, wood, rosette, stringLine } from "./luthier";

type Box = { x: number; y: number; w: number; h: number };

const VIEWS = ["player", "tab", "chart", "mirror"] as const;

export type View = (typeof VIEWS)[number];

export interface FretParams {
    tuning: TuningName;
    frets: number;
    /** Squares per string and per fret, times this. One is the lesson size. */
    wide: number;
    view: View;
    labels: "letters" | "numbers" | "none";
    /** A chord from the book, drawn with its fingers down, its open strings ringed and the rest crossed. */
    chord: string;
    /** Places drawn with a finger on them, as s2f3, with no finger named. */
    down: string[];
    /** Places ringed, which is how "play this one" is said without colour or sound. */
    lit: string[];
    /** Make the body a place to strum: sweep across the strings there, over the sound hole. */
    strum: boolean;
    /** Squares of the instrument past the last fret: the body, with its sound hole when there is room. At least five to strum on. */
    body: number;
}

/** Squares of headstock before the nut: the pegs, and the two squares where an open string is tapped. */
const NECK_HEAD = 4;

/** Squares beside the outer strings, for the pegs' buttons and the body's shoulders. */
const NECK_SIDE = 2;

/** One square more on the far side, for the fret numbers, so a ring on the outer string never covers one. */
const NECK_NUMBERS = 1;

const BODY_MIN = 5;

interface NeckShape {
    view: View;
    tuning: TuningName;
    n: number;
    frets: number;
    wide: number;
    box: { w: number; h: number };
    /** Every playable place, open strings first. */
    spots: {
        id: string;
        string: number;
        fret: number;
        note: number;
        cx: number;
        cy: number;
        hit: Box;
    }[];
    /** Where a string runs, across the neck, in user units. */
    across(string: number): number;
    /** Where a fret wire is, along the neck, in user units; 0 is the nut. */
    along(wire: number): number;
    /** The body, when it is a place to strum. */
    strumZone: Box | null;
    /** Where a string is named. */
    labelAt(string: number): [number, number];
    /** Where a fret's number is written. */
    fretAt(fret: number): [number, number];
    /** Whether the neck runs down the page rather than across it. */
    upright: boolean;
    /**
     * The instrument is drawn once, lying down with its head on the left, in these user units:
     * `u` along the neck from the edge of the box, `v` across it from the top. `canon` is that
     * drawing's size in squares, and `turn` is the transform that puts it into this view.
     */
    canon: { w: number; h: number };
    turn?: readonly Turn[];
    /** In the lying-down drawing: where the labels, the nut, the last fret and the body start are. */
    lay: {
        label: number;
        nut: number;
        end: number;
        body: number;
        slot: (string: number) => number;
    };
}

/**
 * The geometry every neck drawing reads, so a target and the thing drawn for it cannot disagree.
 *
 * One layout, lying down: a column for the string names, the headstock, the frets, and past the last
 * fret as much of the body as is asked for. The four views are that layout turned or mirrored, which
 * is the fact .docs/guitar.md rests on: the chart is it stood up, and the mirror is it turned round.
 */
export function neckShape(
    p: Pick<FretParams, "tuning" | "frets" | "wide" | "view" | "strum"> &
        Partial<Pick<FretParams, "labels" | "body">>,
): NeckShape {
    const t = tuningOf(p.tuning);
    const view: View = (VIEWS as readonly string[]).includes(p.view) ? p.view : "player";
    const n = t.strings.length;
    const wide = Math.max(1, Math.round(p.wide || 1));
    const frets = Math.max(1, Math.min(12, Math.round(p.frets || 4)));
    const sp = 2 * wide,
        fw = 3 * wide;
    const label = p.labels === "none" ? 0 : 1;
    const asked = Math.round(p.body ?? 6);
    const body = p.strum ? Math.max(BODY_MIN, asked) : Math.max(1, asked);
    const upright = view === "chart",
        mirror = view === "mirror";
    const W = label + NECK_HEAD + frets * fw + body;
    const H = 2 * NECK_SIDE + (n - 1) * sp + NECK_NUMBERS;

    // Which slot, from the top of the lying-down drawing, a string takes. The chart and the two views
    // from above put the string nearest the chin first; tab puts string 1 first.
    const slot = (string: number) => (view === "tab" ? string - 1 : n - string);
    const nut = label + NECK_HEAD;
    const u = (wire: number) => (nut + wire * fw) * U;
    const v = (s: number) => (NECK_SIDE + slot(s) * sp) * U;
    /** A point of the lying-down drawing, in this view. */
    const at = (cu: number, cv: number): [number, number] =>
        upright ? [cv, cu] : mirror ? [W * U - cu, cv] : [cu, cv];
    /** A rectangle of the lying-down drawing, in this view. */
    const rect = (u0: number, v0: number, du: number, dv: number): Box => {
        if (upright) return { x: v0, y: u0, w: dv, h: du };
        if (mirror) return { x: W * U - u0 - du, y: v0, w: du, h: dv };
        return { x: u0, y: v0, w: du, h: dv };
    };

    const spots: NeckShape["spots"] = [];
    for (let s = n; s >= 1; s--) {
        for (let f = 0; f <= frets; f++) {
            // An open string is tapped on the two squares of headstock just before the nut.
            const hit =
                f === 0
                    ? rect((nut - 2) * U, v(s) - (sp / 2) * U, 2 * U, sp * U)
                    : rect(u(f - 1), v(s) - (sp / 2) * U, fw * U, sp * U);
            spots.push({
                id: placeId({ string: s, fret: f }),
                string: s,
                fret: f,
                note: noteAt(t, { string: s, fret: f }),
                cx: hit.x + hit.w / 2,
                cy: hit.y + hit.h / 2,
                hit,
            });
        }
    }
    const top = Math.min(v(1), v(n)) - (sp / 2) * U;
    return {
        view,
        tuning: t.name,
        n,
        frets,
        wide,
        upright,
        spots,
        box: upright ? { w: H, h: W } : { w: W, h: H },
        across: v,
        along: (wire) => (upright ? u(wire) : mirror ? W * U - u(wire) : u(wire)),
        strumZone: p.strum ? rect(u(frets), top, body * U, n * sp * U) : null,
        labelAt: (s) => at((label / 2) * U, v(s)),
        fretAt: (f) => at(u(f - 0.5), (H - 1.05) * U),
        canon: { w: W, h: H },
        turn: upright
            ? [["matrix", 0, 1, 1, 0, 0, 0]]
            : mirror
              ? [["matrix", -1, 0, 0, 1, W * U, 0]]
              : undefined,
        lay: {
            label: label * U,
            nut: nut * U,
            end: u(frets),
            body: u(frets) + Math.min(0.9, body * 0.3) * U,
            slot,
        },
    };
}

/** The shape a neck is showing, when it shows a chord. */
const shapeOf = (p: Pick<FretParams, "tuning" | "chord">): Shape | null =>
    shapeFor(tuningOf(p.tuning).name, p.chord);

/** A group the mount can find and show or hide. */
const layer = <G>(c: Ctx<G>, key: string, kind: string, shown: boolean): G =>
    group(c, { data: { key, layer: kind }, ...(kind !== "face" && !shown ? { hidden: true } : {}) })
        .g;

/** The dashed ring, with a pale casing under it so it shows on dark wood as well as on paper. */
function focusRing<G>(c: Ctx<G>, id: string, b: Box): void {
    const g = layer(c, id, "focus", false);
    c.pen.rect(g, b.x + 3, b.y + 3, b.w - 6, b.h - 6, "ruler", null, {
        strokeWidth: 4,
        stroke: c.t.card,
    });
    c.pen.rect(g, b.x + 3, b.y + 3, b.w - 6, b.h - 6, "ruler", null, {
        strokeWidth: 1.8,
        stroke: c.t.pen,
        strokeLineDash: [5, 4],
    });
}

/** Where the position markers go, the way most necks inlay them. */
const INLAYS = [3, 5, 7, 9];

/** Grain: a few faint lines along the wood, the way a pencil suggests it rather than paints it. */
function grain<G>(c: Ctx<G>, g: G, u0: number, u1: number, vs: number[], seed: number): void {
    vs.forEach((v, i) => {
        const wob = ((seed + i * 37) % 7) - 3;
        c.pen.curve(
            g,
            [
                [u0, v],
                [(u0 + u1) / 2, v + wob],
                [u1, v - wob * 0.6],
            ],
            "pencil",
            { strokeWidth: 0.8, stroke: c.t["ink-soft"] },
        );
    });
}

/** A tuning peg: its button out past the edge of the head, the shaft to it, and the post the string winds on. */
function peg<G>(c: Ctx<G>, g: G, u: number, edge: number, side: -1 | 1, post: number): void {
    const { pen } = c;
    pen.line(g, u, edge, u, edge + side * 0.3 * U, "ruler", { strokeWidth: 3.2 });
    pen.ellipse(g, u, edge + side * 0.6 * U, 0.66 * U, 0.6 * U, "pencil", wood(c, "bone"), {
        strokeWidth: 1.5,
    });
    pen.circle(g, u, post, 0.42 * U, "ruler", wood(c, "wire"), { strokeWidth: 1.3 });
}

/**
 * The instrument itself, lying down with its head on the left, drawn into a group that `turn` puts
 * into the view: the headstock and its pegs, the nut, the fingerboard with its frets and inlays, the
 * strings at their gauges and, past the last fret, the body with its sound hole. Only the places, the
 * rings and the words are drawn in the view itself, so nothing that has to be read is ever on its side.
 */
function drawNeckArt<G>(c: Ctx<G>, s: NeckShape, t: { name: TuningName; strings: number[] }): void {
    const { pen } = c;
    const W = s.canon.w * U,
        H = s.canon.h * U;
    // The clip is in the view's own units, since it sits outside the turn.
    const held = clip(c, { kind: "rect", x: 0, y: 0, w: s.box.w * U, h: s.box.h * U });
    const g = group(held, s.turn ? { turn: s.turn } : {}).g;

    const n = s.n,
        sp = 2 * s.wide * U,
        fw = 3 * s.wide * U;
    const { nut, end, body, slot } = s.lay;
    const v = (string: number) => NECK_SIDE * U + slot(string) * sp;
    const edgeTop = NECK_SIDE * U - 0.62 * U,
        edgeBot = NECK_SIDE * U + (n - 1) * sp + 0.62 * U;
    const mid = (edgeTop + edgeBot) / 2;
    const hasBody = W - end >= U;
    const boardEnd = hasBody ? body + 0.55 * U : W + U;

    // The body: the shoulders curving out from the heel of the neck and on past the edge of the box,
    // so it reads as the corner of a whole instrument rather than a panel, with its binding, a little
    // grain, and the sound hole with its rosette where there is room for most of it.
    if (hasBody) {
        const sh = Math.min(1.9 * U, W - body);
        const top = wood(c, t.name === "uke" ? "koa" : "top");
        const d = [
            `M${body} ${edgeTop}`,
            `C${body + 0.25 * U} ${edgeTop - 0.7 * U} ${body + sh * 0.4} ${-0.5 * U} ${body + sh} ${-0.9 * U}`,
            `L${W + U} ${-0.9 * U} L${W + U} ${H + 0.9 * U} L${body + sh} ${H + 0.9 * U}`,
            `C${body + sh * 0.4} ${H + 0.5 * U} ${body + 0.25 * U} ${edgeBot + 0.7 * U} ${body} ${edgeBot}Z`,
        ].join("");
        pen.path(g, d, "pencil", top, { strokeWidth: 2.2 });
        pen.curve(
            g,
            [
                [body + 0.42 * U, edgeTop - 0.12 * U],
                [body + sh * 0.62, -0.05 * U],
                [body + sh + 0.5 * U, -0.45 * U],
            ],
            "ruler",
            { strokeWidth: 1.1, stroke: c.t["ink-soft"] },
        );
        pen.curve(
            g,
            [
                [body + 0.42 * U, edgeBot + 0.12 * U],
                [body + sh * 0.62, H + 0.05 * U],
                [body + sh + 0.5 * U, H + 0.45 * U],
            ],
            "ruler",
            { strokeWidth: 1.1, stroke: c.t["ink-soft"] },
        );
        grain(
            c,
            g,
            body + sh * 0.8,
            W,
            [0.5 * U, 1.15 * U, H - 1.15 * U, H - 0.5 * U],
            s.frets * 13 + n,
        );
        // The whole hole when the body is long enough to show it at a good size, and otherwise a larger
        // one running off the end of the box, as a close-up of a real neck shows it.
        const from = boardEnd + 0.75 * U;
        const whole = (W - from - 0.75 * U) / 2;
        const r = Math.min(3.2 * U, mid - 1.25 * U, whole >= 2.2 * U ? whole : (W - from) / 1.6);
        if (r >= 1.1 * U) rosette(c, g, from + r, mid, r);
    }

    // The neck and the fingerboard on it, running from the nut onto the body or out of the box.
    pen.rect(
        g,
        nut - 0.1 * U,
        edgeTop - 0.24 * U,
        boardEnd - nut + 0.1 * U,
        edgeBot - edgeTop + 0.48 * U,
        "ruler",
        wood(c, "neck"),
        { strokeWidth: 1.4 },
    );
    pen.rect(g, nut, edgeTop, boardEnd - nut, edgeBot - edgeTop, "ruler", wood(c, "board"), {
        strokeWidth: 1.6,
    });

    // Frets: a bar of silver across the board at every fret line, and past the last played fret two
    // more, closer together, the way frets crowd towards the body.
    const fret = (x: number, w: number) =>
        pen.rect(g, x - w / 2, edgeTop + 1, w, edgeBot - edgeTop - 2, "ruler", wood(c, "wire"), {
            strokeWidth: 1,
        });
    for (let f = 1; f <= s.frets; f++) fret(nut + f * fw, 0.28 * U);
    for (const [at, w] of [
        [0.5, 0.22],
        [0.85, 0.2],
    ] as const)
        if (end + at * U < boardEnd - 0.2 * U) fret(end + at * U, w * U);
    for (const f of INLAYS) {
        if (f > s.frets) continue;
        pen.circle(g, nut + (f - 0.5) * fw, mid, 0.55 * U, "ruler", wood(c, "bone"), {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
    }

    // The headstock: a paddle a little wider than the neck with a crown at its end, pegs down both
    // sides, and the bone nut across its foot.
    const crown = s.lay.label + 0.2 * U;
    const flare = 0.32 * U;
    const headPath = [
        `M${nut} ${edgeTop - 0.1 * U}`,
        `L${crown + 0.55 * U} ${edgeTop - flare}`,
        `C${crown - 0.05 * U} ${edgeTop - flare + 0.2 * U} ${crown + 0.3 * U} ${mid - 0.9 * U} ${crown} ${mid}`,
        `C${crown + 0.3 * U} ${mid + 0.9 * U} ${crown - 0.05 * U} ${edgeBot + flare - 0.2 * U} ${crown + 0.55 * U} ${edgeBot + flare}`,
        `L${nut} ${edgeBot + 0.1 * U}Z`,
    ].join("");
    pen.path(g, headPath, "pencil", wood(c, "neck"), { strokeWidth: 1.9 });
    const half = Math.ceil(n / 2);
    const near = nut - 1.25 * U,
        far = crown + 0.75 * U;
    const postU = (k: number) => (half === 1 ? near : near - (k * (near - far)) / (half - 1));
    const edgeAt = (u: number) =>
        flare * Math.min(1, (nut - u) / (nut - crown - 0.55 * U)) +
        0.1 * U * (1 - Math.min(1, (nut - u) / (nut - crown)));
    // The outer strings wind on the posts nearest the nut and the inner ones travel furthest up the
    // head, which is how a head with pegs down both sides is strung.
    const posts = new Map<number, [number, number]>();
    for (let string = 1; string <= n; string++) {
        const sl = slot(string);
        const upper = sl < half;
        const k = Math.min(upper ? sl : n - 1 - sl, half - 1);
        const pu = postU(k);
        const out = edgeAt(pu);
        const pv = upper ? edgeTop + 0.34 * U : edgeBot - 0.34 * U;
        posts.set(string, [pu, pv]);
        peg(c, g, pu, upper ? edgeTop - out : edgeBot + out, upper ? -1 : 1, pv);
    }
    pen.rect(
        g,
        nut - 0.42 * U,
        edgeTop - 0.14 * U,
        0.42 * U,
        edgeBot - edgeTop + 0.28 * U,
        "ruler",
        wood(c, "bone"),
        { strokeWidth: 1.5 },
    );

    // The strings, from their posts over the nut to the end of the box.
    for (let string = 1; string <= n; string++) {
        const post = posts.get(string) ?? [crown + U, v(string)];
        const wound = t.name === "guitar" && string >= 4;
        stringLine(
            c,
            g,
            [
                [post[0], post[1]],
                [nut - 0.21 * U, v(string)],
                [W + U, v(string)],
            ],
            gauge(t, string),
            wound,
        );
    }
}

export const fretboard = defineInstrument<FretParams>({
    id: "fretboard",
    family: "music",
    title: "Ukulele or guitar neck",
    group: "Inputs",
    about:
        "The neck a child plays, close up: the head with its tuning pegs, the bone nut, the dark " +
        "fingerboard with its silver frets and pearl dots, the strings at their thicknesses and, past the " +
        "last fret, the body with its sound hole and rosette, where the strings are strummed. Tap a place " +
        "and the string sounds. It turns to match what the child is reading: stood up like a chord box, on " +
        "its side like tab, as you see your own neck, or as a teacher opposite holds theirs.",
    voice: "uke",
    params: {
        tuning: "uke",
        frets: 4,
        wide: 1,
        view: "player",
        labels: "letters",
        chord: "none",
        down: [],
        lit: [],
        strum: false,
        body: 6,
    },
    settings: {
        tuning: { kind: "one of", of: ["uke", "guitar"] },
        frets: { kind: "whole", min: 3, max: 5 },
        wide: { kind: "whole", min: 1, max: 2 },
        view: { kind: "one of", of: ["player", "tab", "chart", "mirror"] },
        labels: { kind: "one of", of: ["letters", "numbers", "none"] },
        chord: { kind: "one of", of: CHORD_PICK },
        down: { kind: "words", most: 6 },
        lit: { kind: "words", most: 6 },
        strum: { kind: "flag" },
        body: { kind: "whole", min: 0, max: 8 },
    },
    takes: [
        {
            label: "Ukulele, as you see your own",
            params: {
                tuning: "uke",
                frets: 4,
                wide: 1,
                view: "player",
                labels: "letters",
                chord: "none",
                down: [],
                lit: [],
                strum: false,
                body: 6,
            },
        },
        {
            label: "Ukulele C, stood up",
            params: {
                tuning: "uke",
                frets: 4,
                wide: 1,
                view: "chart",
                labels: "letters",
                chord: "C",
                down: [],
                lit: [],
                strum: true,
                body: 6,
            },
        },
        {
            label: "Ukulele as tab draws it",
            params: {
                tuning: "uke",
                frets: 4,
                wide: 1,
                view: "tab",
                labels: "numbers",
                chord: "none",
                down: [],
                lit: ["s3f2"],
                strum: false,
                body: 6,
            },
        },
        {
            label: "Guitar Em, as you see it",
            params: {
                tuning: "guitar",
                frets: 4,
                wide: 1,
                view: "player",
                labels: "letters",
                chord: "Em",
                down: [],
                lit: [],
                strum: true,
                body: 6,
            },
        },
        {
            label: "Guitar, a teacher opposite",
            params: {
                tuning: "guitar",
                frets: 4,
                wide: 1,
                view: "mirror",
                labels: "letters",
                chord: "Em",
                down: [],
                lit: [],
                strum: false,
                body: 6,
            },
        },
    ],
    box: (p) => neckShape(p).box,

    keys(p) {
        const s = neckShape(p);
        const t = tuningOf(p.tuning);
        return s.spots.map((spot): Key => ({
            id: spot.id,
            note: spot.note,
            anchor: `spot(${spot.id})`,
            label: p.labels === "letters" ? letterOf(spot.note) : "",
            spoken: spokenPlace(t, { string: spot.string, fret: spot.fret }),
            raised: false,
            hit: spot.hit,
        }));
    },

    draw: (c, p) => {
        const { pen } = c;
        const s = neckShape(p);
        const t = tuningOf(p.tuning);
        const chord = shapeOf(p);
        const held = new Map<string, Finger | null>();
        for (const id of p.down ?? []) if (readPlace(id)) held.set(id, null);
        for (const f of chord ? fingersOf(chord) : []) held.set(placeId(f), f.finger ?? null);
        const lit = new Set(p.lit ?? []);
        const a: RawAnchors = {};
        const sp = 2 * s.wide * U;

        drawNeckArt(c, s, t);

        for (let f = 1; f <= s.frets; f++) {
            const [fx, fy] = s.fretAt(f);
            soft(c, fx, fy + 5, String(f), 13);
        }
        for (let string = 1; string <= s.n; string++) {
            if (p.labels !== "none") {
                const [lx, ly] = s.labelAt(string);
                say(
                    c,
                    lx,
                    ly + 5,
                    p.labels === "numbers" ? String(string) : stringName(t, string),
                    14,
                    "middle",
                    c.t["ink-soft"],
                );
            }
            const q = s.across(string);
            a[`string(${string})`] = s.upright
                ? [q, s.along(0) - 6, "up"]
                : [s.along(s.frets / 2), q - 6, "up"];
        }

        for (const spot of s.spots) {
            const face = layer(c, spot.id, "face", true);
            plain(
                { ...c, g: face },
                {
                    kind: "rect",
                    x: spot.hit.x,
                    y: spot.hit.y,
                    w: spot.hit.w,
                    h: spot.hit.h,
                    fill: "none",
                },
            );
            const d = sp * 0.62;
            if (spot.fret === 0) {
                // An open string is not a place a finger goes, so its marks sit on the head just before the
                // nut: a ring when a chord plays it open, a cross when a chord leaves it out.
                const fret = chord ? chord.frets[s.n - spot.string] : undefined;
                const open = layer(c, spot.id, "open", fret === 0);
                pen.circle(
                    open,
                    spot.cx,
                    spot.cy,
                    d * 0.72,
                    "ruler",
                    { fill: c.t.card, fillStyle: "solid" },
                    { strokeWidth: 1.8 },
                );
                const mute = layer(c, spot.id, "mute", fret === null);
                pen.circle(
                    mute,
                    spot.cx,
                    spot.cy,
                    d * 0.8,
                    "ruler",
                    { fill: c.t.card, fillStyle: "solid" },
                    { strokeWidth: 0.8, stroke: c.t.card },
                );
                muteMark(c, mute, spot.cx, spot.cy, d * 0.28);
                const down = layer(c, spot.id, "down", false);
                pen.circle(
                    down,
                    spot.cx,
                    spot.cy,
                    d * 0.84,
                    "ruler",
                    { fill: c.t.card, fillStyle: "solid" },
                    { strokeWidth: 1.8 },
                );
            } else {
                // Each dot has a pale rim, so a finger shows on the dark board as well as on paper.
                const finger = held.get(spot.id);
                const down = layer(c, spot.id, "down", held.has(spot.id) && finger === null);
                pen.circle(
                    down,
                    spot.cx,
                    spot.cy,
                    d + 5,
                    "ruler",
                    { fill: c.t.card, fillStyle: "solid" },
                    { strokeWidth: 0.6, stroke: c.t.card },
                );
                fingerDot(c, down, spot.cx, spot.cy, d, null);
                for (const f of [1, 2, 3, 4] as Finger[]) {
                    const dot = layer(c, spot.id, `f${f}`, finger === f);
                    pen.circle(
                        dot,
                        spot.cx,
                        spot.cy,
                        d + 5,
                        "ruler",
                        { fill: c.t.card, fillStyle: "solid" },
                        { strokeWidth: 0.6, stroke: c.t.card },
                    );
                    fingerDot(c, dot, spot.cx, spot.cy, d, f);
                }
            }
            // The ring that says "play this one", with a pale casing so it shows on the dark board.
            const ring = layer(c, spot.id, "lit", lit.has(spot.id));
            pen.circle(ring, spot.cx, spot.cy, d * 1.45, "doodle", null, {
                strokeWidth: 5,
                stroke: c.t.card,
            });
            pen.circle(ring, spot.cx, spot.cy, d * 1.45, "doodle", null, {
                strokeWidth: 2.8,
                stroke: c.t.pen,
            });
            focusRing(c, spot.id, spot.hit);
            a[`spot(${spot.id})`] = [spot.cx, spot.cy - d * 0.75, "up"];
        }

        if (s.strumZone) {
            const z = s.strumZone;
            a.strum = [z.x + z.w / 2, z.y + z.h / 2, "right"];
        }
        const [nx, ny] = s.upright
            ? [(s.box.w * U) / 2, s.along(0)]
            : [s.along(0), s.across(s.view === "tab" ? 1 : s.n) - sp];
        a.nut = [nx, ny, "up"];
        a.under = [(s.box.w / 2) * U, s.box.h * U, "down"];
        return a;
    },
    describe: (p) =>
        `The neck of a ${p.tuning === "uke" ? "ukulele" : "guitar"} close up with ${p.frets} frets, the head and its pegs at one end and the body at the other, the strings drawn at their thicknesses.`,
    reads: true,
});
