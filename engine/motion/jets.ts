// Two little jets that hold a runner up, the pull of a planet, and a jetpack that flies free. After
// the top of a jump, a jump still held fires the jets: the runner's fall is braked to a slow sink and
// its run eases to a drift, for as long as the fuel lasts, and the fuel is full again once its feet
// are down. A planet's gravity keeps the runner's launch speed, so the same jump goes higher where the
// pull is lighter. A flyer is the jets left on: their thrust follows the hand over a moment, heats them
// past a hover's share until they sputter and cool, and the air and a moon's pull carry it. The runner
// is walker.ts's; squares and seconds, y growing downwards, pure.
import { grounded, type Moves, type Runner } from "./walker";

export interface Jets {
    /** Seconds of firing left. */
    fuel: number;
    on: boolean;
}

export interface JetSpec {
    /** Seconds of firing on a full tank. */
    seconds: number;
    /** Squares a second the runner sinks while they fire. */
    sink: number;
    /** Squares a second, each second, they take off a fall until it is down to the sink. */
    brake: number;
    /** Squares a second the runner drifts along while they fire. */
    drift: number;
}

export const jets = (spec: JetSpec): Jets => ({ fuel: spec.seconds, on: false });

/** What a step did to the jets: lit them, ran them dry, or neither. */
export type JetEvent = "lit" | "dry" | null;

/**
 * Decides before a runner's step whether the jets fire in it, and burns or refills the fuel. They
 * fire only in the air once the runner has stopped rising, so a held jump climbs its whole height first.
 */
export function stepJets(
    j: Jets,
    r: Runner,
    holding: boolean,
    spec: JetSpec,
    dt: number,
): JetEvent {
    if (grounded(r) || r.state === "climb") {
        j.fuel = spec.seconds;
        j.on = false;
        return null;
    }
    const was = j.on;
    j.on = holding && r.vy >= -0.5 && j.fuel > 0;
    if (!j.on) return was ? "dry" : null;
    j.fuel = Math.max(0, j.fuel - dt);
    return was ? (j.fuel <= 0 ? "dry" : null) : "lit";
}

/** The moves for a step while the jets fire: the fall braked towards the sink, and a slower run. */
export const hoverMoves = (m: Moves, r: Runner, spec: JetSpec, dt: number): Moves => ({
    ...m,
    fall: Math.max(spec.sink, r.vy - spec.brake * dt),
    speed: Math.min(m.speed, spec.drift),
});

/** The moves on a planet whose gravity is `gravity`: the launch speed kept, so the jump's height is scaled by the pull. */
export const onPlanet = (m: Moves, gravity: number): Moves => ({
    ...m,
    gravity,
    jump: (m.jump * m.gravity) / gravity,
});

/** A flyer on its jets: where it is and how fast, the thrust from nought to one, how hot the jets are from nought to one, seconds of sputter left, and its lean in radians. */
export interface Flyer {
    x: number;
    y: number;
    vx: number;
    vy: number;
    thrust: number;
    heat: number;
    sputter: number;
    lean: number;
}

export interface FlySpec {
    /** Squares a second, each second, down. */
    gravity: number;
    /** Squares a second, each second, up at full thrust. */
    power: number;
    /** How quickly the thrust follows the hand, per second. */
    spool: number;
    /** The share of thrust the jets hold without heating, a little over a hover's. */
    cruise: number;
    /** Heat a second at full thrust, so the jets overheat in one over this many seconds. */
    heat: number;
    /** Heat lost a second with the thrust off. */
    cool: number;
    /** Seconds the jets sputter once they overheat, at a sputter's thrust. */
    sputter: number;
    /** Squares a second, each second, a full steer gives along. */
    side: number;
    /** How quickly the flyer comes to the air's speed, per second. */
    drag: number;
    /** Squares a second, each second, a dive adds down. */
    dive: number;
    /** The fastest it flies, in squares a second. */
    most: number;
}

/** What the hands ask of a flyer: thrust from nought to one, a steer from -1 left to 1 right, and a dive. */
export interface FlyHands {
    lift: number;
    steer: number;
    dive: boolean;
}

/** A moon's pull: its middle, how hard it pulls close in, in squares a second each second, and how far it reaches. */
export interface Pull {
    x: number;
    y: number;
    strength: number;
    reach: number;
}

/** The thrust the jets hold while they sputter: a cough that slows a fall but cannot climb. */
const COUGH = 0.2;

export const flyer = (x: number, y: number): Flyer => ({
    x,
    y,
    vx: 0,
    vy: 0,
    thrust: 0,
    heat: 0,
    sputter: 0,
    lean: 0,
});

/** The share of thrust that holds the flyer still in the air. */
export const hoverShare = (spec: FlySpec): number => spec.gravity / spec.power;

/**
 * What a moon's pull adds to a flyer at a point: towards the moon, strongest close in and fading to
 * nothing at its reach, so a path bends smoothly and the jets can always climb away.
 */
export function pullAt(pulls: readonly Pull[], x: number, y: number): { x: number; y: number } {
    let ax = 0,
        ay = 0;
    for (const m of pulls) {
        const dx = m.x - x,
            dy = m.y - y,
            d = Math.hypot(dx, dy);
        if (d >= m.reach || d < 1e-6) continue;
        const a = m.strength * (1 - d / m.reach);
        ax += (dx / d) * a;
        ay += (dy / d) * a;
    }
    return { x: ax, y: ay };
}

/** What a step did to the jets: overheated into a sputter, came back from one, or neither. */
export type FlyEvent = "sputter" | "back" | null;

/**
 * One step of a flyer: the thrust eased towards the hand, or held at a cough while the jets sputter;
 * the jets heated past the cruise share and cooled under it; then gravity, the thrust, the steer, a
 * dive, the drag towards the air's own speed and the moons' pull move it.
 */
export function stepFlyer(
    f: Flyer,
    hands: FlyHands,
    air: { x: number; y: number },
    pulls: readonly Pull[],
    spec: FlySpec,
    dt: number,
): FlyEvent {
    let event: FlyEvent = null;
    const want = f.sputter > 0 ? COUGH : hands.dive ? 0 : Math.max(0, Math.min(1, hands.lift));
    f.thrust += (want - f.thrust) * (1 - Math.exp(-spec.spool * dt));
    if (f.sputter > 0) {
        f.sputter = Math.max(0, f.sputter - dt);
        f.heat = Math.max(0, f.heat - spec.cool * dt);
        if (f.sputter === 0) event = "back";
    } else {
        f.heat +=
            f.thrust > spec.cruise
                ? ((f.thrust - spec.cruise) / (1 - spec.cruise)) * spec.heat * dt
                : -spec.cool * (1 - f.thrust / spec.cruise) * dt;
        f.heat = Math.max(0, f.heat);
        if (f.heat >= 1) {
            f.heat = 1;
            f.sputter = spec.sputter;
            event = "sputter";
        }
    }
    const steer = Math.max(-1, Math.min(1, hands.steer)),
        g = pullAt(pulls, f.x, f.y);
    const ax = steer * spec.side + (air.x - f.vx) * spec.drag + g.x,
        ay =
            spec.gravity -
            f.thrust * spec.power +
            (hands.dive ? spec.dive : 0) +
            (air.y - f.vy) * spec.drag +
            g.y;
    f.vx += ax * dt;
    f.vy += ay * dt;
    const v = Math.hypot(f.vx, f.vy);
    if (v > spec.most) {
        f.vx *= spec.most / v;
        f.vy *= spec.most / v;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const lean = steer * 0.35 + Math.max(-0.2, Math.min(0.2, f.vx * 0.03));
    f.lean += (lean - f.lean) * (1 - Math.exp(-6 * dt));
    return event;
}
