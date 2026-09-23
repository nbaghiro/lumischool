// What a view of the worlds holds: the whole map, a child's year, one world where it stands, each
// worked out from what a link asks for and a record. Nothing here draws or touches the page, so the
// canvas, the page and the poster read one answer. The sample child's made-up record (sample.ts) and
// the worlds to come, which are the scratchpad's, come in as inputs.
import type { Year } from "../year";
import type { Progress } from "../record/record";
import type { Declared } from "../../engine/motion/world";
import {
    clamp,
    known,
    type ArtRef,
    type Day,
    type DayView,
    type MapLife,
    type MapLimits,
    type MapPlace,
    type MapReach,
    type MapRoad,
    type MapSail,
    type MapView,
    type MapWay,
    type MapRegion,
    type Next,
    type PlaceShown,
    type RollLayout,
    type Scenery,
    type SheetView,
    type Standing,
    type StopView,
    type Stretch,
    type StretchView,
    type TrailView,
    type WorldLimits,
    type WorldPicture,
    type WorldView,
    type Overworld,
    type Pt,
    type Rect,
    type Terrain,
    wet,
} from "../../engine/space";
import { artById, RIDERS } from "./art";
import { apply, termsFor } from "./choice";
import { FURNITURE_ON, SAILS, SIGHTS, SLOTS, slotOf, REGIONS } from "./geography";
import { corpusFrom, type Corpus } from "./lessons";
import { bobOf, framesOf, lifeOn, RIDES, TURNING } from "./life";
import { layoutMap, ownLand } from "./overworld";
import { placeOf } from "./places";
import {
    journey,
    nowOf,
    reachOf,
    tracksOn,
    type Journey,
    type Place as Walked,
    type TrackPlan,
    type YearRecord,
} from "./rewards";
import { daysOf, greetAt, layoutRoll, nameBox, NARROW, skyPlaces, termsIn, WIDE } from "./roll";
import { edgeOf, landOf, reachOf as reachedOf, terrainOf } from "./terrain";
import { dayInWords, layoutTrail, slotsOf, type Slot } from "./trail";
import type { Applied, Site, World, WorldChoice } from "./types";
import {
    everyYear,
    findWorld,
    outsideYear,
    schoolRun,
    siteOf,
    standsWhen,
    trackYear,
    worldById,
    type Side,
} from "./worlds";

export const longDate = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });
export const shortDate = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });

/** Nothing done and nobody here: a year the child has not reached. */
export const emptyProgress = (): Progress => ({ done: {}, current: "", week: 1, unlocked: [] });

/** A made-up record for one year, for the child a page shows when nobody is signed in. */
export type SampleRecord = (year: Year, at: { grade: number; when: When }) => Progress;

/** Where a view is: the whole map, the child's own year, one world, the worlds to come, or a scene further off. */
export type Place =
    { kind: "map" } | { kind: "year" } | { kind: "world"; world: World } | { kind: "to-come" };

/**
 * A place from a link: "map", "year", "to-come", or a world's id or a word of its name
 * (`marsh`). Anything else is the child's own year.
 */
export function placeFrom(q: string): Place {
    const k = q.trim().toLowerCase();
    if (k === "map") return { kind: "map" };
    if (k === "to-come") return { kind: "to-come" };
    if (!k || k === "year") return { kind: "year" };
    const world = findWorld(k);
    return world ? { kind: "world", world } : { kind: "year" };
}

/** How a link names a place. */
export const placeKey = (p: Place): string => (p.kind === "world" ? p.world.id : p.kind);

/** How far through the year the made-up record is: a share of it, the end of a term, or all of it. */
export type When =
    { kind: "share"; share: number } | { kind: "term"; term: number } | { kind: "done" };

/** A point in the year from a link: `1` for the year finished, `t1` or `t2` for the end of a term, or a share. */
export function whenFrom(q: string | null, fallback: number): When {
    if (q === "1") return { kind: "done" };
    if (q === "t1" || q === "t2") return { kind: "term", term: Number(q.slice(1)) };
    const n = q === null || q === "" ? fallback : Number(q);
    return { kind: "share", share: clamp(Number.isFinite(n) && n > 0 ? n : 0.5, 0.05, 0.95) };
}

export const whenKey = (w: When): string =>
    w.kind === "done" ? "1" : w.kind === "term" ? `t${w.term}` : String(w.share);

/**
 * How far through the year a view opens when its link does not say: halfway through, or for a visit
 * to a world that stands in a term, partway into that term, so the world is there with a day in it
 * rather than faded as a world not reached yet. `grade` picks the term of a world a family may choose
 * for more than one.
 */
export function whenByDefault(site: Site | null, grade: number | null): number {
    const at =
        site?.kind === "choice"
            ? (site.terms.find((t) => t.grade === grade) ?? site.terms[0])
            : site?.kind === "term"
              ? site
              : undefined;
    return at ? (at.term - 0.45) / 3 : 0.5;
}

/**
 * A child chosen on this tablet: their year, their own record and their plan, worked out from their
 * log, with each earlier year's record from the same log.
 */
export interface Live {
    grade: number;
    year: Year;
    progress: Progress;
    today: string;
    before: { year: Year; progress: Progress }[];
    tracks: TrackPlan;
    /** The lessons the plan's days say the child is on in their own year (`YearRecord.now`). */
    now?: readonly string[];
}

/** A signed-in child's record for one year: their own, from their log. An earlier year with no work in it has nothing done, and nobody stands in a year behind them. */
function liveRecord(live: Live, grade: number): Progress {
    if (grade === live.grade) return live.progress;
    const had = grade < live.grade ? live.before.find((b) => b.year.grade === grade) : undefined;
    return had ? { ...had.progress, current: "" } : emptyProgress();
}

/** A signed-in child’s record for a place off the run: every lesson it holds that the child has finished, in any year, and the first still to do there. */
function trackRecord(live: Live, track: Year): Progress {
    const all = [live.progress, ...live.before.map((b) => b.progress)],
        done: Progress["done"] = {};
    for (const l of track.lessons) {
        const had = all.find((p) => p.done[l.id])?.done[l.id];
        if (had) done[l.id] = had;
    }
    return { ...live.progress, done, current: track.lessons.find((l) => !done[l.id])?.id ?? "" };
}

export interface JournalIn {
    corpus: Corpus;
    place: Place;
    /** The grade a link asks for, which a visit to a world of one year overrides. */
    grade: number | null;
    when: string | null;
    choice: WorldChoice;
    /** A tablet's child, for the child's own year; never for a visit. */
    live: Live | null;
    /** The sample child's record, for a page with nobody signed in. */
    sample: SampleRecord;
}

/** What a year or a visit holds: its year, its record, its days and the worlds its terms are in. */
export interface Journal {
    /** The world a grown-up is visiting, or null for the child's own year. */
    visit: World | null;
    /** The signed-in child whose record this is, or null for the sample child. */
    live: Live | null;
    /** What the record's plan says about tracks; the sample's says nothing, which is every track. */
    tracks: TrackPlan;
    site: Site | null;
    /** For a world a family chooses for a term, the term this visit puts it in. */
    choiceAt: { grade: number; term: number } | null;
    /** The year a visited world stands in when the corpus has no lessons for it: the garden's, or the fifth. */
    outside: number | null;
    /**
     * A year outside the four is its own grade, so the map behind a visit to the fifth year has the
     * first four finished and the garden's has nothing reached; a track place is grade 0, so the map
     * behind it is the map before any year.
     */
    grade: number;
    when: When;
    /** A track place's lessons, as a year of their own. */
    track: Year | null;
    year: Year;
    /** A roll with no lessons on it yet, whose worlds are walked with an empty path. */
    bare: boolean;
    progress: Progress;
    days: Day[];
    next: Next | null;
    terms: number;
    /** The term a visit arrives at, and 0 for the child's own year. */
    arrive: number;
    today: Day | undefined;
    /** The year's worlds in term order under a family's choice, with a visit put where it stands. */
    worlds(choice: WorldChoice): string[];
    /** What a stretch's sky says above its world's name. */
    termLabel(term: number): string;
}

const capital = (s: string): string => (s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s);

/**
 * A grown-up visiting a world, whatever the child's year has reached, sees it where it stands, for
 * that visit only: in its term of its year, in the term a family could choose it for, or on a roll of
 * its own holding the lessons its track brings. A world whose year or track has no lessons yet is
 * walked with an empty path that says so. Without a visit this is the child's own year.
 */
export function journalOf(o: JournalIn): Journal {
    const { corpus, live, choice } = o;
    const grades = corpus.grades;
    const visit = o.place.kind === "world" ? o.place.world : null;
    const site = visit ? siteOf(visit.id) : null;
    const choiceAt =
        site?.kind === "choice"
            ? (site.terms.find((t) => t.grade === o.grade) ?? site.terms[0] ?? null)
            : null;
    const outside = site?.kind === "term" && !grades.includes(site.grade) ? site.grade : null;
    const grade =
        site?.kind === "track"
            ? 0
            : live
              ? live.grade
              : outside !== null
                ? outside
                : site?.kind === "term"
                  ? site.grade
                  : choiceAt
                    ? choiceAt.grade
                    : o.grade !== null && grades.includes(o.grade)
                      ? o.grade
                      : (grades[0] ?? 1);
    const when = whenFrom(o.when, visit ? whenByDefault(site, o.grade) : 0.5);
    const track =
        visit && site?.kind === "track"
            ? trackYear(
                  visit,
                  live ? [live.year] : grades.map((g) => corpus.year(g, choice.child)),
                  choice.child,
              )
            : null;
    const worlds = (c: WorldChoice): string[] => {
        if (outside !== null) return outsideYear(outside);
        if (track && visit) return [visit.id];
        const own = termsFor(c, grade);
        return choiceAt && visit
            ? own.map((w, i) => (i === choiceAt.term - 1 ? visit.id : w))
            : own;
    };
    const year: Year =
        track ??
        (live
            ? live.year
            : outside !== null
              ? {
                    child: choice.child,
                    grade: outside,
                    title: `Year ${outside}`,
                    started: "2026-07-27",
                    units: [],
                    lessons: [],
                }
              : corpus.year(grade, choice.child));
    const bare = !year.lessons.length;
    const progress = bare
        ? emptyProgress()
        : live
          ? track
              ? trackRecord(live, track)
              : live.progress
          : o.sample(year, { grade, when });
    const plan = tracksOn(live?.tracks ?? []),
        onPlan = (id: string) =>
            !plan || plan.has(year.lessons.find((l) => l.id === id)?.subject ?? "maths");
    const { days, next } = bare
        ? { days: new Array<Day>(), next: null }
        : daysOf(
              year,
              progress,
              onPlan,
              live
                  ? track
                      ? (
                            nowOf(live.year, live.progress, live.tracks, live.now) ??
                            daysOf(live.year, live.progress).days.find((d) => d.state === "today")
                                ?.lessons ??
                            []
                        ).filter((id) => year.lessons.some((lesson) => lesson.id === id))
                      : nowOf(year, progress, live.tracks, live.now)
                  : undefined,
          );
    // a child's own days carry the dates they were done on, and today is today
    if (live)
        for (const d of days)
            d.date =
                d.state === "today"
                    ? live.today
                    : (progress.done[d.lessons[0] ?? ""]?.on ?? d.date);
    const terms = outside !== null ? outsideYear(outside).length : track ? 1 : termsIn(year);
    const arrive = !visit
        ? 0
        : site?.kind === "term"
          ? outside !== null
              ? outsideYear(outside).indexOf(visit.id) + 1
              : site.term
          : choiceAt
            ? choiceAt.term
            : 1;
    const termLabel = (term: number): string =>
        track && visit
            ? everyYear(visit)
            : outside === 0
              ? "Before the first year"
              : outside !== null
                ? `Year ${outside}, term ${term}`
                : `Term ${term}`;
    return {
        visit,
        live,
        tracks: live?.tracks ?? [],
        site,
        choiceAt,
        outside,
        grade,
        when,
        track,
        year,
        bare,
        progress,
        days,
        next,
        terms,
        arrive,
        today: days.find((d) => d.state === "today") ?? days.at(-1),
        worlds,
        termLabel,
    };
}

/**
 * Every year's record, for the map: the journal's own year as it is, and each other year from the
 * same child. A signed-in child's come from their log, so a year with no work in it is not walked;
 * the sample child's are made up by `sampleRecord`.
 */
export function recordsAll(
    corpus: Corpus,
    j: Journal,
    choice: WorldChoice,
    sample: SampleRecord,
): YearRecord[] {
    return corpus.grades.map((g) => {
        if (g === j.grade)
            return {
                grade: g,
                year: j.year,
                progress: j.progress,
                worlds: j.worlds(choice),
                tracks: j.tracks,
                ...(j.live?.now && !j.track ? { now: j.live.now } : {}),
            };
        const year = corpus.year(g, choice.child);
        const progress = j.live
            ? liveRecord(j.live, g)
            : sample(year, { grade: j.grade, when: j.when });
        return { grade: g, year, progress, worlds: termsFor(choice, g), tracks: j.tracks };
    });
}

/** The first of a world's reaches, in the world's order, that one of a day's lessons holds, and which sheet it was. */
export function reachesFor(worldOf: (id: string) => World, topics: (id: string) => string[]) {
    return (day: Day, worldId: string): { art: string; says: string; sheet: number } | null => {
        for (const r of worldOf(worldId).reaches) {
            const sheet = day.lessons.findIndex((id) => reachOf({ reaches: [r] }, topics(id)));
            if (sheet >= 0) return { art: r.art, says: r.says, sheet };
        }
        return null;
    };
}

/**
 * How the record has left a drawing beside the path: a landmark beside a finished day is lit by it and
 * one beside today waits for today's work; the moment is inked when the term's last lesson is done;
 * a secret is there beside a finished day. A grown-up is told what did each.
 */
export function standingOf(o: {
    s: Scenery;
    layout: RollLayout;
    worldOf(id: string): World;
    placeOf(term: number): Walked | undefined;
    grown: boolean;
}): Standing {
    const { s, grown } = o;
    const row = o.layout.rows[s.row];
    if (!row) return {};
    const w = o.worldOf(row.world),
        place = o.placeOf(row.day.term);
    if (s.kind === "reach")
        return row.day.state === "done" ? { lit: true, on: row.day.date } : { lit: false };
    if (s.kind === "moment") return momentOf(w, place, grown);
    if (s.kind === "secret") {
        if (row.day.state !== "done") return { hide: true };
        return {
            says: w.chapter.secret.says,
            note: grown ? `A secret, there since ${shortDate(row.day.date)}.` : undefined,
        };
    }
    return {};
}

/** How the record has left a world's moment: inked on the day the term's last lesson was finished, in pencil until then. */
function momentOf(w: World, place: Walked | undefined, grown: boolean): Standing {
    const m = w.chapter.moment,
        inked = place?.state === "done";
    const note = !grown
        ? undefined
        : inked && place?.moment
          ? `Inked ${shortDate(place.moment)}, when the last lesson here was finished.`
          : "Inks when the last lesson of this term is finished.";
    return {
        inked,
        ...(inked && place?.moment ? { on: place.moment } : {}),
        params: inked ? m.params : undefined,
        says: inked ? m.says : "",
        note,
    };
}

/**
 * One world of the run in words: what its button says, the same words after its name (`says`), and
 * what a grown-up reads under it.
 */
export function describe(o: {
    trip: Journey;
    i: number;
    worldOf(id: string): World;
    corpus: Corpus;
    grown: boolean;
}): { label: string; says: string; notes: string[]; state: string } {
    const { trip, i, corpus } = o;
    const side = i >= trip.places.length,
        p = trip.places[i] ?? trip.sides[i - trip.places.length];
    if (!p) return { label: "", says: "", notes: [], state: "" };
    const w = o.worldOf(p.world);
    const state = side
        ? p.state === "done"
            ? "finished"
            : p.stamp
              ? "you have been here"
              : "not been to yet"
        : p.state === "done"
          ? "finished"
          : p.state === "here"
            ? "you are here"
            : p.state === "begun"
              ? "begun, and left for later"
              : "not reached yet";
    // a child's map is places and their names; a grown-up reads it by years
    const bits = [
        o.grown
            ? side
                ? `${w.name}, ${standsWhen(w).toLowerCase()}`
                : `${w.name}, year ${p.grade} term ${p.term}`
            : w.name,
        capital(state),
    ];
    if (p.stamp) bits.push(`Stamped ${longDate(p.stamp)}`);
    if (p.moment) bits.push(w.chapter.moment.says.replace(/\.$/, ""));
    const notes = [
        p.lessons.length
            ? `${p.done.length} of ${p.lessons.length} lessons finished`
            : "No lessons are written for it yet",
    ];
    if (p.stamp)
        notes.push(
            `Stamped ${shortDate(p.stamp)}, by ${corpus.lesson(p.done[0] ?? "")?.title ?? "the first lesson here"}`,
        );
    for (const x of p.lit)
        notes.push(
            `${artById(x.art)?.title ?? x.art} lit ${shortDate(x.on)}, by ${corpus.lesson(x.lesson)?.title ?? x.lesson}`,
        );
    for (const x of p.followers)
        notes.push(
            `${artById(x.art)?.title ?? x.art} walks with the guide from ${shortDate(x.on)}`,
        );
    if (p.moment) notes.push(`${w.chapter.moment.says} ${shortDate(p.moment)}`);
    else if (p.state !== "ahead")
        notes.push("The moment inks when the last lesson here is finished");
    return { label: `${bits.join(". ")}.`, says: `${bits.slice(1).join(". ")}.`, notes, state };
}

/** Where a child may travel on the map: the worlds they have reached, and one whose way their learning has opened. A grown-up may go anywhere. */
export function canGo(trip: Journey, i: number, grown: boolean): boolean {
    const p = trip.places[i];
    // a place off the run is on a child’s map, and so theirs to go to, once one of its lessons is finished
    if (!p) {
        const s = trip.sides[i - trip.places.length];
        return !!s && (grown || !!s.stamp);
    }
    // the world a child is standing in is always theirs to go into, whatever their record holds: a
    // child with no work at all stood in a world their own map would not open
    if (i === trip.here) return true;
    return grown || p.state !== "ahead" || !!trip.roads[i - 1]?.open;
}

/** A place on the map by its index: a world of the run, or after them a place off it. */
export const placeAt = (trip: Journey, i: number): Walked | undefined =>
    trip.places[i] ?? trip.sides[i - trip.places.length];

/** The world a child's learning has just opened and they have not yet been to: its way is open and nothing there is stamped. */
export function opened(trip: Journey): number | null {
    const i = trip.here,
        p = trip.places[i];
    return p && i > 0 && !p.stamp && trip.roads[i - 1]?.open ? i : null;
}

/** What a page draws of a world: the drawn half of its declaration, with the family's changes applied. */
export function pictureOf(w: Applied): WorldPicture {
    return {
        id: w.id,
        name: w.name,
        light: w.light,
        indoor: w.indoor,
        ground: w.ground,
        path: w.path,
        horizon: w.horizon,
        landmarks: w.landmarks,
        creatures: w.creatures,
        weather: w.weather,
        seasons: w.seasons,
        guide: w.guide,
        chapter: w.chapter,
        map: placeOf(w),
        motion: w.motion,
        needs: w.needs,
    };
}

/** Every art id a picture draws with: its horizon, gate, landmarks, creatures, chapter and place on the map. */
/**
 * One world's picture and the drawings it names, for a page that draws a place on its own rather than
 * a whole map or roll (`paintPicture` in engine/ui/scenery.ts). A page with a view already has both on
 * it; this is for one that holds a single world, such as a grown-up's card for where a child is.
 */
export function pictureFor(w: Applied): { picture: WorldPicture; art: Record<string, ArtRef> } {
    const picture = pictureOf(w);
    return { picture, art: artOf(drawnIn(picture)) };
}

function drawnIn(p: WorldPicture): string[] {
    const c = p.chapter;
    return [
        ...p.horizon.far.map((f) => f.art),
        ...(p.horizon.sky ?? []).map((f) => f.art),
        p.horizon.gate,
        ...p.landmarks,
        ...p.creatures,
        c.moment.art,
        c.secret.art,
        ...(c.glimpse ? [c.glimpse.art] : []),
        ...(c.rare ? [c.rare.art] : []),
        ...p.map.spots.map((x) => x.art),
    ];
}

/** How the worlds draw each of these ids, for the ones the list knows, so a painter reads the view and never the list. */
function artOf(ids: Iterable<string>): Record<string, ArtRef> {
    const out: Record<string, ArtRef> = {};
    for (const id of ids) {
        if (out[id]) continue;
        const e = artById(id);
        if (!e) continue;
        out[id] = {
            title: e.title,
            roles: e.roles,
            from: e.from,
            ref: e.ref,
            scale: e.scale,
            ...(e.params && { params: e.params }),
            ...(e.moves && { moves: e.moves }),
        };
    }
    return out;
}

/** The limits the child's app passes: their map and their world, recording for their kid. */
export const CHILD_MAP: MapLimits = {
    travel: "reached",
    goIn: "own",
    fly: true,
    pan: "own",
    zoomOut: "everything",
};
export const childWorld = (kid: Extract<WorldLimits, { record: true }>["kid"]): WorldLimits => ({
    sheets: "open",
    record: true,
    kid,
});

/** The limits the site passes for a visitor: everywhere for looking, a lesson's first questions open, nothing recorded. */
export const SITE_MAP: MapLimits = {
    travel: "everywhere",
    goIn: "everywhere",
    fly: true,
    pan: "all",
    zoomOut: "everything",
};
export const siteWorld = (open: number): WorldLimits => ({
    sheets: "preview",
    preview: { open },
    record: false,
});

/** The limits the grown-ups' app passes: the map behind their pages goes nowhere, and a world they visit is for looking. */
export const BACKDROP_MAP: MapLimits = {
    travel: "everywhere",
    goIn: "none",
    fly: false,
    pan: "all",
    zoomOut: "everything",
};
export const GROWN_WORLD: WorldLimits = { sheets: "look", record: false };

/** The limits a grown-up's own map passes: they may visit any world, and the plane is the child's. */
export const GROWN_MAP: MapLimits = {
    travel: "everywhere",
    goIn: "everywhere",
    fly: false,
    pan: "all",
    zoomOut: "everything",
};

export interface MapIn {
    /** Every year's record, the worlds its terms are in and what the plan says about tracks (`recordsAll`). */
    records: YearRecord[];
    /** The journey already worked out, in place of the records: a page's backdrop draws the country with nobody on it from one. */
    trip?: Journey;
    /** The places off the run to lay out: those a track's lessons may bring a child to, one per year, or every world off the run for a grown-up. */
    sides: readonly Side[];
    corpus: Corpus;
    worldOf: (id: string) => Applied;
    topics: (lesson: string) => string[];
    /** A drawing's size in the world, for the one drawing that stands past a child's edge. */
    size: (art: string, params?: Record<string, unknown>) => { w: number; h: number };
    /** Whether the years are lettered across the country and read under each place, as a grown-up reads it. */
    grown: boolean;
    /** The child on the map, or null for a map with no child. The site passes its sample child here and never a real one. */
    child: { name: string; since: string } | null;
    /** The child's own grade, so a child with no work yet stands in their own year (rewards.ts `journey`). */
    grade?: number;
    limits: MapLimits;
    /** Under reduced motion: what only makes sense moving is left off the map, as its snapshots hold. */
    still?: boolean;
    /** The shelf's declared motion by drawing, for the float a standing life keeps; none leaves every life still. */
    declared?: Declared;
}

/**
 * The map as one page draws it. What a viewer may do comes from the limits alone: every map draws the
 * whole country, a child's in pencil and dimmed until a place is reached, and opens no place the
 * viewer may not travel to.
 */
export function mapViewOf(o: MapIn): MapView {
    const { limits, worldOf } = o;
    const journeyed = o.trip ?? journey(o.records, worldOf, o.topics, o.sides, o.grade);
    const standing = journeyed.places[journeyed.here];
    const ownGrade = limits.pan === "own" && standing ? standing.grade : null;
    const chosenGrade = ownGrade ?? standing?.grade;
    const shared = new Map<string, Walked>();
    for (const side of journeyed.sides) {
        if (!shared.has(side.world) || side.grade === chosenGrade) shared.set(side.world, side);
    }
    const trip = {
        ...journeyed,
        sides: [...shared.values()].map((side) =>
            ownGrade !== null && side.grade !== ownGrade
                ? {
                      ...side,
                      grade: ownGrade,
                      state: "ahead" as const,
                      lessons: [],
                      done: [],
                      stamp: null,
                      moment: null,
                      lit: [],
                      followers: [],
                  }
                : side,
        ),
    };
    // Grade selects the record; fixed world sites select the geography.
    const laid = layoutMap(
        trip.places.map((p) => ({ grade: p.grade, term: p.term, world: p.world })),
        (id) => worldOf(id).chapter.by,
        trip.sides.map((s) => ({ world: s.world, grade: s.grade })),
    );
    const walked = limits.travel === "reached";
    const own = ownGrade === null ? null : ownLand(laid, ownGrade);
    const layout = laid;
    const mine = (i: number): boolean =>
        !own || i >= layout.nodes.length || layout.nodes[i]?.grade === standing?.grade;
    const whole = terrainOf(layout, worldOf);
    const country = whole;
    const reached = reachedOf(layout, trip, whole);
    // The child sees every place, dimmed until it opens, rather than an unexplained stretch of paper.
    // `known: null` keeps the terrain beneath those places in pencil without washing it into colour.
    const reach: MapReach = { ...reached, known: null };
    // a year ends by sailing to the next land: the jetty at this land's shore, and how the child came in
    const sail = own && standing ? sailOf(layout, trip, standing.grade, own.region, whole) : null;
    const edge = walked ? edgeOf(trip, layout.nodes.length) : layout.nodes.length - 1;
    const pictures: Record<string, WorldPicture> = {};
    const shownOf = (i: number, p: Walked): PlaceShown => {
        const w = worldOf(p.world);
        // Every place a map holds brings its picture, so a child sees the whole country: the places they
        // may not go to yet are drawn in pencil and dimmed (engine/ui/map.ts), not left as bare paper.
        pictures[w.id] ??= pictureOf(w);
        const d = describe({ trip, i, worldOf, corpus: o.corpus, grown: o.grown });
        // a child's map letters places and their names and nothing else; a grown-up reads it by years
        const when = !o.grown
            ? ""
            : i < trip.places.length
              ? `Year ${p.grade}, term ${p.term}`
              : standsWhen(w);
        return {
            world: p.world,
            name: w.name,
            stamp: p.stamp,
            moment: p.moment,
            lit: p.lit.map((x) => ({ art: x.art, on: x.on })),
            followers: p.followers.map((x) => x.art),
            label: d.label,
            notes: o.grown ? d.notes : [],
            when,
        };
    };
    const mayOpen = (i: number): boolean =>
        limits.goIn === "none"
            ? false
            : limits.travel === "everywhere"
              ? true
              : canGo(trip, i, false);
    const places: MapPlace[] = layout.nodes.map((n, i) => {
        const p = trip.places[i];
        const past = i > edge;
        // the place the child stands in keeps its own state: "next" and "behind" are the states a
        // page says are not open yet, and it can never be the world the child is standing in
        const state: MapPlace["state"] = !p
            ? "ahead"
            : i === trip.here
              ? p.state
              : past
                ? "ahead"
                : p.state === "ahead" && walked
                  ? i === edge
                      ? "next"
                      : "behind"
                  : p.state;
        // another year's world stands closed, as a world not reached yet does, with no way in
        if (!mine(i))
            return {
                i,
                box: n.box,
                stand: n.stand,
                state: "ahead",
                open: false,
                host: null,
                shown: p ? shownOf(i, p) : null,
            };
        return {
            i,
            box: n.box,
            stand: n.stand,
            state,
            open: mayOpen(i),
            host: null,
            shown: p ? shownOf(i, p) : null,
        };
    });
    for (const [k, s] of layout.sides.entries()) {
        const p = mine(s.i) ? trip.sides[k] : undefined;
        const state: MapPlace["state"] = !p ? "hidden" : p.state;
        places.push({
            i: s.i,
            box: s.box,
            stand: s.stand,
            state,
            open: state === "hidden" ? false : mayOpen(s.i),
            host: s.host,
            shown: p ? shownOf(s.i, p) : null,
        });
    }
    const ways: MapWay[] = layout.roads.map((road, i) => {
        const opened = trip.roads[i]?.open ?? null,
            to = trip.places[road.to];
        const state: MapWay["state"] =
            (walked && road.from > edge) || !mine(road.from) || !mine(road.to)
                ? "hidden"
                : walked && road.to > edge
                  ? "trailing"
                  : opened
                    ? to?.stamp
                        ? "walked"
                        : "open"
                    : "pencil";
        return {
            from: road.from,
            to: road.to,
            kind: road.kind,
            d: road.d,
            samples: road.samples,
            state,
            opened,
        };
    });
    for (const [k, s] of layout.sides.entries()) {
        const opened = trip.sides[k]?.stamp ?? null;
        ways.push({
            from: s.host,
            to: s.i,
            kind: s.road.kind,
            d: s.road.d,
            samples: s.road.samples,
            state: !mine(s.i) ? "hidden" : opened ? "walked" : walked ? "hidden" : "pencil",
            opened,
        });
    }
    const here = trip.places.length ? trip.here : null;
    const still = o.still ?? false,
        declared = o.declared ?? (() => undefined);
    const furniture = own && standing ? FURNITURE_ON[standing.grade] : undefined;
    const life: MapLife[] = lifeOn({
        map: layout,
        terrain: country,
        reach,
        grown: o.grown || !walked,
        still,
        ...(furniture && { furniture }),
    }).map((s) => ({
        key: s.key,
        art: s.life.art,
        ...(s.life.params && { params: s.life.params }),
        size: s.life.size,
        at: s.at,
        path: s.path,
        pencil: s.pencil,
        doodle: !!s.life.doodle,
        shade: !!s.life.shade,
        follow: s.life.follow ?? [],
        phase: s.phase,
        round: s.moves ? framesOf(s) : null,
        atRest: s.life.travel.is === "surface" || s.life.travel.is === "cross" ? "gone" : "stands",
        bob: still || s.pencil || s.moves ? null : bobOf(s.life.art, declared),
    }));
    for (const f of country.features) {
        const turning = TURNING[f.art];
        if (turning) f.turning = turning;
    }
    const regions: MapRegion[] = REGIONS.map((region) => ({ ...region }));
    // the field beside each place the viewer may go to, under its name; the creatures where the map draws them
    const landings: MapView["landings"] = limits.fly
        ? places
              .filter((p) => p.open)
              .map((p) => ({
                  node: p.i,
                  at: { x: p.box.x + p.box.w / 2, y: p.box.y + p.box.h + 600 },
                  angle: 0,
              }))
        : [];
    // the creatures the plane spots, those in the land's own country and sea on a child's map
    const inRegion = (q: { x: number; y: number }) =>
        !own ||
        (q.x > own.region.x &&
            q.x < own.region.x + own.region.w &&
            q.y > own.region.y &&
            q.y < own.region.y + own.region.h);
    const sights = SIGHTS.filter((x) => known(reach, x.at, 0.92) && inRegion(x.at));
    // every drawing the map draws: the worlds' own, and the map's own, which are the lantern by the road
    // into each world, the bridge where a way crosses a river, and the balloon that crosses it once a visit
    const art = artOf([
        ...Object.values(pictures).flatMap(drawnIn),
        ...places.flatMap((p) =>
            p.shown ? [...p.shown.lit.map((x) => x.art), ...p.shown.followers] : [],
        ),
        ...life.flatMap((s) => [s.art, ...s.follow.map((f) => f.art)]),
        ...Object.values(RIDES).flatMap((r) => [
            ...(r.guide ? [r.guide.art] : []),
            ...(r.country ? [r.country.art] : []),
        ]),
        ...sights.map((x) => x.art),
        ...country.features.map((f) => f.art),
        "lantern",
        "bridge",
        "balloon",
        ...(sail ? ["jetty", "ship"] : []),
        ...RIDERS,
    ]);
    // a child's map opens on their own land, and a map with nobody on it on the country rather than on
    // the water beside it; on a phone the page opens closer, on the place they stand at
    const frame = own ? own.frame : layout.core;
    return {
        places,
        ways,
        here,
        layout,
        country,
        land: { ...landOf(country), ...furniture },
        reach,
        pictures,
        frame,
        grown: o.grown,
        title: o.child ? { child: o.child.name, since: o.child.since } : null,
        limits,
        art,
        life,
        rides: RIDES,
        regions,
        landings,
        sights,
        sail,
    };
}

/**
 * How a child's land ends its year and how they came to it (.docs/overworld.md): the jetty where the way
 * out of the year meets the coast, with the path down to it from the year's last world and the ship
 * waiting there, inked once every world of the year is finished; and on the day the land's first world
 * was stamped, the ship's way in over the sea from the last land.
 */
function sailOf(
    map: Overworld,
    trip: Journey,
    grade: number,
    region: Rect,
    t: Terrain,
): MapSail | null {
    const jetty = SAILS[grade];
    if (!jetty) return null;
    const ofYear = map.nodes.filter((n) => n.grade === grade);
    const first = ofYear[0],
        last = ofYear.at(-1);
    // the way out of the year as far as the jetty, walked on foot
    const out = last ? map.roads.find((r) => r.from === last.i) : undefined;
    let way: MapRoad | null = null;
    if (out) {
        const near = out.samples.map((q) => Math.hypot(q.x - jetty.x, q.y - jetty.y));
        const k = near.indexOf(Math.min(...near));
        const samples = out.samples.slice(0, k + 1);
        if (samples.length > 1)
            way = {
                from: out.from,
                to: out.to,
                kind: "path",
                d: `M${samples.map((q) => `${Math.round(q.x)} ${Math.round(q.y)}`).join("L")}`,
                samples,
            };
    }
    const toward = SLOTS[slotOf(grade + 1, 1)];
    const done = ofYear.every((n) => trip.places[n.i]?.state === "done");
    const moments = ofYear.map((n) => trip.places[n.i]?.moment ?? "").sort();
    // the ship that brought the child in: over the sea on this land's map, from where the way from the
    // last land comes onto it to where it reaches this land's shore
    const into = first ? map.roads.find((r) => r.to === first.i) : undefined;
    const on = first ? (trip.places[first.i]?.stamp ?? null) : null;
    let came: MapSail["came"] = null;
    if (into && on && map.nodes[into.from]?.grade !== grade) {
        const inside = (q: Pt) =>
            q.x > region.x &&
            q.x < region.x + region.w &&
            q.y > region.y &&
            q.y < region.y + region.h;
        const from = into.samples.findIndex(inside);
        const path: Pt[] = [];
        for (let j = Math.max(0, from); j < into.samples.length; j++) {
            const q = into.samples[j];
            if (!q || !wet(t, q)) break;
            path.push({ x: q.x, y: q.y });
        }
        if (from >= 0 && path.length > 4) came = { on, path };
    }
    return {
        jetty,
        faces: toward && toward.x < jetty.x ? -1 : 1,
        way,
        inked: done ? (moments.at(-1) ?? null) : null,
        came,
    };
}

/**
 * The country with nobody on it, the ground under a page's cards (engine/ui/backdrop.tsx): every
 * world of the run begun and none stamped, each in its colours, with no way walked, no date and no
 * notes, as a grown-up sees it, with nothing to travel to or go into. It reads no record and no corpus.
 */
export function countryViewOf(o: {
    size: MapIn["size"];
    still: boolean;
    /** The drawings' declared motion, for the float the country's life keeps. */
    declared?: Declared;
}): MapView {
    const applied = new Map<string, Applied>();
    const worldOf = (id: string): Applied => {
        const had = applied.get(id);
        if (had) return had;
        const w = apply(worldById(id), undefined, o.still).world;
        applied.set(id, w);
        return w;
    };
    const trip: Journey = {
        places: schoolRun().map((p): Walked => ({
            ...p,
            lessons: [],
            done: [],
            state: "begun",
            stamp: null,
            moment: null,
            lit: [],
            followers: [],
        })),
        roads: [],
        here: 0,
        sides: [],
    };
    const view = mapViewOf({
        records: [],
        trip,
        sides: [],
        corpus: corpusFrom([], ""),
        worldOf,
        topics: () => [],
        size: o.size,
        grown: true,
        child: null,
        limits: BACKDROP_MAP,
        still: o.still,
        declared: o.declared,
    });
    for (const p of view.places) if (p.shown) p.shown.notes = [];
    return view;
}

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
    const layout = layoutRoll(
        {
            days: j.days,
            next: j.next,
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
            bare: j.bare || !j.days.length,
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
        next: j.next ? sheetOf(j.next.id, "closed") : null,
        standings,
        open,
        arrival,
        trail,
        card: j.bare
            ? { label: "Still to come", says: "The lessons here are still being written." }
            : j.days.length
              ? undefined
              : { label: "Your first day", says: "Your first lesson will be here." },
        limits: o.limits,
    });
}

export interface TrailIn {
    journal: Journal;
    term: number;
    /** The world the term is in, with the family's changes. */
    world: Applied;
    /** What the record makes of that world on the map: its moment, and who walks with the guide. */
    place: Walked | undefined;
    corpus: Corpus;
    topics: (lesson: string) => string[];
    size: (art: string) => { w: number; h: number };
    narrow: boolean;
    /** A grown-up's trail is drawn whole, with a note under what the record did. */
    grown: boolean;
}

/**
 * A term as a place, which a page draws when the child steps back from the roll: a stop for every day
 * of the term, what the record has left of each drawing beside the trail, and each stop's label in the
 * words a child reads it in. A day still to come says nothing of its lesson, and neither does what
 * stands beside it, until it is today. Null for a term with no day on it yet.
 */
export function trailViewOf(o: TrailIn): TrailView | null {
    const { journal: j, world: w, place } = o;
    const slots = slotsOf(j.year, o.term, j.days, j.next);
    if (!slots.length) return null;
    const reachOf = reachesFor(() => w, o.topics);
    const reachAt = (slot: Slot): { art: string; says: string } | null => {
        const day: Day | null =
            slot.day ??
            (slot.state === "next"
                ? {
                      id: slot.key,
                      n: 0,
                      term: o.term,
                      lessons: slot.lessons,
                      state: "today",
                      date: "",
                  }
                : null);
        return day ? reachOf(day, w.id) : null;
    };
    const layout = layoutTrail({
        term: o.term,
        slots,
        world: {
            id: w.id,
            name: w.name,
            ground: w.ground,
            gate: w.horizon.gate,
            moment: w.chapter.moment.art,
            secret: w.chapter.secret.art,
            landmarks: w.landmarks,
            creatures: w.creatures,
        },
        wide: !o.narrow,
        size: o.size,
        reach: reachAt,
        whole: o.grown,
    });
    const today = j.live?.today ?? j.today?.date ?? "";
    const stamp = w.stamp ?? w.creatures[0] ?? null;
    const title = (id: string): string => o.corpus.lesson(id)?.title ?? id;
    const sheetOf = (id: string, state: SheetView["state"]): SheetView => ({
        lesson: id,
        title: title(id),
        state,
        on: j.progress.done[id]?.on ?? null,
    });
    const stops: StopView[] = layout.stops.map((s, i) => {
        const slot = slots[i],
            reached = s.state === "done" || s.state === "today";
        return {
            hook: reached && slot ? (reachAt(slot)?.says ?? null) : null,
            names: reached ? s.lessons.map(title).join(" and ") : "",
            // within the week a child's own words, and past it the day the sheet is stamped with
            when:
                s.state === "today"
                    ? "Today"
                    : s.state === "done" && s.date
                      ? dayInWords(s.date, today) || longDate(s.date)
                      : "",
            stamp: s.state === "done" ? stamp : null,
            sheets: reached
                ? s.lessons.map((id) => sheetOf(id, s.state === "today" ? "today" : "done"))
                : [],
        };
    });
    const standings: Standing[] = layout.land.scenery.map((s, i) => {
        const stop = layout.stops[layout.beside[i] ?? -1];
        if (s.kind === "reach") {
            if (stop?.state === "done" && stop.date) return { lit: true, on: stop.date };
            return stop?.state === "next" ? { lit: false, says: "" } : { lit: false };
        }
        if (s.kind === "moment") return momentOf(w, place, o.grown);
        if (s.kind === "secret") {
            if (stop?.state !== "done" || !stop.date) return { hide: true };
            return {
                says: w.chapter.secret.says,
                note: o.grown ? `A secret, there since ${shortDate(stop.date)}.` : undefined,
            };
        }
        return {};
    });
    const stretch = layout.land.stretches[0];
    if (!stretch) return null;
    // the name and what hangs in the sky stay within the place, which is narrower than the land washed
    const B = layout.land.bounds;
    const within: RollLayout = { ...layout.land, x0: B.x, x1: B.x + B.w };
    const picture = pictureOf(w);
    const now = layout.stops.findIndex((s) => s.state === "today");
    const lastDone = layout.stops.map((s) => s.state).lastIndexOf("done");
    return {
        term: o.term,
        world: w.id,
        layout,
        stops,
        standings,
        sky: {
            label: nameBox(within, stretch, w.name),
            greet: greetAt({ ...stretch, start: layout.start }),
            says: w.arrive,
            sky: skyIn(picture, w, within, stretch, o.size),
        },
        label: j.termLabel(o.term),
        guide: now >= 0 ? now : lastDone,
        followers: (place?.followers ?? []).map((f) => ({ art: f.art, on: f.on })),
        moment: place?.state === "done" ? place.moment : null,
    };
}

/** What hangs in a stretch's sky: its own drawings, and a kite in a breezy world that could fly one and has none beside its path. */
function skyIn(
    p: WorldPicture,
    a: Applied,
    l: RollLayout,
    s: Stretch,
    size: (art: string) => { w: number; h: number },
): StretchView["sky"] {
    const sky: StretchView["sky"] = skyPlaces(p, l, s, size);
    if (
        p.weather === "breezy" &&
        !p.landmarks.includes("kite") &&
        a.offers.landmarks.includes("kite")
    ) {
        const sz = size("kite");
        sky.push({
            art: "kite",
            k: 1,
            box: { x: l.x1 - sz.w - 140, y: s.horizon.y + 260, w: sz.w, h: sz.h },
            weather: true,
        });
    }
    return sky;
}

export interface RollIn {
    layout: RollLayout;
    /** The worlds the roll's terms are in, beside those its stretches name. */
    worlds: readonly string[];
    worldOf: (id: string) => Applied;
    size: (art: string) => { w: number; h: number };
    days: DayView[];
    next: SheetView | null;
    /** One per scenery of the layout; a roll with none leaves every drawing as the layout drew it. */
    standings?: Standing[];
    open: string;
    arrival: WorldView["arrival"];
    /** The term the view opens on as a place, for a page that draws one. */
    trail?: TrailView | null;
    /** What the card says on a roll with no days on it, where its stretches carry one. */
    card?: { label: string; says: string };
    limits: WorldLimits;
}

/**
 * A roll laid out as a page draws it: the pictures of its worlds, what each stretch's sky holds, and
 * every drawing the roll names, resolved once. `worldViewOf` lays a journal's year out and builds
 * through this; a page whose days are its own lays its roll out itself and builds through this too.
 */
export function rollViewOf(o: RollIn): WorldView {
    const { layout } = o;
    const pictures: Record<string, WorldPicture> = {};
    for (const id of new Set([...o.worlds, ...layout.stretches.map((s) => s.world)]))
        pictures[id] = pictureOf(o.worldOf(id));
    const stretches: StretchView[] = layout.stretches.map((s) => {
        const w = pictures[s.world] ?? pictureOf(o.worldOf(s.world)),
            a = o.worldOf(s.world);
        return {
            label: nameBox(layout, s, w.name),
            greet: greetAt(s),
            says: a.arrive,
            sky: skyIn(w, a, layout, s, o.size),
            ...(o.card ? { card: o.card } : {}),
        };
    });
    const trail = o.trail ?? null;
    const art = artOf([
        ...Object.values(pictures).flatMap(drawnIn),
        ...stretches.flatMap((s) => s.sky.map((x) => x.art)),
        ...layout.scenery.map((s) => s.art),
        ...o.days.flatMap((d) => d.followers),
        ...(trail
            ? [
                  ...trail.layout.land.scenery.map((s) => s.art),
                  ...trail.sky.sky.map((x) => x.art),
                  ...trail.stops.flatMap((s) => (s.stamp ? [s.stamp] : [])),
                  ...trail.followers.map((f) => f.art),
              ]
            : []),
    ]);
    return {
        pictures,
        open: o.open,
        layout,
        days: o.days,
        next: o.next,
        standings: o.standings ?? layout.scenery.map(() => ({})),
        arrival: o.arrival,
        stretches,
        trail,
        art,
        limits: o.limits,
    };
}
