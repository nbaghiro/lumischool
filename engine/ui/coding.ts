// The compiled-scene side of coding interactions. A pack contains only concrete scene data, so the
// child view must choose a runnable node without importing notation or the scratchpad. This module
// keeps that choice, what a run shows on every drawing it touches at each frame, the words said
// about it, the four algorithm toys' moves and the prediction geometry in one pure place, so the
// player (code-runner.ts) only draws (.docs/coding.md, "On the lesson page").

import type { PackItem, PackQuestion } from "../pack";
import { keyOf, lineOf, parse, run, shapeOf, type Frame, type Run, type State } from "../coding";
import { lampRun } from "../parts/coding/pixels";
import { throughNetwork } from "../parts/coding/sortnet";
import { valuesOf, type Box, type Scene, type SceneNode } from "../scene";
import { RUNS, setupOf, type Setup } from "../parts/coding/setup";

export type CodingMode = "run" | "toy" | "build";

export interface CodingTarget {
    mode: CodingMode;
    node: SceneNode;
    setup: Setup | null;
    /** A listing beside a runnable node, only when it is the unique readable listing. */
    listing: SceneNode | null;
}

const TOYS = new Set(["lamps", "sortcards", "sortnet", "cups"]);
const LISTINGS = new Set(["program", "blocks", "flowchart"]);
const RUNNABLE = new Set(Object.keys(RUNS).filter((type) => !LISTINGS.has(type)));

const isCodeNode = (node: SceneNode): boolean => RUNNABLE.has(node.type);

/** The concrete node named by a check setting, when the setting names one. */
const named = (scene: Scene, id: string | undefined): SceneNode | null =>
    id ? (scene.nodes.find((node) => node.id === id) ?? null) : null;

const isStrings = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((line) => typeof line === "string");

/** The program lines a compiled node carries, or null when it is a plan/partial listing. */
const codeOf = (node: SceneNode): string[] | null => {
    const key = RUNS[node.type];
    const value = key ? valuesOf(node.v)[key] : undefined;
    return isStrings(value) ? value : null;
};

/** Whether a listing contains a complete program the interpreter can read. */
export const readableListing = (node: SceneNode): boolean => {
    const code = codeOf(node);
    return (
        code !== null &&
        code.length > 0 &&
        setupOf(node.type, valuesOf(node.v)) !== null &&
        parse(code).problems.length === 0
    );
};

/**
 * The interaction a scene offers, for a question's check or a look scene's none. Explicit checker
 * settings win, which matters when a scene contains two turtles or a key listing beside the runnable
 * drawing. A readable listing with nothing else to run plays on its own, lighting its lines and
 * saying what it says, which is how a program of names and random numbers is watched.
 */
export function sceneTarget(scene: Scene, check: PackItem["check"] = null): CodingTarget | null {
    if (check?.name === "coding.builds") {
        const node = named(scene, check.settings.of) ?? scene.nodes.find(isCodeNode);
        return node
            ? { mode: "build", node, setup: setupOf(node.type, valuesOf(node.v)), listing: null }
            : null;
    }
    const listings = scene.nodes.filter((n) => LISTINGS.has(n.type) && readableListing(n));
    const explicit = check?.name === "coding.runs" ? named(scene, check.settings.of) : null;
    const node =
        (explicit &&
        (isCodeNode(explicit) || TOYS.has(explicit.type) || listings.includes(explicit))
            ? explicit
            : null) ??
        scene.nodes.find(isCodeNode) ??
        scene.nodes.find((n) => TOYS.has(n.type)) ??
        // a listing and a flowchart of the same program are one program drawn twice
        (listings.every((l) => sameCode(codeOf(l), codeOf(listings[0] ?? l) ?? []))
            ? listings[0]
            : undefined);
    if (!node) return null;
    if (TOYS.has(node.type)) return { mode: "toy", node, setup: null, listing: null };
    const setup = setupOf(node.type, valuesOf(node.v));
    const code = codeOf(node);
    const beside = listings.filter((l) => l !== node && code !== null && sameCode(codeOf(l), code));
    return {
        mode: "run",
        node,
        setup,
        listing: beside.length === 1 ? (beside[0] ?? null) : null,
    };
}

/** Chooses the interaction for one compiled question, by its item's check. */
export const codingTarget = (q: PackQuestion, item: PackItem): CodingTarget | null =>
    q.scene ? sceneTarget(q.scene, item.check) : null;

const NUMBER = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Whether a question asks what the program or toy its scene plays comes to, so that playing it before
 * the child answers would give the answer away: its item's check works out what the program comes to
 * (`coding.runs`), or it has no check and every answer is a number or a pick. Such a question offers
 * Run, Step and the toy's buttons only once it is answered; a build is marked by its run, and a look
 * scene or a worked example asks nothing.
 */
export function asksWhatItDoes(
    q: PackQuestion,
    item: PackItem,
    target: CodingTarget | null,
): boolean {
    if (!target || target.mode === "build") return false;
    if (item.check) return item.check.name === "coding.runs";
    const picked = new Set(q.scene?.nodes.filter((n) => n.type === "choice").map((n) => n.id));
    const keys = Object.keys(q.answers);
    return (
        keys.length > 0 &&
        keys.every(
            (k) => picked.has(k) || q.labels?.[k] !== undefined || NUMBER.test(q.answers[k] ?? ""),
        )
    );
}

/** What stands under a question's picture in place of Run until it is answered. */
export const PREDICT_FIRST = "Work it out first. Once you have answered, you can run it to check.";

/** The child's answer, said before what the program did when they run it to check. */
export function answeredWords(
    q: PackQuestion,
    given: Record<string, string>,
    labelOf: (key: string, value: string) => string = (_key, value) => value,
): string {
    const said = Object.keys(q.answers).flatMap((k) => {
        const v = given[k]?.trim();
        return v ? [labelOf(k, v)] : [];
    });
    return said.length ? `Your answer was ${said.join(", ")}.` : "";
}

/** A runnable node's box, used by prediction overlays and pointer hit areas. */
export const boxOf = (scene: Scene, target: CodingTarget): Box | null =>
    scene.boxes[target.node.id] ?? null;

/** The grid dimensions used by a prediction target, or null for non-grid programs. */
export const gridOf = (target: CodingTarget): { cols: number; rows: number } | null => {
    const world = target.setup?.world;
    return world && world.cols > 1 && world.rows > 1
        ? { cols: world.cols, rows: world.rows }
        : null;
};

const lineKey = (t: string, i: number): string => {
    const l = lineOf(t, i + 1);
    return `${l.depth}|${l.text}`;
};

/** Whether two programs are the same lines at the same depths, however their spaces were written. */
function sameCode(a: readonly string[] | null, b: readonly string[]): boolean {
    return (
        a !== null &&
        a.length === b.length &&
        a.every((t, i) => lineKey(t, i) === lineKey(b[i] ?? "", i))
    );
}

/** Whether `a` is the first lines of `b`, such as a list's own line beside the program that uses it. */
const prefixOf = (a: readonly string[] | null, b: readonly string[]): boolean =>
    a !== null && a.length > 0 && sameCode(a, b.slice(0, a.length));

/**
 * A program played once: the frames a child watches, how many of them play, the random numbers it
 * drew, and the program the drawings are handed to run for themselves. A drawing runs its code with
 * the checker's generator, so a program that drew fresh numbers is handed with each number written in
 * where it was drawn; a program that draws on one line more than once cannot be written that way,
 * and plays the checker's own draw instead.
 */
export interface Play {
    code: readonly string[];
    run: Run;
    /** Frames that play: a lamp row stops once it is full, and an endless run at `ENDLESS`. */
    length: number;
    draws: number[];
    shown: readonly string[];
}

/** The most frames an endless program plays before it is said to go on for ever. */
const ENDLESS = 120;

const RANDOM = /\b(?:pick\s+)?random\s+\S+\s+to\s+\S+/gi;
const DRAWS = /\brandom\s+\S+\s+to\s+\S+/i;

/** A small seeded generator, so a play can be repeated from its seed while testing. */
function drawer(seed: number): (lo: number, hi: number) => number {
    let a = seed >>> 0 || 1;
    return (lo, hi) => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), a | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return lo + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (hi - lo + 1));
    };
}

/** The program with each random number written in as it was drawn, or null when that cannot say the same run. */
function pinned(
    code: readonly string[],
    r: Run,
    draws: readonly number[],
    s: Setup,
): string[] | null {
    const out = [...code];
    const seen = new Set<number>();
    let next = 0;
    for (const f of r.frames) {
        const text = out[f.line - 1];
        if (text === undefined || seen.has(f.line) || !DRAWS.test(text)) continue;
        seen.add(f.line);
        out[f.line - 1] = text.replace(RANDOM, () => String(draws[next++] ?? 0));
    }
    if (next !== draws.length) return null;
    const again = run(parse(out), s.world, { event: s.event, vars: s.vars });
    const same = (a: State, b: State): boolean =>
        a.col === b.col &&
        a.row === b.row &&
        JSON.stringify(a.vars) === JSON.stringify(b.vars) &&
        JSON.stringify(a.lists) === JSON.stringify(b.lists);
    return again.rolls === 0 && again.frames.length === r.frames.length && same(again.end, r.end)
        ? out
        : null;
}

/** A program played in a drawing's world, drawing its random numbers from `seed`. */
export function playOf(s: Setup, code: readonly string[], seed: number): Play {
    const p = parse(code);
    const o = { event: s.event, vars: s.vars };
    const draw = drawer(seed);
    const draws: number[] = [];
    const fresh = run(p, s.world, {
        ...o,
        roll: (lo, hi) => {
            const n = draw(lo, hi);
            draws.push(n);
            return n;
        },
    });
    const pin = draws.length ? pinned(code, fresh, draws, s) : [...code];
    const r = pin ? fresh : run(p, s.world, o);
    const lamp = s.type === "pixels" ? lampRun(r, s.world.cols * s.world.rows) : null;
    return {
        code,
        run: r,
        length: lamp ?? (r.stopped === "limit" ? ENDLESS : r.frames.length),
        draws: pin ? draws : [],
        shown: pin ?? code,
    };
}

/** Every name a run gave a number or a list to. */
function namesIn(r: Run): Set<string> {
    const out = new Set<string>();
    for (const f of r.frames) {
        for (const k of Object.keys(f.state.vars)) out.add(k);
        for (const k of Object.keys(f.state.lists)) out.add(k);
    }
    return out;
}

/**
 * The drawings a program touches as it plays: its own, a listing of the same program, a trace table
 * of it, a name's box or a list's cells it fills, and a die when it draws random numbers. In a build
 * the program is the child's, so a box or a list is touched by its name alone.
 */
export function touchedBy(scene: Scene, target: CodingTarget, play: Play): SceneNode[] {
    const names = namesIn(play.run);
    const build = target.mode === "build";
    return scene.nodes.filter((n) => {
        if (n === target.node) return true;
        const own = codeOf(n);
        const name = valuesOf(n.v).name;
        switch (n.type) {
            case "program":
            case "blocks":
            case "flowchart":
            case "tracetable":
                return !build && sameCode(own, play.code);
            case "thermometer":
            case "jug":
                return sensorShown(n, play) !== null;
            case "switched":
                return switchesIn(play.run).size > 0;
            case "variable":
            case "listbox":
                return (
                    typeof name === "string" &&
                    names.has(name) &&
                    (build || prefixOf(own, play.code))
                );
            case "die":
                return play.draws.length > 0;
        }
        return false;
    });
}

/** The sensors a run read, by name, from its first minute. */
const sensorsOf = (r: Run): string[] => Object.keys(r.minutes[0]?.values ?? {});

/** Every thing a run switched, on or off. */
function switchesIn(r: Run): Set<string> {
    const out = new Set<string>();
    for (const f of r.frames) if (f.switched) out.add(f.switched.name);
    return out;
}

/**
 * The sensor a thermometer or a jug shows as a program plays: the one whose first reading the drawing
 * is drawn at, which is how a scene says which it shows. Null for a drawing that shows none of them.
 */
function sensorShown(node: SceneNode, play: Play): string | null {
    const v = valuesOf(node.v);
    const drawn = node.type === "jug" ? v.level : v.value;
    const first = play.run.minutes[0]?.values ?? {};
    return sensorsOf(play.run).find((n) => first[n] === drawn) ?? null;
}

/** The frame that has just played once `k` have, or undefined before the first. */
const frameAt = (play: Play, k: number): Frame | undefined =>
    k > 0 ? play.run.frames[Math.min(k, play.length) - 1] : undefined;

const stateAt = (play: Play, k: number): State => frameAt(play, k)?.state ?? play.run.start;

/** What a `say` line says: a name says the number or the list it holds, and words say themselves. */
export function spoken(said: string, s: State): string {
    const v = s.vars[said.trim()];
    if (v !== undefined) return String(v);
    const list = s.lists[said.trim()];
    return list ? list.join(", ") : said;
}

/** What the program has said once `k` frames have played, or "" while it has said nothing. */
export const saidAt = (play: Play, k: number): string => {
    for (let i = Math.min(k, play.length) - 1; i >= 0; i--) {
        const f = play.run.frames[i];
        if (f?.kind === "say") return spoken(f.said ?? "", f.state);
    }
    return "";
};

/** The numbers a name has held once `k` frames have played, as its box writes them. */
function heldBy(play: Play, name: string, k: number): number[] {
    const out: number[] = [];
    const mentions = new RegExp(`\\b${name}\\b`, "i");
    for (const f of play.run.frames.slice(0, Math.min(k, play.length))) {
        const v = f.state.vars[name];
        if (
            v !== undefined &&
            (f.kind === "set" || f.kind === "change") &&
            mentions.test(play.code[f.line - 1] ?? "")
        )
            out.push(v);
    }
    return out;
}

/** Which item of a list a `for each` over it is on once `k` frames have played, or 0 outside one. */
function walking(play: Play, list: string, k: number): number {
    const lines = play.code.map((t, i) => lineOf(t, i + 1));
    const each = new RegExp(`^for each \\S+ in ${list}$`, "i");
    /** Whether line `n` is the loop over the list, or sits inside it. */
    const within = (n: number): boolean => {
        for (let l = lines[n - 1]; l;) {
            if (each.test(l.text)) return true;
            const depth = l.depth;
            l = lines.slice(0, l.n - 1).findLast((x) => x.depth < depth);
        }
        return false;
    };
    for (let i = Math.min(k, play.length) - 1; i >= 0; i--) {
        const f = play.run.frames[i];
        if (!f || !within(f.line)) return 0;
        if (f.kind === "each") return f.round?.i ?? 0;
    }
    return 0;
}

/**
 * The settings a touched drawing is drawn with once `k` frames of the play have run, over the
 * scene's own. Nothing a child is asked to write in the drawing is filled for them unless `reveal`
 * says the sheet is read: a trace table fills no further than the rows it gave, and a blank stays
 * blank. Null leaves the drawing as the scene has it.
 */
export function settingsAt(
    node: SceneNode,
    play: Play,
    k: number,
    reveal: boolean,
): Record<string, unknown> | null {
    const v = valuesOf(node.v);
    const f = frameAt(play, k);
    const upto = Math.min(k, play.length);
    const code = [...play.shown];
    switch (node.type) {
        case "maze":
        case "stage":
        case "pixels":
            return { code, upto };
        case "turtle":
            return { moves: code, upto };
        case "tune": {
            const played = play.run.frames.slice(0, upto).filter((x) => x.kind === "play").length;
            return { code, upto, ring: f?.kind === "play" ? played : 0 };
        }
        case "dance":
            return {
                code,
                beat: play.run.frames
                    .slice(0, upto)
                    .reduce((b, x) => b + (x.kind === "dance" ? (x.times ?? 1) : 0), 0),
            };
        case "fork":
            return { lit: k > 0 };
        case "tracetable": {
            const given = typeof v.filled === "number" ? v.filled : -1;
            return { code, filled: reveal || given < 0 ? upto : Math.min(upto, given) };
        }
        case "program":
        case "blocks":
        case "flowchart":
            return { run: f?.line ?? 0 };
        case "thermometer":
        case "jug": {
            const name = sensorShown(node, play);
            const reading = name === null ? undefined : stateAt(play, k).vars[name];
            return reading === undefined
                ? null
                : node.type === "jug"
                  ? { level: reading }
                  : { value: reading };
        }
        case "switched": {
            const on = stateAt(play, k).on;
            return { on: Object.keys(on).filter((name) => on[name]) };
        }
        case "variable": {
            const name = typeof v.name === "string" ? v.name : "";
            return { code: heldBy(play, name, k).map((n) => `set ${name} to ${n}`), upto: -1 };
        }
        case "listbox": {
            const name = typeof v.name === "string" ? v.name : "";
            const list = k > 0 ? stateAt(play, k).lists[name] : undefined;
            if (!list) return null;
            const at = walking(play, name, k);
            return {
                code: list.length ? [`set ${name} to list ${list.join(", ")}`] : [],
                upto: -1,
                ...(at ? { mark: at } : {}),
            };
        }
        case "die": {
            const n = Number(saidAt(play, k));
            return Number.isInteger(n) && n >= 1 && n <= 6 ? { face: n } : null;
        }
    }
    return null;
}

const lineWords = (code: readonly string[], n: number): string => (code[n - 1] ?? "").trim();

/** The lines a listing leaves blank for a child to write, whose words a step does not read out. */
export const blanksIn = (nodes: readonly SceneNode[]): number[] =>
    nodes.flatMap((n) => {
        const blank = LISTINGS.has(n.type) ? valuesOf(n.v).blank : undefined;
        return typeof blank === "number" && blank > 0 ? [blank] : [];
    });

/** What a step says: which of how many, the line that ran, and where the robot or the turtle stands. */
export function stepWords(
    play: Play,
    type: string,
    k: number,
    blanks: readonly number[] = [],
): string {
    const f = frameAt(play, k);
    if (!f) return "";
    const who = type === "turtle" ? "turtle" : type === "maze" ? "robot" : null;
    const where =
        who && f.kind !== "bump"
            ? ` The ${who} is on column ${Math.round(f.state.col)}, row ${Math.round(f.state.row)}.`
            : "";
    const said = f.kind === "say" ? ` It says ${spoken(f.said ?? "", f.state)}.` : "";
    const words = blanks.includes(f.line) ? "" : `: ${lineWords(play.code, f.line)}`;
    return `Step ${k} of ${play.length}. Line ${f.line}${words}.${where}${said}${readingWords(play.run, f.state)}`;
}

/** What the sensors read and what is switched on at a step: " Minute 3: temp reads 16, and the heater is on." */
function readingWords(r: Run, s: State): string {
    const names = sensorsOf(r);
    const switched = [...switchesIn(r)];
    if (!names.length && !switched.length) return "";
    const reads = names.map((n) => `${n} reads ${s.vars[n] ?? 0}`);
    const on = switched.map((n) => `the ${n} is ${s.on[n] ? "on" : "off"}`);
    const all = [...reads, ...on];
    const list =
        all.length > 1 ? `${all.slice(0, -1).join(", ")} and ${all.at(-1) ?? ""}` : (all[0] ?? "");
    return names.length ? ` Minute ${s.time}: ${list}.` : ` Now ${list}.`;
}

const drew = (draws: readonly number[]): string =>
    draws.length === 0
        ? ""
        : ` This time random gave ${draws.length === 1 ? String(draws[0]) : `${draws.slice(0, -1).join(", ")} and ${String(draws.at(-1))}`}; run it again for new numbers.`;

/** What a program did, in words, once it has played. */
export function endWords(play: Play, s: Setup): string {
    const r = play.run;
    if (r.problems.length) return `The program has a problem: ${r.problems[0] ?? ""}.`;
    const again = drew(play.draws);
    if (s.type === "pixels" && play.length < r.frames.length) {
        const lights = r.frames.slice(0, play.length).filter((f) => f.kind === "light").length;
        return `The row is full: ${lights} lights, and the program goes on in the same order.`;
    }
    const last = r.frames.at(-1);
    if (r.stopped === "bump")
        return `It bumped into ${last?.bump?.why === "edge" ? "the edge" : "a rock"} on line ${last?.line ?? 0}.${again}`;
    if (r.stopped === "limit") return "It kept going and never stopped, so it was stopped.";
    const w = s.world,
        end = r.end;
    if (w.flag !== null && keyOf(w, end.col, end.row) === w.flag)
        return `It reached the flag${w.gems.size ? `, with ${end.got.length} of ${w.gems.size} gems` : ""}.${again}`;
    if (s.type === "turtle") {
        const shape = shapeOf(r.segments, r.start);
        if (shape === "none") return `It drew nothing.${again}`;
        if (shape === "open") return `It drew a line that does not come back to the start.${again}`;
        return `It drew a ${shape === "closed" ? "closed shape" : shape} and came back to the start.${again}`;
    }
    if (s.type === "maze") return `It stopped on column ${end.col}, row ${end.row}.${again}`;
    const said = saidAt(play, play.length);
    return `That is the whole program${said ? `, and the last thing it said was ${said}` : ""}.${again}`;
}

/** A toy as a child has it: the drawing's settings they changed, and what the last move said. */
export interface Toy {
    settings: Record<string, unknown>;
    said: string;
    /** How many different moves were made: cups lifted, pairs compared, bridges crossed. */
    moves: number;
}

const numbers = (v: unknown): number[] =>
    Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : [];
const whole = (v: unknown, or: number): number =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : or;

/** A toy as the scene draws it, before anything is tapped. */
export function toyOf(node: SceneNode): Toy {
    const v = valuesOf(node.v);
    switch (node.type) {
        case "lamps":
            return { settings: { n: whole(v.n, 0) }, said: "", moves: 0 };
        case "sortcards":
            return {
                settings: { cards: numbers(v.cards), compare: 0, swap: false },
                said: "",
                moves: 0,
            };
        case "cups":
            return { settings: { open: [] }, said: "", moves: 0 };
        case "sortnet":
            return { settings: { upto: 0 }, said: "", moves: 0 };
    }
    return { settings: {}, said: "", moves: 0 };
}

/** The buttons a toy has: a lamp, a pair of cards, a cup each, or one for the next bridge. */
export function toyButtons(node: SceneNode, toy: Toy): { label: string; pressed?: boolean }[] {
    const v = valuesOf(node.v);
    switch (node.type) {
        case "lamps": {
            const bits = Math.max(1, Math.min(8, whole(v.bits, 4)));
            const n = whole(toy.settings.n, 0);
            return Array.from({ length: bits }, (_, i) => {
                const place = 2 ** (bits - 1 - i);
                return { label: `Lamp ${place}`, pressed: Math.floor(n / place) % 2 === 1 };
            });
        }
        case "sortcards": {
            const cards = numbers(toy.settings.cards);
            return cards.slice(1).map((_, i) => ({ label: `Cards ${i + 1} and ${i + 2}` }));
        }
        case "cups": {
            const open = numbers(toy.settings.open);
            return numbers(v.cards).map((_, i) => ({
                label: `Cup ${i + 1}`,
                pressed: open.includes(i + 1),
            }));
        }
        case "sortnet":
            return [{ label: "Next bridge" }];
    }
    return [];
}

/** What pressing a toy's button `i` does, and says. */
export function pressToy(node: SceneNode, toy: Toy, i: number): Toy {
    const v = valuesOf(node.v);
    switch (node.type) {
        case "lamps": {
            const bits = Math.max(1, Math.min(8, whole(v.bits, 4)));
            const place = 2 ** (bits - 1 - i);
            const was = whole(toy.settings.n, 0);
            const n = Math.floor(was / place) % 2 === 1 ? was - place : was + place;
            return {
                settings: { n },
                said: `The ${place} lamp is ${n > was ? "on" : "off"}. The lamps show ${n}.`,
                moves: toy.moves + 1,
            };
        }
        case "sortcards": {
            const cards = numbers(toy.settings.cards);
            const a = cards[i],
                b = cards[i + 1];
            if (a === undefined || b === undefined) return toy;
            const swap = a > b;
            const next = swap ? cards.map((c, j) => (j === i ? b : j === i + 1 ? a : c)) : cards;
            const sorted = next.every((c, j) => j === 0 || (next[j - 1] ?? c) <= c);
            return {
                settings: { cards: next, compare: i + 1, swap },
                said: `${a} and ${b}: ${swap ? `the bigger was first, so they swap. Swaps so far: ${toy.moves + 1}.` : "already the right way round, so they stay."}${sorted ? " The cards are in order." : ""}`,
                moves: toy.moves + (swap ? 1 : 0),
            };
        }
        case "cups": {
            const cards = numbers(v.cards);
            const target = whole(v.target, 0);
            const open = numbers(toy.settings.open);
            const card = cards[i];
            if (card === undefined) return toy;
            const again = open.includes(i + 1);
            const lifts = again ? toy.moves : toy.moves + 1;
            const found = card === target;
            return {
                settings: { open: again ? open : [...open, i + 1] },
                said: `Cup ${i + 1} hides ${card}. ${
                    found
                        ? `That is ${target}, found in ${lifts} ${lifts === 1 ? "lift" : "lifts"}.`
                        : `${target} is ${card < target ? "bigger" : "smaller"}, so every cup to the ${card < target ? "left" : "right"} of it is crossed out.`
                }`,
                moves: lifts,
            };
        }
        case "sortnet": {
            const inputs = numbers(v.inputs);
            const pairs = numbers(v.pairs);
            const stages = Math.ceil(pairs.length / 2);
            const k = whole(toy.settings.upto, 0) + 1;
            if (k > stages) return toy;
            const before = throughNetwork(inputs, pairs.slice(0, (k - 1) * 2));
            const l = (pairs[(k - 1) * 2] ?? 1) - 1,
                r = (pairs[(k - 1) * 2 + 1] ?? 1) - 1;
            const a = before[Math.min(l, r)] ?? 0,
                b = before[Math.max(l, r)] ?? 0;
            const out = throughNetwork(inputs, pairs.slice(0, k * 2));
            const last = k === stages;
            return {
                settings: { upto: k },
                said: `Bridge ${k}: ${a} and ${b} meet, ${a > b ? "so they cross over" : "and stay where they are"}.${last ? ` They come out as ${out.join(", ")}.` : ""}`,
                moves: k,
            };
        }
    }
    return toy;
}
