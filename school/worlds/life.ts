// The country's small life between its worlds, and what travels each kind of way: one table that a
// child's map, a grown-up's, the apps' backdrops and the site read (.docs/overworld.md, "Small life, and
// the rare sight"). Where each thing stands and how it moves are worked out from the laid-out map and its
// ground, so a land, an island or a world added later changes where life lands and not this table.
// Pure; the map's painter draws it, as transform and opacity keyframes the compositor plays.
import {
    hash,
    inside,
    known,
    rand,
    reached,
    wet,
    type LifeFrame,
    type MapReach,
    type MapRides,
    type Overworld,
    type Pt,
    type Rect,
    type Terrain,
    sampled,
} from "../../engine/space";
import { motionOf, type Declared } from "../../engine/motion/world";
import { ART } from "./art";
import { FURNITURE, SIGHTS } from "./geography";
import { landOf } from "./terrain";

/** What carries the guide along each kind of way, and what travels that kind of way in the country; a path is walked. The map's painter reads it off the view. */
export const RIDES: MapRides = {
    path: { guide: null, country: null },
    road: { guide: { art: "bus", k: 1.2 }, country: null },
    rails: {
        guide: { art: "train", params: { carriages: 1, windows: 3, on: 0 }, k: 1.05 },
        country: {
            art: "train",
            params: { carriages: 2, windows: 3, on: 0 },
            faces: -1,
            size: 600,
            speed: 150,
        },
    },
    river: {
        guide: { art: "narrowboat", k: 1.15 },
        country: {
            art: "narrowboat",
            params: { windows: 3, pots: 2 },
            faces: 1,
            size: 440,
            speed: 90,
        },
    },
    sea: {
        guide: { art: "ship", k: 1 },
        country: { art: "ship", faces: -1, size: 400, speed: 130 },
    },
    air: {
        guide: { art: "balloon", k: 0.7 },
        country: { art: "balloon", faces: 1, size: 320, speed: 60 },
    },
};

/** Where a life may be, in world units. */
type Where =
    /** At sea, this far from every coast. */
    | { on: "sea"; from: number; to: number }
    /** Over land, this far from every coast. */
    | { on: "land"; from: number }
    /** In the sky, over land or sea. */
    | { on: "sky" }
    /** On a patchwork of fields. */
    | { on: "fields" }
    /** Over the water on the way to a place off the run. */
    | { on: "way"; to: string }
    /** In the sea beside the map's compass rose, where an old map doodles in its margin. */
    | { on: "compass"; dx: number; dy: number };

/** How it moves across the country, in seconds and world units. */
type Travel =
    | { is: "stand" }
    /** Round an ellipse. */
    | { is: "loop"; rx: number; ry: number; period: number }
    /** Along its way and back, resting at each end. */
    | { is: "shuttle"; period: number; wait: number }
    /** Comes up, drifts a little, goes down, and is gone for the rest of the period. */
    | { is: "surface"; drift: number; up: number; period: number }
    /** Across a stretch downwind, fading in and out, and gone for the rest of the period. */
    | { is: "cross"; length: number; up: number; period: number };

interface Life {
    /** A drawing by its id in world/art.ts. */
    art: string;
    params?: Record<string, unknown>;
    /** Its longer side on the map. */
    size: number;
    where: Where;
    travel: Travel;
    /** The most of it in the country, and how far apart two are. */
    most: number;
    apart: number;
    /** How far it keeps from every world's place and way, the map's furniture, and the creatures the paper plane spots. */
    clear: number;
    /** Whether a child's map has it, where the child has reached. */
    child: boolean;
    /** Whether it may stand in pencil where a child's map knows the land but the child has not been. */
    pencil?: boolean;
    /** A doodle in the margin rather than a thing in the country, so always in pencil. */
    doodle?: boolean;
    /** Whether it casts a soft shadow on the ground under it. */
    shade?: boolean;
    /** What goes with it, behind and a little to one side, in world units. */
    follow?: {
        art: string;
        params?: Record<string, unknown>;
        size: number;
        dx: number;
        dy: number;
    }[];
    /** Still with the owner: on unless a map leaves its trial out, and gone with this line when the answer is no. */
    trial?: string;
}

export const LIFE: readonly Life[] = [
    {
        art: "whale",
        params: { spout: 1, facing: 1 },
        size: 520,
        where: { on: "sea", from: 1200, to: 4000 },
        travel: { is: "surface", drift: 300, up: 20, period: 40 },
        most: 6,
        apart: 7000,
        clear: 1200,
        child: true,
    },
    {
        art: "boat",
        size: 320,
        where: { on: "sea", from: 700, to: 4000 },
        travel: { is: "loop", rx: 900, ry: 300, period: 120 },
        most: 5,
        apart: 7000,
        clear: 1100,
        child: true,
        follow: [
            { art: "gull-flying", size: 150, dx: -150, dy: -260 },
            { art: "gull-flying", size: 120, dx: -290, dy: -340 },
        ],
    },
    {
        art: "seal",
        params: { rock: 1, facing: 1 },
        size: 380,
        where: { on: "sea", from: 250, to: 750 },
        travel: { is: "stand" },
        most: 6,
        apart: 6000,
        clear: 1100,
        child: true,
        pencil: true,
    },
    {
        art: "buoy",
        size: 220,
        where: { on: "sea", from: 600, to: 1600 },
        travel: { is: "stand" },
        most: 7,
        apart: 5000,
        clear: 900,
        child: true,
        pencil: true,
    },
    {
        art: "dolphins",
        params: { count: 3 },
        size: 420,
        where: { on: "sea", from: 1400, to: 4000 },
        travel: { is: "cross", length: 1600, up: 18, period: 44 },
        most: 3,
        apart: 11000,
        clear: 1400,
        child: false,
    },
    {
        art: "ferry",
        params: { cars: 2, windows: 5 },
        size: 400,
        where: { on: "way", to: "ferry-town" },
        travel: { is: "shuttle", period: 130, wait: 16 },
        most: 1,
        apart: 0,
        clear: 0,
        child: true,
    },
    {
        art: "cloud",
        params: { puffs: 4, rain: 0 },
        size: 640,
        where: { on: "sky" },
        travel: { is: "cross", length: 4200, up: 120, period: 160 },
        most: 5,
        apart: 10000,
        clear: 1200,
        child: true,
        shade: true,
    },
    {
        art: "geese",
        params: { count: 7 },
        size: 480,
        where: { on: "sky" },
        travel: { is: "cross", length: 5600, up: 60, period: 120 },
        most: 2,
        apart: 18000,
        clear: 1200,
        child: false,
    },
    {
        art: "tractor",
        params: { trailer: 0, bales: 0 },
        size: 300,
        where: { on: "fields" },
        travel: { is: "stand" },
        most: 2,
        apart: 8000,
        clear: 900,
        child: false,
        pencil: true,
    },
    {
        art: "seaserpent",
        params: { loops: 3, facing: 1 },
        size: 900,
        where: { on: "compass", dx: 2900, dy: 1300 },
        travel: { is: "stand" },
        most: 1,
        apart: 0,
        clear: 0,
        child: true,
        pencil: true,
        doodle: true,
        trial: "serpent",
    },
];

/** The parts of the map's own drawings that turn, each lifted into a layer of its own so the compositor turns it: the part, and seconds a turn. */
export const TURNING: Record<string, { part: string; rev: number }> = {
    windmill: { part: "sails", rev: 24 },
};

/** One life placed on a map. */
export interface LifeSpot {
    life: Life;
    /** The same for the same thing in the same place every time. */
    key: number;
    /** Where it stands, or the middle of the loop it goes round. */
    at: Pt;
    path: Pt[];
    pencil: boolean;
    moves: boolean;
    /** Where in its period it starts, 0 to 1, so no two keep step. */
    phase: number;
}

const toRect = (r: Rect, q: Pt) =>
    Math.hypot(Math.max(r.x - q.x, 0, q.x - r.x - r.w), Math.max(r.y - q.y, 0, q.y - r.y - r.h));

/** Points sorted into squares, so the nearest is found ring by ring outwards rather than by walking every coast. */
function nearest(pts: Pt[], size: number): (q: Pt, most: number) => number {
    const grid = new Map<string, Pt[]>();
    for (const p of pts) {
        const k = `${Math.floor(p.x / size)},${Math.floor(p.y / size)}`;
        const a = grid.get(k);
        if (a) a.push(p);
        else grid.set(k, [p]);
    }
    return (q, most) => {
        const cx = Math.floor(q.x / size),
            cy = Math.floor(q.y / size),
            rings = Math.ceil(most / size) + 1;
        let best = Infinity;
        for (let ring = 0; ring <= rings; ring++) {
            if (best <= (ring - 1) * size) break;
            for (let i = -ring; i <= ring; i++)
                for (let j = -ring; j <= ring; j++) {
                    if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
                    for (const p of grid.get(`${cx + i},${cy + j}`) ?? [])
                        best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y));
                }
        }
        return best;
    };
}

/**
 * Where the country's life is on this map; the same map always gives the same places. On a child's map
 * a life is there only where the child has reached, or standing in pencil where the map knows the land
 * if it may; `still` leaves out what only makes sense moving.
 */
export function lifeOn(o: {
    map: Overworld;
    terrain: Terrain;
    reach: MapReach | null;
    grown: boolean;
    still: boolean;
    trials?: readonly string[];
    /** Where the title, the key and the compass stand, when not where the whole country has them: a child's own land has its own. */
    furniture?: { title: Pt; key: Pt; compass: Pt };
}): LifeSpot[] {
    const { map, terrain: T } = o,
        F = o.furniture ?? FURNITURE,
        B = map.bounds,
        land = landOf(T);
    const coast = nearest(
        T.lands.flatMap((l) => l.filter((_, i) => i % 5 === 0)),
        900,
    );
    const ways = nearest(
        [...map.roads, ...map.sides.map((s) => s.road)].flatMap((r) =>
            r.samples.filter((_, i) => i % 2 === 0),
        ),
        900,
    );
    const boxes = [...map.nodes, ...map.sides].map((n) => n.box);
    const furniture = [F.title, F.key, F.compass].map((c) => ({
        x: c.x - 1900,
        y: c.y - 950,
        w: 3800,
        h: 1900,
    }));
    const sea = (q: Pt) => wet(T, q) && !T.lakes.some((l) => inside(l, q));
    const clearOf = (q: Pt, by: number) =>
        boxes.every((b) => toRect(b, q) >= by) &&
        furniture.every((f) => toRect(f, q) >= by * 0.5) &&
        SIGHTS.every((s) => Math.hypot(s.at.x - q.x, s.at.y - q.y) >= 900) &&
        T.features.every((f) => Math.hypot(f.at.x - q.x, f.at.y - q.y) >= 700) &&
        ways(q, by * 0.5) >= by * 0.5;
    const fits = (w: Where, q: Pt): boolean => {
        if (w.on === "sea") {
            if (!sea(q)) return false;
            const d = coast(q, w.to);
            return d >= w.from && d <= w.to;
        }
        if (w.on === "land") return !wet(T, q) && coast(q, w.from) >= w.from;
        return true;
    };
    const pathOf = (t: Travel, at: Pt): Pt[] => {
        if (t.is === "loop")
            return Array.from({ length: 12 }, (_, i) => ({
                x: at.x + Math.cos((i / 12) * Math.PI * 2) * t.rx,
                y: at.y + Math.sin((i / 12) * Math.PI * 2) * t.ry,
            }));
        if (t.is === "surface") return [at, { x: at.x + t.drift, y: at.y }];
        if (t.is === "cross")
            return Array.from({ length: 7 }, (_, i) => ({
                x: at.x + (i / 6 - 0.5) * t.length,
                y: at.y - (i / 6) * t.length * 0.06,
            }));
        return [at];
    };
    const spots: LifeSpot[] = [];
    // a child's map is sampled over the circles of country it knows, a grown-up's over the whole sheet
    const R = o.reach,
        circles = !o.grown && R?.known ? R.known : null;
    const sample = (rnd: () => number): Pt => {
        const c = circles?.[Math.floor(rnd() * circles.length)];
        if (!c) return { x: B.x + 500 + rnd() * (B.w - 1000), y: B.y + 500 + rnd() * (B.h - 1000) };
        const a = rnd() * Math.PI * 2,
            r = Math.sqrt(rnd()) * c.r;
        return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
    };
    const drawn = (q: Pt) => !circles || !R || known(R, q, 0.9);
    LIFE.forEach((l, li) => {
        if (l.trial && o.trials && !o.trials.includes(l.trial)) return;
        if (!o.grown && !l.child) return;
        const w = l.where,
            found: { at: Pt; path: Pt[]; score: number }[] = [];
        const empty = (q: Pt) => Math.min(...boxes.map((b) => toRect(b, q)));
        if (w.on === "compass") {
            const at = { x: F.compass.x + w.dx, y: F.compass.y + w.dy };
            if (sea(at) && drawn(at)) found.push({ at, path: [at], score: 1 });
        } else if (w.on === "way") {
            // on a child's map a place off the run is drawn once it is stamped, and so is the way to it
            const side = map.sides.find((s) => s.world === w.to);
            const there =
                side &&
                (o.grown ||
                    !R ||
                    reached(
                        R,
                        { x: side.box.x + side.box.w / 2, y: side.box.y + side.box.h / 2 },
                        0.6,
                    ));
            const over = there ? side.road.samples.filter((q) => sea(q)) : [];
            const run = over.slice(Math.floor(over.length * 0.15), Math.ceil(over.length * 0.85));
            if (run[0] && run.length > 6) found.push({ at: run[0], path: run, score: 1 });
        } else if (w.on === "fields") {
            for (const f of land.fields) {
                const at = {
                    x: f.reduce((a, q) => a + q.x, 0) / f.length,
                    y: f.reduce((a, q) => a + q.y, 0) / f.length,
                };
                if (drawn(at) && !wet(T, at) && clearOf(at, l.clear))
                    found.push({ at, path: [at], score: empty(at) });
            }
        } else {
            // the emptier the better up to a point, and then by lot, so it spreads
            const rnd = rand(hash(`life:${l.art}:${li}`));
            for (let i = 0; i < (circles ? 200 : 220); i++) {
                const at = sample(rnd),
                    lot = rnd() * 600;
                if (!drawn(at) || !clearOf(at, l.clear) || !fits(w, at)) continue;
                const path = pathOf(l.travel, at);
                if (path.every((q) => drawn(q) && fits(w, q) && clearOf(q, l.clear)))
                    found.push({ at, path, score: Math.min(empty(at), 4500) + lot });
            }
        }
        // the emptiest first, and then spread out from whatever is already placed, of any kind
        const away = (q: Pt) =>
            Math.min(6000, ...spots.map((s) => Math.hypot(s.at.x - q.x, s.at.y - q.y)));
        for (let placed = 0; placed < l.most && found.length; placed++) {
            let best = -1,
                bestScore = -Infinity;
            found.forEach((f, i) => {
                const score = f.score + away(f.at) * 0.5;
                if (
                    score > bestScore &&
                    spots.every(
                        (s) =>
                            Math.hypot(s.at.x - f.at.x, s.at.y - f.at.y) >=
                            (s.life === l ? l.apart : 2600),
                    )
                ) {
                    best = i;
                    bestScore = score;
                }
            });
            if (best < 0) break;
            const [f] = found.splice(best, 1);
            if (!f) break;
            const key = hash(`${l.art}:${Math.round(f.at.x)}:${Math.round(f.at.y)}`),
                travels = l.travel.is !== "stand";
            if (o.still && (l.travel.is === "surface" || l.travel.is === "cross")) continue;
            const spot: LifeSpot = {
                life: l,
                key,
                at: f.at,
                path: f.path,
                pencil: !!l.doodle,
                moves: travels && !o.still,
                phase: (key % 997) / 997,
            };
            // what stands is in colour where the child has been and otherwise in pencil, if it may be; what moves
            // is in colour, and on a child's map only where its round touches country the child has been to
            if (!travels && !l.doodle && R && !reached(R, f.at, 0.9)) {
                if (!l.pencil) continue;
                spot.pencil = true;
            }
            if (travels && circles && R && !spot.path.some((q) => reached(R, q, 1))) continue;
            spots.push(spot);
        }
    });
    return spots;
}

/** The small float a drawing declares for a world, in world units and seconds one way; none if it only drifts. `declared` is the shelf's motion by drawing id. */
export function bobOf(
    art: string,
    declared: Declared,
): { lift: number; deg: number; pivot: number; period: number } | null {
    const i = motionOf(ART.find((a) => a.id === art)?.ref ?? art, declared)?.idle;
    return i?.kind === "float" && (i.lift || i.deg)
        ? { lift: i.lift ?? 0, deg: i.deg ?? 0, pivot: i.pivot ?? 1, period: i.period }
        : null;
}

/** A travel's poses over one period, or none for what stands. */
export function framesOf(s: LifeSpot): { frames: LifeFrame[]; period: number } | null {
    const t = s.life.travel,
        P = s.path,
        a = P[0],
        b = P.at(-1);
    if (t.is === "stand" || !a || !b) return null;
    const along = (u: number): Pt => {
        const k = Math.max(0, Math.min(1, u)) * (P.length - 1),
            i = Math.max(0, Math.min(P.length - 2, Math.floor(k))),
            p = P[i] ?? a,
            q = P[i + 1] ?? p;
        return { x: p.x + (q.x - p.x) * (k - i), y: p.y + (q.y - p.y) * (k - i) };
    };
    if (t.is === "loop") {
        return {
            period: t.period,
            frames: sampled(
                (time) => {
                    const th = (time / t.period) * Math.PI * 2;
                    return {
                        x: s.at.x + Math.cos(th) * t.rx,
                        y: s.at.y + Math.sin(th) * t.ry,
                        r: 0,
                        flip: -Math.sin(th) >= 0 ? 1 : -1,
                        o: 1,
                    };
                },
                t.period,
                32,
            ),
        };
    }
    if (t.is === "shuttle") {
        const leg = (t.period - t.wait * 2) / 2;
        return {
            period: t.period,
            frames: sampled(
                (time) => {
                    const back = time >= leg + t.wait && time < leg * 2 + t.wait * 2;
                    const u =
                        time < leg
                            ? time / leg
                            : time < leg + t.wait
                              ? 1
                              : time < leg * 2 + t.wait
                                ? 1 - (time - leg - t.wait) / leg
                                : 0;
                    return {
                        ...along(0.5 - 0.5 * Math.cos(Math.PI * u)),
                        r: 0,
                        flip: back ? -1 : 1,
                        o: 1,
                    };
                },
                t.period,
                48,
            ),
        };
    }
    const up = Math.min(0.9, t.up / t.period),
        ramp = Math.min(up / 3, 2.5 / t.period),
        frames: LifeFrame[] = [];
    const at = (share: number, q: Pt, o: number) =>
        frames.push({ at: share, x: q.x, y: q.y, r: 0, flip: 1, o });
    if (t.is === "surface") {
        at(0, { x: a.x, y: a.y + 30 }, 0);
        at(ramp, a, 1);
        at(up - ramp, b, 1);
        at(up, { x: b.x, y: b.y + 30 }, 0);
        at(1, { x: b.x, y: b.y + 30 }, 0);
    } else {
        at(0, a, 0);
        at(ramp, along(ramp / up), 1);
        at(up - ramp, along(1 - ramp / up), 1);
        at(up, b, 0);
        at(1, b, 0);
    }
    return { period: t.period, frames };
}

/** Every art id the country's life and the guide's rides draw with, for a page to load before it builds a map's view. */
export const lifeArt = (): string[] => [
    ...LIFE.flatMap((l) => [l.art, ...(l.follow ?? []).map((f) => f.art)]),
    ...Object.values(RIDES).flatMap((r) => [
        ...(r.guide ? [r.guide.art] : []),
        ...(r.country ? [r.country.art] : []),
    ]),
];
