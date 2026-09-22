// Where an overlay looks (overlay.tsx), as the address after the `#` says it, so back, Escape and a
// shared link all work over whatever page opened it: `#/map` the map, `#/map/<world>` a world's roll,
// `#/map/<world>/<lesson>` the roll opened at that lesson, and `#/lesson/<lesson>` the same with the
// world left for the page to find, which is what a page that does not read the worlds writes.
// Nothing else is written after the `#`.

export type OverlayAt = { world: string | null; lesson: string | null };

/** The address after the `#` as it is now, read again whenever `moved` notifies, which is the app's own query signal (router.tsx `search`) on every move. */
export const hashNow = (moved: () => unknown): string => {
    moved();
    return location.hash;
};

const read = (s: string | undefined): string | null => {
    if (!s) return null;
    try {
        return decodeURIComponent(s);
    } catch {
        return null;
    }
};

/** What the address after the `#` names, or null when it names no look. */
export function atFrom(hash: string): OverlayAt | null {
    const parts = hash.replace(/^#\/?/, "").split("/");
    if (parts[0] === "lesson") {
        const lesson = read(parts[1]);
        return lesson ? { world: null, lesson } : null;
    }
    if (parts[0] !== "map") return null;
    const world = read(parts[1]);
    return { world, lesson: world ? read(parts[2]) : null };
}

/** The address after the `#` for a look. */
export function hashOf(at: OverlayAt): string {
    if (!at.world) return at.lesson ? `#/lesson/${encodeURIComponent(at.lesson)}` : "#/map";
    const world = `#/map/${encodeURIComponent(at.world)}`;
    return at.lesson ? `${world}/${encodeURIComponent(at.lesson)}` : world;
}

/** One layer up: out of a world, or a lesson in its world, to the map, and off the map to the page, which is null. */
export const upOf = (at: OverlayAt): OverlayAt | null =>
    at.world || at.lesson ? { world: null, lesson: null } : null;

/** Whether two looks are the same look. */
export const sameAt = (a: OverlayAt | null, b: OverlayAt | null): boolean =>
    a === b || (a !== null && b !== null && a.world === b.world && a.lesson === b.lesson);
