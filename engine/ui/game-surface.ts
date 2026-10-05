// What a game is played on, made the same way wherever a game is mounted: the Games page and a lesson's
// game card. The GPU's field for an action game, the board for a turn game, and the shelf's drawings
// loaded as the game first asks for them.
import type { Drawing } from "../parts/drawing";
import { loadDrawings } from "./drawings";
import type { Board } from "./game-host";
import { GameView } from "./game-view";
import { INK, SceneView } from "./scene-view";
import { StillView } from "./still-view";

interface ViewOptions {
    host: HTMLElement;
    art: Map<string, Drawing<unknown>>;
    still: () => boolean;
}

/**
 * The GPU's view, or null where the browser has no WebGL2. The hidden copy of every sprite's box is
 * kept with `probe=1`, and always for a browser driven by tests.
 */
export function gpuView(o: ViewOptions & { inkAt?: number }): GameView | null {
    try {
        return new GameView({
            ...o,
            probe: new URLSearchParams(location.search).get("probe") === "1" || navigator.webdriver,
        });
    } catch {
        return null;
    }
}

/** A turn game's board: the scene drawn by the GPU, or a still picture of it without WebGL2. */
export function boardFor(
    o: ViewOptions & { onFrame: (t: number) => void; gpu?: boolean },
): Board & { stop?(): void } {
    const view = o.gpu === false ? null : gpuView({ ...o, inkAt: INK });
    return view
        ? new SceneView({ ...o, view })
        : new SceneView({ ...o, still: () => true, view: new StillView(o) });
}

/** The shelf's drawings a game has asked for, each loaded the first time it is asked for. */
export class ShelfArt extends Map<string, Drawing<unknown>> {
    pending = new Set<string>();
    /** The loads not yet waited on, so the player can say it is ready only once its drawings are in. */
    loads: Promise<unknown>[] = [];
    private readonly on: { loaded(ref: string): void; failed(): void; ended(): boolean };
    constructor(on: { loaded(ref: string): void; failed(): void; ended(): boolean }) {
        super();
        this.on = on;
    }
    override get(ref: string): Drawing<unknown> | undefined {
        const found = super.get(ref);
        if (!found && !this.pending.has(ref)) {
            this.pending.add(ref);
            const load = loadDrawings([ref])
                .then((shelf) => {
                    if (this.on.ended()) return;
                    const drawing = shelf.drawing(ref);
                    if (drawing) {
                        this.set(ref, drawing);
                        this.on.loaded(ref);
                    }
                })
                .catch(() => {
                    if (!this.on.ended()) this.on.failed();
                });
            this.loads.push(load);
        }
        return found;
    }
}
