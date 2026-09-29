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
import { secondsDown, sunkBy } from "../parts/science/droptube";
import { eclipseOf } from "../parts/science/eclipse";
import { clipsHeld } from "../parts/science/electromagnet";
import { efficiencyOf, energyBands } from "../parts/science/energyflow";
import { ballPasses, gapAt, lidEase } from "../parts/science/expansion";
import { gearTeeth, gearTurns } from "../parts/science/gears";
import { beadsFallen, canReading, roomReadings } from "../parts/science/heatflow";
import { leverTips, pivotStep } from "../parts/science/lever";
import { magnifies, tubeLength } from "../parts/science/lens";
import { reflectOut, targetHit } from "../parts/science/mirrorangle";
import { mazeOf, traceMaze } from "../parts/science/mirrors";
import { PHASE_NAMES, PHASES, moonOn } from "../parts/science/moonphases";
import { FALLS, fallOf } from "../parts/science/parachute";
import { branchGlow } from "../parts/science/parallel";
import { swingsFaster } from "../parts/science/pendulum";
import { periscopeSees } from "../parts/science/periscope";
import { SPECTRUM } from "../parts/science/prism";
import { bentAngle, looksDeep } from "../parts/science/refraction";
import { pulleyPull } from "../parts/science/pulley";
import { seesRight } from "../parts/science/seeing";
import { sledgeBack, sledgeMotion } from "../parts/science/sledgeforce";
import { offSquare, panelWatts } from "../parts/science/solarpanel";
import { jetRange, tankOf } from "../parts/science/spouts";
import { inStep, springStretch } from "../parts/science/spring";
import { poleHeight, turnIn } from "../parts/science/starmap";
import { type Loop, loopGlow, loopOf, loopWorks } from "../parts/science/series";
import { dayAt } from "../parts/science/sunpath";
import { THINGS } from "../parts/science/tester";
import { midnightHeight, noonHeight, sunAt, sunOverhead } from "../parts/science/tilt";
import { lampsLit } from "../parts/science/turbine";
import { hertzOf } from "../parts/science/wave";
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
        if (c.type === "parallel" || vs.type === "parallel") return brighterBulb(c, vs);
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
    holds: (p, c) =>
        c.type === "electromagnet"
            ? { number: clipsHeld(coilParams(p)) }
            : { problem: "holds is asked of an electromagnet" },
    stronger: (p, c, _s, _a, vs) => {
        if (c.type !== "electromagnet" || vs?.type !== "electromagnet")
            return { problem: "stronger compares two electromagnets: of= and vs=" };
        const a = clipsHeld(coilParams(p));
        const b = clipsHeld(coilParams(paramsOf(vs)));
        return a === b ? { word: "same" } : { word: a > b ? c.id : vs.id };
    },
};

/** How bright each bulb is, with one bulb on one cell as 1, in a loop or a parallel circuit of cells and bulbs, or null. */
function bulbGlow(c: Concrete): number | null {
    if (c.type === "parallel") {
        const p = paramsOf(c);
        return Math.max(...branchGlow(n(p.cells), n(p.branches), branchesClosed(p)));
    }
    const { loop, glow } = loopIn(c);
    return onlyBulbs(loop) ? glow : null;
}

const branchesClosed = (p: Record<string, unknown>): number[] =>
    Array.isArray(p.closed) ? p.closed.map(Number) : [];

/** The loop or circuit whose bulbs are brighter, or "same", for two drawings of cells and bulbs. */
function brighterBulb(c: Concrete, vs: Concrete): Got {
    const a = bulbGlow(c);
    const b = bulbGlow(vs);
    if (a === null || b === null)
        return {
            problem:
                "brightness is compared only between circuits of cells and bulbs, where the rule is exact",
        };
    return a === b ? { word: "same" } : { word: a > b ? c.id : vs.id };
}

/** The glow of each branch of a parallel circuit, which is lit whenever its own switch is closed. */
const branchesOf = (p: Record<string, unknown>): number[] =>
    branchGlow(n(p.cells), n(p.branches), branchesClosed(p));

const PARALLEL: Record<string, Ask> = {
    lit: (p) => ({ number: branchesOf(p).filter((g) => g > 0).length }),
    on: (p, _c, _s, arg) => {
        const g = branchesOf(p)["abc".indexOf(arg.trim().toLowerCase())];
        return g === undefined
            ? { problem: "name a branch by its letter, as on(b)" }
            : { word: g > 0 ? "yes" : "no" };
    },
    brighter: (_p, c, _s, _a, vs) =>
        vs
            ? brighterBulb(c, vs)
            : { problem: "brighter compares two circuits: name the second with vs=" },
    draws: (p) => {
        const on = branchesOf(p).filter((g) => g > 0).length;
        return on > 0
            ? { number: on }
            : { problem: "every switch is open, so the cells give no current at all" };
    },
};

const coilParams = (
    p: Record<string, unknown>,
): { turns: number; cells: number; core: number; closed: number } => ({
    turns: n(p.turns),
    cells: n(p.cells),
    core: n(p.core),
    closed: n(p.closed),
});

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
        if (c.type === "mirrorangle") {
            const hit = targetHit(
                Math.round(n(p.angle)),
                Array.isArray(p.targets) ? p.targets.map(Number) : [],
            );
            return hit
                ? { word: hit }
                : { problem: `a beam in at ${n(p.angle)} degrees lands on none of the targets` };
        }
        if (c.type !== "mirrors")
            return { problem: "reaches is asked of a mirror maze or a beam on a mirror" };
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
    out: (p, c) =>
        c.type === "mirrorangle"
            ? { number: reflectOut(Math.round(n(p.angle))) }
            : { problem: "out is asked of a beam on a mirror" },
    focus: (p, c) =>
        c.type === "lens" && p.mode !== "telescope"
            ? { number: Math.max(4, Math.min(40, Math.round(n(p.focus) / 2) * 2)) }
            : { problem: "focus is asked of a single lens" },
    sharper: (p, c, _s, _a, vs) => {
        if (c.type !== "lens" || vs?.type !== "lens")
            return { problem: "sharper compares two lenses: of= and vs=" };
        const a = n(p.focus);
        const b = n(paramsOf(vs).focus);
        return a === b ? { word: "same" } : { word: a < b ? c.id : vs.id };
    },
    magnify: (p, c) =>
        c.type === "lens" && p.mode === "telescope"
            ? { number: magnifies(n(p.objective), n(p.eyepiece)) }
            : { problem: "magnify is asked of a telescope" },
    tube: (p, c) =>
        c.type === "lens" && p.mode === "telescope"
            ? { number: tubeLength(n(p.objective), n(p.eyepiece)) }
            : { problem: "tube is asked of a telescope" },
    missing: (p, c) => {
        if (c.type !== "prism") return { problem: "missing is asked of a prism" };
        const colour = SPECTRUM[Math.round(n(p.blank))];
        return colour === undefined
            ? { problem: "no band of the prism is left blank" }
            : { word: colour };
    },
    bent: (p, c) =>
        c.type === "refraction" && Math.round(n(p.mode)) === 0
            ? { number: bentAngle(n(p.angle), n(p.into)) }
            : { problem: "bent is asked of a beam going into water or glass" },
    turns: (p, c) =>
        c.type === "refraction" && Math.round(n(p.mode)) === 0
            ? { number: Math.round(n(p.angle)) - bentAngle(n(p.angle), n(p.into)) }
            : { problem: "turns is asked of a beam going into water or glass" },
    looks: (p, c) =>
        c.type === "refraction" && Math.round(n(p.mode)) === 3
            ? { number: looksDeep(Math.round(n(p.depth))) }
            : { problem: "looks is asked of a coin under water seen from above" },
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

/** A screen's traces as numbers, and the letter of the one trace that has the most (or least) of `key`, refusing a tie. */
function traceBy(p: Record<string, unknown>, key: "waves" | "heights", most: boolean): Got {
    const list = (Array.isArray(p[key]) ? p[key] : []).slice(0, 3).map(Number);
    const best = most ? Math.max(...list) : Math.min(...list);
    const hits = list.flatMap((x, i) => (x === best ? [i] : []));
    const [hit] = hits;
    return hits.length === 1 && hit !== undefined
        ? { word: letter(hit) }
        : {
              problem: `${hits.length} traces have ${best} ${key === "waves" ? "waves" : "as tall a wave"}, so there is no single one`,
          };
}

const SOUND: Record<string, Ask> = {
    highest: (p, c) => {
        if (c.type === "wave") return traceBy(p, "waves", true);
        if (c.type !== "bands") return { problem: "highest is asked of stretched bands" };
        const b = fairBands(p);
        if (typeof b === "string") return { problem: b };
        const i = b.findIndex((x) => x.length === Math.min(...b.map((y) => y.length)));
        return { word: letter(i) };
    },
    lowest: (p, c) => {
        if (c.type === "wave") return traceBy(p, "waves", false);
        if (c.type !== "bands") return { problem: "lowest is asked of stretched bands" };
        const b = fairBands(p);
        if (typeof b === "string") return { problem: b };
        const i = b.findIndex((x) => x.length === Math.max(...b.map((y) => y.length)));
        return { word: letter(i) };
    },
    loudest: (p, c) =>
        c.type === "wave"
            ? traceBy(p, "heights", true)
            : { problem: "loudest is asked of sounds on a screen" },
    quietest: (p, c) =>
        c.type === "wave"
            ? traceBy(p, "heights", false)
            : { problem: "quietest is asked of sounds on a screen" },
    hertz: (p, c, _s, arg) => {
        if (c.type !== "wave") return { problem: "hertz is asked of sounds on a screen" };
        const i = "abc".indexOf(arg.trim().toLowerCase());
        const waves = Array.isArray(p.waves) ? p.waves.map(Number) : [];
        const w = waves[i];
        return i < 0 || w === undefined
            ? { problem: "name the screen by its letter, as hertz(a)" }
            : { number: hertzOf(w, n(p.across)) };
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

/** A place on the tilted Earth named by its letter, and where the sun is overhead that day. */
function placeOn(p: Record<string, unknown>, arg: string): { lat: number; over: number } | string {
    const i = "abc".indexOf(arg.trim().toLowerCase());
    const lat = (Array.isArray(p.places) ? p.places.map(Number) : [])[i];
    return i < 0 || lat === undefined
        ? `name a place by its letter, as sun(a)`
        : { lat, over: sunOverhead(n(p.season), n(p.tilt)) };
}

const SKY: Record<string, Ask> = {
    sun: (p, c, _s, arg) => {
        if (c.type !== "tilt") return { problem: "sun is asked of the tilted Earth" };
        const at = placeOn(p, arg);
        if (typeof at === "string") return { problem: at };
        const s = sunAt(at.lat, at.over);
        return s === "edge"
            ? {
                  problem: `at ${at.lat} degrees the sun just touches the horizon, which is neither answer`,
              }
            : { word: s };
    },
    noon: (p, c, _s, arg) => {
        if (c.type !== "tilt") return { problem: "noon is asked of the tilted Earth" };
        const at = placeOn(p, arg);
        if (typeof at === "string") return { problem: at };
        const h = noonHeight(at.lat, at.over);
        return h > 0
            ? { number: h }
            : { problem: `at ${at.lat} degrees the sun does not rise that day` };
    },
    midnight: (p, c, _s, arg) => {
        if (c.type !== "tilt") return { problem: "midnight is asked of the tilted Earth" };
        const at = placeOn(p, arg);
        if (typeof at === "string") return { problem: at };
        const h = midnightHeight(at.lat, at.over);
        return h > 0
            ? { number: h }
            : { problem: `at ${at.lat} degrees the sun is below the horizon at midnight` };
    },
    eclipse: (p, c) =>
        c.type === "eclipse"
            ? { word: eclipseOf(n(p.moon), n(p.offset)) }
            : { problem: "eclipse is asked of the sun, the Earth and the moon side on" },
    shape: (p, c) => {
        if (c.type !== "orbit")
            return { problem: "shape is asked of the Earth and the moon from above" };
        const k = Math.round(n(p.moon));
        const phase = PHASES[k];
        return phase === undefined ? { problem: "there is no moon on the ring" } : { word: phase };
    },
    earth: (p, c) => {
        if (c.type !== "orbit")
            return { problem: "earth is asked of the Earth and the moon from above" };
        const k = Math.round(n(p.moon));
        const phase = k < 0 ? undefined : PHASES[(k + 4) % 8];
        return phase === undefined
            ? { problem: "there is no moon on the ring to stand on" }
            : { word: phase.includes("moon") ? phase.replace("moon", "Earth") : `${phase} Earth` };
    },
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
    name: (p, c, _s, arg) => {
        if (c.type !== "moonphases") return { problem: "name is asked of a month of moons" };
        const k = Number(arg);
        if (!Number.isInteger(k))
            return { problem: "name the box by its number from 0, as name(3)" };
        const day = Math.round(n(p.from)) + k * Math.round(n(p.step));
        const m = moonOn(day);
        const name = PHASE_NAMES[m.phase];
        if (name === undefined) return { problem: `on day ${day} the moon has no phase to name` };
        return m.near > 0.3
            ? { problem: `on day ${day} the moon is between two shapes, too close to call` }
            : { word: name };
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
    turned: (p, c) =>
        c.type === "starmap"
            ? {
                  number: turnIn(
                      Math.round(n(p.every)) *
                          (Math.max(1, Math.min(4, Math.round(n(p.looks)))) - 1),
                  ),
              }
            : { problem: "turned is asked of the Plough through a night" },
    place: (p, c, _s, arg) => {
        if (c.type !== "starmap")
            return { problem: "place is asked of the Plough through a night" };
        const k = Number(arg);
        if (!Number.isInteger(k) || k < 0 || k > 3)
            return { problem: "name the look by its number from 0, as place(2)" };
        // clockwise from straight above the pole star: the Plough is above it at sidereal hour 13
        const hour = Math.round(n(p.sky)) + k * Math.round(n(p.every));
        const angle = (((turnIn(13 - hour) % 360) + 360) % 360) / 90;
        const quarter = Math.round(angle);
        return Math.abs(angle - quarter) > 0.25
            ? { problem: `at look ${k} the Plough is between two of above, right, below and left` }
            : { word: ["above", "to the right", "below", "to the left"][quarter % 4] ?? "above" };
    },
    pole: (p, c) =>
        c.type === "starmap"
            ? { number: poleHeight(Math.round(n(p.lat))) }
            : { problem: "pole is asked of the pole star over the horizon" },
};

const forcesOf = (x: unknown): number[] =>
    (Array.isArray(x) ? x.map(Number) : []).filter((f) => f > 0);

/** The letter of the rod that has dropped the most beads, refusing rods of different thickness and a tie. */
function bestRod(p: Record<string, unknown>): Got {
    const rods = words(p.rods).slice(0, 4);
    const thick = (Array.isArray(p.thick) ? p.thick.map(Number) : []).slice(0, rods.length);
    if (new Set(thick).size > 1)
        return {
            problem: "the rods are not all as thick, so it is not a fair test of the material",
        };
    const fallen = rods.map((r) => beadsFallen(r, n(p.minutes)));
    const most = Math.max(...fallen);
    const hits = fallen.flatMap((x, i) => (x === most ? [i] : []));
    const [hit] = hits;
    return hits.length === 1 && hit !== undefined
        ? { word: letter(hit) }
        : { problem: `${hits.length} rods have dropped ${most} beads, so none is the best` };
}

const FORCES: Record<string, Ask> = {
    motion: (p, c) =>
        c.type === "sledgeforce"
            ? {
                  word: sledgeMotion(
                      forcesOf(p.forward).slice(0, 3),
                      forcesOf(p.back).slice(0, 2),
                      n(p.moving),
                  ),
              }
            : { problem: "motion is asked of a sledge" },
    net: (p, c) => {
        if (c.type !== "sledgeforce") return { problem: "net is asked of a sledge" };
        const sum = (x: number[]): number => x.reduce((s, f) => s + f, 0),
            forward = forcesOf(p.forward).slice(0, 3),
            back = sledgeBack(forward, forcesOf(p.back).slice(0, 2), n(p.moving));
        return { number: Math.abs(sum(forward) - sum(back)) };
    },
    fallen: (p, c, _s, arg) => {
        if (c.type !== "heatflow" || Math.round(n(p.mode)) !== 0)
            return { problem: "fallen is asked of rods in hot water" };
        const rod = words(p.rods)["abcd".indexOf(arg.trim().toLowerCase())];
        return rod === undefined
            ? { problem: "name the rod by its letter, as fallen(a)" }
            : { number: beadsFallen(rod, n(p.minutes)) };
    },
    best: (p, c) =>
        c.type === "heatflow" && Math.round(n(p.mode)) === 0
            ? bestRod(p)
            : { problem: "best is asked of rods in hot water" },
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
    furthest: (p, c) => {
        if (c.type !== "spouts") return { problem: "furthest is asked of a tank with holes" };
        const t = tankOf(spoutParams(p));
        const r = t.holes.map((h) => jetRange(h));
        const most = Math.max(...r);
        const hits = r.flatMap((x, i) => (x === most ? [i] : []));
        const [hit] = hits;
        return hits.length === 1 && hit !== undefined
            ? { word: letter(hit) }
            : { problem: `${hits.length} jets land equally far` };
    },
    further: (p, c, _s, _a, vs) => {
        if (c.type !== "spouts" || vs?.type !== "spouts")
            return { problem: "further compares hole A of two tanks: of= and vs=" };
        const range = (q: Record<string, unknown>): number => {
            const t = tankOf(spoutParams(q));
            return jetRange(t.holes[0] ?? 0);
        };
        const a = range(p);
        const b = range(paramsOf(vs));
        return Math.abs(a - b) < 1e-9 ? { word: "same" } : { word: a > b ? c.id : vs.id };
    },
    fastest: (p, c) => byTube(p, c, "fastest"),
    slowest: (p, c) => byTube(p, c, "slowest"),
    bottom: (p, c, _s, arg) => {
        if (c.type !== "droptube") return { problem: "bottom is asked of shapes in tubes" };
        const shape = words(p.shapes)["abcd".indexOf(arg.trim().toLowerCase())];
        return shape === undefined
            ? { problem: "name the tube by its letter, as bottom(a)" }
            : { number: secondsDown(shape) };
    },
    sunk: (p, c, _s, arg) => {
        if (c.type !== "droptube") return { problem: "sunk is asked of shapes in tubes" };
        const shape = words(p.shapes)["abcd".indexOf(arg.trim().toLowerCase())];
        return shape === undefined
            ? { problem: "name the tube by its letter, as sunk(a)" }
            : { number: sunkBy(shape, n(p.time)) };
    },
    reading: (p, c, _s, arg) => {
        if (c.type === "heatflow" && Math.round(n(p.mode)) === 2) {
            const can = words(p.cans)["abc".indexOf(arg.trim().toLowerCase())];
            return can === undefined
                ? { problem: "name a can in the sun by its letter, as reading(a)" }
                : { number: canReading(can, n(p.insun)) };
        }
        if (c.type === "heatflow") {
            const t = roomReadings(n(p.heater))["abc".indexOf(arg.trim().toLowerCase())];
            return Math.round(n(p.mode)) !== 1 || t === undefined
                ? { problem: "name a thermometer in the hut by its letter, as reading(a)" }
                : { number: t };
        }
        if (c.type !== "wrapped") return { problem: "reading is asked of wrapped cups" };
        const wrap = words(p.wraps)["abcd".indexOf(arg.trim().toLowerCase())];
        return wrap === undefined
            ? { problem: "name the cup by its letter, as reading(b)" }
            : { number: readingOf(p, wrap) };
    },
    gap: (p, c) => {
        const mode = Math.round(n(p.mode));
        return c.type === "expansion" && (mode === 0 || mode === 2)
            ? { number: gapAt(n(p.span), n(p.temp)) }
            : { problem: "gap is asked of a bridge's joint or two rails" };
    },
    passes: (p, c) =>
        c.type === "expansion" && Math.round(n(p.mode)) === 1
            ? { word: ballPasses(Math.round(n(p.ball)), Math.round(n(p.ring))) ? "yes" : "no" }
            : { problem: "passes is asked of the ball and the ring" },
    loosens: (p, c) => {
        if (c.type !== "expansion" || Math.round(n(p.mode)) !== 3)
            return { problem: "loosens is asked of the jar and its lid" };
        const ease = lidEase(Math.round(n(p.lid)), Math.round(n(p.jar)));
        return Math.abs(ease) < 1e-9
            ? { problem: "the lid and the jar are at one temperature, so the lid is as it was" }
            : { word: ease > 0 ? "yes" : "no" };
    },
    stretch: (p, c, _s, arg) => springBy(p, c, arg, "stretch"),
    length: (p, c, _s, arg) => springBy(p, c, arg, "length"),
    instep: (p, c) =>
        c.type === "spring"
            ? { word: inStep(n(p.load), n(p.limit)) ? "yes" : "no" }
            : { problem: "instep is asked of a spring" },
};

/**
 * How far a spring stretches, or how long it is, with its own load or with `arg` newtons on it,
 * refusing a load past the spring's limit, where the stretch is no longer in step with the load.
 */
function springBy(
    p: Record<string, unknown>,
    c: Concrete,
    arg: string,
    what: "stretch" | "length",
): Got {
    if (c.type !== "spring") return { problem: `${what} is asked of a spring` };
    const load = arg.trim() === "" ? Math.round(n(p.load)) : Number(arg);
    if (!Number.isInteger(load) || load < 0 || load > 10)
        return { problem: `name a load from 0 to 10 newtons, as ${what}(4)` };
    if (!inStep(load, n(p.limit)))
        return {
            problem: `${load} N is past this spring's limit, where the stretch is not in step`,
        };
    const s = springStretch(load, n(p.per), n(p.limit));
    return { number: what === "stretch" ? s : Math.round(n(p.natural)) + s };
}

const spoutParams = (
    p: Record<string, unknown>,
): { depth: number; wide: number; holes: number[] } => ({
    depth: n(p.depth),
    wide: n(p.wide),
    holes: Array.isArray(p.holes) ? p.holes.map(Number) : [],
});

/** The letter of the shape that reaches the bottom first or last, refusing lumps of different weights and ties. */
function byTube(p: Record<string, unknown>, c: Concrete, which: "fastest" | "slowest"): Got {
    if (c.type !== "droptube") return { problem: `${which} is asked of shapes in tubes` };
    const shapes = words(p.shapes).slice(0, 4);
    const grams = Array.isArray(p.grams) ? p.grams.map(Number).slice(0, shapes.length) : [];
    if (new Set(grams).size > 1)
        return { problem: "the lumps weigh different amounts, so it is not a fair test of shape" };
    const t = shapes.map((s) => secondsDown(s));
    const best = which === "fastest" ? Math.min(...t) : Math.max(...t);
    const hits = t.flatMap((x, i) => (x === best ? [i] : []));
    const [hit] = hits;
    return hits.length === 1 && hit !== undefined
        ? { word: letter(hit) }
        : { problem: `${hits.length} shapes take as long, so none is the ${which}` };
}

/** What a wrapped cup's thermometer reads, by the drawing's rule for a hot cup or one that started with ice. */
const readingOf = (p: Record<string, unknown>, wrap: string): number =>
    n(p.ice) > 0
        ? iceReading(wrap, n(p.room), n(p.minutes))
        : cupReading(wrap, n(p.start), n(p.minutes), n(p.room));

/** The letter of the cup that stayed warmest or went coldest, refusing two cups that tie. */
function cupBy(p: Record<string, unknown>, c: Concrete, which: "warmest" | "coldest"): Got {
    const mode = c.type === "heatflow" ? Math.round(n(p.mode)) : -1;
    if (c.type !== "wrapped" && mode !== 1 && mode !== 2)
        return {
            problem: `${which} is asked of wrapped cups, the hut's thermometers or cans in the sun`,
        };
    const temps =
        mode === 2
            ? words(p.cans)
                  .slice(0, 3)
                  .map((can) => canReading(can, n(p.insun)))
            : mode === 1
              ? [...roomReadings(n(p.heater))]
              : words(p.wraps)
                    .slice(0, 4)
                    .map((w) => readingOf(p, w));
    const best = which === "warmest" ? Math.max(...temps) : Math.min(...temps);
    const hits = temps.flatMap((t, i) => (t === best ? [i] : []));
    const [hit] = hits;
    return hits.length === 1 && hit !== undefined
        ? { word: letter(hit) }
        : { problem: `${hits.length} cups end at ${best} degrees, so none is the ${which}` };
}

const bandsIn = (p: Record<string, unknown>): ReturnType<typeof energyBands> =>
    energyBands({
        input: n(p.input),
        useful: n(p.useful),
        wasted: Array.isArray(p.wasted) ? p.wasted.map(Number) : [],
        blank: n(p.blank),
    });

/** The bands as drawn add up, or the reason they do not: energy in is all accounted for coming out. */
function balanced(p: Record<string, unknown>): string | null {
    const e = bandsIn(p);
    if (e.useful < 0 || e.wasted.some((w) => w < 0))
        return "the band left to work out comes to less than nothing";
    const out = e.useful + e.wasted.reduce((s, w) => s + w, 0);
    return out === e.input
        ? null
        : `the bands out come to ${out} and the band in is ${e.input}, so they do not add up`;
}

const ENERGY: Record<string, Ask> = {
    missing: (p) => {
        const wrong = balanced(p);
        if (wrong) return { problem: wrong };
        const e = bandsIn(p);
        const b = Math.round(n(p.blank));
        const v = b === 0 ? e.input : b === 1 ? e.useful : e.wasted[b - 2];
        return v === undefined ? { problem: "no band is left as a question mark" } : { number: v };
    },
    efficiency: (p) => {
        const wrong = balanced(p);
        if (wrong) return { problem: wrong };
        const e = bandsIn(p);
        return { number: efficiencyOf(e.input, e.useful) };
    },
    wasted: (p) => {
        const wrong = balanced(p);
        if (wrong) return { problem: wrong };
        const e = bandsIn(p);
        return { number: e.input - e.useful };
    },
};

const PANEL: Record<string, Ask> = {
    watts: (p) => ({
        number: panelWatts(n(p.rated), n(p.light), n(p.sun), n(p.slope)),
    }),
    off: (p) => ({ number: offSquare(n(p.sun), n(p.slope)) }),
    square: (p) => ({ number: 90 - Math.max(5, Math.min(90, Math.round(n(p.sun)))) }),
    more: (p, c, _s, _a, vs) => {
        if (vs?.type !== "solarpanel")
            return { problem: "more compares two solar panels: of= and vs=" };
        const q = paramsOf(vs);
        const a = panelWatts(n(p.rated), n(p.light), n(p.sun), n(p.slope));
        const b = panelWatts(n(q.rated), n(q.light), n(q.sun), n(q.slope));
        return a === b ? { word: "same" } : { word: a > b ? c.id : vs.id };
    },
    gain: (p, _c, _s, _a, vs) => {
        if (vs?.type !== "solarpanel")
            return { problem: "gain compares two solar panels: of= and vs=" };
        const q = paramsOf(vs);
        return {
            number: Math.abs(
                panelWatts(n(p.rated), n(p.light), n(p.sun), n(p.slope)) -
                    panelWatts(n(q.rated), n(q.light), n(q.sun), n(q.slope)),
            ),
        };
    },
};

/** Asks chosen by the kind of drawing `of` names, for a checker that reads drawings with different asks. */
function bySort(table: Record<string, Record<string, Ask>>): Record<string, Ask> {
    const names = new Set(Object.values(table).flatMap((t) => Object.keys(t)));
    return Object.fromEntries(
        [...names].map((name): [string, Ask] => [
            name,
            (p, c, scene, arg, vs, settings) => {
                const ask = table[c.type]?.[name];
                return ask
                    ? ask(p, c, scene, arg, vs, settings)
                    : { problem: `${name} is not asked of a ${c.type}` };
            },
        ]),
    );
}

export const PHYSICS: Record<string, CodeChecker> = {
    "physics.energy": checker(
        "Works out where the energy goes in a machine drawn as bands, by the rule that what goes in all comes out: `missing` is the energy in the band left as a question mark, `wasted` the energy that does not come out useful, and `efficiency` the useful share of every hundred parts put in. It refuses bands that do not add up. Of a solar panel, `watts` is what its meter reads, its watts square on in full sun times the share of light the cloud lets through times the cosine of `off`, the angle between the sun's rays and the panel's upright, and `square` is the tilt from flat that faces the sun square on; with `vs` naming a second panel, `more` is the one whose meter reads more, or the word same, and `gain` how many watts more it reads.",
        ["energyflow", "solarpanel"],
        bySort({ energyflow: ENERGY, solarpanel: PANEL }),
    ),
    "physics.sound": checker(
        'Works out a question about sound from the drawing: of stretched bands all the same thickness, `highest` and `lowest` are the letters of the shortest and the longest shaking part, refusing bands of different thickness or two of one length; with `vs` naming a second rice drum, `louder` is the one hit harder, or "same"; of sounds on a screen, `highest` and `lowest` are the letters of the traces with the most and the fewest waves, `loudest` and `quietest` those with the tallest and the shortest, and `hertz(a)` the vibrations a second of trace A, its waves over the time the screen spans.',
        ["bands", "ricedrum", "wave"],
        SOUND,
    ),
    "physics.sky": checker(
        "Works out the sky from the drawing: of a month of moons, `phase(k)` names the moon in box k (new moon, crescent, half moon, gibbous or full moon, refusing a day too close to the line between two), `name(k)` its astronomer's name (new moon, waxing crescent, first quarter, waxing gibbous, full moon, waning gibbous, last quarter or waning crescent, refusing the same days) and `grows(k)` says whether it is growing or shrinking; of the globe, `time(a)` is day or night for child A, and `time(a+6)` the same six hours later as the Earth turns, refusing sunrise and sunset themselves; of the tilted Earth, `sun(a)` is whether place A has the sun all day, all night, or day and night (refusing a place whose circle just touches the line between them), and `noon(a)` and `midnight(a)` how many degrees the sun stands above its horizon then, refusing a sun below it; of the sun, the Earth and the moon side on, `eclipse` is solar eclipse, lunar eclipse or no eclipse; of the Earth and the moon from above, `shape` is the moon's shape seen from the Earth and `earth` the Earth's shape seen from the moon; of the Plough through a night, `turned` is how many degrees the sky turns round the pole star from the first look to the last, at 15 an hour, and `place(k)` where the Plough stands at look k from 0 (above, to the right, below or to the left of the pole star, refusing a look between two), and of the pole star over the horizon, `pole` is its height in degrees, which is the latitude.",
        ["moonphases", "globe", "tilt", "eclipse", "orbit", "starmap"],
        SKY,
    ),
    "physics.forces": checker(
        'Works out what forces do, by the rule each drawing is drawn by: of a parachute, `fall` is faster, steady or slower from its weight and the push of the air, and with `vs` naming a second toy of the same weight, `slower` is the one with the wider canopy, or "same"; of a boat, `sinks` is yes or no, `depth` how many squares deep it sits, and `carries` the most blocks it takes before the water comes over; with `vs`, `faster` is the pendulum with the shorter string, or "same" whatever the weights; of a wind turbine, `lit` is how many lamps are on; of a tank with holes, `furthest` is the letter of the jet that lands furthest, and with `vs` naming a second tank, `further` is the tank whose hole A throws its jet further, or "same"; of shapes sinking in tubes, `fastest` and `slowest` are the letters of the first and last to reach the bottom (refusing lumps of different weights), `bottom(a)` the seconds shape A takes to reach it and `sunk(a)` how many centimetres it has sunk by the time drawn; of wrapped cups, `warmest` and `coldest` are the letters of the warmest and the coldest cup at the end (refusing a tie), `reading(b)` the temperature cup B ends at, and for cups that started with ice, `melted` the letter of the cup whose ice has melted most (refusing a tie); of a sledge, `motion` is what the forces along the snow do to it (speeds up, keeps a steady speed, slows down, starts to move or stays still) and `net` the difference between the forward and the back forces as they act, where on a still sledge friction matches the pull up to its most, so a sledge that stays still has no net force; of rods in hot water, `fallen(a)` is how many beads rod A has dropped and `best` the letter of the rod that dropped most (refusing rods of different thickness and a tie); of the hut, `reading(a)` is thermometer A and `warmest` and `coldest` its warmest and coldest; of cans in the sun, `reading(a)` is can A and `warmest` and `coldest` the letters of the warmest and coldest can. Of a bridge\'s joint or two rails, `gap` is the gap in millimetres at the air\'s temperature; of the brass ball and ring, `passes` is whether the ball drops through (yes or no); of a jar, `loosens` is whether the lid ends looser than it was screwed on (yes or no). Of a spring, `stretch` and `length` are its stretch and its whole length in centimetres with its load, and `stretch(5)` and `length(5)` with 5 N on it, refusing a load past its limit, and `instep` is whether its load is inside that limit.',
        [
            "parachute",
            "boat",
            "pendulum",
            "turbine",
            "wrapped",
            "spouts",
            "droptube",
            "sledgeforce",
            "heatflow",
            "expansion",
            "spring",
        ],
        FORCES,
    ),
    "physics.light": checker(
        'Works out where light goes, by the rule each drawing is drawn by: of a mirror maze, `reaches` is the letter of the goal the beam gets to (refusing a maze whose beam misses every goal) and `bounces` how many mirrors it turns at; `sees` is whether a periscope shows the bird or a seeing picture shows how we see, and with `vs` naming a second, `works` is the one that does; of a torch and a sheet, `through` is how much light gets past it, all, some or none; of a prism, `missing` is the colour of the blank band; of a beam on a mirror, `out` is the angle it leaves at and `reaches` the letter of the target it lands on; of a single lens, `focus` is how far behind it the light meets, in centimetres, and with `vs` naming a second, `sharper` is the one that bends light more, or "same"; of a telescope, `magnify` is how many times bigger it makes a far thing look and `tube` how long its tube is; of a beam going into water or glass, `bent` is its angle from the upright inside, by Snell\'s law to the nearest degree, and `turns` how many degrees it bends towards the upright; of a coin under water seen from above, `looks` is how deep it looks, its depth over 1.33 to one decimal.',
        ["mirrors", "periscope", "seeing", "beam", "prism", "mirrorangle", "lens", "refraction"],
        LIGHT,
    ),
    "physics.circuit": checker(
        'Works out what a circuit does, from a series, circuit or tester drawing, by the rule it is drawn by: `lights`, `sounds` and `turns` are yes or no; `fault` is why it stays dark ("There is no cell", "The switch is open" or "A wire is loose", and it must have exactly one); with `vs` naming a second loop, `dark` is the one that stays dark and `brighter` the brighter of the two, or "same"; `brighten` and `dimmer` pick the one option, from add a cell, take a cell away, add a bulb, take a bulb away, open the switch and close the switch, that makes the bulbs brighter or dimmer, and `mends` the one option (those, or clip the wire back on) that makes a dark loop light; `faults` counts what is wrong with a loop; with `vs`, `which` says whether both light, neither, or one only ("a only"). Brightness is compared only in loops of cells and bulbs. Of an electromagnet, `holds` is how many paper clips it holds, and with `vs` naming a second, `stronger` is the one that holds more, or "same". Of a parallel circuit, `lit` is how many bulbs are lit, `on(b)` whether branch B\'s bulb is lit (yes or no), `draws` how many times one branch\'s current the cells give, and with `vs` naming a loop or a second parallel circuit, `brighter` is the one whose bulbs are brighter, or "same", a closed branch\'s bulb being as bright as one bulb alone on the cells.',
        ["series", "circuit", "tester", "electromagnet", "parallel"],
        bySort({
            series: CIRCUIT,
            circuit: CIRCUIT,
            tester: CIRCUIT,
            electromagnet: CIRCUIT,
            parallel: PARALLEL,
        }),
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
