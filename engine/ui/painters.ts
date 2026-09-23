// The painters behind dynamic imports, from one place: the country's (map.ts) for overworld.tsx and
// the world's (scenery.ts) for world.tsx, so a page's script names the chunks each pulls in once
// rather than in every component that draws (tools/__tests__/first-view.test.ts), and neither
// painter is in what a page loads before it draws. A painter the server no longer has loads the page
// again, once (`onDemand` in art.tsx).

import { onDemand } from "./art";

type MapCode = typeof import("./map") & Pick<typeof import("./view"), "CanvasView">;
let mapCode: Promise<MapCode> | null = null;
let worldCode: Promise<typeof import("./scenery")> | null = null;

/** The country painter, loaded the first time a map is drawn. */
export const mapPainter = (): Promise<MapCode> =>
    (mapCode ??= onDemand(async () => {
        const [map, { CanvasView }] = await Promise.all([import("./map"), import("./view")]);
        return { ...map, CanvasView };
    }).catch((error: unknown) => {
        mapCode = null;
        throw error;
    }));

/** The world painter, loaded the first time a roll is drawn. */
export const worldPainter = (): Promise<typeof import("./scenery")> =>
    (worldCode ??= onDemand(() => import("./scenery")).catch((error: unknown) => {
        worldCode = null;
        throw error;
    }));
