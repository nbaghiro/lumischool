// The checkers that prove a chemistry question for every variant, from the drawing in the scene and
// the table the drawing is drawn from: what a thing is made of and what it is like, whether a change
// can be undone, what state something is in, what an indicator's colour says, which way separates a
// mixture, what a rock does, and how many atoms a model holds. An answer the item states has to
// agree with the checker, and one it does not state is taken from it. See .docs/chemistry.md,
// "The checkers".
import { num, str, type Value } from "../expr";
import {
    CHANGES,
    CYCLE,
    FOSSIL_STEPS,
    LIQUIDS,
    MIXABLES,
    MOLECULES,
    OBJECTS,
    PROPERTIES,
    ROCKS,
    RUST,
    SAFETY,
    SHAPES,
    atomsIn,
    bandOf,
    iceLeft,
    kindOfBand,
    passes,
    rustOf,
    type Property,
} from "../parts/science/substances";
import type { Opt } from "../scene";
import type { Concrete, SceneInstance } from "./instantiate";
import type { CodeChecker } from "./verify";
import { partParams } from "./vocabulary";

const node = (scene: SceneInstance, id: string | undefined): Concrete | undefined =>
    scene.nodes.find((c) => c.id === id);
const paramsOf = (c: Concrete): Record<string, unknown> => partParams(c.type, c.v);
const n = (x: unknown): number => (typeof x === "number" ? x : Number(x));
const words = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);
const plain = (s: string): string =>
    s
        .trim()
        .toLowerCase()
        .replace(/[.!?]$/, "")
        .replace(/^(a|an|the) /, "");
const LETTERS = "ABCDEFGH";
/** The index a letter in brackets names, such as `made(B)`, or -1. */
const at = (arg: string): number => LETTERS.indexOf(arg.trim().toUpperCase());
/** The letter of the thing at an index. */
const letter = (i: number): string => LETTERS.charAt(i) || "?";
/** The options a choice offers, or null for a node that is not a choice. */
const optionsOf = (c: Concrete | undefined): Opt[] | null => {
    if (c?.type !== "choice") return null;
    const x = c.v.options;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o] : []))
        : [];
};
/** The labels a table's cells hold, row by row. */
const cellsOf = (t: Concrete): string[] => {
    const x = t.v.cells;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o.label] : []))
        : [];
};

type Got = { number: number } | { word: string } | { problem: string };

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

type Ask = (
    p: Record<string, unknown>,
    c: Concrete,
    scene: SceneInstance,
    arg: string,
    vs: Concrete | undefined,
    settings: Record<string, string>,
) => Got;
const NOT_ANSWERS = ["of", "vs", "temp", "table"];

/** One checker from a table of quantities: `of` names the drawing, `vs` a second one, and every other setting binds an answer. */
function checker(doc: string, types: readonly string[], asks: Record<string, Ask>): CodeChecker {
    return {
        doc,
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => !NOT_ANSWERS.includes(k)),
        solutions: (settings) => [
            `worked out for each variant from ${settings.of ?? "the drawing"}, by the table the drawing is drawn from`,
        ],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const c = node(scene, settings.of);
            if (!c) return { answers, problems: [`there is no ${settings.of} in the scene`] };
            if (!types.includes(c.type))
                return {
                    answers,
                    problems: [
                        `${settings.of} is a ${c.type}, and this checker reads ${types.join(", ")}`,
                    ],
                };
            const vs = settings.vs ? node(scene, settings.vs) : undefined;
            if (settings.vs && !vs)
                return {
                    answers,
                    problems: [`there is no ${settings.vs} in the scene to compare with`],
                };
            if (vs && !types.includes(vs.type))
                return {
                    answers,
                    problems: [
                        `${settings.vs} is a ${vs.type}, and this checker reads ${types.join(", ")}`,
                    ],
                };
            if (settings.table) problems.push(...tableFacts(scene, settings.table));
            else if (c.type === "table") problems.push(...tableFacts(scene, c.id));
            for (const [name, want] of Object.entries(settings)) {
                if (NOT_ANSWERS.includes(name)) continue;
                const m = /^([a-z-]+)(?:\((.*)\))?$/.exec(want.trim());
                const [, what = "", arg = ""] = m ?? [];
                const ask = asks[what];
                if (!m || !ask) {
                    problems.push(
                        `${name}=${want} is not something this checker works out; it knows ${Object.keys(asks).join(", ")}`,
                    );
                    continue;
                }
                const got = bind(scene, name, ask(paramsOf(c), c, scene, arg, vs, settings));
                if ("problem" in got) problems.push(got.problem);
                else answers[name] = got.v;
            }
            return { answers, problems };
        },
    };
}

/** The one letter among `list` for which `test` holds, or why "which one" has no single answer. */
function onlyOne(list: string[], test: (k: string) => boolean | null, what: string): Got {
    const unknown = list.filter((k) => test(k) === null);
    if (unknown.length)
        return {
            problem: `the table does not say whether ${unknown.join(", ")} ${what}, so it cannot be in this question`,
        };
    const hits = list.map((k, i) => (test(k) ? i : -1)).filter((i) => i >= 0);
    const [hit] = hits;
    return hits.length === 1 && hit !== undefined
        ? { word: letter(hit) }
        : { problem: `${hits.length} of them ${what}, so "which one" has ${hits.length} answers` };
}
function countOf(list: string[], test: (k: string) => boolean | null, what: string): Got {
    const unknown = list.filter((k) => test(k) === null);
    if (unknown.length)
        return {
            problem: `the table does not say whether ${unknown.join(", ")} ${what}, so it cannot be counted`,
        };
    return { number: list.filter((k) => test(k)).length };
}

const isProperty = (s: string): s is Property => (PROPERTIES as readonly string[]).includes(s);

/** Whether a thing has a property, read as `hard` or `not-hard`, or null where the table does not say. */
function thingHas(kind: string, prop: string): boolean | null {
    const not = prop.startsWith("not-");
    const name = not ? prop.slice(4) : prop;
    if (!isProperty(name)) return null;
    const v = OBJECTS[kind]?.is[name];
    return v === undefined ? null : v !== not;
}

/**
 * Whether a thing meets every clue in a list such as "not-made-metal waterproof not-see-through":
 * `made-wood` and `not-made-wood` are about its material and the rest are properties. Null where a
 * clue asks something the table leaves open.
 */
function clues(list: string, kind: string): boolean | null {
    let unknown = false;
    for (const clue of list.split(/\s+/).filter(Boolean)) {
        const not = clue.startsWith("not-");
        const bare = not ? clue.slice(4) : clue;
        const has = bare.startsWith("made-")
            ? OBJECTS[kind]?.made === bare.slice(5)
            : thingHas(kind, bare);
        if (has === null) unknown = true;
        else if ((not ? !has : has) === false) return false;
    }
    // a thing that fails a clue the table settles is out, whatever it does not settle
    return unknown ? null : true;
}

const MATERIAL_ASKS: Record<string, Ask> = {
    count: (p, c, _s, arg) =>
        c.type === "materials"
            ? countOf(words(p.things), (k) => thingHas(k, arg), arg)
            : { problem: "count is asked of a materials drawing" },
    only: (p, c, _s, arg) =>
        c.type === "materials"
            ? onlyOne(words(p.things), (k) => thingHas(k, arg), `are ${arg}`)
            : { problem: "only is asked of a materials drawing" },
    made: (p, c, _s, arg) => {
        if (c.type !== "materials") return { problem: "made is asked of a materials drawing" };
        const k = words(p.things)[at(arg)];
        const thing = k === undefined ? undefined : OBJECTS[k];
        return thing ? { word: thing.made } : { problem: `there is no thing ${arg} in the row` };
    },
    same: (p, c, _s, arg) => {
        if (c.type !== "materials") return { problem: "same is asked of a materials drawing" };
        const list = words(p.things);
        const i = at(arg);
        const made = OBJECTS[list[i] ?? ""]?.made;
        if (!made) return { problem: `there is no thing ${arg} in the row` };
        return onlyOne(
            list.map((k, j) => (j === i ? "" : k)),
            (k) => (k ? OBJECTS[k]?.made === made : false),
            `are made of ${made} like ${arg}`,
        );
    },
    odd: (p, c) => {
        if (c.type !== "materials") return { problem: "odd is asked of a materials drawing" };
        const list = words(p.things);
        const made = list.map((k) => OBJECTS[k]?.made ?? "");
        return onlyOne(
            list,
            (k) => made.filter((m) => m === OBJECTS[k]?.made).length === 1,
            "are made of a material none of the others is",
        );
    },
    kinds: (p, c) =>
        c.type === "materials"
            ? { number: new Set(words(p.things).map((k) => OBJECTS[k]?.made)).size }
            : { problem: "kinds is asked of a materials drawing" },
    "made-count": (p, c, _s, arg) =>
        c.type === "materials"
            ? { number: words(p.things).filter((k) => OBJECTS[k]?.made === arg.trim()).length }
            : { problem: "made-count is asked of a materials drawing" },
    fits: (p, c, _s, arg) =>
        c.type === "materials"
            ? onlyOne(words(p.things), (k) => clues(arg, k), `fit every clue (${arg})`)
            : { problem: "fits is asked of a materials drawing" },
    pairs: (p, c, _s, arg) => {
        if (c.type !== "materials") return { problem: "pairs is asked of a materials drawing" };
        const got = countOf(words(p.things), (k) => thingHas(k, arg), arg);
        return "number" in got ? { number: (got.number * (got.number - 1)) / 2 } : got;
    },
    "same-pairs": (p, c) => {
        if (c.type !== "materials")
            return { problem: "same-pairs is asked of a materials drawing" };
        const made = words(p.things).map((k) => OBJECTS[k]?.made);
        let pairs = 0;
        made.forEach((m, i) =>
            made.forEach((m2, j) => {
                if (j > i && m === m2) pairs++;
            }),
        );
        return { number: pairs };
    },
    back: (p, c) => {
        if (c.type !== "squash") return { problem: "back is asked of a squash drawing" };
        const does = SHAPES[String(p.thing)]?.actions[String(p.action)];
        return does
            ? { word: does === "back" ? "yes" : "no" }
            : {
                  problem: `a ${String(p.thing)} is not ${String(p.action)}ed in the table, so what it does is not known`,
              };
    },
    keeps: (p, c, _s, arg) =>
        c.type === "safety"
            ? onlyOne(
                  words(p.kit),
                  (k) => {
                      const item = SAFETY[k];
                      return item ? item.keeps === arg : null;
                  },
                  `keep the ${arg} safe`,
              )
            : { problem: "keeps is asked of the safety kit" },
};

/** How much gas a drawing shows being made: a fizz by its spoons of baking soda, a flask by its balloon. */
const gasOf = (c: Concrete): number | null => {
    const p = paramsOf(c);
    if (c.type === "fizz") return n(p.stage) === 2 ? n(p.spoons) : null;
    if (c.type === "flask") return n(p.balloon);
    return null;
};

const CHANGE_ASKS: Record<string, Ask> = {
    undo: (p, c) => {
        const ch = c.type === "beforeafter" ? CHANGES[String(p.change)] : undefined;
        return ch
            ? { word: ch.undo ? "yes" : "no" }
            : { problem: "undo is asked of a before-and-after drawing" };
    },
    back: (p, c) => {
        const ch = c.type === "beforeafter" ? CHANGES[String(p.change)] : undefined;
        if (!ch) return { problem: "back is asked of a before-and-after drawing" };
        return ch.back
            ? { word: ch.back }
            : {
                  problem: `${String(p.change)} cannot be changed back, so there is no way back to name`,
              };
    },
    new: (p, c) => {
        const ch = c.type === "beforeafter" ? CHANGES[String(p.change)] : undefined;
        return ch
            ? { word: ch.makes ? "yes" : "no" }
            : { problem: "new is asked of a before-and-after drawing" };
    },
    left: (p, c) => {
        if (c.type === "candle")
            return {
                number: Math.max(6, Math.min(12, Math.round(n(p.start)))) - Math.round(n(p.burnt)),
            };
        return { problem: "left is asked of a candle" };
    },
    burnt: (p, c) =>
        c.type === "candle"
            ? { number: Math.round(n(p.burnt)) }
            : { problem: "burnt is asked of a candle" },
    most: (p, c) => {
        if (c.type !== "nails") return { problem: "most is asked of nails in jars" };
        const jars = words(p.jars);
        const days = n(p.days);
        const rust = jars.map((j) => rustOf(j, days));
        const top = Math.max(...rust);
        if (top <= 0) return { problem: "no nail has rusted yet, so none is the rustiest" };
        return onlyOne(
            jars.map((_, i) => String(i)),
            (i) => rust[Number(i)] === top,
            "are the rustiest",
        );
    },
    rusty: (p, c) =>
        c.type === "nails"
            ? { number: words(p.jars).filter((j) => rustOf(j, n(p.days)) > 0).length }
            : { problem: "rusty is asked of nails in jars" },
    rusts: (p, c, _s, arg) => {
        if (c.type !== "nails") return { problem: "rusts is asked of nails in jars" };
        const j = words(p.jars)[at(arg)];
        const jar = j === undefined ? undefined : RUST[j];
        return jar
            ? { word: jar.perDay > 0 ? "yes" : "no" }
            : { problem: `there is no jar ${arg}` };
    },
    melted: (p, c) => {
        if (c.type !== "icemelt") return { problem: "melted is asked of the melting ice" };
        const every = n(p.every);
        const count = Math.round(n(p.count));
        for (let i = 0; i < count; i++)
            if (iceLeft(i * every, n(p.place)) === 0) return { number: i * every };
        return { problem: "the ice has not all melted in any of the pictures" };
    },
    next: (p, c) => {
        if (c.type !== "icemelt") return { problem: "next is asked of the melting ice" };
        const b = Math.round(n(p.blank));
        if (b < 0) return { problem: "no saucer is hidden, so there is nothing to predict" };
        return { number: iceLeft(b * n(p.every), n(p.place)) };
    },
    more: (_p, c, _s, _a, vs) => {
        if (!vs) return { problem: "more compares two drawings: name the second with vs=" };
        const a = gasOf(c);
        const b = gasOf(vs);
        if (a === null || b === null)
            return { problem: "more compares the gas two fizzing jars or two balloons show" };
        return a === b ? { word: "same" } : { word: a > b ? c.id : vs.id };
    },
};

/**
 * Melting and boiling points in degrees Celsius, from the sources in .docs/chemistry.md. A thing that
 * melts over a range has `lo` and `hi`; one with a sharp point has them equal. `bp` is left out where
 * nothing in a lesson boils it. Sugar is not here: it breaks down before it melts cleanly.
 */
export const SUBSTANCES: Record<string, { name: string; lo: number; hi: number; bp?: number }> = {
    water: { name: "water", lo: 0, hi: 0, bp: 100 },
    butter: { name: "butter", lo: 15, hi: 37 },
    chocolate: { name: "chocolate", lo: 30, hi: 36 },
    wax: { name: "candle wax", lo: 46, hi: 68 },
    salt: { name: "salt", lo: 801, hi: 801, bp: 1465 },
    iron: { name: "iron", lo: 1538, hi: 1538, bp: 2861 },
    gold: { name: "gold", lo: 1064, hi: 1064, bp: 2856 },
    aluminium: { name: "aluminium", lo: 660, hi: 660, bp: 2519 },
    lead: { name: "lead", lo: 327, hi: 327, bp: 1749 },
    mercury: { name: "mercury", lo: -39, hi: -39, bp: 357 },
    oxygen: { name: "oxygen", lo: -219, hi: -219, bp: -183 },
    nitrogen: { name: "nitrogen", lo: -210, hi: -210, bp: -196 },
    ethanol: { name: "ethanol", lo: -114, hi: -114, bp: 78 },
};

/** The substance a table row names, by the name in its first cell. */
const substanceNamed = (cell: string): [string, (typeof SUBSTANCES)[string]] | undefined =>
    Object.entries(SUBSTANCES).find(([, s]) => plain(s.name) === plain(cell));

/**
 * What state a substance is in at a temperature, or why the question cannot be asked: nothing is
 * asked less than five degrees from where it melts or boils, because at a melting point it can be
 * both, and a substance that melts over a range is soft in between.
 */
export function stateAt(key: string, t: number): { word: string } | { problem: string } {
    const s = SUBSTANCES[key];
    if (!s) return { problem: `${key} is not in the table of melting points` };
    const margin = 5;
    if (t <= s.lo - margin) return { word: "solid" };
    if (t < s.hi + margin)
        return {
            problem: `${s.name} is melting at about ${s.lo === s.hi ? s.lo : `${s.lo} to ${s.hi}`} degrees, so at ${t} it can be solid or liquid`,
        };
    if (s.bp === undefined || t <= s.bp - margin) return { word: "liquid" };
    if (t < s.bp + margin)
        return {
            problem: `${s.name} boils at ${s.bp} degrees, so at ${t} it can be liquid or gas`,
        };
    return { word: "gas" };
}

/** A table's rows checked against the melting points above, so a lesson cannot print a wrong one. */
function tableFacts(scene: SceneInstance, id: string): string[] {
    const t = node(scene, id);
    if (!t || t.type !== "table") return [`there is no table ${id} in the scene`];
    const cols = Math.max(1, n(t.v.cols));
    const cells = cellsOf(t);
    const out: string[] = [];
    for (let r = 0; r * cols < cells.length; r++) {
        const row = cells.slice(r * cols, r * cols + cols);
        const [name = "", melts, boils] = row;
        const found = substanceNamed(name);
        if (!found) {
            out.push(
                `the table's row "${row.join(", ")}" names nothing in the table of melting points`,
            );
            continue;
        }
        const [, s] = found;
        if (melts !== undefined && !(Number(melts) >= s.lo && Number(melts) <= s.hi))
            out.push(
                `the table says ${s.name} melts at ${melts}, and the sources say ${s.lo === s.hi ? s.lo : `${s.lo} to ${s.hi}`}`,
            );
        if (boils !== undefined && s.bp !== undefined && Number(boils) !== s.bp)
            out.push(`the table says ${s.name} boils at ${boils}, and the sources say ${s.bp}`);
    }
    return out;
}

const temperatureOf = (
    p: Record<string, unknown>,
    c: Concrete,
    settings: Record<string, string>,
): number | null =>
    settings.temp !== undefined
        ? Number(settings.temp)
        : c.type === "thermometer"
          ? n(p.value)
          : null;

const STATE_ASKS: Record<string, Ask> = {
    state: (p, c) => {
        if (c.type !== "particles") return { problem: "state is asked of a jar of particles" };
        const word = ["solid", "liquid", "gas"][Math.max(0, Math.min(2, Math.round(n(p.spread))))];
        return word === undefined ? { problem: "the particles are in no state" } : { word };
    },
    hotter: (p, c, _s, _a, vs) => {
        if (c.type !== "particles" || vs?.type !== "particles")
            return { problem: "hotter compares two jars of particles: name the second with vs=" };
        const q = paramsOf(vs);
        if (Math.round(n(p.spread)) !== Math.round(n(q.spread)) || n(p.count) !== n(q.count))
            return {
                problem:
                    "hotter compares two jars of the same stuff in the same state, which these are not",
            };
        const a = n(p.moving);
        const b = n(q.moving);
        return a === b ? { word: "same" } : { word: a > b ? c.id : vs.id };
    },
    water: (p, c, _s, _a, _v, settings) => {
        const t = temperatureOf(p, c, settings);
        if (t === null) return { problem: "water needs a thermometer or temp=" };
        const got = stateAt("water", t);
        return "problem" in got
            ? got
            : { word: got.word === "solid" ? "ice" : got.word === "gas" ? "steam" : "water" };
    },
    of: (p, c, _s, arg, _v, settings) => {
        const t = temperatureOf(p, c, settings);
        return t === null ? { problem: "of needs a thermometer or temp=" } : stateAt(arg.trim(), t);
    },
    which: (p, c, scene, arg, _v, settings) => {
        const t = temperatureOf(p, c, settings);
        const table = c.type === "table" ? c : node(scene, settings.table ?? "");
        if (t === null || table?.type !== "table")
            return {
                problem:
                    "which needs a thermometer or temp=, and table= naming the table of melting points",
            };
        const cols = Math.max(1, n(table.v.cols));
        const cells = cellsOf(table);
        const hits: string[] = [];
        for (let r = 0; r * cols < cells.length; r++) {
            const found = substanceNamed(cells[r * cols] ?? "");
            if (!found) continue;
            const [key, s] = found;
            const got = stateAt(key, t);
            if ("problem" in got) return got;
            if (got.word === arg.trim()) hits.push(s.name);
        }
        const [hit] = hits;
        return hits.length === 1 && hit !== undefined
            ? { word: hit }
            : { problem: `${hits.length} things in the table are ${arg} at ${t} degrees` };
    },
    stage: (p, c) => {
        if (c.type !== "watercycle") return { problem: "stage is asked of the water cycle" };
        const s = CYCLE[Math.round(n(p.blank))];
        return s
            ? { word: n(p.plain) > 0 ? s.plain : s.name }
            : { problem: "no stage of the water cycle is left blank" };
    },
    flat: (p, c) => {
        if (c.type !== "heatcurve") return { problem: "flat is asked of a heating curve" };
        const f = flatRun(p);
        const half = n(p.step) / 2;
        if (typeof f === "string") return { problem: f };
        // a reading is only asked where it can be read: on a line of the grid or halfway between two
        return Number.isInteger((f.temp - n(p.min)) / half)
            ? { number: f.temp }
            : {
                  problem: `the flat part is at ${f.temp}, which is not on a line or halfway between two`,
              };
    },
    "flat-for": (p, c) => {
        if (c.type !== "heatcurve") return { problem: "flat-for is asked of a heating curve" };
        const f = flatRun(p);
        return typeof f === "string" ? { problem: f } : { number: (f.to - f.from) * n(p.every) };
    },
    "flat-from": (p, c) => {
        if (c.type !== "heatcurve") return { problem: "flat-from is asked of a heating curve" };
        const f = flatRun(p);
        return typeof f === "string" ? { problem: f } : { number: f.from * n(p.every) };
    },
};

/** The one run of equal readings in a heating curve, or why there is not exactly one. */
function flatRun(p: Record<string, unknown>): { temp: number; from: number; to: number } | string {
    const t = Array.isArray(p.temps) ? p.temps.map(Number) : [];
    const runs: { temp: number; from: number; to: number }[] = [];
    for (let i = 1; i < t.length; i++) {
        const here = t[i];
        if (here === undefined || here !== t[i - 1]) continue;
        const last = runs.at(-1);
        if (last && last.to === i - 1 && last.temp === here) last.to = i;
        else runs.push({ temp: here, from: i - 1, to: i });
    }
    const [only] = runs;
    return runs.length === 1 && only
        ? only
        : `the curve has ${runs.length} flat parts, so "where it stays flat" has ${runs.length} answers`;
}

/** What the colour a liquid turns the indicator says: acid or alkali, or null for the band across 7. */
const saysOf = (liquid: string, arg: string): boolean | null => {
    const liq = LIQUIDS[liquid];
    if (!liq) return null;
    const band = bandOf(liq.ph);
    if (arg === "acid") return band.to < 7;
    const kind = kindOfBand(band);
    return kind === null ? null : kind === arg;
};

const INDICATOR_ASKS: Record<string, Ask> = {
    colour: (p, _c, _s, arg) => {
        const key = words(p.liquids)[at(arg)];
        const liq = key === undefined ? undefined : LIQUIDS[key];
        return liq ? { word: bandOf(liq.ph).colour } : { problem: `there is no cup ${arg}` };
    },
    acid: (p, _c, _s, arg) => {
        const key = words(p.liquids)[at(arg)];
        const liq = key === undefined ? undefined : LIQUIDS[key];
        if (!liq) return { problem: `there is no cup ${arg}` };
        const b = bandOf(liq.ph);
        return b.to < 7
            ? { word: "yes" }
            : b.from >= 7
              ? { word: "no" }
              : { problem: `${b.colour} is on both sides of 7, so it cannot say` };
    },
    kind: (p, _c, _s, arg) => {
        const key = words(p.liquids)[at(arg)];
        const liq = key === undefined ? undefined : LIQUIDS[key];
        if (!liq) return { problem: `there is no cup ${arg}` };
        const b = bandOf(liq.ph);
        const k = kindOfBand(b);
        return k
            ? { word: k }
            : {
                  problem: `${b.colour} covers pH ${b.from} to ${b.to}, so it does not say acid or alkali`,
              };
    },
    only: (p, _c, _s, arg) =>
        onlyOne(
            words(p.liquids),
            (liq) => saysOf(liq, arg),
            `turn it the colour of ${arg === "acid" ? "an acid" : "an alkali"}`,
        ),
    count: (p, _c, _s, arg) => countOf(words(p.liquids), (liq) => saysOf(liq, arg), `show ${arg}`),
};

/**
 * Whether a way of separating gets `thing` on its own out of a mixture, by what each way does: a
 * magnet pulls out what is magnetic; filter paper keeps back every solid that has not dissolved;
 * evaporating the water leaves every solid behind; a sieve keeps what is bigger than its holes and
 * lets through what is smaller, and only works dry. It isolates the thing only if nothing else goes
 * the same way.
 */
export function isolates(method: string, thing: string, others: string[], water: boolean): boolean {
    const t = MIXABLES[thing];
    const rest = others.flatMap((k) => {
        const m = MIXABLES[k];
        return m ? [m] : [];
    });
    if (!t) return false;
    switch (method) {
        case "magnet":
            return t.magnetic && rest.every((o) => !o.magnetic);
        case "filter":
            return water && !t.dissolves && !t.floats && rest.every((o) => o.dissolves);
        case "evaporate":
            return water && t.dissolves && rest.length === 0;
        case "sieve":
            return (
                !water && (rest.every((o) => o.size < t.size) || rest.every((o) => o.size > t.size))
            );
        default:
            return false;
    }
}
const METHODS: Record<string, string> = {
    sieve: "sieve",
    "sieve it": "sieve",
    filter: "filter",
    "filter it": "filter",
    magnet: "magnet",
    "use a magnet": "magnet",
    evaporate: "evaporate",
    "evaporate the water": "evaporate",
    "let the water evaporate": "evaporate",
};

/** The one option that gets `thing` out on its own, refusing a question where none or two do. */
function methodFor(
    scene: SceneInstance,
    name: string,
    thing: string,
    all: string[],
    water: boolean,
): Got {
    const options = optionsOf(node(scene, name)) ?? [];
    if (!options.length) return { problem: `${name} is not a choice of ways to separate` };
    const hits: string[] = [];
    for (const o of options) {
        const m = METHODS[plain(o.label)];
        if (!m)
            return {
                problem: `"${o.label}" is not a way the checker knows; it knows ${Object.keys(METHODS).join(", ")}`,
            };
        if (
            isolates(
                m,
                thing,
                all.filter((k) => k !== thing),
                water,
            )
        )
            hits.push(o.label);
    }
    const [hit] = hits;
    return hits.length === 1 && hit !== undefined
        ? { word: hit }
        : {
              problem: `${hits.length ? hits.join(" and ") : "none of the options"} get the ${MIXABLES[thing]?.name ?? thing} out on its own`,
          };
}

/** The one thing in a list, by its name in the table, or why there is not exactly one. */
const oneThing = (kept: string[], what: string, whole: string): Got => {
    const [only] = kept;
    const name = only === undefined ? undefined : MIXABLES[only]?.name;
    return kept.length === 1 && name !== undefined
        ? { word: name }
        : { problem: `${kept.length} ${what}, so "${whole}" has no single answer` };
};

const SEPARATE_ASKS: Record<string, Ask> = {
    stays: (p, c) => {
        if (c.type !== "sieve") return { problem: "stays is asked of a sieve" };
        const kept = words(p.mixture).filter((k) => MIXABLES[k] && !passes(k, n(p.holes)));
        return oneThing(kept, "of the things stay in the sieve", "what stays");
    },
    through: (p, c) => {
        if (c.type !== "sieve") return { problem: "through is asked of a sieve" };
        const fell = words(p.mixture).filter((k) => MIXABLES[k] && passes(k, n(p.holes)));
        return oneThing(fell, "of the things fall through", "what goes through");
    },
    residue: (p, c) => {
        if (c.type !== "mixture" || n(p.water) <= 0)
            return { problem: "residue is asked of a mixture in water" };
        const kept = words(p.things).filter((k) => {
            const m = MIXABLES[k];
            return m && !m.dissolves && !m.floats && !m.liquid;
        });
        return oneThing(kept, "things would stay on the paper", "what stays");
    },
    works: (p, c) => {
        if (c.type !== "sieve") return { problem: "works is asked of a sieve" };
        const through = words(p.mixture).map((k) => passes(k, n(p.holes)));
        return { word: through.some((x) => x) && through.some((x) => !x) ? "yes" : "no" };
    },
    get: (p, c, scene, arg, _v, settings) => {
        const list = words(c.type === "sieve" ? p.mixture : p.things);
        const water = c.type === "mixture" && n(p.water) > 0;
        if (!list.includes(arg.trim())) return { problem: `${arg} is not in the mixture` };
        const name =
            Object.entries(settings).find(([, v]) => v.trim() === `get(${arg})`)?.[0] ?? "";
        return methodFor(scene, name, arg.trim(), list, water);
    },
};

const rockHas = (kind: string, prop: string): boolean | null => {
    const not = prop.startsWith("not-");
    const name = not ? prop.slice(4) : prop;
    const rock = ROCKS[kind];
    const v = rock && name in rock.is ? rock.is[name as keyof typeof rock.is] : undefined;
    return v === undefined ? null : v !== not;
};

const ROCK_ASKS: Record<string, Ask> = {
    count: (p, c, _s, arg) =>
        c.type === "rocks"
            ? countOf(words(p.rocks), (k) => rockHas(k, arg), arg)
            : { problem: "count is asked of rocks" },
    only: (p, c, _s, arg) =>
        c.type === "rocks"
            ? onlyOne(words(p.rocks), (k) => rockHas(k, arg), arg)
            : { problem: "only is asked of rocks" },
    fits: (p, c, _s, arg) =>
        c.type === "rocks"
            ? onlyOne(
                  words(p.rocks),
                  (k) => {
                      let unknown = false;
                      for (const clue of arg.split(/\s+/).filter(Boolean)) {
                          const has = rockHas(k, clue);
                          if (has === null) unknown = true;
                          else if (!has) return false;
                      }
                      return unknown ? null : true;
                  },
                  `fit every clue (${arg})`,
              )
            : { problem: "fits is asked of rocks" },
    kind: (p, c, _s, arg) => {
        const k = c.type === "rocks" ? words(p.rocks)[at(arg)] : undefined;
        const rock = k === undefined ? undefined : ROCKS[k];
        return rock ? { word: rock.kind } : { problem: `there is no rock ${arg}` };
    },
    thickest: (p, c) => {
        if (c.type !== "soiljar") return { problem: "thickest is asked of the soil jar" };
        const layers = (["stones", "sand", "silt", "clay"] as const).map(
            (k) => [k, Math.round(n(p[k]))] as const,
        );
        const top = Math.max(...layers.map((l) => l[1]));
        const hits = layers.filter((l) => l[1] === top);
        const [hit] = hits;
        return hits.length === 1 && hit
            ? { word: hit[0] }
            : { problem: `${hits.map((h) => h[0]).join(" and ")} are equally thick` };
    },
    step: (p, c, _s, arg) => {
        if (c.type !== "fossilsteps") return { problem: "step is asked of the fossil pictures" };
        const order = Array.isArray(p.order) ? p.order.map(Number) : [];
        const i = order.indexOf(Number(arg));
        if (i < 0) return { problem: `no picture shows step ${arg}` };
        if (i === Math.round(n(p.blank)))
            return { problem: `step ${arg} is the picture left blank` };
        return { word: letter(i) };
    },
    missing: (p, c) => {
        if (c.type !== "fossilsteps") return { problem: "missing is asked of the fossil pictures" };
        const order = Array.isArray(p.order) ? p.order.map(Number) : [];
        const b = Math.round(n(p.blank));
        const s = FOSSIL_STEPS[(order[b] ?? 0) - 1];
        return s ? { word: s } : { problem: "no picture is left blank" };
    },
};

/** The molecules in a drawing, as a list of kinds. */
function moleculesIn(p: Record<string, unknown>, c: Concrete): string[] {
    if (c.type === "molecule")
        return Array.from({ length: Math.max(1, Math.min(4, Math.round(n(p.count)))) }, () =>
            String(p.kind),
        );
    const a = Array.from({ length: Math.max(0, Math.min(6, Math.round(n(p.na)))) }, () =>
        String(p.a),
    );
    const b =
        String(p.b) !== "none"
            ? Array.from({ length: Math.max(0, Math.min(6, Math.round(n(p.nb)))) }, () =>
                  String(p.b),
              )
            : [];
    return [...a, ...b];
}

const ATOM_ASKS: Record<string, Ask> = {
    atoms: (p, c, _s, arg) => {
        const el0 = arg.trim().toUpperCase();
        return {
            number: moleculesIn(p, c).reduce(
                (s, k) =>
                    s +
                    (el0
                        ? (atomsIn(k)[el0] ?? 0)
                        : Object.values(atomsIn(k)).reduce((x, y) => x + y, 0)),
                0,
            ),
        };
    },
    molecules: (p, c) => ({ number: moleculesIn(p, c).length }),
    elements: (p, c) => ({
        number: new Set(moleculesIn(p, c).flatMap((k) => Object.keys(atomsIn(k)))).size,
    }),
    substances: (p, c) => ({ number: new Set(moleculesIn(p, c)).size }),
    pure: (p, c) => ({ word: new Set(moleculesIn(p, c)).size === 1 ? "pure" : "mixture" }),
    element: (p, c) => {
        const kinds = new Set(moleculesIn(p, c));
        const [k] = [...kinds];
        if (kinds.size !== 1 || k === undefined)
            return {
                problem: "a box of two substances is a mixture, neither an element nor a compound",
            };
        return { word: Object.keys(atomsIn(k)).length === 1 ? "element" : "compound" };
    },
    name: (p, c) => {
        const kinds = [...new Set(moleculesIn(p, c))];
        const [k] = kinds;
        const molecule = k === undefined ? undefined : MOLECULES[k];
        return kinds.length === 1 && molecule
            ? { word: molecule.name }
            : { problem: "name is asked of one kind of molecule" };
    },
};

export const CHEMISTRY: Record<string, CodeChecker> = {
    "chem.materials": checker(
        "Works out a question about materials from the table the drawing is drawn from. Of a materials row: `count(prop)` is how many things have a property and `only(prop)` the letter of the one that does (hard, bendy, see-through, waterproof, absorbent, stretchy, floats, each also as not-...), `made(B)` what thing B is made of, `same(B)` the letter of the one other thing made of the same material, `odd` the letter of the one made of a material none of the others is, `kinds` how many different materials there are, `made-count(metal)` how many are made of one material, `fits(not-made-metal waterproof)` the letter of the one thing that meets every clue, `pairs(bendy)` how many pairs of things are both bendy, and `same-pairs` how many pairs share a material; a property the table leaves open for a thing cannot be asked. Of a squash drawing, `back` is whether the thing springs back (yes or no). Of the safety kit, `keeps(eyes)` is the letter of what keeps that safe.",
        ["materials", "squash", "safety"],
        MATERIAL_ASKS,
    ),
    "chem.change": checker(
        "Works out what a change does, from the table the drawing is drawn from. Of a before-and-after drawing, `undo` is whether it can be changed back, `new` whether it makes a new material (yes or no), and `back` how to change it back (cool it, warm it, or let the water dry up). Of a candle, `left` and `burnt` are centimetres. Of nails in jars, `most` is the letter of the rustiest, `rusty` how many have rusted and `rusts(B)` whether jar B's nail rusts. Of melting ice, `melted` is the minutes of the first picture with no ice left and `next` how many quarters of the cube the hidden saucer holds. With `vs` naming a second fizzing jar or flask, `more` is the one that made more gas, or same.",
        ["beforeafter", "candle", "nails", "icemelt", "fizz", "flask"],
        CHANGE_ASKS,
    ),
    "chem.state": checker(
        "Works out what state something is in. Of a jar of particles, `state` is solid, liquid or gas, and with `vs` naming a jar of the same stuff in the same state, `hotter` is the one whose particles move faster. Of a thermometer (or with `temp=`), `water` is ice, water or steam, and `of(wax)` the state of anything in the table of melting and boiling points; nothing is asked less than five degrees from where it melts or boils. `table=` names a table in the scene whose rows are checked against the same melting points (or `of` names the table itself, with `temp=`), and `which(liquid)` is the one thing in that table in that state at the temperature. Of the water cycle, `stage` is the name of the blank stage. Of a heating curve, `flat` is the temperature where it stays flat, `flat-from` the minute it starts and `flat-for` how many minutes it lasts.",
        ["particles", "thermometer", "watercycle", "heatcurve", "table"],
        STATE_ASKS,
    ),
    "chem.indicator": checker(
        "Works out what red cabbage indicator shows, from each liquid's pH and the colour chart: `colour(B)` is the colour cup B turns, `acid(B)` whether that colour says acid (yes or no; blue says no), `kind(B)` acid or alkali (refusing blue, which covers 7 and 8), and `only(acid)`, `only(alkali)`, `count(acid)` and `count(alkali)` the letter of the one cup, or how many cups, whose colour says so.",
        ["cabbage"],
        INDICATOR_ASKS,
    ),
    "chem.separate": checker(
        'Works out how a mixture comes apart. Of a sieve, `stays` and `through` are what stays in it and what falls through, and `works` whether it separates the mixture at all. Of a mixture in water, `residue` is what filter paper would keep back. Of a sieve or a mixture, `get(sand)` binds the one option (sieve, filter, magnet or evaporate, in those words or as "use a magnet", "filter it", "evaporate the water") that gets that part out on its own, refusing a question where none or two do: a magnet pulls out what is magnetic, filter paper keeps back what has not dissolved, evaporating leaves every solid behind, and a sieve only works dry.',
        ["sieve", "mixture"],
        SEPARATE_ASKS,
    ),
    "chem.rocks": checker(
        "Works out questions about rocks, soil and fossils. Of a row of rocks, `count(prop)` and `only(prop)` count or pick the rocks that soak up water (soaks), fizz with vinegar (fizzes), float, or can be scratched with a fingernail (soft), each also as not-..., `fits(fizzes not-soaks)` the letter of the one rock that meets every clue, and `kind(B)` is igneous, sedimentary or metamorphic. Of the soil jar, `thickest` is the thickest layer. Of the fossil pictures, `step(1)` is the letter of the picture showing that step, and `missing` what the blank picture should show.",
        ["rocks", "soiljar", "fossilsteps"],
        ROCK_ASKS,
    ),
    "chem.atoms": checker(
        "Counts what a model of molecules holds: `atoms` every atom, `atoms(H)` the atoms of one element, `molecules`, `elements` (kinds of atom) and `substances` (kinds of molecule); `pure` is pure or mixture, `element` is element or compound for one kind of molecule, and `name` its name.",
        ["molecule", "atombox"],
        ATOM_ASKS,
    ),
};
