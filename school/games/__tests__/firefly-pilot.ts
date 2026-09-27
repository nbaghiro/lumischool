// A child's flying, for the tests: to the next seed, or first to any fallen bead, round the hedges,
// the nettles, the webs and where the frogs sit, by a finger held ahead or by the arrow keys.
import { emptyPad, spent } from "../../../engine/motion/pad";
import type { Pt } from "../../../engine/motion/geometry";
import { FIREFLY, seedAt, step, wantedSeed, type FireflyState } from "../snake";

const G = 27;

/** Whether a whole square is somewhere the pilot keeps out of. */
function blocked(s: FireflyState, x: number, y: number): boolean {
    const L = s.L;
    if (x < 1 || x > L.across - 1 || y < 2 || y > G - 1) return true;
    for (const h of L.hedges)
        if (x > h.x - 1.3 && x < h.x + h.w + 1.3 && y > h.y - 1.3 && y < h.y + h.h + 1.3)
            return true;
    for (const n of L.nettles) {
        const half = (Math.ceil(n.stems * 1.4 + 1.4) * 0.9) / 2;
        if (Math.abs(x - n.x) < half + 1.5 && y > G - 5) return true;
    }
    for (const w of L.webs) if (Math.hypot(x - w.x, y - w.y) < w.r + 1.2) return true;
    for (const f of L.frogs) if (x > f.from - 5 && x < f.to + 5 && y > G - 7) return true;
    return false;
}

/** The next square to head for on a shortest way through the garden to `to`. */
function waypoint(s: FireflyState, to: Pt): Pt {
    const W = Math.ceil(s.L.across),
        key = (x: number, y: number) => y * (W + 1) + x;
    const start = { x: Math.round(s.at.x), y: Math.round(s.at.y) },
        goal = { x: Math.round(to.x), y: Math.round(to.y) };
    const from = new Map<number, number>(),
        q: Pt[] = [start];
    from.set(key(start.x, start.y), -1);
    let found = false;
    for (let k = 0; k < q.length; k++) {
        const c = q[k] ?? start;
        if (Math.abs(c.x - goal.x) <= 1 && Math.abs(c.y - goal.y) <= 1) {
            found = true;
            let at = key(c.x, c.y);
            const trail: number[] = [];
            while (at !== -1) {
                trail.push(at);
                at = from.get(at) ?? -1;
            }
            // look a few squares ahead along the way
            const ahead = trail[Math.max(0, trail.length - 4)] ?? key(goal.x, goal.y);
            if (trail.length <= 4) return to;
            return { x: ahead % (W + 1), y: Math.floor(ahead / (W + 1)) };
        }
        for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
        ] as const) {
            const nx = c.x + dx,
                ny = c.y + dy,
                nk = key(nx, ny);
            if (from.has(nk)) continue;
            const near = Math.abs(nx - goal.x) <= 1 && Math.abs(ny - goal.y) <= 1;
            if (!near && blocked(s, nx, ny)) continue;
            from.set(nk, key(c.x, c.y));
            q.push({ x: nx, y: ny });
        }
    }
    return found ? to : to;
}

/** Where the pilot is flying to now: a fallen bead first, then the seed the count wants. */
export function aimOf(s: FireflyState): Pt | null {
    let best: Pt | null = null;
    for (const b of s.loose)
        if (
            !best ||
            Math.hypot(b.x - s.at.x, b.y - s.at.y) < Math.hypot(best.x - s.at.x, best.y - s.at.y)
        )
            best = { x: b.x, y: b.y };
    if (best) return best;
    const want = wantedSeed(s);
    return want ? seedAt(s, want) : null;
}

/** Flies until the level is won or `most` steps have gone. */
export function pilot(s: FireflyState, input: "pointer" | "keys", most = 60 * 300): void {
    const pad = emptyPad();
    let way: Pt | null = null;
    for (let t = 0; t < most && !s.won; t++) {
        const aim = aimOf(s);
        if (t % 10 === 0 || !way) way = aim ? waypoint(s, aim) : null;
        const to = way ?? s.at;
        if (input === "pointer") pad.touch = to;
        else {
            const want = Math.atan2(to.y - s.at.y, to.x - s.at.x);
            let d = want - s.heading;
            d = Math.atan2(Math.sin(d), Math.cos(d));
            pad.holding = Math.abs(d) < 0.08 ? [] : [d < 0 ? "left" : "right"];
            pad.go = Math.abs(d) < 0.4 && Math.hypot(to.x - s.at.x, to.y - s.at.y) > 4;
            pad.brake = Math.abs(d) > 1.6 && FIREFLY.cruise.value > 0;
        }
        step(s, pad);
        spent(pad);
    }
}
