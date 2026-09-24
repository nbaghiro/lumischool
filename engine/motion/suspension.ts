import type { Pt } from "./geometry";
import { springAt } from "./spring";

export interface Suspended extends Pt {
    vx: number;
    vy: number;
}

/** A bounded, damped load following a support. Kept independent of the thing being carried. */
export function suspend(load: Suspended, target: Pt, dt: number, lag = 0.8): Suspended {
    if (
        ![load.x, load.y, load.vx, load.vy, target.x, target.y, dt, lag].every(Number.isFinite) ||
        dt < 0 ||
        dt > 0.25 ||
        lag <= 0
    )
        throw new RangeError("Suspension needs finite positions and a bounded positive step.");
    const x = springAt({ hz: 3, zeta: 0.8 }, load.x, target.x, load.vx, dt);
    const y = springAt({ hz: 4, zeta: 1 }, load.y, target.y, load.vy, dt);
    const bounded = (value: number, centre: number) =>
        Math.max(centre - lag, Math.min(centre + lag, value));
    return { x: bounded(x.x, target.x), y: bounded(y.x, target.y), vx: x.v, vy: y.v };
}
