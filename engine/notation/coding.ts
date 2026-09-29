// The checkers that prove a coding question's answer, for every variant, by running the program in
// the scene with the one interpreter. `coding.runs` works out what a program comes to (where the
// robot stops, what n holds, which line is the bug) and the verifier holds any answer the item states
// to it. `coding.builds` proves a build task can be done with the tray's blocks in the slots given,
// for every number random could give (`done` in engine/coding.ts, the rule the page marks a child's
// build by), and hands the key a program that does it: an item may give its own model program, which
// is then only checked; without one the prover searches, first for a straight program by walking the
// states the robot can reach, then for one repeat round a short body. It never guesses: whatever it hands
// back has been run by the same interpreter the child's program will be run by. See .docs/coding.md,
// "How programs become answers".
import {
    done,
    edges,
    GOALS,
    lineOf,
    type Step,
    oneLine,
    outcome,
    overAll,
    parse,
    run,
    spread,
    type Goal,
    type Target,
    type World,
} from "../coding";
import { num, str, type Value } from "../expr";
import { shapeWords } from "../parts/coding/flowchart";
import { RUNS, type Setup, setupOf } from "../parts/coding/setup";
import { throughNetwork } from "../parts/coding/sortnet";
import type { Opt } from "../scene";
import type { Concrete, SceneInstance } from "./instantiate";
import type { CodeChecker } from "./verify";
import { partParams } from "./vocabulary";

type Want = Goal | "target";
const WANTS: readonly string[] = [...GOALS, "target"];
const isWant = (g: string): g is Want => WANTS.includes(g);

const node = (scene: SceneInstance, id: string | undefined): Concrete | undefined =>
    scene.nodes.find((c) => c.id === id);
const paramsOf = (c: Concrete): Record<string, unknown> => partParams(c.type, c.v);
const lines = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
const same = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && a.every((x, i) => x.replace(/\s+$/, "") === b[i]?.replace(/\s+$/, ""));
const said = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The lines drawn by a target program, which is what a turtle task compares a drawing with. */
function targetOf(s: Setup): Target | undefined {
    if (!s.target.length) return undefined;
    return { segments: run(parse(s.target), s.world).segments };
}

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

/** An outcome as an answer: a number, or the option of a choice whose words it names. */
function asAnswer(
    scene: SceneInstance,
    name: string,
    got: number | string,
): { v: Value } | { problem: string } {
    const options = optionsOf(node(scene, name));
    if (options) {
        const hit = options.find(
            (o) => plain(o.value) === plain(String(got)) || plain(o.label) === plain(String(got)),
        );
        if (!hit)
            return {
                problem: `the program comes to "${got}", which is none of ${name}'s options (${options.map((o) => o.label).join(", ")})`,
            };
        return { v: hit.kind === "num" ? num(Number(hit.value)) : str(hit.value) };
    }
    return { v: typeof got === "number" ? num(got) : str(got) };
}

/** An outcome over every way a program that draws random numbers can run, rather than over one run. */
const OVER_ALL = /^(least|most|kinds|likeliest|fair|ways)\(|^outcomes$/;
const COULD = /^(could|never)\((.+)\)$/;

/**
 * Which option of a choice could happen (could) or could not (never), over every way the program can
 * run; exactly one option may be the answer.
 */
function couldBe(
    scene: SceneInstance,
    name: string,
    values: readonly (number | string)[],
    never: boolean,
): { v: Value } | { problem: string } {
    const options = optionsOf(node(scene, name));
    if (!options) return { problem: `could and never answer a choice, and ${name} is not one` };
    const seen = new Set(values.map((v) => plain(String(v))));
    const hits = options.filter(
        (o) => (seen.has(plain(o.value)) || seen.has(plain(o.label))) !== never,
    );
    const [hit] = hits;
    if (hits.length !== 1 || !hit)
        return {
            problem: `${hits.length} of ${name}'s options ${never ? "could not" : "could"} happen, so the question has ${hits.length ? "more than one answer" : "no answer"}`,
        };
    return { v: hit.kind === "num" ? num(Number(hit.value)) : str(hit.value) };
}

/**
 * Every single change to one line that makes the program do its job: a different number, the
 * other direction, or the line taken out. A debugging question has one bug exactly when all the
 * fixes are on the same line.
 */
function fixes(
    code: readonly string[],
    s: Setup,
    want: Want,
): { line: number; to: string | null }[] {
    const out: { line: number; to: string | null }[] = [];
    const target = targetOf(s);
    const most = Math.max(9, s.world.cols, s.world.rows);
    const SWAPS: string[][] = [
        ["right", "left", "up", "down"],
        ["forward", "back"],
        ["left", "right"],
    ];
    code.forEach((raw, i) => {
        const lead = /^\s*/.exec(raw)?.[0] ?? "";
        const text = raw.trim();
        if (!text) return;
        const tries = new Set<string | null>();
        if (/-?\d+/.test(text))
            for (let n = 0; n <= most; n++) tries.add(text.replace(/-?\d+/, String(n)));
        // a turn by a number of degrees is mended by any whole number of degrees
        if (/^turn\s+(left|right)\s+\d+/i.test(text))
            for (let n = 1; n < 360; n++) tries.add(text.replace(/\d+/, String(n)));
        const ws = text.split(/\s+/);
        for (const fam of SWAPS) {
            const at = ws.findIndex((w) => fam.includes(w.toLowerCase()));
            if (at >= 0 && (fam !== SWAPS[2] || ws[0]?.toLowerCase() === "turn"))
                for (const f of fam)
                    tries.add([...ws.slice(0, at), f, ...ws.slice(at + 1)].join(" "));
        }
        const following = code[i + 1];
        const holds =
            following !== undefined && (/^\s*/.exec(following)?.[0].length ?? 0) > lead.length;
        if (!holds) tries.add(null);
        tries.delete(text);
        for (const t of tries) {
            const next =
                t === null
                    ? code.filter((_, j) => j !== i)
                    : code.map((x, j) => (j === i ? lead + t : x));
            if (done(next, s.world, want, target)) out.push({ line: i + 1, to: t });
        }
    });
    return out;
}

function goalOf(settings: Record<string, string>): { want: Want | null; problem?: string } {
    const g = settings.goal;
    if (g === undefined) return { want: null };
    return isWant(g)
        ? { want: g }
        : { want: null, problem: `goal=${g} is not a goal; it is one of ${WANTS.join(", ")}` };
}

/** What a sorting network, a row of lamps or a row of cups comes to, which is not a program on a grid. */
function pictureOutcome(c: Concrete, spec: string): number | null {
    const p = paramsOf(c);
    const s = spec.trim().toLowerCase();
    if (c.type === "sortnet") {
        const out = /^out\((\d+)\)$/.exec(s);
        const outs = throughNetwork(lines(p.inputs).map(Number), lines(p.pairs).map(Number));
        if (out) return outs[Number(out[1]) - 1] ?? null;
    }
    if (c.type === "lamps" && (s === "n" || s === "sum")) return Math.round(Number(p.n));
    if (c.type === "sortcards") {
        // One pass from the left: each pair side by side is swapped when the bigger card is first.
        const cards = lines(p.cards).map(Number);
        let swaps = 0;
        for (let i = 0; i + 1 < cards.length; i++) {
            const a = cards[i];
            const b = cards[i + 1];
            if (a !== undefined && b !== undefined && a > b) {
                cards[i] = b;
                cards[i + 1] = a;
                swaps++;
            }
        }
        if (s === "swaps") return swaps;
        const at = /^pass\((\d+)\)$/.exec(s);
        if (at) return cards[Number(at[1]) - 1] ?? null;
    }
    if (c.type === "cups") {
        const cards = lines(p.cards).map(Number);
        const target = Number(p.target);
        // Halving: lift the middle of what is left, and keep the half the number must be in.
        let lo = 0;
        let hi = cards.length - 1;
        let lifts = 0;
        let first = 0;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            const card = cards[mid];
            if (card === undefined) break;
            lifts++;
            if (!first) first = mid + 1;
            if (card === target) break;
            if (card < target) lo = mid + 1;
            else hi = mid - 1;
        }
        if (s === "lifts") return lifts;
        if (s === "first") return first;
    }
    return null;
}

/** A block in a tray, as its shape: its words with the number, if it has one, left open. */
interface Block {
    text: string;
    shape: string;
    counted: boolean;
    holds: boolean;
}

const shapeOf = (text: string): string =>
    text.trim().toLowerCase().replace(/-?\d+/g, "#").replace(/\s+/g, " ");

function trayOf(lines: readonly string[]): Block[] {
    return lines
        .map((t) => {
            const shape = shapeOf(t);
            const w = shape.split(" ")[0] ?? "";
            return {
                text: t.trim(),
                shape,
                counted: shape.includes("#"),
                holds: ["repeat", "for", "if", "otherwise", "else"].includes(w),
            };
        })
        .filter((b) => b.shape);
}

/** Whether a program is the tray's cards, every one of them used once and as it is. */
function usesOnce(code: readonly string[], tray: readonly string[]): string | null {
    const want = tray.map((t) => t.trim()).sort();
    const got = code
        .map((t) => t.trim())
        .filter(Boolean)
        .sort();
    return want.length === got.length && want.every((t, i) => t === got[i])
        ? null
        : "the program is not the tray's cards, each used once";
}

/** The tray's cards in the first order that does the job, trying every order. */
function order(w: World, goal: Want, tray: readonly string[], target?: Target): string[] | null {
    const cards = tray.map((t) => t.trim());
    if (cards.length > 7) return null;
    const pick = (left: string[], so: string[]): string[] | null => {
        if (!left.length) return done(so, w, goal, target) ? so : null;
        for (const [i, card] of left.entries()) {
            if (left.indexOf(card) !== i) continue;
            const got = pick([...left.slice(0, i), ...left.slice(i + 1)], [...so, card]);
            if (got) return got;
        }
        return null;
    };
    return pick(cards, []);
}

/** Whether every line of a program is a block from the tray, with any number where the tray has one. */
function usesTray(code: readonly string[], tray: readonly string[]): string | null {
    const shapes = new Set(trayOf(tray).map((b) => b.shape));
    for (const [i, t] of code.entries()) {
        const l = lineOf(t, i + 1);
        if (l.text && !shapes.has(shapeOf(l.text)))
            return `line ${l.n}, "${l.text}", is not a block in the tray`;
    }
    return null;
}

/** The commands a tray offers, with every count a block could be set to in this world. */
function commands(tray: Block[], w: World): string[] {
    const most = Math.max(w.cols, w.rows);
    const out: string[] = [];
    for (const b of tray) {
        if (b.holds) continue;
        if (!b.counted) out.push(b.text);
        else for (let n = 1; n <= most; n++) out.push(b.shape.replace("#", String(n)));
    }
    return out;
}

const LIMIT = 60_000;

/**
 * A shortest program from the tray that does the task within `lines` lines, or null. Straight
 * programs are found by walking states; a repeat is tried when the tray has one and a straight
 * program would not fit.
 */
export function solve(
    w: World,
    goal: Want,
    tray: readonly string[],
    lines: number,
    target?: Target,
): string[] | null {
    const blocks = trayOf(tray);
    const cmds = commands(blocks, w);
    let tries = 0;
    const ok = (code: string[]): boolean => {
        tries++;
        return done(code, w, goal, target);
    };
    if (ok([])) return [];

    // Straight programs, breadth first over where the robot can be. A pen task remembers the lines
    // drawn as part of the state, and a gem task the gems picked up.
    const keyOf = (code: string[]): string | null => {
        const r = run(parse(code), w);
        if (r.stopped !== "end" || r.problems.length) return null;
        if (target?.segments) {
            const want = edges(target.segments);
            if ([...edges(r.segments)].some((e) => !want.has(e))) return null;
        }
        const e = r.end;
        const drawn =
            goal === "target" || goal === "closed" || goal === "square"
                ? [...edges(r.segments)].sort().join(";")
                : "";
        const got = [...e.got].sort((a, b) => a - b).join(".");
        return `${e.col},${e.row},${e.face},${got},${drawn}`;
    };
    const seen = new Set<string>();
    let layer: string[][] = [[]];
    for (let depth = 1; depth <= lines && tries < LIMIT; depth++) {
        const next: string[][] = [];
        for (const code of layer) {
            for (const c of cmds) {
                const tried = [...code, c];
                if (ok(tried)) return tried;
                const k = keyOf(tried);
                if (k === null || seen.has(k)) continue;
                seen.add(k);
                next.push(tried);
                if (tries >= LIMIT) break;
            }
        }
        layer = next;
    }

    // One repeat round a body of up to three commands, with an optional command before or after it.
    const repeat = blocks.find((b) => b.shape.startsWith("repeat #"));
    if (!repeat || lines < 2) return null;
    const small = cmds.filter((c) => !/\b([4-9]|\d\d)\b/.test(c));
    const bodies: string[][] = [];
    const grow = (body: string[]): void => {
        if (body.length) bodies.push(body);
        if (body.length === 3) return;
        for (const c of small) grow([...body, c]);
    };
    grow([]);
    for (const extra of [0, 1, 2]) {
        for (const body of bodies) {
            if (body.length + 1 + extra > lines) continue;
            for (let k = 2; k <= 9; k++) {
                const loop = [`repeat ${k}`, ...body.map((b) => `  ${b}`)];
                const around: string[][] =
                    extra === 0
                        ? [[]]
                        : extra === 1
                          ? cmds.flatMap((c) => [
                                [c, "|"],
                                ["|", c],
                            ])
                          : cmds.flatMap((a) => cmds.map((b) => [a, "|", b]));
                for (const shape of around) {
                    const at = shape.indexOf("|");
                    const code =
                        at < 0 ? loop : [...shape.slice(0, at), ...loop, ...shape.slice(at + 1)];
                    if (ok(code)) return code;
                    if (tries >= LIMIT * 3) return null;
                }
            }
        }
    }
    return null;
}

/** The numbers an option names, "3, 12 and 20" as 3, 12 and 20: the inputs a child picks to test with. */
const inputsOf = (o: Opt): number[] =>
    [...`${o.value} ${o.label === o.value ? "" : o.label}`.matchAll(/-?\d+/g)].map((m) =>
        Number(m[0]),
    );

/** A range written 0..20, or numbers written with commas: the inputs a test question tries. */
function triesOf(text: string | undefined): number[] {
    if (!text) return [];
    const range = /^\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*$/.exec(text);
    if (range) {
        const lo = Number(range[1]),
            hi = Number(range[2]);
        return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
    }
    return [...text.matchAll(/-?\d+/g)].map((m) => Number(m[0]));
}

/** "3: if age is less than 11; 5: say adult": the other version, each named line written again. */
function changed(code: readonly string[], bug: string): string[] | string {
    const out = [...code];
    for (const part of bug.split(";")) {
        const m = /^\s*(\d+)\s*:\s*(.*)$/.exec(part);
        const at = m ? Number(m[1]) : 0;
        const was = out[at - 1];
        if (!m || was === undefined)
            return `bug="${bug}" names a line the program does not have; write it as 3: the line as the other version has it`;
        out[at - 1] = (/^\s*/.exec(was)?.[0] ?? "") + (m[2] ?? "").trim();
    }
    return out;
}

/** Every if's two ways, as line and way, wherever it sits: in a script, a block of one's own or a loop. */
function branchesOf(steps: readonly Step[], into: Set<string>): Set<string> {
    for (const st of steps) {
        if (st.t === "if") {
            into.add(`${st.line} yes`);
            into.add(`${st.line} no`);
            branchesOf(st.ifTrue, into);
            branchesOf(st.otherwise, into);
        } else if ("body" in st) branchesOf(st.body, into);
    }
    return into;
}

/**
 * The fewest of the inputs that between them take every way, or null when all of them together miss
 * one. It is a set cover over the ways, searched rather than enumerated: inputs that take the same
 * ways count as one, an input whose ways another's include is never needed, and each step of the
 * search picks the untaken way the fewest inputs take and tries only those inputs, so every input
 * added takes a new way, and a branch stops once it cannot beat the best cover found.
 */
function fewest(ways: readonly Set<string>[], all: ReadonlySet<string>): number | null {
    const bits = [...all].map((_, i) => 1n << BigInt(i));
    const bitOf = new Map([...all].map((w, i) => [w, bits[i] ?? 0n]));
    const full = bits.reduce((m, b) => m | b, 0n);
    const masks = [
        ...new Set(ways.map((w) => [...w].reduce((m, b) => m | (bitOf.get(b) ?? 0n), 0n))),
    ].filter((m) => m !== 0n);
    const kept = masks.filter((m) => !masks.some((o) => o !== m && (o & m) === m));
    if (kept.reduce((m, x) => m | x, 0n) !== full) return null;
    let best = kept.length;
    const search = (taken: bigint, used: number): void => {
        if (taken === full) {
            best = Math.min(best, used);
            return;
        }
        if (used + 1 >= best) return;
        let by: bigint[] | null = null;
        for (const b of bits) {
            if (taken & b) continue;
            const takers = kept.filter((m) => (m & b) !== 0n);
            if (!by || takers.length < by.length) by = takers;
        }
        for (const m of by ?? []) search(taken | m, used + 1);
    };
    search(0n, 0);
    return best;
}

const TESTS = ["catches", "misses", "covers", "catching", "fewest", "smallest", "branches"];

export const CODING: Record<string, CodeChecker> = {
    "coding.runs": {
        doc: "Works out what a program comes to by running it, for every variant, and proves the item's answers with it. `of` names the drawing that runs the program; every other setting names an answer and what it is: col, row, face, moves, steps, turns, gems, left, bumped, bumpline, painted, notes, claps, said, shape, ran(3), value(n), after(2).col, out(2) for a sorting network, n for lamps, lifts or first for cups, swaps or pass(2) for one pass over sorting cards, and with `goal` also wrong (the one line to change) and fix (the number that mends it). A program that draws random numbers is asked about over every way it can run: could(value(n)) or never(value(n)) for the one option of a choice that could or could not happen, and least, most, kinds, ways, outcomes, likeliest and fair (see overAll). See outcome() in engine/coding.ts for the rest.",
        settings: ["of"],
        provides: (settings) => Object.keys(settings).filter((k) => k !== "of" && k !== "goal"),
        solutions: (settings) => [`worked out for each variant by running ${settings.of}`],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const c = node(scene, settings.of);
            if (!c)
                return { answers, problems: [`there is no ${settings.of} in the scene to run`] };
            const { want, problem } = goalOf(settings);
            if (problem) problems.push(problem);
            const binds = Object.entries(settings).filter(([k]) => k !== "of" && k !== "goal");
            if (["sortnet", "lamps", "cups", "sortcards"].includes(c.type)) {
                for (const [name, spec] of binds) {
                    const got = pictureOutcome(c, spec);
                    if (got === null) {
                        problems.push(`${c.type} does not come to "${spec}"`);
                        continue;
                    }
                    const a = asAnswer(scene, name, got);
                    if ("v" in a) answers[name] = a.v;
                    else problems.push(a.problem);
                }
                return { answers, problems };
            }
            const s = setupOf(c.type, paramsOf(c));
            if (!s) return { answers, problems: [`${c.type} does not run a program`] };
            problems.push(...s.problems);
            const program = parse(s.code);
            const r = run(program, s.world, { event: s.event, vars: s.vars });
            problems.push(...r.problems);
            if (r.stopped === "limit") problems.push("the program runs for ever: it never stops");
            // A listing beside the drawing is the program the drawing runs, so the two may not disagree.
            const listings = scene.nodes.filter(
                (x) => x !== c && (x.type === "program" || x.type === "blocks"),
            );
            const [listing] = listings;
            if (
                listings.length === 1 &&
                listing &&
                c.type !== "program" &&
                c.type !== "blocks" &&
                s.code.length
            ) {
                const shown = lines(paramsOf(listing).code);
                if (shown.length && !same(shown, s.code))
                    problems.push(
                        `${listing.id} shows a different program from the one ${c.id} runs`,
                    );
            }
            // a flowchart beside the program is the same program drawn another way
            const charts = scene.nodes.filter((x) => x !== c && x.type === "flowchart");
            const [chart] = charts;
            if (charts.length === 1 && chart && s.code.length) {
                const shown = lines(paramsOf(chart).code);
                if (!same(shown, s.code))
                    problems.push(
                        `${chart.id} is a flowchart of a different program from ${c.id}'s`,
                    );
            }
            let found: { line: number; to: string | null }[] | null = null;
            for (const [name, spec] of binds) {
                let got: number | string;
                const key = spec.trim().toLowerCase();
                try {
                    if (key === "blank") {
                        const at = Math.round(Number(paramsOf(c).blank));
                        const words =
                            c.type === "flowchart"
                                ? shapeWords(s.code, at)
                                : at > 0
                                  ? (s.code[at - 1]?.trim() ?? null)
                                  : null;
                        if (!words) {
                            problems.push(
                                `blank asks for the missing ${c.type === "flowchart" ? "shape" : "line"}, and ${c.id} leaves no ${at ? `shape for line ${at}` : "line"} blank`,
                            );
                            continue;
                        }
                        got = words;
                    } else if (key === "wrong" || key === "fix") {
                        if (!want) {
                            problems.push(`${key} needs goal= to say what the program is for`);
                            continue;
                        }
                        found ??= fixes(s.code, s, want);
                        const at = [...new Set(found.map((f) => f.line))];
                        const [line] = at;
                        if (at.length !== 1 || line === undefined) {
                            problems.push(
                                at.length
                                    ? `lines ${at.join(" and ")} could each be the bug, so the question has more than one answer`
                                    : "no change to a single line makes the program work, so there is no one bug to find",
                            );
                            continue;
                        }
                        if (key === "wrong") got = line;
                        else {
                            const numbers = [
                                ...new Set(
                                    found.map((f) => (f.to && /-?\d+/.exec(f.to)?.[0]) ?? ""),
                                ),
                            ];
                            const [number] = numbers;
                            if (numbers.length !== 1 || !number) {
                                problems.push(
                                    "the bug is not mended by one number, so fix has no single answer",
                                );
                                continue;
                            }
                            got = Number(number);
                        }
                    } else if (COULD.test(key)) {
                        const [, which = "", inner = ""] = COULD.exec(key) ?? [];
                        const values = spread(program, s.world, inner, {
                            event: s.event,
                            vars: s.vars,
                        }).map((x) => x.value);
                        const a = couldBe(scene, name, values, which === "never");
                        if ("v" in a) answers[name] = a.v;
                        else problems.push(a.problem);
                        continue;
                    } else if (OVER_ALL.test(key))
                        got = overAll(program, s.world, spec, { event: s.event, vars: s.vars });
                    else if (r.rolls) {
                        problems.push(
                            `the program draws a random number, so "${spec}" depends on the draw: ask what it could come to, with could, never, least, most, kinds, ways or likeliest`,
                        );
                        continue;
                    } else got = outcome(r, program, s.world, spec);
                } catch (e) {
                    problems.push(said(e));
                    continue;
                }
                const a = asAnswer(scene, name, got);
                if ("v" in a) answers[name] = a.v;
                else problems.push(a.problem);
            }
            return { answers, problems };
        },
    },
    "coding.tests": {
        doc: 'Choosing test cases. `of` names the drawing whose program is tested and `input` the name each test puts a number into; `bug` is the other version of it, written as the lines that differ ("3: if age is less than 11"), and a test catches the bug when the two versions come to different things for it: what they say, what every name and list holds and where they stop, or only `out` (an outcome such as value(total)) when it is set. The inputs tried are a choice\'s options, each naming one or more numbers, or `try` ("0..20" or "3, 12, 20"). Every other setting names an answer: catches for the one option with an input that catches the bug, misses for the one option with none, covers for the one option whose inputs between them take every if both ways, catching for how many of `try` catch it, smallest for the smallest that does, fewest for the fewest of `try` that take every if both ways, and branches for how many ways there are to take.',
        settings: ["of", "input"],
        provides: (settings) =>
            Object.keys(settings).filter((k) => !["of", "input", "bug", "out", "try"].includes(k)),
        solutions: (settings) => [`worked out for each variant by testing ${settings.of}`],
        warnings: (settings) =>
            Object.entries(settings)
                .filter(
                    ([k, v]) =>
                        !["of", "input", "bug", "out", "try"].includes(k) && !TESTS.includes(v),
                )
                .map(
                    ([k, v]) =>
                        `${k}=${v} is not something coding.tests works out (${TESTS.join(", ")})`,
                ),
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const c = node(scene, settings.of);
            if (!c)
                return { answers, problems: [`there is no ${settings.of} in the scene to test`] };
            const s = setupOf(c.type, paramsOf(c));
            if (!s) return { answers, problems: [`${c.type} does not run a program`] };
            problems.push(...s.problems);
            const input = (settings.input ?? "").trim().toLowerCase();
            const program = parse(s.code);
            problems.push(...program.problems.map((x) => `line ${x.line}: ${x.message}`));
            const other = settings.bug === undefined ? null : changed(s.code, settings.bug);
            if (typeof other === "string") return { answers, problems: [...problems, other] };
            const otherProgram = other ? parse(other) : null;
            if (otherProgram?.problems.length)
                problems.push(
                    ...otherProgram.problems.map((x) => `the bug's line ${x.line}: ${x.message}`),
                );
            const at = (p: ReturnType<typeof parse>, n: number) =>
                run(p, s.world, { event: s.event, vars: { ...s.vars, [input]: n } });
            // what a run comes to, all of it or only `out`, so two versions can be told apart by it
            const signature = (p: ReturnType<typeof parse>, n: number): string => {
                const r = at(p, n);
                if (settings.out) {
                    try {
                        return String(outcome(r, p, s.world, settings.out));
                    } catch (e) {
                        return `problem: ${said(e)}`;
                    }
                }
                const vars = Object.entries(r.end.vars).sort(([a], [b]) => a.localeCompare(b));
                const lists = Object.entries(r.end.lists).sort(([a], [b]) => a.localeCompare(b));
                return JSON.stringify([
                    r.end.said,
                    vars,
                    lists,
                    r.end.col,
                    r.end.row,
                    r.stopped,
                    r.problems.length > 0,
                ]);
            };
            const memo = new Map<number, boolean>();
            const catches = (n: number): boolean => {
                const had = memo.get(n);
                if (had !== undefined) return had;
                if (!otherProgram)
                    throw new Error("bug= is needed to say what the other version is");
                const got = signature(program, n) !== signature(otherProgram, n);
                memo.set(n, got);
                return got;
            };
            const all = new Set<string>();
            branchesOf(
                [
                    ...program.scripts.flatMap((x) => x.steps),
                    ...[...program.procs.values()].flatMap((x) => x.body),
                ],
                all,
            );
            const waysOf = (n: number): Set<string> =>
                new Set(
                    at(program, n).frames.flatMap((f) =>
                        f.kind === "if" ? [`${f.line} ${f.went ? "yes" : "no"}`] : [],
                    ),
                );
            const covers = (ns: readonly number[]): boolean => {
                const seen = new Set(ns.flatMap((n) => [...waysOf(n)]));
                return [...all].every((b) => seen.has(b));
            };
            const tries = triesOf(settings.try);
            for (const [name, spec] of Object.entries(settings)) {
                if (["of", "input", "bug", "out", "try"].includes(name)) continue;
                const want = spec.trim().toLowerCase();
                try {
                    if (want === "catches" || want === "misses" || want === "covers") {
                        const options = optionsOf(node(scene, name));
                        if (!options) {
                            problems.push(`${want} answers a choice, and ${name} is not one`);
                            continue;
                        }
                        const hits = options.filter((o) => {
                            const ns = inputsOf(o);
                            if (!ns.length) return false;
                            if (want === "covers") return covers(ns);
                            const caught = ns.some(catches);
                            return want === "catches" ? caught : !caught;
                        });
                        const [hit] = hits;
                        if (hits.length !== 1 || !hit) {
                            problems.push(
                                `${hits.length} of ${name}'s options ${want === "covers" ? "take every way" : want === "catches" ? "catch the bug" : "miss the bug"}, so the question has ${hits.length ? "more than one answer" : "no answer"}`,
                            );
                            continue;
                        }
                        answers[name] =
                            hit.kind === "num" ? num(Number(hit.value)) : str(hit.value);
                        continue;
                    }
                    if (want === "branches") {
                        answers[name] = num(all.size);
                        continue;
                    }
                    if (!tries.length) {
                        problems.push(`${want} counts over the inputs in try=, such as try=0..20`);
                        continue;
                    }
                    if (want === "catching" || want === "smallest") {
                        const caught = tries.filter(catches);
                        if (!caught.length) {
                            problems.push(`no input in ${settings.try} catches the bug`);
                            continue;
                        }
                        answers[name] = num(
                            want === "catching" ? caught.length : Math.min(...caught),
                        );
                        continue;
                    }
                    if (want === "fewest") {
                        if (!all.size) {
                            problems.push(
                                `${c.id}'s program has no if, so there are no ways to take`,
                            );
                            continue;
                        }
                        const got = fewest(tries.map(waysOf), all);
                        if (got === null) {
                            problems.push(`no inputs in ${settings.try} take every if both ways`);
                            continue;
                        }
                        answers[name] = num(got);
                        continue;
                    }
                    problems.push(`${name}=${spec} is not something coding.tests works out`);
                } catch (e) {
                    problems.push(said(e));
                }
            }
            return { answers, problems };
        },
    },
    "coding.builds": {
        doc: "A build task: the child arranges blocks from a pad's tray to make the program in `of` do its job, which `goal` names (flag, gems, both, closed, square, or target for a turtle's target drawing). For every variant the checker proves it can be done in the pad's slots, with the pad's own `key` program if it has one and by searching if it does not, and the key shows that program. `pad` names the pad when it is not called answer.",
        settings: ["of", "goal"],
        provides: (settings) => [settings.pad ?? "answer"],
        solutions: () => ["a program from the tray, proved for each variant"],
        variant(scene, settings) {
            const problems: string[] = [];
            const answers: Record<string, Value> = {};
            const padId = settings.pad ?? "answer";
            const c = node(scene, settings.of);
            const pad = node(scene, padId);
            if (!c)
                return {
                    answers,
                    problems: [`there is no ${settings.of} in the scene for the program to run in`],
                };
            if (!pad || pad.type !== "codepad")
                return {
                    answers,
                    problems: [`there is no codepad called ${padId} for the child to build in`],
                };
            const { want, problem } = goalOf(settings);
            if (!want) return { answers, problems: [problem ?? "goal= is needed"] };
            const s = setupOf(c.type, paramsOf(c));
            if (!s || !(c.type in RUNS))
                return { answers, problems: [`${c.type} does not run a program`] };
            if (s.code.length)
                problems.push(`${c.id} already has a program; in a build task the child writes it`);
            const pp = paramsOf(pad);
            const tray = lines(pp.tray);
            const slots = Math.max(1, Math.round(Number(pp.lines)));
            const key = lines(pp.key);
            const once = pp.once === true;
            if (once && tray.length !== slots)
                problems.push(
                    `the pad has ${slots} slots for ${tray.length} cards; a set of cards to put in order fills every slot`,
                );
            const target = want === "target" ? targetOf(s) : undefined;
            if (want === "target" && !target)
                problems.push(`goal=target needs ${c.id} to have a target to draw`);
            if (done([], s.world, want, target))
                problems.push("the goal is met before a single block is placed");
            let solution: string[] | null = null;
            if (key.length) {
                const off = once ? usesOnce(key, tray) : usesTray(key, tray);
                if (off) problems.push(`the key program: ${off}`);
                if (key.length > slots)
                    problems.push(
                        `the key program takes ${key.length} lines and the pad has ${slots} slots`,
                    );
                if (!done(key, s.world, want, target))
                    problems.push(
                        `the key program does not do the job (${want}) for every number random could give`,
                    );
                solution = key;
            } else {
                solution = once
                    ? order(s.world, want, tray, target)
                    : solve(s.world, want, tray, slots, target);
                if (!solution)
                    problems.push(
                        `no program of ${slots} blocks from the tray does the job (${want}) in this variant`,
                    );
            }
            if (solution) answers[padId] = str(oneLine(solution));
            return { answers, problems };
        },
    },
};
