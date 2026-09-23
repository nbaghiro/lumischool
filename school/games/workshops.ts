import { bodies, type Bodies, type Body } from "../../engine/motion/bodies";
import {
    workshop,
    edit,
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
import type { Frame, Sprite, Mark, Happening } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel } from "./game";

const SIZE = { w: 42, h: 27 };
const DT = 1 / 60;
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

interface WorkshopLevel extends ActionLevel {
    pieces: Piece[];
    masses?: number[];
    target: number;
    gate?: { x: number; y: number };
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

export const MARBLE_LEVELS: WorkshopLevel[] = [
    {
        title: "Across the gap",
        grades: [1, 2],
        goal: "Move and turn the ramp so the marble reaches the blue tray. Test, adjust and try again.",
        pieces: [{ id: "ramp-1", x: 8, y: 12, angle: 0.25 }],
        target: 15,
    },
    {
        title: "Two ramps",
        grades: [2, 3],
        goal: "Make a path to the far tray using both ramps.",
        pieces: [
            { id: "ramp-1", x: 9, y: 9, angle: 0.3 },
            { id: "ramp-2", x: 22, y: 16, angle: -0.2 },
        ],
        target: 29,
    },
    {
        title: "Through the ring",
        grades: [3, 4],
        goal: "Guide the marble through the gold ring before it reaches the tray.",
        pieces: [
            { id: "ramp-1", x: 9, y: 9, angle: 0.3 },
            { id: "ramp-2", x: 19, y: 16, angle: -0.2 },
            { id: "ramp-3", x: 29, y: 19, angle: 0.2 },
        ],
        target: 33,
        gate: { x: 20, y: 13 },
    },
    {
        title: "The return journey",
        grades: [4, 4],
        goal: "Pass through the ring on the right, then return to the tray on the left. Every ramp can be moved and turned.",
        pieces: [
            { id: "ramp-1", x: 9, y: 8, angle: 0.3 },
            { id: "ramp-2", x: 21, y: 14, angle: -0.4 },
            { id: "ramp-3", x: 12, y: 19, angle: -0.2 },
        ],
        target: 8,
        gate: { x: 24, y: 12 },
    },
];

export interface WorkshopState {
    kind: "cargo" | "marble";
    level: number;
    definition: WorkshopLevel;
    construction: Workshop;
    world: Bodies;
    objects: Map<string, Body>;
    ball: Body | null;
    phase: "build" | "test" | "won";
    goals: Objectives;
    selected: string;
    hook: { x: number; y: number };
    held: string | null;
    dragging: string | null;
    touching: boolean;
    text: string;
    ticks: number;
    attempts: number;
    sailed: number;
}

function goalsFor(s: Pick<WorkshopState, "kind" | "definition">): Objectives {
    return objectives(
        s.kind === "cargo"
            ? [
                  { id: "loaded", label: "All cargo aboard", seconds: 0.8 },
                  { id: "balanced", label: "Boat balanced", after: "loaded", seconds: 1 },
                  { id: "delivered", label: "Delivery complete", after: "balanced" },
              ]
            : [
                  ...(s.definition.gate ? [{ id: "gate", label: "Through the ring" }] : []),
                  {
                      id: "caught",
                      label: "Marble in the tray",
                      after: s.definition.gate ? "gate" : undefined,
                      seconds: 0.5,
                  },
              ],
    );
}

function rebuild(s: WorkshopState): void {
    s.world = bodies({ gravity: { x: 0, y: 18 } });
    s.objects.clear();
    s.ball = null;
    if (s.kind === "cargo") {
        s.world.ground({ y: 22, from: 0, to: 17 });
        s.world.ground({ y: 22, from: 21, to: 39 });
        for (const [i, p] of s.construction.design.pieces.entries())
            s.objects.set(
                p.id,
                s.world.box({
                    x: p.x,
                    y: p.y,
                    w: 1.8,
                    h: 1.8,
                    density: s.definition.masses?.[i] ?? 1,
                    friction: 0.7,
                    upright: true,
                    damping: { move: 0.3, turn: 1 },
                }),
            );
    } else {
        for (const p of s.construction.design.pieces)
            s.objects.set(
                p.id,
                s.world.box({
                    x: p.x,
                    y: p.y,
                    w: 9,
                    h: 0.5,
                    angle: p.angle,
                    fixed: true,
                    friction: 0.05,
                    restitution: 0.08,
                }),
            );
        const x = s.definition.target;
        s.world.ground({ y: 24, from: x - 3, to: x + 3 });
        s.world.box({ x: x - 3, y: 23, w: 0.4, h: 2, fixed: true });
        s.world.box({ x: x + 3, y: 23, w: 0.4, h: 2, fixed: true });
    }
}

export function startWorkshop(kind: WorkshopState["kind"], level: number): WorkshopState {
    const levels = kind === "cargo" ? CARGO_LEVELS : MARBLE_LEVELS;
    const definition = levels[level] ?? levels[0];
    if (!definition) throw new Error("No workshop level.");
    const construction = workshop(definition.pieces, SIZE);
    const s: WorkshopState = {
        kind,
        level,
        definition,
        construction,
        world: bodies({ gravity: { x: 0, y: 18 } }),
        objects: new Map(),
        ball: null,
        phase: "build",
        goals: goalsFor({ kind, definition }),
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
    rebuild(s);
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
        if (!body) continue;
        const at = s.world.where(body);
        if (at.x > 21 && at.x < 39 && at.y > 12 && at.y < 22 && s.held !== p.id) {
            loaded++;
            moment += (at.x - 30) * (s.definition.masses?.[i] ?? 1);
            moving ||= s.world.moving(body, 0.12);
        }
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

function hook(s: WorkshopState): void {
    if (s.held) {
        s.held = null;
        s.text = "Cargo released. Let it settle before ringing the bell.";
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
    if (!nearest) {
        s.text = "Lower the hook just above a crate, then pick it up.";
        return;
    }
    syncCrates(s);
    s.construction.past.push(checkpoint(s.construction));
    s.construction.future = [];
    if (s.construction.past.length > 100) s.construction.past.shift();
    s.held = nearest;
    s.selected = nearest;
    s.text = "Lift the crate clear of the dock, move it over the boat, then release.";
}

export function workshopCommand(s: WorkshopState, id: string): void {
    if (id === "undo" || id === "redo") {
        if (id === "undo" ? undo(s.construction) : redo(s.construction)) {
            s.held = null;
            s.phase = "build";
            s.goals = goalsFor(s);
            rebuild(s);
            s.text = "Your construction is ready.";
        }
        return;
    }
    if (id === "test") {
        if (s.kind === "cargo") {
            const b = cargoBalance(s);
            if (
                b.loaded === s.objects.size &&
                Math.abs(b.moment) < 1.2 &&
                !b.moving &&
                s.goals.done.includes("balanced")
            ) {
                observe(s.goals, new Set(["delivered"]), DT);
                s.phase = "won";
                s.text = "Balanced and delivered. The harbour is ready for another journey.";
            } else
                s.text = "Load every crate, balance the weight around the mast, and let it settle.";
        } else if (s.phase !== "test") {
            rebuild(s);
            s.goals = goalsFor(s);
            s.phase = "test";
            s.attempts++;
            s.ball = s.world.ball({
                x: 5,
                y: 2,
                r: 0.45,
                fast: true,
                friction: 0.05,
                restitution: 0.1,
            });
            s.text = "Watch its path. Return to building whenever you want to change it.";
        } else {
            s.phase = "build";
            rebuild(s);
            s.text = "Adjust your ramps and try again.";
        }
        return;
    }
    if (id === "hook") {
        if (s.phase !== "won") hook(s);
        return;
    }
    if (s.phase !== "build") return;
    const pieces = s.construction.design.pieces;
    if (id === "next") {
        s.selected =
            pieces[(pieces.findIndex((p) => p.id === s.selected) + 1) % pieces.length]?.id ?? "";
        return;
    }
    const p = pieces.find((p) => p.id === s.selected);
    if (!p) return;
    if (id === "left" || id === "right")
        edit(s.construction, {
            kind: "rotate",
            id: p.id,
            angle: p.angle + ((id === "left" ? -1 : 1) * Math.PI) / 24,
        });
    if (id === "up" || id === "down" || id === "west" || id === "east")
        edit(s.construction, {
            kind: "move",
            id: p.id,
            x: p.x + (id === "west" ? -0.5 : id === "east" ? 0.5 : 0),
            y: p.y + (id === "up" ? -0.5 : id === "down" ? 0.5 : 0),
        });
}

export function stepWorkshop(s: WorkshopState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.ticks++;
    if (s.phase === "won") {
        s.sailed = Math.min(8, s.sailed + DT * 1.5);
        return out;
    }
    if (s.kind === "cargo") {
        if (pad.touch) {
            s.hook.x = clamp(pad.touch.x, 1, 41);
            s.hook.y = clamp(pad.touch.y, 2, 20);
        } else {
            s.hook.x = clamp(
                s.hook.x + (pad.held === "left" ? -0.14 : pad.held === "right" ? 0.14 : 0),
                1,
                41,
            );
            s.hook.y = clamp(
                s.hook.y + (pad.held === "up" ? -0.14 : pad.held === "down" ? 0.14 : 0),
                2,
                20,
            );
        }
        if (pad.tapped) hook(s);
        if (pad.brake) workshopCommand(s, "test");
        const held = s.held ? s.objects.get(s.held) : undefined;
        if (held) s.world.moveTo(held, { x: s.hook.x, y: s.hook.y + 1.7 });
        s.world.step(DT);
        for (const [id, b] of s.objects)
            if (s.world.where(b).y > 26) {
                const home = s.definition.pieces.find((p) => p.id === id);
                if (home) {
                    s.world.moveTo(b, home);
                    s.text = "The harbour crew brought that crate back to the dock.";
                    out.push({ cue: "splash" });
                }
            }
        const b = cargoBalance(s),
            satisfied = new Set<string>();
        if (b.loaded === s.objects.size && !b.moving) satisfied.add("loaded");
        if (satisfied.has("loaded") && Math.abs(b.moment) < 1.2) satisfied.add("balanced");
        if (observe(s.goals, satisfied, DT).length) out.push({ cue: "ring" });
    } else if (s.phase === "build") {
        if (pad.touch && !s.touching) {
            const nearest = [...s.construction.design.pieces].sort(
                (a, b) =>
                    Math.hypot(a.x - (pad.touch?.x ?? 0), a.y - (pad.touch?.y ?? 0)) -
                    Math.hypot(b.x - (pad.touch?.x ?? 0), b.y - (pad.touch?.y ?? 0)),
            )[0];
            if (nearest && Math.hypot(nearest.x - pad.touch.x, nearest.y - pad.touch.y) < 5) {
                s.selected = nearest.id;
                s.dragging = nearest.id;
            }
        }
        if (pad.lifted && s.dragging) {
            edit(s.construction, {
                kind: "move",
                id: s.dragging,
                x: pad.lifted.x,
                y: pad.lifted.y,
            });
            s.dragging = null;
        }
        s.touching = !!pad.touch;
        if (pad.tapped) workshopCommand(s, "test");
        for (const d of pad.pressed)
            workshopCommand(s, d === "left" ? "west" : d === "right" ? "east" : d);
    } else {
        s.world.step(DT);
        if (pad.tapped) workshopCommand(s, "test");
        if (s.ball) {
            const p = s.world.where(s.ball),
                satisfied = new Set<string>();
            const gate = s.definition.gate;
            if (gate && Math.hypot(p.x - gate.x, p.y - gate.y) < 2) satisfied.add("gate");
            if (
                Math.abs(p.x - s.definition.target) < 2.6 &&
                p.y > 21 &&
                p.y < 24 &&
                !s.world.moving(s.ball, 0.3)
            )
                satisfied.add("caught");
            if (observe(s.goals, satisfied, DT).length) out.push({ cue: "ring" });
            if (s.goals.done.includes("caught")) {
                s.phase = "won";
                s.text = "It works! Your marble found its way home.";
                out.push({ cue: "win" });
            } else if (p.y > 28 || p.x < -3 || p.x > 45) {
                s.phase = "build";
                rebuild(s);
                s.text = "Keep the parts that worked. Change a ramp and try another path.";
            }
        }
    }
    return out;
}

export function workshopFrame(s: WorkshopState): Frame {
    const sprites: Sprite[] = [],
        marks: Mark[] = [];
    if (s.kind === "cargo") {
        sprites.push(
            sprite("dock", "ramp", 8.5, 22.5, 17, 1),
            sprite("barge", "boat", 30 + s.sailed, 23.5, 18, 3),
        );
        marks.push(
            { kind: "line", a: { x: 1, y: 2 }, b: { x: 41, y: 2 }, style: "rod" },
            { kind: "line", a: { x: s.hook.x, y: 2 }, b: s.hook, style: "thin" },
        );
        sprites.push(sprite("hook", "hook", s.hook.x, s.hook.y, 1, 2));
        for (const [i, p] of s.construction.design.pieces.entries()) {
            const b = s.objects.get(p.id);
            if (!b) continue;
            const at = s.world.where(b),
                sailed = at.x > 21 ? s.sailed : 0;
            sprites.push(sprite(p.id, "crate", at.x + sailed, at.y, 1.8, 1.8));
            marks.push(words(at.x + sailed, at.y + 0.2, String(s.definition.masses?.[i] ?? 1)));
        }
        const balance = cargoBalance(s);
        marks.push(
            words(30, 6, `${balance.loaded}/${s.objects.size} aboard`),
            words(
                30,
                8,
                Math.abs(balance.moment) < 1.2
                    ? "Weight balanced"
                    : balance.moment < 0
                      ? "More weight on the left"
                      : "More weight on the right",
            ),
            { kind: "line", a: { x: 30, y: 10 }, b: { x: 30, y: 22 }, style: "aim" },
        );
    } else {
        for (const p of s.construction.design.pieces) {
            sprites.push(sprite(p.id, "ramp", p.x, p.y, 9, 0.5, p.angle));
            if (p.id === s.selected && s.phase === "build")
                marks.push(
                    { kind: "ring", x: p.x, y: p.y, r: 1, on: true },
                    words(p.x, p.y - 1.2, "Selected"),
                );
        }
        const p = s.ball ? s.world.where(s.ball) : { x: 5, y: 2 };
        sprites.push(
            sprite("marble", "marble", p.x, p.y, 0.9, 0.9),
            sprite("tray", "boat", s.definition.target, 24.3, 6, 1.5),
        );
        marks.push(words(5, 1, "Start"));
        if (s.definition.gate)
            marks.push({
                kind: "ring",
                x: s.definition.gate.x,
                y: s.definition.gate.y,
                r: 2,
                on: s.goals.done.includes("gate"),
            });
    }
    marks.push(
        words(
            21,
            26,
            s.goals.definitions
                .map((g) => `${s.goals.done.includes(g.id) ? "✓" : "○"} ${g.label}`)
                .join("   "),
        ),
    );
    return { sprites, marks, camera: { x: 21, y: 13.5, zoom: 1 }, view: SIZE, world: SIZE };
}

const game = (kind: WorkshopState["kind"]): ActionGame<WorkshopState> => ({
    id: kind === "cargo" ? "cargo-workshop" : "marble-workshop",
    title: kind === "cargo" ? "Harbour cargo" : "Marble workshop",
    group: "action",
    rate: 60,
    touch: true,
    cover: { art: kind === "cargo" ? "crane" : "ramp" },
    hint:
        kind === "cargo"
            ? "Move the hook with your finger or arrow keys. Pick up or release with the button or Space. Ring the bell to set sail."
            : "Drag a ramp to move it, or select it and use arrow keys. Turn it with the buttons. Space tests your design.",
    levels: kind === "cargo" ? CARGO_LEVELS : MARBLE_LEVELS,
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: kind === "cargo" ? "Pick up / release" : "Test / build",
    },
    commands:
        kind === "cargo"
            ? [
                  { id: "hook", label: "Pick up / release" },
                  { id: "test", label: "Ring the bell" },
                  { id: "undo", label: "Undo delivery" },
              ]
            : [
                  { id: "next", label: "Next ramp" },
                  { id: "left", label: "Turn left" },
                  { id: "right", label: "Turn right" },
                  { id: "test", label: "Test / build" },
                  { id: "undo", label: "Undo" },
                  { id: "redo", label: "Redo" },
              ],
    start: (level) => startWorkshop(kind, level),
    step: stepWorkshop,
    frame: workshopFrame,
    say: (s) =>
        `${s.definition.goal} ${s.text} ${s.kind === "cargo" ? `${cargoBalance(s).loaded} crates aboard.` : `Selected ${s.selected}. ${s.phase === "build" ? "Building" : "Testing"}.`}`,
    note: (s) => s.text,
    won: (s) => s.phase === "won",
    command: workshopCommand,
    checkpoint: (s) => {
        if (s.kind === "cargo") syncCrates(s);
        return { kind, level: s.level, design: checkpoint(s.construction) };
    },
    restore: (s, value) => {
        if (
            !value ||
            typeof value !== "object" ||
            !("kind" in value) ||
            value.kind !== kind ||
            !("level" in value) ||
            value.level !== s.level ||
            !("design" in value) ||
            !restore(s.construction, value.design)
        )
            return false;
        s.phase = "build";
        s.held = null;
        s.sailed = 0;
        s.goals = goalsFor(s);
        rebuild(s);
        s.text = "Your saved workshop is ready.";
        return true;
    },
    still: {
        press: () => 12,
        settling: (s) =>
            s.kind === "marble"
                ? s.phase === "test"
                : [...s.objects.values()].some((b) => s.world.moving(b)) && !s.held,
    },
});

export const cargoGame = game("cargo");
export const marbleGame = game("marble");
