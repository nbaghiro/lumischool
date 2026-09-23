// The school as written, with nobody's record, for a grown-up looking at what the school holds
// (.docs/parent-app.md, "The map, for grown-ups"): the map of every world with every place open and
// nobody on it, every day of a year on a world's roll with none done, and where a lesson stands. Only
// the grown-ups' app reads it, so the children's map never carries it (tools/__tests__/first-view.test.ts).
import type { Declared } from "../../engine/motion/world";
import type { Day, MapView, WorldView } from "../../engine/space";
import type { Year } from "../year";
import { apply } from "./choice";
import { topicsIn, type Corpus } from "./lessons";
import type { Journey, Place as Walked } from "./rewards";
import { daysOf, termOf } from "./roll";
import type { Applied } from "./types";
import {
    emptyProgress,
    GROWN_MAP,
    journalOf,
    mapViewOf,
    type Journal,
    type JournalIn,
    type MapIn,
} from "./view";
import {
    gradeNear,
    hostedLessons,
    schoolRun,
    sidePlaces,
    WORLDS,
    worldById,
    yearOf,
} from "./worlds";

/**
 * Every day of a year as the plan writes it, for a roll a grown-up reads with nobody's record: the
 * days `daysOf` would give a child who had done them all, with the same ids, since the roll lays
 * out and draws a day that is there as one that was done, and the children's code knows no other
 * kind of day (tools/__tests__/first-view.test.ts holds its budget). `writtenView` then takes back
 * what "done" would have meant on the view: nothing is lit, no sheet is finished, and the days are
 * numbered rather than dated.
 */
export function daysWritten(year: Year): Day[] {
    const done = Object.fromEntries(
        year.lessons.map((l) => [l.id, { stars: 1 as const, on: "", minutes: 0, right: 0 }]),
    );
    return daysOf(year, { done, current: "", week: 1, unlocked: [] }).days;
}

/**
 * A world's roll as written, from the view `worldViewOf` builds on a written journal: every sheet
 * closed rather than finished, each day tagged by its number, nothing lit and no secret shown, since
 * nothing was done, and no trail, which draws a record's days and has no stop for a written one yet.
 */
export function writtenView(v: WorldView): WorldView {
    return {
        ...v,
        days: v.days.map((d, i) => ({
            ...d,
            label: `Day ${i + 1}`,
            sheets: d.sheets.map((s) => ({ ...s, state: "closed", on: null })),
        })),
        standings: v.standings.map((s, i) => {
            const kind = v.layout.scenery[i]?.kind;
            return kind === "reach" ? { lit: false } : kind === "secret" ? { hide: true } : s;
        }),
        trail: null,
    };
}

/**
 * The school as written, for a grown-up's own map (.docs/parent-app.md, "The map, for grown-ups"):
 * every world of every year and every place off the run, laid out from the curriculum with nobody's
 * record, so it reads with no child added. Every place is open, the whole country is in colour and
 * every way is inked, since there is no child for the colour to follow; nobody stands on it, and each
 * place's note says what it holds rather than what was done there.
 */
export function schoolViewOf(o: {
    corpus: Corpus;
    size: MapIn["size"];
    still: boolean;
    declared?: Declared;
}): MapView {
    const { corpus } = o;
    const applied = new Map<string, Applied>();
    const worldOf = (id: string): Applied => {
        const had = applied.get(id);
        if (had) return had;
        const w = apply(worldById(id), undefined, o.still).world;
        applied.set(id, w);
        return w;
    };
    const yearOfGrade = (g: number): Year => corpus.year(g, "");
    const run = schoolRun();
    const years = [...new Set([...run.map((p) => p.grade), ...corpus.grades])].map(yearOfGrade);
    const on = new Set(run.map((p) => p.world));
    // every world off the run, as `elsewhere` in worlds.ts lists them for the scratchpad's map: the
    // places a track brings a child to, one per year, and each other world where it stands
    const off = [
        ...new Map(
            [
                ...sidePlaces(years),
                ...WORLDS.filter((w) => w.site && w.site.kind !== "track" && !on.has(w.id)).map(
                    (w) => ({
                        world: w.id,
                        grade: gradeNear(w),
                    }),
                ),
            ].map((s) => [s.world, s]),
        ).values(),
    ];
    const marks = {
        done: [],
        state: "begun" as const,
        stamp: null,
        moment: null,
        lit: [],
        followers: [],
    };
    const trip: Journey = {
        places: run.map((p): Walked => {
            const year = yearOfGrade(p.grade);
            return {
                ...p,
                lessons: year.lessons
                    .filter((l) => termOf(year, l.unit) === p.term)
                    .map((l) => l.id),
                ...marks,
            };
        }),
        roads: [],
        here: 0,
        sides: off.map((s): Walked => ({
            grade: s.grade,
            term: 0,
            world: s.world,
            lessons: hostedLessons(worldById(s.world), years).map((l) => l.id),
            ...marks,
        })),
    };
    const view = mapViewOf({
        records: [],
        trip,
        sides: [],
        corpus,
        worldOf,
        topics: topicsIn(corpus),
        size: o.size,
        grown: true,
        child: null,
        limits: GROWN_MAP,
        still: o.still,
        declared: o.declared,
    });
    const held = (i: number): Walked | undefined =>
        i < trip.places.length ? trip.places[i] : trip.sides[i - trip.places.length];
    for (const p of view.places) {
        const w = held(p.i);
        if (!p.shown || !w) continue;
        const n = w.lessons.length;
        p.shown.label = `${p.shown.name}. ${p.shown.when}.`;
        p.shown.notes = [
            n === 1 ? "1 lesson" : n ? `${n} lessons` : "No lessons are written for it yet",
            worldOf(w.world).about,
        ];
    }
    for (const way of view.ways) if (way.state !== "hidden") way.state = "open";
    return {
        ...view,
        here: null,
        reach: {
            circles: [],
            isles: view.country.isles.map((x) => x.node),
            frontier: null,
            known: null,
            edge: view.layout.nodes.length - 1,
            whole: view.country.lands,
        },
    };
}

/**
 * Where a lesson stands in the school: the world of the term it falls in, in its year, which is where a
 * child meets it on their roll. Null for a lesson the curriculum does not have.
 */
export function whereIs(
    corpus: Corpus,
    lesson: string,
): { world: string; grade: number; term: number } | null {
    const f = corpus.lesson(lesson);
    if (!f) return null;
    const year = corpus.year(f.grade, "");
    const def = year.lessons.find((l) => l.id === lesson);
    if (!def) return null;
    const term = termOf(year, def.unit);
    const world = yearOf(f.grade)[term - 1];
    return world === undefined ? null : { world, grade: f.grade, term };
}

/**
 * A visit to a world read as written: `journalOf`'s visit with every day of the year on the roll and
 * no today, which a grown-up reads a world by from their own map. The sample record is not read, and
 * the progress is nothing done, so the map behind it and its moments stay in pencil.
 */
export function journalWritten(o: Omit<JournalIn, "sample" | "live">): Journal {
    const j = journalOf({ ...o, live: null, sample: emptyProgress });
    return {
        ...j,
        progress: emptyProgress(),
        days: j.bare ? [] : daysWritten(j.year),
        next: null,
        today: undefined,
    };
}
