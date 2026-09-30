// The drawings baked with the build (tools/scripts/art-bake.ts): what the workers drew for the map and
// every world, as the page opened them in a browser, saved under the keys the scene finds pixels by
// (map-scene.ts). A drawing the bake has is fetched and decoded rather than drawn, as a map tile is,
// so a first visit is drawn as a visit after it is; one it has not, such as a place a child has lit,
// is drawn by the workers.
import { decode, type TilePixels } from "./tile-cache";

/** Where the baked drawings of one bake and one palette are served from, or null for no bake. */
export function bakedArt(at: string | null): {
    /** Reads the whole index, a part for each first letter of a key, and says when it has. */
    ready: Promise<void>;
    /** The baked file of a drawing, 0 for one with nothing drawn in its box, or undefined. */
    find(key: string): string | 0 | undefined;
    fetch(file: string): Promise<TilePixels | null>;
    /** Leaves a drawing whose file would not do to the workers. */
    forget(key: string): void;
} {
    const index = new Map<string, string | 0>();
    const letters = "0123456789abcdefghijklmnopqrstuvwxyz".split("");
    const part = async (letter: string): Promise<void> => {
        try {
            const r = await fetch(`${at}/index-${letter}.json`);
            if (!r.ok) return;
            const read: unknown = await r.json();
            if (typeof read !== "object" || read === null) return;
            for (const k of Object.keys(read)) {
                const v: unknown = Reflect.get(read, k);
                if (typeof v === "string" || v === 0) index.set(k, v);
            }
        } catch {
            /* a part that will not read is drawn by the workers */
        }
    };
    return {
        ready:
            at === null ? Promise.resolve() : Promise.all(letters.map(part)).then(() => undefined),
        find: (key) => index.get(key),
        forget: (key) => {
            index.delete(key);
        },
        async fetch(file) {
            try {
                const r = await fetch(`${at}/${file}`);
                return r.ok ? await decode(await r.blob()) : null;
            } catch {
                return null;
            }
        },
    };
}
