// Checks an item before it can ship. Names and references are checked first; then every variant
// the parameters allow is built (or a seeded sample, when there are too many to list): the answer
// must evaluate, pans must not overflow, the scene must fit, and no feedback rule may also be true
// for the correct answer, since it could not tell that mistake apart. The checkers written in code,
// for answers an expression cannot state, are declared here with the contract they meet; each one
// can also list its solutions, so the verifier can prove a puzzle is solvable before it ships. The
// subjects' checkers are in chemistry.ts, coding.ts, nature.ts, paint.ts and physics.ts.
import { ARRANGED, prove, type Arrangement } from "../arrange";
import {
    checkNames,
    equal,
    evaluate,
    freeNames,
    members,
    num,
    pieces,
    showValue,
    str,
    uses,
    type Env,
    type Expr,
    type Value,
} from "../expr";
import { BY_EYE, DICTATION, linesHolding, linesOf, markWords, type Piece } from "../pack";
import { shown } from "../scene";
import { toleranceFor } from "../sound/beat";
import { chordNames, chordNotes, chordOf, chordTitle, shapeProblems } from "../sound/fretted";
import {
    goldens,
    judgePitches,
    judgeRhythm,
    steadyLike,
    teachesRhythm,
    type Performance,
} from "../sound/judge";
import { inRange, noteName, notesOf, RANGE } from "../sound/pitch";
import { CHEMISTRY } from "./chemistry";
import { CODING } from "./coding";
import {
    fill,
    fillIndex,
    instantiate,
    layout,
    textOf,
    type Concrete,
    type SceneInstance,
} from "./instantiate";
import {
    printTerm,
    type Define,
    type Issue,
    type Item,
    type Rule,
    type TNode,
    type Volume,
} from "./notation";
import { NATURE } from "./nature";
import { PAINT } from "./paint";
import { PHYSICS } from "./physics";
import { BOX_ANCHORS, NOUNS, PARTS, partParams, PLACE_KEYS } from "./vocabulary";

/** What a checker may read beyond its own settings: the corpus's volumes, for a question citing a book. */
interface CheckContext {
    volumes: ReadonlyMap<string, Volume>;
}

export interface CodeChecker {
    doc: string;
    settings: string[];
    /** `ctx` is what the corpus holds beside the item; a checker that reads none of it leaves it out. */
    solutions(settings: Record<string, string>, ctx?: CheckContext): string[];
    /**
     * Things an author has to read that do not stop the item shipping. A checker that can tell an
     * answerable item from one that teaches what it claims to says the difference here.
     */
    warnings?(settings: Record<string, string>): string[];
    /** The answer in words for the grown-ups' sheet, where a number alone would not say enough. */
    explain?(settings: Record<string, string>, ctx?: CheckContext): string;
    /** The answers this checker works out itself, by name, which the item need not state. */
    provides?(settings: Record<string, string>): string[];
    /**
     * For a checker whose answer depends on the variant. The verifier calls it with each variant's
     * concrete scene; it returns the answers it worked out and what is wrong with this variant, and an
     * answer the item also states has to agree with it.
     */
    variant?(
        scene: SceneInstance,
        settings: Record<string, string>,
        ctx?: CheckContext,
    ): { answers: Record<string, Value>; problems: string[] };
}

/** An answer the checker works out, or what stops it, as `variant` returns them. */
const answerOr = (work: () => Value): { answers: Record<string, Value>; problems: string[] } => {
    try {
        return { answers: { answer: work() }, problems: [] };
    } catch (e) {
        return { answers: {}, problems: [said(e)] };
    }
};

const said = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// Seven-segment digits; + is a horizontal and a vertical stick, - a horizontal, = two horizontals.
const DIGITS: Record<string, string> = {
    "0": "abcdef",
    "1": "bc",
    "2": "abdeg",
    "3": "abcdg",
    "4": "bcfg",
    "5": "acdfg",
    "6": "acdefg",
    "7": "abc",
    "8": "abcdefg",
    "9": "abcdfg",
};
const SLOTS = { digit: Array.from("abcdefg"), op: ["h", "v"], eq: ["e1", "e2"] } as const;
interface Cell {
    kind: keyof typeof SLOTS;
    on: Set<string>;
}

function cells(eq: string): Cell[] {
    return Array.from(eq.replace(/\s+/g, "")).map((ch) => {
        const digit = DIGITS[ch];
        if (digit) return { kind: "digit", on: new Set(digit) };
        if (ch === "+") return { kind: "op", on: new Set(["h", "v"]) };
        if (ch === "-") return { kind: "op", on: new Set(["h"]) };
        if (ch === "=") return { kind: "eq", on: new Set(["e1", "e2"]) };
        throw new Error(`matchsticks cannot show "${ch}"`);
    });
}
function symbol(c: Cell): string | null {
    const key = [...c.on].sort().join("");
    if (c.kind === "digit")
        return (
            Object.entries(DIGITS).find(([, s]) => Array.from(s).sort().join("") === key)?.[0] ??
            null
        );
    if (c.kind === "op") return key === "h" ? "-" : key === "hv" ? "+" : null;
    return key === "e1e2" ? "=" : null;
}
function isTrue(s: string): boolean {
    const m = /^(\d+)([+-])(\d+)=(\d+)$/.exec(s);
    if (!m) return false;
    const [, a = "", op, b = "", c = ""] = m;
    if ([a, b, c].some((n) => n.length > 1 && n.startsWith("0"))) return false;
    return (op === "+" ? Number(a) + Number(b) : Number(a) - Number(b)) === Number(c);
}

/** A list setting arrives as it was written, so [C4, E4, G4] is read back the same way. */
const listOf = (s: string): string[] =>
    s
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

/** What a child who plays it perfectly hands in, which is also the first golden performance. */
const played = (notes: number[]): Performance => ({
    instrument: "code",
    started: 0,
    struck: notes.map((note, i) => ({ note, at: i * 500, how: "code" as const })),
});

/** A setting that names a parameter, as notes=[{low}, E4], is filled for each version, so it is proved there. */
const templated = (settings: Record<string, string>): boolean =>
    Object.values(settings).some((v) => v.includes("{"));
/** Runs a checker's own proof on one version's filled settings, reporting what fails as that version's problem. */
const provedFor = (
    prove: () => string[],
): { answers: Record<string, Value>; problems: string[] } => {
    try {
        prove();
        return { answers: {}, problems: [] };
    } catch (e) {
        return { answers: {}, problems: [said(e)] };
    }
};

/** The checker of a question answered with a line of a book, cited by chapter. */
export const BOOK_LINE = "book.line";

/**
 * The one line of a volume's chapter that holds the words, with its number, or an error that says
 * why there is not exactly one: no such volume or chapter, too few words to find a line by, words that
 * run across two lines, or words more than one line holds.
 */
function citation(
    settings: Record<string, string>,
    ctx: CheckContext | undefined,
): { chapter: number; line: number; text: string } {
    const id = settings.book ?? "";
    const volume = ctx?.volumes.get(id);
    if (!volume) throw new Error(`there is no volume "${id}"`);
    const n = Number(settings.chapter);
    const chapter = volume.chapters.find((c) => c.n === n);
    if (!chapter)
        throw new Error(
            `${id} has no chapter ${settings.chapter}; it has 1 to ${volume.chapters.length}`,
        );
    const holds = (settings.holds ?? "").replace(/\s+/g, " ").trim();
    if (holds.split(" ").length < 2)
        throw new Error("holds= needs at least two words of the line, as the text writes them");
    const lines = linesHolding(chapter.paragraphs, holds);
    const [line, ...more] = lines;
    if (line === undefined) {
        const whole = linesOf(chapter.paragraphs).join(" ").replace(/\s+/g, " ");
        throw new Error(
            whole.includes(holds)
                ? `"${holds}" runs across two lines of chapter ${n}; quote words from one line`
                : `no line of chapter ${n} holds "${holds}"`,
        );
    }
    if (more.length)
        throw new Error(
            `lines ${lines.join(" and ")} of chapter ${n} all hold "${holds}"; quote more of the line so that one holds it`,
        );
    return { chapter: n, line, text: linesOf(chapter.paragraphs)[line - 1] ?? "" };
}

/**
 * A dictation's sentence, proved to mark word by word: three to forty words, each with letters, and
 * the marking holds on the sentence itself, typed right, with each word misspelt and with each word
 * left out, each mistake found at its own word and nowhere else.
 */
function provedDictation(text: string): string {
    const sentence = text.replace(/\s+/g, " ").trim();
    const words = sentence.split(" ").filter(Boolean);
    if (words.length < 3 || words.length > 40)
        throw new Error("text= needs a sentence of three to forty words to dictate");
    const letters = (w: string): string => w.replace(/[^\p{L}]/gu, "");
    const bad = words.filter((w) => !letters(w));
    if (bad.length) throw new Error(`${bad.join(", ")} has no letters to spell`);
    if (!markWords(sentence, sentence).right)
        throw new Error("the sentence is not marked right when it is typed as it is written");
    words.forEach((w, i) => {
        const l = letters(w);
        // a letter doubled is a misspelling of any word, however short
        const wrong = w.replace(l, l + (l.at(-1) ?? ""));
        const typed = words.map((x, j) => (j === i ? wrong : x)).join(" ");
        const m = markWords(sentence, typed);
        const flagged = m.words.flatMap((x, j) => (x.right ? [] : [j]));
        if (m.right || flagged.join() !== String(i))
            throw new Error(`"${wrong}" for "${w}" is not marked wrong at that word alone`);
        const left = words.filter((_, j) => j !== i).join(" ");
        const gone = markWords(sentence, left);
        const missing = gone.words.flatMap((x, j) => (x.wrote === null ? [j] : []));
        // with a word repeated, leaving out either copy is the same sentence, so the first is taken
        const same = words.flatMap((x, j) => (x.toLowerCase() === w.toLowerCase() ? [j] : []));
        if (gone.right || missing.length !== 1 || !same.includes(missing[0] ?? -1))
            throw new Error(`leaving out "${w}" is not marked as that word left out`);
    });
    return sentence;
}

/** How a piece a grown-up looks at or listens to is written: what its checker needs beyond `look-for`. */
interface ByEyeRule {
    doc: string;
    /** Whether the `notice` list is needed, or only checked when it is there. */
    notice: "needed" | "optional";
    /** Whether the `ask` question is needed, or only checked when it is there. */
    ask: "needed" | "optional";
}

/** Each piece a grown-up looks at or listens to, and what its checker asks the author for. */
const BY_EYE_RULES: Record<Piece, ByEyeRule> = {
    writing: {
        doc: "Writing a grown-up reads rather than the machine: a sentence, a letter, a book review, a report. `look-for` says what a good attempt looks like and prints where the answer would be; `notice`, when given, lists two to five points the grown-up ticks, which their response records.",
        notice: "optional",
        ask: "optional",
    },
    painting: {
        doc: "A painting or a drawing that a grown-up responds to rather than marks. `look-for` says what a good attempt shows, in the art's own words; `notice` lists two to five short points the grown-up can tick when they see them, which a response records; `ask` is a question to start the talk. The sentence and the question print on the grown-ups' sheet.",
        notice: "needed",
        ask: "needed",
    },
    made: {
        doc: "Something made away from the sheet that a grown-up looks at, such as a sculpture, a model or a piece of craft. `look-for` says what a good attempt shows; `notice` lists two to five points to tick; `ask` may give a question to start the talk.",
        notice: "needed",
        ask: "optional",
    },
    spoken: {
        doc: "Something a child says aloud to a grown-up, such as a poem recited by heart. `look-for` says what a good attempt sounds like; `notice` lists two to five points the grown-up listens for and ticks. Nothing is recorded but the ticks.",
        notice: "needed",
        ask: "optional",
    },
    sung: {
        doc: "A song a child sings to a grown-up, alone or in a round. `look-for` says what a good attempt sounds like; `notice` lists two to five points the grown-up listens for and ticks. Nothing is recorded but the ticks.",
        notice: "needed",
        ask: "optional",
    },
};

/** The two to five points of a `notice` list, as `["...", "..."]`, or an error saying how to write them. */
function noticeList(written: string): string[] {
    let points: unknown = null;
    try {
        points = JSON.parse(written);
    } catch {
        points = null;
    }
    if (
        !Array.isArray(points) ||
        points.length < 2 ||
        points.length > 5 ||
        !points.every((x) => typeof x === "string" && x.length >= 6 && x.length <= 70)
    )
        throw new Error(
            'notice= needs two to five short points to tick, written as ["...", "..."]',
        );
    return points.filter((x): x is string => typeof x === "string");
}

/** The checker of one piece a grown-up looks at or listens to: nothing is marked, and what the grown-up is given is proved to be there. */
function byEye(rule: ByEyeRule): CodeChecker {
    return {
        doc: rule.doc,
        settings: [
            "look-for",
            ...(rule.notice === "needed" ? ["notice"] : []),
            ...(rule.ask === "needed" ? ["ask"] : []),
        ],
        solutions(settings) {
            const look = (settings["look-for"] ?? "").trim();
            const ask = (settings.ask ?? "").trim();
            if (look.length < 20)
                throw new Error("look-for= needs a sentence saying what a good attempt shows");
            if (settings.ask !== undefined && (ask.length < 10 || !ask.endsWith("?")))
                throw new Error("ask= needs a question for the grown-up to start with");
            if (settings.notice !== undefined) noticeList(settings.notice);
            return [ask ? `${look} Ask: ${ask}` : look];
        },
    };
}

export const CHECKERS: Record<string, CodeChecker> = {
    ...CHEMISTRY,
    ...CODING,
    ...NATURE,
    ...PAINT,
    ...PHYSICS,
    "music.plays": {
        doc: "The child plays the notes on an instrument. Notes are written C4 or Fs4, since # cannot appear in a content file; ordered=false accepts them in any order and any-octave=true ignores the octave. A note may name a parameter, as {low}, and then every version is proved.",
        settings: ["notes"],
        variant(_scene, settings) {
            return provedFor(() => this.solutions(settings));
        },
        solutions(settings) {
            if (templated(settings)) return [`plays ${settings.notes}`];
            const written = listOf(settings.notes ?? "");
            if (!written.length)
                throw new Error("notes= needs at least one note, written as C4 or Fs4");
            const notes = notesOf(written);
            const out = notes.filter((n) => !inRange(n));
            if (out.length)
                throw new Error(
                    `${out.map((n) => noteName(n)).join(", ")} is outside the range the instruments draw (${noteName(RANGE[0])} to ${noteName(RANGE[1])})`,
                );
            // The solution is proved rather than asserted: a perfect performance is generated and put
            // through the same judge the child's playing goes through.
            const want = {
                notes,
                ordered: settings.ordered !== "false",
                anyOctave: settings["any-octave"] === "true",
            };
            const v = judgePitches(played(notes), want);
            if (!v.ok)
                throw new Error(`the notes as written do not pass their own check: ${v.because}`);
            return [notes.map((n) => noteName(n)).join(", ")];
        },
    },
    "music.rhythm": {
        doc: "The child claps or taps a bar. `beats` gives where each note starts, counted in beats from the start of the bar, and the grade sets the window it is judged in.",
        settings: ["beats", "grade"],
        variant(_scene, settings) {
            return provedFor(() => this.solutions(settings));
        },
        solutions(settings) {
            if (templated(settings)) return [`taps on beats ${settings.beats}`];
            const beats = listOf(settings.beats ?? "").map(Number);
            if (!beats.length || beats.some((b) => !Number.isFinite(b)))
                throw new Error(
                    "beats= needs the numbers a note starts on, such as [0, 1, 1.5, 2]",
                );
            if (beats.some((b, i) => i > 0 && b <= (beats[i - 1] ?? b)))
                throw new Error("beats= has to run forwards, one note at a time");
            const tolerance = toleranceFor(Number(settings.grade) || 1);
            // Every case the gate declares has to come back as declared, so an item cannot ship with a
            // check that accepts a missed beat or rejects the same bar played slower.
            for (const g of goldens(beats, tolerance)) {
                const got = judgeRhythm(g.p, { target: beats, tolerance }).ok;
                if (got !== g.want)
                    throw new Error(
                        `the check does not hold: "${g.name}" came back ${got ? "right" : "wrong"} and should be ${g.want ? "right" : "wrong"}`,
                    );
            }
            return [`taps on beats ${beats.join(", ")}`];
        },
        // Three bars are answerable and teach nothing about note values, and they are worth telling
        // apart: too few notes to have a rhythm, every note the same length, and an uneven bar that a
        // steady clap passes anyway because the window is generous.
        warnings(settings) {
            // TODO: a bar that names a parameter is not yet warned about per version.
            if (templated(settings)) return [];
            const beats = listOf(settings.beats ?? "").map(Number);
            const grade = Number(settings.grade) || 1;
            if (!beats.length || beats.some((b) => !Number.isFinite(b))) return [];
            if (beats.length < 3)
                return [
                    "two taps fix a tempo exactly, so a bar this short is judged on the number of taps rather than on their timing",
                ];
            const even = steadyLike(beats);
            if (even.every((b, i) => Math.abs(b - (beats[i] ?? Number.NaN)) < 1e-9))
                return [
                    "every note in this bar is the same length, so it asks a child to keep the beat rather than to read the note values",
                ];
            return teachesRhythm(beats, toleranceFor(grade))
                ? []
                : [
                      `at the grade ${grade} window a steady clap lands inside this bar's window everywhere, so it marks a child right for not having read the rhythm; pick a bar with a longer or shorter note in it`,
                  ];
        },
    },
    "music.chord": {
        doc: "The child holds a chord on the ukulele or the guitar and strums it. `chord` names a shape from the book and `tuning` is uke or guitar; every string the shape plays has to sound its note, and a string it leaves out must not sound.",
        settings: ["chord", "tuning"],
        variant(_scene, settings) {
            return provedFor(() => this.solutions(settings));
        },
        solutions(settings) {
            if (templated(settings)) return [`the chord ${settings.chord}`];
            const tuning =
                !settings.tuning || settings.tuning === "uke"
                    ? "uke"
                    : settings.tuning === "guitar"
                      ? "guitar"
                      : null;
            if (!tuning)
                throw new Error(`tuning= is uke or guitar, and "${settings.tuning}" is neither`);
            const shape = chordOf(tuning, settings.chord ?? "");
            if (!shape)
                throw new Error(
                    `the ${tuning} chords we teach are ${chordNames(tuning).join(", ")}, and there is no ${settings.chord ?? "chord"} among them`,
                );
            const problems = shapeProblems(shape);
            if (problems.length) throw new Error(problems.join("; "));
            // Proved rather than asserted, as music.plays is: a strum of the shape as written is put
            // through the judge that marks the child's strum.
            const notes = chordNotes(shape);
            const v = judgePitches(played(notes), { notes, exact: true });
            if (!v.ok)
                throw new Error(`the shape as written does not pass its own check: ${v.because}`);
            return [`${chordTitle(shape.name)}: ${notes.map((n) => noteName(n)).join(", ")}`];
        },
    },
    ...Object.fromEntries(
        Object.entries(BY_EYE).map(([name, piece]) => [name, byEye(BY_EYE_RULES[piece])]),
    ),
    [BOOK_LINE]: {
        doc: "A question answered with a line of a book lesson's volume. `book` names the volume, `chapter` the chapter, and `holds` words that exactly one line of that chapter holds, as the text writes them. The answer is that line's number, worked out and proved to be the only one, so an evidence question cannot ship with a key the text does not bear out.",
        settings: ["book", "chapter", "holds"],
        provides: () => ["answer"],
        solutions(settings, ctx) {
            if (templated(settings)) return [`the line that holds "${settings.holds}"`];
            const c = citation(settings, ctx);
            return [`chapter ${c.chapter}, line ${c.line}: ${c.text}`];
        },
        variant(_scene, settings, ctx) {
            return answerOr(() => num(citation(settings, ctx).line));
        },
        // the line's own words, so a grown-up with another edition marks by the words
        explain(settings, ctx) {
            const c = citation(settings, ctx);
            return `Line ${c.line} of chapter ${c.chapter}: "${c.text}"`;
        },
    },
    [DICTATION]: {
        doc: "A sentence played or read aloud, which the child types. `text` is the sentence, and the typed answer is marked word by word, the misspelt words shown. The checker proves the marking on the sentence itself: each word misspelt, and each word left out, is caught at that word and nowhere else.",
        settings: ["text"],
        provides: () => ["answer"],
        solutions(settings) {
            if (templated(settings)) return [`the sentence "${settings.text}"`];
            return [provedDictation(settings.text ?? "")];
        },
        variant(_scene, settings) {
            return answerOr(() => str(provedDictation(settings.text ?? "")));
        },
    },
    "matchsticks.one-move": {
        doc: "The child moves exactly one matchstick so the equation becomes true.",
        settings: ["from"],
        solutions(settings) {
            const from = settings.from ?? "";
            const start = cells(from);
            const found = new Set<string>();
            start.forEach((ci, i) =>
                ci.on.forEach((s) => {
                    start.forEach((cj, j) =>
                        SLOTS[cj.kind].forEach((t) => {
                            if (i === j && s === t) return;
                            const next = start.map((c) => ({ kind: c.kind, on: new Set(c.on) }));
                            const taken = next[i];
                            const given = next[j];
                            if (!taken || !given) return;
                            taken.on.delete(s);
                            if (given.on.has(t)) return;
                            given.on.add(t);
                            const text = next.map(symbol);
                            const eq = text.join("");
                            if (text.every((x) => x !== null)) {
                                if (eq !== from.replace(/\s+/g, "") && isTrue(eq)) found.add(eq);
                            }
                        }),
                    );
                }),
            );
            return [...found].sort();
        },
    },
};

export interface Variant {
    values: Record<string, string>;
    env: Env;
    answers: Record<string, string>;
    /** How a picked answer reads on the answer key: the option's label, not the word that names it. */
    labels?: Record<string, string>;
    /** For an arranged answer: the part, the right arrangement the key draws, and how many of the arrangements are right. */
    arranged?: { id: string; key: Arrangement; right: number; tried: number };
}
export interface ItemReport {
    issues: Issue[];
    variants: Variant[];
    total: number;
    sampled: boolean;
    solutions?: string[];
    /** For an arranged answer: the highest share of right arrangements in any variant, every arrangement walked, and the lowest share of wrong ones a rule speaks to. */
    arranged?: { luck: number; walked: number; spoken: number };
}

const LIMIT = 10_000;
const SAMPLE = 400;

const whole = (x: unknown): boolean => Number.isInteger(Number(x)) && Number(x) >= 0;
/**
 * Drawings whose settings bound one another, so a version could ask about more than it draws: the
 * bus draws one person to a window and no more, and six rows of four sweets fit inside the jar.
 * TODO: declare these on the drawings once they have moved into engine/parts.
 */
const CAPACITY: Record<string, (p: Record<string, unknown>) => string | null> = {
    bus: (p) =>
        whole(p.on) && Number(p.on) <= Number(p.windows)
            ? null
            : "the bus draws one person a window, so more people than windows are not all drawn",
    sweetjar: (p) =>
        whole(p.count) && Number(p.count) <= 24
            ? null
            : "the jar holds 0 to 24 sweets, and more are drawn outside it",
    // one line of 17-pixel lettering holds about two and a half characters a square
    caption: (p) =>
        String(p.text).length <= 2.5 * (Number(p.width) - 1)
            ? null
            : "the caption is longer than its strip's one line holds; widen the strip or shorten it",
    writinglines: (p) =>
        String(p.prompt).length <= 2.5 * (Number(p.width) - 1)
            ? null
            : "the prompt is longer than the lines are wide; widen them or shorten it",
    towers: (p) =>
        Array.isArray(p.heights) && p.heights.every(whole) && whole(p.level)
            ? null
            : "a tower and the level are whole numbers of cubes, from none up",
};

function seeded(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const where = (t: TNode | undefined): Omit<Issue, "level" | "message"> => {
    const s = t?.src.span ?? { line: 1, col: 1, end: 2 };
    return { line: s.line, col: s.col, length: Math.max(1, s.end - s.col) };
};
const keyOf = (env: Env): string =>
    Object.entries(env)
        .map(([k, v]) => `${k}=${showValue(v)}`)
        .join(",");
export const describe = (env: Env): string =>
    Object.entries(env)
        .map(([k, v]) => `${k} = ${showValue(v)}`)
        .join(", ") || "the only variant";

/** The options a node offers, where it is a choice. */
const optionsOf = (c: Concrete): { kind: string; label: string; value: string }[] => {
    const x = c.v.options;
    return Array.isArray(x)
        ? x.flatMap((o) => (typeof o === "object" && o !== null ? [o] : []))
        : [];
};
const wordsIn = (x: unknown): string[] =>
    Array.isArray(x) ? x.flatMap((s) => (typeof s === "string" ? [s] : [])) : [];

/** Every variant, or a seeded sample when the parameters allow more than LIMIT. */
export function variantsOf(item: Item, seed = 7): { envs: Env[]; total: number; sampled: boolean } {
    const passes = (env: Env): boolean =>
        item.where.every((w) => {
            const v = evaluate(w, env);
            return v.k === "bool" && v.v;
        });
    const envs: Env[] = [];
    // Values every version shares come first, so a range may be written in terms of them.
    const base: Env = {};
    for (const c of item.constants ?? []) base[c.name] = evaluate(c.expr, base);
    let total = 0;
    let tooMany = false;
    const walk = (i: number, env: Env): void => {
        if (tooMany) return;
        const p = item.params[i];
        if (!p) {
            if (++total > LIMIT) {
                tooMany = true;
                return;
            }
            if (passes(env)) envs.push(env);
            return;
        }
        for (const v of members(evaluate(p.domain, env))) walk(i + 1, { ...env, [p.name]: v });
    };
    walk(0, base);
    if (!tooMany) return { envs, total, sampled: false };

    const r = seeded(seed);
    const seen = new Set<string>();
    const out: Env[] = [];
    let estimate = 1;
    for (let tries = 0; tries < SAMPLE * 20 && out.length < SAMPLE; tries++) {
        const env: Env = { ...base };
        let size = 1;
        let drawn = true;
        for (const p of item.params) {
            const dom = members(evaluate(p.domain, env));
            size *= dom.length;
            const v = dom[Math.floor(r() * dom.length)];
            if (v === undefined) {
                drawn = false;
                break;
            }
            env[p.name] = v;
        }
        estimate = Math.max(estimate, size);
        const k = keyOf(env);
        if (drawn && !seen.has(k) && passes(env)) {
            seen.add(k);
            out.push(env);
        }
    }
    return { envs: out, total: estimate, sampled: true };
}

/** The parts a child arranges, by id. Their answer is a condition over an arrangement, not a value. */
const arrangedIn = (item: Item): TNode[] =>
    flatten(item.scene?.nodes ?? []).filter((n) => arranges(n) && n.id);

/** Whether a node is a part the child arranges: always, or where the setting its spec names is written as 1. */
function arranges(n: TNode): boolean {
    const a = n.spec.arranges;
    if (a === undefined || a === true) return a === true;
    const v = n.props[a.when];
    return (v?.k === "num" && v.v === 1) || (v?.k === "expr" && v.e.t === "num" && v.e.v === "1");
}

export function answersFor(item: Item, env: Env): Record<string, Value> {
    const out: Record<string, Value> = {};
    const arranged = new Set(arrangedIn(item).map((n) => n.id));
    for (const a of item.answers) if (!arranged.has(a.name)) out[a.name] = evaluate(a.expr, env);
    return out;
}

/** An item's checker settings as written: a quoted string without its quotes, anything else as printed. */
const writtenSettings = (item: Item): Record<string, string> =>
    Object.fromEntries(
        Object.entries(item.check?.settings ?? {}).map(([k, t]) => [
            k,
            t.k === "str" || t.k === "block" ? t.v : printTerm(t),
        ]),
    );

/** What an item's checker says of one version's answer in words, or null for a checker that says nothing. */
export function explainAt(
    item: Item,
    env: Env,
    volumes: ReadonlyMap<string, Volume>,
): string | null {
    const checker = item.check ? CHECKERS[item.check.name] : undefined;
    if (!checker?.explain) return null;
    try {
        return checker.explain(checkSettingsAt(item, env), { volumes });
    } catch {
        return null;
    }
}

/** An item's checker settings as one version reads them, each `{name}` filled for that version. */
export function checkSettingsAt(item: Item, env: Env): Record<string, string> {
    return Object.fromEntries(
        Object.entries(writtenSettings(item)).map(([k, v]) => {
            if (!v.includes("{")) return [k, v];
            try {
                return [k, fill(pieces(v), env, item.roles)];
            } catch {
                return [k, v];
            }
        }),
    );
}

export function verifyItem(
    item: Item,
    defines: Map<string, Define>,
    volumes: ReadonlyMap<string, Volume> = new Map(),
): ItemReport {
    const ctx: CheckContext = { volumes };
    const issues: Issue[] = [];
    const add = (level: Issue["level"], t: TNode | undefined, message: string): void => {
        issues.push({ level, message, ...where(t) });
    };
    // An item about negative numbers says so, and then a negative answer is not a mistake.
    const negativesWanted = item.node.flags.includes("negatives");
    const kid = (type: string): TNode | undefined =>
        item.node.children.find((c) => c.type === type);
    // A setting reaches a checker as the text it was written as, except that a quoted string arrives
    // without its quotes. Before this a list setting arrived empty, because a list term holds its
    // items rather than a value, so `notes=[C4, E4, G4]` was silently nothing.
    const checkSettings = writtenSettings(item);
    const checker = item.check ? CHECKERS[item.check.name] : undefined;
    // A checker may work some answers out itself, per variant; those names count as declared.
    const provided = checker?.provides?.(checkSettings) ?? [];
    const stated = item.answers.map((a) => a.name);
    const own = item.params.map((p) => p.name);
    const shared = (item.constants ?? []).map((c) => c.name);
    const params = [...shared, ...own];
    const roles = Object.keys(item.roles);
    const answers = [...stated, ...provided.filter((n) => !stated.includes(n))];
    /** A version's name leaves out what every version shares. */
    const named = (env: Env): Env =>
        Object.fromEntries(Object.entries(env).filter(([k]) => !shared.includes(k)));
    const names = (e: Expr, known: string[], t: TNode | undefined, label: string): void => {
        checkNames(e, known).forEach((x) => add("error", t, `${label}: ${x.message}`));
    };
    const template = (s: string, known: string[], t: TNode | undefined, label: string): void => {
        try {
            const u = uses(pieces(s));
            u.names
                .filter((n) => !known.includes(n) && !roles.includes(n))
                .forEach((n) => add("error", t, `${label}: {${n}} is not a parameter or a role`));
            u.roles
                .filter((n) => !roles.includes(n))
                .forEach((n) =>
                    add(
                        "error",
                        t,
                        `${label}: {${n}.many} names a role that is not in the roles line`,
                    ),
                );
        } catch (e) {
            add("error", t, `${label}: ${said(e)}`);
        }
    };

    const lets = item.node.children.filter((c) => c.type === "let");
    // A part the child arranges lends the answer and the feedback its measures as names, and one such
    // part to an item keeps each name to one meaning.
    const arranged = arrangedIn(item);
    const arrangedNode = arranged[0];
    const part = arrangedNode ? ARRANGED[arrangedNode.type] : undefined;
    const measures = part ? Object.keys(part.measures) : [];
    if (arranged[1])
        add(
            "error",
            arranged[1],
            "an item has one part to arrange, so each measure has one meaning",
        );
    for (const p of params.filter((n) => measures.includes(n)))
        add(
            "error",
            lets.find((l) => p in l.open),
            `the parameter ${p} has the name of a measure of ${arrangedNode?.type}; rename it`,
        );
    (item.constants ?? []).forEach((c, i) =>
        names(c.expr, shared.slice(0, i), kid("set"), `set ${c.name}`),
    );
    for (const n of shared.filter((s) => own.includes(s)))
        add("error", kid("set"), `${n} is both set and a parameter; give one of them another name`);
    item.params.forEach((p, i) =>
        names(
            p.domain,
            [...shared, ...own.slice(0, i)],
            lets.find((l) => p.name in l.open),
            `let ${p.name}`,
        ),
    );
    item.where.forEach((w) => names(w, params, kid("where"), "where"));
    if (item.difficulty) names(item.difficulty, params, kid("difficulty"), "difficulty");
    // A lesson block names a level with level=, so a parameter of that name could not be pinned.
    if (params.includes("level"))
        add(
            "error",
            lets.find((l) => "level" in l.open),
            "a parameter cannot be called level, which a lesson block uses to name a level",
        );
    item.answers.forEach((a) =>
        names(
            a.expr,
            a.name === arrangedNode?.id ? [...params, ...measures] : params,
            kid("answer"),
            `answer ${a.name}`,
        ),
    );
    if (arrangedNode && !item.explain)
        add(
            "error",
            kid("answer"),
            `answer ${arrangedNode.id} needs a say line: many arrangements can be right, so the grown-ups sheet gives the rule in words`,
        );
    if (item.explain) template(item.explain, params, kid("answer"), "answer say");
    const ruleNames = [...params, ...answers, ...measures];
    const walkRules = (rs: Rule[]): void => {
        rs.forEach((r) => {
            names(r.when, ruleNames, r.node, "when");
            if (
                answers.length &&
                ![...freeNames(r.when)].some((n) => answers.includes(n) || measures.includes(n))
            )
                add(
                    "warning",
                    r.node,
                    "this rule does not mention the answer, so it is true or false whatever the child writes",
                );
            r.say.forEach((s) => template(s, ruleNames, r.node, "say"));
            walkRules(r.children);
        });
    };
    walkRules(item.feedback);
    item.hints.forEach((h) => template(h, params, kid("hint"), "hint"));
    // A checker setting such as a look-for or a note list may name a parameter; the key fills it per version.
    for (const [k, v] of Object.entries(checkSettings))
        if (v.includes("{")) template(v, params, kid("check"), `check ${k}`);
    for (const [role, prop] of Object.entries(item.roles))
        if (!NOUNS[prop])
            add(
                "warning",
                kid("roles"),
                `"${prop}" (for ${role}) is not a prop the renderer knows`,
            );
    const picks = new Set(
        flatten(item.scene?.nodes ?? []).flatMap((n) => (n.spec.picks && n.id ? [n.id] : [])),
    );
    for (const n of flatten(item.scene?.nodes ?? [])) {
        if (n.spec.container)
            for (const c of n.children) {
                const placed = Object.keys(c.props).filter((k) => PLACE_KEYS.includes(k));
                if (placed.length)
                    add(
                        "error",
                        c,
                        `a ${n.type} places its children, so "${c.type}" cannot also have ${placed.join(", ")}`,
                    );
            }
        for (const [k, v] of Object.entries({ ...n.args, ...n.props })) {
            // A setting that takes a fixed word reads `kind=k` as the word "k", not as the parameter k, so
            // the drawing falls back to its default while the answer key still varies: a cube drawn for a
            // question whose answer is sphere. Refuse it and say how to let a parameter choose.
            if (v.k === "word" && params.includes(v.v) && n.spec.props?.[k]?.kind === "word")
                add(
                    "error",
                    n,
                    `${n.type} ${k}=${v.v}: ${v.v} is a parameter, but ${k} takes a fixed word. The drawing has to list the words ${k} accepts (choices) before a parameter can pick one`,
                );
            // A parameter named like one of the listed words reads as that word, so every variant draws it
            // (a letter parameter called x drew an x each time). Refuse the clash rather than guess.
            if (v.k === "word" && params.includes(v.v) && n.spec.props?.[k]?.kind === "pick")
                add(
                    "error",
                    n,
                    `${n.type} ${k}=${v.v}: ${v.v} is a parameter and also one of the words ${k} takes, so it reads as the word. Rename the parameter`,
                );
            if (v.k === "expr") names(v.e, params, n, `${n.type} ${k}`);
            if (v.k === "text") template(v.v, params, n, `${n.type} ${k}`);
            if (v.k === "items")
                v.v.forEach((it) => {
                    if (!roles.includes(it.role))
                        add("error", n, `${n.type} ${k}: "${it.role}" is not in the roles line`);
                    if (it.times) names(it.times, params, n, `${n.type} ${k}`);
                });
            if (v.k === "exprs") v.v.forEach((e) => e && names(e, params, n, `${n.type} ${k}`));
            if (v.k === "values")
                v.v.forEach((o) => {
                    if (o.k === "expr") names(o.e, params, n, `${n.type} ${k}`);
                    if (o.k === "text") template(o.v, params, n, `${n.type} ${k}`);
                    if (
                        o.k === "word" &&
                        !params.includes(o.v) &&
                        !roles.includes(o.v) &&
                        !NOUNS[o.v]
                    )
                        add(
                            "error",
                            n,
                            `${n.type} ${k}: "${o.v}" is not a parameter, a role, or a prop the renderer knows`,
                        );
                });
        }
    }
    let solutions: string[] | undefined;
    if (item.check) {
        const c = checker;
        if (!c)
            add(
                "error",
                kid("check"),
                `there is no code checker "${item.check.name}"; known: ${Object.keys(CHECKERS).join(", ")}`,
            );
        else {
            const settings = checkSettings;
            const missing = c.settings.filter((s) => !(s in settings));
            if (missing.length)
                add(
                    "error",
                    kid("check"),
                    `${item.check.name} needs ${missing.map((m) => `${m}=`).join(", ")}`,
                );
            else {
                try {
                    solutions = c.solutions(settings, ctx);
                } catch (e) {
                    add("error", kid("check"), said(e));
                }
                if (solutions && !solutions.length)
                    add("error", kid("check"), "the puzzle has no solution");
                // A checker can also say that an item is answerable but does not teach what it claims to,
                // which is a warning: the author has to read it, and nothing stops the item shipping.
                try {
                    for (const w of c.warnings?.(settings) ?? []) add("warning", kid("check"), w);
                } catch (e) {
                    add("error", kid("check"), said(e));
                }
            }
        }
    } else if (!item.answers.length)
        add("error", item.node, 'the item has no "answer" and no "check"');
    const scene = item.scene;
    if (!scene) add("error", item.node, "the item has no scene");
    if (!scene || issues.some((i) => i.level === "error"))
        return { issues, variants: [], total: 0, sampled: false, solutions };

    let vs: ReturnType<typeof variantsOf>;
    try {
        vs = variantsOf(item);
    } catch (e) {
        add("error", lets[0], said(e));
        return { issues, variants: [], total: 0, sampled: false };
    }
    const grouped = new Map<
        string,
        { level: Issue["level"]; t: TNode | undefined; msg: string; at: string[] }
    >();
    const note = (
        level: Issue["level"],
        t: TNode | undefined,
        msg: string,
        label: string,
    ): void => {
        const k = `${level}|${t?.src.span.line}|${msg}`;
        const g = grouped.get(k) ?? { level, t, msg, at: [] };
        g.at.push(label);
        grouped.set(k, g);
    };
    const shownFirst = new Map<string, string>();
    const variants: Variant[] = [];
    let checkedRefs = false;
    const fired = new Set<Rule>();
    let luck = 0;
    let walked = 0;
    let spoken = 1;

    for (const env of vs.envs) {
        const label = describe(named(env));
        if (!checker?.variant)
            for (const v of Object.values(checkSettings)) {
                if (!v.includes("{")) continue;
                try {
                    fill(pieces(v), env, item.roles);
                } catch (e) {
                    note(
                        "error",
                        kid("check"),
                        `a check setting cannot be filled: ${said(e)}`,
                        label,
                    );
                }
            }
        const correct: Record<string, Value> = {};
        try {
            for (const [k, v] of Object.entries(answersFor(item, env))) {
                if (picks.has(k) && v.k !== "num" && v.k !== "str")
                    note(
                        "error",
                        kid("answer"),
                        `answer ${k} must be a number or a text naming an option, not ${showValue(v)}`,
                        label,
                    );
                else if (!picks.has(k) && v.k !== "num")
                    note(
                        "error",
                        kid("answer"),
                        `answer ${k} must be a number, not ${showValue(v)}`,
                        label,
                    );
                else if (v.k === "num" && v.v.n < 0 && !negativesWanted)
                    note("warning", kid("answer"), `answer ${k} is negative`, label);
                correct[k] = v;
            }
        } catch (e) {
            note("error", kid("answer"), said(e), label);
            continue;
        }
        let inst: SceneInstance | null = null;
        try {
            inst = instantiate(scene, env, item.roles, defines);
        } catch (e) {
            note("error", kid("scene"), said(e), label);
        }
        // A checker that works the answer out for this variant, by running what the scene shows, is the
        // proof of the answer: a stated answer has to agree with it, and one not stated is taken from it.
        if (inst && checker?.variant) {
            try {
                // A setting can name a parameter in braces, "row({r}).red", filled for this variant.
                const settings = Object.fromEntries(
                    Object.entries(checkSettings).map(([k, v]) => [
                        k,
                        v.includes("{") ? fill(pieces(v), env, item.roles) : v,
                    ]),
                );
                const got = checker.variant(inst, settings, ctx);
                for (const p of got.problems) note("error", kid("check"), p, label);
                for (const [k, v] of Object.entries(got.answers)) {
                    const was = correct[k];
                    if (was && !equal(was, v))
                        note(
                            "error",
                            kid("answer"),
                            `answer ${k} is ${showValue(was)}, but ${item.check?.name} works it out as ${showValue(v)}`,
                            label,
                        );
                    else if (!was) correct[k] = v;
                }
            } catch (e) {
                note("error", kid("check"), said(e), label);
            }
        }
        // An arranged answer is proved over every arrangement of this variant: at least one is right, few
        // enough are right that putting pieces anywhere seldom answers it, and no feedback rule is true
        // for a right one. The rules are checked there, against each arrangement's measures.
        let arrangedOut: Variant["arranged"];
        let keyText = "";
        if (inst && arrangedNode?.id && part) {
            const id = arrangedNode.id;
            const c = inst.nodes.find((n) => n.id === id);
            const expr = item.answers.find((a) => a.name === id)?.expr;
            const board = c ? part.board(c.v) : `there is no ${id} in the scene`;
            if (typeof board === "string")
                note("error", arrangedNode, `${arrangedNode.type} ${id}: ${board}`, label);
            else if (expr) {
                const proof = prove(board, env, expr, item.feedback);
                proof.problems.forEach((p) => note("error", kid("answer"), p, label));
                for (const [r, a] of proof.onRight)
                    note(
                        "error",
                        r.node,
                        `this rule is also true for a right arrangement (${board.placing(a)}), so it would tell a child that a right answer is wrong`,
                        label,
                    );
                proof.fired.forEach((r) => fired.add(r));
                walked += proof.tried;
                if (proof.tried) luck = Math.max(luck, proof.right / proof.tried);
                if (proof.tried > proof.right)
                    spoken = Math.min(spoken, proof.spoken / (proof.tried - proof.right));
                if (proof.key && !proof.problems.length) {
                    arrangedOut = { id, key: proof.key, right: proof.right, tried: proof.tried };
                    keyText = board.placing(proof.key);
                }
            }
        }
        const ruleEnv: Env = { ...env, ...correct };
        const walk = (rs: Rule[]): void => {
            rs.forEach((r) => {
                try {
                    const hit = evaluate(r.when, ruleEnv);
                    if (hit.k === "bool" && hit.v)
                        note(
                            "warning",
                            r.node,
                            "this rule is also true for the correct answer, so it cannot tell the mistake apart",
                            label,
                        );
                } catch (e) {
                    note("error", r.node, said(e), label);
                }
                walk(r.children);
            });
        };
        if (!arrangedNode) walk(item.feedback);

        const labels: Record<string, string> = {};
        if (inst) {
            for (const c of inst.nodes) {
                const cap = c.spec.capacity;
                if (cap)
                    for (const side of ["left", "right"]) {
                        const held = c.v[side];
                        const n = Array.isArray(held) ? held.length : 0;
                        if (n > cap)
                            note(
                                "error",
                                c.node,
                                `${c.id} ${side} pan holds ${n} props; a ${c.type} holds at most ${cap}`,
                                label,
                            );
                    }
                if (
                    c.type === "tenframe" &&
                    (Number(c.v.count) < 0 ||
                        Number(c.v.count) > 10 ||
                        !Number.isInteger(Number(c.v.count)))
                )
                    note("error", c.node, "a ten frame shows 0 to 10 counters", label);
                const drawn = partParams(c.type, c.v);
                const bound = CAPACITY[c.type]?.(drawn);
                if (bound) note("error", c.node, `${c.id}: ${bound}`, label);
                for (const [k, most] of Object.entries(PARTS.get(c.type)?.most ?? {})) {
                    const text = drawn[k];
                    if (typeof text === "string" && text.length > most)
                        note(
                            "error",
                            c.node,
                            `${c.id}: its ${k} is ${text.length} characters, and a ${c.type} holds at most ${most}`,
                            label,
                        );
                }
                if (c.type === "equation")
                    for (const b of textOf(c)?.blanks ?? []) {
                        const value = correct[b];
                        const want = value ? showValue(value) : "";
                        if (want.length > 1)
                            note(
                                "error",
                                c.node,
                                `${c.id}: the blank {?${b}} is one square wide, but the answer takes more than one; put it in a number box`,
                                label,
                            );
                    }
                for (const [k, s] of Object.entries(c.spec.props ?? {})) {
                    if (s.kind !== "pick" || !s.values || c.v[k] === undefined) continue;
                    if (!s.values.includes(shown(c.v[k])))
                        note(
                            "error",
                            c.node,
                            `${c.type} ${k} is "${shown(c.v[k])}", which is not one of ${s.values.join(", ")}`,
                            label,
                        );
                }
                if (c.spec.blanks) {
                    const drawn = c.spec.blanks(c.v);
                    const named = wordsIn(c.v.blanks).length;
                    if (drawn !== named)
                        note(
                            "error",
                            c.node,
                            `${c.id} draws ${drawn} blank${drawn === 1 ? "" : "s"} but blanks= names ${named}`,
                            label,
                        );
                }
                if (c.spec.picks) options(c, correct[c.id], label, labels);
            }
            try {
                layout(inst).problems.forEach((p) => note("error", kid("scene"), p, label));
            } catch (e) {
                note("error", kid("scene"), said(e), label);
            }
            if (!checkedRefs) {
                checkedRefs = true;
                refs(inst, env);
            }
        }
        braces(inst, ruleEnv, label);
        variants.push({
            values: Object.fromEntries(
                Object.entries(named(env)).map(([k, v]) => [k, showValue(v)]),
            ),
            env,
            answers: {
                ...Object.fromEntries(Object.entries(correct).map(([k, v]) => [k, showValue(v)])),
                ...(arrangedOut ? { [arrangedOut.id]: keyText } : {}),
            },
            ...(Object.keys(labels).length ? { labels } : {}),
            ...(arrangedOut ? { arranged: arrangedOut } : {}),
        });
    }
    /**
     * No text a child or a grown-up reads keeps a brace once it is filled, since a brace left over is a
     * placeholder that was never read. A line that names the child's answer is filled with the right
     * one here, and one that cannot be filled until the child answers is left to its own check.
     */
    function braces(inst: SceneInstance | null, env: Env, label: string): void {
        const leftover = (t: TNode | undefined, where: string, text: string): void => {
            if (!/[{}]/.test(text)) return;
            // The first text that shows it names the fault, so one fault is one issue over its versions.
            const key = `${t?.src.span.line}|${where}`;
            const seen = shownFirst.get(key) ?? text;
            shownFirst.set(key, seen);
            note("error", t, `${where} still shows a brace once filled: "${seen}"`, label);
        };
        const filled = (t: TNode | undefined, where: string, s: string, must: boolean): void => {
            try {
                leftover(t, where, fill(pieces(s), env, item.roles));
            } catch (e) {
                if (must) note("error", t, `${where} cannot be filled: ${said(e)}`, label);
            }
        };
        item.hints.forEach((h) => filled(kid("hint"), "a hint", h, true));
        if (item.explain) filled(kid("answer"), "the answer's say line", item.explain, false);
        const walkSays = (rs: Rule[]): void =>
            rs.forEach((r) => {
                r.say.forEach((s) => filled(r.node, "a feedback say line", s, false));
                walkSays(r.children);
            });
        walkSays(item.feedback);
        for (const c of inst?.nodes ?? []) {
            for (const [k, v] of Object.entries(c.v))
                if (typeof v === "object" && !Array.isArray(v))
                    leftover(c.node, `${c.id} ${k}`, v.filled);
            for (const o of optionsOf(c)) leftover(c.node, `an option of ${c.id}`, o.label);
        }
    }
    /** A picked answer has to name exactly one of the options, and no two options may be the same. */
    function options(
        c: Concrete,
        answer: Value | undefined,
        label: string,
        labels: Record<string, string>,
    ): void {
        const list = optionsOf(c);
        const seen = new Set<string>();
        for (const o of list) {
            if (seen.has(o.value))
                note("error", c.node, `${c.id} has two options that read "${o.value}"`, label);
            seen.add(o.value);
        }
        if (!answer) return;
        const want = showValue(answer);
        const hits = list.filter((o) => o.value === want);
        const [hit] = hits;
        if (hits.length === 1 && hit) labels[c.id] = hit.label;
        if (!hits.length)
            note(
                "error",
                kid("answer"),
                `answer ${c.id} is "${want}", which is not one of the options (${list.map((o) => o.value).join(", ")})`,
                label,
            );
        else if (hits.length > 1)
            note(
                "error",
                c.node,
                `${c.id} has ${hits.length} options that the answer "${want}" could name`,
                label,
            );
    }

    function refs(inst: SceneInstance, env: Env): void {
        const ids = new Map(inst.nodes.map((c) => [c.id, c] as const));
        const check = (r: string, t: TNode | undefined, label: string): void => {
            const [id = "", anchor] = r.split(".");
            const target = ids.get(id);
            if (!target) {
                add("error", t, `${label}: there is no node "${id}" in the scene`);
                return;
            }
            const has = [
                ...(target.spec.anchors ?? []),
                ...(target.spec.anchorsOf?.(target.v) ?? []),
            ];
            if (anchor && !has.includes(anchor) && !BOX_ANCHORS.includes(anchor))
                add(
                    "error",
                    t,
                    `${label}: "${target.type}" has no anchor "${anchor}"; it has ${[...has, ...BOX_ANCHORS].slice(0, 8).join(", ")}`,
                );
        };
        for (const c of inst.nodes) {
            if (c.place && c.place.rel !== "at" && c.place.rel !== "in")
                check(c.place.of, c.node, "placement");
            for (const [k, spec] of Object.entries(c.spec.props ?? {})) {
                const x = c.v[k];
                if (spec.kind === "ref" && !PLACE_KEYS.includes(k) && typeof x === "string")
                    check(x, c.node, `${c.type} ${k}`);
            }
        }
        for (const a of inst.arrows) {
            check(a.from, a.node, "arrow");
            check(a.to, a.node, "arrow");
        }
        for (const m of inst.marks) check(m.target, m.node, m.type);
        const walkPoints = (rs: Rule[]): void => {
            rs.forEach((r) => {
                if (r.point) check(fillIndex(r.point, env), r.node, "point");
                walkPoints(r.children);
            });
        };
        walkPoints(item.feedback);
        const inputs = [
            ...inst.nodes
                .filter((c) => {
                    const a = c.spec.arranges;
                    return c.spec.input || (typeof a === "object" && c.v[a.when] === 1);
                })
                .map((c) => c.id),
            // blanks inside a text template ({?more}), and blanks a node draws itself (blanks=[q, r])
            ...inst.nodes.flatMap((c) =>
                Object.values(c.v).flatMap((v) =>
                    typeof v === "object" && !Array.isArray(v) ? v.blanks : [],
                ),
            ),
            ...inst.nodes.flatMap((c) => (c.spec.blanks ? wordsIn(c.v.blanks) : [])),
        ];
        if (!item.check || provided.length) {
            inputs
                .filter((i) => !answers.includes(i))
                .forEach((i) =>
                    add(
                        "error",
                        kid("answer") ?? item.node,
                        `"${i}" takes an answer, but there is no answer ${i === "answer" ? "(...)" : `${i}=...`}`,
                    ),
                );
            answers
                .filter((a) => !inputs.includes(a))
                .forEach((a) =>
                    add(
                        "error",
                        kid("answer"),
                        `answer ${a} has nowhere to go: add an input with that name or a {?${a}} blank`,
                    ),
                );
        }
    }
    for (const g of grouped.values()) {
        const at =
            g.at.length > 4
                ? `${g.at.slice(0, 4).join("; ")}; and ${g.at.length - 4} more`
                : g.at.join("; ");
        issues.push({ level: g.level, message: `${g.msg} (${at})`, ...where(g.t) });
    }
    // A sampled item only ever sees a draw of its variants, so say what was actually checked rather
    // than claiming something about variants nobody enumerated.
    const at = kid("where") ?? lets[0] ?? item.node;
    if (!variants.length && vs.envs.length === 0) {
        add(
            "error",
            at,
            vs.sampled
                ? `no variant passed the where conditions in ${SAMPLE * 20} random draws, out of about ${vs.total} the ranges allow; narrow the ranges so they can be listed, or loosen the conditions`
                : "no variant passes the where conditions",
        );
    } else if (vs.sampled && vs.envs.length < SAMPLE) {
        add(
            "warning",
            at,
            `only ${vs.envs.length} of ${SAMPLE} sampled variants passed the where conditions, so these checks cover less of the item than usual`,
        );
    }
    if (arrangedNode && variants.length) {
        const unheard = (rs: Rule[]): void => {
            rs.forEach((r) => {
                if (!fired.has(r))
                    add(
                        "warning",
                        r.node,
                        "no wrong arrangement in any variant makes this rule true, so a child never hears it",
                    );
                unheard(r.children);
            });
        };
        unheard(item.feedback);
    }
    const arrangedReport =
        arrangedNode && variants.length ? { arranged: { luck, walked, spoken } } : {};
    return { issues, variants, total: vs.total, sampled: vs.sampled, solutions, ...arrangedReport };
}

/** Deterministic picks for a practice set. */
export function pick<T>(list: T[], count: number, seed: number): T[] {
    const r = seeded(seed);
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const x = a[i];
        const y = a[j];
        if (x !== undefined && y !== undefined) {
            a[i] = y;
            a[j] = x;
        }
    }
    return a.slice(0, count);
}

/** One version's difficulty, from its item's difficulty line, or null when there is none. */
export function difficultyOf(item: Item, env: Env): number | null {
    if (!item.difficulty) return null;
    try {
        const v = evaluate(item.difficulty, env);
        return v.k === "num" ? Number(v.v.n) / Number(v.v.d) : v.k === "bool" ? Number(v.v) : null;
    } catch {
        return null;
    }
}

/** The average difficulty over a set of versions, or null when the item has no difficulty line. */
export function meanDifficulty(item: Item, variants: Variant[]): number | null {
    const all = variants
        .map((v) => difficultyOf(item, v.env))
        .filter((x): x is number => x !== null);
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
}

/** Scene nodes including the children a row or a column holds. */
export const flatten = (nodes: TNode[]): TNode[] =>
    nodes.flatMap((n) => (n.spec.container ? [n, ...flatten(n.children)] : [n]));
