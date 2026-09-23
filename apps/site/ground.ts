// The sample child's map behind the site's opening: their journey from the site's data (data.ts),
// as a grown-up's map with nobody's notes, and the component that draws it, loaded together once the
// map's box is near and the page idle (engine/ui/backdrop.tsx), so neither is in what the page loads
// first. The drawings the worlds name are loaded first, since the view is built from their sizes.
// The look a visitor takes over the page (engine/ui/overlay.tsx) reads the same map with every world
// open, and each world's roll with the sample child's record (sample.ts).

import type { MapView } from "../../engine/space";
import { still } from "../../engine/ui/art";
import type { Ground } from "../../engine/ui/backdrop";
import { declaredOf, loadDrawings } from "../../engine/ui/drawings";
import type { OverlaySource } from "../../engine/ui/overlay";
import { entryLessons, mayPrepare } from "../../engine/ui/reading-source";
import { Overworld } from "../../engine/ui/overworld";
import { refsOf, sizeOn } from "../../school/worlds/art";
import { apply } from "../../school/worlds/choice";
import type { Journey } from "../../school/worlds/rewards";
import { viewOfTrip } from "../../school/worlds/sample";
import type { Applied } from "../../school/worlds/types";
import { WORLDS, worldById } from "../../school/worlds/worlds";
import { siteData } from "./data";

/**
 * The sample child's map from their journey, as a grown-up's map with nobody's notes, once the
 * drawings the worlds name are loaded. With `open`, every world may be gone into, for the look.
 */
export async function mapOf(journey: Journey, o: { open?: boolean }): Promise<MapView> {
    const quiet = still();
    const shelf = await loadDrawings(refsOf(WORLDS.map((w) => w.id)));
    const applied = new Map<string, Applied>();
    const worldOf = (id: string): Applied => {
        const had = applied.get(id);
        if (had) return had;
        const w = apply(worldById(id), undefined, quiet).world;
        applied.set(id, w);
        return w;
    };
    return viewOfTrip(journey, {
        worldOf,
        grown: true,
        still: quiet,
        ...(o.open === undefined ? {} : { open: o.open }),
        size: sizeOn(shelf),
        declared: declaredOf,
    });
}

export async function ground(): Promise<Ground> {
    const data = await siteData();
    return { view: await mapOf(data.journey, {}), map: Overworld };
}

/**
 * The sample child's school as a visitor looks at it over the page: the map with every world open,
 * and each world's roll with the sample's record and the lessons as the child has them, from the
 * visitor's pack, whose reader comes with the look and never with the opening map.
 */
async function readLook(): Promise<OverlaySource> {
    const [{ schoolOf }, { reading }] = await Promise.all([import("./school"), import("./sample")]);
    const s = await schoolOf(true);
    const map = await mapOf(s.data.journey, { open: true });
    return {
        map: () => map,
        opening: map.here ?? map.places.find((p) => p.shown?.world === s.child.hereWorld.id)?.i,
        nameOf: (id) => worldById(id).name,
        // the site opens no look by a lesson alone
        whereIs: () => null,
        reading: (id) => reading(s, id),
    };
}

let preview: Promise<OverlaySource> | null = null;
export function look(): Promise<OverlaySource> {
    return (preview ??= readLook().catch((error: unknown) => {
        preview = null;
        throw error;
    }));
}

let warming: Promise<void> | null = null;
export function warmLook(): Promise<void> {
    if (!mayPrepare()) return Promise.resolve();
    return (warming ??= (async () => {
        const [{ schoolOf }, { reading, prepareLessons }] = await Promise.all([
            import("./school"),
            import("./sample"),
        ]);
        const s = await schoolOf(true);
        const source = reading(s, s.child.hereWorld.id);
        if (source)
            await prepareLessons(
                s,
                entryLessons(source.world({ narrow: false, height: () => null })),
            );
    })().catch(() => {
        warming = null;
    }));
}
