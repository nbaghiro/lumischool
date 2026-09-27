// Measuring what has been built, seen from the side: the rooms under a roof, how tall a tower stands
// and how long a row runs along the ground. Everything is read off a test of whether a point is solid,
// so the same measures work for blocks, walls or anything a game can say is there. Squares, y down.

/** Whether the point is inside something solid. */
export type Solid = (x: number, y: number) => boolean;

export interface Room {
    /** Where the room's clear floor starts and ends, across. */
    a: number;
    b: number;
    width: number;
    /** The height of its floor, and the least clear height from the floor up to the roof. */
    floor: number;
    clear: number;
}

/** The roofed gaps in one column: from each floor up to the solid above it, lowest first. */
function gaps(
    solid: Solid,
    x: number,
    bottom: number,
    top: number,
    dy: number,
): { floor: number; roof: number }[] {
    const out: { floor: number; roof: number }[] = [];
    let y = bottom - dy / 2,
        floor: number | null = solid(x, bottom + dy / 2) ? bottom : null;
    for (; y > top; y -= dy) {
        const inside = solid(x, y);
        if (floor === null && !inside && solid(x, y + dy)) floor = y + dy / 2;
        else if (floor !== null && inside) {
            out.push({ floor, roof: y + dy / 2 });
            floor = null;
        }
    }
    return out;
}

/**
 * Every room between `a` and `b`: a run of columns each with a roofed gap at least `least` tall, whose
 * floors are at one height. `ground(x)` is the ground's top, where the first floor may be, and `sky` the
 * height above which nothing is looked for.
 */
export function rooms(
    solid: Solid,
    a: number,
    b: number,
    ground: (x: number) => number,
    sky: number,
    least: number,
    o: { dx?: number; dy?: number } = {},
): Room[] {
    const dx = o.dx ?? 0.1,
        dy = o.dy ?? 0.05,
        out: Room[] = [];
    // a column may hold rooms at several heights, one over another, so a run is kept open for each floor
    let open: Room[] = [];
    const keep = (r: Room) => {
        if (r.width > dx * 1.5) out.push(r);
    };
    for (let x = a + dx / 2; x < b; x += dx) {
        const here = gaps(solid, x, ground(x), sky, dy).filter((g) => g.floor - g.roof >= least);
        const next: Room[] = [];
        for (const g of here) {
            const run = open.find((r) => Math.abs(r.floor - g.floor) <= dy * 3);
            if (run) {
                run.b = x + dx / 2;
                run.width = run.b - run.a;
                run.clear = Math.min(run.clear, g.floor - g.roof);
                next.push(run);
            } else
                next.push({
                    a: x - dx / 2,
                    b: x + dx / 2,
                    width: dx,
                    floor: g.floor,
                    clear: g.floor - g.roof,
                });
        }
        for (const r of open) if (!next.includes(r)) keep(r);
        open = next;
    }
    for (const r of open) keep(r);
    return out.sort((p, q) => p.a - q.a || q.floor - p.floor);
}

/** How tall whatever stands at `x` is, from the ground there up to its top, or nought for nothing. */
export function heightAt(solid: Solid, x: number, ground: number, sky: number, dy = 0.05): number {
    for (let y = sky; y < ground; y += dy) if (solid(x, y)) return ground - y + dy / 2;
    return 0;
}

/**
 * The runs of something solid lying on the ground between `a` and `b`, just above the ground's top,
 * with a gap narrower than `join` counted as joined, so blocks set side by side make one run.
 */
export function rows(
    solid: Solid,
    a: number,
    b: number,
    ground: (x: number) => number,
    o: { dx?: number; join?: number; above?: number } = {},
): { a: number; b: number; length: number }[] {
    const dx = o.dx ?? 0.05,
        join = o.join ?? 0.15,
        above = o.above ?? 0.2;
    const out: { a: number; b: number; length: number }[] = [];
    let start: number | null = null,
        last = -Infinity;
    for (let x = a; x <= b; x += dx) {
        if (!solid(x, ground(x) - above)) continue;
        if (start === null || x - last > join + dx) {
            if (start !== null) out.push({ a: start, b: last, length: last - start });
            start = x;
        }
        last = x;
    }
    if (start !== null) out.push({ a: start, b: last, length: last - start });
    return out;
}
