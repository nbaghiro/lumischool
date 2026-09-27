// Two fingers on the glass read as intentions: the line between them turning is a turn, and the gap
// between them growing or shrinking is a zoom. One finger is left to the gesture recogniser, which
// ignores a second finger on purpose; the page hands the pair here only for a game that reads
// intents, and only once the second finger is down. Units are whatever the samples are in, since a
// turn and a ratio do not depend on them. Screen y grows downwards, so a positive turn is clockwise.
import type { Intent } from "./pad";

interface Finger {
    x: number;
    y: number;
}

/** Below these a pair is resting fingers rather than a meaning. */
const STILL_TURN = 0.004;
const STILL_ZOOM = 0.004;

export function twoFingers() {
    const fingers = new Map<number, Finger>();
    let last: { angle: number; gap: number } | null = null;
    const pair = (): { angle: number; gap: number } | null => {
        const [a, b] = [...fingers.values()];
        if (!a || !b) return null;
        return { angle: Math.atan2(b.y - a.y, b.x - a.x), gap: Math.hypot(b.x - a.x, b.y - a.y) };
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
        /** What the pair meant by this move, if it is one of the two. */
        move(id: number, x: number, y: number): Intent[] {
            const f = fingers.get(id);
            if (!f) return [];
            f.x = x;
            f.y = y;
            const now = pair();
            if (!now || !last) return [];
            const out: Intent[] = [];
            let turn = now.angle - last.angle;
            if (turn > Math.PI) turn -= 2 * Math.PI;
            if (turn < -Math.PI) turn += 2 * Math.PI;
            const zoom = last.gap > 0 ? now.gap / last.gap : 1;
            if (Math.abs(turn) >= STILL_TURN) out.push({ kind: "turn", by: turn });
            if (Math.abs(zoom - 1) >= STILL_ZOOM) out.push({ kind: "zoom", by: zoom });
            // a reading below the threshold leaves the base where it was, so a slow twist still adds up
            if (Math.abs(turn) >= STILL_TURN) last.angle = now.angle;
            if (Math.abs(zoom - 1) >= STILL_ZOOM) last.gap = now.gap;
            return out;
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

/**
 * Turns added up into whole steps: a twist of fifteen degrees is one step of a block that turns in
 * fifteen-degree steps, and the part left over waits for the rest of the twist.
 */
export function stepsOf(held: number, by: number, step: number): { steps: number; left: number } {
    const total = held + by;
    const steps = Math.trunc(total / step);
    return { steps, left: total - steps * step };
}
