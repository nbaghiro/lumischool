interface Entry {
    at: number;
    scene: number;
    event: string;
    values: number[];
}

// off where there is no page, as in the unit tests that import the scene
const options = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
const enabled = options.has("mapDebug");
export const mapVariant = enabled ? options.get("mapLayer") : null;
const entries: Entry[] = [];
const scenes = new Set<number>();
let serial = 0;
let saveLater = (): void => {};

const counts: Record<string, number> = {};
const notes: Record<string, number> = {};

/** Adds to a running total the page's diagnostics report, as `art-lost` and `art-late` do (map-scene.ts). */
export function mapCount(event: string, n: number): void {
    if (!enabled || !n) return;
    counts[event] = (counts[event] ?? 0) + n;
}

/** Keeps the latest value of something the page's diagnostics report, as when the scene last fell quiet. */
export function mapNote(name: string, value: number): void {
    if (!enabled) return;
    notes[name] = value;
}

/** Offers the suite a way to act on the map under `?mapDebug`, as `window[name]`; the last map to offer it has it. */
export function mapHook(name: string, act: (...args: number[]) => unknown): void {
    if (enabled) Reflect.set(window, name, act);
}

export function mapEvent(scene: number, event: string, ...values: number[]): void {
    if (!enabled) return;
    entries.push({ at: Math.round(performance.now()), scene, event, values });
    if (entries.length > 96) entries.shift();
    saveLater();
}

export function mapDiagnostic(): { id: number; frame(work: number): void; dispose(): void } {
    const id = ++serial;
    let last = 0;
    let reported = 0;
    scenes.add(id);
    mapEvent(id, "mount", scenes.size);
    return {
        id,
        frame(work) {
            if (!enabled) return;
            const now = performance.now();
            if (last && now - last > 100 && now - reported > 1000) {
                mapEvent(id, "frame-gap", Math.round(now - last), Math.round(work));
                reported = now;
            }
            last = now;
        },
        dispose() {
            scenes.delete(id);
            mapEvent(id, "dispose", scenes.size);
        },
    };
}

if (enabled)
    void import("./map-report")
        .then(({ mapReport }) => {
            saveLater = mapReport(() => ({
                variant: mapVariant,
                scenes: scenes.size,
                entries: [...entries],
                counts: { ...counts },
                notes: { ...notes },
            }));
            saveLater();
        })
        .catch(() => {
            /* Optional diagnostics cannot interrupt the map. */
        });
