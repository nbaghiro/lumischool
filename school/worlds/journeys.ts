// A world's journey: the lessons of one grade a child finds in it, so each world holds every grade it
// offers (.docs/world-journeys.md). It is derived from what the world hosts and what its landmarks
// and creatures reach, never written by hand.
import { topicsOf, type Corpus, type LessonFacts } from "./lessons";
import { reachOf } from "./rewards";
import { hostedLessons, siteOf, WORLDS } from "./worlds";

export const JOURNEY_VERSION = 2;
/** The fewest lessons a journey may hold (npm run check:journeys) and the most it is filled to. */
export const FEWEST = 2;
export const MOST = 6;

export interface Journey {
    /** `<world>:g<grade>:v<version>`, the id a roll's days are named by. */
    readonly id: string;
    readonly world: string;
    readonly grade: number;
    readonly title: string;
    readonly purpose: string;
    readonly lessonIds: readonly string[];
}

interface PlaceJourneys {
    readonly world: string;
    readonly title: string;
    readonly purpose: string;
    /** The lowest grade offered: 0 for a place a track brings a child to or the kindergarten world, else 1. */
    readonly from?: number;
    readonly to?: number;
}

const places: readonly PlaceJourneys[] = [
    {
        world: "meadow",
        title: "Notice, count and grow",
        purpose:
            "Observe living things, then use counting, comparison and evidence to describe them.",
    },
    {
        world: "harbour",
        title: "Water, boats and journeys",
        purpose: "Explore water and movement, and read information useful to a journey.",
    },
    {
        world: "railway",
        title: "Movement and timetables",
        purpose: "Measure movement and interpret times before planning a route.",
    },
    {
        world: "woods",
        title: "Trees and woodland life",
        purpose: "Look closely at trees and the relationships between living things.",
    },
    {
        world: "kitchen",
        title: "Measure, mix and explain",
        purpose: "Follow instructions, measure ingredients and investigate changes in materials.",
    },
    {
        world: "town",
        title: "Finding our way together",
        purpose: "Read signs and maps, then communicate a route or message clearly.",
    },
    {
        world: "night-sky",
        title: "Light, shadows and the sky",
        purpose: "Observe light and darkness; later connect observations with models of the sky.",
    },
    {
        world: "sports-ground",
        title: "Movement we can measure",
        purpose: "Compare motion, measure distances and times, and interpret results.",
    },
    {
        world: "laboratory",
        title: "Observe, test and explain",
        purpose: "Choose materials and carry out comparisons that support an explanation.",
    },
    {
        world: "mountains",
        title: "Cold, slopes and distance",
        purpose: "Explore temperature, slopes and routes through a changing landscape.",
    },
    {
        world: "open-sea",
        title: "Water and life at sea",
        purpose: "Explore water, marine habitats and how to describe distant places.",
    },
    {
        world: "volcano-island",
        title: "Heat and changing materials",
        purpose: "Compare heating and cooling, and distinguish reversible and lasting changes.",
    },
    {
        world: "home-garden",
        title: "A growing garden",
        purpose: "Look, count, sort and grow things close to home.",
        to: 0,
    },
    {
        world: "reed-marsh",
        title: "Life beside the water",
        purpose: "Follow pond life and the relationships between water, habitats and food.",
    },
    {
        world: "bandstand-park",
        title: "Make music together",
        purpose: "Build a short sequence of listening, rhythm or instrumental practice.",
    },
    {
        world: "canal-town",
        title: "Waterways and routes",
        purpose: "Explore how water, measurement and mechanisms help people move around.",
        from: 3,
    },
    {
        world: "winter-fair",
        title: "Patterns, prices and performance",
        purpose: "Prepare for a fair by exploring patterns, money and clear messages.",
    },
    {
        world: "valley-farm",
        title: "Plants, land and food",
        purpose:
            "Explore growing conditions, habitats and the food relationships on which life depends.",
    },
    {
        world: "old-tower",
        title: "Stories from the past",
        purpose:
            "Put the past in order, read what old things and old pictures say, and meet our own country's story.",
    },
    {
        world: "ferry-town",
        title: "Words across the water",
        purpose: "Greet, count and ask in a second language, a few words at a time.",
    },
    {
        world: "painters-hut",
        title: "Look, mix and make",
        purpose: "Develop observation and colour techniques through a small studio sequence.",
    },
    {
        world: "star-cliffs",
        title: "Observing light and the sky",
        purpose: "Use light, shadow and observations as foundations for understanding the sky.",
        from: 3,
    },
    {
        world: "walled-city",
        title: "Shapes, buildings and routes",
        purpose:
            "Explore the built environment through materials, shape and map reading, without presenting it as history.",
        from: 3,
    },
    {
        world: "coral-reef",
        title: "Homes and food in the water",
        purpose: "Build from familiar aquatic habitats towards adaptation and connected food webs.",
    },
    {
        world: "crystal-caves",
        title: "Light, sound and crystals",
        purpose:
            "Investigate what can be heard and seen, with crystal growing where the grade supports it.",
    },
    {
        world: "cloud-islands",
        title: "Air, weather and water",
        purpose: "Explore air and the changing water and weather around us.",
        from: 1,
    },
    {
        world: "dune-oasis",
        title: "Water and living in a place",
        purpose: "Explore water availability, plant needs and adaptation to different habitats.",
    },
    {
        world: "fossil-cliffs",
        title: "Observe earth and its changes",
        purpose:
            "Build observation and material knowledge around rocks and sediment; only grade 2 currently teaches fossil formation directly.",
    },
    {
        world: "long-grass",
        title: "Small creatures, connected lives",
        purpose:
            "Observe and classify creatures before following their life cycles and food relationships.",
    },
    {
        world: "lamp-rocks",
        title: "Light and signals",
        purpose: "Explore light, simple signals and the circuits that can carry them.",
        to: 2,
    },
    {
        world: "printing-works",
        title: "Marks, repeats and print",
        purpose: "Move from repeated marks to print techniques and repeatable patterns.",
    },
    {
        world: "book-island",
        title: "Read, understand and respond",
        purpose:
            "Read words and stories with increasing independence, then respond to what they say.",
    },
    {
        world: "treetops",
        title: "Trees and the life around them",
        purpose: "Look from leaves and seeds towards connected habitats and food webs.",
    },
    {
        world: "salt-flats",
        title: "Water, mixtures and separation",
        purpose:
            "Follow changes in water and investigate how dissolved materials can be separated.",
    },
    {
        world: "geyser-valley",
        title: "Heating, cooling and change",
        purpose:
            "Compare states and investigate what heating and cooling do to water and materials.",
    },
    {
        world: "post-office",
        title: "Messages that make sense",
        purpose: "Write and interpret clear messages for someone else to read.",
        from: 3,
    },
    {
        world: "windmill-island",
        title: "Forces and useful movement",
        purpose: "Explore how forces make things move and how mechanisms change that movement.",
        from: 1,
    },
    {
        world: "clockwork-island",
        title: "Instructions and mechanisms",
        purpose:
            "Build repeatable instructions and explore mechanisms, keeping programming steps in order.",
        from: 3,
    },
    {
        world: "midnight-sun",
        title: "Cold, ice and the sun that stays",
        purpose:
            "Explore cold and ice, measure temperatures, and follow the sun's path across the sky.",
        from: 3,
    },
    {
        world: "waterfall-gorge",
        title: "Water, rock and energy",
        purpose:
            "Follow falling and flowing water: the rock it wears away, the push it carries and the energy it can turn.",
        from: 3,
    },
    {
        world: "moon",
        title: "The moon, the Earth and space",
        purpose:
            "Watch the sun and the moon, then model how they move and compare weight on other worlds.",
        from: 3,
    },
];

const placeOf = new Map(places.map((p) => [p.world, p]));

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
    const place = placeOf.get(world);
    const from =
        place?.from ??
        (site?.kind === "track" || (site?.kind === "term" && site.grade === 0) ? 0 : 1);
    if (grade < from || grade > (place?.to ?? Infinity)) return null;
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

const resolved = new WeakMap<Corpus, Map<string, Journey | null>>();

/**
 * A world's journey at a grade, up to `MOST` lessons, each the variant the corpus shows. Undefined for
 * a grade the world does not offer and for one with nothing in it.
 */
export function journeyFor(world: string, grade: number, corpus: Corpus): Journey | undefined {
    let cache = resolved.get(corpus);
    if (!cache) resolved.set(corpus, (cache = new Map<string, Journey | null>()));
    const key = `${world}|${grade}`;
    const had = cache.get(key);
    if (had !== undefined) return had ?? undefined;
    const ids = [...new Set((candidates(world, grade, corpus) ?? []).map((f) => f.id))].slice(
        0,
        MOST,
    );
    const place = placeOf.get(world);
    const journey: Journey | null = ids.length
        ? {
              id: `${world}:g${grade}:v${JOURNEY_VERSION}`,
              world,
              grade,
              title: place?.title ?? "",
              purpose: place?.purpose ?? "",
              lessonIds: ids,
          }
        : null;
    cache.set(key, journey);
    return journey ?? undefined;
}

/** The grades a world has a journey in, lowest first: what a grown-up may switch between. */
export const journeyGrades = (world: string, corpus: Corpus): number[] =>
    corpus.grades.filter((g) => journeyFor(world, g, corpus) !== undefined);

/**
 * What is wrong with the journeys under one corpus's settings: an entry for a world there is not or
 * written twice, a world with none, and a grade a world offers whose journey holds fewer than
 * `FEWEST` lessons.
 */
export function journeyProblems(corpus: Corpus): string[] {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const place of places) {
        if (seen.has(place.world)) problems.push(`${place.world}: written twice`);
        seen.add(place.world);
        if (!WORLDS.some((w) => w.id === place.world))
            problems.push(`${place.world}: no such world`);
    }
    for (const w of WORLDS) {
        if (!placeOf.has(w.id)) problems.push(`${w.id}: no title or purpose`);
        for (const g of corpus.grades) {
            if (!candidates(w.id, g, corpus)) continue;
            const n = journeyFor(w.id, g, corpus)?.lessonIds.length ?? 0;
            if (n < FEWEST) problems.push(`${w.id} grade ${g}: ${n} lessons, fewer than ${FEWEST}`);
        }
    }
    return problems;
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
    if (!journeyFor(world, grade, corpus)) return false;
    const site = siteOf(world);
    if (site?.kind === "track") return true;
    if (site?.kind === "choice") return site.terms.some((t) => t.grade <= grade);
    const at = year ?? (site?.kind === "term" ? site.grade : null);
    return at !== null && at <= grade;
}
