// Which lessons a world's journey holds at a grade, and whether a child may go in. The child's map reads
// this to open a place, so it is apart from the titles and purposes in journeys.ts, which the map
// never shows (tools/__tests__/first-view.test.ts).
import { topicsOf, type Corpus, type LessonFacts } from "./lessons";
import { reachOf } from "./rewards";
import { hostedLessons, siteOf, WORLDS } from "./worlds";

/** The most lessons a journey is filled to. */
export const MOST = 6;

/**
 * The grades a world offers where they are not its default, which is from 0 for a place a track
 * brings a child to or the kindergarten world and from 1 for every other, with no top.
 */
export const RANGES: Readonly<Record<string, { readonly from?: number; readonly to?: number }>> = {
    "home-garden": { to: 0 },
    "canal-town": { from: 3 },
    "star-cliffs": { from: 3 },
    "walled-city": { from: 3 },
    "cloud-islands": { from: 1 },
    "lamp-rocks": { to: 2 },
    "post-office": { from: 3 },
    "windmill-island": { from: 1 },
    "clockwork-island": { from: 3 },
    "midnight-sun": { from: 3 },
    "waterfall-gorge": { from: 3 },
    moon: { from: 3 },
};

/**
 * A world's journey at a grade in order, before it is cut to `MOST`, or null when the world does not
 * offer the grade: outside its range or the pack's, or a place a track brings a child to that hosts
 * no lesson the corpus shows at that grade. A place a track brings a child to puts first the lessons
 * it hosts that the family chose (a language, a nation's unit), then the rest it hosts; every world
 * then adds the lessons whose topics reach its landmarks and creatures, or whose pictures draw one of
 * them, in the order the year meets them.
 */
function candidates(world: string, grade: number, corpus: Corpus): LessonFacts[] | null {
    const w = WORLDS.find((x) => x.id === world);
    const site = siteOf(world);
    if (!w || !corpus.grades.includes(grade)) return null;
    const range = RANGES[world];
    const from =
        range?.from ??
        (site?.kind === "track" || (site?.kind === "term" && site.grade === 0) ? 0 : 1);
    if (grade < from || grade > (range?.to ?? Infinity)) return null;
    const year = corpus.year(grade, "");
    const facts = (id: string): LessonFacts[] => {
        const f = corpus.lesson(id);
        return f && f.grade === grade && corpus.shown(f) ? [f] : [];
    };
    const drawn = new Set([...w.offers.landmarks, ...w.offers.creatures]);
    const fits = (f: LessonFacts): boolean =>
        reachOf(w, topicsOf(f)) !== null || f.art.some((a) => drawn.has(a));
    const reached = year.lessons.flatMap((l) => facts(l.id)).filter(fits);
    if (site?.kind !== "track") return reached;
    const hosted = hostedLessons(w, [year]).flatMap((l) => facts(l.id));
    if (!hosted.length) return null;
    const chosen = (f: LessonFacts): boolean => f.language !== undefined || f.nation !== undefined;
    return [...hosted.filter(chosen), ...hosted.filter((f) => !chosen(f)), ...reached];
}

const resolved = new WeakMap<Corpus, Map<string, readonly string[] | null>>();

/**
 * The ids of a world's journey at a grade, up to `MOST`, each the variant the corpus shows: null for a
 * grade the world does not offer, and empty for one it offers with nothing in it.
 */
export function journeyLessons(
    world: string,
    grade: number,
    corpus: Corpus,
): readonly string[] | null {
    let cache = resolved.get(corpus);
    if (!cache) resolved.set(corpus, (cache = new Map<string, readonly string[] | null>()));
    const key = `${world}|${grade}`;
    const had = cache.get(key);
    if (had !== undefined) return had;
    const found = candidates(world, grade, corpus);
    const ids = found && [...new Set(found.map((f) => f.id))].slice(0, MOST);
    cache.set(key, ids);
    return ids;
}

/**
 * Whether a child of `grade` may go into a world: its journey at their grade has lessons, and it is a
 * place a track brings them to, a world a family may choose for a term of a year no later than theirs,
 * or a world whose year (`year`, the grade of the term it stands in on their run) is no later.
 */
export function reaches(
    world: string,
    year: number | null,
    grade: number,
    corpus: Corpus,
): boolean {
    if (!journeyLessons(world, grade, corpus)?.length) return false;
    const site = siteOf(world);
    if (site?.kind === "track") return true;
    if (site?.kind === "choice") return site.terms.some((t) => t.grade <= grade);
    const at = year ?? (site?.kind === "term" ? site.grade : null);
    return at !== null && at <= grade;
}
