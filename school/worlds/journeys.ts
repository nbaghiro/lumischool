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
    /** A grade with no visit written has none; its id is written out, since a saved visit names it. */
    readonly grades: Readonly<
        Partial<Record<number, { readonly id: string; readonly lessons: readonly string[] }>>
    >;
}

// Membership must be edited deliberately and versioned, never expanded from a subject query.
const places: readonly PlaceJourneys[] = [
    {
        world: "meadow",
        title: "Notice, count and grow",
        purpose:
            "Observe living things, then use counting, comparison and evidence to describe them.",
        grades: {
            1: { id: "meadow:g1:v1", lessons: ["nature-living-or-not", "g1-counting-to-twenty"] },
            2: {
                id: "meadow:g2:v1",
                lessons: ["nature-leaves-and-seeds", "g2-sorting-and-chance"],
            },
            3: { id: "meadow:g3:v1", lessons: ["nature-what-a-plant-needs", "nature-food-chains"] },
            4: { id: "meadow:g4:v1", lessons: ["nature-life-cycles-compared", "nature-food-webs"] },
            5: { id: "meadow:g5:v1", lessons: ["nature-pollination", "nature-a-key-that-sorts"] },
            6: {
                id: "meadow:g6:v1",
                lessons: ["nature-passed-on-and-changed", "nature-how-a-plant-moves-water"],
            },
        },
    },
    {
        world: "harbour",
        title: "Water, boats and journeys",
        purpose: "Explore water and movement, and read information useful to a journey.",
        grades: {
            1: {
                id: "harbour:g1:v1",
                lessons: ["chemistry-does-it-soak-up-water", "physics-push-and-pull"],
            },
            2: {
                id: "harbour:g2:v1",
                lessons: ["physics-floating-and-sinking", "g2-litres-and-millilitres"],
            },
            3: {
                id: "harbour:g3:v1",
                lessons: ["chemistry-measuring-a-liquid", "reading-timetables"],
            },
            4: {
                id: "harbour:g4:v1",
                lessons: ["physics-falling-and-floating", "reading-a-postcard-from-the-sea"],
            },
            5: {
                id: "harbour:g5:v1",
                lessons: ["physics-what-holds-a-boat-up", "g5-rates-and-timetables"],
            },
            6: {
                id: "harbour:g6:v1",
                lessons: ["g6-speed-distance-and-time", "chemistry-density-and-why-ice-floats"],
            },
        },
    },
    {
        world: "railway",
        title: "Movement and timetables",
        purpose: "Measure movement and interpret times before planning a route.",
        grades: {
            1: {
                id: "railway:g1:v1",
                lessons: ["physics-fast-and-slow", "g1-oclock-and-half-past"],
            },
            2: {
                id: "railway:g2:v1",
                lessons: ["physics-how-far-how-long", "g2-quarter-past-and-to"],
            },
            3: {
                id: "railway:g3:v1",
                lessons: [
                    "reading-timetables",
                    "g3-minutes-and-timetables",
                    "physics-speed-from-distance-and-time",
                ],
            },
            4: {
                id: "railway:g4:v1",
                lessons: ["physics-energy-on-the-track", "physics-reading-a-rate"],
            },
            5: {
                id: "railway:g5:v1",
                lessons: ["g5-rates-and-timetables", "physics-streamlined-shapes"],
            },
            6: {
                id: "railway:g6:v1",
                lessons: ["g6-speed-distance-and-time", "g6-direct-proportion"],
            },
        },
    },
    {
        world: "woods",
        title: "Trees and woodland life",
        purpose: "Look closely at trees and the relationships between living things.",
        grades: {
            1: {
                id: "woods:g1:v1",
                lessons: ["nature-the-tree-through-the-year", "art-drawing-from-looking"],
            },
            2: {
                id: "woods:g2:v1",
                lessons: ["nature-leaves-and-seeds", "nature-where-does-it-live"],
            },
            3: { id: "woods:g3:v1", lessons: ["nature-what-a-plant-needs", "nature-food-chains"] },
            4: { id: "woods:g4:v1", lessons: ["nature-sorting-animals", "nature-food-webs"] },
            5: {
                id: "woods:g5:v1",
                lessons: ["nature-animals-of-the-night", "nature-a-key-that-sorts"],
            },
            6: {
                id: "woods:g6:v1",
                lessons: ["nature-a-food-web-over-the-years", "nature-how-a-plant-moves-water"],
            },
        },
    },
    {
        world: "kitchen",
        title: "Measure, mix and explain",
        purpose: "Follow instructions, measure ingredients and investigate changes in materials.",
        grades: {
            1: {
                id: "kitchen:g1:v1",
                lessons: ["g1-halves-and-quarters", "chemistry-water-ice-and-steam"],
            },
            2: {
                id: "kitchen:g2:v1",
                lessons: [
                    "reading-following-a-recipe",
                    "writing-the-recipe-the-kitchen-is-cooking",
                    "chemistry-baking-cannot-be-undone",
                ],
            },
            3: {
                id: "kitchen:g3:v1",
                lessons: ["chemistry-measuring-a-liquid", "chemistry-stirring-and-dissolving"],
            },
            4: {
                id: "kitchen:g4:v1",
                lessons: ["chemistry-a-fair-test-dissolving", "chemistry-acid-or-alkali"],
            },
            5: {
                id: "kitchen:g5:v1",
                lessons: ["chemistry-how-much-dissolves", "chemistry-signs-of-a-new-substance"],
            },
            6: {
                id: "kitchen:g6:v1",
                lessons: ["chemistry-acids-and-alkalis-on-a-ph-scale", "chemistry-neutralising"],
            },
        },
    },
    {
        world: "town",
        title: "Finding our way together",
        purpose: "Read signs and maps, then communicate a route or message clearly.",
        grades: {
            1: {
                id: "town:g1:v1",
                lessons: ["reading-read-the-clues", "writing-labels-and-a-caption"],
            },
            2: {
                id: "town:g2:v1",
                lessons: [
                    "nature-a-map-from-above",
                    "reading-signs-and-notices",
                    "writing-signs-that-tell-you",
                ],
            },
            3: { id: "town:g3:v1", lessons: ["reading-a-map-with-a-key", "geography-maps"] },
            4: {
                id: "town:g4:v1",
                lessons: ["g4-coordinates", "writing-directions-on-a-treasure-map"],
            },
            5: {
                id: "town:g5:v1",
                lessons: ["g5-angles-and-bearings", "reading-the-canal-through-time"],
            },
            6: {
                id: "town:g6:v1",
                lessons: [
                    "g6-scale-drawings-and-four-quadrants",
                    "writing-instructions-for-the-water-wheel",
                ],
            },
        },
    },
    {
        world: "night-sky",
        title: "Light, shadows and the sky",
        purpose: "Observe light and darkness; later connect observations with models of the sky.",
        grades: {
            1: {
                id: "night-sky:g1:v1",
                lessons: ["physics-light-to-see-by", "physics-the-sun-and-the-moon"],
            },
            2: {
                id: "night-sky:g2:v1",
                lessons: ["physics-where-a-shadow-comes-from", "physics-see-through-or-not"],
            },
            3: { id: "night-sky:g3:v1", lessons: ["art-monets-light", "nature-weather-measured"] },
            4: {
                id: "night-sky:g4:v1",
                lessons: [
                    "physics-day-night-and-the-moon",
                    "physics-sun-earth-and-moon-from-above",
                ],
            },
            5: {
                id: "night-sky:g5:v1",
                lessons: ["physics-the-solar-system-to-scale", "art-colours-that-glow"],
            },
            6: {
                id: "night-sky:g6:v1",
                lessons: ["physics-phases-and-eclipses", "physics-the-sun-that-does-not-set"],
            },
        },
    },
    {
        world: "sports-ground",
        title: "Movement we can measure",
        purpose: "Compare motion, measure distances and times, and interpret results.",
        grades: {
            1: {
                id: "sports-ground:g1:v1",
                lessons: ["physics-fast-and-slow", "g1-how-long-how-heavy"],
            },
            2: {
                id: "sports-ground:g2:v1",
                lessons: ["physics-how-far-how-long", "g2-metres-and-centimetres"],
            },
            3: {
                id: "sports-ground:g3:v1",
                lessons: ["physics-force-in-newtons", "physics-speed-from-distance-and-time"],
            },
            4: {
                id: "sports-ground:g4:v1",
                lessons: [
                    "physics-a-fair-test",
                    "physics-reading-a-rate",
                    "g4-graphs-and-the-mean",
                ],
            },
            5: {
                id: "sports-ground:g5:v1",
                lessons: ["physics-what-changes-a-swing", "physics-streamlined-shapes"],
            },
            6: {
                id: "sports-ground:g6:v1",
                lessons: ["g6-speed-distance-and-time", "g6-median-mode-range-and-histogram"],
            },
        },
    },
    {
        world: "laboratory",
        title: "Observe, test and explain",
        purpose: "Choose materials and carry out comparisons that support an explanation.",
        grades: {
            1: {
                id: "laboratory:g1:v1",
                lessons: ["chemistry-looking-closely", "chemistry-the-right-material"],
            },
            2: {
                id: "laboratory:g2:v1",
                lessons: ["chemistry-solid-liquid-and-gas", "chemistry-does-it-dissolve"],
            },
            3: {
                id: "laboratory:g3:v1",
                lessons: ["chemistry-sieve-filter-or-magnet", "chemistry-hot-water-holds-more"],
            },
            4: {
                id: "laboratory:g4:v1",
                lessons: ["chemistry-materials-tested-four-ways", "chemistry-rusting-a-fair-test"],
            },
            5: {
                id: "laboratory:g5:v1",
                lessons: ["chemistry-metals-and-non-metals", "physics-an-electromagnet"],
            },
            6: {
                id: "laboratory:g6:v1",
                lessons: ["chemistry-what-burning-needs", "chemistry-mass-is-kept-in-a-reaction"],
            },
        },
    },
    {
        world: "mountains",
        title: "Cold, slopes and distance",
        purpose: "Explore temperature, slopes and routes through a changing landscape.",
        grades: {
            1: { id: "mountains:g1:v1", lessons: ["physics-hot-and-cold", "physics-keeping-cold"] },
            2: {
                id: "mountains:g2:v1",
                lessons: ["physics-rolling-down-a-ramp", "chemistry-rocks"],
            },
            3: { id: "mountains:g3:v1", lessons: ["nature-weather-measured", "geography-maps"] },
            4: {
                id: "mountains:g4:v1",
                lessons: [
                    "g4-negative-numbers",
                    "physics-energy-on-the-track",
                    "chemistry-weathering-and-erosion",
                ],
            },
            5: {
                id: "mountains:g5:v1",
                lessons: ["chemistry-heating-curves", "g5-angles-and-bearings"],
            },
            6: {
                id: "mountains:g6:v1",
                lessons: ["g6-negative-numbers", "physics-forces-on-a-sledge"],
            },
        },
    },
    {
        world: "open-sea",
        title: "Water and life at sea",
        purpose: "Explore water, marine habitats and how to describe distant places.",
        grades: {
            1: {
                id: "open-sea:g1:v1",
                lessons: ["nature-who-lives-in-the-pond", "chemistry-water-ice-and-steam"],
            },
            2: {
                id: "open-sea:g2:v1",
                lessons: ["physics-floating-and-sinking", "nature-where-does-it-live"],
            },
            3: { id: "open-sea:g3:v1", lessons: ["nature-by-the-sea", "art-hokusais-wave"] },
            4: {
                id: "open-sea:g4:v1",
                lessons: ["nature-suited-to-the-place", "reading-a-postcard-from-the-sea"],
            },
            5: {
                id: "open-sea:g5:v1",
                lessons: ["physics-streamlined-shapes", "nature-river-source-to-mouth"],
            },
            6: {
                id: "open-sea:g6:v1",
                lessons: [
                    "chemistry-density-and-why-ice-floats",
                    "nature-a-food-web-over-the-years",
                ],
            },
        },
    },
    {
        world: "volcano-island",
        title: "Heat and changing materials",
        purpose: "Compare heating and cooling, and distinguish reversible and lasting changes.",
        grades: {
            1: {
                id: "volcano-island:g1:v1",
                lessons: ["physics-hot-and-cold", "chemistry-water-ice-and-steam"],
            },
            2: {
                id: "volcano-island:g2:v1",
                lessons: ["chemistry-rocks", "chemistry-melting-and-freezing"],
            },
            3: {
                id: "volcano-island:g3:v1",
                lessons: ["chemistry-heating-with-a-flame", "chemistry-hot-water-holds-more"],
            },
            4: {
                id: "volcano-island:g4:v1",
                lessons: [
                    "chemistry-melting-and-boiling-points",
                    "chemistry-particles-closer-and-further",
                ],
            },
            5: {
                id: "volcano-island:g5:v1",
                lessons: ["chemistry-heating-curves", "chemistry-signs-of-a-new-substance"],
            },
            6: {
                id: "volcano-island:g6:v1",
                lessons: ["chemistry-the-rock-cycle-and-the-gorge", "chemistry-what-burning-needs"],
            },
        },
    },
    {
        world: "home-garden",
        title: "A growing garden",
        purpose: "Observe plants and compare what living things need through their life cycles.",
        grades: {
            1: {
                id: "home-garden:g1:v1",
                lessons: ["nature-from-seed-to-flower", "nature-the-tree-through-the-year"],
            },
            2: {
                id: "home-garden:g2:v1",
                lessons: ["nature-leaves-and-seeds", "nature-a-life-cycle-in-order"],
            },
            3: {
                id: "home-garden:g3:v1",
                lessons: ["chemistry-the-water-cycle", "nature-what-a-plant-needs"],
            },
            4: {
                id: "home-garden:g4:v1",
                lessons: ["nature-life-cycles-compared", "nature-food-webs"],
            },
            5: {
                id: "home-garden:g5:v1",
                lessons: ["nature-pollination", "nature-a-key-that-sorts"],
            },
            6: {
                id: "home-garden:g6:v1",
                lessons: ["nature-how-a-plant-moves-water", "nature-passed-on-and-changed"],
            },
        },
    },
    {
        world: "reed-marsh",
        title: "Life beside the water",
        purpose: "Follow pond life and the relationships between water, habitats and food.",
        grades: {
            1: {
                id: "reed-marsh:g1:v1",
                lessons: ["nature-who-lives-in-the-pond", "nature-legs-and-wings"],
            },
            2: {
                id: "reed-marsh:g2:v1",
                lessons: ["nature-a-life-cycle-in-order", "nature-where-does-it-live"],
            },
            3: {
                id: "reed-marsh:g3:v1",
                lessons: ["nature-food-chains", "chemistry-the-water-cycle"],
            },
            4: {
                id: "reed-marsh:g4:v1",
                lessons: ["nature-life-cycles-compared", "nature-food-webs"],
            },
            5: {
                id: "reed-marsh:g5:v1",
                lessons: ["nature-river-source-to-mouth", "chemistry-what-the-canal-water-holds"],
            },
            6: {
                id: "reed-marsh:g6:v1",
                lessons: ["nature-a-food-web-over-the-years", "nature-ecosystems-and-people"],
            },
        },
    },
    {
        world: "bandstand-park",
        title: "Make music together",
        purpose: "Build a short sequence of listening, rhythm or instrumental practice.",
        grades: {
            1: {
                id: "bandstand-park:g1:v1",
                lessons: ["music-uke-meet", "music-uke-first-chord", "music-uke-g7-two-chords"],
            },
            2: {
                id: "bandstand-park:g2:v1",
                lessons: ["music-rhythm", "music-writing-a-rhythm", "music-uke-strumming"],
            },
            3: {
                id: "bandstand-park:g3:v1",
                lessons: ["music-reading-the-treble-staff", "music-rests-and-three-time"],
            },
            4: {
                id: "bandstand-park:g4:v1",
                lessons: [
                    "music-open-chords-on-the-guitar",
                    "music-strum-patterns",
                    "music-accompanying-a-song",
                ],
            },
            5: {
                id: "bandstand-park:g5:v1",
                lessons: ["music-syncopation", "music-primary-chords", "music-song-form"],
            },
            6: {
                id: "bandstand-park:g6:v1",
                lessons: ["music-six-eight-time", "music-twelve-bar-blues", "music-both-hands"],
            },
        },
    },
    {
        world: "canal-town",
        title: "Waterways and routes",
        purpose: "Explore how water, measurement and mechanisms help people move around.",
        grades: {
            1: {
                id: "canal-town:g1:v1",
                lessons: ["chemistry-does-it-soak-up-water", "g1-how-long-how-heavy"],
            },
            2: {
                id: "canal-town:g2:v1",
                lessons: ["physics-floating-and-sinking", "nature-a-map-from-above"],
            },
            3: { id: "canal-town:g3:v1", lessons: ["chemistry-the-water-cycle", "geography-maps"] },
            4: {
                id: "canal-town:g4:v1",
                lessons: ["physics-pulleys-and-gears", "nature-scale-and-distance"],
            },
            5: {
                id: "canal-town:g5:v1",
                lessons: [
                    "physics-deeper-water-pushes-harder",
                    "writing-explaining-how-the-lock-works",
                    "g5-volume-of-cuboids",
                ],
            },
            6: {
                id: "canal-town:g6:v1",
                lessons: [
                    "g6-inverse-proportion",
                    "physics-turning-forces",
                    "g6-two-travellers-and-a-current",
                ],
            },
        },
    },
    {
        world: "winter-fair",
        title: "Patterns, prices and performance",
        purpose: "Prepare for a fair by exploring patterns, money and clear messages.",
        grades: {
            1: {
                id: "winter-fair:g1:v1",
                lessons: ["art-a-pattern-that-repeats", "g1-coins-and-prices"],
            },
            2: {
                id: "winter-fair:g2:v1",
                lessons: ["g2-amounts-and-change", "music-writing-a-rhythm"],
            },
            3: {
                id: "winter-fair:g3:v1",
                lessons: ["g3-dollars-and-cents", "writing-a-cafe-menu"],
            },
            4: {
                id: "winter-fair:g4:v1",
                lessons: ["g4-money-with-decimals", "writing-a-notice-that-persuades"],
            },
            5: {
                id: "winter-fair:g5:v1",
                lessons: ["g5-multiplying-decimals", "g5-percentages-and-pie-charts"],
            },
            6: {
                id: "winter-fair:g6:v1",
                lessons: ["g6-percentage-change", "g6-counting-and-probability"],
            },
        },
    },
    {
        world: "valley-farm",
        title: "Plants, land and food",
        purpose:
            "Explore growing conditions, habitats and the food relationships on which life depends.",
        grades: {
            1: {
                id: "valley-farm:g1:v1",
                lessons: ["nature-from-seed-to-flower", "g1-equal-groups"],
            },
            2: {
                id: "valley-farm:g2:v1",
                lessons: ["chemistry-soil-what-drains", "nature-leaves-and-seeds"],
            },
            3: {
                id: "valley-farm:g3:v1",
                lessons: ["nature-what-a-plant-needs", "nature-food-chains"],
            },
            4: {
                id: "valley-farm:g4:v1",
                lessons: ["nature-life-cycles-compared", "nature-food-webs"],
            },
            5: {
                id: "valley-farm:g5:v1",
                lessons: ["nature-pollination", "nature-food-and-digestion"],
            },
            6: {
                id: "valley-farm:g6:v1",
                lessons: ["nature-how-a-plant-moves-water", "nature-ecosystems-and-people"],
            },
        },
    },
    {
        world: "old-tower",
        title: "Stories from the past",
        purpose:
            "History needs its own sourced, age-appropriate lessons; none are published in this pack.",
        grades: {
            1: { id: "old-tower:g1:v1", lessons: [] },
            2: { id: "old-tower:g2:v1", lessons: [] },
            3: { id: "old-tower:g3:v1", lessons: [] },
            4: { id: "old-tower:g4:v1", lessons: [] },
            5: { id: "old-tower:g5:v1", lessons: [] },
            6: { id: "old-tower:g6:v1", lessons: [] },
        },
    },
    {
        world: "ferry-town",
        title: "Languages across the water",
        purpose: "A target language and an authored language sequence are still needed.",
        grades: {
            1: { id: "ferry-town:g1:v1", lessons: [] },
            2: { id: "ferry-town:g2:v1", lessons: [] },
            3: { id: "ferry-town:g3:v1", lessons: [] },
            4: { id: "ferry-town:g4:v1", lessons: [] },
            5: { id: "ferry-town:g5:v1", lessons: [] },
            6: { id: "ferry-town:g6:v1", lessons: [] },
        },
    },
    {
        world: "painters-hut",
        title: "Look, mix and make",
        purpose: "Develop observation and colour techniques through a small studio sequence.",
        grades: {
            1: {
                id: "painters-hut:g1:v1",
                lessons: ["art-drawing-from-looking", "art-mixing-the-secondaries"],
            },
            2: {
                id: "painters-hut:g2:v1",
                lessons: ["art-tints-and-shades", "art-cezannes-shapes"],
            },
            3: {
                id: "painters-hut:g3:v1",
                lessons: ["art-warm-and-cool", "art-a-landscape-in-three-layers"],
            },
            4: {
                id: "painters-hut:g4:v1",
                lessons: ["art-mixing-in-proportion", "art-opposite-colours"],
            },
            5: {
                id: "painters-hut:g5:v1",
                lessons: [
                    "art-looking-down-the-canal",
                    "art-colours-that-glow",
                    "art-tone-in-five-steps",
                ],
            },
            6: {
                id: "painters-hut:g6:v1",
                lessons: [
                    "art-a-sky-that-changes-colour",
                    "art-water-in-paint",
                    "art-a-landscape-that-fades",
                ],
            },
        },
    },
    {
        world: "star-cliffs",
        title: "Observing light and the sky",
        purpose: "Use light, shadow and observations as foundations for understanding the sky.",
        grades: {
            1: {
                id: "star-cliffs:g1:v1",
                lessons: ["physics-light-to-see-by", "physics-the-sun-and-the-moon"],
            },
            2: {
                id: "star-cliffs:g2:v1",
                lessons: ["physics-where-a-shadow-comes-from", "art-blue-prints"],
            },
            3: {
                id: "star-cliffs:g3:v1",
                lessons: ["art-monets-light", "nature-weather-measured"],
            },
            4: {
                id: "star-cliffs:g4:v1",
                lessons: [
                    "physics-day-night-and-the-moon",
                    "physics-sun-earth-and-moon-from-above",
                ],
            },
            5: {
                id: "star-cliffs:g5:v1",
                lessons: [
                    "physics-lenses-and-a-telescope",
                    "physics-the-angle-a-mirror-sends-light",
                    "reading-two-accounts-of-a-comet",
                ],
            },
            6: {
                id: "star-cliffs:g6:v1",
                lessons: ["physics-phases-and-eclipses", "coding-an-orbit-step-by-step"],
            },
        },
    },
    {
        world: "walled-city",
        title: "Shapes, buildings and routes",
        purpose:
            "Explore the built environment through materials, shape and map reading, without presenting it as history.",
        grades: {
            1: {
                id: "walled-city:g1:v1",
                lessons: ["art-shapes-cut-from-paper", "chemistry-the-right-material"],
            },
            2: {
                id: "walled-city:g2:v1",
                lessons: ["g2-flat-and-solid-shapes", "nature-a-map-from-above"],
            },
            3: { id: "walled-city:g3:v1", lessons: ["g3-perimeter-and-area", "geography-maps"] },
            4: {
                id: "walled-city:g4:v1",
                lessons: ["g4-compound-shapes", "writing-directions-on-a-treasure-map"],
            },
            5: {
                id: "walled-city:g5:v1",
                lessons: [
                    "art-a-building-in-proportion",
                    "chemistry-stone-brick-mortar-and-concrete",
                    "g5-area-of-triangles",
                ],
            },
            6: {
                id: "walled-city:g6:v1",
                lessons: ["art-two-point-perspective", "g6-scale-drawings-and-four-quadrants"],
            },
        },
    },
    {
        world: "coral-reef",
        title: "Homes and food in the water",
        purpose: "Build from familiar aquatic habitats towards adaptation and connected food webs.",
        grades: {
            1: {
                id: "coral-reef:g1:v1",
                lessons: ["nature-who-lives-in-the-pond", "nature-living-or-not"],
            },
            2: {
                id: "coral-reef:g2:v1",
                lessons: ["science-living-things", "nature-where-does-it-live"],
            },
            3: { id: "coral-reef:g3:v1", lessons: ["nature-by-the-sea", "nature-food-chains"] },
            4: {
                id: "coral-reef:g4:v1",
                lessons: ["nature-suited-to-the-place", "nature-food-webs"],
            },
            5: {
                id: "coral-reef:g5:v1",
                lessons: ["nature-a-key-that-sorts", "nature-river-source-to-mouth"],
            },
            6: {
                id: "coral-reef:g6:v1",
                lessons: ["nature-built-for-the-cold", "nature-a-food-web-over-the-years"],
            },
        },
    },
    {
        world: "crystal-caves",
        title: "Light, sound and crystals",
        purpose:
            "Investigate what can be heard and seen, with crystal growing where the grade supports it.",
        grades: {
            1: {
                id: "crystal-caves:g1:v1",
                lessons: ["physics-light-to-see-by", "physics-sounds-come-from-shaking"],
            },
            2: {
                id: "crystal-caves:g2:v1",
                lessons: ["physics-sound-through-things", "physics-mirrors-send-light-back"],
            },
            3: {
                id: "crystal-caves:g3:v1",
                lessons: ["chemistry-growing-crystals", "physics-high-and-low-loud-and-soft"],
            },
            4: {
                id: "crystal-caves:g4:v1",
                lessons: ["physics-how-we-see", "art-light-and-shadow"],
            },
            5: {
                id: "crystal-caves:g5:v1",
                lessons: ["physics-the-angle-a-mirror-sends-light", "chemistry-how-much-dissolves"],
            },
            6: {
                id: "crystal-caves:g6:v1",
                lessons: ["physics-the-shape-of-a-sound", "chemistry-minerals-and-hard-water"],
            },
        },
    },
    {
        world: "cloud-islands",
        title: "Air, weather and water",
        purpose: "Explore air and the changing water and weather around us.",
        grades: {
            1: {
                id: "cloud-islands:g1:v1",
                lessons: ["chemistry-air-is-everywhere", "chemistry-puddles-disappear"],
            },
            2: {
                id: "cloud-islands:g2:v1",
                lessons: ["physics-air-pushes-back", "chemistry-solid-liquid-and-gas"],
            },
            3: {
                id: "cloud-islands:g3:v1",
                lessons: ["nature-weather-measured", "chemistry-the-water-cycle"],
            },
            4: {
                id: "cloud-islands:g4:v1",
                lessons: ["physics-falling-and-floating", "art-hiroshiges-rain"],
            },
            5: {
                id: "cloud-islands:g5:v1",
                lessons: ["chemistry-air-is-a-mixture", "chemistry-getting-clean-water-back"],
            },
            6: {
                id: "cloud-islands:g6:v1",
                lessons: [
                    "chemistry-water-in-the-air-dew-and-frost",
                    "chemistry-a-gas-squashed-and-cooled",
                ],
            },
        },
    },
    {
        world: "dune-oasis",
        title: "Water and living in a place",
        purpose: "Explore water availability, plant needs and adaptation to different habitats.",
        grades: {
            1: {
                id: "dune-oasis:g1:v1",
                lessons: ["nature-from-seed-to-flower", "chemistry-puddles-disappear"],
            },
            2: {
                id: "dune-oasis:g2:v1",
                lessons: ["chemistry-soil-what-drains", "nature-where-does-it-live"],
            },
            3: {
                id: "dune-oasis:g3:v1",
                lessons: ["nature-what-a-plant-needs", "chemistry-the-water-cycle"],
            },
            4: {
                id: "dune-oasis:g4:v1",
                lessons: ["nature-suited-to-the-place", "nature-food-webs"],
            },
            5: {
                id: "dune-oasis:g5:v1",
                lessons: ["chemistry-getting-clean-water-back", "nature-animals-of-the-night"],
            },
            6: {
                id: "dune-oasis:g6:v1",
                lessons: ["nature-built-for-the-cold", "nature-how-a-plant-moves-water"],
            },
        },
    },
    {
        world: "fossil-cliffs",
        title: "Observe earth and its changes",
        purpose:
            "Build observation and material knowledge around rocks and sediment; only grade 2 currently teaches fossil formation directly.",
        grades: {
            1: {
                id: "fossil-cliffs:g1:v1",
                lessons: ["chemistry-looking-closely", "chemistry-what-things-are-made-of"],
            },
            2: {
                id: "fossil-cliffs:g2:v1",
                lessons: ["chemistry-rocks", "chemistry-soil-and-fossils"],
            },
            3: { id: "fossil-cliffs:g3:v1", lessons: ["chemistry-getting-it-back"] },
            4: { id: "fossil-cliffs:g4:v1", lessons: ["chemistry-weathering-and-erosion"] },
            5: {
                id: "fossil-cliffs:g5:v1",
                lessons: [
                    "nature-river-source-to-mouth",
                    "chemistry-stone-brick-mortar-and-concrete",
                ],
            },
            6: {
                id: "fossil-cliffs:g6:v1",
                lessons: ["chemistry-the-rock-cycle-and-the-gorge", "nature-passed-on-and-changed"],
            },
        },
    },
    {
        world: "long-grass",
        title: "Small creatures, connected lives",
        purpose:
            "Observe and classify creatures before following their life cycles and food relationships.",
        grades: {
            1: {
                id: "long-grass:g1:v1",
                lessons: ["nature-legs-and-wings", "nature-living-or-not"],
            },
            2: {
                id: "long-grass:g2:v1",
                lessons: ["nature-where-does-it-live", "nature-a-life-cycle-in-order"],
            },
            3: {
                id: "long-grass:g3:v1",
                lessons: ["nature-food-chains", "nature-what-a-plant-needs"],
            },
            4: {
                id: "long-grass:g4:v1",
                lessons: ["nature-sorting-animals", "nature-life-cycles-compared"],
            },
            5: {
                id: "long-grass:g5:v1",
                lessons: ["nature-a-key-that-sorts", "nature-pollination"],
            },
            6: {
                id: "long-grass:g6:v1",
                lessons: ["nature-passed-on-and-changed", "nature-a-food-web-over-the-years"],
            },
        },
    },
    {
        world: "lamp-rocks",
        title: "Light and signals",
        purpose: "Explore light, simple signals and the circuits that can carry them.",
        grades: {
            1: {
                id: "lamp-rocks:g1:v1",
                lessons: ["physics-light-to-see-by", "coding-a-message-in-flashes"],
            },
            2: {
                id: "lamp-rocks:g2:v1",
                lessons: ["physics-see-through-or-not", "coding-lamps-that-count"],
            },
            3: {
                id: "lamp-rocks:g3:v1",
                lessons: ["physics-a-circuit-that-works", "physics-a-loop-with-a-break"],
            },
            4: {
                id: "lamp-rocks:g4:v1",
                lessons: ["physics-brighter-and-dimmer", "physics-how-we-see"],
            },
            5: {
                id: "lamp-rocks:g5:v1",
                lessons: ["physics-circuits-in-symbols", "physics-the-angle-a-mirror-sends-light"],
            },
            6: {
                id: "lamp-rocks:g6:v1",
                lessons: ["physics-electricity-from-a-turbine", "physics-storing-electricity"],
            },
        },
    },
    {
        world: "printing-works",
        title: "Marks, repeats and print",
        purpose: "Move from repeated marks to print techniques and repeatable patterns.",
        grades: {
            1: {
                id: "printing-works:g1:v1",
                lessons: ["art-thick-and-thin-lines", "art-a-pattern-that-repeats"],
            },
            2: {
                id: "printing-works:g2:v1",
                lessons: ["art-rubbings-and-prints", "art-blue-prints"],
            },
            3: {
                id: "printing-works:g3:v1",
                lessons: ["art-pictures-made-of-dots", "coding-a-picture-with-a-repeat"],
            },
            4: {
                id: "printing-works:g4:v1",
                lessons: [
                    "art-a-print-comes-out-the-other-way",
                    "art-a-repeat-like-william-morris",
                ],
            },
            5: {
                id: "printing-works:g5:v1",
                lessons: [
                    "art-a-print-in-two-colours",
                    "art-patterns-with-compasses",
                    "coding-polygons-from-a-turtle",
                ],
            },
            6: {
                id: "printing-works:g6:v1",
                lessons: ["coding-a-block-that-uses-itself", "art-a-landscape-that-fades"],
            },
        },
    },
    {
        world: "book-island",
        title: "Read, understand and respond",
        purpose:
            "Read words and stories with increasing independence, then respond to what they say.",
        grades: {
            1: {
                id: "book-island:g1:v1",
                lessons: [
                    "reading-letter-sounds",
                    "reading-blending-sounds",
                    "reading-a-sentence-and-a-full-stop",
                ],
            },
            2: {
                id: "book-island:g2:v1",
                lessons: ["reading-who-is-in-the-story", "reading-how-do-they-feel"],
            },
            3: {
                id: "book-island:g3:v1",
                lessons: ["reading-putting-the-story-in-order", "reading-story-maps"],
            },
            4: {
                id: "book-island:g4:v1",
                lessons: ["reading-what-it-does-not-say", "writing-a-letter-to-a-character"],
            },
            5: {
                id: "book-island:g5:v1",
                lessons: [
                    "reading-summing-up-by-chapters",
                    "reading-a-storys-theme",
                    "reading-how-a-character-changes",
                ],
            },
            6: {
                id: "book-island:g6:v1",
                lessons: [
                    "reading-inference-across-a-whole-text",
                    "reading-one-theme-in-two-stories",
                    "reading-a-poems-form",
                ],
            },
        },
    },
    {
        world: "treetops",
        title: "Trees and the life around them",
        purpose: "Look from leaves and seeds towards connected habitats and food webs.",
        grades: {
            1: {
                id: "treetops:g1:v1",
                lessons: ["nature-the-tree-through-the-year", "nature-from-seed-to-flower"],
            },
            2: {
                id: "treetops:g2:v1",
                lessons: ["nature-leaves-and-seeds", "nature-where-does-it-live"],
            },
            3: {
                id: "treetops:g3:v1",
                lessons: ["nature-what-a-plant-needs", "nature-food-chains"],
            },
            4: { id: "treetops:g4:v1", lessons: ["nature-sorting-animals", "nature-food-webs"] },
            5: {
                id: "treetops:g5:v1",
                lessons: ["nature-pollination", "nature-animals-of-the-night"],
            },
            6: {
                id: "treetops:g6:v1",
                lessons: ["nature-how-a-plant-moves-water", "nature-a-food-web-over-the-years"],
            },
        },
    },
    {
        world: "salt-flats",
        title: "Water, mixtures and separation",
        purpose:
            "Follow changes in water and investigate how dissolved materials can be separated.",
        grades: {
            1: {
                id: "salt-flats:g1:v1",
                lessons: ["chemistry-water-ice-and-steam", "chemistry-puddles-disappear"],
            },
            2: {
                id: "salt-flats:g2:v1",
                lessons: ["chemistry-mixing-and-stirring", "chemistry-does-it-dissolve"],
            },
            3: {
                id: "salt-flats:g3:v1",
                lessons: [
                    "chemistry-stirring-and-dissolving",
                    "chemistry-evaporating-to-get-the-salt-back",
                ],
            },
            4: {
                id: "salt-flats:g4:v1",
                lessons: ["chemistry-a-fair-test-dissolving", "chemistry-separating-puzzles"],
            },
            5: {
                id: "salt-flats:g5:v1",
                lessons: [
                    "chemistry-how-much-dissolves",
                    "chemistry-getting-clean-water-back",
                    "chemistry-what-the-canal-water-holds",
                ],
            },
            6: {
                id: "salt-flats:g6:v1",
                lessons: [
                    "chemistry-salt-and-the-freezing-point",
                    "chemistry-minerals-and-hard-water",
                ],
            },
        },
    },
    {
        world: "geyser-valley",
        title: "Heating, cooling and change",
        purpose:
            "Compare states and investigate what heating and cooling do to water and materials.",
        grades: {
            1: {
                id: "geyser-valley:g1:v1",
                lessons: ["physics-hot-and-cold", "chemistry-water-ice-and-steam"],
            },
            2: {
                id: "geyser-valley:g2:v1",
                lessons: ["chemistry-solid-liquid-and-gas", "chemistry-melting-and-freezing"],
            },
            3: {
                id: "geyser-valley:g3:v1",
                lessons: ["chemistry-hot-water-holds-more", "chemistry-the-water-cycle"],
            },
            4: {
                id: "geyser-valley:g4:v1",
                lessons: [
                    "chemistry-particles-closer-and-further",
                    "chemistry-melting-and-boiling-points",
                ],
            },
            5: {
                id: "geyser-valley:g5:v1",
                lessons: ["chemistry-heating-curves", "chemistry-getting-clean-water-back"],
            },
            6: {
                id: "geyser-valley:g6:v1",
                lessons: [
                    "physics-heat-on-the-move",
                    "chemistry-a-gas-squashed-and-cooled",
                    "coding-simulating-cooling",
                ],
            },
        },
    },
    {
        world: "post-office",
        title: "Messages that make sense",
        purpose: "Write and interpret clear messages for someone else to read.",
        grades: {
            1: {
                id: "post-office:g1:v1",
                lessons: ["writing-labels-and-a-caption", "writing-a-capital-and-a-full-stop"],
            },
            2: {
                id: "post-office:g2:v1",
                lessons: ["writing-describe-it-so-it-can-be-found", "writing-signs-that-tell-you"],
            },
            3: {
                id: "post-office:g3:v1",
                lessons: ["writing-planning-three-sentences", "writing-a-postcard-home"],
            },
            4: {
                id: "post-office:g4:v1",
                lessons: [
                    "reading-a-postcard-from-the-sea",
                    "writing-a-letter-to-a-character",
                    "writing-saying-it-shorter",
                ],
            },
            5: {
                id: "post-office:g5:v1",
                lessons: [
                    "writing-formal-and-informal-letters",
                    "writing-a-paragraph-and-its-topic-sentence",
                ],
            },
            6: {
                id: "post-office:g6:v1",
                lessons: ["writing-a-speech-that-persuades", "writing-a-summary-in-fifty-words"],
            },
        },
    },
    {
        world: "windmill-island",
        title: "Forces and useful movement",
        purpose: "Explore how forces make things move and how mechanisms change that movement.",
        grades: {
            1: {
                id: "windmill-island:g1:v1",
                lessons: ["physics-push-and-pull", "physics-what-moves-at-home"],
            },
            2: {
                id: "windmill-island:g2:v1",
                lessons: ["physics-air-pushes-back", "physics-rough-and-smooth"],
            },
            3: {
                id: "windmill-island:g3:v1",
                lessons: ["physics-force-in-newtons", "physics-speed-from-distance-and-time"],
            },
            4: {
                id: "windmill-island:g4:v1",
                lessons: ["physics-levers-and-wheels", "physics-pulleys-and-gears"],
            },
            5: {
                id: "windmill-island:g5:v1",
                lessons: ["physics-what-changes-a-swing", "physics-streamlined-shapes"],
            },
            6: {
                id: "windmill-island:g6:v1",
                lessons: ["physics-turning-forces", "physics-energy-at-the-water-wheel"],
            },
        },
    },
    {
        world: "clockwork-island",
        title: "Instructions and mechanisms",
        purpose:
            "Build repeatable instructions and explore mechanisms, keeping programming steps in order.",
        grades: {
            1: {
                id: "clockwork-island:g1:v1",
                lessons: ["coding-one-step-at-a-time", "coding-following-instructions"],
            },
            2: {
                id: "clockwork-island:g2:v1",
                lessons: ["coding-doing-it-again", "coding-turning-as-well"],
            },
            3: {
                id: "clockwork-island:g3:v1",
                lessons: ["coding-repeat-with-a-count", "coding-a-program-that-decides"],
            },
            4: {
                id: "clockwork-island:g4:v1",
                lessons: [
                    "physics-pulleys-and-gears",
                    "coding-a-block-of-your-own",
                    "coding-a-block-with-a-number",
                ],
            },
            5: {
                id: "clockwork-island:g5:v1",
                lessons: [
                    "coding-a-repeat-through-a-list",
                    "coding-a-block-with-two-inputs",
                    "coding-searching-a-list",
                ],
            },
            6: {
                id: "clockwork-island:g6:v1",
                lessons: [
                    "coding-reading-a-program-as-text",
                    "coding-two-sorts-compared",
                    "coding-the-fewest-steps",
                ],
            },
        },
    },
    {
        world: "midnight-sun",
        title: "Cold, ice and the sun that stays",
        purpose:
            "Explore cold and ice, measure temperatures, and follow the sun's path across the sky.",
        grades: {
            1: {
                id: "midnight-sun:g1:v1",
                lessons: ["physics-hot-and-cold", "physics-keeping-cold"],
            },
            2: {
                id: "midnight-sun:g2:v1",
                lessons: ["chemistry-melting-and-freezing", "chemistry-which-melts-first"],
            },
            3: {
                id: "midnight-sun:g3:v1",
                lessons: ["nature-weather-measured", "chemistry-the-water-cycle"],
            },
            4: {
                id: "midnight-sun:g4:v1",
                lessons: ["g4-negative-numbers", "physics-day-night-and-the-moon"],
            },
            5: {
                id: "midnight-sun:g5:v1",
                lessons: [
                    "chemistry-heating-curves",
                    "physics-the-solar-system-to-scale",
                    "chemistry-gases-dissolved-in-water",
                ],
            },
            6: {
                id: "midnight-sun:g6:v1",
                lessons: [
                    "physics-the-sun-that-does-not-set",
                    "chemistry-density-and-why-ice-floats",
                    "nature-built-for-the-cold",
                ],
            },
        },
    },
    {
        world: "waterfall-gorge",
        title: "Water, rock and energy",
        purpose:
            "Follow falling and flowing water: the rock it wears away, the push it carries and the energy it can turn.",
        grades: {
            1: {
                id: "waterfall-gorge:g1:v1",
                lessons: ["chemistry-water-ice-and-steam", "physics-push-and-pull"],
            },
            2: {
                id: "waterfall-gorge:g2:v1",
                lessons: ["chemistry-rocks", "physics-rolling-down-a-ramp"],
            },
            3: {
                id: "waterfall-gorge:g3:v1",
                lessons: ["chemistry-the-water-cycle", "physics-force-in-newtons"],
            },
            4: {
                id: "waterfall-gorge:g4:v1",
                lessons: ["chemistry-weathering-and-erosion", "physics-energy-on-the-track"],
            },
            5: {
                id: "waterfall-gorge:g5:v1",
                lessons: ["nature-river-source-to-mouth", "physics-deeper-water-pushes-harder"],
            },
            6: {
                id: "waterfall-gorge:g6:v1",
                lessons: [
                    "chemistry-the-rock-cycle-and-the-gorge",
                    "physics-energy-at-the-water-wheel",
                    "chemistry-layers-and-the-earth-inside",
                ],
            },
        },
    },
    {
        world: "moon",
        title: "The moon, the Earth and space",
        purpose:
            "Watch the sun and the moon, then model how they move and compare weight on other worlds.",
        grades: {
            1: {
                id: "moon:g1:v1",
                lessons: ["physics-the-sun-and-the-moon", "physics-light-to-see-by"],
            },
            2: {
                id: "moon:g2:v1",
                lessons: ["physics-where-a-shadow-comes-from", "physics-mirrors-send-light-back"],
            },
            3: { id: "moon:g3:v1", lessons: ["physics-force-in-newtons"] },
            4: {
                id: "moon:g4:v1",
                lessons: [
                    "physics-day-night-and-the-moon",
                    "physics-sun-earth-and-moon-from-above",
                ],
            },
            5: {
                id: "moon:g5:v1",
                lessons: ["physics-mass-and-weight", "physics-the-solar-system-to-scale"],
            },
            6: {
                id: "moon:g6:v1",
                lessons: [
                    "physics-falling-on-the-moon",
                    "physics-phases-and-eclipses",
                    "chemistry-the-air-the-crew-breathe",
                ],
            },
        },
    },
];

const statusFor = (count: number): JourneyStatus =>
    count > 1 ? "curated" : count ? "thin" : "gap";

/** Immutable membership identity survives pack updates; canonical lesson ids are never rewritten. */
export const journeyDefinitions: readonly JourneyDefinition[] = places.flatMap((place) =>
    Object.entries(place.grades).flatMap(([grade, visit]) =>
        visit
            ? [
                  {
                      id: visit.id,
                      version: JOURNEY_VERSION,
                      world: place.world,
                      grade: Number(grade),
                      title: place.title,
                      purpose: place.purpose,
                      lessonIds: visit.lessons,
                      status: statusFor(visit.lessons.length),
                  },
              ]
            : [],
    ),
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
