import type {
    Envelope,
    EventData,
    Given,
    ProgramLine,
    QuestionRef,
    Timing,
    Way,
} from "../engine/answer";
import {
    evaluate,
    parseExpr,
    pieces,
    showValue,
    str,
    type Env,
    type Expr,
    type Value,
} from "../engine/expr";
import {
    DICTATION,
    LEVELS,
    markWords,
    partsOf,
    pieceOf,
    type Left,
    type Level,
    type PackItem,
    type PackLesson,
    type PackLevel,
    type PackQuestion,
    type PackRule,
    type Piece,
} from "../engine/pack";
import type { Opt } from "../engine/scene";

/** Tries at a question before its answer is shown. They decide when a hint or the answer appears, and are never shown. */
export const TRIES = 3;

/** When a hint is offered, as a grown-up set it for the child. */
export type HintPolicy = "on-request" | "after-one-try";

/** The level a sheet is asked at, until a grown-up's setting says otherwise. */
export const SHEET_LEVEL: Level = "medium";

export interface Asked {
    section: string;
    how: "practice" | "show" | "worked";
    item: PackItem;
    question: PackQuestion;
    ref: QuestionRef;
    way: Way;
}

/**
 * The checker of a program a child builds from a pad's blocks. A question another coding or paint
 * checker proved carries its answer, and is typed or picked like any other. A piece a grown-up looks
 * at (`pieceOf`) is made on paper and handed in, until the sheet has a pen and the easel.
 */
const BUILDS = "coding.builds";
/** A typed answer longer than this, or on more than one line, is not typed into a box. A picked one is pressed, however long its words. */
const LONGEST = 24;

/** A lesson at a level. A lesson that does not declare the level is asked as written, which is medium. */
export const levelIn = (lesson: PackLesson, level: Level): PackLevel =>
    lesson.levels[level] ?? lesson.levels.medium;

const isOpt = (v: unknown): v is Opt =>
    typeof v === "object" && v !== null && "label" in v && "value" in v;

/**
 * The options a picked answer chooses between, from the drawing the question places them on: the
 * choice part whose id is the answer's name. Empty for an answer that is typed.
 */
export function optionsOf(q: PackQuestion, key: string): Pick<Opt, "label" | "value">[] {
    const part = q.scene?.nodes.find((n) => n.type === "choice" && n.id === key);
    const options = part?.v.options;
    return Array.isArray(options)
        ? options.filter(isOpt).map((o) => ({ label: o.label, value: o.value }))
        : [];
}

function wayOf(how: Asked["how"], item: PackItem, q: PackQuestion): Way {
    if (how === "worked" || q.n === 0) return "worked";
    if (q.arranged) return "arranged";
    const check = item.check;
    if (pieceOf(item)) return "grown-up";
    if (check?.name === BUILDS) return "program";
    // a dictation's sentence is long, and it is typed all the same
    if (check?.name === DICTATION) return "typed";
    const keys = Object.keys(q.answers);
    const long = (k: string): boolean => {
        const a = q.answers[k] ?? "";
        return (a.length > LONGEST || a.includes("\n")) && !optionsOf(q, k).length;
    };
    if (!keys.length || keys.some(long)) return "elsewhere";
    return "typed";
}

/**
 * A lesson's questions at a level, in the order its page asks them. Draw 0 is the page as the lesson
 * names it; draw 1 or 2 is another day's, with each practice block picked again. A book lesson's
 * `part` asks only that sitting's questions.
 */
export function askedIn(lesson: PackLesson, level: Level, draw = 0, part?: number): Asked[] {
    const at = levelIn(lesson, level);
    const sittings = at.sections.filter((s) => s.type === "sitting");
    const one = part === undefined ? undefined : sittings[part - 1];
    return (one ? [one] : at.sections).flatMap((section) =>
        section.blocks.flatMap((block) => {
            if (block.k !== "ask") return [];
            const again = draw > 0 ? block.again[draw - 1] : undefined;
            return (again ?? block.questions).map((question) => ({
                section: section.type,
                how: block.how,
                item: block.item,
                question,
                ref: {
                    lesson: lesson.id,
                    lessonHash: at.hash,
                    section: section.type,
                    n: question.n,
                    item: block.item.id,
                    itemHash: block.item.hash,
                    variant: question.variant,
                    ask: question.ask,
                    skills: block.item.skills,
                },
                way: wayOf(block.how, block.item, question),
            }));
        }),
    );
}

export interface Checked {
    right: boolean;
    given: Given;
    /** For a wrong answer, the first of the author's rules it makes true. A right answer fires none. */
    rule: PackRule | null;
    /** That rule's line, with the child's answer filled in wherever the line names it. */
    said: string | null;
    /** The part of the drawing the rule points at. */
    point: string | null;
}

const plain = (s: string): string =>
    s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/(\d),(?=\d{3}\b)/g, "$1");

/** A whole number, a decimal or a fraction, as a child types one. */
const NUMBER = /^-?\d+(\.\d+)?$/;
const FRACTION = /^-?\d+\s*\/\s*\d+$/;

function valueOf(typed: string): Value {
    const t = plain(typed);
    if (NUMBER.test(t) || FRACTION.test(t)) {
        try {
            return evaluate(parseExpr(t), {});
        } catch {
            return str(typed.trim());
        }
    }
    return str(typed.trim());
}

function holds(when: Expr, env: Env): boolean {
    try {
        const v = evaluate(when, env);
        return v.k === "bool" && v.v;
    } catch {
        return false;
    }
}

/** The first rule true for the answer, a rule's own rules read after it and before the next rule. */
function firstRule(rules: readonly PackRule[], env: Env): PackRule | null {
    for (const rule of rules) {
        if (holds(rule.when, env)) return rule;
        const deeper = firstRule(rule.children, env);
        if (deeper) return deeper;
    }
    return null;
}

/** A line with the placeholders the pack could not fill until the child answered, such as `{answer}`. */
function filledIn(line: string, env: Env): string {
    if (!line.includes("{")) return line;
    try {
        const parts = pieces(line).map((p) => {
            switch (p.k) {
                case "text":
                    return p.v;
                case "expr": {
                    const v = evaluate(p.e, env);
                    return v.k === "str" ? filledIn(v.v, env) : showValue(v);
                }
                case "blank":
                case "noun":
                    return null;
            }
        });
        return parts.every((p): p is string => p !== null) ? parts.join("") : line;
    } catch {
        return line;
    }
}

function judged(q: PackQuestion, env: Env, right: boolean, given: Given): Checked {
    const rule = right ? null : firstRule(q.feedback, env);
    const line = rule?.say[0];
    return {
        right,
        given,
        rule,
        said: line === undefined ? null : filledIn(line, env),
        point: rule?.point ?? null,
    };
}

/** A list of words as a line reads them: "a", "a and b", "a, b and c". */
const listed = (words: readonly string[]): string =>
    words.length < 2
        ? (words[0] ?? "")
        : `${words.slice(0, -1).join(", ")} and ${words.at(-1) ?? ""}`;

/**
 * A dictation typed, marked word by word against its sentence (`markWords`): the words misspelt, as
 * the child wrote them, are what the child reads and what the answer's rule records, with a word left
 * out or one too many said as such.
 */
function checkDictation(q: PackQuestion, typed: string): Checked {
    const m = markWords(q.answers.answer ?? "", typed);
    const misspelt = m.words.flatMap((w) => (!w.right && w.wrote !== null ? [w.wrote] : []));
    const missing = m.words.filter((w) => w.wrote === null).length;
    const said = [
        misspelt.length ? `Check the spelling of ${listed(misspelt)}.` : "",
        missing ? `${missing === 1 ? "A word is" : `${missing} words are`} missing.` : "",
        m.extra.length ? `Leave out ${listed(m.extra)}.` : "",
    ]
        .filter(Boolean)
        .join(" ");
    return {
        right: m.right,
        given: { k: "word", text: typed },
        rule: null,
        said: m.right ? null : said,
        point: null,
    };
}

/**
 * A typed answer, by the answer's name: right when every box says the answer or, for a picked answer,
 * its label, or in a language lesson any other spelling the question takes (`also`), whatever the
 * case, the spacing or a thousands comma. A dictation (`check` is the item's
 * checker) is marked word by word instead. Null while a box is empty.
 */
export function checkTyped(
    q: PackQuestion,
    typed: Readonly<Record<string, string>>,
    check: PackItem["check"] = null,
): Checked | null {
    const keys = Object.keys(q.answers);
    const got = keys.map((k) => typed[k]?.trim() ?? "");
    if (!keys.length || got.some((t) => !t)) return null;
    if (check?.name === DICTATION) return checkDictation(q, got[0] ?? "");
    const right = keys.every((k, i) => {
        const g = plain(got[i] ?? "");
        const label = q.labels?.[k];
        const want = plain(q.answers[k] ?? "");
        return (
            g === want ||
            (label !== undefined && g === plain(label)) ||
            (q.also?.[k] ?? []).some((a) => g === plain(a))
        );
    });
    const env: Env = {
        ...q.env,
        ...Object.fromEntries(keys.map((k, i) => [k, valueOf(got[i] ?? "")])),
    };
    const only = keys.length === 1 ? (got[0] ?? "") : null;
    const given: Given =
        only === null
            ? { k: "word", text: keys.map((k, i) => `${k}=${got[i] ?? ""}`).join(", ") }
            : NUMBER.test(plain(only))
              ? { k: "number", text: only }
              : q.labels
                ? { k: "pick", option: only }
                : { k: "word", text: only };
    return judged(q, env, right, given);
}

type Placed = Extract<Given, { k: "arranged" }>["places"];

/**
 * An answer arranged on a drawing. `measures` are what the part works out from where the pieces
 * stand (a see-saw's turning, a cake's pieces), which the answer and the rules are written over.
 * Null while nothing has been placed.
 */
export function checkArranged(
    q: PackQuestion,
    part: string,
    places: Placed,
    measures: Env,
): Checked | null {
    if (!q.arranged || !places.length) return null;
    const env: Env = { ...q.env, ...measures };
    return judged(q, env, holds(q.arranged.right, env), {
        k: "arranged",
        part,
        places: [...places],
    });
}

/**
 * A program a child built, as its run judged it (`works`: the program does the job the check names,
 * which the page works out with the interpreter). No author's rule speaks to a program, so the page
 * says what the run did. Null while no block is placed.
 */
export function checkProgram(lines: readonly ProgramLine[], works: boolean): Checked | null {
    if (!lines.length) return null;
    return {
        right: works,
        given: { k: "program", lines: lines.map((l) => ({ text: l.text, depth: l.depth })) },
        rule: null,
        said: null,
        point: null,
    };
}

/** The words a child reads as a question is answered. None of them says how many tries there were. */
export type Line =
    | "right"
    | "right-in-the-end"
    | "not-yet"
    | "empty"
    | "shown"
    | "shown-arranged"
    | "shown-program"
    | Handed
    | Help
    | Step;

/**
 * What the companion says on a hint step (.docs/hint-steps.md) besides the hint itself: when the
 * grown-up's setting holds hints back until a first try, when the worked example is drawn, before the
 * walk through to the answer, and when every step has been given.
 */
export type Step = "step-first" | "step-worked" | "step-answer" | "step-done";

/**
 * The lines the world's guide says on its card, beside a question's own words (.docs/ai.md, "The
 * guide"): fixed, written by a person, and in the second person or the imperative about the maths.
 */
export type Help = "no-hint" | "no-easier" | "handoff" | "today" | "read" | "pinned";

type Handed = "handed-in" | "handed-in-painting" | "handed-in-heard";

/** What a child reads once they have handed a piece in. */
export const HANDED: Record<Piece, Handed> = {
    writing: "handed-in",
    painting: "handed-in-painting",
    made: "handed-in-painting",
    spoken: "handed-in-heard",
    sung: "handed-in-heard",
};

export const LINES: Record<Line, string> = {
    "step-first": "Have a go first, then tap help again for a hint.",
    "step-worked": "Here is one worked out. Follow it, then try yours.",
    "step-answer": "Here is how it works, step by step.",
    "step-done": "That is every hint for this one. Have another go, or ask a question.",
    right: "Yes, that is right.",
    "right-in-the-end": "Yes, you got it.",
    "not-yet": "Not yet. Have another look.",
    empty: "Write your answer in the box first.",
    shown: "It will come back another day.",
    "shown-arranged": "One way that works is drawn now. It will come back another day.",
    "shown-program": "A program that works is in the slots now. It will come back another day.",
    "handed-in": "A grown-up will read it.",
    "handed-in-painting": "A grown-up will look at it.",
    "handed-in-heard": "A grown-up will listen to it.",
    "no-hint": "That is every clue this question has. Leave it for your grown-up.",
    "no-easier": "There is no easier one for this. Leave it for your grown-up.",
    handoff: "Leave this one. Your grown-up will see it on their page.",
    today: "This is what to do today.",
    read: "Read it",
    pinned: "For your grown-up.",
};

/** What a child asks the guide for on its card, which `help-asked` records. */
export type Ask = EventData["help-asked"]["ask"];

export interface Turn {
    tries: number;
    hints: number;
    /** Right, shown after the last try, or handed in for a grown-up: nothing more is asked of the question. */
    done: boolean;
    right: boolean;
    /** Handed to the grown-up from the guide's card: the pin shows on the next visit, so a child does not ask twice. */
    pinned: boolean;
    /** What the child gave last, for a sitting picked up again to show as they left it. */
    given?: Given;
}

export const FRESH: Turn = { tries: 0, hints: 0, done: false, right: false, pinned: false };

/** What a child typed, by the answer's name, as their last answer to a typed question holds it. */
export function writtenOf(q: PackQuestion, given: Given | undefined): Record<string, string> {
    const keys = Object.keys(q.answers);
    if (!given || (given.k !== "number" && given.k !== "word" && given.k !== "pick")) return {};
    if (given.k === "pick") return keys[0] === undefined ? {} : { [keys[0]]: given.option };
    if (keys.length === 1) return keys[0] === undefined ? {} : { [keys[0]]: given.text };
    // several boxes are recorded as `name=value` pairs (checkTyped)
    const out: Record<string, string> = {};
    for (const pair of given.text.split(", ")) {
        const at = pair.indexOf("=");
        const k = pair.slice(0, at);
        if (at > 0 && keys.includes(k)) out[k] = pair.slice(at + 1);
    }
    return out;
}

export interface Reply {
    state: "right" | "again" | "shown";
    say: string;
    point: string | null;
}

const answerText = (q: PackQuestion): string =>
    Object.keys(q.answers)
        .map((k) => q.labels?.[k] ?? q.answers[k] ?? "")
        .join(", ");

/** A try at a question, and what the child reads after it. A question that is done takes no more tries. */
export function tried(
    turn: Turn,
    q: PackQuestion,
    checked: Checked,
    way: "typed" | "arranged" | "program",
): { turn: Turn; reply: Reply } | null {
    if (turn.done) return null;
    const tries = turn.tries + 1;
    if (checked.right) {
        const say = LINES[tries === 1 ? "right" : "right-in-the-end"];
        return {
            turn: { ...turn, tries, done: true, right: true },
            reply: { state: "right", say, point: null },
        };
    }
    const wrong = checked.said ?? LINES["not-yet"];
    if (tries >= TRIES) {
        const say =
            way === "typed"
                ? `The answer is ${answerText(q)}. ${LINES.shown}`
                : `${wrong} ${LINES[way === "arranged" ? "shown-arranged" : "shown-program"]}`;
        return {
            turn: { ...turn, tries, done: true, right: false },
            reply: { state: "shown", say, point: null },
        };
    }
    return {
        turn: { ...turn, tries },
        reply: { state: "again", say: wrong, point: checked.point },
    };
}

/**
 * A question handed in for a grown-up to read, once: done, neither right nor wrong, and recorded as
 * collected (`handedIn`), for the grown-up to mark later. Null for one already done.
 */
export function handIn(turn: Turn): Turn | null {
    if (turn.done) return null;
    return {
        ...turn,
        tries: turn.tries + 1,
        done: true,
        right: false,
        given: { k: "unmarked" },
    };
}

/** Whether the next hint may be offered: never once the question is done, never past the last, and only after a wrong try when a grown-up asked for that. */
export function mayHint(turn: Turn, q: PackQuestion, policy: HintPolicy): boolean {
    if (turn.done || turn.hints >= q.hints.length) return false;
    return policy === "on-request" || turn.tries > 0;
}

/**
 * Where a sitting picked up again left each question, by its number, from the lesson's own events:
 * as many tries and hints as its last answer counted, right if any try was, and done once right,
 * after the last try, or once handed in for a grown-up. A hint opened after the last answer counts
 * too. Nothing for a question never tried, which starts fresh.
 */
export function turnsOf(events: readonly Envelope[], sitting: string): Map<number, Turn> {
    const out = new Map<number, Turn>();
    for (const e of events) {
        if (e.kind === "answered" && e.data.sitting === sitting) {
            const had = out.get(e.data.q.n) ?? FRESH;
            const tries = Math.max(had.tries, e.data.tries);
            const right = had.right || e.data.right === true;
            out.set(e.data.q.n, {
                tries,
                hints: Math.max(had.hints, e.data.hints),
                done: right || tries >= TRIES || e.data.given.k === "unmarked",
                right,
                pinned: had.pinned,
                given: e.data.given,
            });
        } else if (e.kind === "hint-opened" && e.data.sitting === sitting) {
            const had = out.get(e.data.q.n) ?? FRESH;
            out.set(e.data.q.n, { ...had, hints: Math.max(had.hints, e.data.rung) });
        } else if (
            e.kind === "help-asked" &&
            e.data.sitting === sitting &&
            e.data.ask === "grown-up"
        ) {
            const had = out.get(e.data.q.n) ?? FRESH;
            out.set(e.data.q.n, { ...had, pinned: true });
        }
    }
    return out;
}

/**
 * One question folded into what a sheet draws: what was asked, and where a turn left it. `policy` is
 * the grown-up's hint setting for the child answering it, and null wherever nobody is answering, as
 * on a finished sheet looked back at, where no hint may be opened.
 */
export function leftOf(asked: Asked, turn: Turn, policy: HintPolicy | null): Left {
    const q = asked.question;
    return {
        n: q.n,
        item: asked.item,
        question: q,
        way: asked.way,
        done: turn.done,
        right: turn.right,
        given: turn.given ?? null,
        opened: q.hints.slice(0, turn.hints),
        written: writtenOf(q, turn.given),
        options: Object.fromEntries(Object.keys(q.answers).map((k) => [k, optionsOf(q, k)])),
        mayHint: policy !== null && mayHint(turn, q, policy),
        handedSays: LINES[HANDED[pieceOf(asked.item) ?? "writing"]],
        pinned: turn.pinned,
    };
}

/**
 * A lesson as its last screen sitting left it, read from that lesson's own events, for a page that
 * draws a finished sheet: the child's app in a world looked back at, and the grown-ups' journal.
 * The level is the one whose hash the sitting recorded, so a child asked at easy is read back at
 * easy, and a lesson rewritten since is `changed` rather than drawn with answers that were given to
 * other questions. A lesson with no screen sitting was done on paper, and is drawn with none.
 */
export function leftIn(
    lesson: PackLesson,
    events: readonly Envelope[],
): { left: Left[]; level: Level; was: "screen" | "paper" | "changed" } {
    const began = new Map(
        events.flatMap((e) =>
            e.kind === "sitting-began" && e.data.mode === "screen" && e.data.lesson === lesson.id
                ? [[e.data.sitting, e.data] as const]
                : [],
        ),
    );
    const ends = events.flatMap((e) =>
        e.kind === "sitting-ended" && began.has(e.data.sitting) ? [e.data] : [],
    );
    const which = ends.findLast((e) => e.finished)?.sitting ?? [...began.keys()].at(-1);
    const sitting = which === undefined ? undefined : began.get(which);
    const level = sitting && LEVELS.find((l) => levelIn(lesson, l).hash === sitting.lessonHash);
    const turns = sitting && level ? turnsOf(events, sitting.sitting) : new Map<number, Turn>();
    const at = level ?? SHEET_LEVEL;
    return {
        left: askedIn(lesson, at).map((a) => leftOf(a, turns.get(a.question.n) ?? FRESH, null)),
        level: at,
        was: !sitting ? "paper" : level ? "screen" : "changed",
    };
}

/** The next hint, and the turn with it opened. */
export function hinted(turn: Turn, q: PackQuestion): { turn: Turn; hint: string } | null {
    const hint = q.hints[turn.hints];
    if (turn.done || hint === undefined) return null;
    return { turn: { ...turn, hints: turn.hints + 1 }, hint };
}

export const began = (
    sitting: string,
    lesson: PackLesson,
    level: Level,
    pack: string,
    part?: number,
): EventData["sitting-began"] => ({
    sitting,
    lesson: lesson.id,
    lessonHash: levelIn(lesson, level).hash,
    pack,
    mode: "screen",
    ...(part === undefined ? {} : { part }),
});

/**
 * The sitting of a book lesson to read next, from that lesson's own events: the one a sitting begun
 * and not ended is reading, else the first with no finished sitting, else the last, to read again.
 * A lesson read in one sitting has none.
 */
export function partToRead(lesson: PackLesson, events: readonly Envelope[]): number | null {
    const parts = partsOf(lesson);
    if (parts < 2) return null;
    const began = new Map(
        events.flatMap((e) =>
            e.kind === "sitting-began" && e.data.lesson === lesson.id
                ? [[e.data.sitting, e.data.part ?? 1] as const]
                : [],
        ),
    );
    const ended = new Map(
        events.flatMap((e) =>
            e.kind === "sitting-ended" && began.has(e.data.sitting)
                ? [[e.data.sitting, e.data.finished] as const]
                : [],
        ),
    );
    const open = [...began].filter(([sitting]) => !ended.has(sitting)).at(-1);
    if (open) return Math.min(parts, open[1]);
    const read = new Set(
        [...began].flatMap(([sitting, part]) => (ended.get(sitting) ? [part] : [])),
    );
    for (let part = 1; part <= parts; part++) if (!read.has(part)) return part;
    return parts;
}

/** A round of a game card, by its section, its place among that section's cards and the level it played. */
export const played = (
    sitting: string,
    lesson: PackLesson,
    level: Level,
    place: { section: number; card: number; level: number },
    round: Pick<
        EventData["played"],
        "game" | "rulesVersion" | "challenge" | "won" | "tries" | "seconds" | "assistance"
    >,
): EventData["played"] => ({
    sitting,
    lesson: lesson.id,
    lessonHash: levelIn(lesson, level).hash,
    section: String(place.section),
    card: place.card,
    game: round.game,
    level: place.level,
    rulesVersion: round.rulesVersion,
    challenge: round.challenge,
    won: round.won,
    tries: round.tries,
    seconds: round.seconds,
    assistance: round.assistance,
});

export const answered = (
    sitting: string,
    asked: Asked,
    turn: Turn,
    checked: Checked,
    timing: Timing,
): EventData["answered"] => ({
    sitting,
    q: asked.ref,
    given: checked.given,
    timing,
    right: checked.right,
    tries: turn.tries,
    rule: checked.said,
    hints: turn.hints,
});

/** A question handed in for a grown-up to read: collected, with no right or wrong until they mark it. */
export const handedIn = (
    sitting: string,
    asked: Asked,
    turn: Turn,
    timing: Timing,
): EventData["answered"] => ({
    sitting,
    q: asked.ref,
    given: { k: "unmarked" },
    timing,
    right: null,
    tries: turn.tries,
    rule: null,
    hints: turn.hints,
});

export const hintOpened = (
    sitting: string,
    asked: Asked,
    turn: Turn,
): EventData["hint-opened"] => ({ sitting, q: asked.ref, rung: turn.hints });

/** A press on the guide's card, with what it gave: the part ringed, the easier thing's name, or nothing. */
export const helpAsked = (
    sitting: string,
    asked: Asked,
    ask: Ask,
    material: string | null,
): EventData["help-asked"] => ({ sitting, q: asked.ref, ask, material });

/** The easier thing the card can offer on a question: the lesson's worked example of the same item, or the same item asked at the lesson's easy level. */
export type Easier = { kind: "worked"; question: PackQuestion } | { kind: "easy"; asked: Asked };

/**
 * The easier step for a question, for the card's Easier first: the lesson's worked example of the
 * same item when it has one, else the same item asked at the lesson's easy level when the lesson
 * declares one, else null, when the button is not shown. Both are the lesson's own authored
 * questions; an easier question from another lesson of the pack is not offered here.
 */
export function easierOf(lesson: PackLesson, level: Level, asked: Asked): Easier | null {
    const worked = askedIn(lesson, level).find(
        (a) =>
            a.how === "worked" && a.item.id === asked.item.id && a.question.n !== asked.question.n,
    );
    if (worked) return { kind: "worked", question: worked.question };
    if (level === "easy" || !lesson.levels.easy) return null;
    const easy = askedIn(lesson, "easy").find(
        (a) => a.how !== "worked" && a.item.id === asked.item.id,
    );
    return easy ? { kind: "easy", asked: easy } : null;
}

/**
 * Every string the guide's card may hand the voice for a question: its words, its hints, the say
 * lines of its rules, and the fixed lines. Nothing else is read aloud (.docs/ai.md, property 20),
 * which tools/__tests__/voice.test.ts holds over the whole corpus.
 */
export function voiceable(q: PackQuestion): string[] {
    const says = (rules: readonly PackRule[]): string[] =>
        rules.flatMap((r) => [...r.say, ...says(r.children)]);
    const help: Help[] = ["no-hint", "no-easier", "handoff", "today", "read", "pinned"];
    return [q.ask, ...q.hints, ...says(q.feedback), ...help.map((h) => LINES[h])];
}

/** A screen sitting's end: the minutes since it began on this page, at least one. */
export const ended = (
    sitting: string,
    finished: boolean,
    beganAt: number,
    now: number,
): EventData["sitting-ended"] => ({
    sitting,
    finished,
    minutes: Math.max(1, Math.round((now - beganAt) / 60_000)),
    withGrownUp: false,
});
