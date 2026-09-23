import type { WorldView } from "../space";
import type { Measured } from "./lesson";
import { preparedPaper, landingRow } from "./paper";
import type { ReadingSource } from "./reading";

export function entryLessons(view: WorldView, lesson?: string | null): readonly string[] {
    return landingRow(view, { lesson, term: view.arrival?.term })?.day.lessons ?? [];
}

/** Owns only unclaimed paper. Once a reader takes a sheet, that reader disposes it. */
export function readingShelf(read: (world: string) => ReadingSource | null): {
    source(world: string): ReadingSource | null;
    warm(world: string, lesson?: string | null): void;
    dispose(): void;
} {
    const sources = new Map<string, ReadingSource>();
    const originals = new Map<string, ReadingSource>();
    const paper = preparedPaper<Measured>();
    let measure: HTMLElement | undefined;
    let stopped = false;
    let warming = 0;
    const key = (world: string, lesson: string, narrow: boolean): string =>
        `${world}|${lesson}|${narrow}`;
    const source = (world: string): ReadingSource | null => {
        const old = sources.get(world);
        if (old) return old;
        const raw = read(world);
        if (!raw) return null;
        originals.set(world, raw);
        const wrapped: ReadingSource = {
            ...raw,
            sheet: (id, o) => paper.read(key(world, id, o.narrow), () => raw.sheet(id, o), true),
        };
        sources.set(world, wrapped);
        return wrapped;
    };
    return {
        source,
        warm(world, lesson) {
            clearTimeout(warming);
            if (stopped || !mayPrepare()) return;
            warming = window.setTimeout(() => {
                source(world);
                const raw = originals.get(world);
                if (!raw) return;
                const narrow = matchMedia("(max-width: 700px)").matches;
                const view = raw.world({ narrow, height: () => null });
                const ids = entryLessons(view, lesson);
                paper.keep(ids.map((id) => key(world, id, narrow)));
                if (!measure) {
                    measure = document.createElement("div");
                    measure.style.cssText =
                        "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none";
                    measure.setAttribute("aria-hidden", "true");
                    document.body.append(measure);
                }
                const measureIn = measure;
                for (const id of ids)
                    void paper.read(key(world, id, narrow), () =>
                        raw.sheet(id, { narrow, measureIn }),
                    );
            }, 120);
        },
        dispose() {
            stopped = true;
            clearTimeout(warming);
            paper.dispose();
            sources.clear();
            originals.clear();
            measure?.remove();
        },
    };
}

export function mayPrepare(): boolean {
    if (document.hidden) return false;
    const connection: unknown = Reflect.get(navigator, "connection");
    if (!connection || typeof connection !== "object") return true;
    return !(
        Reflect.get(connection, "saveData") ||
        /(^|-)2g$/.test(String(Reflect.get(connection, "effectiveType")))
    );
}
