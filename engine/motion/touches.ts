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
/** Below this, in the samples' units, the pair's middle has not moved. */
const STILL_PAN = 1.5;

/** Reads a pair of fingers; with `pans`, the pair moving together also reads as a pan, in the samples' units. */
export function twoFingers(o: { pans?: boolean } = {}) {
    const fingers = new Map<number, Finger>();
    let last: { gap: number; x: number; y: number } | null = null;
    const pair = (): { gap: number; x: number; y: number } | null => {
        const [a, b] = [...fingers.values()];
        if (!a || !b) return null;
        return { gap: Math.hypot(b.x - a.x, b.y - a.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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
            const out: Intent[] = [];
            if (o.pans && Math.hypot(now.x - last.x, now.y - last.y) >= STILL_PAN) {
                out.push({ kind: "pan", x: last.x - now.x, y: last.y - now.y });
                last.x = now.x;
                last.y = now.y;
            }
            const zoom = last.gap > 0 ? now.gap / last.gap : 1;
            // a reading below the threshold leaves the base where it was, so a slow pinch still adds up
            if (Math.abs(zoom - 1) < STILL_ZOOM) return out;
            last.gap = now.gap;
            return [...out, { kind: "zoom", by: zoom }];
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
