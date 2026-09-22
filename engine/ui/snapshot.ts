// Where a snapshot of the map goes under a page's map box, so the still picture stands where the live
// map will draw: the camera an aim asks for is `aimCamera`, which the live map (overworld.tsx) and the
// still picture (`placeStill`) both take, so the two cannot drift. A page shows the picture grown
// about the aimed point until it covers its box (`stillFor`).

import type { Camera, MapAim, Pt } from "../space";

export type { MapAim };

/**
 * The site's own framing, which sign-in keeps so that moving between them reads as one page: the
 * sample child's place a little right of the middle on a wide screen, and in the middle of a phone's
 * strip. `across` is how many of the map's units cross the box, which sets the zoom.
 */
export const OPENING: Readonly<Record<"wide" | "narrow", MapAim>> = {
    wide: { at: { x: 0.545, y: 0.47 }, across: 14400 },
    narrow: { across: 4600 },
};

/** A rectangle in the map's own units. */
export interface Area {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * What an aim looks at (`aimedAt` in engine/space.ts): the point, with the size of the aimed place as
 * drawn, and the place's middle when the point stands away from it along a road.
 */
export interface Aimed extends Area {
    place?: Pt;
}

/** A rectangle in a page's pixels, as `getBoundingClientRect` gives it. */
export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** A picture of part of the map, made by tools/scripts/map-snapshots.ts. */
export interface Snapshot {
    /** Where the page loads the image from; the tools name a snapshot by the file's name without its `.webp`. */
    src: string;
    /** The sample child's map, or the country with nobody on it; each kind has a module of its own (snapshots/). */
    sample: boolean;
    /** The zoom it was drawn at, as the map units across a box that its aims give. */
    across: number;
    /** What the image shows, in the map's units. */
    world: Area;
    /**
     * Each aim the picture stands in for, keyed by `aimKey`: the point the aim looks at, the size of
     * the aimed place as drawn, which the map keeps clear of whatever stands in front of it, and the
     * place's middle when the point is along a road away from it, since the map keeps the place in
     * the window.
     */
    aims: Record<string, Aimed>;
}

/** How a snapshot names an aim: its place, and how far along the road toward another place. */
export const aimKey = (aim: Pick<MapAim, "place" | "along" | "toward">): string =>
    [aim.place ?? "", aim.along ?? 0, aim.toward ?? ""].join("|");

/** How close to a card, and to the window's edge, the map lets a place come, in pixels. */
const CLEAR = 24;

/**
 * The camera an aim asks for over `aimed`, the point it looks at with the size of the aimed place as
 * drawn (`aimedAt` in engine/space.ts): the point, moved by the aim's nudge, at the aim's share of
 * the band (the whole box without one), `across` map units across the box, moved sideways until that
 * much round the point is 24 px clear of every box in `keepOff`, toward the side away from the middle
 * of what is in the way unless that side's column is narrower than the picture and the other side's
 * is wider. Then the same for the place itself, which stands away from the point when the aim is
 * along a road; and last the place is kept 24 px inside the window, since the window's edge cutting
 * a place reads worse than a card's edge over it. Never up or down, so the page's framing holds.
 */
export function aimCamera(
    aimed: Aimed,
    aim: MapAim,
    box: Box,
    band: Box | null,
    keepOff: readonly Box[],
): Camera {
    const p = { x: aimed.x + (aim.nudge?.x ?? 0), y: aimed.y + (aim.nudge?.y ?? 0) };
    const z = box.width / aim.across;
    const b = band ?? box;
    const at = aim.at ?? { x: 0.5, y: 0.5 };
    const sx = b.left - box.left + at.x * b.width;
    const sy = b.top - box.top + at.y * b.height;
    let cx = p.x - (sx - box.width / 2) / z;
    const cy = p.y - (sy - box.height / 2) / z;
    const hw = (aimed.w * z) / 2;
    const hh = (aimed.h * z) / 2;
    /** Where a map point stands across the box, in pixels, under the camera as it is now. */
    const across = (x: number): number => (x - cx) * z + box.width / 2;
    /** Moves the camera sideways until the picture round a point is clear of every box. */
    const clear = (q: Pt): void => {
        const py = (q.y - cy) * z + box.height / 2;
        for (const k of keepOff) {
            const l = k.left - box.left - CLEAR;
            const r = k.left + k.width - box.left + CLEAR;
            const px = across(q.x);
            if (
                px + hw <= l ||
                px - hw >= r ||
                py + hh <= k.top - box.top - CLEAR ||
                py - hh >= k.top + k.height - box.top + CLEAR
            )
                continue;
            // the columns either side of what is in the way, and which of them the picture goes to
            const lc = l - CLEAR,
                rc = box.width - r - CLEAR;
            let right = (l + r) / 2 <= px;
            if ((right ? rc : lc) < 2 * hw && (right ? lc : rc) > (right ? rc : lc)) right = !right;
            cx -= (right ? r - (px - hw) : l - (px + hw)) / z;
        }
    };
    clear(p);
    const place = aimed.place ?? aimed;
    if (aimed.place) clear(place);
    const over = across(place.x) + hw + CLEAR - box.width;
    if (over > 0) cx += over / z;
    const short = CLEAR + hw - across(place.x);
    if (short > 0) cx -= short / z;
    return { x: cx, y: cy, z };
}

/**
 * Of the snapshots made at this aim's zoom and place, the one that needs the least growth to cover the
 * box, and where it goes: placed where the live map draws, and grown about the aimed point until it
 * covers the whole box. A picture placed exactly can stop short of a box's edge (a wide, short window
 * leaves a strip of bare paper at the side), and a little of it cropped at the edges reads better than
 * that; the live map fades in over it at its own zoom. Null when none was made for the aim, or none
 * covers without growing more than nine times.
 */
export function stillFor(
    snapshots: readonly Snapshot[],
    aim: MapAim,
    box: Box,
    band: Box | null,
    keepOff: readonly Box[],
): { snapshot: Snapshot; at: Box } | null {
    let best: { snapshot: Snapshot; at: Box; k: number } | null = null;
    for (const snapshot of snapshots) {
        const at = snapshot.across === aim.across && placeStill(snapshot, aim, box, band, keepOff);
        const aimed = snapshot.aims[aimKey(aim)];
        if (!at || !aimed) continue;
        const z = at.width / snapshot.world.w;
        const x = at.left + (aimed.x + (aim.nudge?.x ?? 0) - snapshot.world.x) * z;
        const y = at.top + (aimed.y + (aim.nudge?.y ?? 0) - snapshot.world.y) * z;
        // the least growth about the aimed point that takes every side of the picture to the box's edge
        const k = Math.max(
            1,
            x / (x - at.left),
            (box.width - x) / (at.left + at.width - x),
            y / (y - at.top),
            (box.height - y) / (at.top + at.height - y),
        );
        if (k < (best?.k ?? 9))
            best = {
                snapshot,
                at: {
                    left: x + (at.left - x) * k,
                    top: y + (at.top - y) * k,
                    width: at.width * k,
                    height: at.height * k,
                },
                k,
            };
    }
    return best;
}

/**
 * Where the snapshot's image goes in a box, in the box's pixels, under the camera the live map takes
 * for the aim. Null when the snapshot was not made for this aim or the box has no size.
 */
export function placeStill(
    s: Snapshot,
    aim: MapAim,
    box: Box,
    band: Box | null,
    keepOff: readonly Box[],
): Box | null {
    const aimed = s.aims[aimKey(aim)];
    if (aimed === undefined || box.width <= 0 || box.height <= 0 || aim.across <= 0) return null;
    const c = aimCamera(aimed, aim, box, band, keepOff);
    return {
        left: (s.world.x - c.x) * c.z + box.width / 2,
        top: (s.world.y - c.y) * c.z + box.height / 2,
        width: s.world.w * c.z,
        height: s.world.h * c.z,
    };
}
