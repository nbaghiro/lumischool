// What an action game reads from the child's hands.
//
// Every control a game can have is one of five things, whichever device it came from: a direction
// (arrow keys, WASD, a swipe on the field, the on-screen pad, a gamepad's d-pad or stick), the one
// big button (space, Enter, the on-screen go button, a gamepad's A), a brake (the other big button,
// or B), a pull (a drag back from the thing being pulled, or the arrow keys stepping an aim), and a
// touch (a finger or the mouse held on the field, which a game that follows the hand reads).
// The page turns devices into a Pad and a game reads only the Pad, so a game is the same game on a
// keyboard, a tablet and a gamepad, and a test drives it with a Pad of its own. Every on-screen
// control is at least sixty pixels and every one has a key. Nothing in this file touches the page.

export type Dir = "up" | "down" | "left" | "right";

export const DIRS: Record<Dir, { x: number; y: number }> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

export const opposite = (a: Dir, b: Dir): boolean =>
    DIRS[a].x === -DIRS[b].x && DIRS[a].y === -DIRS[b].y;

export interface Pad {
    /** The direction held now, the latest pressed of those still down, or null. */
    held: Dir | null;
    /** Every direction still held down, oldest first, so holding go while tapping a turn keeps going. */
    holding: Dir[];
    /**
     * Directions pressed since the game last read them, oldest first. A quick left then up between
     * two steps is two turns, and a game that only looked at `held` would lose the first.
     */
    pressed: Dir[];
    /** The big button, held. */
    go: boolean;
    /** The other big button, held. */
    brake: boolean;
    /** A pull in squares from the thing being pulled, or null when nothing is pulled. */
    pull: { x: number; y: number } | null;
    /** Set for one step when a pull is let go, with the pull it was let go at. */
    released: { x: number; y: number } | null;
    /** Set for one step by the big button's press, for a game that acts once per press. */
    tapped: boolean;
    /** Where a finger or the mouse is held on the field, in squares, for a game that follows the hand. */
    touch: { x: number; y: number } | null;
    /** Set for one step when a held touch lifts, with where it lifted. */
    lifted: { x: number; y: number } | null;
}

export const emptyPad = (): Pad => ({
    held: null,
    holding: [],
    pressed: [],
    go: false,
    brake: false,
    pull: null,
    released: null,
    tapped: false,
    touch: null,
    lifted: null,
});

/** A direction goes down: it is pressed once and held until it comes up. */
export function down(p: Pad, d: Dir): void {
    p.pressed.push(d);
    p.holding = [...p.holding.filter((h) => h !== d), d];
    p.held = d;
}

/** A direction comes up, and whichever is still held is held again. */
export function up(p: Pad, d: Dir): void {
    p.holding = p.holding.filter((h) => h !== d);
    p.held = p.holding[p.holding.length - 1] ?? null;
}

/** What a game has consumed at the end of a step, so a press is read once. */
export function spent(p: Pad): void {
    p.pressed = [];
    p.released = null;
    p.tapped = false;
    p.lifted = null;
}

/** A key's meaning, or null. The same keys in every game, so a child learns them once. */
export function keyDir(key: string): Dir | null {
    switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
            return "up";
        case "ArrowDown":
        case "s":
        case "S":
            return "down";
        case "ArrowLeft":
        case "a":
        case "A":
            return "left";
        case "ArrowRight":
        case "d":
        case "D":
            return "right";
        default:
            return null;
    }
}

/**
 * The direction of a swipe, or null when it was too short to mean one. `min` is in the same units
 * as the swipe; the page passes squares, so a swipe has to cover about a finger's width.
 */
export function swipeDir(dx: number, dy: number, min: number): Dir | null {
    if (Math.hypot(dx, dy) < min) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

/** A gamepad stick as a direction, with a dead zone so a resting stick is no direction. */
export function stickDir(x: number, y: number, dead = 0.5): Dir | null {
    if (Math.max(Math.abs(x), Math.abs(y)) < dead) return null;
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" : "left") : y > 0 ? "down" : "up";
}
