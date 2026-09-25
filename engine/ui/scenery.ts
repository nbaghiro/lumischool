// Drawing a world around the roll: the horizon, the ground, the path, what stands beside it and the
// weather. Everything is drawn with the same seeded pen as the shelf, from the shelf's own drawings,
// so a world reads as the same hand as the questions rather than as a second art department.
//
// A few marks are drawn here rather than taken from the shelf: grass, leaves, sand, cobbles, tiles,
// floorboards, ballast, ripples, the planks and sleepers and stones of a path, clouds, rain, snow and
// stars. They are texture, not subjects. Nobody would put one in a question, they have no anchors
// and no parameters a lesson could vary, and a world needs hundreds of them, so they belong to the
// world and not to the shelf.
//
// Most of a world is painted only when the camera comes near it. A stretch is a year's term of roll,
// tens of thousands of units tall, and painting all of its texture and path up front cost more than
// a second on a journal late in the year; what is painted at once is the washes, which are a few
// rectangles, and everything else is handed back as pieces the page paints as they come into view.
//
// Nothing here draws on paper. The column the sheets sit in is left to the sheets, texture is kept
// out of it, and the one thing a world lays over a sheet's edge is tape, inside the sheet's own
// top padding, in the world's accent colour.
import "./world.css";
import { starPoints } from "../ink/pen";
import { U, washed, type TokenName, type Tokens } from "../paper";
import {
    artKey,
    BLEED,
    FADE,
    hash,
    LIMITS,
    rand,
    SKIES,
    SKY_OPACITY,
    TILE,
    washOf,
    type ArtRef,
    type Camera,
    type Size,
    type GroundKind,
    type PathKind,
    type Rect,
    type RollLayout,
    type Sample,
    type Scenery,
    type Season,
    type Standing,
    type Stretch,
    type StretchView,
    type WorldPicture,
    type WorldView,
} from "../space";
import { ticker } from "../motion/loop";
import { settleTime, springAt, type Spring } from "../motion/spring";
import { animate, type Group } from "./animate";
import { motionOf, type Drawing } from "../parts/drawing";
import { drawingOf } from "./drawings";
import { designOf, guideIdle, renderGuide } from "./guide";
import { applyPuff, bloom, PLACED, playMoment, walkIn } from "./player";
import { mapSurface } from "./map-surfaces";
import { readTokens } from "./read-tokens";
import { el, render, SvgPen as Pen } from "./svg";

interface Resolved {
    ref: ArtRef;
    v: Drawing<unknown>;
    params: unknown;
}

const CROP_STAGE: Record<Season, number> = { winter: 0, spring: 1, summer: 3, autumn: 4 };

/**
 * A drawing the view names, with the numbers it is drawn with: the view's, the drawing's own, and any
 * the caller adds. The painters read the drawings a page loaded for its worlds (drawings.ts) and
 * never the whole catalogue; a hand-drawn file comes wrapped to face either way, as the shelf wraps it.
 */
function resolve(
    ref: ArtRef | undefined,
    season?: Season,
    extra?: Record<string, unknown>,
): Resolved | null {
    if (!ref) return null;
    const v = drawingOf(artKey(ref));
    if (!v) return null;
    if (ref.from === "file") return { ref, v, params: { flip: false } };
    const params =
        ref.ref === "seasontrees"
            ? { seasons: [season ?? "summer"], names: 0 }
            : { ...(v.params as object), ...ref.params, ...extra };
    // a field of crops is the farm's tree through the year: sown, up, ripe and cut as its seasons turn
    if (ref.ref === "crops" && season && !extra?.stage)
        (params as Record<string, unknown>).stage = CROP_STAGE[season];
    return { ref, v, params };
}

/** A drawing's size in the world, in world units, with any numbers of its own it is drawn with. A drawing the view does not carry takes no room. */
export function artSize(
    ref: ArtRef | undefined,
    params?: Record<string, unknown>,
): { w: number; h: number } {
    const r = resolve(ref, undefined, params);
    if (!r) return { w: 0, h: 0 };
    const b = r.v.box(r.params);
    return { w: b.w * U * r.ref.scale, h: b.h * U * r.ref.scale };
}

/**
 * `play` is the group the drawing's declared motion plays on (engine/ui/animate.ts), in a world whose
 * drawings move; none where the world is still, or the page plays what it places itself.
 */
export interface ArtOptions {
    seed: number;
    flip?: boolean;
    season?: Season;
    cls?: string;
    play?: Group | null;
    params?: Record<string, unknown>;
}

/** One drawing the view names, placed in the world with its top-left at x, y. */
export function placeArt(
    ref: ArtRef | undefined,
    x: number,
    y: number,
    host: Element,
    o: ArtOptions,
): HTMLElement | null {
    const r = resolve(ref, o.season, o.params);
    if (!r) return null;
    const id = r.ref.ref,
        key = artKey(r.ref);
    // A hand-drawn file mirrors itself and puts its lettering back; a coded drawing turns round only
    // if it has a way to face, because a mirrored label is not something a child should have to read.
    const own = r.params as Record<string, unknown>;
    const params =
        r.ref.from === "file"
            ? { flip: !!o.flip }
            : o.flip && typeof own.facing === "number"
              ? { ...own, facing: -own.facing }
              : own;
    const out = render(r.v, params as never, { host, seed: o.seed });
    const b = out.box,
        w = b.w * U * r.ref.scale,
        h = b.h * U * r.ref.scale;
    out.svg.style.width = `${w}px`;
    out.svg.style.height = `${h}px`;
    out.svg.style.maxWidth = "none";
    const box = document.createElement("div");
    box.className = `j-art ${o.cls ?? ""}`;
    box.dataset.art = id;
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;
    box.append(out.svg);
    // Layout changes move a drawing without restarting its seeded idle phase.
    const at = hash(`${id}-${o.seed}`);
    const plays = o.play ? motionOf(r.v) : undefined;
    const playing = plays && o.play ? o.play.play(out.svg, { motion: plays, key: at }) : undefined;
    PLACED.set(box, {
        ref: key,
        anchors: out.anchors,
        scale: r.ref.scale,
        w,
        h,
        live: !!o.play,
        playing,
    });
    if (o.play) applyPuff(box, key, at);
    return box;
}

/** The picture a view holds of a world; a stretch names a world the view carries. */
function pictureIn(view: WorldView, id: string): WorldPicture {
    const p = view.pictures[id] ?? Object.values(view.pictures)[0];
    if (!p) throw new Error(`the view draws no world named ${id}`);
    return p;
}

/** The guides' idle, on the root's player, for the painters that have no group of their own yet (they gain one when they move, M5). */
let guides: Group | null = null;
const guidePlayer = (): Group => (guides ??= animate({ settle: "never" }));

/** The guide who lives in a world, drawn at a size in world units, idling on `on` or on the painters' own group. */
export function guideOf(
    world: Pick<WorldPicture, "guide" | "motion">,
    pose: "idle" | "point" | "cheer",
    size: number,
    host: Element,
    aim?: [number, number],
    on?: Group,
): SVGSVGElement {
    const d = designOf(world.guide);
    const k = size / 72;
    const g = renderGuide(d, { pose, aim }, { host, k, boil: world.motion });
    g.svg.classList.add("j-guide-svg");
    if (world.motion) guideIdle(on ?? guidePlayer(), g.svg, d);
    return g.svg;
}

/** The size a world's small picture is drawn at, in its own units, before a page scales it to its box. */
export const PICTURE = { w: 1500, h: 980 } as const;

/** Grounds whose marks are seams rather than growing things, in a world's small picture. */
const HARD_GROUND: readonly GroundKind[] = [
    "tiles",
    "boards",
    "town",
    "yard",
    "workshop",
    "litter",
    "granite",
    "cavern",
    "canal",
];

/**
 * A world as one small still picture of its horizon, for a page that shows the place rather than the
 * roll: its sky, its ground, a few marks of that ground, the drawings on its horizon and in its sky,
 * and its gate. It holds no guide, since it stands for the place and not for the child in it, and
 * nothing in it moves: no drawing is given a group, so it starts no ticker and is safe in a list.
 *
 * It is drawn at PICTURE's size and the page scales it to its box. The horizon is laid out at the
 * wide roll's width (2360 units, school/worlds/roll.ts), so the picture shows a world at a little
 * under two thirds of the size the roll draws it.
 */
export function paintPicture(
    w: WorldPicture,
    art: Readonly<Record<string, ArtRef>>,
    host: Element,
    seed = hash(`picture-${w.id}`),
): HTMLElement {
    // A page may draw a picture into a box that is not in the document yet, and no custom property
    // resolves on a detached element, so the palette would come out as the print one and the ground
    // black. The document's palette is the right one then, and a still picture is never drawn again.
    const styled = !!getComputedStyle(host).getPropertyValue("--card");
    const t = readTokens(styled ? host : document.documentElement);
    const W = PICTURE.w,
        H = PICTURE.h,
        line = Math.round(H * 0.6),
        K = W / 2360;
    const frame = document.createElement("div");
    frame.className = "wd-picture";
    frame.dataset.world = w.id;
    frame.setAttribute("aria-hidden", "true");
    frame.style.width = `${W}px`;
    frame.style.height = `${H}px`;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, "aria-hidden": "true" });
    const pen = new Pen(svg, { seed, t, paper: false, roughness: 1 });
    const defs = el("defs", {}, svg);
    const wash = washOf(w),
        strong = Math.min(LIMITS.washCap, wash * 1.3);
    const deep = w.light.deep && !w.indoor ? SKIES[w.light.deep] : null;
    const skyId = `wd-sky-${w.id}-${seed}`;
    const sky = el("linearGradient", { id: skyId, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    if (deep)
        for (const [o, col] of deep.stops)
            el(
                "stop",
                { offset: String(o), "stop-color": col, "stop-opacity": String(SKY_OPACITY) },
                sky,
            );
    else {
        const low = w.light.low ?? w.light.sky;
        el(
            "stop",
            {
                offset: "0",
                "stop-color": t[w.light.sky],
                "stop-opacity": String(w.indoor ? wash : strong),
            },
            sky,
        );
        el(
            "stop",
            {
                offset: "1",
                "stop-color": t[low],
                "stop-opacity": String(w.indoor ? wash : w.light.low ? strong : wash * 0.2),
            },
            sky,
        );
    }
    el("rect", { x: 0, y: 0, width: W, height: H, fill: t.card }, svg);
    el("rect", { x: 0, y: 0, width: W, height: line, fill: `url(#${skyId})` }, svg);
    el(
        "rect",
        {
            x: 0,
            y: line,
            width: W,
            height: H - line,
            fill: t[w.light.ground],
            opacity: String(wash),
        },
        svg,
    );
    const ink = { stroke: deep ? deep.soft : t["ink-soft"], strokeWidth: 2.2 };
    if (!w.indoor)
        pen.line(svg, 0, line, W, line, "pencil", {
            stroke: t["ink-soft"],
            strokeWidth: 3,
            roughness: 1.4,
        });
    // a few marks of the world's own ground, so it reads as that ground and not as a coloured band
    const rnd = rand(seed);
    for (let i = 0; i < 10; i++) {
        const x = 200 + rnd() * (W - 340),
            y = line + 60 + rnd() * (H - line - 110);
        if (w.indoor || HARD_GROUND.includes(w.ground))
            pen.line(svg, x - 46, y, x + 46, y, "pencil", ink);
        else if (w.ground === "shore" || w.ground === "sea" || w.ground === "reeds")
            pen.curve(
                svg,
                [
                    [x - 34, y],
                    [x - 17, y - 12],
                    [x, y],
                    [x + 17, y - 12],
                    [x + 34, y],
                ],
                "doodle",
                ink,
            );
        else if (w.ground === "snow" || w.ground === "ice")
            pen.arc(svg, x, y, 110, 30, Math.PI * 1.05, Math.PI * 1.95, "pencil", ink);
        else
            for (const [dx, lean] of [
                [-10, -0.5],
                [0, 0],
                [10, 0.5],
            ] as const)
                pen.line(svg, x + dx, y, x + dx + lean * 16, y - 30, "doodle", ink);
    }
    frame.append(svg);
    /** One of the world's drawings, its middle at `at` across the picture and its foot on `foot`. */
    const put = (
        id: string,
        at: number,
        foot: number,
        k: number,
        params?: Record<string, unknown>,
        origin = "50% 100%",
    ): void => {
        const ref = art[id];
        const size = artSize(ref, params);
        const a = placeArt(ref, W * at - size.w / 2, foot - size.h, host, {
            seed: seed + Math.round(at * 1000),
            params,
            cls: deep ? "far deep" : "far",
            season: w.seasons[0],
        });
        if (!a) return;
        if (k !== 1) {
            a.style.transform = `scale(${k})`;
            a.style.transformOrigin = origin;
        }
        frame.append(a);
    };
    for (const f of w.horizon.sky ?? []) {
        const k = K * (f.k ?? 1),
            top = line * (f.down ?? 0.1);
        put(f.art, f.at, top + artSize(art[f.art]).h, k, undefined, "50% 0");
    }
    for (const f of w.horizon.far)
        put(
            f.art,
            f.at,
            line + (f.sink ?? 8),
            K * (f.k ?? 1),
            f.art === "window" ? { outside: w.weather } : f.params,
        );
    const m = w.chapter.moment;
    put(w.horizon.gate, 0.2, H - 30, K * 1.05, m.art === w.horizon.gate ? m.before : undefined);
    return frame;
}

interface Pad {
    svg: SVGSVGElement;
    pen: Pen;
    g: SVGGElement;
}

function pad(r: Rect, seed: number, t: Tokens, cls: string): Pad {
    const svg = el("svg", {
        class: `j-sk ${cls}`,
        viewBox: `${r.x} ${r.y} ${r.w} ${r.h}`,
        "aria-hidden": "true",
    });
    svg.style.left = `${r.x}px`;
    svg.style.top = `${r.y}px`;
    svg.style.width = `${r.w}px`;
    svg.style.height = `${r.h}px`;
    return { svg, pen: new Pen(svg, { seed, t, paper: false, roughness: 1 }), g: el("g", {}, svg) };
}

/** Is x in the column the sheets sit in, with the clear margin round it? Texture stays out of it. */
/** A world with no lessons yet has no sheets, so its ground runs across the middle too. */
const inColumn = (l: RollLayout, x: number, w = 0) =>
    !l.bare && x + w > -l.o.sheet / 2 - LIMITS.clear && x < l.o.sheet / 2 + LIMITS.clear;

/** A piece of a world painted when it comes into view. It draws into its stretch and returns anything placed beside. */
export interface Piece {
    rect: Rect;
    key?: string;
    origin?: number;
    paint(): Element[];
    release?(): void;
}

export function releaseScenery(elements: readonly Element[]): void {
    for (const element of elements) {
        const drawings = [element, ...element.querySelectorAll(".j-art")];
        for (const drawing of drawings)
            if (drawing instanceof HTMLElement) PLACED.get(drawing)?.playing?.stop();
        element.remove();
    }
}

/** Everything a ground or a path painter needs about the stretch it is painting. */
interface Ctx {
    p: Pad;
    world: WorldPicture;
    t: Tokens;
    l: RollLayout;
    s: Stretch;
    /** Every drawing the view names, by art id. */
    art: Record<string, ArtRef>;
    /** Where the world's name is written on the sky, and the most room it takes. */
    label: Rect & { k: number };
    line: number;
    origin: number;
    X0: number;
    X1: number;
    wash: number;
    ink: string;
    /** What is drawn on the sky in pencil: the ink by day, and the deep sky's own light ink by night. */
    skyInk: string;
    /** How far down the roll the child has walked: a path that marks it (lanterns) is lit above this. */
    walked: number;
    /** Where a world whose water moves draws its waves over a rect: layers of their own that flow without redrawing, a mark to each in turn. */
    water?: (r: Rect) => SVGGElement[];
    washes: SVGGElement;
    texture: SVGGElement;
    host: Element;
    /** A free spot in the margins of a tile, or null when the tile has none. */
    spot(r: Rect, rnd: () => number, reach?: number): { x: number; y: number } | null;
}

interface Ground {
    /** What is painted at once with the washes: a sea, an embankment, cupboards. Cheap shapes only. */
    eager?(c: Ctx): void;
    /** Marks along the horizon, painted with it. */
    horizon?(c: Ctx, rnd: () => number): void;
    /** Texture in one tile of the margins. */
    tile(c: Ctx, r: Rect, rnd: () => number): void;
}

const tuft = (c: Ctx, x: number, y: number, k: number, g: SVGGElement) => {
    for (const [dx, lean] of [
        [-7, -0.5],
        [0, 0],
        [7, 0.5],
    ] as const) {
        c.p.pen.curve(
            g,
            [
                [x + dx * k, y],
                [x + (dx + lean * 6) * k, y - 14 * k],
                [x + (dx + lean * 11) * k, y - 26 * k],
            ],
            "doodle",
            { stroke: c.ink, strokeWidth: 1.6, roughness: 0.8 },
        );
    }
};
const perArea = (r: Rect, per: number) => Math.round((r.w * r.h) / per);
/** A shore across its stretch: water out to SEA of the width from either edge, sand from SAND, and the wash blending between. */
const SEA = 0.3,
    SAND = 0.37;

/** A line of long grass along the horizon, which the meadow, the woods and the hill all stand in. */
const grassLine = (c: Ctx, rnd: () => number, gap = 46) => {
    for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += gap + rnd() * 40)
        tuft(c, x, c.line + 30 + rnd() * 90, 0.8 + rnd() * 0.5, el("g", {}, c.texture));
};

const GROUNDS: Record<GroundKind, Ground> = {
    meadow: {
        horizon: (c, rnd) => grassLine(c, rnd),
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 60000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const g = el("g", {}, c.texture),
                    k = 0.7 + rnd() * 0.6;
                tuft(c, at.x, at.y, k, g);
                if (rnd() < 0.12)
                    c.p.pen.circle(
                        g,
                        at.x + 14,
                        at.y - 30 * k,
                        12,
                        "pencil",
                        c.p.pen.fill(rnd() < 0.5 ? "berry" : "glow"),
                        { strokeWidth: 1.2 },
                    );
            }
        },
    },
    shore: {
        eager: (c) => {
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line - 10,
                    width: c.X1 - c.X0,
                    height: Math.round(c.s.horizon.h * 0.15),
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.6, c.wash * 1.9)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            const deep = Math.round(c.s.horizon.h * 0.15);
            const g = c.water?.({
                x: c.l.x0 - 300,
                y: c.line + 10,
                w: c.l.x1 - c.l.x0 + 600,
                h: deep + 60,
            }) ?? [c.texture];
            let n = 0;
            for (let row = 0; row < Math.floor(deep / 52); row++) {
                for (
                    let x = c.l.x0 - 200 + (row % 2) * 90;
                    x < c.l.x1 + 200;
                    x += 180 + rnd() * 60
                ) {
                    const y = c.line + 40 + row * 48;
                    c.p.pen.curve(
                        g[n++ % g.length] ?? c.texture,
                        [
                            [x, y],
                            [x + 22, y - 8],
                            [x + 44, y],
                            [x + 66, y - 8],
                        ],
                        "doodle",
                        { stroke: c.ink, strokeWidth: 1.4, roughness: 0.7 },
                    );
                }
            }
        },
        tile: (c, r, rnd) => {
            // a wave wherever the ground is painted as water, from half way through the sand's edge
            const shoreline = (0.5 - (SEA + SAND) / 2) * (c.X1 - c.X0);
            let water: SVGGElement[] | null = null,
                n = 0;
            for (let i = 0; i < perArea(r, 55000); i++) {
                const at = c.spot(r, rnd, 420);
                if (!at) continue;
                if (Math.abs(at.x) > shoreline) {
                    water ??= c.water?.(r) ?? [c.texture];
                    c.p.pen.curve(
                        water[n++ % water.length] ?? c.texture,
                        [
                            [at.x - 22, at.y],
                            [at.x - 8, at.y - 8],
                            [at.x + 8, at.y],
                            [at.x + 22, at.y - 8],
                        ],
                        "doodle",
                        { stroke: c.ink, strokeWidth: 1.3, roughness: 0.6 },
                    );
                } else if (rnd() < 0.9) {
                    c.p.pen.arc(
                        c.texture,
                        at.x,
                        at.y,
                        34 + rnd() * 20,
                        12,
                        Math.PI * 1.1,
                        Math.PI * 1.9,
                        "pencil",
                        { stroke: c.ink, strokeWidth: 1.1, roughness: 0.6 },
                    );
                } else {
                    const g = el("g", {}, c.texture);
                    c.p.pen.polygon(
                        g,
                        [
                            [at.x - 12, at.y],
                            [at.x, at.y - 16],
                            [at.x + 12, at.y],
                        ],
                        "pencil",
                        c.p.pen.fill("berry"),
                        { strokeWidth: 1.2 },
                    );
                    for (const dx of [-6, 0, 6])
                        c.p.pen.line(g, at.x, at.y - 15, at.x + dx, at.y - 1, "pencil", {
                            stroke: c.ink,
                            strokeWidth: 0.9,
                        });
                }
            }
        },
    },
    yard: {
        eager: (c) => {
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line,
                    width: c.X1 - c.X0,
                    height: 70,
                    fill: c.ink,
                    opacity: "0.12",
                },
                c.washes,
            );
        },
        horizon: (c) => {
            const bank = el("g", {}, c.washes);
            c.p.pen.line(bank, c.X0, c.line + 70, c.X1, c.line + 70, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.6,
            });
            for (let x = c.X0 + 20; x < c.X1; x += 34)
                c.p.pen.line(bank, x, c.line + 6, x - 10, c.line + 64, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                    roughness: 0.6,
                });
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 75000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                if (rnd() < 0.8)
                    c.p.pen.circle(c.texture, at.x, at.y, 5 + rnd() * 4, "pencil", null, {
                        stroke: c.ink,
                        strokeWidth: 1.1,
                    });
                else willowherb(c, at.x, at.y);
            }
        },
    },
    woods: {
        horizon: (c, rnd) => {
            // bracken along the foot of the trees, and the first fallen leaves
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 70 + rnd() * 50)
                fern(c, x, c.line + 40 + rnd() * 70, 0.9 + rnd() * 0.5);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 30000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.62)
                    leaf(
                        c,
                        at.x,
                        at.y,
                        rnd() * Math.PI * 2,
                        (["tang", "berry", "glow"] as const)[Math.floor(rnd() * 3)] ?? "tang",
                    );
                else if (roll < 0.86) fern(c, at.x, at.y, 0.7 + rnd() * 0.4);
                else toadstool(c, at.x, at.y, 0.8 + rnd() * 0.5);
            }
        },
    },
    town: {
        tile: (c, r, rnd) => {
            // paving: slabs in staggered rows, laid on the squares, a few of them missing or cracked
            const g = el("g", { opacity: "0.7" }, c.texture),
                sw = 140,
                sh = 100;
            for (
                let y = Math.max(c.line + 60, c.origin + Math.ceil((r.y - c.origin) / sh) * sh);
                y < r.y + r.h;
                y += sh
            ) {
                const shift = (Math.round((y - c.origin) / sh) % 2) * (sw / 2);
                for (
                    let x = Math.floor((c.l.x0 - 300) / sw) * sw + shift;
                    x < c.l.x1 + 300;
                    x += sw
                ) {
                    if (inColumn(c.l, x, sw) || rnd() < 0.4) continue;
                    c.p.pen.rect(g, x + 4, y + 4, sw - 8, sh - 8, "pencil", null, {
                        stroke: c.ink,
                        strokeWidth: 0.9,
                        roughness: 0.9,
                    });
                    if (rnd() < 0.05)
                        c.p.pen.linear(
                            g,
                            [
                                [x + 12, y + 10],
                                [x + 30, y + 26],
                                [x + 26, y + 44],
                            ],
                            "pencil",
                            { stroke: c.ink, strokeWidth: 0.8 },
                        );
                }
            }
            if (c.world.weather === "rain") puddles(c, r, rnd);
        },
    },
    tiles: {
        eager: (c) => cupboards(c),
        tile: (c, r) => {
            // the floor: big tiles five squares across, every other one tinted, so they sit on the paper's grid
            const size = 100,
                g = el("g", { class: "floor" }, c.washes);
            const y0 = Math.max(
                c.line + 180,
                c.origin + Math.floor((r.y - c.origin) / size) * size,
            );
            for (let y = y0; y < r.y + r.h; y += size) {
                for (let x = Math.floor(c.X0 / size) * size; x < c.X1; x += size) {
                    if ((Math.round(x / size) + Math.round((y - c.origin) / size)) % 2 === 0)
                        el(
                            "rect",
                            {
                                x,
                                y,
                                width: size,
                                height: size,
                                fill: c.t[c.world.light.ground],
                                opacity: String(Math.min(LIMITS.washCap, c.wash * 0.45)),
                            },
                            g,
                        );
                }
            }
        },
    },
    boards: {
        eager: (c) => cupboards(c),
        tile: (c, r, rnd) => {
            const g = el("g", { opacity: "0.7" }, c.texture),
                gap = 90;
            const y0 = Math.max(c.line + 200, c.origin + Math.ceil((r.y - c.origin) / gap) * gap);
            for (let y = y0; y < r.y + r.h; y += gap) {
                c.p.pen.line(g, c.l.x0 - 240, y, c.l.x1 + 240, y, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                    roughness: 0.5,
                });
                for (
                    let x = c.l.x0 - 240 + (((y - c.origin) / gap) % 3) * 150;
                    x < c.l.x1 + 240;
                    x += 440 + rnd() * 80
                ) {
                    if (inColumn(c.l, x - 10, 20)) continue;
                    c.p.pen.line(g, x, y, x, y + gap, "pencil", {
                        stroke: c.ink,
                        strokeWidth: 1,
                        roughness: 0.4,
                    });
                    c.p.pen.circle(
                        g,
                        x + 10,
                        y + 12,
                        3,
                        "ruler",
                        { fill: c.ink, fillStyle: "solid" },
                        { stroke: "none" },
                    );
                }
            }
        },
    },
    hill: {
        horizon: (c, rnd) => {
            // the hill's own brow, rolling across the world, with long grass along it
            const pts: [number, number][] = [];
            for (let x = c.X0; x <= c.X1; x += 160)
                pts.push([x, c.line + 20 - 40 * Math.sin(x / 520) - 20 * Math.sin(x / 190)]);
            // under a deep sky the brow is where the dark stops, so the hill is filled in the ground's own wash up to it
            if (c.world.light.deep) {
                const [r, g, b] = washed(c.t[c.world.light.ground], c.wash);
                el(
                    "path",
                    {
                        d: `M${pts.map((q) => q.join(" ")).join("L")}L${c.X1} ${c.line + 4}L${c.X0} ${c.line + 4}Z`,
                        fill: `rgb(${r} ${g} ${b})`,
                    },
                    c.washes,
                );
            }
            c.p.pen.curve(c.washes, pts, "pencil", {
                stroke: c.ink,
                strokeWidth: 2,
                roughness: 1.2,
            });
            grassLine(c, rnd, 70);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 90000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                if (rnd() < 0.7) tuft(c, at.x, at.y, 0.6 + rnd() * 0.4, el("g", {}, c.texture));
                else
                    c.p.pen.circle(c.texture, at.x, at.y, 7, "pencil", c.p.pen.fill("glow"), {
                        strokeWidth: 0.9,
                    });
            }
        },
    },
    snow: {
        horizon: (c, rnd) => {
            // drifts along the foot of the peaks, with rocks showing through them
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 120 + rnd() * 80) {
                const y = c.line + 36 + rnd() * 80;
                c.p.pen.arc(
                    c.texture,
                    x,
                    y,
                    90 + rnd() * 60,
                    26,
                    Math.PI * 1.05,
                    Math.PI * 1.95,
                    "pencil",
                    { stroke: c.ink, strokeWidth: 1.3 },
                );
                if (rnd() < 0.3) rock(c, x + 40, y + 24, 0.8 + rnd() * 0.4);
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 70000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.5)
                    c.p.pen.arc(
                        c.texture,
                        at.x,
                        at.y,
                        60 + rnd() * 50,
                        18,
                        Math.PI * 1.05,
                        Math.PI * 1.95,
                        "pencil",
                        { stroke: c.ink, strokeWidth: 1.1 },
                    );
                else if (roll < 0.8) rock(c, at.x, at.y, 0.6 + rnd() * 0.6);
                else littleFir(c, at.x, at.y, 0.6 + rnd() * 0.4);
            }
        },
    },
    sea: {
        // the open sea in a winter crossing: swells running before the wind, a crest breaking now and
        // then, the rings rain makes on the water and streaks of foam drawn out by the wind
        horizon: (c, rnd) => {
            for (let row = 0; row < 3; row++)
                for (
                    let x = c.l.x0 - 200 + (row % 2) * 90;
                    x < c.l.x1 + 200;
                    x += 230 + rnd() * 60
                ) {
                    const y = c.line + 44 + row * 46;
                    if (row === 0 && rnd() < 0.45)
                        crest(c, x, y + 10, 1.1, rnd() < 0.5 ? 1 : -1, rnd);
                    else swell(c, x, y, 1.1 - row * 0.15);
                }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 56000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.5) swell(c, at.x, at.y, 0.8 + rnd() * 0.5);
                else if (roll < 0.78)
                    crest(c, at.x, at.y, 0.8 + rnd() * 0.4, rnd() < 0.5 ? 1 : -1, rnd);
                else if (roll < 0.9) rings(c, at.x, at.y, rnd);
                else streaks(c, at.x, at.y, rnd);
            }
        },
    },
    jungle: {
        horizon: (c, rnd) => {
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 80 + rnd() * 60)
                bigLeaf(
                    c,
                    x,
                    c.line + 70 + rnd() * 50,
                    -Math.PI / 2 + (rnd() - 0.5) * 1.4,
                    1 + rnd() * 0.4,
                );
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 36000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.45) bigLeaf(c, at.x, at.y, rnd() * Math.PI * 2, 0.7 + rnd() * 0.4);
                else if (roll < 0.7) fern(c, at.x, at.y, 0.8 + rnd() * 0.4);
                else if (roll < 0.86) {
                    const g = el("g", {}, c.texture);
                    for (let k = 0; k < 5; k++) {
                        const a = (k / 5) * Math.PI * 2;
                        c.p.pen.circle(
                            g,
                            at.x + Math.cos(a) * 9,
                            at.y + Math.sin(a) * 9,
                            12,
                            "pencil",
                            c.p.pen.fill("berry"),
                            { stroke: c.ink, strokeWidth: 0.9 },
                        );
                    }
                    c.p.pen.circle(g, at.x, at.y, 8, "pencil", c.p.pen.fill("glow"), {
                        stroke: c.ink,
                        strokeWidth: 0.9,
                    });
                } else
                    c.p.pen.ellipse(c.texture, at.x, at.y, 18, 11, "pencil", c.p.pen.fill("card"), {
                        stroke: c.ink,
                        strokeWidth: 1,
                    });
            }
        },
    },
    field: {
        tile: (c, r, rnd) => {
            // mown stripes across the grass, and a chalk line now and then
            const band = 160,
                g = el("g", {}, c.washes);
            for (
                let y = Math.max(
                    c.line + 60,
                    c.origin + Math.floor((r.y - c.origin) / band) * band,
                );
                y < r.y + r.h;
                y += band
            ) {
                if (Math.round((y - c.origin) / band) % 2 === 0)
                    el(
                        "rect",
                        {
                            x: c.X0,
                            y,
                            width: c.X1 - c.X0,
                            height: band,
                            fill: c.t[c.world.light.ground],
                            opacity: String(Math.min(LIMITS.washCap, c.wash * 0.7)),
                        },
                        g,
                    );
            }
            for (let i = 0; i < perArea(r, 160000); i++) {
                const at = c.spot(r, rnd, 240);
                if (at) tuft(c, at.x, at.y, 0.55, el("g", {}, c.texture));
            }
        },
    },
    // the eleven round the run, each a ground of its own (.docs/overworld.md)
    lawn: {
        horizon: (c, rnd) => {
            // a picket fence closes the garden along the horizon, with a border of flowers at its foot
            const g = el("g", {}, c.washes);
            for (const y of [c.line - 44, c.line - 14])
                c.p.pen.line(g, c.X0 + 200, y, c.X1 - 200, y, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1.3,
                });
            for (let x = c.l.x0 - 320; x < c.l.x1 + 320; x += 34)
                c.p.pen.linear(
                    g,
                    [
                        [x - 9, c.line],
                        [x - 9, c.line - 58],
                        [x, c.line - 72],
                        [x + 9, c.line - 58],
                        [x + 9, c.line],
                    ],
                    "pencil",
                    { stroke: c.ink, strokeWidth: 1.1, roughness: 0.7 },
                );
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 70 + rnd() * 60) {
                const g2 = el("g", {}, c.texture),
                    k = 0.8 + rnd() * 0.4;
                tuft(c, x, c.line + 22, k, g2);
                if (rnd() < 0.7)
                    c.p.pen.circle(
                        g2,
                        x + 12,
                        c.line - 6,
                        18 * k,
                        "pencil",
                        c.p.pen.fill(
                            (["berry", "glow", "tang", "sky"] as TokenName[])[
                                Math.floor(rnd() * 4)
                            ],
                        ),
                        { stroke: c.ink, strokeWidth: 1 },
                    );
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 40000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd(),
                    k = 0.8 + rnd() * 0.5;
                if (roll < 0.5) daisy(c, at.x, at.y, k);
                else if (roll < 0.8) clover(c, at.x, at.y, k);
                else
                    c.p.pen.circle(c.texture, at.x, at.y, 11 * k, "pencil", c.p.pen.fill("glow"), {
                        stroke: c.ink,
                        strokeWidth: 0.9,
                    });
            }
        },
    },
    reeds: {
        eager: (c) => {
            // the still water right under the horizon, deeper than the pools, where the far row is doubled
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line,
                    width: c.X1 - c.X0,
                    height: Math.round(c.s.horizon.h * 0.24),
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.4, c.wash * 1.6)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 60 + rnd() * 70)
                reedClump(c, x, c.line + 8 + rnd() * 10, 0.9 + rnd() * 0.5, rnd);
            for (let i = 0; i < 26; i++) {
                const x = c.l.x0 - 200 + rnd() * (c.l.x1 - c.l.x0 + 400),
                    y = c.line + 60 + rnd() * c.s.horizon.h * 0.18;
                c.p.pen.line(c.texture, x - 40 - rnd() * 40, y, x + 40 + rnd() * 40, y, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                    roughness: 0.4,
                });
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 38000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.4) reedClump(c, at.x, at.y, 0.7 + rnd() * 0.5, rnd);
                else if (roll < 0.72) lilyPad(c, at.x, at.y, 0.8 + rnd() * 0.5, rnd() < 0.25);
                else
                    c.p.pen.arc(
                        c.texture,
                        at.x,
                        at.y,
                        60 + rnd() * 40,
                        14,
                        Math.PI * 0.1,
                        Math.PI * 0.9,
                        "pencil",
                        { stroke: c.ink, strokeWidth: 1, roughness: 0.5 },
                    );
            }
        },
    },
    park: {
        eager: (c) => {
            // a thin band of sea behind the promenade railings, the harbour town's bay
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line - 90,
                    width: c.X1 - c.X0,
                    height: 90,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.5, c.wash * 1.8)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            const g = el("g", {}, c.washes);
            for (let x = c.l.x0 - 200 + rnd() * 60; x < c.l.x1 + 200; x += 170 + rnd() * 70)
                wave(c, x, c.line - 44, 0.7);
            c.p.pen.line(g, c.X0 + 200, c.line - 40, c.X1 - 200, c.line - 40, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.6,
            });
            c.p.pen.line(g, c.X0 + 200, c.line - 6, c.X1 - 200, c.line - 6, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.1,
            });
            for (let x = c.l.x0 - 320; x < c.l.x1 + 320; x += 26) {
                c.p.pen.line(g, x, c.line, x, c.line - 46, "ruler", {
                    stroke: c.ink,
                    strokeWidth: 1,
                    roughness: 0.3,
                });
                if (Math.round(x / 26) % 6 === 0)
                    c.p.pen.circle(g, x, c.line - 50, 8, "pencil", c.p.pen.fill("glow"), {
                        stroke: c.ink,
                        strokeWidth: 0.9,
                    });
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 150000) + 1; i++) {
                const at = c.spot(r, rnd, 200);
                if (at)
                    (rnd() < 0.62 ? flowerBed : deckchair)(c, at.x, at.y, 0.9 + rnd() * 0.3, rnd);
            }
            for (let i = 0; i < perArea(r, 36000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                if (rnd() < 0.55)
                    c.p.pen.ellipse(c.texture, at.x, at.y, 9, 6, "pencil", c.p.pen.fill("berry"), {
                        stroke: c.ink,
                        strokeWidth: 0.6,
                    });
                else tuft(c, at.x, at.y, 0.5, el("g", {}, c.texture));
            }
        },
    },
    canal: {
        eager: (c) => {
            // the canal cut straight along the foot of the horizon, and down both far margins
            const band = 84,
                far = c.l.x1 + 60;
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line + 30,
                    width: c.X1 - c.X0,
                    height: band,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.5, c.wash * 1.9)),
                },
                c.washes,
            );
            for (const x of [-far - 200, far])
                el(
                    "rect",
                    {
                        x,
                        y: c.line + 30,
                        width: 200,
                        height: c.s.ground.y + c.s.ground.h - c.line,
                        fill: c.t.sky,
                        opacity: String(Math.min(LIMITS.washCap * 1.4, c.wash * 1.7)),
                    },
                    c.washes,
                );
        },
        horizon: (c, rnd) => {
            const g = el("g", {}, c.washes),
                band = 84,
                far = c.l.x1 + 60;
            for (const y of [c.line + 30, c.line + 30 + band])
                coping(c, g, c.X0 + 200, y, c.X1 - 200, y);
            for (const x of [-far, far])
                coping(c, g, x, c.line + 30 + band, x, c.s.ground.y + c.s.ground.h - 200);
            for (let x = c.l.x0 - 200 + rnd() * 60; x < c.l.x1 + 200; x += 150 + rnd() * 80)
                c.p.pen.curve(
                    c.texture,
                    [
                        [x, c.line + 72],
                        [x + 16, c.line + 66],
                        [x + 32, c.line + 72],
                    ],
                    "doodle",
                    { stroke: c.ink, strokeWidth: 1.1, roughness: 0.6 },
                );
        },
        tile: (c, r, rnd) => {
            // setts in courses across the quay, each course a run of small stones with a gap where some have sunk
            const g = el("g", { opacity: "0.7" }, c.texture),
                row = 24;
            for (
                let y = Math.max(c.line + 170, c.origin + Math.ceil((r.y - c.origin) / row) * row);
                y < r.y + r.h;
                y += row
            ) {
                if (Math.floor((y - c.origin) / row) % 7 > 3) continue;
                const shift = (Math.round((y - c.origin) / row) % 2) * 14;
                for (let x = c.l.x0 - 260 + shift; x < c.l.x1 + 40; x += 30) {
                    if (inColumn(c.l, x, 28) || rnd() < 0.3) continue;
                    c.p.pen.rect(g, x, y, 26, 19, "pencil", null, {
                        stroke: c.ink,
                        strokeWidth: 0.8,
                        roughness: 1.2,
                    });
                }
            }
            for (let i = 0; i < perArea(r, 70000); i++) {
                const at = c.spot(r, rnd, 60);
                if (!at) continue;
                if (rnd() < 0.8)
                    leaf(
                        c,
                        at.x,
                        at.y,
                        rnd() * Math.PI * 2,
                        (["tang", "glow", "berry"] as const)[Math.floor(rnd() * 3)] ?? "tang",
                    );
                else bollard(c, at.x, at.y);
            }
            // the far margins' water, with a ripple now and then
            for (const sd of [-1, 1])
                for (let y = Math.max(r.y, c.line + 200); y < r.y + r.h; y += 220 + rnd() * 120) {
                    const x = sd * (c.l.x1 + 160);
                    c.p.pen.curve(
                        c.texture,
                        [
                            [x - 30, y],
                            [x - 12, y - 8],
                            [x + 6, y],
                            [x + 24, y - 8],
                        ],
                        "doodle",
                        { stroke: c.ink, strokeWidth: 1.1, roughness: 0.6 },
                    );
                }
        },
    },
    ice: {
        horizon: (c, rnd) => {
            // the far bank of the lake, heaped with snow, with the fair's lights strung along it
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 110 + rnd() * 90)
                c.p.pen.arc(
                    c.texture,
                    x,
                    c.line + 10,
                    140 + rnd() * 80,
                    40,
                    Math.PI * 1.02,
                    Math.PI * 1.98,
                    "pencil",
                    { stroke: c.skyInk, strokeWidth: 1.4 },
                );
            festoon(c, c.l.x0 - 260, c.l.x1 + 260, c.line + 6, rnd);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 52000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.5) skateCurl(c, at.x, at.y, 0.8 + rnd() * 0.6, rnd);
                else if (roll < 0.78) crack(c, at.x, at.y, rnd);
                else
                    c.p.pen.arc(
                        c.texture,
                        at.x,
                        at.y,
                        70 + rnd() * 40,
                        18,
                        Math.PI * 1.05,
                        Math.PI * 1.95,
                        "pencil",
                        { stroke: c.ink, strokeWidth: 1.1 },
                    );
            }
        },
    },
    furrows: {
        horizon: (c, rnd) => {
            // a valley: the fields climb the hillsides either side, and the far row stands in the notch between
            const lift = (x: number) =>
                Math.max(0, Math.pow(Math.abs(x) / (c.l.x1 + 600), 1.6)) * 330;
            const pts: [number, number][] = [];
            for (let x = c.X0; x <= c.X1; x += 120)
                pts.push([x, c.line - lift(x) + 8 * Math.sin(x / 90)]);
            const [r0, g0, b0] = washed(c.t[c.world.light.ground], c.wash);
            el(
                "path",
                {
                    d: `M${pts.map((q) => q.join(" ")).join("L")}L${c.X1} ${c.line + 4}L${c.X0} ${c.line + 4}Z`,
                    fill: `rgb(${r0} ${g0} ${b0})`,
                },
                c.washes,
            );
            c.p.pen.curve(c.washes, pts, "pencil", {
                stroke: c.ink,
                strokeWidth: 2,
                roughness: 1.1,
            });
            // hedges dividing the hillside into fields, each with its furrows running its own way
            for (let x = c.l.x0 - 500; x < c.l.x1 + 500; x += 260 + rnd() * 160) {
                if (Math.abs(x) < 520) continue;
                const top = c.line - lift(x),
                    g = el("g", {}, c.texture);
                c.p.pen.curve(
                    g,
                    [
                        [x, top + 4],
                        [x + 18, (top + c.line) / 2],
                        [x + 6, c.line],
                    ],
                    "pencil",
                    { stroke: c.ink, strokeWidth: 1.4 },
                );
                const dir = rnd() < 0.5 ? 1 : -1;
                for (let k = 1; k < 5; k++)
                    c.p.pen.line(
                        g,
                        x + 20,
                        top + (k * (c.line - top)) / 5,
                        x + 150,
                        top + (k * (c.line - top)) / 5 + dir * 20,
                        "pencil",
                        { stroke: c.ink, strokeWidth: 0.9, roughness: 0.5 },
                    );
            }
            // a dry-stone wall along the foot of the valley
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 26)
                c.p.pen.arc(c.texture, x, c.line + 16, 26, 16, Math.PI, Math.PI * 2, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                    roughness: 0.7,
                });
        },
        tile: (c, r, rnd) => {
            // a patchwork of plots down each margin, hedged, each with its furrows running its own way
            const plot = 430,
                inner = c.l.o.sheet / 2 + LIMITS.clear + 30;
            for (
                let y = Math.max(
                    c.line + 120,
                    c.origin + Math.ceil((r.y - c.origin) / plot) * plot,
                );
                y < r.y + r.h - 60;
                y += plot
            ) {
                for (const sd of [-1, 1]) {
                    const x0 = sd < 0 ? c.l.x0 - 240 : inner,
                        x1 = sd < 0 ? -inner : c.l.x1 + 240,
                        mid = x0 + (x1 - x0) * (0.4 + rnd() * 0.2);
                    for (const [a, b] of [
                        [x0, mid],
                        [mid, x1],
                    ] as const)
                        if (c.l.bare || !inColumn(c.l, a, b - a))
                            fieldPatch(c, a + 14, y + 14, b - a - 28, plot - 28, rnd);
                }
            }
        },
    },
    crag: {
        horizon: (c, rnd) => {
            // the crag: the ground climbs from the right to a rocky brow on the left, where the tower stands
            const pts: [number, number][] = [];
            for (let x = c.X0; x <= c.X1; x += 100) {
                const u = (x - c.l.x0) / (c.l.x1 - c.l.x0);
                pts.push([
                    x,
                    c.line - Math.max(0, 1 - Math.abs(u - 0.18) * 1.7) * 220 + (rnd() - 0.5) * 18,
                ]);
            }
            const [r0, g0, b0] = washed(c.t[c.world.light.ground], c.wash);
            el(
                "path",
                {
                    d: `M${pts.map((q) => q.join(" ")).join("L")}L${c.X1} ${c.line + 4}L${c.X0} ${c.line + 4}Z`,
                    fill: `rgb(${r0} ${g0} ${b0})`,
                },
                c.washes,
            );
            c.p.pen.linear(c.washes, pts, "pencil", {
                stroke: c.ink,
                strokeWidth: 2.2,
                roughness: 1.6,
            });
            for (let x = c.l.x0 - 200; x < c.l.x1 + 200; x += 130 + rnd() * 120) {
                const u = (x - c.l.x0) / (c.l.x1 - c.l.x0),
                    y = c.line - Math.max(0, 1 - Math.abs(u - 0.18) * 1.7) * 220 + 20;
                (rnd() < 0.55 ? rock : wallStub)(c, x, y + 10, 0.9 + rnd() * 0.6);
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 42000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.28) rock(c, at.x, at.y, 0.6 + rnd() * 0.5);
                else if (roll < 0.42) wallStub(c, at.x, at.y, 0.7 + rnd() * 0.4);
                else if (roll < 0.62) poppy(c, at.x, at.y, 0.8 + rnd() * 0.4);
                else if (roll < 0.82) fern(c, at.x, at.y, 0.7 + rnd() * 0.4);
                else tuft(c, at.x, at.y, 0.7, el("g", {}, c.texture));
            }
        },
    },
    terraces: {
        eager: (c) => {
            // the bay below the town, bright under the noon sun
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line - 4,
                    width: c.X1 - c.X0,
                    height: 150,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.6, c.wash * 2)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            for (let row = 0; row < 2; row++)
                for (let x = c.l.x0 - 200 + row * 80; x < c.l.x1 + 200; x += 170 + rnd() * 60)
                    wave(c, x, c.line + 40 + row * 50, 0.9);
            const g = el("g", {}, c.washes);
            c.p.pen.line(g, c.X0 + 200, c.line + 146, c.X1 - 200, c.line + 146, "pencil", {
                stroke: c.ink,
                strokeWidth: 2,
            });
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 90)
                c.p.pen.line(g, x, c.line + 146, x, c.line + 166, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                });
        },
        tile: (c, r, rnd) => {
            // terraces stepping down the hillside: lengths of low white wall at staggered heights, pots of flowers along them
            for (
                let y = Math.max(c.line + 300, c.origin + Math.ceil((r.y - c.origin) / 380) * 380);
                y < r.y + r.h;
                y += 380
            ) {
                for (const sd of [-1, 1]) {
                    if (rnd() < 0.3) continue;
                    const inner = c.l.o.sheet / 2 + LIMITS.clear + 20,
                        outer = c.l.x1 + 260,
                        w = 280 + rnd() * 360,
                        from = inner + rnd() * Math.max(0, outer - inner - w);
                    const x0 = sd > 0 ? from : -from - w;
                    terraceWall(c, x0, x0 + w, y + (rnd() - 0.5) * 120, rnd);
                }
            }
            for (let i = 0; i < perArea(r, 140000); i++) {
                const at = c.spot(r, rnd, 240);
                if (at) (rnd() < 0.5 ? steps : tileInset)(c, at.x, at.y);
            }
        },
    },
    wildflowers: {
        eager: (c) => {
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line + 20,
                    width: c.X1 - c.X0,
                    height: 110,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.4, c.wash * 1.6)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            // the river along the foot of the horizon, reeds at its banks
            const g = el("g", {}, c.washes);
            for (const y of [c.line + 20, c.line + 130])
                c.p.pen.curve(
                    g,
                    Array.from(
                        { length: 14 },
                        (_, i) =>
                            [
                                c.X0 + 200 + (i / 13) * (c.X1 - c.X0 - 400),
                                y + Math.sin(i * 1.3) * 6,
                            ] as [number, number],
                    ),
                    "pencil",
                    { stroke: c.ink, strokeWidth: 1.4 },
                );
            for (let x = c.l.x0 - 200 + rnd() * 80; x < c.l.x1 + 200; x += 160 + rnd() * 70)
                c.p.pen.curve(
                    c.texture,
                    [
                        [x, c.line + 78],
                        [x + 16, c.line + 71],
                        [x + 32, c.line + 78],
                        [x + 48, c.line + 71],
                    ],
                    "doodle",
                    { stroke: c.ink, strokeWidth: 1.2, roughness: 0.6 },
                );
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 140 + rnd() * 120)
                reedClump(c, x, c.line + 132, 0.7 + rnd() * 0.3, rnd);
        },
        tile: (c, r, rnd) => {
            const colours: TokenName[] = ["berry", "sky", "glow", "tang", "card"];
            for (let i = 0; i < perArea(r, 26000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.1)
                    splash(
                        c,
                        at.x,
                        at.y,
                        0.8 + rnd() * 0.5,
                        colours[Math.floor(rnd() * 4)] ?? "berry",
                        rnd,
                    );
                else if (roll < 0.35) tuft(c, at.x, at.y, 0.7, el("g", {}, c.texture));
                else {
                    const g = el("g", {}, c.texture),
                        k = 0.7 + rnd() * 0.5,
                        col = colours[Math.floor(rnd() * colours.length)] ?? "glow";
                    c.p.pen.line(g, at.x, at.y, at.x + 2, at.y - 30 * k, "pencil", {
                        stroke: c.ink,
                        strokeWidth: 1.1,
                    });
                    if (col === "card") daisy(c, at.x + 2, at.y - 30 * k, k * 0.8, g);
                    else
                        c.p.pen.circle(
                            g,
                            at.x + 2,
                            at.y - 32 * k,
                            16 * k,
                            "pencil",
                            c.p.pen.fill(col),
                            { stroke: c.ink, strokeWidth: 0.9 },
                        );
                }
            }
        },
    },
    heath: {
        horizon: (c, rnd) => {
            // the cliff edge: the land stops at the right, falls as rock to the sea and the sea runs on to the sky
            const edge = c.l.x1 - 320,
                drop = 420;
            el(
                "path",
                {
                    d: `M${edge} ${c.line}L${c.X1} ${c.line}L${c.X1} ${c.line + drop}L${edge + 90} ${c.line + drop}Z`,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.6, c.wash * 2.2)),
                },
                c.washes,
            );
            const face: [number, number][] = [
                [edge - 20, c.line - 4],
                [edge + 30, c.line + 90],
                [edge + 10, c.line + 190],
                [edge + 70, c.line + 300],
                [edge + 90, c.line + drop],
            ];
            c.p.pen.polygon(
                c.washes,
                [...face, [edge - 60, c.line + drop], [edge - 80, c.line]],
                "pencil",
                c.p.pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
                { stroke: c.ink, strokeWidth: 1.8 },
            );
            for (let y = c.line + 60; y < c.line + drop; y += 70)
                c.p.pen.line(c.texture, edge - 60, y, edge + 40, y + 10, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 0.9,
                });
            for (let x = edge + 160; x < c.X1 - 300; x += 150 + rnd() * 60)
                wave(c, x, c.line + 80 + rnd() * 240, 0.8);
            for (let x = c.l.x0 - 300; x < edge - 100; x += 90 + rnd() * 80)
                (rnd() < 0.3 ? lichenRock : tussock)(
                    c,
                    x,
                    c.line + 26 + rnd() * 50,
                    0.8 + rnd() * 0.4,
                    rnd,
                );
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 48000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.35) lichenRock(c, at.x, at.y, 0.6 + rnd() * 0.5, rnd);
                else if (roll < 0.85) tussock(c, at.x, at.y, 0.7 + rnd() * 0.4, rnd);
                else
                    c.p.pen.circle(
                        c.texture,
                        at.x,
                        at.y,
                        8 + rnd() * 6,
                        "pencil",
                        c.p.pen.fill("card"),
                        { stroke: c.ink, strokeWidth: 0.9 },
                    );
            }
        },
    },
    sandstone: {
        horizon: (c, rnd) => {
            // cypresses stand dark and tall along the foot of the walls
            for (let x = c.l.x0 - 260 + rnd() * 80; x < c.l.x1 + 260; x += 190 + rnd() * 160)
                cypress(c, x, c.line + 12, 0.8 + rnd() * 0.5);
            const g = el("g", {}, c.washes);
            c.p.pen.line(g, c.X0 + 200, c.line + 40, c.X1 - 200, c.line + 40, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.2,
            });
        },
        tile: (c, r, rnd) => {
            const g = el("g", { opacity: "0.75" }, c.texture),
                sw = 180,
                sh = 120;
            for (
                let y = Math.max(c.line + 80, c.origin + Math.ceil((r.y - c.origin) / sh) * sh);
                y < r.y + r.h;
                y += sh
            ) {
                const shift = (Math.round((y - c.origin) / sh) % 3) * (sw / 3);
                for (
                    let x = Math.floor((c.l.x0 - 300) / sw) * sw + shift;
                    x < c.l.x1 + 300;
                    x += sw
                ) {
                    if (inColumn(c.l, x, sw) || rnd() < 0.45) continue;
                    c.p.pen.rect(g, x + 5, y + 5, sw - 10, sh - 10, "pencil", null, {
                        stroke: c.ink,
                        strokeWidth: 0.9,
                        roughness: 1.1,
                    });
                    if (rnd() < 0.12) rosette(c, x + sw / 2, y + sh / 2, 0.9);
                }
            }
            for (let i = 0; i < perArea(r, 260000); i++) {
                const at = c.spot(r, rnd, 200);
                if (at) potted(c, at.x, at.y, rnd() < 0.5 ? "olive" : "flowers", 0.9 + rnd() * 0.3);
            }
        },
    },
    // the six further off: under the sea, under the land, above the clouds, in the desert, on a new
    // shore, in the grass
    reef: {
        eager: (c) => {
            // the water lying over the sand at the back, where the far reef is
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line,
                    width: c.X1 - c.X0,
                    height: Math.round(c.s.horizon.h * 0.22),
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.3, c.wash * 1.5)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            const clear = clearOfName(c),
                H = c.s.horizon,
                top = H.y + 40;
            // shafts of sun coming down from the surface, none across the name
            for (let i = 0; i < 6; i++) {
                const x = H.x + H.w * (0.1 + i * 0.16) + rnd() * 80,
                    w = 60 + rnd() * 60;
                // a shaft under the name starts below it, as if the light came through the water there
                const from = Math.max(top, ceilingAt(c, x), ceilingAt(c, x + w));
                if (
                    c.line - from < 200 ||
                    !clearLine(clear, x, from, x + 180, c.line) ||
                    !clearLine(clear, x + w, from, x + w * 2.4 + 260, c.line)
                )
                    continue;
                el(
                    "path",
                    {
                        d: `M${x} ${from}L${x + w} ${from}L${x + w * 2.4 + 260} ${c.line}L${x + 180} ${c.line}Z`,
                        fill: c.t.card,
                        opacity: "0.26",
                    },
                    c.washes,
                );
            }
            // kelp standing up towards the light, and the far reef's corals along the foot of the water
            for (let x = c.l.x0 - 260 + rnd() * 80; x < c.l.x1 + 260; x += 200 + rnd() * 260) {
                const h = Math.min(300 + rnd() * 380, c.line - ceilingAt(c, x, 90));
                if (h > 120) kelp(c, x, c.line + 14, h, rnd);
            }
            for (let x = c.l.x0 - 300 + rnd() * 40; x < c.l.x1 + 300; x += 70 + rnd() * 80)
                coral(c, x, c.line + 16 + rnd() * 20, 0.9 + rnd() * 0.5, rnd);
            for (let i = 0; i < 6; i++) {
                const x = H.x + 120 + rnd() * (H.w - 240),
                    y = c.line - 80 - rnd() * (c.line - H.y) * 0.45;
                if (clear(x, y) && clear(x, y - 90)) bubbles(c, x, y, 1.1, c.skyInk, c.p.g);
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 36000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.32) ripple(c, at.x - 45, at.y, 80 + rnd() * 50, c.ink);
                else if (roll < 0.5)
                    shell(
                        c,
                        at.x,
                        at.y,
                        0.8 + rnd() * 0.5,
                        (["berry", "tang", "card"] as TokenName[])[Math.floor(rnd() * 3)] ?? "card",
                    );
                else if (roll < 0.72) coral(c, at.x, at.y, 0.7 + rnd() * 0.5, rnd);
                else if (roll < 0.86) seaGrass(c, at.x, at.y, 0.8 + rnd() * 0.4, rnd);
                else if (roll < 0.95) anemone(c, at.x, at.y, 0.9 + rnd() * 0.3);
                else bubbles(c, at.x, at.y - 20, 0.9, c.t.sky);
            }
        },
    },
    cavern: {
        eager: (c) => {
            // the still lake along the foot of the far wall
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line,
                    width: c.X1 - c.X0,
                    height: 96,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.5, c.wash * 1.8)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            const clear = clearOfName(c),
                H = c.s.horizon,
                roof = el("g", {}, c.texture);
            // the roof hung with stalactites, longest towards the walls
            for (let x = c.X0 + 120; x < c.X1 - 120; x += 50 + rnd() * 70) {
                const edge = Math.min(1, Math.abs(x) / (c.l.x1 + 200)),
                    len = 60 + rnd() * 110 + edge * edge * 170,
                    y = H.y + 30 + rnd() * 20;
                if (clear(x, y + len))
                    dripstone(c, x, y, 7 + rnd() * 6 + edge * 6, len, roof, c.skyInk);
            }
            // glow-worms in colonies all over the roof, as thick as stars, each a blue-green light with its
            // threads of silk hanging under it, beaded with sticky drops
            const lights = el("g", {}, c.p.g),
                threads = el("g", { stroke: c.t.sky, "stroke-width": 0.9, opacity: "0.6" }, c.p.g),
                cols: TokenName[] = ["mint", "sky"];
            for (let tries = 0, colonies = 0; colonies < 26 && tries < 400; tries++) {
                const cx = c.X0 + 260 + rnd() * (c.X1 - c.X0 - 520),
                    cy = H.y + 50 + rnd() * Math.max(0, c.line - H.y - 350),
                    rx = 90 + rnd() * 140,
                    ry = 40 + rnd() * 60;
                if (!clear(cx, cy)) continue;
                colonies++;
                for (let i = 0; i < 32; i++) {
                    const u = rnd() * Math.PI * 2,
                        far = Math.sqrt(rnd()),
                        x = cx + Math.cos(u) * rx * far,
                        y = cy + Math.sin(u) * ry * far,
                        col = c.t[cols[i % 2] ?? "mint"];
                    if (!clear(x, y + 44)) continue;
                    if (i % 4 === 0)
                        el("circle", { cx: x, cy: y, r: 10, fill: col, opacity: "0.3" }, lights);
                    el("circle", { cx: x, cy: y, r: i % 7 === 0 ? 3.6 : 2.4, fill: col }, lights);
                    if (i % 3 === 0) {
                        const len = 16 + rnd() * 28;
                        el("line", { x1: x, y1: y, x2: x, y2: y + len }, threads);
                        el("circle", { cx: x, cy: y + len * 0.6, r: 1.6, fill: c.t.sky }, lights);
                    }
                }
            }
            // curtains of flowstone down the far wall, and stalagmites standing up at the lake's edge
            for (let x = c.l.x0 + 200; x < c.l.x1 - 100; x += 260 + rnd() * 220) {
                const top = c.line - 380 - rnd() * 140;
                if (!clear(x, top) || !clear(x + 60, top)) continue;
                for (let k = 0; k < 5; k++)
                    c.p.pen.curve(
                        c.texture,
                        [
                            [x + k * 14, top + rnd() * 30],
                            [x + k * 14 + 4, (top + c.line) / 2],
                            [x + k * 14, c.line - 40],
                        ],
                        "pencil",
                        { stroke: c.skyInk, strokeWidth: 1.1, roughness: 0.5 },
                    );
            }
            for (let x = c.X0 + 180; x < c.X1 - 180; x += 180 + rnd() * 220)
                dripstone(
                    c,
                    x,
                    c.line + 4,
                    16 + rnd() * 12,
                    -(50 + rnd() * 110),
                    el("g", {}, c.texture),
                    c.skyInk,
                );
            // light on the lake, and its near edge
            for (let i = 0; i < 30; i++) {
                const x = c.l.x0 - 200 + rnd() * (c.l.x1 - c.l.x0 + 400),
                    y = c.line + 20 + rnd() * 64;
                c.p.pen.line(c.texture, x, y, x + 20 + rnd() * 40, y, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                    roughness: 0.4,
                });
            }
            c.p.pen.line(c.washes, c.X0 + 200, c.line + 96, c.X1 - 200, c.line + 96, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.4,
            });
            // the cave's walls closing in at either end
            for (const s of [-1, 1]) {
                const e = s < 0 ? c.l.x0 - 140 : c.l.x1 + 140,
                    X = (d: number) => e - s * d,
                    sky = c.line - H.y;
                const wall: [number, number][] = [
                    [X(-200), H.y + 40],
                    [X(60), H.y + 140],
                    [X(120), H.y + sky * 0.35],
                    [X(70), H.y + sky * 0.62],
                    [X(140), c.line - 60],
                    [X(90), c.line + 10],
                    [X(-200), c.line + 10],
                ];
                c.p.pen.polygon(
                    c.texture,
                    wall,
                    "pencil",
                    c.p.pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.8 }),
                    { stroke: c.skyInk, strokeWidth: 2 },
                );
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 42000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.34) pebble(c, at.x, at.y, 0.8 + rnd() * 0.7);
                else if (roll < 0.52) rimPool(c, at.x, at.y, 90 + rnd() * 70);
                else if (roll < 0.74) crystals(c, at.x, at.y, 0.8 + rnd() * 0.5, rnd);
                else if (roll < 0.9)
                    c.p.pen.arc(
                        c.texture,
                        at.x,
                        at.y,
                        80 + rnd() * 50,
                        22,
                        Math.PI * 1.05,
                        Math.PI * 1.95,
                        "pencil",
                        { stroke: c.ink, strokeWidth: 1.1 },
                    );
                else dripstone(c, at.x, at.y, 9, -(26 + rnd() * 22), el("g", {}, c.texture), c.ink);
            }
        },
    },
    cloudtop: {
        horizon: (c, rnd) => {
            const clear = clearOfName(c),
                H = c.s.horizon;
            // swifts, far up
            for (let i = 0; i < 9; i++) {
                const x = H.x + H.w * (0.35 + rnd() * 0.55),
                    y = H.y + 200 + rnd() * (c.line - H.y) * 0.4;
                if (clear(x, y)) swift(c, x, y, 7 + rnd() * 6);
            }
            // the sea of cloud the islands float over, row behind row, bigger as it comes nearer
            for (const [dy, r0, r1] of [
                [-40, 22, 36],
                [0, 30, 52],
                [48, 44, 74],
            ] as const) {
                const g = el("g", {}, c.texture);
                for (let x = c.l.x0 - 420 + rnd() * 60; x < c.l.x1 + 420; x += (r0 + r1) * 1.3)
                    puff(c, x, c.line + dy, (r0 + rnd() * (r1 - r0)) / 24, g);
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 60000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.45) puff(c, at.x, at.y, 0.6 + rnd() * 0.5);
                else if (roll < 0.8) {
                    const g = el("g", {}, c.texture);
                    tuft(c, at.x, at.y, 0.7, g);
                    if (rnd() < 0.6)
                        c.p.pen.circle(
                            g,
                            at.x + 10,
                            at.y - 22,
                            11,
                            "pencil",
                            c.p.pen.fill(rnd() < 0.5 ? "berry" : "glow"),
                            { stroke: c.ink, strokeWidth: 0.9 },
                        );
                } else if (roll < 0.92) {
                    // a gap in the cloud, with the sky showing through far below
                    c.p.pen.ellipse(
                        c.texture,
                        at.x,
                        at.y,
                        70 + rnd() * 40,
                        22,
                        "doodle",
                        c.p.pen.fill("sky", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
                        { stroke: c.t.sky, strokeWidth: 1.2 },
                    );
                } else daisy(c, at.x, at.y, 0.9);
            }
        },
    },
    dunes: {
        horizon: (c, rnd) => {
            const clear = clearOfName(c),
                H = c.s.horizon,
                sx = H.x + H.w * SUNRISE;
            // the last stars going out
            const stars = el("g", { opacity: "0.7" }, c.p.g);
            for (let i = 0; i < 24; i++) {
                const x = H.x + 80 + rnd() * (H.w - 160),
                    y = H.y + 120 + rnd() * (c.line - H.y) * 0.3;
                if (clear(x, y))
                    c.p.pen.polygon(
                        stars,
                        starPoints(x, y, 5 + rnd() * 5),
                        "pencil",
                        { fill: c.skyInk, fillStyle: "solid" },
                        { stroke: "none" },
                    );
            }
            // two rows of dunes, each a long slope up to a sharp crest with the slope away from the sun in shadow, and the sun half up between them
            const [r0, g0, b0] = washed(c.t[c.world.light.ground], c.wash);
            const row = (base: number, hgt: number, span: number) => {
                for (
                    let x = c.X0 - span * 0.3 + rnd() * span * 0.3;
                    x < c.X1;
                    x += span * (0.6 + rnd() * 0.25)
                ) {
                    const d = dune(x, base, span, hgt * (0.7 + rnd() * 0.5));
                    el("path", { d: d.body, fill: `rgb(${r0} ${g0} ${b0})` }, c.washes);
                    el(
                        "path",
                        {
                            d: d.body,
                            fill: c.t.glow,
                            opacity: String(Math.min(LIMITS.washCap, c.wash * 0.8)),
                        },
                        c.washes,
                    );
                    el(
                        "path",
                        {
                            d: d.shade,
                            fill: c.t.berry,
                            opacity: String(Math.min(LIMITS.washCap, c.wash * 0.7)),
                        },
                        c.washes,
                    );
                    c.p.pen.path(c.washes, d.crest, "pencil", null, {
                        stroke: c.ink,
                        strokeWidth: 1.4,
                    });
                }
            };
            row(c.line + 6, 130, 560);
            el(
                "path",
                {
                    d: `M${sx - 150} ${c.line + 10}A150 150 0 0 1 ${sx + 150} ${c.line + 10}`,
                    fill: "none",
                    stroke: c.t.glow,
                    "stroke-width": 10,
                    opacity: "0.45",
                },
                c.washes,
            );
            c.p.pen.path(
                c.washes,
                `M${sx - 122} ${c.line + 10}A122 122 0 0 1 ${sx + 122} ${c.line + 10}Z`,
                "pencil",
                c.p.pen.fill("glow"),
                { stroke: c.t.tang, strokeWidth: 2 },
            );
            row(c.line + 8, 70, 400);
            for (let x = c.l.x0 - 260 + rnd() * 80; x < c.l.x1 + 260; x += 200 + rnd() * 220)
                dryTuft(c, x, c.line + 50 + rnd() * 50, 0.9 + rnd() * 0.4);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 34000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.58) ripple(c, at.x - 55, at.y, 100 + rnd() * 70, c.t.tang);
                else if (roll < 0.78) dryTuft(c, at.x, at.y, 0.8 + rnd() * 0.4);
                else if (roll < 0.9) pebbles(c, at.x, at.y, rnd);
                else beetleTrack(c, at.x - 60, at.y, rnd);
            }
        },
    },
    ledges: {
        eager: (c) => {
            // the sea, out beyond the ledges on the near side of the cliff
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line - 150,
                    width: cliffFoot(c) + 40 - c.X0,
                    height: 150,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.6, c.wash * 2)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            const H = c.s.horizon,
                foot = cliffFoot(c),
                clear = clearOfName(c),
                line = c.line,
                nb = c.label;
            // the cliff stands low where the name is above it, and rises to its full height past the name
            const full = line - Math.min(640, (line - H.y) * 0.52),
                slope = 300;
            const low = Math.max(full, ceilingAt(c, foot + slope + 100, 90)),
                rise = Math.max(foot + slope + 160, nb.x + nb.w + 90);
            const edge: [number, number][] = [
                [foot, line + 8],
                [foot + slope, low],
                [rise, low],
                [rise + 150, full],
                [c.X1, full - 26],
            ];
            // the sea's own horizon, and waves coming in
            c.p.pen.line(c.washes, c.X0 + 200, line - 150, foot + 20, line - 150, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.4,
            });
            for (const y of [line - 112, line - 62])
                for (let x = c.l.x0 - 200 + rnd() * 60; x < foot - 60; x += 170 + rnd() * 60)
                    wave(c, x, y, 0.8);
            // a stack standing out in the sea, and an arch beside it
            const sx = foot - 440;
            if (sx > c.l.x0 && clear(sx, line - 280) && clear(sx + 200, line - 160)) {
                const g = el("g", {}, c.texture);
                c.p.pen.polygon(
                    g,
                    [
                        [sx - 44, line - 30],
                        [sx - 34, line - 236],
                        [sx - 12, line - 272],
                        [sx + 34, line - 262],
                        [sx + 46, line - 206],
                        [sx + 54, line - 30],
                    ],
                    "pencil",
                    c.p.pen.fill("tang", "hachure", { hachureGap: 4 }),
                    { stroke: c.ink, strokeWidth: 1.6 },
                );
                for (const y of [line - 220, line - 170, line - 120, line - 76])
                    c.p.pen.line(g, sx - 38, y, sx + 50, y + 4, "pencil", {
                        stroke: c.ink,
                        strokeWidth: 1,
                    });
                c.p.pen.path(
                    g,
                    `M${sx + 130} ${line - 30}L${sx + 140} ${line - 118}Q${sx + 180} ${line - 150} ${sx + 226} ${line - 128}L${sx + 240} ${line - 30}L${sx + 214} ${line - 30}Q${sx + 208} ${line - 86} ${sx + 184} ${line - 88}Q${sx + 160} ${line - 86} ${sx + 158} ${line - 30}Z`,
                    "pencil",
                    c.p.pen.fill("glow", "hachure", { hachureGap: 4 }),
                    { stroke: c.ink, strokeWidth: 1.4 },
                );
            }
            // the cliff's face in bands of rock laid one on another and tilted, cut to the face's own outline
            const d = `M${[...edge, [c.X1, line + 8]].map((q) => q.join(" ")).join("L")}Z`,
                id = `cliff-${c.world.id}-${c.s.term}`;
            el("path", { d, fill: c.t.card }, c.washes);
            el("path", { d }, el("clipPath", { id }, el("defs", {}, c.p.svg)));
            const strata = el("g", { "clip-path": `url(#${id})` }, c.washes),
                lines = el("g", { "clip-path": `url(#${id})` }, c.texture);
            const BANDS: [TokenName, number][] = [
                ["tang", 0.42],
                ["glow", 0.5],
                ["berry", 0.28],
                ["sky", 0.3],
                ["tang", 0.34],
                ["glow", 0.44],
            ];
            const band = (line + 8 - (full - 26)) / BANDS.length;
            BANDS.forEach(([col, o], k) => {
                const y0 = full - 26 + band * k;
                el(
                    "path",
                    {
                        d: `M${foot - 40} ${y0 + 30}L${c.X1} ${y0}L${c.X1} ${y0 + band}L${foot - 40} ${y0 + band + 30}Z`,
                        fill: c.t[col],
                        opacity: String(o),
                    },
                    strata,
                );
                if (k > 0)
                    c.p.pen.line(lines, foot - 40, y0 + 30, c.X1, y0, "pencil", {
                        stroke: c.ink,
                        strokeWidth: 1.2,
                    });
            });
            for (let i = 0; i < 16; i++) {
                const x = foot + 60 + rnd() * (c.X1 - 260 - foot),
                    y = low + 30 + rnd() * (line - low - 60);
                c.p.pen.line(lines, x, y, x + 6 + rnd() * 10, y + 14 + rnd() * 16, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 0.9,
                });
            }
            c.p.pen.linear(c.texture, edge, "pencil", {
                stroke: c.ink,
                strokeWidth: 2.2,
                roughness: 1.4,
            });
            // grass along the top, and boulders fallen from the cliff at its foot
            const top = edge.slice(1),
                grass = el("g", {}, c.texture);
            c.p.pen.polygon(
                grass,
                [...top, ...[...top].reverse().map(([x, y]): [number, number] => [x, y - 22])],
                "pencil",
                c.p.pen.fill("mint"),
                { stroke: c.ink, strokeWidth: 1.4 },
            );
            for (let k = 1; k < top.length; k++) {
                const [ax, ay] = top[k - 1] ?? [foot, low],
                    [bx, by] = top[k] ?? [foot, low];
                for (let x = ax + 20; x < Math.min(bx, c.X1 - 200); x += 60 + rnd() * 30)
                    tuft(c, x, ay + ((by - ay) * (x - ax)) / (bx - ax) - 20, 0.6, grass);
            }
            for (let i = 0; i < 4; i++)
                rock(c, foot - 80 + i * 110 + rnd() * 30, line + 16, 0.8 + rnd() * 0.6);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 40000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.34) ledgeCrack(c, at.x - 110, at.y, 180 + rnd() * 120, rnd);
                else if (roll < 0.52) rockPool(c, at.x, at.y, 110 + rnd() * 80);
                else if (roll < 0.68) ammonite(c, at.x, at.y, 14 + rnd() * 9);
                else if (roll < 0.88) pebbles(c, at.x, at.y, rnd);
                else shell(c, at.x, at.y, 0.8, "card");
            }
        },
    },
    litter: {
        horizon: (c, rnd) => {
            const H = c.s.horizon,
                far = el("g", {}, c.texture),
                near = el("g", {}, c.texture);
            // the sun low behind the grass, shining through it
            const sx = H.x + H.w * 0.8,
                sy = c.line - (c.line - H.y) * 0.34;
            el("circle", { cx: sx, cy: sy, r: 220, fill: c.t.glow, opacity: "0.3" }, c.washes);
            c.p.pen.circle(c.washes, sx, sy, 190, "pencil", c.p.pen.fill("glow"), {
                stroke: c.t.tang,
                strokeWidth: 1.4,
            });
            // blades of grass taller than the child, pale and thin far off, bold near, none reaching the name
            for (let i = 0; i < 64; i++) {
                const x = c.X0 + 200 + rnd() * (c.X1 - c.X0 - 400),
                    bend = (rnd() - 0.5) * 140;
                const h = Math.min(
                    180 + rnd() * 340,
                    c.line - Math.max(ceilingAt(c, x), ceilingAt(c, x + bend)),
                );
                if (h > 80) blade(c, far, x, c.line + 10, h, bend, 5 + rnd() * 4, 0.3, false);
            }
            for (let i = 0; i < 22; i++) {
                const x = c.X0 + 200 + rnd() * (c.X1 - c.X0 - 400),
                    bend = (rnd() - 0.5) * 300;
                const h = Math.min(
                    360 + rnd() * 420,
                    c.line - Math.max(ceilingAt(c, x), ceilingAt(c, x + bend)),
                );
                if (h > 140) blade(c, near, x, c.line + 30, h, bend, 9 + rnd() * 7, 0.55, true);
            }
            // clover leaves overhead like umbrellas, as big as the child is small: each stands on a short stalk
            // and its leaves reach 64 units a scale above it and 70 either side, all below the name
            for (const u of [0.36, 0.52, 0.66, 0.93]) {
                const x = H.x + H.w * u,
                    s = Math.min(2.2, (c.line - ceilingAt(c, x, 170) - 20) / 110);
                if (s >= 1.2) cloverLeaf(c, x, c.line - 46 * s, s, c.line + 20);
            }
        },
        tile: (c, r, rnd) => {
            const colours: TokenName[] = ["tang", "glow", "berry"];
            for (let i = 0; i < perArea(r, 32000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.28)
                    fallenLeaf(
                        c,
                        at.x,
                        at.y,
                        rnd() * Math.PI * 2,
                        0.8 + rnd() * 0.5,
                        colours[Math.floor(rnd() * 3)] ?? "tang",
                    );
                else if (roll < 0.46) boulder(c, at.x, at.y, 24 + rnd() * 26);
                else if (roll < 0.68) moss(c, at.x, at.y, 0.8 + rnd() * 0.4);
                else if (roll < 0.88) {
                    const g = el("g", {}, c.texture);
                    for (let k = 0; k < 3; k++)
                        blade(
                            c,
                            g,
                            at.x + (k - 1) * 16,
                            at.y,
                            90 + rnd() * 90,
                            (rnd() - 0.5) * 60,
                            6,
                            0.45,
                            true,
                        );
                } else seed(c, at.x, at.y, -0.9 - rnd() * 0.6);
            }
        },
    },

    // the islands in the seas and the southern shore
    granite: {
        eager: (c) => {
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line - 10,
                    width: c.X1 - c.X0,
                    height: 120,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.4, c.wash * 1.6)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            // the sea at the foot of the sky, and pink granite boulders along the shore with thrift in their cracks
            for (let x = c.l.x0 - 200 + rnd() * 80; x < c.l.x1 + 200; x += 170 + rnd() * 70)
                wave(c, x, c.line + 40 + rnd() * 40, 0.8);
            for (let x = c.l.x0 - 260 + rnd() * 120; x < c.l.x1 + 260; x += 260 + rnd() * 240)
                boulderPink(c, x, c.line + 160 + rnd() * 40, 0.9 + rnd() * 0.5, rnd);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 52000); i++) {
                const at = c.spot(r, rnd, 260);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.45) boulderPink(c, at.x, at.y, 0.5 + rnd() * 0.4, rnd);
                else if (roll < 0.8) thrift(c, at.x, at.y, 0.8 + rnd() * 0.4);
                else rockPool(c, at.x, at.y, 60 + rnd() * 40);
            }
        },
    },
    workshop: {
        horizon: (c, rnd) => {
            // the yard's back fence along the horizon, with crates stacked against it and a cog or two left on top
            // a board fence stands on the horizon line, and crates are stacked in front of it on the yard
            for (let x = c.X0; x < c.X1; x += 44)
                c.p.pen.line(c.texture, x, c.line + 4, x + 2, c.line - 46, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                    roughness: 0.6,
                });
            c.p.pen.line(c.texture, c.X0, c.line - 30, c.X1, c.line - 30, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.3,
            });
            for (let x = c.l.x0 - 260 + rnd() * 90; x < c.l.x1 + 260; x += 240 + rnd() * 200)
                crate(c, x, c.line + 70 + rnd() * 20, 0.8 + rnd() * 0.4, rnd);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 42000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.4)
                    cog(c, at.x, at.y, 14 + rnd() * 12, rnd() < 0.5 ? "tang" : "glow", c.texture);
                else if (roll < 0.65) spring(c, at.x, at.y, 0.8 + rnd() * 0.4);
                else if (roll < 0.85)
                    c.p.pen.polygon(
                        c.texture,
                        [
                            [at.x - 46, at.y - 14],
                            [at.x + 40, at.y - 18],
                            [at.x + 48, at.y + 12],
                            [at.x - 40, at.y + 16],
                        ],
                        "pencil",
                        null,
                        { stroke: c.t["ink-soft"], strokeWidth: 0.9 },
                    );
                else {
                    c.p.pen.line(c.texture, at.x - 10, at.y, at.x + 14, at.y - 4, "pencil", {
                        stroke: c.ink,
                        strokeWidth: 2,
                    });
                    c.p.pen.circle(
                        c.texture,
                        at.x - 12,
                        at.y + 1,
                        8,
                        "pencil",
                        c.p.pen.fill("ink-soft"),
                        { stroke: c.ink, strokeWidth: 0.8 },
                    );
                }
            }
        },
    },
    hedges: {
        horizon: (c, rnd) => {
            // clipped hedges along the horizon with gaps between them
            for (let x = c.l.x0 - 300 + rnd() * 80; x < c.l.x1 + 300; x += 300 + rnd() * 120) {
                const w = 200 + rnd() * 70,
                    h = 70 + rnd() * 30,
                    y = c.line + 60;
                c.p.pen.path(
                    c.texture,
                    `M${x} ${y}L${x} ${y - h + 18}Q${x} ${y - h} ${x + 18} ${y - h}L${x + w - 18} ${y - h}Q${x + w} ${y - h} ${x + w} ${y - h + 18}L${x + w} ${y}Z`,
                    "pencil",
                    c.p.pen.fill("mint", "hachure", { hachureGap: 5 }),
                    { stroke: c.ink, strokeWidth: 1.5 },
                );
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 36000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.45) daisy(c, at.x, at.y, 0.9 + rnd() * 0.4);
                else if (roll < 0.75) clover(c, at.x, at.y, 0.9);
                else bookStack(c, at.x, at.y, 2 + Math.floor(rnd() * 3), rnd);
            }
        },
    },
    cobbles: {
        horizon: (c, rnd) => {
            // a low wall along the horizon, and lines of printed pages pegged out to dry above it
            c.p.pen.line(c.texture, c.X0, c.line + 50, c.X1, c.line + 50, "pencil", {
                stroke: c.ink,
                strokeWidth: 1.5,
            });
            for (let x = c.l.x0 - 300 + rnd() * 100; x < c.l.x1 + 300; x += 420 + rnd() * 160)
                pageLine(c, x, x + 300, c.line - 30 - rnd() * 30, rnd);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 30000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.6)
                    for (let k = 0; k < 3; k++)
                        c.p.pen.ellipse(
                            c.texture,
                            at.x + k * 30 - 30,
                            at.y + (k % 2) * 8,
                            26,
                            16,
                            "pencil",
                            null,
                            { stroke: c.ink, strokeWidth: 0.9 },
                        );
                else if (roll < 0.85) typeBlock(c, at.x, at.y, rnd, c.texture);
                else
                    c.p.pen.ellipse(
                        c.texture,
                        at.x,
                        at.y,
                        20 + rnd() * 16,
                        10 + rnd() * 6,
                        "pencil",
                        c.p.pen.fill(rnd() < 0.5 ? "sky" : "berry"),
                        { stroke: "none" },
                    );
            }
        },
    },
    quay: {
        eager: (c) => {
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line - 10,
                    width: c.X1 - c.X0,
                    height: 110,
                    fill: c.t.sky,
                    opacity: String(Math.min(LIMITS.washCap * 1.5, c.wash * 1.7)),
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            // the harbour water at the foot of the sky, and the quay's stone edge with bollards along it
            for (let x = c.l.x0 - 200 + rnd() * 60; x < c.l.x1 + 200; x += 180 + rnd() * 60)
                wave(c, x, c.line + 45 + rnd() * 30, 0.75);
            coping(c, el("g", {}, c.texture), c.X0, c.line + 110, c.X1, c.line + 110);
            for (let x = c.l.x0 - 200 + rnd() * 100; x < c.l.x1 + 200; x += 320 + rnd() * 140)
                bollard(c, x, c.line + 114);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 44000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.45)
                    for (let k = 0; k < 3; k++)
                        c.p.pen.rect(
                            c.texture,
                            at.x - 96 + k * 64 + (k % 2) * 10,
                            at.y - 18 + (k % 2) * 36,
                            60,
                            34,
                            "pencil",
                            null,
                            { stroke: c.t["ink-soft"], strokeWidth: 0.9 },
                        );
                else if (roll < 0.7) ropeCoil(c, at.x, at.y, 0.8 + rnd() * 0.4);
                else if (roll < 0.88)
                    c.p.pen.ellipse(
                        c.texture,
                        at.x,
                        at.y,
                        90 + rnd() * 40,
                        22,
                        "pencil",
                        c.p.pen.fill("sky"),
                        { stroke: c.ink, strokeWidth: 1 },
                    );
                else envelope(c, at.x, at.y, rnd() * 40 - 20);
            }
        },
    },
    machair: {
        horizon: (c, rnd) => {
            // a dry stone wall along the horizon, and the grass leaning with the wind
            for (let x = c.l.x0 - 300; x < c.l.x1 + 300; x += 38 + rnd() * 12)
                c.p.pen.ellipse(
                    c.texture,
                    x,
                    c.line + 70 + rnd() * 6,
                    34 + rnd() * 10,
                    20,
                    "pencil",
                    c.p.pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
                    { stroke: c.ink, strokeWidth: 1 },
                );
            for (let x = c.l.x0 - 300 + rnd() * 40; x < c.l.x1 + 300; x += 70 + rnd() * 50)
                windGrass(c, x, c.line + 110 + rnd() * 60, 0.9 + rnd() * 0.4);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 30000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.5) windGrass(c, at.x, at.y, 0.7 + rnd() * 0.5);
                else if (roll < 0.85) daisy(c, at.x, at.y, 0.8 + rnd() * 0.3);
                else
                    c.p.pen.curve(
                        c.texture,
                        [
                            [at.x - 80, at.y],
                            [at.x - 20, at.y - 10],
                            [at.x + 40, at.y + 4],
                            [at.x + 90, at.y - 6],
                        ],
                        "pencil",
                        { stroke: c.ink, strokeWidth: 1, strokeLineDash: [8, 10] },
                    );
            }
        },
    },
    canopy: {
        eager: (c) => {
            el(
                "rect",
                {
                    x: c.X0,
                    y: c.line - 20,
                    width: c.X1 - c.X0,
                    height: 90,
                    fill: c.t.card,
                    opacity: "0.55",
                },
                c.washes,
            );
        },
        horizon: (c, rnd) => {
            // the crowns of the trees below, standing up out of a band of mist
            for (let x = c.l.x0 - 300 + rnd() * 100; x < c.l.x1 + 300; x += 210 + rnd() * 120)
                crown(c, x, c.line + 70 + rnd() * 40, 0.8 + rnd() * 0.5, rnd);
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 46000); i++) {
                const at = c.spot(r, rnd, 260);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.35) bigLeaf(c, at.x, at.y, rnd() * Math.PI * 2, 0.6 + rnd() * 0.4);
                else if (roll < 0.6) branch(c, at.x, at.y, rnd);
                else if (roll < 0.85) puff(c, at.x, at.y, 0.7 + rnd() * 0.4);
                else
                    c.p.pen.circle(
                        c.texture,
                        at.x,
                        at.y,
                        14,
                        "pencil",
                        c.p.pen.fill(rnd() < 0.5 ? "berry" : "tang"),
                        { stroke: c.ink, strokeWidth: 1 },
                    );
            }
        },
    },
    saltcrust: {
        horizon: (c, rnd) => {
            // the flat running out to far mountains, each doubled upside down in the thin water on the crust
            for (let x = c.l.x0 - 300 + rnd() * 100; x < c.l.x1 + 300; x += 360 + rnd() * 200) {
                const w = 260 + rnd() * 160,
                    h = 70 + rnd() * 60,
                    y = c.line + 20;
                c.p.pen.polygon(
                    c.texture,
                    [
                        [x, y],
                        [x + w * 0.45, y - h],
                        [x + w * 0.6, y - h * 0.8],
                        [x + w, y],
                    ],
                    "pencil",
                    c.p.pen.fill("sky", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
                    { stroke: c.ink, strokeWidth: 1.2 },
                );
                c.p.pen.polygon(
                    c.texture,
                    [
                        [x, y + 4],
                        [x + w * 0.45, y + h * 0.6],
                        [x + w * 0.6, y + h * 0.5],
                        [x + w, y + 4],
                    ],
                    "pencil",
                    null,
                    { stroke: c.ink, strokeWidth: 0.8, strokeLineDash: [6, 8] },
                );
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 26000); i++) {
                const at = c.spot(r, rnd, 240);
                if (!at) continue;
                if (rnd() < 0.8) hexCell(c, at.x, at.y, 34 + rnd() * 16);
                else saltHeap(c, at.x, at.y, 0.6 + rnd() * 0.3, c.texture);
            }
        },
    },
    sinter: {
        horizon: (c, rnd) => {
            // terraces stepping down along the horizon, each a shelf of colour with a rim, and steam off the pools
            const cols: TokenName[] = ["glow", "tang", "sky", "mint"];
            for (
                let x = c.l.x0 - 300 + rnd() * 100, n = 0;
                x < c.l.x1 + 300;
                x += 320 + rnd() * 120, n++
            ) {
                const w = 280 + rnd() * 80;
                for (let k = 0; k < 3; k++) {
                    const y = c.line + 20 + k * 34,
                        inset = k * 26,
                        col = cols[(k + n) % 4] ?? "glow";
                    const d = `M${x + inset} ${y}Q${x + w / 2} ${y - 16} ${x + w - inset} ${y}L${x + w - inset + 14} ${y + 26}Q${x + w / 2} ${y + 12} ${x + inset - 14} ${y + 26}Z`;
                    el(
                        "path",
                        {
                            d,
                            fill: c.t[col],
                            opacity: String(Math.min(LIMITS.washCap * 1.5, c.wash * 1.6)),
                        },
                        c.washes,
                    );
                    c.p.pen.path(
                        c.texture,
                        `M${x + inset} ${y}Q${x + w / 2} ${y - 16} ${x + w - inset} ${y}`,
                        "pencil",
                        null,
                        { stroke: c.ink, strokeWidth: 1.4 },
                    );
                    c.p.pen.path(
                        c.texture,
                        `M${x + inset - 14} ${y + 26}Q${x + w / 2} ${y + 12} ${x + w - inset + 14} ${y + 26}`,
                        "pencil",
                        null,
                        { stroke: c.ink, strokeWidth: 1 },
                    );
                }
                if (rnd() < 0.7) steam(c, x + w / 2, c.line + 10, 1 + rnd() * 0.5);
            }
        },
        tile: (c, r, rnd) => {
            for (let i = 0; i < perArea(r, 48000); i++) {
                const at = c.spot(r, rnd, 260);
                if (!at) continue;
                const roll = rnd();
                if (roll < 0.45) rimPool(c, at.x, at.y, 50 + rnd() * 40);
                else if (roll < 0.75) steam(c, at.x, at.y, 0.6 + rnd() * 0.3);
                else
                    c.p.pen.curve(
                        c.texture,
                        [
                            [at.x - 70, at.y],
                            [at.x, at.y + 14],
                            [at.x + 70, at.y],
                        ],
                        "pencil",
                        { stroke: c.t.tang, strokeWidth: 3 },
                    );
            }
        },
    },
};

function willowherb(c: Ctx, x: number, y: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.line(g, x, y, x + 2, y - 46, "pencil", { stroke: c.ink, strokeWidth: 1.4 });
    for (let k = 0; k < 4; k++)
        c.p.pen.ellipse(
            g,
            x + 2 + (k % 2 ? 6 : -6),
            y - 46 + k * 9,
            9,
            7,
            "pencil",
            c.p.pen.fill("berry"),
            { strokeWidth: 0.9 },
        );
}

function leaf(c: Ctx, x: number, y: number, a: number, fill: TokenName): void {
    const L = 22,
        W = 11,
        cos = Math.cos(a),
        sin = Math.sin(a);
    const pt = (u: number, v: number): [number, number] => [
        x + u * cos - v * sin,
        y + u * sin + v * cos,
    ];
    c.p.pen.polygon(
        c.texture,
        [pt(-L / 2, 0), pt(-L / 6, -W / 2), pt(L / 2, 0), pt(-L / 6, W / 2)],
        "pencil",
        c.p.pen.fill(fill),
        { stroke: c.ink, strokeWidth: 1 },
    );
    c.p.pen.line(c.texture, ...pt(-L / 2, 0), ...pt(L / 2, 0), "pencil", {
        stroke: c.ink,
        strokeWidth: 0.8,
    });
}

function fern(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.curve(
        g,
        [
            [x, y],
            [x + 6 * k, y - 26 * k],
            [x + 2 * k, y - 52 * k],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1.4 },
    );
    for (let i = 1; i < 6; i++) {
        const yy = y - i * 9 * k,
            len = (14 - i * 1.6) * k;
        for (const s of [-1, 1])
            c.p.pen.line(g, x + 4 * k, yy, x + 4 * k + s * len, yy - 5 * k, "pencil", {
                stroke: c.ink,
                strokeWidth: 1,
            });
    }
}

function toadstool(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.rect(g, x - 4 * k, y - 16 * k, 8 * k, 16 * k, "pencil", c.p.pen.fill("card"), {
        stroke: c.ink,
        strokeWidth: 1.1,
    });
    c.p.pen.path(
        g,
        `M${x - 16 * k} ${y - 14 * k}Q${x} ${y - 38 * k} ${x + 16 * k} ${y - 14 * k}Z`,
        "pencil",
        c.p.pen.fill("berry"),
        { stroke: c.ink, strokeWidth: 1.2 },
    );
    for (const [dx, dy] of [
        [-6, -22],
        [5, -25],
        [0, -18],
    ] as const)
        c.p.pen.circle(
            g,
            x + dx * k,
            y + dy * k,
            4 * k,
            "ruler",
            { fill: c.t.card, fillStyle: "solid" },
            { stroke: "none" },
        );
}

function rock(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    const pts: [number, number][] = [
        [x - 26 * k, y],
        [x - 18 * k, y - 18 * k],
        [x - 2 * k, y - 26 * k],
        [x + 16 * k, y - 16 * k],
        [x + 26 * k, y],
    ];
    c.p.pen.polygon(
        g,
        pts,
        "pencil",
        c.p.pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
        { stroke: c.ink, strokeWidth: 1.3 },
    );
    c.p.pen.polygon(
        g,
        [
            [x - 18 * k, y - 18 * k],
            [x - 2 * k, y - 26 * k],
            [x + 16 * k, y - 16 * k],
            [x + 4 * k, y - 14 * k],
            [x - 8 * k, y - 17 * k],
        ],
        "pencil",
        c.p.pen.fill("card"),
        { stroke: c.ink, strokeWidth: 1 },
    );
}

function littleFir(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.rect(g, x - 4 * k, y - 12 * k, 8 * k, 12 * k, "pencil", c.p.pen.fill("tang"), {
        stroke: c.ink,
        strokeWidth: 1,
    });
    for (let t = 0; t < 3; t++) {
        const top = y - 12 * k - 50 * k + t * 15 * k,
            w = (14 + t * 7) * k;
        c.p.pen.polygon(
            g,
            [
                [x, top],
                [x + w, top + 24 * k],
                [x - w, top + 24 * k],
            ],
            "pencil",
            c.p.pen.fill("mint"),
            { stroke: c.ink, strokeWidth: 1.1 },
        );
        c.p.pen.polygon(
            g,
            [
                [x, top],
                [x + w * 0.35, top + 8 * k],
                [x - w * 0.35, top + 8 * k],
            ],
            "pencil",
            c.p.pen.fill("card"),
            { stroke: c.ink, strokeWidth: 0.8 },
        );
    }
}

/** Settings for a mark the sea is drawn with: quiet lines that keep their points. */
const calm = (w: number, stroke: string): Record<string, unknown> => ({
    stroke,
    strokeWidth: w,
    roughness: 0.6,
    bowing: 0.8,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** A long low swell: two lines, the lower one shorter, as a sea running before the wind is drawn. */
function swell(c: Ctx, x: number, y: number, k: number): void {
    const L = 110 * k;
    for (const [dy, f] of [
        [0, 1],
        [15 * k, 0.62],
    ] as const)
        c.p.pen.curve(
            c.texture,
            [
                [x - L * f, y + dy + 4 * k],
                [x - L * f * 0.45, y + dy - 7 * k],
                [x + L * f * 0.1, y + dy + 2 * k],
                [x + L * f * 0.6, y + dy - 6 * k],
                [x + L * f, y + dy + 3 * k],
            ],
            "pencil",
            { stroke: c.ink, strokeWidth: 1.3, roughness: 0.7 },
        );
}

/** A crest breaking: the face of the wave in the sea's blue, its lip curling over in foam. */
function crest(c: Ctx, x: number, y: number, k: number, flip: number, rnd: () => number): void {
    const s = (dx: number, dy: number): string => `${x + dx * k * flip} ${y + dy * k}`;
    const face = `M${s(-58, 0)}Q${s(-30, -2)} ${s(-12, -22)}Q${s(0, -36)} ${s(16, -32)}Q${s(30, -28)} ${s(26, -18)}Q${s(18, -22)} ${s(12, -14)}`;
    c.p.pen.path(
        c.texture,
        `${face}Q${s(22, -4)} ${s(46, 0)}Z`,
        "pencil",
        c.p.pen.fill("sky", "solid"),
        {
            stroke: "none",
            roughness: 0.7,
        },
    );
    c.p.pen.path(c.texture, face, "pencil", null, {
        stroke: c.t.ink,
        strokeWidth: 1.4,
        roughness: 0.6,
    });
    // the foam along its lip, and now and then a fleck of it blown off the top
    for (const [dx, dy, r] of [
        [-7, -28, 7],
        [4, -34, 6.5],
        [16, -31, 5.5],
    ] as const)
        c.p.pen.arc(
            c.texture,
            x + dx * k * flip,
            y + dy * k,
            r * 2.2 * k,
            r * 1.6 * k,
            Math.PI * 1.02,
            Math.PI * 1.98,
            "pencil",
            calm(1, c.ink),
        );
    if (rnd() < 0.5)
        c.p.pen.line(
            c.texture,
            x + 20 * k * flip,
            y - 36 * k,
            x + (26 + rnd() * 8) * k * flip,
            y - 42 * k,
            "pencil",
            calm(0.9, c.ink),
        );
    c.p.pen.curve(
        c.texture,
        [
            [x + 12 * k * flip, y - 14 * k],
            [x + 24 * k * flip, y - 6 * k],
            [x + 46 * k * flip, y],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1.1, roughness: 0.6 },
    );
}

/** Rain falling on the water, seen as the rings each drop makes. */
function rings(c: Ctx, x: number, y: number, rnd: () => number): void {
    for (let i = 0; i < 6; i++) {
        const dx = (rnd() - 0.5) * 120,
            dy = (rnd() - 0.5) * 60,
            r = 8 + rnd() * 8;
        c.p.pen.ellipse(
            c.texture,
            x + dx,
            y + dy,
            r * 2,
            r * 0.8,
            "pencil",
            null,
            calm(0.9, c.ink),
        );
        if (rnd() < 0.5)
            c.p.pen.ellipse(
                c.texture,
                x + dx,
                y + dy,
                r * 0.9,
                r * 0.36,
                "pencil",
                null,
                calm(0.8, c.ink),
            );
    }
}

/** Streaks of foam the wind has drawn out along the water. */
function streaks(c: Ctx, x: number, y: number, rnd: () => number): void {
    for (let i = 0; i < 3; i++) {
        const dy = i * 12,
            L = 40 + rnd() * 50;
        c.p.pen.line(
            c.texture,
            x - L / 2 + i * 14,
            y + dy,
            x + L / 2 + i * 14,
            y + dy - 3,
            "pencil",
            { stroke: c.ink, strokeWidth: 1, strokeLineDash: [8, 7], roughness: 0.5 },
        );
    }
}

function wave(c: Ctx, x: number, y: number, k: number): void {
    c.p.pen.curve(
        c.texture,
        [
            [x - 30 * k, y],
            [x - 15 * k, y - 10 * k],
            [x, y],
            [x + 15 * k, y - 10 * k],
            [x + 30 * k, y],
        ],
        "doodle",
        { stroke: c.ink, strokeWidth: 1.4, roughness: 0.7 },
    );
}

function bigLeaf(c: Ctx, x: number, y: number, a: number, k: number): void {
    const L = 70 * k,
        W = 34 * k,
        cos = Math.cos(a),
        sin = Math.sin(a),
        g = el("g", {}, c.texture);
    const pt = (u: number, v: number): [number, number] => [
        x + u * cos - v * sin,
        y + u * sin + v * cos,
    ];
    const edge: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
        const u = (i / 8) * L;
        edge.push(pt(u, (W / 2) * Math.sin(Math.PI * Math.pow(i / 8, 0.8))));
    }
    for (let i = 7; i >= 1; i--) {
        const u = (i / 8) * L;
        edge.push(pt(u, -(W / 2) * Math.sin(Math.PI * Math.pow(i / 8, 0.8))));
    }
    c.p.pen.polygon(g, edge, "pencil", c.p.pen.fill("mint"), { stroke: c.ink, strokeWidth: 1.2 });
    c.p.pen.line(g, ...pt(0, 0), ...pt(L * 0.92, 0), "pencil", { stroke: c.ink, strokeWidth: 1 });
    for (const u of [0.3, 0.5, 0.7])
        for (const sgn of [-1, 1])
            c.p.pen.line(g, ...pt(L * u, 0), ...pt(L * (u + 0.12), sgn * W * 0.34), "pencil", {
                stroke: c.ink,
                strokeWidth: 0.8,
            });
}

function puddles(c: Ctx, r: Rect, rnd: () => number): void {
    for (let i = 0; i < perArea(r, 900000) + 1; i++) {
        const at = c.spot(r, rnd, 240);
        if (!at) continue;
        const w = 90 + rnd() * 60;
        el(
            "ellipse",
            {
                cx: at.x,
                cy: at.y,
                rx: w / 2,
                ry: w / 6,
                fill: c.t.sky,
                opacity: String(Math.min(LIMITS.washCap * 1.4, 0.4)),
            },
            c.washes,
        );
        c.p.pen.arc(c.texture, at.x, at.y, w * 0.7, w / 5, 0.2, Math.PI - 0.2, "pencil", {
            stroke: c.ink,
            strokeWidth: 1.1,
        });
    }
}

/**
 * A world indoors: the horizon is the top of a run of cupboards, the far row stands on it, and the
 * floor begins below them. The cupboard fronts are a wood tint with doors drawn on.
 */
function cupboards(c: Ctx): void {
    const top = c.line,
        h = 170;
    // the cupboard fronts take the world's accent, so a wooden floor does not run straight up the wall
    el(
        "rect",
        {
            x: c.X0,
            y: top,
            width: c.X1 - c.X0,
            height: h,
            fill: c.t[c.world.light.accent],
            opacity: String(Math.min(LIMITS.washCap, c.wash * 1.2)),
        },
        c.washes,
    );
    el(
        "rect",
        { x: c.X0, y: top - 14, width: c.X1 - c.X0, height: 14, fill: c.ink, opacity: "0.16" },
        c.washes,
    );
}

function cupboardDoors(c: Ctx): void {
    const top = c.line,
        h = 170,
        g = el("g", {}, c.washes);
    c.p.pen.line(g, c.X0, top + h, c.X1, top + h, "pencil", { stroke: c.ink, strokeWidth: 2 });
    for (let x = c.l.x0 - 480; x < c.l.x1 + 480; x += 240) {
        c.p.pen.rect(g, x + 14, top + 22, 212, h - 40, "pencil", null, {
            stroke: c.ink,
            strokeWidth: 1.3,
        });
        c.p.pen.circle(
            g,
            x + (Math.round(x / 240) % 2 ? 36 : 204),
            top + h / 2,
            10,
            "pencil",
            c.p.pen.fill("glow"),
            { stroke: c.ink, strokeWidth: 1.2 },
        );
    }
}

function daisy(c: Ctx, x: number, y: number, k: number, into: SVGGElement = c.texture): void {
    const g = el("g", {}, into);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.p.pen.ellipse(
            g,
            x + Math.cos(a) * 7 * k,
            y + Math.sin(a) * 7 * k,
            10 * k,
            6 * k,
            "pencil",
            c.p.pen.fill("card"),
            { stroke: c.ink, strokeWidth: 0.7 },
        );
    }
    c.p.pen.circle(g, x, y, 7 * k, "pencil", c.p.pen.fill("glow"), {
        stroke: c.ink,
        strokeWidth: 0.7,
    });
}

function clover(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.line(g, x, y + 4 * k, x + 2, y + 16 * k, "pencil", { stroke: c.ink, strokeWidth: 0.9 });
    for (const [dx, dy] of [
        [-5, -2],
        [5, -2],
        [0, -9],
    ] as const)
        c.p.pen.circle(g, x + dx * k, y + dy * k, 10 * k, "pencil", c.p.pen.fill("mint"), {
            stroke: c.ink,
            strokeWidth: 0.8,
        });
}

function reedClump(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture);
    for (let i = 0; i < 4; i++) {
        const dx = (i - 1.5) * 7 * k,
            h = (46 + rnd() * 30) * k,
            lean = (rnd() - 0.4) * 14 * k;
        c.p.pen.curve(
            g,
            [
                [x + dx, y],
                [x + dx + lean * 0.4, y - h * 0.55],
                [x + dx + lean, y - h],
            ],
            "pencil",
            { stroke: c.ink, strokeWidth: 1.2 },
        );
    }
    if (rnd() < 0.7) {
        c.p.pen.line(g, x + 2, y, x + 4, y - 64 * k, "pencil", { stroke: c.ink, strokeWidth: 1.1 });
        c.p.pen.ellipse(g, x + 4, y - 58 * k, 8 * k, 20 * k, "pencil", c.p.pen.fill("tang"), {
            stroke: c.ink,
            strokeWidth: 0.9,
        });
    }
}

function lilyPad(c: Ctx, x: number, y: number, k: number, flower: boolean): void {
    const g = el("g", {}, c.texture),
        r = 22 * k;
    c.p.pen.path(
        g,
        `M${x} ${y}L${x + r * 0.9} ${y - r * 0.2}A${r} ${r * 0.5} 0 1 0 ${x + r * 0.9} ${y + r * 0.2}Z`,
        "pencil",
        c.p.pen.fill("mint"),
        { stroke: c.ink, strokeWidth: 1 },
    );
    if (flower)
        for (let i = 0; i < 5; i++)
            c.p.pen.ellipse(
                g,
                x - r * 0.3 + (i - 2) * 4 * k,
                y - 6 * k - Math.abs(i - 2) * -2 * k,
                7 * k,
                12 * k,
                "pencil",
                c.p.pen.fill("berry"),
                { stroke: c.ink, strokeWidth: 0.7 },
            );
}

function flowerBed(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        rx = 70 * k,
        ry = 26 * k;
    c.p.pen.ellipse(
        g,
        x,
        y,
        rx * 2,
        ry * 2,
        "pencil",
        c.p.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
        { stroke: c.ink, strokeWidth: 1.2 },
    );
    const cup = rnd() < 0.5 ? "berry" : "glow";
    for (let i = 0; i < 7; i++) {
        const tx = x + (i - 3) * 18 * k,
            ty = y - ((i % 2) * 6 + 4) * k;
        c.p.pen.line(g, tx, ty, tx, ty - 22 * k, "pencil", { stroke: c.ink, strokeWidth: 1 });
        c.p.pen.path(
            g,
            `M${tx - 6 * k} ${ty - 22 * k}L${tx - 6 * k} ${ty - 32 * k}L${tx - 2 * k} ${ty - 28 * k}L${tx} ${ty - 34 * k}L${tx + 2 * k} ${ty - 28 * k}L${tx + 6 * k} ${ty - 32 * k}L${tx + 6 * k} ${ty - 22 * k}Z`,
            "pencil",
            c.p.pen.fill(cup),
            { stroke: c.ink, strokeWidth: 0.8 },
        );
    }
}

function deckchair(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        dir = rnd() < 0.5 ? 1 : -1;
    c.p.pen.linear(
        g,
        [
            [x - dir * 24 * k, y],
            [x + dir * 12 * k, y - 50 * k],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1.6 },
    );
    c.p.pen.linear(
        g,
        [
            [x + dir * 22 * k, y],
            [x - dir * 4 * k, y - 26 * k],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1.6 },
    );
    c.p.pen.polygon(
        g,
        [
            [x + dir * 12 * k, y - 48 * k],
            [x - dir * 18 * k, y - 10 * k],
            [x - dir * 4 * k, y - 8 * k],
            [x + dir * 20 * k, y - 40 * k],
        ],
        "pencil",
        c.p.pen.fill(rnd() < 0.5 ? "berry" : "sky", "hachure", { hachureGap: 4, hachureAngle: 45 }),
        { stroke: c.ink, strokeWidth: 1.1 },
    );
}

function bollard(c: Ctx, x: number, y: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.rect(
        g,
        x - 9,
        y - 30,
        18,
        30,
        "pencil",
        c.p.pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
        { stroke: c.ink, strokeWidth: 1.2 },
    );
    c.p.pen.ellipse(g, x, y - 32, 28, 10, "pencil", c.p.pen.fill("ink-soft"), {
        stroke: c.ink,
        strokeWidth: 1,
    });
}

/** A brick coping along a canal's edge: a firm line with the joints of its bricks ticked along it. */
function coping(c: Ctx, g: SVGGElement, x0: number, y0: number, x1: number, y1: number): void {
    c.p.pen.line(g, x0, y0, x1, y1, "pencil", { stroke: c.ink, strokeWidth: 2 });
    const L = Math.hypot(x1 - x0, y1 - y0),
        ux = (x1 - x0) / L,
        uy = (y1 - y0) / L;
    for (let s = 0; s < L; s += 48)
        c.p.pen.line(
            g,
            x0 + ux * s - uy * 10,
            y0 + uy * s + ux * 10,
            x0 + ux * s + uy * 10,
            y0 + uy * s - ux * 10,
            "pencil",
            { stroke: c.ink, strokeWidth: 0.9, roughness: 0.4 },
        );
}

function skateCurl(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const w = (70 + rnd() * 60) * k,
        h = (20 + rnd() * 16) * k;
    c.p.pen.curve(
        c.texture,
        [
            [x - w, y + h * 0.4],
            [x - w * 0.3, y - h],
            [x + w * 0.2, y + h * 0.2],
            [x - w * 0.1, y + h * 0.7],
            [x + w * 0.4, y - h * 0.3],
            [x + w, y],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1, roughness: 0.6 },
    );
}

function crack(c: Ctx, x: number, y: number, rnd: () => number): void {
    const pts: [number, number][] = [[x, y]];
    for (let i = 0; i < 4; i++) {
        const [px, py] = pts[pts.length - 1] ?? [x, y];
        pts.push([px + 14 + rnd() * 18, py + (rnd() - 0.5) * 22]);
    }
    c.p.pen.linear(c.texture, pts, "pencil", { stroke: c.ink, strokeWidth: 0.8, roughness: 0.4 });
}

/** A string of bulbs sagging between posts along the far bank, lit, the fair's own light. */
function festoon(c: Ctx, x0: number, x1: number, y: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        span = 360;
    for (let x = x0; x < x1; x += span) {
        c.p.pen.line(g, x, y, x, y - 170, "pencil", { stroke: c.skyInk, strokeWidth: 2 });
        const pts: [number, number][] = [];
        for (let i = 0; i <= 8; i++) {
            const u = i / 8;
            pts.push([x + u * span, y - 164 + Math.sin(u * Math.PI) * 44]);
        }
        c.p.pen.curve(g, pts, "pencil", { stroke: c.skyInk, strokeWidth: 1.1 });
        for (let i = 1; i < 8; i++) {
            const [bx, by] = pts[i] ?? [x, y];
            c.p.pen.circle(
                g,
                bx,
                by + 8,
                30,
                "pencil",
                c.p.pen.fill("glow", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
                { stroke: "none", strokeWidth: 0 },
            );
            c.p.pen.circle(
                g,
                bx,
                by + 8,
                11,
                "pencil",
                c.p.pen.fill(rnd() < 0.3 ? "berry" : "glow"),
                { stroke: c.t.ink, strokeWidth: 0.8 },
            );
        }
    }
}

/** One plot of a patchwork: ploughed in furrows one way or another, or planted with cabbages in rows, hedged round. */
function fieldPatch(c: Ctx, x: number, y: number, w: number, h: number, rnd: () => number): void {
    if (w < 80 || h < 80) return;
    const g = el("g", {}, c.texture),
        kind = rnd();
    c.p.pen.rect(g, x, y, w, h, "doodle", null, {
        stroke: c.ink,
        strokeWidth: 1.3,
        roughness: 1.2,
    });
    if (kind < 0.3)
        for (let yy = y + 26; yy < y + h - 12; yy += 40)
            for (let xx = x + 24; xx < x + w - 12; xx += 42)
                c.p.pen.circle(g, xx, yy, 16, "pencil", c.p.pen.fill("mint"), {
                    stroke: c.ink,
                    strokeWidth: 0.8,
                });
    else if (kind < 0.65)
        for (let yy = y + 16; yy < y + h - 6; yy += 18)
            c.p.pen.line(g, x + 8, yy, x + w - 8, yy + (kind < 0.5 ? 6 : -6), "pencil", {
                stroke: c.t.tang,
                strokeWidth: 1.4,
                roughness: 0.6,
            });
    else
        for (let xx = x + 16; xx < x + w - 6; xx += 18)
            c.p.pen.line(g, xx, y + 8, xx + 4, y + h - 8, "pencil", {
                stroke: c.t.ok,
                strokeWidth: 1.2,
                roughness: 0.6,
            });
    // a hedge along the plot's top edge
    for (let xx = x + 10; xx < x + w; xx += 34) tuft(c, xx, y + 2, 0.55, g);
}

function wallStub(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    for (let row = 0; row < 3; row++)
        for (let i = 0; i < 3 - row; i++)
            c.p.pen.rect(
                g,
                x - 36 * k + i * 24 * k + row * 12 * k,
                y - (row + 1) * 16 * k,
                22 * k,
                15 * k,
                "pencil",
                c.p.pen.fill("card"),
                { stroke: c.ink, strokeWidth: 1 },
            );
}

function poppy(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.curve(
        g,
        [
            [x, y],
            [x + 4 * k, y - 16 * k],
            [x + 2 * k, y - 32 * k],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1 },
    );
    for (const dx of [-5, 5])
        c.p.pen.circle(g, x + 2 * k + dx * k, y - 34 * k, 13 * k, "pencil", c.p.pen.fill("berry"), {
            stroke: c.ink,
            strokeWidth: 0.8,
        });
    c.p.pen.circle(
        g,
        x + 2 * k,
        y - 34 * k,
        5 * k,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { stroke: "none" },
    );
}

/** A terrace: a whitewashed wall with its coping stones, pots of red flowers along the top, and a flight of steps down it. */
function terraceWall(c: Ctx, x0: number, x1: number, y: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        h = 46,
        stair = x0 + (x1 - x0) * (0.2 + rnd() * 0.6);
    c.p.pen.rect(g, x0, y - h, x1 - x0, h, "pencil", c.p.pen.fill("card"), {
        stroke: c.ink,
        strokeWidth: 1.4,
    });
    c.p.pen.line(g, x0, y - h + 8, x1, y - h + 8, "pencil", { stroke: c.ink, strokeWidth: 0.9 });
    for (let k = 0; k < 4; k++)
        c.p.pen.line(
            g,
            stair - 30 + k * 6,
            y - h + 12 + k * 9,
            stair + 30 - k * 6,
            y - h + 12 + k * 9,
            "ruler",
            { stroke: c.ink, strokeWidth: 1 },
        );
    for (let x = x0 + 40 + rnd() * 40; x < x1 - 30; x += 120 + rnd() * 70)
        if (Math.abs(x - stair) > 50) potted(c, x, y - h, "flowers", 0.85);
}

/** A few steps cut into the hillside between terraces. */
function steps(c: Ctx, x: number, y: number): void {
    const g = el("g", {}, c.texture);
    for (let k = 0; k < 3; k++)
        c.p.pen.rect(
            g,
            x - 30 + k * 8,
            y - k * 12,
            60 - k * 16,
            12,
            "pencil",
            c.p.pen.fill("card"),
            { stroke: c.ink, strokeWidth: 0.9 },
        );
}

/** One blue and white tile set into the ground, its flower the same as the path's. */
function tileInset(c: Ctx, x: number, y: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.rect(g, x - 18, y - 18, 36, 36, "ruler", c.p.pen.fill("card"), {
        stroke: c.ink,
        strokeWidth: 0.9,
    });
    c.p.pen.polygon(
        g,
        [
            [x, y - 12],
            [x + 12, y],
            [x, y + 12],
            [x - 12, y],
        ],
        "pencil",
        c.p.pen.fill("sky"),
        { stroke: c.ink, strokeWidth: 0.7 },
    );
}

function potted(c: Ctx, x: number, y: number, what: "flowers" | "olive", k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.polygon(
        g,
        [
            [x - 14 * k, y - 26 * k],
            [x + 14 * k, y - 26 * k],
            [x + 10 * k, y],
            [x - 10 * k, y],
        ],
        "pencil",
        c.p.pen.fill("tang"),
        { stroke: c.ink, strokeWidth: 1 },
    );
    if (what === "flowers")
        for (const [dx, dy] of [
            [-8, -34],
            [6, -38],
            [0, -46],
            [12, -30],
            [-12, -28],
        ] as const)
            c.p.pen.circle(
                g,
                x + dx * k,
                y + dy * k,
                11 * k,
                "pencil",
                c.p.pen.fill(dy < -40 ? "glow" : "berry"),
                { stroke: c.ink, strokeWidth: 0.7 },
            );
    else {
        c.p.pen.line(g, x, y - 26 * k, x + 2 * k, y - 56 * k, "pencil", {
            stroke: c.ink,
            strokeWidth: 1.4,
        });
        for (const [dx, dy] of [
            [-12, -60],
            [8, -64],
            [-2, -74],
            [14, -52],
            [-16, -50],
        ] as const)
            c.p.pen.ellipse(
                g,
                x + dx * k,
                y + dy * k,
                16 * k,
                9 * k,
                "pencil",
                c.p.pen.fill("mint", "hachure", { hachureGap: 3 }),
                { stroke: c.ink, strokeWidth: 0.7 },
            );
    }
}

/** A splash of paint where a brush was flicked: a blob and a few drops. */
function splash(c: Ctx, x: number, y: number, k: number, col: TokenName, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        pts: [number, number][] = [];
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2,
            r = (14 + rnd() * 10) * k;
        pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7]);
    }
    c.p.pen.polygon(g, pts, "doodle", c.p.pen.fill(col), { stroke: "none", strokeWidth: 0 });
    for (let i = 0; i < 3; i++)
        c.p.pen.circle(
            g,
            x + (rnd() - 0.5) * 70 * k,
            y + (rnd() - 0.5) * 40 * k,
            (4 + rnd() * 5) * k,
            "pencil",
            c.p.pen.fill(col),
            { stroke: "none", strokeWidth: 0 },
        );
}

function lichenRock(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    rock(c, x, y, k);
    for (let i = 0; i < 3; i++)
        c.p.pen.circle(
            c.texture,
            x + (rnd() - 0.5) * 30 * k,
            y - (8 + rnd() * 12) * k,
            6 * k,
            "pencil",
            c.p.pen.fill(rnd() < 0.5 ? "glow" : "mint"),
            { stroke: "none", strokeWidth: 0 },
        );
}

function tussock(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture);
    for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.28 + (rnd() - 0.5) * 0.1;
        c.p.pen.line(g, x, y, x + Math.cos(a) * 30 * k, y + Math.sin(a) * 30 * k, "pencil", {
            stroke: c.ink,
            strokeWidth: 1.1,
        });
    }
}

function cypress(c: Ctx, x: number, base: number, k: number): void {
    const g = el("g", {}, c.texture),
        h = 190 * k,
        w = 26 * k;
    c.p.pen.path(
        g,
        `M${x} ${base - h}Q${x + w * 1.1} ${base - h * 0.55} ${x + w * 0.6} ${base - 10}L${x - w * 0.6} ${base - 10}Q${x - w * 1.1} ${base - h * 0.55} ${x} ${base - h}Z`,
        "pencil",
        c.p.pen.fill("mint", "hachure", { hachureGap: 3.5, fillWeight: 0.8 }),
        { stroke: c.ink, strokeWidth: 1.3 },
    );
    c.p.pen.line(g, x, base - 12, x, base, "pencil", { stroke: c.ink, strokeWidth: 2 });
}

function rosette(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.circle(g, x, y, 44 * k, "pencil", null, { stroke: c.ink, strokeWidth: 1 });
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.p.pen.ellipse(
            g,
            x + Math.cos(a) * 11 * k,
            y + Math.sin(a) * 11 * k,
            12 * k,
            7 * k,
            "pencil",
            null,
            { stroke: c.ink, strokeWidth: 0.8 },
        );
    }
}

/** A test for a mark on the sky: false where it would sit behind the world's name, with room round it. */
function clearOfName(c: Ctx, pad = 70): (x: number, y: number) => boolean {
    const nb = c.label;
    return (x, y) =>
        !(x > nb.x - pad && x < nb.x + nb.w + pad && y > nb.y - pad && y < nb.y + nb.h + pad);
}

/** Whether a straight mark from one point to another stays clear of the name all the way. */
function clearLine(
    clear: (x: number, y: number) => boolean,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): boolean {
    for (let t = 0; t <= 1.001; t += 0.1)
        if (!clear(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    return true;
}

/** The highest a mark standing up from the horizon at x may reach and stay below the name. */
function ceilingAt(c: Ctx, x: number, pad = 70): number {
    const nb = c.label;
    return x > nb.x - pad && x < nb.x + nb.w + pad ? nb.y + nb.h + pad : c.s.horizon.y + 60;
}

/** Where a low sun stands on the horizon, as a share of the way across: to the right, away from the name. */
const SUNRISE = 0.78;

const CORAL: TokenName[] = ["berry", "tang", "glow", "mint"];

/** A coral: a branching one in thick strokes of colour, a brain coral's dome, or a fan. */
function coral(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        col = CORAL[Math.floor(rnd() * CORAL.length)] ?? "berry",
        kind = rnd();
    if (kind < 0.4) {
        for (let b = 0; b < 5; b++) {
            const a = -Math.PI / 2 + (b - 2) * 0.36 + (rnd() - 0.5) * 0.2,
                len = (26 + rnd() * 16) * k;
            c.p.pen.line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, "pencil", {
                stroke: c.t[col],
                strokeWidth: 7 * k,
            });
            c.p.pen.line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, "pencil", {
                stroke: c.ink,
                strokeWidth: 0.8,
            });
        }
    } else if (kind < 0.75) {
        c.p.pen.path(
            g,
            `M${x - 24 * k} ${y}C${x - 24 * k} ${y - 30 * k} ${x + 24 * k} ${y - 30 * k} ${x + 24 * k} ${y}Z`,
            "pencil",
            c.p.pen.fill(col),
            { stroke: c.ink, strokeWidth: 1.2 },
        );
        c.p.pen.curve(
            g,
            [
                [x - 16 * k, y - 6 * k],
                [x - 8 * k, y - 16 * k],
                [x, y - 8 * k],
                [x + 8 * k, y - 18 * k],
                [x + 16 * k, y - 6 * k],
            ],
            "doodle",
            { stroke: c.ink, strokeWidth: 0.8 },
        );
    } else {
        c.p.pen.path(
            g,
            `M${x} ${y}L${x - 26 * k} ${y - 30 * k}Q${x} ${y - 52 * k} ${x + 26 * k} ${y - 30 * k}Z`,
            "pencil",
            c.p.pen.fill(col, "cross-hatch", { hachureGap: 5, fillWeight: 0.6 }),
            { stroke: c.ink, strokeWidth: 1.1 },
        );
    }
}

/** A frond of kelp standing up from the sea floor, its leaves off alternate sides. */
function kelp(c: Ctx, x: number, base: number, h: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        sway = rnd() * 6,
        pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) pts.push([x + Math.sin(k * 0.9 + sway) * 14, base - (h * k) / 8]);
    el(
        "path",
        {
            d: `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L")}`,
            fill: "none",
            stroke: c.t.mint,
            "stroke-width": 11,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            opacity: "0.7",
        },
        g,
    );
    c.p.pen.curve(g, pts, "pencil", { stroke: c.skyInk, strokeWidth: 1.2 });
    for (let k = 2; k < 8; k += 2) {
        const [px, py] = pts[k] ?? [x, base],
            s = k % 4 ? 1 : -1;
        c.p.pen.path(
            g,
            `M${px} ${py}Q${px + 24 * s} ${py - 18} ${px + 34 * s} ${py - 6}Q${px + 16 * s} ${py + 4} ${px} ${py}Z`,
            "pencil",
            c.p.pen.fill("mint"),
            { stroke: c.skyInk, strokeWidth: 0.9 },
        );
    }
}

/** A shell on the sand: a fan with its ribs. */
function shell(
    c: Ctx,
    x: number,
    y: number,
    k: number,
    fill: TokenName,
    into: SVGGElement = c.texture,
): void {
    const g = el("g", {}, into);
    c.p.pen.path(
        g,
        `M${x - 11 * k} ${y}Q${x - 12 * k} ${y - 16 * k} ${x} ${y - 17 * k}Q${x + 12 * k} ${y - 16 * k} ${x + 11 * k} ${y}Z`,
        "pencil",
        c.p.pen.fill(fill),
        { stroke: c.ink, strokeWidth: 1 },
    );
    for (const d of [-0.6, -0.2, 0.2, 0.6])
        c.p.pen.line(g, x, y, x + d * 11 * k, y - 14 * k, "pencil", {
            stroke: c.ink,
            strokeWidth: 0.7,
        });
}

function anemone(c: Ctx, x: number, y: number, k: number): void {
    rock(c, x, y, k * 0.8);
    const g = el("g", {}, c.texture);
    for (let i = 0; i < 6; i++)
        c.p.pen.curve(
            g,
            [
                [x - 10 * k + i * 4 * k, y - 18 * k],
                [x - 14 * k + i * 5 * k, y - 30 * k],
                [x - 18 * k + i * 7 * k, y - 38 * k],
            ],
            "pencil",
            { stroke: c.t.berry, strokeWidth: 3 * k },
        );
}

function seaGrass(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture);
    for (let i = 0; i < 5; i++) {
        const bx = x + (i - 2) * 7 * k,
            h = (40 + rnd() * 40) * k,
            lean = (rnd() - 0.5) * 26 * k;
        const pts: [number, number][] = [
            [bx, y],
            [bx + lean * 0.3, y - h * 0.5],
            [bx + lean, y - h],
        ];
        c.p.pen.curve(g, pts, "pencil", { stroke: c.t.mint, strokeWidth: 5 });
        c.p.pen.curve(g, pts, "pencil", { stroke: c.ink, strokeWidth: 0.8 });
    }
}

/** Ripples the water or the wind has left in sand. */
const ripple = (c: Ctx, x: number, y: number, w: number, stroke: string) =>
    c.p.pen.curve(
        c.texture,
        [
            [x, y],
            [x + w * 0.25, y - 5],
            [x + w * 0.5, y],
            [x + w * 0.75, y - 5],
            [x + w, y],
        ],
        "doodle",
        { stroke, strokeWidth: 1.2, roughness: 0.6 },
    );

function bubbles(
    c: Ctx,
    x: number,
    y: number,
    k: number,
    stroke: string,
    into: SVGGElement = c.texture,
): void {
    for (let i = 0; i < 4; i++)
        el(
            "circle",
            {
                cx: x + Math.sin(i * 1.7) * 6 * k,
                cy: y - i * 22 * k,
                r: (4 + i * 1.6) * k,
                fill: "none",
                stroke,
                "stroke-width": 1.4,
                opacity: "0.85",
            },
            into,
        );
}

/** A stalactite hanging from the roof (a positive length) or a stalagmite standing up to meet one: a long cone in pale hatching. */
function dripstone(
    c: Ctx,
    x: number,
    y: number,
    w: number,
    len: number,
    into: SVGGElement,
    stroke: string,
): void {
    c.p.pen.path(
        into,
        `M${x - w} ${y}Q${x - w * 0.2} ${y + len * 0.6} ${x} ${y + len}Q${x + w * 0.2} ${y + len * 0.6} ${x + w} ${y}Z`,
        "pencil",
        c.p.pen.fill("card", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
        { stroke, strokeWidth: 1.2 },
    );
}

function crystals(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        cols: TokenName[] = ["sky", "berry", "mint"];
    for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.45,
            h = (34 + rnd() * 18) * k * (i === 1 ? 1.3 : 1),
            w = 9 * k,
            bx = x + (i - 1) * 10 * k;
        const tx = bx + Math.cos(a) * h,
            ty = y + Math.sin(a) * h,
            nx = -Math.sin(a) * w,
            ny = Math.cos(a) * w;
        c.p.pen.polygon(
            g,
            [
                [bx - nx, y - ny],
                [bx - nx + (tx - bx) * 0.8, y - ny + (ty - y) * 0.8],
                [tx, ty],
                [bx + nx + (tx - bx) * 0.8, y + ny + (ty - y) * 0.8],
                [bx + nx, y + ny],
            ],
            "pencil",
            c.p.pen.fill(cols[i] ?? "sky"),
            { stroke: c.ink, strokeWidth: 1.1 },
        );
        c.p.pen.line(g, bx, y, tx, ty, "pencil", { stroke: c.ink, strokeWidth: 0.6 });
    }
}

/** A rimstone pool on the cave floor, where a drop has just landed. */
function rimPool(c: Ctx, x: number, y: number, w: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.ellipse(g, x, y, w, w * 0.32, "pencil", c.p.pen.fill("sky"), {
        stroke: c.ink,
        strokeWidth: 1.3,
    });
    el(
        "ellipse",
        {
            cx: x + w * 0.08,
            cy: y,
            rx: w * 0.14,
            ry: w * 0.04,
            fill: "none",
            stroke: c.ink,
            "stroke-width": 1,
            opacity: "0.6",
        },
        g,
    );
}

const pebble = (c: Ctx, x: number, y: number, k: number) =>
    c.p.pen.ellipse(
        c.texture,
        x,
        y,
        20 * k,
        11 * k,
        "pencil",
        c.p.pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.5 }),
        { stroke: c.ink, strokeWidth: 0.9 },
    );

/** A little heap of cloud: three puffs of paper with a blue shadow along their tops. */
function puff(c: Ctx, x: number, y: number, k: number, into: SVGGElement = c.texture): void {
    const g = el("g", {}, into),
        parts: [number, number, number][] = [
            [-18, 2, 20],
            [0, -6, 26],
            [18, 2, 19],
        ];
    for (const [dx, dy, d] of parts)
        c.p.pen.ellipse(
            g,
            x + dx * k,
            y + dy * k,
            d * 2 * k,
            d * 1.2 * k,
            "doodle",
            { fill: c.t.card, fillStyle: "solid" },
            { stroke: "none" },
        );
    for (const [dx, dy, d] of parts)
        c.p.pen.arc(
            g,
            x + dx * k,
            y + dy * k,
            d * 2 * k,
            d * 1.2 * k,
            Math.PI * 1.05,
            Math.PI * 1.95,
            "doodle",
            { stroke: c.t.sky, strokeWidth: 1.6 },
        );
    c.p.pen.line(g, x - 36 * k, y + 12 * k, x + 36 * k, y + 12 * k, "doodle", {
        stroke: c.t.sky,
        strokeWidth: 1.2,
    });
}

const swift = (c: Ctx, x: number, y: number, s: number) =>
    c.p.pen.curve(
        c.p.g,
        [
            [x - s, y - s * 0.4],
            [x - s * 0.4, y - s * 0.1],
            [x, y + s * 0.2],
            [x + s * 0.4, y - s * 0.1],
            [x + s, y - s * 0.4],
        ],
        "doodle",
        { stroke: c.skyInk, strokeWidth: 1.6 },
    );

/** One dune as path data: its body, a long slope up to a sharp crest and a steeper face down; the slope's shadow; and the crest's line. */
function dune(
    l: number,
    base: number,
    span: number,
    hgt: number,
): { body: string; shade: string; crest: string } {
    const cx = l + span * 0.62,
        top = base - hgt,
        rt = l + span;
    const up = `M${l} ${base}C${l + span * 0.28} ${base - hgt * 0.1} ${cx - span * 0.22} ${top + hgt * 0.06} ${cx} ${top}`;
    return {
        body: `${up}C${cx + span * 0.07} ${top + hgt * 0.25} ${rt - span * 0.18} ${base - 2} ${rt} ${base}Z`,
        shade: `${up}C${cx - span * 0.06} ${top + hgt * 0.4} ${cx - span * 0.16} ${base - hgt * 0.1} ${cx - span * 0.24} ${base}Z`,
        crest: `M${cx - span * 0.3} ${top + hgt * 0.18}C${cx - span * 0.14} ${top + hgt * 0.02} ${cx - span * 0.05} ${top} ${cx} ${top}C${cx + span * 0.06} ${top + hgt * 0.18} ${cx + span * 0.16} ${base - hgt * 0.4} ${cx + span * 0.24} ${base - hgt * 0.1}`,
    };
}

function dryTuft(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    for (let i = 0; i < 6; i++)
        c.p.pen.line(
            g,
            x + i * 3 * k,
            y,
            x + (i - 2.5) * 5 * k,
            y - (18 + (i % 3) * 8) * k,
            "pencil",
            { stroke: c.t.tang, strokeWidth: 1.6 },
        );
}

function pebbles(c: Ctx, x: number, y: number, rnd: () => number): void {
    const g = el("g", {}, c.texture);
    for (let i = 0; i < 3; i++)
        c.p.pen.ellipse(
            g,
            x + (rnd() - 0.5) * 36,
            y + (rnd() - 0.5) * 12,
            10 + rnd() * 8,
            6 + rnd() * 4,
            "pencil",
            c.p.pen.fill("card"),
            { stroke: c.ink, strokeWidth: 0.8 },
        );
}

/** The dotted wandering line a beetle leaves across sand. */
function beetleTrack(c: Ctx, x: number, y: number, rnd: () => number): void {
    const g = el("g", { opacity: "0.8" }, c.texture),
        ph = rnd() * 6;
    for (let i = 0; i < 12; i++)
        el(
            "circle",
            { cx: x + i * 11, cy: y + Math.sin(i * 0.6 + ph) * 8, r: 1.6, fill: c.ink },
            g,
        );
}

/** Where the fossil cliff's foot is: past the middle of the world, so the sea runs out to it under the name. */
const cliffFoot = (c: Ctx): number => c.l.x0 + (c.l.x1 - c.l.x0) * 0.52;

function ledgeCrack(c: Ctx, x: number, y: number, w: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        pts: [number, number][] = [];
    for (let i = 0; i <= 6; i++)
        pts.push([x + (i / 6) * w, y + Math.sin(i * 1.4) * 4 - (i / 6) * 6]);
    c.p.pen.curve(g, pts, "pencil", { stroke: c.ink, strokeWidth: 1.2, roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
        const cx = x + (0.15 + rnd() * 0.7) * w;
        c.p.pen.line(g, cx, y, cx + (rnd() - 0.5) * 14, y + 14 + rnd() * 12, "pencil", {
            stroke: c.ink,
            strokeWidth: 0.9,
        });
    }
}

function rockPool(c: Ctx, x: number, y: number, w: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.ellipse(g, x, y, w, w * 0.24, "pencil", c.p.pen.fill("sky"), {
        stroke: c.ink,
        strokeWidth: 1.3,
    });
    for (let q = 0; q < 4; q++) {
        const wx = x - w * 0.3 + q * w * 0.18;
        c.p.pen.curve(
            g,
            [
                [wx, y + w * 0.04],
                [wx + 4, y - w * 0.04],
                [wx, y - w * 0.09],
            ],
            "pencil",
            { stroke: c.t.ok, strokeWidth: 1.6 },
        );
    }
}

/** An ammonite in the rock: a coiled shell, ribbed, pressed flat. */
function ammonite(c: Ctx, x: number, y: number, r0: number): void {
    const g = el("g", {}, c.texture),
        pts: [number, number][] = [],
        turns = Math.PI * 5,
        rAt = (a: number) => r0 * (1 - (a / turns) * 0.88);
    for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * turns;
        pts.push([x + Math.cos(a) * rAt(a), y + Math.sin(a) * rAt(a) * 0.9]);
    }
    c.p.pen.curve(g, pts, "pencil", { stroke: c.ink, strokeWidth: 1.2 });
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2,
            rr = rAt(a);
        c.p.pen.line(
            g,
            x + Math.cos(a) * rr * 0.72,
            y + Math.sin(a) * rr * 0.65,
            x + Math.cos(a) * rr,
            y + Math.sin(a) * rr * 0.9,
            "pencil",
            { stroke: c.ink, strokeWidth: 0.7 },
        );
    }
}

/** A blade of grass at a beetle's height: a long tapering leaf, pale and thin far off, drawn round near. */
function blade(
    c: Ctx,
    into: SVGGElement,
    x: number,
    base: number,
    h: number,
    bend: number,
    w: number,
    o: number,
    outline: boolean,
): void {
    const tx = x + bend,
        ty = base - h,
        mx = x + bend * 0.15,
        my = base - h * 0.55;
    const d = `M${x - w} ${base}Q${mx - w * 0.6} ${my} ${tx} ${ty}Q${mx + w * 0.6} ${my} ${x + w} ${base}Z`;
    el("path", { d, fill: c.t.mint, opacity: String(o) }, into);
    if (outline) c.p.pen.path(into, d, "pencil", null, { stroke: c.ink, strokeWidth: 1.2 });
    else
        el(
            "path",
            {
                d: `M${x} ${base}Q${mx} ${my} ${tx} ${ty}`,
                fill: "none",
                stroke: c.t.ok,
                "stroke-width": 1,
                opacity: "0.35",
            },
            into,
        );
}

/** A clover leaf on its stalk: three heart-shaped leaflets fanned up from the top, each notched at its tip and marked with a clover's pale chevron. */
function cloverLeaf(c: Ctx, x: number, y: number, s: number, base: number): void {
    const g = el("g", {}, c.texture),
        L = 64 * s,
        w = 30 * s;
    c.p.pen.curve(
        g,
        [
            [x, y],
            [x + 12 * s, (y + base) / 2],
            [x - 8 * s, base],
        ],
        "pencil",
        { stroke: c.t.ok, strokeWidth: 4.5 * s },
    );
    for (const a of [-2.7, -1.57, -0.44]) {
        const cos = Math.cos(a),
            sin = Math.sin(a),
            pt = (u: number, v: number) =>
                `${(x + u * cos - v * sin).toFixed(1)} ${(y + u * sin + v * cos).toFixed(1)}`;
        const d =
            `M${pt(0, 0)}Q${pt(0.08 * L, -1.05 * w)} ${pt(0.58 * L, -w)}Q${pt(1.04 * L, -0.98 * w)} ${pt(0.99 * L, -0.36 * w)}Q${pt(0.97 * L, -0.08 * w)} ${pt(0.84 * L, 0)}` +
            `Q${pt(0.97 * L, 0.08 * w)} ${pt(0.99 * L, 0.36 * w)}Q${pt(1.04 * L, 0.98 * w)} ${pt(0.58 * L, w)}Q${pt(0.08 * L, 1.05 * w)} ${pt(0, 0)}Z`;
        c.p.pen.path(g, d, "pencil", c.p.pen.fill("mint"), { stroke: c.ink, strokeWidth: 1.3 });
        el(
            "path",
            {
                d: `M${pt(0.3 * L, -0.5 * w)}L${pt(0.56 * L, 0)}L${pt(0.3 * L, 0.5 * w)}`,
                fill: "none",
                stroke: c.t.card,
                "stroke-width": 3.2 * s,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                opacity: "0.85",
            },
            g,
        );
        c.p.pen.line(g, x, y, x + 0.8 * L * cos, y + 0.8 * L * sin, "pencil", {
            stroke: c.ink,
            strokeWidth: 0.9,
        });
    }
}

/** A leaf fallen into the litter, as big as the child is. */
function fallenLeaf(c: Ctx, x: number, y: number, a: number, k: number, fill: TokenName): void {
    const L = 110 * k,
        W = 46 * k,
        cos = Math.cos(a),
        sin = Math.sin(a),
        g = el("g", {}, c.texture);
    const pt = (u: number, v: number): [number, number] => [
        x + u * cos - v * sin,
        y + u * sin + v * cos,
    ];
    const edge: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        edge.push(pt((u - 0.5) * L, Math.sin(Math.PI * u) * W * 0.5));
    }
    for (let i = 9; i >= 1; i--) {
        const u = i / 10;
        edge.push(pt((u - 0.5) * L, -Math.sin(Math.PI * u) * W * 0.5));
    }
    c.p.pen.polygon(g, edge, "pencil", c.p.pen.fill(fill, "hachure", { hachureGap: 5 }), {
        stroke: c.ink,
        strokeWidth: 1.3,
    });
    c.p.pen.line(g, ...pt(-L * 0.5, 0), ...pt(L * 0.5, 0), "pencil", {
        stroke: c.ink,
        strokeWidth: 1,
    });
    for (const u of [-0.25, 0, 0.25])
        for (const s of [-1, 1])
            c.p.pen.line(g, ...pt(u * L, 0), ...pt(u * L + L * 0.12, s * W * 0.34), "pencil", {
                stroke: c.ink,
                strokeWidth: 0.7,
            });
}

/** A pebble, which at a beetle's height is a boulder. */
function boulder(c: Ctx, x: number, y: number, s: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.path(
        g,
        `M${x - s} ${y}Q${x - s} ${y - s * 0.9} ${x} ${y - s}Q${x + s * 0.95} ${y - s * 0.8} ${x + s} ${y}Z`,
        "pencil",
        c.p.pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
        { stroke: c.ink, strokeWidth: 1.4 },
    );
    c.p.pen.arc(
        g,
        x - s * 0.2,
        y - s * 0.55,
        s * 0.8,
        s * 0.4,
        Math.PI * 1.1,
        Math.PI * 1.6,
        "pencil",
        { stroke: c.ink, strokeWidth: 1 },
    );
}

function moss(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    for (let i = 0; i < 6; i++)
        c.p.pen.circle(
            g,
            x + ((i % 3) - 1) * 14 * k,
            y - Math.floor(i / 3) * 11 * k,
            18 * k,
            "doodle",
            c.p.pen.fill("mint"),
            { stroke: c.t.ok, strokeWidth: 0.9 },
        );
}

/** A dandelion seed come down in the litter. */
function seed(c: Ctx, x: number, y: number, a: number): void {
    const len = 30,
        tx = x + Math.cos(a) * len,
        ty = y + Math.sin(a) * len,
        g = el("g", {}, c.texture);
    c.p.pen.line(g, x, y, tx, ty, "pencil", { stroke: c.ink, strokeWidth: 1 });
    for (let k = -3; k <= 3; k++)
        c.p.pen.line(
            g,
            tx,
            ty,
            tx + Math.cos(a + k * 0.36) * 13,
            ty + Math.sin(a + k * 0.36) * 13,
            "pencil",
            { stroke: c.ink, strokeWidth: 0.7 },
        );
    c.p.pen.ellipse(g, x, y, 7, 4, "pencil", c.p.pen.fill("tang"), {
        stroke: c.ink,
        strokeWidth: 0.6,
    });
}

/** An oval turned to point along a heading. */
const oval = (cx: number, cy: number, rx: number, ry: number, rot: number): [number, number][] =>
    Array.from({ length: 12 }, (_, j) => {
        const u = (j / 12) * Math.PI * 2,
            ex = Math.cos(u) * rx,
            ey = Math.sin(u) * ry;
        return [
            cx + ex * Math.cos(rot) - ey * Math.sin(rot),
            cy + ex * Math.sin(rot) + ey * Math.cos(rot),
        ];
    });

/**
 * A three-toed dinosaur's footprint heading along `a`, as a single outline: a narrow heel and three long toes
 * spread wide and tapering to claws, the middle one longest, which is what keeps it from reading as a paw.
 */
function threeToed(x: number, y: number, a: number): [number, number][] {
    const cos = Math.cos(a),
        sin = Math.sin(a),
        pt = (u: number, v: number): [number, number] => [
            x + u * cos - v * sin,
            y + u * sin + v * cos,
        ];
    // a point along a toe at angle t, a share f of its length out, w to its left
    const toe = (t: number, len: number, f: number, w: number) =>
        pt(Math.cos(t) * f * len + Math.sin(t) * w, Math.sin(t) * f * len - Math.cos(t) * w);
    const TOES = [
            [-0.5, 34],
            [0, 44],
            [0.5, 34],
        ] as const,
        b = 6;
    const out: [number, number][] = [pt(-15, 0), pt(-7, -9), toe(-0.5, 34, 0.22, b)];
    TOES.forEach(([t, len], i) => {
        out.push(toe(t, len, 0.6, b * 0.62), toe(t, len, 1, 0), toe(t, len, 0.6, -b * 0.62));
        const next = TOES[i + 1];
        if (next) out.push(pt(Math.cos((t + next[0]) / 2) * 13, Math.sin((t + next[0]) / 2) * 13));
    });
    out.push(toe(0.5, 34, 0.22, -b), pt(-7, 9));
    return out;
}

/** An ant walking along a heading (ux, uy): head, middle and back, and three legs a side. */
function ant(c: Ctx, x: number, y: number, ux: number, uy: number): void {
    const g = el("g", {}, c.p.g);
    for (const [u, r] of [
        [7, 3.4],
        [0, 2.6],
        [-7, 4],
    ] as const)
        el("circle", { cx: x + ux * u, cy: y + uy * u, r, fill: c.t.ink }, g);
    for (const u of [-3, 0, 3])
        for (const s of [-1, 1])
            el(
                "line",
                {
                    x1: x + ux * u,
                    y1: y + uy * u,
                    x2: x + ux * (u - 3) - uy * s * 8,
                    y2: y + uy * (u - 3) + ux * s * 8,
                    stroke: c.t.ink,
                    "stroke-width": 1,
                },
                g,
            );
}

/** A rounded pink granite boulder with a crack across it. */
function boulderPink(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        w = 90 * k,
        h = 50 * k;
    c.p.pen.path(
        g,
        `M${x - w} ${y}Q${x - w * 0.9} ${y - h} ${x - w * 0.2} ${y - h * 1.1}Q${x + w * 0.7} ${y - h} ${x + w} ${y}Z`,
        "pencil",
        c.p.pen.fill("berry", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
        { stroke: c.ink, strokeWidth: 1.5 },
    );
    c.p.pen.line(g, x - w * 0.3, y - h * 0.9, x - w * 0.1 + rnd() * 10, y - h * 0.3, "pencil", {
        stroke: c.ink,
        strokeWidth: 0.9,
    });
}

/** A cushion of sea thrift: a low green tuft with pink heads on stalks. */
function thrift(c: Ctx, x: number, y: number, k: number): void {
    const g = el("g", {}, c.texture);
    c.p.pen.ellipse(g, x, y, 46 * k, 16 * k, "pencil", c.p.pen.fill("mint"), {
        stroke: c.ink,
        strokeWidth: 1.1,
    });
    for (const dx of [-12, 0, 12]) {
        c.p.pen.line(g, x + dx * k, y - 6 * k, x + dx * 1.3 * k, y - 26 * k, "pencil", {
            stroke: c.ink,
            strokeWidth: 1,
        });
        c.p.pen.circle(g, x + dx * 1.3 * k, y - 30 * k, 11 * k, "pencil", c.p.pen.fill("berry"), {
            stroke: c.ink,
            strokeWidth: 0.8,
        });
    }
}

/** A cog lying on the ground, seen a little from above, with its teeth and its hole. */
function cog(c: Ctx, x: number, y: number, r: number, fill: TokenName, into: SVGGElement): void {
    const pts: [number, number][] = [];
    for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2,
            rr = i % 4 < 2 ? r : r * 0.78;
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6]);
    }
    c.p.pen.polygon(into, pts, "pencil", c.p.pen.fill(fill), {
        stroke: c.ink,
        strokeWidth: 1.1,
        preserveVertices: true,
    });
    c.p.pen.ellipse(into, x, y, r * 0.5, r * 0.3, "pencil", c.p.pen.fill("card"), {
        stroke: c.ink,
        strokeWidth: 0.9,
    });
}

function spring(c: Ctx, x: number, y: number, k: number): void {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 8; i++) pts.push([x - 32 * k + i * 8 * k, y + (i % 2 ? -8 : 8) * k]);
    c.texture.appendChild(
        c.p.pen.rc.linearPath(pts, c.p.pen.opt("pencil", { stroke: c.ink, strokeWidth: 1.2 })),
    );
}

function crate(c: Ctx, x: number, base: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        w = 70 * k,
        h = 56 * k;
    c.p.pen.rect(
        g,
        x,
        base - h,
        w,
        h,
        "pencil",
        c.p.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
        { stroke: c.ink, strokeWidth: 1.4 },
    );
    c.p.pen.line(g, x, base - h, x + w, base, "pencil", { stroke: c.ink, strokeWidth: 1 });
    if (rnd() < 0.5) cog(c, x + w + 34 * k, base - 20 * k, 20 * k, "glow", g);
}

function bookStack(c: Ctx, x: number, y: number, n: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        cols: TokenName[] = ["berry", "sky", "tang", "mint", "glow"];
    for (let k = 0; k < n; k++) {
        const w = 50 + rnd() * 16,
            dx = (rnd() - 0.5) * 10;
        c.p.pen.rect(
            g,
            x - w / 2 + dx,
            y - 12 * (k + 1),
            w,
            11,
            "pencil",
            c.p.pen.fill(cols[Math.floor(rnd() * 5)] ?? "sky"),
            { stroke: c.ink, strokeWidth: 1 },
        );
    }
}

/** A line sagging between two posts, with printed pages pegged along it. */
function pageLine(c: Ctx, x0: number, x1: number, y: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        sag = 18;
    c.p.pen.curve(
        g,
        [
            [x0, y],
            [(x0 + x1) / 2, y + sag],
            [x1, y],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1.1 },
    );
    for (let x = x0 + 40; x < x1 - 30; x += 64) {
        const u = (x - x0) / (x1 - x0),
            yy = y + sag * 4 * u * (1 - u),
            tilt = (rnd() - 0.5) * 6;
        c.p.pen.polygon(
            g,
            [
                [x - 20, yy],
                [x + 20, yy],
                [x + 20 + tilt, yy + 50],
                [x - 20 + tilt, yy + 50],
            ],
            "pencil",
            c.p.pen.fill("card"),
            { stroke: c.ink, strokeWidth: 1.1 },
        );
        for (const dy of [14, 24, 34])
            c.p.pen.line(g, x - 12, yy + dy, x + 12, yy + dy, "pencil", {
                stroke: c.ink,
                strokeWidth: 0.7,
            });
    }
}

/** A piece of metal type: a block with its letter raised on the face, backwards as type is. */
function typeBlock(c: Ctx, x: number, y: number, rnd: () => number, into: SVGGElement): void {
    const g = el("g", {}, into),
        s = 22,
        o = { stroke: c.ink, strokeWidth: 1.6 };
    c.p.pen.polygon(
        g,
        [
            [x - s / 2, y - s / 2],
            [x + s / 2, y - s / 2],
            [x + s / 2 + 6, y - s / 2 + 5],
            [x + s / 2 + 6, y + s / 2 + 5],
            [x - s / 2 + 6, y + s / 2 + 5],
            [x - s / 2, y + s / 2],
        ],
        "pencil",
        c.p.pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
        { stroke: c.ink, strokeWidth: 1 },
    );
    c.p.pen.rect(g, x - s / 2, y - s / 2, s, s, "pencil", c.p.pen.fill("card"), {
        stroke: c.ink,
        strokeWidth: 1.1,
    });
    const k = Math.floor(rnd() * 3);
    if (k === 0)
        c.p.pen.curve(
            g,
            [
                [x - 5, y - 6],
                [x + 5, y - 6],
                [x + 5, y + 6],
                [x - 5, y + 6],
            ],
            "pencil",
            o,
        );
    else if (k === 1) {
        c.p.pen.line(g, x + 5, y - 7, x + 5, y + 7, "pencil", o);
        c.p.pen.line(g, x + 5, y + 7, x - 5, y + 7, "pencil", o);
    } else {
        c.p.pen.line(g, x - 6, y + 7, x, y - 7, "pencil", o);
        c.p.pen.line(g, x, y - 7, x + 6, y + 7, "pencil", o);
    }
}

function ropeCoil(c: Ctx, x: number, y: number, k: number): void {
    for (const r of [30, 21, 12])
        c.p.pen.ellipse(c.texture, x, y, r * 2 * k, r * 1.1 * k, "pencil", null, {
            stroke: c.ink,
            strokeWidth: 1.3,
        });
}

/** An envelope dropped on the quay, turned by `deg`. */
function envelope(c: Ctx, x: number, y: number, deg: number): void {
    const g = el("g", { transform: `rotate(${Math.round(deg)} ${x} ${y})` }, c.texture);
    c.p.pen.rect(g, x - 26, y - 16, 52, 32, "pencil", c.p.pen.fill("card"), {
        stroke: c.ink,
        strokeWidth: 1.1,
    });
    c.p.pen.curve(
        g,
        [
            [x - 26, y - 16],
            [x, y + 2],
            [x + 26, y - 16],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1 },
    );
}

/** A tuft of grass leaning the way the wind blows, from the west. */
function windGrass(c: Ctx, x: number, y: number, k: number): void {
    for (const [dx, h] of [
        [-8, 22],
        [0, 30],
        [8, 24],
    ] as const)
        c.p.pen.curve(
            c.texture,
            [
                [x + dx * k, y],
                [x + (dx + 8) * k, y - h * 0.6 * k],
                [x + (dx + 20) * k, y - h * k],
            ],
            "doodle",
            { stroke: c.ink, strokeWidth: 1.4, roughness: 0.7 },
        );
}

/** A tree's crown seen across the forest: a scalloped round of leaves with a flat foot where the mist hides it. */
function crown(c: Ctx, x: number, y: number, k: number, rnd: () => number): void {
    const g = el("g", {}, c.texture),
        n = 7,
        w = (120 + rnd() * 30) * k,
        h = (70 + rnd() * 20) * k;
    let d = `M${x - w} ${y}`;
    for (let i = 1; i <= n; i++) {
        const a0 = Math.PI + ((i - 1) / n) * Math.PI,
            a1 = Math.PI + (i / n) * Math.PI,
            am = (a0 + a1) / 2;
        d += `Q${x + Math.cos(am) * w * 1.18} ${y + Math.sin(am) * h * 1.3} ${x + Math.cos(a1) * w} ${y + Math.sin(a1) * h}`;
    }
    c.p.pen.path(
        g,
        `${d}Z`,
        "pencil",
        c.p.pen.fill(rnd() < 0.75 ? "mint" : "glow", "hachure", { hachureGap: 4, fillWeight: 1.1 }),
        { stroke: c.ink, strokeWidth: 1.4 },
    );
    c.p.pen.curve(
        g,
        [
            [x - w * 0.5, y - h * 0.25],
            [x, y - h * 0.55],
            [x + w * 0.5, y - h * 0.3],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 0.9 },
    );
}

function branch(c: Ctx, x: number, y: number, rnd: () => number): void {
    const s = rnd() < 0.5 ? 1 : -1,
        g = el("g", {}, c.texture);
    c.p.pen.curve(
        g,
        [
            [x - 70 * s, y + 10],
            [x, y - 6],
            [x + 70 * s, y + 4],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 3 },
    );
    for (const u of [-30, 20])
        c.p.pen.ellipse(g, x + u * s, y - 14, 30, 14, "pencil", c.p.pen.fill("mint"), {
            stroke: c.ink,
            strokeWidth: 1,
        });
}

/** A patch of salt crust: three six-sided cells sharing their edges, seen flat on the ground. */
function hexCell(c: Ctx, x: number, y: number, r: number): void {
    const q = 0.55,
        o = { stroke: c.t["ink-soft"], strokeWidth: 0.9, preserveVertices: true };
    for (const [dx, dy] of [
        [0, 0],
        [1.5, 0.866],
        [0, 1.732],
    ] as const) {
        const cx = x + dx * r,
            cy = y + dy * r * q;
        c.p.pen.polygon(
            c.texture,
            Array.from({ length: 6 }, (_, i): [number, number] => [
                cx + Math.cos((i / 3) * Math.PI) * r,
                cy + Math.sin((i / 3) * Math.PI) * r * q,
            ]),
            "pencil",
            null,
            o,
        );
    }
}

function saltHeap(c: Ctx, x: number, y: number, k: number, into: SVGGElement): void {
    c.p.pen.path(
        into,
        `M${x - 32 * k} ${y}Q${x - 22 * k} ${y - 34 * k} ${x} ${y - 38 * k}Q${x + 22 * k} ${y - 34 * k} ${x + 32 * k} ${y}Z`,
        "pencil",
        c.p.pen.fill("card"),
        { stroke: c.ink, strokeWidth: 1.3 },
    );
    c.p.pen.curve(
        into,
        [
            [x + 6 * k, y - 34 * k],
            [x + 18 * k, y - 18 * k],
            [x + 22 * k, y - 2 * k],
        ],
        "pencil",
        { stroke: c.t["ink-soft"], strokeWidth: 0.8 },
    );
}

/** Steam going up off hot ground in two broken wisps. */
function steam(c: Ctx, x: number, y: number, k: number): void {
    c.p.pen.curve(
        c.texture,
        [
            [x, y],
            [x - 12 * k, y - 30 * k],
            [x + 8 * k, y - 62 * k],
            [x - 6 * k, y - 96 * k],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 1.1, strokeLineDash: [10, 8] },
    );
    c.p.pen.curve(
        c.texture,
        [
            [x + 16 * k, y],
            [x + 6 * k, y - 26 * k],
            [x + 24 * k, y - 52 * k],
        ],
        "pencil",
        { stroke: c.ink, strokeWidth: 0.9, strokeLineDash: [8, 8] },
    );
}

interface Path {
    /** A plain band under the whole path, painted at once. */
    under?(c: Ctx, d: string): void;
    /** The path's own marks, for the samples that fall in one tile. */
    tile(c: Ctx, at: Sample[]): void;
}

const offset = (at: Sample[], by: number): [number, number][] =>
    at.map((q) => [q.x + q.nx * by, q.y + q.ny * by]);
const every = (at: Sample[], step: number) =>
    at.filter(
        (q, i) => i === 0 || Math.floor(q.s / step) !== Math.floor((at[i - 1]?.s ?? 0) / step),
    );
const band = (
    c: Ctx,
    d: string,
    marker: TokenName,
    width: number,
    opacity: number,
    cap: "round" | "butt" = "round",
) =>
    el(
        "path",
        {
            d,
            fill: "none",
            stroke: c.t[marker],
            "stroke-width": width,
            "stroke-linecap": cap,
            opacity: String(opacity),
        },
        c.p.g,
    );
const rails = (
    c: Ctx,
    at: Sample[],
    by: number,
    stroke: string,
    width: number,
    level: "pencil" | "ruler" = "pencil",
) => {
    if (at.length < 2) return;
    for (const side of [-1, 1])
        c.p.g.appendChild(
            c.p.pen.rc.curve(
                offset(at, side * by),
                c.p.pen.opt(level, {
                    stroke,
                    strokeWidth: width,
                    roughness: level === "ruler" ? 0.3 : 0.6,
                }),
            ),
        );
};
const across = (
    c: Ctx,
    q: Sample,
    half: number,
    stroke: string,
    width: number,
    level: "pencil" | "ruler" = "pencil",
) =>
    c.p.pen.line(
        c.p.g,
        q.x - q.nx * half,
        q.y - q.ny * half,
        q.x + q.nx * half,
        q.y + q.ny * half,
        level,
        { stroke, strokeWidth: width, roughness: 0.5 },
    );

// White is the paper's. A path is a tint of the world's markers, so the only white on the roll is a
// sheet or a label, and the eye goes to the sheet first.
const PATHS: Record<PathKind, Path> = {
    footpath: {
        under: (c, d) => band(c, d, "tang", 46, 0.2),
        tile: (c, at) => {
            if (at.length > 1)
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        at.map((q) => [q.x, q.y] as [number, number]),
                        c.p.pen.opt("pencil", {
                            stroke: c.ink,
                            strokeWidth: 2,
                            strokeLineDash: [18, 20],
                            roughness: 1,
                        }),
                    ),
                );
            for (const q of every(at, 460)) {
                const side = Math.floor(q.s / 460) % 2 ? 1 : -1;
                c.p.pen.ellipse(
                    c.p.g,
                    q.x + q.nx * 34 * side,
                    q.y + q.ny * 34 * side,
                    22,
                    14,
                    "pencil",
                    c.p.pen.fill("card"),
                    { stroke: c.ink, strokeWidth: 1.3 },
                );
            }
        },
    },
    boardwalk: {
        under: (c, d) => band(c, d, "tang", 40, 0.34, "butt"),
        tile: (c, at) => {
            for (const q of every(at, 30)) across(c, q, 19, c.ink, 1.1);
            rails(c, at, 21, c.ink, 1.7);
        },
    },
    rails: {
        tile: (c, at) => {
            for (const q of every(at, 34)) across(c, q, 26, c.ink, 3.4);
            rails(c, at, 15, c.t.ink, 2.2, "ruler");
        },
    },
    stones: {
        tile: (c, at) => {
            // stepping stones across the leaves, a stride apart and a little to one side and the other
            for (const q of every(at, 70)) {
                const side = Math.floor(q.s / 70) % 2 ? 1 : -1;
                c.p.pen.ellipse(
                    c.p.g,
                    q.x + q.nx * 14 * side,
                    q.y + q.ny * 14 * side,
                    38,
                    24,
                    "pencil",
                    c.p.pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
                    { stroke: c.ink, strokeWidth: 1.5 },
                );
            }
        },
    },
    paving: {
        under: (c, d) => band(c, d, "glow", 70, 0.45, "butt"),
        tile: (c, at) => {
            rails(c, at, 36, c.ink, 1.8);
            for (const q of every(at, 44)) {
                // where the path runs across the roll it is a crossing, and a crossing has stripes
                if (Math.abs(q.ny) > 0.8)
                    c.p.pen.rect(
                        c.p.g,
                        q.x - 10,
                        q.y - 30,
                        20,
                        60,
                        "pencil",
                        c.p.pen.fill("glow"),
                        { stroke: c.ink, strokeWidth: 1.1 },
                    );
                else across(c, q, 34, c.ink, 1);
            }
        },
    },
    rug: {
        under: (c, d) => band(c, d, "berry", 64, 0.3, "butt"),
        tile: (c, at) => {
            rails(c, at, 32, c.ink, 1.6);
            rails(c, at, 22, c.t.tang, 3);
            for (const q of every(at, 90)) across(c, q, 14, c.t.berry, 4);
        },
    },
    tape: {
        tile: (c, at) => {
            // floor tape: two lines of yellow and black stripes either side of the way through the room
            if (at.length < 2) return;
            for (const side of [-1, 1]) {
                const pts = offset(at, side * 24);
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        pts,
                        c.p.pen.opt("ruler", { stroke: c.t.glow, strokeWidth: 9, roughness: 0.2 }),
                    ),
                );
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        pts,
                        c.p.pen.opt("ruler", {
                            stroke: c.ink,
                            strokeWidth: 9,
                            strokeLineDash: [12, 18],
                            roughness: 0.2,
                        }),
                    ),
                );
            }
        },
    },
    stars: {
        tile: (c, at) => {
            // a path of stars, joined by a faint dotted line the way a constellation is drawn
            if (at.length > 1)
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        at.map((q) => [q.x, q.y] as [number, number]),
                        c.p.pen.opt("pencil", {
                            stroke: c.ink,
                            strokeWidth: 1.2,
                            strokeLineDash: [4, 14],
                            roughness: 0.6,
                        }),
                    ),
                );
            for (const q of every(at, 110)) {
                const r = Math.floor(q.s / 110) % 3 === 0 ? 16 : 10;
                c.p.pen.polygon(c.p.g, starPoints(q.x, q.y, r), "pencil", c.p.pen.fill("glow"), {
                    stroke: c.ink,
                    strokeWidth: 1.3,
                });
            }
        },
    },
    prints: {
        tile: (c, at) => {
            // bootprints in the snow, a stride apart and left and right of the line the walker took
            for (const q of every(at, 46)) {
                const side = Math.floor(q.s / 46) % 2 ? 1 : -1;
                const x = q.x + q.nx * 13 * side,
                    y = q.y + q.ny * 13 * side,
                    a = Math.atan2(-q.nx, q.ny);
                const oval = (u0: number, rx: number, ry: number): [number, number][] =>
                    Array.from({ length: 10 }, (_, i) => {
                        const t = (i / 10) * Math.PI * 2,
                            u = u0 + Math.cos(t) * ry,
                            v = Math.sin(t) * rx;
                        return [
                            x + u * Math.cos(a) - v * Math.sin(a),
                            y + u * Math.sin(a) + v * Math.cos(a),
                        ];
                    });
                const fill = c.p.pen.fill("ink-soft", "hachure", {
                    hachureGap: 3.5,
                    fillWeight: 0.6,
                });
                c.p.pen.polygon(c.p.g, oval(6, 7, 11), "pencil", fill, {
                    stroke: c.ink,
                    strokeWidth: 1,
                });
                c.p.pen.polygon(c.p.g, oval(-12, 6, 6), "pencil", fill, {
                    stroke: c.ink,
                    strokeWidth: 1,
                });
            }
        },
    },
    buoys: {
        under: (c, d) => band(c, d, "sky", 34, 0.26),
        tile: (c, at) => {
            // a rope across the water, held up by a buoy every so often, each with a little flag
            if (at.length > 1)
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        at.map((q) => [q.x, q.y] as [number, number]),
                        c.p.pen.opt("pencil", {
                            stroke: c.ink,
                            strokeWidth: 1.5,
                            strokeLineDash: [10, 7],
                            roughness: 0.7,
                        }),
                    ),
                );
            // the way is buoyed as a channel is: a can one side and a cone the other, every 300 along,
            // and every fifth of them a bell buoy standing further off on the other side. All three are
            // the shelf's own buoy, which takes the kind and whether it stands in its strip of sea.
            const v = drawingOf("buoy");
            const stand = (q: Sample, off: number, kind: string, seed: number): void => {
                if (!v) return;
                const own = v.params as Record<string, unknown>;
                const out = render(
                    v,
                    { ...own, kind, sea: 0, light: kind === "bell" ? 1 : 0 },
                    { host: c.p.g, seed },
                );
                const w = out.box.w * U,
                    h = out.box.h * U;
                out.svg.setAttribute("x", `${q.x + q.nx * off - w / 2}`);
                out.svg.setAttribute("y", `${q.y + q.ny * off - h}`);
                out.svg.setAttribute("width", `${w}`);
                out.svg.setAttribute("height", `${h}`);
                c.p.g.append(out.svg);
            };
            every(at, 300).forEach((q, i) => {
                stand(q, i % 2 ? 34 : -34, i % 2 ? "can" : "cone", i);
                if (i % 5 === 0) stand(q, i % 2 ? -90 : 90, "bell", 500 + i);
            });
        },
    },
    lanterns: {
        under: (c, d) => band(c, d, "tang", 40, 0.2),
        tile: (c, at) => {
            // stones along the way, and a lantern on a post every so often, lit as far as the child has walked
            for (const q of every(at, 38))
                c.p.pen.ellipse(c.p.g, q.x, q.y, 16, 10, "pencil", c.p.pen.fill("card"), {
                    stroke: c.ink,
                    strokeWidth: 1,
                });
            for (const q of every(at, 380)) {
                const side = Math.floor(q.s / 380) % 2 ? 1 : -1,
                    x = q.x + q.nx * 44 * side,
                    y = q.y + q.ny * 44 * side,
                    lit = q.y < c.walked;
                const g = el("g", { class: lit ? "lamp lit" : "lamp" }, c.p.g);
                if (lit)
                    c.p.pen.circle(
                        g,
                        x,
                        y - 66,
                        70,
                        "pencil",
                        c.p.pen.fill("glow", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
                        { stroke: "none", strokeWidth: 0 },
                    );
                c.p.pen.line(g, x, y, x, y - 50, "pencil", { stroke: c.t.ink, strokeWidth: 3 });
                c.p.pen.rect(
                    g,
                    x - 10,
                    y - 78,
                    20,
                    26,
                    "ruler",
                    lit ? c.p.pen.fill("glow") : c.p.pen.fill("card"),
                    { stroke: c.t.ink, strokeWidth: 1.5 },
                );
                c.p.pen.polygon(
                    g,
                    [
                        [x - 13, y - 78],
                        [x, y - 88],
                        [x + 13, y - 78],
                    ],
                    "pencil",
                    c.p.pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                    { stroke: c.t.ink, strokeWidth: 1.2 },
                );
            }
        },
    },
    track: {
        under: (c, d) => band(c, d, "tang", 92, 0.4, "butt"),
        tile: (c, at) => {
            rails(c, at, 46, c.ink, 1.6);
            for (const by of [-15, 15])
                if (at.length > 1)
                    c.p.g.appendChild(
                        c.p.pen.rc.curve(
                            offset(at, by),
                            c.p.pen.opt("ruler", {
                                stroke: c.ink,
                                strokeWidth: 1.1,
                                roughness: 0.3,
                            }),
                        ),
                    );
        },
    },
    hopscotch: {
        tile: (c, at) => {
            // a hopscotch chalked along the way in two colours of chalk, one to ten and round again
            for (const q of every(at, 64)) {
                const n = Math.floor(q.s / 64),
                    k = n % 11,
                    a = Math.atan2(q.ny, q.nx) + Math.PI / 2,
                    x = q.x,
                    y = q.y;
                const corner = (u: number, v: number): [number, number] => [
                    x + u * Math.cos(a) - v * Math.sin(a),
                    y + u * Math.sin(a) + v * Math.cos(a),
                ];
                const chalk = k % 2 ? c.t.berry : c.t.sky;
                if (k === 10) {
                    c.p.pen.path(
                        c.p.g,
                        `M${corner(-28, -26).join(" ")}L${corner(28, -26).join(" ")}A28 26 0 0 1 ${corner(-28, -26).join(" ")}Z`,
                        "pencil",
                        null,
                        { stroke: chalk, strokeWidth: 2.4 },
                    );
                    continue;
                }
                c.p.pen.polygon(
                    c.p.g,
                    [corner(-28, -28), corner(28, -28), corner(28, 28), corner(-28, 28)],
                    "pencil",
                    null,
                    { stroke: chalk, strokeWidth: 2.4, roughness: 1.1 },
                );
                const t = el(
                    "text",
                    {
                        x,
                        y: y + 9,
                        "text-anchor": "middle",
                        style: `font:700 26px var(--f-hand);fill:${c.ink}`,
                    },
                    c.p.g,
                );
                t.textContent = String(k + 1);
            }
        },
    },
    logs: {
        under: (c, d) => band(c, d, "tang", 52, 0.16, "butt"),
        tile: (c, at) => {
            // a corduroy of logs laid across the wet ground, their cut ends showing their rings
            for (const q of every(at, 24)) {
                across(c, q, 26, c.t.tang, 9);
                for (const sd of [-1, 1]) {
                    const x = q.x + q.nx * 28 * sd,
                        y = q.y + q.ny * 28 * sd;
                    c.p.pen.circle(c.p.g, x, y, 11, "pencil", c.p.pen.fill("card"), {
                        stroke: c.ink,
                        strokeWidth: 0.9,
                    });
                }
            }
        },
    },
    staff: {
        under: (c, d) => band(c, d, "berry", 50, 0.12, "butt"),
        tile: (c, at) => {
            // the path is a staff: five lines winding through the park, with a scale going up and down on it
            if (at.length < 2) return;
            for (const by of [-16, -8, 0, 8, 16])
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        offset(at, by),
                        c.p.pen.opt("ruler", { stroke: c.ink, strokeWidth: 1, roughness: 0.25 }),
                    ),
                );
            for (const q of every(at, 90)) {
                const n = Math.floor(q.s / 90),
                    step = n % 16,
                    rung = step < 8 ? step : 15 - step;
                if (n % 8 === 0) {
                    across(c, q, 16, c.ink, 1.4, "ruler");
                    continue;
                }
                const by = 20 - rung * 4,
                    x = q.x + q.nx * by,
                    y = q.y + q.ny * by;
                c.p.pen.ellipse(
                    c.p.g,
                    x,
                    y,
                    12,
                    9,
                    "pencil",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { stroke: c.ink, strokeWidth: 0.8 },
                );
                c.p.pen.line(c.p.g, x + 6, y, x + 6 - q.nx * 26, y - q.ny * 26, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1.2,
                });
            }
        },
    },
    bricks: {
        under: (c, d) => band(c, d, "tang", 62, 0.3, "butt"),
        tile: (c, at) => {
            // herringbone brick, the towpath's own
            rails(c, at, 31, c.ink, 1.5);
            for (const q of every(at, 16)) {
                const n = Math.floor(q.s / 16),
                    sd = n % 2 ? 1 : -1,
                    tx = -q.ny,
                    ty = q.nx;
                for (const off of [-16, 8]) {
                    const x0 = q.x + q.nx * off,
                        y0 = q.y + q.ny * off;
                    c.p.pen.line(
                        c.p.g,
                        x0,
                        y0,
                        x0 + (q.nx * 8 + tx * 8 * sd),
                        y0 + (q.ny * 8 + ty * 8 * sd),
                        "pencil",
                        { stroke: c.ink, strokeWidth: 0.9, roughness: 0.4 },
                    );
                }
            }
        },
    },
    skates: {
        tile: (c, at) => {
            // two skates' tracks, crossing and crossing again, with a figure of eight now and then
            if (at.length < 2) return;
            for (const [amp, per, ph] of [
                [22, 260, 0],
                [18, 330, 1.7],
            ] as const) {
                const pts = at.map((q) => {
                    const o = amp * Math.sin((q.s / per) * Math.PI * 2 + ph);
                    return [q.x + q.nx * o, q.y + q.ny * o] as [number, number];
                });
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        pts,
                        c.p.pen.opt("pencil", { stroke: c.ink, strokeWidth: 1.3, roughness: 0.5 }),
                    ),
                );
            }
            for (const q of every(at, 700))
                for (const sd of [-1, 1])
                    c.p.pen.ellipse(
                        c.p.g,
                        q.x + q.nx * 30 * sd,
                        q.y + q.ny * 30 * sd,
                        70,
                        36,
                        "pencil",
                        null,
                        { stroke: c.t.sky, strokeWidth: 1.4 },
                    );
        },
    },
    ruts: {
        under: (c, d) => band(c, d, "tang", 60, 0.2, "butt"),
        tile: (c, at) => {
            // a farm track: two wheel ruts with the grass growing between them
            if (at.length < 2) return;
            for (const sd of [-1, 1])
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        offset(at, sd * 18),
                        c.p.pen.opt("pencil", { stroke: c.t.tang, strokeWidth: 7, roughness: 0.8 }),
                    ),
                );
            rails(c, at, 25, c.ink, 1);
            for (const q of every(at, 46)) tuft(c, q.x, q.y + 8, 0.45, c.p.g);
        },
    },
    flags: {
        tile: (c, at) => {
            // old flagstones, laid long ago and worn uneven, with moss between them
            for (const q of every(at, 46)) {
                const n = Math.floor(q.s / 46),
                    sd = n % 2 ? 1 : -1,
                    cx = q.x + q.nx * 10 * sd,
                    cy = q.y + q.ny * 10 * sd,
                    r = rand(hash(`flag${n}`));
                const pts: [number, number][] = [];
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2 + r() * 0.4,
                        rr = 20 + r() * 8;
                    pts.push([cx + Math.cos(a) * rr * 1.2, cy + Math.sin(a) * rr]);
                }
                c.p.pen.polygon(
                    c.p.g,
                    pts,
                    "pencil",
                    c.p.pen.fill("ink-soft", "hachure", { hachureGap: 7, fillWeight: 0.35 }),
                    { stroke: c.ink, strokeWidth: 1.2 },
                );
                if (r() < 0.4)
                    c.p.pen.circle(c.p.g, cx + 24 * sd, cy + 6, 7, "pencil", c.p.pen.fill("mint"), {
                        stroke: "none",
                        strokeWidth: 0,
                    });
            }
        },
    },
    tilework: {
        under: (c, d) => band(c, d, "sky", 58, 0.16, "butt"),
        tile: (c, at) => {
            // blue and white tiles, each with the same flower on it, turned with the way
            for (const q of every(at, 50)) {
                const a = Math.atan2(q.ny, q.nx) + Math.PI / 2,
                    x = q.x,
                    y = q.y;
                const pt = (u: number, v: number): [number, number] => [
                    x + u * Math.cos(a) - v * Math.sin(a),
                    y + u * Math.sin(a) + v * Math.cos(a),
                ];
                c.p.pen.polygon(
                    c.p.g,
                    [pt(-23, -23), pt(23, -23), pt(23, 23), pt(-23, 23)],
                    "ruler",
                    null,
                    { stroke: c.ink, strokeWidth: 1.1 },
                );
                c.p.pen.polygon(
                    c.p.g,
                    [pt(0, -15), pt(15, 0), pt(0, 15), pt(-15, 0)],
                    "pencil",
                    c.p.pen.fill("sky"),
                    { stroke: c.ink, strokeWidth: 0.8 },
                );
                c.p.pen.circle(c.p.g, x, y, 8, "pencil", c.p.pen.fill("card"), {
                    stroke: c.ink,
                    strokeWidth: 0.7,
                });
            }
        },
    },
    dabs: {
        tile: (c, at) => {
            // a brush's dabs, one colour after another round the palette, as if someone walked here painting
            const cycle: TokenName[] = ["berry", "tang", "glow", "mint", "sky"];
            for (const q of every(at, 36)) {
                const n = Math.floor(q.s / 36),
                    sd = n % 2 ? 1 : -1,
                    tx = -q.ny,
                    ty = q.nx,
                    x = q.x + q.nx * 12 * sd,
                    y = q.y + q.ny * 12 * sd;
                el(
                    "path",
                    {
                        d: `M${x - tx * 14} ${y - ty * 14}Q${x + q.nx * 6} ${y + q.ny * 6} ${x + tx * 14} ${y + ty * 14}`,
                        fill: "none",
                        stroke: c.t[cycle[n % 5] ?? "berry"],
                        "stroke-width": 15,
                        "stroke-linecap": "round",
                        opacity: "0.75",
                    },
                    c.p.g,
                );
            }
        },
    },
    cairns: {
        tile: (c, at) => {
            // the way over the cliff top is marked by cairns, small stacks of stones, with a faint line between
            if (at.length > 1)
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        at.map((q) => [q.x, q.y] as [number, number]),
                        c.p.pen.opt("pencil", {
                            stroke: c.ink,
                            strokeWidth: 1.2,
                            strokeLineDash: [5, 16],
                            roughness: 0.6,
                        }),
                    ),
                );
            for (const q of every(at, 230)) {
                const n = Math.floor(q.s / 230),
                    sd = n % 2 ? 1 : -1,
                    x = q.x + q.nx * 40 * sd,
                    y = q.y + q.ny * 40 * sd;
                (
                    [
                        [34, 18],
                        [26, 15],
                        [18, 12],
                        [10, 9],
                    ] as const
                ).forEach(([w, h], i) => {
                    c.p.pen.ellipse(
                        c.p.g,
                        x + (i % 2 ? 2 : -2),
                        y - i * 13,
                        w,
                        h,
                        "pencil",
                        c.p.pen.fill(i === 3 ? "card" : "ink-soft", "hachure", {
                            hachureGap: 4,
                            fillWeight: 0.5,
                        }),
                        { stroke: c.ink, strokeWidth: 1.1 },
                    );
                });
            }
        },
    },
    mosaic: {
        under: (c, d) => band(c, d, "glow", 66, 0.26, "butt"),
        tile: (c, at) => {
            // a mosaic: a border of small squares either side in three colours, and a key pattern down the middle
            if (at.length < 2) return;
            const cols: TokenName[] = ["tang", "berry", "glow"];
            for (const q of every(at, 14)) {
                const n = Math.floor(q.s / 14);
                for (const sd of [-1, 1])
                    c.p.pen.rect(
                        c.p.g,
                        q.x + q.nx * 26 * sd - 5,
                        q.y + q.ny * 26 * sd - 5,
                        10,
                        10,
                        "ruler",
                        c.p.pen.fill(cols[(n + (sd > 0 ? 1 : 0)) % 3] ?? "tang"),
                        { stroke: c.ink, strokeWidth: 0.5 },
                    );
            }
            const key = at.map((q) => {
                const step = Math.floor(q.s / 20) % 4,
                    o = step < 2 ? 9 : -9;
                return [q.x + q.nx * o, q.y + q.ny * o] as [number, number];
            });
            c.p.g.appendChild(
                c.p.pen.rc.linearPath(
                    key,
                    c.p.pen.opt("ruler", { stroke: c.ink, strokeWidth: 1.4, roughness: 0.3 }),
                ),
            );
        },
    },
    shellway: {
        under: (c, d) => band(c, d, "glow", 56, 0.3),
        tile: (c, at) => {
            // shells laid either side of a sandy way across the reef
            for (const q of every(at, 42)) {
                const n = Math.floor(q.s / 42),
                    sd = n % 2 ? 1 : -1,
                    x = q.x + q.nx * 34 * sd,
                    y = q.y + q.ny * 34 * sd;
                if (n % 3 === 0)
                    c.p.pen.ellipse(c.p.g, x, y, 16, 11, "pencil", c.p.pen.fill("berry"), {
                        stroke: c.ink,
                        strokeWidth: 1,
                    });
                else shell(c, x, y + 6, 0.9, n % 3 === 1 ? "card" : "tang", c.p.g);
            }
        },
    },
    arrows: {
        under: (c, d) => band(c, d, "sky", 46, 0.14),
        tile: (c, at) => {
            // arrows chalked on the cave floor, pointing on the way the child is going
            for (const q of every(at, 84)) {
                const ux = q.ny,
                    uy = -q.nx,
                    P = (u: number, v: number): [number, number] => [
                        q.x + u * ux + v * q.nx,
                        q.y + u * uy + v * q.ny,
                    ];
                c.p.pen.polygon(
                    c.p.g,
                    [P(-18, -5), P(4, -5), P(4, -12), P(20, 0), P(4, 12), P(4, 5), P(-18, 5)],
                    "pencil",
                    c.p.pen.fill("glow"),
                    { stroke: c.ink, strokeWidth: 1.3 },
                );
            }
        },
    },
    puffs: {
        under: (c, d) => band(c, d, "sky", 40, 0.12),
        tile: (c, at) => {
            // stepping clouds a stride apart
            for (const q of every(at, 76)) {
                const sd = Math.floor(q.s / 76) % 2 ? 1 : -1;
                puff(c, q.x + q.nx * 10 * sd, q.y + q.ny * 10 * sd, 0.85, c.p.g);
            }
        },
    },
    tracks: {
        under: (c, d) => band(c, d, "tang", 44, 0.14),
        tile: (c, at) => {
            // a camel's prints in the sand: each foot two broad toes side by side, left and right of the line
            for (const q of every(at, 42)) {
                const sd = Math.floor(q.s / 42) % 2 ? 1 : -1,
                    x = q.x + q.nx * 16 * sd,
                    y = q.y + q.ny * 16 * sd,
                    rot = Math.atan2(-q.nx, q.ny);
                const fill = c.p.pen.fill("tang", "hachure", { hachureGap: 3, fillWeight: 0.6 });
                for (const d of [-1, 1])
                    c.p.pen.polygon(
                        c.p.g,
                        oval(x + q.nx * 6 * d, y + q.ny * 6 * d, 9, 5.5, rot),
                        "pencil",
                        fill,
                        { stroke: c.ink, strokeWidth: 1 },
                    );
            }
        },
    },
    trackway: {
        tile: (c, at) => {
            // a dinosaur's footprints pressed into the rock, left and right of the line it walked, a long stride apart
            for (const q of every(at, 96)) {
                const sd = Math.floor(q.s / 96) % 2 ? 1 : -1,
                    x = q.x + q.nx * 22 * sd,
                    y = q.y + q.ny * 22 * sd,
                    a = Math.atan2(-q.nx, q.ny) - sd * 0.08;
                c.p.pen.polygon(
                    c.p.g,
                    threeToed(x, y, a),
                    "pencil",
                    c.p.pen.fill("tang", "hachure", { hachureGap: 3.2, fillWeight: 0.6 }),
                    { stroke: c.ink, strokeWidth: 1.2, preserveVertices: true },
                );
            }
        },
    },
    anttrail: {
        under: (c, d) => band(c, d, "tang", 30, 0.18),
        tile: (c, at) => {
            // the ants' way through the litter: crumbs they have dropped, and now and then an ant carrying on
            const cols: TokenName[] = ["glow", "card", "tang"];
            for (const q of every(at, 16)) {
                const n = Math.floor(q.s / 16),
                    w = Math.sin(n * 1.3) * 9;
                el(
                    "circle",
                    {
                        cx: q.x + q.nx * w,
                        cy: q.y + q.ny * w,
                        r: 2.4 + (n % 3),
                        fill: c.t[cols[n % 3] ?? "glow"],
                        stroke: c.ink,
                        "stroke-width": 0.7,
                    },
                    c.p.g,
                );
            }
            for (const q of every(at, 230)) ant(c, q.x + q.nx * 22, q.y + q.ny * 22, q.ny, -q.nx);
        },
    },

    // the islands in the seas and the southern shore
    cards: {
        under: (c, d) => band(c, d, "sky", 50, 0.14),
        tile: (c, at) => {
            // a program of arrow cards set in the rock: forward, forward, forward, turn
            for (const q of every(at, 90)) {
                const n = Math.floor(q.s / 90),
                    ux = q.ny,
                    uy = -q.nx,
                    P = (u: number, v: number): [number, number] => [
                        q.x + u * ux + v * q.nx,
                        q.y + u * uy + v * q.ny,
                    ];
                const g = el("g", {}, c.p.g),
                    turn = n % 4 === 3 ? (n % 8 === 3 ? 1 : -1) : 0;
                c.p.pen.polygon(
                    g,
                    [P(-26, -26), P(26, -26), P(26, 26), P(-26, 26)],
                    "pencil",
                    c.p.pen.fill("card"),
                    { stroke: c.ink, strokeWidth: 1.4, preserveVertices: true },
                );
                if (!turn)
                    c.p.pen.polygon(
                        g,
                        [P(-14, -4), P(4, -4), P(4, -11), P(16, 0), P(4, 11), P(4, 4), P(-14, 4)],
                        "pencil",
                        c.p.pen.fill("glow"),
                        { stroke: c.ink, strokeWidth: 1.1 },
                    );
                else
                    c.p.pen.curve(
                        g,
                        [P(-12, 8 * turn), P(2, 6 * turn), P(8, -4 * turn), P(8, -14 * turn)],
                        "pencil",
                        { stroke: c.ink, strokeWidth: 2.4 },
                    );
            }
        },
    },
    cogs: {
        under: (c, d) => band(c, d, "tang", 44, 0.16),
        tile: (c, at) => {
            for (const q of every(at, 80)) {
                const n = Math.floor(q.s / 80),
                    sd = n % 2 ? 1 : -1;
                cog(
                    c,
                    q.x + q.nx * 14 * sd,
                    q.y + q.ny * 14 * sd,
                    26,
                    n % 3 === 0 ? "glow" : "tang",
                    c.p.g,
                );
            }
        },
    },
    letters: {
        under: (c, d) => band(c, d, "glow", 40, 0.18),
        tile: (c, at) => {
            // stepping stones lettered from A to Z along the way, and then from A again
            for (const q of every(at, 84)) {
                const n = Math.floor(q.s / 84),
                    sd = n % 2 ? 1 : -1,
                    x = q.x + q.nx * 12 * sd,
                    y = q.y + q.ny * 12 * sd;
                c.p.pen.ellipse(c.p.g, x, y, 56, 36, "pencil", c.p.pen.fill("card"), {
                    stroke: c.ink,
                    strokeWidth: 1.4,
                });
                el(
                    "text",
                    {
                        x,
                        y: y + 8,
                        "text-anchor": "middle",
                        style: `font:700 22px var(--f-hand);fill:${c.ink}`,
                    },
                    c.p.g,
                ).textContent = String.fromCharCode(65 + (n % 26));
            }
        },
    },
    type: {
        under: (c, d) => band(c, d, "sky", 36, 0.16, "butt"),
        tile: (c, at) => {
            for (const q of every(at, 46))
                typeBlock(c, q.x, q.y, rand(Math.floor(q.s / 46) + 7), c.p.g);
        },
    },
    stamps: {
        under: (c, d) => band(c, d, "berry", 40, 0.12),
        tile: (c, at) => {
            // postage stamps along the wet quay, a little askew, each with its perforated edge and a picture
            const cols: TokenName[] = ["sky", "berry", "mint", "glow"];
            for (const q of every(at, 110)) {
                const n = Math.floor(q.s / 110),
                    sd = n % 2 ? 1 : -1,
                    x = q.x + q.nx * 16 * sd,
                    y = q.y + q.ny * 16 * sd;
                const g = el(
                    "g",
                    { transform: `rotate(${sd * 8} ${Math.round(x)} ${Math.round(y)})` },
                    c.p.g,
                );
                c.p.pen.rect(g, x - 26, y - 32, 52, 64, "pencil", c.p.pen.fill("card"), {
                    stroke: c.ink,
                    strokeWidth: 1.2,
                    strokeLineDash: [4, 3],
                });
                c.p.pen.rect(
                    g,
                    x - 18,
                    y - 24,
                    36,
                    40,
                    "pencil",
                    c.p.pen.fill(cols[n % 4] ?? "sky"),
                    { stroke: c.ink, strokeWidth: 1 },
                );
                c.p.pen.line(g, x - 12, y + 24, x + 12, y + 24, "pencil", {
                    stroke: c.ink,
                    strokeWidth: 1,
                });
            }
        },
    },
    fence: {
        under: (c, d) => band(c, d, "tang", 34, 0.14),
        tile: (c, at) => {
            // a worn track with a post-and-wire fence along one side, leaning a little from the wind
            if (at.length > 1)
                c.p.g.appendChild(
                    c.p.pen.rc.curve(
                        offset(at, 44).map(([x, y]): [number, number] => [x, y - 24]),
                        c.p.pen.opt("pencil", { stroke: c.ink, strokeWidth: 1.1, roughness: 0.8 }),
                    ),
                );
            for (const q of every(at, 130))
                c.p.pen.line(
                    c.p.g,
                    q.x + q.nx * 44,
                    q.y + q.ny * 44 + 10,
                    q.x + q.nx * 44 + 4,
                    q.y + q.ny * 44 - 34,
                    "pencil",
                    { stroke: c.ink, strokeWidth: 3 },
                );
        },
    },
    walkway: {
        tile: (c, at) => {
            // planks with gaps between them, strung on ropes either side, with a post now and then
            for (const q of every(at, 26)) across(c, q, 24, c.t.tang, 8);
            rails(c, at, 30, c.ink, 1.4);
            for (const q of every(at, 180))
                for (const sd of [-1, 1])
                    c.p.pen.line(
                        c.p.g,
                        q.x + q.nx * 30 * sd,
                        q.y + q.ny * 30 * sd,
                        q.x + q.nx * 30 * sd,
                        q.y + q.ny * 30 * sd - 40,
                        "pencil",
                        { stroke: c.ink, strokeWidth: 2.4 },
                    );
        },
    },
    heaps: {
        under: (c, d) => band(c, d, "card", 40, 0.5),
        tile: (c, at) => {
            for (const q of every(at, 96)) {
                const sd = Math.floor(q.s / 96) % 2 ? 1 : -1;
                saltHeap(c, q.x + q.nx * 40 * sd, q.y + q.ny * 40 * sd + 10, 0.8, c.p.g);
            }
        },
    },
    planks: {
        tile: (c, at) => {
            // long planks laid end to end over the warm ground, two side by side, nailed at their ends
            if (at.length > 1)
                for (const side of [-1, 1])
                    c.p.g.appendChild(
                        c.p.pen.rc.curve(
                            offset(at, side * 14),
                            c.p.pen.opt("pencil", {
                                stroke: c.t.tang,
                                strokeWidth: 20,
                                roughness: 0.4,
                            }),
                        ),
                    );
            rails(c, at, 26, c.ink, 1.2);
            for (const q of every(at, 150)) {
                across(c, q, 26, c.ink, 1.2);
                for (const sd of [-1, 1])
                    c.p.pen.circle(
                        c.p.g,
                        q.x + q.nx * 14 * sd,
                        q.y + q.ny * 14 * sd,
                        4,
                        "ruler",
                        c.p.pen.fill("ink"),
                        { stroke: "none" },
                    );
            }
        },
    },
};

/** The layers a flowing water's marks are shared among; world.css staggers them by a quarter of the flow each. */
const CURRENTS = 4;

export interface Painted {
    frame?(camera: Camera, size: Size): void;
    els: Element[];
    pieces: Piece[];
}

/**
 * A world's stretch. The washes and anything cheap are painted now; the horizon and each tile of
 * the ground below it are returned as pieces, painted when the camera comes near them.
 */
export function paintStretch(
    view: WorldView,
    i: number,
    t: Tokens,
    host: Element,
    into: Element,
    o: {
        walked?: number;
        finished?: boolean;
        label?: string;
        /** The group what is placed plays its declared motion on, in a world whose drawings move. */
        play?: Group | null;
        /** Whether the guides idle and boil; the world's own motion unless the page says. */
        motion?: boolean;
    } = {},
): Painted {
    const s = view.layout.stretches[i],
        above = view.stretches[i],
        l = view.layout,
        art = view.art;
    if (!s || !above) return { els: [], pieces: [] };
    const picture = pictureIn(view, s.world);
    // what is placed plays on the page's group where the world's drawings move
    const play = picture.motion ? (o.play ?? null) : null;
    const world: WorldPicture = o.motion === undefined ? picture : { ...picture, motion: o.motion };
    const trail = l.path[i] ?? { d: "", samples: [] };
    const pathD = trail.d,
        samples = trail.samples;
    const seed = hash(`${world.id}-${s.term}`);
    const wash = washOf(world);
    const H = s.horizon,
        line = s.line;
    // The washes run past the world's edges and fade into the plain squared paper, so the world reads
    // as painted down the middle of the roll rather than cut out and laid on it.
    const X0 = l.x0 - BLEED,
        X1 = l.x1 + BLEED;
    const bottom = s.ground.y + s.ground.h;
    const area: Rect = { x: X0, y: H.y, w: X1 - X0, h: bottom - H.y };
    const p = pad(area, seed, t, `j-ground${s.ahead ? " ahead" : ""}`);
    into.append(p.svg);
    const id = `${world.id}-${s.term}`;
    const defs = el("defs", {}, p.svg);
    const fade = el(
        "linearGradient",
        { id: `fg-${id}`, gradientUnits: "userSpaceOnUse", x1: X0, y1: 0, x2: X1, y2: 0 },
        defs,
    );
    for (const [o, a] of [
        [0, 0],
        [FADE, 1],
        [1 - FADE, 1],
        [1, 0],
    ] as const)
        el("stop", { offset: String(o), "stop-color": "#fff", "stop-opacity": String(a) }, fade);
    const mask = el(
        "mask",
        {
            id: `fm-${id}`,
            maskUnits: "userSpaceOnUse",
            x: X0,
            y: area.y,
            width: area.w,
            height: area.h,
        },
        defs,
    );
    el("rect", { x: X0, y: area.y, width: area.w, height: area.h, fill: `url(#fg-${id})` }, mask);
    // and top and bottom, so one world's ground runs out into the next one's sky rather than stopping
    // at a ruled line: leaving the meadow is walking out of it, not turning a page
    const ends = el(
        "linearGradient",
        {
            id: `fv-${id}`,
            gradientUnits: "userSpaceOnUse",
            x1: 0,
            y1: area.y,
            x2: 0,
            y2: area.y + area.h,
        },
        defs,
    );
    const top = Math.min(0.1, 160 / area.h),
        foot = Math.min(0.3, 460 / area.h);
    for (const [o, a] of [
        [0, 0],
        [top, 1],
        [1 - foot, 1],
        [1, 0],
    ] as const)
        el("stop", { offset: String(o), "stop-color": "#fff", "stop-opacity": String(a) }, ends);
    const vmask = el(
        "mask",
        {
            id: `fvm-${id}`,
            maskUnits: "userSpaceOnUse",
            x: X0,
            y: area.y,
            width: area.w,
            height: area.h,
        },
        defs,
    );
    el("rect", { x: X0, y: area.y, width: area.w, height: area.h, fill: `url(#fv-${id})` }, vmask);
    const washes = el("g", { mask: `url(#fvm-${id})` }, el("g", { mask: `url(#fm-${id})` }, p.g));
    const strong = Math.min(LIMITS.washCap, wash * 1.3);

    // The sky, or the wall of a room: strongest at the top and gone by the horizon outdoors, one flat
    // colour indoors. A dusk or a night runs from one marker at the top to another at the horizon. A
    // deep sky is the sky palette's own gradient instead, laid almost solid, and only above the line:
    // it stops at the horizon, where the ground takes over at the cap, and nothing is written on it
    // but the world's name, in the light ink that goes with it.
    const deep = world.light.deep && !world.indoor ? SKIES[world.light.deep] : null;
    const sky = el("linearGradient", { id: `sky-${id}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    if (deep) {
        for (const [o, col] of deep.stops)
            el(
                "stop",
                { offset: String(o), "stop-color": col, "stop-opacity": String(SKY_OPACITY) },
                sky,
            );
    } else {
        const low = world.light.low ?? world.light.sky;
        el(
            "stop",
            {
                offset: "0",
                "stop-color": t[world.light.sky],
                "stop-opacity": String(world.indoor ? wash : strong),
            },
            sky,
        );
        el(
            "stop",
            {
                offset: "1",
                "stop-color": t[low],
                "stop-opacity": String(world.indoor ? wash : world.light.low ? strong : wash * 0.2),
            },
            sky,
        );
    }
    el(
        "rect",
        { x: X0, y: H.y, width: X1 - X0, height: line - H.y, fill: `url(#sky-${id})` },
        washes,
    );
    // The ground, one wash from the horizon line to the end of the stretch. A shore is sand down the
    // middle with the water either side of it, which is the ground's own gradient rather than a shape.
    let groundFill = t[world.light.ground];
    if (world.ground === "shore") {
        const sand = el(
            "linearGradient",
            { id: `sand-${id}`, gradientUnits: "userSpaceOnUse", x1: X0, y1: 0, x2: X1, y2: 0 },
            defs,
        );
        for (const [o, c] of [
            [0, t.sky],
            [SEA, t.sky],
            [SAND, t[world.light.ground]],
            [1 - SAND, t[world.light.ground]],
            [1 - SEA, t.sky],
            [1, t.sky],
        ] as const)
            el("stop", { offset: String(o), "stop-color": c }, sand);
        groundFill = `url(#sand-${id})`;
    }
    el(
        "rect",
        {
            x: X0,
            y: line,
            width: X1 - X0,
            height: bottom - line,
            fill: groundFill,
            opacity: String(wash),
        },
        washes,
    );

    const texture = el("g", { class: "tex" }, p.g);
    let tileKey = id;
    const c: Ctx = {
        p,
        world,
        t,
        l,
        s,
        art,
        label: above.label,
        line,
        origin: 0,
        X0,
        X1,
        wash,
        ink: t["ink-soft"],
        skyInk: deep ? deep.soft : t["ink-soft"],
        washes,
        texture,
        host,
        walked: o.walked ?? Infinity,
        water: world.motion
            ? (r) =>
                  Array.from({ length: CURRENTS }, (_, i) => {
                      const wp = pad(r, hash(`${tileKey}-water-${i}`), t, "j-water");
                      wp.svg.style.setProperty("--i", String(i));
                      into.append(wp.svg);
                      return wp.g;
                  })
            : undefined,
        spot: (r, rnd, reach = 0) => {
            const y0 = Math.max(r.y, line + 80),
                y1 = Math.min(r.y + r.h, bottom - 30);
            if (y1 <= y0) return null;
            for (let k = 0; k < 12; k++) {
                const x = l.x0 - reach + 30 + rnd() * (l.x1 - l.x0 + reach * 2 - 60),
                    y = y0 + rnd() * (y1 - y0);
                if (!inColumn(l, x - 40, 80)) return { x, y };
            }
            return null;
        },
    };
    const ground = GROUNDS[world.ground],
        path = PATHS[world.path];
    ground.eager?.(c);
    if (!world.indoor)
        c.p.pen.line(
            washes,
            X0,
            world.ground === "shore" ? line - 10 : line,
            X1,
            world.ground === "shore" ? line - 10 : line,
            "pencil",
            { stroke: c.ink, strokeWidth: 2.2, roughness: 1.4 },
        );
    path.under?.(c, pathD);

    const pieces: Piece[] = [];
    pieces.push({
        rect: H,
        paint: () => {
            const r = rand(seed + 1);
            if (world.indoor) cupboardDoors(c);
            ground.horizon?.(c, r);
            const els = horizonRow(world, above, art, H, line, host, seed, play);
            if (!world.indoor) weather(c, H, r);
            els.push(
                ...arrival(
                    s,
                    world,
                    above,
                    art,
                    host,
                    seed,
                    !!o.finished,
                    o.label ?? above.caption,
                    play,
                ),
            );
            return els;
        },
    });
    // Texture tiles start again at each day, so preceding paper cannot shift their pattern.
    const starts = [
        { y: line, key: "horizon" },
        ...l.rows
            .filter((row) => row.world === s.world && row.day.term === s.term)
            .map((row) => ({ y: row.rect.y, key: row.day.id })),
    ];
    for (const [part, start] of starts.entries()) {
        const end = starts[part + 1]?.y ?? bottom;
        for (let ty = start.y; ty < end; ty += TILE) {
            const rect: Rect = { x: X0, y: ty, w: X1 - X0, h: Math.min(TILE, end - ty) };
            const key = `${id}-${start.key}-${ty - start.y}`;
            pieces.push({
                rect,
                key,
                origin: start.y,
                paint: () => {
                    ground.tile(c, rect, rand(hash(key)));
                    path.tile(
                        c,
                        samples.filter((q) => q.y >= ty - 30 && q.y <= ty + rect.h + 30),
                    );
                    if (world.weather === "snow" && !world.indoor)
                        flakes(c, rect, rand(hash(`${key}-snow`)));
                    if (world.weather === "dew" && !world.indoor)
                        dewOn(c, rect, rand(hash(`${key}-dew`)));
                    return [];
                },
            });
        }
    }
    const owned = pieces.map((piece, index): Piece => {
        let added: Element[] = [];
        return {
            rect: piece.rect,
            paint() {
                const parents = [into, p.svg, ...p.svg.querySelectorAll("g")];
                const before = new Map(parents.map((parent) => [parent, new Set(parent.children)]));
                c.origin = piece.origin ?? 0;
                tileKey = piece.key ?? `${id}-piece-${index}`;
                p.pen = new Pen(p.svg, {
                    seed: hash(tileKey),
                    t,
                    paper: false,
                    roughness: 1,
                });
                const elements = piece.paint();
                added = parents.flatMap((parent) =>
                    [...parent.children].filter((child) => !before.get(parent)?.has(child)),
                );
                return elements;
            },
            release() {
                releaseScenery(added);
                added = [];
            },
        };
    });
    return { els: [], pieces: owned, frame: mapSurface(p.svg, area).frame };
}

/** The far row and the sky: the world's horizon drawings where its data puts them. */
function horizonRow(
    world: WorldPicture,
    sky: StretchView,
    art: Record<string, ArtRef>,
    H: Rect,
    line: number,
    host: Element,
    seed: number,
    play: Group | null,
): Element[] {
    const els: Element[] = [];
    // on a deep sky, drawings in pencil would vanish into it, so what stands against it has a light edge
    const dark = world.light.deep && !world.indoor ? " deep" : "";
    // the sky first, so what stands on the horizon stands in front of a rising moon
    sky.sky.forEach((f, i) => {
        if (f.weather) return;
        const sz = artSize(art[f.art]);
        const a = placeArt(art[f.art], f.box.x + (f.box.w - sz.w) / 2, f.box.y, host, {
            seed: seed + 97 + i,
            cls: `far sky${dark}`,
            play,
        });
        if (!a) return;
        if (f.k !== 1) {
            a.style.transform = `scale(${f.k})`;
            a.style.transformOrigin = "50% 0";
        }
        els.push(a);
    });
    world.horizon.far.forEach((f, i) => {
        const sz = artSize(art[f.art], f.params),
            k = f.k ?? 1;
        const x = H.x + H.w * f.at - sz.w / 2,
            y = line - sz.h + (f.sink ?? 8);
        const params = f.art === "window" ? { outside: world.weather } : f.params;
        const a = placeArt(art[f.art], x, y, host, {
            seed: seed + i * 31,
            flip: f.flip,
            cls: `far${dark}`,
            play,
            season: world.seasons[0],
            params,
        });
        if (!a) return;
        if (k !== 1) {
            a.style.transform = `scale(${k})`;
            a.style.transformOrigin = "50% 100%";
        }
        els.push(a);
        // still water doubles what stands at its edge: the same drawing upside down and faint under the line
        if (world.ground === "reeds" && (f.sink ?? 8) >= 0) {
            const m = placeArt(art[f.art], x, y, host, {
                seed: seed + i * 31,
                flip: f.flip,
                cls: "far reflect",
                season: world.seasons[0],
                params,
            });
            if (m) {
                m.style.transform = `scale(${k}, ${-k * 0.7})`;
                m.style.transformOrigin = "50% 100%";
                els.push(m);
            }
        }
    });
    // what the weather brings, in front of the far row and moving as the world's own drawings do: a kite on a breezy day
    for (const f of sky.sky) {
        if (!f.weather) continue;
        const a = placeArt(art[f.art], f.box.x, f.box.y, host, {
            seed: 991,
            cls: "far",
            play,
        });
        if (a) els.push(a);
    }
    return els;
}

/** The world's name on its sky, the gate, and the guide there saying where you are. */
function arrival(
    s: Stretch,
    world: WorldPicture,
    sky: StretchView,
    art: Record<string, ArtRef>,
    host: Element,
    seed: number,
    finished: boolean,
    label: string | undefined,
    play: Group | null,
): Element[] {
    const els: Element[] = [];
    const name = document.createElement("div");
    const deep = world.light.deep && !world.indoor ? SKIES[world.light.deep] : null;
    // On a deep sky the name is written in the sky's light ink. A world not reached yet is drawn faded,
    // which leaves its sky neither dark nor light, so there the name is written on a patch of paper.
    name.className = `j-name${s.ahead ? " ahead" : ""}${deep ? (s.ahead ? " patch" : " on-deep") : ""}`;
    if (deep && !s.ahead) {
        name.style.setProperty("--sky-ink", deep.ink);
        name.style.setProperty("--sky-soft", deep.soft);
    }
    const nb = sky.label;
    name.style.left = `${nb.x}px`;
    name.style.top = `${nb.y}px`;
    name.style.setProperty("--nmax", nb.k.toFixed(3));
    const term = document.createElement("span"),
        who = document.createElement("span");
    term.className = "term";
    term.textContent = label ?? `Term ${s.term}`;
    who.className = "w hand";
    who.textContent = world.name;
    name.replaceChildren(term, who);
    els.push(name);
    // a gate the world's moment happens to (a lamp that lights) waits in its before state until then
    const m = world.chapter.moment,
        gateParams = m.art === world.horizon.gate ? (finished ? m.params : m.before) : undefined;
    const gs = artSize(art[world.horizon.gate], gateParams);
    const gate = placeArt(
        art[world.horizon.gate],
        s.start.x - gs.w - 60,
        s.start.y - gs.h + 40,
        host,
        {
            seed: seed + 7,
            params: gateParams,
            play,
            cls: `gate${deep && s.start.y - gs.h + 40 < s.line ? " deep" : ""}`,
        },
    );
    if (gate) els.push(gate);
    if (!s.ahead) {
        const greet = document.createElement("div");
        greet.className = "j-greet";
        greet.style.left = `${sky.greet.x}px`;
        greet.style.top = `${sky.greet.y}px`;
        const who = document.createElement("div");
        who.className = "who";
        who.append(guideOf(world, "cheer", 150, host));
        const say = document.createElement("p");
        say.className = "say hand";
        say.textContent = sky.says;
        greet.append(who, say);
        els.push(greet);
    }
    return els;
}

/** Clouds, rain, snow, stars, gulls and the kite. Weather is a few drawn states; it never covers the column. */
function weather(c: Ctx, H: Rect, r: () => number): void {
    const w = c.world,
        line = c.line;
    // under the sea and in a cave the sky is water or rock, so nothing drifts across it
    const clouds =
        w.ground === "reef" || w.ground === "cavern"
            ? 0
            : {
                  clear: 2,
                  cloudy: 5,
                  breezy: 3,
                  rain: 5,
                  snow: 3,
                  starry: 0,
                  mist: 1,
                  aurora: 0,
                  rays: 1,
                  drips: 0,
                  dew: 1,
              }[w.weather];
    // the world's name is written across the top left of the sky, and nothing is drawn behind it
    const nb = c.label;
    const avoid = (x: number, y: number) =>
        x > nb.x - 80 && x < nb.x + nb.w + 80 && y > nb.y - 70 && y < nb.y + nb.h + 60;
    for (let i = 0; i < clouds; i++) {
        const cx = H.x + 200 + ((i + 0.5) / clouds) * (H.w - 400) + (r() - 0.5) * 160;
        const cy = H.y + 300 + r() * (line - H.y - 560);
        if (avoid(cx, cy)) continue;
        cloud(c, cx, cy, 0.8 + r() * 0.7, w.weather === "rain");
        if (w.weather === "rain")
            for (let k = 0; k < 9; k++) {
                const x = cx - 80 + k * 20 + r() * 8,
                    y = cy + 60 + (k % 3) * 22;
                c.p.pen.line(c.p.g, x, y, x - 10, y + 30, "pencil", {
                    stroke: c.skyInk,
                    strokeWidth: 1.3,
                });
            }
    }
    if (w.weather === "rain")
        for (let i = 0; i < 70; i++) {
            const x = H.x + 60 + r() * (H.w - 120),
                y = H.y + 260 + r() * (line - H.y - 320);
            if (avoid(x, y)) continue;
            c.p.pen.line(c.p.g, x, y, x - 8, y + 24, "pencil", {
                stroke: c.skyInk,
                strokeWidth: 1.1,
            });
        }
    if (w.weather === "snow")
        flakes(c, { x: H.x, y: H.y + 260, w: H.w, h: line - H.y - 300 }, r, 26, c.skyInk);
    if (w.weather === "mist") mist(c, H, r, avoid);
    if (w.weather === "aurora") aurora(c, H, r, avoid);
    if (w.weather === "rays") rays(c, H, r, avoid);
    if (w.weather === "drips") drips(c, H, r, avoid);
    if (w.weather === "dew") dew(c, H, r, avoid);
    if (w.weather === "starry" || w.weather === "aurora") {
        for (let i = 0; i < (w.weather === "aurora" ? 60 : 110); i++) {
            const x = c.X0 + 400 + r() * (c.X1 - c.X0 - 800),
                y = H.y + 80 + r() * (line - H.y - 220);
            if (avoid(x, y) || y > line - 120) continue;
            const big = r() < 0.18;
            c.p.pen.polygon(c.p.g, starPoints(x, y, big ? 16 : 8), "pencil", c.p.pen.fill("glow"), {
                stroke: c.t.ink,
                strokeWidth: big ? 1.4 : 1,
            });
        }
    }
    if (w.ground === "shore") {
        for (let i = 0; i < 5; i++) {
            const x = H.x + 300 + r() * (H.w - 600),
                y = H.y + 420 + r() * 300,
                k = 0.7 + r() * 0.6;
            if (avoid(x, y)) continue;
            const stroke = w.light.deep ? c.skyInk : c.t.ink;
            c.p.pen.curve(
                c.p.g,
                [
                    [x - 22 * k, y],
                    [x - 11 * k, y - 10 * k],
                    [x, y],
                ],
                "doodle",
                { stroke, strokeWidth: 1.8 },
            );
            c.p.pen.curve(
                c.p.g,
                [
                    [x, y],
                    [x + 11 * k, y - 10 * k],
                    [x + 22 * k, y],
                ],
                "doodle",
                { stroke, strokeWidth: 1.8 },
            );
        }
    }
}

/**
 * Mist lying in long soft bands over still water at dawn: a few strokes of paper laid across the
 * foot of the sky and just below the horizon, never behind the name and never near a sheet.
 */
function mist(c: Ctx, H: Rect, r: () => number, avoid: (x: number, y: number) => boolean): void {
    const g = el("g", { class: "mist", opacity: "0.62" }, c.p.g);
    for (let i = 0; i < 9; i++) {
        const y = c.line - 260 + i * 62 + r() * 30,
            w = 900 + r() * 900,
            x = H.x + r() * (H.w - w);
        if (avoid(x + w / 2, y)) continue;
        el(
            "rect",
            {
                x,
                y,
                width: w,
                height: 22 + r() * 26,
                rx: 20,
                fill: c.t.card,
                opacity: String(0.5 + r() * 0.4),
            },
            g,
        );
        c.p.pen.line(g, x + 60, y + 4, x + w - 60, y + 2, "doodle", {
            stroke: c.t.card,
            strokeWidth: 3,
            roughness: 0.8,
        });
    }
}

/**
 * The northern lights: curtains of light hanging in a dark sky, drawn as fine strokes that fall from
 * a wavy top edge and fade downward. Only under a deep sky, which check.ts holds a world to.
 */
function aurora(c: Ctx, H: Rect, r: () => number, avoid: (x: number, y: number) => boolean): void {
    const g = el("g", { class: "aurora" }, c.p.g),
        nb = c.label,
        top0 = Math.max(H.y + 260, nb.y + nb.h + 70);
    for (let k = 0; k < 3; k++) {
        const x0 = H.x + H.w * (0.28 + k * 0.2) + r() * 120,
            w = 700 + r() * 500,
            col = k % 2 ? c.t.sky : c.t.mint,
            top = top0 + k * 50;
        const edge: [number, number][] = [];
        for (let x = x0; x < x0 + w; x += 12) {
            const u = (x - x0) / w,
                y = top + Math.sin(u * Math.PI * 2.2 + k * 1.3) * 46,
                len = (170 + 150 * Math.sin(u * Math.PI)) * (0.75 + r() * 0.4);
            const foot = Math.min(y + len, c.line - 150);
            if (avoid(x, y) || foot - y < 40) continue;
            el(
                "line",
                {
                    x1: x,
                    y1: y,
                    x2: x + 5,
                    y2: foot,
                    stroke: col,
                    "stroke-width": 9,
                    "stroke-linecap": "round",
                    opacity: String((0.22 + 0.24 * Math.sin(u * Math.PI)).toFixed(2)),
                },
                g,
            );
            edge.push([x, y]);
        }
        if (edge.length > 2)
            el(
                "path",
                {
                    d: `M${edge.map((q) => q.join(" ")).join("L")}`,
                    fill: "none",
                    stroke: col,
                    "stroke-width": 3,
                    opacity: "0.7",
                },
                g,
            );
    }
}

/** A low sun's rays fanning up from the horizon: soft washes with a pencil stroke down each, none across the name. */
function rays(c: Ctx, H: Rect, r: () => number, avoid: (x: number, y: number) => boolean): void {
    const g = el("g", {}, c.p.g),
        sx = H.x + H.w * SUNRISE,
        sy = c.line;
    for (let k = 0; k < 9; k++) {
        const a = Math.PI + 0.22 + (k / 8) * (Math.PI - 0.44),
            len = 700 + r() * 500,
            wd = 0.035 + r() * 0.02;
        let crosses = false;
        for (let t = 0.2; t <= 1.001; t += 0.1)
            if (avoid(sx + Math.cos(a) * len * t, sy + Math.sin(a) * len * t)) crosses = true;
        if (crosses) continue;
        el(
            "path",
            {
                d: `M${sx} ${sy}L${sx + Math.cos(a - wd) * len} ${sy + Math.sin(a - wd) * len}L${sx + Math.cos(a + wd) * len} ${sy + Math.sin(a + wd) * len}Z`,
                fill: c.t.glow,
                opacity: "0.16",
            },
            g,
        );
        c.p.pen.line(
            g,
            sx + Math.cos(a) * 180,
            sy + Math.sin(a) * 180,
            sx + Math.cos(a) * len * 0.8,
            sy + Math.sin(a) * len * 0.8,
            "pencil",
            { stroke: c.t.glow, strokeWidth: 3, roughness: 0.6 },
        );
    }
}

/** Water dripping from a cave's roof: a drop falling under each place it gathers, and rings where drops have landed. */
function drips(c: Ctx, H: Rect, r: () => number, avoid: (x: number, y: number) => boolean): void {
    const g = el("g", {}, c.p.g);
    for (let i = 0; i < 22; i++) {
        const x = H.x + 120 + r() * (H.w - 240),
            y0 = H.y + 60 + r() * 120,
            y = y0 + 80 + r() * 260;
        if (avoid(x, y) || avoid(x, (y0 + y) / 2)) continue;
        el(
            "line",
            {
                x1: x,
                y1: y0,
                x2: x,
                y2: y - 14,
                stroke: c.skyInk,
                "stroke-width": 1.2,
                "stroke-dasharray": "2 12",
                opacity: "0.6",
            },
            g,
        );
        c.p.pen.path(
            g,
            `M${x} ${y - 12}Q${x + 7} ${y + 1} ${x} ${y + 6}Q${x - 7} ${y + 1} ${x} ${y - 12}Z`,
            "pencil",
            c.p.pen.fill("sky"),
            { stroke: c.skyInk, strokeWidth: 1 },
        );
    }
    for (let i = 0; i < 8; i++) {
        const x = c.l.x0 + r() * (c.l.x1 - c.l.x0),
            y = c.line + 30 + r() * 50;
        if (inColumn(c.l, x - 40, 80)) continue;
        for (const s of [1, 2])
            el(
                "ellipse",
                {
                    cx: x,
                    cy: y,
                    rx: 12 * s,
                    ry: 3.5 * s,
                    fill: "none",
                    stroke: c.ink,
                    "stroke-width": 1,
                    opacity: String(1.1 - s * 0.35),
                },
                g,
            );
    }
}

/** A dew drop like a glass bead, with the light in it. */
function dewdrop(c: Ctx, x: number, y: number, s: number, into: SVGGElement): void {
    el(
        "circle",
        {
            cx: x,
            cy: y,
            r: s,
            fill: c.t.card,
            opacity: "0.6",
            stroke: c.t.sky,
            "stroke-width": 1.6,
        },
        into,
    );
    el("circle", { cx: x - s * 0.35, cy: y - s * 0.35, r: s * 0.26, fill: c.t.card }, into);
    el(
        "path",
        {
            d: `M${x + s * 0.2} ${y + s * 0.55}q${s * 0.4} ${-s * 0.2} ${s * 0.5} ${-s * 0.6}`,
            fill: "none",
            stroke: c.t.sky,
            "stroke-width": 1.3,
        },
        into,
    );
}

/** Dew in the morning: drops hanging in the air among the stems, none behind the name. */
function dew(c: Ctx, H: Rect, r: () => number, avoid: (x: number, y: number) => boolean): void {
    const g = el("g", {}, c.p.g);
    for (let i = 0; i < 18; i++) {
        const x = H.x + 100 + r() * (H.w - 200),
            y = c.line - 80 - r() * (c.line - H.y) * 0.5;
        if (!avoid(x, y)) dewdrop(c, x, y, 7 + r() * 13, g);
    }
}

/** Dew beads on the ground of a tile, in the margins. */
function dewOn(c: Ctx, r: Rect, rnd: () => number): void {
    for (let i = 0; i < perArea(r, 170000); i++) {
        const at = c.spot(r, rnd, 240);
        if (at) dewdrop(c, at.x, at.y, 5 + rnd() * 5, c.texture);
    }
}

function cloud(c: Ctx, cx: number, cy: number, k: number, grey: boolean): void {
    const g = el("g", { class: "cloud" }, c.p.g);
    const puffs: [number, number, number][] = [
        [-60, 8, 70],
        [-18, -18, 92],
        [34, -6, 80],
        [72, 12, 58],
    ];
    const fill = grey
        ? c.p.pen.fill("ink-soft", "hachure", { hachureGap: 7, fillWeight: 0.5 })
        : { fill: c.t.card, fillStyle: "solid" };
    for (const [dx, dy, d] of puffs)
        c.p.pen.ellipse(
            g,
            cx + dx * k,
            cy + dy * k,
            d * k * 1.25,
            d * k,
            "doodle",
            { fill: c.t.card, fillStyle: "solid" },
            { stroke: "none" },
        );
    if (grey)
        for (const [dx, dy, d] of puffs)
            c.p.pen.ellipse(
                g,
                cx + dx * k,
                cy + dy * k,
                d * k * 1.1,
                d * k * 0.85,
                "doodle",
                fill,
                { stroke: "none" },
            );
    // on a deep sky a cloud is lit from below, so its edge is the sky's light ink and its body a little darker than paper
    if (c.world.light.deep) g.setAttribute("opacity", "0.8");
    for (const [dx, dy, d] of puffs)
        c.p.pen.arc(
            g,
            cx + dx * k,
            cy + dy * k,
            d * k * 1.25,
            d * k,
            Math.PI * 1.02,
            Math.PI * 1.98,
            "doodle",
            { stroke: c.skyInk, strokeWidth: 1.7 },
        );
    c.p.pen.line(g, cx - 100 * k, cy + 44 * k, cx + 106 * k, cy + 44 * k, "doodle", {
        stroke: c.skyInk,
        strokeWidth: 1.5,
    });
}

function flakes(c: Ctx, r: Rect, rnd: () => number, n?: number, stroke = c.ink): void {
    const count = n ?? perArea(r, 120000);
    for (let i = 0; i < count; i++) {
        const at = n ? { x: r.x + rnd() * r.w, y: r.y + rnd() * r.h } : c.spot(r, rnd, 240);
        if (!at) continue;
        const s = 6 + rnd() * 5;
        for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
            c.p.pen.line(
                c.p.g,
                at.x - s * Math.cos(a),
                at.y - s * Math.sin(a),
                at.x + s * Math.cos(a),
                at.y + s * Math.sin(a),
                "pencil",
                { stroke, strokeWidth: 1.1 },
            );
        }
    }
}

/**
 * What stands beside the path and who lives there, each one a piece painted when it comes near. A
 * drawing that reaches into the day's lesson is drawn a little larger, with its line beside it.
 */
/** The width of the line under a drawing that reaches into a day's lesson, as `.j-reach` is given in world.css. */
const REACH_NOTE = 230;

export function sceneryPieces(
    view: WorldView,
    host: Element,
    seasonAt: (row: number) => Season,
    o: { play?: Group | null; motion?: boolean } = {},
): Piece[] {
    const out: Piece[] = [],
        l = view.layout,
        art = view.art;
    const occurrences = new Map<string, number>();
    l.scenery.forEach((s: Scenery, i) => {
        const row = l.rows[s.row];
        const identity = `${row?.day.id ?? s.world}-${s.kind}-${s.art}`;
        const occurrence = occurrences.get(identity) ?? 0;
        occurrences.set(identity, occurrence + 1);
        const picture = pictureIn(view, row?.world ?? s.world ?? "");
        const play = picture.motion ? (o.play ?? null) : null;
        const world: WorldPicture =
            o.motion === undefined ? picture : { ...picture, motion: o.motion };
        if (s.kind === "landmark" || s.kind === "creature") {
            const on = s.kind === "landmark" ? world.landmarks : world.creatures;
            if (!on.includes(s.art)) return;
        }
        const sz = artSize(art[s.art]),
            k = s.k ?? 1;
        out.push({
            rect: { x: s.at.x, y: s.at.y, w: sz.w * k, h: sz.h * k },
            paint: () => {
                const st: Standing = view.standings[i] ?? {};
                if (st.hide) return [];
                const cls = `${s.kind}${st.lit ? " lit" : ""}${s.kind === "moment" ? (st.inked ? " inked" : " sketch") : ""}`;
                const a = placeArt(art[s.art], s.at.x, s.at.y, host, {
                    seed: hash(`${identity}-${occurrence}`),
                    flip: s.side > 0 === (s.kind === "creature"),
                    params: st.params,
                    season: row
                        ? seasonAt(s.row)
                        : seasonAlong(world, Math.round((s.along ?? 0) * 99), 100),
                    cls,
                    play,
                });
                if (!a) return [];
                if (k !== 1) {
                    a.style.transform = `scale(${k})`;
                    a.style.transformOrigin = "0 0";
                }
                a.dataset.key = `${s.kind}-${i}`;
                a.dataset.row = String(s.row);
                const els: Element[] = [a];
                const says = st.says ?? s.says;
                if (s.kind === "reach" && says) {
                    const note = document.createElement("p");
                    note.className = `j-reach hand${s.side < 0 ? " to-left" : ""}${st.lit ? " lit" : ""}`;
                    note.textContent = says;
                    // the line keeps the drawing's own envelope, which is the width `.j-reach` is given
                    // in world.css and the cap school/worlds/roll.ts places a reach by
                    note.style.left = `${s.side > 0 ? s.at.x : s.at.x + sz.w * k - REACH_NOTE}px`;
                    note.style.top = `${s.at.y + sz.h * k + 18}px`;
                    note.style.setProperty("--accent", `var(--${world.light.accent})`);
                    els.push(note);
                } else if ((s.kind === "moment" || s.kind === "secret") && (says || st.note)) {
                    // the moment's line under it once it has happened; a secret's line, said when it is found
                    const note = document.createElement("p");
                    note.className = `j-note ${s.kind} hand${st.inked ? " inked" : ""}`;
                    note.dataset.for = `${s.kind}-${i}`;
                    note.textContent = says ?? "";
                    if (st.note)
                        note.append(
                            Object.assign(document.createElement("span"), {
                                className: "g",
                                textContent: st.note,
                            }),
                        );
                    const right = s.kind === "secret" && s.side > 0;
                    note.style.left = `${right ? s.at.x + sz.w * k - 320 : s.at.x}px`;
                    note.style.top = `${s.at.y + sz.h * k + 12}px`;
                    note.style.setProperty("--accent", `var(--${world.light.accent})`);
                    if (right) note.classList.add("to-left");
                    els.push(note);
                }
                return els;
            },
        });
    });
    return out;
}

/** Tape at a sheet's two top corners, in the world's accent: the one way a world touches paper. */
export function tape(r: Rect, accent: string): HTMLElement[] {
    return [-1, 1].map((side) => {
        const t = document.createElement("div");
        t.className = "j-tape";
        const w = 96,
            h = 30;
        t.style.width = `${w}px`;
        t.style.height = `${h}px`;
        t.style.left = `${side < 0 ? r.x - 26 : r.x + r.w - w + 26}px`;
        t.style.top = `${r.y - h + LIMITS.tapeOverlap}px`;
        t.style.transform = `rotate(${side * 7}deg)`;
        t.style.background = accent;
        return t;
    });
}

/** The season at a point along a world's stretch: the world's seasons, spread over its days. */
export function seasonAlong(world: Pick<WorldPicture, "seasons">, k: number, of: number): Season {
    const s = world.seasons;
    return s[Math.min(s.length - 1, Math.floor((k / Math.max(1, of)) * s.length))] ?? "summer";
}

const ARRIVE: Spring = { hz: 2.2, zeta: 0.62 };
const FLAGS = ["j-name", "j-greet", "j-reach", "j-note"];

const layer = (cls: string): HTMLDivElement => {
    const d = document.createElement("div");
    d.className = cls;
    return d;
};

const span = (cls: string, text: string): HTMLSpanElement => {
    const e = document.createElement("span");
    e.className = cls;
    e.textContent = text;
    return e;
};

/** A day as a child reads it on the roll: "Monday, September 7". */
const longDay = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });

/** A year's roll drawn from its view into a page's world layer (world.tsx), and what the page plays on it. */
export interface WorldPainted {
    frame(camera: Camera, size: Size): void;
    pieces: { rect: Rect; detail?: boolean; paint(): (() => void) | void }[];
    /** A world putting itself together as the child arrives: what stands on a term's horizon rises into place. */
    assemble(term: number): void;
    /** Settle every drawing while a sheet has the child's attention, and wake them after. */
    settle(on: boolean): void;
    /** The camera has settled at a new zoom: what moves is sized for it again. */
    rescale(): void;
    stop(): void;
}

/**
 * A year's roll painted from the view a page was given (school/worlds/view.ts): each term's world
 * round the column the sheets stand in, its horizon, ground and path, what stands beside the path as
 * the record has left it, the dates, the tape at each sheet's corners, the guide beside today with who
 * walks behind, and the closed sheet for next time. The sheets themselves are the page's. Every
 * drawing plays through the root's player (engine/ui/animate.ts), which settles them while a sheet
 * has the child's attention.
 */
export function paintWorldView(o: {
    host: HTMLElement;
    world: HTMLElement;
    view: WorldView;
    still: boolean;
    grown: boolean;
    play?: string;
    /** Screen pixels per world pixel, from the camera, for the size rule on what moves. */
    zoom?: () => number;
}): WorldPainted {
    const { view, host, world, still } = o;
    const L = {
        ground: layer("j-layer l-ground"),
        art: layer("j-layer l-art"),
        flags: layer("j-layer l-flags"),
        over: layer("j-layer l-over"),
    };
    world.append(...Object.values(L));
    world.classList.add("j-world");
    const t = readTokens(host);
    const pictureOf = (id: string) => view.pictures[id] ?? Object.values(view.pictures)[0];
    // every drawing placed plays its declared motion on the page's group, which knows the camera's zoom
    // for the size rule; the guides beside the sheets stand still (motion: false below)
    const group = animate({ intensity: "calm", settle: 30, most: 24, zoom: o.zoom });
    const play = still ? null : group;
    const moments = new Set<ReturnType<typeof setTimeout>>();
    const l = view.layout;
    /** The standing of the scenery a placed drawing is, from the key sceneryPieces writes on it. */
    const standingOf = (e: HTMLElement) =>
        view.standings[Number(e.dataset.key?.split("-").at(-1) ?? -1)];
    /** The day a term's moment happened, from the standing of the moment beside its path. */
    const momentOn = (term: number): string | undefined => {
        const k = l.scenery.findIndex(
            (s) => s.kind === "moment" && l.rows[s.row]?.day.term === term,
        );
        return k >= 0 ? view.standings[k]?.on : undefined;
    };
    /**
     * What the day `play` did, played as its pieces are painted (world-canvas.ts's dayEvents): the moment at
     * the gate and beside the path on the day the term's last lesson was finished, and a landmark lit on the
     * day of its lesson. Nothing remembers that it has played, so it plays on every visit that day.
     */
    const dayEvents = (e: Element, arrive: number | undefined): void => {
        if (o.play === undefined || still || !(e instanceof HTMLElement)) return;
        if (e.classList.contains("gate") && arrive !== undefined) {
            if (momentOn(arrive) === o.play) {
                const timer = setTimeout(() => {
                    moments.delete(timer);
                    playMoment(e, L.art, still);
                }, 1100);
                moments.add(timer);
            }
        } else if (e.classList.contains("moment") && e.classList.contains("inked")) {
            if (standingOf(e)?.on === o.play) playMoment(e, L.art, still);
        } else if (e.classList.contains("reach") && e.classList.contains("lit")) {
            if (standingOf(e)?.on === o.play) bloom(e, still);
        }
    };
    const place = (els: Element[], arrive?: number, ahead = false, celebrate = true): void => {
        for (const e of els) {
            if (ahead) e.classList.add("ahead");
            if (arrive !== undefined && e instanceof HTMLElement) e.dataset.arrive = String(arrive);
            if (celebrate) dayEvents(e, arrive);
            (FLAGS.some((c) => e.classList.contains(c)) ? L.flags : L.art).append(e);
        }
    };
    const todayRow = l.rows.find((r) => r.day.state === "today");
    const pieces: WorldPainted["pieces"] = [];
    const surfaces: Painted[] = [];
    const celebrated = new Set<Piece>();
    const momentInked = (term: number): boolean =>
        l.scenery.some(
            (s, k) =>
                s.kind === "moment" &&
                l.rows[s.row]?.day.term === term &&
                !!view.standings[k]?.inked,
        );
    l.stretches.forEach((s, i) => {
        const w = pictureOf(s.world);
        if (!w) return;
        const walked =
            todayRow && todayRow.day.term === s.term
                ? todayRow.rect.y
                : todayRow && s.term < todayRow.day.term
                  ? Infinity
                  : -Infinity;
        const painted = paintStretch(view, i, t, host, L.ground, {
            walked,
            finished: momentInked(s.term),
            label: view.stretches[i]?.caption ?? `Term ${s.term}`,
            motion: false,
            play,
        });
        surfaces.push(painted);
        painted.pieces.forEach((piece, k) =>
            pieces.push({
                rect: piece.rect,
                detail: k !== 0,
                paint: () => {
                    const elements = piece.paint();
                    place(elements, k === 0 ? s.term : undefined, s.ahead, !celebrated.has(piece));
                    celebrated.add(piece);
                    return () => {
                        releaseScenery(elements);
                        piece.release?.();
                    };
                },
            }),
        );
        if (s.card) {
            const r = s.card,
                c = layer("j-next j-bare"),
                needs = w.needs;
            c.style.left = `${r.x}px`;
            c.style.top = `${r.y}px`;
            c.style.width = `${r.w}px`;
            c.style.minHeight = `${r.h}px`;
            c.style.setProperty("--accent", `var(--${w.light.accent})`);
            const said = view.stretches[i]?.card ?? {
                label: "Still to come",
                says: "The lessons here are still being written.",
            };
            c.append(span("label", said.label), span("t hand", said.says));
            if (o.grown && needs) c.append(span("g", needs));
            L.flags.append(c);
        }
        const band = layer(`j-stretch-mark${s.ahead ? " ahead" : ""}`);
        band.dataset.world = s.world;
        band.style.left = `${s.horizon.x}px`;
        band.style.top = `${s.horizon.y}px`;
        band.style.width = `${s.horizon.w}px`;
        band.style.height = `${s.ground.y + s.ground.h - s.horizon.y}px`;
        band.style.setProperty("--accent", `var(--${w.light.accent})`);
        L.ground.append(band);
    });
    l.stretches.forEach((s, i) => {
        const on = l.stretches[i + 1];
        if (!on || s.ahead) return;
        const sign = layer(`j-sign${on.ahead ? " ahead" : ""}`);
        sign.style.left = `${-(l.o.sheet / 2 + l.o.lane) - 70}px`;
        sign.style.top = `${s.ground.y + s.ground.h - 150}px`;
        sign.append(
            span(
                "hand",
                `${on.ahead ? "Then" : "On"} to ${(pictureOf(on.world)?.name ?? "").toLowerCase()}`,
            ),
            span("arrow", "↓"),
        );
        L.flags.append(sign);
    });
    const perWorld = new Map<string, number>();
    const seasonRow = l.rows.map((r) => {
        const k = perWorld.get(`${r.world}${r.day.term}`) ?? 0;
        perWorld.set(`${r.world}${r.day.term}`, k + 1);
        return k;
    });
    const rowsIn = (r: number) => l.rows.filter((x) => x.day.term === l.rows[r]?.day.term).length;
    for (const piece of sceneryPieces(
        view,
        host,
        (r) =>
            seasonAlong(
                pictureOf(l.rows[r]?.world ?? "") ?? { seasons: ["summer"] },
                seasonRow[r] ?? 0,
                rowsIn(r),
            ),
        { motion: false, play },
    )) {
        let seen = false;
        pieces.push({
            rect: piece.rect,
            detail: true,
            paint() {
                const elements = piece.paint();
                place(elements, undefined, false, !seen);
                seen = true;
                return () => releaseScenery(elements);
            },
        });
    }
    l.rows.forEach((row, r) => {
        const w = pictureOf(row.world);
        if (!w) return;
        const f = layer(`j-date${row.day.state === "today" ? " today" : ""}`);
        f.style.left = `${row.flag.x}px`;
        f.style.top = `${row.flag.y}px`;
        f.style.setProperty("--accent", `var(--${w.light.accent})`);
        f.append(
            span(
                "d hand",
                row.day.state === "today"
                    ? "Today"
                    : (view.days[r]?.label ?? longDay(view.days[r]?.date ?? row.day.date)),
            ),
        );
        if (row.day.state === "today")
            f.append(span("sub", longDay(view.days[r]?.date ?? row.day.date)));
        L.flags.append(f);
        for (const rect of row.sheets)
            for (const x of tape(rect, `var(--${w.light.accent})`)) L.over.append(x);
    });
    const now = todayRow ? { row: todayRow, i: l.rows.indexOf(todayRow) } : null;
    const nowWorld = now ? pictureOf(now.row.world) : undefined;
    if (now && now.row.sheets[0] && nowWorld) {
        const top = now.row.sheets[0],
            lane = now.row.side * (top.w / 2 + l.o.lane);
        const g = layer("j-guide");
        g.style.left = `${now.row.side > 0 ? lane + 44 : lane - 44 - 170}px`;
        g.style.top = `${top.y + 30}px`;
        g.append(
            guideOf(
                { guide: nowWorld.guide, motion: false },
                "point",
                170,
                host,
                now.row.side > 0 ? [-40, 36] : [100, 36],
                group,
            ),
        );
        const day = view.days[now.i];
        (day?.followers ?? []).slice(-3).forEach((art, k) => {
            const sz = artSize(view.art[art]),
                sc = Math.min(0.5, 90 / Math.max(1, sz.h), 150 / Math.max(1, sz.w));
            const a = placeArt(view.art[art], 0, 0, host, {
                seed: 610 + k,
                cls: "follower",
                flip: now.row.side < 0,
                play,
            });
            if (!a) return;
            a.style.left = `${now.row.side > 0 ? 150 + k * 96 : -sz.w * sc - k * 96 + 10}px`;
            a.style.top = `${190 - sz.h * sc}px`;
            a.style.transform = `scale(${sc})`;
            a.style.transformOrigin = "0 0";
            g.append(a);
            // a creature that joined on the day being played walks up the path to the guide
            if (o.play !== undefined && day?.date === o.play && day.joined?.includes(art))
                walkIn(a, { x: now.row.side > 0 ? -60 : 60, y: -420 }, still);
        });
        L.over.append(g);
    }
    if (l.next && view.next) {
        const c = layer("j-next");
        c.style.left = `${l.next.x}px`;
        c.style.top = `${l.next.y}px`;
        c.style.width = `${l.next.w}px`;
        c.style.height = `${l.next.h}px`;
        c.append(span("label", "Next time"), span("t hand", view.next.title));
        L.flags.append(c);
    }
    let arriving: { stop(): void } | null = null;
    return {
        frame(camera, size) {
            for (const surface of surfaces) surface.frame?.(camera, size);
        },
        pieces,
        assemble(term) {
            if (still) return;
            const els = Object.values(L)
                .flatMap((layer) => [
                    ...layer.querySelectorAll<HTMLElement>(`[data-arrive="${term}"]`),
                ])
                .sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
            if (!els.length) return;
            const gap = 0.07,
                end = settleTime(ARRIVE, 1, 0, 0) + els.length * gap;
            for (const e of els) e.style.opacity = "0";
            const tk = ticker({
                now: () => performance.now(),
                schedule: (f) => requestAnimationFrame(f),
                onFrame: (time) => {
                    els.forEach((e, i) => {
                        const tt = time - i * gap,
                            m = springAt(ARRIVE, 1, 0, 0, Math.max(0, tt));
                        e.style.opacity = tt <= 0 ? "0" : String(Math.min(1, tt / 0.2));
                        e.style.translate = `0 ${(m.x * 120).toFixed(1)}px`;
                    });
                    if (time < end) return true;
                    for (const e of els) {
                        e.style.opacity = "";
                        e.style.translate = "";
                    }
                    return false;
                },
            });
            arriving = tk;
            tk.start();
        },
        settle(on) {
            group.settle(on);
        },
        rescale() {
            group.rescale();
        },
        stop() {
            arriving?.stop();
            for (const timer of moments) clearTimeout(timer);
            moments.clear();
            group.dispose();
        },
    };
}
