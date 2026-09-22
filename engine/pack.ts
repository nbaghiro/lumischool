import type { Given, Way } from "./answer";
import { exprProblem, valueProblem, type Expr, type Value } from "./expr";
import { sceneProblem, type Scene } from "./scene";

/**
 * The format's version. A reader skips the fields it does not know, so a field an older reader can do
 * without is added without raising this; it is raised only when an older reader would read a newer
 * pack wrongly.
 */
export const PACK = 1;

/** The levels a lesson may declare. Medium is the lesson as written, and every lesson has it. */
export const LEVELS = ["easy", "medium", "hard"] as const;
export type Level = (typeof LEVELS)[number];

/** One of an item's feedback rules, with what it says and where it points filled in for one variant. */
export interface PackRule {
    when: Expr;
    say: string[];
    point: string | null;
    children: PackRule[];
}

export interface PackQuestion {
    /** Its number on the page. A worked example has none, and is 0. */
    n: number;
    /** The verifier's own key, `a=2,b=3`, which `QuestionRef.variant` records. */
    variant: string;
    /** The variant's values, which a rule's condition reads with the child's answer beside them. */
    env: Record<string, Value>;
    answers: Record<string, string>;
    /** How a picked answer reads: the option's label rather than the word that names it. */
    labels: Record<string, string> | null;
    ask: string;
    hints: string[];
    feedback: PackRule[];
    scene: Scene | null;
    /** For an answer made by arranging a part: the part, what a right arrangement meets, and one that does. */
    arranged: { part: string; right: Expr; key: { piece: string; at: number }[] } | null;
    /** The answer in words, for an answer many arrangements satisfy. */
    explain: string | null;
}

export interface PackItem {
    id: string;
    /** sha256 of the item's notation text at the level it was asked at. */
    hash: string;
    title: string | null;
    skills: string[];
    /** A checker written in code, by name, with its settings as the notation wrote them. */
    check: { name: string; settings: Record<string, string> } | null;
}

export type PackBlock =
    | { k: "say"; text: string }
    | { k: "grown-ups"; text: string }
    | { k: "scene"; scene: Scene }
    | {
          k: "ask";
          how: "practice" | "show" | "worked";
          item: PackItem;
          questions: PackQuestion[];
          /** More draws of a practice block for another day, each as many questions as the block. */
          again: PackQuestion[][];
      };

export interface PackSection {
    type: string;
    stars: number | null;
    blocks: PackBlock[];
}

/** A lesson at one of its levels, whole. */
export interface PackLevel {
    /** sha256 of the level's notation text, which `QuestionRef.lessonHash` records. */
    hash: string;
    grownUps: string[];
    sections: PackSection[];
}

export interface PackLesson {
    pack: typeof PACK;
    id: string;
    /** The notation file it was compiled from, under content/curriculum/, whose name orders a unit's lessons. */
    source: string;
    title: string;
    goal: string | null;
    grade: number;
    unit: number | null;
    subject: string;
    format: string;
    /** The drawings its scenes place at any level, by the notation's name for them. */
    art: string[];
    /** Every level the lesson declares. One that declares none has only medium, the lesson as written. */
    levels: { easy?: PackLevel; medium: PackLevel; hard?: PackLevel };
}

export interface LevelFacts {
    /** The first ten characters of the level's sha256: enough to tell a sitting's level, and small in the index. */
    hash: string;
}

/**
 * A question of a sheet as the sitting left it: what was asked, how it is answered, and what the
 * child gave. `leftIn` in school/lessons.ts folds a lesson's events into these, and `sheetState`
 * in engine/ui/lesson.tsx draws a sheet from them, so a page can draw a finished sheet without
 * knowing how a lesson is read, and the school layer says nothing about drawing. A page that lets a
 * child answer keeps its own turn and hands the same shape over as the answers change.
 */
export interface Left {
    n: number;
    item: PackItem;
    question: PackQuestion;
    way: Way;
    /** Right, shown after the last try, or handed in for a grown-up: nothing more is asked of it. */
    done: boolean;
    right: boolean;
    /** What was given last, which a sheet shows as the child left it; null for a question never answered. */
    given: Given | null;
    /** The hints opened on it, in order. */
    opened: string[];
    /** What was written, by the answer's name. */
    written: Record<string, string>;
    /** A picked answer's options, by the answer's name, in the order they are offered. */
    options: Record<string, { label: string; value: string }[]>;
    /** Whether another hint may be opened on it, which is false wherever nobody is answering. */
    mayHint: boolean;
    /** What it says once it has been handed in for a grown-up to read. */
    handedSays: string;
    /** Handed to the grown-up from the guide's card, which the sheet shows as a pin. */
    pinned: boolean;
}

/**
 * What the year, the worlds and the grown-ups' pages read about a lesson without opening its file.
 * The index is read whole by every view, so it holds only what those readers need: a level's
 * sections and a lesson's items are in the lesson's file (the index would be over its budget with
 * them). */
export interface LessonFacts extends Pick<
    PackLesson,
    "id" | "source" | "title" | "goal" | "grade" | "unit" | "subject" | "format" | "art"
> {
    /** The lesson's file, a path under the pack. */
    file: string;
    levels: { easy?: LevelFacts; medium: LevelFacts; hard?: LevelFacts };
    /**
     * The file of the lesson's first drawing, `scenes/<id>-<hash>.json`, for a page that shows the
     * lesson as a sticker without opening its file (the calendar's month); null for a lesson with no
     * drawing.
     */
    first: string | null;
    /** Across every level. */
    skills: string[];
}

export interface PackIndex {
    pack: typeof PACK;
    lessons: LessonFacts[];
}

/** A lesson's first drawing as its own file: the scene laid out as the sheet draws it (engine/scene.ts). */
export interface PackScene {
    pack: typeof PACK;
    lesson: string;
    scene: Scene;
}

const SECTIONS: Record<string, string> = {
    look: "Look",
    do: "Do",
    story: "Story",
    try: "Try this",
    remember: "Remember",
    example: "Worked example",
    exercises: "Practice",
    puzzle: "Puzzle",
    "warm-up": "Warm-up",
};

const starsOf = (n: number): string => "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

/** A section's heading on the sheet: its name, a puzzle's number, and its stars where it has them. */
export const sectionLabel = (type: string, puzzle: number, stars: number | null): string =>
    (type === "puzzle" ? `Puzzle ${puzzle}` : (SECTIONS[type] ?? type)) +
    (stars ? ` ${starsOf(stars)}` : "");

/** What a child makes for a grown-up to look at, rather than an answer the machine marks. */
export type Piece = "writing" | "painting";

/**
 * The checkers that are a grown-up looking at what the child made (.docs/writing.md, "How writing is
 * marked"; .docs/art.md, "A grown-up's view"), and what each has the child make.
 */
const BY_EYE: Readonly<Record<string, Piece>> = {
    "writing.by-eye": "writing",
    "art.by-eye": "painting",
};

/** The piece an item asks a child to make for a grown-up, or null for one the machine marks. */
export const pieceOf = (item: Pick<PackItem, "check">): Piece | null =>
    (item.check && BY_EYE[item.check.name]) ?? null;

/** The strip above a lesson's title: its subject unless it is maths, its grade and its unit. */
export const tagOf = (lesson: Pick<PackLesson, "subject" | "grade" | "unit">): string =>
    [
        lesson.subject !== "maths"
            ? lesson.subject.charAt(0).toUpperCase() + lesson.subject.slice(1)
            : null,
        `Grade ${lesson.grade}`,
        lesson.unit === null ? null : `Unit ${lesson.unit}`,
    ]
        .filter((part): part is string => part !== null)
        .join(" · ");

/** A piece of a line of a block's text as a sheet sets it. */
export interface Run {
    text: string;
    strong: boolean;
    em: boolean;
}

/**
 * A block's text as paragraphs of runs: the small Markdown a lesson's `say` block is written in, with
 * a blank line between paragraphs, **strong** and *emphasis*.
 */
export function paragraphs(text: string): Run[][] {
    return text
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean)
        .map((p) =>
            p
                .split(/(\*\*.+?\*\*|\*.+?\*)/)
                .filter(Boolean)
                .map((piece) =>
                    piece.startsWith("**") && piece.endsWith("**") && piece.length > 4
                        ? { text: piece.slice(2, -2), strong: true, em: false }
                        : piece.startsWith("*") && piece.endsWith("*") && piece.length > 2
                          ? { text: piece.slice(1, -1), strong: false, em: true }
                          : { text: piece, strong: false, em: false },
                ),
        );
}

const asksOf = (level: PackLevel) =>
    level.sections.flatMap((s) => s.blocks.flatMap((b) => (b.k === "ask" ? [b] : [])));

const levelFacts = (level: PackLevel): LevelFacts => ({ hash: level.hash.slice(0, 10) });

/** The lesson's first drawing as the sheet meets it: the first scene block of the medium level, or else its first question's scene. */
export function firstSceneOf(lesson: PackLesson): Scene | null {
    for (const section of lesson.levels.medium.sections)
        for (const block of section.blocks) {
            if (block.k === "scene") return block.scene;
            if (block.k === "ask") {
                const scene = block.questions.find((q) => q.scene)?.scene;
                if (scene) return scene;
            }
        }
    return null;
}

/** A lesson's facts for the index, with the file its first drawing was written to, if it has one. */
export function factsOf(lesson: PackLesson, file: string, first: string | null): LessonFacts {
    const { easy, medium, hard } = lesson.levels;
    const asks = [easy, medium, hard].flatMap((level) => (level ? asksOf(level) : []));
    return {
        id: lesson.id,
        source: lesson.source,
        title: lesson.title,
        goal: lesson.goal,
        grade: lesson.grade,
        unit: lesson.unit,
        subject: lesson.subject,
        format: lesson.format,
        art: lesson.art,
        file,
        levels: {
            ...(easy ? { easy: levelFacts(easy) } : {}),
            medium: levelFacts(medium),
            ...(hard ? { hard: levelFacts(hard) } : {}),
        },
        first,
        skills: [...new Set(asks.flatMap((a) => a.item.skills))],
    };
}

type Fields = Record<string, unknown>;

const isPlain = (v: unknown): v is Fields =>
    typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string";
const isWhole = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v);
const areTexts = (v: unknown): boolean => Array.isArray(v) && v.every(isText);
const isTextOrNull = (v: unknown): boolean => v === null || isText(v);
const isWholeOrNull = (v: unknown): boolean => v === null || isWhole(v);
const areNamedTexts = (v: unknown): boolean => isPlain(v) && Object.values(v).every(isText);

function eachProblem(list: unknown, label: string, problem: (v: unknown) => string | null) {
    if (!Array.isArray(list)) return `${label} must be a list`;
    for (const [i, item] of list.entries()) {
        const found = problem(item);
        if (found !== null) return `${label}[${i}]: ${found}`;
    }
    return null;
}

const within = (label: string, problem: string | null): string | null =>
    problem === null ? null : `${label}: ${problem}`;

function ruleProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a rule must be an object";
    if (!(areTexts(v.say) && isTextOrNull(v.point)))
        return "a rule holds what it says and the part it points at, which may be null";
    return within("when", exprProblem(v.when)) ?? eachProblem(v.children, "children", ruleProblem);
}

const placedProblem = (v: unknown): string | null =>
    isPlain(v) && isText(v.piece) && typeof v.at === "number" && Number.isFinite(v.at)
        ? null
        : "a placed piece holds the piece and where along the part it is";

function arrangedProblem(v: unknown): string | null {
    if (v === null) return null;
    if (!isPlain(v) || !isText(v.part)) return "an arrangement names its part";
    return within("right", exprProblem(v.right)) ?? eachProblem(v.key, "key", placedProblem);
}

function questionProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a question must be an object";
    const shaped =
        isWhole(v.n) &&
        v.n >= 0 &&
        isText(v.variant) &&
        isText(v.ask) &&
        areTexts(v.hints) &&
        areNamedTexts(v.answers) &&
        (v.labels === null || areNamedTexts(v.labels)) &&
        isTextOrNull(v.explain);
    if (!shaped)
        return "a question holds its number, variant, ask, hints, answers, labels and explanation";
    if (!isPlain(v.env)) return "env must be an object";
    for (const [name, value] of Object.entries(v.env)) {
        const found = valueProblem(value);
        if (found !== null) return `env.${name}: ${found}`;
    }
    return (
        eachProblem(v.feedback, "feedback", ruleProblem) ??
        (v.scene === null ? null : within("scene", sceneProblem(v.scene))) ??
        within("arranged", arrangedProblem(v.arranged))
    );
}

function itemProblem(v: unknown): string | null {
    if (!isPlain(v)) return "an item must be an object";
    const check = v.check;
    const checked =
        check === null || (isPlain(check) && isText(check.name) && areNamedTexts(check.settings));
    return isText(v.id) && isText(v.hash) && isTextOrNull(v.title) && areTexts(v.skills) && checked
        ? null
        : "an item holds its id, hash, title, skills and checker";
}

const BLOCK: Record<PackBlock["k"], (v: Fields) => string | null> = {
    say: (v) => (isText(v.text) ? null : "a say block holds its text"),
    "grown-ups": (v) => (isText(v.text) ? null : "a grown-ups block holds its text"),
    scene: (v) => within("scene", sceneProblem(v.scene)),
    ask: (v) => {
        if (!(v.how === "practice" || v.how === "show" || v.how === "worked"))
            return `"${String(v.how)}" is not a way of asking`;
        return (
            within("item", itemProblem(v.item)) ??
            eachProblem(v.questions, "questions", questionProblem) ??
            eachProblem(v.again, "again", (draw) => eachProblem(draw, "draw", questionProblem))
        );
    },
};

const isBlockKind = (k: unknown): k is PackBlock["k"] => isText(k) && Object.hasOwn(BLOCK, k);

function blockProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a block must be an object";
    return isBlockKind(v.k) ? BLOCK[v.k](v) : `"${String(v.k)}" is not a kind of block`;
}

function sectionProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a section must be an object";
    if (!(isText(v.type) && isWholeOrNull(v.stars))) return "a section holds its type and stars";
    return eachProblem(v.blocks, "blocks", blockProblem);
}

function levelProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a level must be an object";
    if (!(isText(v.hash) && areTexts(v.grownUps)))
        return "a level holds its hash and grown-ups lines";
    return eachProblem(v.sections, "sections", sectionProblem);
}

/** Medium is required and easy and hard are checked when they are there; any other key is skipped. */
function levelsProblem(v: unknown, problem: (level: unknown) => string | null): string | null {
    if (!isPlain(v)) return "levels must be an object";
    if (v.medium === undefined) return "levels.medium is missing";
    for (const level of LEVELS) {
        if (v[level] === undefined) continue;
        const found = problem(v[level]);
        if (found !== null) return `levels.${level}: ${found}`;
    }
    return null;
}

const LESSON_FIELDS =
    "a lesson holds its id, source, title, goal, grade, unit, subject, format and drawings";

const isLessonShaped = (v: Fields): boolean =>
    isText(v.id) &&
    isText(v.source) &&
    isText(v.title) &&
    isTextOrNull(v.goal) &&
    isWhole(v.grade) &&
    isWholeOrNull(v.unit) &&
    isText(v.subject) &&
    isText(v.format) &&
    areTexts(v.art);

function lessonProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a lesson must be an object";
    if (v.pack !== PACK) return `a lesson of pack format ${String(v.pack)} is not format ${PACK}`;
    if (!isLessonShaped(v)) return LESSON_FIELDS;
    return levelsProblem(v.levels, levelProblem);
}

const levelFactsProblem = (v: unknown): string | null =>
    isPlain(v) && isText(v.hash) ? null : "a level's facts hold its hash";

function factsProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a lesson's facts must be an object";
    if (!(isLessonShaped(v) && isText(v.file) && isTextOrNull(v.first) && areTexts(v.skills)))
        return `${LESSON_FIELDS}, and its file, its first drawing's file or null, and skills`;
    return levelsProblem(v.levels, levelFactsProblem);
}

function sceneFileProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a scene's file must be an object";
    if (v.pack !== PACK) return `a scene of pack format ${String(v.pack)} is not format ${PACK}`;
    if (!isText(v.lesson)) return "a scene's file names its lesson";
    return within("scene", sceneProblem(v.scene));
}

const isSceneFile = (v: unknown): v is PackScene => sceneFileProblem(v) === null;

/** A lesson's first drawing as fetched, read into its scene or the reason it is not one. */
export function readScene(
    v: unknown,
): { ok: true; first: PackScene } | { ok: false; problem: string } {
    if (isSceneFile(v)) return { ok: true, first: v };
    return { ok: false, problem: sceneFileProblem(v) ?? "not a scene" };
}

function indexProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a pack's index must be an object";
    if (v.pack !== PACK) return `an index of pack format ${String(v.pack)} is not format ${PACK}`;
    return eachProblem(v.lessons, "lessons", factsProblem);
}

const isLesson = (v: unknown): v is PackLesson => lessonProblem(v) === null;
const isIndex = (v: unknown): v is PackIndex => indexProblem(v) === null;

/** A lesson's file as fetched, read into a lesson or the reason it is not one. */
export function readLesson(
    v: unknown,
): { ok: true; lesson: PackLesson } | { ok: false; problem: string } {
    if (isLesson(v)) return { ok: true, lesson: v };
    return { ok: false, problem: lessonProblem(v) ?? "not a lesson" };
}

/** A pack's index as fetched, read into an index or the reason it is not one. */
export function readIndex(
    v: unknown,
): { ok: true; index: PackIndex } | { ok: false; problem: string } {
    if (isIndex(v)) return { ok: true, index: v };
    return { ok: false, problem: indexProblem(v) ?? "not an index" };
}
