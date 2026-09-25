// Versioned editorial membership, independent of drawing recipes and application state.
// These are short themed visits, not replacements for a child's canonical learning plan.
import type { Corpus } from "./lessons";

export const JOURNEY_VERSION = 1;
export type JourneyStatus = "curated" | "thin" | "gap";
export interface JourneyDefinition {
    readonly id: string;
    readonly version: 1;
    readonly world: string;
    readonly grade: number;
    readonly title: string;
    readonly purpose: string;
    readonly lessonIds: readonly string[];
    readonly status: JourneyStatus;
}
export interface Journey extends JourneyDefinition {
    /** Authored members unavailable in this pack, including an incompatible grade. */
    readonly missingIds: readonly string[];
}
interface PlaceJourneys {
    readonly world: string;
    readonly title: string;
    readonly purpose: string;
    readonly grades: readonly [
        readonly string[],
        readonly string[],
        readonly string[],
        readonly string[],
    ];
}

// Membership must be edited deliberately and versioned, never expanded from a subject query.
const places: readonly PlaceJourneys[] = [
    {
        world: "meadow",
        title: "Notice, count and grow",
        purpose:
            "Observe living things, then use counting, comparison and evidence to describe them.",
        grades: [
            ["nature-living-or-not", "g1-counting-to-twenty"],
            ["nature-leaves-and-seeds", "g2-sorting-and-chance"],
            ["nature-what-a-plant-needs", "nature-food-chains"],
            ["nature-life-cycles-compared", "nature-food-webs"],
        ],
    },
    {
        world: "harbour",
        title: "Water, boats and journeys",
        purpose: "Explore water and movement, and read information useful to a journey.",
        grades: [
            ["chemistry-does-it-soak-up-water", "physics-push-and-pull"],
            ["physics-floating-and-sinking", "g2-litres-and-millilitres"],
            ["chemistry-measuring-a-liquid", "reading-timetables"],
            ["physics-falling-and-floating", "reading-a-postcard-from-the-sea"],
        ],
    },
    {
        world: "railway",
        title: "Movement and timetables",
        purpose: "Measure movement and interpret times before planning a route.",
        grades: [
            ["physics-fast-and-slow", "g1-oclock-and-half-past"],
            ["physics-how-far-how-long", "g2-quarter-past-and-to"],
            [
                "reading-timetables",
                "g3-minutes-and-timetables",
                "physics-speed-from-distance-and-time",
            ],
            ["physics-energy-on-the-track", "physics-reading-a-rate"],
        ],
    },
    {
        world: "woods",
        title: "Trees and woodland life",
        purpose: "Look closely at trees and the relationships between living things.",
        grades: [
            ["nature-the-tree-through-the-year", "art-drawing-from-looking"],
            ["nature-leaves-and-seeds", "nature-where-does-it-live"],
            ["nature-what-a-plant-needs", "nature-food-chains"],
            ["nature-sorting-animals", "nature-food-webs"],
        ],
    },
    {
        world: "kitchen",
        title: "Measure, mix and explain",
        purpose: "Follow instructions, measure ingredients and investigate changes in materials.",
        grades: [
            ["g1-halves-and-quarters", "chemistry-water-ice-and-steam"],
            [
                "reading-following-a-recipe",
                "writing-the-recipe-the-kitchen-is-cooking",
                "chemistry-baking-cannot-be-undone",
            ],
            ["chemistry-measuring-a-liquid", "chemistry-stirring-and-dissolving"],
            ["chemistry-a-fair-test-dissolving", "chemistry-acid-or-alkali"],
        ],
    },
    {
        world: "town",
        title: "Finding our way together",
        purpose: "Read signs and maps, then communicate a route or message clearly.",
        grades: [
            ["reading-read-the-clues", "writing-labels-and-a-caption"],
            ["nature-a-map-from-above", "reading-signs-and-notices", "writing-signs-that-tell-you"],
            ["reading-a-map-with-a-key", "geography-maps"],
            ["g4-coordinates", "writing-directions-on-a-treasure-map"],
        ],
    },
    {
        world: "night-sky",
        title: "Light, shadows and the sky",
        purpose: "Observe light and darkness; later connect observations with models of the sky.",
        grades: [
            ["physics-light-to-see-by", "physics-the-sun-and-the-moon"],
            ["physics-where-a-shadow-comes-from", "physics-see-through-or-not"],
            ["art-monets-light", "nature-weather-measured"],
            ["physics-day-night-and-the-moon", "physics-sun-earth-and-moon-from-above"],
        ],
    },
    {
        world: "sports-ground",
        title: "Movement we can measure",
        purpose: "Compare motion, measure distances and times, and interpret results.",
        grades: [
            ["physics-fast-and-slow", "g1-how-long-how-heavy"],
            ["physics-how-far-how-long", "g2-metres-and-centimetres"],
            ["physics-force-in-newtons", "physics-speed-from-distance-and-time"],
            ["physics-a-fair-test", "physics-reading-a-rate", "g4-graphs-and-the-mean"],
        ],
    },
    {
        world: "laboratory",
        title: "Observe, test and explain",
        purpose: "Choose materials and carry out comparisons that support an explanation.",
        grades: [
            ["chemistry-looking-closely", "chemistry-the-right-material"],
            ["chemistry-solid-liquid-and-gas", "chemistry-does-it-dissolve"],
            ["chemistry-sieve-filter-or-magnet", "chemistry-hot-water-holds-more"],
            ["chemistry-materials-tested-four-ways", "chemistry-rusting-a-fair-test"],
        ],
    },
    {
        world: "mountains",
        title: "Cold, slopes and distance",
        purpose: "Explore temperature, slopes and routes through a changing landscape.",
        grades: [
            ["physics-hot-and-cold", "physics-keeping-cold"],
            ["physics-rolling-down-a-ramp", "chemistry-rocks"],
            ["nature-weather-measured", "geography-maps"],
            [
                "g4-negative-numbers",
                "physics-energy-on-the-track",
                "chemistry-weathering-and-erosion",
            ],
        ],
    },
    {
        world: "open-sea",
        title: "Water and life at sea",
        purpose: "Explore water, marine habitats and how to describe distant places.",
        grades: [
            ["nature-who-lives-in-the-pond", "chemistry-water-ice-and-steam"],
            ["physics-floating-and-sinking", "nature-where-does-it-live"],
            ["nature-by-the-sea", "art-hokusais-wave"],
            ["nature-suited-to-the-place", "reading-a-postcard-from-the-sea"],
        ],
    },
    {
        world: "volcano-island",
        title: "Heat and changing materials",
        purpose: "Compare heating and cooling, and distinguish reversible and lasting changes.",
        grades: [
            ["physics-hot-and-cold", "chemistry-water-ice-and-steam"],
            ["chemistry-rocks", "chemistry-melting-and-freezing"],
            ["chemistry-heating-with-a-flame", "chemistry-hot-water-holds-more"],
            ["chemistry-melting-and-boiling-points", "chemistry-particles-closer-and-further"],
        ],
    },
    {
        world: "home-garden",
        title: "A growing garden",
        purpose: "Observe plants and compare what living things need through their life cycles.",
        grades: [
            ["nature-from-seed-to-flower", "nature-the-tree-through-the-year"],
            ["nature-leaves-and-seeds", "nature-a-life-cycle-in-order"],
            ["chemistry-the-water-cycle", "nature-what-a-plant-needs"],
            ["nature-life-cycles-compared", "nature-food-webs"],
        ],
    },
    {
        world: "reed-marsh",
        title: "Life beside the water",
        purpose: "Follow pond life and the relationships between water, habitats and food.",
        grades: [
            ["nature-who-lives-in-the-pond", "nature-legs-and-wings"],
            ["nature-a-life-cycle-in-order", "nature-where-does-it-live"],
            ["nature-food-chains", "chemistry-the-water-cycle"],
            ["nature-life-cycles-compared", "nature-food-webs"],
        ],
    },
    {
        world: "bandstand-park",
        title: "Make music together",
        purpose: "Build a short sequence of listening, rhythm or instrumental practice.",
        grades: [
            ["music-uke-meet", "music-uke-first-chord", "music-uke-g7-two-chords"],
            ["music-rhythm", "music-writing-a-rhythm", "music-uke-strumming"],
            ["music-reading-the-treble-staff", "music-rests-and-three-time"],
            [
                "music-open-chords-on-the-guitar",
                "music-strum-patterns",
                "music-accompanying-a-song",
            ],
        ],
    },
    {
        world: "canal-town",
        title: "Waterways and routes",
        purpose: "Explore how water, measurement and mechanisms help people move around.",
        grades: [
            ["chemistry-does-it-soak-up-water", "g1-how-long-how-heavy"],
            ["physics-floating-and-sinking", "nature-a-map-from-above"],
            ["chemistry-the-water-cycle", "geography-maps"],
            ["physics-pulleys-and-gears", "nature-scale-and-distance"],
        ],
    },
    {
        world: "winter-fair",
        title: "Patterns, prices and performance",
        purpose: "Prepare for a fair by exploring patterns, money and clear messages.",
        grades: [
            ["art-a-pattern-that-repeats", "g1-coins-and-prices"],
            ["g2-amounts-and-change", "music-writing-a-rhythm"],
            ["g3-dollars-and-cents", "writing-a-cafe-menu"],
            ["g4-money-with-decimals", "writing-a-notice-that-persuades"],
        ],
    },
    {
        world: "valley-farm",
        title: "Plants, land and food",
        purpose:
            "Explore growing conditions, habitats and the food relationships on which life depends.",
        grades: [
            ["nature-from-seed-to-flower", "g1-equal-groups"],
            ["chemistry-soil-what-drains", "nature-leaves-and-seeds"],
            ["nature-what-a-plant-needs", "nature-food-chains"],
            ["nature-life-cycles-compared", "nature-food-webs"],
        ],
    },
    {
        world: "old-tower",
        title: "Stories from the past",
        purpose:
            "History needs its own sourced, age-appropriate lessons; none are published in this pack.",
        grades: [[], [], [], []],
    },
    {
        world: "ferry-town",
        title: "Languages across the water",
        purpose: "A target language and an authored language sequence are still needed.",
        grades: [[], [], [], []],
    },
    {
        world: "painters-hut",
        title: "Look, mix and make",
        purpose: "Develop observation and colour techniques through a small studio sequence.",
        grades: [
            ["art-drawing-from-looking", "art-mixing-the-secondaries"],
            ["art-tints-and-shades", "art-cezannes-shapes"],
            ["art-warm-and-cool", "art-a-landscape-in-three-layers"],
            ["art-mixing-in-proportion", "art-opposite-colours"],
        ],
    },
    {
        world: "star-cliffs",
        title: "Observing light and the sky",
        purpose: "Use light, shadow and observations as foundations for understanding the sky.",
        grades: [
            ["physics-light-to-see-by", "physics-the-sun-and-the-moon"],
            ["physics-where-a-shadow-comes-from", "art-blue-prints"],
            ["art-monets-light", "nature-weather-measured"],
            ["physics-day-night-and-the-moon", "physics-sun-earth-and-moon-from-above"],
        ],
    },
    {
        world: "walled-city",
        title: "Shapes, buildings and routes",
        purpose:
            "Explore the built environment through materials, shape and map reading, without presenting it as history.",
        grades: [
            ["art-shapes-cut-from-paper", "chemistry-the-right-material"],
            ["g2-flat-and-solid-shapes", "nature-a-map-from-above"],
            ["g3-perimeter-and-area", "geography-maps"],
            ["g4-compound-shapes", "writing-directions-on-a-treasure-map"],
        ],
    },
    {
        world: "coral-reef",
        title: "Homes and food in the water",
        purpose: "Build from familiar aquatic habitats towards adaptation and connected food webs.",
        grades: [
            ["nature-who-lives-in-the-pond", "nature-living-or-not"],
            ["science-living-things", "nature-where-does-it-live"],
            ["nature-by-the-sea", "nature-food-chains"],
            ["nature-suited-to-the-place", "nature-food-webs"],
        ],
    },
    {
        world: "crystal-caves",
        title: "Light, sound and crystals",
        purpose:
            "Investigate what can be heard and seen, with crystal growing where the grade supports it.",
        grades: [
            ["physics-light-to-see-by", "physics-sounds-come-from-shaking"],
            ["physics-sound-through-things", "physics-mirrors-send-light-back"],
            ["chemistry-growing-crystals", "physics-high-and-low-loud-and-soft"],
            ["physics-how-we-see", "art-light-and-shadow"],
        ],
    },
    {
        world: "cloud-islands",
        title: "Air, weather and water",
        purpose: "Explore air and the changing water and weather around us.",
        grades: [
            ["chemistry-air-is-everywhere", "chemistry-puddles-disappear"],
            ["physics-air-pushes-back", "chemistry-solid-liquid-and-gas"],
            ["nature-weather-measured", "chemistry-the-water-cycle"],
            ["physics-falling-and-floating", "art-hiroshiges-rain"],
        ],
    },
    {
        world: "dune-oasis",
        title: "Water and living in a place",
        purpose: "Explore water availability, plant needs and adaptation to different habitats.",
        grades: [
            ["nature-from-seed-to-flower", "chemistry-puddles-disappear"],
            ["chemistry-soil-what-drains", "nature-where-does-it-live"],
            ["nature-what-a-plant-needs", "chemistry-the-water-cycle"],
            ["nature-suited-to-the-place", "nature-food-webs"],
        ],
    },
    {
        world: "fossil-cliffs",
        title: "Observe earth and its changes",
        purpose:
            "Build observation and material knowledge around rocks and sediment; only grade 2 currently teaches fossil formation directly.",
        grades: [
            ["chemistry-looking-closely", "chemistry-what-things-are-made-of"],
            ["chemistry-rocks", "chemistry-soil-and-fossils"],
            ["chemistry-getting-it-back"],
            ["chemistry-weathering-and-erosion"],
        ],
    },
    {
        world: "long-grass",
        title: "Small creatures, connected lives",
        purpose:
            "Observe and classify creatures before following their life cycles and food relationships.",
        grades: [
            ["nature-legs-and-wings", "nature-living-or-not"],
            ["nature-where-does-it-live", "nature-a-life-cycle-in-order"],
            ["nature-food-chains", "nature-what-a-plant-needs"],
            ["nature-sorting-animals", "nature-life-cycles-compared"],
        ],
    },
    {
        world: "lamp-rocks",
        title: "Light and signals",
        purpose: "Explore light, simple signals and the circuits that can carry them.",
        grades: [
            ["physics-light-to-see-by", "coding-a-message-in-flashes"],
            ["physics-see-through-or-not", "coding-lamps-that-count"],
            ["physics-a-circuit-that-works", "physics-a-loop-with-a-break"],
            ["physics-brighter-and-dimmer", "physics-how-we-see"],
        ],
    },
    {
        world: "printing-works",
        title: "Marks, repeats and print",
        purpose: "Move from repeated marks to print techniques and repeatable patterns.",
        grades: [
            ["art-thick-and-thin-lines", "art-a-pattern-that-repeats"],
            ["art-rubbings-and-prints", "art-blue-prints"],
            ["art-pictures-made-of-dots", "coding-a-picture-with-a-repeat"],
            ["art-a-print-comes-out-the-other-way", "art-a-repeat-like-william-morris"],
        ],
    },
    {
        world: "book-island",
        title: "Read, understand and respond",
        purpose:
            "Read words and stories with increasing independence, then respond to what they say.",
        grades: [
            [
                "reading-letter-sounds",
                "reading-blending-sounds",
                "reading-a-sentence-and-a-full-stop",
            ],
            ["reading-who-is-in-the-story", "reading-how-do-they-feel"],
            ["reading-putting-the-story-in-order", "reading-story-maps"],
            ["reading-what-it-does-not-say", "writing-a-letter-to-a-character"],
        ],
    },
    {
        world: "treetops",
        title: "Trees and the life around them",
        purpose: "Look from leaves and seeds towards connected habitats and food webs.",
        grades: [
            ["nature-the-tree-through-the-year", "nature-from-seed-to-flower"],
            ["nature-leaves-and-seeds", "nature-where-does-it-live"],
            ["nature-what-a-plant-needs", "nature-food-chains"],
            ["nature-sorting-animals", "nature-food-webs"],
        ],
    },
    {
        world: "salt-flats",
        title: "Water, mixtures and separation",
        purpose:
            "Follow changes in water and investigate how dissolved materials can be separated.",
        grades: [
            ["chemistry-water-ice-and-steam", "chemistry-puddles-disappear"],
            ["chemistry-mixing-and-stirring", "chemistry-does-it-dissolve"],
            ["chemistry-stirring-and-dissolving", "chemistry-evaporating-to-get-the-salt-back"],
            ["chemistry-a-fair-test-dissolving", "chemistry-separating-puzzles"],
        ],
    },
    {
        world: "geyser-valley",
        title: "Heating, cooling and change",
        purpose:
            "Compare states and investigate what heating and cooling do to water and materials.",
        grades: [
            ["physics-hot-and-cold", "chemistry-water-ice-and-steam"],
            ["chemistry-solid-liquid-and-gas", "chemistry-melting-and-freezing"],
            ["chemistry-hot-water-holds-more", "chemistry-the-water-cycle"],
            ["chemistry-particles-closer-and-further", "chemistry-melting-and-boiling-points"],
        ],
    },
    {
        world: "post-office",
        title: "Messages that make sense",
        purpose: "Write and interpret clear messages for someone else to read.",
        grades: [
            ["writing-labels-and-a-caption", "writing-a-capital-and-a-full-stop"],
            ["writing-describe-it-so-it-can-be-found", "writing-signs-that-tell-you"],
            ["writing-planning-three-sentences", "writing-a-postcard-home"],
            [
                "reading-a-postcard-from-the-sea",
                "writing-a-letter-to-a-character",
                "writing-saying-it-shorter",
            ],
        ],
    },
    {
        world: "windmill-island",
        title: "Forces and useful movement",
        purpose: "Explore how forces make things move and how mechanisms change that movement.",
        grades: [
            ["physics-push-and-pull", "physics-what-moves-at-home"],
            ["physics-air-pushes-back", "physics-rough-and-smooth"],
            ["physics-force-in-newtons", "physics-speed-from-distance-and-time"],
            ["physics-levers-and-wheels", "physics-pulleys-and-gears"],
        ],
    },
    {
        world: "clockwork-island",
        title: "Instructions and mechanisms",
        purpose:
            "Build repeatable instructions and explore mechanisms, keeping programming steps in order.",
        grades: [
            ["coding-one-step-at-a-time", "coding-following-instructions"],
            ["coding-doing-it-again", "coding-turning-as-well"],
            ["coding-repeat-with-a-count", "coding-a-program-that-decides"],
            [
                "physics-pulleys-and-gears",
                "coding-a-block-of-your-own",
                "coding-a-block-with-a-number",
            ],
        ],
    },
];

const statusFor = (count: number): JourneyStatus =>
    count > 1 ? "curated" : count ? "thin" : "gap";

/** Immutable membership identity survives pack updates; canonical lesson ids are never rewritten. */
export const journeyDefinitions: readonly JourneyDefinition[] = places.flatMap((place) =>
    place.grades.map((lessonIds, index) => ({
        id: `${place.world}:g${index + 1}:v${JOURNEY_VERSION}`,
        version: JOURNEY_VERSION,
        world: place.world,
        grade: index + 1,
        title: place.title,
        purpose: place.purpose,
        lessonIds,
        status: statusFor(lessonIds.length),
    })),
);

/** A visit uses only published lessons of the requested grade. It never alters prerequisites. */
export function journeyFor(world: string, grade: number, corpus: Corpus): Journey | undefined {
    const definition = journeyDefinitions.find((j) => j.world === world && j.grade === grade);
    if (!definition) return undefined;
    const lessonIds: string[] = [];
    const missingIds: string[] = [];
    for (const id of definition.lessonIds) {
        if (corpus.lesson(id)?.grade === grade) lessonIds.push(id);
        else missingIds.push(id);
    }
    return { ...definition, lessonIds, missingIds, status: statusFor(lessonIds.length) };
}

/** Editorial/build audit, kept separate from graceful resolution against a smaller private pack. */
export function journeyProblems(corpus: Corpus): string[] {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const journey of journeyDefinitions) {
        if (seen.has(journey.id)) problems.push(`Duplicate journey ${journey.id}`);
        seen.add(journey.id);
        const members = new Set<string>();
        for (const id of journey.lessonIds) {
            if (members.has(id)) problems.push(`${journey.id}: duplicate lesson ${id}`);
            members.add(id);
            const lesson = corpus.lesson(id);
            if (!lesson) problems.push(`${journey.id}: missing lesson ${id}`);
            else if (lesson.grade !== journey.grade)
                problems.push(`${journey.id}: wrong grade for ${id}`);
        }
    }
    return problems;
}
