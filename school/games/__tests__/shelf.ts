// The ids on the art shelf, for the suites that check a game names only drawings that exist. They
// come off the catalogue's lines rather than from loading every drawing, since a game names an id
// and never draws one here, and the hand-drawn files have their lines there too.
import { CATALOG } from "../../../engine/parts/catalog";

export const SHELF_IDS: ReadonlySet<string> = new Set(
    Object.values(CATALOG).flatMap((family) => Object.keys(family)),
);
