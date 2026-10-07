import type { Pt } from "./geometry";

export interface Parcel extends Pt {
    vx: number;
    vy: number;
}

/** Constant acceleration over one substep; the preview and live parcel use the same step. */
export function stepParcel(p: Parcel, wind: number, gravity: number, dt: number): void {
    p.x += p.vx * dt + 0.5 * wind * dt * dt;
    p.y += p.vy * dt + 0.5 * gravity * dt * dt;
    p.vx += wind * dt;
    p.vy += gravity * dt;
}

/** Swept crossing keeps a fast parcel from skipping a narrow opening between frames. */
export function crossingAt(from: Pt, to: Pt, y: number): number | null {
    if (from.y > y || to.y < y || to.y <= from.y) return null;
    return from.x + ((to.x - from.x) * (y - from.y)) / (to.y - from.y);
}
