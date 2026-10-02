// A try as the hands made it: the pad each step read, and the commands, take-backs and restores
// between steps, from the level's start. The steps are fixed and a level's chance is seeded, so
// playing a tape into a fresh start is the same try again, which is how the player shows a try
// back and how it returns to a checkpoint without the game copying its own state. A run of steps
// with the same hands is kept once with its count, so a minute of holding still is one entry.
import { spent, type Dir, type Intent, type Pad } from "./pad";
import type { Happening } from "./scene";

export type Entry =
    | { pad: Pad; n: number }
    | { command: string }
    | { back: true }
    | { cancel: true }
    | { restore: unknown };

export interface Tape {
    entries: Entry[];
    /** Steps in the tape, which is also the step the game is on. */
    steps: number;
}

/** What the tape plays into: a fresh start and the ways the page moves a game. */
export interface Deck<S> {
    start(): S;
    step(s: S, pad: Pad): Happening[];
    command?(s: S, id: string): void;
    back?(s: S): boolean;
    cancelInput?(s: S): void;
    restore?(s: S, value: unknown): boolean;
}

export const tape = (): Tape => ({ entries: [], steps: 0 });

const copyPad = (p: Pad): Pad => ({
    ...p,
    holding: [...p.holding],
    pressed: [...p.pressed],
    ...(p.intents ? { intents: p.intents.map((i) => ({ ...i })) } : {}),
});

const same = (a: Pad, b: Pad): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Records the pad a step is about to read. */
export function recordStep(t: Tape, pad: Pad): void {
    t.steps++;
    const last = t.entries[t.entries.length - 1];
    if (last && "pad" in last && same(last.pad, pad)) last.n++;
    else t.entries.push({ pad: copyPad(pad), n: 1 });
}

export function recordOther(t: Tape, e: Exclude<Entry, { pad: Pad }>): void {
    t.entries.push(e);
}

/** The tape up to the end of step `at`. */
export function cut(t: Tape, at: number): Tape {
    const out = tape();
    for (const e of t.entries) {
        if (out.steps >= at) break;
        if ("pad" in e) {
            const n = Math.min(e.n, at - out.steps);
            out.entries.push({ pad: copyPad(e.pad), n });
            out.steps += n;
        } else out.entries.push(e);
    }
    return out;
}

/** Applies one entry to a game, stepping as many times as it holds, and gives back what happened. */
export function apply<S>(deck: Deck<S>, s: S, e: Entry): Happening[] {
    if ("pad" in e) {
        const out: Happening[] = [];
        for (let i = 0; i < e.n; i++) {
            const pad = copyPad(e.pad);
            out.push(...deck.step(s, pad));
            spent(pad);
        }
        return out;
    }
    if ("command" in e) deck.command?.(s, e.command);
    else if ("back" in e) deck.back?.(s);
    else if ("cancel" in e) deck.cancelInput?.(s);
    else deck.restore?.(s, e.restore);
    return [];
}

/** A fresh start with the whole tape played into it. */
export function replay<S>(deck: Deck<S>, t: Tape): S {
    const s = deck.start();
    for (const e of t.entries) apply(deck, s, e);
    return s;
}

/**
 * The tape's steps one at a time, for playing a try back at the game's own pace: each call gives the
 * pad for the next step with whatever the page did before it, a last call gives what it did after the
 * last step with no pad, and then null.
 */
export function player(t: Tape): () => { before: Entry[]; pad: Pad | null } | null {
    let i = 0,
        used = 0,
        over = false;
    return () => {
        if (over) return null;
        const before: Entry[] = [];
        for (; i < t.entries.length; i++) {
            const e = t.entries[i];
            if (!e) break;
            if (!("pad" in e)) {
                before.push(e);
                continue;
            }
            if (used < e.n) {
                used++;
                return { before, pad: copyPad(e.pad) };
            }
            used = 0;
        }
        over = true;
        return { before, pad: null };
    };
}

const isDir = (v: unknown): v is Dir => v === "up" || v === "down" || v === "left" || v === "right";

function dirs(v: unknown): Dir[] | null {
    if (!Array.isArray(v)) return null;
    const out: Dir[] = [];
    for (const d of v as unknown[]) {
        if (!isDir(d)) return null;
        out.push(d);
    }
    return out;
}

/** A point, null, or undefined when the value is neither. */
function point(v: unknown): { x: number; y: number } | null | undefined {
    if (v === null) return null;
    if (
        typeof v === "object" &&
        "x" in v &&
        "y" in v &&
        typeof v.x === "number" &&
        typeof v.y === "number" &&
        Number.isFinite(v.x) &&
        Number.isFinite(v.y)
    )
        return { x: v.x, y: v.y };
    return undefined;
}

function intents(v: unknown): Intent[] | null {
    if (!Array.isArray(v)) return null;
    const out: Intent[] = [];
    for (const i of v as unknown[]) {
        if (
            typeof i !== "object" ||
            i === null ||
            !("kind" in i) ||
            !("by" in i) ||
            typeof i.by !== "number" ||
            !Number.isFinite(i.by)
        )
            return null;
        if (i.kind !== "zoom") return null;
        out.push({ kind: "zoom", by: i.by });
    }
    return out;
}

function readPad(v: unknown): Pad | string {
    if (typeof v !== "object" || v === null) return "a pad is not an object";
    if (!("held" in v) || !(v.held === null || isDir(v.held)))
        return "a pad's held is not a direction";
    const holding = "holding" in v ? dirs(v.holding) : null;
    const pressed = "pressed" in v ? dirs(v.pressed) : null;
    if (!holding || !pressed) return "a pad's holding or pressed is not a list of directions";
    if (
        !("go" in v) ||
        !("brake" in v) ||
        !("tapped" in v) ||
        typeof v.go !== "boolean" ||
        typeof v.brake !== "boolean" ||
        typeof v.tapped !== "boolean"
    )
        return "a pad's buttons are not true or false";
    const pull = "pull" in v ? point(v.pull) : undefined,
        released = "released" in v ? point(v.released) : undefined,
        touch = "touch" in v ? point(v.touch) : undefined,
        lifted = "lifted" in v ? point(v.lifted) : undefined;
    if (pull === undefined || released === undefined || touch === undefined || lifted === undefined)
        return "a pad's pull, release, touch or lift is not a point or null";
    const pad: Pad = {
        held: v.held,
        holding,
        pressed,
        go: v.go,
        brake: v.brake,
        pull,
        released,
        tapped: v.tapped,
        touch,
        lifted,
    };
    if ("flick" in v && v.flick !== undefined) {
        const flick = point(v.flick);
        if (flick === undefined) return "a pad's flick is not a point or null";
        pad.flick = flick;
    }
    if ("intents" in v && v.intents !== undefined) {
        const read = intents(v.intents);
        if (!read) return "a pad's intents are not turns and zooms";
        pad.intents = read;
    }
    return pad;
}

/** A tape read back from outside, as a file or a paste: the tape, or what is wrong with it. */
export function readTape(v: unknown): Tape | string {
    if (typeof v !== "object" || v === null || !("entries" in v) || !Array.isArray(v.entries))
        return "a tape is an object with a list of entries";
    const out = tape();
    for (const [i, e] of (v.entries as unknown[]).entries()) {
        if (typeof e !== "object" || e === null) return `entry ${i + 1} is not an object`;
        if ("pad" in e) {
            const pad = readPad(e.pad);
            if (typeof pad === "string") return `entry ${i + 1}: ${pad}`;
            if (!("n" in e) || typeof e.n !== "number" || !Number.isInteger(e.n) || e.n < 1)
                return `entry ${i + 1} does not say how many steps it holds`;
            out.entries.push({ pad, n: e.n });
            out.steps += e.n;
        } else if ("command" in e && typeof e.command === "string")
            out.entries.push({ command: e.command });
        else if ("back" in e && e.back === true) out.entries.push({ back: true });
        else if ("cancel" in e && e.cancel === true) out.entries.push({ cancel: true });
        else if ("restore" in e) out.entries.push({ restore: e.restore });
        else return `entry ${i + 1} is not a step, a command, a take-back, a cancel or a restore`;
    }
    if ("steps" in v && v.steps !== out.steps)
        return `the tape says ${String(v.steps)} steps and holds ${out.steps}`;
    return out;
}
