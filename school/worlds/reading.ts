import type { DayView, SheetView, Standing, WorldLimits, WorldView } from "../../engine/space";
import type { Applied, WorldChoice } from "./types";
import type { Corpus } from "./lessons";
import { journey, type Place as Walked } from "./rewards";
import { NARROW, WIDE } from "./roll";
import { layoutRoll } from "./roll-layout";
import { reachesFor, standingOf, trailViewOf, rollViewOf, type Journal } from "./view";

export interface WorldIn {
    journal: Journal;
    choice: WorldChoice;
    corpus: Corpus;
    worldOf: (id: string) => Applied;
    topics: (lesson: string) => string[];
    /** A sheet's measured height in world units, which the page measures before it lays the roll out. */
    height: (lesson: string) => number;
    size: (art: string) => { w: number; h: number };
    /** A phone's narrow roll, where the lesson reflows. */
    narrow: boolean;
    grown: boolean;
    /** The term a child arrives at from the map, whose world the view opens on with the guide's line. */
    arriveAt?: number;
    /** Project an explicit visit to its original term; the annual record remains intact. */
    visitOnly?: boolean;
    limits: WorldLimits;
}

/**
 * A year's roll as one page draws it, opening on the world the journal visits or on today: its worlds'
 * pictures, the roll laid out, each day's sheets, and how the record has left each drawing beside the
 * path. Nothing a viewer who looks or previews can do is in it, since the limits say so, and a view
 * that records nothing carries no kid.
 */
export function worldViewOf(o: WorldIn): WorldView {
    const { journal: j, worldOf } = o;
    const worlds = j.worlds(o.choice);
    const worldAt = (term: number): string => worlds[term - 1] ?? worlds[0] ?? "meadow";
    const places = j.bare
        ? []
        : journey(
              [
                  {
                      grade: j.grade,
                      year: j.year,
                      progress: j.progress,
                      worlds,
                      tracks: j.tracks,
                  },
              ],
              worldOf,
              o.topics,
              [],
              j.grade,
          ).places;
    const placeOfTerm = (term: number): Walked | undefined => places.find((p) => p.term === term);
    const term = j.visit ? j.arrive : (o.arriveAt ?? j.today?.term ?? 1);
    const onlyTerm = o.visitOnly ? term : undefined;
    const shownDays = onlyTerm === undefined ? j.days : j.days.filter((d) => d.term === onlyTerm);
    const shownNext = onlyTerm === undefined || j.next?.term === onlyTerm ? j.next : null;
    const layout = layoutRoll(
        {
            days: shownDays,
            next: shownNext,
            ...(onlyTerm === undefined ? {} : { onlyTerm }),
            // a child with no day yet walks the world they went into, and not the year's others behind it
            terms: j.days.length || j.bare ? j.terms : Math.max(1, term),
            worldOf: worldAt,
            height: o.height,
            scenery: (id) => {
                const w = worldOf(id);
                return { landmarks: w.landmarks, creatures: w.creatures };
            },
            size: o.size,
            reach: reachesFor(worldOf, o.topics),
            story: (id) => {
                const w = worldOf(id);
                return { moment: w.chapter.moment.art, secret: w.chapter.secret.art };
            },
            // a child who has not had their first lesson has no day to lay a row from, and a roll with
            // no rows draws no world at all, so the term they went into is walked bare instead
            bare: j.bare || !shownDays.length,
        },
        o.narrow ? NARROW : WIDE,
    );
    const sheetOf = (id: string, state: SheetView["state"]): SheetView => ({
        lesson: id,
        title: o.corpus.lesson(id)?.title ?? id,
        state,
        on: j.progress.done[id]?.on ?? null,
    });
    const days: DayView[] = layout.rows.map((row) => {
        const followers = placeOfTerm(row.day.term)?.followers ?? [];
        return {
            date: row.day.date,
            sheets: row.day.lessons.map((id) => sheetOf(id, row.day.state)),
            followers: followers.filter((f) => f.on <= row.day.date).map((f) => f.art),
            joined: followers.filter((f) => f.on === row.day.date).map((f) => f.art),
        };
    });
    const standings: Standing[] = layout.scenery.map((s) =>
        standingOf({ s, layout, worldOf, placeOf: placeOfTerm, grown: o.grown }),
    );
    const open = j.visit ? j.visit.id : worldAt(term);
    const arrival = j.visit
        ? { term: j.arrive, says: j.visit.arrive }
        : o.arriveAt !== undefined
          ? { term: o.arriveAt, says: worldOf(worldAt(o.arriveAt)).arrive }
          : null;
    const trail = j.bare
        ? null
        : trailViewOf({
              journal: j,
              term,
              world: worldOf(worldAt(term)),
              place: placeOfTerm(term),
              corpus: o.corpus,
              topics: o.topics,
              size: o.size,
              narrow: o.narrow,
              grown: o.grown,
          });
    return rollViewOf({
        layout,
        worlds,
        worldOf,
        size: o.size,
        days,
        next: shownNext ? sheetOf(shownNext.id, "closed") : null,
        standings,
        open,
        arrival,
        trail,
        card: j.bare
            ? { label: "Still to come", says: "The lessons here are still being written." }
            : shownDays.length
              ? undefined
              : { label: "Your first day", says: "Your first lesson will be here." },
        limits: o.limits,
    });
}
