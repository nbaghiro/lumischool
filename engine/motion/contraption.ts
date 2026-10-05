// A chain-reaction machine: parts laid out on a board of shelves, one push, and real physics running
// the chain to a bell. A layout is plain data (each part's kind, place, turn and count), so a game
// keeps it in its state, saves it and replays it, and a run is built afresh from it and stepped at a
// fixed rate, so the same layout rings the bell, or misses it, the same way every time. The kit is
// the parts and their rules: where a part may stand, what it is in the world, what the first push
// does, what a fan blows, when a bucket outweighs its counterweight, and when the bell has rung.
// See .docs/engine.md.
import { bodies, type Bodies, type Body } from "./bodies";
import type { Pt } from "./geometry";

export type PartKind =
    "row" | "ramp" | "long" | "seesaw" | "ball" | "weight" | "spring" | "fan" | "bag" | "boat";

/** A part as a layout holds it. `x`, `y` is its foot for a part that stands, its middle for one that does not. */
export interface Part {
    id: string;
    kind: PartKind;
    x: number;
    y: number;
    /** Radians, for a ramp: its slope, level at nought. */
    angle: number;
    /** A row's dominoes, or a bag's marbles. */
    n: number;
    /** Set for a part that belongs to the place and is not moved. */
    locked?: boolean;
}

/** A block of the place: a shelf, a step, a wall. Its top is at `y`. */
export interface Shelf {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** A bucket hung over two wheels against a weight that rests on a ledge until the bucket outweighs it. */
export interface Hoist {
    bucket: Pt;
    weight: Pt;
    /** The weight, in marbles: the bucket lifts it once it holds more than this. */
    heavy: number;
}

/** The place a machine is built in: its size, its floor, its blocks, the bell, and what the first push does. */
export interface Scene {
    w: number;
    h: number;
    floor: number;
    shelves: Shelf[];
    /** Where the bell hangs or stands: the middle of what has to be touched to ring it. */
    bell: Pt;
    /** Squares a domino row stands apart, centre to centre. */
    gap: number;
    /** A stretch of the floor where a boat floats, between `from` and `to`. */
    pond?: { from: number; to: number };
    hoist?: Hoist;
    /** The part the first push is given to, by id: a row's first domino, a ball, a weight. Fans start by themselves. */
    push: string | null;
}

export const DOMINO = { w: 0.45, h: 2.6 };
export const BALL_R = 0.5;
export const MARBLE_R = 0.32;
export const WEIGHT = 1.4;
export const PLANK = 6;
/** How far a see-saw's plank is above its foot. */
export const STAND = 1.6;
export const FAN = { reach: 8, band: 1.6, push: 14 };
/** How far a ramp of each kind is long. */
export const LENGTHS = { ramp: 6, long: 9 } as const;
const SPRING = { w: 2.2, h: 0.8, lift: 15 };
const BOAT = { w: 2.6, h: 1 };
const BELL = { w: 1.8, h: 2.2 };

/** Whether a kind stands on whatever is under it, rather than staying where it is put. */
export const stands = (k: PartKind): boolean =>
    k === "row" ||
    k === "seesaw" ||
    k === "weight" ||
    k === "spring" ||
    k === "fan" ||
    k === "boat";

/** A part's box in the world, as `{ x0, y0, x1, y1 }`, for the rule that parts do not overlap. */
export function boxOf(
    p: Part,
    scene: Pick<Scene, "gap">,
): { x0: number; y0: number; x1: number; y1: number } {
    switch (p.kind) {
        case "row":
            return {
                x0: p.x - DOMINO.w / 2,
                y0: p.y - DOMINO.h,
                x1: p.x + (Math.max(1, p.n) - 1) * scene.gap + DOMINO.w / 2,
                y1: p.y,
            };
        case "ramp":
        case "long": {
            const h = LENGTHS[p.kind] / 2,
                dx = Math.abs(Math.cos(p.angle)) * h,
                dy = Math.abs(Math.sin(p.angle)) * h;
            return { x0: p.x - dx, y0: p.y - dy - 0.2, x1: p.x + dx, y1: p.y + dy + 0.2 };
        }
        case "seesaw":
            return { x0: p.x - 1, y0: p.y - STAND - 0.3, x1: p.x + 1, y1: p.y };
        case "ball":
            return { x0: p.x - BALL_R, y0: p.y - BALL_R, x1: p.x + BALL_R, y1: p.y + BALL_R };
        case "weight":
            return { x0: p.x - WEIGHT / 2, y0: p.y - WEIGHT, x1: p.x + WEIGHT / 2, y1: p.y };
        case "spring":
            return { x0: p.x - SPRING.w / 2, y0: p.y - SPRING.h, x1: p.x + SPRING.w / 2, y1: p.y };
        case "fan":
            return { x0: p.x - 0.9, y0: p.y - 2.4, x1: p.x + 0.9, y1: p.y };
        case "bag":
            return { x0: p.x - 1, y0: p.y - 1, x1: p.x + 1, y1: p.y + 1 };
        case "boat":
            return { x0: p.x - BOAT.w / 2, y0: p.y - BOAT.h, x1: p.x + BOAT.w / 2, y1: p.y };
    }
}

const overlap = (
    a: { x0: number; y0: number; x1: number; y1: number },
    b: { x0: number; y0: number; x1: number; y1: number },
): boolean => a.x0 < b.x1 - 0.05 && b.x0 < a.x1 - 0.05 && a.y0 < b.y1 - 0.05 && b.y0 < a.y1 - 0.05;

const shelfBox = (s: Shelf) => ({ x0: s.x, y0: s.y, x1: s.x + s.w, y1: s.y + s.h });
const bellBox = (scene: Scene) => ({
    x0: scene.bell.x - BELL.w / 2,
    y0: scene.bell.y - BELL.h / 2,
    x1: scene.bell.x + BELL.w / 2,
    y1: scene.bell.y + BELL.h / 2,
});

/** The top of whatever is first under `x` from `y` down: a shelf, or the floor. */
export function surfaceBelow(scene: Scene, x: number, y: number): number {
    let top = scene.floor;
    for (const s of scene.shelves)
        if (x >= s.x && x <= s.x + s.w && s.y >= y - 0.5 && s.y < top) top = s.y;
    return top;
}

/** A part as it would be put down at `at`: a standing part settles onto what is under it. */
export function settle(scene: Scene, p: Part, at: Pt): Part {
    const x = Math.max(1, Math.min(scene.w - 1, at.x)),
        y = Math.max(1, Math.min(scene.floor, at.y));
    if (!stands(p.kind)) return { ...p, x, y };
    // a row stands on what is under its first domino, a see-saw on what is under its stand
    return { ...p, x, y: surfaceBelow(scene, x, y) };
}

/** Whether a part may stand where it is: inside the board, clear of the place's blocks, the bell and every other part. */
export function fits(scene: Scene, parts: readonly Part[], p: Part): boolean {
    const box = boxOf(p, scene);
    if (box.x0 < 0.5 || box.x1 > scene.w - 0.5 || box.y0 < 0.5 || box.y1 > scene.floor + 0.01)
        return false;
    if (p.kind === "boat") {
        const pond = scene.pond;
        if (!pond || p.x - BOAT.w / 2 < pond.from || p.x + BOAT.w / 2 > pond.to) return false;
    } else if (stands(p.kind) && scene.pond && p.y >= scene.floor - 0.01) {
        const pond = scene.pond;
        if (box.x1 > pond.from && box.x0 < pond.to) return false;
    }
    if (scene.shelves.some((s) => overlap(box, shelfBox(s)))) return false;
    if (overlap(box, bellBox(scene))) return false;
    return parts.every((q) => q.id === p.id || !overlap(box, boxOf(q, scene)));
}

/** What a run tells as it goes: a domino falling (the nth in the chain), a knock, a spring's bounce, the bell. */
export type MachineEvent =
    | { kind: "topple"; n: number }
    | { kind: "knock"; speed: number; at: Pt }
    | { kind: "boing"; at: Pt }
    | { kind: "ring" };

/** A layout built as bodies, running. */
export interface Machine {
    world: Bodies;
    /** Each part's bodies, by the part's id: a row's dominoes left to right, a bag's marbles as they leave. */
    of: Map<string, Body[]>;
    parts: Part[];
    scene: Scene;
    bell: Body;
    fans: Part[];
    springs: { part: Part; body: Body }[];
    hoist: { bucket: Body; weight: Body } | null;
    /** Marbles still in each bag. */
    left: Map<string, number>;
    /** Dominoes fallen so far, so each is told once. */
    fallen: Set<Body>;
    rung: boolean;
    steps: number;
    /** Steps since nothing has moved. */
    calm: number;
}

const GRAVITY = 30;
export const RATE = 60;
const DT = 1 / RATE;

export function machine(scene: Scene, parts: readonly Part[]): Machine {
    const world = bodies({ gravity: { x: 0, y: GRAVITY } });
    world.ground({ y: scene.floor, from: -2, to: scene.w + 2, friction: 0.6 });
    if (scene.pond)
        // the pond's water is a smooth floor a boat glides on, a little below the boards
        world.box({
            x: (scene.pond.from + scene.pond.to) / 2,
            y: scene.floor + 0.05,
            w: scene.pond.to - scene.pond.from,
            h: 0.1,
            fixed: true,
            friction: 0,
        });
    world.box({ x: -0.5, y: scene.h / 2, w: 1, h: scene.h * 2, fixed: true });
    world.box({ x: scene.w + 0.5, y: scene.h / 2, w: 1, h: scene.h * 2, fixed: true });
    for (const s of scene.shelves)
        world.box({
            x: s.x + s.w / 2,
            y: s.y + s.h / 2,
            w: s.w,
            h: s.h,
            fixed: true,
            friction: 0.6,
        });
    const bell = world.box({
        x: scene.bell.x,
        y: scene.bell.y,
        w: BELL.w,
        h: BELL.h,
        sensor: true,
    });
    const of = new Map<string, Body[]>(),
        springs: Machine["springs"] = [],
        left = new Map<string, number>();
    for (const p of parts) {
        switch (p.kind) {
            case "row": {
                const row: Body[] = [];
                for (let i = 0; i < p.n; i++)
                    row.push(
                        world.box({
                            x: p.x + i * scene.gap,
                            y: p.y - DOMINO.h / 2,
                            w: DOMINO.w,
                            h: DOMINO.h,
                            density: 2,
                            friction: 0.5,
                        }),
                    );
                of.set(p.id, row);
                break;
            }
            case "ramp":
            case "long":
                of.set(p.id, [
                    world.box({
                        x: p.x,
                        y: p.y,
                        w: LENGTHS[p.kind],
                        h: 0.35,
                        angle: p.angle,
                        fixed: true,
                        friction: 0.2,
                    }),
                ]);
                break;
            case "seesaw": {
                world.poly({
                    x: p.x,
                    y: p.y,
                    points: [
                        { x: -0.9, y: 0 },
                        { x: 0.9, y: 0 },
                        { x: 0, y: -STAND + 0.2 },
                    ],
                    fixed: true,
                });
                of.set(p.id, [
                    world.box({
                        x: p.x,
                        y: p.y - STAND,
                        w: PLANK,
                        h: 0.35,
                        // it rests with its right end down, ready to be pushed up
                        angle: 0.32,
                        density: 0.6,
                        friction: 0.6,
                        hinge: { at: { x: p.x, y: p.y - STAND }, lower: -0.32, upper: 0.32 },
                    }),
                ]);
                break;
            }
            case "ball":
                of.set(p.id, [
                    world.ball({
                        x: p.x,
                        y: p.y,
                        r: BALL_R,
                        density: 2,
                        friction: 0.4,
                        restitution: 0.15,
                        fast: true,
                        damping: { turn: 0.4 },
                    }),
                ]);
                break;
            case "weight":
                of.set(p.id, [
                    world.box({
                        x: p.x,
                        y: p.y - WEIGHT / 2,
                        w: WEIGHT,
                        h: WEIGHT,
                        density: 4,
                        friction: 0.5,
                    }),
                ]);
                break;
            case "spring": {
                const body = world.box({
                    x: p.x,
                    y: p.y - SPRING.h / 2,
                    w: SPRING.w,
                    h: SPRING.h,
                    fixed: true,
                    restitution: 0.4,
                });
                springs.push({ part: p, body });
                of.set(p.id, [body]);
                break;
            }
            case "fan":
                world.box({ x: p.x, y: p.y - 1.2, w: 1.2, h: 2.4, fixed: true });
                of.set(p.id, []);
                break;
            case "bag":
                left.set(p.id, p.n);
                of.set(p.id, []);
                break;
            case "boat":
                of.set(p.id, [
                    world.box({
                        x: p.x,
                        y: p.y - BOAT.h / 2,
                        w: BOAT.w,
                        h: BOAT.h,
                        density: 0.4,
                        friction: 0,
                        damping: { move: 0.3 },
                    }),
                ]);
                break;
        }
    }
    let hoist: Machine["hoist"] = null;
    if (scene.hoist) {
        const h = scene.hoist;
        const bucket = world.compound({
            x: h.bucket.x,
            y: h.bucket.y,
            parts: [
                { box: { x: 0, y: 1, w: 2.6, h: 0.2 } },
                { box: { x: -1.2, y: 0, w: 0.2, h: 2.2 } },
                { box: { x: 1.2, y: 0, w: 0.2, h: 2.2 } },
            ],
            density: 0.3,
            friction: 0.5,
            upright: true,
        });
        // a marble is a disc of radius MARBLE_R and density 2; the weight is `heavy` of them and 0.8 more, and the bucket's own
        const marble = Math.PI * MARBLE_R * MARBLE_R * 2;
        const bucketMass = 0.3 * (2.6 * 0.2 + 2 * 0.2 * 2.2);
        const weight = world.box({
            x: h.weight.x,
            y: h.weight.y,
            w: WEIGHT,
            h: WEIGHT,
            density: (bucketMass + (h.heavy + 0.8) * marble) / (WEIGHT * WEIGHT),
            friction: 0.5,
            upright: true,
        });
        // both wheels hang well above the higher of the two, so neither reaches its wheel
        const top = Math.min(h.bucket.y, h.weight.y) - 8;
        world.pulley(bucket, weight, {
            over: { x: h.bucket.x, y: top },
            overB: { x: h.weight.x, y: top },
            at: { x: h.bucket.x, y: h.bucket.y - 1.2 },
            to: { x: h.weight.x, y: h.weight.y - WEIGHT / 2 },
        });
        hoist = { bucket, weight };
        of.set("hoist:bucket", [bucket]);
        of.set("hoist:weight", [weight]);
    }
    return {
        world,
        of,
        parts: parts.map((p) => ({ ...p })),
        scene,
        bell,
        fans: parts.filter((p) => p.kind === "fan"),
        springs,
        hoist,
        left,
        fallen: new Set(),
        rung: false,
        steps: 0,
        calm: 0,
    };
}

/** The first push: a row's first domino tipped over at its top, or a ball or a weight nudged to the right. */
export function kick(m: Machine): void {
    const id = m.scene.push;
    const body = id === null ? undefined : m.of.get(id)?.[0];
    if (!body) return;
    const at = m.world.where(body);
    const p = m.parts.find((q) => q.id === id);
    if (p?.kind === "row") m.world.launch(body, { x: 1, y: 0 }, 2.6);
    else m.world.launch(body, { x: p?.kind === "weight" ? 5 : 3, y: 0 }, 0);
    m.world.pushAt(body, { x: 1, y: 0 }, { x: at.x, y: at.y - 0.5 });
}

/** Every body that can move, for the fans and the calm test. */
function moving(m: Machine): Body[] {
    const out: Body[] = [];
    for (const [id, list] of m.of) {
        const p = m.parts.find((q) => q.id === id);
        if (p && (p.kind === "ramp" || p.kind === "long" || p.kind === "spring")) continue;
        out.push(...list);
    }
    return out;
}

/** One step of a run: the bags let go, the fans blow, the world moves, and what happened is told. */
export function stepMachine(m: Machine): MachineEvent[] {
    const out: MachineEvent[] = [];
    const world = m.world;
    m.steps++;
    for (const p of m.parts) {
        if (p.kind !== "bag") continue;
        const n = m.left.get(p.id) ?? 0;
        // a bag lets a marble go every seventh of a second, from its spout
        if (n > 0 && m.steps % 9 === 1) {
            m.left.set(p.id, n - 1);
            m.of.get(p.id)?.push(
                world.ball({
                    x: p.x,
                    y: p.y + 1.2,
                    r: MARBLE_R,
                    density: 2,
                    friction: 0.3,
                    restitution: 0.1,
                    fast: true,
                    damping: { move: 0.1, turn: 1 },
                }),
            );
        }
    }
    const all = moving(m);
    for (const fan of m.fans) {
        const mouth = fan.y - 1.2;
        for (const b of all) {
            const at = world.where(b),
                d = at.x - (fan.x + 0.6);
            if (d < 0 || d > FAN.reach || Math.abs(at.y - mouth) > FAN.band) continue;
            world.push(b, { x: FAN.push, y: 0 });
        }
    }
    world.step(DT);
    for (const h of world.hits()) {
        const spring = m.springs.find((s) => s.body === h.a || s.body === h.b);
        if (spring) {
            const other = spring.body === h.a ? h.b : h.a,
                at = world.where(other);
            if (at.y < spring.part.y - SPRING.h) {
                const v = world.velocity(other);
                world.launch(other, { x: v.x, y: -SPRING.lift });
                out.push({ kind: "boing", at: { x: at.x, y: at.y } });
                continue;
            }
        }
        if (h.speed > 2.5) {
            const at = world.where(h.a.shape === "ground" ? h.b : h.a);
            out.push({ kind: "knock", speed: h.speed, at: { x: at.x, y: at.y } });
        }
    }
    let n = m.fallen.size;
    for (const p of m.parts)
        if (p.kind === "row")
            for (const d of m.of.get(p.id) ?? [])
                if (!m.fallen.has(d) && Math.abs(world.where(d).angle) > 0.5) {
                    m.fallen.add(d);
                    out.push({ kind: "topple", n: n++ });
                }
    if (!m.rung && world.touching(m.bell).some((b) => world.moving(b, 0.2))) {
        m.rung = true;
        out.push({ kind: "ring" });
    }
    const still =
        all.every((b) => !world.moving(b, 0.05)) && [...m.left.values()].every((k) => k === 0);
    m.calm = still ? m.calm + 1 : 0;
    return out;
}

/** Whether a run is over: the bell has rung, everything has come to rest, or it has run out its time. */
export const settled = (m: Machine): boolean =>
    (m.rung && m.steps > RATE) || m.calm > RATE * 0.75 || m.steps > RATE * 20;

/** Runs a layout to its end, for a solver or a test: whether the bell rang, and on which step. */
export function trial(scene: Scene, parts: readonly Part[]): { rung: boolean; steps: number } {
    const m = machine(scene, parts);
    kick(m);
    while (!m.rung && !settled(m)) stepMachine(m);
    return { rung: m.rung, steps: m.steps };
}
