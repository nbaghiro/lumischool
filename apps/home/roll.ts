// A child's roll as a grown-up reads it on the home: the child's own year in their own worlds, as the
// child's view lays it out, with the grown-up's limits (school/worlds/view.ts, GROWN_WORLD), from the
// record the server folds for a parent. The drawings its worlds name are loaded once per child.

import type { WorldView } from "../../engine/space";
import { loadDrawings } from "../../engine/ui/drawings";
import type { LessonFacts } from "../../engine/pack";
import { nowIn } from "../../school/family/now";
import { refsOf, sizeOn } from "../../school/worlds/art";
import { apply, termsFor } from "../../school/worlds/choice";
import { corpusFrom, topicsIn } from "../../school/worlds/lessons";
import { NARROW } from "../../school/worlds/roll";
import type { Applied } from "../../school/worlds/types";
import {
    emptyProgress,
    GROWN_WORLD,
    journalOf,
    worldViewOf,
    type Live,
} from "../../school/worlds/view";
import { worldById } from "../../school/worlds/worlds";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { choiceFor } from "./worlds";

/** A sheet's height on the grown-up's roll, where each sheet is the grown-up's card, in the roll's units. */
export const CARD = 620;
/** A sheet's width on a card's column, which is laid out as a phone's roll. */
export const SHEET = NARROW.sheet;

/** The world a roll's term is in, and the roll itself at a width. */
export interface Roll {
    /** `height` is what each card measured, in the roll's units; `CARD` stands in until one is drawn. */
    view: (narrow: boolean, height: (lesson: string) => number) => WorldView;
    /** The world today is in, for the words on the button that opens the roll. */
    now: Applied;
}

/** A child's roll, once the drawings its worlds name are loaded. */
export async function rollFor(o: {
    kid: Kid;
    record: GrownRecord;
    lessons: readonly LessonFacts[];
    still: boolean;
}): Promise<Roll> {
    const { kid, record } = o;
    const choice = choiceFor(kid, record);
    const since = record.start ?? record.today;
    const corpus = corpusFrom(o.lessons, since);
    const shelf = await loadDrawings(
        refsOf(record.years.flatMap((y) => termsFor(choice, y.grade))),
    );
    const size = sizeOn(shelf);
    const applied = new Map<string, Applied>();
    const worldOf = (id: string): Applied => {
        const had = applied.get(id);
        if (had) return had;
        const w = apply(worldById(id), choice.tweaks[id], o.still).world;
        applied.set(id, w);
        return w;
    };
    const own = record.years.find((y) => y.grade === kid.grade);
    const live: Live = {
        grade: kid.grade,
        year: corpus.year(kid.grade, kid.name),
        progress: own?.progress ?? emptyProgress(),
        today: record.today,
        before: record.years
            .filter((y) => y.grade < kid.grade)
            .map((y) => ({ year: corpus.year(y.grade, kid.name), progress: y.progress })),
        tracks: record.tracks,
        now: nowIn(record),
    };
    const journal = journalOf({
        corpus,
        place: { kind: "year" },
        grade: kid.grade,
        when: null,
        choice,
        live,
        sample: emptyProgress,
    });
    const terms = termsFor(choice, kid.grade);
    return {
        now: worldOf(terms[(journal.today?.term ?? 1) - 1] ?? terms[0] ?? "meadow"),
        view: (narrow, height) =>
            worldViewOf({
                journal,
                choice,
                corpus,
                worldOf,
                topics: topicsIn(corpus),
                height,
                size,
                narrow,
                grown: true,
                limits: GROWN_WORLD,
            }),
    };
}
