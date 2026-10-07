// The variations of Nutmeg's winter store, and a forager that plays each one to its end through the
// real game: by the keys, with held arrows, the space bar and the Action key, and by a finger held on
// the field, above her to jump or climb, on a tree to shake it, below her to dive, and tapped on her
// for Action. It works out each step what the store still wants, gathers food lying about or runs to a
// trunk and shakes the tree a little at a time, carries what fits home, dives into the burrow, stands
// in the room that wants it while her cheeks empty, and takes back what is too many. A variation a
// child is given has been played to the end this way in the tests.
import { configurationKey } from "../../engine/motion/configuration";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import { grounded, stepRunner, type Intent } from "../../engine/motion/walker";
import {
    CHEEKS,
    CHIP_LEVELS,
    G,
    PLACES,
    RATE,
    act,
    branchAt,
    cheekWorth,
    hidden,
    movesOf,
    placesOf,
    roomAt,
    startChip,
    treeAt,
    stepChip,
    tunnelAt,
    wants,
    worldOf,
    type ChipState,
    type Food,
} from "./chipmunk";

export interface ChipConfiguration {
    phase: number;
    variant: number;
}

const variantsOf = (phase: number): number => CHIP_LEVELS[phase]?.variants.length ?? 1;

export const chipChallenge = (seed: number, phase: number): ChipConfiguration => ({
    phase,
    variant: (seed >>> 0) % variantsOf(phase),
});

export const isChipConfiguration = (v: unknown, phase: number): v is ChipConfiguration =>
    typeof v === "object" &&
    v !== null &&
    "phase" in v &&
    "variant" in v &&
    Object.keys(v).length === 2 &&
    v.phase === phase &&
    typeof v.variant === "number" &&
    Number.isInteger(v.variant) &&
    v.variant >= 0 &&
    v.variant < variantsOf(phase);

export const openChipConfiguration = (c: ChipConfiguration): ChipState =>
    startChip(c.phase, c.variant);

export type Act = { pad: Pad } | { command: string };

/** Where she is: on the ground, on a tree's branch, in a tunnel, on a ladder, or in the air. */
type Layer =
    | { at: "ground" }
    | { at: "branch"; tree: number }
    | { at: "tunnel"; k: number }
    | { at: "ladder" }
    | { at: "air" };

interface Spot {
    layer: Layer;
    x: number;
}

function layerOf(s: ChipState): Layer {
    const r = s.r;
    if (r.state === "climb") return { at: "ladder" };
    if (!grounded(r)) return { at: "air" };
    const k = tunnelAt(s);
    if (k >= 0) return { at: "tunnel", k };
    const t = branchAt(s);
    if (t >= 0) return { at: "branch", tree: t };
    return { at: "ground" };
}

/** What the forager means to do this step. */
type Want = { go: Spot } | { shake: true } | { act: true } | { wait: true };

interface Memory {
    /** Where an errand's run is headed, kept while she is in the air. */
    aim: number;
    /** Steps a jump is still held for. */
    hold: number;
    /** The branch being shaken, how many nuts it should drop, and how many hung when it began. */
    shake: { tree: number; want: number; hung: number } | null;
    /** Nuts it has given up on, such as ones dropped somewhere it does not go. */
    skip: Set<number>;
}

const hanging = (s: ChipState, tree: number, food?: Food): number =>
    s.nuts.filter((n, k) => n.at === "hang" && n.branch === tree && (!food || s.kinds[k] === food))
        .length;

/** The most she should carry: on a level with a stream between the trees and the burrow, what makes the long jump. */
const capOf = (s: ChipState): number => (s.L.streams.length ? 3 : CHEEKS);

/** The room she is working on: the one that wants most. */
function target(s: ChipState): number {
    const w = wants(s);
    let best = -1;
    w.forEach((x, i) => {
        if (x > 0 && (best < 0 || x > (w[best] ?? 0))) best = i;
    });
    return best;
}

/** The food it should go for now, or null when what it carries is enough. */
function foodWanted(s: ChipState): Food | null {
    const room = target(s);
    if (room < 0) return null;
    const need = (wants(s)[room] ?? 0) - cheekWorth(s),
        left = capOf(s) - placesOf(s.cheeks);
    if (need <= 0 || left <= 0) return null;
    const pinecones = s.nuts.some(
        (n, k) =>
            s.kinds[k] === "pinecone" && (n.at === "rest" || n.at === "hang" || n.at === "air"),
    );
    if (need >= 5 && left >= PLACES.pinecone && pinecones) return "pinecone";
    return "acorn";
}

/** The place a nut lies, as somewhere she can get to. */
function spotOfNut(s: ChipState, x: number, y: number): Spot | null {
    if (Math.abs(y - G) < 0.2) return { layer: { at: "ground" }, x };
    const k = s.L.tunnels.findIndex((t) => Math.abs(t.y - y) < 0.2 && !t.flooded);
    return k >= 0 ? { layer: { at: "tunnel", k }, x } : null;
}

/** How far away a spot is, for choosing the nearest: going underground or up a tree costs extra. */
function cost(s: ChipState, to: Spot): number {
    const here = layerOf(s);
    const same =
        (here.at === "ground" && to.layer.at === "ground") ||
        (here.at === "tunnel" && to.layer.at === "tunnel" && here.k === to.layer.k);
    return Math.abs(to.x - s.r.x) + (same ? 0 : 12);
}

function decide(s: ChipState, mem: Memory): Want {
    const r = s.r,
        here = layerOf(s);
    const q = s.squirrel;
    if (q && q.carry.length && (here.at === "ground" || here.at === "air"))
        return { go: { layer: { at: "ground" }, x: q.x } };
    // the hawk: if it is coming and she carries something, hide in the nearest log or the burrow
    const h = s.hawk;
    if (h && h.x !== null && s.cheeks.length && h.x < r.x + 1 && !hidden(s)) {
        const time = (r.x - h.x) / 14;
        const logs = s.L.logs.map((l) => l.x),
            door = s.L.tunnels[0]?.door;
        const near = [...logs, ...(door === undefined ? [] : [door])].toSorted(
            (a, b) => Math.abs(a - r.x) - Math.abs(b - r.x),
        )[0];
        if (
            near !== undefined &&
            Math.abs(near - r.x) / movesOf(placesOf(s.cheeks)).speed < time + 0.3
        ) {
            if (here.at === "ground" && door === near && Math.abs(r.x - near) < 0.3)
                return { go: { layer: { at: "tunnel", k: 0 }, x: near } };
            return { go: { layer: { at: "ground" }, x: near } };
        }
    }
    if (h && h.x !== null && hidden(s) && s.cheeks.length && here.at === "ground" && h.x < r.x + 2)
        return { wait: true };
    // a branch being shaken, until enough has come down
    const sh = mem.shake;
    if (sh && treeAt(s) === sh.tree) {
        const down = sh.hung - hanging(s, sh.tree);
        if (down < sh.want && hanging(s, sh.tree) > 0) return { shake: true };
        mem.shake = null;
    }
    // too heavy for the long jump home: spit one out on this bank to lighten the load
    const st = s.L.streams[0],
        door = s.L.tunnels[0]?.door ?? 0;
    if (st && here.at === "ground" && placesOf(s.cheeks) > capOf(s)) {
        const far = door < st.x0 ? r.x > st.x1 : r.x < st.x0;
        if (far) return { act: true };
    }
    const room = roomAt(s);
    const w = wants(s);
    // in a room: empty the cheeks into it if they fit what it wants, or take back what is too many
    // what was taken back is not emptied again: it is carried on, or spat out where no room is
    const back = s.cheeks.some((c) => c.nut === -1);
    if (room >= 0 && here.at === "tunnel") {
        const want = w[room] ?? 0;
        if (want < 0) return { act: true };
        if (
            s.cheeks.length &&
            room === target(s) &&
            (cheekWorth(s) <= want || (foodWanted(s) === null && !back))
        )
            return { act: true };
    }
    const still = w.reduce((n, x) => n + Math.max(0, x), 0);
    if (still === 0 && w.every((x) => x === 0)) return { wait: true };
    if (back && here.at === "tunnel" && cheekWorth(s) > still) {
        const spot = spitSpot(s, here.k);
        if (Math.abs(r.x - spot) < 0.3) return { act: true };
        return { go: { layer: here, x: spot } };
    }
    if (s.cheeks.length === 0) {
        const over = w.findIndex((x) => x < 0);
        if (over >= 0) return { go: roomSpot(s, over) };
    }
    const room0 = target(s);
    if (room0 < 0) return { wait: true };
    const food = foodWanted(s);
    if (food === null) return { go: roomSpot(s, room0) };
    // food lying about, nearest first
    const lying = s.nuts
        .map((n, k) => ({ n, k }))
        .filter(
            ({ n, k }) =>
                n.at === "rest" && s.kinds[k] === food && !mem.skip.has(k) && !s.spat.includes(k),
        )
        .map(({ n, k }) => ({ k, spot: spotOfNut(s, n.x, n.y) }))
        .filter((x): x is { k: number; spot: Spot } => x.spot !== null)
        .toSorted((a, b) => cost(s, a.spot) - cost(s, b.spot));
    const first = lying[0];
    if (first) {
        mem.shake = null;
        return { go: first.spot };
    }
    if (s.nuts.some((n, k) => n.at === "air" && s.kinds[k] === food)) return { wait: true };
    // nothing lying: climb the nearest tree with that food on it and shake some down
    const trees = s.L.trees
        .map((t, i) => ({ t, i }))
        .filter(({ i }) => hanging(s, i, food) > 0)
        .toSorted((a, b) => Math.abs(a.t.x - r.x) - Math.abs(b.t.x - r.x));
    const tree = trees[0];
    if (!tree) {
        // nothing of that food left anywhere: carry home what there is
        return s.cheeks.length ? { go: roomSpot(s, room0) } : { wait: true };
    }
    if (here.at === "ground" && treeAt(s) === tree.i) {
        const need = (w[room0] ?? 0) - cheekWorth(s),
            left = capOf(s) - placesOf(s.cheeks);
        const count =
            food === "pinecone"
                ? Math.min(Math.floor(left / 3), Math.ceil(need / 5))
                : Math.min(left, need);
        mem.shake = { tree: tree.i, want: Math.max(1, count + 1), hung: hanging(s, tree.i) };
        return { shake: true };
    }
    return { go: { layer: { at: "ground" }, x: tree.t.x } };
}

/** The place in a tunnel furthest from its rooms, where a spat-out extra lies out of the way. */
function spitSpot(s: ChipState, k: number): number {
    const t = s.L.tunnels[k];
    if (!t) return s.r.x;
    const rooms = s.L.rooms.filter((m) => m.tunnel === k);
    const gap = (x: number) =>
        Math.min(
            ...rooms.map((m) =>
                x >= m.x0 - 0.3 && x <= m.x1 + 0.3
                    ? 0
                    : Math.min(Math.abs(x - m.x0), Math.abs(x - m.x1)),
            ),
        );
    let best = t.x0 + 0.6;
    for (let x = t.x0 + 0.6; x <= t.x1 - 0.6; x += 0.25) if (gap(x) > gap(best)) best = x;
    return best;
}

function roomSpot(s: ChipState, room: number): Spot {
    const m = s.L.rooms[room];
    return { layer: { at: "tunnel", k: m?.tunnel ?? 0 }, x: m ? (m.x0 + m.x1) / 2 : 0 };
}

const none = (): Intent => ({ run: 0, jump: false, jumped: false });

/**
 * How long to hold a running jump from where she stands so that it comes down on the nearest ground
 * ahead rather than in water, tried on a copy of her: the hold that lands furthest inside it.
 */
function holdFor(s: ChipState, dir: 1 | -1): number {
    const m = movesOf(placesOf(s.cheeks)),
        c = worldOf(s.L).course;
    let best = RATE,
        margin = -Infinity;
    for (let hold = 1; hold <= RATE * 0.6; hold += 2) {
        const r = structuredClone(s.r);
        for (let n = 0; n < RATE * 2; n++) {
            const ran = stepRunner(
                r,
                { run: dir, jump: n < hold, jumped: n === 0 },
                c,
                m,
                1 / RATE,
            );
            if (ran.includes("landed")) break;
            if (r.y > s.L.h) break;
        }
        const wet = worldOf(s.L).wood.water.some(
            (w) => r.x >= w.x0 && r.x <= w.x1 && r.y > w.level,
        );
        if (!grounded(r) || wet) continue;
        const ahead = c.floor(r.x + dir * 0.6, r.y - 0.05, r.y + 0.05) !== null,
            behind = c.floor(r.x - dir * 0.6, r.y - 0.05, r.y + 0.05) !== null;
        const room = (ahead ? 1 : 0) + (behind ? 1 : 0) + (Math.abs(r.y - s.r.y) < 0.1 ? 0.5 : 0);
        if (room > margin) {
            margin = room;
            best = hold;
        }
    }
    return best;
}

/** Runs towards `x`, jumping a gap or a step on the way, and stops within `near` of it. */
function walk(s: ChipState, x: number, mem: Memory, near = 0.2, leap = true): Intent {
    const r = s.r,
        d = x - r.x;
    if (Math.abs(d) <= near) return none();
    const dir: 1 | -1 = d > 0 ? 1 : -1,
        m = movesOf(placesOf(s.cheeks)),
        c = worldOf(s.L).course;
    mem.aim = x;
    if (leap && Math.abs(d) > 0.6) {
        const edge = c.floor(r.x + dir * 0.35, r.y - m.step, r.y + m.step) === null;
        const wall = c.solid?.(r.x + dir * 0.5, r.y - 0.4) ?? false;
        if (edge || wall) {
            mem.hold = holdFor(s, dir);
            return { run: dir, jump: true, jumped: true };
        }
    }
    // slow down near the place, so she stops on it rather than past it
    const slow = Math.abs(d) < 0.8 && Math.abs(r.vx) > 3 && Math.sign(r.vx) === dir;
    return { run: slow ? 0 : dir, jump: false, jumped: false };
}

/** The intent that takes her towards a spot from where she is. */
function move(s: ChipState, to: Spot, mem: Memory): Intent & { drop?: boolean } {
    const r = s.r,
        here = layerOf(s),
        L = s.L;
    if (here.at === "air") {
        const dir = Math.abs(mem.aim - r.x) > 0.2 ? (mem.aim > r.x ? 1 : -1) : 0;
        mem.hold = Math.max(0, mem.hold - 1);
        return { run: dir, jump: mem.hold > 0, jumped: false };
    }
    mem.hold = 0;
    if (here.at === "ladder") {
        const tree = L.trees.findIndex((t) => Math.abs(t.x - r.x) < 0.5 && r.y <= G + 0.05);
        const up =
            tree >= 0
                ? to.layer.at === "branch" && to.layer.tree === tree
                : to.layer.at !== "tunnel" || to.layer.k < Math.max(0, shaftOf(s));
        return { ...none(), climb: up ? -1 : 1 };
    }
    if (here.at === "ground") {
        if (to.layer.at === "ground") return walk(s, to.x, mem);
        if (to.layer.at === "branch") {
            const t = L.trees[to.layer.tree];
            if (!t) return none();
            if (Math.abs(r.x - t.x) > 0.25) return walk(s, t.x, mem, 0.18);
            return { ...none(), climb: -1 };
        }
        const door = L.tunnels[0]?.door ?? 0;
        if (Math.abs(r.x - door) > 0.3) return walk(s, door, mem, 0.25);
        return { ...none(), drop: true };
    }
    if (here.at === "branch") {
        const t = L.trees[here.tree];
        if (!t) return none();
        if (to.layer.at === "branch" && to.layer.tree === here.tree)
            return walk(s, to.x, mem, 0.2, false);
        // off the end of the branch nearest where she is going
        const right = to.x > t.x;
        mem.aim = to.x;
        return { run: right ? 1 : -1, jump: false, jumped: false };
    }
    if (here.at === "tunnel") {
        const k = here.k;
        if (to.layer.at === "tunnel" && to.layer.k === k) return walk(s, to.x, mem, 0.25);
        const deeper = to.layer.at === "tunnel" && to.layer.k > k;
        const door = deeper ? (L.tunnels[k + 1]?.door ?? 0) : (L.tunnels[k]?.door ?? 0);
        if (Math.abs(r.x - door) > 0.25) return walk(s, door, mem, 0.2);
        return deeper ? { ...none(), drop: true } : { ...none(), climb: -1 };
    }
    return none();
}

/** The shaft she is climbing, by the tunnel it leads down to, or -1. */
function shaftOf(s: ChipState): number {
    return s.L.tunnels.findIndex((t) => Math.abs(t.door - s.r.x) < 0.6 && s.r.y <= t.y + 0.05);
}

/** The pad a hand gives for an intent: the keys, or a finger on the field. */
function padOf(
    s: ChipState,
    i: Intent & { drop?: boolean; shake?: boolean },
    hands: "keys" | "touch",
): Pad {
    const pad = emptyPad();
    if (hands === "keys") {
        const hold: ("left" | "right" | "up" | "down")[] = [];
        if (i.run) hold.push(i.run > 0 ? "right" : "left");
        if (i.climb) hold.push(i.climb < 0 ? "up" : "down");
        if (i.shake) hold.push("down");
        if (i.drop) {
            hold.push("down");
            pad.pressed = ["down"];
        }
        pad.holding = hold;
        pad.held = hold[hold.length - 1] ?? null;
        if (i.jump) {
            pad.go = true;
            pad.keys = true;
        }
        if (i.jumped) pad.tapped = true;
        return pad;
    }
    const m = movesOf(placesOf(s.cheeks)),
        body = s.r.y - m.height / 2;
    // a shake is a finger held on the tree's crown
    const tree = s.L.trees[treeAt(s)];
    if (i.shake && tree) {
        pad.touch = { x: tree.x, y: tree.branch.y - 2 };
        return pad;
    }
    const up = i.jump || (i.climb ?? 0) < 0;
    const lift = i.jumped && s.above;
    const down = (i.climb ?? 0) > 0 || i.drop || i.shake;
    pad.touch = {
        x: s.r.x + (i.run ?? 0) * 3,
        y: lift ? body : up ? body - 3.5 : down ? body + 2.6 : body,
    };
    return pad;
}

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** The most play the forager is given: a minute past the level's clock, or seven minutes. */
const limitOf = (s: ChipState): number => RATE * ((s.L.time ?? 360) + 60);

/**
 * A play of a configuration by `hands` to a win, as the steps and commands it took, or null when it
 * does not get there in time.
 */
export function chipWay(
    c: ChipConfiguration,
    hands: "keys" | "touch",
    watch?: (s: ChipState) => void,
): Act[] | null {
    const s = openChipConfiguration(c);
    if (s.L.free) return [];
    const acts: Act[] = [],
        mem: Memory = { aim: s.r.x, hold: 0, shake: null, skip: new Set() };
    const step = (pad: Pad) => {
        acts.push({ pad: kept(pad) });
        stepChip(s, kept(pad));
        watch?.(s);
    };
    const limit = limitOf(s);
    let pulse = 0;
    while (!s.won && !s.out && s.steps < limit) {
        const want = decide(s, mem);
        if ("act" in want) {
            if (hands === "keys") {
                acts.push({ command: "act" });
                act(s);
                step(emptyPad());
            } else {
                // a tap on her: the finger down on her body for a step, then lifted there
                const body = { x: s.r.x, y: s.r.y - 0.55 };
                const down = emptyPad();
                down.touch = body;
                step(down);
                const up = emptyPad();
                up.lifted = body;
                step(up);
            }
            continue;
        }
        if ("wait" in want) {
            step(padOf(s, none(), hands));
            continue;
        }
        if ("shake" in want) {
            // short shakes, so the loosest drop one at a time close by; a finger stays down longer than a tap
            const every = hands === "keys" ? 30 : 45,
                on = hands === "keys" ? 9 : 20;
            pulse = (pulse + 1) % every;
            step(padOf(s, { ...none(), shake: pulse < on }, hands));
            continue;
        }
        const i = move(s, want.go, mem);
        if (hands === "touch" && i.jumped && s.above) step(padOf(s, none(), hands));
        step(padOf(s, i, hands));
    }
    return s.won ? acts : null;
}

/** Plays recorded acts on a fresh round, as the page would. */
export function replay(c: ChipConfiguration, acts: readonly Act[]): ChipState {
    const s = openChipConfiguration(c);
    for (const a of acts) {
        if ("pad" in a) stepChip(s, kept(a.pad));
        else if (a.command === "act") act(s);
    }
    return s;
}

const PROVEN = new Map<string, boolean>();

/** Whether a variation has been played to the end both by the keys and by a finger, kept once found. */
export function chipCertified(c: ChipConfiguration): boolean {
    const key = configurationKey(c);
    const known = PROVEN.get(key);
    if (known !== undefined) return known;
    const ok = chipWay(c, "keys") !== null && chipWay(c, "touch") !== null;
    PROVEN.set(key, ok);
    return ok;
}
