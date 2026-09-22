// The map behind the screens: the country with nobody on it (school/worlds/view.ts) and the
// component that draws it, loaded together once the map's box is near and the page idle
// (engine/ui/backdrop.tsx), so neither is in what the page loads first. The drawings the run's
// worlds name are loaded first, since the view is built from their sizes.

import { still } from "../../engine/ui/art";
import type { Ground } from "../../engine/ui/backdrop";
import { declaredOf, loadDrawings } from "../../engine/ui/drawings";
import { Overworld } from "../../engine/ui/overworld";
import { refsOf, sizeOn } from "../../school/worlds/art";
import { countryViewOf } from "../../school/worlds/view";
import { schoolRun } from "../../school/worlds/worlds";

export async function ground(): Promise<Ground> {
    const shelf = await loadDrawings(refsOf(schoolRun().map((p) => p.world)));
    return {
        view: countryViewOf({ size: sizeOn(shelf), still: still(), declared: declaredOf }),
        map: Overworld,
    };
}
