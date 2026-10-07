// The variations of Treasure island, and a treasure hunter that plays each one to its end through the
// real game: by the keys, walking Charlie with held arrows and pressing the Action, and by a finger,
// tapping where she should go, tapping her to dig and tapping what she digs up. It fetches the spade,
// ties and walks the rope where a clue measures, walks to where each clue starts, and digs where the
// clue ends. A variation a child is given has been played to the end this way in the tests.
import { middleOf, nameOf, type Leg, type Point, type Square } from "../../engine/motion/compass";
import type { Pt } from "../../engine/motion/geometry";
import { emptyPad, type Dir, type Pad } from "../../engine/motion/pad";
import { blockedAt, route } from "../../engine/motion/roam";
import { GRID, SPOTS } from "../../engine/parts/outdoors/islandground";
import {
    LANDMARK_NAME,
    LANDMARK_SQUARE,
    TREASURE_LEVELS,
    diggable,
    gaitOf,
    measureOf,
    placeOf,
    startTreasure,
    targetOf,
    treasureGame,
    type Clue,
    type Landmark,
    type TreasureLevel,
    type TreasureState,
} from "./treasure";

export interface TreasureConfiguration {
    phase: number;
    variant: number;
}

export const TREASURE_VARIANTS = 3;

const legs = (...ls: [number, Point][]): Leg[] => ls.map(([n, point]) => ({ n, point }));

/** Each level's clues in its three variations, the first as the level is written. */
const CLUES: Partial<Record<number, Clue[][]>> = {
    0: [
        [{ kind: "walk", from: "palm", legs: legs([3, "north"], [4, "east"]) }],
        [{ kind: "walk", from: "palm", legs: legs([2, "north"], [5, "east"]) }],
        [{ kind: "walk", from: "rock", legs: legs([4, "north"], [3, "west"]) }],
    ],
    1: [
        [{ kind: "walk", from: "cave", legs: legs([4, "west"], [3, "north"]) }],
        [{ kind: "walk", from: "cave", legs: legs([3, "west"], [4, "north"]) }],
        [{ kind: "walk", from: "palm", legs: legs([2, "west"], [4, "north"]) }],
    ],
    2: [
        [{ kind: "at", square: "G7" }],
        [{ kind: "at", square: "K3" }],
        [{ kind: "at", square: "D9" }],
    ],
    3: [
        [
            { kind: "at", square: "C8" },
            { kind: "here", legs: legs([3, "north"], [5, "east"]) },
        ],
        [
            { kind: "at", square: "E2" },
            { kind: "here", legs: legs([4, "south"], [3, "east"]) },
        ],
        [
            { kind: "at", square: "K8" },
            { kind: "here", legs: legs([2, "north"], [6, "west"]) },
        ],
    ],
    4: [
        [{ kind: "walk", from: "lighthouse", legs: legs([4, "south-west"]) }],
        [{ kind: "walk", from: "palm", legs: legs([3, "north-west"]) }],
        [{ kind: "walk", from: "parrot", legs: legs([3, "north-west"]) }],
    ],
    5: [
        [{ kind: "measure", a: "palm", b: "rock", from: "parrot", point: "north" }],
        [{ kind: "measure", a: "palm", b: "rock", from: "parrot", point: "west" }],
        [{ kind: "measure", a: "rock", b: "palm", from: "wreck", point: "east" }],
    ],
    6: [
        [
            { kind: "at", square: "H8" },
            { kind: "here", legs: legs([3, "north"], [2, "west"]) },
            { kind: "walk", from: "parrot", legs: legs([5, "north-west"]) },
        ],
        [
            { kind: "at", square: "B8" },
            { kind: "here", legs: legs([3, "north"], [5, "east"]) },
            { kind: "walk", from: "lighthouse", legs: legs([2, "south-west"]) },
        ],
        [
            { kind: "at", square: "L7" },
            { kind: "here", legs: legs([3, "north"], [3, "west"]) },
            { kind: "walk", from: "wreck", legs: legs([4, "north-east"]) },
        ],
    ],
    7: [
        [{ kind: "walk", from: "cave", legs: legs([2, "south"], [5, "east"]) }],
        [{ kind: "walk", from: "palm", legs: legs([3, "north"], [4, "east"]) }],
        [{ kind: "walk", from: "wreck", legs: legs([2, "south"], [6, "east"]) }],
    ],
    8: [
        [
            { kind: "at", square: "B2" },
            { kind: "at", square: "H5" },
            { kind: "at", square: "E8" },
        ],
        [
            { kind: "at", square: "A4" },
            { kind: "at", square: "J2" },
            { kind: "at", square: "F9" },
        ],
        [
            { kind: "at", square: "C1" },
            { kind: "at", square: "K6" },
            { kind: "at", square: "D3" },
        ],
    ],
};

const NUMBER = ["nought", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const legWords = (l: Leg) => `${l.n} ${l.n === 1 ? "square" : "squares"} ${l.point}`;
const legsWords = (ls: readonly Leg[]) => ls.map(legWords).join(" and ");

/** The two plain points a diagonal is between: south-west is south and west. */
const between = (p: Point): [string, string] => {
    const [a = p, b = p] = p.split("-");
    return [a, b];
};

/** A level's words written for its clues. */
function wordsFor(
    L: TreasureLevel,
    phase: number,
    clues: Clue[],
): Pick<TreasureLevel, "title" | "goal" | "prompt"> {
    const first = clues[0];
    const name = (l: Landmark) => LANDMARK_NAME[l];
    if (!first) return L;
    switch (phase) {
        case 0:
            if (first.kind !== "walk") return L;
            return {
                title: cap(first.legs.map((l) => `${NUMBER[l.n] ?? l.n} ${l.point}`).join(", ")),
                goal: `Fetch the spade, then start at ${name(first.from)}, walk ${legsWords(first.legs)}, and dig.`,
                prompt: L.prompt,
            };
        case 1:
            if (first.kind !== "walk") return L;
            return {
                title: L.title,
                goal: `Start at ${name(first.from)}, walk ${legsWords(first.legs)}, and dig. The pond is in the way, so go round it and keep counting.`,
                prompt: `Walk to ${name(first.from)} first. That is where the counting starts.`,
            };
        case 2:
            if (first.kind !== "at") return L;
            return {
                title: `Dig at ${first.square}`,
                goal: `Find square ${first.square}, its letter along the top of the map and its number down the side, and dig there.`,
                prompt: L.prompt,
            };
        case 3:
            if (first.kind !== "at") return L;
            return {
                title: L.title,
                goal: `Dig at ${first.square}. What you dig up says where to dig next.`,
                prompt: `Find ${first.square} and dig. Something there tells you where to go next.`,
            };
        case 4: {
            if (first.kind !== "walk") return L;
            const l = first.legs[0] ?? { n: 0, point: "north" };
            const [a, b] = between(l.point);
            return {
                title: L.title,
                goal: `From ${name(first.from)}, walk ${legWords(l)}, one square ${a} and one ${b} at every step, and dig.`,
                prompt: `${cap(l.point)} is between ${a} and ${b}. The compass at your feet shows the way.`,
            };
        }
        case 5:
            if (first.kind !== "measure") return L;
            return {
                title: L.title,
                goal: `Tie the rope at ${name(first.a)} and walk it to ${name(first.b)} to measure how far it is. The treasure is that far ${first.point} of ${name(first.from)}.`,
                prompt: `Tie the rope to ${name(first.a)}, then walk to ${name(first.b)} and count the knots.`,
            };
        case 6:
            if (first.kind !== "at") return L;
            return {
                title: L.title,
                goal: `Dig at ${first.square}, then follow each bottle's clue to the next, until you find the chest.`,
                prompt: `Dig at ${first.square}. Every bottle says where the next clue is.`,
            };
        case 7:
            if (first.kind !== "walk") return L;
            return {
                title: L.title,
                goal: `The treasure is ${legsWords(first.legs)} of ${name(first.from)}. Work out where that is and walk there the shortest way.`,
                prompt: L.prompt,
            };
        case 8: {
            const names = clues.flatMap((c) => (c.kind === "at" ? [c.square] : []));
            return {
                title: L.title,
                goal: `Three chests are buried at ${names.slice(0, -1).join(", ")} and ${names[names.length - 1] ?? ""}. Dig them all up, in any order.`,
                prompt: L.prompt,
            };
        }
        default:
            return L;
    }
}

/** A level as one of its variations lays it out, with its words to match. */
export function vary(L: TreasureLevel, phase: number, variant: number): TreasureLevel {
    const v = ((variant % TREASURE_VARIANTS) + TREASURE_VARIANTS) % TREASURE_VARIANTS;
    const clues = CLUES[phase]?.[v];
    if (!clues || v === 0) return L;
    return { ...L, ...wordsFor(L, phase, clues), clues };
}

export function treasureChallenge(seed: number, phase: number): TreasureConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < TREASURE_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % TREASURE_VARIANTS };
}

export function isTreasureConfiguration(v: unknown, phase: number): v is TreasureConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < TREASURE_VARIANTS &&
        TREASURE_LEVELS[phase] !== undefined
    );
}

export const levelFor = (c: TreasureConfiguration): TreasureLevel => {
    const L = TREASURE_LEVELS[c.phase] ?? TREASURE_LEVELS[0];
    return vary(L, c.phase, c.variant);
};

export function openTreasureConfiguration(c: TreasureConfiguration): TreasureState {
    return startTreasure(levelFor(c), c.phase, c.variant + 1);
}

/** Every square a configuration's clues lead to, in order, each dug up from the one before. */
export function targetsOf(L: TreasureLevel): (Square | null)[] {
    const out: (Square | null)[] = [];
    let last: Square | null = null;
    for (const clue of L.clues) {
        const to = targetOf(clue, L.order === "chain" ? last : null);
        out.push(to);
        last = to;
    }
    return out;
}

/** Whether each clue leads to a square on the island that can be stood by and dug; the tests play each through. */
export function treasureCertified(c: TreasureConfiguration): boolean {
    const L = levelFor(c);
    if (L.free) return true;
    return targetsOf(L).every((q) => q !== null && diggable(q));
}

export type Act = { pad: Pad } | { command: string };

const copy = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** The most steps the hunter is given for one errand: a walk, a dig or a wait. */
const CAP = 60 * 25;

/** The arrows that point from `a` towards `b`, one or two of them, as a child holding them would. */
function arrows(a: Pt, b: Pt): Dir[] {
    const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy);
    if (d < 1e-6) return [];
    const out: Dir[] = [];
    if (Math.abs(dx) > 0.38 * d) out.push(dx > 0 ? "right" : "left");
    if (Math.abs(dy) > 0.38 * d) out.push(dy > 0 ? "down" : "up");
    return out;
}

/** A place to stand inside a square, as near its middle as the island allows. */
function standIn(q: Square, near?: Pt): Pt {
    const m = middleOf(GRID, q);
    const place = placeOf(),
        r = gaitOf().radius;
    const spots: Pt[] = [];
    for (const dy of [0.9, 0, -0.9, 1.2, -1.2])
        for (const dx of [0, -0.9, 0.9, -1.2, 1.2]) spots.push({ x: m.x + dx, y: m.y + dy });
    const free = spots.filter((p) => !blockedAt(place, p, r));
    if (near)
        free.sort(
            (a, b) =>
                Math.hypot(a.x - near.x, a.y - near.y) - Math.hypot(b.x - near.x, b.y - near.y),
        );
    return free[0] ?? m;
}

/**
 * Plays a configuration through the game by `hands`, giving back the acts that did it, or null where
 * they did not find everything. The keys walk Charlie with held arrows and press the Action; a finger
 * taps where she should go, taps her to do the Action and taps what she has dug up.
 */
export function solve(c: TreasureConfiguration, hands: "touch" | "keys"): Act[] | null {
    const s = openTreasureConfiguration(c);
    const L = s.L;
    const acts: Act[] = [];
    const run = (more: Partial<Pad> = {}): void => {
        const pad = { ...emptyPad(), ...more };
        acts.push({ pad: copy(pad) });
        treasureGame.step(s, pad);
    };
    const command = (id: string): void => {
        acts.push({ command: id });
        treasureGame.command?.(s, id);
    };
    let stuck = false;
    const until = (done: () => boolean, pad: Partial<Pad> = {}): void => {
        for (let i = 0; i < CAP && !done(); i++) run(pad);
        if (!done()) stuck = true;
    };
    const settle = () =>
        until(
            () =>
                Math.hypot(s.me.vx, s.me.vy) < 0.01 &&
                !s.errand &&
                !s.me.route.length &&
                !s.digging,
        );

    const walk = (to: Pt, near = 0.35): void => {
        const way = route(placeOf(), s.me, to, gaitOf().radius) ?? [to];
        for (let i = 0; i < CAP; i++) {
            if (Math.hypot(to.x - s.me.x, to.y - s.me.y) <= near) break;
            while (way.length > 1) {
                const w = way[0];
                if (!w || Math.hypot(w.x - s.me.x, w.y - s.me.y) > 0.5) break;
                way.shift();
            }
            const held = arrows(s.me, way[0] ?? to);
            if (!held.length) break;
            run({ holding: held, held: held[held.length - 1] ?? null });
        }
        until(() => Math.hypot(s.me.vx, s.me.vy) < 0.01);
    };
    const press = (): void => {
        run({ go: true, tapped: true });
        run();
    };
    const tap = (p: Pt): void => {
        run({ touch: p, view: { x: 10, y: 10 } });
        run({ lifted: p, view: { x: 10, y: 10 } });
        settle();
    };
    const tapHer = (): void => tap({ x: s.me.x, y: s.me.y - 1.3 });
    /** Up to a square and into it, by the hands in use. */
    const goTo = (q: Square, near?: Pt): void => {
        const at = standIn(q, near);
        if (hands === "touch") tap(at);
        else walk(at);
    };
    const holding = (tool: "spade" | "rope"): void => {
        for (let k = 0; k < 3 && s.hand !== tool; k++) command("bag");
        if (s.hand !== tool) stuck = true;
    };
    const digHere = (): void => {
        if (hands === "touch") tapHer();
        else press();
        until(() => !s.digging);
        settle();
    };
    const openIt = (): void => {
        const d = s.dug[s.dug.length - 1];
        if (!d || d.open || (d.what !== "chest" && d.what !== "bottle")) return;
        if (hands === "touch") tap(middleOf(GRID, d));
        else press();
        run();
    };

    if (s.spadeAt) {
        const at = s.spadeAt;
        if (hands === "touch") tap({ x: at.x, y: at.y - 0.8 });
        else {
            walk({ x: at.x - 1.2, y: at.y }, 0.4);
            press();
        }
        if (s.hand !== "spade") return null;
    }

    for (let i = 0; i < L.clues.length; i++) {
        const clue = s.L.clues[i];
        if (!clue) return null;
        if (clue.kind === "measure") {
            holding("rope");
            const a = SPOTS[clue.a];
            // a finger on the landmark with the rope in hand ties it there; the keys walk up and press
            if (hands === "touch") tap({ x: a.x, y: a.y - 0.5 });
            else {
                goTo(LANDMARK_SQUARE[clue.a], a);
                press();
            }
            if (s.rope?.from !== clue.a) return null;
            goTo(LANDMARK_SQUARE[clue.b], SPOTS[clue.b]);
            if (!s.measured || s.measured.n !== measureOf(clue.a, clue.b)) return null;
            holding("spade");
        }
        if (clue.kind === "walk" && !L.shortest) goTo(LANDMARK_SQUARE[clue.from], SPOTS[clue.from]);
        if (clue.kind === "measure") goTo(LANDMARK_SQUARE[clue.from], SPOTS[clue.from]);
        const to = targetOf(clue, s.lastDug);
        if (!to) return null;
        holding("spade");
        goTo(to);
        digHere();
        openIt();
        if (stuck || (!L.free && !s.found[i])) return null;
    }
    if (L.free) {
        // the free island gives a new map once its three are found
        return s.round > 0 ? acts : null;
    }
    return s.won ? acts : null;
}

/** Plays acts into a fresh start of a configuration. */
export function replay(c: TreasureConfiguration, acts: readonly Act[]): TreasureState {
    const s = openTreasureConfiguration(c);
    for (const act of acts) {
        if ("pad" in act) treasureGame.step(s, copy(act.pad));
        else treasureGame.command?.(s, act.command);
    }
    return s;
}

/** The squares of a level's clues by name, for the tests and the words. */
export const squaresOf = (L: TreasureLevel): string[] =>
    targetsOf(L).map((q) => (q ? nameOf(q) : "?"));
