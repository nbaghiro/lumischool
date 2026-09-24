interface Entry {
    at: number;
    scene: number;
    event: string;
    values: number[];
}

const options = new URLSearchParams(location.search);
const enabled = options.has("mapDebug");
export const mapVariant = enabled ? options.get("mapLayer") : null;
const entries: Entry[] = [];
const scenes = new Set<number>();
let serial = 0;
let saveLater = (): void => {};

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
            }));
            saveLater();
        })
        .catch(() => {
            /* Optional diagnostics cannot interrupt the map. */
        });
