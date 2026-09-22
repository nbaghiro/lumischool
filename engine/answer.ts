// The event and answer unions, declared once. This file imports nothing, so a child's runtime can
// load it without `server/db/`, which `npm run check:db` asserts. `Stroke`, `PaintMark`, `Struck`,
// `LoggedMove` and `Outcome` are owed to `pen`, `ink`, `sound` and `mechanic`.

/** Owed to `pen`. One stroke of a child's handwriting or drawing. */
interface Stroke {
    /** Flat x, y, pressure triples, because a stroke is a hot path and an array of objects is not. */
    points: number[];
}

/** Owed to `sound`. One thing struck during a performance, in milliseconds from the start. */
interface Struck {
    at: number;
    /** A key or drum name, as the instrument's own declaration writes it. */
    key: string;
}

/** Owed to `mechanic`. school/games/log.ts reads it from here, so a move has one shape. */
export interface LoggedMove {
    say: string;
    key: string;
    at: number;
    gap: number;
    /** Moves from a win after this move. Infinity does not survive JSON, so no win left is null. */
    dist: number | null;
    undo: boolean;
}

/** Owed to `mechanic`. */
export type Outcome = "playing" | "won" | "gave up" | "out of moves";

/** How an answer reached us. Paper work is marked afterwards, so it carries no timings at all. */
type Mode = "screen" | "paper";

export type PaperSize = "A4" | "Letter";

export type ContentKind = "item" | "lesson" | "define" | "activity" | "track";

/** One block of a program a child arranged: the words on it, and how many blocks it sits inside. */
export interface ProgramLine {
    text: string;
    depth: number;
}

/** The tools a painting is made with; the blender moves paint that is there, the eraser takes it off. */
export type Brush = "pencil" | "crayon" | "marker" | "water" | "blend" | "eraser";

/**
 * Whether a mark repeats in a mirror down the middle of the sheet, in four across both middles, or
 * six times round the centre, turned a sixth of the way each time.
 */
export type Mirror = "none" | "two" | "four" | "six";

/** Owed to `ink`. One pigment in a paint and how many parts of it went in: yellow 2 and blue 1. */
export interface PaintPart {
    pigment: string;
    parts: number;
}

/**
 * Owed to `ink`. One thing done to a painting, in squares from the sheet's top-left corner, kept as
 * what the child did rather than as pixels, so a painting replays and a paint reads as its recipe.
 */
export type PaintMark =
    | ({ k: "stroke"; brush: Brush; paint: PaintPart[]; size: number; mirror: Mirror } & Stroke)
    | { k: "fill"; paint: PaintPart[]; x: number; y: number; mirror: Mirror }
    /** `stamp` is a print block on the shelf's stamps, printed in the paint; `size` is its height. */
    | {
          k: "stamp";
          stamp: string;
          paint: PaintPart[];
          x: number;
          y: number;
          size: number;
          flip: boolean;
          mirror: Mirror;
      }
    /**
     * A stencil laid on the sheet, which every mark after it paints through until it is lifted:
     * `hole` is a card with the shape cut out, otherwise the shape itself lies on the paper.
     */
    | {
          k: "stencil";
          shape: string;
          x: number;
          y: number;
          size: number;
          hole: boolean;
          mirror: Mirror;
      }
    | { k: "lift" };

/** What a child answered. A new kind is one more tag here and one more entry in `GIVEN`. */
export type Given =
    | { k: "number"; text: string }
    | { k: "pick"; option: string }
    | { k: "word"; text: string }
    | { k: "drawing"; strokes: Stroke[] }
    | { k: "performance"; instrument: string; started: number; struck: Struck[] }
    /** Blocks arranged into a program, top to bottom, which the lesson ran to mark it. */
    | { k: "program"; lines: ProgramLine[] }
    /** A picture made with the paint tool, `w` by `h` squares, which a grown-up responds to. */
    | { k: "painting"; paper: "squared" | "plain"; w: number; h: number; marks: PaintMark[] }
    /**
     * Pieces a child placed on a drawn part, each at a place along it in the part's own unit: a
     * weight on a step of a see-saw plank, a cut some squares along a cake.
     */
    | { k: "arranged"; part: string; places: { piece: string; at: number }[] }
    /** Collected, with the grown-up as the marker. Handwriting and reading are here today. */
    | { k: "unmarked" };

/**
 * How a question is answered, which decides what the sheet offers for it: worked through with a
 * grown-up, typed into a box, arranged on its drawing, built from a pad's blocks, handed in for a
 * grown-up to read, or done somewhere that is not the sheet.
 */
export type Way = "worked" | "typed" | "arranged" | "program" | "grown-up" | "elsewhere";

/** A union rather than nullable fields, so paper work cannot carry an invented time (.docs/parents.md). */
export type Timing =
    { k: "screen"; toFirstInput: number; toAnswer: number; leftPage: boolean } | { k: "paper" };

/**
 * `variant` and `ask` overlap on purpose: the verifier's key keeps the reference exact while the
 * revision exists, and the sentence keeps the attempt readable after it is gone.
 */
export interface QuestionRef {
    lesson: string;
    /** sha256 of the lesson's canonical notation text. */
    lessonHash: string;
    /** "do", "exercises", "try", "puzzle": the section of the lesson it sat in. */
    section: string;
    /** Its number on the page, which is what the grown-ups sheet calls it. */
    n: number;
    item: string;
    /** sha256 of the item's canonical notation text. */
    itemHash: string;
    /** The verifier's own key (`a=2,b=3`). An index into the variant list changes when a range does. */
    variant: string;
    /** The question as it read on the page. */
    ask: string;
    /** The skills the item declares, carried so a reading does not need the pack. */
    skills: string[];
}

/** An activity round, which is a different grain from a question and does not merge with one. */
interface RoundRef {
    round: string;
    activity: string;
    kind: string;
    activityHash: string;
    /** The mechanic's own parameter key, the same idea as `QuestionRef.variant`. */
    values: string;
    /** How far from a win the starting position was, from the prover. */
    from: number | null;
}

/** Monday is 1 and Sunday 7, as ISO 8601 numbers them. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A change a parent made to the plan. Reversible by replaying the log without it. */
export type PlanOp =
    | { op: "shift"; from: string; weeks: number }
    | { op: "park"; lesson: string; from: string; gapWeeks: number }
    | {
          op: "set-day";
          onDay: string;
          kind: "lesson" | "again" | "practice" | "off";
          lesson: string | null;
          note: string | null;
      }
    | { op: "track"; track: string; on: boolean; perWeek: number }
    | { op: "days-off"; from: string; to: string; note: string }
    | { op: "school-days"; weekdays: Weekday[] }
    | { op: "terms"; terms: { n: number; from: string; to: string }[] }
    | { op: "move"; track: string; from: string; to: string }
    | { op: "undo"; of: string };

/**
 * Owed to `worlds`. What a family changed about one world, by the ids that world offers. It is read
 * back through `readChoice` in school/worlds/choice.ts, which drops whatever no longer resolves.
 */
export interface WorldTweak {
    guide?: string;
    ground?: string;
    weather?: string;
    landmarks?: string[];
    creatures?: string[];
    motion?: boolean;
}

/** What each kind carries. The kind itself is only the `events.kind` column, never repeated in `data`. */
export interface EventData {
    "sitting-began": {
        sitting: string;
        lesson: string;
        lessonHash: string;
        pack: string;
        mode: Mode;
    };
    "sitting-ended": { sitting: string; finished: boolean; minutes: number; withGrownUp: boolean };
    /** `right` is null until a grown-up marks it, the ordinary state for a drawing or a performance. */
    answered: {
        sitting: string;
        q: QuestionRef;
        given: Given;
        timing: Timing;
        right: boolean | null;
        tries: number;
        rule: string | null;
        hints: number;
    };
    "hint-opened": { sitting: string; q: QuestionRef; rung: number };
    /**
     * A press on the world's guide's card under a question (.docs/ai.md, "The guide"): the question
     * read aloud, the part it turns on ringed, the easier step opened, or the question handed to the
     * grown-up; `material` names what was given, such as the part ringed or the easier thing's kind.
     * Show me is `hint-opened`.
     */
    "help-asked": {
        sitting: string;
        q: QuestionRef;
        ask: "read" | "where" | "easier" | "grown-up";
        material: string | null;
    };
    "sheet-printed": {
        sheet: string;
        lesson: string;
        lessonHash: string;
        pack: string;
        paper: PaperSize;
        questions: QuestionRef[];
        grownUps: boolean;
    };
    /** A mark entered from a printed sheet, which may arrive a week after the sheet was printed. */
    marked: { sheet: string; q: QuestionRef; given: Given; right: boolean; rule: string | null };
    /**
     * A grown-up's response to a piece the child made (a painting, a piece of writing), which is never
     * right or wrong: the points of the item's own list they saw in it, and a line of their own. It
     * follows the `answered` event of a piece made on screen, or names the sheet of one made on paper.
     */
    responded: {
        q: QuestionRef;
        answer: string | null;
        sheet: string | null;
        noticed: string[];
        note: string | null;
    };
    "round-played": { round: RoundRef; moves: LoggedMove[]; outcome: Outcome; capped: boolean };
    "plan-changed": { op: PlanOp };
    /**
     * A parent's choice of a child's worlds, whole each time and trimmed to what differs from each
     * world's own: by grade, the world of each term in order, and per world what was tweaked. A term
     * keeps the world the choice gave it when its first work happened (school/family/chosen.ts).
     */
    "world-chosen": { terms: Record<string, string[]>; tweaks: Record<string, WorldTweak> };
    "content-authored": { id: string; kind: ContentKind; hash: string; model: string | null };
    /** The verifier service's verdict on a revision. A second run is a second event, not an update. */
    "content-verified": { hash: string; errors: number; played: boolean | null; verifier: string };
    /** A day of teaching a parent recorded that was not a lesson, for the records some states ask for. */
    "day-added": { onDay: string; subject: string; minutes: number; note: string };
    // The record of access (.docs/auth.md). The server writes these, against the family with `kid_id`
    // null, so a kid's deletion never removes one; a kid is named by id and never by name.
    "signed-in": { method: SignInMethod; session: string; shared: boolean };
    "signed-out": { everywhere: boolean };
    /**
     * A session put away while a children's view is open on its browser, given back by the family's
     * PIN, or ended because its view ended without it (.docs/auth.md, flows 5 and 7).
     */
    "session-changed": { session: string; change: SessionChange };
    "login-changed": { user: string; change: LoginChange };
    /** A tutor's row names a kid and a window; a parent's has none of the three. */
    "member-added": {
        user: string;
        name: string | null;
        kid: string | null;
        fromDay: string | null;
        toDay: string | null;
        invitedBy: string | null;
    };
    "member-changed": { user: string; kid: string; fromDay: string; toDay: string };
    "member-removed": { user: string; kid: string | null; left: boolean };
    "consent-given": { kid: string; notice: string; method: "email-plus" };
    "consent-withdrawn": { kid: string; notice: string };
    /** A parent opened the children's view on one browser, one key per child sharing `view`. */
    "kid-session-opened": { view: string; keys: KidSessionRef[] };
    "kid-session-ended": { view: string; keys: KidSessionRef[]; reason: KidSessionEnd };
    /** A parent set the family's PIN, or set it again. */
    "pin-set": Record<string, never>;
    "kid-deleted": { kid: string };
    exported: Record<string, never>;
}

/** `pin` is leaving a children's view with the family's PIN, when the session put away for it has run out. */
export type SignInMethod = "email-code" | "link" | "passkey" | "switch" | "pin";
type LoginChange = "email" | "passkey-added" | "passkey-removed";
/**
 * What happened to a session that stayed while a children's view was open on its browser: put away
 * as the view opened, restored by the family's PIN, or ended because the view ended some other way.
 */
export type SessionChange = "put-away" | "restored" | "ended";

/**
 * Why a children's view ended: a parent ended it from the family's page, a grown-up left it with the
 * PIN or by signing in on its browser, the child's consent was withdrawn, or the parent who opened it
 * was removed. A view that runs out records nothing, as a session does not.
 */
type KidSessionEnd = "ended" | "pin" | "sign-in" | "withdrawn" | "removed";

/** One child's key in a children's view: the child, and the key's id, which stamps what they do. */
interface KidSessionRef {
    kid: string;
    key: string;
}

export type EventKind = keyof EventData;
type AnswerKind = Given["k"];

/** The data of any one kind, for code that stores or passes it without looking inside. */
export type AnyEventData = EventData[EventKind];

/**
 * Exactly one `events` row, split by kind, so an upload once stamped, a seed's row and the Postgres row are one
 * shape. server/db/__tests__/schema.test.ts fails if the two drift.
 */
export type Envelope = {
    [K in EventKind]: {
        id: string;
        family_id: string;
        /** null for events about the family rather than about one kid. */
        kid_id: string | null;
        kind: K;
        data: EventData[K];
        /** The grown-up who did it, or null when the kid or the system did. */
        actor: string | null;
        /** The writer: the id of the key it signed in with, a session's or a child's in a children's view. */
        device: string;
        /** The writer's own counter, gapless and increasing per device. */
        seq: number;
        /** When the thing happened, as `toISOString` writes it: `2026-09-14T09:12:00.000Z`. */
        at: string;
    };
}[EventKind];

/**
 * An envelope as a person's browser sends it. The server stamps the family, the person, the session
 * and the number under the family's lock, so two tabs on one session never collide (.docs/api.md).
 * Distributive, so each kind keeps its own data.
 */
export type Draft = Envelope extends infer E
    ? E extends Envelope
        ? Pick<E, "id" | "kid_id" | "kind" | "data" | "at">
        : never
    : never;

type Check = (v: Record<string, unknown>) => string | null;

const str = (v: unknown): boolean => typeof v === "string";
const num = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v);
const int = (v: unknown): boolean => num(v) && Number.isInteger(v);
const bool = (v: unknown): boolean => typeof v === "boolean";
const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
const strs = (v: unknown): boolean => Array.isArray(v) && v.every(str);
const one = <T extends string>(v: unknown, of: readonly T[]): boolean =>
    str(v) && (of as readonly string[]).includes(v as string);
/** The one timestamp format: ISO 8601 in UTC to the millisecond, as `Date.prototype.toISOString` writes it. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
// `Date.parse` first, because `toISOString` throws on a time that is not one, such as hour 25.
const instant = (v: unknown): boolean =>
    typeof v === "string" &&
    INSTANT.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString() === v;
/** A day on the calendar, so 2026-02-30 is refused rather than read as 2 March. */
const day = (v: unknown): boolean =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && instant(`${v}T00:00:00.000Z`);
/** Own keys only, so a name every object has, such as `constructor`, is not a key of the table. */
const keyOf = <K extends string>(table: Record<K, unknown>, k: unknown): k is K =>
    typeof k === "string" && Object.hasOwn(table, k);
const nums = (v: unknown): boolean => Array.isArray(v) && v.every(num);
const uuid = (v: unknown): boolean =>
    str(v) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v as string);

const BRUSHES = ["pencil", "crayon", "marker", "water", "blend", "eraser"] as const;
const MIRRORS = ["none", "two", "four", "six"] as const;
const paint = (v: unknown): boolean =>
    Array.isArray(v) &&
    v.every((p) => obj(p) && str(p.pigment) && int(p.parts) && (p.parts as number) > 0);

/** A painting's marks, each by its kind; a stroke of paint needs a paint, and an eraser has none. */
function mark(m: unknown): string | null {
    if (!obj(m)) return "a mark must be an object";
    if (m.k === "lift") return null;
    if (!one(m.mirror, MIRRORS)) return "a mark's mirror must be none, two, four or six";
    switch (m.k) {
        case "stroke":
            return one(m.brush, BRUSHES) &&
                paint(m.paint) &&
                (m.brush === "eraser" ||
                    m.brush === "blend" ||
                    (m.paint as unknown[]).length > 0) &&
                num(m.size) &&
                (m.size as number) > 0 &&
                nums(m.points) &&
                (m.points as number[]).length % 3 === 0
                ? null
                : "a stroke needs a brush, a paint unless it blends or erases, a size and x, y, pressure triples";
        case "fill":
            return paint(m.paint) && (m.paint as unknown[]).length > 0 && num(m.x) && num(m.y)
                ? null
                : "a fill needs a paint and the point it was poured at";
        case "stamp":
            return str(m.stamp) &&
                paint(m.paint) &&
                (m.paint as unknown[]).length > 0 &&
                num(m.x) &&
                num(m.y) &&
                num(m.size) &&
                (m.size as number) > 0 &&
                bool(m.flip)
                ? null
                : "a stamp needs a block, a paint, a point, a size and whether it is flipped";
        case "stencil":
            return str(m.shape) &&
                num(m.x) &&
                num(m.y) &&
                num(m.size) &&
                (m.size as number) > 0 &&
                bool(m.hole)
                ? null
                : "a stencil needs a shape, a point, a size and whether it is a hole or the shape";
        default:
            return `mark kind "${String(m.k)}" is not a mark`;
    }
}

/**
 * One check per answer kind. Typed as a complete record over the union, so a new kind cannot be
 * added to `Given` without being added here.
 */
const GIVEN: Record<AnswerKind, Check> = {
    number: (g) => (str(g.text) ? null : "given.text must be a string"),
    pick: (g) => (str(g.option) ? null : "given.option must be a string"),
    word: (g) => (str(g.text) ? null : "given.text must be a string"),
    drawing: (g) =>
        Array.isArray(g.strokes) &&
        g.strokes.every(
            (s) =>
                obj(s) &&
                Array.isArray(s.points) &&
                s.points.length % 3 === 0 &&
                s.points.every(num),
        )
            ? null
            : "given.strokes must be strokes of x, y, pressure triples of finite numbers",
    performance: (g) =>
        str(g.instrument) &&
        num(g.started) &&
        Array.isArray(g.struck) &&
        g.struck.every((s) => obj(s) && num(s.at) && str(s.key))
            ? null
            : "given.struck must be an instrument, a start and struck keys",
    program: (g) =>
        Array.isArray(g.lines) &&
        g.lines.every(
            (l) =>
                obj(l) &&
                str(l.text) &&
                typeof l.depth === "number" &&
                Number.isInteger(l.depth) &&
                l.depth >= 0,
        )
            ? null
            : "given.lines must be lines of text, each with a whole depth of nought or more",
    painting: (g) => {
        if (!one(g.paper, ["squared", "plain"] as const))
            return "given.paper must be squared or plain";
        if (!int(g.w) || !int(g.h) || (g.w as number) < 1 || (g.h as number) < 1)
            return "given.w and given.h must be whole squares";
        if (!Array.isArray(g.marks)) return "given.marks must be a list of marks";
        for (const m of g.marks) {
            const bad = mark(m);
            if (bad) return bad;
        }
        return null;
    },
    arranged: (g) => {
        if (typeof g.part !== "string" || g.part === "") return "given.part must name the part";
        return Array.isArray(g.places) &&
            g.places.length > 0 &&
            g.places.every((p) => obj(p) && str(p.piece) && num(p.at))
            ? null
            : "given.places must be one or more pieces, each at a finite number";
    },
    unmarked: () => null,
};

function given(v: unknown): string | null {
    if (!obj(v)) return "given must be an object";
    const k = v.k;
    if (!keyOf(GIVEN, k)) return `given.k "${String(k)}" is not an answer kind`;
    return GIVEN[k](v);
}

function timing(v: unknown): string | null {
    if (!obj(v)) return "timing must be an object";
    if (v.k === "paper") return null;
    if (v.k !== "screen") return `timing.k "${String(v.k)}" is not a timing kind`;
    return num(v.toFirstInput) && num(v.toAnswer) && bool(v.leftPage)
        ? null
        : "screen timing needs toFirstInput, toAnswer and leftPage";
}

function ref(v: unknown): string | null {
    if (!obj(v)) return "q must be an object";
    const ok =
        str(v.lesson) &&
        str(v.lessonHash) &&
        str(v.section) &&
        int(v.n) &&
        str(v.item) &&
        str(v.itemHash) &&
        str(v.variant) &&
        str(v.ask) &&
        strs(v.skills);
    return ok
        ? null
        : "q must carry lesson, item, their hashes, the variant key, the ask and the skills";
}

function round(v: unknown): string | null {
    if (!obj(v)) return "round must be an object";
    const ok =
        str(v.round) &&
        str(v.activity) &&
        str(v.kind) &&
        str(v.activityHash) &&
        str(v.values) &&
        (v.from === null || num(v.from));
    return ok
        ? null
        : "round must carry its id, activity, kind, hash, values and starting distance";
}

function op(v: unknown): string | null {
    if (!obj(v)) return "op must be an object";
    switch (v.op) {
        case "shift":
            return day(v.from) && int(v.weeks)
                ? null
                : "shift needs a day and a whole number of weeks";
        case "park":
            return str(v.lesson) && day(v.from) && int(v.gapWeeks)
                ? null
                : "park needs a lesson, a day and a gap";
        case "set-day":
            return day(v.onDay) &&
                one(v.kind, ["lesson", "again", "practice", "off"] as const) &&
                (v.lesson === null || str(v.lesson)) &&
                (v.note === null || str(v.note))
                ? null
                : "set-day needs a day, a kind, and a lesson and note that may be null";
        case "track":
            return str(v.track) && bool(v.on) && num(v.perWeek)
                ? null
                : "track needs a track, on and perWeek";
        case "days-off":
            return typeof v.from === "string" &&
                typeof v.to === "string" &&
                day(v.from) &&
                day(v.to) &&
                v.from <= v.to &&
                str(v.note)
                ? null
                : "days-off needs a first and last day in order, and a note";
        case "school-days":
            return Array.isArray(v.weekdays) &&
                v.weekdays.length > 0 &&
                v.weekdays.every((d) => int(d) && d >= 1 && d <= 7) &&
                new Set(v.weekdays).size === v.weekdays.length
                ? null
                : "school-days needs different weekdays, Monday 1 to Sunday 7";
        case "terms":
            return Array.isArray(v.terms) &&
                v.terms.length > 0 &&
                v.terms.every(
                    (t) =>
                        obj(t) &&
                        typeof t.from === "string" &&
                        typeof t.to === "string" &&
                        int(t.n) &&
                        day(t.from) &&
                        day(t.to) &&
                        t.from <= t.to,
                )
                ? null
                : "terms needs numbered terms with first and last days in order";
        case "move":
            return str(v.track) && day(v.from) && day(v.to)
                ? null
                : "move needs a track and the day it moves from and to";
        case "undo":
            return uuid(v.of) ? null : "undo needs the event id it takes back";
        default:
            return `plan op "${String(v.op)}" is not an op`;
    }
}

const TWEAK: Record<keyof WorldTweak, (v: unknown) => boolean> = {
    guide: str,
    ground: str,
    weather: str,
    landmarks: strs,
    creatures: strs,
    motion: bool,
};

/** A world's tweak holding only what a tweak holds, each of its own type. */
export const isTweak = (v: unknown): v is WorldTweak =>
    obj(v) && Object.entries(v).every(([k, x]) => keyOf(TWEAK, k) && TWEAK[k](x));

/** A year's worlds by grade, each grade's a list of world ids in term order. */
const yearWorlds = (v: unknown): boolean =>
    obj(v) &&
    Object.entries(v).every(
        ([grade, list]) =>
            /^\d{1,2}$/.test(grade) &&
            Array.isArray(list) &&
            list.length > 0 &&
            list.every((id) => str(id) && id !== ""),
    );

const nullableStr = (v: unknown): boolean => v === null || str(v);
/**
 * One check per event kind, over its `data`. Typed as a complete record over `EventData`, so a new
 * event kind cannot be added without being added here, and `EVENT_KINDS` below needs no second list.
 */
const kidKeys = (v: unknown): boolean =>
    Array.isArray(v) && v.length > 0 && v.every((k) => obj(k) && uuid(k.kid) && uuid(k.key));

const EVENT: Record<EventKind, Check> = {
    "sitting-began": (e) =>
        str(e.sitting) &&
        str(e.lesson) &&
        str(e.lessonHash) &&
        str(e.pack) &&
        one(e.mode, ["screen", "paper"] as const)
            ? null
            : "sitting-began needs a sitting, a lesson with its hash, a pack digest and a mode",
    "sitting-ended": (e) =>
        str(e.sitting) && bool(e.finished) && num(e.minutes) && bool(e.withGrownUp)
            ? null
            : "sitting-ended needs a sitting, finished, minutes and withGrownUp",
    answered: (e) =>
        ref(e.q) ??
        given(e.given) ??
        timing(e.timing) ??
        (str(e.sitting) &&
        (e.right === null || bool(e.right)) &&
        int(e.tries) &&
        nullableStr(e.rule) &&
        int(e.hints)
            ? null
            : "answered needs a sitting, right that may be null, tries, a rule that may be null and a hint count"),
    "hint-opened": (e) =>
        ref(e.q) ??
        (str(e.sitting) && int(e.rung) ? null : "hint-opened needs a sitting and a rung"),
    "help-asked": (e) =>
        ref(e.q) ??
        (str(e.sitting) &&
        one(e.ask, ["read", "where", "easier", "grown-up"] as const) &&
        nullableStr(e.material)
            ? null
            : "help-asked needs a sitting, an ask and a material that may be null"),
    "sheet-printed": (e) => {
        if (!Array.isArray(e.questions)) return "sheet-printed needs a list of questions";
        for (const q of e.questions) {
            const bad = ref(q);
            if (bad) return bad;
        }
        return str(e.sheet) &&
            str(e.lesson) &&
            str(e.lessonHash) &&
            str(e.pack) &&
            one(e.paper, ["A4", "Letter"] as const) &&
            bool(e.grownUps)
            ? null
            : "sheet-printed needs a sheet, a lesson with its hash, a pack, a paper size and grownUps";
    },
    marked: (e) =>
        ref(e.q) ??
        given(e.given) ??
        (str(e.sheet) && bool(e.right) && nullableStr(e.rule)
            ? null
            : "marked needs a sheet, right and a rule that may be null"),
    responded: (e) =>
        ref(e.q) ??
        ((e.answer === null || uuid(e.answer)) &&
        nullableStr(e.sheet) &&
        (e.answer !== null || e.sheet !== null) &&
        strs(e.noticed) &&
        nullableStr(e.note)
            ? null
            : "responded needs the answer or the sheet it follows, the points noticed and a note that may be null"),
    "round-played": (e) => {
        if (!Array.isArray(e.moves)) return "round-played needs a list of moves";
        for (const m of e.moves) {
            if (
                !obj(m) ||
                !str(m.say) ||
                !str(m.key) ||
                !num(m.at) ||
                !num(m.gap) ||
                !bool(m.undo) ||
                !(m.dist === null || num(m.dist))
            )
                return "a move needs say, key, at, gap, undo and a distance that may be null";
        }
        return (
            round(e.round) ??
            (one(e.outcome, ["playing", "won", "gave up", "out of moves"] as const) &&
            bool(e.capped)
                ? null
                : "round-played needs an outcome and capped")
        );
    },
    "plan-changed": (e) => op(e.op),
    "world-chosen": (e) =>
        yearWorlds(e.terms) &&
        obj(e.tweaks) &&
        Object.entries(e.tweaks).every(([world, t]) => world !== "" && isTweak(t))
            ? null
            : "world-chosen needs each grade's worlds in term order and each world's tweaks",
    "content-authored": (e) =>
        str(e.id) &&
        one(e.kind, ["item", "lesson", "define", "activity", "track"] as const) &&
        str(e.hash) &&
        nullableStr(e.model)
            ? null
            : "content-authored needs an id, a content kind, a hash and a model that may be null",
    "content-verified": (e) =>
        str(e.hash) && int(e.errors) && (e.played === null || bool(e.played)) && str(e.verifier)
            ? null
            : "content-verified needs a hash, an error count, played that may be null and a verifier",
    "day-added": (e) =>
        day(e.onDay) && str(e.subject) && num(e.minutes) && str(e.note)
            ? null
            : "day-added needs a day, a subject, minutes and a note",
    "signed-in": (e) =>
        one(e.method, ["email-code", "link", "passkey", "switch", "pin"] as const) &&
        uuid(e.session) &&
        bool(e.shared)
            ? null
            : "signed-in needs a method, the session key's id and shared",
    "signed-out": (e) => (bool(e.everywhere) ? null : "signed-out needs everywhere"),
    "session-changed": (e) =>
        uuid(e.session) && one(e.change, ["put-away", "restored", "ended"] as const)
            ? null
            : "session-changed needs the session key's id and a change",
    "login-changed": (e) =>
        uuid(e.user) && one(e.change, ["email", "passkey-added", "passkey-removed"] as const)
            ? null
            : "login-changed needs a user and a change",
    "member-added": (e) => {
        if (!uuid(e.user) || !nullableStr(e.name) || !(e.invitedBy === null || uuid(e.invitedBy)))
            return "member-added needs a user, a name that may be null and invitedBy that may be null";
        const tutor = uuid(e.kid) && day(e.fromDay) && day(e.toDay);
        const parent = e.kid === null && e.fromDay === null && e.toDay === null;
        return tutor || parent ? null : "member-added names a kid and both days, or none of them";
    },
    "member-changed": (e) =>
        uuid(e.user) && uuid(e.kid) && day(e.fromDay) && day(e.toDay)
            ? null
            : "member-changed needs a user, a kid and both days",
    "member-removed": (e) =>
        uuid(e.user) && (e.kid === null || uuid(e.kid)) && bool(e.left)
            ? null
            : "member-removed needs a user, a kid that may be null and left",
    "consent-given": (e) =>
        uuid(e.kid) && str(e.notice) && e.method === "email-plus"
            ? null
            : "consent-given needs a kid, a notice and the method",
    "consent-withdrawn": (e) =>
        uuid(e.kid) && str(e.notice) ? null : "consent-withdrawn needs a kid and a notice",
    "kid-session-opened": (e) =>
        uuid(e.view) && kidKeys(e.keys) ? null : "kid-session-opened needs a view and its keys",
    "kid-session-ended": (e) =>
        uuid(e.view) &&
        kidKeys(e.keys) &&
        one(e.reason, ["ended", "pin", "sign-in", "withdrawn", "removed"] as const)
            ? null
            : "kid-session-ended needs a view, its keys and a reason",
    "pin-set": (e) => (Object.keys(e).length === 0 ? null : "pin-set carries nothing"),
    "kid-deleted": (e) => (uuid(e.kid) ? null : "kid-deleted needs a kid"),
    exported: (e) => (Object.keys(e).length === 0 ? null : "exported carries nothing"),
};

/** Every event kind, from the one place they are declared. */
export const EVENT_KINDS = Object.keys(EVENT) as EventKind[];

type Checked = { ok: true; envelope: Envelope } | { ok: false; problem: string };

function problemOf(v: unknown): string | null {
    if (!obj(v)) return "an envelope must be an object";
    if (!uuid(v.id)) return "id must be a uuid";
    if (!uuid(v.family_id)) return "family_id must be a uuid";
    if (!(v.kid_id === null || uuid(v.kid_id))) return "kid_id must be a uuid or null";
    if (!(v.actor === null || uuid(v.actor))) return "actor must be a user id or null";
    if (!uuid(v.device)) return "device must be a uuid";
    if (!int(v.seq) || (v.seq as number) < 0) return "seq must be a whole number, zero or more";
    if (!instant(v.at)) return "at must be an instant in the one format, 2026-09-14T09:12:00.000Z";
    const kind = v.kind;
    if (!keyOf(EVENT, kind)) return `kind "${String(kind)}" is not an event kind`;
    if (!obj(v.data)) return "data must be an object";
    if ("t" in v.data) return "data must not carry the event's type; that is kind";
    return EVENT[kind](v.data);
}

/** The same checks as a type guard, so a value that passes is an `Envelope` without a cast. */
function isEnvelope(v: unknown): v is Envelope {
    return problemOf(v) === null;
}

/**
 * Everything that reaches the log passes through here, since an appended row cannot be fixed later.
 * It returns the problem rather than throwing, so the request edge can answer with a reason.
 */
export function check(v: unknown): Checked {
    if (isEnvelope(v)) return { ok: true, envelope: v };
    return { ok: false, problem: problemOf(v) ?? "not an envelope" };
}
