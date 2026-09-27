// Figures that move over surfaces, seen from the side, in squares and seconds with y growing downwards.
// A walker walks where the game sends it: it keeps to the surface, strides over a gap narrower than a
// stride, stops at the edge of a wider one and falls when the surface under it goes. A runner is
// steered: it runs, jumps with a buffer and a moment's grace off an edge, falls, climbs ladders,
// jumps up through one-way floors and rides moving ones. The surfaces are the game's to say.

export interface Walker {
    x: number;
    /** Where the feet are. */
    y: number;
    /** Squares a second downwards, while falling. */
    vy: number;
    facing: 1 | -1;
    state: "stand" | "walk" | "fall";
    /** How far through its steps it is, in steps, for the bob and the swing of a stride. */
    stride: number;
}

export interface Gait {
    /** Squares a second along the ground. */
    speed: number;
    /** The widest gap a stride crosses without stopping. */
    reach: number;
    /** The highest step up or down it takes; anything more is an edge. */
    step: number;
    /** Squares a second, each second, while falling. */
    gravity: number;
    /** Squares a step covers, for the stride. */
    pace: number;
}

/** The height of the surface at `x`, or null over nothing. */
export type Ground = (x: number) => number | null;

/** What a step did: walked on, stopped at an edge, began to fall, is still falling, or came down on something. */
export type Stepped = "stand" | "walk" | "edge" | "fell" | "falling" | "landed";

export const walker = (x: number, y: number, facing: 1 | -1 = 1): Walker => ({
    x,
    y,
    vy: 0,
    facing,
    state: "stand",
    stride: 0,
});

/** Whether a stride from `x` finds ground within reach at a height it can step to, and where. */
function ahead(w: Walker, ground: Ground, g: Gait, x: number): number | null {
    for (let d = 0.05; d <= g.reach + 1e-9; d += 0.05) {
        const h = ground(x + w.facing * d);
        if (h !== null && Math.abs(h - w.y) <= g.step) return h;
    }
    return null;
}

/** One step of `dt` seconds. A walker only walks when told to, by setting its state to "walk". */
export function stepWalker(w: Walker, ground: Ground, g: Gait, dt: number): Stepped {
    if (w.state === "fall") {
        w.vy += g.gravity * dt;
        const next = w.y + w.vy * dt,
            h = ground(w.x);
        if (h !== null && w.y <= h && next >= h) {
            w.y = h;
            w.vy = 0;
            w.state = "stand";
            return "landed";
        }
        w.y = next;
        return "falling";
    }
    const under = ground(w.x);
    // mid-stride over a gap there is nothing under the feet, and that is not a fall
    const striding = w.state === "walk" && under === null && ahead(w, ground, g, w.x) !== null;
    if (!striding && (under === null || under > w.y + g.step)) {
        w.state = "fall";
        w.vy = 0;
        return "fell";
    }
    if (under !== null) w.y = under;
    if (w.state !== "walk") return "stand";
    const nx = w.x + w.facing * g.speed * dt,
        h = ground(nx);
    if (h !== null && Math.abs(h - w.y) <= g.step) {
        w.x = nx;
        w.y = h;
        w.stride += (g.speed * dt) / g.pace;
        return "walk";
    }
    // over a gap: stride across it if the far side is within reach, and otherwise stop at the edge
    const across = ahead(w, ground, g, w.x);
    if (across !== null) {
        w.x = nx;
        w.stride += (g.speed * dt) / g.pace;
        return "walk";
    }
    w.state = "stand";
    return "edge";
}

/** How high the body rides above the feet at a point in its stride: up on each step and down between. */
export const bob = (w: Walker, lift: number): number =>
    w.state === "walk" ? -Math.abs(Math.sin(w.stride * Math.PI)) * lift : 0;

/**
 * A surface a runner can stand on. A one-way surface is jumped up through from below and dropped
 * through from above, as a shelf or a floor on stilts is; a moving one carries what stands on it.
 */
export interface Surface {
    y: number;
    oneWay?: boolean;
    /** Squares a second the surface moves by, sideways and down. */
    vx?: number;
    vy?: number;
}

/** The highest surface at `x` whose height is between `from` and `to` (from above to below), or null. */
export type Floor = (x: number, from: number, to: number) => Surface | null;

/** What a runner moves through: the floors, and where it may, the solid things and the ladders. */
export interface Course {
    floor: Floor;
    /** Whether (x, y) is inside something solid: a wall stops a run and a ceiling ends a jump. */
    solid?: (x: number, y: number) => boolean;
    /** Whether there is a ladder to hold at (x, y). */
    ladder?: (x: number, y: number) => boolean;
}

/** A figure a child steers, or a game steers for them: running, jumping, falling and climbing. */
export interface Runner {
    x: number;
    /** Where the feet are. */
    y: number;
    vx: number;
    vy: number;
    facing: 1 | -1;
    state: "stand" | "run" | "rise" | "fall" | "climb";
    /** How far through its steps it is, in steps. */
    stride: number;
    /** Seconds since the feet left a surface without jumping; a jump is still allowed for `coyote` of them. */
    air: number;
    /** Seconds a jump press has waited for the feet to find a surface, or -1 when none waits. */
    wait: number;
    /** The height of a one-way surface dropped through, ignored until the feet are below it. */
    through: number | null;
    /** Squares a second downwards it last landed at, for the squash a drawing gives it. */
    landed: number;
}

export interface Moves {
    /** Squares a second at a run. */
    speed: number;
    /** Squares a second, each second, towards the wanted speed on a surface and in the air. */
    accel: number;
    airAccel: number;
    gravity: number;
    /** How high a held jump rises, in squares. */
    jump: number;
    /** How many times gravity pulls on a rise once the jump is let go, so a tap is a small hop. */
    cut: number;
    /** Seconds after running off an edge that a jump still works, and before landing that a press is kept. */
    coyote: number;
    buffer: number;
    /** The highest step up or down it runs over; anything higher is a wall or an edge. */
    step: number;
    /** The fastest it falls, in squares a second. */
    fall: number;
    /** Squares a second up or down a ladder. */
    climb: number;
    /** Squares a step covers, for the stride. */
    pace: number;
    /** How tall it is, for a ceiling. */
    height: number;
}

/** What the runner is asked to do this step: which way to run, whether jump is held or was just pressed, which way to climb, and whether to drop through. */
export interface Intent {
    run: -1 | 0 | 1;
    jump: boolean;
    jumped: boolean;
    climb?: -1 | 0 | 1;
    drop?: boolean;
}

export type Ran = "jumped" | "landed" | "left" | "bumped" | "grabbed" | "dropped";

export const runner = (x: number, y: number, facing: 1 | -1 = 1): Runner => ({
    x,
    y,
    vx: 0,
    vy: 0,
    facing,
    state: "stand",
    stride: 0,
    air: 0,
    wait: -1,
    through: null,
    landed: 0,
});

export const grounded = (r: Runner): boolean => r.state === "stand" || r.state === "run";

/** The surface under the feet, within a step of them, skipping one dropped through. */
function under(r: Runner, c: Course, m: Moves, x: number): Surface | null {
    const s = c.floor(x, r.y - m.step, r.y + m.step);
    if (s && s.oneWay && r.through !== null && s.y <= r.through + 1e-6)
        return c.floor(x, r.through + 1e-3, r.y + m.step);
    return s;
}

const toward = (v: number, want: number, by: number): number =>
    v < want ? Math.min(want, v + by) : Math.max(want, v - by);

/** One step of `dt` seconds, and what happened in it. */
export function stepRunner(r: Runner, i: Intent, c: Course, m: Moves, dt: number): Ran[] {
    const out: Ran[] = [];
    if (i.jumped) r.wait = 0;
    else if (r.wait >= 0) {
        r.wait += dt;
        if (r.wait > m.buffer) r.wait = -1;
    }
    if (i.run !== 0) r.facing = i.run;
    const climb = i.climb ?? 0;
    if (r.state !== "climb" && climb !== 0 && c.ladder?.(r.x, r.y - m.height / 2)) {
        r.state = "climb";
        r.vx = 0;
        r.vy = 0;
        out.push("grabbed");
    }
    if (r.state === "climb") return climbing(r, i, c, m, dt, out);
    if (grounded(r)) {
        const on = under(r, c, m, r.x);
        if (on && i.drop && on.oneWay) {
            r.through = on.y;
            r.state = "fall";
            r.air = m.coyote;
            out.push("dropped");
        } else if (on) {
            r.x += (on.vx ?? 0) * dt;
            r.y = on.y + (on.vy ?? 0) * dt;
        }
    }
    const canJump = grounded(r) || (r.state === "fall" && r.air < m.coyote);
    if (r.wait >= 0 && canJump) {
        r.vy = -Math.sqrt(2 * m.gravity * m.jump);
        r.state = "rise";
        r.wait = -1;
        r.air = m.coyote;
        out.push("jumped");
    }
    r.vx = toward(r.vx, i.run * m.speed, (grounded(r) ? m.accel : m.airAccel) * dt);
    const nx = r.x + r.vx * dt;
    if (c.solid?.(nx + r.facing * 0.2, r.y - m.step - 0.05)) {
        if (Math.abs(r.vx) > 0.5) out.push("bumped");
        r.vx = 0;
    } else r.x = nx;
    r.stride += (Math.abs(r.vx) * dt) / m.pace;
    if (grounded(r)) {
        const on = under(r, c, m, r.x);
        if (on) {
            r.y = on.y;
            r.state = Math.abs(r.vx) > 0.05 ? "run" : "stand";
            return out;
        }
        r.state = "fall";
        r.air = 0;
        r.vy = 0;
        out.push("left");
    }
    return airborne(r, i, c, m, dt, out);
}

function airborne(r: Runner, i: Intent, c: Course, m: Moves, dt: number, out: Ran[]): Ran[] {
    r.air += dt;
    const pull = r.state === "rise" && !i.jump ? m.gravity * m.cut : m.gravity;
    const v0 = r.vy;
    r.vy = Math.min(m.fall, r.vy + pull * dt);
    if (r.state === "rise" && r.vy >= 0) r.state = "fall";
    // the mean of the speeds over the step, so a jump's arc is the parabola whatever the rate
    const ny = r.y + ((v0 + r.vy) / 2) * dt;
    if (r.vy < 0 && c.solid?.(r.x, ny - m.height)) {
        r.vy = 0;
        r.state = "fall";
        out.push("bumped");
        return out;
    }
    if (r.through !== null && r.y > r.through + 0.05) r.through = null;
    if (r.vy >= 0) {
        let s = c.floor(r.x, r.y - 1e-6, ny);
        if (s && s.oneWay && r.through !== null && s.y <= r.through + 1e-6)
            s = c.floor(r.x, r.through + 1e-3, ny);
        if (s) {
            r.landed = r.vy;
            r.y = s.y;
            r.vy = 0;
            r.state = Math.abs(r.vx) > 0.05 ? "run" : "stand";
            out.push("landed");
            return out;
        }
    }
    r.y = ny;
    return out;
}

function climbing(r: Runner, i: Intent, c: Course, m: Moves, dt: number, out: Ran[]): Ran[] {
    if (r.wait >= 0) {
        r.vy = -Math.sqrt(2 * m.gravity * m.jump) * 0.6;
        r.state = "rise";
        r.wait = -1;
        r.air = m.coyote;
        out.push("jumped");
        return out;
    }
    const climb = i.climb ?? 0;
    r.y += climb * m.climb * dt;
    r.stride += (Math.abs(climb) * m.climb * dt) / m.pace;
    const s = c.floor(r.x, r.y - 0.1, r.y + 0.1);
    // off the top of the ladder, or down at its foot, the feet are on a floor again
    if (s && (climb > 0 || !c.ladder?.(r.x, r.y - m.height / 2))) {
        r.y = s.y;
        r.state = "stand";
        out.push("landed");
    } else if (!c.ladder?.(r.x, r.y - 0.05) && !c.ladder?.(r.x, r.y - m.height / 2)) {
        r.state = "fall";
        r.air = m.coyote;
    }
    return out;
}

/**
 * What a runner the game steers asks for to reach `x`: run towards it, and jump at a ledge ahead
 * that is higher than a step and within a jump. It stops within `near` of the place.
 */
export function seek(r: Runner, x: number, c: Course, m: Moves, near = 0.15): Intent {
    const d = x - r.x;
    if (Math.abs(d) <= near) return { run: 0, jump: false, jumped: false };
    const dir = d > 0 ? 1 : -1;
    if (!grounded(r)) return { run: dir, jump: r.state === "rise", jumped: false };
    const look = Math.min(Math.abs(d), 0.8);
    const ledge = c.floor(r.x + dir * look, r.y - m.jump * 0.95, r.y - m.step);
    const wall = c.solid?.(r.x + dir * look, r.y - m.step - 0.05) ?? false;
    const jump = ledge !== null || wall;
    return { run: dir, jump, jumped: jump };
}
