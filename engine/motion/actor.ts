// A shelf character moving as its poses: the pose its movement calls for, cycled by its stride or its
// clock, a short cross-fade from the last pose, a squash on landing that springs back, and the way it
// faces. The drawings have poses and not joints, so blending is a fade. Pure and serialisable, so a
// game keeps an Actor in its state and a test reads it in node.
import type { Sprite } from "./scene";

/** The poses an act shows in turn, changing every `per` steps of the stride, or every `every` seconds. */
export interface Cycle {
    poses: readonly [string, ...string[]];
    per?: number;
    every?: number;
}

export interface Actor<A extends string> {
    act: A;
    /** The pose shown last, fading out for `fade` more seconds. */
    was: string;
    fade: number;
    /** Seconds in this act. */
    since: number;
    /** How squashed it is (above nought is flatter and wider), and how fast that is changing. */
    squash: number;
    give: number;
    facing: 1 | -1;
}

/** Seconds a pose takes to fade into the next. */
export const FADE = 0.12;
/** How much a landing at a square a second squashes, and the most any landing does. */
const SQUASH_PER = 0.035,
    SQUASH_MOST = 0.3;
/** The squash's spring: quick, and a little bouncy, so a landing reads without wobbling on. */
const HZ = 5,
    ZETA = 0.45;

export const actor = <A extends string>(act: A, pose: string, facing: 1 | -1 = 1): Actor<A> => ({
    act,
    was: pose,
    fade: 0,
    since: 0,
    squash: 0,
    give: 0,
    facing,
});

/** The pose an actor shows now, for the act's cycle and the stride it has walked. */
export function poseOf<A extends string>(a: Actor<A>, acts: Record<A, Cycle>, stride = 0): string {
    const c = acts[a.act];
    const n = c.poses.length;
    const k = c.per ? Math.floor(stride / c.per) : c.every ? Math.floor(a.since / c.every) : 0;
    return c.poses[((k % n) + n) % n] ?? c.poses[0];
}

/** Moves the actor on by `dt` into `act`, fading from the pose it showed if the act changed. */
export function stepActor<A extends string>(
    a: Actor<A>,
    act: A,
    acts: Record<A, Cycle>,
    dt: number,
    stride = 0,
    facing?: 1 | -1,
): void {
    if (act !== a.act) {
        a.was = poseOf(a, acts, stride);
        a.fade = FADE;
        a.act = act;
        a.since = 0;
    } else {
        a.since += dt;
        a.fade = Math.max(0, a.fade - dt);
    }
    if (facing) a.facing = facing;
    const w = 2 * Math.PI * HZ;
    a.give += (-w * w * a.squash - 2 * ZETA * w * a.give) * dt;
    a.squash += a.give * dt;
    if (Math.abs(a.squash) < 1e-4 && Math.abs(a.give) < 1e-3) a.squash = a.give = 0;
}

/** A landing at `speed` squares a second: the body squashes by how hard it came down. */
export function land<A extends string>(a: Actor<A>, speed: number): void {
    a.squash = Math.min(SQUASH_MOST, Math.max(0, speed) * SQUASH_PER);
    a.give = 0;
}

/**
 * The sprites an actor is drawn as: `dress` gives the sprite for a pose and a facing, and the actor
 * adds the squash and, while a pose fades, the one before it under the new one. At `rest` it is
 * the pose alone, with nothing moving.
 */
export function actorSprites<A extends string>(
    a: Actor<A>,
    acts: Record<A, Cycle>,
    dress: (pose: string, facing: 1 | -1) => Sprite,
    stride = 0,
    rest = false,
): Sprite[] {
    const pose = poseOf(a, acts, stride),
        now = dress(pose, a.facing);
    if (rest) return [now];
    const out: Sprite[] = [];
    if (a.fade > 0 && a.was !== pose) {
        const before = dress(a.was, a.facing);
        out.push({
            ...before,
            key: `${before.key}:was`,
            alpha: a.fade / FADE,
            z: (before.z ?? 0) - 0.01,
        });
    }
    out.push(a.squash === 0 ? now : { ...now, squash: (now.squash ?? 0) + a.squash });
    return out;
}
