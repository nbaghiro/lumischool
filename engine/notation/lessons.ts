// What a lesson asks, independent of how it is drawn: its questions in order, its section labels,
// and the measures a level is compared by. The run-time twins of tagOf and sectionLabel, over a pack
// lesson, are in engine/pack.ts.
import { evaluate, showValue } from "../expr";
import { isLevel, type Item, type Lesson, type TNode, type Workspace } from "./notation";
import { difficultyOf, pick, type Variant } from "./verify";
import { FORMATS, REGISTRY } from "./vocabulary";

export interface Question {
    n: number;
    item: Item;
    variant: Variant;
    worked: boolean;
}

/** The strip above the title: what kind of lesson this is, and where it sits in a course. */
export const tagOf = (lesson: Lesson): string =>
    [
        FORMATS[lesson.format]?.label,
        lesson.subject &&
            lesson.subject !== "maths" &&
            lesson.subject.charAt(0).toUpperCase() + lesson.subject.slice(1),
        lesson.grade && `Grade ${lesson.grade}`,
        lesson.unit && `Unit ${lesson.unit}`,
    ]
        .filter(Boolean)
        .join(" · ");

const LABELS: Record<string, string> = {
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
const stars = (n?: number): string => (n ? "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n)) : "");
export const sectionLabel = (type: string, i: number, n?: number): string =>
    (type === "puzzle" ? `Puzzle ${i}` : (LABELS[type] ?? type)) + (n ? ` ${stars(n)}` : "");

/** Every question in the lesson, numbered in order; worked examples are not numbered. */
export function questions(ws: Workspace, lesson: Lesson): Map<TNode, Question[]> {
    const out = new Map<TNode, Question[]>();
    let n = 0;
    for (const s of lesson.sections)
        for (const b of s.blocks) {
            const ref = b.args.item?.k === "ref" ? b.args.item.v : "";
            // A block uses its item at the lesson's level, unless it names another with level=.
            const level =
                b.props.level?.k === "word" && isLevel(b.props.level.v)
                    ? b.props.level.v
                    : (lesson.level ?? "medium");
            const item = ws.itemAt(ref, level);
            const report = item ? ws.reportFor(item) : undefined;
            if (!item || !report) continue;
            if (b.type === "practice") {
                const count = b.props.count?.k === "num" ? b.props.count.v : 1;
                const seed = b.props.seed?.k === "num" ? b.props.seed.v : 1;
                out.set(
                    b,
                    pick(report.variants, count, seed).map((v) => ({
                        n: ++n,
                        item,
                        variant: v,
                        worked: false,
                    })),
                );
            } else if (b.type === "show" || b.type === "worked") {
                // Settings fix parameters by value, so "sun" and (3 * 2) both name a variant.
                const fixed: Record<string, string> = {};
                for (const [k, v] of Object.entries(b.open)) {
                    if (v.k !== "expr") continue;
                    try {
                        fixed[k] = showValue(evaluate(v.e, {}));
                    } catch {
                        /* the workspace reports this */
                    }
                }
                const variant = ws.variantFor(item, fixed) ?? report.variants[0];
                if (variant)
                    out.set(b, [
                        {
                            n: b.type === "worked" ? 0 : ++n,
                            item,
                            variant,
                            worked: b.type === "worked",
                        },
                    ]);
            }
        }
    return out;
}

/** A short stable hash, so a baseline can hold every item's versions without holding every key. */
function hash(s: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const keyOf = (v: Variant): string =>
    Object.entries(v.values)
        .map(([k, x]) => `${k}=${x}`)
        .join(",");

/**
 * What every lesson as written asks, question by question, and a hash of every item's versions. A
 * level must never change either, since recorded answers and the pack name them.
 */
export function mediumBaseline(ws: Workspace): {
    lessons: Record<string, string[]>;
    items: Record<string, string>;
} {
    const lessons: Record<string, string[]> = {};
    const items: Record<string, string> = {};
    for (const lesson of [...ws.lessons.values()].sort((a, b) => a.id.localeCompare(b.id)))
        lessons[lesson.id] = [...questions(ws, lesson).values()]
            .flat()
            .map((q) => `${q.worked ? "worked " : ""}${q.item.id} ${keyOf(q.variant)}`);
    for (const item of [...ws.items.values()].sort((a, b) => a.id.localeCompare(b.id)))
        items[item.id] = hash((ws.reportFor(item)?.variants ?? []).map(keyOf).join("\n"));
    return { lessons, items };
}

export interface LevelMeasure {
    questions: number;
    worked: number;
    /** The average question's difficulty against its item's medium versions: 0 is medium's average, one item's spread is 1. */
    difficulty: number | null;
    /** How many questions have an item with a difficulty line. */
    measured: number;
    hintsPerQuestion: number;
    /** Questions asking a version the lesson has already asked. */
    repeats: number;
}

/** What a lesson at its level asks, measured so levels can be compared. */
export function levelMeasure(ws: Workspace, lesson: Lesson): LevelMeasure {
    let count = 0;
    let worked = 0;
    let hints = 0;
    let repeats = 0;
    const relative: number[] = [];
    const seen = new Set<string>();
    const spreads = new Map<string, { mean: number; spread: number } | null>();
    const baseline = (id: string): { mean: number; spread: number } | null => {
        const had = spreads.get(id);
        if (had !== undefined) return had;
        const medium = ws.items.get(id);
        const variants = medium ? (ws.reportFor(medium)?.variants ?? []) : [];
        const all = medium
            ? variants
                  .map((v) => difficultyOf(medium, v.env))
                  .filter((x): x is number => x !== null)
            : [];
        const got = all.length
            ? {
                  mean: all.reduce((a, b) => a + b, 0) / all.length,
                  spread: Math.max(1, Math.max(...all) - Math.min(...all)),
              }
            : null;
        spreads.set(id, got);
        return got;
    };
    for (const list of questions(ws, lesson).values())
        for (const q of list) {
            if (q.worked) {
                worked++;
                continue;
            }
            count++;
            hints += q.item.hints.length;
            const key = `${q.item.id}:${keyOf(q.variant)}`;
            if (seen.has(key)) repeats++;
            seen.add(key);
            const here = difficultyOf(q.item, q.variant.env);
            const base = baseline(q.item.id);
            if (here !== null && base) relative.push((here - base.mean) / base.spread);
        }
    return {
        questions: count,
        worked,
        difficulty: relative.length ? relative.reduce((a, b) => a + b, 0) / relative.length : null,
        measured: relative.length,
        hintsPerQuestion: count ? hints / count : 0,
        repeats,
    };
}

/** Which pieces of art a lesson draws, through its own scenes and through the items it uses. */
export function artOf(ws: Workspace, lesson: Lesson): string[] {
    const out = new Set<string>();
    const walk = (nodes: TNode[]): void => {
        for (const n of nodes) {
            // Every scene node, including the parts read off the shelf. Listing only the hand-written
            // types left the newer drawings out of the rail, which reads as a lesson that draws nothing.
            if (REGISTRY[n.type]?.scene) out.add(n.type);
            for (const d of REGISTRY[n.type]?.draws ?? []) out.add(d);
            walk(n.children);
        }
    };
    for (const s of lesson.sections)
        for (const b of s.blocks) {
            if (b.type === "scene") walk(b.children);
            const ref = b.args.item?.k === "ref" ? b.args.item.v : "";
            const item = ref ? ws.items.get(ref) : undefined;
            if (item?.scene) walk(item.scene.nodes);
        }
    return [...out].sort();
}
