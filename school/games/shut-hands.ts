// Shut the box, bound to hands.
//
// The mechanic in shut.ts is the whole game; this file is how it is played with a hand. Before a
// throw the dice are thrown: a die flicked at the felt goes the way and as hard as the hand sent it,
// and both dice fly, knock off the box's walls and each other, and tumble to rest, rolling over their
// edges through faces a real die shows beside each other. A die let go without a flick, a tap and the
// keys throw them from where they lie. What the dice show is the mechanic's fair throw, decided before
// they move: the tumble is bent towards where they land and how they lie, so no two throws look alike
// and the odds are the ones `odds` in shut.ts proves. After a throw a die is dragged
// onto a number: onto its own number it shuts it, and onto a bigger one it waits there until the
// other dice put with it make the number. Holding a die rings the numbers it can make. A drop that
// makes nothing is refused in a sentence, and a waiting die dragged back to the felt comes off.
//
// Every release resolves to a move the mechanic listed, found by the position it leads to, and a
// test checks both ways that the hand and the tray are the same moves. See .docs/games.md.
import { aimAt, aimOfPull, launchOf, type AimSpec } from "../../engine/motion/aim";
import { score, type Beat } from "../../engine/motion/beat";
import { atLeast, type Pt, type Rect } from "../../engine/motion/geometry";
import { seeded } from "../../engine/motion/spawn";
import { tumble } from "../../engine/motion/tumble";
import type { Choice, Ctx, Handle, Release, Session } from "./hands";
import type { Target } from "./pieces";
import type { Part, Scene } from "../../engine/motion/scene";
import type { Spring } from "../../engine/motion/spring";
import { easeBack, timeline } from "../../engine/motion/timeline";
import type { TurnGame, TurnLevel } from "./game";
import { DICE, SHUT, shut } from "./shut";
import { bind, type Position, type Round } from "./games";

/** The box as the position's board draws it. */
export interface ReadBox {
    count: number;
    shut: number[];
    dice: number[];
    on: number[];
    thrown: number;
    live: boolean;
}

export function readBox(pos: Position): ReadBox {
    const q = (pos.board.parts.find((p) => p.art === "shutbox")?.params ?? {}) as Partial<ReadBox>;
    return {
        count: q.count ?? 0,
        shut: q.shut ?? [],
        dice: q.dice ?? [],
        on: q.on ?? [],
        thrown: q.thrown ?? 0,
        live: pos.key.startsWith("u|"),
    };
}

const isOpen = (b: ReadBox, n: number): boolean => n >= 1 && n <= b.count && !b.shut.includes(n);

/** The number a die is waiting on, or 0: a die on a number still open. */
const waitingOn = (b: ReadBox, i: number): number => (isOpen(b, b.on[i] ?? 0) ? (b.on[i] ?? 0) : 0);

/** Each put the position lists, by the die and the number it leaves the die on, read off the position the move leads to. */
const puts = new WeakMap<Position, Map<string, number>>();
function putsOf(pos: Position): Map<string, number> {
    const had = puts.get(pos);
    if (had) return had;
    const before = readBox(pos).on;
    const out = new Map<string, number>();
    pos.moves.forEach((mv, m) => {
        if (!mv.say.startsWith("Put ")) return;
        const after = readBox(mv.next()).on;
        const i = after.findIndex((n, j) => n !== (before[j] ?? 0));
        if (i >= 0) out.set(`${i}:${after[i]}`, m);
    });
    puts.set(pos, out);
    return out;
}

/**
 * What dropping die `i` on number `n` means: the move that leaves that die on that number. The
 * mechanic lists a put per die, so two dice showing the same face are two moves and the die the hand
 * moved is the one that goes. With nothing listed, the reason in a sentence.
 */
export function putChoice(pos: Position, i: number, n: number): Choice {
    const b = readBox(pos),
        face = b.dice[i] ?? 0;
    if (!b.live) return { moves: [] };
    const m = putsOf(pos).get(`${i}:${n}`);
    if (m !== undefined) return { moves: [m] };
    if (!isOpen(b, n)) return { moves: [], refuse: `${n} is shut already.` };
    const wait = b.dice.map((_, j) => waitingOn(b, j)).find((x) => x > 0 && x !== n);
    if (wait) return { moves: [], refuse: `Finish ${wait} first, or take its dice back.` };
    return { moves: [], refuse: `The ${face} cannot make ${n}, even with the other dice.` };
}

/** What dragging a waiting die back to the felt means. */
export function backChoice(pos: Position, i: number): Choice {
    const m = pos.moves.findIndex(
        (mv) => mv.say.startsWith("Take ") && readBox(mv.next()).on[i] === 0,
    );
    return m >= 0 ? { moves: [m] } : { moves: [] };
}

/** The throw, which is the only move there is when the dice are not being used. */
export function throwChoice(pos: Position): Choice {
    const m = pos.moves.findIndex((mv) => mv.say === "Throw the dice");
    return m >= 0 ? { moves: [m] } : { moves: [] };
}

/** A die's drawing is two squares across, so its centre is one square in from its corner. */
const DIE = { half: 1 };
/** The number drawing puts its hinge this far across and down its own box. */
const HINGE = { x: 1.5, y: 3 };

/** A die's centre after a throw: the felt cut into a band per die, and a place in each from the throw's number. */
export function landing(
    tray: Rect,
    dice: number,
    thrown: number,
    i: number,
): Pt & { turn: number } {
    const r = (k: number): number => {
        const x = Math.sin((thrown + 1) * 12.9898 + (i + 1) * 78.233 + k * 37.719) * 43758.5453;
        return x - Math.floor(x);
    };
    const band = (tray.w - 3) / dice;
    return {
        x: tray.x + 1.5 + band * (i + 0.2 + r(1) * 0.6),
        y: tray.y + 1.4 + r(2) * (tray.h - 2.8),
        turn: Math.round((r(3) - 0.5) * 50),
    };
}

/**
 * A throw from a flick: as fast as the hand was going, between a gentle roll and a hard throw, in
 * squares a second. A hand let go slower than `dead` was not a flick, and the dice are thrown for it.
 */
export const THROW: AimSpec = {
    min: 6,
    max: 22,
    per: 1,
    dead: 3,
    lo: -Infinity,
    hi: Infinity,
    turn: 0,
    ramp: 0,
    turns: "across",
};

/** A throw at least this fast shakes the box. */
const HARD = 15;

/** The launch a throw has: the flick's, or, with none, one from where the dice lie towards the far end of the felt. */
export function throwFrom(hand: Release | null, start: Pt, tray: Rect, seed: number): Pt {
    if (hand && Math.hypot(hand.v.x, hand.v.y) >= THROW.dead)
        return launchOf(aimOfPull({ x: -hand.v.x, y: -hand.v.y }, THROW));
    const rnd = seeded(seed * 7919 + 3);
    const aim = {
        x: tray.x + tray.w * (0.2 + rnd() * 0.25) - start.x,
        y: tray.y + tray.h * (0.25 + rnd() * 0.5) - start.y,
    };
    return launchOf(aimAt(Math.atan2(aim.y, aim.x), 11 + rnd() * 4));
}

const partOf = (scene: Scene, key: string): Part | undefined =>
    scene.parts.find((p) => p.key === key);
const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);

/** Tumbling: the roll rocks a little past its face and back, the slide overshoots a little and settles. */
const ROLL: Spring = { hz: 1.35, zeta: 0.55 };
const SLIDE: Spring = { hz: 2.1, zeta: 0.62 };
/** A number going down on its hinge lands with a small bounce. */
const FLIP: Spring = { hz: 2.6, zeta: 0.42 };

/** A move that is not a throw: whatever moved glides to its place and a number goes down on its hinge. */
function settleBeat(was: Scene, now: Scene, hand: Release | null): Beat {
    const sc = score();
    for (const p of now.parts) {
        const key = p.key,
            q = key ? partOf(was, key) : undefined;
        if (!key || !q) continue;
        const held = hand?.key === key ? hand : null;
        const a = held ? held.at : (q.at ?? { x: 0, y: 0 }),
            b = p.at ?? { x: 0, y: 0 };
        if (Math.hypot(a.x - b.x, a.y - b.y) > 1e-6)
            sc.glide(key, 0, a, b, SLIDE, held ? held.v : undefined);
        if (held && Math.abs(held.angle - (p.angle ?? 0)) > 1e-6)
            sc.track(key, "angle", 0, held.angle, p.angle ?? 0, { spring: SLIDE, v0: 0 });
        for (const [k, v] of Object.entries(p.params)) {
            const u = q.params[k];
            if (typeof v === "number" && typeof u === "number" && Math.abs(u - v) > 1e-6)
                sc.track(key, `param:${k}`, 0, u, v, {
                    spring: k === "down" ? FLIP : ROLL,
                    v0: 0,
                });
        }
        if (key.startsWith("tile:") && num(p.params.down) === 1 && num(q.params.down) < 1)
            sc.cue(0.25, "place");
    }
    if (sc.beat().length === 0) sc.cue(0.05, "place");
    return sc.beat();
}

/** How long a die takes to come from where it lay to where the throw starts it on the felt. */
const LIFT = 0.08;
/** The longest a throw tumbles, in seconds: long enough to read as a throw, short enough not to wait for. */
const TUMBLE_MOST = 1.5;
/** A sixtieth of a second, the step the roll is read at. */
const STEP = 1 / 60;
/** Looks a die's roll steps through for each quarter turn over an edge. */
const ROLL_STEPS = 12;
/** How much bigger a die is drawn at the top of its first bounce, as a share of its size. */
const HOP = 0.22;

/**
 * A throw: both dice fly the way the hand sent them, knock off the walls and each other, and tumble
 * to rest where the mechanic's throw has them, showing its faces. It starts where each die lay, or
 * where the hand let one go, and ends exactly on the scene after the throw.
 */
function throwBeat(
    was: Scene,
    now: Scene,
    hand: Release | null,
    seed: number,
    tray: Rect,
    count: number,
): Beat {
    const sc = score();
    const keys = Array.from({ length: count }, (_, i) => `die:${i}`);
    const start = keys.map((key) => {
        const q = partOf(was, key);
        const at = hand?.key === key ? hand.at : (q?.at ?? { x: tray.x, y: tray.y });
        return { x: at.x + DIE.half, y: at.y + DIE.half };
    });
    const end = keys.map((key) => {
        const at = partOf(now, key)?.at ?? { x: tray.x, y: tray.y };
        return { x: at.x + DIE.half, y: at.y + DIE.half };
    });
    const turnWas = keys.map((key) => num(partOf(was, key)?.params.turn)),
        turnNow = keys.map((key) => num(partOf(now, key)?.params.turn));
    const held = hand ? keys.indexOf(hand.key) : -1;
    const v = throwFrom(
        hand,
        start[Math.max(0, held)] ?? start[0] ?? end[0] ?? { x: 0, y: 0 },
        tray,
        seed,
    );
    const spins = keys.map((_, i) => 2 * Math.PI * (i ? -1 : 1));
    const { frames, hits } = tumble({
        tray,
        from: start,
        to: end,
        // one whole turn more than they need, so each is seen to spin
        turnTo: turnNow.map((d, i) => ((d - (turnWas[i] ?? 0)) * Math.PI) / 180 + (spins[i] ?? 0)),
        v,
        seed,
        size: DIE.half * 2 * 0.9,
        most: TUMBLE_MOST,
    });
    const first = frames[0],
        last = frames[frames.length - 1],
        span = Math.max(1 / 60, last?.t ?? 0);
    const speed = Math.hypot(v.x, v.y);
    keys.forEach((key, i) => {
        const a = start[i] ?? { x: 0, y: 0 },
            f0 = first?.at[i] ?? a,
            was0 = turnWas[i] ?? 0,
            now0 = turnNow[i] ?? 0;
        // The turn on the table is the sprite's own angle while it tumbles, drawn by the GPU, and the
        // drawing keeps one turn, so a tumble asks for a few looks rather than one a frame.
        const angleAt = (r: number) => ((was0 - now0) * Math.PI) / 180 + r - (spins[i] ?? 0);
        sc.set(key, 0, { face: partOf(was, key)?.params.face ?? 1, turn: was0, roll: 0 });
        sc.track(key, "x", 0, a.x - DIE.half, f0.x - DIE.half, { ease: "out" }, LIFT);
        sc.track(key, "y", 0, a.y - DIE.half, f0.y - DIE.half, { ease: "out" }, LIFT);
        sc.track(key, "angle", 0, hand?.key === key ? hand.angle : 0, 0, { ease: "out" }, LIFT);
        sc.set(key, LIFT / 2, { roll: 0.25 });
        for (let k = 0; k + 1 < frames.length; k += 2) {
            const p = frames[k],
                q = frames[Math.min(k + 2, frames.length - 1)];
            if (!p || !q || q.t <= p.t) continue;
            const at = LIFT + p.t,
                dur = q.t - p.t;
            const pa = p.at[i] ?? a,
                qa = q.at[i] ?? a;
            sc.track(key, "x", at, pa.x - DIE.half, qa.x - DIE.half, { ease: "linear" }, dur);
            sc.track(key, "y", at, pa.y - DIE.half, qa.y - DIE.half, { ease: "linear" }, dur);
            sc.track(
                key,
                "angle",
                at,
                angleAt(p.angle[i] ?? 0),
                angleAt(q.angle[i] ?? 0),
                { ease: "linear" },
                dur,
            );
        }
        // it rolls over its edges through faces beside each other and comes to rest on the thrown face,
        // stepping in twelfths of a quarter turn so every look it passes through is drawn ahead
        const rolls = 6 + i * 2 + (seed % 3);
        sc.set(key, LIFT, { face: partOf(now, key)?.params.face ?? 1, turn: now0, roll: -rolls });
        let shown = -rolls;
        for (let k = 1; k * STEP < span; k++) {
            const u = (k * STEP) / span,
                r = Math.round(-rolls * (1 - u) ** 3 * ROLL_STEPS) / ROLL_STEPS;
            if (r !== shown) sc.set(key, LIFT + k * STEP, { roll: r });
            shown = r;
        }
        sc.set(key, LIFT + span, { roll: num(partOf(now, key)?.params.roll) });
        // off the felt it is nearer the eye, so it grows: a few bounces, each lower and shorter than the last
        const rnd = seeded(seed * 31 + i * 7 + 1);
        const h0 = Math.min(1.1, 0.5 + (speed / THROW.max) * 0.6) * (0.9 + rnd() * 0.2);
        const heights = [h0, h0 * 0.38, h0 * 0.14],
            times = heights.map((h) => 0.34 * Math.sqrt(h) * (1 + 0.08 * i));
        const fit = Math.min(1, (0.7 * span) / times.reduce((x, y) => x + y, 0));
        let t0 = LIFT;
        heights.forEach((h, b) => {
            const d = (times[b] ?? 0) * fit;
            const lift = (tau: number) => 1 + HOP * 4 * h * tau * (1 - tau);
            for (let j = 0; j < 6; j++)
                sc.track(
                    key,
                    "scale",
                    t0 + (d * j) / 6,
                    lift(j / 6),
                    lift((j + 1) / 6),
                    { ease: "linear" },
                    d / 6,
                );
            t0 += d;
            sc.squash(key, t0, 0.14 * h);
            sc.cue(t0, "bump", {
                strength: Math.min(1, 0.25 + h * 0.7),
                pitch: Math.round((1 - h) * 5),
            });
        });
        // and settles with a small give as it comes to rest
        sc.squash(key, LIFT + span, 0.05);
    });
    let heard = -1;
    for (const h of hits) {
        if (h.t - heard < 0.07) continue;
        heard = h.t;
        sc.cue(LIFT + h.t, "bump", { strength: Math.min(1, h.speed / 14), pitch: 3 });
        if (h.speed > 6) sc.burst(LIFT + h.t, "dust", h.at.x, h.at.y, 2);
    }
    // a hard throw jolts the box
    if (Math.hypot(v.x, v.y) >= HARD && partOf(now, "box")) {
        const jolt = hits[0]?.t ?? 0.2;
        sc.track("box", "angle", LIFT + jolt, 0, 0.012, { ease: "out" }, 0.05);
        sc.track("box", "angle", LIFT + jolt + 0.05, 0.012, 0, { spring: FLIP, v0: 0 });
    }
    sc.cue(0, "lift");
    sc.cue(LIFT + (last?.t ?? 0), "place");
    return sc.beat();
}

const TITLES = [
    "Up to 6",
    "Up to 8",
    "Up to 9, add or times",
    "Up to 9, three ways",
    "Up to 10, three ways",
];
const GRADES: [number, number][] = [
    [1, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 4],
];

export const shutLevels: TurnLevel[] = SHUT.versions.map((_, i) => ({
    title: TITLES[i] ?? `Level ${i + 1}`,
    grades: GRADES[i] ?? SHUT.grades,
    round: () => bind(shut, SHUT, i),
}));

export const shutGame: TurnGame = {
    id: "shut",
    title: "Shut the box",
    group: "hands",
    // the box is about 35 squares wide and a turn board is never cropped, so a card would draw it at 9 px a square
    card: null,
    cover: {
        art: "shutbox",
        params: { count: 9, shut: [2, 5, 7, 9], dice: [3, 6], on: [0, 0], thrown: 4, bare: false },
    },
    hint: "Flick the dice, tap them or press Space to throw, then drag a die onto a number it makes",
    levels: shutLevels,
    ends: { won: "The box is shut.", stuck: "Throw the dice again." },
    win: timeline(
        [{ name: "star", from: 0, to: 1, at: 0.7, dur: 0.4, ease: easeBack }],
        [
            { at: 0.45, cue: "level" },
            { at: 0.8, cue: "win" },
        ],
    ),
    open(_round: Round, ctx: Ctx): Session<Position> {
        const dice = DICE;

        const hinge = (n: number): Pt | null => ctx.stage.anchor("box", `hinge(${n})`);
        const tray = (): Rect | null => {
            const a = ctx.stage.anchor("box", "tray"),
                b = ctx.stage.anchor("box", "trayEnd");
            return a && b ? { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y } : null;
        };
        /** Where die `i` rests in this position, as its centre. */
        const restOf = (b: ReadBox, i: number, t: Rect): Pt => {
            const n = b.on[i] ?? 0,
                h = n ? hinge(n) : null;
            if (h) {
                const sharing = b.dice.map((_, j) => j).filter((j) => b.on[j] === n);
                const k = sharing.indexOf(i) - (sharing.length - 1) / 2;
                return {
                    x: h.x + k * 0.9,
                    y: h.y + (isOpen(b, n) ? 0.85 : 0.4) + Math.abs(k) * 0.2,
                };
            }
            if (!b.thrown) return { x: t.x + t.w - 1.6 - i * 1.9, y: t.y + t.h - 1.5 };
            return landing(t, b.dice.length, b.thrown, i);
        };
        const faceOf = (b: ReadBox, i: number): number => b.dice[i] ?? [6, 5][i] ?? 6;

        return {
            morph: { roll: ROLL, turn: ROLL, down: FLIP },
            glide: SLIDE,
            beat(from, to, { was, now, hand, seed }): Beat {
                const t = tray() ?? { x: 1.5, y: 4.8, w: 10, h: 7 };
                return readBox(to).thrown > readBox(from).thrown
                    ? throwBeat(was, now, hand, seed, t, Math.max(dice, readBox(to).dice.length))
                    : settleBeat(was, now, hand);
            },
            parts(pos) {
                const b = readBox(pos);
                const box: Part = {
                    art: "shutbox",
                    key: "box",
                    at: { x: 0, y: 0 },
                    params: { count: b.count, shut: [], dice: [], on: [], thrown: 0, bare: true },
                    z: 1,
                };
                // the box is shown first so its anchors can be read; once they can, showing it again
                // would cut short a throw that is still tumbling, so it is shown only while they cannot
                if (!ctx.stage.anchor("box", `hinge(${b.count})`))
                    ctx.stage.show({ parts: [box] }, { keep: true });
                const t = tray() ?? { x: 1.5, y: 4.8, w: 10, h: 7 };
                const parts: Part[] = [box];
                for (let n = 1; n <= b.count; n++) {
                    const h = hinge(n);
                    if (!h) continue;
                    const down = !isOpen(b, n)
                        ? 1
                        : b.on.some((_, i) => waitingOn(b, i) === n)
                          ? 0.16
                          : 0;
                    parts.push({
                        art: "shuttile",
                        key: `tile:${n}`,
                        at: { x: h.x - HINGE.x, y: h.y - HINGE.y },
                        params: { n, down },
                        z: 10,
                    });
                }
                for (let i = 0; i < Math.max(dice, b.dice.length); i++) {
                    const rest = restOf(b, i, t);
                    const turn = b.on[i]
                        ? 0
                        : b.thrown
                          ? landing(t, b.dice.length, b.thrown, i).turn
                          : 0;
                    const key = `die:${i}`;
                    parts.push({
                        art: "die",
                        key,
                        at: { x: rest.x - DIE.half, y: rest.y - DIE.half },
                        params: { face: faceOf(b, i), roll: 0, turn },
                        z: 30 + i,
                    });
                }
                return { parts };
            },
            after(pos) {
                const b = readBox(pos);
                ctx.stage.marks(
                    "waiting",
                    b.dice.flatMap((_, i) => {
                        const n = waitingOn(b, i),
                            at = n ? hinge(n) : null;
                        return at ? [{ kind: "ring" as const, x: at.x, y: at.y - 1, r: 1.25 }] : [];
                    }),
                );
                const t = tray();
                ctx.stage.marks(
                    "ready",
                    !b.live && !pos.won && t
                        ? [{ kind: "ring", x: t.x + t.w - 1.6, y: t.y + t.h - 1.5, r: 1.2 }]
                        : [],
                );
                const handles = new Set(this.handles(pos).map((h) => h.key));
                for (let i = 0; i < Math.max(dice, b.dice.length); i++)
                    ctx.stage.tag(`die:${i}`, "grab", !pos.won && handles.has(`die:${i}`));
            },
            handles(pos) {
                if (pos.won) return [];
                const b = readBox(pos);
                const t = tray();
                if (!t) return [];
                const handle = (i: number, targets: Target<Choice>[], tap?: Choice): Handle => {
                    const at = ctx.stage.at(`die:${i}`) ?? { x: 0, y: 0 };
                    const home = restOf(b, i, t);
                    return {
                        key: `die:${i}`,
                        mode: "free",
                        hit: atLeast(
                            { cx: at.x + DIE.half, cy: at.y + DIE.half, r: 0.8 },
                            ctx.minTarget(),
                        ),
                        home: { x: home.x - DIE.half, y: home.y - DIE.half },
                        targets,
                        ...(tap ? { tap } : {}),
                    };
                };
                if (!b.live) {
                    const go = throwChoice(pos);
                    return Array.from({ length: Math.max(dice, b.dice.length) }, (_, i) =>
                        handle(i, [{ id: "felt", shape: t, carries: go }], go),
                    );
                }
                const out: Handle[] = [];
                b.dice.forEach((_, i) => {
                    const n = b.on[i] ?? 0;
                    if (n && !isOpen(b, n)) return;
                    if (n) {
                        out.push(
                            handle(i, [{ id: "felt", shape: t, carries: backChoice(pos, i) }]),
                        );
                        return;
                    }
                    const targets: Target<Choice>[] = [];
                    for (let k = 1; k <= b.count; k++) {
                        const h = hinge(k);
                        if (!h) continue;
                        const face: Rect = { x: h.x - 1.2, y: h.y - 2.6, w: 2.4, h: 3 };
                        targets.push({ id: `n:${k}`, shape: face, carries: putChoice(pos, i, k) });
                    }
                    out.push(handle(i, targets));
                });
                return out;
            },
        };
    },
};
