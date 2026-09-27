// The lights of a frame: its own and one round each glowing sprite, each with its flicker at a moment,
// as the game view washes them in. See .docs/game-engine.md.
import type { Frame, Hue, Light } from "./scene";

/** The view draws at most this many lights a frame, the strongest nearest the middle of the view. */
export const MOST_LIGHTS = 96;
/** How strongly a light washes its hue into the paper under it. */
export const HALO = 0.35;

export interface Lit {
    x: number;
    y: number;
    r: number;
    strength: number;
    hue: Hue;
}

/**
 * Every light a frame casts at time `t`: its own, and one round each glowing sprite in the world's
 * layer. A flickering light wavers between 0.75 and 1 of its strength unless `still`. The ones
 * outside the view and its margin are left out, and past `MOST_LIGHTS` the weakest and farthest go.
 */
export function lightsOf(f: Frame, t: number, still: boolean): Lit[] {
    const all: (Lit & { flicker: boolean })[] = [];
    const add = (l: Light): void => {
        all.push({
            x: l.x,
            y: l.y,
            r: l.r,
            strength: Math.max(0, Math.min(1, l.strength ?? 1)),
            hue: l.hue ?? "glow",
            flicker: !!l.flicker,
        });
    };
    for (const l of f.lights ?? []) add(l);
    for (const s of f.sprites)
        if (s.glow && s.glow > 0 && !s.fixed && (s.depth ?? 1) === 1)
            add({ x: s.x, y: s.stand ? s.y - (s.size ?? 0) / 2 : s.y, r: s.glow });
    const zoom = f.camera.zoom ?? 1,
        hw = f.view.w / 2 / zoom,
        hh = f.view.h / 2 / zoom;
    const seen = all
        .filter(
            (l) =>
                l.r > 0 &&
                l.strength > 0 &&
                Math.abs(l.x - f.camera.x) < hw + l.r &&
                Math.abs(l.y - f.camera.y) < hh + l.r,
        )
        .map((l) => ({
            x: l.x,
            y: l.y,
            r: l.r,
            hue: l.hue,
            strength: l.flicker && !still ? l.strength * flickerAt(l.x, l.y, t) : l.strength,
        }));
    if (seen.length <= MOST_LIGHTS) return seen;
    const weight = (l: Lit) =>
        (l.strength * l.r) / (1 + Math.hypot(l.x - f.camera.x, l.y - f.camera.y));
    return seen.sort((a, b) => weight(b) - weight(a)).slice(0, MOST_LIGHTS);
}

/** A flame's waver at a place and a moment, between 0.75 and 1; two lights side by side do not keep time. */
export function flickerAt(x: number, y: number, t: number): number {
    const w = Math.sin(t * 9.1 + x * 1.7) * Math.sin(t * 5.3 + y * 2.3 + 1.1);
    return 0.875 + 0.125 * w;
}
