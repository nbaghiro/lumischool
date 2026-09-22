// The sample child: the one the site is drawn for, and the one a page shows when nobody is signed in.
// Their record is made up positionally, a share of the path behind them and the lesson they are on
// the next one along, so nothing names a lesson and rewriting the curriculum cannot leave the map
// pointing at one that no longer exists. Where they stand, the days they have done, the stops beside
// the map of the journey, the cards, the subject tiles, the lessons a visitor reads first and the
// words the site says are all worked out from a corpus (the pack's index) and the worlds, because the
// corpus changes under the page. Nothing here touches a page: the build works the words out
// (tools/site-sample.ts) and the site reads the same child from its visitor pack (apps/site/data.ts).
// Written for .docs/structure.md's `record/fixtures/`; it lives here because `record` may not reach
// the worlds and the child is one concept with their journey.

import type { Declared } from "../../engine/motion/world";
import { hash, rand, type Day, type GroundKind, type MapView } from "../../engine/space";
import type { Progress, Result } from "../record/record";
import { onPath, type LessonDef, type Year } from "../year";
import { artById } from "./art";
import { corpusFrom, topicsIn, type Corpus } from "./lessons";
import { journey, reachOf, type Journey, type Place, type YearRecord } from "./rewards";
import { addDays, daysOf, termOf } from "./roll";
import type { Applied, World, WorldChoice } from "./types";
import {
    BACKDROP_MAP,
    emptyProgress,
    journalOf,
    mapViewOf,
    SITE_MAP,
    type Journal,
    type MapIn,
    type When,
} from "./view";
import { WORLDS, yearOf } from "./worlds";

/** The day the sample child's school years start, for a page with no family's plan to start it from. */
export const SAMPLE_START = "2026-07-27";

/** How a finished lesson went. Made up, but made up the same way every time. */
export function result(id: string, on: string): Result {
    const r = rand(hash(id));
    const right = 0.55 + Math.floor(r() * 45) / 100;
    return {
        stars: right >= 0.9 ? 3 : right >= 0.74 ? 2 : 1,
        on,
        minutes: 9 + Math.floor(r() * 13),
        right,
    };
}

/**
 * A plausible way through a year: the first `share` of the path finished, the next lesson in front
 * of the child, and any side path off a finished lesson open but not started.
 */
export function sampleProgress(year: Year, share = 0.42): Progress {
    const main = onPath(year);
    const upto = Math.max(0, Math.min(main.length - 1, Math.round(main.length * share)));
    const at = main[upto];
    const done: Record<string, Result> = {};
    const seen: Record<number, number> = {};
    for (const l of main.slice(0, upto)) {
        const i = (seen[l.week] = (seen[l.week] ?? -1) + 1);
        done[l.id] = result(l.id, addDays(year.started, (l.week - 1) * 7 + i));
    }
    return { done, current: at?.id ?? "", week: at?.week ?? 1, unlocked: [] };
}

/** A year behind the child: every lesson finished, nobody standing on it. */
export function pastProgress(year: Year): Progress {
    const done: Record<string, Result> = {};
    const seen: Record<number, number> = {};
    for (const l of year.lessons) {
        const i = (seen[l.week] = (seen[l.week] ?? -1) + 1);
        done[l.id] = result(l.id, addDays(year.started, (l.week - 1) * 7 + i));
    }
    return { done, current: "", week: 36, unlocked: [] };
}

/** Every lesson of the terms up to one, finished, and the child at the first lesson after them. */
function termEnd(year: Year, term: number): Progress {
    const unit = new Map(year.lessons.map((l) => [l.id, l.unit] as const));
    const done = Object.fromEntries(
        Object.entries(pastProgress(year).done).filter(
            ([id]) => termOf(year, unit.get(id) ?? 0) <= term,
        ),
    );
    const next = onPath(year).find((l) => !done[l.id]);
    return { done, current: next?.id ?? "", week: next?.week ?? 36, unlocked: [] };
}

/**
 * The sample child's record for one year, made up: the year the view is in up to the point `when`
 * names, a year before it finished a year earlier for each grade back, and a year after it
 * untouched. The sample finishes lessons on the maths path, and a journal of maths alone would hide
 * the other tracks, so a lesson from another track is taken as done on the day its maths lesson was.
 * A signed-in child's record never comes through here.
 */
export function sampleRecord(year: Year, at: { grade: number; when: When }): Progress {
    if (year.grade > at.grade) return emptyProgress();
    if (year.grade < at.grade) {
        const p = pastProgress(year);
        for (const r of Object.values(p.done)) r.on = addDays(r.on, -(at.grade - year.grade) * 364);
        return p;
    }
    const w = at.when;
    const p =
        w.kind === "done"
            ? pastProgress(year)
            : w.kind === "term"
              ? termEnd(year, w.term)
              : sampleProgress(year, w.share);
    for (const l of year.lessons) {
        const main = l.branch ? p.done[l.branch] : undefined;
        if (main) p.done[l.id] = { ...main, minutes: 8 + (l.id.length % 9) };
    }
    return p;
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
const listNames = (names: string[], and = "and"): string =>
    names.length <= 1
        ? (names[0] ?? "")
        : `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
const NUMBERS = [
    "none",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
];
const spell = (n: number): string => NUMBERS[n] ?? String(n);
const ORDINAL = [
    "zeroth",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
];
const nth = (n: number): string => ORDINAL[n] ?? `${n}th`;
// the journal's own format, so a date here reads as the stamp on the map beside it does
const shortDate = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
/** "The kite goes up over the meadow." as a clause: "the kite goes up over the meadow". */
const clause = (s: string): string => lower((s.split(/\.\s/)[0] ?? s).replace(/\.$/, ""));

/** How a place is said: the meadow is walked in, the harbour is arrived at. A new kind of ground is "in". */
const IN: Partial<Record<GroundKind, string>> = {
    shore: "at",
    yard: "at",
    hill: "under",
    field: "at",
    sea: "on",
    jungle: "on",
};
const inWorld = (w: Applied): string => `${IN[w.ground] ?? "in"} ${lower(w.name)}`;

/** Where a subject stops being a handful of lessons, as the site says it. */
const DEEP_AT = 15;

const STATE: Record<Place["state"], string> = {
    done: "Finished",
    here: "Here now",
    begun: "Begun",
    ahead: "Not reached yet",
};

/** A subject's own drawing, by its catalogue id and its title, for when the landmark beside its lessons is already on another tile. */
const OWN: Record<string, { id: string; title: string }> = {
    writing: { id: "letterpage", title: "A letter" },
};

/** The first world the shelf holds, which every fallback stands in. */
const firstWorld = (): World => {
    const w = WORLDS[0];
    if (!w) throw new Error("the shelf holds no world");
    return w;
};

export interface Step {
    kicker: string;
    title: string;
    lines: string[];
    note: string;
}

/** A stop beside the map of the journey: a world of the first year partway through its term, or the whole run. */
export interface Stop {
    words: Step;
    node: number | "all";
    /** How far through the first year the child is at this stop. */
    share: number;
}

/** One of the first year's worlds as a grown-up's map shows it, with its place on the map. */
export interface Card {
    place: number;
    words: Sample["cards"][number];
}

export interface Tile {
    name: string;
    count: string;
    note: string;
    /** The landmark drawn on the tile, by art id. */
    art: string;
    /** The subject's own drawing, by catalogue id, drawn instead of the landmark. */
    own?: string;
}

/** The first of a world's reaches that one of a day's lessons holds, and which sheet it belongs beside. */
export interface Reached {
    art: string;
    says: string;
    sheet: number;
}

export interface SampleChild {
    corpus: Corpus;
    years: Year[];
    first: Year;
    /** How far through the first year the child is, as the share of its path behind them. */
    share: number;
    /** The whole run, with the child where they stand. */
    now: Journey;
    here: Place | undefined;
    hereWorld: Applied;
    /** The days done and today, in the first year. */
    days: Day[];
    today: Day | undefined;
    todayWorld: Applied;
    /** The first of today's lessons, or null on a day with none. */
    firstToday: string | null;
    /** The worlds on the road, one a term, in order. */
    run: Applied[];
    /** Each subject with how many lessons it has, most first. */
    strands: [string, number][];
    stops: Stop[];
    cards: Card[];
    tiles: { tiles: Tile[]; few: string[] };
    /** The lessons a visitor reads first: the first maths lesson, one from the middle of the year, and a puzzle. */
    chosen: string[];
    topics: (id: string) => string[];
    subjectOf(id: string): string;
    titleOf(id: string): string;
    reachFor(day: Day, w: Applied): Reached | null;
    /** Every year's record for a sample child a share of the way through the first year; the later years untouched. */
    recordsAt(share: number): YearRecord[];
    journeyAt(share: number): Journey;
    /** The two days the site's roll draws: yesterday and today in today's term, as the first two days of one stretch. */
    rollDays(): Day[];
}

/**
 * The sample child on a corpus, with each world as `worldOf` gives it. Every number and name is
 * read from the corpus and the worlds, because the corpus changes under the page.
 */
export function sampleChild(corpus: Corpus, worldOf: (id: string) => Applied): SampleChild {
    const years = corpus.grades.map((g) => corpus.year(g, ""));
    const first = years[0];
    if (!first) throw new Error("the corpus has no year");
    const lessons: LessonDef[] = years.flatMap((y) => y.lessons);
    const subjectOf = (id: string): string => corpus.lesson(id)?.subject ?? "maths";
    const titleOf = (id: string): string => corpus.lesson(id)?.title ?? id;
    const artTitle = (id: string): string => artById(id)?.title ?? id;
    const topics = topicsIn(corpus);
    const worldAt = (grade: number, term: number): Applied =>
        worldOf(yearOf(grade)[term - 1] ?? firstWorld().id);

    /**
     * The made-up record, as the journal makes it: the map's record finishes only the maths path,
     * and a lesson from another track is taken as done on the day its maths lesson was.
     */
    const record = (year: Year, share: number): Progress => {
        const p = sampleProgress(year, share);
        for (const l of year.lessons) {
            const main = l.branch ? p.done[l.branch] : undefined;
            if (main) p.done[l.id] = { ...main };
        }
        return p;
    };
    const recordsAt = (share: number): YearRecord[] =>
        years.map((y) => ({
            grade: y.grade,
            year: y,
            progress: y === first ? record(y, share) : emptyProgress(),
            worlds: yearOf(y.grade),
        }));
    const journeyAt = (share: number): Journey => journey(recordsAt(share), worldOf, topics);

    const reachFor = (day: Day, w: Applied): Reached | null => {
        for (const r of w.reaches) {
            for (let i = 0; i < day.lessons.length; i++) {
                if (reachOf({ reaches: [r] }, topics(day.lessons[i] ?? "")))
                    return { art: r.art, says: r.says, sheet: i };
            }
        }
        return null;
    };

    /**
     * Where the sample child is, as a share of the way through the first year: the first point in
     * its second world, a few days in so the world has been stamped and something has been lit, at
     * which today's lesson has a landmark beside it. It is found rather than typed, because the
     * corpus changes under the page and a typed share would land on a different day by the afternoon.
     */
    const share = ((): number => {
        const term = Math.min(2, yearOf(first.grade).length);
        for (let s = 0.3; s < 0.95; s += 0.01) {
            const days = daysOf(first, record(first, s)).days;
            const today = days.find((d) => d.state === "today");
            const into = days.filter((d) => d.term === term).length;
            if (today?.term === term && into >= 3 && reachFor(today, worldAt(first.grade, term)))
                return Math.round(s * 100) / 100;
        }
        return 0.5;
    })();

    const now = journeyAt(share);
    const here = now.places[now.here];
    const hereWorld = worldOf(here?.world ?? firstWorld().id);
    const days = daysOf(first, record(first, share)).days;
    const today = days.find((d) => d.state === "today") ?? days[days.length - 1];
    const todayWorld = today ? worldAt(first.grade, today.term) : hereWorld;
    const run = now.places.map((p) => worldOf(p.world));

    /** Every lesson a landmark of its term's world stands beside, across every year. */
    const reached = years.flatMap((y) =>
        y.lessons.flatMap((l) => {
            const w = worldAt(y.grade, termOf(y, l.unit));
            const r = reachOf(w, topics(l.id));
            return r ? [{ lesson: l, grade: y.grade, world: w, art: r.art }] : [];
        }),
    );

    const strands = ((): [string, number][] => {
        const m = new Map<string, number>();
        for (const l of lessons) m.set(subjectOf(l.id), (m.get(subjectOf(l.id)) ?? 0) + 1);
        return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    })();

    const stops = ((): Stop[] => {
        const worlds = yearOf(first.grade);
        const out: Stop[] = worlds.map((id, i) => {
            const w = worldOf(id);
            const term = i + 1;
            // partway through each term; the stop at the child's term is the child the rest of the page shows
            const at = term === here?.term ? share : (i + 0.45) / worlds.length;
            const inTerm = first.lessons.filter((l) => termOf(first, l.unit) === term);
            const subjects = [...new Set(inTerm.map((l) => subjectOf(l.id)))];
            const beside = reached.find((r) => r.world.id === id && r.grade === first.grade);
            const lines = [`${inTerm.length} lessons: ${listNames(subjects)}.`];
            if (beside)
                lines.push(
                    `The ${lower(artTitle(beside.art))} stands beside ${beside.lesson.title}.`,
                );
            lines.push(`At the end of term, ${clause(w.chapter.moment.says)}.`);
            return {
                words: {
                    kicker: `Year ${first.grade} · Term ${term}`,
                    title: w.name,
                    lines,
                    note: "",
                },
                node: i,
                share: at,
            };
        });
        const last = years[years.length - 1] ?? first;
        const before = out[out.length - 1];
        out.push({
            words: {
                kicker: `Years ${first.grade} to ${last.grade}`,
                title: `${capital(spell(run.length))} worlds in all`,
                lines: [
                    `${capital(spell(worlds.length))} a year, from ${lower((run[0] ?? hereWorld).name)} to ${lower((run[run.length - 1] ?? hereWorld).name)}.`,
                ],
                note: "A grown-up's map, with every world on it.",
            },
            node: "all",
            share: before?.share ?? share,
        });
        return out;
    })();

    /** What a grown-up reads under a world on the map, short: each mark with its day and the lesson that made it. */
    const notesFor = (p: Place): string[] => {
        const w = worldOf(p.world);
        if (p.state === "ahead") return [`${p.lessons.length} lessons to come`];
        const out = [`${p.done.length} of ${p.lessons.length} lessons done`];
        if (p.stamp) out.push(`Stamped ${shortDate(p.stamp)}: ${titleOf(p.done[0] ?? "")}`);
        for (const x of p.lit)
            out.push(`${artTitle(x.art)} lit ${shortDate(x.on)}: ${titleOf(x.lesson)}`);
        for (const x of p.followers)
            out.push(`${artTitle(x.art)} joined ${shortDate(x.on)}: ${titleOf(x.lesson)}`);
        out.push(
            p.moment
                ? `${capital(clause(w.chapter.moment.says))}, ${shortDate(p.moment)}`
                : `At the end of term, ${clause(w.chapter.moment.says)}`,
        );
        return out;
    };

    const cards: Card[] = now.places.flatMap((p, i) => {
        if (p.grade !== first.grade) return [];
        const w = worldOf(p.world);
        return [
            {
                place: i,
                words: {
                    kicker: `Year ${p.grade} · Term ${p.term}`,
                    title: w.name,
                    state: STATE[p.state],
                    tone: p.state,
                    accent: w.light.accent,
                    notes: notesFor(p),
                },
            },
        ];
    });

    /**
     * One tile a subject, each with a drawing no earlier tile has, so two subjects never share a
     * picture. A subject whose only landmark is already shown is drawn with its own drawing from the
     * shelf instead, and a subject no landmark stands beside is only named.
     */
    const tiles = ((): { tiles: Tile[]; few: string[] } => {
        const out: Tile[] = [];
        const few: string[] = [];
        const shown = new Set<string>();
        for (const [subject, count] of strands) {
            const all = reached.filter((r) => subjectOf(r.lesson.id) === subject);
            const pick = all.find((r) => !shown.has(r.art)) ?? all[0];
            if (!pick) {
                few.push(subject);
                continue;
            }
            const own = all.some((r) => !shown.has(r.art)) ? undefined : OWN[subject];
            const note = own
                ? `${own.title}, from the ${subject} lessons`
                : `${artTitle(pick.art)}, beside ${pick.lesson.title}`;
            if (!own) shown.add(pick.art);
            out.push({
                name: capital(subject),
                count: count === 1 ? "1 lesson" : `${count} lessons`,
                note,
                art: pick.art,
                ...(own ? { own: own.id } : {}),
            });
        }
        return { tiles: out, few };
    })();

    const graded = years.flatMap((y) => y.lessons.map((l) => ({ l, grade: y.grade })));
    const byGradeUnit = (a: { l: LessonDef; grade: number }, b: typeof a): number =>
        a.grade - b.grade || a.l.unit - b.l.unit;
    const teach = graded
        .filter((x) => x.l.format === "teach" && subjectOf(x.l.id) === "maths")
        .sort(byGradeUnit);
    const puzzle = graded.filter((x) => x.l.format === "puzzles").sort(byGradeUnit)[0];
    const chosen = [
        ...new Set(
            [teach[0], teach[Math.floor(teach.length / 2)], puzzle].flatMap((x) =>
                x ? [x.l.id] : [],
            ),
        ),
    ];

    const rollDays = (): Day[] =>
        today
            ? days
                  .filter((d) => d.term === today.term)
                  .slice(-2)
                  .map((d) => ({ ...d, term: 1 }))
            : [];

    return {
        corpus,
        years,
        first,
        share,
        now,
        here,
        hereWorld,
        days,
        today,
        todayWorld,
        firstToday: today?.lessons[0] ?? null,
        run,
        strands,
        stops,
        cards,
        tiles,
        chosen,
        topics,
        subjectOf,
        titleOf,
        reachFor,
        recordsAt,
        journeyAt,
        rollDays,
    };
}

/** What the site says about its sample child, read from the corpus the day the page is built. */
export interface Sample {
    /** Over the opening's headline: the ages, and how many subjects there are lessons in. */
    eyebrow: string;
    /** Under the opening's map. */
    caption: string;
    facts: { n: string; k: string }[];
    /** A day in the child's world: its roll, one question a few ways, and the lesson printed. */
    day: { kicker: string; caption: string; versions: number; versionsCaption: string };
    /** The stops beside the map of the journey. */
    steps: Step[];
    /** The first year's worlds as a grown-up sees them; `accent` is the world's palette token. */
    cards: {
        kicker: string;
        title: string;
        state: string;
        tone: Place["state"];
        accent: string;
        notes: string[];
    }[];
    subjects: {
        head: string;
        lead: string;
        tiles: { name: string; count: string; note: string }[];
        rest: string;
    };
    /** The lessons a visitor reads first, and the journal of the same child. */
    lessons: { tag: string; title: string }[];
    journal: string;
}

/** What only the notation knows about the sample child's lessons, which the build reads off the workspace. */
export interface FromNotation {
    /** How many items the curriculum holds, every one verified. */
    questions: number;
    /** The question the day's versions draw: how many ways it can be drawn, whether the verifier sampled them, and how many are drawn. */
    versions: { total: number; sampled: boolean; drawn: number } | null;
    /** The strip above a lesson's title, as the notation writes it. */
    tagOf(id: string): string;
}

/** The site's words about the sample child. */
export function wordsOf(c: SampleChild, from: FromNotation): Sample {
    const { today, todayWorld, here, hereWorld } = c;
    const reach = today ? c.reachFor(today, todayWorld) : null;
    const lesson = today?.lessons[reach?.sheet ?? 0] ?? "";
    const n = from.versions?.total ?? 0;
    const deep = c.strands.filter(([, count]) => count >= DEEP_AT).map(([s]) => s);
    const todayN = c.days.filter((d) => d.term === today?.term).length;
    const lessons = c.years.reduce((sum, y) => sum + y.lessons.length, 0);
    return {
        eyebrow: `Ages 5 to 10 · ${spell(c.strands.length)} subjects`,
        caption: here
            ? `A sample child's map, on their ${nth(todayN)} day ${inWorld(hereWorld)}. The colour shows where they have been.`
            : "A sample child's map.",
        facts: [
            { n: String(lessons), k: `lessons in ${spell(c.strands.length)} subjects` },
            { n: String(from.questions), k: "questions, every one checked" },
            { n: String(c.run.length), k: "worlds, one for each term" },
        ],
        day: {
            kicker: today ? `A day ${inWorld(todayWorld)}` : "A day",
            caption: !today
                ? ""
                : reach
                  ? `A sample day. Today's lesson is ${c.titleOf(lesson)}, so the ${lower(artById(reach.art)?.title ?? reach.art)} stands beside it.`
                  : `A sample day. Today's lesson is ${c.titleOf(today.lessons[0] ?? "")}.`,
            versions: from.versions?.drawn ?? 0,
            versionsCaption: !from.versions?.drawn
                ? ""
                : from.versions.sampled
                  ? `One question, more ways than we can list. We check a fixed ${n.toLocaleString("en-US")} of them before a child sees it.`
                  : `One question, ${n.toLocaleString("en-US")} ways. Every one is checked before a child sees it.`,
        },
        steps: c.stops.map((s) => s.words),
        cards: c.cards.map((x) => x.words),
        subjects: {
            head: `${capital(spell(c.strands.length))} subjects, in the same worlds`,
            lead: deep.length ? `Most lessons are in ${listNames(deep)}.` : "",
            tiles: c.tiles.tiles.map(({ name, count, note }) => ({ name, count, note })),
            rest: c.tiles.few.length ? `A few lessons so far in ${listNames(c.tiles.few)}.` : "",
        },
        lessons: c.chosen.map((id) => ({ tag: from.tagOf(id), title: c.titleOf(id) })),
        journal: `A sample child ${inWorld(hereWorld)}`,
    };
}

/**
 * What the site's page reads instead of the corpus (tools/first-view.ts writes it at build): the
 * sample child's journey for the opening's map, the page's words, the day's question laid out each
 * of the ways it is drawn, and where the visitor's pack is served from.
 */
export interface SiteData {
    journey: Journey;
    words: Sample;
    /**
     * The day's question laid out each of the ways it is drawn, each a `PackScene` (engine/pack.ts)
     * as JSON, read by `readScene` when a picture draws it and not here, so the opening, which reads
     * this file for the journey, never carries the scene's checker (tools/__tests__/first-view.test.ts).
     */
    versions: unknown[];
    /** The path the visitor's pack is under, with `index.json`, `lessons/` and `scenes/` beneath it. */
    pack: string;
}

type Fields = Record<string, unknown>;
const isPlain = (v: unknown): v is Fields =>
    typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isTextOrNull = (v: unknown): boolean => v === null || isText(v);
const areTexts = (v: unknown): v is string[] => Array.isArray(v) && v.every(isText);
const STATES: readonly Place["state"][] = ["done", "here", "begun", "ahead"];

function eachProblem(list: unknown, label: string, problem: (v: unknown) => string | null) {
    if (!Array.isArray(list)) return `${label} must be a list`;
    for (const [i, item] of list.entries()) {
        const found = problem(item);
        if (found !== null) return `${label}[${i}]: ${found}`;
    }
    return null;
}

const markProblem = (v: unknown): string | null =>
    isPlain(v) && isText(v.art) && isText(v.lesson) && isText(v.on)
        ? null
        : "a mark holds its drawing, its lesson and its day";

function placeProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a place must be an object";
    const shaped =
        isNumber(v.grade) &&
        isNumber(v.term) &&
        isText(v.world) &&
        areTexts(v.lessons) &&
        areTexts(v.done) &&
        STATES.some((s) => s === v.state) &&
        isTextOrNull(v.stamp) &&
        isTextOrNull(v.moment);
    if (!shaped)
        return "a place holds its grade, term, world, lessons, done, state, stamp and moment";
    return (
        eachProblem(v.lit, "lit", markProblem) ?? eachProblem(v.followers, "followers", markProblem)
    );
}

const roadProblem = (v: unknown): string | null =>
    isPlain(v) && isNumber(v.from) && isNumber(v.to) && isTextOrNull(v.open)
        ? null
        : "a road holds from, to and the day it opened or null";

function journeyProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a journey must be an object";
    if (!isNumber(v.here)) return "a journey says where the child is";
    return (
        eachProblem(v.places, "places", placeProblem) ??
        eachProblem(v.roads, "roads", roadProblem) ??
        eachProblem(v.sides, "sides", placeProblem)
    );
}

const stepProblem = (v: unknown): string | null =>
    isPlain(v) && isText(v.kicker) && isText(v.title) && areTexts(v.lines) && isText(v.note)
        ? null
        : "a step holds its kicker, title, lines and note";

const cardProblem = (v: unknown): string | null =>
    isPlain(v) &&
    isText(v.kicker) &&
    isText(v.title) &&
    isText(v.state) &&
    STATES.some((s) => s === v.tone) &&
    isText(v.accent) &&
    areTexts(v.notes)
        ? null
        : "a card holds its kicker, title, state, tone, accent and notes";

const tileProblem = (v: unknown): string | null =>
    isPlain(v) && isText(v.name) && isText(v.count) && isText(v.note)
        ? null
        : "a tile holds its name, count and note";

function wordsProblem(v: unknown): string | null {
    if (!isPlain(v)) return "the words must be an object";
    if (!(isText(v.eyebrow) && isText(v.caption) && isText(v.journal)))
        return "the words hold the eyebrow, the caption and the journal's line";
    const day = v.day;
    if (!(
        isPlain(day) &&
        isText(day.kicker) &&
        isText(day.caption) &&
        isNumber(day.versions) &&
        isText(day.versionsCaption)
    ))
        return "the day holds its kicker, caption, versions and their caption";
    const subjects = v.subjects;
    if (!(
        isPlain(subjects) &&
        isText(subjects.head) &&
        isText(subjects.lead) &&
        isText(subjects.rest)
    ))
        return "the subjects hold their head, lead and rest";
    return (
        eachProblem(v.facts, "facts", (f) =>
            isPlain(f) && isText(f.n) && isText(f.k) ? null : "a fact holds n and k",
        ) ??
        eachProblem(v.steps, "steps", stepProblem) ??
        eachProblem(v.cards, "cards", cardProblem) ??
        eachProblem(subjects.tiles, "subjects.tiles", tileProblem) ??
        eachProblem(v.lessons, "lessons", (l) =>
            isPlain(l) && isText(l.tag) && isText(l.title)
                ? null
                : "a lesson holds its tag and title",
        )
    );
}

function siteDataProblem(v: unknown): string | null {
    if (!isPlain(v)) return "the site's data must be an object";
    if (!isText(v.pack)) return "the data names where the visitor's pack is";
    return (
        journeyProblem(v.journey) ??
        wordsProblem(v.words) ??
        eachProblem(v.versions, "versions", (x) =>
            isPlain(x) ? null : "a version must be an object",
        )
    );
}

const isSiteData = (v: unknown): v is SiteData => siteDataProblem(v) === null;

/** The site's data as fetched, read into what the page draws from or the reason it is not that. */
export function readSiteData(
    v: unknown,
): { ok: true; data: SiteData } | { ok: false; problem: string } {
    if (isSiteData(v)) return { ok: true, data: v };
    return { ok: false, problem: siteDataProblem(v) ?? "not the site's data" };
}

/**
 * A window onto the map from a journey already worked out, as the site's opening and its pictures
 * draw one (apps/site): a grown-up's map, which draws every world, or a child's, which stops at the
 * edge of what the child knows; with `open`, every world may be gone into, for the look a visitor
 * takes. Nothing on it is travelled to, and nobody reads the notes under its places, so they are
 * left off. It reads no record and no corpus, so a page draws it from the journey alone.
 */
export function viewOfTrip(
    trip: Journey,
    o: {
        worldOf: (id: string) => Applied;
        grown: boolean;
        still: boolean;
        open?: boolean;
        size: MapIn["size"];
        declared?: Declared;
    },
): MapView {
    const view = mapViewOf({
        records: [],
        trip,
        sides: [],
        corpus: corpusFrom([], ""),
        worldOf: o.worldOf,
        topics: () => [],
        size: o.size,
        grown: o.grown,
        child: null,
        limits: o.open ? SITE_MAP : o.grown ? BACKDROP_MAP : { ...BACKDROP_MAP, travel: "reached" },
        still: o.still,
        declared: o.declared,
    });
    for (const p of view.places) if (p.shown) p.shown.notes = [];
    return view;
}

/**
 * The sample child's map at each stop of the site's journey: their own map partway into each term
 * of the first year, drawn as they would see it, and then every world as a grown-up sees it. The
 * sample child has no name, so no title is written on it.
 */
export function stopViews(
    c: SampleChild,
    o: {
        worldOf: (id: string) => Applied;
        size: MapIn["size"];
        still: boolean;
        declared?: MapIn["declared"];
    },
): { view: MapView; at: number | "all" }[] {
    return c.stops.map((stop) => {
        const grown = stop.node === "all";
        const view = mapViewOf({
            records: c.recordsAt(stop.share),
            sides: [],
            corpus: c.corpus,
            worldOf: o.worldOf,
            topics: c.topics,
            size: o.size,
            grown,
            child: null,
            limits: grown
                ? SITE_MAP
                : { ...SITE_MAP, travel: "reached", goIn: "own", pan: "own", zoomOut: "year" },
            still: o.still,
            declared: o.declared,
        });
        return { view, at: stop.node };
    });
}

/**
 * Yesterday and today in the child's world, as the first two days of one stretch: the window looks
 * at today, and the day above is only there so the path comes into today from where it really came.
 */
export function rollJournal(c: SampleChild, choice: WorldChoice): Journal {
    const days = c.rollDays();
    const j = journalOf({
        corpus: c.corpus,
        place: { kind: "year" },
        grade: c.first.grade,
        when: String(c.share),
        choice,
        live: null,
        sample: sampleRecord,
    });
    const world = c.todayWorld.id;
    return {
        ...j,
        days,
        next: null,
        terms: 1,
        worlds: () => [world],
        today: days.at(-1),
        bare: !days.length,
        arrive: 0,
        visit: null,
    };
}

/** A visit to a world where it stands, with the sample child's record as far as today. */
export function visitJournal(c: SampleChild, world: World, choice: WorldChoice): Journal {
    return journalOf({
        corpus: c.corpus,
        place: { kind: "world", world },
        grade: null,
        when: String(c.share),
        choice,
        live: null,
        sample: sampleRecord,
    });
}
