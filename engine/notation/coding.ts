// The checkers that prove a coding question's answer, for every variant, by running the program in
// the scene with the one interpreter. `coding.runs` works out what a program comes to (where the
// robot stops, what n holds, which line is the bug) and the verifier holds any answer the item states
// to it. `coding.builds` proves a build task can be done with the tray's blocks in the slots given,
// and hands the key a program that does it: an item may give its own model program, which is then
// only checked; without one the prover searches, first for a straight program by walking the states
// the robot can reach, then for one repeat round a short body. It never guesses: whatever it hands
// back has been run by the same interpreter the child's program will be run by. See .docs/coding.md,
// "How programs become answers".
import {
    done,
    edges,
    GOALS,
    lineOf,
    oneLine,
    outcome,
    parse,
    run,
    type Goal,
    type Target,
    type World,
} from "../coding";
import { num, str, type Value } from "../expr";
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
                holds: ["repeat", "if", "otherwise", "else"].includes(w),
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

export const CODING: Record<string, CodeChecker> = {
    "coding.runs": {
        doc: "Works out what a program comes to by running it, for every variant, and proves the item's answers with it. `of` names the drawing that runs the program; every other setting names an answer and what it is: col, row, face, moves, steps, turns, gems, left, bumped, bumpline, painted, notes, claps, said, shape, ran(3), value(n), after(2).col, out(2) for a sorting network, n for lamps, lifts or first for cups, swaps or pass(2) for one pass over sorting cards, and with `goal` also wrong (the one line to change) and fix (the number that mends it). See outcome() in engine/coding.ts for the rest.",
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
            let found: { line: number; to: string | null }[] | null = null;
            for (const [name, spec] of binds) {
                let got: number | string;
                const key = spec.trim().toLowerCase();
                try {
                    if (key === "wrong" || key === "fix") {
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
                    problems.push(`the key program does not do the job (${want})`);
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
