// The ground the map's worlds stand on, as geometry: the lands and seas of geography.ts made into
// coasts, rivers and lakes, the ground round each world's picture, where the ways cross water, and
// how far across it all the child has come. The map's painter draws it, asking engine/space.ts
// whether a point is wet, known or reached.
//
// Pure, like the roll and the map: the same map always gives the same ground, which is what lets a
// test say that no world's picture stands in the sea, that a label keeps its contrast whatever it is
// written over, and what each road passes on the way.
import type { Marker } from "../../engine/paper";
import {
    at,
    GROUND_PAD,
    inside,
    KNOWN_PAST,
    LIMITS,
    onLand,
    LAND,
    SEA,
    smooth,
    TERRAIN_WASH,
    wet,
    type Pt,
    type Rect,
    type MapRoad,
    type Overworld,
    type GroundKind,
    type Terrain,
    type MapReach,
    type Land,
    type PatchKind,
} from "../../engine/space";
import {
    FEATURES,
    FIELDS,
    FURNITURE,
    HILLS,
    LAKES,
    LANDS,
    PEAKS,
    RIVERS,
    WOODS,
    type LandShape,
} from "./geography";
import type { Journey } from "./rewards";
import type { World } from "./types";

const PATCH: Record<GroundKind, PatchKind> = {
    meadow: "fields",
    shore: "sand",
    yard: "embankment",
    woods: "woods",
    tiles: "garden",
    town: "streets",
    hill: "heather",
    field: "pitch",
    boards: "grounds",
    snow: "snow",
    sea: "water",
    jungle: "jungle",
    lawn: "garden",
    reeds: "fields",
    park: "garden",
    canal: "streets",
    ice: "snow",
    furrows: "fields",
    crag: "heather",
    terraces: "streets",
    wildflowers: "fields",
    heath: "heather",
    sandstone: "streets",
    reef: "water",
    cavern: "heather",
    cloudtop: "snow",
    dunes: "sand",
    ledges: "sand",
    litter: "fields",
    granite: "heather",
    workshop: "streets",
    hedges: "garden",
    cobbles: "streets",
    quay: "sand",
    machair: "fields",
    canopy: "jungle",
    saltcrust: "snow",
    sinter: "heather",
};

/**
 * How strongly the ground is washed, as shares of the cap in check.ts. They are lighter than a world's
 * own washes, so the pictures, their stamps and their labels stay the loudest things on the map.
 */
/** A rounded blob round a box, with a wobble that is the same every time. */
function blob(r: Rect, pad: number, seed: number, n = 22): Pt[] {
    const cx = r.x + r.w / 2,
        cy = r.y + r.h / 2,
        rx = r.w / 2 + pad,
        ry = r.h / 2 + pad;
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2,
            c = Math.cos(a),
            s = Math.sin(a);
        // a superellipse, so the blob hugs a wide picture rather than bulging above and below it
        const k = 1 / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), 0.25);
        const w = 1 + 0.07 * Math.sin(seed * 1.7 + i * 2.3) + 0.04 * Math.sin(seed * 0.9 + i * 5.1);
        pts.push({ x: cx + c * rx * k * w, y: cy + s * ry * k * w });
    }
    return smooth(pts, true, 4);
}

/** Where two polylines cross, if they do: the first crossing along `a`. */
function crossing(a: Pt[], b: Pt[]): { at: Pt; angle: number } | null {
    const x0 = Math.min(...b.map((q) => q.x)),
        x1 = Math.max(...b.map((q) => q.x)),
        y0 = Math.min(...b.map((q) => q.y)),
        y1 = Math.max(...b.map((q) => q.y));
    for (let i = 1; i < a.length; i++) {
        const p = at(a, i - 1),
            q = at(a, i);
        if (
            Math.max(p.x, q.x) < x0 ||
            Math.min(p.x, q.x) > x1 ||
            Math.max(p.y, q.y) < y0 ||
            Math.min(p.y, q.y) > y1
        )
            continue;
        for (let j = 1; j < b.length; j++) {
            const r = at(b, j - 1),
                s = at(b, j);
            const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
            if (!d) continue;
            const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
            const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
            if (t >= 0 && t <= 1 && u >= 0 && u <= 1)
                return {
                    at: { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t },
                    angle: Math.atan2(q.y - p.y, q.x - p.x),
                };
        }
    }
    return null;
}

/** A coast from its control points: smoothed, then wobbled by a hand that goes round once and meets itself. */
function coastOf(l: LandShape, seed: number): Pt[] {
    const line = smooth(l.coast, true, 16),
        n = line.length,
        lens: number[] = [];
    let L = 0;
    for (let i = 0; i < n; i++) {
        lens.push(L);
        const a = at(line, i),
            b = at(line, (i + 1) % n);
        L += Math.hypot(b.x - a.x, b.y - a.y);
    }
    const amp = l.wobble ?? 100,
        f = (len: number) => Math.max(1, Math.round(L / len));
    return line.map((q, i) => {
        const a = at(line, (i - 1 + n) % n),
            b = at(line, (i + 1) % n),
            dx = b.x - a.x,
            dy = b.y - a.y,
            d = Math.hypot(dx, dy) || 1;
        const u = (at(lens, i) / L) * Math.PI * 2;
        // long swells, then coves, then a little roughness, the way a hand follows a coast, stronger in
        // some stretches than others so no two capes look alike
        const env = 0.6 + 0.4 * Math.sin(f(5200) * u + seed * 3.1);
        const k =
            amp *
            env *
            (0.5 * Math.sin(f(2900) * u + seed) +
                0.26 * Math.sin(f(1100) * u + seed * 2.3) +
                0.15 * Math.sin(f(430) * u + seed * 0.7) +
                0.09 * Math.sin(f(170) * u + seed * 1.9));
        return { x: q.x - (dy / d) * k, y: q.y + (dx / d) * k };
    });
}

function lakeOf(l: { at: Pt; rx: number; ry: number }, seed: number): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2,
            w = 1 + 0.1 * Math.sin(seed * 1.9 + i * 2.1) + 0.06 * Math.sin(seed + i * 4.7);
        pts.push({ x: l.at.x + Math.cos(a) * l.rx * w, y: l.at.y + Math.sin(a) * l.ry * w });
    }
    return smooth(pts, true, 5);
}

/** The lands a big country is made of rather than an island in the sea: an island is a small land. */
const SMALL = 9e6;
const area = (pts: Pt[]) =>
    Math.abs(
        pts.reduce((a, q, i) => {
            const r = at(pts, (i + 1) % pts.length);
            return a + q.x * r.y - r.x * q.y;
        }, 0),
    ) / 2;

/**
 * The ground under a map on the country of geography.ts. `worldOf` gives the world each picture is of,
 * which decides the ground round it and what a way into it is called.
 */
export function terrainOf(map: Overworld, worldOf: (id: string) => World): Terrain {
    // the ground runs on past the map's edge, so the colour fades out rather than stopping at a line
    const M = map.bounds,
        B = { x: M.x - 2600, y: M.y - 2600, w: M.w + 5200, h: M.h + 5200 };
    // a land is drawn once the run reaches it: by its grade, or because one of the run's worlds stands on it
    const top = Math.max(0, ...map.nodes.map((n) => n.grade));
    const standsOn = (l: LandShape) =>
        [...map.nodes, ...map.sides].some((n) =>
            inside(l.coast, { x: n.box.x + n.box.w / 2, y: n.box.y + n.box.h / 2 }),
        );
    // each coast's wobble is seeded by its own place in the list, so a land drawn later moves no other coast
    const lands = LANDS.map((l, i) => ({ l, i }))
        .filter(({ l }) => (l.from ?? 0) <= top || standsOn(l))
        .map(({ l, i }) => coastOf(l, i * 1.7 + 0.4));
    const rivers = RIVERS.map((r) => smooth(r, false, 8));
    const lakes = LAKES.map((l, i) => lakeOf(l, i + 2));
    const N = map.nodes.map((n) => n.box),
        W = map.nodes.map((n) => worldOf(n.world));
    const mid = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    const T: Terrain = {
        bounds: B,
        lands,
        spans: [],
        rivers,
        lakes,
        patches: [],
        isles: [],
        buildings: [],
        features: [],
        bridges: [],
        crossings: [],
        back: [],
        spurs: [],
        spursBack: [],
    };
    N.forEach((box, i) => {
        const w = at(W, i),
            kind = PATCH[w.ground];
        if (kind === "water") return;
        if (w.map?.isle) {
            // an island world stands on the island it is on, or on one of its own
            const on = lands.find((l) => inside(l, mid(box)) && area(l) < SMALL);
            T.isles.push({
                node: i,
                outline: on ?? blob(box, 330, i + 3),
                peak: { x: box.x + box.w * 0.5, y: box.y + 60 },
            });
            return;
        }
        T.patches.push({
            node: i,
            kind,
            marker: w.indoor ? "mint" : w.light.ground,
            outline: blob(box, GROUND_PAD, i + 1),
        });
        if (w.indoor)
            T.buildings.push({
                node: i,
                kind: w.ground === "tiles" ? "cottage" : "hall",
                rect: box,
            });
    });
    map.sides.forEach((s) => {
        const w = worldOf(s.world),
            kind = PATCH[w.ground];
        if (kind === "water" || w.map?.isle) return;
        T.patches.push({
            node: s.i,
            kind,
            marker: w.indoor ? "mint" : w.light.ground,
            outline: blob(s.box, GROUND_PAD, s.i + 1),
        });
    });
    // a feature stands where it was drawn for: a drawing on land only where there is land
    T.features = FEATURES.filter((f) => (f.on === "sea") === wet(T, f.at));
    map.roads.forEach((road, i) => {
        for (const rv of rivers) {
            const c = crossing(road.samples, rv);
            // the way down the river runs beside it; any other way that meets a river crosses it on a bridge
            if (
                c &&
                road.kind !== "river" &&
                road.kind !== "sea" &&
                road.kind !== "air" &&
                !wet(T, c.at)
            )
                T.bridges.push({ road: i, ...c });
        }
        if (road.kind === "river" || road.kind === "sea" || road.kind === "air") return;
        // a way over land that meets the sea goes over it on a bridge
        let from = -1;
        road.samples.forEach((q, k) => {
            const w = wet(T, q) && !lakes.some((l) => inside(l, q));
            if (w && from < 0) from = k;
            if ((!w || k === road.samples.length - 1) && from >= 0) {
                T.spans.push({
                    road: i,
                    from: Math.max(0, from - 3),
                    to: Math.min(road.samples.length - 1, k + 3),
                });
                from = -1;
            }
        });
    });
    // a way between two years is the sail from one land to the next
    const sails = (road: MapRoad) => map.nodes[road.from]?.grade !== map.nodes[road.to]?.grade;
    T.crossings = map.roads.map((road, i) =>
        phrase(T, road, i, at(W, road.from), at(W, road.to), false, sails(road)),
    );
    T.back = map.roads.map((road, i) =>
        phrase(T, road, i, at(W, road.to), at(W, road.from), true, sails(road)),
    );
    T.spurs = map.sides.map((s) =>
        phrase(T, s.road, -1, W[s.host] ?? worldOf(s.world), worldOf(s.world), false),
    );
    T.spursBack = map.sides.map((s) =>
        phrase(T, s.road, -1, worldOf(s.world), W[s.host] ?? worldOf(s.world), true),
    );
    return T;
}

/**
 * The ground of a child's map, which is their own land: its coast, the isles its year's places
 * stand on, the rocks in its water, and the rivers, lakes, ground and drawings on them, with
 * nothing of another year's land. `mine` says which places are the child's year's, by index. */
export function landOnly(
    t: Terrain,
    map: Overworld,
    region: Rect,
    mine: (i: number) => boolean,
): Terrain {
    const places = [...map.nodes, ...map.sides].map((n) => ({
        i: n.i,
        at: { x: n.box.x + n.box.w / 2, y: n.box.y + n.box.h / 2 },
    }));
    const inRegion = (q: Pt) =>
        q.x > region.x && q.x < region.x + region.w && q.y > region.y && q.y < region.y + region.h;
    const middle = (l: Pt[]): Pt => ({
        x: l.reduce((a, q) => a + q.x, 0) / l.length,
        y: l.reduce((a, q) => a + q.y, 0) / l.length,
    });
    // a coast is kept when a place of the child's year stands on it, or when nobody's does and it is a
    // rock in the land's own water
    const lands = t.lands.filter((l) => {
        const on = places.filter((p) => inside(l, p.at));
        return on.length ? on.some((p) => mine(p.i)) : area(l) < SMALL && inRegion(middle(l));
    });
    const dry = (q: Pt) => lands.some((l) => inside(l, q));
    return {
        ...t,
        lands,
        rivers: t.rivers.filter((r) => dry(at(r, 0))),
        lakes: t.lakes.filter((l) => dry(middle(l))),
        patches: t.patches.filter((x) => mine(x.node)),
        isles: t.isles.filter((x) => mine(x.node)),
        buildings: t.buildings.filter((x) => mine(x.node)),
        features: t.features.filter((f) => inRegion(f.at) && (f.on === "sea" || dry(f.at))),
    };
}

/** Every third point of a terrain's coasts, bucketed into squares of COASTAL, worked out once a terrain. */
const COASTAL = 520;
const COASTS = new WeakMap<Pt[][], Map<string, Pt[]>>();
function nearCoast(t: Terrain, q: Pt): boolean {
    let grid = COASTS.get(t.lands);
    if (!grid) {
        grid = new Map();
        for (const l of t.lands)
            l.forEach((p, k) => {
                if (k % 3) return;
                const key = `${Math.floor(p.x / COASTAL)},${Math.floor(p.y / COASTAL)}`,
                    cell = grid?.get(key);
                if (cell) cell.push(p);
                else grid?.set(key, [p]);
            });
        COASTS.set(t.lands, grid);
    }
    const cx = Math.floor(q.x / COASTAL),
        cy = Math.floor(q.y / COASTAL);
    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
            if (
                grid
                    .get(`${cx + dx},${cy + dy}`)
                    ?.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < COASTAL)
            )
                return true;
    return false;
}

/** What a way passes, in the words the page says as the guide walks it, one way or the other. */
function phrase(
    t: Terrain,
    road: MapRoad,
    i: number,
    from: World,
    to: World,
    backwards: boolean,
    sails = false,
): string {
    if (road.kind === "air") return backwards ? "down through the clouds" : "up through the clouds";
    if (road.kind === "sea")
        return to.map?.isle && !backwards
            ? "across the water to the island"
            : `${backwards ? "back " : ""}across the ${sails ? "sea" : "water"}`;
    if (road.kind === "river") return backwards ? "up the river" : "down the river to the sea";
    if (t.spans.some((s) => s.road === i))
        return road.kind === "rails"
            ? "over the bridge across the strait"
            : "over the bridge across the water";
    const bridge = t.bridges.some((b) => b.road === i);
    const every = road.samples.filter((_, k) => k % 4 === 0);
    const coastal = every.filter((q) => nearCoast(t, q)).length > every.length * 0.3;
    if (from.ground === "shore" || coastal)
        return bridge ? "along the coast and over the river" : "along the coast";
    if (bridge) return "over the bridge";
    if (to.ground === "shore") return "down to the coast";
    if (to.ground === "snow") return "up into the mountains";
    if (from.ground === "snow") return "down from the mountains";
    if (to.ground === "hill") return "up the hill";
    if (from.ground === "hill") return "down the hill";
    if (to.ground === "woods") return "into the woods";
    if (to.indoor) return "up the path to the door";
    if (from.indoor) return "out of the door and down the path";
    if (to.ground === "town") return "into the town";
    if (to.ground === "field") return "out onto the field";
    if (to.ground === "meadow") return "through the fields";
    return road.kind === "rails"
        ? "along the railway"
        : road.kind === "road"
          ? "along the road"
          : "along the path";
}

/**
 * The washes under a point, bottom to top, as markers and opacities over paper: the land or the sea,
 * then the ground round a world or an island. A test composites these to check a label's contrast
 * as if it had no patch of its own.
 */
export function under(t: Terrain, p: Pt): [Marker, number][] {
    const cap = LIMITS.washCap,
        out: [Marker, number][] = [];
    const isle = t.isles.find((x) => inside(x.outline, p));
    if (wet(t, p) && !isle) out.push([SEA, cap * TERRAIN_WASH.sea]);
    else out.push([LAND, cap * TERRAIN_WASH.land]);
    if (isle) out.push(["glow", cap * TERRAIN_WASH.isle]);
    const patch = t.patches.find((x) => inside(x.outline, p));
    if (patch) out.push([patch.marker, cap * TERRAIN_WASH.patch]);
    return out;
}

/**
 * How far the child has come, from the journey: the colour and what a child's map knows, and in the
 * frontier what grows with the share of the child's world finished, which `reachAt` in engine/space.ts
 * rebuilds at another share for the colour washing out as the map opens.
 */
export function reachOf(map: Overworld, trip: Journey, terrain: Terrain): MapReach {
    const R = 2000,
        R0 = 1150,
        circles: MapReach["circles"] = [],
        known: MapReach["circles"] = [];
    const here = trip.places[trip.here],
        k = here && here.lessons.length ? here.done.length / here.lessons.length : 0;
    const mid = (i: number) => {
        const b = at(map.nodes, i).box;
        return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    };
    const growing = here?.state === "here";
    map.nodes.forEach((_, i) => {
        const p = trip.places[i];
        if (!p || p.state === "ahead") return;
        circles.push({
            ...mid(i),
            r: i === trip.here && growing ? R0 + (R - R0) * k : R,
        });
    });
    // the circles along the way ahead, each from the share of the world's lessons it appears at
    const ahead: NonNullable<MapReach["frontier"]>["ahead"] = [];
    map.roads.forEach((road, i) => {
        const open = !!trip.roads[i]?.open,
            onward = road.from === trip.here && growing;
        if (!open && !onward) return;
        const n = road.samples.length;
        for (let j = 0; j < n; j += 28) {
            const q = at(road.samples, j);
            if (open) circles.push({ x: q.x, y: q.y, r: 760 });
            else if (j < Math.floor(n * 0.55))
                ahead.push({ x: q.x, y: q.y, r: 600, at: (j + 1) / (n * 0.55) });
        }
    });
    for (const c of ahead) if (c.at <= k) circles.push({ x: c.x, y: c.y, r: c.r });
    // a place off the run is coloured once it is stamped, and the way to it with it, but neither reaches a
    // world past the child's edge, so that world's land stays paper while the way is still drawn out of it.
    // A place stands a little under 2,000 from the worlds of its year, so its own circle is held back too.
    const edge = edgeOf(trip, map.nodes.length),
        last = edge - 1;
    const past = map.nodes.filter((n) => n.i > edge).map((n) => mid(n.i));
    // the most colour a point may take: what the map knows is the colour grown by KNOWN_PAST and read to
    // four fifths of it, so this keeps every world past the edge outside what is known
    const upTo = (q: Pt, r: number): number =>
        Math.min(r, ...past.map((u) => Math.hypot(u.x - q.x, u.y - q.y) * 1.25 - KNOWN_PAST - 150));
    map.sides.forEach((s, k) => {
        if (!trip.sides?.[k]?.stamp) return;
        const c = { x: s.box.x + s.box.w / 2, y: s.box.y + s.box.h / 2 };
        circles.push({ ...c, r: Math.max(300, upTo(c, R)) });
        for (let j = 0; j < s.road.samples.length; j += 28) {
            const q = at(s.road.samples, j);
            if (upTo(q, 760) >= 760) circles.push({ x: q.x, y: q.y, r: 760 });
        }
    });
    // a finished year colours its worlds' country, out to the coasts round them
    for (const g of new Set(trip.places.map((p) => p.grade))) {
        const mine = trip.places
            .map((p, i) => ({ p, i }))
            .filter((x) => x.p.grade === g && map.nodes[x.i]);
        if (!mine.length || !mine.every((x) => x.p.state === "done")) continue;
        for (const x of mine) circles.push({ ...mid(x.i), r: 3300 });
        for (let j = 1; j < mine.length; j++) {
            const a = mid(at(mine, j - 1).i),
                b = mid(at(mine, j).i);
            circles.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: 2900 });
        }
    }
    // a land whose worlds are all finished is coloured to its coasts, headlands, islets in its bays and all
    // and an islet with no world of its own is coloured in with the coast it lies off, once the worlds near it are finished
    const whole = terrain.lands.filter((l) => {
        const on = map.nodes.filter((n) =>
            inside(l, { x: n.box.x + n.box.w / 2, y: n.box.y + n.box.h / 2 }),
        );

        // a land that holds only places off the run is theirs: coloured to its coasts once each of their moments has happened
        const off = map.sides.flatMap((s, k) =>
            inside(l, { x: s.box.x + s.box.w / 2, y: s.box.y + s.box.h / 2 }) ? [k] : [],
        );
        if (on.length || off.length)
            return (
                on.every((n) => trip.places[n.i]?.state === "done") &&
                off.every((k) => !!trip.sides?.[k]?.moment)
            );
        const c = {
            x: l.reduce((a, q) => a + q.x, 0) / l.length,
            y: l.reduce((a, q) => a + q.y, 0) / l.length,
        };
        const by = map.nodes.filter(
            (n) => Math.hypot(n.box.x + n.box.w / 2 - c.x, n.box.y + n.box.h / 2 - c.y) < 8000,
        );
        return (
            area(l) < SMALL && by.length > 0 && by.every((n) => trip.places[n.i]?.state === "done")
        );
    });
    // the child's map: what has been reached, with a pencil margin round it, and one world ahead
    for (const c of circles) known.push({ ...c, r: c.r + KNOWN_PAST });
    let next: NonNullable<MapReach["frontier"]>["next"] = null;
    if (edge > last) {
        const road = map.roads[edge - 1],
            grow = last === trip.here ? k : 1;
        if (road)
            for (let j = 0; j < road.samples.length; j += 24) {
                const q = at(road.samples, j);
                known.push({ x: q.x, y: q.y, r: 950 });
            }
        known.push({ ...mid(edge), r: 1250 + 900 * grow });
        if (last === trip.here) next = { ...mid(edge), r0: 1250, r1: 2150 };
    }
    const isles = terrain.isles
        .map((x) => x.node)
        .filter((n) => !!trip.places[n] && trip.places[n]?.state !== "ahead");
    const frontier =
        here && growing && here.lessons.length
            ? {
                  node: trip.here,
                  from: Math.max(0, here.done.length - 1) / here.lessons.length,
                  to: k,
                  here: { ...mid(trip.here), r0: R0, r1: R },
                  ahead,
                  next,
              }
            : null;
    return { circles, isles, frontier, known, edge, whole };
}

/** The furthest world a child's map draws: one past the furthest the child has reached, or where they are. */
export function edgeOf(trip: Journey, n: number): number {
    const last = Math.max(trip.here, trip.places.map((p) => p.state !== "ahead").lastIndexOf(true));
    return Math.max(0, Math.min(n - 1, last + 1));
}

export function landOf(t: Terrain): Land {
    const plot = (x: number, y: number, w: number, h: number, skew: number): Pt[] => [
        { x, y },
        { x: x + w, y: y + skew },
        { x: x + w + skew * 0.4, y: y + h + skew },
        { x: x + skew * 0.4, y: y + h },
    ];
    const fields: Pt[][] = [];
    for (const f of FIELDS)
        for (let i = 0; i < f.cols; i++)
            for (let j = 0; j < f.rows; j++)
                fields.push(
                    plot(f.at.x + i * 470 + j * 60, f.at.y + j * 330, 440, 300, (i - 1) * 40),
                );
    // the southern shore's woods and ranges are drawn only when the shore is
    const dry = <T extends { at?: Pt; from?: Pt }>(x: T) =>
        onLand(t, x.at ?? x.from ?? { x: 0, y: 0 });
    return {
        coasts: t.lands,
        woods: WOODS.filter(dry),
        hills: HILLS.filter(dry),
        peaks: PEAKS.filter(dry),
        fields,
        ...FURNITURE,
    };
}
