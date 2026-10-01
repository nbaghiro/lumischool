import { LANGUAGES, NATIONS, type Given, type Language, type Nation, type Way } from "./answer";
import { exprProblem, valueProblem, type Expr, type Value } from "./expr";
import { gradeName } from "./grade";
import { PAGE_SIZES, PRINT_MARGIN_MM, SQUARE_MM } from "./paper";
import { sceneProblem, type Scene } from "./scene";

/**
 * The format's version. A reader skips the fields it does not know, so a field an older reader can do
 * without is added without raising this; it is raised only when an older reader would read a newer
 * pack wrongly.
 */
export const PACK = 2;

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
    /**
     * The answer in words, for an answer many arrangements satisfy, or where the answer alone would
     * not say enough, as a book's line number does not to a family reading another edition.
     */
    explain: string | null;
    /**
     * For a language lesson's word boxes, by the answer's name: what else the box takes, which is the
     * phrase's other spellings and, where the box forgives them, the spelling without its accents.
     */
    also?: Record<string, string[]>;
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
    /** A book's sitting: the chapters of the book it reads, in order. */
    chapters?: number[];
}

/** A lesson at one of its levels, whole. */
export interface PackLevel {
    /** sha256 of the level's notation text, which `QuestionRef.lessonHash` records. */
    hash: string;
    grownUps: string[];
    sections: PackSection[];
}

export interface PackLesson {
    /** Reviewed teaching bundle; optional so older packs remain readable. */
    teaching?: { schema: 1; material: string; version: string; hash: string };
    pack: typeof PACK;
    id: string;
    /** The notation file it was compiled from, under content/curriculum/, whose name orders a unit's lessons. */
    source: string;
    title: string;
    goal: string | null;
    grade: number;
    unit: number | null;
    subject: string;
    /** A variant's tag: shown only to a child learning this language, or a family that chose this nation. */
    language?: Language;
    nation?: Nation;
    format: string;
    /** The drawings its scenes place at any level, by the notation's name for them. */
    art: string[];
    /** Every level the lesson declares. One that declares none has only medium, the lesson as written. */
    levels: { easy?: PackLevel; medium: PackLevel; hard?: PackLevel };
    /** The book a book lesson reads, whose text is a file of its own (`PackBook`). */
    book?: BookFacts;
}

/** A chapter's lines numbered from 1 in the order they are read, which is how a question cites one. */
export const linesOf = (paragraphs: readonly (readonly string[])[]): string[] => paragraphs.flat();

const spaced = (s: string): string => s.replace(/\s+/g, " ").trim();

/** The numbers of a chapter's lines that hold these words exactly, whatever the spacing in them. */
export const linesHolding = (paragraphs: readonly (readonly string[])[], words: string): number[] =>
    linesOf(paragraphs).flatMap((line, i) =>
        spaced(words) && spaced(line).includes(spaced(words)) ? [i + 1] : [],
    );

/** One page of a book as a sitting shows it: a run of one chapter's lines, each with its number. */
interface BookPage {
    chapter: number;
    title: string;
    /** The page a chapter starts on, which carries its heading. */
    opens: boolean;
    /** Each line with its number in the chapter, and whether it starts a paragraph. */
    lines: { n: number; text: string; starts: boolean }[];
}

/**
 * The chapters a sitting reads, as pages of at most `each` lines. A chapter starts a page, and a page
 * never holds two chapters, so a line's number on the page is its number in the chapter.
 */
export function bookPages(
    book: Pick<PackBook, "chapters">,
    chapters: readonly number[],
    each: number,
): BookPage[] {
    const out: BookPage[] = [];
    for (const n of chapters) {
        const c = book.chapters.find((x) => x.n === n);
        if (!c) continue;
        const lines = c.paragraphs.flatMap((p) => p.map((text, i) => ({ text, starts: i === 0 })));
        for (let at = 0; at < lines.length; at += Math.max(1, each))
            out.push({
                chapter: n,
                title: c.title,
                opens: at === 0,
                lines: lines
                    .slice(at, at + Math.max(1, each))
                    .map((l, i) => ({ ...l, n: at + i + 1 })),
            });
    }
    return out;
}

/** What a book lesson says of its book, and the file its text is in, `books/<id>-<hash>.json`. */
export interface BookFacts {
    id: string;
    title: string;
    author: string;
    /** The year it was first published. */
    published: number;
    file: string;
}

/**
 * A whole public-domain book as its own file of the pack, read when a child opens a sitting and never
 * with the index. A chapter is paragraphs of lines, and its lines are numbered from 1 through the
 * chapter, which is how a question cites it.
 */
export interface PackBook {
    pack: typeof PACK;
    id: string;
    title: string;
    author: string;
    published: number;
    /** The year its author died. */
    died: number;
    /** The printed edition the text was taken from. */
    edition: string;
    /** Why it is in the public domain. */
    basis: string;
    chapters: { n: number; title: string; paragraphs: string[][] }[];
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
    | "id"
    | "source"
    | "title"
    | "goal"
    | "grade"
    | "unit"
    | "subject"
    | "language"
    | "nation"
    | "format"
    | "art"
> {
    /** The lesson's file, a path under the pack. */
    file: string;
    /** The levels it declares, easiest first. A level's hash is in the file, which is where it is read. */
    levels: Level[];
    /**
     * The file of the lesson's first drawing, `scenes/<id>-<hash>.json`, for a page that shows the
     * lesson as a sticker without opening its file (the calendar's month); null for a lesson with no
     * drawing.
     */
    first: string | null;
    /** Across every level. */
    skills: string[];
    /** A book lesson's sittings, each a day of the plan; absent for a lesson of one sitting. */
    parts?: number;
    /** A book lesson's text, `books/<id>-<hash>.json`, which the pack serves beside the lesson. */
    book?: string;
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
    sitting: "Sitting",
};

/** The sections a lesson numbers as it goes: its puzzles, and a book's sittings. */
export const NUMBERED: ReadonlySet<string> = new Set(["puzzle", "sitting"]);

const starsOf = (n: number): string => "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

/** A section's heading on the sheet: its name, its number if it is numbered, and its stars where it has them. */
export const sectionLabel = (type: string, nth: number, stars: number | null): string =>
    (NUMBERED.has(type) ? `${SECTIONS[type] ?? type} ${nth}` : (SECTIONS[type] ?? type)) +
    (stars ? ` ${starsOf(stars)}` : "");

/** A book's sitting as its heading says what it reads: "Chapters 3 and 4". */
export function chaptersLabel(chapters: readonly number[]): string {
    const last = chapters.at(-1);
    if (last === undefined) return "";
    if (chapters.length === 1) return `Chapter ${last}`;
    return `Chapters ${chapters.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * What a child makes for a grown-up to look at or listen to, rather than an answer the machine marks:
 * writing, a painting, something said by heart, something sung, or a thing made away from the sheet.
 */
export type Piece = "writing" | "painting" | "spoken" | "sung" | "made";

/**
 * The checkers that are a grown-up looking at or listening to what the child made, and what each has
 * the child make (.docs/writing.md, "The notice list"). Each prints a `look-for` sentence and may give
 * a `notice` list, the points a grown-up ticks, which a `responded` event records.
 */
export const BY_EYE: Readonly<Record<string, Piece>> = {
    "writing.by-eye": "writing",
    "art.by-eye": "painting",
    "art.made": "made",
    "reading.recited": "spoken",
    "music.sung": "sung",
};

/** The piece an item asks a child to make for a grown-up, or null for one the machine marks. */
export const pieceOf = (item: Pick<PackItem, "check">): Piece | null =>
    (item.check && BY_EYE[item.check.name]) ?? null;

/**
 * The points a grown-up ticks for a piece, as the item's `notice` list writes them (`["...", "..."]`),
 * or none for an item the machine marks or a piece whose checker gives no list.
 */
export function noticeOf(item: Pick<PackItem, "check">): string[] {
    const written = pieceOf(item) ? item.check?.settings.notice : undefined;
    if (written === undefined) return [];
    let read: unknown = null;
    try {
        read = JSON.parse(written);
    } catch {
        return [];
    }
    return Array.isArray(read) ? read.filter((p): p is string => typeof p === "string") : [];
}

/** The checker of a dictation, whose typed answer is marked word by word (`markWords`). */
export const DICTATION = "writing.dictation";

/** One word of a dictation's sentence and what the child wrote for it: null for a word left out. */
interface WordMark {
    word: string;
    wrote: string | null;
    right: boolean;
}

/** A word as a dictation compares it: its letters in any case, without the marks round it. */
const bare = (w: string): string =>
    w
        .replace(/[‘’]/g, "'")
        .toLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

const wordsIn = (s: string): string[] => s.split(/\s+/).filter((w) => bare(w) !== "");

/**
 * A typed dictation against its sentence, word by word. The two are lined up by the fewest words
 * changed, left out or put in, so a word missed marks only itself rather than every word after it.
 * Spelling is marked, and case and punctuation are not.
 */
export function markWords(
    sentence: string,
    typed: string,
): { right: boolean; words: WordMark[]; extra: string[] } {
    const want = wordsIn(sentence);
    const got = wordsIn(typed);
    const cost: number[][] = want.map(() => []);
    const at = (i: number, j: number): number =>
        i < 0 ? j + 1 : j < 0 ? i + 1 : (cost[i]?.[j] ?? 0);
    want.forEach((w, i) => {
        const row = cost[i] ?? [];
        got.forEach((g, j) => {
            const same = bare(w) === bare(g) ? 0 : 1;
            row[j] = Math.min(at(i - 1, j - 1) + same, at(i - 1, j) + 1, at(i, j - 1) + 1);
        });
    });
    const words: WordMark[] = [];
    const extra: string[] = [];
    let i = want.length - 1;
    let j = got.length - 1;
    while (i >= 0 || j >= 0) {
        const w = want[i];
        const g = got[j];
        if (w !== undefined && g !== undefined) {
            const same = bare(w) === bare(g);
            if (at(i, j) === at(i - 1, j - 1) + (same ? 0 : 1)) {
                words.unshift({ word: w, wrote: g, right: same });
                i--;
                j--;
                continue;
            }
        }
        if (w !== undefined && (g === undefined || at(i, j) === at(i - 1, j) + 1)) {
            words.unshift({ word: w, wrote: null, right: false });
            i--;
            continue;
        }
        if (g !== undefined) extra.unshift(g);
        j--;
    }
    return { right: words.every((w) => w.right) && !extra.length, words, extra };
}

/** The strip above a lesson's title: its subject unless it is maths, its grade and its unit. */
export const tagOf = (lesson: Pick<PackLesson, "subject" | "grade" | "unit">): string =>
    [
        lesson.subject !== "maths"
            ? lesson.subject.charAt(0).toUpperCase() + lesson.subject.slice(1)
            : null,
        gradeName(lesson.grade),
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

/** The most pages a child's copy of one sitting prints on (.docs/audit.md, "Printed length"). */
export const MOST_PAGES = 5;

/**
 * A page inside `@page lesson`'s margins on A4 is 55 rows (engine/ui/lesson.css), but Chrome rounds
 * a drawing's height to its own units and a piece that should end on the last row goes over as often
 * as not, so a piece is counted as fitting only short of it.
 */
const PAGE_ROWS = 54.9;
/** A4 across inside the printer's margins, in squares. */
const PAGE_COLS = (PAGE_SIZES.A4.w - 2 * PRINT_MARGIN_MM) / SQUARE_MM;
/** The tallest a drawing prints, in rows: the print block's `max-height: 14cm`. */
const TALLEST = 28;
/** Characters to a printed line of TEXT_COLS squares, from grade three and below it. */
const LINE_CHARS = { small: 94, big: 67 };
/** The space an answer needs beside a drawing before it stands there rather than under it. */
const BESIDE = 8;

/** A piece of a printed sheet: it goes onto a page whole, or line by line when it is text. */
interface Printed {
    rows: number;
    /** The rows above it, which a piece that starts a page leaves behind. */
    gap: number;
    /** Rows to a line, for text that may run on to the next page; 0 for a piece that never splits. */
    line: number;
    /** A heading, which stays on the page of what follows it. */
    heading: boolean;
}

function textRows(text: string, big: boolean): number {
    const chars = big ? LINE_CHARS.big : LINE_CHARS.small;
    const lines = paragraphs(text).map((runs) => {
        let n = 0;
        let at = 0;
        for (const word of runs
            .map((r) => r.text)
            .join("")
            .split(/\s+/)) {
            if (!word) continue;
            if (at > 0 && at + 1 + word.length > chars) {
                n++;
                at = word.length;
            } else at += (at > 0 ? 1 : 0) + word.length;
        }
        return n + 1;
    });
    // a paragraph after another starts a row down
    return lines.reduce((a, b) => a + b, 0) * (big ? 2 : 1) + Math.max(0, lines.length - 1);
}

/** A drawing's printed size in squares: at its own size, narrowed to the page, its height held to TALLEST while its tile keeps the width, as Chrome lays a capped drawing out. */
function drawn(scene: Scene, across: number): { cols: number; rows: number } {
    const [w, h] = scene.size;
    const narrow = Math.min(1, across / w);
    const short = Math.min(1, TALLEST / (h * narrow));
    return { cols: w * narrow, rows: Math.ceil(h * narrow * short) };
}

/** A question as it prints on the child's copy: its number, then its drawing, or its words without one. */
function questionBox(
    q: PackQuestion,
    worked: boolean,
    big: boolean,
): { cols: number; rows: number } {
    const answer = worked ? `Answer ${Object.values(q.answers).join(", ")}` : "";
    if (!q.scene) {
        const rows = textRows(q.ask, big) + (answer ? textRows(answer, false) : 0);
        return { cols: PAGE_COLS, rows };
    }
    const picture = drawn(q.scene, PAGE_COLS - 1);
    if (!answer) return { cols: 1 + picture.cols, rows: picture.rows };
    const free = PAGE_COLS - 1 - picture.cols - 1;
    return free >= BESIDE
        ? { cols: PAGE_COLS, rows: Math.max(picture.rows, textRows(answer, false)) }
        : { cols: PAGE_COLS, rows: picture.rows + textRows(answer, false) };
}

/** What a printed sheet or sitting starts with: a sheet's strip, tag, title and goal, or a sitting's tag and title. */
type Opening = "sheet" | "sitting";

/**
 * A level's sheet as it prints, one piece after another, down to the rows each piece takes. It is the
 * print block of engine/ui/lesson.css read as arithmetic: the opening, then each section as its
 * two-row heading, its blocks a row apart and a row under it, with the questions of one block side by
 * side where they fit across.
 */
function printedPieces(
    lesson: Pick<PackLesson, "grade" | "goal">,
    sections: readonly PackSection[],
    opening: Opening,
): Printed[] {
    const big = lesson.grade <= 2;
    const piece = (rows: number, gap: number, line = 0, heading = false): Printed => ({
        rows,
        gap,
        line,
        heading,
    });
    // the tag's line, the title's two rows and a row under them, and the strip and goal on a sheet
    const tagAndTitle = 1.35 + 2 + 1;
    const goal = lesson.goal ? textRows(lesson.goal, big) : 0;
    const out = [piece(opening === "sheet" ? 2 + tagAndTitle + goal : tagAndTitle, 0)];
    for (const section of sections) {
        out.push(piece(2, 0, 0, true));
        section.blocks.forEach((block, i) => {
            const gap = i === 0 ? 0 : 1;
            if (block.k === "say") out.push(piece(textRows(block.text, big), gap, big ? 2 : 1));
            else if (block.k === "scene") out.push(piece(drawn(block.scene, PAGE_COLS).rows, gap));
            else if (block.k === "ask") {
                const rows: { cols: number; rows: number }[] = [];
                for (const q of block.questions) {
                    const box = questionBox(q, block.how === "worked" || q.n === 0, big);
                    const last = rows.at(-1);
                    if (last && last.cols + 2 + box.cols < PAGE_COLS) {
                        last.cols += 2 + box.cols;
                        last.rows = Math.max(last.rows, box.rows);
                    } else rows.push({ ...box });
                }
                rows.forEach((r, j) => out.push(piece(r.rows, j === 0 ? gap : 1)));
            }
        });
        out.push(piece(0, 1));
    }
    return out;
}

/** The pages the pieces fill, and the rows used on the last: a piece that does not fit what is left starts the next page, text line by line. */
function filled(pieces: readonly Printed[]): { pages: number; used: number } {
    let pages = 1;
    let used = 0;
    pieces.forEach((p, i) => {
        const next = pieces[i + 1];
        const keep = p.heading && next ? next.gap + (next.line || next.rows) : 0;
        if (used + p.gap + p.rows + keep <= PAGE_ROWS) {
            used += p.gap + p.rows;
            return;
        }
        // a section's last row, or a gap, is left at the foot of a page rather than starting one
        if (p.rows === 0) return;
        if (p.line && used + p.gap + p.line <= PAGE_ROWS) {
            const lines = Math.floor((PAGE_ROWS - used - p.gap) / p.line);
            pages++;
            used = p.rows - lines * p.line;
            return;
        }
        if (used > 0) pages++;
        used = p.rows;
    });
    return { pages, used };
}

/** The pages a level's child copy prints on at A4, estimated from its layout. */
export function printedPages(
    lesson: Pick<PackLesson, "grade" | "goal">,
    sections: readonly PackSection[],
    opening: Opening = "sheet",
): number {
    return filled(printedPieces(lesson, sections, opening)).pages;
}

/**
 * A run of one section that a sitting prints: its steps from `from` up to but not including `to`,
 * where a step is a block, or one question of a block that asks several.
 */
export interface Slice {
    section: number;
    from: number;
    to: number;
}

const stepsIn = (b: PackBlock): number => (b.k === "ask" ? Math.max(1, b.questions.length) : 1);

export const stepsOf = (section: PackSection): number =>
    section.blocks.reduce((n, b) => n + stepsIn(b), 0);

/** The blocks a slice of a section prints, a block that asks several questions cut to those inside it. */
export function blocksOf(section: PackSection, from: number, to: number): PackBlock[] {
    const out: PackBlock[] = [];
    let at = 0;
    for (const b of section.blocks) {
        const n = stepsIn(b);
        const lo = Math.max(from, at) - at;
        const hi = Math.min(to, at + n) - at;
        if (lo < hi)
            out.push(
                b.k === "ask" && hi - lo < n ? { ...b, questions: b.questions.slice(lo, hi) } : b,
            );
        at += n;
    }
    return out;
}

/**
 * Whether a sitting may end after each step of a section. Inside a section only a question ends one,
 * so a drawing or words stay with the question they lead into, and a note for grown-ups goes with
 * what it follows; at a section's end anything but a worked example does, which stays with the
 * question after it.
 */
function endsOf(section: PackSection): boolean[] {
    const out: boolean[] = [];
    let ends = false;
    for (const b of section.blocks) {
        if (b.k === "ask")
            for (let q = 0; q < stepsIn(b); q++) {
                ends = b.how !== "worked" && (b.questions[q]?.n ?? 0) !== 0;
                out.push(ends);
            }
        else {
            if (b.k !== "grown-ups") ends = false;
            out.push(ends);
        }
    }
    const led = section.blocks.findLast((b) => b.k !== "grown-ups");
    if (led && led.k !== "ask") out[out.length - 1] = true;
    return out;
}

/**
 * How a level prints: one sitting of every section in order, or, when that would run past MOST_PAGES,
 * as few sittings as keep each to MOST_PAGES, each starting a page. A sitting ends at a section's
 * end or after a question inside one, and never between a worked example and the question after it. Of the ways to split into that many, the one whose
 * longest sitting is shortest is taken, then the one with the fewest cuts inside a section, then the
 * one with the tries in sittings of their own and a lesson's Remember closing the sitting before them,
 * then the one whose sittings are most even. A book prints one sitting for each of its `sitting` sections,
 * since each is a day of its own.
 */
export function sittingsOf(
    lesson: Pick<PackLesson, "grade" | "goal">,
    level: PackLevel,
): readonly Slice[][] {
    const sections = level.sections;
    const all = sections.map((_, i) => i);
    const whole = (i: number): Slice => ({
        section: i,
        from: 0,
        to: stepsOf(sections[i] ?? { type: "", stars: null, blocks: [] }),
    });
    if (sections.some((s) => s.type === "sitting")) return all.map((i) => [whole(i)]);
    if (printedPages(lesson, sections) <= MOST_PAGES) return [all.map(whole)];
    const ofType = (type: string): number[] => all.filter((i) => sections[i]?.type === type);
    let tries = ofType("try");
    if (!tries.length && ofType("puzzle").length < all.length) tries = ofType("puzzle");
    const orders: { order: number[]; cut: number | null }[] = [];
    if (tries.length && tries.length < all.length) {
        const rest = all.filter((i) => !tries.includes(i));
        orders.push({ order: [...rest, ...tries], cut: rest.length });
    }
    orders.push({ order: all, cut: null });
    let best: { key: number[]; sittings: Slice[][] } | null = null;
    for (const [o, { order, cut }] of orders.entries()) {
        const split = splitOf(lesson, sections, order, cut);
        if (!split) continue;
        const key = [split.count, split.most, split.inner, o, split.spread];
        if (!best || lessThan(key, best.key)) best = { key, sittings: split.sittings };
    }
    return best?.sittings ?? [all.map(whole)];
}

/**
 * The best split of the sections in `order` into sittings, cutting only where a sitting may end, and
 * at the section at `cut` in the order when it is given; null when that cut cannot be made.
 */
function splitOf(
    lesson: Pick<PackLesson, "grade" | "goal">,
    sections: readonly PackSection[],
    order: readonly number[],
    cut: number | null,
): { sittings: Slice[][]; count: number; inner: number; most: number; spread: number } | null {
    // the runs between the places a sitting may end, and whether each ends where a section does
    const atoms: { slices: Slice[]; sectionEnd: boolean }[] = [];
    let open: Slice[] = [];
    let forced = 0;
    for (const [k, i] of order.entries()) {
        const section = sections[i];
        if (!section) continue;
        if (k === cut) {
            if (open.length) return null;
            forced = atoms.length;
        }
        const ends = endsOf(section);
        let from = 0;
        for (const [step, end] of ends.entries()) {
            if (!end || (k === order.length - 1 && step === ends.length - 1)) continue;
            open.push({ section: i, from, to: step + 1 });
            atoms.push({ slices: open, sectionEnd: step === ends.length - 1 });
            open = [];
            from = step + 1;
        }
        if (from < ends.length || !ends.length) open.push({ section: i, from, to: ends.length });
    }
    if (open.length) atoms.push({ slices: open, sectionEnd: true });
    const n = atoms.length;
    if (n < 2 || (cut !== null && forced === 0)) return null;
    const merged = (i: number, j: number): Slice[] => {
        const out: Slice[] = [];
        for (const s of atoms.slice(i, j).flatMap((a) => a.slices)) {
            const last = out.at(-1);
            if (last && last.section === s.section && last.to === s.from) last.to = s.to;
            else out.push({ ...s });
        }
        return out;
    };
    const measured = new Map<string, { pages: number; fill: number }>();
    const measure = (i: number, j: number): { pages: number; fill: number } => {
        const key = `${i}:${j}`;
        const known = measured.get(key);
        if (known) return known;
        const printed = merged(i, j).map((s) => {
            const section = sections[s.section] ?? { type: "", stars: null, blocks: [] };
            return { ...section, blocks: blocksOf(section, s.from, s.to) };
        });
        const f = filled(printedPieces(lesson, printed, i === 0 ? "sheet" : "sitting"));
        const got = { pages: f.pages, fill: (f.pages - 1) * PAGE_ROWS + f.used };
        measured.set(key, got);
        return got;
    };
    const longest = Math.max(MOST_PAGES, ...atoms.map((_, i) => measure(i, i + 1).pages));
    let chosen: { key: number[]; ends: number[] } | null = null;
    for (let limit = 1; limit <= longest; limit++) {
        // the fewest sittings of at most `limit` pages, then the fewest cuts inside a section, then
        // the most even, over the runs up to each point
        const best: ({ key: number[]; from: number } | null)[] = [{ key: [0, 0, 0], from: -1 }];
        for (let j = 1; j <= n; j++) {
            best.push(null);
            for (let i = j - 1; i >= 0; i--) {
                if (forced > i && forced < j) break;
                const before = best[i];
                const m = measure(i, j);
                if (m.pages > limit) break;
                if (!before) continue;
                const inner = j < n && !atoms[j - 1]?.sectionEnd ? 1 : 0;
                const key = [
                    (before.key[0] ?? 0) + 1,
                    (before.key[1] ?? 0) + inner,
                    (before.key[2] ?? 0) + m.fill * m.fill,
                ];
                const now = best[j];
                if (!now || lessThan(key, now.key)) best[j] = { key, from: i };
            }
        }
        const last = best[n];
        if (!last) continue;
        const key = [last.key[0] ?? 0, limit, last.key[1] ?? 0, last.key[2] ?? 0];
        if (chosen && !lessThan(key, chosen.key)) continue;
        const ends: number[] = [];
        for (let j = n; j > 0; j = best[j]?.from ?? 0) ends.unshift(j);
        chosen = { key, ends };
    }
    if (!chosen) return null;
    const sittings = chosen.ends.map((end, k) => merged(chosen.ends[k - 1] ?? 0, end));
    const fills = chosen.ends.map((end, k) => measure(chosen.ends[k - 1] ?? 0, end).fill);
    return {
        sittings,
        count: sittings.length,
        inner: chosen.key[2] ?? 0,
        most: Math.max(...chosen.ends.map((end, k) => measure(chosen.ends[k - 1] ?? 0, end).pages)),
        spread: fills.reduce((a, f) => a + f * f, 0),
    };
}

/** A slice of a sheet as it is drawn: for the screen, for paper or both, and on paper the sitting it starts, from the second. */
export interface Laid extends Slice {
    on: "both" | "screen" | "paper";
    starts: number | null;
}

/**
 * A sheet drawn once for the screen and for paper, where the screen shows its sections whole and in
 * order and paper shows its sittings. A section whole in a sitting, and in an order both keep, is drawn
 * once for both; any other is drawn whole for the screen and in its slices for paper.
 */
export function laidOut(level: PackLevel, sittings: readonly (readonly Slice[])[]): Laid[] {
    const steps = (i: number): number => {
        const section = level.sections[i];
        return section ? stepsOf(section) : 0;
    };
    const paper = sittings.flatMap((sitting, k) =>
        sitting.map((s, j) => ({ ...s, starts: k > 0 && j === 0 ? k + 1 : null })),
    );
    // the longest run of whole slices whose sections rise, which the screen's order keeps too
    const run: number[] = [];
    const before: number[] = [];
    paper.forEach((s, p) => {
        before.push(-1);
        run.push(0);
        if (s.from !== 0 || s.to !== steps(s.section)) return;
        run[p] = 1;
        for (let q = 0; q < p; q++) {
            const t = paper[q];
            const r = (run[q] ?? 0) + 1;
            if (t && run[q] && t.section < s.section && r > (run[p] ?? 0)) {
                run[p] = r;
                before[p] = q;
            }
        }
    });
    const shared = new Set<number>();
    for (let p = run.indexOf(Math.max(0, ...run)); p >= 0 && run[p]; p = before[p] ?? -1)
        shared.add(p);
    const both = new Set([...shared].flatMap((p) => paper[p]?.section ?? []));
    const out: Laid[] = [];
    let next = 0;
    const screen = (upTo: number): void => {
        for (; next < upTo; next++)
            if (!both.has(next))
                out.push({ section: next, from: 0, to: steps(next), on: "screen", starts: null });
    };
    paper.forEach((s, p) => {
        if (shared.has(p)) {
            screen(s.section);
            next = s.section + 1;
        }
        out.push({ ...s, on: shared.has(p) ? "both" : "paper" });
    });
    screen(level.sections.length);
    return out;
}

const lessThan = (a: readonly number[], b: readonly number[]): boolean => {
    for (let k = 0; k < a.length; k++) {
        const x = a[k] ?? 0;
        const y = b[k] ?? 0;
        if (x !== y) return x < y;
    }
    return false;
};

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
        ...(lesson.language ? { language: lesson.language } : {}),
        ...(lesson.nation ? { nation: lesson.nation } : {}),
        format: lesson.format,
        art: lesson.art,
        file,
        levels: LEVELS.filter((level) => lesson.levels[level] !== undefined),
        first,
        skills: [...new Set(asks.flatMap((a) => a.item.skills))],
        ...(lesson.book ? { parts: partsOf(lesson), book: lesson.book.file } : {}),
    };
}

/** How many sittings a lesson is read in, each a day of the plan: a book's sittings, or one. */
export const partsOf = (lesson: Pick<PackLesson, "levels">): number =>
    Math.max(1, lesson.levels.medium.sections.filter((s) => s.type === "sitting").length);

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
        isTextOrNull(v.explain) &&
        (v.also === undefined ||
            (isPlain(v.also) && Object.values(v.also).every((a) => areTexts(a))));
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
    if (v.chapters !== undefined && !(Array.isArray(v.chapters) && v.chapters.every(isWhole)))
        return "a sitting's chapters are whole numbers";
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
    "a lesson holds its id, source, title, goal, grade, unit, subject, format and drawings, and a language or nation from the lists if it is a variant";

const isLessonShaped = (v: Fields): boolean =>
    isText(v.id) &&
    isText(v.source) &&
    isText(v.title) &&
    isTextOrNull(v.goal) &&
    isWhole(v.grade) &&
    isWholeOrNull(v.unit) &&
    isText(v.subject) &&
    (v.language === undefined || LANGUAGES.some((l) => l === v.language)) &&
    (v.nation === undefined || NATIONS.some((n) => n === v.nation)) &&
    isText(v.format) &&
    areTexts(v.art);

function lessonProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a lesson must be an object";
    if (v.pack !== PACK) return `a lesson of pack format ${String(v.pack)} is not format ${PACK}`;
    if (!isLessonShaped(v)) return LESSON_FIELDS;
    if (
        v.teaching !== undefined &&
        !(
            isPlain(v.teaching) &&
            v.teaching.schema === 1 &&
            isText(v.teaching.material) &&
            isText(v.teaching.version) &&
            isText(v.teaching.hash) &&
            /^[a-f0-9]{64}$/.test(v.teaching.hash)
        )
    )
        return "invalid teaching reference";
    if (v.book !== undefined && !isBookFacts(v.book))
        return "a book lesson names its book's id, title, author, year and file";
    return levelsProblem(v.levels, levelProblem);
}

const isBookFacts = (v: unknown): boolean =>
    isPlain(v) &&
    isText(v.id) &&
    isText(v.title) &&
    isText(v.author) &&
    isWhole(v.published) &&
    isText(v.file);

const areLevels = (v: unknown): boolean =>
    Array.isArray(v) && v.includes("medium") && v.every((l) => LEVELS.some((x) => x === l));

function factsProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a lesson's facts must be an object";
    if (!(isLessonShaped(v) && isText(v.file) && isTextOrNull(v.first) && areTexts(v.skills)))
        return `${LESSON_FIELDS}, and its file, its first drawing's file or null, and skills`;
    if (!(v.parts === undefined || (isWhole(v.parts) && v.parts > 0)))
        return "a lesson's parts are a whole number of sittings";
    if (!(v.book === undefined || isText(v.book))) return "a book lesson names its book's file";
    return areLevels(v.levels) ? null : "levels list the levels declared, medium among them";
}

function sceneFileProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a scene's file must be an object";
    if (v.pack !== PACK) return `a scene of pack format ${String(v.pack)} is not format ${PACK}`;
    if (!isText(v.lesson)) return "a scene's file names its lesson";
    return within("scene", sceneProblem(v.scene));
}

const isSceneFile = (v: unknown): v is PackScene => sceneFileProblem(v) === null;

function bookProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a book's file must be an object";
    if (v.pack !== PACK) return `a book of pack format ${String(v.pack)} is not format ${PACK}`;
    if (!(
        isText(v.id) &&
        isText(v.title) &&
        isText(v.author) &&
        isWhole(v.published) &&
        isWhole(v.died) &&
        isText(v.edition) &&
        isText(v.basis)
    ))
        return "a book holds its id, title, author, years, edition and why it is free to use";
    return eachProblem(v.chapters, "chapters", (c) =>
        isPlain(c) &&
        isWhole(c.n) &&
        isText(c.title) &&
        Array.isArray(c.paragraphs) &&
        c.paragraphs.every(areTexts)
            ? null
            : "a chapter holds its number, title and paragraphs of lines",
    );
}

const isBook = (v: unknown): v is PackBook => bookProblem(v) === null;

/** A book's file as fetched, read into its chapters or the reason it is not a book. */
export function readBook(
    v: unknown,
): { ok: true; book: PackBook } | { ok: false; problem: string } {
    if (isBook(v)) return { ok: true, book: v };
    return { ok: false, problem: bookProblem(v) ?? "not a book" };
}

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
