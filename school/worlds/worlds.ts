// Every world there is, and where each stands: which one each term of each grade is in when nobody
// has chosen, the worlds a family may choose for a term instead, and the places a track brings a
// child to in any year.
//
// A year has three worlds, one a term. A term is the stretch a family plans in and the stretch a
// child can remember as a place ("when we were at the harbour"), and three is few enough that each
// arrival is an event rather than a palette swap every fortnight. Twelve make the whole school's run,
// four years of three, in the order the map joins them. The other eleven stand round that run: the
// garden before it, a fifth year after it, two worlds a family can choose for a term, and five places
// for the subjects the run gives no home to (.docs/overworld.md).
import type { LessonDef, Year } from "../year";
import { bandstandPark } from "./park";
import { canalTown } from "./canal";
import { valleyFarm } from "./farm";
import { ferryTown } from "./ferry";
import { winterFair } from "./fair";
import { oldTower } from "./tower";
import { paintersHut } from "./painter";
import { starCliffs } from "./observatory";
import { walledCity } from "./oldcity";
import { homeGarden } from "./garden";
import { harbour } from "./harbour";
import { volcanoIsland } from "./island";
import { kitchen } from "./kitchen";
import { lab } from "./lab";
import { reedMarsh } from "./marsh";
import { meadow } from "./meadow";
import { mountains } from "./mountains";
import { night } from "./night";
import { railway } from "./railway";
import { openSea } from "./sea";
import { sportsGround } from "./sportsground";
import { town } from "./town";
import type { Site, World } from "./types";
import { woods } from "./woods";
import { coralReef } from "./reef";
import { crystalCaves } from "./caves";
import { cloudIslands } from "./clouds";
import { duneOasis } from "./oasis";
import { fossilCliffs } from "./fossils";
import { longGrass } from "./grass";
import { lampRocks } from "./lamprocks";
import { clockworkIsland } from "./clockwork";
import { bookIsland } from "./bookisland";
import { printingWorks } from "./printing";
import { postOffice } from "./postoffice";
import { windmillIsland } from "./windmill";
import { treetops } from "./treetops";
import { saltFlats } from "./saltflats";
import { geyserValley } from "./geysers";

/** The twelve of the run, the eleven round it in the order .docs/overworld.md ranks them, then the places further off. */
export const WORLDS: World[] = [
    meadow,
    harbour,
    railway,
    woods,
    kitchen,
    town,
    night,
    sportsGround,
    lab,
    mountains,
    openSea,
    volcanoIsland,
    homeGarden,
    reedMarsh,
    bandstandPark,
    canalTown,
    winterFair,
    valleyFarm,
    oldTower,
    ferryTown,
    paintersHut,
    starCliffs,
    walledCity,
    coralReef,
    crystalCaves,
    cloudIslands,
    duneOasis,
    fossilCliffs,
    longGrass,
    lampRocks,
    printingWorks,
    bookIsland,
    treetops,
    saltFlats,
    geyserValley,
    postOffice,
    windmillIsland,
    clockworkIsland,
];

/** A world by id, or the first world when the id is unknown (retired, or mistyped in a saved choice). */
export const worldById = (id: string): World => WORLDS.find((w) => w.id === id) ?? meadow;
export const isWorld = (id: string): boolean => WORLDS.some((w) => w.id === id);

/**
 * A world from a link: its id, or its name without "The" (`marsh`, `canal-town`, `observatory`), so
 * a grown-up can type the place they mean. Null when nothing matches.
 */
export function findWorld(q: string): World | null {
    const plain = (x: string) =>
        x
            .trim()
            .toLowerCase()
            .replace(/^the[\s-]+/, "")
            .replace(/['’]/g, "")
            .replace(/\s+/g, "-");
    const k = plain(q);
    if (!k) return null;
    const named = (w: World) => [w.id, plain(w.name)];
    // an id or a name first, then the start of one, then one of its words: "painter", "fair", "cliffs"
    return (
        WORLDS.find((w) => named(w).includes(k)) ??
        WORLDS.find((w) => named(w).some((n) => n.startsWith(k))) ??
        WORLDS.find((w) => named(w).some((n) => n.split("-").includes(k))) ??
        null
    );
}

/**
 * The worlds of each year in order, before a grown-up changes anything. Each is chosen for the term
 * it stands in: its season, and the lessons that term holds, so that its landmarks have lessons to
 * reach into. The second year's kitchen comes in the term of fractions, sharing and equal groups; its
 * town in the term of money, grams and quarter past; the third year's laboratory in the term of
 * circuits, magnets and the flame; the fourth year's open sea in the term of angles, decimals and the
 * see-saw rule, and its island in the term of coordinates, number walls and melting points.
 */
const FIRST_YEAR = ["meadow", "harbour", "railway"];

export const DEFAULT_YEARS: Record<number, string[]> = {
    1: FIRST_YEAR,
    2: ["woods", "kitchen", "town"],
    3: ["night-sky", "sports-ground", "laboratory"],
    4: ["mountains", "open-sea", "volcano-island"],
};

/** The worlds of one grade's year. A grade with no year of its own borrows the nearest one below it. */
export function yearOf(grade: number): string[] {
    for (let g = grade; g >= 1; g--) {
        const own = DEFAULT_YEARS[g];
        if (own) return [...own];
    }
    return [...FIRST_YEAR];
}

/** Kept for the first grade's order, which the rest of the journal was written against. */
export const DEFAULT_TERMS: string[] = [...FIRST_YEAR];

/** Every world of every year, in the order the map joins them: the whole school as one run. */
export function schoolRun(
    years: (grade: number) => string[] = yearOf,
): { grade: number; term: number; world: string }[] {
    const out: { grade: number; term: number; world: string }[] = [];
    for (const g of Object.keys(DEFAULT_YEARS)
        .map(Number)
        .sort((a, b) => a - b))
        years(g).forEach((world, i) => out.push({ grade: g, term: i + 1, world }));
    return out;
}

/**
 * Where a world stands. The eleven round the run say so themselves; each of the twelve is the term
 * DEFAULT_YEARS puts it in, and the map places those by its own geography.
 */
export function siteOf(id: string): Site | null {
    const w = WORLDS.find((x) => x.id === id);
    if (!w) return null;
    if (w.site) return w.site;
    for (const [g, list] of Object.entries(DEFAULT_YEARS)) {
        const i = list.indexOf(id);
        if (i >= 0)
            return { kind: "term", grade: Number(g), term: i + 1, land: { terrain: "", near: [] } };
    }
    return null;
}

/**
 * The worlds of a year that is not one of the run's four: the kindergarten year the garden opens,
 * and the fifth year across the sea. Empty for a grade nobody has drawn.
 */
export function outsideYear(grade: number): string[] {
    const out: string[] = [];
    for (const w of WORLDS)
        if (w.site?.kind === "term" && w.site.grade === grade) out[w.site.term - 1] = w.id;
    return out.filter(Boolean);
}

/** The worlds a family may choose for one term instead of its own, as the panel lists them. */
export function choicesFor(grade: number, term: number): World[] {
    return WORLDS.filter(
        (w) =>
            w.site?.kind === "choice" &&
            w.site.terms.some((t) => t.grade === grade && t.term === term),
    );
}

/**
 * Whether a world may stand in a term of a family's year. Any of the twelve may, as the panel has
 * always allowed; a choice only in the terms it names; a track place and a world of another year
 * never, because a term is not where they are.
 */
export function mayStand(id: string, grade: number, term: number): boolean {
    if (schoolRun().some((r) => r.world === id)) return true;
    return choicesFor(grade, term).some((w) => w.id === id);
}

/**
 * Every lesson a track place holds, from every grade's year, in grade order and then the order a
 * child meets them. A lesson named by any place's `hosts.lessons` is that place's alone, so a place
 * that hosts a subject leaves out the lessons of it that another place names.
 */
export function hostedLessons(w: World, years: Year[]): LessonDef[] {
    const s = w.site;
    if (s?.kind !== "track") return [];
    const named = new Set(s.hosts.lessons ?? []);
    const claimed = new Set(
        WORLDS.flatMap((x) =>
            x.id !== w.id && x.site?.kind === "track" ? (x.site.hosts.lessons ?? []) : [],
        ),
    );
    return [...years]
        .sort((a, b) => a.grade - b.grade)
        .flatMap((y) =>
            y.lessons.filter(
                (l) =>
                    named.has(l.id) ||
                    (!claimed.has(l.id) && s.hosts.subjects.includes(l.subject ?? "maths")),
            ),
        );
}

/** What a place a track brings a child to holds, as its name's line starts: "Science". */
function heldBy(w: World): string {
    const s = w.site;
    if (s?.kind !== "track") return "";
    const what = s.hosts.label ?? s.hosts.subjects[0] ?? "";
    return `${what.charAt(0).toUpperCase()}${what.slice(1)}`;
}

/** What a place a track brings a child to is, above its name: "Science, every year". */
export function everyYear(w: World): string {
    const what = heldBy(w);
    return what && `${what}, every year`;
}

/**
 * A place off the run as the map holds it: one world on one year's land. A place a track brings a
 * child to is one per year it holds lessons in, each with that year's lessons for its record, so a
 * child's art in two years is two huts on two lands (.docs/overworld.md).
 */
export interface Side {
    world: string;
    grade: number;
}

/** The year whose land a world off the run stands on when no lesson of its own says so: the year of the world it names beside it. */
export function gradeNear(w: World): number {
    const s = w.site;
    if (s?.kind === "term") return s.grade;
    if (s?.kind === "choice") return s.terms[0]?.grade ?? 1;
    for (const n of s?.land.near ?? []) {
        const t = siteOf(n);
        if (t?.kind === "term") return t.grade;
    }
    return 1;
}

/** One track place's places: one in each year that holds a lesson of it, or one beside the world it names while it holds none. */
function perYear(w: World, years: readonly Year[]): Side[] {
    const held = years.filter((y) => hostedLessons(w, [y]).length > 0);
    return held.length
        ? held.map((y) => ({ world: w.id, grade: y.grade })).sort((a, b) => a.grade - b.grade)
        : [{ world: w.id, grade: gradeNear(w) }];
}

/** The places off the run a track’s lessons bring a child to, one per year, in the order WORLDS lists them. */
export const sidePlaces = (years: readonly Year[]): Side[] =>
    WORLDS.filter((w) => w.site?.kind === "track").flatMap((w) => perYear(w, years));

/**
 * Every world standing in no term of a run, for a grown-up's map of the whole country: the places a
 * track brings a child to, one per year, the years before and after the four, and each world a family
 * may choose and has not, in the order WORLDS lists them.
 */
export const elsewhere = (run: readonly { world: string }[], years: readonly Year[]): Side[] => {
    const on = new Set(run.map((r) => r.world));
    return WORLDS.filter((w) => w.site && !on.has(w.id)).flatMap((w) =>
        w.site?.kind === "track" ? perYear(w, years) : [{ world: w.id, grade: gradeNear(w) }],
    );
};

/**
 * When a world off the run stands, above its name on a grown-up's map: "Science, year 2", "Before the
 * first year". A track place given no year is the place in general: "Science, every year".
 */
export function standsWhen(w: World, grade?: number): string {
    const s = w.site;
    if (s?.kind === "track")
        return grade === undefined || grade < 1 ? everyYear(w) : `${heldBy(w)}, year ${grade}`;
    if (s?.kind === "term")
        return s.grade === 0 ? "Before the first year" : `Year ${s.grade}, term ${s.term}`;
    if (s?.kind === "choice")
        return `Chosen instead of ${s.terms.map((t) => `year ${t.grade} term ${t.term}`).join(", ")}`;
    return "";
}

/**
 * A track place as a year of its own: one term, its lessons one after another on its path, so the
 * roll, the days and the record read it the way they read a term, and rewards.ts works out its
 * stamp, its lit landmarks, its followers and its moment the same way. Each lesson keeps its id, so a
 * child's record of it is the one record.
 */
export function trackYear(w: World, years: Year[], child: string): Year {
    const lessons = hostedLessons(w, years).map((l, i): LessonDef => ({
        ...l,
        unit: 1,
        week: 2 + i * 2,
        branch: undefined,
        aside: undefined,
        needs: undefined,
    }));
    return {
        child,
        grade: 0,
        title: w.name,
        started: years[0]?.started ?? "2026-07-27",
        units: [{ n: 1, title: w.name, short: w.name, marker: w.light.accent, about: w.about }],
        lessons,
    };
}
