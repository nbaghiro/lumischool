// What a child's page is worked out from: their record and the family's pack, read once when the
// page opens, and the views drawn from them (school/worlds/view.ts) with the child's limits.

import { reads } from "../../engine/ui/reads";
import type { Declared } from "../../engine/motion/world";
import type { PackLesson } from "../../engine/pack";
import type { MapView } from "../../engine/space";
import { onDemand } from "../../engine/ui/art";
import * as client from "../../engine/ui/kid";
import { refsOf, sizeOn } from "../../school/worlds/art";
import { apply, readChoice, termsFor } from "../../school/worlds/choice";
import { corpusFrom, topicsIn, type Corpus } from "../../school/worlds/lessons";
import { savedChoice } from "../../school/family/chosen";
import { nowIn } from "../../school/family/now";
import type { YearRecord } from "../../school/worlds/rewards";
import type { Applied, WorldChoice } from "../../school/worlds/types";
import { NARROW, WIDE } from "../../school/worlds/roll";
import {
    CHILD_MAP,
    emptyProgress,
    journalOf,
    mapViewOf,
    type Journal,
    type Live,
} from "../../school/worlds/view";
import { elsewhere, WORLDS, worldById, yearOf } from "../../school/worlds/worlds";
import type { KidRecord, PackView } from "../../server/api";
import type { Kid } from "../../server/db/schema";

/** A sheet's height on the roll while it is a card rather than the lesson, in world units. */
export const SHEET_HEIGHT = { wide: 560, narrow: 520 };

export interface Loaded {
    kid: Kid;
    record: KidRecord;
    pack: PackView;
    /** Today's lessons, fetched ahead as the page opens so that going in and a short drop both find them. */
    lessons: ReturnType<typeof reads<PackLesson>>;
    corpus: Corpus;
    choice: WorldChoice;
    worldOf: (id: string) => Applied;
    topics: (lesson: string) => string[];
    size: (art: string, params?: Record<string, unknown>) => { w: number; h: number };
    /** The drawings' declared motion, from what was loaded, for the floats the map keeps. */
    declared: Declared;
    /** The day the child's record begins. */
    since: string;
}

/** The family's choice of worlds for this child, each term's as it stood when its first work happened. */
const choiceOf = (kid: Kid, record: KidRecord, corpus: Corpus): WorldChoice =>
    readChoice(savedChoice(record.worlds, yearOf, corpus.grades), kid.name).choice;

/**
 * The child's record and the pack, with the drawings their worlds name loaded once through the
 * catalogue (engine/ui/drawings.ts), or null while the internet is away the first time.
 */
export async function loadChild(kid: Kid, still: boolean): Promise<Loaded | null> {
    const [record, pack] = await Promise.all([client.read(kid.id), client.pack(kid.id)]);
    if ("error" in record || "error" in pack) return null;
    const since = record.start ?? record.today;
    const corpus = corpusFrom(pack.index.lessons, since);
    const choice = choiceOf(kid, record, corpus);
    const { loadDrawings, declaredOf } = await onDemand(() => import("../../engine/ui/drawings"));
    // every world the map draws, not only the child's own years: the places they cannot go to yet are
    // drawn in pencil and dimmed, so their drawings are loaded too (school/worlds/view.ts)
    const applied = new Map<string, Applied>();
    const worldOf = (id: string): Applied => {
        const had = applied.get(id);
        if (had) return had;
        const w = apply(worldById(id), choice.tweaks[id], still).world;
        applied.set(id, w);
        return w;
    };
    const loaded: Loaded = {
        kid,
        record,
        pack,
        lessons: reads((lesson) => JSON.stringify(lesson).length * 2),
        corpus,
        choice,
        worldOf,
        topics: topicsIn(corpus),
        // Lesson JSON does not need art dimensions. This placeholder lets its requests overlap the
        // broad drawing import; the real shelf replaces it before the model is published.
        size: () => ({ w: 0, h: 0 }),
        declared: () => undefined,
        since,
    };
    const refs = refsOf(WORLDS.map((world) => world.id));
    const [shelf] = await Promise.all([
        loadDrawings(refs),
        fetchLessons(loaded, todayOf(loaded)?.lessons ?? []),
    ]);
    loaded.size = sizeOn(shelf);
    loaded.declared = declaredOf;
    return loaded;
}

/**
 * The child's record read again, once everything waiting has been sent, with today's lessons as the
 * record now has them fetched ahead: what the roll and the map are drawn from after a sheet is
 * finished. Null while the record cannot be read.
 */
export async function reloadChild(c: Loaded): Promise<Loaded | null> {
    await sent();
    const record = await client.read(c.kid.id);
    if ("error" in record) return null;
    const next: Loaded = { ...c, record };
    await fetchLessons(next, todayOf(next)?.lessons ?? []);
    return next;
}

/** Resolves once nothing of the child's is waiting to be sent, or the view has ended. */
const sent = (): Promise<void> =>
    new Promise((ok) => {
        let stop = (): void => {};
        stop = client.watch((s) => {
            if (!(s.ended || (s.unsent === 0 && !s.offline))) return;
            ok();
            queueMicrotask(() => stop());
        });
    });

/** The lessons named, from the pack, leaving out any whose file cannot be read just now. */
export async function fetchLessons(c: Loaded, ids: readonly string[]): Promise<PackLesson[]> {
    const read = await Promise.all(
        ids.map((id) =>
            c.lessons
                .read(id, async () => {
                    const facts = c.pack.index.lessons.find((lesson) => lesson.id === id);
                    if (!facts) return null;
                    const lesson = await client.lesson(c.kid.id, c.pack.pack, facts.file);
                    return "error" in lesson ? null : lesson;
                })
                .catch(() => null),
        ),
    );
    return read.filter((l): l is PackLesson => l !== null);
}

/** Every year's record: the child stands in their own year, so a year's own next lesson is nobody's place in another. */
const recordsOf = (c: Loaded): YearRecord[] =>
    c.corpus.grades.map((grade) => {
        const saved = c.record.years.find((y) => y.grade === grade);
        const progress = saved?.progress ?? emptyProgress();
        return {
            grade,
            year: c.corpus.year(grade, c.kid.name),
            progress: grade === c.kid.grade ? progress : { ...progress, current: "" },
            worlds: termsFor(c.choice, grade),
            tracks: c.record.tracks,
            // where the plan's days put the child, which may be any track's lesson, in their own year only
            ...(grade === c.kid.grade ? { now: nowIn(c.record) } : {}),
        };
    });

/** The child's map, with the family's choice of worlds applied. */
export const mapOf = (c: Loaded): MapView => {
    const records = recordsOf(c);
    return mapViewOf({
        records,
        sides: elsewhere(
            records.flatMap((r) => r.worlds.map((world) => ({ world }))),
            records.map((r) => r.year),
        ),
        corpus: c.corpus,
        worldOf: c.worldOf,
        topics: c.topics,
        size: c.size,
        grown: false,
        child: { name: c.kid.name, since: c.since },
        grade: c.kid.grade,
        limits: CHILD_MAP,
        declared: c.declared,
    });
};

/** A subject place keeps the same live record and plan as the yearly journal. */
export function ownJournal(c: Loaded, world: string | null = null): Journal {
    const own = c.record.years.find((y) => y.grade === c.kid.grade);
    const live: Live = {
        grade: c.kid.grade,
        year: c.corpus.year(c.kid.grade, c.kid.name),
        progress: own?.progress ?? emptyProgress(),
        today: c.record.today,
        before: c.record.years
            .filter((y) => y.grade < c.kid.grade)
            .map((y) => ({ year: c.corpus.year(y.grade, c.kid.name), progress: y.progress })),
        tracks: c.record.tracks,
        now: nowIn(c.record),
    };
    return journalOf({
        corpus: c.corpus,
        place:
            world && worldById(world).site?.kind === "track"
                ? { kind: "world", world: worldById(world) }
                : { kind: "year" },
        grade: c.kid.grade,
        when: null,
        choice: c.choice,
        live,
        sample: emptyProgress,
    });
}

/** Today's lessons, and the day they are planned for, or null when today holds none. */
export function todayOf(c: Loaded): { date: string; lessons: string[] } | null {
    const today = ownJournal(c).today;
    return today ? { date: today.date, lessons: today.lessons } : null;
}

/** The sheet's width on the roll, in world units. */
export const sheetWidth = (narrow: boolean): number => (narrow ? NARROW : WIDE).sheet;
