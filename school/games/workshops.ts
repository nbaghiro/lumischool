// Harbour cargo: a crane lifts crates from the dock onto a barge, and the barge floats. The crane's
// hook hangs on a rope from a trolley along its jib, so a crate swings as it travels and has to be let
// settle before it is set down; the barge lists towards the heavier side, and the load is balanced
// when the weights times their distances from the mast come out even. See .docs/games.md.
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
/** How fast a held crate's swing dies, per second. */
const SWAY = 3;
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
        goal: "Lift both crates aboard. Keep their weight balanced around the mast, then ring the bell.",
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
        goal: "Find a balanced arrangement for four different loads. Ring the bell when the boat is ready.",
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

/**
 * Picks up the crate under the hook, or lets go of the one it holds. A crate taken by hand, or one
 * the hook is only near, has the crane brought over it first, as a crane driver would.
 */
function hook(s: WorkshopState): void {
    const c = s.crane;
    if (s.held) {
        s.held = null;
        setRope(s, c.length);
        s.text = "Crate released. Load every crate onto the boat.";
        return;
    }
    let nearest = "",
        distance = 3;
    for (const [id, body] of s.objects) {
        const at = s.world.where(body),
            d = Math.hypot(at.x - s.hook.x, at.y - (s.hook.y + 1.7));
        if (d < distance) {
            nearest = id;
            distance = d;
        }
    }
    const body = nearest ? s.objects.get(nearest) : undefined;
    if (!body) {
        s.text = "Lower the hook just above a crate, then pick it up.";
        return;
    }
    syncCrates(s);
    s.construction.past.push(checkpoint(s.construction));
    s.construction.future = [];
    if (s.construction.past.length > 100) s.construction.past.shift();
    const at = s.world.where(body),
        top = { x: at.x, y: at.y - 0.9 },
        hookAt = { x: at.x, y: top.y - 0.3 };
    s.world.moveTo(c.trolley, { x: at.x, y: JIB });
    s.world.moveTo(c.hook, hookAt);
    s.hook = { x: at.x, y: hookAt.y };
    s.held = nearest;
    setRope(s, hookAt.y - JIB);
    s.selected = nearest;
    s.text =
        "Lift the crate clear of the dock, move it over the boat, let it stop swinging, then release.";
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
    const over = Math.abs(s.hook.x - t.x) < 0.15 && Math.abs(h.x - t.x) < 0.15,
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
        s.world.push(crate, { x: -SWAY * mass * (v.x - vt.x), y: 0 });
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
        ) {
            observe(s.goals, new Set(["delivered"]), DT);
            s.phase = "won";
            s.text = "Balanced and delivered. The harbour is ready for another journey.";
        } else s.text = "Load every crate, balance the weight around the mast, and let it settle.";
        return;
    }
    if (id === "hook" && s.phase !== "won") hook(s);
}

export function stepWorkshop(s: WorkshopState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.ticks++;
    s.clock.t = s.ticks * DT;
    if (s.phase === "won") {
        s.sailed = Math.min(8, s.sailed + DT * 1.5);
        return out;
    }
    if (pad.touch && !s.touching && !s.held && !pad.tapped) {
        const crate = [...s.objects.entries()].find(([, body]) => {
            const at = s.world.where(body);
            return Math.hypot(at.x - (pad.touch?.x ?? 0), at.y - (pad.touch?.y ?? 0)) < 1.8;
        });
        if (crate) {
            const at = s.world.where(crate[1]);
            s.hook = { x: at.x, y: at.y - 1.7 };
            hook(s);
            s.dragging = s.held;
        }
    }
    if (pad.touch) {
        s.hook.x = clamp(pad.touch.x, 1, 41);
        s.hook.y = clamp(pad.touch.y - (s.dragging ? 1.7 : 0), 3, 20);
    } else {
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
    }
    if (pad.tapped) {
        if (!s.held && s.goals.done.includes("balanced")) workshopCommand(s, "test");
        else hook(s);
    }
    if (pad.brake) workshopCommand(s, "test");
    if (pad.lifted && s.dragging) {
        s.hook.x = clamp(pad.lifted.x, 1, 41);
        s.hook.y = clamp(pad.lifted.y - 1.7, 3, 20);
        hook(s);
        s.dragging = null;
    }
    s.touching = !!pad.touch;
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
    if (!s.held && !s.goals.done.includes("delivered")) {
        if (satisfied.has("balanced") && s.goals.done.includes("balanced"))
            s.text = "Ready to sail! Ring the bell, or press Space or Enter.";
        else if (b.loaded === s.objects.size)
            s.text = b.moving
                ? "Let the crates settle."
                : Math.abs(b.moment) < BALANCED
                  ? "The load is balanced. Getting ready to sail…"
                  : "Move a crate towards the lighter side to balance the boat.";
    }
    return out;
}

export function workshopFrame(s: WorkshopState): Frame {
    const sprites: Sprite[] = [],
        marks: Mark[] = [];
    const barge = s.world.where(s.barge),
        up = { x: Math.sin(barge.angle), y: -Math.cos(barge.angle) };
    // the quay the dock stands on runs off to the left, and the harbour off to the right
    sprites.push(...ground("quay", -BEYOND, HARBOUR.x, 23, 0));
    sprites.push(sprite("dock", "ramp", 8.5, 22.5, 17, 1), {
        ...sprite("barge", "boat", barge.x + s.sailed, barge.y, HALF * 2, 4, barge.angle),
        z: 2,
    });
    const trolley = s.world.where(s.crane.trolley),
        hookAt = s.world.where(s.crane.hook);
    marks.push(
        { kind: "line", a: { x: 1, y: JIB }, b: { x: 41, y: JIB }, style: "rod" },
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
        else if (!s.held && Math.hypot(at.x - s.hook.x, at.y - s.hook.y - 1.7) < 3)
            marks.push({ kind: "ring", x: at.x, y: at.y, r: 1.2 });
    }
    const balance = cargoBalance(s);
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
            a: { x: barge.x + s.sailed - up.x * 2, y: barge.y - up.y * 2 },
            b: { x: barge.x + s.sailed + up.x * 12, y: barge.y + up.y * 12 },
            style: "aim",
        },
    );
    marks.push(
        words(
            21,
            26,
            s.goals.definitions
                .map((g) => `${s.goals.done.includes(g.id) ? "✓" : "○"} ${g.label}`)
                .join("   "),
        ),
    );
    return {
        sprites,
        marks,
        camera: { x: 21, y: 13.5, zoom: 1 },
        view: SIZE,
        world: SIZE,
        time: s.clock.t,
        water: [{ ...HARBOUR, w: HARBOUR.w + BEYOND, ripples: s.ripples }],
    };
}

export const cargoGame: ActionGame<WorkshopState> = {
    id: "cargo-workshop",
    title: "Harbour cargo",
    group: "action",
    rate: 60,
    touch: true,
    cover: { art: "crane" },
    hint: "Drag a crate onto the boat and let go. Or move the hook above a crate with the arrow keys, then press Space or Enter to pick up or release. Balance the weight around the centre line. When ready, ring the bell or press Space or Enter to sail.",
    levels: CARGO_LEVELS,
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: "Pick up / release",
    },
    commands: [
        { id: "hook", label: "Pick up / release" },
        { id: "test", label: "Ring the bell" },
        { id: "undo", label: "Undo delivery" },
    ],
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
        s.sailed = 0;
        s.goals = goalsFor();
        rebuild(s);
        s.text = "Your saved workshop is ready.";
        return true;
    },
    still: {
        press: () => 12,
        settling: (s) => [...s.objects.values()].some((b) => s.world.moving(b)) && !s.held,
    },
};
