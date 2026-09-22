// How a world stands on the map of every world when nobody has composed it: the drawings from its
// own horizon, gate and story, standing on the land round the middle of its place. A world composed
// for the map carries its composition in its own declaration (`map`), so a new world is on the map
// the day it is added and gets a composition when someone draws one. See .docs/overworld.md.
import type { World } from "./types";
import { PLACE_GROW, type Composition, type Spot } from "../../engine/space";

/** What each year is, in a few words lettered under its name across its side of the country (story.md). */
export const YEARS: Record<number, string> = {
    1: "Setting out",
    2: "Round the seasons",
    3: "Looking further",
    4: "Over the mountains and the sea",
};

/**
 * A world's place on the map: its own composition, or one laid out from its horizon, with the gate
 * at the front and the moment beside it, for a world nobody has composed yet.
 */
export function placeOf(w: World): Composition {
    if (w.map) return w.map;
    const spots: Spot[] = w.horizon.far.map((f) => ({
        art: f.art,
        x: (f.at - 0.5) * 1200,
        y: 60,
        k: 0.85 * (f.k ?? 1),
        flip: f.flip,
        params: f.params,
    }));
    spots.push({ art: w.horizon.gate, x: -220, y: 400, k: 1, is: "gate" });
    if (w.chapter.moment.art !== w.horizon.gate)
        spots.push({ art: w.chapter.moment.art, x: 330, y: 410, k: 0.9, is: "moment" });
    spots.push({ art: w.chapter.secret.art, x: 660, y: 440, k: 0.7, is: "secret" });
    return { spots, stamp: { x: -580, y: -320 } };
}

/**
 * The box a world's drawings take on the map, round the middle of its place, as map.ts paints them:
 * each grown by PLACE_GROW up and out from the ground the guide stands on, and a moment that moves
 * once it has happened in both of its places. `size` is a drawing's size in world units.
 */
export function drawnBox(
    w: World,
    size: (art: string, params?: Record<string, unknown>) => { w: number; h: number },
): { x: number; y: number; w: number; h: number } {
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (const s of placeOf(w).spots)
        for (const q of [s, ...(s.after ? [s.after] : [])]) {
            const sz = size(s.art, s.params),
                k = (q.k ?? s.k ?? 1) * PLACE_GROW,
                x = q.x * PLACE_GROW,
                y = 430 + (q.y - 430) * PLACE_GROW;
            x0 = Math.min(x0, x - (sz.w * k) / 2);
            x1 = Math.max(x1, x + (sz.w * k) / 2);
            y0 = Math.min(y0, y - sz.h * k);
            y1 = Math.max(y1, y);
        }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
