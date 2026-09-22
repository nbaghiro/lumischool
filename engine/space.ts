// The infinite canvas as maths: the camera, zoom, the level of detail and the seeds that keep a
// drawing still, and the shapes of what the map and the journal draw: a world's picture, the map
// laid out, the ground under it, the roll of a year, and the views a page draws from them. Nothing
// here touches the page and nothing here reads a record, so school/worlds works the views out,
// engine/ui draws them, and the tests share the shapes.

import { U, type Marker } from "./paper";
import type { Kid } from "../server/db/schema";

export interface Pt {
    x: number;
    y: number;
}

export interface Size {
    w: number;
    h: number;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * The world point at the centre of the viewport and the zoom in screen pixels per world unit, so
 * resizing the window keeps the same thing in the middle. A world unit is the scene's user unit, `U`
 * to the square.
 */
export interface Camera {
    x: number;
    y: number;
    z: number;
}

export interface Limits {
    min: number;
    max: number;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function toScreen(c: Camera, vp: Size, p: Pt): Pt {
    return { x: (p.x - c.x) * c.z + vp.w / 2, y: (p.y - c.y) * c.z + vp.h / 2 };
}

export function toWorld(c: Camera, vp: Size, s: Pt): Pt {
    return { x: (s.x - vp.w / 2) / c.z + c.x, y: (s.y - vp.h / 2) / c.z + c.y };
}

/**
 * The camera that puts a box of the world on a box of the screen, both middles together and the
 * width matched. It is how one view picks a motion up where another left it: the map hands the box
 * its place ended on, and the world opens with its horizon there, so going in is one movement
 * (.docs/journal.md, the map's transitions). `on` is in the host's own pixels.
 */
/**
 * A camera part of the way from one to another, its zoom stepped geometrically so that going in or
 * pulling back reads at one speed however far it travels: halfway is half the zoom in doublings, not
 * half the numbers, which would race at the far end and crawl at the near one.
 */
export function cameraBetween(a: Camera, b: Camera, t: number): Camera {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z * (b.z / a.z) ** t,
    };
}

export function cameraOn(box: Rect, on: Rect, vp: Size): Camera {
    const z = on.w / box.w;
    return {
        x: box.x + box.w / 2 - (on.x + on.w / 2 - vp.w / 2) / z,
        y: box.y + box.h / 2 - (on.y + on.h / 2 - vp.h / 2) / z,
        z,
    };
}

/** The part of the world on screen, grown by margin screen pixels on every side. */
export function visibleRect(c: Camera, vp: Size, margin = 0): Rect {
    const w = (vp.w + margin * 2) / c.z;
    const h = (vp.h + margin * 2) / c.z;
    return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

/** A drag of dx, dy screen pixels: the paper follows the pointer. */
export const panBy = (c: Camera, dx: number, dy: number): Camera => ({
    x: c.x - dx / c.z,
    y: c.y - dy / c.z,
    z: c.z,
});

/** Zoom to z, keeping the world point under screen point s where it is. */
export function zoomAt(c: Camera, vp: Size, z: number, s: Pt): Camera {
    const p = toWorld(c, vp, s);
    return { x: p.x - (s.x - vp.w / 2) / z, y: p.y - (s.y - vp.h / 2) / z, z };
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Two fingers moved from `from` to `to`, in screen pixels. The zoom follows the change in spread and
 * the world point that was under the old midpoint ends up under the new one, so a pinch can also pan.
 */
export function pinch(c: Camera, vp: Size, from: [Pt, Pt], to: [Pt, Pt], limits: Limits): Camera {
    const spread = dist(to[0], to[1]) / Math.max(1, dist(from[0], from[1]));
    const z = clamp(c.z * spread, limits.min, limits.max);
    const p = toWorld(c, vp, mid(from[0], from[1]));
    const m = mid(to[0], to[1]);
    return { x: p.x - (m.x - vp.w / 2) / z, y: p.y - (m.y - vp.h / 2) / z, z };
}

/** The camera that shows r whole and centred, with pad screen pixels around it. */
export function fitRect(r: Rect, vp: Size, pad = 40, limits?: Limits): Camera {
    const z = Math.min((vp.w - pad * 2) / Math.max(1, r.w), (vp.h - pad * 2) / Math.max(1, r.h));
    return {
        x: r.x + r.w / 2,
        y: r.y + r.h / 2,
        z: limits ? clamp(z, limits.min, limits.max) : Math.max(z, 1e-3),
    };
}

/**
 * Keep the zoom in range and the content within reach. The centre may leave the content, but never
 * so far that less than `keep` screen pixels of it stay on screen, so nobody gets lost on blank paper.
 */
export function clampCamera(c: Camera, bounds: Rect, vp: Size, limits: Limits, keep = 80): Camera {
    const z = clamp(c.z, limits.min, limits.max);
    const gx = Math.max(0, vp.w / 2 - keep) / z;
    const gy = Math.max(0, vp.h / 2 - keep) / z;
    return {
        x: clamp(c.x, bounds.x - gx, bounds.x + bounds.w + gx),
        y: clamp(c.y, bounds.y - gy, bounds.y + bounds.h + gy),
        z,
    };
}

/**
 * The camera moved so a place covers the screen, give or take `slack` screen pixels at an edge, and
 * held to the place's middle along a side where the place is smaller than the screen. `clampCamera`
 * lets a hand drag on until 80 pixels are left, which is kind to a hand; this is where the camera
 * comes back to when the hand lets go, and where every move a page makes itself is aimed.
 */
export function keepIn(place: Rect, vp: Size, c: Camera, slack = 40): Camera {
    const axis = (v: number, from: number, len: number, view: number): number => {
        const half = view / (2 * c.z),
            s = slack / c.z;
        const lo = from + half - s,
            hi = from + len - half + s;
        return lo <= hi ? clamp(v, lo, hi) : from + len / 2;
    };
    return { x: axis(c.x, place.x, place.w, vp.w), y: axis(c.y, place.y, place.h, vp.h), z: c.z };
}

/**
 * Where to point from the edge of the screen at a world point off it, in screen pixels: `pad` in from
 * the edge on the line from the middle to the point, and the angle to it. Null while it is on screen.
 */
export function pointerTo(
    c: Camera,
    vp: Size,
    target: Pt,
    pad = 44,
): (Pt & { angle: number }) | null {
    const s = toScreen(c, vp, target);
    if (s.x > pad && s.x < vp.w - pad && s.y > pad && s.y < vp.h - pad) return null;
    const cx = vp.w / 2,
        cy = vp.h / 2,
        dx = s.x - cx,
        dy = s.y - cy;
    const k = Math.min(
        dx === 0 ? Infinity : (cx - pad) / Math.abs(dx),
        dy === 0 ? Infinity : (cy - pad) / Math.abs(dy),
    );
    return { x: cx + dx * k, y: cy + dy * k, angle: Math.atan2(dy, dx) };
}

/** The CSS transform that places a world-unit layer, with transform-origin 0 0, under this camera. */
export function cssTransform(c: Camera, vp: Size): string {
    return `translate(${vp.w / 2 - c.x * c.z}px, ${vp.h / 2 - c.y * c.z}px) scale(${c.z})`;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface Flight {
    at(t: number): Camera;
    ms: number;
}

/**
 * A smooth zoom and pan from a to b (van Wijk and Nuij, "Smooth and efficient zooming and panning",
 * 2003). A long trip zooms out, travels and zooms back in, so the child sees where they are going;
 * a short one is close to a straight glide. The duration follows the length of the path in that
 * perceptual metric, within limits.
 */
export function flight(a: Camera, b: Camera, vp: Size, rho = 1.3): Flight {
    const w0 = vp.w / a.z;
    const w1 = vp.w / b.z;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const r2 = rho * rho;
    const end = { ...b };
    let at: (s: number) => Camera;
    let S: number;
    if (d < 1e-6 * Math.max(w0, w1)) {
        S = Math.log(w1 / w0) / rho;
        at = (s) => ({
            x: a.x + dx * (s / (S || 1)),
            y: a.y + dy * (s / (S || 1)),
            z: vp.w / (w0 * Math.exp(rho * s)),
        });
    } else {
        const b0 = (w1 * w1 - w0 * w0 + r2 * r2 * d * d) / (2 * w0 * r2 * d);
        const b1 = (w1 * w1 - w0 * w0 - r2 * r2 * d * d) / (2 * w1 * r2 * d);
        const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
        const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
        S = (r1 - r0) / rho;
        at = (s) => {
            const u = (w0 / (r2 * d)) * (Math.cosh(r0) * Math.tanh(rho * s + r0) - Math.sinh(r0));
            return {
                x: a.x + u * dx,
                y: a.y + u * dy,
                z: vp.w / ((w0 * Math.cosh(r0)) / Math.cosh(rho * s + r0)),
            };
        };
    }
    const len = Math.abs(S);
    return {
        ms: len < 1e-6 ? 0 : clamp(len * 520, 260, 1150),
        at: (t) => (t <= 0 ? { ...a } : t >= 1 ? end : at(t * S)),
    };
}

interface WheelLike {
    deltaX: number;
    deltaY: number;
    deltaMode: number;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}

/**
 * Decide what a wheel event means. Trackpad pinches arrive with ctrlKey set, in every browser. A
 * mouse wheel moves in notches, line deltas or large whole-pixel steps with no sideways part, and
 * those zoom about the cursor as on a map. A trackpad scrolls in small, often fractional, two-axis
 * steps, and those pan. For a second after a trackpad is seen every wheel event is read as the
 * trackpad, so the fast tail of a flick does not suddenly zoom.
 */
export function readWheel(
    e: WheelLike,
    trackpadAt: number,
    now: number,
): { zoom: boolean; trackpadAt: number } {
    if (e.ctrlKey || e.metaKey) return { zoom: true, trackpadAt };
    if (e.deltaMode !== 0) return { zoom: !e.shiftKey, trackpadAt };
    const small = e.deltaX !== 0 || !Number.isInteger(e.deltaY) || Math.abs(e.deltaY) < 40;
    if (small || now - trackpadAt < 1000) return { zoom: false, trackpadAt: now };
    return { zoom: !e.shiftKey, trackpadAt };
}

/**
 * The zoom factor for one wheel event. The clamp keeps a mouse notch to one comfortable step, while a
 * pinch, which is many small deltas, stays smooth.
 */
export function wheelFactor(e: Pick<WheelLike, "deltaY" | "deltaMode">): number {
    const d = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    return 2 ** (-clamp(d, -40, 40) / 100);
}

/**
 * Grid line positions along one axis, in device pixels. `origin` is where world 0 lands and `step`
 * the spacing, both in device pixels. Each line is rounded on its own, so every line is sharp and the
 * rounding never adds up across the screen.
 */
export function gridLines(origin: number, step: number, length: number): number[] {
    if (step < 1) return [];
    const out: number[] = [];
    for (let v = origin - Math.floor(origin / step) * step; v < length; v += step) {
        out.push(Math.round(v));
    }
    return out;
}

export const intersects = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const grow = (r: Rect, dx: number, dy = dx): Rect => ({
    x: r.x - dx,
    y: r.y - dy,
    w: r.w + dx * 2,
    h: r.h + dy * 2,
});

export function union(rs: Rect[]): Rect {
    const x = Math.min(...rs.map((r) => r.x));
    const y = Math.min(...rs.map((r) => r.y));
    return {
        x,
        y,
        w: Math.max(...rs.map((r) => r.x + r.w)) - x,
        h: Math.max(...rs.map((r) => r.y + r.h)) - y,
    };
}

interface PaperLayer {
    step: number;
    alpha: number;
}

const ramp = (v: number, lo: number, hi: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

/**
 * The squared paper at this zoom: the 5 mm squares while they are big enough to read as squares,
 * and every fifth line once they are not, so far out the paper still looks squared rather than grey.
 */
export function paperLayers(z: number, sq = U): PaperLayer[] {
    const fine = ramp(sq * z, 3.5, 9);
    return [
        { step: sq, alpha: fine },
        { step: sq * 5, alpha: (1 - fine) * ramp(sq * 5 * z, 3.5, 9) },
    ];
}

/**
 * FNV-1a, 32 bit. Everything on the canvas seeds from its own id, so its sketch lines are the same on
 * every render and never move while the child pans or zooms.
 */
export function hash(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** mulberry32: a small deterministic generator, for layout jitter that must not move between runs. */
export function rand(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The journal's own distances. Close in, a child reads and writes; a step out, the days are pages
 * with their dates, which is flicking back through the book; further out still the roll is too long
 * to read as a picture, so it hands over to the map of every world (school/worlds/overworld.ts), which opens on
 * this year's three and steps out once more to all of them.
 */
export type RollLevel = "day" | "days" | "far";
export const DAY_AT = 0.42;
export const FAR_AT = 0.11;
export const MAP_AT = 0.028;

export function rollLevelOf(z: number, prev?: RollLevel): RollLevel {
    const h = 0.08;
    const day = prev === "day" ? DAY_AT * (1 - h) : DAY_AT * (1 + h);
    const far = prev === "far" ? FAR_AT * (1 + h) : FAR_AT * (1 - h);
    if (z >= day) return "day";
    if (z < far) return "far";
    return "days";
}

/** How much a label that has to stay readable grows as the child moves away, as a factor on its size. */
export const labelGrow = (z: number): number => Math.min(9, Math.max(1, 0.62 / Math.max(z, 1e-3)));

/** An element a loop knows is in a list. A read past the end is a bug in the caller, so it throws rather than answering undefined. */
export function at<T>(list: readonly T[], i: number): T {
    const v = list[i];
    if (v === undefined) throw new RangeError(`${i} is past the end of a list of ${list.length}`);
    return v;
}

export type Season = "spring" | "summer" | "autumn" | "winter";

/**
 * The sky over a world. Weather is a small set of drawn states, not a simulation. Mist lies in bands
 * over still water at dawn, and an aurora hangs curtains of light in a clear night sky.
 */
export type Weather =
    | "clear"
    | "cloudy"
    | "breezy"
    | "rain"
    | "snow"
    | "starry"
    | "mist"
    | "aurora"
    | "rays"
    | "drips"
    | "dew";

/**
 * How the ground is drawn: its texture in the margins and what runs along the horizon. A kind is
 * drawing work, so there are few of them; its colour is a choice, so a parent can change it. Each
 * world has a kind of its own, so no two worlds are the same ground in another colour.
 */
export type GroundKind =
    | "meadow"
    | "shore"
    | "yard"
    | "woods"
    | "town"
    | "tiles"
    | "boards"
    | "hill"
    | "field"
    | "snow"
    | "sea"
    | "jungle"
    | "lawn"
    | "reeds"
    | "park"
    | "canal"
    | "ice"
    | "furrows"
    | "crag"
    | "terraces"
    | "wildflowers"
    | "heath"
    | "sandstone"
    | "reef"
    | "cavern"
    | "cloudtop"
    | "dunes"
    | "ledges"
    | "litter"
    | "granite"
    | "workshop"
    | "hedges"
    | "cobbles"
    | "quay"
    | "machair"
    | "canopy"
    | "saltcrust"
    | "sinter";

/** How the way from one day to the next is drawn. */
export type PathKind =
    | "footpath"
    | "boardwalk"
    | "rails"
    | "stones"
    | "paving"
    | "rug"
    | "tape"
    | "stars"
    | "track"
    | "prints"
    | "buoys"
    | "lanterns"
    | "hopscotch"
    | "logs"
    | "staff"
    | "bricks"
    | "skates"
    | "ruts"
    | "flags"
    | "tilework"
    | "dabs"
    | "cairns"
    | "mosaic"
    | "shellway"
    | "arrows"
    | "puffs"
    | "tracks"
    | "trackway"
    | "anttrail"
    | "cards"
    | "cogs"
    | "letters"
    | "type"
    | "stamps"
    | "fence"
    | "walkway"
    | "heaps"
    | "planks";

/**
 * A deep sky, for the few worlds whose light is not daylight: a night, a dusk, a storm at sea, the
 * glow over a volcano, a snowy evening with the lights coming on, and a polar night on the cliffs. It
 * is drawn only above the horizon, from the sky palette in check.ts, and never within three squares
 * of a sheet or of anything written there, which is what lets it be dark.
 */
export type SkyTone =
    | "night"
    | "dusk"
    | "storm"
    | "ember"
    | "frost"
    | "polar"
    | "reef"
    | "cave"
    | "high"
    | "dawn"
    | "gloaming"
    | "canopy";

/** The light of a world: which markers wash the ground, the sky and the accents, and how strongly. */
export interface Light {
    ground: Marker;
    /** The sky at the top, or the wall in a world indoors. */
    sky: Marker;
    /** The sky just above the horizon, for a dusk or a night that is not one flat colour. */
    low?: Marker;
    /** The world's own colour where it touches the paper: the tape at a sheet's corners, today's glow. */
    accent: Marker;
    /** Wash strength as a share of the cap in check.ts, 0 to 1. The cap is what keeps paper white. */
    wash: number;
    /** A deep sky above the horizon instead of a wash, from the sky palette. The ground keeps the cap. */
    deep?: SkyTone;
}

/** What every world keeps to, so that a question stays readable; check.ts holds a world to them. */
export const LIMITS = {
    /** The strongest a ground or sky wash may be, as an opacity over squared paper. */
    washCap: 0.3,
    /** A child's tap target, in CSS pixels, on every control over the journal. */
    tap: 44,
    landmarks: 6,
    creatures: 4,
    /** The arrival line is read by a five year old, so it is short, and so is what a landmark says. */
    arriveWords: 8,
    /** Tape may cover a sheet's edge by this much in world units, which is inside the sheet's own padding. */
    tapeOverlap: 14,
    /** Paper kept clear round a sheet, in world units: nothing a world places comes closer than this. */
    clear: 60,
    /** Ink on a washed ground has to keep this contrast, which is WCAG's enhanced level. */
    contrast: 7,
} as const;

/**
 * The sky palette. The cap on washes exists to keep paper white and writing legible, and the sky
 * sits above both: nothing is written on it but a world's own name, and no sheet comes within three
 * squares of it. So above the horizon, and only there, a world may take a deep sky from this short
 * list, each a gradient from the top of the sky to the horizon, with the light ink its name is
 * written in. Everything below the horizon keeps the cap. The list is here, once, so a world cannot
 * bring a dark colour of its own, and the test checks every tone's ink against every colour of its
 * gradient where a name can sit.
 */
export const SKIES: Record<SkyTone, { stops: [number, string][]; ink: string; soft: string }> = {
    night: {
        stops: [
            [0, "#0E1638"],
            [0.55, "#18244F"],
            [1, "#34407A"],
        ],
        ink: "#FFF8E6",
        soft: "#F2EAD6",
    },
    dusk: {
        stops: [
            [0, "#231947"],
            [0.62, "#4A2A64"],
            [0.86, "#B0557A"],
            [1, "#F5B15C"],
        ],
        ink: "#FFF8E6",
        soft: "#F6EEDE",
    },
    storm: {
        stops: [
            [0, "#141C26"],
            [0.64, "#26323F"],
            [1, "#667787"],
        ],
        ink: "#FFF8E6",
        soft: "#F2EEE6",
    },
    ember: {
        stops: [
            [0, "#1F0F2B"],
            [0.62, "#4E1A2E"],
            [0.88, "#C24A2C"],
            [1, "#F29A3A"],
        ],
        ink: "#FFF8E6",
        soft: "#F6ECDD",
    },
    frost: {
        stops: [
            [0, "#18203F"],
            [0.62, "#2C3563"],
            [0.86, "#7A6C9C"],
            [1, "#DDAFB6"],
        ],
        ink: "#FFF8E6",
        soft: "#F2EEF4",
    },
    polar: {
        stops: [
            [0, "#06121C"],
            [0.62, "#0E2A38"],
            [0.88, "#1D5A63"],
            [1, "#4C958C"],
        ],
        ink: "#FFF8E6",
        soft: "#EEF4EE",
    },
    // the water over the reef is the one deep sky light at the top, so its name and pencil are dark
    reef: {
        stops: [
            [0, "#EEF9F8"],
            [0.62, "#BDE6EC"],
            [0.85, "#7CC3DA"],
            [1, "#4E9EC4"],
        ],
        ink: "#22262E",
        soft: "#3A404B",
    },
    cave: {
        stops: [
            [0, "#15132A"],
            [0.55, "#28244A"],
            [0.85, "#3B3663"],
            [1, "#56507E"],
        ],
        ink: "#FFF8E6",
        soft: "#F2EAD6",
    },
    high: {
        stops: [
            [0, "#142B63"],
            [0.62, "#223C7C"],
            [0.84, "#6E9FD6"],
            [1, "#E4F1FB"],
        ],
        ink: "#FFF8E6",
        soft: "#F2EEE6",
    },
    dawn: {
        stops: [
            [0, "#1E2458"],
            [0.62, "#3A3A7E"],
            [0.8, "#A97BAA"],
            [0.92, "#F2B3A6"],
            [1, "#FFDDA2"],
        ],
        ink: "#FFF8E6",
        soft: "#F6EEDE",
    },
    // the blue hour at sea over the lamp rocks, going to lavender and a last warm band on the water
    gloaming: {
        stops: [
            [0, "#101A3A"],
            [0.62, "#243462"],
            [0.8, "#5E5E96"],
            [0.93, "#B98FB5"],
            [1, "#F1C9B8"],
        ],
        ink: "#FFF8E6",
        soft: "#F2EEF4",
    },
    // green light under the treetops, going gold where the sun comes through at the canopy's edge
    canopy: {
        stops: [
            [0, "#0D241C"],
            [0.62, "#183E2D"],
            [0.84, "#5E8A4C"],
            [1, "#D9D98A"],
        ],
        ink: "#FFF8E6",
        soft: "#F2EEE6",
    },
};

/** A deep sky is laid over the squared paper a little short of solid, so the squares still show through it. */
export const SKY_OPACITY = 0.92;

/** The opacity a world's wash is drawn at: its share of the cap. */
export const washOf = (w: Pick<WorldPicture, "light">): number =>
    Math.max(0, Math.min(1, w.light.wash)) * LIMITS.washCap;

/**
 * A drawing placed along the horizon or up in the sky: `at` is how far across the world it stands,
 * 0 to 1, and `k` its size against its size in the world. Along the horizon `sink` is how far below
 * the line its foot is, in world units, for a boat that sits in the water; up in the sky `down` is how
 * far down from the top it hangs, 0 to 1. `flip` mirrors it, and `params` sets the drawing's own
 * numbers, so the same street of houses can stand twice along a horizon without being the same.
 */
export interface Placed {
    art: string;
    at: number;
    k?: number;
    sink?: number;
    down?: number;
    flip?: boolean;
    params?: Record<string, number>;
}

/**
 * The top of a world's stretch, drawn side on: the sky, a far row along the horizon, and the thing
 * you arrive at. It is the one part of a world that is a picture rather than a margin, and it is what
 * a world looks like from far away, so it is also the world's emblem on the shelf of worlds.
 */
export interface Horizon {
    far: Placed[];
    sky?: Placed[];
    /** Where you arrive: one drawing, placed beside the start of the path. */
    gate: string;
}

/**
 * A world as a chapter of the year's story (see .docs/story.md). Everything in it is shown because
 * of work done, and is worked out from the record each time rather than kept beside it: nothing here
 * is a count, a score or a thing that can be lost.
 */
export interface Chapter {
    /** What happens in this world, for the grown-up, in a sentence or two. */
    story: string;
    /**
     * The moment the child waits for. It is drawn in pencil at the foot of the world's stretch from the
     * first day, and inked on the day the last lesson of the world's term is finished. `before` is how
     * the world's gate looks until then, when the moment is something the gate does (a lamp that
     * lights, a rocket that goes).
     */
    moment: {
        art: string;
        says: string;
        params?: Record<string, unknown>;
        before?: Record<string, unknown>;
    };
    /** Something tucked away at the edge of the world, beside a finished day, found by wandering off the path. */
    secret: { art: string; says: string };
    /** A later world that can be seen from this one before the child gets there, by id. Its emblem stands on this horizon. */
    glimpse?: { world: string; art: string };
    /** How the map's way into this world is drawn: along a path, a road, rails, a river, or across the sea. */
    by: RoadKind;
    /**
     * What a child who rests on this world's horizon may see once in a visit: a drawing that crosses
     * along the horizon, drifts across the sky, rises out of it, streaks across it in a few seconds, or
     * comes out and fades away. Never announced, counted or kept (.docs/motion.md).
     */
    rare?: {
        art: string;
        way: "horizon" | "sky" | "rise" | "streak" | "appear";
        from?: "left" | "right";
        /** Its size against its size in a world, where it is drawn far off: the ship crossing the harbour's horizon. */
        k?: number;
        /**
         * For `appear`, the far drawing it comes out at, by its place in `horizon.far`, standing `up` of that
         * drawing's height above its foot: a robin on the kitchen window's sill, a kite in the laboratory's pane.
         */
        on?: { far: number; up: number };
    };
}

/**
 * A drawing standing in a world's place on the map of every world (.docs/overworld.md). `x` and `y`
 * are its foot, in world units from the middle of the place's 1500 by 980 box, where the guide
 * stands 430 below the middle.
 */
export interface Spot {
    art: string;
    x: number;
    y: number;
    /** Size against the drawing's size in a world. */
    k?: number;
    flip?: boolean;
    params?: Record<string, unknown>;
    /**
     * What the drawing is to the story. A gate is where the child arrives, a moment is what the term
     * waits for, life moves when its drawing declares a motion, and a secret is seen only close in.
     */
    is?: "gate" | "moment" | "life" | "secret";
    /** Where a moment stands once it has happened, when that is somewhere else: the kite up in the sky. */
    after?: { x: number; y: number; k?: number };
    /** A trail of smoke under it once its moment has happened: the rocket gone up. */
    trail?: true;
}

/** Marks a place draws under its drawings, for the few worlds whose ground is a shape of its own. */
export type MapDecor = "beach" | "rails" | "hill" | "track" | "storm" | "lawn" | "clouds";

/** How a world stands on the map: a few of its own drawings on the land round the middle of its place. */
export interface Composition {
    spots: Spot[];
    decor?: MapDecor;
    /** Where its stamp is pressed, clear of its tallest drawings. */
    stamp: { x: number; y: number };
    /** Where its name is lettered, when not under it: above, for a world whose neighbour's name is close below. */
    name?: { x: number; y: number; above?: boolean };
    /** It stands on an island of its own, which the map draws round it and a crossing by sea arrives at. */
    isle?: true;
    /** Past the edge of a child's map its tallest drawing is still drawn, faint: the island's smoke seen from the harbour. */
    promise?: true;
    /** Its moment is its own lantern, so no second lantern stands by the road into it. */
    ownLamp?: true;
}

/** How much larger than its composition a world's place is drawn, so the worlds are the loudest things on the map. */
export const PLACE_GROW = 1.28;

/** The kinds of way the map joins two worlds with. */
export type RoadKind = "path" | "road" | "rails" | "river" | "sea" | "air";

/**
 * The half of a world's declaration that is drawn: what the map and the roll need of it. The rest,
 * what a grown-up reads and chooses from, is `World` in school/worlds/types.ts, which extends this.
 */
export interface WorldPicture {
    id: string;
    /** What the child reads: "The meadow". Plain words, because a five year old reads it. */
    name: string;
    light: Light;
    /** A world inside a building: the sky is a wall, and the weather is what the window shows. */
    indoor?: boolean;
    ground: GroundKind;
    path: PathKind;
    horizon: Horizon;
    /** What stands beside the path, in the order the child passes it, by art id. */
    landmarks: string[];
    /** Who lives beside the path, by art id. */
    creatures: string[];
    weather: Weather;
    /** From the first day of the stretch to the last. A world with trees turns with them. */
    seasons: Season[];
    /** The guide design who lives here, by id from the shelf's guides. */
    guide: string;
    /** Its part in the year's story: the moment, the secret, and what it lets the child see ahead. */
    chapter: Chapter;
    /** How it stands on the map of every world: its own composition, or one laid out from its horizon (school/worlds/places.ts). */
    map: Composition;
    /** Whether its creatures move, after the family's choice. Reduced motion wins over this on the page. */
    motion: boolean;
    /** What the corpus has yet to give the world, for a grown-up's card where a world's lessons are still being written. */
    needs?: string;
}

export type WoodKind = "trees" | "firs" | "palms";

export interface MapNode {
    i: number;
    grade: number;
    term: number;
    world: string;
    /** The world's picture. */
    box: Rect;
    /** Where the guide stands at rest, at the foot of the picture, and where every way in and out ends. */
    stand: Pt;
}

export interface MapRoad {
    from: number;
    to: number;
    kind: RoadKind;
    /** SVG path data, from one world's foot to the next one's. */
    d: string;
    /** Points a stride apart along it, for drawing it and for travelling along it. */
    samples: Sample[];
}

/** A place off the run on the map: at its own site, joined by a way of its own to the world of the run it stands beside. */
export interface MapSide {
    /** Its index on the map, after every world of the run. */
    i: number;
    world: string;
    /** The year whose land it stands on and whose lessons it holds: a track's place is one per year. */
    grade: number;
    box: Rect;
    stand: Pt;
    /** The world of the run its way leaves from. */
    host: number;
    road: MapRoad;
}

export interface Overworld {
    nodes: MapNode[];
    roads: MapRoad[];
    sides: MapSide[];
    bands: { grade: number; rect: Rect }[];
    /**
     * The sea the map is drawn on and fenced to: the country with the open water beside it a viewer
     * may drag into (`SEA_SIDES` in school/worlds/geography.ts).
     */
    bounds: Rect;
    /**
     * The country itself, without that water: what a map opens on and what its zoom floor is worked
     * out from, so the extra sea gives room to drag without drawing the lands any smaller.
     */
    core: Rect;
}

/** A place on the map by its index: a world of the run, or after them a place off it. */
export const nodeAt = (map: Overworld, i: number): MapNode | MapSide | undefined =>
    map.nodes[i] ?? map.sides[i - map.nodes.length];

/** A point part of the way along a road, and which way the road is heading there. */
export function along(road: MapRoad, f: number): Pt & { dx: number } {
    const s = road.samples,
        n = s.length;
    if (!n) return { x: 0, y: 0, dx: 1 };
    const i = Math.max(0, Math.min(n - 1, Math.round(Math.max(0, Math.min(1, f)) * (n - 1))));
    const q = at(s, i);
    // the direction along a road is the normal turned back a quarter
    return { x: q.x, y: q.y, dx: q.ny >= 0 ? 1 : -1 };
}

/**
 * Where a page aims the map behind its cards: a place on it, the child's own unless another is
 * named, or a point `along` the road from it toward the next place (or `toward` another), moved by
 * `nudge` of the map's units, and put at a share `at` of the band across and down, with `across` of
 * the map's units across the box.
 */
export interface MapAim {
    place?: string;
    along?: number;
    toward?: string;
    nudge?: Pt;
    at?: Pt;
    across: number;
}

/**
 * How far past a place's box its ground is drawn, in map units: the pad of the patch under it
 * (school/worlds/terrain.ts), which is what the eye reads as the place.
 */
export const GROUND_PAD = 360;

/** What an aim looks at: the point, with the aimed place's drawn size, and where the place stands when the point is not on it. */
export interface AimedAt extends Rect {
    /** The middle of the aimed place when the point is along a road away from it; the point itself otherwise. */
    place?: Pt;
}

/**
 * The point an aim looks at on a laid-out map, before its nudge, as `x` and `y`, with the size of the
 * aimed place as drawn, its box with its ground, as `w` and `h`, which the camera keeps clear of
 * whatever stands over the map, and, when the point is along a road away from the place, the place's
 * middle as `place`, since the camera keeps the place itself in the window. A place the map does not
 * have reads as the first; null on a map with no place at all.
 */
export function aimedAt(
    map: Overworld,
    here: number | null,
    aim: Pick<MapAim, "place" | "along" | "toward">,
): AimedAt | null {
    const i = aim.place
        ? Math.max(
              0,
              map.nodes.findIndex((n) => n.world === aim.place),
          )
        : (here ?? 0);
    const node = map.nodes[i];
    if (!node) return null;
    const mid: Pt = { x: node.box.x + node.box.w / 2, y: node.box.y + node.box.h / 2 };
    let p = mid;
    if (aim.along) {
        const j = aim.toward ? map.nodes.findIndex((n) => n.world === aim.toward) : i + 1;
        const road = map.roads.find(
            (r) => (r.from === i && r.to === j) || (r.from === j && r.to === i),
        );
        if (road) p = along(road, road.from === i ? aim.along : 1 - aim.along);
    }
    return {
        x: p.x,
        y: p.y,
        w: node.box.w + 2 * GROUND_PAD,
        h: node.box.h + 2 * GROUND_PAD,
        ...(p === mid ? {} : { place: mid }),
    };
}

export type Arrow = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

/**
 * Where an arrow key goes from a world: along a road, to whichever of the worlds either side of it on
 * the run lies that way on the map, and only to a place `may` allows, which the page passes as the
 * places its viewer may travel to, so a place drawn but shut never takes the arrow. Null when no road
 * leads that way, which the page says aloud rather than moving the map, so the arrows only ever travel.
 */
export function neighbour(
    map: Overworld,
    from: number,
    key: Arrow,
    may: (i: number) => boolean = () => true,
): number | null {
    const a = nodeAt(map, from);
    if (!a) return null;
    const want: Record<Arrow, Pt> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
    };
    // along the run either way, and out along the way to a place off it; from a place off the run, back to where its way leaves
    const off = map.sides[from - map.nodes.length],
        ways = off
            ? [off.host]
            : [from - 1, from + 1, ...map.sides.filter((s) => s.host === from).map((s) => s.i)];
    let best: number | null = null,
        score = 0.35;
    for (const j of ways) {
        const b = nodeAt(map, j);
        if (!b || !may(j)) continue;
        const dx = b.stand.x - a.stand.x,
            dy = b.stand.y - a.stand.y,
            L = Math.hypot(dx, dy) || 1;
        const dot = (dx * want[key].x + dy * want[key].y) / L;
        if (dot > score) {
            score = dot;
            best = j;
        }
    }
    return best;
}

/** What the ground round a world's picture is. */
export type PatchKind =
    | "fields"
    | "sand"
    | "embankment"
    | "woods"
    | "garden"
    | "streets"
    | "heather"
    | "pitch"
    | "grounds"
    | "snow"
    | "water"
    | "jungle";

export interface Patch {
    node: number;
    kind: PatchKind;
    marker: Marker;
    outline: Pt[];
}

export interface Feature {
    art: string;
    at: Pt;
    k: number;
    flip?: boolean;
    on: "land" | "sea";
    /** A part of it that turns, and the seconds a revolution takes, until the drawing declares it (.docs/animation.md). */
    turning?: { part: string; rev: number };
}

export interface Terrain {
    /** The map's own bounds, grown so the land and the sea run on past the edge the camera stops at. */
    bounds: Rect;
    /** Every coast on the map as a closed ring, densely sampled: the land is inside them; the sea is everywhere else. */
    lands: Pt[][];
    /** The stretches of a way over land that cross the sea, as sample indices: a bridge. */
    spans: { road: number; from: number; to: number }[];
    /** Rivers, from spring to mouth. */
    rivers: Pt[][];
    /** Lakes inland, drawn like the sea. */
    lakes: Pt[][];
    /** The ground round each world's picture, in that world's colour. A world at sea has none. */
    patches: Patch[];
    /** Land out in the sea: the island a world stands on. */
    isles: { node: number; outline: Pt[]; peak: Pt }[];
    /** Buildings round the worlds that are indoors, whose picture is their window. */
    buildings: { node: number; kind: "cottage" | "hall"; rect: Rect }[];
    /** A few things standing in the land and on the water, from the shelf. */
    features: Feature[];
    /** Where a way crosses a river. */
    bridges: { road: number; at: Pt; angle: number }[];
    /** What each way passes, in words, for the page to say as the guide walks it. */
    crossings: string[];
    /** The same, for walking each way the other way round. */
    back: string[];
    /** What the way to each place off the run passes, going there and coming back. */
    spurs: string[];
    spursBack: string[];
}

/**
 * How far the child has come, as soft circles. `circles` is the land washed and inked: a world with
 * work in it and the land round it, the ways gone along, a finished year's worlds and the land between
 * them, and round the world the child is in a reach that grows with the share of its lessons finished
 * and creeps a little along the way ahead. `known` is the land a child's map draws at all, in pencil
 * past the colour: everything reached, and the next world, drawn in as the child gets nearer to it.
 * Beyond it the map is plain squared paper. A grown-up's map draws everything and ignores it.
 */
export interface Circle {
    x: number;
    y: number;
    r: number;
}

export interface MapReach {
    circles: Circle[];
    /** The worlds standing on islands of their own that have been reached, by node: their islands are washed rather than left in pencil. */
    isles: number[];
    /**
     * The world the child is in, the share of its lessons finished before and after the last one, and
     * what grows with that share, which `circles` and `known` hold at `to` and `reachAt` rebuilds at
     * any share between: the circle round the world, from `r0` at nought to `r1` at one; the circles
     * along the way ahead, each there once the share reaches `at`; and on a child's map the pencil
     * round the next world, or null on a grown-up's, whose map knows everything.
     */
    frontier: {
        node: number;
        from: number;
        to: number;
        here: Grown;
        ahead: (Circle & { at: number })[];
        next: Grown | null;
    } | null;
    /** The land a child's map draws at all; null when everything is drawn. */
    known: Circle[] | null;
    /** The furthest world a child's map draws: one past the furthest reached. */
    edge: number;
    /** Lands every one of whose worlds is finished, coloured out to their coasts. */
    whole: Pt[][];
}

/** A circle whose radius grows with the frontier's share, from `r0` at nought to `r1` at one. */
interface Grown {
    x: number;
    y: number;
    r0: number;
    r1: number;
}

/** How far the child has come at a share `k` of their world's lessons, for the colour washing out over the land the last lesson reached as the map opens. */
export function reachAt(r: MapReach, k: number): MapReach {
    const f = r.frontier;
    if (!f) return r;
    const grown = (g: Grown): Circle => ({ x: g.x, y: g.y, r: g.r0 + (g.r1 - g.r0) * k });
    const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;
    const along = (c: Circle, by: number) => f.ahead.some((a) => same(a, c) && a.r + by === c.r);
    const ahead = f.ahead.filter((a) => a.at <= k).map(({ x, y, r: rad }) => ({ x, y, r: rad }));
    const circles = [
        ...r.circles.filter((c) => !same(c, f.here) && !along(c, 0)),
        grown(f.here),
        ...ahead,
    ];
    const known = r.known && [
        ...r.known.filter(
            (c) => !same(c, f.here) && !along(c, KNOWN_PAST) && !(f.next && same(c, f.next)),
        ),
        { ...grown(f.here), r: grown(f.here).r + KNOWN_PAST },
        ...ahead.map((c) => ({ ...c, r: c.r + KNOWN_PAST })),
        ...(f.next ? [grown(f.next)] : []),
    ];
    return { ...r, circles, known };
}

/** How far past the colour a child's map draws the land in pencil, round every circle of the reach. */
export const KNOWN_PAST = 900;

/**
 * Poses sampled from a pose function over one period, with a frame repeated wherever it turns to face
 * the other way, so it never squashes flat, and its turn unwound, so it never spins back the long way.
 */
export function sampled(
    pose: (t: number) => Omit<LifeFrame, "at">,
    period: number,
    n: number,
): LifeFrame[] {
    const out: LifeFrame[] = [];
    let last: LifeFrame | undefined;
    for (let i = 0; i <= n; i++) {
        const q = pose((i / n) * period);
        const r = last ? last.r + Math.atan2(Math.sin(q.r - last.r), Math.cos(q.r - last.r)) : q.r;
        const f: LifeFrame = { at: i / n, x: q.x, y: q.y, r, flip: q.flip, o: q.o };
        if (last && last.flip !== f.flip)
            out.push({ ...last, at: last.at + 0.25 / n, flip: f.flip });
        out.push(f);
        last = f;
    }
    return out;
}

/** The country as map.ts draws it over the terrain: its woods, hills, mountains and fields, its labels and its furniture. */
export interface Land {
    coasts: Pt[][];
    woods: { at: Pt; rx: number; ry: number; kind: WoodKind }[];
    hills: { from: Pt; to: Pt; n: number }[];
    peaks: { from: Pt; to: Pt; n: number }[];
    /** Fields as patchwork: four-sided plots, each with its furrows. */
    fields: Pt[][];
    /** The map's furniture: where its title, its key and its compass rose stand in the sea. */
    title: Pt;
    key: Pt;
    compass: Pt;
}

/** The washes the map lays over the ground and the water, as shares of the cap on washes. */
export const TERRAIN_WASH = { land: 0.7, patch: 0.6, sea: 0.85, isle: 0.8, river: 0.9 } as const;
/** The land between the worlds is green country; the sea is the palette's sky. */
export const LAND: Marker = "mint";
export const SEA: Marker = "sky";

/** A closed outline through points, smoothed and sampled densely enough to draw or to test against. */
export function smooth(pts: Pt[], closed = true, per = 8): Pt[] {
    const n = pts.length,
        out: Pt[] = [];
    const pt = (i: number) => at(pts, closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i)));
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
        const p0 = pt(i - 1),
            p1 = pt(i),
            p2 = pt(i + 1),
            p3 = pt(i + 2);
        for (let k = 0; k < per; k++) {
            const t = k / per,
                t2 = t * t,
                t3 = t2 * t;
            out.push({
                x:
                    0.5 *
                    (2 * p1.x +
                        (-p0.x + p2.x) * t +
                        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                y:
                    0.5 *
                    (2 * p1.y +
                        (-p0.y + p2.y) * t +
                        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
            });
        }
    }
    if (!closed) out.push(at(pts, n - 1));
    return out;
}

export function inside(poly: Pt[], p: Pt): boolean {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = at(poly, i),
            b = at(poly, j);
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
            hit = !hit;
    }
    return hit;
}

export const near = (poly: Pt[], p: Pt, by: number) =>
    poly.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < by);

/** A ring's box, worked out once, so a point far from a land is not tested against its whole coast. */
const BOXES = new WeakMap<Pt[], Rect>();
function boxOf(ring: Pt[]): Rect {
    const had = BOXES.get(ring);
    if (had) return had;
    const x0 = Math.min(...ring.map((q) => q.x)),
        y0 = Math.min(...ring.map((q) => q.y));
    const r = {
        x: x0,
        y: y0,
        w: Math.max(...ring.map((q) => q.x)) - x0,
        h: Math.max(...ring.map((q) => q.y)) - y0,
    };
    BOXES.set(ring, r);
    return r;
}
const within = (ring: Pt[], p: Pt) => {
    const b = boxOf(ring);
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h && inside(ring, p);
};

/** Whether a point is water: sea, which is wherever no land is, or a lake. */
export function wet(t: Terrain, p: Pt): boolean {
    if (t.lakes.some((l) => within(l, p))) return true;
    return !t.lands.some((l) => within(l, p));
}

/** A land's inside as squares of the paper, worked out once per coast, so asking about a point is a lookup. */
const CELL = 200;
const CELLS = new WeakMap<Pt[], Set<string>>();
function cellsOf(ring: Pt[]): Set<string> {
    const had = CELLS.get(ring);
    if (had) return had;
    const out = new Set<string>();
    const x0 = Math.min(...ring.map((q) => q.x)),
        x1 = Math.max(...ring.map((q) => q.x)),
        y0 = Math.min(...ring.map((q) => q.y)),
        y1 = Math.max(...ring.map((q) => q.y));
    for (let x = Math.floor(x0 / CELL); x <= Math.ceil(x1 / CELL); x++)
        for (let y = Math.floor(y0 / CELL); y <= Math.ceil(y1 / CELL); y++) {
            if (inside(ring, { x: (x + 0.5) * CELL, y: (y + 0.5) * CELL })) out.add(`${x},${y}`);
        }
    CELLS.set(ring, out);
    return out;
}
const inWhole = (r: MapReach, p: Pt) =>
    r.whole.length > 0 &&
    r.whole.some((ring) =>
        cellsOf(ring).has(`${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`),
    );

/**
 * The circles of a reach bucketed into squares of RING, each in every square its circle grown by
 * DEEPEST covers, so asking about a point looks at the few circles near it. A depth past DEEPEST
 * would miss circles, and nothing asks for one.
 */
const RING = 1600,
    DEEPEST = 1.25;
const RINGS = new WeakMap<Circle[], Map<string, Circle[]>>();
function circlesNear(cs: Circle[], p: Pt): Circle[] {
    let grid = RINGS.get(cs);
    if (!grid) {
        const made = new Map<string, Circle[]>();
        for (const c of cs) {
            const e = c.r * DEEPEST;
            for (let x = Math.floor((c.x - e) / RING); x <= Math.floor((c.x + e) / RING); x++)
                for (let y = Math.floor((c.y - e) / RING); y <= Math.floor((c.y + e) / RING); y++) {
                    const key = `${x},${y}`,
                        cell = made.get(key);
                    if (cell) cell.push(c);
                    else made.set(key, [c]);
                }
        }
        RINGS.set(cs, made);
        grid = made;
    }
    return grid.get(`${Math.floor(p.x / RING)},${Math.floor(p.y / RING)}`) ?? [];
}

/** Whether a point is inside the reach, far enough in to be washed rather than on its soft edge. */
export const reached = (r: MapReach, p: Pt, depth = 0.75) =>
    circlesNear(r.circles, p).some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r * depth) ||
    inWhole(r, p);
/** Whether a child's map draws a point at all; a grown-up's draws everything. */
export const known = (r: MapReach, p: Pt, depth = 0.8) =>
    !r.known ||
    circlesNear(r.known, p).some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r * depth) ||
    inWhole(r, p);

/** Whether a point is on the map's land: inside a coast, and not in a lake. */
export const onLand = (t: Terrain, p: Pt): boolean => !wet(t, p);

/**
 * What the map as a poster shows: the country the child has walked, and the start of the next world
 * at its edge, where the sheet's own fade takes it back to paper. The rest is not on it yet.
 */
export function walkedCrop(map: Overworld, reach: MapReach): Rect {
    const pts: Pt[] = [];
    for (const c of reach.circles)
        pts.push(
            { x: c.x - c.r * 0.7, y: c.y - c.r * 0.7 },
            { x: c.x + c.r * 0.7, y: c.y + c.r * 0.7 },
        );
    for (const ring of reach.whole) pts.push(...ring);
    const last = map.nodes[reach.edge - 1],
        next = map.nodes[reach.edge];
    if (last && next && reach.edge > 0) {
        const a = { x: last.box.x + last.box.w / 2, y: last.box.y + last.box.h / 2 },
            b = { x: next.box.x + next.box.w / 2, y: next.box.y + next.box.h / 2 };
        pts.push({ x: a.x + (b.x - a.x) * 0.9, y: a.y + (b.y - a.y) * 0.9 });
    }
    if (!pts.length) return map.bounds;
    const B = map.bounds,
        x0 = Math.max(B.x, Math.min(...pts.map((q) => q.x))),
        y0 = Math.max(B.y, Math.min(...pts.map((q) => q.y)));
    const x1 = Math.min(B.x + B.w, Math.max(...pts.map((q) => q.x))),
        y1 = Math.min(B.y + B.h, Math.max(...pts.map((q) => q.y)));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export interface RollOptions {
    /** Sheet width: 42 squares, the printed page, or 19 on a phone, where the lesson reflows. */
    sheet: number;
    /** World either side of the column. */
    margin: number;
    /** The strip above a day's sheets where the path crosses and the date is written. */
    band: number;
    /** A world's arrival, side on. */
    horizon: number;
    /** Between two sheets on the same day. */
    gap: number;
    /** How far the path runs from a sheet's edge. */
    lane: number;
}

export type DayState = "done" | "today";

export interface Day {
    /** Stable across visits: the first lesson of the day names it, so working stays attached to it. */
    id: string;
    n: number;
    term: number;
    lessons: string[];
    state: DayState;
    /** ISO date, from the plan's week. The scheduler owns the real calendar; this is its stand-in. */
    date: string;
}

export interface Next {
    id: string;
    title: string;
    term: number;
}

export interface Row {
    day: Day;
    world: string;
    /** The whole row, band and sheets. */
    rect: Rect;
    sheets: Rect[];
    /** The margin the path runs down beside this day: -1 left, 1 right. */
    side: -1 | 1;
    /** Where the date is written, in the band above the sheets. */
    flag: Pt;
}

export interface Stretch {
    term: number;
    world: string;
    /** The side-on arrival at the top of the stretch. */
    horizon: Rect;
    /** Where the horizon line runs, inside the horizon rect. */
    line: number;
    /** The ground under the days, from the horizon line to the end of the stretch. */
    ground: Rect;
    /** A world the child has not reached: only its horizon is drawn, and a little ground. */
    ahead: boolean;
    /** The first point of the path in this stretch, where the gate stands. */
    start: Pt;
    /** In a world with no lessons yet, where the roll says so, in the column the sheets would stand in. */
    card?: Rect;
}

/**
 * A drawing beside the path. A `reach` is a landmark or creature placed beside the day whose lesson it
 * belongs to, level with the top of that day's sheet, with the line it says.
 */
export interface Scenery {
    art: string;
    /**
     * A `moment` is the world's moment, at the foot of its stretch, drawn in pencil until the term is
     * finished. A `secret` is the thing tucked away at the edge of the world beside its third day.
     */
    kind: "landmark" | "creature" | "reach" | "moment" | "secret";
    at: Pt;
    side: -1 | 1;
    row: number;
    says?: string;
    /** Drawn at this share of its size, to fit where it stands. */
    k?: number;
    /**
     * In a world with no lessons yet there are no days for a drawing to stand beside, so it names its
     * world, and how far down the stretch it stands (0 to 1) for its season, itself; `row` is then -1.
     */
    world?: string;
    along?: number;
}

/**
 * How the record has left one drawing beside the path: a landmark lit by a finished lesson, a moment
 * inked, a secret there to be found or not yet. view.ts works it out from the record; paint.ts only draws it.
 */
export interface Standing {
    hide?: boolean;
    lit?: boolean;
    inked?: boolean;
    /** The day a lit reach was lit or an inked moment inked, which is the day its doings play on. */
    on?: string;
    params?: Record<string, unknown>;
    says?: string;
    note?: string;
}

export interface RollLayout {
    o: RollOptions;
    rows: Row[];
    stretches: Stretch[];
    /** The path, one piece per stretch, as SVG path data in world units and as points a stride apart. */
    path: { world: string; d: string; ahead: boolean; samples: Sample[] }[];
    /** The closed sheet for what comes next, under today. */
    next: Rect | null;
    scenery: Scenery[];
    /** Everything drawn: what the whole year fits. */
    bounds: Rect;
    /** The world's edges either side, which the camera is kept within. */
    x0: number;
    x1: number;
    /** A roll of worlds with no lessons yet: no days, no sheets, and the ground runs across the middle. */
    bare?: boolean;
}

/** How far a world's washes run past the roll's edges before they fade into plain paper. */
export const BLEED = 900;
/** How much of the washes' width, at each side, is the fade into plain paper. */
export const FADE = 0.2;

/** A point along the path with the direction across it, and how far along the path it is. */
export interface Sample {
    x: number;
    y: number;
    nx: number;
    ny: number;
    s: number;
}

/**
 * How tall a piece of a world's ground is painted at a time. The painter draws a tile's stretch of
 * path from the samples whose y falls in it, so a world's trail keeps one run across to a tile.
 */
export const TILE = 1400;

/**
 * How a day stands on its world's trail: done, today, the next day, which is closed, or a day further
 * on, which a child's trail does not draw yet.
 */
export type StopState = "done" | "today" | "next" | "ahead";

/** A day of a term as a stop on its world's trail, placed by its number in the term and never by its sheets. */
export interface Stop {
    /** The day's id on the roll, so a stop and its row are one day; a day not reached yet is named by what it will hold. */
    key: string;
    state: StopState;
    /** A day still to come holds none until it is today, and the next day holds the lesson the roll closes for it. */
    lessons: string[];
    /** The day it was done or is planned for; null for a day still to come. */
    date: string | null;
    at: Pt;
    /** How far along the trail. */
    s: number;
    /**
     * The box the day's paper fills, above the trail and clear of the run above: its postcard stands
     * in it until the paper arrives, and the paper is drawn into the same box, so nothing moves when
     * it lands. The day's number decides it and the height of its sheets never does.
     */
    paper: Rect;
}

/**
 * A world's term laid out as a place (.docs/journal.md, "A world as a place"): a trail through the
 * world's own land with a stop for each day of the term, laid out once for the whole term, so a stop,
 * a landmark and the moment stay where they are however tall a sheet grows and however many days are
 * done. school/worlds/trail.ts lays it out.
 */
export interface TrailLayout {
    /**
     * The place as the painters read a world: one stretch of a roll with no column, whose path is the
     * trail as far as it is drawn and whose scenery is what stands in the place. Its bounds are the
     * place, which the camera is kept in.
     */
    land: RollLayout;
    stops: Stop[];
    /** One per scenery of the land: the stop a drawing stands beside, or -1 for the place's own. */
    beside: number[];
    /** The whole trail, from where it starts under the horizon to the moment at its end, a stride apart. */
    samples: Sample[];
    start: Pt;
    end: Pt;
    /** Along the trail: its whole length, as far as the child has walked, and as far as it is drawn. */
    length: number;
    walked: number;
    drawn: number;
    /** How far down the place its land is drawn before it fades to paper, past the next day. */
    known: number;
    /** Between two stops along the trail. */
    step: number;
}

/** The stop nearest a point within `by`, leaving out the days a child's trail does not draw. */
export function stopNear(stops: readonly Stop[], p: Pt, by: number): Stop | null {
    let best: Stop | null = null,
        d = by;
    for (const s of stops) {
        if (s.state === "ahead") continue;
        const e = Math.hypot(s.at.x - p.x, s.at.y - p.y);
        if (e < d) {
            d = e;
            best = s;
        }
    }
    return best;
}

/**
 * A place on the map as a page draws it. Its state is what the record says of it: finished, where the
 * child is, begun and left for later, the next world along (in pencil on a child's map), behind the
 * child with nothing done in it (a world of a year before the one they began in, in pencil too), or
 * ahead of the next, which a child's map leaves as paper. A place off the run that no lesson has
 * brought the child to yet is hidden. `open` is whether this page's viewer may travel there, land
 * there or go in, which the viewer's limits decide, never the state alone.
 */
export type PlaceState = "done" | "here" | "begun" | "next" | "behind" | "ahead" | "hidden";

/** What a page shows and reads of a place: nothing of it is on a child's page for a place past the paper's edge. */
export interface PlaceShown {
    world: string;
    name: string;
    /** The day of the first lesson finished here, and the day its moment happened. */
    stamp: string | null;
    moment: string | null;
    /** The landmarks lit, each with the day its lesson lit it, and the creatures walking behind the guide, by drawing id. */
    lit: { art: string; on: string }[];
    followers: string[];
    /** What its button says to a screen reader, and what a grown-up reads under it. */
    label: string;
    notes: string[];
    /** When the world stands, lettered under its name for a grown-up: "Year 1, term 2", or a place's "Sea life and arrays, every year". Empty on a child's map. */
    when: string;
}

/**
 * How a world draws one of the shelf's drawings, by the art id a world names it with
 * (school/worlds/art.ts): the shelf's own name for it, where it is from, its size in a world against
 * its size in a question, its numbers, and the older movement a world's art list gave it.
 */
export interface ArtRef {
    /** What a grown-up reads in the picker. */
    title: string;
    /** The parts of a world it may play. */
    roles: readonly ("horizon" | "sky" | "gate" | "landmark" | "creature")[];
    /** A coded drawing on the shelf, a hand-drawn file by its name, or one of the few drawings only a world needs. */
    from: "shelf" | "file" | "world";
    ref: string;
    params?: Record<string, unknown>;
    scale: number;
    /** How a creature moves when motion is on, until its drawing declares its own. Landmarks never move. */
    moves?: "bob" | "sway" | "hop";
}

/**
 * The name a page loads a world's drawing under (engine/ui/drawings.ts): a coded drawing by the
 * shelf's name for it, and a hand-drawn file by its file name kept apart, since a file and a coded
 * drawing may share a name (the harbour's sailing boat, drawn by hand, and the shelf's boat to load).
 */
export const artKey = (a: Pick<ArtRef, "from" | "ref">): string =>
    a.from === "file" ? `file:${a.ref}` : a.ref;

/** A pose on a life's round: a share of its period, a point, a turn in radians, which way it faces and how visible it is. */
export interface LifeFrame {
    at: number;
    x: number;
    y: number;
    r: number;
    flip: 1 | -1;
    o: number;
}

/**
 * One of the country's small lives as the map draws it (school/worlds/life.ts): what it is, where it
 * stands or goes round, its round as poses over one period, and the float it declares standing still.
 */
export interface MapLife {
    /** The same for the same thing in the same place every time. */
    key: number;
    art: string;
    params?: Record<string, unknown>;
    /** Its longer side on the map, in world units. */
    size: number;
    /** Where it stands, or the middle of the loop it goes round. */
    at: Pt;
    path: Pt[];
    pencil: boolean;
    /** A doodle in the margin rather than a thing in the country, so always in pencil. */
    doodle: boolean;
    /** Whether it casts a soft shadow on the ground under it. */
    shade: boolean;
    /** What goes with it, behind and a little to one side, in world units. */
    follow: {
        art: string;
        params?: Record<string, unknown>;
        size: number;
        dx: number;
        dy: number;
    }[];
    /** Where in its period it starts, 0 to 1, so no two keep step. */
    phase: number;
    /** Its round over one period, or null for what stands. */
    round: { frames: LifeFrame[]; period: number } | null;
    /** Where nothing moves: drawn standing where its round begins, or left out, since it only makes sense moving. */
    atRest: "stands" | "gone";
    /** The float a standing one declares, in world units and seconds one way, or null. */
    bob: { lift: number; deg: number; pivot: number; period: number } | null;
}

/** What carries the guide along each kind of way, and what travels that kind of way in the country; a path is walked. */
export type MapRides = Record<
    RoadKind,
    {
        guide: { art: string; params?: Record<string, unknown>; k: number } | null;
        country: {
            art: string;
            params?: Record<string, unknown>;
            faces: 1 | -1;
            size: number;
            speed: number;
        } | null;
    }
>;

/** A year's name lettered across its side of the country, for a grown-up, and what the record says of it. */
export interface MapYear {
    grade: number;
    at: Pt;
    /** In degrees. */
    angle: number;
    /** "Year 2", and the line under it from story.md. */
    name: string;
    line: string;
    begun: boolean;
    /** The day its last world's moment happened, once every world of it is finished, or null. */
    finished: string | null;
}

/** A field the paper plane may land on beside a place the viewer may travel to: its middle and the way it runs, in radians. */
export interface MapLanding {
    node: number;
    at: Pt;
    angle: number;
}

/** A creature the paper plane can spot from the air, where it lives. */
export interface MapSight {
    art: string;
    at: Pt;
    name: string;
    k: number;
    flip?: boolean;
}

export interface MapPlace {
    i: number;
    box: Rect;
    /** Where the guide stands at rest, at the foot of the picture, and where every way in and out ends. */
    stand: Pt;
    state: PlaceState;
    open: boolean;
    /** For a place off the run, the place of the run its way leaves from. */
    host: number | null;
    /** Null only when a layout has no corresponding place. */
    shown: PlaceShown | null;
}

/** A way between two places: walked, open to walk, in pencil to the next world, trailing off into the paper past it, or not drawn. */
export type WayState = "walked" | "open" | "pencil" | "trailing" | "hidden";

export interface MapWay {
    from: number;
    to: number;
    kind: RoadKind;
    d: string;
    samples: Sample[];
    state: WayState;
    /** The day the way was inked, or null while it is not. */
    opened: string | null;
}

/**
 * What a page's viewer may do on the map, passed in by the page and never worked out from the view.
 * A child travels to the worlds reached and the one whose way is open, goes into their own, and
 * pans their own land; the site's visitor and a grown-up go everywhere, and the backdrop behind a
 * grown-up's pages goes nowhere.
 */
export interface MapLimits {
    travel: "reached" | "everywhere";
    goIn: "own" | "everywhere" | "none";
    fly: boolean;
    pan: "own" | "all";
    zoomOut: "year" | "everything";
}

/** The map of the worlds as one page draws it, worked out in school/worlds from a record and the page's limits. */
export interface MapView {
    places: MapPlace[];
    ways: MapWay[];
    /** Where the guide stands: a place of the run, or null on a map with nobody on it. */
    here: number | null;
    /**
     * The layout the places and ways were drawn on, which the terrain and the flight read.
     */
    layout: Overworld;
    country: Terrain;
    land: Land;
    reach: MapReach;
    /** The worlds the places are of, by id, with only what the map draws of each. */
    pictures: Record<string, WorldPicture>;
    /** The region the map opens on. */
    frame: Rect;
    /** Whether the years are lettered across the country, as a grown-up reads it. */
    grown: boolean;
    /** The child's name and the day their record begins, on the map's title, or null for a map with no child. */
    title: { child: string; since: string } | null;
    limits: MapLimits;
    /** How the worlds draw every drawing the view names, by art id, so a painter never reads the worlds' list. */
    art: Record<string, ArtRef>;
    /** The country's small life between the worlds, where each stands or goes round on this map. */
    life: MapLife[];
    rides: MapRides;
    /** The years lettered across the country, as a grown-up reads them; empty on a child's map. */
    years: MapYear[];
    /** The fields the paper plane may land on, beside every place this viewer may travel to; empty where the limits allow no plane. */
    landings: MapLanding[];
    /** The creatures the paper plane can spot, where this map draws them. */
    sights: MapSight[];
    /** How a child's land ends its year and how the land they reach was sailed to; null on a map of the whole country. */
    sail: MapSail | null;
}

/**
 * A year ends by sailing to the next land (.docs/overworld.md): a jetty at the land's shore with the
 * ship waiting at it, in pencil from the start of the year and inked when the year's last lesson is
 * done, and on the day the next year's first lesson opens that land, the ship coming in to it.
 */
export interface MapSail {
    /** The jetty, on the way out of the year where it meets the coast. */
    jetty: Pt;
    /** Which way the ship at the jetty faces, toward the next land: 1 east, -1 west. */
    faces: 1 | -1;
    /** The path from the year's last world down to the jetty. */
    way: MapRoad | null;
    /** The day the year's last lesson was done, when the jetty, its ship and the path are inked; null while in pencil. */
    inked: string | null;
    /** The ship's way in over the sea to the land's first world, and the day the land opened; it plays as the map opens on that day. */
    came: { on: string; path: Pt[] } | null;
}

export type SheetState = "done" | "today" | "closed";

export interface SheetView {
    lesson: string;
    title: string;
    state: SheetState;
    /** The day a done sheet was finished. */
    on: string | null;
}

export interface DayView {
    date: string;
    /** What the day's tag says in place of its date, where a page gives one: "Day 3" on a roll read as written. */
    label?: string;
    sheets: SheetView[];
    /** The creatures walking behind the guide as of this day, by drawing id. */
    followers: string[];
    /** Those of them that joined on this day, which walk in behind the guide as the day's doings play. */
    joined?: string[];
}

/**
 * What a page's viewer may do in a world. A child's sheets are open: today's answer, done ones are
 * for looking, the next is closed, and what they do is recorded for their kid. A viewer who looks
 * answers nothing and records nothing. The site's preview opens the first `open` questions of a
 * sheet and shows the rest locked, and records nothing. A view that records nothing has no kid id,
 * so nothing drawn from it can build an event.
 */
export type WorldLimits =
    | { sheets: "open"; record: true; kid: Kid["id"] }
    | { sheets: "look"; record: false }
    | { sheets: "preview"; preview: { open: number }; record: false };

/**
 * What a page draws in a stretch's sky beside its layout: where its world's name is written and the
 * most room it takes, where the guide stands at the gate to greet and what it says, and where the
 * drawings up in its sky hang, at the size they are drawn. One the weather brings, a kite on a breezy
 * day, hangs in front of the far row and moves as the world's own drawings do.
 */
export interface StretchView {
    label: Rect & { k: number };
    greet: Pt;
    says: string;
    sky: { art: string; k: number; box: Rect; weather?: true }[];
    /**
     * What the card in the column says on a roll with no days on it: a world whose lessons are not
     * written yet, and a child who has not had their first lesson, are not the same thing and do not
     * read the same, so the words come from the view rather than from the painter.
     */
    card?: { label: string; says: string };
}

/** What a stop says a step out, in the words a child reads it in. */
export interface StopView {
    /**
     * The question the day is about, in the world's own words, which leads: the line of what stands
     * beside it. Null where the world has no line for the day's lessons, and for a day still to come.
     */
    hook: string | null;
    /** The day's lessons by name, small under the question; empty for a day still to come, which keeps its lesson back. */
    names: string;
    /**
     * The day within the week as a child says it (Today, Yesterday, Last Thursday), and past the week
     * the day the sheet itself is stamped with; empty for a day still to come.
     */
    when: string;
    /** The drawing in the ring of a finished day's stamp, the world's own creature; null on a day not finished. */
    stamp: string | null;
    /**
     * The day's own sheets, which a page draws into the stop's paper box as it comes near, the way the
     * roll draws them. A day still to come has none, since it names no lesson until it is today.
     */
    sheets: SheetView[];
}

/**
 * A world's term as a place, which a page draws when the child steps back from the roll: the trail
 * with a stop for each day, the guide at today, what stands beside the trail and how the record has
 * left each drawing, and the moment waiting at the trail's end.
 */
export interface TrailView {
    term: number;
    world: string;
    layout: TrailLayout;
    /** One per stop of the layout. */
    stops: StopView[];
    /** One per scenery of the layout's land. */
    standings: Standing[];
    /** What the place's sky holds: the world's name, the guide's greeting at the start and the drawings up in it. */
    sky: StretchView;
    /** What is written above the world's name on its sky. */
    label: string;
    /** The stop the guide stands at: today's, or the last one done; -1 before the first day, at the start. */
    guide: number;
    /** The creatures walking behind the guide, with the day each joined. */
    followers: { art: string; on: string }[];
    /** The day the world's moment happened, when the term's last lesson was finished; null while it waits. */
    moment: string | null;
}

/**
 * A year's roll as a page draws it, one stretch per term in that term's world: the worlds' pictures,
 * the roll laid out, the days on it and how the record has left each drawing beside the path.
 */
export interface WorldView {
    pictures: Record<string, WorldPicture>;
    /** How the worlds draw every drawing the view names, by art id. */
    art: Record<string, ArtRef>;
    /** The world the view opens on: the one visited, or the one today is in. */
    open: string;
    layout: RollLayout;
    /** One per row of the layout. */
    days: DayView[];
    /** The closed sheet for what comes next, under today, or null at the end of the year. */
    next: SheetView | null;
    /** One per scenery of the layout. */
    standings: Standing[];
    /** The term the viewer arrives at and the guide's line, or null for a roll that opens on today. */
    arrival: { term: number; says: string } | null;
    /** One per stretch of the layout. */
    stretches: StretchView[];
    /** The term the view opens on as a place; null where that term has no day on it yet. */
    trail: TrailView | null;
    limits: WorldLimits;
}
