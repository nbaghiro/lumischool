// The checkers that prove a physics question for every variant, from the drawing in the scene and
// the same rule that decided what the drawing shows: whether a loop lights, which things let
// electricity through, which way a lever tips, where a beam of light ends up, what the moon looks
// like on a given day. An answer the item states has to agree with the checker, and one it does
// not state is taken from it, so a question cannot say one thing while its picture shows another.
// See .docs/physics.md, "The checkers".
import { num, str, type Value } from "../expr";
import { bandsOf } from "../parts/science/bands";
import { SHEETS } from "../parts/science/beam";
import { boatOf } from "../parts/science/boat";
import { gearTeeth, gearTurns } from "../parts/science/gears";
import { leverTips, pivotStep } from "../parts/science/lever";
import { mazeOf, traceMaze } from "../parts/science/mirrors";
import { PHASES, moonOn } from "../parts/science/moonphases";
import { FALLS, fallOf } from "../parts/science/parachute";
import { swingsFaster } from "../parts/science/pendulum";
import { periscopeSees } from "../parts/science/periscope";
import { SPECTRUM } from "../parts/science/prism";
import { pulleyPull } from "../parts/science/pulley";
import { seesRight } from "../parts/science/seeing";
import { type Loop, loopGlow, loopOf, loopWorks } from "../parts/science/series";
import { dayAt } from "../parts/science/sunpath";
import { THINGS } from "../parts/science/tester";
import { lampsLit } from "../parts/science/turbine";
import { wheelPull, wheelSizes } from "../parts/science/wheelaxle";
import { cupReading, iceMelted, iceReading } from "../parts/science/wrapped";
import type { Opt } from "../scene";
import type { Concrete, SceneInstance } from "./instantiate";
import type { CodeChecker } from "./verify";
import { partParams } from "./vocabulary";

const node = (scene: SceneInstance, id: string | undefined): Concrete | undefined =>
    scene.nodes.find((c) => c.id === id);
const paramsOf = (c: Concrete): Record<string, unknown> => partParams(c.type, c.v);
const n = (x: unknown): number => (typeof x === "number" ? x : Number(x));
/** Words compared the way a child's choice reads: case, a leading article and a full stop do not count. */
const plain = (s: string): string =>
    s
        .trim()
        .toLowerCase()
        .replace(/[.!?]$/, "")
        .replace(/^(a|an|the) /, "");
/** The options a choice offers, or null for a node that is not a choice. */
const optionsOf = (c: Concrete | undefined): Opt[] | null => {
    if (c?.type !== "choice") return null;
    const x = c.v.options;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o] : []))
        : [];
};
/** The letter of the thing at an index, A to H. */
const letter = (i: number): string => "ABCDEFGH".charAt(i) || "?";
const words = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);

/** What a quantity comes to for one variant: a number, a word an option has to say, or why it cannot be asked. */
type Got = { number: number } | { word: string } | { problem: string };

/**
 * A result as the answer the item's input takes: a number for a box, or the one option of a choice
 * whose words say it. A number that is not a whole number or a half is refused rather than rounded.
 */
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
    const x = got.number;
    if (Number.isInteger(x)) return { v: num(x) };
    if (Number.isInteger(x * 2)) return { v: num(x * 2, 2) };
    return { problem: `the drawing comes to ${x}, which is not a whole number or a half` };
}

/** A quantity asked of one drawing: its settings, the scene it is in, and the argument in brackets, if any. */
type Ask = (
    p: Record<string, unknown>,
    c: Concrete,
    scene: SceneInstance,
    arg: string,
    vs: Concrete | undefined,
    name: string,
) => Got;

/**
 * One checker built from a table of quantities. `of` names the drawing, `vs` a second one where the
 * question compares two, and every other setting binds an answer to a quantity: `pick=lights`,
 * `answer=count(conducts)`.
 */
function checker(doc: string, types: readonly string[], asks: Record<string, Ask>): CodeChecker {
    return {
        doc,
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => k !== "of" && k !== "vs"),
        solutions: (settings) => [
            `worked out for each variant from ${settings.of ?? "the drawing"}, by the rule the drawing is drawn by`,
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
            for (const [name, want] of Object.entries(settings)) {
                if (name === "of" || name === "vs") continue;
                const m = /^([a-z-]+)(?:\((.*)\))?$/.exec(want.trim());
                const [, what = "", arg = ""] = m ?? [];
                const ask = asks[what];
                if (!m || !ask) {
                    problems.push(
                        `${name}=${want} is not something this checker works out; it knows ${Object.keys(asks).join(", ")}`,
                    );
                    continue;
                }
                const got = bind(scene, name, ask(paramsOf(c), c, scene, arg, vs, name));
                if ("problem" in got) problems.push(got.problem);
                else answers[name] = got.v;
            }
            return { answers, problems };
        },
    };
}

/** A loop as the three circuit drawings hold one: the tester is a loop whose gap is the thing across it. */
function loopIn(c: Concrete): { loop: Loop; works: boolean; glow: number; thing?: string } {
    const p = paramsOf(c);
    if (c.type === "tester") {
        const thing = String(p.thing);
        const works = THINGS[thing]?.made === "metal";
        return {
            loop: loopOf({
                cells: 1,
                bulbs: 1,
                buzzer: 0,
                motor: 0,
                closed: works ? 1 : 0,
                loose: 0,
            }),
            works,
            glow: works ? 1 : 0,
            thing,
        };
    }
    const loop =
        c.type === "circuit"
            ? loopOf({
                  cells: Math.max(1, n(p.cells)),
                  bulbs: 1,
                  buzzer: n(p.buzzer),
                  motor: 0,
                  closed: n(p.closed),
                  loose: 0,
              })
            : loopOf({
                  cells: n(p.cells),
                  bulbs: n(p.bulbs),
                  buzzer: n(p.buzzer),
                  motor: n(p.motor),
                  closed: n(p.closed),
                  loose: n(p.loose),
              });
    return { loop, works: loopWorks(loop), glow: loopGlow(loop) };
}

/** The reasons a loop stays dark, in the words the options have to use. */
const FAULTS = {
    cell: "There is no cell",
    open: "The switch is open",
    loose: "A wire is loose",
} as const;

/** The changes a question can offer, each as what it does to the loop. */
const CHANGES: Record<string, (l: Loop) => Loop | null> = {
    "add a cell": (l) => (l.cells < 4 ? { ...l, cells: l.cells + 1 } : null),
    "take a cell away": (l) => (l.cells > 1 ? { ...l, cells: l.cells - 1 } : null),
    "add a bulb": (l) => (l.bulbs < 3 ? { ...l, bulbs: l.bulbs + 1 } : null),
    "take a bulb away": (l) => (l.bulbs > 1 ? { ...l, bulbs: l.bulbs - 1 } : null),
    "open the switch": (l) => ({ ...l, closed: false }),
    "close the switch": (l) => ({ ...l, closed: true }),
    "clip the wire back on": (l) => ({ ...l, loose: false }),
};

/** The one option whose change makes a dark loop light, refusing a question where none or two do. */
function mendFor(c: Concrete, scene: SceneInstance, name: string): Got {
    const { loop, works } = loopIn(c);
    if (works) return { problem: "this loop already lights, so nothing needs mending" };
    const options = optionsOf(node(scene, name)) ?? [];
    const hits: string[] = [];
    for (const o of options) {
        const change = CHANGES[plain(o.label)];
        if (!change)
            return {
                problem: `"${o.label}" is not a change the checker knows; it knows ${Object.keys(CHANGES).join(", ")}`,
            };
        const after = change(loop);
        if (after && loopWorks(after)) hits.push(o.label);
    }
    const [hit] = hits;
    return hits.length === 1 && hit
        ? { word: hit }
        : {
              problem: `${hits.length ? hits.join(" and ") : "none of the options"} make it light, so the question has ${hits.length} answers`,
          };
}

/** Brightness can be compared only between loops of cells and bulbs, where the rule is exact. */
const onlyBulbs = (l: Loop): boolean => !l.buzzer && !l.motor && l.bulbs > 0;

/** The one option whose change makes the bulbs brighter (or dimmer), refusing a question with none or two. */
function changeFor(
    c: Concrete,
    scene: SceneInstance,
    name: string,
    which: "brighter" | "dimmer",
): Got {
    const { loop, glow } = loopIn(c);
    if (!onlyBulbs(loop) || !loopWorks(loop))
        return {
            problem:
                "a change is compared by brightness, so the loop has to light and hold only cells and bulbs",
        };
    const options = optionsOf(node(scene, name)) ?? [];
    const hits: string[] = [];
    for (const o of options) {
        const change = CHANGES[plain(o.label)];
        if (!change)
            return {
                problem: `"${o.label}" is not a change the checker knows; it knows ${Object.keys(CHANGES).join(", ")}`,
            };
        const after = change(loop);
        if (!after)
            return {
                problem: `"${o.label}" cannot be done to a loop with ${loop.cells} cells and ${loop.bulbs} bulbs`,
            };
        const g = loopGlow(after);
        if (which === "brighter" ? g > glow : g < glow && g > 0) hits.push(o.label);
    }
    const [hit] = hits;
    return hits.length === 1 && hit
        ? { word: hit }
        : {
              problem: `${hits.length ? hits.join(" and ") : "none of the options"} make the bulbs ${which}, so the question has ${hits.length} answers`,
          };
}

const CIRCUIT: Record<string, Ask> = {
    lights: (_p, c) => {
        const { loop, works } = loopIn(c);
        return loop.bulbs > 0
            ? { word: works ? "yes" : "no" }
            : { problem: "there is no bulb in the loop to light" };
    },
    sounds: (_p, c) => {
        const { loop, works } = loopIn(c);
        return loop.buzzer
            ? { word: works ? "yes" : "no" }
            : { problem: "there is no buzzer in the loop" };
    },
    turns: (_p, c) => {
        const { loop, works } = loopIn(c);
        return loop.motor
            ? { word: works ? "yes" : "no" }
            : { problem: "there is no motor in the loop" };
    },
    fault: (_p, c) => {
        const { loop, works } = loopIn(c);
        if (c.type === "tester")
            return { problem: "a tester's gap is its question; ask whether it lights" };
        if (works) return { problem: "this loop lights, so there is no fault to name" };
        const faults = [
            loop.cells === 0 ? FAULTS.cell : null,
            !loop.closed ? FAULTS.open : null,
            loop.loose ? FAULTS.loose : null,
        ].filter((x) => x !== null);
        const [fault] = faults;
        return faults.length === 1 && fault
            ? { word: fault }
            : {
                  problem: `this loop has ${faults.length} faults (${faults.join(", ")}), so "why" has more than one answer`,
              };
    },
    dark: (_p, c, _s, _a, vs) => {
        if (!vs) return { problem: "dark compares two loops: name the second with vs=" };
        const a = loopIn(c).works;
        const b = loopIn(vs).works;
        return a === b
            ? { problem: `both loops ${a ? "light" : "stay dark"}, so neither is the odd one` }
            : { word: a ? vs.id : c.id };
    },
    brighter: (_p, c, _s, _a, vs) => {
        if (!vs) return { problem: "brighter compares two loops: name the second with vs=" };
        const a = loopIn(c);
        const b = loopIn(vs);
        if (!onlyBulbs(a.loop) || !onlyBulbs(b.loop))
            return {
                problem:
                    "brightness is compared only between loops of cells and bulbs, where the rule is exact",
            };
        return a.glow === b.glow ? { word: "same" } : { word: a.glow > b.glow ? c.id : vs.id };
    },
    change: (_p, c, _s, _a, vs) => {
        if (!vs)
            return { problem: "change compares the loop before (of=) with the loop after (vs=)" };
        const a = loopIn(c);
        const b = loopIn(vs);
        if (!onlyBulbs(a.loop) || !onlyBulbs(b.loop))
            return {
                problem:
                    "brightness is compared only between loops of cells and bulbs, where the rule is exact",
            };
        return { word: b.glow > a.glow ? "brighter" : b.glow < a.glow ? "dimmer" : "same" };
    },
    mends: (_p, c, scene, _a, _v, name) => mendFor(c, scene, name),
    faults: (_p, c) => {
        if (c.type === "tester")
            return { problem: "a tester's gap is its question; ask whether it lights" };
        const { loop } = loopIn(c);
        return {
            number: (loop.cells === 0 ? 1 : 0) + (loop.closed ? 0 : 1) + (loop.loose ? 1 : 0),
        };
    },
    which: (_p, c, _s, _a, vs) => {
        if (!vs) return { problem: "which compares two loops: name the second with vs=" };
        const a = loopIn(c).works;
        const b = loopIn(vs).works;
        return { word: a && b ? "both" : !a && !b ? "neither" : `${a ? c.id : vs.id} only` };
    },
    brighten: (_p, c, scene, _a, _v, name) => changeFor(c, scene, name, "brighter"),
    dimmer: (_p, c, scene, _a, _v, name) => changeFor(c, scene, name, "dimmer"),
};

/** A property of a thing in the table, or null where the table does not say (a candle has no material). */
const PROPS: Record<string, (kind: string) => boolean | null> = {
    conducts: (k) => (THINGS[k]?.made ? THINGS[k].made === "metal" : null),
    insulates: (k) => (THINGS[k]?.made ? THINGS[k].made !== "metal" : null),
    metal: (k) => (THINGS[k]?.made ? THINGS[k].made === "metal" : null),
    magnetic: (k) => (THINGS[k]?.made ? THINGS[k].magnetic === true : null),
    "metal-not-magnetic": (k) =>
        THINGS[k]?.made ? THINGS[k].made === "metal" && !THINGS[k].magnetic : null,
    source: (k) => {
        const thing = THINGS[k];
        return thing ? thing.source : null;
    },
};

/** Which of the tray's things have a property, or why the question cannot be asked of them. */
function having(p: Record<string, unknown>, arg: string): { hits: number[]; problem?: string } {
    const not = arg.startsWith("not-");
    const prop = PROPS[not ? arg.slice(4) : arg];
    if (!prop)
        return {
            hits: [],
            problem: `${arg} is not a property of a thing; the table knows ${Object.keys(PROPS).join(", ")}, each also as not-...`,
        };
    const list = words(p.things);
    const hits: number[] = [];
    for (const [i, kind] of list.entries()) {
        const has = prop(kind);
        if (has === null)
            return {
                hits,
                problem: `the table does not say whether a ${THINGS[kind]?.name ?? kind} ${arg}, so it cannot be in this question`,
            };
        if (has !== not) hits.push(i);
    }
    return { hits };
}

const TRAY: Record<string, Ask> = {
    count: (p, _c, _s, arg) => {
        const { hits, problem } = having(p, arg);
        return problem ? { problem } : { number: hits.length };
    },
    only: (p, _c, _s, arg) => {
        const { hits, problem } = having(p, arg);
        if (problem) return { problem };
        const [hit] = hits;
        return hits.length === 1 && hit !== undefined
            ? { word: letter(hit) }
            : {
                  problem: `${hits.length} of the things are ${arg}, so "which one" has ${hits.length} answers`,
              };
    },
};

/** The pull a machine needs, from a pulley or a wheel and axle, as the drawing works it out. */
function pullOf(c: Concrete): number | null {
    const p = paramsOf(c);
    if (c.type === "pulley") return pulleyPull(n(p.load), n(p.ropes));
    if (c.type === "wheelaxle") {
        const { wheel, axle } = wheelSizes({ wheel: n(p.wheel), axle: n(p.axle) });
        return wheelPull(n(p.load), axle, wheel);
    }
    return null;
}

/** A gear named by its letter in brackets, b or c, as the index gearTurns counts it by. */
function gearAt(p: Record<string, unknown>, arg: string): { way: 1 | -1; times: number } | string {
    const i = "abc".indexOf(arg.trim().toLowerCase());
    const teeth = gearTeeth({ a: n(p.a), b: n(p.b), c: n(p.c) });
    const turn = i < 1 ? undefined : gearTurns(teeth, n(p.turn))[i];
    return (
        turn ??
        `there is no gear ${arg || "named"} to ask about; name b or c, and c only when there are three`
    );
}

const MACHINE: Record<string, Ask> = {
    lifts: (p, c) => {
        if (c.type !== "lever") return { problem: "lifts is asked of a lever" };
        if (n(p.push) <= 0)
            return {
                problem: "the push is drawn as a question mark, so ask what push balances instead",
            };
        const tip = leverTips(n(p.load), pivotStep(n(p.fulcrum)), n(p.push));
        return tip === "balanced"
            ? {
                  problem:
                      "the lever balances, so it neither lifts the stone nor lets it fall; leave this variant out",
              }
            : { word: tip === "right" ? "yes" : "no" };
    },
    balance: (p, c) => {
        if (c.type !== "lever") return { problem: "balance is asked of a lever" };
        const f = pivotStep(n(p.fulcrum));
        return { number: (n(p.load) * f) / (10 - f) };
    },
    pull: (_p, c) => {
        const pull = pullOf(c);
        return pull === null
            ? { problem: "pull is asked of a pulley or a wheel and axle" }
            : { number: pull };
    },
    easier: (_p, c, _s, _a, vs) => {
        if (!vs) return { problem: "easier compares two machines: name the second with vs=" };
        const a = pullOf(c);
        const b = pullOf(vs);
        if (a === null || b === null)
            return { problem: "easier compares pulleys or wheels and axles" };
        return a === b ? { word: "same" } : { word: a < b ? c.id : vs.id };
    },
    way: (p, c, _s, arg) => {
        if (c.type !== "gears") return { problem: "way is asked of gears" };
        const g = gearAt(p, arg);
        return typeof g === "string"
            ? { problem: g }
            : { word: g.way > 0 ? "clockwise" : "anticlockwise" };
    },
    turns: (p, c, _s, arg) => {
        if (c.type !== "gears") return { problem: "turns is asked of gears" };
        const g = gearAt(p, arg);
        return typeof g === "string" ? { problem: g } : { number: g.times };
    },
};

/** Whether a periscope or a seeing picture shows sight working, by the rule each is drawn by. */
function seen(c: Concrete): boolean | null {
    const p = paramsOf(c);
    if (c.type === "periscope") return periscopeSees(n(p.flip));
    if (c.type === "seeing") return seesRight(n(p.lamp), n(p.arrows));
    return null;
}

const maze = (p: Record<string, unknown>): ReturnType<typeof mazeOf> =>
    mazeOf({
        cols: n(p.cols),
        rows: n(p.rows),
        torch: n(p.torch),
        rise: words(p.rise),
        fall: words(p.fall),
        goals: words(p.goals),
    });

const LIGHT: Record<string, Ask> = {
    reaches: (p, c) => {
        if (c.type !== "mirrors") return { problem: "reaches is asked of a mirror maze" };
        const m = maze(p);
        const { exit } = traceMaze(m);
        const goal = m.goals.find((x) => x.at === exit);
        return goal
            ? { word: goal.letter }
            : { problem: `the beam leaves the box at ${exit}, where there is no goal` };
    },
    flips: (p, c) => {
        if (c.type !== "mirrors") return { problem: "flips is asked of a mirror maze" };
        const m = maze(p);
        // every maze made by turning exactly one mirror round, and the goals the beam then reaches
        const reached = new Set<string>();
        for (const [key, kind] of m.mirrors) {
            const turned = new Map(m.mirrors);
            turned.set(key, kind === "/" ? "\\" : "/");
            const goal = m.goals.find((x) => x.at === traceMaze({ ...m, mirrors: turned }).exit);
            if (goal) reached.add(goal.letter);
        }
        return { number: reached.size };
    },
    bounces: (p, c) => {
        if (c.type !== "mirrors") return { problem: "bounces is asked of a mirror maze" };
        return { number: traceMaze(maze(p)).bounces };
    },
    sees: (_p, c) => {
        const s = seen(c);
        return s === null
            ? { problem: "sees is asked of a periscope or a seeing picture" }
            : { word: s ? "yes" : "no" };
    },
    works: (_p, c, _s, _a, vs) => {
        if (!vs) return { problem: "works compares two pictures: name the second with vs=" };
        const a = seen(c);
        const b = seen(vs);
        if (a === null || b === null)
            return { problem: "works compares periscopes or seeing pictures" };
        return a === b
            ? { problem: `both ${a ? "work" : "fail"}, so "which one" has no single answer` }
            : { word: a ? c.id : vs.id };
    },
    through: (p, c) => {
        if (c.type !== "beam") return { problem: "through is asked of a torch and a sheet" };
        const sheet = SHEETS[Math.max(0, Math.min(2, Math.round(n(p.sheet))))];
        return sheet ? { word: sheet.lets } : { problem: "the torch has no sheet in front of it" };
    },
    missing: (p, c) => {
        if (c.type !== "prism") return { problem: "missing is asked of a prism" };
        const colour = SPECTRUM[Math.round(n(p.blank))];
        return colour === undefined
            ? { problem: "no band of the prism is left blank" }
            : { word: colour };
    },
};

/** The bands of a stretched-band drawing, refusing a pitch question where they are not all the same thickness. */
function fairBands(p: Record<string, unknown>): { length: number; thick: number }[] | string {
    const list = bandsOf({
        lengths: Array.isArray(p.lengths) ? p.lengths.map(Number) : [],
        thick: Array.isArray(p.thick) ? p.thick.map(Number) : [],
    });
    if (new Set(list.map((b) => b.thick)).size > 1)
        return "the bands are not all the same thickness, so length alone does not decide which is highest";
    if (new Set(list.map((b) => b.length)).size < list.length)
        return "two bands are the same length, so there is no single highest or lowest";
    return list;
}

const SOUND: Record<string, Ask> = {
    highest: (p, c) => {
        if (c.type !== "bands") return { problem: "highest is asked of stretched bands" };
        const b = fairBands(p);
        if (typeof b === "string") return { problem: b };
        const i = b.findIndex((x) => x.length === Math.min(...b.map((y) => y.length)));
        return { word: letter(i) };
    },
    lowest: (p, c) => {
        if (c.type !== "bands") return { problem: "lowest is asked of stretched bands" };
        const b = fairBands(p);
        if (typeof b === "string") return { problem: b };
        const i = b.findIndex((x) => x.length === Math.max(...b.map((y) => y.length)));
        return { word: letter(i) };
    },
    louder: (p, c, _s, _a, vs) => {
        if (c.type !== "ricedrum" || vs?.type !== "ricedrum")
            return { problem: "louder compares two drums: of= and vs=" };
        const a = Math.round(n(p.hit));
        const b = Math.round(n(paramsOf(vs).hit));
        return a === b ? { word: "same" } : { word: a > b ? c.id : vs.id };
    },
};

/** A child on the globe named by letter, with an optional number of hours later: "a", or "b+6". */
function hourOf(p: Record<string, unknown>, arg: string): number | string {
    const m = /^([a-d])(?:\+(\d+))?$/.exec(arg.trim().toLowerCase());
    const hours = Array.isArray(p.hours) ? p.hours.map(Number) : [];
    const [, who = "", later = "0"] = m ?? [];
    if (!m) return `name a child by letter, as time(a) or time(a+6)`;
    const hour = hours["abcd".indexOf(who)];
    if (hour === undefined) return `there is no child ${who.toUpperCase()} on this globe`;
    return hour + Number(later);
}

const SKY: Record<string, Ask> = {
    phase: (p, c, _s, arg) => {
        if (c.type !== "moonphases") return { problem: "phase is asked of a month of moons" };
        const k = Number(arg);
        const day = Math.round(n(p.from)) + k * Math.round(n(p.step));
        const m = moonOn(day);
        if (!Number.isInteger(k))
            return { problem: "name the box by its number from 0, as phase(3)" };
        const phase = PHASES[m.phase];
        if (phase === undefined) return { problem: `on day ${day} the moon has no phase to name` };
        return m.near > 0.3
            ? { problem: `on day ${day} the moon is between two shapes, too close to call` }
            : { word: phase };
    },
    grows: (p, c, _s, arg) => {
        if (c.type !== "moonphases") return { problem: "grows is asked of a month of moons" };
        const day = Math.round(n(p.from)) + Number(arg) * Math.round(n(p.step));
        const m = moonOn(day);
        return m.lit < 0.05 || m.lit > 0.95
            ? {
                  problem: `on day ${day} the moon is new or full, and neither growing nor shrinking`,
              }
            : { word: m.growing ? "growing" : "shrinking" };
    },
    time: (p, c, _s, arg) => {
        if (c.type !== "globe") return { problem: "time is asked of the globe" };
        const h = hourOf(p, arg);
        if (typeof h === "string") return { problem: h };
        const at = dayAt(h);
        return at === "day" || at === "night"
            ? { word: at }
            : { problem: `at ${h % 24} o'clock it is ${at}, which is neither day nor night` };
    },
};

const FORCES: Record<string, Ask> = {
    fall: (p, c) =>
        c.type === "parachute"
            ? { word: FALLS[fallOf(n(p.weight), n(p.drag))] }
            : { problem: "fall is asked of a parachute" },
    more: (p, c) => {
        if (c.type !== "boat") return { problem: "more is asked of a boat" };
        const loaded = boatOf({ cargo: n(p.cargo), side: n(p.side), sits: n(p.sits) });
        if (loaded.sunk) return { problem: "this boat has already sunk" };
        return { number: loaded.side - loaded.depth - 1 };
    },
    slower: (p, c, _s, _a, vs) => {
        if (c.type !== "parachute" || vs?.type !== "parachute")
            return { problem: "slower compares two parachutes: of= and vs=" };
        const q = paramsOf(vs);
        if (n(p.weight) !== n(q.weight))
            return {
                problem:
                    "the two toys weigh different amounts, so it is not a fair test of the canopy",
            };
        const a = Math.round(n(p.canopy));
        const b = Math.round(n(q.canopy));
        return a === b ? { word: "same" } : { word: a > b ? c.id : vs.id };
    },
    sinks: (p, c) =>
        c.type === "boat"
            ? {
                  word: boatOf({ cargo: n(p.cargo), side: n(p.side), sits: n(p.sits) }).sunk
                      ? "yes"
                      : "no",
              }
            : { problem: "sinks is asked of a boat" },
    depth: (p, c) => {
        if (c.type !== "boat") return { problem: "depth is asked of a boat" };
        const b = boatOf({ cargo: n(p.cargo), side: n(p.side), sits: n(p.sits) });
        return b.sunk ? { problem: "this boat has sunk" } : { number: b.depth };
    },
    carries: (p, c) => {
        if (c.type !== "boat") return { problem: "carries is asked of a boat" };
        const b = boatOf({ cargo: 0, side: n(p.side), sits: n(p.sits) });
        return { number: Math.max(0, b.side - b.depth - 1) };
    },
    faster: (p, c, _s, _a, vs) => {
        if (c.type !== "pendulum" || vs?.type !== "pendulum")
            return { problem: "faster compares two pendulums: of= and vs=" };
        const w = swingsFaster(Math.round(n(p.length)), Math.round(n(paramsOf(vs).length)));
        return { word: w === "same" ? "same" : w === "a" ? c.id : vs.id };
    },
    lit: (p, c) =>
        c.type === "turbine"
            ? { number: lampsLit(n(p.wind), n(p.lamps)) }
            : { problem: "lit is asked of a wind turbine" },
    cooled: (p, c, _s, arg) => {
        if (c.type !== "wrapped") return { problem: "cooled is asked of wrapped cups" };
        if (n(p.ice) > 0)
            return {
                problem:
                    "these cups started with ice, so ask reading(a) rather than how much they cooled",
            };
        const wrap = words(p.wraps)["abcd".indexOf(arg.trim().toLowerCase())];
        return wrap === undefined
            ? { problem: "name the cup by its letter, as cooled(a)" }
            : { number: n(p.start) - readingOf(p, wrap) };
    },
    "cooled-more": (p, c) => {
        if (c.type !== "wrapped") return { problem: "cooled-more is asked of wrapped cups" };
        if (n(p.ice) > 0) return { problem: "these cups started with ice, so none of them cooled" };
        const [a, b] = words(p.wraps).map((w) => readingOf(p, w));
        if (a === undefined || b === undefined)
            return { problem: "cooled-more compares cup A with cup B, so there have to be two" };
        return b > a ? { number: b - a } : { problem: "cup A did not cool more than cup B" };
    },
    warmest: (p, c) => cupBy(p, c, "warmest"),
    coldest: (p, c) => cupBy(p, c, "coldest"),
    melted: (p, c) => {
        if (c.type !== "wrapped") return { problem: "melted is asked of wrapped cups" };
        if (n(p.ice) <= 0) return { problem: "melted is asked of cups that started with ice" };
        const left = words(p.wraps)
            .slice(0, 4)
            .map((w) => iceMelted(w, n(p.room), n(p.minutes)));
        const most = Math.max(...left);
        const hits = left.flatMap((m, i) => (m === most ? [i] : []));
        const [hit] = hits;
        return hits.length === 1 && hit !== undefined
            ? { word: letter(hit) }
            : { problem: `${hits.length} cups have melted as much, so none has melted most` };
    },
    reading: (p, c, _s, arg) => {
        if (c.type !== "wrapped") return { problem: "reading is asked of wrapped cups" };
        const wrap = words(p.wraps)["abcd".indexOf(arg.trim().toLowerCase())];
        return wrap === undefined
            ? { problem: "name the cup by its letter, as reading(b)" }
            : { number: readingOf(p, wrap) };
    },
};

/** What a wrapped cup's thermometer reads, by the drawing's rule for a hot cup or one that started with ice. */
const readingOf = (p: Record<string, unknown>, wrap: string): number =>
    n(p.ice) > 0
        ? iceReading(wrap, n(p.room), n(p.minutes))
        : cupReading(wrap, n(p.start), n(p.minutes), n(p.room));

/** The letter of the cup that stayed warmest or went coldest, refusing two cups that tie. */
function cupBy(p: Record<string, unknown>, c: Concrete, which: "warmest" | "coldest"): Got {
    if (c.type !== "wrapped") return { problem: `${which} is asked of wrapped cups` };
    const temps = words(p.wraps)
        .slice(0, 4)
        .map((w) => readingOf(p, w));
    const best = which === "warmest" ? Math.max(...temps) : Math.min(...temps);
    const hits = temps.flatMap((t, i) => (t === best ? [i] : []));
    const [hit] = hits;
    return hits.length === 1 && hit !== undefined
        ? { word: letter(hit) }
        : { problem: `${hits.length} cups end at ${best} degrees, so none is the ${which}` };
}

export const PHYSICS: Record<string, CodeChecker> = {
    "physics.sound": checker(
        'Works out a question about sound from the drawing: of stretched bands all the same thickness, `highest` and `lowest` are the letters of the shortest and the longest shaking part, refusing bands of different thickness or two of one length; with `vs` naming a second rice drum, `louder` is the one hit harder, or "same".',
        ["bands", "ricedrum"],
        SOUND,
    ),
    "physics.sky": checker(
        "Works out the sky from the drawing: of a month of moons, `phase(k)` names the moon in box k (new moon, crescent, half moon, gibbous or full moon, refusing a day too close to the line between two) and `grows(k)` says whether it is growing or shrinking; of the globe, `time(a)` is day or night for child A, and `time(a+6)` the same six hours later as the Earth turns, refusing sunrise and sunset themselves.",
        ["moonphases", "globe"],
        SKY,
    ),
    "physics.forces": checker(
        'Works out what forces do, by the rule each drawing is drawn by: of a parachute, `fall` is faster, steady or slower from its weight and the push of the air, and with `vs` naming a second toy of the same weight, `slower` is the one with the wider canopy, or "same"; of a boat, `sinks` is yes or no, `depth` how many squares deep it sits, and `carries` the most blocks it takes before the water comes over; with `vs`, `faster` is the pendulum with the shorter string, or "same" whatever the weights; of a wind turbine, `lit` is how many lamps are on; of wrapped cups, `warmest` and `coldest` are the letters of the warmest and the coldest cup at the end (refusing a tie), `reading(b)` the temperature cup B ends at, and for cups that started with ice, `melted` the letter of the cup whose ice has melted most (refusing a tie).',
        ["parachute", "boat", "pendulum", "turbine", "wrapped"],
        FORCES,
    ),
    "physics.light": checker(
        "Works out where light goes, by the rule each drawing is drawn by: of a mirror maze, `reaches` is the letter of the goal the beam gets to (refusing a maze whose beam misses every goal) and `bounces` how many mirrors it turns at; `sees` is whether a periscope shows the bird or a seeing picture shows how we see, and with `vs` naming a second, `works` is the one that does; of a torch and a sheet, `through` is how much light gets past it, all, some or none; of a prism, `missing` is the colour of the blank band.",
        ["mirrors", "periscope", "seeing", "beam", "prism"],
        LIGHT,
    ),
    "physics.circuit": checker(
        'Works out what a circuit does, from a series, circuit or tester drawing, by the rule it is drawn by: `lights`, `sounds` and `turns` are yes or no; `fault` is why it stays dark ("There is no cell", "The switch is open" or "A wire is loose", and it must have exactly one); with `vs` naming a second loop, `dark` is the one that stays dark and `brighter` the brighter of the two, or "same"; `brighten` and `dimmer` pick the one option, from add a cell, take a cell away, add a bulb, take a bulb away, open the switch and close the switch, that makes the bulbs brighter or dimmer, and `mends` the one option (those, or clip the wire back on) that makes a dark loop light; `faults` counts what is wrong with a loop; with `vs`, `which` says whether both light, neither, or one only ("a only"). Brightness is compared only in loops of cells and bulbs.',
        ["series", "circuit", "tester"],
        CIRCUIT,
    ),
    "physics.machine": checker(
        'Works out what a simple machine does, by the rule it is drawn by: of a lever, `lifts` is whether the push lifts the stone (yes or no, refusing a lever that balances) and `balance` the push that holds it level; `pull` is the pull a pulley or a wheel and axle needs, and with `vs` naming a second, `easier` is the one needing less, or "same"; of gears, `way(b)` and `way(c)` say which way that gear turns, clockwise or anticlockwise, and `turns(b)` and `turns(c)` how many times it turns for one turn of A.',
        ["lever", "pulley", "wheelaxle", "gears"],
        MACHINE,
    ),
    "physics.things": checker(
        "Works out a question about a tray of things from the table the drawing is drawn from: `count(prop)` is how many of them have a property and `only(prop)` is the letter of the one thing that does, refusing a tray where none or two do. The properties are conducts, insulates, metal, magnetic, metal-not-magnetic and source (gives out its own light), each also as not-...; a thing the table says nothing about for that property cannot be in the question.",
        ["things"],
        TRAY,
    ),
};
