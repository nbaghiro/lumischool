// The vocabulary. Each node type declares what it takes; the checker, the studio's forms, the
// renderer and the verifier all read these declarations. The hand-written entries are the nodes that
// need a shape no inference can guess (a balance's pans, a number line's jumps, a choice's options);
// every other drawing on the shelf is read off the catalogue, with its settings and their defaults,
// so adding a drawing makes it writable in a scene with no second declaration to keep in step. The
// catalogue is loaded once, here, when the notation loads: the notation runs in Node scripts and in
// the studio, never on a child's page.
import { LEVELS } from "../pack";
import { CATALOG } from "../parts/catalog";
import { isInstrument, type Drawing } from "../parts/drawing";
import { handDrawnFiles } from "../parts/imported/hand";
import { paramsOf, shown, type CValue } from "../scene";

export type Kind =
    | "expr" // an expression: 3, n, (a * b), 2..4, canvas(1, 1)
    | "text" // "quoted" or a """block""", with {placeholders}
    | "word" // a bare word
    | "pick" // one of the listed words, or an expression that gives one of them
    | "ref" // a node or anchor: s1, s2.left-pan, frame.cell(9), bonds.make-ten
    | "num" // a plain number
    | "size" // 32x16
    | "items" // [heavy, mid * a]: props by role, each optionally repeated
    | "exprs" // [5, ?]: expressions, "?" marks an unknown
    | "values" // ["Yes", 3, (1/2), apple]: texts, numbers, or props by role or name
    | "words" // [a, b]
    | "any"; // kept as written, interpreted by whoever reads it (code checker settings)

export interface Setting {
    kind: Kind;
    values?: readonly string[];
    required?: boolean;
}
export interface NodeSpec {
    doc: string;
    /** The first value is the node's id: "name" (no dots) or "dotted" (item and lesson ids). */
    id?: "name" | "dotted";
    idOptional?: boolean;
    /** Positional values after the id. */
    args?: { name: string; kind: Kind; optional?: boolean }[];
    /** Any number of trailing positional words (a component's parameter names). */
    rest?: "words";
    flags?: readonly string[];
    props?: Record<string, Setting>;
    /** Any key=value is accepted, all of this kind (let, roles, answer bindings, use bindings). */
    open?: Kind;
    children?: readonly string[];
    // scene nodes
    scene?: true;
    anchors?: readonly string[];
    /** Anchors whose names depend on the values of one concrete node (cells, options, ticks). */
    anchorsOf?: (v: Readonly<Record<string, CValue>>) => string[];
    box?: [number, number];
    capacity?: number;
    /** The node is where the child answers (its id names the answer). */
    input?: true;
    /**
     * The node draws this many blanks for the concrete values it is given, and its `blanks` setting
     * names one answer for each of them, in the order they are drawn.
     */
    blanks?: (v: Readonly<Record<string, CValue>>) => number;
    /** The node names an option rather than a number: the answer is one of the options. */
    picks?: true;
    /**
     * The child answers by arranging the drawing, and the answer is a condition over the measures the
     * part declares in arrange.ts, proved over every arrangement.
     */
    arranges?: true;
    /** The shelf's drawings a node composes rather than being one itself, so a lesson using it counts as using them. */
    draws?: readonly string[];
    /** The node draws on top of another node instead of taking a box of its own. */
    overlay?: true;
    /** The node places its children along an axis instead of giving each a placement. */
    container?: "row" | "column";
}

/**
 * A hand-drawn asset placed in a scene (content/art/: svg/, excalidraw/, strokes/). Layout and the
 * verifier need its size and anchor names before anything is drawn, so they are read from
 * engine/parts/imported/files.ts, which tools/scripts/art.ts compiles from those files and the
 * imported drawings draw from, and no file is read twice or differently.
 */
interface AssetInfo {
    name: string;
    file: string;
    kind: "svg" | "excalidraw" | "strokes";
    box: { w: number; h: number };
    anchors: string[];
}

const ASSETS = new Map<string, AssetInfo>(
    handDrawnFiles().map((a) => [a.name, { ...a, anchors: [...a.anchors] }] as const),
);

export const asset = (name: string): AssetInfo | undefined => ASSETS.get(name);
export const assetNames = (): string[] => [...ASSETS.keys()].sort();

/** A drawing on the shelf, with the kind the notation reads each of its settings as. */
export interface Part {
    d: Drawing<unknown>;
    kinds: Record<string, Kind>;
    /** The words a setting accepts, where the drawing declared them. Such a setting reads as a pick. */
    choices: Record<string, readonly string[]>;
}

const WORD = /^[A-Za-z_][\w-]*$/;
/** What the syntax accepts as a node type, so a drawing the notation cannot name is not a scene type. */
const TYPE = /^[A-Za-z_][\w-]*$/;

const isPlain = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
const areWords = (v: unknown): v is readonly string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * What kind to read a setting as, taken from the value the drawing defaults to. A number is an
 * expression so it can be a parameter; a word stays a word so `color=berry` reads as it always has;
 * a string with spaces or symbols has to be quoted text. Lists of numbers and of words work; a list
 * of objects (a balance's pans, a board's rows) has no spelling in the notation, so the drawing
 * keeps its own.
 *
 * An empty list is the case worth naming. Reading it as a list of numbers is a guess, and the guess
 * was wrong for a coordinate grid whose points are pairs: the checker accepted `points=[3, 4]`, the
 * drawing read 3 and 4 as pairs with no x or y, and every line came out as `MNaN NaN`, which draws
 * as nothing on screen and makes Chrome refuse to print the page at all. A default with no element
 * in it cannot show what its elements are, so the setting says what it holds (`numbers` or `words`
 * in the drawing's settings) or stays the drawing's own. paramsOf in engine/scene.ts reads a written
 * value back by the same rule.
 */
function kindOf(value: unknown, setting: unknown): Kind | null {
    if (typeof value === "number") return "expr";
    if (typeof value === "boolean") return "word";
    if (typeof value === "string") return WORD.test(value) ? "word" : "text";
    if (Array.isArray(value)) {
        if (!value.length) {
            const holds = isPlain(setting) ? setting.kind : undefined;
            return holds === "numbers" ? "exprs" : holds === "words" ? "values" : null;
        }
        if (value.every((x) => typeof x === "number")) return "exprs";
        if (value.every((x) => typeof x === "string")) return "values";
        return null;
    }
    return null;
}

function partOf(d: Drawing<unknown>): Part {
    const kinds: Record<string, Kind> = {};
    const choices: Record<string, readonly string[]> = {};
    const params = isPlain(d.params) ? d.params : {};
    const settings = isPlain(d.settings) ? d.settings : {};
    for (const [key, dflt] of Object.entries(params)) {
        const s = settings[key];
        const listed = isPlain(s) && s.kind === "one of" && areWords(s.of) ? s.of : undefined;
        const kind = listed ? "pick" : kindOf(dflt, s);
        if (listed) choices[key] = listed;
        if (kind) kinds[key] = kind;
    }
    return { d, kinds, choices };
}

// Read as loaders of any drawing, since the catalogue's own type names each drawing's settings.
const FAMILIES: Readonly<
    Record<string, Readonly<Record<string, () => Promise<Drawing<unknown>>>>>
> = CATALOG;
const DRAWINGS = await Promise.all(
    Object.values(FAMILIES).flatMap((family) => Object.values(family).map((load) => load())),
);

/** Every drawing on the shelf the notation can name, by its id, with the kinds it reads its settings as. */
export const PARTS: ReadonlyMap<string, Part> = new Map(
    DRAWINGS.filter((d) => TYPE.test(d.id)).map((d) => [d.id, partOf(d)]),
);

/** The words a boolean setting takes, so `labels=false` reads as a word rather than a name. */
export const BOOLS = ["true", "false"] as const;

/** The settings to draw a part with, from what a scene wrote (engine/scene.ts); nothing for a part the shelf does not hold. */
export function partParams(
    id: string,
    wrote: Readonly<Record<string, CValue>>,
): Record<string, unknown> {
    const part = PARTS.get(id);
    return part ? paramsOf(part.d, wrote) : {};
}

/** The box a part takes, in squares, for the settings a scene gave it. */
export function partBox(
    id: string,
    wrote: Readonly<Record<string, CValue>>,
): { w: number; h: number } | null {
    const part = PARTS.get(id);
    if (!part) return null;
    try {
        const box = part.d.box(paramsOf(part.d, wrote));
        return { w: Math.max(1, Math.ceil(box.w)), h: Math.max(1, Math.ceil(box.h)) };
    } catch {
        return null;
    }
}

const MARKERS = ["sky", "mint", "berry", "tang", "glow"] as const;
const PLACE: Record<string, Setting> = {
    at: { kind: "any" },
    "right-of": { kind: "ref" },
    "left-of": { kind: "ref" },
    below: { kind: "ref" },
    above: { kind: "ref" },
    gap: { kind: "num" },
};
const cells = Array.from({ length: 10 }, (_, i) => `cell(${i})`);

// Anchor names that depend on a node's values: numbered points such as cell(3) or option(1).
const whole = (x: unknown, fallback = 0): number =>
    typeof x === "number" && Number.isFinite(x) ? x : fallback;
/** The keys one instrument offers, read from the drawing rather than repeated here. */
const keysOf = (
    id: "piano" | "fretboard" | "glockenspiel",
    v: Readonly<Record<string, CValue>>,
): { anchor: string }[] => {
    const d = PARTS.get(id)?.d;
    if (!d || !isInstrument(d)) return [];
    try {
        return d.keys(partParams(id, v));
    } catch {
        return [];
    }
};
/** The words a drawing declared for a setting, so a hand-written entry does not repeat them. */
const choicesOf = (id: string, key: string): readonly string[] => PARTS.get(id)?.choices[key] ?? [];
const num = whole;
const indexed = (name: string, n: number, from = 0): string[] =>
    Array.from({ length: Math.max(0, Math.min(200, n)) }, (_, i) => `${name}(${i + from})`);
const length = (x: unknown): number => (Array.isArray(x) ? x.length : 0);
/** Letters in the longest of a list of options, once they are concrete. */
const widest = (x: CValue | undefined): number =>
    Array.isArray(x)
        ? Math.max(
              0,
              ...x.map((o) => (typeof o === "object" && o !== null ? o.label : String(o)).length),
          )
        : 0;
/** A text setting arrives filled in ({w} already replaced); anything else reads as itself. */
const filled = (x: CValue | undefined): string => shown(x);

export const SCENE_TYPES = [
    "balance",
    "tenframe",
    "numberline",
    "numberbond",
    "barmodel",
    "fraction",
    "clock",
    "matchsticks",
    "props",
    "text",
    "equation",
    "number-input",
    "columns",
    "guide",
    "arrow",
    "use",
    "choice",
    "art",
    "grid",
    "hundred",
    "ruler",
    "coins",
    "pattern",
    "tally",
    "picgraph",
    "bargraph",
    "placevalue",
    "array",
    "dice",
    "bubble",
    "note",
    "tick",
    "loop",
    "highlight",
    "row",
    "column",
    "table",
    "linegraph",
    "angle",
    "lshape",
    "mirror",
    "pyramid",
    "longdiv",
    "areagrid",
    "heads",
    "word-input",
    "sequence",
    "match",
    "parts",
    "staff",
    "handwriting",
    "gridmap",
    "piano",
    "notes",
    "codepad",
    "fretboard",
    "glockenspiel",
    "balance-plank",
    "fair-cut",
] as const;
/** What may be written inside a scene: the types above, plus every part read off the shelf. */
const SCENE_CHILDREN: string[] = [...SCENE_TYPES];
const SECTION_TYPES = [
    "look",
    "do",
    "story",
    "try",
    "remember",
    "example",
    "exercises",
    "puzzle",
    "warm-up",
] as const;
const BLOCKS = ["say", "scene", "practice", "show", "worked", "grown-ups", "level"] as const;
/** A block may use its item at another level than the lesson's, as a worked example tied to its own numbers does. */
const AT_LEVEL: Record<string, Setting> = { level: { kind: "word", values: LEVELS } };

export const FORMATS: Record<string, { label: string; sections: readonly string[] }> = {
    teach: { label: "Lesson", sections: ["look", "do", "story", "try", "remember"] },
    puzzles: { label: "Puzzle sheet", sections: ["puzzle"] },
    worked: { label: "Worked example", sections: ["example", "exercises", "try"] },
    review: { label: "Review", sections: ["warm-up", "exercises", "puzzle"] },
};

export const REGISTRY: Record<string, NodeSpec> = {
    item: {
        doc: "One practice question: parameters, a scene, the answer and the feedback.",
        id: "dotted",
        props: {
            v: { kind: "num", required: true },
            skills: { kind: "words" },
            stars: { kind: "num" },
        },
        // `negatives` says an answer below zero is intended. Without it the verifier warns, because a
        // negative answer at grades one to three is nearly always a subtraction written backwards.
        flags: ["negatives"],
        children: [
            "title",
            "difficulty",
            "set",
            "let",
            "where",
            "roles",
            "scene",
            "answer",
            "check",
            "feedback",
            "hint",
            "level",
        ],
    },
    lesson: {
        doc: "A lesson in one of the formats: teach, puzzles, worked or review.",
        id: "dotted",
        props: {
            v: { kind: "num", required: true },
            format: { kind: "word", values: Object.keys(FORMATS), required: true },
            grade: { kind: "num" },
            unit: { kind: "num" },
            // The track a lesson belongs to. "coding" is narrower than the school subject "computing":
            // the track is about reading and writing programs, which is what a child would call it.
            subject: {
                kind: "word",
                values: [
                    "maths",
                    "reading",
                    "logic",
                    "science",
                    "writing",
                    "grammar",
                    "geography",
                    "music",
                    "computing",
                    "physics",
                    "chemistry",
                    "coding",
                    "art",
                    "nature",
                ],
            },
            // The levels this lesson has; without it, medium alone, which is the lesson as written.
            levels: { kind: "words" },
        },
        children: ["title", "goal", ...SECTION_TYPES, "grown-ups", "level"],
    },
    level: {
        doc: "Content for some levels only, named after it: easy, medium or hard. It is resolved before checking, so a level's content is checked as if written in place. In an item it holds let, where, hint or scene; in a lesson, sections, grown-ups or blocks.",
        rest: "words",
        children: [
            "set",
            "let",
            "where",
            "hint",
            "scene",
            ...SECTION_TYPES,
            ...BLOCKS.filter((b) => b !== "level"),
        ],
    },
    difficulty: {
        doc: "An expression over the parameters that grows as a version gets harder; the verifier checks its average rises from easy to hard.",
        args: [{ name: "value", kind: "expr" }],
    },
    define: {
        doc: "A reusable group of scene nodes with parameters, placed with `use`.",
        id: "name",
        rest: "words",
        children: SCENE_CHILDREN,
    },

    title: { doc: "A short title.", args: [{ name: "text", kind: "text" }] },
    let: { doc: "Parameters and the values each may take.", open: "expr" },
    set: {
        doc: "Values every version shares, such as a grid size or a total a drawing is fixed at. A level may change one; unlike a parameter it is not part of a version's name, so changing it at easy leaves medium's versions as they were.",
        open: "expr",
    },
    where: { doc: "A condition every variant must meet.", args: [{ name: "cond", kind: "expr" }] },
    roles: {
        doc: "Maps each role to a prop, so a skin can swap props without touching the maths.",
        open: "word",
    },
    scene: {
        doc: "The picture, on a grid of squares.",
        args: [{ name: "size", kind: "size" }],
        children: SCENE_CHILDREN,
    },
    answer: {
        doc: "The correct answer, or one per named blank. For a part the child arranges it is a condition over the part's measures, and a say line gives it in words for the grown-ups sheet.",
        args: [{ name: "value", kind: "expr", optional: true }],
        open: "expr",
        children: ["say"],
    },
    check: {
        doc: "An answer checked by code, for answers an expression cannot state.",
        args: [{ name: "checker", kind: "ref" }],
        open: "any",
    },
    feedback: { doc: "Mistakes the item recognises, checked in order.", children: ["when"] },
    when: {
        doc: "A mistake: a condition on the answer, what the guide says, and where it points.",
        args: [{ name: "cond", kind: "expr" }],
        props: { point: { kind: "ref" } },
        children: ["say", "when"],
    },
    say: { doc: "What the guide says or the page shows.", args: [{ name: "text", kind: "text" }] },
    hint: { doc: "A hint, shown on request.", args: [{ name: "text", kind: "text" }] },

    goal: { doc: "What the child can do by the end.", args: [{ name: "text", kind: "text" }] },
    "grown-ups": {
        doc: "A note for the parent or tutor. Never on the child's pages.",
        args: [{ name: "text", kind: "text" }],
    },
    ...Object.fromEntries(
        SECTION_TYPES.map((s) => [
            s,
            {
                doc: `A "${s}" section.`,
                props: { stars: { kind: "num" } },
                children: BLOCKS,
            } satisfies NodeSpec,
        ]),
    ),
    practice: {
        doc: "Several variants of an item, picked by seed.",
        args: [{ name: "item", kind: "ref" }],
        props: { count: { kind: "num", required: true }, seed: { kind: "num" }, ...AT_LEVEL },
    },
    show: {
        doc: "One variant of an item; settings fix its parameters.",
        args: [{ name: "item", kind: "ref" }],
        props: AT_LEVEL,
        open: "expr",
    },
    worked: {
        doc: "One variant of an item, solved in the teacher's pen.",
        args: [{ name: "item", kind: "ref" }],
        props: AT_LEVEL,
        open: "expr",
    },

    balance: {
        doc: "A two-pan balance.",
        scene: true,
        id: "name",
        box: [14, 11],
        capacity: 6,
        props: {
            left: { kind: "items" },
            right: { kind: "items" },
            tilt: { kind: "expr" },
            label: { kind: "text" },
            ...PLACE,
        },
        anchors: ["pivot", "left-pan", "right-pan", "base", "beam-l", "beam-r"],
    },
    tenframe: {
        doc: "A ten frame; each cell is 2 by 2 squares.",
        scene: true,
        id: "name",
        box: [12, 6],
        props: {
            count: { kind: "expr", required: true },
            color: { kind: "word", values: MARKERS },
            ...PLACE,
        },
        anchors: cells,
    },
    numberline: {
        doc: "A number line, ticks one square apart, with optional jumps. `step` can be less than one, for tenths; then the ticks are numbered from 0 rather than by their value.",
        scene: true,
        id: "name",
        props: {
            from: { kind: "expr" },
            to: { kind: "expr" },
            step: { kind: "expr" },
            start: { kind: "expr" },
            jumps: { kind: "exprs" },
            ...PLACE,
        },
        anchorsOf: (v) => {
            const from = num(v.from, 0);
            const to = num(v.to, 10);
            const step = num(v.step, 1) || 1;
            const ticks = Math.max(1, Math.round((to - from) / step)) + 1;
            return [
                ...(Number.isInteger(step) ? indexed("tick", ticks, from) : indexed("tick", ticks)),
                ...indexed("jump", length(v.jumps)),
            ];
        },
    },
    numberbond: {
        doc: "A number bond: whole on top, two parts below.",
        scene: true,
        id: "name",
        box: [8, 8],
        props: { whole: { kind: "expr" }, parts: { kind: "exprs" }, ...PLACE },
        anchors: ["whole", "part(0)", "part(1)"],
    },
    barmodel: {
        doc: "A bar model: the whole and its parts.",
        scene: true,
        id: "name",
        box: [14, 6],
        props: { whole: { kind: "expr" }, parts: { kind: "exprs", required: true }, ...PLACE },
        anchors: ["whole", "part(0)", "part(1)", "part(2)"],
    },
    fraction: {
        doc: "A fraction as a circle or a bar.",
        scene: true,
        id: "name",
        props: {
            n: { kind: "expr", required: true },
            k: { kind: "expr", required: true },
            shape: { kind: "word", values: ["circle", "bar"] },
            ...PLACE,
        },
        anchors: ["centre", "top"],
    },
    clock: {
        doc: "A clock face.",
        scene: true,
        id: "name",
        box: [7, 7],
        props: { h: { kind: "expr", required: true }, m: { kind: "expr" }, ...PLACE },
        anchors: ["centre", "12"],
    },
    matchsticks: {
        doc: "An equation made of matchsticks.",
        scene: true,
        id: "name",
        props: { eq: { kind: "text", required: true }, ...PLACE },
        anchors: [],
    },
    props: {
        doc: "A row of props, such as apples to count.",
        scene: true,
        id: "name",
        props: {
            count: { kind: "expr", required: true },
            prop: { kind: "word", required: true },
            ...PLACE,
        },
        anchors: [],
    },
    text: {
        doc: "Text; with width= it wraps to that many squares.",
        scene: true,
        id: "name",
        args: [{ name: "text", kind: "text" }],
        flags: ["narrate"],
        props: { width: { kind: "num" }, ...PLACE },
        anchors: [],
    },
    equation: {
        doc: "An equation in big squares; {?name} is a blank to fill in.",
        scene: true,
        id: "name",
        args: [{ name: "text", kind: "text" }],
        flags: ["narrate"],
        props: { ...PLACE },
        anchors: [],
    },
    "number-input": {
        doc: "A box for a number.",
        scene: true,
        id: "name",
        input: true,
        props: { width: { kind: "num" }, ...PLACE },
        anchors: [],
    },
    columns: {
        doc: "Column addition or subtraction, one digit per square; the result row is the input.",
        scene: true,
        id: "name",
        input: true,
        props: {
            a: { kind: "expr", required: true },
            b: { kind: "expr", required: true },
            op: { kind: "word", values: ["add", "sub", "mul"] },
            ...PLACE,
        },
        anchors: [],
    },
    guide: {
        doc: "The guide character.",
        scene: true,
        id: "name",
        box: [3, 3],
        props: { pose: { kind: "word", values: ["idle", "point", "cheer"] }, ...PLACE },
        anchors: ["hand", "head"],
    },
    arrow: {
        doc: "A pencil arrow between two anchors.",
        scene: true,
        args: [
            { name: "from", kind: "ref" },
            { name: "to", kind: "ref" },
        ],
    },

    choice: {
        doc: "Options to pick one of: texts, numbers or props. The answer names the option as the list writes it.",
        scene: true,
        id: "name",
        input: true,
        picks: true,
        props: {
            options: { kind: "values", required: true },
            stack: { kind: "word", values: ["row", "column"] },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("option", length(v.options)),
    },

    grid: {
        doc: "A grid of squares, the first `shade` of them shaded, for arrays, area and fractions.",
        scene: true,
        id: "name",
        props: {
            rows: { kind: "expr", required: true },
            cols: { kind: "expr", required: true },
            shade: { kind: "expr" },
            color: { kind: "word", values: MARKERS },
            cell: { kind: "num" },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("cell", whole(v.rows) * whole(v.cols)),
    },
    hundred: {
        doc: "A hundred square. `add` draws the jumps down and across; `hide` leaves cells blank.",
        scene: true,
        id: "name",
        props: {
            from: { kind: "expr" },
            to: { kind: "expr" },
            start: { kind: "expr" },
            add: { kind: "expr" },
            hide: { kind: "exprs" },
            ...PLACE,
        },
        anchorsOf: (v) =>
            indexed("cell", whole(v.to, 100) - whole(v.from, 1) + 1, whole(v.from, 1)),
    },
    ruler: {
        doc: "A centimetre ruler with an object above it; one centimetre is two squares, so print is life size.",
        scene: true,
        id: "name",
        props: {
            cm: { kind: "expr", required: true },
            length: { kind: "expr", required: true },
            start: { kind: "expr" },
            thing: { kind: "word", values: ["pencil", "ribbon", "stick"] },
            ...PLACE,
        },
        anchors: ["object-start", "object-end"],
        anchorsOf: (v) => indexed("tick", whole(v.cm) + 1),
    },
    coins: {
        doc: "US coins in a row, largest first, drawn at their real relative sizes.",
        scene: true,
        id: "name",
        props: {
            quarters: { kind: "expr" },
            dimes: { kind: "expr" },
            nickels: { kind: "expr" },
            pennies: { kind: "expr" },
            ...PLACE,
        },
        anchorsOf: (v) =>
            indexed(
                "coin",
                whole(v.quarters) + whole(v.dimes) + whole(v.nickels) + whole(v.pennies),
            ),
    },
    pattern: {
        doc: "A repeating pattern of props with one cell left blank.",
        scene: true,
        id: "name",
        props: {
            unit: { kind: "items", required: true },
            count: { kind: "expr", required: true },
            missing: { kind: "expr" },
            ...PLACE,
        },
        anchorsOf: (v) => [...indexed("item", whole(v.count)), "gap"],
    },
    placevalue: {
        doc: "Rods of ten and single cubes, so a two-digit number can be seen as tens and ones.",
        scene: true,
        id: "name",
        props: {
            tens: { kind: "expr", required: true },
            ones: { kind: "expr", required: true },
            ...PLACE,
        },
        anchors: ["tens", "ones"],
    },
    array: {
        doc: "Rows of equal groups, one square apart: 3 rows of 4 is 3 × 4.",
        scene: true,
        id: "name",
        props: {
            rows: { kind: "expr", required: true },
            cols: { kind: "expr", required: true },
            color: { kind: "word", values: MARKERS },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("row", whole(v.rows)),
    },
    dice: {
        doc: "Dice faces in a row, for subitising and adding two numbers without counting.",
        scene: true,
        id: "name",
        props: { faces: { kind: "exprs", required: true }, ...PLACE },
        anchorsOf: (v) => indexed("face", length(v.faces)),
    },
    tally: {
        doc: "Tally marks in fives.",
        scene: true,
        id: "name",
        props: { count: { kind: "expr", required: true }, ...PLACE },
        anchors: ["end"],
    },
    picgraph: {
        doc: "A picture graph: one row per label, one prop per unit.",
        scene: true,
        id: "name",
        props: {
            labels: { kind: "values", required: true },
            counts: { kind: "exprs", required: true },
            prop: { kind: "word", required: true },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("row", length(v.labels)),
    },
    bargraph: {
        doc: "A bar chart with a scale of one square per unit.",
        scene: true,
        id: "name",
        props: {
            labels: { kind: "values", required: true },
            values: { kind: "exprs", required: true },
            max: { kind: "expr" },
            color: { kind: "word", values: MARKERS },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("bar", length(v.labels)),
    },
    art: {
        doc: "A hand-drawn asset from the art folder, with the anchors the file declares.",
        scene: true,
        id: "name",
        props: { asset: { kind: "text", required: true }, ...PLACE },
        anchorsOf: (v) => asset(filled(v.asset))?.anchors ?? [],
    },

    table: {
        doc: "A table of data: a heading row, then the cells row by row, `cols` to a row.",
        scene: true,
        id: "name",
        props: {
            cols: { kind: "num", required: true },
            head: { kind: "values" },
            cells: { kind: "values", required: true },
            ...PLACE,
        },
        anchorsOf: (v) => {
            const cols = Math.max(1, whole(v.cols, 1));
            return [
                ...indexed("cell", length(v.cells)),
                ...indexed("row", (length(v.head) ? 1 : 0) + Math.ceil(length(v.cells) / cols)),
                ...indexed("col", cols),
            ];
        },
    },
    linegraph: {
        doc: "A line graph: one square per unit, the points joined in order.",
        scene: true,
        id: "name",
        props: {
            labels: { kind: "values", required: true },
            values: { kind: "exprs", required: true },
            max: { kind: "expr" },
            color: { kind: "word", values: MARKERS },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("point", length(v.labels)),
    },
    angle: {
        doc: "An angle: two arms from one vertex, with an arc across the turn. Reads up to a reflex angle.",
        scene: true,
        id: "name",
        flags: ["line"],
        props: {
            deg: { kind: "expr", required: true },
            arm: { kind: "num" },
            label: { kind: "text" },
            mark: { kind: "pick", values: ["arc", "square", "none"] },
            ...PLACE,
        },
        anchors: ["vertex", "arm(0)", "arm(1)"],
    },
    lshape: {
        doc: "A rectangle with one corner cut away, every side labelled: a compound shape to measure.",
        scene: true,
        id: "name",
        flags: ["squares"],
        props: {
            w: { kind: "expr", required: true },
            h: { kind: "expr", required: true },
            cut: { kind: "expr", required: true },
            deep: { kind: "expr", required: true },
            corner: {
                kind: "word",
                values: ["top-right", "top-left", "bottom-right", "bottom-left"],
            },
            cell: { kind: "num" },
            ...PLACE,
        },
        anchors: ["centre", ...indexed("corner", 6)],
    },
    mirror: {
        doc: "One shape with a dashed line across it, for questions about lines of symmetry.",
        scene: true,
        id: "name",
        props: {
            shape: {
                kind: "pick",
                values: ["square", "rectangle", "isosceles", "ell", "hexagon", "circle"],
                required: true,
            },
            line: { kind: "pick", values: ["vertical", "horizontal", "diagonal", "none"] },
            size: { kind: "num" },
            ...PLACE,
        },
        anchors: ["centre", "top"],
    },
    pyramid: {
        doc: "A number wall: every brick is the sum of the two under it. A ? is a brick to fill in.",
        scene: true,
        id: "name",
        blanks: (v) => (Array.isArray(v.cells) ? v.cells.filter((x) => x === null).length : 0),
        props: {
            cells: { kind: "exprs", required: true },
            blanks: { kind: "words", required: true },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("brick", length(v.cells)),
    },
    longdiv: {
        doc: "Short division at the bus stop; its two blanks are the quotient and the remainder.",
        scene: true,
        id: "name",
        blanks: () => 2,
        props: {
            n: { kind: "expr", required: true },
            by: { kind: "expr", required: true },
            blanks: { kind: "words", required: true },
            ...PLACE,
        },
        anchors: ["bar", "divisor"],
    },
    areagrid: {
        doc: "Long multiplication by the grid method; its blanks are the four partial products and the total.",
        scene: true,
        id: "name",
        blanks: () => 5,
        props: {
            a: { kind: "expr", required: true },
            b: { kind: "expr", required: true },
            blanks: { kind: "words", required: true },
            ...PLACE,
        },
        anchors: [...indexed("cell", 4), "total"],
    },
    heads: {
        doc: "A row of heads seen from behind; `mark` gives the nth of them a hat.",
        scene: true,
        id: "name",
        props: { count: { kind: "expr", required: true }, mark: { kind: "expr" }, ...PLACE },
        anchorsOf: (v) => indexed("head", whole(v.count)),
    },

    "word-input": {
        doc: "A box per letter for a word the child writes. `options` lists the answers that count as right, and the boxes are as long as the longest of them.",
        scene: true,
        id: "name",
        input: true,
        picks: true,
        props: { options: { kind: "values", required: true }, letters: { kind: "num" }, ...PLACE },
        anchorsOf: (v) => indexed("letter", whole(v.letters, widest(v.options))),
    },
    sequence: {
        doc: "Rows to put in order, each with a box for its place. Its blanks are those boxes, in the order they are drawn.",
        scene: true,
        id: "name",
        blanks: (v) => length(v.items),
        props: {
            items: { kind: "values", required: true },
            blanks: { kind: "words", required: true },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("card", length(v.items)),
    },
    match: {
        doc: "Two lists to pair up: on each left-hand row a box for the number of its partner on the right.",
        scene: true,
        id: "name",
        blanks: (v) => length(v.left),
        props: {
            left: { kind: "values", required: true },
            right: { kind: "values", required: true },
            blanks: { kind: "words", required: true },
            ...PLACE,
        },
        anchorsOf: (v) => [
            ...indexed("left", length(v.left)),
            ...indexed("right", length(v.right)),
        ],
    },
    parts: {
        doc: "A labelled diagram with four lettered parts, so a question can ask which letter points at a named part.",
        scene: true,
        id: "name",
        props: {
            of: { kind: "pick", values: ["plant", "fish", "island"], required: true },
            ...PLACE,
        },
        anchorsOf: () => indexed("part", 4),
    },
    // The keyboard and the staff are named here rather than derived, because the anchors they offer
    // depend on the notes they are given and no inference can guess `key(Fs4)`. The keyboard asks the
    // part for them, so a key that sounds and the anchor a lesson points at cannot disagree.
    piano: {
        doc: "A keyboard that is played: press a key and it lights and sounds. `down` draws keys pressed, `lit` rings them, and the letters on the white keys mean the whole of it works with the volume at zero. A note with a sharp is written Fs4, since # cannot appear in a content file.",
        scene: true,
        id: "name",
        input: true,
        props: {
            from: { kind: "word" },
            whites: { kind: "num" },
            wide: { kind: "num" },
            labels: { kind: "pick", values: ["letters", "solfa", "numbers", "none"] },
            down: { kind: "words" },
            lit: { kind: "words" },
            fingers: { kind: "exprs" },
            ...PLACE,
        },
        anchorsOf: (v) => [...keysOf("piano", v).map((k) => k.anchor), "home", "top", "under"],
    },
    // Named here for the keyboard's reason: its anchors are its bars, and which bars there are depends
    // on where it starts and how many it has.
    glockenspiel: {
        doc: "A glockenspiel that is played: tap a bar and it lights and rings. The bars are the white notes from `from`, long and low on the left; `down` draws bars struck and `lit` rings them, and the letter stamped on each bar means it works with the volume at zero. Three squares to a bar is the lesson size.",
        scene: true,
        id: "name",
        input: true,
        props: {
            from: { kind: "word" },
            bars: { kind: "num" },
            wide: { kind: "num" },
            labels: { kind: "pick", values: choicesOf("glockenspiel", "labels") },
            down: { kind: "words" },
            lit: { kind: "words" },
            mallet: { kind: "word", values: BOOLS },
            ...PLACE,
        },
        anchorsOf: (v) => [
            ...keysOf("glockenspiel", v).map((k) => k.anchor),
            "top",
            "under",
            ...(v.mallet === false || v.mallet === "false" ? [] : ["mallet"]),
        ],
    },
    notes: {
        doc: "A five line staff with pitched notes on it, one staff space to a square. `values` gives each note its length in beats and `lit` rings the ones to play.",
        scene: true,
        id: "name",
        props: {
            clef: { kind: "pick", values: ["treble", "bass"] },
            notes: { kind: "words" },
            values: { kind: "exprs" },
            letters: { kind: "word", values: BOOLS },
            lit: { kind: "words" },
            meter: { kind: "expr" },
            ...PLACE,
        },
        anchorsOf: (v) => [...indexed("note", length(v.notes)), "staff", "under"],
    },
    // The neck is named here for the reason the keyboard is: its anchors are its places, and which
    // places there are depends on the tuning and the frets it is given.
    fretboard: {
        doc: "A ukulele or guitar neck that is played, drawn close up from the head and its pegs to the body and its sound hole: tap a place and its string sounds, or with `strum` sweep across the strings over the body. `view` turns it to match what is read beside it: chart stands it up like a chord box, tab lays it down like tab, player is your own neck seen from above, mirror is a teacher opposite. `body` is how many squares of the body show past the last fret. A place is written s2f3, string 2 at fret 3, and string 1 is the thinnest.",
        scene: true,
        id: "name",
        input: true,
        props: {
            tuning: { kind: "pick", values: choicesOf("fretboard", "tuning") },
            frets: { kind: "num" },
            wide: { kind: "num" },
            view: { kind: "pick", values: choicesOf("fretboard", "view") },
            labels: { kind: "pick", values: choicesOf("fretboard", "labels") },
            chord: { kind: "pick", values: choicesOf("fretboard", "chord") },
            down: { kind: "words" },
            lit: { kind: "words" },
            strum: { kind: "word", values: BOOLS },
            body: { kind: "num" },
            ...PLACE,
        },
        anchorsOf: (v) => [
            ...keysOf("fretboard", v).map((k) => k.anchor),
            ...indexed("string", v.tuning === "guitar" ? 6 : 4, 1),
            "nut",
            "under",
            ...(v.strum === true || v.strum === "true" ? ["strum"] : []),
        ],
    },
    staff: {
        doc: "A bar of rhythm: each note's length in beats, so a minim is 2, a crotchet 1 and a quaver 0.5.",
        scene: true,
        id: "name",
        props: { notes: { kind: "exprs", required: true }, beats: { kind: "expr" }, ...PLACE },
        anchorsOf: (v) => indexed("note", length(v.notes)),
    },
    handwriting: {
        doc: "Ruled rows with a letter or word to trace and then copy. Nothing here is marked, so the item says what to look for with a check.",
        scene: true,
        id: "name",
        props: {
            show: { kind: "text", required: true },
            rows: { kind: "num" },
            trace: { kind: "num" },
            width: { kind: "num" },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("row", whole(v.rows, 1)),
    },
    // Named here rather than derived because it is where a child answers: its id names the answer,
    // which the coding.builds checker works out, and `key` is the item's own program that does the job.
    codepad: {
        doc: "Slots where a child arranges a program from the blocks in `tray`, one block a slot. A coding.builds check says what the program is for; `key`, if given, is a program that does it, which the checker runs and the answer key writes in.",
        scene: true,
        id: "name",
        input: true,
        props: {
            lines: { kind: "expr" },
            tray: { kind: "values", required: true },
            style: { kind: "pick", values: ["blocks", "lines"] },
            words: { kind: "word", values: BOOLS },
            once: { kind: "word", values: BOOLS },
            key: { kind: "values" },
            ...PLACE,
        },
        anchorsOf: (v) => indexed("slot", whole(v.lines, 5), 1),
    },
    gridmap: {
        doc: "An island on a grid lettered across and numbered down, with one thing to find.",
        scene: true,
        id: "name",
        props: {
            cols: { kind: "expr", required: true },
            rows: { kind: "expr", required: true },
            col: { kind: "expr", required: true },
            row: { kind: "expr", required: true },
            thing: { kind: "pick", values: ["hut", "tree", "boat", "bridge"] },
            ...PLACE,
        },
        anchorsOf: (v) => ["thing", ...indexed("cell", whole(v.cols) * whole(v.rows))],
    },

    // answered by arranging the drawing (engine/arrange.ts)
    "balance-plank": {
        doc: "A see-saw plank held level on props, with a load standing on it and weights on the grass. The child stands weights on its steps, and the answer is a condition over turning, left, right, leftkg, rightkg, onleft, onright, placed and grass. `load-at` and `open` are steps out from the pivot, less than nought on the left; `apart` is squares between steps; `most` is how many weights one step holds.",
        scene: true,
        id: "name",
        input: true,
        arranges: true,
        draws: ["seesawplank", "seesawprops", "fulcrum", "masses"],
        props: {
            steps: { kind: "expr" },
            apart: { kind: "expr" },
            load: { kind: "expr", required: true },
            "load-at": { kind: "expr", required: true },
            bags: { kind: "exprs", required: true },
            open: { kind: "exprs" },
            most: { kind: "expr" },
            ...PLACE,
        },
        anchorsOf: (v) => [
            "pivot",
            "left",
            "right",
            "heavy",
            "grass",
            "load",
            ...indexed("left", num(v.steps, 3), 1),
            ...indexed("right", num(v.steps, 3), 1),
        ],
    },
    "fair-cut": {
        doc: "A long cake to cut into fair shares. The child makes cuts along it, and the answer is a condition over pieces, cuts, share, smallest, biggest and off. `whole` is its length in squares, `into` the shares it is for, `most` the most cuts it takes (into, unless set), `snap` where a cut can land: 1 or 1/2 a square.",
        scene: true,
        id: "name",
        input: true,
        arranges: true,
        draws: ["longcake", "cakeknife"],
        props: {
            whole: { kind: "expr", required: true },
            into: { kind: "expr", required: true },
            most: { kind: "expr" },
            snap: { kind: "expr" },
            candles: { kind: "expr" },
            ...PLACE,
        },
        anchors: ["left", "right", "top", "biggest", "smallest"],
    },

    bubble: {
        doc: "What the guide says, in a bubble with its tail towards `from`.",
        scene: true,
        id: "name",
        args: [{ name: "text", kind: "text" }],
        props: { width: { kind: "num" }, from: { kind: "ref" }, ...PLACE },
        anchors: ["tail"],
    },
    note: {
        doc: "A taped note in the teacher's pen. With `solution` it is only on the answer key.",
        scene: true,
        id: "name",
        args: [{ name: "text", kind: "text" }],
        flags: ["solution"],
        props: { width: { kind: "num" }, ...PLACE },
        anchors: ["tape"],
    },
    tick: {
        doc: "A tick next to a node or anchor. With `solution` it is only on the answer key.",
        scene: true,
        overlay: true,
        args: [{ name: "target", kind: "ref" }],
        flags: ["solution"],
    },
    loop: {
        doc: "A pen loop around a node or anchor. With `solution` it is only on the answer key.",
        scene: true,
        overlay: true,
        args: [{ name: "target", kind: "ref" }],
        flags: ["solution"],
        props: { size: { kind: "size" } },
    },
    highlight: {
        doc: "A highlighter swipe over a node or anchor. With `solution` it is only on the answer key.",
        scene: true,
        overlay: true,
        args: [{ name: "target", kind: "ref" }],
        flags: ["solution"],
        props: { color: { kind: "word", values: MARKERS } },
    },

    row: {
        doc: "Places its children left to right, so none of them needs a placement.",
        scene: true,
        id: "name",
        idOptional: true,
        container: "row",
        props: {
            space: { kind: "num" },
            align: { kind: "word", values: ["start", "centre", "end"] },
            ...PLACE,
        },
        children: SCENE_CHILDREN,
    },
    column: {
        doc: "Places its children top to bottom, so none of them needs a placement.",
        scene: true,
        id: "name",
        idOptional: true,
        container: "column",
        props: {
            space: { kind: "num" },
            align: { kind: "word", values: ["start", "centre", "end"] },
            ...PLACE,
        },
        children: SCENE_CHILDREN,
    },
    use: {
        doc: "Places a component made with `define`; settings bind its parameters.",
        scene: true,
        args: [{ name: "component", kind: "ref" }],
        props: { as: { kind: "word" } },
        open: "any",
    },
};

// Every drawing on the shelf that the entries above do not already name becomes a scene type of its
// own, with its settings read off the drawing. The hand-written entries stay in charge where a part
// needs a shape the inference cannot guess, and everything else is derived rather than declared twice.
for (const [id, part] of PARTS) {
    if (REGISTRY[id]) continue;
    const props: Record<string, Setting> = { ...PLACE };
    const params = isPlain(part.d.params) ? part.d.params : {};
    for (const [key, kind] of Object.entries(part.kinds)) {
        props[key] =
            kind === "pick"
                ? { kind: "pick", values: part.choices[key] }
                : kind === "word" && typeof params[key] === "boolean"
                  ? { kind: "word", values: BOOLS }
                  : { kind };
    }
    REGISTRY[id] = {
        doc: part.d.about || part.d.title,
        scene: true,
        id: "name",
        props,
        // The points inside a drawing are known once it is drawn, so a reference to one of them is
        // resolved at that point; here a part offers only the anchors any box has.
        anchors: [],
    };
    SCENE_CHILDREN.push(id);
}

export const ROOTS = ["item", "lesson", "define"] as const;
export const BOX_ANCHORS = [
    "top",
    "bottom",
    "left",
    "right",
    "centre",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
];
export const PLACE_KEYS = Object.keys(PLACE);

/** Props a role can name, with their singular and plural, for {role} and {role.many}. */
export const NOUNS: Record<string, [string, string]> = {
    cube: ["cube", "cubes"],
    ball: ["ball", "balls"],
    star: ["star", "stars"],
    apple: ["apple", "apples"],
    counter: ["counter", "counters"],
    coin: ["coin", "coins"],
    box: ["box", "boxes"],
    circle: ["circle", "circles"],
    square: ["square", "squares"],
    triangle: ["triangle", "triangles"],
    hexagon: ["hexagon", "hexagons"],
    pentagon: ["pentagon", "pentagons"],
    rectangle: ["rectangle", "rectangles"],
};
