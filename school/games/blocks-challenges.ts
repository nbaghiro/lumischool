// The pups' variations change the number on each pup's note. The solver certifies each by driving the
// crane with a finger, block by block, until the house stands and the family moves in, and the pads
// it pressed replay to the same win, which is the game's replay witness.
import { emptyPad, type Pad } from "../../engine/motion/pad";
import {
    BLOCKS_LEVELS,
    blocksGame,
    inPile,
    startBlocks,
    type BlocksLevel,
    type BlocksState,
    type Kind,
} from "./blocks";

export interface BlocksConfiguration {
    phase: number;
    /** The number on the note: a width, a count, a height, an area or a length. */
    n: number;
}

/** The numbers each level's note may ask for, by level. */
const CHOICES: readonly (readonly number[])[] = [
    [2, 3],
    [2, 3],
    [5, 6, 7],
    [8, 9, 10, 11],
    [4, 5],
    [4, 6],
    [2, 3],
    [5, 5.5],
    [6.5, 7, 7.5, 8, 8.5],
];

const inWords = (n: number): string => (n % 1 === 0 ? String(n) : `${Math.floor(n)}½`);
const said = (n: number): string => (n % 1 === 0 ? String(n) : `${Math.floor(n)} and a half`);

/** A level with its note's number changed, and the blocks the new number needs. */
export function vary(L: BlocksLevel, n: number): BlocksLevel {
    const job = L.job;
    switch (job.kind) {
        case "room":
            return job.above
                ? {
                      ...L,
                      job: { ...job, width: n },
                      brief: [`A room ${n} squares`, "wide, 2 squares", "above the water."],
                      goal: `Build Dot a room ${n} squares wide with its floor at least 2 squares above the water.`,
                  }
                : {
                      ...L,
                      job: { ...job, width: n },
                      pile: ["cube", "cube", "cube", "cube", n > 2 ? "plank6" : "plank4", "plank3"],
                      brief: [`A room ${n} squares`, "wide, with a roof,", "for my bed."],
                      goal: `Build Dot a room ${n} squares wide, under a roof.`,
                  };
        case "rooms":
            return {
                ...L,
                job: { ...job, count: n },
                brief: [
                    `${n === 2 ? "Two" : "Three"} rooms, each`,
                    "2 squares wide,",
                    "side by side.",
                ],
                goal: `Build ${n === 2 ? "two" : "three"} rooms side by side, each 2 squares wide.`,
            };
        case "tower":
            return {
                ...L,
                job: { ...job, height: n },
                brief: ["A lookout on the", `flag, exactly ${n}`, "squares tall."],
                goal: `Build a tower exactly ${n} squares tall on the flag.`,
            };
        case "count":
            return {
                ...L,
                job: { ...job, blocks: n },
                brief: ["A room 4 squares", "wide, and use", `exactly ${n} blocks.`],
                goal: `Build a room 4 squares wide using exactly ${n} blocks.`,
            };
        case "house":
            return job.door
                ? {
                      ...L,
                      job: { ...job, height: n },
                      brief: [
                          "A room 3 squares",
                          "wide with a door,",
                          `${inWords(n)} squares to the tip.`,
                      ],
                      goal: `Build a room 3 squares wide with a door beside it, and a roof whose tip is ${said(n)} squares high.`,
                  }
                : {
                      ...L,
                      job: { ...job, height: n },
                      brief: ["A room 2 squares", `wide, ${n} squares to`, "the tip of the roof."],
                      goal: `Build Rufus a room 2 squares wide under a roof whose tip is exactly ${n} squares high.`,
                  };
        case "area":
            return {
                ...L,
                job: { ...job, area: n },
                brief: ["A room with an area", `of ${n} squares. It is`, "windy up here."],
                goal: `Build Maple a room with an area of ${n} squares that stands in a strong wind.`,
            };
        case "wall":
            return {
                ...L,
                job: { ...job, length: n },
                brief: ["A garden wall", `exactly ${inWords(n)}`, "squares long."],
                goal: `Build Rufus a garden wall exactly ${said(n)} squares long.`,
            };
    }
}

export function blocksChallenge(seed: number, phase: number): BlocksConfiguration {
    const pool = CHOICES[phase] ?? [];
    const n = pool[(seed >>> 0) % Math.max(1, pool.length)];
    if (n === undefined) throw new Error("Unknown blocks level");
    return { phase, n };
}

export function isBlocksConfiguration(value: unknown, phase: number): value is BlocksConfiguration {
    if (!value || typeof value !== "object" || !("phase" in value) || !("n" in value)) return false;
    const n = value.n;
    return value.phase === phase && typeof n === "number" && (CHOICES[phase] ?? []).includes(n);
}

export function openBlocksConfiguration(c: BlocksConfiguration): BlocksState {
    const L = BLOCKS_LEVELS[c.phase] ?? BLOCKS_LEVELS[0];
    return startBlocks(vary(L, c.n), c.phase);
}

/** One block for the crane to drop: which kind, its middle across, and whether it hangs on its side. */
export interface Drop {
    kind: Kind;
    x: number;
    turned?: boolean;
}

const stack = (kind: Kind, x: number, n: number, turned = false): Drop[] =>
    Array.from({ length: n }, () => ({ kind, x, turned }));

/** A way to build a level's house, block by block. */
export function planFor(L: BlocksLevel): Drop[] {
    const job = L.job,
        c = (L.site.a + L.site.b) / 2;
    switch (job.kind) {
        case "room": {
            const l = c - job.width / 2 - 0.5,
                r = c + job.width / 2 + 0.5,
                roof: Kind = job.width > 2 ? "plank6" : "plank4";
            if (job.above)
                return [
                    ...stack("brick", l, 2, true),
                    ...stack("brick", r, 2, true),
                    { kind: "plank6", x: c },
                    ...stack("cube", l, 2),
                    ...stack("cube", r, 2),
                    { kind: "plank6", x: c },
                ];
            return [...stack("cube", l, 2), ...stack("cube", r, 2), { kind: roof, x: c }];
        }
        case "rooms": {
            const first = L.site.a + 2;
            const arches: Drop[] = [
                { kind: "arch", x: first },
                { kind: "arch", x: first + 4 },
            ];
            return job.count > 2
                ? [...arches, ...stack("cube", first + 8.5, 3), { kind: "plank4", x: first + 7 }]
                : arches;
        }
        case "tower": {
            const bricks = Math.min(3, Math.floor(job.height / 2));
            return [
                ...stack("brick", job.at, bricks, true),
                ...stack("cube", job.at, job.height - 2 * bricks),
            ];
        }
        case "count": {
            const on = job.blocks - 5;
            return [
                ...stack("cube", c - 2.5, 2),
                ...stack("cube", c + 2.5, 2),
                { kind: "plank6", x: c },
                ...Array.from({ length: on }, (_, j): Drop => ({
                    kind: "cube",
                    x: c - (on - 1) / 2 + j,
                })),
            ];
        }
        case "house":
            // the frame and the other wall are 3 squares tall, and the roof 2, with a plank between when the tip is higher
            return job.door
                ? [
                      { kind: "frame", x: c - 2.5 },
                      { kind: "brick", x: c + 2, turned: true },
                      { kind: "cube", x: c + 2 },
                      ...(job.height > 5 ? [{ kind: "plank6" as const, x: c - 0.5 }] : []),
                      { kind: "roof6", x: c - 0.5 },
                  ]
                : [
                      ...stack("cube", c - 1.5, job.height - 2),
                      ...stack("cube", c + 1.5, job.height - 2),
                      { kind: "roof", x: c },
                  ];
        case "area":
            return [
                ...stack("brick", c - 2, job.area / 2),
                ...stack("brick", c + 2, job.area / 2),
                { kind: "plank6", x: c },
            ];
        case "wall": {
            const out: Drop[] = [];
            const left: Record<"brick" | "cube" | "half", number> = {
                brick: L.pile.filter((k) => k === "brick").length,
                cube: L.pile.filter((k) => k === "cube").length,
                half: L.pile.filter((k) => k === "half").length,
            };
            let x = L.site.a + 2,
                rest = job.length;
            // the smallest pieces first, at the end the wolf blows from, so the wall holds them up
            const need: Record<"brick" | "cube" | "half", number> = { brick: 0, cube: 0, half: 0 };
            for (const [kind, w] of [
                ["brick", 2],
                ["cube", 1],
                ["half", 0.5],
            ] as const)
                while (rest >= w - 1e-9 && left[kind] > 0) {
                    need[kind]++;
                    rest -= w;
                    left[kind]--;
                }
            for (const [kind, w] of [
                ["half", 0.5],
                ["cube", 1],
                ["brick", 2],
            ] as const)
                for (; need[kind] > 0; need[kind]--) {
                    out.push({ kind, x: x + w / 2 });
                    x += w;
                }
            return out;
        }
    }
}

const copyPad = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** Steps a pad sequence on a state, and says whether the state was won by its end. */
export function replay(s: BlocksState, pads: readonly Pad[]): boolean {
    for (const p of pads) blocksGame.step(s, copyPad(p));
    return s.won;
}

/** How a way drives the crane: a finger held over the site, or the arrow keys and space. */
export type By = "touch" | "keys";

/**
 * Builds a plan by driving the crane, and returns the pads it pressed when the family moved in, or
 * null when the house did not stand. Each block is chosen, turned if the plan says, carried over its
 * place, held until its swing dies away, and dropped.
 */
export function build(s: BlocksState, plan: readonly Drop[], by: By = "touch"): Pad[] | null {
    const pads: Pad[] = [];
    const run = (p: Pad): void => {
        pads.push(copyPad(p));
        blocksGame.step(s, copyPad(p));
    };
    const idle = (n: number, until: () => boolean): void => {
        for (let k = 0; k < n && !until(); k++) run(emptyPad());
    };
    for (const d of plan) {
        if (s.phase !== "build") return null;
        idle(120, () => s.crane.fetch <= 0 && s.crane.load !== null);
        const want = [s.crane.load ?? -1, ...inPile(s)].find(
            (i) => i >= 0 && s.blocks[i]?.kind === d.kind && !s.blocks[i]?.body,
        );
        if (want === undefined) return null;
        for (let k = 0; k < 40 && s.crane.load !== want; k++)
            run({ ...emptyPad(), pressed: ["down"] });
        if (s.crane.load !== want) return null;
        if (Boolean(d.turned) !== s.crane.turned) {
            run({ ...emptyPad(), brake: true });
            run(emptyPad());
        }
        const still = (): boolean =>
            Math.abs(s.crane.x - d.x) < 0.01 &&
            Math.abs(s.crane.v) < 0.02 &&
            Math.abs(s.crane.angle) < 0.003 &&
            Math.abs(s.crane.spin) < 0.01;
        if (by === "touch") {
            for (let k = 0; k < 900 && (k < 20 || !still()); k++)
                run({ ...emptyPad(), touch: { x: d.x, y: 3 } });
            run({ ...emptyPad(), lifted: { x: d.x, y: 3 } });
        } else {
            for (let tries = 0; tries < 40 && !still(); tries++) {
                const gap = d.x - s.crane.x,
                    dir = gap > 0 ? ("right" as const) : ("left" as const);
                // hold the key for about as long as the gap wants, then let the swing die away
                const hold = Math.max(1, Math.min(60, Math.round(Math.sqrt(Math.abs(gap)) * 9)));
                if (Math.abs(gap) >= 0.01) {
                    run({ ...emptyPad(), pressed: [dir], holding: [dir], held: dir });
                    for (let k = 1; k < hold; k++)
                        run({ ...emptyPad(), holding: [dir], held: dir });
                }
                idle(
                    400,
                    () =>
                        Math.abs(s.crane.v) < 0.005 &&
                        Math.abs(s.crane.spin) < 0.01 &&
                        Math.abs(s.crane.angle) < 0.003,
                );
            }
            run({ ...emptyPad(), tapped: true, go: true });
        }
        idle(600, () => s.phase !== "build" || (!s.changed && s.calm >= 20));
    }
    idle(1800, () => s.won);
    return s.won ? pads : null;
}

/** Whether each variation has been built, by level and number: there are only a few, and building one is the same every time. */
const built = new Map<string, boolean>();

/** Whether a variation's plan stands to the wolf, building it once. */
export function blocksCertified(c: BlocksConfiguration): boolean {
    const key = `${c.phase}:${c.n}`;
    const known = built.get(key);
    if (known !== undefined) return known;
    const ok = blocksWay(c) !== null;
    built.set(key, ok);
    return ok;
}

/** A way through a variation, or null when the plan does not stand. */
export function blocksWay(c: BlocksConfiguration, by: By = "touch"): Pad[] | null {
    const s = openBlocksConfiguration(c);
    return build(s, planFor(s.L), by);
}
