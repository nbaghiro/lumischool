// The worlds as a grown-up looks at them with nobody's record (.docs/parent-app.md, "The map, for
// grown-ups"): the school as written from the family's pack, a world's roll of every lesson it holds,
// and a lesson's sheet as written. The map screen (map.tsx) and the overlay a lesson page opens
// (engine/ui/overlay.tsx) both read it, and neither records anything.

import type { Declared } from "../../engine/motion/world";
import type { LessonFacts, Level, PackLesson } from "../../engine/pack";
import type { Scene } from "../../engine/scene";
import type { SceneDrawer } from "../../engine/ui/scene";
import type { MapView, WorldView } from "../../engine/space";
import * as api from "../../engine/ui/api";
import { declaredOf, loadDrawings } from "../../engine/ui/drawings";
import type { Measured } from "../../engine/ui/lesson";
import type { OverlaySource } from "../../engine/ui/overlay";
import type { ReadingSource } from "../../engine/ui/reading";
import { subjectFacts } from "../../school/tracks";
import { refsOf, sizeOn } from "../../school/worlds/art";
import { apply, readChoice } from "../../school/worlds/choice";
import { corpusFrom, topicsIn, type Corpus } from "../../school/worlds/lessons";
import { NARROW, WIDE } from "../../school/worlds/roll";
import type { Applied } from "../../school/worlds/types";
import { GROWN_WORLD, worldViewOf } from "../../school/worlds/view";
import { journalWritten, schoolViewOf, whereIs, writtenView } from "../../school/worlds/written";
import { WORLDS, worldById } from "../../school/worlds/worlds";
import type { PackView } from "../../server/api";
import { mapHref, whereIn, type WhereOnMap } from "./routes";

export { mapHref, whereIn };

/** The school as written, read once from the pack with every world's drawings loaded. */
export interface School {
    pack: PackView;
    corpus: Corpus;
    worldOf: (id: string) => Applied;
    topics: (lesson: string) => string[];
    size: (art: string, params?: Record<string, unknown>) => { w: number; h: number };
    declared: Declared;
    map: MapView;
}

/** Where on the map a look is, with a lesson named alone put in the world it is met in, or on the map when the school has no such lesson. */
export function inWorld(s: School, at: WhereOnMap): WhereOnMap {
    if (at.world || !at.lesson) return at;
    const world = worldOfLesson(s, at.lesson);
    return world ? { world, lesson: at.lesson } : { world: null, lesson: null };
}

/** The world a place on the map is of, by its index in the view. */
export const worldAt = (map: MapView, place: number): string | null =>
    map.places[place]?.shown?.world ?? null;

/** The place on the map a world stands at, or null for a world the map does not draw. */
export function placeOf(map: MapView, world: string): number | null {
    const p = map.places.find((x) => x.shown?.world === world);
    return p ? p.i : null;
}

/**
 * The school as written, from the pack, with the drawings every world names loaded first, since the
 * views are built from their sizes.
 */
export async function schoolOf(pack: PackView, still: boolean): Promise<School> {
    const corpus = corpusFrom(pack.index.lessons, new Date().toISOString().slice(0, 10));
    const shelf = await loadDrawings(refsOf(WORLDS.map((w) => w.id)));
    const size = sizeOn(shelf);
    const applied = new Map<string, Applied>();
    const worldOf = (id: string): Applied => {
        const had = applied.get(id);
        if (had) return had;
        const w = apply(worldById(id), undefined, still).world;
        applied.set(id, w);
        return w;
    };
    return {
        pack,
        corpus,
        worldOf,
        topics: topicsIn(corpus),
        size,
        declared: declaredOf,
        map: schoolViewOf({ corpus, size, still, declared: declaredOf }),
    };
}

/** The school read once per pack, for the looks a page opens over itself, since the drawings and the map are the same each time. */
const schools = new Map<string, Promise<School>>();
export function schoolOnce(pack: PackView, still: boolean): Promise<School> {
    let had = schools.get(pack.pack);
    if (!had) {
        had = schoolOf(pack, still);
        schools.set(pack.pack, had);
        void had.catch(() => {
            // Do not cache a rejected build forever after a transient drawing/chunk failure.
            if (schools.get(pack.pack) === had) schools.delete(pack.pack);
        });
    }
    return had;
}

/** The sheet's width on the roll, in world units. */
export const sheetWidth = (narrow: boolean): number => (narrow ? NARROW : WIDE).sheet;

/** A sheet's height on a roll while it is a card rather than the lesson, in the roll's units. */
export const CARD = 620;

/**
 * A world's roll as written: a visit to it where it stands, with every day of its year on the roll
 * and nothing done, arriving at the world's own term. `height` is what each sheet measured, with
 * `CARD` standing in until one is drawn.
 */
export function worldWritten(
    s: School,
    world: string,
    o: { narrow: boolean; height: (lesson: string) => number | null },
): WorldView {
    // the worlds' own terms, with nobody's tweaks, which is what a choice nobody has made reads as
    const { choice } = readChoice(null, "");
    const journal = journalWritten({
        corpus: s.corpus,
        place: { kind: "world", world: worldById(world) },
        grade: null,
        when: null,
        choice,
    });
    return writtenView(
        worldViewOf({
            journal,
            choice,
            corpus: s.corpus,
            worldOf: s.worldOf,
            topics: s.topics,
            height: (lesson) => o.height(lesson) ?? CARD,
            size: s.size,
            narrow: o.narrow,
            grown: true,
            limits: GROWN_WORLD,
        }),
    );
}

/** The world a lesson is met in, for opening a lesson where a child sees it. */
export const worldOfLesson = (s: School, lesson: string): string | null =>
    whereIs(s.corpus, lesson)?.world ?? null;

/** A lesson's file from the pack, kept once read, so paper that comes near again is not fetched twice. */
const lessons = new Map<string, Promise<PackLesson | null>>();
export function lessonOf(s: School, id: string): Promise<PackLesson | null> {
    const key = `${s.pack.pack}|${id}`;
    let had = lessons.get(key);
    if (!had) {
        const facts = s.pack.index.lessons.find((l) => l.id === id);
        had = facts
            ? api
                  .packLesson(s.pack.pack, facts.file)
                  .then((l) => {
                      if (!("error" in l)) return l;
                      // a read that failed is asked for again next time, not remembered as no lesson
                      lessons.delete(key);
                      return null;
                  })
                  .catch(() => {
                      lessons.delete(key);
                      return null;
                  })
            : Promise.resolve(null);
        lessons.set(key, had);
    }
    return had;
}

/** The drawer of a pack's scenes, with the drawings the scenes given name loaded first. */
const drawer = (of: readonly Scene[]): Promise<SceneDrawer> =>
    import("../../engine/ui/scene").then((m) => m.scenes(of));

/**
 * A lesson's sheet as written, drawn and measured for a roll to lay where it puts it: with `key`, the
 * answers and the notes for grown-ups on it, as Explore reads it; without, the sheet as a child has
 * it, with nothing filled in. Null while the lesson's file cannot be read.
 */
export async function sheetWritten(
    s: School,
    lesson: string,
    o: { level: Level; key: boolean; narrow: boolean; measureIn: HTMLElement },
): Promise<Measured | null> {
    const [read, { lookSheet }, { scenesIn }] = await Promise.all([
        lessonOf(s, lesson),
        import("../../engine/ui/lesson"),
        import("../../engine/ui/scene"),
    ]);
    if (!read) return null;
    const draw = await drawer(scenesIn(read));
    return lookSheet({
        lesson: read,
        level: o.level,
        label: subjectFacts(read.subject).title,
        key: o.key,
        width: sheetWidth(o.narrow),
        narrow: o.narrow,
        draw,
        measureIn: o.measureIn,
    });
}

/** A lesson's first drawing from the pack, drawn into a card's box on the roll. */
const pictureOf = (s: School, f: LessonFacts) => async (host: HTMLElement) => {
    if (!f.first) return;
    const scene = await api.packScene(s.pack.pack, f.first);
    if ("error" in scene) return;
    const svg = (await drawer([scene.scene]))(host, scene.scene, { seed: 11 });
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    host.replaceChildren(svg);
};

/**
 * A world read as written (engine/ui/reading.tsx): its roll, each sheet at the level and with the
 * key the reader asked for, and each card's words from the pack's index.
 */
export function readingOf(
    s: School,
    world: string,
    o: { level: Level; key: boolean },
): ReadingSource {
    return {
        world: (r) => worldWritten(s, world, r),
        sheet: (lesson, r) => sheetWritten(s, lesson, { ...o, ...r }),
        card(lesson) {
            const f = s.pack.index.lessons.find((l) => l.id === lesson);
            return {
                label: subjectFacts(f?.subject ?? "maths").title,
                note: f?.unit === null || f?.unit === undefined ? "" : `Unit ${f.unit}`,
                ...(f?.first ? { picture: pictureOf(s, f) } : {}),
            };
        },
    };
}

/** The school as the overlay looks at it (engine/ui/overlay.tsx): a lesson as a child sees it, at a level, with nothing filled in. */
export function overlayOf(s: School, o: { level: Level }): OverlaySource {
    return {
        map: () => s.map,
        reading: (world) => readingOf(s, world, { level: o.level, key: false }),
        nameOf: (world) => s.worldOf(world).name,
        whereIs: (lesson) => worldOfLesson(s, lesson),
    };
}
