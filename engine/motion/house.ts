// A house of rooms on a plot, seen from the side, as a dollhouse is: rooms are boxes one storey tall
// and a whole number of squares wide, standing on the ground or wholly on rooms below; things stand
// on a room's floor or hang on its wall without overlapping one another; and the ways between rooms
// go along the floors, through the walls rooms share, and up the stairs. Squares and seconds, with y
// growing downwards. Pure and serialisable, so a game keeps its house in its state and a test reads
// it in node. See .docs/engine.md.
import type { Pt } from "./geometry";

/**
 * Where the house may stand: its first column's left edge, the ground's line, and how many columns
 * and storeys it may take. An open plot lets a house grow past `cols` and `floors`, which are then
 * only where it starts: `left` columns before the first, `right` after the last, and up to `top`
 * storeys, wide enough that a child never meets the edge.
 */
export interface Plot {
    x0: number;
    ground: number;
    cols: number;
    floors: number;
    open?: { left: number; right: number; top: number };
    /** A storey's height in squares. */
    storey: number;
    /** The narrowest and widest a room may be, in columns. */
    least: number;
    most: number;
}

export interface Room {
    id: number;
    kind: string;
    col: number;
    floor: number;
    w: number;
    /** Set for a flight of stairs: it takes no things, and it leads to the room over it. */
    climbs?: true;
}

/** Something in a room: `x` is its left side in squares from the room's left wall. */
export interface Thing {
    id: number;
    room: number;
    x: number;
    w: number;
    /** What it stands in: the floor, the wall, or flat under the floor's things as a rug lies; only things of one layer get in each other's way. */
    layer: string;
}

export interface Spot {
    col: number;
    floor: number;
}

export interface Place {
    room: number;
    x: number;
}

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** The line a floor's things stand on: the ground for the first storey. */
export const floorLine = (p: Plot, floor: number): number => p.ground - floor * p.storey;

export const boxOf = (p: Plot, r: Pick<Room, "col" | "floor" | "w">): Box => ({
    x: p.x0 + r.col,
    y: floorLine(p, r.floor + 1),
    w: r.w,
    h: p.storey,
});

export const areaOf = (p: Plot, r: Pick<Room, "w">): number => r.w * p.storey;

/** Whether a room or a slot lies on the plot: anywhere above the ground on an open one. */
const within = (p: Plot, r: Pick<Room, "col" | "floor" | "w">): boolean => {
    const o = p.open ?? { left: 0, right: 0, top: p.floors };
    return r.floor >= 0 && r.floor < o.top && r.col >= -o.left && r.col + r.w <= p.cols + o.right;
};

const across = (a: Pick<Room, "col" | "w">, b: Pick<Room, "col" | "w">): boolean =>
    a.col < b.col + b.w && b.col < a.col + a.w;

/** Whether every column of a room has a room under it, or it is on the ground. */
function borne(rooms: readonly Room[], r: Pick<Room, "col" | "floor" | "w">): boolean {
    if (r.floor === 0) return true;
    for (let c = r.col; c < r.col + r.w; c++)
        if (!rooms.some((u) => u.floor === r.floor - 1 && u.col <= c && c < u.col + u.w))
            return false;
    return true;
}

/** Whether a room of this shape can stand at its spot among `rooms`, leaving out the one with id `ignore`. */
export function canStand(
    p: Plot,
    rooms: readonly Room[],
    r: Pick<Room, "col" | "floor" | "w">,
    ignore = -1,
): boolean {
    if (r.w < p.least || r.w > p.most || !Number.isInteger(r.w)) return false;
    if (!within(p, r)) return false;
    const others = rooms.filter((o) => o.id !== ignore);
    if (others.some((o) => o.floor === r.floor && across(o, r))) return false;
    return borne(others, r);
}

/** Whether taking a room away leaves every other room standing. */
export function canLeave(rooms: readonly Room[], id: number): boolean {
    const rest = rooms.filter((o) => o.id !== id);
    return rest.every((o) => borne(rest, o));
}

/** An empty place in the house a room may go, `w` columns wide on a storey, drawn while nobody has taken it. */
export interface Slot {
    col: number;
    floor: number;
    w: number;
}

/**
 * The empty places a house shows for its next rooms: the shell's own slots no room has taken, a slot
 * over each room that nothing stands on, and one at each side of every room, as wide as fits up to
 * `w`. No slot overlaps a room or another slot. A shell slot shows even before anything holds it up,
 * so an upstairs the shell plans is there to see; the others show only where a room could stand.
 */
export function slotsOf(
    p: Plot,
    rooms: readonly Room[],
    shell: readonly Slot[],
    w: number,
): Slot[] {
    const out: Slot[] = [];
    const clear = (s: Slot) =>
        within(p, s) &&
        !rooms.some((r) => r.floor === s.floor && across(r, s)) &&
        !out.some((o) => o.floor === s.floor && across(o, s));
    for (const s of shell) if (clear(s)) out.push({ ...s });
    for (const r of rooms) {
        const up = { col: r.col, floor: r.floor + 1, w: r.w };
        if (clear(up) && canStand(p, rooms, up)) out.push(up);
        for (const side of [-1, 1]) {
            for (let k = Math.min(w, p.most); k >= p.least; k--) {
                const s = { col: side < 0 ? r.col - k : r.col + r.w, floor: r.floor, w: k };
                if (clear(s) && canStand(p, rooms, s)) {
                    out.push(s);
                    break;
                }
            }
        }
    }
    return out;
}

/** Which of a room's side walls it shares with a room beside it on its storey, where a doorway goes through. */
export function sharedWalls(
    rooms: readonly Room[],
    r: Pick<Room, "col" | "floor" | "w">,
): { left: boolean; right: boolean } {
    return {
        left: rooms.some((o) => o.floor === r.floor && o.col + o.w === r.col),
        right: rooms.some((o) => o.floor === r.floor && o.col === r.col + r.w),
    };
}

/**
 * The columns and storeys worth searching for a room `w` wide: the plot's own, and on an open plot
 * as far past the house as one room reaches and a storey over its top, which is everywhere a room
 * could stand since a room stands on the ground or on rooms.
 */
function reachOf(
    p: Plot,
    rooms: readonly Room[],
    w: number,
): { from: number; to: number; floors: number } {
    if (!p.open) return { from: 0, to: p.cols - w, floors: p.floors };
    const ends = rooms.flatMap((r) => [r.col, r.col + r.w]);
    const left = Math.min(0, ...ends),
        right = Math.max(p.cols, ...ends);
    return {
        from: Math.max(-p.open.left, left - w),
        to: Math.min(p.cols + p.open.right - w, right),
        floors: Math.min(p.open.top, Math.max(p.floors, ...rooms.map((r) => r.floor + 2))),
    };
}

/** Every spot a room `w` wide could stand in, lowest storey first, then from the left. */
export function spotsFor(p: Plot, rooms: readonly Room[], w: number, ignore = -1): Spot[] {
    const out: Spot[] = [];
    const r = reachOf(p, rooms, w);
    for (let floor = 0; floor < r.floors; floor++)
        for (let col = r.from; col <= r.to; col++)
            if (canStand(p, rooms, { col, floor, w }, ignore)) out.push({ col, floor });
    return out;
}

const middle = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** The spot nearest `at` for a room `w` wide, by the middle of the room it would be, within `reach` squares. */
export function nearestSpot(
    p: Plot,
    rooms: readonly Room[],
    w: number,
    at: Pt,
    reach: number,
    ignore = -1,
): Spot | null {
    let best: Spot | null = null,
        far = reach;
    for (const s of spotsFor(p, rooms, w, ignore)) {
        const m = middle(boxOf(p, { ...s, w })),
            d = Math.hypot(m.x - at.x, m.y - at.y);
        if (d <= far) {
            far = d;
            best = s;
        }
    }
    return best;
}

/**
 * The next spot from `from` a step to one side, or a storey up or down, for the keys: the nearest
 * along that storey, or on the nearest storey that way the nearest across. `from` itself when there
 * is none.
 */
export function stepSpot(
    p: Plot,
    rooms: readonly Room[],
    w: number,
    from: Spot,
    dx: number,
    dy: number,
    ignore = -1,
): Spot {
    const all = spotsFor(p, rooms, w, ignore);
    if (dx !== 0) {
        const along = all
            .filter((s) => s.floor === from.floor && Math.sign(s.col - from.col) === Math.sign(dx))
            .sort((a, b) => Math.abs(a.col - from.col) - Math.abs(b.col - from.col));
        return along[0] ?? from;
    }
    // up is a storey higher, which is up the screen
    const way = dy < 0 ? 1 : -1;
    const floors = [...new Set(all.map((s) => s.floor))]
        .filter((f) => Math.sign(f - from.floor) === way)
        .sort((a, b) => Math.abs(a - from.floor) - Math.abs(b - from.floor));
    const f = floors[0];
    if (f === undefined) return from;
    const there = all
        .filter((s) => s.floor === f)
        .sort((a, b) => Math.abs(a.col - from.col) - Math.abs(b.col - from.col));
    return there[0] ?? from;
}

/** The room a point is in, or null. */
export function roomAt(p: Plot, rooms: readonly Room[], at: Pt): Room | null {
    return (
        rooms.find((r) => {
            const b = boxOf(p, r);
            return at.x >= b.x && at.x <= b.x + b.w && at.y >= b.y && at.y <= b.y + b.h;
        }) ?? null
    );
}

/** How far a thing keeps from a room's walls. */
const MARGIN = 0.1;

/** Whether a thing `w` wide fits at `x` in a room, clear of the others in its layer. */
export function thingFits(
    rooms: readonly Room[],
    things: readonly Thing[],
    room: number,
    x: number,
    w: number,
    layer: string,
    ignore = -1,
): boolean {
    const r = rooms.find((o) => o.id === room);
    if (!r || r.climbs) return false;
    if (x < MARGIN - 1e-9 || x + w > r.w - MARGIN + 1e-9) return false;
    return !things.some(
        (t) =>
            t.id !== ignore &&
            t.room === room &&
            t.layer === layer &&
            x < t.x + t.w - 1e-9 &&
            t.x < x + w - 1e-9,
    );
}

/** Places a thing could go in a room, every half square from the left wall. */
export function placesIn(
    rooms: readonly Room[],
    things: readonly Thing[],
    r: Room,
    w: number,
    layer: string,
    ignore: number,
): number[] {
    const out: number[] = [];
    for (let x = MARGIN; x + w <= r.w - MARGIN + 1e-9; x += 0.5)
        if (thingFits(rooms, things, r.id, x, w, layer, ignore)) out.push(x);
    return out;
}

/**
 * Where a thing `w` wide held with its middle at `at` would go: in the room under it, as near as it
 * fits, or in the nearest room within `reach`. Null when nowhere near has room.
 */
export function nearestPlace(
    p: Plot,
    rooms: readonly Room[],
    things: readonly Thing[],
    w: number,
    layer: string,
    at: Pt,
    reach: number,
    ignore = -1,
): Place | null {
    let best: Place | null = null,
        far = reach;
    for (const r of rooms) {
        if (r.climbs) continue;
        const b = boxOf(p, r);
        const dy = at.y < b.y ? b.y - at.y : at.y > b.y + b.h ? at.y - b.y - b.h : 0;
        for (const x of placesIn(rooms, things, r, w, layer, ignore)) {
            const d = Math.hypot(b.x + x + w / 2 - at.x, dy);
            if (d < far - 1e-9) {
                far = d;
                best = { room: r.id, x };
            }
        }
    }
    return best;
}

/**
 * The next place from `from` for the keys: half a square along the room, then on into the room
 * beside it, or into the room a storey up or down. `from` itself when there is none.
 */
export function stepPlace(
    p: Plot,
    rooms: readonly Room[],
    things: readonly Thing[],
    w: number,
    layer: string,
    from: Place,
    dx: number,
    dy: number,
    ignore = -1,
): Place {
    const here = rooms.find((r) => r.id === from.room);
    if (!here) return from;
    const at = boxOf(p, here).x + from.x;
    const all: { place: Place; x: number; floor: number }[] = [];
    for (const r of rooms) {
        if (r.climbs) continue;
        for (const x of placesIn(rooms, things, r, w, layer, ignore))
            all.push({ place: { room: r.id, x }, x: boxOf(p, r).x + x, floor: r.floor });
    }
    const pick = (list: typeof all) =>
        list.sort((a, b) => Math.abs(a.x - at) - Math.abs(b.x - at))[0]?.place ?? from;
    if (dx !== 0)
        return pick(
            all.filter((c) => c.floor === here.floor && Math.sign(c.x - at) === Math.sign(dx)),
        );
    const way = dy < 0 ? 1 : -1;
    const floors = [...new Set(all.map((c) => c.floor))]
        .filter((f) => Math.sign(f - here.floor) === way)
        .sort((a, b) => Math.abs(a - here.floor) - Math.abs(b - here.floor));
    const f = floors[0];
    return f === undefined ? from : pick(all.filter((c) => c.floor === f));
}

/** Whether a room can take a new width, standing where it is and still holding everything in it. */
export function canResize(
    p: Plot,
    rooms: readonly Room[],
    things: readonly Thing[],
    id: number,
    w: number,
): boolean {
    const r = rooms.find((o) => o.id === id);
    if (!r || !canStand(p, rooms, { ...r, w }, id)) return false;
    const rest = rooms.map((o) => (o.id === id ? { ...o, w } : o));
    if (!rest.every((o) => borne(rest, o))) return false;
    return things.every((t) => t.room !== id || t.x + t.w <= w - MARGIN + 1e-9);
}

/** Where the outside is, for a walker: a point on the ground beside the house. */
export type Where = Place | { room: null; x: number };

const isOut = (w: Where): w is { room: null; x: number } => w.room === null;

/**
 * The points a walker walks through from one place to another, the first being where it is and the
 * last where it is going: along a floor, through a wall two rooms share, and up or down the stairs
 * from one storey to the room over them. Outside joins every room of the first storey with an end
 * wall nobody shares. Null when there is no way.
 */
export function wayBetween(p: Plot, rooms: readonly Room[], from: Where, to: Where): Pt[] | null {
    const OUT = -1;
    const at = (w: Where): Pt => {
        if (isOut(w)) return { x: w.x, y: p.ground };
        const r = rooms.find((o) => o.id === w.room);
        return r ? { x: boxOf(p, r).x + w.x, y: floorLine(p, r.floor) } : { x: w.x, y: p.ground };
    };
    // the steps between two rooms, as the points walked through on the way
    const links = new Map<number, { to: number; via: Pt[] }[]>();
    const link = (a: number, b: number, via: Pt[]) => {
        links.set(a, [...(links.get(a) ?? []), { to: b, via }]);
        links.set(b, [...(links.get(b) ?? []), { to: a, via: [...via].reverse() }]);
    };
    for (const a of rooms)
        for (const b of rooms) {
            if (a.floor === b.floor && a.col + a.w === b.col) {
                const x = p.x0 + b.col,
                    y = floorLine(p, a.floor);
                link(a.id, b.id, [{ x, y }]);
            }
            if (a.climbs && b.floor === a.floor + 1) {
                const top = a.col + a.w - 0.5;
                if (b.col <= top && top < b.col + b.w) {
                    const ba = boxOf(p, a);
                    link(a.id, b.id, [
                        { x: ba.x + 0.4, y: floorLine(p, a.floor) },
                        { x: ba.x + ba.w - 0.4, y: floorLine(p, b.floor) },
                    ]);
                }
            }
        }
    for (const r of rooms) {
        if (r.floor !== 0) continue;
        const left = !rooms.some((o) => o.floor === 0 && o.col + o.w === r.col),
            right = !rooms.some((o) => o.floor === 0 && o.col === r.col + r.w);
        const b = boxOf(p, r);
        if (left)
            link(OUT, r.id, [
                { x: b.x - 0.6, y: p.ground },
                { x: b.x, y: p.ground },
            ]);
        if (right)
            link(OUT, r.id, [
                { x: b.x + b.w + 0.6, y: p.ground },
                { x: b.x + b.w, y: p.ground },
            ]);
    }
    const start = isOut(from) ? OUT : from.room,
        end = isOut(to) ? OUT : to.room;
    const came = new Map<number, { from: number; via: Pt[] }>([[start, { from: start, via: [] }]]);
    const queue = [start];
    while (queue.length) {
        const n = queue.shift();
        if (n === undefined || n === end) break;
        for (const l of links.get(n) ?? []) {
            if (came.has(l.to)) continue;
            came.set(l.to, { from: n, via: l.via });
            queue.push(l.to);
        }
    }
    if (!came.has(end)) return null;
    const legs: Pt[][] = [];
    for (let n = end; n !== start;) {
        const c = came.get(n);
        if (!c) return null;
        legs.unshift(c.via);
        n = c.from;
    }
    return [at(from), ...legs.flat(), at(to)];
}

/** A walker moved `d` squares along its way: where it is now, what is left of the way, and which way it faces. */
export function travel(
    way: readonly Pt[],
    at: Pt,
    d: number,
): { at: Pt; way: Pt[]; facing: 1 | -1 | 0 } {
    let here = { ...at },
        left = d,
        facing: 1 | -1 | 0 = 0;
    const rest = [...way];
    while (left > 1e-9 && rest.length) {
        const next = rest[0];
        if (!next) break;
        const dx = next.x - here.x,
            dy = next.y - here.y,
            len = Math.hypot(dx, dy);
        if (Math.abs(dx) > 1e-6) facing = dx > 0 ? 1 : -1;
        if (len <= left) {
            here = { ...next };
            left -= len;
            rest.shift();
        } else {
            here = { x: here.x + (dx / len) * left, y: here.y + (dy / len) * left };
            left = 0;
        }
    }
    return { at: here, way: rest, facing };
}
