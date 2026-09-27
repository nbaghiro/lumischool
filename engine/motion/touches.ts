// Two fingers on the glass read as an intention: the gap between them growing or shrinking is a zoom.
// One finger is left to the gesture recogniser, which ignores a second finger on purpose; the page
// hands the pair here only for a game that reads intents, and only once the second finger is down.
// Units are whatever the samples are in, since a ratio does not depend on them.
import type { Intent } from "./pad";

interface Finger {
    x: number;
    y: number;
}

/** Below this a pair is resting fingers rather than a meaning. */
const STILL_ZOOM = 0.004;

export function twoFingers() {
    const fingers = new Map<number, Finger>();
    let last: { gap: number } | null = null;
    const pair = (): { gap: number } | null => {
        const [a, b] = [...fingers.values()];
        if (!a || !b) return null;
        return { gap: Math.hypot(b.x - a.x, b.y - a.y) };
    };
    return {
        get count(): number {
            return fingers.size;
        },
        down(id: number, x: number, y: number): void {
            if (fingers.size >= 2) return;
            fingers.set(id, { x, y });
            last = pair();
        },
        /** What the pair meant by this move, if anything. */
        move(id: number, x: number, y: number): Intent[] {
            const f = fingers.get(id);
            if (!f) return [];
            f.x = x;
            f.y = y;
            const now = pair();
            if (!now || !last) return [];
            const zoom = last.gap > 0 ? now.gap / last.gap : 1;
            // a reading below the threshold leaves the base where it was, so a slow pinch still adds up
            if (Math.abs(zoom - 1) < STILL_ZOOM) return [];
            last.gap = now.gap;
            return [{ kind: "zoom", by: zoom }];
        },
        up(id: number): void {
            fingers.delete(id);
            last = pair();
        },
        clear(): void {
            fingers.clear();
            last = null;
        },
    };
}
