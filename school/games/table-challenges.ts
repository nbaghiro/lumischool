import { configurationKey } from "../../engine/motion/configuration";
import { cornering } from "./activities";
import { bind, type Round } from "./games";
import { race, type RaceVersion } from "./race";
import { shut, SHUT, type ShutVersion } from "./shut";
import { spell, type SpellVersion } from "./spell";

const WORDS: SpellVersion[][] = [
    [
        {
            word: "ant",
            sounds: ["a", "n", "t"],
            tiles: ["a", "n", "t", "e", "m", "d"],
            picture: { art: "minibeasts", params: { kinds: ["ant"], spots: 7, legs: false } },
        },
        {
            word: "bus",
            sounds: ["b", "u", "s"],
            tiles: ["b", "u", "s", "d", "o", "ss"],
            picture: { art: "bus", params: { windows: 5, on: 3, sign: "12" } },
        },
        {
            word: "sun",
            sounds: ["s", "u", "n"],
            tiles: ["s", "u", "n", "m", "o", "ss"],
            picture: { art: "daysky", params: { night: false, phase: 0.5, clouds: 0, stars: 12 } },
        },
    ],
    [
        {
            word: "star",
            sounds: ["s", "t", "ar"],
            tiles: ["s", "t", "ar", "or", "sh", "c"],
            picture: { art: "prop.star", params: {} },
        },
        {
            word: "ball",
            sounds: ["b", "a", "ll"],
            tiles: ["b", "a", "ll", "d", "o", "s"],
            picture: { art: "prop.ball", params: {} },
        },
        {
            word: "tree",
            sounds: ["t", "r", "ee"],
            tiles: ["t", "r", "ee", "d", "ai", "s"],
            picture: { art: "tree", params: {} },
        },
    ],
    [
        {
            word: "snail",
            sounds: ["s", "n", "ai", "l"],
            tiles: ["s", "n", "ai", "l", "ee", "m"],
            picture: { art: "minibeasts", params: { kinds: ["snail"], spots: 7, legs: false } },
        },
        {
            word: "clock",
            sounds: ["c", "l", "o", "ck"],
            tiles: ["c", "l", "o", "ck", "ch", "u"],
            picture: { art: "clock", params: { h: 3, m: 0 } },
        },
        {
            word: "train",
            sounds: ["t", "r", "ai", "n"],
            tiles: ["t", "r", "ai", "n", "ay", "m"],
            picture: { art: "train", params: { carriages: 2, windows: 3, on: 4 } },
        },
    ],
];

export function spellConfigurations(phase: number): SpellVersion[] {
    return WORDS[Math.min(phase, 2)] ?? [];
}
export function raceConfigurations(phase: number): RaceVersion[] {
    const base = cornering.versions[Math.floor(phase / 2)]?.v;
    if (!base) return [];
    return [0, 1, 2, 3].map((reflection) => {
        const mirrorX = Boolean(reflection & 1),
            mirrorY = Boolean(reflection & 2);
        const rows = base.track.map((row) => (mirrorX ? row.split("").reverse().join("") : row));
        return {
            ...base,
            track: mirrorY ? rows.reverse() : rows,
            from: [
                mirrorX ? (base.track[0]?.length ?? 0) - 1 - base.from[0] : base.from[0],
                mirrorY ? base.track.length - 1 - base.from[1] : base.from[1],
            ],
            finish: phase % 2 ? "stop" : "reach",
            around: [],
        };
    });
}
export function shutConfigurations(phase: number): ShutVersion[] {
    const base = SHUT.versions[phase]?.v;
    if (!base) return [];
    return Array.from({ length: 8 }, (_, seed) => ({ ...base, seed: seed + 1 }));
}
export type TableConfiguration =
    | { kind: "race"; value: RaceVersion }
    | { kind: "shut"; value: ShutVersion }
    | { kind: "spell"; value: SpellVersion };
export function tableConfigurations(kind: string, phase: number): TableConfiguration[] {
    if (kind === "race") return raceConfigurations(phase).map((value) => ({ kind, value }));
    if (kind === "shut") return shutConfigurations(phase).map((value) => ({ kind, value }));
    if (kind === "spell") return spellConfigurations(phase).map((value) => ({ kind, value }));
    return [];
}
export function tableChallenge(seed: number, kind: string, phase: number): TableConfiguration {
    const pool = tableConfigurations(kind, phase),
        c = pool[(seed >>> 0) % pool.length];
    if (!c) throw new Error("Unknown tabletop phase");
    return c;
}
export function isTableConfiguration(
    value: unknown,
    kind: string,
    phase: number,
): value is TableConfiguration {
    return tableConfigurations(kind, phase).some(
        (v) => configurationKey(value) === configurationKey(v),
    );
}
export function openTableConfiguration(c: TableConfiguration): Round {
    switch (c.kind) {
        case "race":
            return bind(
                race,
                { ...cornering, versions: [{ v: c.value, values: configurationKey(c.value) }] },
                0,
            );
        case "shut":
            return bind(
                shut,
                { ...SHUT, versions: [{ v: c.value, values: configurationKey(c.value) }] },
                0,
            );
        case "spell":
            return bind(
                spell,
                {
                    id: "spell.picture",
                    kind: "spell",
                    title: "Spell the picture",
                    grades: [1, 3],
                    skills: [],
                    paper: "soundboxes.spell",
                    versions: [{ v: c.value, values: configurationKey(c.value) }],
                },
                0,
            );
    }
}
