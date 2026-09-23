// The map of every world, drawn as an illustrated map; .docs/overworld.md sets out the art direction.
// Only the washes, the coast and the labels are made when the map is built; everything else is a
// piece painted as the camera comes near it. The drawings that travel the country on a page's
// backdrop (the train over the strait, the ship out of the bay, the balloon on the map's own wind)
// are placed here too, each round written out once as transform keyframes for the compositor.
import "./overworld.css";
import type { Drawable, Options } from "roughjs/bin/core";
import type { Fill } from "../ink/pen";
import type { Animation } from "../motion/animation";
import { settleTime, springAt, type Spring } from "../motion/spring";
import { easeInOut, easeOut, timeline, valueAt, type Timeline } from "../motion/timeline";
import { Lingering } from "../motion/world";
import type { Level, Tokens } from "../paper";
import {
    artKey,
    at,
    hash,
    inside,
    known,
    LAND,
    LIMITS,
    near,
    PLACE_GROW,
    rand,
    reachAt,
    reached,
    sampled,
    SEA,
    SKIES,
    SKY_OPACITY,
    TERRAIN_WASH,
    toWorld,
    wet,
    type ArtRef,
    type Camera,
    type GroundKind,
    type Land,
    type LifeFrame,
    type MapLife,
    type MapPlace,
    type MapReach,
    type MapRoad,
    type MapSail,
    type MapView,
    type Pt,
    type Rect,
    type RoadKind,
    type Season,
    type Size,
    type Spot,
    type Terrain,
    type WoodKind,
    type WorldPicture,
} from "../space";
import {
    peakMarks,
    peakPath,
    rangePeaks,
    type PeakMarks,
    type PeakRole,
} from "../parts/outdoors/peaks";
import { animate, type Group, type Playing } from "./animate";
import { motionOf as playsOf } from "../parts/drawing";
import { drawingOf } from "./drawings";
import { bloom, motionOf, play } from "./player";
import { readTokens } from "./read-tokens";
import { artSize, guideOf, placeArt, type Piece } from "./scenery";
import { el, render, SvgPen as Pen } from "./svg";

/** The places and ways as paintMap draws them, before the country and the page's own handle are put round them (MapPainted). */
export interface Places {
    pieces: Piece[];
    nodes: HTMLButtonElement[];
    token: HTMLElement;
    /** Put the guide (and whoever walks behind it) at a point, facing a way. */
    place(at: Pt, facing: number): void;
    /** Put the guide in what travels the way it is on (a train on the rails, a boat on the water), or back on foot. */
    ride(kind: RoadKind | null): void;
    /** The page says the map is shown: what the day did inks itself in 450 ms on, as it does when a `.j-map` host gains `shown`. */
    shown(): void;
    stop(): void;
}

export interface MapOptions {
    layers: {
        ground: HTMLElement;
        art: HTMLElement;
        flags: HTMLElement;
        token: HTMLElement;
        nodes: HTMLElement;
    };
    host: Element;
    t: Tokens;
    /** The map as the page's viewer sees it (school/worlds/view.ts), which is everything the painter reads. */
    view: MapView;
    /** Draw it standing still whatever the device asks, as a printed poster is. */
    still?: boolean;
    /** The day whose doings play when the map is shown; without one, the latest day the record holds. */
    play?: string;
    /** The group what is placed plays its declared idle on (engine/ui/animate.ts); none where the map is still. */
    idle?: Group | null;
}

export interface TerrainOptions {
    layer: HTMLElement;
    host: Element;
    t: Tokens;
    view: MapView;
    still?: boolean;
    /** The group what stands in the country plays its declared idle on; none where the map is still. */
    idle?: Group | null;
}

export interface TerrainPainted {
    /** The detail painted as the camera comes near, each with the zoom below which it waits. */
    pieces: (Piece & { minZ: number })[];
    /** Redraw how far the child has come, for the colour washing over newly reached land. */
    setReach(r: MapReach): void;
    release(elements: readonly Element[]): void;
    stop(): void;
}

const ASK =
    typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const STILL =
    (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) ||
    ASK.get("motion") === "off";

const px = (n: number) => (Math.abs(n) < 5e-4 ? "0" : n.toFixed(1));

/**
 * What the map's own ranges are drawn at, which is the hills' weight rather than the drawing's, since
 * a range on the map is read from further off than one in a world (.docs/overworld.md).
 */
const PEAK_WEIGHT: Record<PeakRole, number> = { outline: 5.2, ridge: 3.4, snow: 3.2, shade: 2.8 };

/** A ring's points with its first repeated at the end, to draw it round. */
const closed = (ring: Pt[]): Pt[] => (ring.length ? [...ring, at(ring, 0)] : ring);

/** Frames as a CSS keyframes rule with every value written out, so the compositor plays it without the page. */
export function keyframesCss(name: string, frames: readonly LifeFrame[]): string {
    return `@keyframes ${name}{${frames.map((q) => `${(q.at * 100).toFixed(3)}%{transform:translate(${px(q.x)}px,${px(q.y)}px) rotate(${q.r.toFixed(4)}rad) scaleX(${q.flip});opacity:${q.o}}`).join("")}}`;
}

/** A drawing's float as a CSS keyframes rule, up and back with a turn, for an element that alternates. */
export function bobCss(name: string, bob: { lift: number; deg: number }): string {
    return `@keyframes ${name}{from{transform:translateY(${px(bob.lift / 2)}px) rotate(${(-bob.deg).toFixed(2)}deg)}to{transform:translateY(${px(-bob.lift / 2)}px) rotate(${bob.deg.toFixed(2)}deg)}}`;
}

/** A place's state as the map's classes have long named it: past a child's edge, next or behind, a place is ahead. */
const stateOf = (p: MapPlace): Stood["state"] => (p.state === "hidden" ? "ahead" : p.state);

const polyD = (pts: Pt[], closed = true) =>
    `M${pts.map((p) => `${Math.round(p.x)} ${Math.round(p.y)}`).join("L")}${closed ? "Z" : ""}`;
const mid = (b: Rect): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

function pad(r: Rect, seed: number, t: Tokens, cls: string): { svg: SVGSVGElement; pen: Pen } {
    const svg = el("svg", {
        class: `j-sk ${cls}`,
        viewBox: `${r.x} ${r.y} ${r.w} ${r.h}`,
        "aria-hidden": "true",
    });
    svg.style.left = `${r.x}px`;
    svg.style.top = `${r.y}px`;
    svg.style.width = `${r.w}px`;
    svg.style.height = `${r.h}px`;
    return { svg, pen: new Pen(svg, { seed, t, paper: false, roughness: 1 }) };
}

/**
 * Rough strokes gathered into one path per ink, width and fill. A pen draws each shape as its own
 * group of paths; a wood drawn that way is thousands of elements, and every one of them is styled
 * again whenever the camera moves.
 */
class Ink {
    private readonly groups = new Map<
        string,
        { d: string[]; stroke: string; width: number; fill: string; dash: string }
    >();
    readonly pen: Pen;
    constructor(pen: Pen) {
        this.pen = pen;
    }
    private get gen() {
        return this.pen.rc.generator;
    }
    private add(dr: Drawable): void {
        for (const p of this.gen.toPaths(dr)) {
            // a dash belongs to a shape's outline, not to the hatching of its fill
            const outline =
                p.stroke === dr.options.stroke && p.strokeWidth === dr.options.strokeWidth;
            const fill = p.fill ?? "none",
                dash = outline ? (dr.options.strokeLineDash ?? []).join(" ") : "",
                key = `${p.stroke}|${p.strokeWidth}|${fill}|${dash}`;
            let g = this.groups.get(key);
            if (!g)
                this.groups.set(
                    key,
                    (g = { d: [], stroke: p.stroke, width: p.strokeWidth, fill, dash }),
                );
            g.d.push(p.d);
        }
    }
    private both(make: (o: Options) => Drawable, level: Level, fill: Fill, extra: Options): void {
        const base = this.pen.opt(level, extra);
        if (fill) this.add(make({ ...base, ...fill, stroke: "none" }));
        this.add(make(base));
    }
    line(x1: number, y1: number, x2: number, y2: number, level: Level, extra: Options = {}): void {
        this.add(this.gen.line(x1, y1, x2, y2, this.pen.opt(level, extra)));
    }
    curve(pts: [number, number][], level: Level, extra: Options = {}): void {
        this.add(this.gen.curve(pts, this.pen.opt(level, extra)));
    }
    arc(
        cx: number,
        cy: number,
        w: number,
        h: number,
        a0: number,
        a1: number,
        level: Level,
        extra: Options = {},
    ): void {
        this.add(this.gen.arc(cx, cy, w, h, a0, a1, false, this.pen.opt(level, extra)));
    }
    circle(cx: number, cy: number, d: number, level: Level, fill: Fill, extra: Options = {}): void {
        this.both((o) => this.gen.circle(cx, cy, d, o), level, fill, extra);
    }
    ellipse(
        cx: number,
        cy: number,
        w: number,
        h: number,
        level: Level,
        fill: Fill,
        extra: Options = {},
    ): void {
        this.both((o) => this.gen.ellipse(cx, cy, w, h, o), level, fill, extra);
    }
    polygon(pts: [number, number][], level: Level, fill: Fill, extra: Options = {}): void {
        this.both((o) => this.gen.polygon(pts, o), level, fill, extra);
    }
    /** A path, for marks whose corners are corners: a curve through them would round a summit. */
    path(d: string, level: Level, fill: Fill, extra: Options = {}): void {
        this.both((o) => this.gen.path(d, o), level, fill, extra);
    }
    get empty(): boolean {
        return !this.groups.size;
    }
    flush(parent: Element): void {
        for (const g of this.groups.values()) {
            el(
                "path",
                {
                    d: g.d.join(""),
                    stroke: g.stroke,
                    "stroke-width": g.width,
                    fill: g.fill,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    ...(g.dash ? { "stroke-dasharray": g.dash } : {}),
                },
                parent,
            );
        }
        this.groups.clear();
    }
}

/** The coast, pushed out into the sea by a distance: the lines a map draws round an island. */
function offsetOut(coast: Pt[], by: number): Pt[] {
    // which side is out follows from which way round the ring goes, so no point has to be tested against the land
    const n = coast.length,
        out: Pt[] = [];
    const turn =
        coast.reduce((a, q, i) => {
            const r = at(coast, (i + 1) % n);
            return a + q.x * r.y - r.x * q.y;
        }, 0) > 0
            ? -1
            : 1;
    for (let i = 0; i < n; i++) {
        const a = at(coast, (i - 1 + n) % n),
            b = at(coast, (i + 1) % n),
            p = at(coast, i);
        const dx = b.x - a.x,
            dy = b.y - a.y,
            L = Math.hypot(dx, dy) || 1;
        out.push({ x: p.x + (-dy / L) * turn * by, y: p.y + (dx / L) * turn * by });
    }
    return out;
}

/** A closed ring cut where it leaves a rect, so a line round the land is not drawn along the sheet's edge. */
function runsWithin(pts: Pt[], r: Rect): Pt[][] {
    const runs: Pt[][] = [];
    let cur: Pt[] = [];
    for (const p of pts) {
        if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) cur.push(p);
        else if (cur.length) {
            runs.push(cur);
            cur = [];
        }
    }
    if (cur.length) runs.push(cur);
    return runs.filter((x) => x.length > 2);
}

/** The stretches of a line whose points pass a test, as separate runs. */
function runsWhere(pts: Pt[], keep: (p: Pt) => boolean): Pt[][] {
    const runs: Pt[][] = [];
    let cur: Pt[] = [];
    for (const p of pts) {
        if (keep(p)) cur.push(p);
        else if (cur.length) {
            runs.push(cur);
            cur = [];
        }
    }
    if (cur.length) runs.push(cur);
    return runs.filter((x) => x.length > 2);
}

/** A river as a band that widens from spring to mouth. */
function riverBand(pts: Pt[], w0: number, w1: number): Pt[] {
    const left: Pt[] = [],
        right: Pt[] = [],
        n = pts.length;
    pts.forEach((p, i) => {
        const a = at(pts, Math.max(0, i - 1)),
            b = at(pts, Math.min(n - 1, i + 1)),
            dx = b.x - a.x,
            dy = b.y - a.y,
            L = Math.hypot(dx, dy) || 1;
        const w = (w0 + (w1 - w0) * (i / Math.max(1, n - 1))) / 2;
        left.push({ x: p.x - (dy / L) * w, y: p.y + (dx / L) * w });
        right.push({ x: p.x + (dy / L) * w, y: p.y - (dx / L) * w });
    });
    return [...left, ...right.reverse()];
}

/**
 * The land and the sea under the map. The washes, the coast and its water lines, the rivers and the
 * lake are made at once; the woods, hills, mountains, fields and the sea's waves are painted a tile at
 * a time as the camera comes near. How far the child has come is a mask over the colour: soft circles
 * whose rims are marker strokes, so the colour's edge looks coloured in rather than faded.
 */
export function paintTerrain(o: TerrainOptions): TerrainPainted {
    const { t, view } = o,
        T = view.country,
        map = view.layout,
        land = view.land,
        art = view.art,
        B = T.bounds,
        cap = LIMITS.washCap,
        soft = t["ink-soft"];
    // a child's map draws only the land it knows; a grown-up's draws the whole country
    const all = !view.reach.known;
    let R = view.reach;
    o.layer.closest(".world")?.classList.add("ow");
    const p = pad(B, 4127, t, "m-land ow-land");
    o.layer.append(p.svg);
    const defs = el("defs", {}, p.svg);
    const rings = T.lands;
    const isSea = (q: Pt) => wet(T, q);
    const seaD = `M${B.x} ${B.y}h${B.w}v${B.h}h${-B.w}Z${rings.map((r) => polyD(r)).join("")}`;
    const landD = rings.map((r) => polyD(r)).join("");
    el("path", { d: seaD, "fill-rule": "evenodd" }, el("clipPath", { id: "ow-sea" }, defs));

    // the reach and what the child's map knows: solid circles with a rim of marker strokes; each rim is
    // drawn once and kept, since the circles only change round the child's own world as the colour washes out
    const mask = (id: string) =>
        el(
            "mask",
            { id, maskUnits: "userSpaceOnUse", x: B.x, y: B.y, width: B.w, height: B.h },
            defs,
        );
    const reachMask = mask("m-reach"),
        knownMask = all ? null : mask("m-known");
    const rimPen = new Pen(p.svg, { seed: 77, t, paper: false, roughness: 1 });
    const rimmer = () => {
        const rims = new Map<string, SVGElement>();
        return (c: { x: number; y: number; r: number }): SVGElement => {
            const key = `${Math.round(c.x / 10)},${Math.round(c.y / 10)},${Math.round(c.r / 10)}`;
            const had = rims.get(key);
            if (had) return had;
            const g = el("g", {});
            el(
                "circle",
                {
                    cx: Math.round(c.x),
                    cy: Math.round(c.y),
                    r: Math.round(c.r * 0.8),
                    fill: "#fff",
                },
                g,
            );
            const dr = rimPen.rc.generator.circle(c.x, c.y, c.r * 2, {
                seed: (hash(key) % 9999) + 1,
                roughness: 2.2,
                bowing: 1,
                stroke: "none",
                fill: "#fff",
                fillStyle: "hachure",
                hachureGap: 46,
                fillWeight: 24,
                hachureAngle: -41,
            });
            for (const q of rimPen.rc.generator.toPaths(dr))
                el(
                    "path",
                    {
                        d: q.d,
                        stroke: "#fff",
                        "stroke-width": q.strokeWidth,
                        fill: "none",
                        "stroke-linecap": "round",
                    },
                    g,
                );
            if (rims.size > 400) rims.clear();
            rims.set(key, g);
            return g;
        };
    };
    const reachRim = rimmer();
    // what the child's map knows fades out to paper: a soft edge, so the pencil thins away rather than stopping
    const feather = el("radialGradient", { id: "ow-feather" }, defs);
    for (const [off, op] of [
        [0, 1],
        [0.72, 1],
        [1, 0],
    ] as const)
        el(
            "stop",
            { offset: String(off), "stop-color": "#fff", "stop-opacity": String(op) },
            feather,
        );
    const knownRim = (c: { x: number; y: number; r: number }): SVGElement =>
        el("circle", {
            cx: Math.round(c.x),
            cy: Math.round(c.y),
            r: Math.round(c.r),
            fill: "url(#ow-feather)",
        });
    const setReach = (r: MapReach) => {
        R = r;
        const kids: SVGElement[] = r.circles.map(reachRim);
        // the island stays in pencil until the child gets there, whatever is washed round it
        for (const ring of r.whole) kids.push(el("path", { d: polyD(ring), fill: "#fff" }));
        for (const isle of T.isles)
            if (!r.isles.includes(isle.node))
                kids.push(el("path", { d: polyD(isle.outline), fill: "#000" }));
        reachMask.replaceChildren(...kids);
        if (knownMask && r.known)
            knownMask.replaceChildren(
                ...r.known.map(knownRim),
                ...r.whole.map((ring) => el("path", { d: polyD(ring), fill: "#fff" })),
            );
    };
    setReach(view.reach);
    const knownAt = (q: Pt) => all || known(R, q);

    // everything fades out past the map's own edge, so the sea runs off the sheet rather than stopping at a line
    const M0 = map.bounds,
        edge = (id: string, horizontal: boolean) => {
            const g = el(
                "linearGradient",
                {
                    id,
                    gradientUnits: "userSpaceOnUse",
                    x1: horizontal ? B.x : 0,
                    y1: horizontal ? 0 : B.y,
                    x2: horizontal ? B.x + B.w : 0,
                    y2: horizontal ? 0 : B.y + B.h,
                },
                defs,
            );
            const a = horizontal ? (M0.x - B.x) / B.w : (M0.y - B.y) / B.h,
                b = horizontal ? (M0.x + M0.w - B.x) / B.w : (M0.y + M0.h - B.y) / B.h;
            for (const [off, op] of [
                [0, 0],
                [a, 1],
                [b, 1],
                [1, 0],
            ] as const)
                el(
                    "stop",
                    { offset: String(off), "stop-color": "#fff", "stop-opacity": String(op) },
                    g,
                );
            const mk = el(
                "mask",
                {
                    id: `${id}-m`,
                    maskUnits: "userSpaceOnUse",
                    x: B.x,
                    y: B.y,
                    width: B.w,
                    height: B.h,
                },
                defs,
            );
            el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, fill: `url(#${id})` }, mk);
            return `url(#${id}-m)`;
        };
    const inner = el(
        "g",
        { mask: edge("ow-fade-y", false) },
        el("g", { mask: edge("ow-fade-x", true) }, p.svg),
    );
    const wide = { x: M0.x - 1400, y: M0.y - 1400, w: M0.w + 2800, h: M0.h + 2800 };
    // a child's map draws coasts only where it knows the land, so the rest costs nothing to draw or to pan over
    const shown = (runs: Pt[][]): Pt[][] =>
        all ? runs : runs.flatMap((run) => runsWhere(run, (q) => known(R, q, 1.05)));
    const coastRuns = shown(rings.flatMap((r) => runsWithin(closed(r), wide)));
    const lines = [120, 250, 420].map((by) =>
        shown(rings.flatMap((r) => runsWithin(offsetOut(r, by), wide))),
    );
    const stroke = (
        g: SVGElement,
        pts: Pt[],
        s: string,
        w: number,
        rough = 1.2,
        extra: Options = {},
    ) =>
        g.appendChild(
            p.pen.rc.linearPath(
                pts.map((q) => [q.x, q.y] as [number, number]),
                p.pen.opt("pencil", { stroke: s, strokeWidth: w, roughness: rough, ...extra }),
            ),
        );

    // the sea is always there, washed, with its shallows a shade deeper along the coast as a painted map
    // has it; it is the land that is drawn in as the child walks it, and past what a child knows the land
    // is paper, with no line round it
    const water = el("g", { class: "ow-sea" }, inner);
    el(
        "path",
        { d: seaD, "fill-rule": "evenodd", fill: t[SEA], opacity: String(cap * TERRAIN_WASH.sea) },
        water,
    );
    const shore = el("g", knownMask ? { mask: "url(#m-known)" } : {}, water);
    const shallows = el("g", { "clip-path": "url(#ow-sea)" }, shore);
    for (const [w, a] of [
        [900, 0.1],
        [420, 0.14],
    ] as const)
        for (const run of coastRuns)
            el(
                "path",
                {
                    d: polyD(run, false),
                    fill: "none",
                    stroke: t[SEA],
                    "stroke-width": w,
                    "stroke-linejoin": "round",
                    opacity: String(a),
                },
                shallows,
            );
    lines.forEach((runs, k) => {
        for (const run of runs)
            stroke(shore, run, soft, 2.6, 1.3, {
                strokeLineDash: k ? [26 + k * 14, 22 + k * 10] : undefined,
            });
    });

    // pencil where the child's map knows the land: the coast, the rivers, the lakes and the island
    const pencil = el(
        "g",
        { class: "ow-pencil", ...(knownMask ? { mask: "url(#m-known)" } : {}) },
        inner,
    );
    for (const run of coastRuns) stroke(pencil, run, soft, 5, 1.5);
    for (const rv of T.rivers) {
        stroke(
            pencil,
            rv.map((q) => ({ x: q.x + 30, y: q.y + 10 })),
            soft,
            2.6,
            1.2,
        );
        stroke(
            pencil,
            rv.map((q) => ({ x: q.x - 30, y: q.y - 10 })),
            soft,
            2.6,
            1.2,
        );
    }
    for (const lake of T.lakes) stroke(pencil, closed(lake), soft, 4, 1.3);

    // washed and inked, inside the reach
    const colour = el("g", { mask: "url(#m-reach)", class: "ow-colour" }, inner);
    el("path", { d: landD, fill: t[LAND], opacity: String(cap * TERRAIN_WASH.land) }, colour);
    for (const pt of T.patches)
        el(
            "path",
            { d: polyD(pt.outline), fill: t[pt.marker], opacity: String(cap * TERRAIN_WASH.patch) },
            colour,
        );
    for (const isle of T.isles)
        el(
            "path",
            { d: polyD(isle.outline), fill: t.glow, opacity: String(cap * TERRAIN_WASH.isle) },
            colour,
        );
    for (const lake of T.lakes)
        el(
            "path",
            { d: polyD(lake), fill: t[SEA], opacity: String(cap * TERRAIN_WASH.sea) },
            colour,
        );
    for (const rv of T.rivers)
        el(
            "path",
            {
                d: polyD(riverBand(rv, 50, 150)),
                fill: t[SEA],
                opacity: String(cap * TERRAIN_WASH.river),
            },
            colour,
        );
    for (const rv of T.rivers) {
        stroke(colour, riverBand(rv, 50, 150).slice(0, rv.length), t.ink, 2.4, 1);
        stroke(colour, riverBand(rv, 50, 150).slice(rv.length), t.ink, 2.4, 1);
    }
    for (const run of coastRuns) stroke(colour, run, t.ink, 5.5, 1.5);
    for (const lake of T.lakes) stroke(colour, closed(lake), t.ink, 4, 1.3);

    const pieces: TerrainPainted["pieces"] = [];
    // the country's small life goes over the land's marks and under the ways and the places
    const lifeLayer = document.createElement("div");
    lifeLayer.className = "ow-life";
    o.layer.append(lifeLayer);
    const below = (e: Element) => o.layer.insertBefore(e, lifeLayer);
    const feature = (
        id: string,
        at: Pt,
        k: number,
        flip = false,
        rot = 0,
        moves = false,
    ): HTMLElement | null => {
        const sz = artSize(art[id]),
            a = placeArt(art[id], 0, 0, o.host, {
                seed: Math.round(at.x + at.y),
                flip,
                cls: `m-feat${reached(R, at) ? "" : " ow-pencil-art"}`,
                play: moves && !o.still ? o.idle : null,
            });
        if (!a) return null;
        a.style.left = `${at.x - (sz.w * k) / 2}px`;
        a.style.top = `${at.y - sz.h * k}px`;
        a.style.transformOrigin = "50% 100%";
        a.style.transform = `${rot ? `rotate(${rot}rad) ` : ""}scale(${k})`;
        below(a);
        return a;
    };
    /** A part of a drawing lifted into an svg of its own over the rest and turned there, so the compositor turns it and nothing is painted again. */
    const turn = (box: HTMLElement, t: { part: string; rev: number }) => {
        const svg = box.querySelector("svg"),
            g = svg?.querySelector(`g[data-part="${t.part}"]`),
            view = svg?.viewBox.baseVal;
        const own = svg?.cloneNode(false);
        if (!svg || !g || !view?.width || !(own instanceof SVGSVGElement)) return;
        const [px = 0, py = 0] = (g.getAttribute("data-pivot") ?? "0 0").split(" ").map(Number),
            s = parseFloat(svg.style.width) / view.width;
        own.removeAttribute("role");
        own.removeAttribute("aria-label");
        own.setAttribute("aria-hidden", "true");
        own.append(g);
        const spin = document.createElement("div");
        spin.className = "ow-turn";
        spin.style.transformOrigin = `${((px - view.x) * s).toFixed(1)}px ${((py - view.y) * s).toFixed(1)}px`;
        spin.style.animation = `ow-turn ${t.rev}s linear infinite`;
        spin.append(own);
        box.append(spin);
    };
    for (const f of T.features) {
        const sz = artSize(art[f.art]),
            turning = f.turning;
        // what stands on land is drawn where the child's map knows the land; the sea's boats and gulls are always out there
        pieces.push({
            rect: { x: f.at.x - sz.w, y: f.at.y - sz.h * 2, w: sz.w * 2, h: sz.h * 2.5 },
            minZ: 0.04,
            paint: () => {
                if (f.on !== "sea" && !knownAt(f.at)) return [];
                const a = feature(f.art, f.at, f.k, f.flip);
                if (a && turning && !o.still && reached(R, f.at)) {
                    turn(a, turning);
                    pause?.watch(a);
                }
                return a ? [a] : [];
            },
        });
    }
    for (const b of T.bridges) {
        const sz = artSize(art.bridge),
            ang = Math.abs(b.angle) > Math.PI / 2 ? b.angle + Math.PI : b.angle;
        pieces.push({
            rect: { x: b.at.x - sz.w, y: b.at.y - sz.h, w: sz.w * 2, h: sz.h * 2 },
            minZ: 0.04,
            paint: () => {
                const a = knownAt(b.at)
                    ? feature("bridge", { x: b.at.x, y: b.at.y + sz.h * 0.35 }, 0.9, false, ang)
                    : null;
                return a ? [a] : [];
            },
        });
    }

    // the country's small life (life.ts), each thing a piece painted as the camera comes near it
    const named = new Set<string>();
    const lifeStarted = performance.now();
    let sheet: HTMLStyleElement | null = null;
    const keyframes = (name: string, css: () => string) => {
        if (named.has(name)) return;
        named.add(name);
        sheet ??= lifeLayer.appendChild(document.createElement("style"));
        sheet.append(css());
    };
    const watching = o.layer.closest<HTMLElement>(".j-map, .w-map, .ow-host");
    const pause = watching ? offscreen(watching) : null;
    const live = (s: MapLife) => {
        // one element carries the whole thing, its shadow and whatever follows it, so a traveller is one layer
        const f = o.still ? null : s.round,
            name = `ow-l${s.key.toString(36)}`,
            period = f?.period ?? 1;
        const start = s.path[0] ?? s.at,
            rest = f?.frames[0] ?? { x: start.x, y: start.y, flip: 1, o: 1 };
        if (f) keyframes(name, () => keyframesCss(name, f.frames));
        const go = document.createElement("div");
        go.className = "ow-go";
        go.style.transform = `translate(${rest.x.toFixed(1)}px, ${rest.y.toFixed(1)}px) scaleX(${rest.flip})`;
        if (rest.o < 1) go.style.opacity = String(rest.o);
        const elapsed = (performance.now() - lifeStarted) / 1000;
        if (f)
            go.style.animation = `${name} ${period}s linear ${(-(s.phase * period + elapsed) % period).toFixed(2)}s infinite`;
        lifeLayer.append(go);
        pause?.watch(go);
        if (s.shade && f) {
            const shade = document.createElement("div"),
                w = s.size * 1.1;
            shade.className = "ow-shade";
            Object.assign(shade.style, {
                left: `${(-w / 2 + s.size * 0.2).toFixed(0)}px`,
                top: `${(s.size * 0.7).toFixed(0)}px`,
                width: `${w.toFixed(0)}px`,
                height: `${(w * 0.36).toFixed(0)}px`,
            });
            go.append(shade);
        }
        const one = (
            id: string,
            params: Record<string, unknown> | undefined,
            size: number,
            dx: number,
            dy: number,
        ) => {
            const sz = artSize(art[id], params),
                k = size / Math.max(1, sz.w, sz.h),
                w = sz.w * k,
                h = sz.h * k;
            const a = placeArt(art[id], dx - w / 2, dy - h, o.host, {
                seed: s.key % 9973,
                params,
                cls: `ow-life-art${s.pencil && !s.doodle ? " ow-pencil-art" : ""}`,
            });
            if (!a) return;
            a.style.width = `${w}px`;
            a.style.height = `${h}px`;
            const svg = a.querySelector("svg");
            if (svg) {
                svg.style.width = `${w}px`;
                svg.style.height = `${h}px`;
            }
            // what stands floats as its drawing declares (engine/ui/animate.ts); what travels has its travel
            const bob = o.still || s.pencil || f ? null : s.bob;
            if (!bob) {
                go.append(a);
                return;
            }
            const bobbing = document.createElement("div"),
                bn = `ow-b${Math.round(bob.lift)}-${Math.round(bob.deg * 10)}`;
            keyframes(bn, () => bobCss(bn, { lift: bob.lift * 2.4, deg: bob.deg }));
            bobbing.className = "ow-bob";
            bobbing.style.transformOrigin = `${dx.toFixed(1)}px ${(dy - h * (1 - bob.pivot)).toFixed(1)}px`;
            bobbing.style.animation = `${bn} ${bob.period.toFixed(2)}s ease-in-out ${(-(s.phase * bob.period * 2 + elapsed) % (bob.period * 2)).toFixed(2)}s infinite alternate`;
            bobbing.append(a);
            go.append(bobbing);
        };
        one(s.art, s.params, s.size, 0, 0);
        if (f) for (const b of s.follow) one(b.art, b.params, b.size, b.dx, b.dy);
        return go;
    };
    for (const s of view.life) {
        // standing still, what only makes sense moving is left out
        if (o.still && s.atRest === "gone") continue;
        const xs = s.path.map((q) => q.x),
            ys = s.path.map((q) => q.y),
            pad = s.size * 1.5;
        const x0 = Math.min(...xs) - pad,
            y0 = Math.min(...ys) - pad;
        pieces.push({
            rect: { x: x0, y: y0, w: Math.max(...xs) + pad - x0, h: Math.max(...ys) + pad - y0 },
            minZ: 0.04,
            paint: () => [live(s)],
        });
    }

    // the landscape, a tile at a time
    const keepOut = map.nodes.map((n) => ({
        x: n.box.x - 40,
        y: n.box.y - 120,
        w: n.box.w + 80,
        h: n.box.h + 400,
    }));
    const furniture = [land.title, land.key, land.compass].map((c) => ({
        x: c.x - 1900,
        y: c.y - 950,
        w: 3800,
        h: 1900,
    }));
    const roadGrid = new Map<string, Pt[]>();
    for (const road of map.roads)
        for (const q of road.samples) {
            const k = `${Math.floor(q.x / 400)},${Math.floor(q.y / 400)}`;
            let a = roadGrid.get(k);
            if (!a) roadGrid.set(k, (a = []));
            a.push(q);
        }
    const nearRoad = (q: Pt, by: number) => {
        for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++)
                for (const s of roadGrid.get(
                    `${Math.floor(q.x / 400) + i},${Math.floor(q.y / 400) + j}`,
                ) ?? [])
                    if (Math.hypot(s.x - q.x, s.y - q.y) < by) return true;
        return false;
    };
    const within = (r: Rect, q: Pt) =>
        q.x >= r.x && q.x < r.x + r.w && q.y >= r.y && q.y < r.y + r.h;
    const clear = (q: Pt, by = 110) => !keepOut.some((b) => within(b, q)) && !nearRoad(q, by);
    const TILE = 2600;
    for (let ty = B.y; ty < B.y + B.h; ty += TILE)
        for (let tx = B.x; tx < B.x + B.w; tx += TILE) {
            const rect = {
                x: tx,
                y: ty,
                w: Math.min(TILE, B.x + B.w - tx),
                h: Math.min(TILE, B.y + B.h - ty),
            };
            pieces.push({
                rect,
                minZ: 0,
                paint: () => tile(rect),
            });
        }
    // a range's marks are worked out once and shared by every tile they fall in
    const rangeSeen = new Map<(typeof land.peaks)[number], PeakMarks>();
    const rangeMarks = (pk: (typeof land.peaks)[number]): PeakMarks => {
        const had = rangeSeen.get(pk);
        if (had) return had;
        const made = peakMarks(rangePeaks([pk.from.x, pk.from.y], [pk.to.x, pk.to.y], pk.n));
        rangeSeen.set(pk, made);
        return made;
    };

    function tile(r: Rect): Element[] {
        const seed = hash(`${r.x},${r.y}`),
            ink = pad(r, seed, t, "ow-marks"),
            grey = pad(r, seed + 1, t, "ow-marks ow-pencil"),
            sea = pad(r, seed + 2, t, "ow-marks ow-waves");
        const colourInk = new Ink(ink.pen),
            pencilInk = new Ink(grey.pen);
        const rnd = rand(seed);
        const coloured = (q: Pt) => reached(R, q, 0.8);
        // inked inside the reach, pencil where the map knows the land, and nothing at all past that
        const pick = (q: Pt): Ink | null =>
            coloured(q) ? colourInk : knownAt(q) ? pencilInk : null;
        // woods: trees on a jittered grid inside each clump, back to front, each belonging to the tile its foot is in
        const trees: { q: Pt; kind: WoodKind; s: number }[] = [];
        for (const w of land.woods) {
            if (
                w.at.x + w.rx < r.x ||
                w.at.x - w.rx > r.x + r.w ||
                w.at.y + w.ry < r.y ||
                w.at.y - w.ry > r.y + r.h
            )
                continue;
            const step = w.kind === "firs" ? 112 : 128,
                wr = rand(hash(`${w.at.x}:${w.at.y}`));
            for (let y = w.at.y - w.ry; y <= w.at.y + w.ry; y += step * 0.72)
                for (let x = w.at.x - w.rx; x <= w.at.x + w.rx; x += step) {
                    const q = {
                        x: x + (wr() - 0.5) * step * 0.9 + ((y / step) % 2) * step * 0.4,
                        y: y + (wr() - 0.5) * step * 0.5,
                    };
                    const e = ((q.x - w.at.x) / w.rx) ** 2 + ((q.y - w.at.y) / w.ry) ** 2;
                    if (
                        e > 1 - wr() * 0.25 ||
                        !within(r, q) ||
                        isSea(q) ||
                        !clear(q) ||
                        furniture.some((f) => within(f, q))
                    )
                        continue;
                    trees.push({ q, kind: w.kind, s: 0.75 + wr() * 0.4 });
                }
        }
        // on the island, palms round its shore where the world's own drawings are not
        for (const isle of T.isles)
            for (let i = 0; i < isle.outline.length; i += 5) {
                const c = mid(map.nodes[isle.node]?.box ?? { x: 0, y: 0, w: 0, h: 0 }),
                    q0 = at(isle.outline, i);
                const q = { x: q0.x + (c.x - q0.x) * 0.12, y: q0.y + (c.y - q0.y) * 0.12 };
                if (within(r, q) && !within(keepOut[isle.node] ?? { x: 0, y: 0, w: 0, h: 0 }, q))
                    trees.push({ q, kind: "palms", s: 0.9 + rnd() * 0.3 });
            }
        trees.sort((a, b) => a.q.y - b.q.y);
        for (const tr of trees) {
            const g = pick(tr.q);
            if (g) tree(g, tr.q, tr.kind, tr.s, coloured(tr.q));
        }
        for (const h of land.hills) {
            const n = h.n;
            for (let i = 0; i < n; i++) {
                const u = (i + 0.5) / n,
                    q = {
                        x: h.from.x + (h.to.x - h.from.x) * u,
                        y: h.from.y + (h.to.y - h.from.y) * u + (i % 2 ? 40 : -20),
                    };
                const g = pick(q);
                if (!within(r, q) || isSea(q) || !g) continue;
                const w =
                    (Math.hypot(h.to.x - h.from.x, h.to.y - h.from.y) / n) *
                    (1.25 + ((i * 7) % 3) * 0.12);
                hill(g, q, w, coloured(q));
            }
        }
        // ranges: a range is drawn whole, since a nearer peak hides what is behind it, and each of its
        // marks belongs to the tile its first point falls in, the way the woods place a tree by its foot
        for (const pk of land.peaks) {
            const marks = rangeMarks(pk);
            const file = (q: Pt): { g: Ink; c: boolean } | null => {
                const g = pick(q);
                return !within(r, q) || isSea(q) || !g ? null : { g, c: coloured(q) };
            };
            for (const patch of marks.patches) {
                const first = patch[0];
                const in_ = first && file({ x: first[0], y: first[1] });
                // the shadow on the snow is the one colour a peak carries, and is left off in pencil
                if (in_ && in_.c)
                    in_.g.polygon(patch, "pencil", in_.g.pen.fill("sky", "solid"), {
                        stroke: "none",
                    });
            }
            for (const l of marks.lines) {
                const first = l.pts[0];
                const in_ = first && file({ x: first[0], y: first[1] });
                if (!in_) continue;
                in_.g.path(peakPath(l.pts), "pencil", null, {
                    stroke: in_.c ? t.ink : soft,
                    strokeWidth: PEAK_WEIGHT[l.role],
                    preserveVertices: true,
                });
            }
        }
        land.fields.forEach((f, i) => {
            const c = {
                x: f.reduce((a, q) => a + q.x, 0) / f.length,
                y: f.reduce((a, q) => a + q.y, 0) / f.length,
            };
            const g = pick(c);
            if (within(r, c) && g) field(g, f, i, coloured(c));
        });
        // the sea's own marks: a few waves out in the open water, and reeds round the lakes the map knows
        const waves = new Ink(sea.pen),
            wr = rand(seed + 7);
        for (let y = r.y + 200; y < r.y + r.h; y += 640)
            for (let x = r.x + 200; x < r.x + r.w; x += 760) {
                const q = { x: x + (wr() - 0.5) * 500, y: y + (wr() - 0.5) * 400 };
                if (
                    !isSea(q) ||
                    T.lakes.some((l) => inside(l, q)) ||
                    keepOut.some((b) => within(b, q)) ||
                    furniture.some((f) => within(f, q))
                )
                    continue;
                if (rings.some((ring) => near(ring, q, 330))) continue;
                const k = 0.8 + wr() * 0.5;
                waves.curve(
                    [
                        [q.x - 60 * k, q.y],
                        [q.x - 30 * k, q.y - 20 * k],
                        [q.x, q.y],
                        [q.x + 30 * k, q.y - 20 * k],
                        [q.x + 60 * k, q.y],
                    ],
                    "doodle",
                    { stroke: coloured(q) ? t.ink : soft, strokeWidth: 4.5, roughness: 0.8 },
                );
            }
        for (const lake of T.lakes)
            for (let i = 0; i < lake.length; i += 3) {
                const q = at(lake, i),
                    g = pick(q);
                if (!within(r, q) || nearRoad(q, 90) || !g) continue;
                for (const [dx, lean] of [
                    [-14, -0.35],
                    [0, 0],
                    [14, 0.35],
                ] as const)
                    g.line(q.x + dx, q.y + 8, q.x + dx + lean * 40, q.y - 70, "doodle", {
                        stroke: coloured(q) ? t.ink : soft,
                        strokeWidth: 3.5,
                    });
            }
        if (!colourInk.empty) {
            colourInk.flush(ink.svg);
        }
        // the waves are a layer of their own, so their drift is moved by the compositor rather than repainted
        if (!waves.empty) {
            waves.flush(sea.svg);
            below(sea.svg);
        }
        if (ink.svg.childNodes.length) below(ink.svg);
        if (!pencilInk.empty) {
            pencilInk.flush(grey.svg);
            below(grey.svg);
        }
        return [sea.svg, ink.svg, grey.svg].filter((svg) => svg.parentNode);
    }
    function tree(g: Ink, q: Pt, kind: WoodKind, s: number, c: boolean): void {
        const line = { stroke: c ? t.ink : soft, strokeWidth: 3.6 };
        if (kind === "firs") {
            const h = 150 * s,
                w = 70 * s;
            g.line(q.x, q.y, q.x, q.y - 26 * s, "pencil", line);
            g.polygon(
                [
                    [q.x - w, q.y - 22 * s],
                    [q.x, q.y - h],
                    [q.x + w, q.y - 22 * s],
                ],
                "pencil",
                c ? g.pen.fill("mint", "solid") : null,
                line,
            );
            g.line(q.x - w * 0.55, q.y - h * 0.45, q.x + w * 0.55, q.y - h * 0.5, "pencil", {
                ...line,
                strokeWidth: 2.2,
            });
        } else if (kind === "palms") {
            const h = 150 * s;
            g.curve(
                [
                    [q.x, q.y],
                    [q.x + 14 * s, q.y - h * 0.5],
                    [q.x + 6 * s, q.y - h],
                ],
                "pencil",
                line,
            );
            for (const a of [-2.7, -2.1, -1.1, -0.45])
                g.curve(
                    [
                        [q.x + 6 * s, q.y - h],
                        [
                            q.x + 6 * s + Math.cos(a) * 44 * s,
                            q.y - h + Math.sin(a) * 30 * s - 14 * s,
                        ],
                        [
                            q.x + 6 * s + Math.cos(a) * 80 * s,
                            q.y - h + Math.sin(a) * 20 * s + 22 * s,
                        ],
                    ],
                    "pencil",
                    { ...line, stroke: c ? t.ink : soft },
                );
        } else {
            const r = 46 * s;
            g.line(q.x, q.y, q.x, q.y - r * 1.1, "pencil", line);
            g.circle(
                q.x,
                q.y - r * 1.55,
                r * 1.9,
                "pencil",
                c ? g.pen.fill("mint", "solid") : null,
                line,
            );
        }
    }
    function hill(g: Ink, q: Pt, w: number, c: boolean): void {
        const h = w * 0.42,
            line = { stroke: c ? t.ink : soft, strokeWidth: 5 };
        g.arc(q.x, q.y, w, h * 2, Math.PI * 1.02, Math.PI * 1.98, "pencil", line);
        // shade on the side away from the light, which comes from the top left as it does on the shelf
        for (let k = 0; k < 5; k++) {
            const u = 0.58 + k * 0.08,
                x = q.x - w / 2 + w * u,
                y = q.y - Math.sin(Math.PI * u) * h * 0.9;
            g.line(x, y + 12, x + 26, y + 44 + k * 6, "pencil", {
                stroke: c ? t.ink : soft,
                strokeWidth: 3,
            });
        }
        if (c)
            g.arc(q.x, q.y + 4, w * 0.96, h * 1.8, Math.PI * 1.05, Math.PI * 1.95, "pencil", {
                stroke: t.mint,
                strokeWidth: 22,
                roughness: 0.6,
            });
    }
    function field(g: Ink, f: Pt[], i: number, c: boolean): void {
        const [a, b, cc, d] = f;
        if (!a || !b || !cc || !d) return;
        const fill: Fill = c
            ? { fill: tint(t[i % 3 === 1 ? "glow" : "mint"], 0.55), fillStyle: "solid" }
            : null;
        g.polygon(
            f.map((q) => [q.x, q.y] as [number, number]),
            "pencil",
            fill,
            { stroke: c ? t.ink : soft, strokeWidth: 4, roughness: 1.4 },
        );
        // furrows along one side or the other, turning from plot to plot like a patchwork
        const across = i % 2 === 0;
        for (let k = 1; k < 7; k++) {
            const u = k / 7,
                p0 = across ? lerp(a, d, u) : lerp(a, b, u),
                p1 = across ? lerp(b, cc, u) : lerp(d, cc, u);
            g.line(p0.x, p0.y, p1.x, p1.y, "pencil", {
                stroke: c ? t.ink : soft,
                strokeWidth: 2.4,
                roughness: 1.1,
            });
        }
    }
    return {
        pieces,
        setReach,
        release(elements) {
            for (const element of elements) {
                pause?.unwatch(element);
                element.remove();
            }
        },
        stop: () => pause?.stop(),
    };
}

const lerp = (a: Pt, b: Pt, u: number): Pt => ({
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
});
/** A marker's colour at a strength, for a fill the pen lays down solid. */
const tint = (hex: string, a: number) =>
    `${hex.slice(0, 7)}${Math.round(a * 255)
        .toString(16)
        .padStart(2, "0")}`;

const shortDay = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
const longDay = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    });

function bbox(pts: Pt[], by: number): Rect {
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (const q of pts) {
        x0 = Math.min(x0, q.x);
        y0 = Math.min(y0, q.y);
        x1 = Math.max(x1, q.x);
        y1 = Math.max(y1, q.y);
    }
    return { x: x0 - by, y: y0 - by, w: x1 - x0 + by * 2, h: y1 - y0 + by * 2 };
}

/** The last day anything was done, which is the day whose marks ink themselves in as the map opens. */
function lastDay(places: MapPlace[]): string {
    let d = "";
    for (const p of places)
        for (const x of [p.shown?.stamp, p.shown?.moment, ...(p.shown?.lit ?? []).map((l) => l.on)])
            if (x && x > d) d = x;
    return d;
}

export function paintMap(o: MapOptions): Places {
    const { view, t } = o,
        map = view.layout,
        land = view.land,
        terrain = view.country,
        art = view.art;
    const world = o.layers.nodes.closest(".world");
    world?.classList.add("ow");
    const pieces: Piece[] = [];
    const nodes: HTMLButtonElement[] = [];
    const today = o.play ?? lastDay(view.places);
    const news: (() => void)[] = [];
    const run = view.places.filter((p) => p.host === null),
        off = view.places.filter((p) => p.host !== null);

    // Region names belong to the geography, independently of lesson progress.
    for (const y of view.regions) {
        const d = document.createElement("div");
        d.className = "ow-region";
        d.style.left = `${y.at.x}px`;
        d.style.top = `${y.at.y}px`;
        d.style.setProperty("--turn", `${y.angle}deg`);
        d.innerHTML = `<span class="n"></span><span class="arc"></span>`;
        d.querySelector(".n")?.append(y.name);
        d.querySelector(".arc")?.append(y.line);
        o.layers.ground.append(d);
    }

    // the ways, each in its kind, with a highlighter over the ones the child has walked; past the next
    // world only the start of its way on is drawn, trailing off into the paper
    view.ways.forEach((way, i) => {
        if (way.state === "hidden") return;
        const side = way.to >= run.length;
        const trails = way.state === "trailing",
            open = way.opened;
        const road: MapRoad = {
            from: way.from,
            to: way.to,
            kind: way.kind,
            d: way.d,
            samples: way.samples,
        };
        const shown = trails
            ? { ...road, samples: road.samples.slice(0, Math.ceil(road.samples.length * 0.4)) }
            : road;
        const r = bbox(shown.samples, 140),
            spans = side
                ? []
                : terrain.spans.filter(
                      (x) => x.road === i && (!trails || x.from < shown.samples.length),
                  );
        pieces.push({
            rect: r,
            paint: () => {
                const svg = paintRoad(shown, r, t, !!open, spans, trails);
                o.layers.ground.append(svg);
                if (open && open === today) news.push(() => drawIn(svg));
                return [];
            },
        });
    });

    for (const p of run) {
        const b = document.createElement("button");
        nodes.push(b);
        // Every world remains on a child's map; unavailable worlds are dimmed and closed.
        if (!p.shown) {
            b.hidden = true;
            continue;
        }
        stand(b, p, p.shown);
    }
    // a place off the run is on a child's map once one of its lessons is finished, and always on a grown-up's
    for (const p of off) {
        const b = document.createElement("button");
        nodes.push(b);
        if (!p.shown) {
            b.hidden = true;
            continue;
        }
        stand(b, p, p.shown);
    }

    /** A world or a place standing on the map: its drawings, its name, its stamp, a grown-up's note, and its button. */
    function stand(b: HTMLButtonElement, p: MapPlace, shown: NonNullable<MapPlace["shown"]>): void {
        const box = p.box,
            c = mid(box),
            state = stateOf(p),
            w = view.pictures[shown.world];
        if (w)
            pieces.push({
                rect: { x: box.x - 200, y: box.y - 500, w: box.w + 400, h: box.h + 700 },
                paint: () => {
                    paintPlace(
                        { ...o, art },
                        box,
                        w,
                        { state, moment: shown.moment, lit: shown.lit },
                        c,
                        today,
                        news,
                    );
                    return [];
                },
            });
        const name = document.createElement("div");
        name.className = `ow-name ${state}`;
        const at = w?.map.name;
        name.style.left = `${c.x + (at?.x ?? 0)}px`;
        name.style.top = `${c.y + (at?.y ?? box.h / 2 + 40)}px`;
        if (at?.above) name.classList.add("above");
        name.innerHTML = `<span class="w"></span>${view.grown ? `<span class="term"></span>` : ""}`;
        name.querySelector(".w")?.append(w?.name ?? shown.name);
        name.querySelector(".term")?.append(shown.when);
        o.layers.flags.append(name);
        if (shown.stamp && w) {
            const at = w.map.stamp,
                st = document.createElement("div");
            st.className = "m-stamp ow-stamp";
            st.style.left = `${c.x + at.x * PLACE_GROW}px`;
            st.style.top = `${c.y + 430 + (at.y - 430) * PLACE_GROW}px`;
            st.style.setProperty("--accent", `var(--${w.light.accent})`);
            st.style.setProperty("--tilt", `${(hash(w.id) % 24) - 14}deg`);
            st.innerHTML = `<span class="s"></span><span class="d"></span>`;
            st.querySelector(".s")?.append(w.name.replace(/^The /, ""));
            st.querySelector(".d")?.append(shortDay(shown.stamp));
            o.layers.flags.append(st);
            if (shown.stamp === today) news.push(() => pressOn(st));
        }
        if (view.grown && shown.notes.length) {
            const note = document.createElement("div");
            note.className = "m-gnote ow-gnote";
            note.style.left = `${box.x}px`;
            note.style.top = `${box.y + box.h + 300}px`;
            for (const x of shown.notes) {
                const q = document.createElement("span");
                q.textContent = x;
                note.append(q);
            }
            o.layers.flags.append(note);
        }
        b.type = "button";
        b.className = `m-node ow-node${state === "here" ? " here" : ""}`;
        b.dataset.i = String(p.i);
        b.style.left = `${box.x}px`;
        b.style.top = `${box.y}px`;
        b.style.width = `${box.w}px`;
        b.style.height = `${box.h}px`;
        b.style.setProperty("--bw", `${box.w}px`);
        b.style.setProperty("--bh", `${box.h}px`);
        b.tabIndex = -1;
        b.setAttribute("aria-label", shown.label);
        if (!p.open) b.setAttribute("aria-disabled", "true");
        o.layers.nodes.append(b);
    }

    // the map's own title, key and compass rose, in the corners of the sea
    const first = run
        .map((p) => p.shown?.stamp)
        .filter((x): x is string => !!x)
        .sort()[0];
    furniture(o, land, first);
    if (view.sail) paintSail({ ...o, art }, view.sail, today, news, pieces);

    // the guide, where the child is, with the creatures that walk behind it and a light at its feet
    const token = document.createElement("div");
    token.className = "m-token ow-token";
    const here = map.nodes[view.here ?? 0] ?? at(map.nodes, 0);
    const hereWorld = run[view.here ?? 0]?.shown?.world ?? here.world;
    const hw = view.pictures[hereWorld] ?? Object.values(view.pictures)[0];
    if (!hw) throw new Error("the view draws no world for the guide to stand in");
    token.append(Object.assign(document.createElement("div"), { className: "ow-glow" }));
    const who = document.createElement("div");
    who.className = "who";
    who.append(guideOf(hw, "cheer", 230, o.host));
    token.append(who);
    (run[view.here ?? 0]?.shown?.followers ?? []).slice(-3).forEach((id, k) => {
        const sz = artSize(art[id]),
            s = Math.min(0.55, 120 / Math.max(1, sz.h));
        const a = placeArt(art[id], 0, 0, o.host, {
            seed: 400 + k,
            cls: "follower",
            flip: true,
            play: hw.motion && !(o.still ?? STILL) ? o.idle : null,
        });
        if (!a) return;
        // on the ground beside the guide, behind it, so they never stand on the world's name below
        a.style.left = `${-130 - k * 120 - sz.w * s}px`;
        a.style.top = `${-sz.h * s + 6}px`;
        a.style.transform = `scale(${s})`;
        a.style.transformOrigin = "0 0";
        token.append(a);
    });
    const mark = document.createElement("div");
    mark.className = "ow-here";
    mark.textContent = "You are here";
    // an arrow in the same pen from the note down to the guide's feet
    const arrow = el("svg", {
        viewBox: "0 0 200 190",
        width: 200,
        height: 190,
        "aria-hidden": "true",
        style: "position:absolute;left:-70px;top:70px;overflow:visible",
    });
    const ap = new Ink(new Pen(arrow, { seed: 5, t, paper: false, roughness: 1 }));
    ap.curve(
        [
            [150, 8],
            [70, 40],
            [36, 150],
        ],
        "pencil",
        { stroke: t.pen, strokeWidth: 7 },
    );
    ap.line(36, 150, 12, 104, "pencil", { stroke: t.pen, strokeWidth: 7 });
    ap.line(36, 150, 76, 122, "pencil", { stroke: t.pen, strokeWidth: 7 });
    ap.flush(arrow);
    mark.append(arrow);
    token.append(mark);
    // a map with nobody on it, the school as written, has no guide standing anywhere
    if (view.here !== null) o.layers.token.append(token);
    const put = (at: Pt, facing: number) => {
        token.style.left = `${at.x}px`;
        token.style.top = `${at.y}px`;
        token.classList.toggle("left", facing < 0);
    };
    put(here.stand, 1);
    const ride = (kind: RoadKind | null) => {
        const r = kind ? view.rides[kind].guide : null;
        token.classList.toggle("riding", !!r);
        token.querySelector(".ride")?.remove();
        if (!r) return;
        const sz = artSize(art[r.art], r.params),
            a = placeArt(art[r.art], 0, 0, o.host, { seed: 71, params: r.params, cls: "ride" });
        if (!a) return;
        a.style.left = `${(-sz.w * r.k) / 2}px`;
        a.style.top = `${-sz.h * r.k}px`;
        a.style.transformOrigin = "0 0";
        a.style.transform = `scale(${r.k})`;
        token.append(a);
    };

    // what the last day of work did inks itself in as the map opens, every time it opens
    const host = o.layers.nodes.closest(".j-map");
    let watching: MutationObserver | undefined;
    let stopBalloon: (() => void) | undefined;
    let celebration: ReturnType<typeof setTimeout> | undefined;
    const shown = () => {
        clearTimeout(celebration);
        celebration = setTimeout(() => {
            for (const f of news) f();
        }, 450);
    };
    if (host && !(o.still ?? STILL)) {
        let on = host.classList.contains("shown");
        watching = new MutationObserver(() => {
            const now = host.classList.contains("shown");
            if (now && !on) shown();
            on = now;
        });
        watching.observe(host, { attributes: true, attributeFilter: ["class"] });
        stopBalloon = balloonOnce(o, host as HTMLElement);
    }
    return {
        pieces,
        nodes,
        token,
        place: put,
        ride,
        shown,
        stop() {
            watching?.disconnect();
            stopBalloon?.();
            clearTimeout(celebration);
            news.length = 0;
        },
    };
}

/** A stamp pressed onto the page: down from a little above, turning a little as it lands. */
function pressOn(st: HTMLElement): void {
    if (STILL) return;
    play(
        timeline(
            [{ name: "p", from: 0, to: 1, at: 0, dur: 0.55, ease: easeOut }],
            [{ at: 0.55, cue: "done" }],
        ),
        (t, run) => {
            const u = valueAt(run, "p", t);
            st.style.opacity = String(Math.min(1, u * 2));
            st.style.scale = String(1.5 - 0.5 * u);
        },
        (cue) => {
            if (cue === "done") {
                st.style.opacity = "";
                st.style.scale = "";
            }
        },
    );
}

/** A way drawn along its length, as a pen would, the day it is first walked. */
function drawIn(svg: SVGSVGElement): void {
    if (STILL) return;
    const lit = svg.querySelector<SVGPathElement>(".ow-lit-road");
    if (!lit) return;
    const L = lit.getTotalLength();
    lit.style.strokeDasharray = `${L}`;
    play(
        timeline(
            [{ name: "d", from: 0, to: 1, at: 0, dur: 1.4, ease: easeInOut }],
            [{ at: 1.4, cue: "done" }],
        ),
        (t, run) => {
            lit.style.strokeDashoffset = String(L * (1 - valueAt(run, "d", t)));
        },
        (cue) => {
            if (cue === "done") {
                lit.style.strokeDasharray = "";
                lit.style.strokeDashoffset = "";
            }
        },
    );
}

/**
 * The map's rare sight: once in a visit, when the child has had the map open for a while, a hot-air
 * balloon drifts across the whole country. It is never announced, counted or kept.
 */
function balloonOnce(o: MapOptions, host: HTMLElement): () => void {
    const wait = new Lingering(Number(ASK.get("balloon")) || 50);
    const tick = setInterval(() => {
        if (
            !wait.tick(
                host.classList.contains("shown") &&
                    !host.classList.contains("off") &&
                    !document.hidden,
            )
        )
            return;
        clearInterval(tick);
        // across the child's part of the country, from well off one side of it to well off the other
        const n = o.view.layout.nodes[o.view.here ?? 0] ?? o.view.layout.nodes[0],
            sz = artSize(o.view.art.balloon),
            k = 2.4,
            span = 18000;
        if (!n) return;
        const a = placeArt(
            o.view.art.balloon,
            n.box.x + n.box.w / 2 - span / 2,
            n.box.y - 1900,
            o.host,
            { seed: 31, cls: "far mo-cross ow-balloon" },
        );
        if (!a) return;
        a.style.transformOrigin = "0 0";
        a.style.transform = `scale(${k})`;
        a.style.setProperty("--cross-dx", `${Math.round(span + sz.w * k * 2)}px`);
        a.addEventListener("animationend", (ev) => {
            if (ev.target === a) a.remove();
        });
        o.layers.flags.append(a);
    }, 1000);
    return () => clearInterval(tick);
}

/**
 * A child's land's sail (.docs/overworld.md): the path down from the year's last world to the jetty, the
 * jetty and the ship at it, in pencil until the year's last lesson and inked from then, blooming on that
 * day; and on the day the land opened, the ship coming in over the sea, which nothing plays under
 * reduced motion, so the map simply opens on the land.
 */
function paintSail(
    o: Drawing,
    sail: MapSail,
    today: string,
    news: (() => void)[],
    pieces: Piece[],
): void {
    const inked = !!sail.inked,
        fresh = sail.inked === today,
        cls = `ow-art ow-sail ${inked ? "ow-inked" : "ow-sketch"}`,
        w = { seasons: [] as Season[] };
    const ship = artSize(o.art.ship),
        shipK = SHIP_WIDE / Math.max(1, ship.w);
    const way = sail.way;
    const r = way
        ? bbox([...way.samples, sail.jetty], 600)
        : { x: sail.jetty.x - 900, y: sail.jetty.y - 900, w: 1800, h: 1400 };
    pieces.push({
        rect: r,
        paint: () => {
            if (way) {
                const svg = paintRoad(way, bbox(way.samples, 140), o.t, inked);
                o.layers.ground.append(svg);
                if (fresh) news.push(() => drawIn(svg));
            }
            const jetty = art(
                o,
                { art: "jetty", x: 0, y: 0 },
                sail.jetty,
                1,
                undefined,
                cls,
                false,
                w,
            );
            // the ship lies alongside the jetty's seaward end, facing the next land
            const moored = art(
                o,
                { art: "ship", x: 0, y: 0, flip: sail.faces === 1 },
                { x: sail.jetty.x + sail.faces * 420, y: sail.jetty.y + 60 },
                shipK,
                undefined,
                cls,
                false,
                w,
            );
            for (const a of [jetty, moored]) {
                if (!a) continue;
                o.layers.art.append(a);
                if (fresh) news.push(() => bloom(a, STILL));
            }
            return [];
        },
    });
    const came = sail.came;
    if (!came || came.on !== today || STILL || (o.still ?? false)) return;
    news.push(() => sailIn(o, came.path, shipK));
}

/** How wide the ship at a jetty is drawn, in world units: a little smaller than a place. */
const SHIP_WIDE = 560;

/** The ship coming in over the sea along `path`, to the shore, and gone once the child is ashore. */
function sailIn(o: Drawing, path: Pt[], k: number): void {
    const a0 = path[0],
        z = path.at(-1);
    if (!a0 || !z) return;
    const a = art(
        o,
        { art: "ship", x: 0, y: 0, flip: z.x > a0.x },
        a0,
        k,
        undefined,
        "ow-art ow-sail-in",
        false,
        { seasons: [] },
    );
    if (!a) return;
    o.layers.art.append(a);
    let L = 0;
    const at: number[] = [0];
    for (let i = 1; i < path.length; i++) {
        const p = path[i - 1],
            q = path[i];
        if (p && q) L += Math.hypot(q.x - p.x, q.y - p.y);
        at.push(L);
    }
    const dur = Math.min(5, Math.max(2.5, L / 1400));
    play(
        timeline(
            [
                { name: "s", from: 0, to: 1, at: 0, dur, ease: easeInOut },
                { name: "o", from: 1, to: 0, at: dur, dur: 0.6, ease: easeOut },
            ],
            [{ at: dur + 0.6, cue: "done" }],
        ),
        (t, run) => {
            const d = valueAt(run, "s", t) * L;
            let i = at.findIndex((x) => x >= d);
            if (i < 1) i = 1;
            const p = path[i - 1] ?? a0,
                q = path[i] ?? z,
                span = (at[i] ?? L) - (at[i - 1] ?? 0) || 1,
                f = (d - (at[i - 1] ?? 0)) / span;
            a.style.translate = `${p.x + (q.x - p.x) * f - a0.x}px ${p.y + (q.y - p.y) * f - a0.y}px`;
            a.style.opacity = String(valueAt(run, "o", t));
        },
        (cue) => {
            if (cue === "done") a.remove();
        },
    );
}

/** The title, the key and the compass rose. */
function furniture(o: MapOptions, land: Land, first: string | undefined): void {
    const put = (
        svg: SVGSVGElement,
        at: Pt,
        box: { w: number; h: number },
        k: number,
        cls: string,
    ) => {
        const d = document.createElement("div");
        d.className = `j-art ow-furniture ${cls}`;
        const w = box.w * 20 * k,
            h = box.h * 20 * k;
        svg.style.width = `${w}px`;
        svg.style.height = `${h}px`;
        d.style.left = `${at.x - w / 2}px`;
        d.style.top = `${at.y - h / 2}px`;
        d.style.width = `${w}px`;
        d.style.height = `${h}px`;
        d.append(svg);
        o.layers.art.append(d);
    };
    const name = o.view.title ? `${o.view.title.child}'s map` : "The map of every world";
    const sub = first ? `Begun on ${longDay(first)}` : "Drawn as you go";
    // the map's furniture is the shelf's, loaded with the worlds' drawings (MAP_REFS in school/worlds/art.ts)
    const mapTitle = drawingOf("maptitle"),
        mapKey = drawingOf("mapkey"),
        compassRose = drawingOf("compass");
    if (mapTitle) {
        const title = render(
            mapTitle,
            { title: name, sub, width: 22 },
            { host: o.host, seed: 211 },
        );
        put(title.svg, land.title, title.box, 6.6, "ow-title");
    }
    if (mapKey) {
        const key = render(
            mapKey,
            {
                title: "Key",
                marks: ["walked", "ahead", "rails", "sea", "stamp", "lantern"],
                labels: [
                    "The way you came",
                    "Still to walk",
                    "Railway",
                    "Across the sea",
                    "You have been here",
                    "A world finished",
                ],
            },
            { host: o.host, seed: 212 },
        );
        put(key.svg, land.key, key.box, 5.2, "ow-key");
    }
    if (compassRose) {
        const rose = render(compassRose, { needle: 0 }, { host: o.host, seed: 213 });
        put(rose.svg, land.compass, rose.box, 6.6, "ow-compass");
    }
}

/**
 * A way between two worlds: pencil until it has been walked, then inked in its kind with a highlighter
 * under it. Where it crosses the sea it goes over a bridge on piers. A way that trails off into the
 * paper past the next world fades out along its length.
 */
function paintRoad(
    road: MapRoad,
    r: Rect,
    t: Tokens,
    open: boolean,
    spans: { from: number; to: number }[] = [],
    trails = false,
): SVGSVGElement {
    const p = pad(
        r,
        hash(road.d.slice(0, 40)),
        t,
        `m-road ow-road ${road.kind}${open ? " open" : " pencil"}${trails ? " trails" : ""}`,
    );
    if (trails) {
        const a = at(road.samples, 0),
            b = road.samples.at(-1) ?? a;
        const deg = 90 + (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        p.svg.style.maskImage = `linear-gradient(${deg.toFixed(0)}deg, #000 35%, transparent 96%)`;
    }
    const g = new Ink(p.pen),
        ink = open ? t.ink : t["ink-soft"],
        w = open ? 1 : 0.8;
    const pts = road.samples.map((q) => [q.x, q.y] as [number, number]);
    const off = (by: number) =>
        road.samples.map((q) => [q.x + q.nx * by, q.y + q.ny * by] as [number, number]);
    const every = (step: number) =>
        road.samples.filter(
            (q, i) =>
                i === 0 || Math.floor(q.s / step) !== Math.floor(at(road.samples, i - 1).s / step),
        );
    if (open)
        el(
            "path",
            {
                class: "ow-lit-road",
                d: road.d,
                fill: "none",
                stroke: t.glow,
                "stroke-width": 105,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                opacity: "0.55",
            },
            p.svg,
        );
    // a bridge where the way is over the sea: a deck either side of the way and piers down into the water
    for (const sp of spans) {
        const run = road.samples.slice(sp.from, sp.to + 1);
        if (run.length < 2) continue;
        for (const side of [-1, 1])
            g.curve(
                run.map(
                    (q) => [q.x + q.nx * 62 * side, q.y + q.ny * 62 * side] as [number, number],
                ),
                "ruler",
                { stroke: ink, strokeWidth: 5 * w, roughness: 0.4 },
            );
        for (let k = 4; k < run.length - 4; k += 14) {
            const q = at(run, k);
            g.line(
                q.x + q.nx * 62,
                q.y + q.ny * 62,
                q.x + q.nx * 62,
                q.y + q.ny * 62 + 120,
                "pencil",
                { stroke: ink, strokeWidth: 4.5 * w },
            );
            g.arc(q.x + q.nx * 62, q.y + q.ny * 62 + 120, 110, 36, 0, Math.PI, "pencil", {
                stroke: ink,
                strokeWidth: 3 * w,
            });
        }
    }
    switch (road.kind) {
        case "path":
            if (open)
                el(
                    "path",
                    {
                        d: road.d,
                        fill: "none",
                        stroke: t.tang,
                        "stroke-width": 44,
                        "stroke-linecap": "round",
                        opacity: "0.35",
                    },
                    p.svg,
                );
            g.curve(pts, "pencil", { stroke: ink, strokeWidth: 5 * w, strokeLineDash: [30, 24] });
            break;
        case "road":
            for (const s of [-1, 1])
                g.curve(off(s * 38), "pencil", { stroke: ink, strokeWidth: 3.6 * w });
            break;
        case "rails":
            for (const q of every(52))
                g.line(
                    q.x - q.nx * 34,
                    q.y - q.ny * 34,
                    q.x + q.nx * 34,
                    q.y + q.ny * 34,
                    "pencil",
                    { stroke: ink, strokeWidth: 4.5 * w, roughness: 0.5 },
                );
            for (const s of [-1, 1])
                g.curve(off(s * 17), "ruler", {
                    stroke: ink,
                    strokeWidth: 3.4 * w,
                    roughness: 0.3,
                });
            break;
        case "river":
            g.curve(pts, "pencil", { stroke: ink, strokeWidth: 6 * w, strokeLineDash: [2, 30] });
            break;
        case "sea":
            g.curve(pts, "pencil", { stroke: ink, strokeWidth: 6.5 * w, strokeLineDash: [2, 34] });
            for (const q of every(420))
                for (const s of [-1, 1]) {
                    const x = q.x + q.nx * 120 * s,
                        y = q.y + q.ny * 120 * s;
                    g.curve(
                        [
                            [x - 36, y],
                            [x - 18, y - 16],
                            [x, y],
                            [x + 18, y - 16],
                            [x + 36, y],
                        ],
                        "doodle",
                        { stroke: ink, strokeWidth: 3.2 },
                    );
                }
            break;
        case "air":
            // a balloon's way through the sky: long dashes, with a small cloud now and then either side of it
            g.curve(pts, "pencil", { stroke: ink, strokeWidth: 4 * w, strokeLineDash: [56, 40] });
            for (const q of every(560)) {
                const s = Math.floor(q.s / 560) % 2 ? 1 : -1,
                    x = q.x + q.nx * 120 * s,
                    y = q.y + q.ny * 120 * s;
                g.curve(
                    [
                        [x - 50, y],
                        [x - 34, y - 22],
                        [x - 10, y - 18],
                        [x + 8, y - 34],
                        [x + 32, y - 20],
                        [x + 50, y],
                    ],
                    "doodle",
                    { stroke: ink, strokeWidth: 3 },
                );
            }
            break;
    }
    g.flush(p.svg);
    return p.svg;
}

/**
 * A world standing on the map: its drawings in their places, front ones over the ones behind, in
 * pencil until the child reaches it and then in colour. Its moment waits in pencil until the term is
 * finished; a landmark a lesson has lit glows; its lantern by the road is lit when its moment has
 * happened, so a finished year is a string of lights round its side of the country.
 */
type Drawing = Pick<MapOptions, "layers" | "host" | "t" | "still" | "idle"> & {
    art: Record<string, ArtRef>;
};

/** What the record has left of a place, as the map draws it: where it stands in the story, the day its moment happened, and what a lesson has lit. */
interface Stood {
    state: "done" | "here" | "begun" | "ahead" | "next" | "behind";
    moment: string | null;
    lit: { art: string; on: string }[];
}

function paintPlace(
    o: Drawing,
    box: Rect,
    w: WorldPicture,
    place: Stood,
    c: Pt,
    today: string,
    news: (() => void)[],
): void {
    const state = place.state,
        reachedIt = state === "done" || state === "here" || state === "begun",
        happened = !!place.moment,
        m = w.chapter.moment;
    const lit = new Set(place.lit.map((x) => x.art)),
        litToday = new Set(place.lit.filter((x) => x.on === today).map((x) => x.art));
    const mp = w.map,
        seed = hash(`${w.id}`);
    const wrap = document.createElement("div");
    wrap.className = `ow-place ${state}${w.indoor ? " indoor" : ""}`;
    wrap.dataset.world = w.id;
    // a place is drawn a little larger than its box, growing up and out from the ground the guide stands on
    const grow = (q: { x: number; y: number; k?: number }) => ({
        x: q.x * PLACE_GROW,
        y: 430 + (q.y - 430) * PLACE_GROW,
        k: q.k,
    });
    const spots = [...mp.spots]
        .map((s) => ({
            s,
            at: grow(
                (s.is === "moment" || (s.is === "gate" && m.art === s.art)) && happened && s.after
                    ? s.after
                    : s,
            ),
        }))
        .sort((a, b) => a.at.y - b.at.y);
    const rects = spots.map(({ s, at }) => {
        const sz = artSize(o.art[s.art], s.params),
            k = (at.k ?? s.k ?? 1) * PLACE_GROW;
        return {
            x: c.x + at.x - (sz.w * k) / 2,
            y: c.y + at.y - sz.h * k,
            w: sz.w * k,
            h: sz.h * k,
        };
    });
    wrap.append(decor(mp.decor, w.ground, box, c, o.t, seed, reachedIt, happened, rects));
    for (const { s, at } of spots) {
        if (s.is === "secret" && !reachedIt) continue;
        const moment = s.is === "moment" || (s.is === "gate" && m.art === s.art);
        const params = moment
            ? happened
                ? (m.params ?? s.params)
                : (m.before ?? s.params)
            : s.params;
        const k = (at.k ?? s.k ?? 1) * PLACE_GROW;
        // a moment the gate does waits in the gate's own before state, inked; any other moment is a pencil sketch until it happens
        const sketch = s.is === "moment" && !happened;
        const cls = [
            "ow-art",
            s.is === "secret" ? "ow-secret" : "",
            !reachedIt ? "ow-pencil-art" : sketch ? "ow-sketch" : "",
            moment && happened ? "ow-inked" : "",
            lit.has(s.art) ? "ow-lit" : "",
        ]
            .filter(Boolean)
            .join(" ");
        // what moves on the map is held to motion.md's four at once: the drifting sea, a place's one life,
        // the island's smoke, which rises from the first day, and the guide
        const moves = (reachedIt && s.is === "life") || s.art === "volcano";
        const a = art(
            o,
            s,
            { x: c.x + at.x, y: c.y + at.y },
            k,
            params,
            cls,
            moves && w.motion && !(o.still ?? STILL),
            w,
        );
        if (!a) continue;
        if (s.is === "secret") o.layers.flags.append(a);
        else wrap.append(a);
        if ((moment && place.moment === today) || litToday.has(s.art))
            news.push(() => bloom(a, STILL));
        if (s.trail && happened) wrap.append(trail(c, at, o.t));
    }
    // the lantern by the road into the world, lit once its moment has happened
    if (!mp.ownLamp) {
        const lamp = art(
            o,
            { art: "lantern", x: 0, y: 0 },
            { x: c.x - 205, y: c.y + 470 },
            0.52,
            { lit: happened ? 1 : 0, post: 1 },
            `ow-lamp${happened ? " on" : ""}${reachedIt ? "" : " ow-pencil-art"}`,
            false,
            w,
        );
        if (lamp) wrap.append(lamp);
    }
    o.layers.art.append(wrap);
}

function art(
    o: Drawing,
    s: Spot,
    at: Pt,
    k: number,
    params: Record<string, unknown> | undefined,
    cls: string,
    moves: boolean,
    w: Pick<WorldPicture, "seasons">,
): HTMLElement | null {
    const sz = artSize(o.art[s.art], params),
        a = placeArt(o.art[s.art], 0, 0, o.host, {
            seed: hash(`${s.art}${at.x}${at.y}`),
            flip: s.flip,
            params,
            cls,
            season: w.seasons[0],
            play: moves ? o.idle : null,
        });
    if (!a) return null;
    // scaled as a whole, so what a drawing's motion adds at its anchors (the volcano's smoke) scales with it
    a.style.left = `${at.x - (sz.w * k) / 2}px`;
    a.style.top = `${at.y - sz.h * k}px`;
    a.style.transformOrigin = "0 0";
    a.style.transform = `scale(${k})`;
    return a;
}

/** A trail of smoke under a rocket that has gone up. */
function trail(c: Pt, at: { x: number; y: number }, t: Tokens): SVGSVGElement {
    const r = { x: c.x + at.x - 160, y: c.y + at.y - 40, w: 320, h: 700 };
    const p = pad(r, 91, t, "ow-trail"),
        g = new Ink(p.pen);
    for (let i = 0; i < 5; i++)
        g.circle(
            c.x + at.x + (i % 2 ? 26 : -22),
            c.y + at.y + 60 + i * 120,
            70 + i * 22,
            "pencil",
            p.pen.fill("card"),
            { stroke: t["ink-soft"], strokeWidth: 3.5 },
        );
    g.flush(p.svg);
    return p.svg;
}

/** A world to come on the map (src/world/future.ts): where it would stand, and whether it has been drawn yet. */
export interface FuturePlace {
    world?: WorldPicture;
    name: string;
    at: Pt;
    note: string;
    /** Drawn as it would be once walked, in colour with its moment happened, rather than as a proposal in pencil. */
    walked?: boolean;
}

/**
 * The worlds to come, drawn onto the map as proposals (.docs/overworld.md): a world that has been
 * declared stands in pencil as its own place would, one that has not is a dashed ring, each is
 * circled in the teacher's pen with a note, and the land beyond the island is a second sheet of
 * paper taped to the edge of the first, with its coast in pencil.
 */
export function paintFuture(o: {
    layer: HTMLElement;
    host: Element;
    t: Tokens;
    art: Record<string, ArtRef>;
    places: FuturePlace[];
    sheets: { rect: Rect; coast: Pt[] }[];
}): void {
    const { t } = o;
    for (const sh of o.sheets) {
        const r = sh.rect,
            p = pad({ x: r.x - 300, y: r.y - 300, w: r.w + 600, h: r.h + 600 }, 17, t, "ow-sheet"),
            g = new Ink(p.pen);
        el(
            "rect",
            {
                x: r.x,
                y: r.y,
                width: r.w,
                height: r.h,
                fill: t.card,
                opacity: "0.55",
                transform: `rotate(-0.8 ${r.x + r.w / 2} ${r.y + r.h / 2})`,
            },
            p.svg,
        );
        g.polygon(
            [
                [r.x, r.y],
                [r.x + r.w, r.y + 40],
                [r.x + r.w - 30, r.y + r.h],
                [r.x - 20, r.y + r.h - 30],
            ],
            "pencil",
            null,
            { stroke: t["ink-soft"], strokeWidth: 4 },
        );
        for (const [x, y, a] of [
            [r.x + r.w, r.y + 40, 30],
            [r.x + r.w - 30, r.y + r.h, -28],
            [r.x, r.y, -30],
            [r.x - 20, r.y + r.h - 30, 25],
        ] as const) {
            el(
                "rect",
                {
                    x: x - 260,
                    y: y - 70,
                    width: 520,
                    height: 140,
                    fill: t.glow,
                    opacity: "0.55",
                    transform: `rotate(${a} ${x} ${y})`,
                },
                p.svg,
            );
        }
        if (sh.coast.length > 2)
            g.curve(
                sh.coast.map((q) => [q.x, q.y] as [number, number]),
                "pencil",
                { stroke: t["ink-soft"], strokeWidth: 5 },
            );
        for (let i = 0; i < 24; i++) {
            const x = r.x + 300 + ((i * 1277) % (r.w - 600)),
                y = r.y + 300 + ((i * 2311) % (r.h - 600));
            g.curve(
                [
                    [x - 60, y],
                    [x - 30, y - 20],
                    [x, y],
                    [x + 30, y - 20],
                    [x + 60, y],
                ],
                "doodle",
                { stroke: t["ink-soft"], strokeWidth: 4 },
            );
        }
        g.flush(p.svg);
        o.layer.append(p.svg);
    }
    const layers = {
        ground: o.layer,
        art: o.layer,
        flags: o.layer,
        token: o.layer,
        nodes: o.layer,
    };
    for (const f of o.places) {
        const box = { x: f.at.x - 750, y: f.at.y - 490, w: 1500, h: 980 };
        const walked: Stood = f.walked
            ? { state: "done", moment: "walked", lit: [] }
            : { state: "ahead", moment: null, lit: [] };
        if (f.world)
            paintPlace(
                { layers, host: o.host, t, still: true, art: o.art },
                box,
                f.world,
                walked,
                f.at,
                "",
                [],
            );
        if (f.walked) continue;
        const p = pad(
                { x: box.x - 500, y: box.y - 800, w: box.w + 1000, h: box.h + 1300 },
                hash(f.name),
                t,
                "ow-proposal",
            ),
            g = new Ink(p.pen);
        g.ellipse(f.at.x, f.at.y - 60, 1750, 1250, "pencil", null, {
            stroke: t.pen,
            strokeWidth: 6,
            strokeLineDash: f.world ? undefined : [150, 110],
            roughness: 1.6,
        });
        g.flush(p.svg);
        o.layer.append(p.svg);
        const name = document.createElement("div");
        name.className = "ow-name ahead ow-future-name";
        name.style.left = `${f.at.x}px`;
        name.style.top = `${f.at.y + 470}px`;
        name.innerHTML = `<span class="w"></span><span class="note"></span>`;
        name.querySelector(".w")?.append(f.name);
        name.querySelector(".note")?.append(f.note);
        o.layer.append(name);
    }
}

/**
 * What a place draws on the ground under its drawings: the few shapes some worlds have of their own (a
 * beach, a line of rails, a hill, a running track, a storm, a lawn), and the small marks of its kind
 * of ground scattered between the drawings, so a close look finds grass, shells or snow rather than
 * an empty patch of colour.
 */
function decor(
    kind: string | undefined,
    ground: GroundKind,
    box: Rect,
    c: Pt,
    t: Tokens,
    seed: number,
    inked: boolean,
    happened: boolean,
    avoid: Rect[],
): SVGSVGElement {
    const G = (x: number, y: number): [number, number] => [
        c.x + x * PLACE_GROW,
        c.y + 430 + (y - 430) * PLACE_GROW,
    ];
    const r = { x: box.x - 400, y: box.y - 900, w: box.w + 800, h: box.h + 1100 };
    const p = pad(r, seed, t, `ow-decor ${kind ?? ground}`),
        g = new Ink(p.pen),
        ink = inked ? t.ink : t["ink-soft"],
        line = { stroke: ink, strokeWidth: 4 };
    const rs = rand(seed);
    if (kind === "clouds") {
        // a bank of cloud under a place that floats, white where it is inked
        for (const [dx, dy, s] of [
            [-560, 430, 1.1],
            [-160, 480, 1.4],
            [320, 450, 1.25],
            [640, 400, 0.9],
        ] as const) {
            const [x, y] = G(dx, dy);
            for (const [ox, oy, rr] of [
                [-70, 0, 70],
                [0, -34, 92],
                [76, 0, 64],
            ] as const)
                g.ellipse(
                    x + ox * s,
                    y + oy * s,
                    rr * 2 * s,
                    rr * 1.3 * s,
                    "pencil",
                    inked ? { fill: "#FFFFFF", fillStyle: "solid" } : null,
                    line,
                );
        }
    } else if (kind === "beach") {
        g.curve(
            [G(-760, -120), G(-380, -190), G(0, -170), G(380, -230), G(760, -170)],
            "pencil",
            line,
        );
        for (const [dx, dy, s] of [
            [560, 40, 1.2],
            [690, 70, 0.8],
            [430, 60, 0.7],
        ] as const) {
            const [x, y] = G(dx, dy);
            g.ellipse(
                x,
                y,
                130 * s,
                66 * s,
                "pencil",
                inked ? p.pen.fill("ink-soft", "hachure", { hachureGap: 12, fillWeight: 3 }) : null,
                line,
            );
        }
    } else if (kind === "rails") {
        const [x0, y0] = G(-790, 366),
            [x1] = G(790, 366);
        for (let x = x0; x < x1; x += 52)
            g.line(x, y0 - 16, x - 8, y0 + 16, "pencil", {
                stroke: ink,
                strokeWidth: 4.5,
                roughness: 0.5,
            });
        for (const dy of [-12, 12])
            g.line(x0 - 20, y0 + dy, x1 + 20, y0 + dy, "ruler", {
                stroke: ink,
                strokeWidth: 3.6,
                roughness: 0.3,
            });
    } else if (kind === "hill") {
        g.polygon(
            [G(-780, 470), G(-540, 120), G(-160, -20), G(280, 60), G(640, 260), G(780, 470)],
            "pencil",
            inked ? { fill: tint(t.berry, 0.28), fillStyle: "solid" } : null,
            line,
        );
        // the patch of night over the hill, with its stars, which is the one dark thing on the map
        if (inked) {
            const sky = SKIES.night,
                id = `ow-night-${seed}`,
                defs = el("defs", {}, p.svg),
                gr = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
            for (const [off, col] of sky.stops)
                el(
                    "stop",
                    { offset: String(off), "stop-color": col, "stop-opacity": String(SKY_OPACITY) },
                    gr,
                );
            const q = (x: number, y: number) => G(x, y).join(" ");
            el(
                "path",
                {
                    d: `M${q(-660, -40)}C${q(-720, -560)} ${q(-250, -760)} ${q(60, -680)}C${q(430, -800)} ${q(780, -560)} ${q(680, -110)}C${q(530, -20)} ${q(-420, 30)} ${q(-660, -40)}Z`,
                    fill: `url(#${id})`,
                },
                p.svg,
            );
            for (let i = 0; i < 30; i++) {
                const [x, y] = G(-580 + rs() * 1180, -640 + rs() * 520),
                    s = 9 + rs() * 13;
                el(
                    "path",
                    {
                        d: `M${x} ${y - s}L${x + s * 0.3} ${y - s * 0.3}L${x + s} ${y}L${x + s * 0.3} ${y + s * 0.3}L${x} ${y + s}L${x - s * 0.3} ${y + s * 0.3}L${x - s} ${y}L${x - s * 0.3} ${y - s * 0.3}Z`,
                        fill: sky.ink,
                    },
                    p.svg,
                );
            }
        }
    } else if (kind === "track") {
        const [cx, cy] = G(0, 110);
        for (const [rx, ry] of [
            [660, 260],
            [575, 198],
            [490, 136],
        ] as const)
            g.ellipse(
                cx,
                cy,
                rx * 2 * PLACE_GROW,
                ry * 2 * PLACE_GROW,
                "pencil",
                rx === 490 && inked ? p.pen.fill("mint") : null,
                { stroke: ink, strokeWidth: rx === 660 ? 4.5 : 2.6 },
            );
        for (let k = -3; k <= 3; k++) {
            const [x, y0] = G(k * 115, 10),
                [, y1] = G(0, 210);
            g.line(x, y0, x, y1, "pencil", {
                stroke: ink,
                strokeWidth: 2.2,
                strokeLineDash: [16, 14],
            });
        }
    } else if (kind === "storm") {
        // a storm over the ship until its moment, and a rainbow once the storm is over
        const [cx, cy] = G(20, -420);
        if (happened)
            for (const [i, col] of (["berry", "glow", "mint", "sky"] as const).entries())
                g.arc(
                    cx - 80,
                    cy + 480,
                    (1300 - i * 90) * PLACE_GROW,
                    (1000 - i * 90) * PLACE_GROW,
                    Math.PI * 1.08,
                    Math.PI * 1.92,
                    "pencil",
                    { stroke: t[col], strokeWidth: 40, roughness: 0.7 },
                );
        else {
            const top: [number, number][] = [];
            for (let k = 0; k <= 24; k++) {
                const u = k / 24,
                    a = Math.PI * (1 - u),
                    bump = 1 + 0.22 * Math.abs(Math.sin(u * Math.PI * 4));
                top.push([cx + Math.cos(a) * 520, cy - Math.sin(a) * 210 * bump]);
            }
            g.polygon(
                [...top, [cx + 520, cy + 40], [cx - 520, cy + 40]],
                "pencil",
                inked ? { fill: tint(t["ink-soft"], 0.35), fillStyle: "solid" } : null,
                { stroke: ink, strokeWidth: 4.5 },
            );
            for (let i = 0; i < 13; i++) {
                const x = cx - 440 + i * 72;
                g.line(x, cy + 80, x - 50, cy + 300, "pencil", { stroke: ink, strokeWidth: 3.2 });
            }
        }
    } else if (kind === "lawn") {
        for (const s of [-1, 1]) {
            const a = G(s * 60, 470),
                b = G(s * 40, 400),
                d = G(s * 20, 330);
            g.curve([a, b, d], "pencil", { stroke: ink, strokeWidth: 3.5 });
        }
    }
    // the ground's own small marks between the drawings
    const free = (x: number, y: number) =>
        !avoid.some(
            (a) => x > a.x - 30 && x < a.x + a.w + 30 && y > a.y - 20 && y < a.y + a.h + 30,
        );
    for (let i = 0; i < 46; i++) {
        const u = rs() * Math.PI * 2,
            d = Math.sqrt(rs()),
            [x, y] = G(Math.cos(u) * 760 * d, 150 + Math.sin(u) * 380 * d);
        if (!free(x, y)) continue;
        groundMark(g, p.pen, ground, x, y, rs, inked, t);
    }
    g.flush(p.svg);
    return p.svg;
}

/** One small mark of a world's kind of ground: a tuft, a shell, a leaf, a paving stone, a drift. */
function groundMark(
    g: Ink,
    pen: Pen,
    kind: GroundKind,
    x: number,
    y: number,
    rs: () => number,
    inked: boolean,
    t: Tokens,
): void {
    const ink = inked ? t.ink : t["ink-soft"],
        o = { stroke: ink, strokeWidth: 3.2 };
    const tuft = () => {
        for (const [dx, lean] of [
            [-9, -0.45],
            [0, 0],
            [9, 0.45],
        ] as const)
            g.line(x + dx, y, x + dx + lean * 22, y - 36, "doodle", o);
    };
    const fill = (name: "mint" | "tang" | "sky" | "glow" | "berry" | "card") =>
        inked ? pen.fill(name) : null;
    switch (kind) {
        case "meadow":
        case "boards":
        case "field":
            if (rs() < 0.72) tuft();
            else {
                g.line(x, y, x, y - 34, "pencil", o);
                g.circle(x, y - 40, 22, "pencil", fill(rs() < 0.5 ? "glow" : "berry"), {
                    ...o,
                    strokeWidth: 2.4,
                });
            }
            break;
        case "shore":
        case "sea":
            if (kind === "sea" || rs() < 0.4)
                g.curve(
                    [
                        [x - 44, y],
                        [x - 22, y - 16],
                        [x, y],
                        [x + 22, y - 16],
                        [x + 44, y],
                    ],
                    "doodle",
                    o,
                );
            else if (rs() < 0.5) g.arc(x, y, 34, 30, Math.PI, Math.PI * 2, "pencil", o);
            else g.circle(x, y, 14, "pencil", fill("card"), { ...o, strokeWidth: 2.4 });
            break;
        case "yard":
            if (rs() < 0.6)
                for (let k = 0; k < 4; k++)
                    g.circle(x + (k % 2) * 18 - 9, y + Math.floor(k / 2) * 12, 9, "pencil", null, {
                        ...o,
                        strokeWidth: 2,
                    });
            else {
                g.line(x, y, x + 4, y - 60, "pencil", o);
                for (let k = 0; k < 3; k++)
                    g.circle(x + 3, y - 60 + k * 14, 11, "pencil", fill("berry"), {
                        ...o,
                        strokeWidth: 1.8,
                    });
            }
            break;
        case "woods":
        case "jungle":
            g.ellipse(
                x,
                y,
                42,
                20,
                "pencil",
                fill(kind === "woods" ? (rs() < 0.5 ? "tang" : "berry") : "mint"),
                { ...o, strokeWidth: 2.4 },
            );
            break;
        case "town":
            if (rs() < 0.5)
                g.ellipse(x, y, 90, 26, "pencil", fill("sky"), { ...o, strokeWidth: 2.4 });
            else
                for (let k = 0; k < 3; k++)
                    g.line(x - 40 + k * 30, y, x - 30 + k * 30, y + 14, "pencil", {
                        ...o,
                        strokeWidth: 2.4,
                    });
            break;
        case "tiles":
        case "snow":
            if (rs() < 0.6) g.arc(x, y, 150, 44, Math.PI * 1.05, Math.PI * 1.95, "pencil", o);
            else
                for (const s of [-1, 1])
                    g.ellipse(x + s * 14, y + (s > 0 ? 18 : 0), 14, 22, "pencil", null, {
                        ...o,
                        strokeWidth: 2,
                    });
            break;
        case "hill":
            for (let k = 0; k < 3; k++)
                g.circle(x + k * 12 - 12, y - k * 6, 12, "pencil", fill("berry"), {
                    ...o,
                    strokeWidth: 1.8,
                });
            break;
    }
}

/**
 * The lighthouse's light as the pages move it. The shelf's lighthouse twinkles its beam for the
 * harbour; on a page, where it is one small drawing among others, the light sweeping reads better.
 */
export const SWEEP: Animation = {
    parts: {
        beam: { is: "sway", deg: 9, period: 6.8 },
        lamp: { is: "twinkle", dim: 0.25, amt: -0.08, period: 3.2 },
    },
};

/** The window the life is placed in: the view, the layer the drawings go in over the places and under their names, and the camera over the box. */
export interface MapWindow {
    readonly view: MapView;
    readonly layer: HTMLElement;
    readonly cam: Camera;
    readonly vp: Size;
}

interface Path {
    pts: Pt[];
    at: number[];
    len: number;
}
function pathOf(pts: Pt[]): Path {
    const along = [0];
    for (let i = 1; i < pts.length; i++)
        along.push(
            (along[i - 1] ?? 0) +
                Math.hypot(at(pts, i).x - at(pts, i - 1).x, at(pts, i).y - at(pts, i - 1).y),
        );
    return { pts, at: along, len: along[along.length - 1] ?? 0 };
}

/** A point a distance along a path, and the way the path runs there, in radians. */
function along(path: Path, s: number): { p: Pt; angle: number } {
    const d = Math.max(0, Math.min(path.len, s));
    let lo = 1,
        hi = path.pts.length - 1;
    while (lo < hi) {
        const m = (lo + hi) >> 1;
        if ((path.at[m] ?? 0) < d) lo = m + 1;
        else hi = m;
    }
    const a = path.pts[lo - 1] ?? at(path.pts, 0),
        b = path.pts[lo] ?? a,
        a0 = path.at[lo - 1] ?? 0,
        u = (d - a0) / ((path.at[lo] ?? a0) - a0 || 1);
    return {
        p: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u },
        angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
}

/** Out along a path and back on the engine's timeline, easing out of each end and waiting at both. */
interface Shuttle {
    tl: Timeline;
    period: number;
}
function shuttle(leg: number, wait: number, far = wait): Shuttle {
    const tl = timeline([
        { name: "out", from: 0, to: 1, at: 0, dur: leg, ease: easeInOut },
        { name: "back", from: 0, to: 1, at: leg + far, dur: leg, ease: easeInOut },
    ]);
    return { tl, period: 2 * leg + wait + far };
}
/** How far along, 0 to 1, and which way it is going, `from` a share of the way through its round. */
function shuttleAt(sh: Shuttle, t: number, from = 0): { s: number; dir: number } {
    const u = (((t + sh.period * from) % sh.period) + sh.period) % sh.period;
    return {
        s: valueAt(sh.tl, "out", u) - valueAt(sh.tl, "back", u),
        dir: u < (sh.tl.tracks[1]?.at ?? 0) ? 1 : -1,
    };
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const middle = (b: { x: number; y: number; w: number; h: number }): Pt => ({
    x: b.x + b.w / 2,
    y: b.y + b.h / 2,
});

interface Pose {
    p: Pt;
    angle: number;
    dir: number;
    o?: number;
}

/**
 * The map's own keyframes (a traveller's round, a windmill's sails) stop while their element is not on
 * screen, and everything while the tab is hidden, the way the player rests the drawings' idles: the
 * map paints only what is near the camera, and this pauses what has been painted and scrolled away.
 */
function offscreen(root: HTMLElement): {
    watch(el: Element): void;
    unwatch(el: Element): void;
    stop(): void;
} {
    const io = new IntersectionObserver(
        (entries) => {
            for (const e of entries) e.target.classList.toggle("mo-off", !e.isIntersecting);
        },
        { root, rootMargin: "120px" },
    );
    const visibility = () =>
        document.documentElement.classList.toggle("mo-hidden", document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return {
        watch: (el) => io.observe(el),
        unwatch: (el) => io.unobserve(el),
        stop() {
            io.disconnect();
            document.removeEventListener("visibilitychange", visibility);
        },
    };
}

/** The wind over the country: from the west, stronger over the sea, turning a little from place to place, in world units a second. */
export function windAt(t: Terrain, p: Pt): Pt {
    const k = wet(t, p) ? 1.25 : 1;
    return {
        x: (78 + 26 * Math.sin(p.y / 2600 + p.x / 5200)) * k,
        y: 22 * Math.sin(p.x / 3100 + 1) * k,
    };
}

interface Mover {
    /** The element that travels, and the drawing inside it, which keeps its own scale. */
    go: HTMLElement;
    art: HTMLElement;
    /** The loader's name for the drawing (artKey in engine/space.ts), for the float it declares. */
    key: string;
    /** The drawing's size at scale one in world units, and the scale it is drawn at. */
    w: number;
    h: number;
    k: number;
    /** Which way a side-on drawing faces as drawn (1 is right); 0 for one seen from above, which turns to its heading. */
    faces: 1 | -1 | 0;
    /** Stays upright and faces one way, as a balloon does. */
    upright?: boolean;
    /** Its pose at a time into its round, which repeats every `period` seconds. */
    pose(t: number): Pose;
    period: number;
    /** How far into its round it is when the page's clock starts. */
    start: number;
}

/** A pose as a frame of a traveller's round: a side-on drawing leans with the way, never more than a gentle slope, and faces where it goes. */
function frameOf(m: Mover, q: Pose): Omit<LifeFrame, "at"> {
    const heading = q.dir >= 0 ? q.angle : q.angle + Math.PI,
        above = m.faces === 0 && !m.upright;
    let r = 0,
        flip: 1 | -1 = 1;
    if (above) r = heading;
    else if (!m.upright) {
        const right = Math.cos(heading) >= 0;
        flip = (right ? 1 : -1) * m.faces < 0 ? -1 : 1;
        r = Math.max(-0.3, Math.min(0.3, wrapAngle(right ? heading : heading - Math.PI)));
    }
    return { x: q.p.x, y: q.p.y, r, flip, o: q.o ?? 1 };
}

export interface Living {
    movers: Mover[];
    idle: SVGSVGElement[];
}

export interface LifeOptions {
    /** The element the map is drawn in, which the drawings are placed in too. */
    host: HTMLElement;
    /** Every camera the view will use, so nothing travels behind `keepOff` from any of them. */
    cams: Camera[];
    /** The harbour's stretch, one rider on each kind of way in the whole country, or nothing. */
    kind: "harbour" | "ways" | "none";
    /** What stands on the page over the map, which no drawing passes behind, such as the site's sheet. */
    keepOff?: () => readonly DOMRect[];
    narrow: boolean;
    /** The camera whose top corner the moon and the rocket stand in; without one there are none. */
    sky?: Camera;
}

/** The balloon carried on the map's own wind from `from` until it is past `to`: where it is each quarter second, and how long that takes. */
function blown(T: Terrain, from: Pt, to: number): { at: Pt[]; secs: number } {
    const dt = 0.25,
        drift = 0.3,
        at: Pt[] = [];
    let p = { ...from };
    while (p.x < to && at.length < 4800) {
        at.push(p);
        const w = windAt(T, p);
        p = { x: p.x + w.x * drift * dt, y: p.y + w.y * drift * dt };
    }
    return { at, secs: at.length * dt };
}

/**
 * The drawings that live in the country. Where each goes is read off the live map: the rails that
 * cross the strait, the harbour's jetty and the lighthouse on the point, the river past the meadow,
 * the lake the heron stands by, or in the whole country every way that has something to ride it.
 * Nothing travels behind `keepOff` from any camera the view uses, or where the map is not drawn.
 */
export function life(v: MapWindow, o: LifeOptions): Living {
    const m = v.view.layout,
        T = v.view.country,
        layer = v.layer,
        art = v.view.art,
        out: Living = { movers: [], idle: [] };
    if (o.kind === "none" || !o.cams.length) return out;
    layer.replaceChildren();
    const cam = o.cams[0] ?? v.cam,
        vp = v.vp,
        narrow = o.narrow;
    // what the drawings keep off in world units from each camera, grown by the room a drawing keeps from it
    const box = o.host.getBoundingClientRect(),
        off = o.keepOff?.() ?? [];
    const views = o.cams.map((c) => {
        const room = 40 / c.z;
        const under = off.map((s) => {
            const a = toWorld(c, vp, { x: s.left - box.left, y: s.top - box.top }),
                b = toWorld(c, vp, { x: s.right - box.left, y: s.bottom - box.top });
            return {
                x: a.x - room,
                y: a.y - room,
                w: b.x - a.x + room * 2,
                h: b.y - a.y + room * 2,
            };
        });
        return {
            c,
            under,
            nw: toWorld(c, vp, { x: -60, y: -60 }),
            se: toWorld(c, vp, { x: vp.w + 60, y: vp.h + 60 }),
        };
    });
    const inView = (q: Pt) =>
        views.some((w) => q.x > w.nw.x && q.x < w.se.x && q.y > w.nw.y && q.y < w.se.y);
    // above where the map fades into the page
    const shown = (q: Pt) => inView(q) && views.every((w) => q.y < w.se.y - 160 / w.c.z);
    const clear = (q: Pt) =>
        known(v.view.reach, q) &&
        views.every(({ under }) =>
            under.every((r) => q.x < r.x || q.x > r.x + r.w || q.y < r.y || q.y > r.y + r.h),
        );
    // in the whole country a drawing is drawn larger than the land would allow, so it reads among the small worlds
    const big = Math.max(1, Math.min(2, 0.06 / cam.z));
    const svgOf = (el: HTMLElement) => el.querySelector<SVGSVGElement>("svg.visual");
    const draw = (id: string, seed: number, params?: Record<string, unknown>) => {
        const ref = art[id],
            sz = artSize(ref, params),
            el = ref && placeArt(ref, 0, 0, o.host, { seed, params });
        if (!ref || !el) return null;
        el.style.position = "absolute";
        return { art: el, key: artKey(ref), w: sz.w, h: sz.h };
    };
    /** A drawing that travels, its size in world units along its width or up its height. */
    const mover = (
        id: string,
        seed: number,
        size: number,
        p: Pick<Mover, "faces" | "upright" | "pose" | "period"> & { start?: number },
        params?: Record<string, unknown>,
        by: "w" | "h" = "w",
    ) => {
        const d = draw(id, seed, params);
        if (!d) return;
        const go = document.createElement("div");
        go.className = "m-go";
        go.append(d.art);
        layer.append(go);
        out.movers.push({ ...d, go, k: (size * big) / d[by], start: 0, ...p });
    };
    /** A drawing that stands in one place and keeps only its own idle. */
    const stand = (
        id: string,
        seed: number,
        at: Pt,
        size: number,
        params?: Record<string, unknown>,
        by: "w" | "h" = "h",
    ) => {
        if (!clear(at) || !inView(at)) return;
        const d = draw(id, seed, params);
        if (!d) return;
        const k = size / d[by];
        d.art.className += " m-go";
        d.art.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) scale(${k.toFixed(4)}) translate(${-d.w / 2}px, ${-d.h}px)`;
        layer.append(d.art);
        const svg = svgOf(d.art);
        if (svg) out.idle.push(svg);
    };
    // the longest run of a way that keeps clear of what is over the map, if enough of it is on show
    const keep = (pts: Pt[], least: number): Path | null => {
        let best: Pt[] = [],
            cur: Pt[] = [];
        for (const q of pts) {
            if (clear(q)) cur.push(q);
            else {
                if (cur.length > best.length) best = cur;
                cur = [];
            }
        }
        if (cur.length > best.length) best = cur;
        const p = pathOf(best);
        return p.len >= least && best.filter(inView).length > best.length * 0.4 ? p : null;
    };
    const shuttling = (path: Path, sh: Shuttle, from = 0) => ({
        period: sh.period,
        pose: (t: number): Pose => {
            const q = shuttleAt(sh, t, from);
            return { ...along(path, q.s * path.len), dir: q.dir };
        },
    });
    /** Round an ellipse, the long way through `P` seconds, turned to the way it is going. */
    const circling = (at: (th: number) => Pt, P: number, phase: number) => ({
        period: P,
        pose: (t: number): Pose => {
            const th = -(t / P) * Math.PI * 2 + phase,
                p = at(th),
                q = at(th - 0.01);
            return { p, angle: Math.atan2(q.y - p.y, q.x - p.x), dir: 1 };
        },
    });

    if (o.kind === "ways") {
        // a way's ends are at the worlds' feet, where their names hang, so each rider keeps to the middle of its way
        const far = (q: Pt) =>
            m.nodes.every(
                (n) => Math.hypot(q.x - (n.box.x + n.box.w / 2), q.y - (n.box.y + n.box.h)) > 1500,
            );
        m.roads.forEach((road, i) => {
            const r = v.view.rides[road.kind].country,
                path = r ? keep(road.samples.filter(far), 2000) : null;
            if (r && path)
                mover(
                    r.art,
                    8300 + i,
                    r.size,
                    {
                        faces: r.faces,
                        ...shuttling(path, shuttle(path.len / (r.speed * big), 8), (i * 0.37) % 1),
                    },
                    r.params,
                );
        });
        // the paper plane on a wide loop over the sea between the lands, the first that passes no world's name
        const ns = m.nodes,
            c = {
                x: ns.reduce((a, n) => a + middle(n.box).x, 0) / ns.length,
                y: ns.reduce((a, n) => a + middle(n.box).y, 0) / ns.length,
            };
        for (const [dx, dy, a, b] of [
            [-3000, -3600, 3200, 1400],
            [-2600, -3000, 2600, 1100],
            [0, -3800, 3000, 1000],
            [-4000, 400, 2400, 1000],
        ] as const) {
            const at = (th: number): Pt => ({
                x: c.x + dx + a * Math.cos(th),
                y: c.y + dy + b * Math.sin(th),
            });
            if (
                !Array.from({ length: 64 }, (_, k) => at((k / 64) * Math.PI * 2)).every(
                    (q) => clear(q) && far(q) && inView(q),
                )
            )
                continue;
            mover("paperplane", 8233, 420, { faces: 0, ...circling(at, 80, 0) }, { bank: -0.3 });
            break;
        }
        return out;
    }

    // the train, out from beside the station (its foot is where its name is), over the bridge across the strait to the mainland, and back
    const railIdx = m.roads.findIndex(
        (r, i) => r.kind === "rails" && T.spans.some((x) => x.road === i),
    );
    const rails = m.roads[railIdx],
        span = T.spans.find((x) => x.road === railIdx);
    const station = rails ? m.nodes[rails.from]?.stand : undefined,
        first =
            rails && station
                ? Math.max(
                      0,
                      rails.samples.findIndex(
                          (q) => Math.hypot(q.x - station.x, q.y - station.y) > 800,
                      ),
                  )
                : 0;
    const line =
        rails && span
            ? keep(rails.samples.slice(first, Math.min(rails.samples.length, span.to + 70)), 1500)
            : null;
    if (line)
        mover(
            "train",
            8129,
            600,
            { faces: -1, ...shuttling(line, shuttle(line.len / 120, 10, 12), 0.97) },
            { carriages: 2, windows: 3, on: 0 },
        );

    // the ship, from the harbour's jetty out of the bay and away north-west past the island, where the
    // island's name is not; the channel east of the island is where the name is lettered
    const jetty = T.features.find((f) => f.art === "jetty")?.at,
        light = T.features.find((f) => f.art === "lighthouse")?.at;
    if (jetty) {
        const lane = [
            jetty,
            { x: jetty.x - 200, y: jetty.y - 870 },
            { x: jetty.x - 750, y: jetty.y - 1520 },
            { x: jetty.x - 1450, y: jetty.y - 2120 },
            { x: jetty.x - 2050, y: jetty.y - 2820 },
        ];
        const dense = lane.flatMap((q, i) => {
            const r = lane[i + 1];
            return r
                ? Array.from({ length: 12 }, (_, k) => ({
                      x: q.x + ((r.x - q.x) * k) / 12,
                      y: q.y + ((r.y - q.y) * k) / 12,
                  }))
                : [q];
        });
        // the first few points are the jetty's own planks, at the shore
        const path = dense.slice(3).every((q) => wet(T, q)) ? keep(dense, 900) : null;
        if (path)
            mover("ship", 8191, 400, {
                faces: -1,
                ...shuttling(path, shuttle(path.len / 100, 10), 0.08),
            });
    }

    // a small sailing boat going round in the bay west of the ship's lane, north of the harbour's own
    // boats and moved on north until its circle is all sea
    for (let north = 870; jetty && north < 2400; north += 150) {
        const c = { x: jetty.x - 1400, y: jetty.y - north };
        const at = (th: number): Pt => ({
            x: c.x + Math.cos(th) * 620,
            y: c.y + Math.sin(th) * 240,
        });
        const ring = Array.from({ length: 48 }, (_, k) => at((k / 48) * Math.PI * 2));
        if (!ring.every((q) => wet(T, q) && clear(q)) || !ring.some(inView)) continue;
        mover("boat", 8243, 260, { faces: 1, ...circling(at, 70, 1) });
        break;
    }

    // the narrowboat, up and down the river past the meadow where it is on show
    const river = T.rivers[0],
        canal = river ? keep(river.filter(shown), 900) : null;
    if (canal)
        mover(
            "narrowboat",
            8251,
            440,
            { faces: 1, ...shuttling(canal, shuttle(canal.len / 70, 8), 0.3) },
            { windows: 3, pots: 2 },
        );

    // the heron at the edge of the marsh's lake, on its north shore on the side the paper plane spots one
    const spot = v.view.sights.find((x) => x.art === "heron")?.at,
        lake = spot
            ? T.lakes.find((l) => l.some((q) => Math.hypot(q.x - spot.x, q.y - spot.y) < 1500))
            : undefined;
    if (spot && lake) {
        const mid = lake.reduce(
            (acc, q) => ({ x: acc.x + q.x / lake.length, y: acc.y + q.y / lake.length }),
            { x: 0, y: 0 },
        );
        const want = { x: spot.x, y: mid.y - 900 };
        const shore = lake.reduce(
            (best, q) =>
                Math.hypot(q.x - want.x, q.y - want.y) <
                Math.hypot(best.x - want.x, best.y - want.y)
                    ? q
                    : best,
            lake[0] ?? spot,
        );
        const d = Math.hypot(shore.x - mid.x, shore.y - mid.y) || 1;
        stand(
            "heron",
            8261,
            {
                x: shore.x + ((shore.x - mid.x) / d) * 90,
                y: shore.y + ((shore.y - mid.y) / d) * 90,
            },
            400,
        );
    }

    // kites up over the meadow, on its side away from what is over the map
    const meadow = m.nodes.find((n) => n.world === "meadow");
    if (meadow && !narrow) {
        stand("kite", 8113, { x: meadow.box.x + meadow.box.w + 300, y: meadow.box.y + 80 }, 420);
        stand("kite", 8117, { x: meadow.box.x + meadow.box.w + 1250, y: meadow.box.y + 330 }, 320);
    }

    // the moon and the rocket in the corner of the sky, as a map puts its sky, in the first view's corner
    if (o.sky && !narrow) {
        stand(
            "moon",
            8147,
            toWorld(o.sky, vp, { x: vp.w - 150, y: 150 }),
            360,
            { phase: 0.72 },
            "w",
        );
        stand("rocket", 8179, toWorld(o.sky, vp, { x: vp.w - 110, y: 235 }), 380);
    }

    // in the air last, over everything else: the paper plane on a slow, wide loop round the point
    if (light) {
        const c = { x: light.x + 1400, y: light.y + 1500 },
            R = { a: 2300, b: 1050 },
            tilt = -0.18;
        const at = (th: number): Pt => ({
            x: c.x + Math.cos(tilt) * R.a * Math.cos(th) - Math.sin(tilt) * R.b * Math.sin(th),
            y: c.y + Math.sin(tilt) * R.a * Math.cos(th) + Math.cos(tilt) * R.b * Math.sin(th),
        });
        const ring = Array.from({ length: 64 }, (_, k) => at((k / 64) * Math.PI * 2));
        if (ring.every(clear) && ring.some(inView))
            mover("paperplane", 8233, 420, { faces: 0, ...circling(at, 64, -2) }, { bank: -0.3 });
    }

    // and the balloon on the map's own wind, over the land between the meadow and the marsh's lake, clear
    // of the names on either side, faded in as it sets off and out past the lake, a minute into its crossing
    const north = lake ? Math.min(...lake.map((q) => q.y)) : cam.y,
        east = lake ? Math.max(...lake.map((q) => q.x)) : cam.x;
    const from = { x: (meadow ? meadow.box.x + meadow.box.w : cam.x) + 1600, y: north - 250 },
        to = east + 300;
    if (to - from.x > 2500 && clear(from) && inView(from)) {
        const wind = blown(T, from, to);
        mover(
            "balloon",
            8101,
            480,
            {
                faces: 1,
                upright: true,
                period: wind.secs,
                start: 60,
                pose: (t) => {
                    const p =
                        wind.at[Math.min(wind.at.length - 1, Math.max(0, Math.floor(t / 0.25)))] ??
                        from;
                    return {
                        p,
                        angle: 0,
                        dir: 1,
                        o: Math.max(0, Math.min(1, t / 4, (to - p.x) / 900)),
                    };
                },
            },
            undefined,
            "h",
        );
    }
    return out;
}

/**
 * Runs the map's life: each traveller's round as keyframes on the compositor, from the page's own
 * clock, so a life built again after a resize carries on from where it was. The drawings' own idles
 * (the lighthouse's light, the lit lanterns, the heron, the kites) go through the shared animation
 * module, which rests them at the same times and does nothing under reduced motion. A new size builds
 * the life again, since the camera has moved, and so does `rebuild`, for a camera the page has moved
 * itself.
 */
export function runLife(o: {
    layer: HTMLElement;
    host: HTMLElement;
    wake: HTMLElement;
    still: boolean;
    /** The map's group, which the lit lanterns, the lighthouse's light and what stands and idles play on. */
    idle: Group | null;
    build: () => Living;
}): { rebuild(): void; stop(): void } {
    const t0 = performance.now();
    let world = o.build();
    const place = () => {
        const sheet = document.createElement("style"),
            css: string[] = [],
            now = (performance.now() - t0) / 1000;
        for (const mv of world.movers) css.push(...drive(mv, now, o.still));
        sheet.textContent = css.join("");
        o.layer.append(sheet);
    };
    place();
    const motion = o.idle;
    const playing: Playing[] = [];
    const release = () => {
        for (const drawing of playing) drawing.stop();
        playing.length = 0;
    };
    const idle = () => {
        if (!motion) return;
        const lamps = Array.from(o.host.querySelectorAll<SVGSVGElement>(".ow-lamp.on svg.visual"));
        const point = o.host.querySelector<SVGSVGElement>(
            `.m-feat[data-art="lighthouse"] svg.visual`,
        );
        for (const svg of [...world.idle, ...lamps]) {
            const d = drawingOf(svg.getAttribute("data-visual") ?? ""),
                plays = d && playsOf(d);
            if (plays) playing.push(motion.play(svg, { motion: plays }));
        }
        if (point)
            playing.push(
                motion.play(point, {
                    motion: { anim: SWEEP, from: "drawing", reads: false, still: null },
                }),
            );
    };
    const wake = () => motion?.wake();
    if (!o.still && motion) {
        idle();
        o.wake.addEventListener("pointermove", wake);
    }
    let again = 0,
        stopped = false,
        size = `${o.host.clientWidth}x${o.host.clientHeight}`;
    const rebuild = (): void => {
        if (stopped) return;
        cancelAnimationFrame(again);
        again = requestAnimationFrame(() => {
            if (stopped) return;
            release();
            world = o.build();
            place();
            if (!o.still) idle();
        });
    };
    const resizing = new ResizeObserver(() => {
        const now = `${o.host.clientWidth}x${o.host.clientHeight}`;
        if (now === size) return;
        size = now;
        rebuild();
    });
    resizing.observe(o.host);
    return {
        rebuild,
        stop() {
            if (stopped) return;
            stopped = true;
            cancelAnimationFrame(again);
            resizing.disconnect();
            release();
            o.wake.removeEventListener("pointermove", wake);
            o.layer.replaceChildren();
        },
    };
}

/**
 * A traveller's round as keyframes on its element, `now` seconds into the page: its poses sampled
 * over one period, and its drawing's own float on top. Standing still, it is drawn where its round
 * begins. Returns the keyframe rules to add to the page.
 */
function drive(m: Mover, now: number, still: boolean): string[] {
    const above = m.faces === 0 && !m.upright,
        name = `m-go${(m.go.dataset.seed ??= String(Math.floor(Math.random() * 1e9)))}`;
    m.art.style.transformOrigin = "0 0";
    m.art.style.transform = `scale(${m.k.toFixed(4)}) translate(${-m.w / 2}px, ${-(above ? m.h / 2 : m.h)}px)`;
    const at = (t: number) => frameOf(m, m.pose(t));
    if (still) {
        const f = at(m.start);
        m.go.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) rotate(${f.r.toFixed(4)}rad) scaleX(${f.flip})`;
        m.go.style.opacity = f.o < 1 ? f.o.toFixed(3) : "";
        return [];
    }
    const n = Math.min(160, Math.max(24, Math.round(m.period / 1.5)));
    const css = [
        keyframesCss(
            name,
            sampled((t) => at(t), m.period, n),
        ),
    ];
    m.go.style.animation = `${name} ${m.period.toFixed(2)}s linear ${(-((m.start + now) % m.period)).toFixed(2)}s infinite`;
    // the float its drawing declares, about its own pivot, on an element of its own between the round and the drawing
    const bob = floatOf(m.key);
    if (bob && !m.upright) {
        const bn = `m-bob${Math.round(bob.lift)}-${Math.round(bob.deg * 10)}`;
        css.push(bobCss(bn, { lift: bob.lift * 2.4, deg: bob.deg }));
        const wrap = document.createElement("div");
        wrap.className = "m-bob";
        wrap.style.position = "absolute";
        wrap.style.transformOrigin = `0px ${(-m.h * m.k * (1 - bob.pivot)).toFixed(1)}px`;
        wrap.style.animation = `${bn} ${bob.period.toFixed(2)}s ease-in-out ${(-(now % (bob.period * 2))).toFixed(2)}s infinite alternate`;
        wrap.append(m.art);
        m.go.append(wrap);
    }
    return css;
}

/** A drawing's declared float, for the drift a traveller keeps on top of its round; null when it declares none. */
function floatOf(ref: string): { lift: number; deg: number; pivot: number; period: number } | null {
    const i = motionOf(ref)?.idle;
    return i?.kind === "float" && (i.lift || i.deg)
        ? { lift: i.lift ?? 0, deg: i.deg ?? 0, pivot: i.pivot ?? 1, period: i.period }
        : null;
}

const layer = (cls: string): HTMLDivElement => {
    const d = document.createElement("div");
    d.className = cls;
    return d;
};

/** A piece of the map painted once the camera comes near it, and only past `minZ` where it has one. */
export interface MapPiece {
    rect: Rect;
    minZ?: number;
    paint(): (() => void) | void;
}

/** A map drawn from its view into a page's world layer (overworld.tsx), and what the page moves on it. */
export interface MapPainted {
    /** Each place's button, by the place's index; null for a place a child's map draws nothing of. */
    nodes: (HTMLButtonElement | null)[];
    /** The guide's token, which the page tags while the guide travels. */
    token: HTMLElement;
    pieces: MapPiece[];
    /** Put the guide (and whoever walks behind it) at a point, facing a way. */
    place(at: Pt, facing: number): void;
    /** Put the guide in what travels the way it is on (a train on the rails, a boat on the water), or back on foot. */
    ride(kind: RoadKind | null): void;
    /** The colour spreading round the world the child is in, from before their last lesson to where it took them. */
    wash(): void;
    /** The first frame is all there: the day's doings play 450 ms on, when the map was painted with a day. */
    shown(): void;
    /** Start the drawings that travel the country for the camera the page holds, with `rebuild` for after the camera has moved on its own; nothing rides a map painted without `riders`. */
    life(cam: () => Camera): { rebuild(): void };
    /** The camera has settled at a new zoom: what moves is sized for it again. */
    rescale(): void;
    stop(): void;
}

const rectOf = (x: Element | DOMRect): DOMRect =>
    x instanceof Element ? x.getBoundingClientRect() : x;

/**
 * The map of the worlds painted from the view a page was given (school/worlds/view.ts works it out):
 * the ground and its washes from the view's country and reach, the places and the ways from its
 * places and ways, each world's drawings from its picture, and the guide. A place the view draws
 * nothing of has no button, so nothing past a child's edge is on their page. With `pause` the country
 * and the places are painted in tasks of their own, for a page that paints its first frame in steps
 * while a snapshot stands in for it; with `play`, that day's doings play once the page says the map
 * is shown; with `riders`, the drawings that travel the country ride it once the page starts them.
 */
export async function paintMapView(o: {
    host: HTMLElement;
    world: HTMLElement;
    view: MapView;
    still: boolean;
    pause?: () => Promise<void>;
    play?: string;
    riders?: { keepOff(): readonly (Element | DOMRect)[] };
    /** Screen pixels per world pixel, from the camera, for the size rule on what moves. */
    zoom?: () => number;
}): Promise<MapPainted> {
    const { host, world, still, view } = o;
    // one group for everything on the map that idles as its drawing declares: it settles half a
    // minute after the map is left alone and a pointer over it wakes it, and it knows the camera's zoom
    const idle = still ? null : animate({ intensity: "calm", settle: 30, most: 30, zoom: o.zoom });
    const L = {
        terrain: layer("j-layer m-terrain"),
        ground: layer("j-layer m-ground"),
        art: layer("j-layer m-art"),
        flags: layer("j-layer m-flags"),
        token: layer("j-layer m-tokens"),
        nodes: layer("j-layer m-nodes"),
    };
    // the drawings that travel the country go over the places and under their names
    const lifeLayer = layer("j-layer m-life");
    world.append(...Object.values(L));
    L.art.after(lifeLayer);
    const t = readTokens(host);
    const land = paintTerrain({ layer: L.terrain, host, t, view, still, idle });
    await o.pause?.();
    const painted = paintMap({ layers: L, host, t, view, still, play: o.play, idle });
    let washing = 0;
    let watching: IntersectionObserver | null = null;
    let living: ReturnType<typeof runLife> | undefined;
    return {
        nodes: painted.nodes.map((b): HTMLButtonElement | null => (b.hidden ? null : b)),
        token: painted.token,
        pieces: [
            ...land.pieces.map((p) => ({
                rect: p.rect,
                minZ: p.minZ,
                paint: () => {
                    const elements = p.paint();
                    if (elements.length) return () => land.release(elements);
                    return undefined;
                },
            })),
            ...painted.pieces.map((p) => ({
                rect: p.rect,
                paint: () => {
                    p.paint();
                },
            })),
        ],
        place: (at, facing) => painted.place(at, facing),
        ride: (kind) => painted.ride(kind),
        wash() {
            const f = view.reach.frontier;
            if (still || !f || f.to <= f.from) {
                land.setReach(view.reach);
                return;
            }
            const s: Spring = { hz: 0.9, zeta: 1 },
                end = settleTime(s, 0, 1, 0),
                t0 = performance.now();
            const step = (now: number) => {
                const time = Math.max(0, (now - t0) / 1000 - 0.25),
                    u = springAt(s, 0, 1, 0, time).x;
                land.setReach(reachAt(view.reach, f.from + (f.to - f.from) * Math.min(1, u)));
                if (time < end) washing = requestAnimationFrame(step);
                else land.setReach(view.reach);
            };
            land.setReach(reachAt(view.reach, f.from));
            washing = requestAnimationFrame(step);
        },
        shown() {
            if (o.play) painted.shown();
        },
        life(cam) {
            living?.stop();
            watching?.disconnect();
            const riders = o.riders;
            if (!riders) return { rebuild() {} };
            // what travels holds still while the map's box is off the screen
            watching = new IntersectionObserver(
                (es) => {
                    for (const e of es) host.classList.toggle("w-off", !e.isIntersecting);
                },
                { rootMargin: "120px" },
            );
            watching.observe(host);
            const narrow = matchMedia("(max-width: 700px)");
            const pane: MapWindow = {
                view,
                layer: lifeLayer,
                get cam() {
                    return cam();
                },
                get vp() {
                    return { w: host.clientWidth || 1, h: host.clientHeight || 1 };
                },
            };
            living = runLife({
                layer: lifeLayer,
                host,
                wake: host.parentElement ?? host,
                still,
                idle,
                build: () =>
                    life(pane, {
                        host,
                        cams: [cam()],
                        kind: "harbour",
                        keepOff: () => riders.keepOff().map(rectOf),
                        narrow: narrow.matches,
                        sky: cam(),
                    }),
            });
            return living;
        },
        rescale() {
            idle?.rescale();
        },
        stop() {
            cancelAnimationFrame(washing);
            land.stop();
            painted.stop();
            watching?.disconnect();
            living?.stop();
            idle?.dispose();
            lifeLayer.replaceChildren();
        },
    };
}
