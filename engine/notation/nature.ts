// The checkers that prove a nature question for every variant from the drawing in the scene and the
// rule it is drawn by, so the picture, the question and the key cannot disagree. See .docs/tracks.md,
// "Nature".
import { num, str, type Value } from "../expr";
import {
    FIELD_UM,
    MAGNIFICATIONS,
    SPECIMENS,
    barOf,
    cellSize,
    cellsAcross,
    magnificationOf,
    type Magnification,
} from "../parts/science/microview";
import { sprouted } from "../parts/science/seedtest";
import type { Opt } from "../scene";
import type { Concrete, SceneInstance } from "./instantiate";
import type { CodeChecker } from "./verify";
import { partParams } from "./vocabulary";

type Got = { number: number } | { word: string } | { problem: string };
type Ask = (p: Record<string, unknown>, arg: string) => Got;

const node = (scene: SceneInstance, id: string | undefined): Concrete | undefined =>
    scene.nodes.find((c) => c.id === id);
const plain = (s: string): string =>
    s
        .trim()
        .toLowerCase()
        .replace(/[.!?]$/, "")
        .replace(/^(a|an|the) /, "");
const LETTERS = "ABCD";

/** The options a choice offers, or null for a node that is not a choice. */
function optionsOf(c: Concrete | undefined): Opt[] | null {
    if (c?.type !== "choice") return null;
    const x = c.v.options;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o] : []))
        : [];
}

/** A result as the answer the item's input takes: a number for a box, or the one option whose words say it. */
function bind(scene: SceneInstance, name: string, got: Got): { v: Value } | { problem: string } {
    if ("problem" in got) return got;
    const options = optionsOf(node(scene, name));
    if (options) {
        const want = "word" in got ? plain(got.word) : String(got.number);
        const hits = options.filter((o) => plain(o.label) === want || plain(o.value) === want);
        const [hit] = hits;
        if (hits.length !== 1 || !hit)
            return {
                problem: `the drawing comes to "${want}", and ${hits.length ? "more than one" : "none"} of ${name}'s options (${options.map((o) => o.label).join(", ")}) says that`,
            };
        return { v: hit.kind === "num" ? num(Number(hit.value)) : str(hit.value) };
    }
    if ("word" in got)
        return {
            problem: `${name} is a box for a number, and the drawing comes to the words "${got.word}"`,
        };
    return Number.isInteger(got.number)
        ? { v: num(got.number) }
        : { problem: `the drawing comes to ${got.number}, which is not a whole number` };
}

/** One checker over a drawing: `of` names it, and every other setting binds an answer to something it works out. */
function checker(doc: string, type: string, asks: Record<string, Ask>): CodeChecker {
    return {
        doc,
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => k !== "of"),
        solutions: (settings) => [
            `worked out for each variant from ${settings.of ?? "the drawing"}, by the rule it is drawn by`,
        ],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const c = node(scene, settings.of);
            if (!c) return { answers, problems: [`there is no ${settings.of} in the scene`] };
            if (c.type !== type)
                return {
                    answers,
                    problems: [`${settings.of} is a ${c.type}, and this checker reads ${type}`],
                };
            const p = partParams(c.type, c.v);
            for (const [name, want] of Object.entries(settings)) {
                if (name === "of") continue;
                const m = /^([a-z-]+)(?:\((.*)\))?$/.exec(want.trim());
                const [, what = "", arg = ""] = m ?? [];
                const ask = asks[what];
                if (!m || !ask) {
                    problems.push(
                        `${name}=${want} is not something this checker works out; it knows ${Object.keys(asks).join(", ")}`,
                    );
                    continue;
                }
                const got = bind(scene, name, ask(p, arg.trim()));
                if ("problem" in got) problems.push(got.problem);
                else answers[name] = got.v;
            }
            return { answers, problems };
        },
    };
}

const n = (x: unknown): number => (typeof x === "number" ? x : Number(x));
const isMagnification = (x: number): x is Magnification =>
    (MAGNIFICATIONS as readonly number[]).includes(x);

/** A count of cells that has to come out whole to be drawn and counted. */
const whole = (x: number, what: string): Got =>
    Number.isInteger(x) ? { number: x } : { problem: `${what} comes to ${x}, not a whole number` };

const CELL_ASKS: Record<string, Ask> = {
    mag: (p) => ({ number: magnificationOf(n(p.kind), n(p.mag)) }),
    field: (p) => ({ number: FIELD_UM[magnificationOf(n(p.kind), n(p.mag))] }),
    bar: (p) => ({ number: barOf(magnificationOf(n(p.kind), n(p.mag))) }),
    name: (p) => ({ word: SPECIMENS[Math.round(n(p.kind))]?.name ?? "?" }),
    across: (p, arg) => {
        if (!arg) return whole(cellsAcross(n(p.kind), n(p.mag)), "the cells across the field");
        const at = Number(arg);
        if (!isMagnification(at))
            return { problem: `across(${arg}) needs a magnification of 40, 100, 400 or 1000` };
        const long = SPECIMENS[Math.round(n(p.kind))]?.long ?? 1;
        return whole(FIELD_UM[at] / long, `the cells across the field at ×${at}`);
    },
    size: (p) => {
        const mag = magnificationOf(n(p.kind), n(p.mag));
        const across = cellsAcross(n(p.kind), mag);
        if (!Number.isInteger(across))
            return { problem: `${across} cells lie across the field, which cannot be counted` };
        return whole(cellSize(mag, across), "a cell's length");
    },
    fit: (p, arg) => {
        const um = Number(arg);
        const long = SPECIMENS[Math.round(n(p.kind))]?.long ?? 1;
        if (!(um > 0)) return { problem: `fit(${arg}) needs a length in micrometres` };
        return { number: Math.floor(um / long) };
    },
};

const CONDITIONS = ["water", "air", "warmth", "light"] as const;
type Dish = Record<(typeof CONDITIONS)[number], number>;

function dishesOf(p: Record<string, unknown>): Dish[] {
    const list = (x: unknown): number[] => (Array.isArray(x) ? x.map(n) : []);
    const [water, air, warmth, light] = CONDITIONS.map((k) => list(p[k]));
    return (water ?? []).map((w, i) => ({
        water: w,
        air: air?.[i] ?? 1,
        warmth: warmth?.[i] ?? 1,
        light: light?.[i] ?? 1,
    }));
}

/** The dish a letter names, or why there is none. */
function dishAt(p: Record<string, unknown>, arg: string): Dish | string {
    const i = LETTERS.indexOf(arg.toUpperCase());
    const d = dishesOf(p)[i];
    return d ?? `there is no dish ${arg}`;
}
const grown = (p: Record<string, unknown>, d: Dish): number =>
    sprouted(n(p.seeds), n(p.rate), d.water, d.air, d.warmth);

const SEED_ASKS: Record<string, Ask> = {
    sprouted: (p, arg) => {
        const d = dishAt(p, arg);
        return typeof d === "string" ? { problem: d } : { number: grown(p, d) };
    },
    dishes: (p) => ({ number: dishesOf(p).filter((d) => grown(p, d) > 0).length }),
    total: (p) => ({ number: dishesOf(p).reduce((sum, d) => sum + grown(p, d), 0) }),
    differ: (p, arg) => {
        const [a = "", b = ""] = arg.split(/\s+/);
        const x = dishAt(p, a),
            y = dishAt(p, b);
        if (typeof x === "string") return { problem: x };
        if (typeof y === "string") return { problem: y };
        const changed = CONDITIONS.filter((k) => x[k] !== y[k]);
        const [one] = changed;
        return changed.length === 1 && one
            ? { word: one }
            : {
                  problem: `dishes ${a} and ${b} differ in ${changed.length ? changed.join(" and ") : "nothing"}, not in one thing`,
              };
    },
    part: (_p, arg) => {
        const i = ["seed coat", "food store", "shoot", "root"].indexOf(plain(arg));
        return i < 0
            ? { problem: `part(${arg}) names seed coat, food store, shoot or root` }
            : { word: LETTERS.charAt(i) };
    },
};

export const NATURE: Record<string, CodeChecker> = {
    "nature.cells": checker(
        "Works out what the microscope view shows, from the field widths and cell sizes it is drawn from: `mag` the total magnification it is drawn at, `field` the field's width in micrometres, `bar` the scale bar's length, `name` the specimen, `across` how many cells lie end to end across the field (refused unless whole), `across(100)` how many would at another magnification, `size` a cell's length as the field's width over the cells across it, and `fit(1000)` how many whole cells fit end to end in that many micrometres.",
        "microview",
        CELL_ASKS,
    ),
    "nature.seeds": checker(
        "Works out a seed test from its dishes, by the rule the drawing sprouts them by (water, air and warmth, and light does not matter): `sprouted(B)` how many seeds dish B has sprouted, `dishes` how many dishes have any, `total` the sprouted seeds in all, and `differ(A C)` the one condition two dishes differ in (water, air, warmth or light), refused when they differ in none or in more than one. Of the bean split open, `part(food store)` is the letter of that part.",
        "seedtest",
        SEED_ASKS,
    ),
};
