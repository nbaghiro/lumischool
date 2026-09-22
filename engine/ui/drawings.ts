// The worlds' drawings loaded for a page, each by the loader's name for it (artKey in engine/space.ts:
// the shelf's name for a coded drawing, `file:` and the file name for a hand-drawn file, so the two
// never share a name), through the catalogue (engine/parts/catalog.ts). How the shelf plays a loaded
// drawing is motionOf in engine/parts/drawing.ts, so a page that only builds views (apps/kids/views.ts)
// never carries the motion's rules. A page loads the refs its worlds name (refsOf in
// school/worlds/art.ts) before it builds a view, since the view builders ask for each drawing's size.
// The catalogue's table of loaders comes in with the first page that asks, never with a page's own
// script.

import type { Declared } from "../motion/world";
import { U } from "../paper";
import type { Drawing } from "../parts/drawing";

export interface Shelf {
    /** A drawing by the shelf's name for it; undefined for a name the shelf does not hold. */
    drawing(ref: string): Drawing<unknown> | undefined;
    /**
     * A drawing's size in world units at a scale, drawn with its own numbers and any given: what
     * the view builders ask for. A drawing the shelf does not hold takes no room.
     */
    size(ref: string, scale: number, params?: Record<string, unknown>): { w: number; h: number };
}

const loading = new Map<string, Promise<Drawing<unknown> | undefined>>();
const held = new Map<string, Drawing<unknown>>();

/** A drawing a page has loaded, by the shelf's name for it, for the painters; undefined for one no page has loaded. */
export const drawingOf = (ref: string): Drawing<unknown> | undefined => held.get(ref);

/** A drawing's own declared motion, by the shelf's name for it, as a world plays it (engine/motion/world.ts). */
export const declaredOf: Declared = (ref) => held.get(ref)?.motion;

/**
 * A loaded drawing's size in world units at a scale, drawn with its own numbers and any given: what
 * the view builders ask for (`Shelf.size`, and `sizeOf` in the scratchpad's src/world/refs.ts).
 */
export function sizeFrom(
    d: Drawing<unknown>,
    scale: number,
    params?: Record<string, unknown>,
): { w: number; h: number } {
    const b = d.box({ ...(d.params as Record<string, unknown>), ...params });
    return { w: b.w * U * scale, h: b.h * U * scale };
}

/** Loads each ref once, keeping it for every later page, and answers with what was found. */
export async function loadDrawings(refs: readonly string[]): Promise<Shelf> {
    const { loaderOf } = await import("../parts/catalog");
    const have = new Map<string, Drawing<unknown>>();
    await Promise.all(
        refs.map(async (ref) => {
            let p = loading.get(ref);
            if (!p) {
                const started = loaderOf(ref)?.() ?? Promise.resolve(undefined);
                p = started.catch((error: unknown) => {
                    // A transient chunk/network failure must not poison every later map or lesson
                    // that asks for this drawing in the same document.
                    if (loading.get(ref) === p) loading.delete(ref);
                    throw error;
                });
                loading.set(ref, p);
            }
            const d = await p;
            if (d) {
                have.set(ref, d);
                held.set(ref, d);
                // a hand-drawn file is loaded as `file:` and its file name but draws under its own id, which
                // is what a painter reads back off the page to find its motion (engine/ui/map.ts)
                if (d.id !== ref) held.set(d.id, d);
            }
        }),
    );
    return {
        drawing: (ref) => have.get(ref),
        size(ref, scale, params) {
            const d = have.get(ref);
            return d ? sizeFrom(d, scale, params) : { w: 0, h: 0 };
        },
    };
}
