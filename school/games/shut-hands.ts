// Shut the box, bound to hands.
//
// The mechanic in shut.ts is the whole game; this file is how it is played with a hand. Before a
// throw the dice are thrown: a die picked up and let go over the felt, flicked at it, or tapped,
// throws them all, and they tumble from where the hand let go to where they land, each die rolling
// over its edges through faces a real die shows beside each other. After a throw a die is dragged
// onto a number: onto its own number it shuts it, and onto a bigger one it waits there until the
// other dice put with it make the number. Holding a die rings the numbers it can make. A drop that
// makes nothing is refused in a sentence, and a waiting die dragged back to the felt comes off.
//
// Every release resolves to a move the mechanic listed, found by the position it leads to, and a
// test checks both ways that the hand and the tray are the same moves. See .docs/games.md.
import { atLeast, type Pt, type Rect } from "../../engine/motion/geometry";
import type { Choice, Ctx, Handle, Session } from "./hands";
import type { Target } from "./pieces";
import type { Part } from "../../engine/motion/scene";
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

/** Tumbling: the roll rocks a little past its face and back, the slide overshoots a little and settles. */
const ROLL: Spring = { hz: 1.35, zeta: 0.55 };
const SLIDE: Spring = { hz: 2.1, zeta: 0.62 };
/** A number going down on its hinge lands with a small bounce. */
const FLIP: Spring = { hz: 2.6, zeta: 0.42 };

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
        let held = -1;
        let drawn = -1;

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
            prefer(key) {
                held = Number(key.split(":")[1] ?? -1);
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
                // A new throw: each die is put where the hand let go, or where it lay, a few quarter turns
                // before its face, and spun back, so the scene below rolls it onto its face as it slides.
                const fresh = b.thrown > drawn && drawn >= 0;
                const from = held >= 0 ? ctx.stage.at(`die:${held}`) : null;
                for (let i = 0; i < Math.max(dice, b.dice.length); i++) {
                    const rest = restOf(b, i, t);
                    const turn = b.on[i]
                        ? 0
                        : b.thrown
                          ? landing(t, b.dice.length, b.thrown, i).turn
                          : 0;
                    const key = `die:${i}`;
                    if (fresh) {
                        const start = from
                            ? { x: from.x + i * 0.5, y: from.y - i * 0.35 }
                            : ctx.stage.at(key);
                        ctx.stage.show(
                            {
                                parts: [
                                    {
                                        art: "die",
                                        key,
                                        params: {
                                            face: faceOf(b, i),
                                            roll: -(7 + i * 3 + (b.thrown % 3)),
                                            turn: turn - 200 - i * 70,
                                        },
                                        z: 30 + i,
                                    },
                                ],
                            },
                            { keep: true },
                        );
                        if (start) ctx.stage.place(key, start);
                    }
                    parts.push({
                        art: "die",
                        key,
                        at: { x: rest.x - DIE.half, y: rest.y - DIE.half },
                        params: { face: faceOf(b, i), roll: 0, turn },
                        z: 30 + i,
                    });
                }
                drawn = b.thrown;
                held = -1;
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
