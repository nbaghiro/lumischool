// The program model and its one interpreter. A program is a list of lines, nested by indentation
// (two spaces a level), in the words the blocks and the listings print: "right 3", "repeat 4",
// "if wall ahead", "set n to 4". Everything that shows or checks a program reads it through this
// file: the drawings on the shelf draw what `run` returns, the checkers prove an item's answer with
// it, and the runner on the lesson page animates the frames it gives back. So "where does the robot
// stop" has one answer, and the picture, the key and the animation cannot disagree about it.
//
// Nothing here touches the page, so the whole language runs in a plain node test. See
// .docs/coding.md for why the language is shaped as it is.

export const DIRS = ["right", "down", "left", "up"] as const;
/** A heading on the grid. The order is clockwise, so a right turn is one step along the list. */
export type Dir = (typeof DIRS)[number];

export const COLOURS = ["red", "blue", "green", "yellow", "orange", "black", "white"] as const;
export type Colour = (typeof COLOURS)[number];

const DANCES = ["clap", "jump", "spin", "wave", "stamp", "hop", "bow"] as const;
export type Dance = (typeof DANCES)[number];
const isDance = (w: string): w is Dance => (DANCES as readonly string[]).includes(w);

export type Event = "flag" | "tap";

/**
 * A number in a program: written, a name, an item of a list or its length, a random number between
 * two, or two of those joined by one operation. A share (/) must come out whole, since a name holds
 * whole numbers only.
 */
type Num =
    | { k: "lit"; v: number }
    | { k: "var"; name: string }
    | { k: "item"; list: string; at: Num }
    | { k: "length"; list: string }
    | { k: "random"; lo: Num; hi: Num }
    | { k: "op"; op: Op; l: Num; r: Num };

type Op = "+" | "-" | "*" | "/";

type Cond =
    | { k: "ahead"; what: "blocked" | "clear" | "edge" }
    | { k: "here"; what: "gem" | "flag" | Colour }
    | { k: "cmp"; op: ">" | "<" | "=" | "!=" | ">=" | "<="; l: Num; r: Num }
    | { k: "not"; c: Cond }
    | { k: "and"; l: Cond; r: Cond }
    | { k: "or"; l: Cond; r: Cond };

export type Step =
    | { t: "go"; dir: Dir | "forward" | "back"; n: Num; line: number }
    | { t: "turn"; way: "left" | "right" | "around"; deg: Num | null; line: number }
    | { t: "face"; dir: Dir; line: number }
    | { t: "pen"; down: boolean; colour: Colour | null; line: number }
    | { t: "paint"; colour: Colour | null; line: number }
    | { t: "row"; runs: { n: Num; colour: Colour }[]; line: number }
    | { t: "pick"; line: number }
    | { t: "dance"; move: Dance; n: Num; line: number }
    | { t: "play"; note: string; beats: number; line: number }
    | { t: "rest"; beats: number; line: number }
    | { t: "flash"; long: boolean; line: number }
    | { t: "light"; colour: Colour; line: number }
    | { t: "say"; text: string; line: number }
    | { t: "broadcast"; message: string; line: number }
    | { t: "switch"; name: string; on: boolean; line: number }
    | { t: "set"; name: string; to: Num; line: number }
    | { t: "change"; name: string; by: Num; add: boolean; line: number }
    | { t: "list"; name: string; items: Num[]; line: number }
    | { t: "replace"; list: string; at: Num; to: Num; line: number }
    | { t: "each"; name: string; list: string; body: Step[]; line: number }
    | { t: "repeat"; times: Num; body: Step[]; line: number }
    | { t: "forever"; body: Step[]; line: number }
    | { t: "until"; cond: Cond; body: Step[]; line: number }
    | { t: "if"; cond: Cond; ifTrue: Step[]; otherwise: Step[]; line: number; elseLine: number }
    | { t: "call"; name: string; args: Num[]; line: number };

/** A line as it was written: its number from 1, its words, and how deep it sits. */
export interface Line {
    n: number;
    text: string;
    depth: number;
}

interface Script {
    event: Event | "message";
    /** The message that starts a "when I receive" script, and "" for the others. */
    message: string;
    steps: Step[];
    line: number;
}

/** A block of a child's own: its inputs by name, and the lines it runs. */
interface Proc {
    params: string[];
    body: Step[];
    /** The define line. */
    line: number;
}

interface Program {
    lines: Line[];
    scripts: Script[];
    procs: Map<string, Proc>;
    /** What could not be read, by line, in words a grown-up can act on. */
    problems: { line: number; message: string }[];
}

/** The depth of a written line: two spaces a level, and a tab counts as one level. */
export function lineOf(text: string, n: number): Line {
    const lead = /^[ \t]*/.exec(text)?.[0] ?? "";
    const depth = Array.from(lead).reduce((d, ch) => d + (ch === "\t" ? 2 : 1), 0) >> 1;
    return { n, text: text.trim(), depth };
}

/** A program's lines written back out, two spaces a level, which is the one canonical form. */
export const writeLines = (lines: { text: string; depth: number }[]): string[] =>
    lines.map((l) => `${"  ".repeat(Math.max(0, l.depth))}${l.text.trim()}`);

/**
 * A program as text, the way it reads typed rather than built: a line for each block, its words as
 * the block prints them, and two spaces a level where the blocks nest. It reads back as the same
 * program, line for line, so blocks and text are two printings of one program and not two languages.
 */
export const textOf = (code: readonly string[]): string[] =>
    writeLines(
        code.map((t, i) => {
            const l = lineOf(t, i + 1);
            return { depth: l.depth, text: l.text.split(/\s+/).join(" ") };
        }),
    );

const COLOUR_WORDS: Record<string, Colour> = {
    red: "red",
    blue: "blue",
    green: "green",
    yellow: "yellow",
    orange: "orange",
    black: "black",
    white: "white",
    r: "red",
    b: "blue",
    g: "green",
    y: "yellow",
    o: "orange",
    k: "black",
    w: "white",
};
const colourOf = (w: string | undefined): Colour | null => (w ? (COLOUR_WORDS[w] ?? null) : null);

const RESERVED = new Set([
    "right",
    "left",
    "up",
    "down",
    "forward",
    "forwards",
    "back",
    "backward",
    "backwards",
    "turn",
    "face",
    "pen",
    "paint",
    "colour",
    "color",
    "repeat",
    "if",
    "otherwise",
    "else",
    "when",
    "define",
    "to",
    "set",
    "add",
    "take",
    "change",
    "play",
    "rest",
    "flash",
    "light",
    "say",
    "wait",
    "move",
    "go",
    "step",
    "pick",
    "collect",
    "not",
    "until",
    "then",
    "times",
    "for",
    "ever",
    "forever",
    "list",
    "item",
    "of",
    "length",
    "each",
    "in",
    "and",
    "or",
    "random",
    "replace",
    "with",
    "broadcast",
    "switch",
    ...DANCES,
]);
const NAME = /^[a-z][a-z0-9_]*$/;
const isName = (w: string): boolean => NAME.test(w) && !RESERVED.has(w);

/** The words of a line, lower case, with the filler a child's phrasing adds taken out. */
function words(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[:.,!?]+$/g, "")
        .replace(/,/g, " ")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .split(/\s+/)
        .filter((w) => w && !["the", "an", "squares", "square", "steps", "degrees"].includes(w));
}

const atom = (w: string): Num | null =>
    /^-?\d+$/.test(w) ? { k: "lit", v: Number(w) } : isName(w) ? { k: "var", name: w } : null;

/** One number without an operation: a number, a name, item 2 of cargo, length of cargo, random 1 to 6. */
function readTerm(ws: string[]): Num | null {
    const [w0 = "", w1 = "", w2 = "", w3 = ""] = ws;
    if (ws.length === 1) return atom(w0);
    if (ws.length === 4 && w0 === "item" && w2 === "of" && isName(w3)) {
        const at = atom(w1);
        return at ? { k: "item", list: w3, at } : null;
    }
    if (ws.length === 3 && w0 === "length" && w1 === "of" && isName(w2))
        return { k: "length", list: w2 };
    if (w0 === "pick" && w1 === "random") return readTerm(ws.slice(1));
    if (ws.length === 4 && w0 === "random" && w2 === "to") {
        const lo = atom(w1),
            hi = atom(w3);
        return lo && hi ? { k: "random", lo, hi } : null;
    }
    return null;
}

const OPS: Record<string, Op> = {
    "+": "+",
    plus: "+",
    "-": "-",
    minus: "-",
    "*": "*",
    times: "*",
    "/": "/",
};

/** A number, or two joined by one operation, such as total + item 2 of cargo. */
function readNum(ws: string[]): Num | null {
    if (!ws.length) return null;
    const one = readTerm(ws);
    if (one) return one;
    for (let i = 1; i < ws.length - 1; i++) {
        const op = OPS[ws[i] ?? ""];
        if (!op) continue;
        const l = readTerm(ws.slice(0, i)),
            r = readTerm(ws.slice(i + 1));
        if (l && r) return { k: "op", op, l, r };
    }
    return null;
}

const STARTS_NUM = new Set(["item", "length", "random", "pick"]);

const CMP: [string[], ">" | "<" | "=" | "!=" | ">=" | "<="][] = [
    [["is", "not", "more", "than"], "<="],
    [["is", "not", "bigger", "than"], "<="],
    [["is", "not", "less", "than"], ">="],
    [["is", "not", "smaller", "than"], ">="],
    [["is", "not", "at", "least"], "<"],
    [["is", "not", "at", "most"], ">"],
    [["is", "more", "than"], ">"],
    [["is", "bigger", "than"], ">"],
    [["is", "greater", "than"], ">"],
    [["is", "less", "than"], "<"],
    [["is", "smaller", "than"], "<"],
    [["is", "fewer", "than"], "<"],
    [["is", "not"], "!="],
    [["is", "at", "least"], ">="],
    [["is", "at", "most"], "<="],
    [["is", "equal", "to"], "="],
    [["equals"], "="],
    [["is"], "="],
    [[">="], ">="],
    [["<="], "<="],
    [["!="], "!="],
    [[">"], ">"],
    [["<"], "<"],
    [["="], "="],
];

export function readCond(text: string): Cond | null {
    const ws = words(text);
    // or joins looser than and, so "a and b or c" asks (a and b) or c
    for (const join of ["or", "and"] as const) {
        for (let i = 1; i < ws.length - 1; i++) {
            if (ws[i] !== join) continue;
            const l = readCond(ws.slice(0, i).join(" ")),
                r = readCond(ws.slice(i + 1).join(" "));
            if (l && r) return join === "and" ? { k: "and", l, r } : { k: "or", l, r };
        }
    }
    if (ws[0] === "not" && ws.length > 1) {
        const c = readCond(ws.slice(1).join(" "));
        return c ? { k: "not", c } : null;
    }
    const s = ws.join(" ");
    if (/^(wall|rock|something|bush|water) ahead$|^blocked$|^way blocked$/.test(s))
        return { k: "ahead", what: "blocked" };
    if (/^(path|way|nothing|clear) ahead$|^(path|way) clear$|^clear$/.test(s))
        return { k: "ahead", what: "clear" };
    if (/^edge ahead$/.test(s)) return { k: "ahead", what: "edge" };
    if (/^(on a gem|on gem|gem here|a gem here|standing on a gem)$/.test(s))
        return { k: "here", what: "gem" };
    if (/^(at flag|on flag|flag here|at a flag)$/.test(s)) return { k: "here", what: "flag" };
    const on = /^(?:on|square is|standing on) (\w+)$/.exec(s);
    const onColour = on ? colourOf(on[1]) : null;
    if (onColour) return { k: "here", what: onColour };
    // "the number is more than 5" reads the variable called number
    const w0 = ws[0] ?? "";
    const ns = isName(w0) || /^-?\d+$/.test(w0) || STARTS_NUM.has(w0) ? ws : [];
    for (const [phrase, op] of CMP) {
        for (let i = 1; i + phrase.length <= ns.length; i++) {
            if (phrase.every((p, j) => ns[i + j] === p)) {
                const l = readNum(ns.slice(0, i)),
                    r = readNum(ns.slice(i + phrase.length));
                if (l && r) return { k: "cmp", op, l, r };
            }
        }
    }
    return null;
}

type Head =
    | { h: "step"; step: Step }
    | { h: "repeat"; times: Num }
    | { h: "forever" }
    | { h: "until"; cond: Cond }
    | { h: "if"; cond: Cond }
    | { h: "else" }
    | { h: "each"; name: string; list: string }
    | { h: "when"; event: Event }
    | { h: "receive"; message: string }
    | { h: "define"; name: string; params: string[] }
    | { h: "call"; name: string; args: Num[] };

const DIR_WORD: Record<string, Dir> = { right: "right", left: "left", up: "up", down: "down" };

/** What one line says, before nesting is known. */
function readLine(text: string, line: number, procs: Map<string, number>): Head | string {
    const raw = text.trim();
    const ws = words(raw);
    if (!ws.length) return "the line is empty";
    const [w0 = "", w1 = ""] = ws;
    const count = (rest: string[], what: string): Num | string => {
        const cleaned = rest.filter((w) => w !== "times");
        if (!cleaned.length) return { k: "lit", v: 1 };
        return readNum(cleaned) ?? `"${raw}": ${what} takes a number, such as ${what} 3`;
    };

    // events and procedures
    if (w0 === "when") {
        const rest = ws.slice(1).join(" ");
        const heard = /^(?:i )?(?:receive|hear|get) (.+)$/.exec(rest);
        if (heard?.[1]) return { h: "receive", message: heard[1] };
        if (/flag/.test(rest)) return { h: "when", event: "flag" };
        if (/(tapped|clicked|touched|pressed)/.test(rest)) return { h: "when", event: "tap" };
        return `"${raw}": a when block starts with "when the flag is tapped", "when tapped" or "when I receive" and a message`;
    }
    if ((w0 === "define" || w0 === "to") && ws.length >= 2) {
        const params = ws.slice(2);
        if (!isName(w1))
            return `"${raw}": ${w1} is already a block, so a define needs a name of its own`;
        const off = params.find((w) => !isName(w));
        return off === undefined
            ? { h: "define", name: w1, params }
            : `"${raw}": ${off} cannot name an input, because it is a word the blocks use`;
    }
    const inputs = procs.get(w0);
    if (inputs !== undefined) {
        // one input may be a sum, such as tree size / 2; two or more are a number or a name each
        const one = inputs === 1 && ws.length > 2 ? readNum(ws.slice(1)) : null;
        if (one) return { h: "call", name: w0, args: [one] };
        const args = ws.slice(1).map(atom);
        const all = args.flatMap((a) => (a ? [a] : []));
        if (all.length === args.length && args.length === inputs)
            return { h: "call", name: w0, args: all };
        return `"${raw}": ${w0} takes ${inputs === 0 ? "no numbers" : inputs === 1 ? "one number" : `${inputs} numbers`}`;
    }

    // control
    if (w0 === "repeat") {
        if (w1 === "until") {
            const c = readCond(ws.slice(2).join(" "));
            return c
                ? { h: "until", cond: c }
                : `"${raw}": repeat until needs a question, such as repeat until at flag`;
        }
        // the lamp world's block: a repeat with no count, which the run ends at its step limit
        if (w1 === "for" || w1 === "ever" || w1 === "forever") {
            const rest = ws.slice(1).join(" ");
            return rest === "for ever" || rest === "ever" || rest === "forever"
                ? { h: "forever" }
                : `"${raw}": repeat for ever takes no number`;
        }
        const times = count(ws.slice(1), "repeat");
        return typeof times === "string" ? times : { h: "repeat", times };
    }
    // a repeat that goes through a list, giving a name each of its items in turn
    if (w0 === "for") {
        const [, e = "", name = "", inWord = "", list = "", ...more] = ws;
        return e === "each" && isName(name) && inWord === "in" && isName(list) && !more.length
            ? { h: "each", name, list }
            : `"${raw}": a repeat through a list reads for each box in cargo`;
    }
    if (w0 === "if") {
        const c = readCond(
            ws
                .slice(1)
                .filter((w) => w !== "then")
                .join(" "),
        );
        return c ? { h: "if", cond: c } : `"${raw}": this question is not one a program can ask`;
    }
    if ((w0 === "otherwise" || w0 === "else") && ws.length === 1) return { h: "else" };

    // moving
    const go = (dir: Dir | "forward" | "back", rest: string[]): Head | string => {
        const n = count(rest, typeof dir === "string" ? dir : "move");
        return typeof n === "string" ? n : { h: "step", step: { t: "go", dir, n, line } };
    };
    const moveWords = ["go", "move", "step", "walk"];
    const m = moveWords.includes(w0) ? ws.slice(1) : ws;
    const m0 = m[0] ?? "",
        mDir = DIR_WORD[m0];
    if (m.length && mDir) return go(mDir, m.slice(1));
    if (m.length && ["forward", "forwards"].includes(m0)) return go("forward", m.slice(1));
    if (m.length && ["back", "backward", "backwards"].includes(m0)) return go("back", m.slice(1));
    if (moveWords.includes(w0) && (ws.length === 1 || readNum(ws.slice(1))))
        return go("forward", ws.slice(1));
    if (w0 === "turn") {
        // a turn with a number turns that many degrees, which a turtle needs for shapes other than squares
        if (w1 === "left" || w1 === "right") {
            if (ws.length === 2)
                return { h: "step", step: { t: "turn", way: w1, deg: null, line } };
            const deg = readNum(ws.slice(2));
            return deg
                ? { h: "step", step: { t: "turn", way: w1, deg, line } }
                : `"${raw}": turn right or turn left, with the degrees after it, such as turn right 60`;
        }
        if (w1 === "around" || w1 === "round")
            return { h: "step", step: { t: "turn", way: "around", deg: null, line } };
        const sw = switchOf(ws.slice(1), line);
        if (sw) return sw;
        return `"${raw}": turn left, turn right or turn around`;
    }
    const faceDir = DIR_WORD[w1];
    if (w0 === "face" && faceDir) return { h: "step", step: { t: "face", dir: faceDir, line } };

    // the pen and the paint
    if (w0 === "pen") {
        if (w1 === "up") return { h: "step", step: { t: "pen", down: false, colour: null, line } };
        if (w1 === "down")
            return { h: "step", step: { t: "pen", down: true, colour: colourOf(ws[2]), line } };
        if (colourOf(w1))
            return { h: "step", step: { t: "pen", down: true, colour: colourOf(w1), line } };
        return `"${raw}": pen up, pen down, or pen and a colour`;
    }
    if ((w0 === "paint" || w0 === "colour" || w0 === "color" || w0 === "fill") && ws.length <= 2) {
        const c = colourOf(w1);
        if (w1 && !c) return `"${raw}": ${w1} is not a colour we have (${COLOURS.join(", ")})`;
        return { h: "step", step: { t: "paint", colour: c, line } };
    }
    const runs = readRuns(ws);
    if (runs) return { h: "step", step: { t: "row", runs, line } };
    if ((w0 === "pick" && w1 === "up") || w0 === "collect")
        return { h: "step", step: { t: "pick", line } };

    // moving to music, and making a sound
    if (isDance(w0)) {
        const n = count(ws.slice(1), w0);
        return typeof n === "string" ? n : { h: "step", step: { t: "dance", move: w0, n, line } };
    }
    if (w0 === "play") {
        const note = raw.split(/\s+/)[1] ?? "";
        if (!/^[A-Ga-g](s|f|#|b)?\d?$/.test(note))
            return `"${raw}": play a note by its letter, such as play C or play E4`;
        const beats = Number(ws[2] ?? 1);
        return {
            h: "step",
            step: {
                t: "play",
                note: note.charAt(0).toUpperCase() + note.slice(1),
                beats: Number.isFinite(beats) && beats > 0 ? beats : 1,
                line,
            },
        };
    }
    if (w0 === "rest" || w0 === "wait") {
        const beats = Number(ws[1] ?? 1);
        return {
            h: "step",
            step: { t: "rest", beats: Number.isFinite(beats) && beats > 0 ? beats : 1, line },
        };
    }
    // the lamp world's block: a long or a short flash, read against a key as a message
    if (w0 === "flash") {
        return ws.length === 2 && (w1 === "long" || w1 === "short")
            ? { h: "step", step: { t: "flash", long: w1 === "long", line } }
            : `"${raw}": flash long or flash short`;
    }
    // the lamp world's other block: the lamp lit in one colour, which the run keeps in order
    if (w0 === "light") {
        const c = colourOf(w1);
        return ws.length === 2 && c
            ? { h: "step", step: { t: "light", colour: c, line } }
            : `"${raw}": light takes a colour (${COLOURS.join(", ")})`;
    }
    if (w0 === "switch")
        return (
            switchOf(ws.slice(1), line) ??
            `"${raw}": switch a thing on or off by its name, such as switch heater on`
        );
    if (w0 === "broadcast") {
        return ws.length > 1
            ? { h: "step", step: { t: "broadcast", message: ws.slice(1).join(" "), line } }
            : `"${raw}": broadcast a message by its name, such as broadcast go`;
    }
    if (w0 === "say") {
        const said = raw.replace(/^say\s*/i, "").replace(/^["“](.*)["”]$/, "$1");
        return { h: "step", step: { t: "say", text: said, line } };
    }

    // numbers with names
    if (w0 === "set" && ws.length >= 4 && isName(w1) && ws[2] === "to" && ws[3] === "list") {
        const items = ws.slice(4).map(atom);
        const all = items.flatMap((a) => (a ? [a] : []));
        return all.length === items.length
            ? { h: "step", step: { t: "list", name: w1, items: all, line } }
            : `"${raw}": a list is numbers after the word list, such as set cargo to list 4, 7, 2`;
    }
    if (w0 === "replace") {
        const [, it = "", at = "", of = "", list = "", wi = "", ...rest] = ws;
        const pos = atom(at),
            to = readNum(rest);
        return it === "item" && pos && of === "of" && isName(list) && wi === "with" && to
            ? { h: "step", step: { t: "replace", list, at: pos, to, line } }
            : `"${raw}": replace item 2 of cargo with 9`;
    }
    if (w0 === "set" && ws.length >= 4 && isName(w1) && ws[2] === "to") {
        const to = readNum(ws.slice(3));
        return to
            ? { h: "step", step: { t: "set", name: w1, to, line } }
            : `"${raw}": set a name to a number, such as set n to 4`;
    }
    if (w0 === "add") {
        const at = ws.lastIndexOf("to");
        const by = at > 1 ? readNum(ws.slice(1, at)) : null,
            name = ws[at + 1];
        return by && name && isName(name)
            ? { h: "step", step: { t: "change", name, by, add: true, line } }
            : `"${raw}": add a number to a name, such as add 3 to n`;
    }
    if (w0 === "take" || w0 === "subtract") {
        const at = ws.lastIndexOf("from"),
            from = ws[1] === "away" ? 2 : 1;
        const by = at > from ? readNum(ws.slice(from, at)) : null,
            name = ws[at + 1];
        return by && name && isName(name)
            ? {
                  h: "step",
                  step: {
                      t: "change",
                      name,
                      by: { k: "op", op: "-", l: { k: "lit", v: 0 }, r: by },
                      add: false,
                      line,
                  },
              }
            : `"${raw}": take a number from a name, such as take 1 from n`;
    }
    if (w0 === "change" && ws[2] === "by" && isName(w1)) {
        const by = readNum(ws.slice(3));
        return by
            ? { h: "step", step: { t: "change", name: w1, by, add: false, line } }
            : `"${raw}": change a name by a number, such as change n by 2`;
    }
    if (w0 === "double" && isName(w1) && ws.length === 2) {
        return {
            h: "step",
            step: { t: "change", name: w1, by: { k: "var", name: w1 }, add: false, line },
        };
    }
    return `"${raw}" is not a block we know`;
}

/** "heater on", "on heater" or "heater off": a thing the program switches, by its name. */
function switchOf(ws: string[], line: number): Head | null {
    const [a = "", b = "", ...more] = ws;
    if (more.length) return null;
    const on = a === "on" || b === "on",
        off = a === "off" || b === "off";
    const name = on || off ? (a === "on" || a === "off" ? b : a) : "";
    return isName(name) ? { h: "step", step: { t: "switch", name, on, line } } : null;
}

/** "2 white 3 red 2 white": a row of pixel art, as how many of each colour from the left. */
function readRuns(ws: string[]): { n: Num; colour: Colour }[] | null {
    const out: { n: Num; colour: Colour }[] = [];
    for (let i = 0; i < ws.length; i++) {
        const w = ws[i] ?? "",
            next = colourOf(ws[i + 1]);
        if (/^\d+$/.test(w) && next) {
            out.push({ n: { k: "lit", v: Number(w) }, colour: next });
            i++;
            continue;
        }
        // a colour on its own is one square of it, but only written out in full: "b" alone could be a name
        const one = w.length > 1 ? colourOf(w) : null;
        if (one) {
            out.push({ n: { k: "lit", v: 1 }, colour: one });
            continue;
        }
        return null;
    }
    return out.length ? out : null;
}

/** Read a program from its lines. Problems are collected, not thrown, so one mistake does not hide the next. */
export function parse(code: readonly string[]): Program {
    const lines = code
        .map((t, i) => lineOf(t, i + 1))
        .filter((l) => l.text.length > 0 && !l.text.startsWith("#"));
    const problems: { line: number; message: string }[] = [];
    const procNames = new Map<string, number>();
    for (const l of lines) {
        const ws = words(l.text);
        const [d0, d1 = ""] = ws;
        if ((d0 === "define" || d0 === "to") && ws.length >= 2 && ws.slice(1).every(isName))
            procNames.set(d1, ws.length - 2);
    }
    const heads = lines.map((l) => ({ l, head: readLine(l.text, l.n, procNames) }));
    for (const { l, head } of heads)
        if (typeof head === "string") problems.push({ line: l.n, message: head });

    let i = 0;
    /** The lines deeper than `depth` from here on, as steps. */
    function block(depth: number): Step[] {
        const out: Step[] = [];
        for (let at = heads[i]; at && at.l.depth > depth; at = heads[i]) {
            const { l, head } = at;
            if (typeof head === "string") {
                i++;
                skipDeeper(l.depth);
                continue;
            }
            if (head.h === "when" || head.h === "receive" || head.h === "define") {
                problems.push({ line: l.n, message: `"${l.text}" has to start at the left edge` });
                i++;
                skipDeeper(l.depth);
                continue;
            }
            if (head.h === "else") {
                problems.push({
                    line: l.n,
                    message: "otherwise has to come straight after the lines of an if",
                });
                i++;
                skipDeeper(l.depth);
                continue;
            }
            out.push(...stepFrom(l, head));
        }
        return out;
    }
    function skipDeeper(depth: number): void {
        while ((heads[i]?.l.depth ?? -1) > depth) i++;
    }
    function body(l: Line, what: string): Step[] {
        const got = block(l.depth);
        if (!got.length)
            problems.push({
                line: l.n,
                message: `${what} needs the lines it holds written under it, one step further in`,
            });
        return got;
    }
    function stepFrom(l: Line, head: Head): Step[] {
        i++;
        if (head.h === "step") {
            const under = heads[i];
            if (under && under.l.depth > l.depth)
                problems.push({
                    line: under.l.n,
                    message: `line ${under.l.n} is further in than line ${l.n}, which holds nothing`,
                });
            skipDeeper(l.depth);
            return [head.step];
        }
        if (head.h === "call") return [{ t: "call", name: head.name, args: head.args, line: l.n }];
        if (head.h === "each")
            return [
                {
                    t: "each",
                    name: head.name,
                    list: head.list,
                    body: body(l, "a repeat"),
                    line: l.n,
                },
            ];
        if (head.h === "repeat")
            return [{ t: "repeat", times: head.times, body: body(l, "a repeat"), line: l.n }];
        if (head.h === "forever") return [{ t: "forever", body: body(l, "a repeat"), line: l.n }];
        if (head.h === "until")
            return [{ t: "until", cond: head.cond, body: body(l, "a repeat"), line: l.n }];
        if (head.h === "if") {
            const ifTrue = body(l, "an if");
            let otherwise: Step[] = [],
                elseLine = 0;
            const next = heads[i];
            if (
                next &&
                next.l.depth === l.depth &&
                typeof next.head !== "string" &&
                next.head.h === "else"
            ) {
                elseLine = next.l.n;
                i++;
                otherwise = body(next.l, "otherwise");
            }
            return [{ t: "if", cond: head.cond, ifTrue, otherwise, line: l.n, elseLine }];
        }
        return [];
    }

    const scripts: Script[] = [];
    const procs = new Map<string, Proc>();
    let current: Script = { event: "flag", message: "", steps: [], line: 0 };
    for (let at = heads[i]; at; at = heads[i]) {
        const { l, head } = at;
        if (typeof head === "string") {
            i++;
            skipDeeper(l.depth);
            continue;
        }
        if (head.h === "when") {
            // The lines under a hat belong to it whether or not they are written further in, the way
            // blocks hang under a hat, until the next hat or the next define.
            if (current.steps.length || current.line) scripts.push(current);
            current = { event: head.event, message: "", steps: [], line: l.n };
            i++;
            continue;
        }
        if (head.h === "receive") {
            if (current.steps.length || current.line) scripts.push(current);
            current = { event: "message", message: head.message, steps: [], line: l.n };
            i++;
            continue;
        }
        if (head.h === "define") {
            i++;
            const got = block(l.depth);
            if (!got.length)
                problems.push({
                    line: l.n,
                    message: `define ${head.name} needs its lines written under it, one step further in`,
                });
            procs.set(head.name, { params: head.params, body: got, line: l.n });
            continue;
        }
        if (head.h === "else") {
            problems.push({
                line: l.n,
                message: "otherwise has to come straight after the lines of an if",
            });
            i++;
            skipDeeper(l.depth);
            continue;
        }
        current.steps.push(...stepFrom(l, head));
    }
    if (current.steps.length || current.line || !scripts.length) scripts.push(current);
    return { lines, scripts, procs, problems };
}

/** Where a program runs: a grid of squares with things on some of them. Squares are counted from 1. */
export interface World {
    cols: number;
    rows: number;
    start: { col: number; row: number };
    face: Dir;
    /** Squares the robot cannot enter, by key. */
    blocked: Set<number>;
    gems: Set<number>;
    flag: number | null;
    /** Squares painted before the program starts, which "on red" reads. */
    colours: Map<number, Colour>;
    /** Whether the pen starts down: the turtle draws, the robot does not. */
    pen: boolean;
    /** A printer paints rows from the top left and moves on a row at the end of each line. */
    printer: boolean;
    /** What the program's sensors read, which a wait moves on a minute at a time. */
    sense: Sense[];
}

/**
 * A number a sensor reads, which the program can ask about and cannot set: a thermometer, a tank's
 * level, the daylight. Each minute it follows its readings, when it has them, or changes by its
 * drift and by what each switch that is on adds, so a heater the program switches on warms the room
 * the program is reading. It stays between its least and most.
 */
export interface Sense {
    name: string;
    start: number;
    drift: number;
    by: Record<string, number>;
    reads: number[];
    least: number | null;
    most: number | null;
}

/**
 * A drawing's `sense` setting read as sensors, one a line: "temp starts 15 changes -1 heater 2
 * least 0 most 40" for a number the program's switches move, and "daylight reads 9 7 5 3 1" for one
 * that follows its readings minute by minute and keeps the last.
 */
export function senseOf(lines: readonly string[]): { sense: Sense[]; problems: string[] } {
    const sense: Sense[] = [],
        problems: string[] = [];
    for (const text of lines) {
        const ws = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const [name = "", ...rest] = ws;
        if (!ws.length) continue;
        if (!isName(name)) {
            problems.push(
                `"${text}": a sensor needs a name of its own, and ${name} is a word the blocks use`,
            );
            continue;
        }
        const s: Sense = { name, start: 0, drift: 0, by: {}, reads: [], least: null, most: null };
        const whole = (w: string | undefined): number | null =>
            w !== undefined && /^[+-]?\d+$/.test(w) ? Number(w) : null;
        let bad = "";
        for (let i = 0; i < rest.length && !bad;) {
            const w = rest[i] ?? "";
            if (w === "reads") {
                const got = rest.slice(i + 1).map(whole);
                const all = got.flatMap((x) => (x === null ? [] : [x]));
                if (!all.length || all.length !== got.length) bad = "reads takes whole numbers";
                s.reads = all;
                i = rest.length;
                continue;
            }
            const n = whole(rest[i + 1]);
            if (n === null) {
                bad = `${w} takes a whole number after it`;
                continue;
            }
            if (w === "starts") s.start = n;
            else if (w === "changes") s.drift = n;
            else if (w === "least") s.least = n;
            else if (w === "most") s.most = n;
            else if (isName(w)) s.by[w] = n;
            else bad = `${w} is not a switch's name`;
            i += 2;
        }
        if (bad) problems.push(`"${text}": ${bad}`);
        else sense.push(s);
    }
    return { sense, problems };
}

const bounded = (s: Sense, v: number): number =>
    Math.min(s.most ?? Infinity, Math.max(s.least ?? -Infinity, v));

export const keyOf = (w: { cols: number }, col: number, row: number): number =>
    (row - 1) * w.cols + (col - 1);
export const cellOf = (w: { cols: number }, key: number): { col: number; row: number } => ({
    col: (key % w.cols) + 1,
    row: Math.floor(key / w.cols) + 1,
});

export function world(o: Partial<World> & { cols: number; rows: number }): World {
    return {
        start: { col: 1, row: 1 },
        face: "right",
        blocked: new Set(),
        gems: new Set(),
        flag: null,
        colours: new Map(),
        pen: false,
        printer: false,
        sense: [],
        ...o,
    };
}

/** Pairs written flat, [2, 3, 5, 1], as squares: column 2 row 3, then column 5 row 1. */
export function pairs(list: readonly number[]): { col: number; row: number }[] {
    const out: { col: number; row: number }[] = [];
    for (let i = 0; i + 1 < list.length; i += 2)
        out.push({ col: Math.round(list[i] ?? 0), row: Math.round(list[i + 1] ?? 0) });
    return out;
}

/**
 * A maze from a map of rows, one character a square: `.` open, `#` a rock, `~` water, `*` a gem,
 * `F` the flag, `S` where the robot starts, and a colour's first letter (r, b, g, y, o) for a
 * painted square. Spaces between characters are ignored, so a map can be written "S . # .".
 */
export function mazeWorld(o: {
    cols: number;
    rows: number;
    map: readonly string[];
    col: number;
    row: number;
    face: Dir;
    flag: readonly number[];
    gems: readonly number[];
    rocks: readonly number[];
}): World {
    const rows = o.map.map((r) => r.replace(/\s+/g, ""));
    const cols = rows.length ? Math.max(...rows.map((r) => r.length)) : o.cols;
    const w = world({
        cols: Math.max(1, cols),
        rows: Math.max(1, rows.length || o.rows),
        face: o.face,
    });
    let start = { col: o.col, row: o.row };
    rows.forEach((r, ri) =>
        Array.from(r).forEach((ch, ci) => {
            const k = keyOf(w, ci + 1, ri + 1),
                colour = colourOf(ch.toLowerCase());
            if (ch === "#" || ch === "~") w.blocked.add(k);
            else if (ch === "*") w.gems.add(k);
            else if (ch === "F" || ch === "f") w.flag = k;
            else if (ch === "S" || ch === "s") start = { col: ci + 1, row: ri + 1 };
            else if (colour && ch !== "." && ch.toLowerCase() !== "w") w.colours.set(k, colour);
        }),
    );
    const inside = (c: { col: number; row: number }) =>
        c.col >= 1 && c.col <= w.cols && c.row >= 1 && c.row <= w.rows;
    for (const c of pairs(o.rocks)) if (inside(c)) w.blocked.add(keyOf(w, c.col, c.row));
    for (const c of pairs(o.gems)) if (inside(c)) w.gems.add(keyOf(w, c.col, c.row));
    const f = pairs(o.flag)[0];
    if (f && inside(f)) w.flag = keyOf(w, f.col, f.row);
    w.start = start;
    return w;
}

export interface Segment {
    from: { col: number; row: number };
    to: { col: number; row: number };
    colour: Colour;
}

export interface State {
    /** A whole square, except after a move along a heading that is not a quarter turn. */
    col: number;
    row: number;
    face: Dir;
    /** The heading in degrees, clockwise from facing right; `face` is the same heading on the grid. */
    angle: number;
    pen: boolean;
    ink: Colour;
    vars: Record<string, number>;
    lists: Record<string, number[]>;
    painted: Map<number, Colour>;
    got: number[];
    said: string;
    /** The row a printer is on, from 1. */
    printRow: number;
    /** What the lamp has flashed so far, in order. */
    flashes: ("long" | "short")[];
    /** The colours the lamp has been lit in so far, in order. */
    lights: Colour[];
    /** Minutes passed, one for each beat a wait waits. */
    time: number;
    /** The things the program has switched, and whether each is on. */
    on: Record<string, boolean>;
}

type FrameKind = Step["t"] | "bump" | "test";

/** One thing the program did: the line that did it, and the world after it. */
export interface Frame {
    /** From 1, counting every frame, so "after step 3" is frames[2]. */
    step: number;
    line: number;
    kind: FrameKind;
    /** For a move, every square passed through, starting with where it began. */
    path: { col: number; row: number }[];
    drew: Segment[];
    state: State;
    /** For a repeat: which time round this is, and how many there are. For an if: which way it went. */
    round?: { i: number; of: number };
    went?: boolean;
    note?: string;
    beats?: number;
    flash?: "long" | "short";
    /** For a light: the colour the lamp is showing after it. */
    colour?: Colour;
    move?: Dance;
    times?: number;
    said?: string;
    bump?: { col: number; row: number; why: "rock" | "edge" };
    /** For a turn: how many degrees, right positive. */
    deg?: number;
    /** For a broadcast: the message sent. */
    message?: string;
    /** For a switch: the thing switched, and whether it was on before. */
    switched?: { name: string; on: boolean; was: boolean };
}

/** What the sensors read and what was switched on, at the start and after each minute. */
export interface Minute {
    minute: number;
    values: Record<string, number>;
    on: Record<string, boolean>;
}

export interface Run {
    frames: Frame[];
    start: State;
    end: State;
    /** Every square the robot stood on or passed over, in order, from the start. */
    visits: { col: number; row: number }[];
    segments: Segment[];
    stopped: "end" | "bump" | "limit";
    /** How many times each line ran, by line number. */
    counts: Map<number, number>;
    problems: string[];
    /** How many random numbers the run drew, so a checker knows the run was one of several. */
    rolls: number;
    /** The sensors at the start and after every minute a wait let pass. */
    minutes: Minute[];
}

const LIMIT = 2000;

const turned = (d: Dir, by: number): Dir => DIRS[(DIRS.indexOf(d) + by + 4) % 4] ?? d;
const ANGLE_OF: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const DELTA: Record<Dir, [number, number]> = {
    right: [1, 0],
    down: [0, 1],
    left: [-1, 0],
    up: [0, -1],
};

function copy(s: State): State {
    return {
        ...s,
        vars: { ...s.vars },
        lists: Object.fromEntries(Object.entries(s.lists).map(([k, v]) => [k, [...v]])),
        painted: new Map(s.painted),
        got: [...s.got],
        flashes: [...s.flashes],
        lights: [...s.lights],
        on: { ...s.on },
    };
}

/** Where a random number comes from: the lowest and highest it may be, and which draw this is. */
type Roll = (lo: number, hi: number, i: number) => number;

function evalNum(
    n: Num,
    s: { vars: Record<string, number>; lists: Record<string, number[]> },
    roll: (lo: number, hi: number) => number,
): number {
    if (n.k === "lit") return n.v;
    if (n.k === "var") {
        const v = s.vars[n.name];
        if (v === undefined)
            throw new RunError(
                n.name in s.lists
                    ? `${n.name} is a list: use item 1 of ${n.name}, or length of ${n.name}`
                    : `${n.name} has no number yet: set it before it is used`,
            );
        return v;
    }
    if (n.k === "item" || n.k === "length") {
        const list = s.lists[n.list];
        if (!list) throw new RunError(`there is no list called ${n.list}: set it to a list first`);
        if (n.k === "length") return list.length;
        const at = evalNum(n.at, s, roll),
            v = list[at - 1];
        if (v === undefined)
            throw new RunError(`${n.list} has no item ${at}: it holds ${list.length} items`);
        return v;
    }
    if (n.k === "random") {
        const a = evalNum(n.lo, s, roll),
            b = evalNum(n.hi, s, roll);
        return roll(Math.min(a, b), Math.max(a, b));
    }
    const l = evalNum(n.l, s, roll),
        r = evalNum(n.r, s, roll);
    if (n.op === "/") {
        if (r === 0)
            throw new RunError(`${l} / 0 has no answer: nothing can be shared into 0 parts`);
        if (l % r !== 0)
            throw new RunError(
                `${l} / ${r} is not a whole number, and a name holds whole numbers only`,
            );
        return l / r;
    }
    return n.op === "+" ? l + r : n.op === "-" ? l - r : l * r;
}

/** A small seeded generator, so a run that draws random numbers still gives the same frames each time. */
function seeded(seed: number): Roll {
    let a = seed >>> 0 || 1;
    return (lo, hi) => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        return lo + Math.floor(u * (hi - lo + 1));
    };
}

/** A position kept to six places, so a turtle that walks round a shape lands back where it began. */
const exact = (x: number): number => Math.round(x * 1e6) / 1e6;

class RunError extends Error {}

/** Run one script of a program in a world. The same program, world and inputs always give the same frames. */
export function run(
    p: Program,
    w: World,
    o: { event?: Event; vars?: Record<string, number>; seed?: number; roll?: Roll } = {},
): Run {
    const s: State = {
        col: w.start.col,
        row: w.start.row,
        face: w.face,
        angle: ANGLE_OF[w.face],
        pen: w.pen,
        ink: "black",
        vars: { ...o.vars },
        lists: {},
        painted: new Map(),
        got: [],
        said: "",
        printRow: 1,
        flashes: [],
        lights: [],
        time: 0,
        on: {},
    };
    for (const x of w.sense) s.vars[x.name] = bounded(x, x.reads[0] ?? x.start);
    if (w.printer) {
        s.col = 1;
        s.row = 1;
    }
    const start = copy(s);
    const frames: Frame[] = [],
        visits = [{ col: s.col, row: s.row }],
        segments: Segment[] = [];
    const counts = new Map<number, number>();
    const problems = p.problems.map((x) => `line ${x.line}: ${x.message}`);
    const sensed = new Set(w.sense.map((x) => x.name));
    const reading = (): Minute => ({
        minute: s.time,
        values: Object.fromEntries(w.sense.map((x) => [x.name, s.vars[x.name] ?? 0])),
        on: { ...s.on },
    });
    const minutes: Minute[] = [reading()];
    const tick = (): void => {
        s.time++;
        for (const x of w.sense) {
            const was = s.vars[x.name] ?? x.start;
            const next = x.reads.length
                ? (x.reads[Math.min(s.time, x.reads.length - 1)] ?? was)
                : Object.entries(x.by).reduce(
                      (v, [sw, by]) => v + (s.on[sw] ? by : 0),
                      was + x.drift,
                  );
            s.vars[x.name] = bounded(x, next);
        }
        minutes.push(reading());
    };
    const unsensed = (name: string): void => {
        if (sensed.has(name))
            throw new RunError(
                `${name} is what a sensor reads: a program asks about it, and cannot set it`,
            );
    };
    const draw = o.roll ?? seeded(o.seed ?? 1);
    let rolls = 0;
    const roll = (lo: number, hi: number): number => draw(lo, hi, rolls++);
    const num = (n: Num): number => evalNum(n, s, roll);
    let stopped: Run["stopped"] = "end";
    const collect = (col: number, row: number) => {
        const k = keyOf(w, col, row);
        if (w.gems.has(k) && !s.got.includes(k)) s.got.push(k);
    };
    collect(s.col, s.row);

    const push = (f: Omit<Frame, "step" | "state">) => {
        frames.push({ ...f, step: frames.length + 1, state: copy(s) });
        counts.set(f.line, (counts.get(f.line) ?? 0) + 1);
        if (frames.length >= LIMIT) throw new Stop("limit");
    };
    const blockedAt = (col: number, row: number): "rock" | "edge" | null =>
        col < 1 || row < 1 || col > w.cols || row > w.rows
            ? "edge"
            : w.blocked.has(keyOf(w, col, row))
              ? "rock"
              : null;
    // A move along a heading that is not a quarter turn goes straight in one line and leaves the
    // squares, which only a turtle drawing a shape does; it stops at the edge of the paper.
    const slant = (line: number, n: number): void => {
        const rad = (s.angle * Math.PI) / 180;
        const to = { col: exact(s.col + n * Math.cos(rad)), row: exact(s.row + n * Math.sin(rad)) };
        const off =
            to.col < 1 - 1e-6 ||
            to.row < 1 - 1e-6 ||
            to.col > w.cols + 1e-6 ||
            to.row > w.rows + 1e-6;
        if (off) {
            push({ line, kind: "go", path: [{ col: s.col, row: s.row }], drew: [] });
            push({
                line,
                kind: "bump",
                path: [{ col: s.col, row: s.row }],
                drew: [],
                bump: { col: Math.round(to.col), row: Math.round(to.row), why: "edge" },
            });
            throw new Stop("bump");
        }
        const drew: Segment[] = [];
        if (s.pen) {
            const seg = { from: { col: s.col, row: s.row }, to, colour: s.ink };
            drew.push(seg);
            segments.push(seg);
        }
        const path = [{ col: s.col, row: s.row }, to];
        s.col = to.col;
        s.row = to.row;
        visits.push(to);
        push({ line, kind: "go", path, drew });
    };
    const test = (c: Cond): boolean => {
        if (c.k === "not") return !test(c.c);
        if (c.k === "and") return test(c.l) && test(c.r);
        if (c.k === "or") return test(c.l) || test(c.r);
        if (c.k === "cmp") {
            const l = num(c.l),
                r = num(c.r);
            return c.op === ">"
                ? l > r
                : c.op === "<"
                  ? l < r
                  : c.op === "="
                    ? l === r
                    : c.op === "!="
                      ? l !== r
                      : c.op === ">="
                        ? l >= r
                        : l <= r;
        }
        if (c.k === "ahead") {
            const [dx, dy] = DELTA[s.face],
                why = blockedAt(s.col + dx, s.row + dy);
            return c.what === "blocked"
                ? why !== null
                : c.what === "clear"
                  ? why === null
                  : why === "edge";
        }
        const k = keyOf(w, s.col, s.row);
        if (c.what === "gem") return w.gems.has(k) && !s.got.includes(k);
        if (c.what === "flag") return w.flag === k;
        return (s.painted.get(k) ?? w.colours.get(k)) === c.what;
    };

    function exec(steps: Step[], depth: number): void {
        for (const st of steps) one(st, depth);
    }
    function one(st: Step, depth: number): void {
        switch (st.t) {
            case "go": {
                const n = num(st.n);
                if ((st.dir === "forward" || st.dir === "back") && s.angle % 90 !== 0) {
                    slant(st.line, st.dir === "back" ? -n : n);
                    return;
                }
                const dir =
                    st.dir === "forward" ? s.face : st.dir === "back" ? turned(s.face, 2) : st.dir;
                // An arrow move turns the robot to face the way it goes, which is what a child expects to see;
                // forward and back leave the heading as it was.
                if (st.dir !== "forward" && st.dir !== "back") {
                    s.face = dir;
                    s.angle = ANGLE_OF[dir];
                }
                const [dx, dy] = DELTA[dir];
                const path = [{ col: s.col, row: s.row }],
                    drew: Segment[] = [];
                const steps = Math.abs(Math.round(n)),
                    sign = n < 0 ? -1 : 1;
                for (let k = 0; k < steps; k++) {
                    const nc = s.col + dx * sign,
                        nr = s.row + dy * sign,
                        why = blockedAt(nc, nr);
                    if (why) {
                        push({ line: st.line, kind: "go", path, drew });
                        push({
                            line: st.line,
                            kind: "bump",
                            path: [{ col: s.col, row: s.row }],
                            drew: [],
                            bump: { col: nc, row: nr, why },
                        });
                        throw new Stop("bump");
                    }
                    if (s.pen) {
                        const seg = {
                            from: { col: s.col, row: s.row },
                            to: { col: nc, row: nr },
                            colour: s.ink,
                        };
                        drew.push(seg);
                        segments.push(seg);
                    }
                    s.col = nc;
                    s.row = nr;
                    path.push({ col: nc, row: nr });
                    visits.push({ col: nc, row: nr });
                    collect(nc, nr);
                }
                push({ line: st.line, kind: "go", path, drew });
                return;
            }
            case "turn": {
                const by = st.deg ? num(st.deg) : st.way === "around" ? 180 : 90;
                const deg = st.way === "left" ? -by : by;
                s.angle = (((s.angle + deg) % 360) + 360) % 360;
                if (s.angle % 90 === 0) s.face = DIRS[s.angle / 90] ?? s.face;
                push({ line: st.line, kind: "turn", path: [], drew: [], deg });
                return;
            }
            case "face":
                s.face = st.dir;
                s.angle = ANGLE_OF[st.dir];
                push({ line: st.line, kind: "face", path: [], drew: [] });
                return;
            case "pen":
                s.pen = st.down;
                if (st.colour) s.ink = st.colour;
                push({ line: st.line, kind: "pen", path: [], drew: [] });
                return;
            case "paint":
                s.painted.set(keyOf(w, s.col, s.row), st.colour ?? s.ink);
                if (st.colour) s.ink = st.colour;
                push({ line: st.line, kind: "paint", path: [], drew: [] });
                return;
            case "row": {
                let col = w.printer ? 1 : s.col;
                const row = w.printer ? s.printRow : s.row;
                for (const r of st.runs) {
                    const n = num(r.n);
                    for (let k = 0; k < n; k++) {
                        if (col >= 1 && col <= w.cols && row >= 1 && row <= w.rows)
                            s.painted.set(keyOf(w, col, row), r.colour);
                        col++;
                    }
                }
                if (w.printer) {
                    s.printRow++;
                    s.col = 1;
                    s.row = Math.min(w.rows, s.printRow);
                }
                push({ line: st.line, kind: "row", path: [], drew: [] });
                return;
            }
            case "pick":
                collect(s.col, s.row);
                push({ line: st.line, kind: "pick", path: [], drew: [] });
                return;
            case "dance":
                push({
                    line: st.line,
                    kind: "dance",
                    path: [],
                    drew: [],
                    move: st.move,
                    times: Math.max(1, Math.round(num(st.n))),
                });
                return;
            case "play":
                push({
                    line: st.line,
                    kind: "play",
                    path: [],
                    drew: [],
                    note: st.note,
                    beats: st.beats,
                });
                return;
            case "rest":
                // a beat is a minute to the sensors, so a program that waits lets the world move on
                for (let k = 0; k < st.beats; k++) tick();
                push({ line: st.line, kind: "rest", path: [], drew: [], beats: st.beats });
                return;
            case "switch": {
                const was = s.on[st.name] === true;
                s.on[st.name] = st.on;
                push({
                    line: st.line,
                    kind: "switch",
                    path: [],
                    drew: [],
                    switched: { name: st.name, on: st.on, was },
                });
                return;
            }
            case "broadcast": {
                push({ line: st.line, kind: "broadcast", path: [], drew: [], message: st.message });
                // every script that hears the message runs to its end before the next line, in the
                // order they are written, so the run stays one fixed order a checker can read
                if (depth > 20)
                    throw new RunError(
                        `${st.message} starts the scripts that send it too many times over`,
                    );
                for (const sc of p.scripts)
                    if (sc.event === "message" && sc.message === st.message)
                        exec(sc.steps, depth + 1);
                return;
            }
            case "flash": {
                // a long flash lasts two beats and a short one one, as play and rest count them
                const flash = st.long ? "long" : "short";
                s.flashes.push(flash);
                push({
                    line: st.line,
                    kind: "flash",
                    path: [],
                    drew: [],
                    beats: st.long ? 2 : 1,
                    flash,
                });
                return;
            }
            case "light": {
                s.lights.push(st.colour);
                push({ line: st.line, kind: "light", path: [], drew: [], colour: st.colour });
                return;
            }
            case "say":
                s.said = st.text;
                push({ line: st.line, kind: "say", path: [], drew: [], said: st.text });
                return;
            case "set":
                unsensed(st.name);
                s.vars[st.name] = num(st.to);
                delete s.lists[st.name];
                push({ line: st.line, kind: "set", path: [], drew: [] });
                return;
            case "change": {
                const list = s.lists[st.name];
                if (list) {
                    if (!st.add)
                        throw new RunError(
                            `${st.name} is a list: add a number to it, or replace one of its items`,
                        );
                    list.push(num(st.by));
                    push({ line: st.line, kind: "change", path: [], drew: [] });
                    return;
                }
                unsensed(st.name);
                const was = s.vars[st.name];
                if (was === undefined)
                    throw new RunError(`${st.name} has no number yet: set it before it is changed`);
                s.vars[st.name] = was + num(st.by);
                push({ line: st.line, kind: "change", path: [], drew: [] });
                return;
            }
            case "list":
                unsensed(st.name);
                s.lists[st.name] = st.items.map(num);
                delete s.vars[st.name];
                push({ line: st.line, kind: "list", path: [], drew: [] });
                return;
            case "replace": {
                const list = s.lists[st.list];
                if (!list)
                    throw new RunError(
                        `there is no list called ${st.list}: set it to a list first`,
                    );
                const at = num(st.at);
                if (at < 1 || at > list.length)
                    throw new RunError(
                        `${st.list} has no item ${at}: it holds ${list.length} items`,
                    );
                list[at - 1] = num(st.to);
                push({ line: st.line, kind: "replace", path: [], drew: [] });
                return;
            }
            case "each": {
                const list = s.lists[st.list];
                if (!list)
                    throw new RunError(
                        `there is no list called ${st.list}: set it to a list first`,
                    );
                // the items as they were when the repeat began, so adding to the list inside it cannot run for ever
                const items = [...list];
                for (const [k, v] of items.entries()) {
                    s.vars[st.name] = v;
                    push({
                        line: st.line,
                        kind: "each",
                        path: [],
                        drew: [],
                        round: { i: k + 1, of: items.length },
                    });
                    exec(st.body, depth);
                }
                return;
            }
            case "repeat": {
                const n = Math.max(0, Math.round(num(st.times)));
                for (let k = 1; k <= n; k++) {
                    push({
                        line: st.line,
                        kind: "repeat",
                        path: [],
                        drew: [],
                        round: { i: k, of: n },
                    });
                    exec(st.body, depth);
                }
                return;
            }
            case "forever": {
                // no count and no question: the run ends at the step limit, with a limit frame
                for (let k = 1; ; k++) {
                    push({
                        line: st.line,
                        kind: "forever",
                        path: [],
                        drew: [],
                        round: { i: k, of: 0 },
                    });
                    exec(st.body, depth);
                }
            }
            case "until": {
                for (let k = 1; ; k++) {
                    const done = test(st.cond);
                    push({
                        line: st.line,
                        kind: "until",
                        path: [],
                        drew: [],
                        went: done,
                        round: { i: k, of: 0 },
                    });
                    if (done) return;
                    exec(st.body, depth);
                }
            }
            case "if": {
                const yes = test(st.cond);
                push({ line: st.line, kind: "if", path: [], drew: [], went: yes });
                exec(yes ? st.ifTrue : st.otherwise, depth);
                return;
            }
            case "call": {
                const proc = p.procs.get(st.name);
                if (!proc) throw new RunError(`there is no define ${st.name}`);
                if (depth > 20) throw new RunError(`${st.name} uses itself too many times over`);
                const values = st.args.map(num);
                push({ line: st.line, kind: "call", path: [], drew: [] });
                // an input is the block's own: it holds the number it was given while the block runs,
                // and a name outside with the same spelling has its number back afterwards
                const saved = proc.params.map((name) => s.vars[name]);
                proc.params.forEach((name, i) => (s.vars[name] = values[i] ?? 0));
                exec(proc.body, depth + 1);
                proc.params.forEach((name, i) => {
                    const was = saved[i];
                    if (was === undefined) delete s.vars[name];
                    else s.vars[name] = was;
                });
                return;
            }
        }
    }

    try {
        for (const sc of p.scripts.filter((x) => x.event === (o.event ?? "flag")))
            exec(sc.steps, 0);
    } catch (e) {
        if (e instanceof Stop) stopped = e.why;
        else if (e instanceof RunError) problems.push(e.message);
        else throw e;
    }
    return {
        frames,
        start,
        end: copy(s),
        visits,
        segments,
        stopped,
        counts,
        problems,
        rolls,
        minutes,
    };
}

class Stop extends Error {
    readonly why: "bump" | "limit";
    constructor(why: "bump" | "limit") {
        super(why);
        this.why = why;
    }
}

/** The state before a frame, which is where the frame starts from. */
export const before = (r: Run, i: number): State =>
    i <= 0 ? r.start : (r.frames[i - 1]?.state ?? r.start);

/** The frames up to `upto` (all when negative), for a drawing asked to show part of a run. */
export function upTo(
    r: Run,
    upto: number,
): { frames: Frame[]; state: State; segments: Segment[]; visits: { col: number; row: number }[] } {
    const n = upto < 0 ? r.frames.length : Math.min(upto, r.frames.length);
    const frames = r.frames.slice(0, n);
    const visits = [{ col: r.start.col, row: r.start.row }];
    for (const f of frames) for (const p of f.path.slice(1)) visits.push(p);
    return {
        frames,
        state: frames[n - 1]?.state ?? r.start,
        segments: frames.flatMap((f) => f.drew),
        visits,
    };
}

/** The shape a pen drew, read off its segments: a square, a rectangle, closed, open, or nothing. */
export function shapeOf(
    segs: readonly Segment[],
    start: { col: number; row: number },
): "square" | "rectangle" | "closed" | "open" | "none" {
    if (!segs.length) return "none";
    const last = segs[segs.length - 1]?.to ?? start;
    if (last.col !== start.col || last.row !== start.row) return "open";
    const xs = segs.flatMap((s) => [s.from.col, s.to.col]),
        ys = segs.flatMap((s) => [s.from.row, s.to.row]);
    const w = Math.max(...xs) - Math.min(...xs),
        h = Math.max(...ys) - Math.min(...ys);
    // A rectangle's pen only ever runs along the edge of its own box, and goes round it once.
    const onEdge = segs.every((s) =>
        [s.from, s.to].every(
            (p) =>
                p.col === Math.min(...xs) ||
                p.col === Math.max(...xs) ||
                p.row === Math.min(...ys) ||
                p.row === Math.max(...ys),
        ),
    );
    if (!onEdge || w === 0 || h === 0 || segs.length !== 2 * (w + h)) return "closed";
    return w === h ? "square" : "rectangle";
}

/**
 * How many straight sides a pen drew: lines that carry on in the same direction count as one side,
 * and a side drawn again, as a turtle going round a triangle twice does, counts once.
 */
export function sidesOf(segs: readonly Segment[]): number {
    const dir = (g: Segment): number =>
        Math.round((Math.atan2(g.to.row - g.from.row, g.to.col - g.from.col) * 180) / Math.PI);
    const joined = (a: Segment, b: Segment): boolean =>
        a.to.col === b.from.col && a.to.row === b.from.row && dir(a) === dir(b);
    const sides: Segment[] = [];
    for (const g of segs) {
        const last = sides[sides.length - 1];
        if (last && joined(last, g)) sides[sides.length - 1] = { ...last, to: g.to };
        else sides.push(g);
    }
    const first = sides[0],
        last = sides[sides.length - 1];
    if (sides.length > 1 && first && last && joined(last, first)) {
        sides[0] = { ...first, from: last.from };
        sides.pop();
    }
    return new Set(sides.map(edgeOf)).size;
}

/**
 * One number or word a run comes to, named the way a checker's settings name it: col, row, face,
 * moves, steps, turns, gems, left, bumped, bumpline, painted, notes, claps, said, shape, lines,
 * rows (pixel rows painted), frames (rows of a trace table), ran(3) for how often line 3 ran,
 * value(n) or just n for a name's last number, after(2).col, after(2).row or after(2).n for the
 * state once step 2 had run, painted(red), row(3).red, frame(4) for a dance's fourth beat,
 * count(clap) for how many beats of a move, note(3) for the letter of the third note played,
 * flashes for how many times the lamp flashed, flash(2) for whether its second flash was long or
 * short, lights for how many times the lamp was lit, and light(2) for the colour of its second light;
 * list(cargo) for a list's items written out, length(cargo) and item(2).cargo; sides for the
 * straight sides the pen drew, turned for the degrees turned in all, either way,
 * and heading for the way the turtle faces at the end, in degrees clockwise from right. For a world
 * with sensors: minutes for the minutes the program waited, minute(5).temp for what a sensor read
 * after minute 5 and minute(5).heater for whether a switch was on then, lowest(temp) and
 * highest(temp) over every minute, stays(temp, 18, 21) for "yes" when the reading, once it is
 * between the two, never leaves them again, switched(heater) for how many times it changed and
 * switched(heater, on) for how many times it came on, and on(heater) for how it was left.
 */
export function outcome(r: Run, p: Program, w: World, spec: string): number | string {
    const s = spec.trim().toLowerCase();
    const commands = r.frames.filter(
        (f) => !["repeat", "forever", "until", "each", "if", "call", "bump"].includes(f.kind),
    );
    const after = /^after\((\d+)\)\.(col|row|face)$/.exec(s);
    if (after) {
        const f = r.frames[Number(after[1]) - 1];
        const st = f ? f.state : r.end;
        return after[2] === "face" ? st.face : after[2] === "col" ? st.col : st.row;
    }
    const afterName = /^after\((\d+)\)\.([a-z][a-z0-9_]*)$/.exec(s);
    if (afterName) {
        const f = r.frames[Number(afterName[1]) - 1],
            v = (f ? f.state : r.end).vars[afterName[2] ?? ""];
        if (v === undefined)
            throw new Error(`${afterName[2]} has no number after step ${afterName[1]}`);
        return v;
    }
    const ran = /^ran\((\d+)\)$/.exec(s);
    if (ran) return r.counts.get(Number(ran[1])) ?? 0;
    const painted = /^painted\((\w+)\)$/.exec(s);
    if (painted) return [...r.end.painted.values()].filter((c) => c === painted[1]).length;
    const inRow = /^row\((\d+)\)\.(\w+)$/.exec(s);
    if (inRow)
        return [...r.end.painted.entries()].filter(
            ([k, c]) => cellOf(w, k).row === Number(inRow[1]) && c === inRow[2],
        ).length;
    const beats = r.frames.flatMap((f) =>
        f.kind === "dance" && f.move ? Array<Dance>(f.times ?? 1).fill(f.move) : [],
    );
    const frame = /^frame\((\d+)\)$/.exec(s);
    if (frame) {
        const m = beats[Number(frame[1]) - 1];
        if (!m) throw new Error(`the dance has no frame ${frame[1]}`);
        return m;
    }
    const count = /^count\((\w+)\)$/.exec(s);
    if (count) return beats.filter((m) => m === count[1]).length;
    const note = /^note\((\d+)\)$/.exec(s);
    if (note) {
        const f = r.frames.filter((x) => x.kind === "play")[Number(note[1]) - 1];
        if (!f?.note) throw new Error(`the tune has no note ${note[1]}`);
        return f.note.charAt(0).toUpperCase();
    }
    const flash = /^flash\((\d+)\)$/.exec(s);
    if (flash) {
        const f = r.end.flashes[Number(flash[1]) - 1];
        if (!f) throw new Error(`the lamp has no flash ${flash[1]}`);
        return f;
    }
    const light = /^light\((\d+)\)$/.exec(s);
    if (light) {
        const c = r.end.lights[Number(light[1]) - 1];
        if (!c) throw new Error(`the lamp has no light ${light[1]}`);
        return c;
    }
    const list = /^(list|length)\(([a-z][a-z0-9_]*)\)$/.exec(s);
    if (list) {
        const got = r.end.lists[list[2] ?? ""];
        if (!got) throw new Error(`the program never makes a list called ${list[2]}`);
        return list[1] === "length" ? got.length : got.join(", ");
    }
    const item = /^item\((\d+)\)\.([a-z][a-z0-9_]*)$/.exec(s);
    if (item) {
        const got = r.end.lists[item[2] ?? ""]?.[Number(item[1]) - 1];
        if (got === undefined) throw new Error(`${item[2]} has no item ${item[1]} at the end`);
        return got;
    }
    const sensed = sensedOutcome(r, s);
    if (sensed !== null) return sensed;
    const value = /^value\(([a-z][a-z0-9_]*)\)$/.exec(s);
    if (value) {
        const v = r.end.vars[value[1] ?? ""];
        if (v === undefined) throw new Error(`the program never gives ${value[1]} a number`);
        return v;
    }
    switch (s) {
        case "col":
            return r.end.col;
        case "row":
            return r.end.row;
        case "face":
            return r.end.face;
        // a slanted move's path is one straight line, so it counts its length rather than its squares
        case "moves":
            return (
                Math.round(
                    r.frames.reduce(
                        (n, f) =>
                            n +
                            f.path.slice(1).reduce((d, p, i) => {
                                const q = f.path[i] ?? p;
                                return d + Math.hypot(p.col - q.col, p.row - q.row);
                            }, 0),
                        0,
                    ) * 1000,
                ) / 1000
            );
        case "steps":
            return commands.length;
        case "turns":
            return r.frames.filter((f) => f.kind === "turn").length;
        case "turned":
            return r.frames.reduce((n, f) => n + Math.abs(f.deg ?? 0), 0);
        case "heading":
            return r.end.angle;
        case "sides":
            return sidesOf(r.segments);
        case "gems":
            return r.end.got.length;
        case "left":
            return w.gems.size - r.end.got.length;
        case "bumped":
            return r.stopped === "bump" ? 1 : 0;
        case "bumpline":
            return r.stopped === "bump" ? (r.frames[r.frames.length - 1]?.line ?? 0) : 0;
        case "painted":
            return r.end.painted.size;
        case "notes":
            return r.frames.filter((f) => f.kind === "play").length;
        case "flashes":
            return r.end.flashes.length;
        case "lights":
            return r.end.lights.length;
        case "claps":
            return r.frames
                .filter((f) => f.kind === "dance" && f.move === "clap")
                .reduce((n, f) => n + (f.times ?? 1), 0);
        case "said":
            return r.end.said;
        case "shape":
            return shapeOf(r.segments, r.start);
        case "lines":
            return p.lines.length;
        case "rows":
            return r.frames.filter((f) => f.kind === "row").length;
        case "frames":
            return r.frames.filter((f) => f.kind !== "bump").length;
        case "flag":
            return w.flag !== null && keyOf(w, r.end.col, r.end.row) === w.flag ? 1 : 0;
        case "minutes":
            return r.end.time;
    }
    const named = r.end.vars[s];
    if (named !== undefined) return named;
    throw new Error(
        `"${spec}" is not something a run comes to; try col, row, moves, gems, shape, ran(3), value(n) or after(2).col`,
    );
}

/** What a run with sensors and switches comes to, or null for a spec about something else. */
function sensedOutcome(r: Run, s: string): number | string | null {
    const readings = (name: string): number[] => {
        const got = r.minutes.flatMap((m) => {
            const v = m.values[name];
            return v === undefined ? [] : [v];
        });
        if (!got.length) throw new Error(`there is no sensor called ${name}`);
        return got;
    };
    const switches = new Set(r.frames.flatMap((f) => (f.switched ? [f.switched.name] : [])));
    const at = /^minute\((\d+)\)\.([a-z][a-z0-9_]*)$/.exec(s);
    if (at) {
        const m = r.minutes[Number(at[1])],
            name = at[2] ?? "";
        if (!m)
            throw new Error(
                `the program lets ${r.end.time} minutes pass, so there is no minute ${at[1]}`,
            );
        const v = m.values[name];
        if (v !== undefined) return v;
        if (!switches.has(name)) throw new Error(`there is no sensor or switch called ${name}`);
        return m.on[name] ? "on" : "off";
    }
    const edge = /^(lowest|highest)\(([a-z][a-z0-9_]*)\)$/.exec(s);
    if (edge) {
        const got = readings(edge[2] ?? "");
        return edge[1] === "lowest" ? Math.min(...got) : Math.max(...got);
    }
    const band = /^stays\(([a-z][a-z0-9_]*),\s*(-?\d+),\s*(-?\d+)\)$/.exec(s);
    if (band) {
        const got = readings(band[1] ?? ""),
            lo = Number(band[2]),
            hi = Number(band[3]);
        const inside = (v: number): boolean => v >= lo && v <= hi;
        const from = got.findIndex(inside);
        return from >= 0 && got.slice(from).every(inside) ? "yes" : "no";
    }
    const sw = /^(switched|on)\(([a-z][a-z0-9_]*)(?:,\s*(on|off))?\)$/.exec(s);
    if (sw) {
        const name = sw[2] ?? "";
        if (!switches.has(name)) throw new Error(`the program never switches ${name}`);
        if (sw[1] === "on") return sw[3] ? null : r.end.on[name] ? "on" : "off";
        return r.frames.filter(
            (f) =>
                f.switched?.name === name &&
                f.switched.on !== f.switched.was &&
                (sw[3] === undefined || f.switched.on === (sw[3] === "on")),
        ).length;
    }
    return null;
}

const WAYS = 5000;

/**
 * Every way a program that draws random numbers can run, each with its chance, found by trying every
 * number each draw could give. A program that draws none has one way, with a chance of 1.
 */
export function everyRun(
    p: Program,
    w: World,
    o: { event?: Event; vars?: Record<string, number> } = {},
): { run: Run; chance: number }[] {
    const out: { run: Run; chance: number }[] = [];
    let prefix: number[] = [];
    for (;;) {
        const sizes: number[] = [],
            picks: number[] = [];
        const r = run(p, w, {
            ...o,
            roll: (lo, hi, i) => {
                const k = prefix[i] ?? 0;
                sizes.push(hi - lo + 1);
                picks.push(k);
                return lo + k;
            },
        });
        out.push({ run: r, chance: sizes.reduce((c, n) => c / n, 1) });
        if (out.length > WAYS)
            throw new Error(`the program can run more than ${WAYS} ways, too many to try them all`);
        let i = picks.length - 1;
        while (i >= 0 && (picks[i] ?? 0) + 1 >= (sizes[i] ?? 1)) i--;
        if (i < 0) return out;
        prefix = [...picks.slice(0, i), (picks[i] ?? 0) + 1];
    }
}

/** What a program could come to, each value once, with its chance, in the order the values are first met. */
export function spread(
    p: Program,
    w: World,
    spec: string,
    o: { event?: Event; vars?: Record<string, number> } = {},
): { value: number | string; chance: number; ways: number }[] {
    const out = new Map<string, { value: number | string; chance: number; ways: number }>();
    for (const { run: r, chance } of everyRun(p, w, o)) {
        if (r.problems.length) throw new Error(r.problems[0]);
        if (r.stopped === "limit") throw new Error("one way the program can run never stops");
        const value = outcome(r, p, w, spec),
            key = String(value),
            had = out.get(key);
        if (had) {
            had.chance += chance;
            had.ways++;
        } else out.set(key, { value, chance, ways: 1 });
    }
    return [...out.values()];
}

/**
 * What a program that draws random numbers comes to over every way it can run: least(value(n)) and
 * most(value(n)) for the smallest and largest it could be, kinds(...) for how many different values,
 * outcomes for how many equally likely ways it can run, ways(value(n)=7) for how many of those give
 * 7, likeliest(...) for the one value that comes up most often, and fair(...), "yes" when every value
 * it could give is as likely as every other.
 */
export function overAll(
    p: Program,
    w: World,
    spec: string,
    o: { event?: Event; vars?: Record<string, number> } = {},
): number | string {
    const s = spec.trim().toLowerCase();
    if (s === "outcomes") {
        const all = everyRun(p, w, o);
        const [first] = all;
        if (!first || all.some((x) => Math.abs(x.chance - first.chance) > 1e-9))
            throw new Error(
                "the ways the program can run are not equally likely, so count ways differently",
            );
        return all.length;
    }
    const ways = /^ways\((.+)=([^=()]+)\)$/.exec(s);
    if (ways) {
        const all = everyRun(p, w, o);
        const [first] = all;
        if (!first || all.some((x) => Math.abs(x.chance - first.chance) > 1e-9))
            throw new Error(
                "the ways the program can run are not equally likely, so count ways differently",
            );
        const want = (ways[2] ?? "").trim();
        return all.filter((x) => String(outcome(x.run, p, w, ways[1] ?? "")).toLowerCase() === want)
            .length;
    }
    const m = /^(least|most|kinds|likeliest|fair)\((.+)\)$/.exec(s);
    if (!m) throw new Error(`"${spec}" is not something every run comes to`);
    const got = spread(p, w, m[2] ?? "", o);
    const nums = got.map((g) => Number(g.value));
    switch (m[1]) {
        case "least":
            return Math.min(...nums);
        case "most":
            return Math.max(...nums);
        case "kinds":
            return got.length;
        case "fair": {
            const [first] = got;
            return first && got.every((g) => Math.abs(g.chance - first.chance) < 1e-9)
                ? "yes"
                : "no";
        }
    }
    const top = Math.max(...got.map((g) => g.chance));
    const best = got.filter((g) => Math.abs(g.chance - top) < 1e-9);
    const [one] = best;
    if (best.length !== 1 || !one)
        throw new Error(
            `${best.length} values are equally the likeliest, so there is no one answer`,
        );
    return one.value;
}

export const GOALS = ["flag", "gems", "both", "closed", "square", "picture"] as const;
export type Goal = (typeof GOALS)[number];

/** Whether a run did what it was for. `picture` compares the painted squares with a target world's. */
export function meets(r: Run, w: World, goal: Goal, target?: Map<number, Colour>): boolean {
    if (r.stopped !== "end" || r.problems.length) return false;
    const onFlag = w.flag !== null && keyOf(w, r.end.col, r.end.row) === w.flag;
    const allGems = r.end.got.length === w.gems.size;
    switch (goal) {
        case "flag":
            return onFlag;
        case "gems":
            return allGems;
        case "both":
            return onFlag && allGems;
        case "closed": {
            const sh = shapeOf(r.segments, r.start);
            return sh === "square" || sh === "rectangle" || sh === "closed";
        }
        case "square":
            return shapeOf(r.segments, r.start) === "square";
        case "picture": {
            if (!target) return false;
            if (target.size !== r.end.painted.size) return false;
            for (const [k, c] of target) if (r.end.painted.get(k) !== c) return false;
            return true;
        }
    }
}

/** The lines a target program draws, which a drawing task compares a child's drawing with. */
export interface Target {
    segments?: readonly Segment[];
}

const edgeOf = (s: Segment): string => {
    const a = `${s.from.col},${s.from.row}`,
        b = `${s.to.col},${s.to.row}`;
    return a < b ? `${a}-${b}` : `${b}-${a}`;
};

/** The unit edges a pen drew, as a set, so two drawings can be compared whichever way round they went. */
export const edges = (segs: readonly Segment[]): Set<string> => new Set(segs.map(edgeOf));

/**
 * Whether a program does what a task asks, including drawing exactly a target's lines: each of them,
 * in either direction, and none of them twice, so going round a square five times is not a square.
 * A program that draws random numbers must do it for every number they could be, which is the one
 * rule the verifier proves a build by and the page marks a child's build by; one with too many ways
 * to try them all is judged on the seeded run.
 */
export function done(
    code: readonly string[],
    w: World,
    goal: Goal | "target",
    target?: Target,
): boolean {
    const want = target?.segments?.map(edgeOf).sort() ?? [];
    const ok = (r: Run): boolean => {
        if (goal !== "target") return meets(r, w, goal);
        if (r.stopped !== "end" || r.problems.length || !target?.segments) return false;
        const got = r.segments.map(edgeOf).sort();
        return want.length === got.length && want.every((e, i) => e === got[i]);
    };
    const p = parse(code);
    let ways: { run: Run }[];
    try {
        ways = everyRun(p, w);
    } catch {
        return ok(run(p, w));
    }
    return ways.every((x) => ok(x.run));
}

/** A program's lines as one line of text, for an answer key: "right 2, repeat 3 (up 1, right 1)". */
export function oneLine(code: readonly string[]): string {
    const ls = code.map((t, i) => lineOf(t, i + 1)).filter((l) => l.text);
    let i = 0;
    const level = (depth: number): string[] => {
        const out: string[] = [];
        for (let l = ls[i]; l && l.depth >= depth; l = ls[i]) {
            i++;
            const deeper = ls[i]?.depth ?? -1;
            const inner = deeper > l.depth ? level(deeper) : [];
            out.push(inner.length ? `${l.text} (${inner.join(", ")})` : l.text);
        }
        return out;
    };
    return level(0).join(", ");
}
