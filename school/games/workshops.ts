// Harbour cargo: a crane lifts crates from the dock onto a barge, and the barge floats. The child drags
// a crate and lets go; the crane carries it on its rope, so it swings as it travels, and sets it down
// straight below once it hangs still. The barge lists towards the heavier side, the load is balanced
// when the weights times their distances from the mast come out even, and a balanced barge sails by
// itself. See .docs/games.md.
import { bodies, type Bodies, type Body, type Joint } from "../../engine/motion/bodies";
import {
    workshop,
    undo,
    redo,
    checkpoint,
    restore,
    objectives,
    observe,
    type Workshop,
    type Objectives,
    type Piece,
} from "../../engine/motion/construction";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Sprite, Mark, Happening, Water } from "../../engine/motion/scene";
import { surfaceAt } from "../../engine/motion/surface";
import type { ActionGame, ActionLevel } from "./game";
import { BEYOND, ground } from "./scenery";

const SIZE = { w: 42, h: 27 };
const DT = 1 / 60;
/** The jib the trolley runs along, and the harbour's still surface, in squares down. */
const JIB = 2,
    SEA = 23;
/** Where the barge is moored, across, and half its length. */
const MOOR = 30,
    HALF = 9;
/**
 * Each unit of a crate's number is this much mass per square, heavy enough against the barge's
 * buoyancy that the heaviest crate at an end lists it by several degrees.
 */
const HEAVY = 4;
/**
 * How far out of balance a load may be and still count as balanced, in weight times squares: a crane
 * sets a crate down within about a third of a square, and the heaviest crate is a 7.
 */
const BALANCED = 2.5;
/** How much rope is let out while a crate travels, so it passes over the crates below it. */
const TRAVEL = 8;
/** Where the hook rides while a crate is carried, and the span a crate can be set down in. */
const CARRY = JIB + TRAVEL,
    FROM = 2,
    TO = 38;
/** A held crate's middle is this far below the hook, and its bottom this far. */
const UNDER = 1.2,
    BOTTOM = 2.1;
/** Seconds a set-down may take before the crane lets go wherever the crate is. */
const PLACING = 6;
/** How fast a held crate's swing dies, per second, and how quickly one being set down is eased under the trolley. */
const SWAY = 3,
    STEADY = 5;
const HARBOUR: Water = { x: 17.5, w: 24.5, level: SEA, bottom: 27, waves: 0.03, hue: "sky" };
const clamp = (n: number, a: number, b: number): number => Math.max(a, Math.min(b, n));
const sprite = (
    key: string,
    kind: string,
    x: number,
    y: number,
    w: number,
    h: number,
    angle = 0,
): Sprite => ({ key, art: "workshop-piece", params: { kind, w, h }, x, y, size: w, angle });
const words = (x: number, y: number, text: string): Mark => ({
    kind: "word",
    x,
    y,
    text,
    size: 0.7,
});

export interface WorkshopLevel extends ActionLevel {
    pieces: Piece[];
    masses?: number[];
    target: number;
}

export const CARGO_LEVELS: WorkshopLevel[] = [
    {
        title: "First delivery",
        grades: [1, 2],
        goal: "Drag both crates onto the boat and let go. Balance their weight around the mast, and the boat sails.",
        pieces: [
            { id: "a", x: 4, y: 20, angle: 0 },
            { id: "b", x: 9, y: 20, angle: 0 },
        ],
        masses: [2, 2],
        target: 30,
    },
    {
        title: "A heavier parcel",
        grades: [2, 3],
        goal: "Load all three crates and balance the boat. Heavy crates can sit closer to the mast.",
        pieces: [
            { id: "a", x: 3, y: 20, angle: 0 },
            { id: "b", x: 8, y: 20, angle: 0 },
            { id: "c", x: 13, y: 20, angle: 0 },
        ],
        masses: [1, 2, 3],
        target: 30,
    },
    {
        title: "Four deliveries",
        grades: [3, 4],
        goal: "Find a balanced arrangement for four different loads. The boat sails when it is ready.",
        pieces: [
            { id: "a", x: 3, y: 20, angle: 0 },
            { id: "b", x: 7, y: 20, angle: 0 },
            { id: "c", x: 11, y: 20, angle: 0 },
            { id: "d", x: 15, y: 20, angle: 0 },
        ],
        masses: [1, 2, 3, 4],
        target: 30,
    },
    {
        title: "Harbour master",
        grades: [4, 4],
        goal: "Fit five loads aboard and bring the balance within the marked band. Try stacking as well as spreading them out.",
        pieces: [
            { id: "a", x: 2, y: 20, angle: 0 },
            { id: "b", x: 5, y: 20, angle: 0 },
            { id: "c", x: 8, y: 20, angle: 0 },
            { id: "d", x: 11, y: 20, angle: 0 },
            { id: "e", x: 14, y: 20, angle: 0 },
        ],
        masses: [1, 2, 3, 5, 7],
        target: 30,
    },
];

/**
 * The crane's moving parts: the trolley on the jib and the hook on its rope. While the hook holds a
 * crate the rope runs to the crate itself and the hook rides on its top, since a light hook between
 * a heavy crate and the trolley would let the rope stretch.
 */
interface Crane {
    trolley: Body;
    hook: Body;
    rope: Joint;
    /** How long the rope is let out, in squares, to the hook. */
    length: number;
}

export interface WorkshopState {
    level: number;
    definition: WorkshopLevel;
    construction: Workshop;
    world: Bodies;
    objects: Map<string, Body>;
    crane: Crane;
    barge: Body;
    /** Seconds each crate has been in the water off the barge. */
    wet: Map<string, number>;
    ripples: { x: number; age: number; size: number }[];
    /** The game's clock, in seconds, which the waves the barge floats on are worked out at. */
    clock: { t: number };
    phase: "build" | "won";
    goals: Objectives;
    selected: string;
    /** Where the hook is wanted: the trolley goes over `x` and lets the rope out to reach `y`. */
    hook: { x: number; y: number };
    held: string | null;
    /** Where a crate let go of is being set down, across, and the tick the set-down began; null while none is. */
    placing: { x: number; at: number } | null;
    dragging: string | null;
    touching: boolean;
    text: string;
    ticks: number;
    attempts: number;
    sailed: number;
}

function goalsFor(): Objectives {
    return objectives([
        { id: "loaded", label: "All cargo aboard", seconds: 0.8 },
        { id: "balanced", label: "Boat balanced", after: "loaded", seconds: 1 },
        { id: "delivered", label: "Delivery complete", after: "balanced" },
    ]);
}

function build(
    definition: WorkshopLevel,
    pieces: Piece[],
    clock: { t: number },
): {
    world: Bodies;
    objects: Map<string, Body>;
    crane: Crane;
    barge: Body;
} {
    const world = bodies({ gravity: { x: 0, y: 18 } });
    const objects = new Map<string, Body>();
    world.ground({ y: 22, from: 0, to: 17 });
    world.water({
        y: SEA,
        from: 17.5,
        to: 42,
        density: 6,
        drag: 3,
        at: (x) => surfaceAt(HARBOUR, x, clock.t),
    });
    // the barge: a hull with a low rail at each end, floating, and kept at its mooring by the game
    const barge = world.compound({
        x: MOOR,
        y: SEA - 0.6,
        parts: [
            { box: { x: 0, y: 0, w: HALF * 2, h: 4 } },
            { box: { x: -HALF + 0.2, y: -2.75, w: 0.4, h: 1.5 } },
            { box: { x: HALF - 0.2, y: -2.75, w: 0.4, h: 1.5 } },
        ],
        density: 1.5,
        friction: 0.8,
        damping: { move: 0.5, turn: 1.5 },
    });
    for (const [i, p] of pieces.entries())
        objects.set(
            p.id,
            world.box({
                x: p.x,
                y: p.y,
                w: 1.8,
                h: 1.8,
                density: (definition.masses?.[i] ?? 1) * HEAVY,
                friction: 0.7,
                upright: true,
                damping: { move: 0.3, turn: 1 },
                group: "cargo",
            }),
        );
    const trolley = world.box({
        x: 5,
        y: JIB,
        w: 1,
        h: 0.4,
        carried: true,
        group: "crane",
        ignores: ["crane", "cargo"],
    });
    // the hook passes through crates
    const hook = world.ball({
        x: 5,
        y: 10,
        r: 0.3,
        density: 6,
        damping: { move: 2 },
        group: "crane",
        ignores: ["crane", "cargo"],
    });
    const rope = world.rope(trolley, hook, {
        at: { x: 5, y: JIB },
        to: { x: 5, y: 10 },
        length: 8,
    });
    return { world, objects, crane: { trolley, hook, rope, length: 8 }, barge };
}

function rebuild(s: WorkshopState): void {
    const b = build(s.definition, s.construction.design.pieces, s.clock);
    s.world = b.world;
    s.objects = b.objects;
    s.crane = b.crane;
    s.barge = b.barge;
    s.wet = new Map();
    s.hook = { x: 5, y: 10 };
}

/** A crate's place on the barge, across from the mast and up from the deck, or null when it is not aboard. */
function aboard(s: WorkshopState, body: Body): { x: number; y: number } | null {
    const at = s.world.where(body),
        b = s.world.where(s.barge),
        c = Math.cos(-b.angle),
        sn = Math.sin(-b.angle),
        dx = at.x - b.x,
        dy = at.y - b.y;
    const x = dx * c - dy * sn,
        y = dx * sn + dy * c;
    return Math.abs(x) < HALF && y < -2 && y > -8 ? { x, y } : null;
}

export function startWorkshop(level: number): WorkshopState {
    const definition = CARGO_LEVELS[level] ?? CARGO_LEVELS[0];
    if (!definition) throw new Error("No workshop level.");
    return startWorkshopLevel(level, definition);
}

/** Open stored challenge geometry without mutating the authored level catalogue. */
export function startWorkshopLevel(level: number, definition: WorkshopLevel): WorkshopState {
    const construction = workshop(definition.pieces, SIZE);
    const clock = { t: 0 };
    const s: WorkshopState = {
        level,
        definition,
        construction,
        ...build(definition, construction.design.pieces, clock),
        clock,
        wet: new Map(),
        ripples: [],
        phase: "build",
        goals: goalsFor(),
        selected: definition.pieces[0]?.id ?? "",
        hook: { x: 5, y: 10 },
        held: null,
        placing: null,
        dragging: null,
        touching: false,
        text: definition.goal,
        ticks: 0,
        attempts: 0,
        sailed: 0,
    };
    return s;
}

export function cargoBalance(s: WorkshopState): {
    loaded: number;
    moment: number;
    moving: boolean;
} {
    let loaded = 0,
        moment = 0,
        moving = false;
    for (const [i, p] of s.construction.design.pieces.entries()) {
        const body = s.objects.get(p.id);
        if (!body || s.held === p.id) continue;
        const on = aboard(s, body);
        if (!on) continue;
        loaded++;
        moment += on.x * (s.definition.masses?.[i] ?? 1);
        // still on the barge, as the barge rides the waves: against the deck under it, not the world
        const v = s.world.velocity(body),
            vb = s.world.velocity(s.barge),
            w = s.world.spin(s.barge),
            at = s.world.where(body),
            b = s.world.where(s.barge),
            deck = { x: vb.x - w * (at.y - b.y), y: vb.y + w * (at.x - b.x) };
        moving ||= Math.hypot(v.x - deck.x, v.y - deck.y) > 0.2;
    }
    return { loaded, moment, moving };
}

function syncCrates(s: WorkshopState): void {
    for (const p of s.construction.design.pieces) {
        const body = s.objects.get(p.id);
        if (!body) continue;
        const at = s.world.where(body);
        p.x = clamp(at.x, 1, 41);
        p.y = clamp(at.y, 1, 26);
    }
}

/** The crane comes over a crate and takes it on its hook, and lifts it to carry. */
function pick(s: WorkshopState, id: string): void {
    const c = s.crane,
        body = s.objects.get(id);
    if (!body) return;
    syncCrates(s);
    s.construction.past.push(checkpoint(s.construction));
    s.construction.future = [];
    if (s.construction.past.length > 100) s.construction.past.shift();
    const at = s.world.where(body),
        hookAt = { x: at.x, y: at.y - UNDER };
    s.world.moveTo(c.trolley, { x: at.x, y: JIB });
    s.world.moveTo(c.hook, hookAt);
    s.held = id;
    s.selected = id;
    setRope(s, hookAt.y - JIB);
    s.hook = { x: at.x, y: CARRY };
    s.text = "Move it over the boat and let go. The crane sets it down.";
}

/** The crane lets go of the crate it holds. */
function release(s: WorkshopState): void {
    s.held = null;
    s.placing = null;
    setRope(s, s.crane.length);
    s.text = "Set down. Load every crate onto the boat.";
}

/** Let go of a carried crate: the crane takes it over `x` and lowers it onto whatever is below. */
function drop(s: WorkshopState, x: number): void {
    s.placing = { x: clamp(x, FROM, TO), at: s.ticks };
    s.hook = { x: s.placing.x, y: CARRY };
    s.text = "Setting it down.";
}

/** The top of whatever is straight below `x`, from under the held crate down: a crate, the deck, the dock, or the sea. */
function surfaceBelow(s: WorkshopState, x: number): number {
    const crate = s.held ? s.objects.get(s.held) : undefined,
        from = crate ? s.world.where(crate).y + BOTTOM - UNDER + 0.05 : JIB + 1;
    return s.world.rayDown(x, from, SIZE.h)?.y ?? SEA;
}

/** Lowers a crate being set down until it rests just above what is below, then lets go once it hangs still. */
function lower(s: WorkshopState): void {
    const place = s.placing,
        crate = s.held ? s.objects.get(s.held) : undefined;
    if (!place || !crate) {
        s.placing = null;
        return;
    }
    const surface = surfaceBelow(s, place.x),
        at = s.world.where(crate),
        v = s.world.velocity(crate),
        t = s.world.where(s.crane.trolley);
    s.hook = { x: place.x, y: surface - BOTTOM - 0.15 };
    const over = Math.abs(t.x - place.x) < 0.15 && Math.abs(at.x - place.x) < 0.25,
        down = at.y + BOTTOM - UNDER > surface - 0.45,
        still = Math.hypot(v.x, v.y) < 0.4;
    if ((over && down && still) || (s.ticks - place.at) * DT > PLACING) release(s);
}

/** The crate just under the hook, within reach of it, if any: the one the big button takes. */
function underHook(s: WorkshopState): string | null {
    let nearest: string | null = null,
        distance = 3;
    for (const [id, body] of s.objects) {
        const at = s.world.where(body),
            d = Math.hypot(at.x - s.hook.x, at.y - (s.hook.y + 1.7));
        if (d < distance) {
            nearest = id;
            distance = d;
        }
    }
    return nearest;
}

/**
 * The big button from the keys: picks up the crate under the hook, bringing the crane over it as a
 * driver would, or lets go of the held one where it hangs.
 */
function hook(s: WorkshopState): void {
    if (s.held) {
        release(s);
        s.text = "Crate released. Load every crate onto the boat.";
        return;
    }
    const id = underHook(s),
        body = id ? s.objects.get(id) : undefined;
    if (!id || !body) {
        s.text = "Lower the hook just above a crate, then pick it up.";
        return;
    }
    pick(s, id);
    s.hook = { x: s.world.where(body).x, y: s.world.where(body).y - UNDER };
    s.text =
        "Lift the crate clear of the dock, move it over the boat, let it stop swinging, then release.";
}

/** The crate under a finger, if any. */
function crateAt(s: WorkshopState, p: { x: number; y: number }): string | null {
    for (const [id, body] of s.objects) {
        const at = s.world.where(body);
        if (Math.hypot(at.x - p.x, at.y - p.y) < 1.8) return id;
    }
    return null;
}

/** A balanced, settled load sails: the horn sounds and the barge leaves the quay. */
function deliver(s: WorkshopState, out: Happening[]): void {
    observe(s.goals, new Set(["delivered"]), DT);
    s.phase = "won";
    s.text = "Balanced and delivered. The harbour is ready for another journey.";
    out.push({ cue: "win" });
}

/**
 * Lets the crane's rope out, or winds it in, to `length` squares of rope to the hook, from where the
 * trolley is now: to the hook itself, or to the top of the crate it holds, just under the hook.
 */
function setRope(s: WorkshopState, length: number): void {
    const c = s.crane,
        t = s.world.where(c.trolley),
        crate = s.held ? s.objects.get(s.held) : undefined,
        load = crate ?? c.hook,
        at = s.world.where(load);
    s.world.unjoin(c.rope);
    c.length = length;
    c.rope = s.world.rope(c.trolley, load, {
        at: { x: t.x, y: JIB },
        to: crate ? { x: at.x, y: at.y - 0.9 } : at,
        length: crate ? length + 0.3 : length,
    });
}

/** Runs the trolley towards the wanted hook and winds the rope towards it, no faster than a crane can. */
function stepCrane(s: WorkshopState): void {
    const c = s.crane,
        t = s.world.where(c.trolley),
        h = s.world.where(c.hook);
    // a crate travels high, clear of the others: it is lifted before the trolley moves, and lowered
    // once it hangs still over its place
    // setting a crate down starts once it hangs roughly under the trolley; lowering it steadies it the rest of the way
    const near = s.placing ? 0.5 : 0.15,
        over = Math.abs(s.hook.x - t.x) < 0.15 && Math.abs(h.x - t.x) < near,
        lifting = s.held !== null && !over && c.length > TRAVEL + 0.1;
    s.world.launch(c.trolley, {
        x: lifting ? 0 : clamp((s.hook.x - t.x) * 6, -14, 14),
        y: 0,
    });
    const want = clamp(over ? s.hook.y - JIB : Math.min(s.hook.y - JIB, TRAVEL), 1, 20),
        next = c.length + clamp(want - c.length, -12 * DT, 12 * DT);
    if (Math.abs(next - c.length) > 1e-6) setRope(s, next);
    // the driver's hand on the controls: a held crate still swings as it starts and stops, but its
    // swing dies within a second or so rather than a child's patience
    const i = s.construction.design.pieces.findIndex((p) => p.id === s.held),
        crate = s.held ? s.objects.get(s.held) : undefined;
    if (crate) {
        const v = s.world.velocity(crate),
            vt = s.world.velocity(c.trolley),
            mass = (s.definition.masses?.[i] ?? 1) * HEAVY * 1.8 * 1.8;
        // a crate being set down is eased under the trolley, as a driver steadies a load onto its place:
        // a spring towards the trolley with just enough damping that it settles in about a second
        const at = s.world.where(crate),
            tx = s.world.where(c.trolley).x;
        s.world.push(crate, {
            x: s.placing
                ? mass * (STEADY * STEADY * (tx - at.x) - 2 * STEADY * (v.x - vt.x))
                : -SWAY * mass * (v.x - vt.x),
            y: 0,
        });
    }
    // the barge's mooring lines hold it where it is moored, and let it rise, fall and list
    const b = s.world.where(s.barge),
        v = s.world.velocity(s.barge);
    s.world.push(s.barge, { x: -600 * (b.x - MOOR) - 300 * v.x, y: 0 });
}

export function workshopCommand(s: WorkshopState, id: string): void {
    if (id === "undo" || id === "redo") {
        if (id === "undo" ? undo(s.construction) : redo(s.construction)) {
            s.held = null;
            s.placing = null;
            s.dragging = null;
            s.phase = "build";
            s.goals = goalsFor();
            rebuild(s);
            s.text = "Your construction is ready.";
        }
        return;
    }
    if (id === "test") {
        const b = cargoBalance(s);
        if (
            b.loaded === s.objects.size &&
            Math.abs(b.moment) < BALANCED &&
            !b.moving &&
            s.goals.done.includes("balanced")
        )
            deliver(s, []);
        else s.text = "Load every crate, balance the weight around the mast, and let it settle.";
        return;
    }
    if (id === "hook" && s.phase !== "won" && !s.placing) hook(s);
}

export function stepWorkshop(s: WorkshopState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.ticks++;
    s.clock.t = s.ticks * DT;
    if (s.phase === "won") {
        s.sailed = Math.min(8, s.sailed + DT * 1.5);
        return out;
    }
    // a finger on a crate takes it and carries it; lifting the finger lets it go to be set down
    if (!s.placing && pad.touch && !s.touching && !s.held) {
        const id = crateAt(s, pad.touch);
        if (id) {
            pick(s, id);
            s.dragging = id;
        }
    }
    if (s.dragging && s.held && pad.touch) s.hook = { x: clamp(pad.touch.x, FROM, TO), y: CARRY };
    if (s.dragging && pad.lifted) {
        if (s.held) drop(s, pad.lifted.x);
        s.dragging = null;
    }
    // the keys: left and right choose a crate, or carry the held one a square at a time, and the big button picks up or lets go
    // the keys and the arrow buttons drive the crane as they always have: the hook follows the arrow
    // held, and the big button takes the crate under the hook or lets the held one go where it hangs
    if (!s.placing && !s.dragging) {
        s.hook.x = clamp(
            s.hook.x + (pad.held === "left" ? -0.14 : pad.held === "right" ? 0.14 : 0),
            1,
            41,
        );
        s.hook.y = clamp(
            s.hook.y + (pad.held === "up" ? -0.14 : pad.held === "down" ? 0.14 : 0),
            3,
            20,
        );
        if (pad.tapped) {
            if (!s.held && s.goals.done.includes("balanced")) workshopCommand(s, "test");
            else hook(s);
        }
        if (pad.brake) workshopCommand(s, "test");
    }
    s.touching = !!pad.touch;
    if (s.placing) lower(s);
    stepCrane(s);
    s.world.step(DT);
    const held = s.held ? s.objects.get(s.held) : undefined;
    if (held) {
        const at = s.world.where(held);
        s.world.moveTo(s.crane.hook, { x: at.x, y: at.y - 1.2 });
    }
    // a crate that lands hard on the dock, the deck or another crate throws up a little dust
    const crates = new Set(s.objects.values());
    for (const h of s.world.hits()) {
        const crate = crates.has(h.a) ? h.a : crates.has(h.b) ? h.b : null;
        if (!crate || h.speed < 3 || crate === held) continue;
        const at = s.world.where(crate);
        out.push({ cue: "place" }, { burst: { kind: "dust", x: at.x, y: at.y + 0.6, n: 3 } });
        break;
    }
    s.ripples = s.ripples.map((r) => ({ ...r, age: r.age + DT })).filter((r) => r.age < 2.2);
    // a crate in the harbour splashes, floats or sinks a moment, and the crew bring it back to the dock
    for (const [id, b] of s.objects) {
        const at = s.world.where(b),
            wet = at.x > HARBOUR.x && at.y + 0.9 > SEA && id !== s.held && !aboard(s, b);
        if (!wet) {
            s.wet.delete(id);
            continue;
        }
        const was = s.wet.get(id) ?? 0;
        if (was === 0) {
            s.ripples.push({ x: at.x, age: 0, size: 1 });
            out.push({ cue: "splash" }, { burst: { kind: "splash", x: at.x, y: SEA, n: 8 } });
        }
        s.wet.set(id, was + DT);
        if (was + DT < 1.2) continue;
        const home = s.definition.pieces.find((p) => p.id === id);
        if (home) {
            s.world.moveTo(b, home);
            s.wet.delete(id);
            s.text = "The harbour crew brought that crate back to the dock.";
        }
    }
    const b = cargoBalance(s),
        satisfied = new Set<string>();
    if (b.loaded === s.objects.size && !b.moving) satisfied.add("loaded");
    if (satisfied.has("loaded") && Math.abs(b.moment) < BALANCED) satisfied.add("balanced");
    if (observe(s.goals, satisfied, DT).length) out.push({ cue: "ring" });
    if (!s.held && !s.placing && s.goals.done.includes("balanced") && satisfied.has("balanced")) {
        deliver(s, out);
        return out;
    }
    if (!s.held && !s.goals.done.includes("delivered")) {
        if (b.loaded === s.objects.size)
            s.text = b.moving
                ? "Let the crates settle."
                : Math.abs(b.moment) < BALANCED
                  ? "The load is balanced. Getting ready to sail."
                  : "Move a crate towards the lighter side to balance the boat.";
    }
    return out;
}

/** How much the landing is shown: the drop line and the barge's list, the drop line only, or nothing. */
const previewOf = (level: number): 0 | 1 | 2 => (level <= 1 ? 2 : level === 2 ? 1 : 0);

/** How far the barge would list for a load's moment, in radians, as the ghost mast leans: a guide, not the physics. */
const listFor = (moment: number): number => clamp(moment * 0.012, -0.18, 0.18);

export function workshopFrame(s: WorkshopState): Frame {
    const sprites: Sprite[] = [],
        marks: Mark[] = [];
    const barge = s.world.where(s.barge),
        up = { x: Math.sin(barge.angle), y: -Math.cos(barge.angle) },
        bx = barge.x + s.sailed;
    // the quay the dock stands on runs off to the left, and the harbour off to the right
    sprites.push(...ground("quay", -BEYOND, HARBOUR.x, 23, 0));
    // the crane stands on the quay at the left, its jib reaching out over the harbour; its rail is the jib's underside
    sprites.push({
        key: "crane",
        art: "crane",
        params: { w: 42, tall: 21 },
        size: 42,
        x: 18.5,
        y: 11.5,
        flip: true,
        z: 1,
        still: true,
    });
    sprites.push(sprite("dock", "ramp", 8.5, 22.5, 17, 1), {
        key: "barge",
        art: "barge",
        params: { w: HALF * 2, h: 4, rails: 1, load: [], hook: 0 },
        size: HALF * 2,
        // the drawing's box stands a square above the hull for the rail posts
        x: bx + up.x,
        y: barge.y + up.y,
        angle: barge.angle,
        z: 2,
    });
    const trolley = s.world.where(s.crane.trolley),
        hookAt = s.world.where(s.crane.hook);
    marks.push(
        { kind: "box", x: trolley.x - 0.55, y: JIB - 0.3, w: 1.1, h: 0.5 },
        { kind: "line", a: { x: trolley.x, y: JIB }, b: hookAt, style: "thin" },
    );
    sprites.push({ ...sprite("hook", "hook", hookAt.x, hookAt.y + 0.7, 1, 2), z: 6 });
    for (const [i, p] of s.construction.design.pieces.entries()) {
        const b = s.objects.get(p.id);
        if (!b) continue;
        const at = s.world.where(b),
            sailed = aboard(s, b) ? s.sailed : 0;
        sprites.push({ ...sprite(p.id, "crate", at.x + sailed, at.y, 1.8, 1.8, at.angle), z: 4 });
        marks.push(words(at.x + sailed, at.y + 0.2, String(s.definition.masses?.[i] ?? 1)));
        if (s.held === p.id)
            marks.push({ kind: "line", a: hookAt, b: { x: at.x, y: at.y - 0.9 }, style: "thin" });
        else if (!s.held && s.phase !== "won" && underHook(s) === p.id)
            marks.push({ kind: "ring", x: at.x, y: at.y, r: 1.4 });
    }
    const balance = cargoBalance(s),
        preview = previewOf(s.level);
    // where the carried crate will land: a line down to what is below and its outline there, and how the barge would list
    const heldIndex = s.construction.design.pieces.findIndex((p) => p.id === s.held),
        heldBody = s.held ? s.objects.get(s.held) : undefined;
    let moment = balance.moment;
    if (heldBody && preview > 0) {
        const x = s.placing?.x ?? s.hook.x,
            at = s.world.where(heldBody),
            surface = surfaceBelow(s, x);
        marks.push(
            { kind: "line", a: { x, y: at.y + 0.9 }, b: { x, y: surface }, style: "aim" },
            { kind: "box", x: x - 0.9, y: surface - 1.8, w: 1.8, h: 1.8 },
        );
        if (Math.abs(x - barge.x) < HALF)
            moment += (x - barge.x) * (s.definition.masses?.[heldIndex] ?? 1);
    }
    if (heldBody && preview === 2) {
        const lean = listFor(moment),
            dir = { x: Math.sin(lean), y: -Math.cos(lean) };
        marks.push({
            kind: "dots",
            pts: [2, 4, 6, 8, 10].map((k) => ({ x: bx + dir.x * k, y: barge.y + dir.y * k })),
            faint: true,
        });
    }
    // the mast stands up from the barge's middle and leans as the barge lists
    marks.push(
        words(MOOR, 6, `${balance.loaded}/${s.objects.size} aboard`),
        words(
            MOOR,
            8,
            balance.loaded === 0
                ? "Load the boat"
                : Math.abs(balance.moment) < BALANCED
                  ? "Weight balanced"
                  : balance.moment < 0
                    ? "More weight on the left"
                    : "More weight on the right",
        ),
        {
            kind: "line",
            a: { x: bx - up.x * 2, y: barge.y - up.y * 2 },
            b: { x: bx + up.x * 12, y: barge.y + up.y * 12 },
            style: "aim",
        },
    );
    // the three goals along the foot, each ticked as it is met
    for (const [k, g] of s.goals.definitions.entries()) {
        const x = 9 + k * 12,
            done = s.goals.done.includes(g.id);
        marks.push(
            // just before the words, which are about three tenths of a square a letter at this size
            {
                kind: "ring",
                x: x - g.label.length * 0.16 - 0.9,
                y: 25.8,
                r: 0.45,
                on: done,
                solid: true,
            },
            { kind: "word", x, y: 26, text: `${done ? "✓ " : ""}${g.label}`, size: 0.6 },
        );
    }
    return {
        sprites,
        marks,
        camera: { x: 21, y: 13.5, zoom: 1 },
        focus: { x: cargoFocus(s), y: 13.5 },
        view: SIZE,
        world: SIZE,
        time: s.clock.t,
        water: [{ ...HARBOUR, w: HARBOUR.w + BEYOND, ripples: s.ripples }],
    };
}

/**
 * Across the harbour, the middle of what a phone held upright keeps in view: the crate in the hook,
 * or else the next crate still on the quay, and the boat, so the crate and where it goes are both seen.
 */
function cargoFocus(s: WorkshopState): number {
    const boat = s.world.where(s.barge).x,
        held = s.held ? s.objects.get(s.held) : undefined;
    const waiting = [...s.objects.values()]
        .filter((b) => b !== held && !aboard(s, b))
        .map((b) => s.world.where(b).x);
    const crate = held ? s.world.where(held).x : waiting.length ? Math.min(...waiting) : boat;
    return (crate + boat) / 2;
}

export const cargoGame: ActionGame<WorkshopState> = {
    portrait: { keep: 30, hint: true },
    id: "cargo-workshop",
    title: "Harbour cargo",
    group: "action",
    rate: 60,
    touch: true,
    cover: { art: "barge", params: { w: 12, h: 3, rails: 1, load: [3, 5, 2], hook: 1 } },
    hint: "Drag a crate onto the boat and let go, and the crane sets it down. Or drive the crane: the arrow keys move the hook, and Space or Enter picks up the crate under it or releases the one it holds, so steady it low over its place first. Balance the weight around the mast and the boat sails.",
    levels: CARGO_LEVELS,
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: "Pick up / let go",
    },
    commands: [{ id: "undo", label: "Undo" }],
    start: (level) => startWorkshop(level),
    step: stepWorkshop,
    frame: workshopFrame,
    say: (s) => `${s.definition.goal} ${s.text} ${cargoBalance(s).loaded} crates aboard.`,
    note: (s) => s.text,
    won: (s) => s.phase === "won",
    objectives: (s) => ({
        completed: s.goals.done.length,
        total: s.goals.definitions.length,
    }),
    command: workshopCommand,
    cancelInput: (s) => {
        s.dragging = null;
        s.touching = false;
    },
    checkpoint: (s) => {
        syncCrates(s);
        return { kind: "cargo", level: s.level, design: checkpoint(s.construction) };
    },
    restore: (s, value) => {
        if (
            !value ||
            typeof value !== "object" ||
            !("kind" in value) ||
            value.kind !== "cargo" ||
            !("level" in value) ||
            value.level !== s.level ||
            !("design" in value) ||
            !restore(s.construction, value.design)
        )
            return false;
        s.phase = "build";
        s.held = null;
        s.placing = null;
        s.sailed = 0;
        s.goals = goalsFor();
        rebuild(s);
        s.text = "Your saved workshop is ready.";
        return true;
    },
    still: {
        press: () => 12,
        settling: (s) =>
            s.placing !== null ||
            ([...s.objects.values()].some((b) => s.world.moving(b)) && !s.held),
    },
};
