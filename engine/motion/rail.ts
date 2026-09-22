// Rail vehicles on one straight track. Each has a middle, a speed, a length, a mass and how fast it
// slows by itself, and each is coupled to the next along the line or not. Coupled vehicles move
// together. A group that closes on the next at no more than a coupling speed hooks on to it, or
// shoves it along without a hook when the two were let go of each other by hand; one that closes
// faster knocks it, sharing momentum by mass and parting at a share of the speed they closed at, so
// a hard push sends a carriage rolling on. An end of the line, or a gap in it, stops a group and
// bounces it back, and nothing is ever pushed through one: a group pinned against a stop holds
// whatever pushes it. The driven vehicle's group goes at the speed it is driven, and is stopped only
// by a stop. Squares and seconds.

export interface Vehicle {
    id: string;
    /** Its middle, along the line. */
    x: number;
    v: number;
    /** From buffer to buffer. */
    length: number;
    mass: number;
    /** Squares a second each second it slows by itself: rolling for a carriage, braking for an engine. */
    slows: number;
}

export interface Line {
    /** In order along the line, lowest x first. Nothing passes anything, so moving never changes it. */
    vehicles: Vehicle[];
    /** Whether each vehicle is coupled to the next one along. */
    hooked: boolean[];
    /** Whether each vehicle was let go of the next by hand and has not yet parted from it, which keeps them from hooking on again. */
    parted: boolean[];
}

export interface Rules {
    /** The furthest along the line a vehicle's buffers reach, at each end. */
    ends: [number, number];
    /** Stretches of the line no vehicle may enter, such as where the rail has gone. */
    gaps: [number, number][];
    /** The closing speed at or under which two meeting groups hook on. */
    couple: number;
    /** The share of their closing speed two knocking groups part at. */
    give: number;
    /** The share of its speed a group bounces back off an end or a gap with. */
    rebound: number;
}

export type RailEvent =
    | { kind: "couple" | "knock"; left: string; right: string; speed: number }
    | { kind: "stop"; id: string; speed: number };

/** How far two vehicles that let go of each other have to part before they may hook on again. */
const APART = 0.4;
/** Buffers this close and closing count as meeting, so a gentle approach that stops just short still hooks on. */
const SNAP = 0.03;
const EPS = 1e-9;
const PASSES = 8;

export const emptyLine = (): Line => ({ vehicles: [], hooked: [], parted: [] });

/** The runs of coupled vehicles, as the indices of their first and last vehicle. */
export function groupsOf(line: Line): [number, number][] {
    const out: [number, number][] = [];
    let from = 0;
    for (let i = 0; i < line.vehicles.length; i++) {
        if (!line.hooked[i] || i === line.vehicles.length - 1) {
            out.push([from, i]);
            from = i + 1;
        }
    }
    return out;
}

/** Puts a vehicle on the line in its place, coupled to nothing. */
export function insert(line: Line, vehicle: Vehicle): void {
    let i = 0;
    while (i < line.vehicles.length && (line.vehicles[i]?.x ?? 0) < vehicle.x) i++;
    line.vehicles.splice(i, 0, vehicle);
    if (i > 0) {
        line.hooked[i - 1] = false;
        line.parted[i - 1] = false;
    }
    line.hooked.splice(i, 0, false);
    line.parted.splice(i, 0, false);
}

/** Takes a vehicle off the line, letting go of both its neighbours. */
export function remove(line: Line, id: string): Vehicle | null {
    const i = line.vehicles.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const [gone] = line.vehicles.splice(i, 1);
    line.hooked.splice(i, 1);
    line.parted.splice(i, 1);
    if (i > 0) {
        line.hooked[i - 1] = false;
        line.parted[i - 1] = false;
    }
    return gone ?? null;
}

/** Lets vehicle `i` go of the next one, so they come apart and do not hook on again until they have parted. */
export function unhook(line: Line, i: number): boolean {
    if (!line.hooked[i]) return false;
    line.hooked[i] = false;
    line.parted[i] = true;
    return true;
}

const edges = (line: Line, [a, b]: [number, number]) => {
    const first = line.vehicles[a],
        last = line.vehicles[b];
    return {
        left: first ? first.x - first.length / 2 : 0,
        right: last ? last.x + last.length / 2 : 0,
    };
};

const massOf = (line: Line, [a, b]: [number, number]) =>
    line.vehicles.slice(a, b + 1).reduce((m, x) => m + x.mass, 0);

const speedOf = (line: Line, g: [number, number], driven: string | null): number => {
    const run = line.vehicles.slice(g[0], g[1] + 1);
    const d = run.find((x) => x.id === driven);
    if (d) return d.v;
    const m = run.reduce((s, x) => s + x.mass, 0);
    return m > 0 ? run.reduce((s, x) => s + x.mass * x.v, 0) / m : 0;
};

const setGroup = (line: Line, [a, b]: [number, number], v: number, dx = 0): void => {
    for (let i = a; i <= b; i++) {
        const x = line.vehicles[i];
        if (!x) continue;
        x.v = v;
        x.x += dx;
    }
};

const holds = (line: Line, [a, b]: [number, number], id: string | null) =>
    id !== null && line.vehicles.slice(a, b + 1).some((x) => x.id === id);

const range = (from: number, to: number): number[] =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/** How far a group has to move to be clear of the ends and the gaps, and which side it touches. */
function clearance(
    e: { left: number; right: number },
    rules: Rules,
): { dx: number; side: -1 | 0 | 1 } {
    let dx = 0,
        side: -1 | 0 | 1 = 0;
    if (e.left <= rules.ends[0] + EPS) {
        dx = Math.max(0, rules.ends[0] - e.left);
        side = -1;
    } else if (e.right >= rules.ends[1] - EPS) {
        dx = Math.min(0, rules.ends[1] - e.right);
        side = 1;
    }
    for (const [a, b] of rules.gaps) {
        const mid = (e.left + e.right) / 2;
        if (mid < (a + b) / 2 && e.right >= a - EPS) {
            dx = Math.min(0, a - e.right);
            side = 1;
        } else if (mid >= (a + b) / 2 && e.left <= b + EPS) {
            dx = Math.max(0, b - e.left);
            side = -1;
        }
    }
    return { dx, side };
}

/**
 * One step of `dt` seconds. The driven vehicle's speed is set before the step and kept; every other
 * group slows by the most any of its vehicles slows by. What met what is returned.
 */
export function step(line: Line, dt: number, rules: Rules, driven: string | null): RailEvent[] {
    const out: RailEvent[] = [];
    for (const g of groupsOf(line)) {
        let v = speedOf(line, g, driven);
        if (!holds(line, g, driven)) {
            const slows = Math.max(...line.vehicles.slice(g[0], g[1] + 1).map((x) => x.slows));
            v = Math.sign(v) * Math.max(0, Math.abs(v) - slows * dt);
        }
        setGroup(line, g, v, v * dt);
    }
    // The ends, the gaps and the overlaps are worked out together over a few passes, since moving a
    // group off a stop can push it into the next, and a chain of them all has to give way at once.
    const stopped = new Set<string>(),
        met = new Set<string>();
    let blockedL: boolean[] = [],
        blockedR: boolean[] = [];
    for (let pass = 0; pass < PASSES; pass++) {
        const groups = groupsOf(line);
        blockedL = groups.map(() => false);
        blockedR = groups.map(() => false);
        let moved = 0;
        groups.forEach((g, k) => {
            const { dx, side } = clearance(edges(line, g), rules);
            if (side === 0) return;
            if (side < 0) blockedL[k] = true;
            else blockedR[k] = true;
            const v = speedOf(line, g, driven),
                into = Math.sign(v) === side && Math.abs(v) > EPS,
                hit = into && Math.abs(dx) > EPS,
                id = line.vehicles[g[0]]?.id ?? "";
            if (hit && !stopped.has(id)) {
                stopped.add(id);
                out.push({ kind: "stop", id, speed: Math.abs(v) });
            }
            // Only a group that ran into the stop this step bounces; one held against it just stops.
            const after = !into ? v : hit && !holds(line, g, driven) ? -v * rules.rebound : 0;
            setGroup(line, g, after, dx);
            moved += Math.abs(dx);
        });
        // Pairs are taken from the right when something is blocked on the right, so a chain pinned
        // against a stop is found in one pass rather than one group a pass.
        const order = groups.map((_, k) => k).slice(0, -1);
        if (blockedR.some(Boolean)) order.reverse();
        const touching = (kk: number) => {
            const p = groups[kk],
                q = groups[kk + 1];
            return (
                p !== undefined &&
                q !== undefined &&
                edges(line, q).left - edges(line, p).right <= EPS
            );
        };
        for (const k of order) {
            const g = groups[k],
                h = groups[k + 1];
            if (!g || !h) continue;
            const overlap = edges(line, g).right - edges(line, h).left,
                closing = speedOf(line, g, driven) - speedOf(line, h, driven) > EPS;
            if (overlap < -EPS && (overlap < -SNAP || !closing)) continue;
            // A pair that only touches passes a stop along, so a chain held against one all holds.
            if (overlap <= EPS && !closing) {
                if (blockedR[k + 1]) blockedR[k] = true;
                if (blockedL[k]) blockedL[k + 1] = true;
                continue;
            }
            moved += Math.abs(overlap);
            const vg = speedOf(line, g, driven),
                vh = speedOf(line, h, driven),
                u = vg - vh,
                pair = g[1],
                dg = holds(line, g, driven),
                dh = holds(line, h, driven),
                mg = massOf(line, g),
                mh = massOf(line, h);
            const left = line.vehicles[g[1]]?.id ?? "",
                right = line.vehicles[h[0]]?.id ?? "",
                key = `${left}>${right}`,
                first = !met.has(key);
            met.add(key);
            if (u > EPS) {
                if (u <= rules.couple) {
                    const v = dg ? vg : dh ? vh : (mg * vg + mh * vh) / (mg + mh);
                    setGroup(line, g, v);
                    setGroup(line, h, v);
                    if (!line.parted[pair]) {
                        line.hooked[pair] = true;
                        if (first) out.push({ kind: "couple", left, right, speed: u });
                    }
                } else {
                    if (dg) setGroup(line, h, vg + rules.give * u);
                    else if (dh) setGroup(line, g, vh - rules.give * u);
                    else {
                        const p = mg * vg + mh * vh;
                        setGroup(line, g, (p - mh * rules.give * u) / (mg + mh));
                        setGroup(line, h, (p + mg * rules.give * u) / (mg + mh));
                    }
                    if (first && !blockedR[k + 1])
                        out.push({ kind: "knock", left, right, speed: u });
                }
            }
            // The touching chains either side give way as one, so a long train pushed into a
            // stop is settled in a pass or two rather than one link a pass.
            let a = k;
            while (a > 0 && touching(a - 1)) a--;
            let b = k + 1;
            while (b + 1 < groups.length && touching(b)) b++;
            const holdL = blockedL[a] === true,
                holdR = blockedR[b] === true,
                drvL = range(a, k).some((kk) => holds(line, groups[kk] ?? [0, -1], driven)),
                drvR = range(k + 1, b).some((kk) => holds(line, groups[kk] ?? [0, -1], driven)),
                massL = range(a, k).reduce((m, kk) => m + massOf(line, groups[kk] ?? [0, -1]), 0),
                massR = range(k + 1, b).reduce(
                    (m, kk) => m + massOf(line, groups[kk] ?? [0, -1]),
                    0,
                );
            const shift = (from: number, to: number, dx: number) => {
                for (const kk of range(from, to)) {
                    const gg = groups[kk];
                    if (gg) setGroup(line, gg, speedOf(line, gg, driven), dx);
                }
            };
            if (holdR && !holdL) {
                shift(a, k, -overlap);
                for (const kk of range(a, k)) blockedR[kk] = true;
            } else if (holdL && !holdR) {
                shift(k + 1, b, overlap);
                for (const kk of range(k + 1, b)) blockedL[kk] = true;
            } else if (drvL && !drvR && !holdL) shift(k + 1, b, overlap);
            else if (drvR && !drvL && !holdR) shift(a, k, -overlap);
            else {
                shift(a, k, (-overlap * massR) / (massL + massR));
                shift(k + 1, b, (overlap * massL) / (massL + massR));
            }
        }
        if (moved <= EPS) break;
    }
    // A group pinned against a stop, or against a chain that is, cannot move that way at all.
    groupsOf(line).forEach((g, k) => {
        const v = speedOf(line, g, driven);
        if ((blockedR[k] && v > 0) || (blockedL[k] && v < 0)) setGroup(line, g, 0);
    });
    for (let i = 0; i + 1 < line.vehicles.length; i++) {
        const a = line.vehicles[i],
            b = line.vehicles[i + 1];
        if (a && b && b.x - b.length / 2 - (a.x + a.length / 2) > APART) line.parted[i] = false;
    }
    return out;
}
