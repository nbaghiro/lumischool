// Stones on ice, seen from above: a curling stone glides a long way on little friction, bends to one
// side as it slows by the way it was turned, and knocks other stones as equal weights do. Sweeping in
// front of a stone thins the friction, so it runs further, and takes some of the bend out, so it runs
// straighter, each by how hard the brooms work. Squares and seconds, y growing downwards, stepped in
// small fixed steps so a throw played twice ends in the same place. See .docs/engine.md.

export interface Stone {
    id: number;
    team: "ours" | "theirs";
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Which way it was turned: one curls it down the page as it slows, minus one up, nought not at all. */
    spin: number;
    /** How far it has turned on the ice, in radians, for drawing its handle. */
    turn: number;
    /** Gone from play: over the back line, across a side line, or taken off by the game. */
    out: boolean;
}

/** A stretch of ice that grips more (above one) or less (below one) than the rest. */
export interface Patch {
    x: number;
    y: number;
    w: number;
    h: number;
    friction: number;
}

export interface Sheet {
    /** A stone whose back edge is over the back line, or whose side crosses a side line, is out. */
    front: number;
    back: number;
    top: number;
    bottom: number;
    /** The stones' radius, in squares. */
    r: number;
    /** Squares a second each second the ice takes off a gliding stone. */
    friction: number;
    /** Squares a second each second a turned stone bends sideways near the end of its run. */
    curl: number;
    /** The share of their closing speed two stones keep when they knock. */
    restitution: number;
    /** Below this speed a stone has stopped. */
    rest: number;
    /** Squares a second each second a wind blows a moving stone down the page (up, if below nought). */
    wind?: number;
    patches?: Patch[];
}

/** How much a full sweep thins the friction, and how much of the bend it takes out. */
export const SWEEP_GLIDE = 0.15;
export const SWEEP_STRAIGHT = 0.55;

export type IceEvent =
    | { kind: "knock"; speed: number; x: number; y: number; a: number; b: number }
    | { kind: "out"; id: number; x: number; y: number }
    | { kind: "stop"; id: number; x: number; y: number };

/** Steps a second the stones are moved in, so a fast stone moves well under its radius in one. */
export const ICE_SUB = 240;

export const speedOf = (s: Stone): number => Math.hypot(s.vx, s.vy);
export const moving = (stones: readonly Stone[]): boolean =>
    stones.some((s) => !s.out && (s.vx !== 0 || s.vy !== 0));

function gripAt(sheet: Sheet, x: number, y: number): number {
    for (const p of sheet.patches ?? [])
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p.friction;
    return 1;
}

/** One small step of one stone's glide on its own: friction, the bend, the wind, and its turning. */
function glide(s: Stone, sheet: Sheet, sweep: number, dt: number): boolean {
    const v = speedOf(s);
    if (v === 0) return false;
    const decel = sheet.friction * gripAt(sheet, s.x, s.y) * (1 - SWEEP_GLIDE * sweep);
    if (v - decel * dt <= sheet.rest) {
        s.vx = 0;
        s.vy = 0;
        return true;
    }
    // a stone bends more as it slows, which is why a curler aims a little to the side of where it ends
    const bend =
        s.spin * sheet.curl * (1 - SWEEP_STRAIGHT * sweep) * (0.35 + 0.65 / (1 + v * 0.35));
    const ux = s.vx / v,
        uy = s.vy / v;
    s.vx += (-ux * decel - uy * bend) * dt;
    s.vy += (-uy * decel + ux * bend + (sheet.wind ?? 0)) * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.turn += s.spin * (0.4 + v * 0.06) * dt;
    return false;
}

function outOf(s: Stone, sheet: Sheet): boolean {
    return (
        s.x - sheet.r > sheet.back ||
        s.x + sheet.r < sheet.front ||
        s.y - sheet.r < sheet.top ||
        s.y + sheet.r > sheet.bottom
    );
}

/**
 * Moves every stone on by `dt` seconds: each glides, any two that touch knock, and a stone over the
 * back line or a side line goes out. `sweep` is how hard the brooms work in front of one stone, from
 * nought to one. Returns what happened, for the sounds and the game's rules.
 */
export function stepIce(
    stones: Stone[],
    sheet: Sheet,
    sweep: { id: number; level: number } | null,
    dt: number,
): IceEvent[] {
    const out: IceEvent[] = [];
    const n = Math.max(1, Math.round(dt * ICE_SUB)),
        h = dt / n;
    for (let k = 0; k < n; k++) {
        for (const s of stones) {
            if (s.out) continue;
            const level = sweep && sweep.id === s.id ? Math.max(0, Math.min(1, sweep.level)) : 0;
            if (glide(s, sheet, level, h)) out.push({ kind: "stop", id: s.id, x: s.x, y: s.y });
        }
        for (let i = 0; i < stones.length; i++) {
            const a = stones[i];
            if (!a || a.out) continue;
            for (let j = i + 1; j < stones.length; j++) {
                const b = stones[j];
                if (!b || b.out) continue;
                const dx = b.x - a.x,
                    dy = b.y - a.y,
                    d = Math.hypot(dx, dy),
                    touch = sheet.r * 2;
                if (d >= touch || d === 0) continue;
                const nx = dx / d,
                    ny = dy / d,
                    closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                // pushed apart so they only touch, half each
                const push = (touch - d) / 2;
                a.x -= nx * push;
                a.y -= ny * push;
                b.x += nx * push;
                b.y += ny * push;
                if (closing <= 0) continue;
                const give = ((1 + sheet.restitution) / 2) * closing;
                a.vx -= give * nx;
                a.vy -= give * ny;
                b.vx += give * nx;
                b.vy += give * ny;
                // a knocked stone leaves with little turn on it, and the one that struck keeps some
                a.spin *= 0.4;
                b.spin = 0;
                out.push({
                    kind: "knock",
                    speed: closing,
                    x: a.x + nx * sheet.r,
                    y: a.y + ny * sheet.r,
                    a: a.id,
                    b: b.id,
                });
            }
        }
        for (const s of stones) {
            if (s.out || !outOf(s, sheet)) continue;
            s.out = true;
            s.vx = 0;
            s.vy = 0;
            out.push({ kind: "out", id: s.id, x: s.x, y: s.y });
        }
    }
    return out;
}

/**
 * Where a stone launched alone would go, as points every `every` seconds, until it stops or leaves:
 * the dotted preview while aiming, and how a throw is planned. Other stones are left out, since a
 * preview that showed the knock would be the answer rather than a guide.
 */
export function path(
    from: Stone,
    sheet: Sheet,
    sweep = 0,
    every = 0.25,
    most = 30,
): { pts: { x: number; y: number }[]; stop: { x: number; y: number }; out: boolean } {
    const s: Stone = { ...from },
        pts = [{ x: s.x, y: s.y }],
        dt = 1 / 60;
    let t = 0,
        since = 0;
    while (t < most && speedOf(s) > 0) {
        const events = stepIce([s], sheet, sweep > 0 ? { id: s.id, level: sweep } : null, dt);
        t += dt;
        since += dt;
        if (since >= every) {
            pts.push({ x: s.x, y: s.y });
            since = 0;
        }
        if (events.some((e) => e.kind === "out"))
            return { pts, stop: { x: s.x, y: s.y }, out: true };
    }
    return { pts, stop: { x: s.x, y: s.y }, out: false };
}

/** How far a stone launched at `speed` glides on plain ice with no bend and no sweeping, in squares. */
export const glideOf = (speed: number, sheet: Sheet): number =>
    (speed * speed) / (2 * sheet.friction);

/** The launch speed that glides a stone `distance` squares on plain ice, unswept. */
export const speedFor = (distance: number, sheet: Sheet): number =>
    Math.sqrt(2 * sheet.friction * Math.max(0, distance));
