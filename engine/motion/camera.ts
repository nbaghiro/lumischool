// A camera that follows, in squares. The view is how much of the world a zoom of one shows, and a
// zoom under one shows more of it. Easing is a fraction of the way per step, worked out from a rate
// per second, so a fixed-step game eases the same at any frame rate and a test can step it.
import type { Pt } from "./geometry";

export interface Size {
    w: number;
    h: number;
}
export interface Cam {
    x: number;
    y: number;
    zoom: number;
}

/** The zoom at which the whole world fits the view, never more than one. */
export const fitZoom = (view: Size, world: Size): number =>
    Math.min(1, view.w / world.w, view.h / world.h);

/** A centre moved just far enough that the view stays inside the world; across a world narrower than the view, the middle. */
export function keepInside(c: Pt, view: Size, world: Size, zoom = 1): Pt {
    const hw = view.w / zoom / 2,
        hh = view.h / zoom / 2;
    const pin = (v: number, half: number, size: number): number =>
        size <= half * 2 ? size / 2 : Math.max(half, Math.min(size - half, v));
    return { x: pin(c.x, hw, world.w), y: pin(c.y, hh, world.h) };
}

/** Where to look for a thing moving at `v`: `ahead` seconds in front of it, but never more than `most` squares. */
export function lead(at: Pt, v: Pt, ahead: number, most: number): Pt {
    const dx = v.x * ahead,
        dy = v.y * ahead,
        d = Math.hypot(dx, dy);
    const k = d > most ? most / d : 1;
    return { x: at.x + dx * k, y: at.y + dy * k };
}

/** The fraction of the way to go in one step of `dt` seconds at `rate` per second. */
export const easing = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

/**
 * One step towards the camera wanted, kept inside the world: the place at `rate` per second and the
 * zoom at `zoomRate`, which defaults to the same.
 */
export function follow(
    cam: Cam,
    want: Cam,
    o: { rate: number; zoomRate?: number; dt: number; view: Size; world: Size },
): Cam {
    const zoom = cam.zoom + (want.zoom - cam.zoom) * easing(o.zoomRate ?? o.rate, o.dt);
    const to = keepInside(want, o.view, o.world, zoom);
    const k = easing(o.rate, o.dt);
    const at = keepInside(
        { x: cam.x + (to.x - cam.x) * k, y: cam.y + (to.y - cam.y) * k },
        o.view,
        o.world,
        zoom,
    );
    return { x: at.x, y: at.y, zoom };
}

/**
 * The part of a layer in view, in that layer's own squares. A layer at `depth` one is the world; a
 * far layer at a half moves half as far across as the camera does, which is what makes hills look far
 * off, and one at nought stays where it is. Up and down, every layer moves with the camera. A scene
 * fills only this much of a layer that goes on and on.
 */
export function seen(
    cam: Cam,
    view: Size,
    depth = 1,
): { x0: number; x1: number; y0: number; y1: number } {
    const hw = view.w / cam.zoom / 2,
        hh = view.h / cam.zoom / 2;
    return {
        x0: cam.x * depth - hw,
        x1: cam.x * depth + hw,
        y0: cam.y - hh,
        y1: cam.y + hh,
    };
}
