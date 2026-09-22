// The drawings a world may use, by a stable id.
//
// Worlds are drawn from the shelf, not beside it. Every entry here is either a coded visual that is
// already on the shelf or a hand-drawn file already in art/, named once with the size it stands at
// in a world and the parts of a world it may play. This file holds no drawing and imports only the
// worlds' declarations, which are data, so a test can check the list and a parent's saved choice can
// be read without loading any art.
//
// The id is the name a world and a saved choice use, and it is deliberately not the file name or the
// visual id: a drawing can be renamed on the shelf without every family's saved choice pointing at
// nothing. `ref` is the only place the shelf's own name appears.
//
// The pieces a world draws itself (grass, ripples, sleepers, clouds, gulls) are not here. They are
// marks rather than subjects, nobody would put one in a question, and they live in the painters.
import { artKey, type ArtRef, type PathKind } from "../../engine/space";
import { FEATURES, SIGHTS } from "./geography";
import { lifeArt } from "./life";
import { worldById } from "./worlds";

export type Role = ArtRef["roles"][number];

/** An entry as the list holds it: what the view carries of a drawing (`ArtRef`), under its id. */
export interface ArtEntry extends ArtRef {
    id: string;
}

const shelf = (
    id: string,
    title: string,
    roles: Role[],
    ref: string,
    scale: number,
    params?: Record<string, unknown>,
    moves?: ArtEntry["moves"],
): ArtEntry => ({ id, title, roles, from: "shelf", ref, scale, params, moves });
const file = (
    id: string,
    title: string,
    roles: Role[],
    ref: string,
    scale: number,
    moves?: ArtEntry["moves"],
): ArtEntry => ({ id, title, roles, from: "file", ref, scale, moves });
const scenery = (
    id: string,
    title: string,
    roles: Role[],
    ref: string,
    scale: number,
    params?: Record<string, unknown>,
): ArtEntry => ({ id, title, roles, from: "world", ref, scale, params });

export const ART: ArtEntry[] = [
    // the meadow, from the nature and story shelves and the hand-drawn settings
    file("hills", "Hills with a path", ["horizon"], "hills", 1.9),
    file("sun", "Sun", ["sky"], "sun", 1.6),
    file("treehouse", "Treehouse", ["gate", "landmark"], "treehouse", 1.5),
    file("garden", "Garden bed", ["gate", "landmark"], "garden", 1.3),
    file("wheelbarrow", "Wheelbarrow", ["landmark"], "wheelbarrow", 1.2),
    file("bunting", "Bunting", ["landmark"], "bunting", 1.2),
    file("kite", "Kite", ["landmark"], "kite", 1.2, "sway"),
    shelf("tree", "Apple tree", ["horizon", "landmark"], "tree", 1.5, {
        fruit: 5,
        fallen: 2,
        item: "apple",
    }),
    // one tree, in the world's own season, which the painter sets as it places it
    shelf("season-tree", "The tree through the year", ["landmark", "horizon"], "seasontrees", 1.5, {
        seasons: ["summer"],
        names: 0,
    }),
    shelf("pond", "Pond", ["landmark"], "pond", 1.3, { pads: 4, fish: 2, frog: true }),
    shelf("flowers", "Flowers", ["landmark"], "flowers", 1.2, { count: 3, petals: 5 }),
    shelf("sheep", "Sheep in a field", ["horizon", "landmark"], "animals", 1.2, {
        kind: "sheep",
        count: 3,
        label: "",
    }),
    file("hedgehog", "Hedgehog", ["creature"], "hedgehog", 1.3, "hop"),
    file("hen", "Hen", ["creature"], "hen", 1.2, "bob"),
    file("duck", "Duck", ["creature"], "duck", 1.2, "bob"),
    file("cat", "Cat", ["creature"], "cat", 1.2, "bob"),
    file("owl", "Owl on a branch", ["creature"], "owl", 1.2, "sway"),
    shelf(
        "minibeasts",
        "Ladybird, butterfly and bee",
        ["creature"],
        "minibeasts",
        1,
        { kinds: ["butterfly", "ladybird", "bee"], spots: 7, legs: false },
        "sway",
    ),
    shelf(
        "birds",
        "Birds on a wire",
        ["creature"],
        "birdrow",
        1.1,
        { count: 4, facing: [1, -1, 1, 1], wire: true },
        "bob",
    ),

    // the harbour, from the hand-drawn objects and settings
    file("boat", "Sailing boat", ["horizon", "gate", "landmark"], "boat", 1.6, "sway"),
    file("sandcastle", "Sandcastle", ["gate", "landmark"], "sandcastle", 1.3),
    file("market-stall", "Market stall", ["gate", "landmark", "horizon"], "market-stall", 1.3),
    file("shop-front", "Shop front", ["gate", "landmark"], "shop-front", 1.2),
    file("fish-tank", "Fish tank", ["landmark"], "fish-tank", 1.1),

    // the railway, from the journeys shelf
    // an engine and one carriage: the take that reads in a margin, where three fall under the floor
    shelf("train", "Train", ["horizon", "landmark"], "train", 1.6, {
        carriages: 1,
        windows: 2,
        on: 6,
    }),
    shelf("signpost", "Signpost", ["gate", "landmark"], "signpost", 1.3, {
        arms: [
            { to: "Ash", km: 3, left: true },
            { to: "Bray", km: 7, left: false },
        ],
    }),
    // the board a station puts on its platform, without the platform column, which is what fits a margin
    shelf("departures", "Departure board", ["landmark"], "departureboard", 1, {
        rows: [
            { to: "Ash", at: "9:15", platform: "1" },
            { to: "Bray", at: "9:40", platform: "2" },
            { to: "Cole", at: "10:05", platform: "1" },
        ],
        mark: 0,
        platforms: 0,
    }),
    shelf("sidings", "Sidings", ["landmark"], "sidings", 1, { slots: 3, siding: 1 }),
    shelf("suitcases", "Suitcases", ["landmark"], "suitcases", 1.1, {
        bags: [
            { kg: 12, label: "" },
            { kg: 7, label: "" },
        ],
    }),
    shelf("bus", "Bus", ["landmark"], "bus", 1.2, { windows: 4, on: 2, sign: "12" }),
    file("bicycle", "Bicycle", ["landmark"], "bicycle", 1.1),

    // drawn for the worlds and kept on the shelf, in the "Places and creatures" category
    shelf("rabbit", "Rabbit", ["creature"], "rabbits", 1.2, { count: 1, facing: 1 }, "hop"),
    shelf("fox", "Fox", ["creature"], "fox", 1.2, { facing: 1 }, "bob"),
    shelf("gull", "Gull", ["creature"], "gull", 1.3, { flying: 0 }, "bob"),
    shelf("crab", "Crab", ["creature"], "crabs", 1.2, { count: 1 }, "sway"),
    shelf("dog", "Dog", ["creature"], "dog", 1.2, { facing: 1, ball: 1 }, "bob"),
    shelf("mouse", "Mouse", ["creature"], "mice", 1.3, { count: 1, facing: 1 }, "hop"),
    shelf("firs", "Fir trees", ["horizon", "landmark"], "firs", 1.5, { count: 3, snow: 0 }),
    shelf("moon", "Moon", ["sky"], "moon", 1.6, { phase: 0.72 }),
    shelf("houses", "A street of houses", ["horizon", "landmark"], "houses", 1.3, {
        count: 3,
        windows: 2,
    }),
    shelf("lighthouse", "Lighthouse", ["gate", "landmark", "horizon"], "lighthouse", 1.5, {
        stripes: 3,
        beam: 1,
    }),
    shelf("station", "Railway station", ["gate", "landmark"], "station", 1.2, {
        hour: 9,
        minute: 15,
    }),
    shelf("clock-tower", "Clock tower", ["horizon", "landmark"], "clocktower", 1.4, {
        hour: 3,
        minute: 15,
    }),
    shelf("telescope", "Telescope", ["horizon", "landmark"], "telescope", 1.3, { tilt: 40 }),
    shelf("goal", "Goal", ["landmark"], "goalposts", 1.2, { ball: 1 }),
    shelf("grandstand", "Grandstand", ["horizon", "landmark"], "grandstand", 1.3, {
        rows: 3,
        seats: 10,
        filled: 22,
    }),

    // indoors: the kitchen and the laboratory, from the kitchen, capacity, physics and chemistry
    // shelves
    scenery("window", "Window", ["horizon"], "world.window", 1.4),
    scenery("door", "Door", ["gate"], "world.door", 1.5),
    file("kitchen-counter", "Kitchen counter", ["gate", "landmark"], "kitchen-counter", 1.3),
    file("birthday-table", "Birthday table", ["landmark"], "birthday-table", 1.2),
    file("cup", "Mug", ["horizon", "landmark"], "cup", 1.1),
    file("shelf", "Shelf of books", ["horizon", "landmark"], "bedroom-shelf", 1.2),
    shelf("pizza", "Pizza", ["horizon", "landmark"], "pizza", 1.1, {
        slices: 8,
        taken: 3,
        toppings: true,
    }),
    shelf("cake", "Cake", ["horizon", "landmark"], "cake", 1.1, { candles: 5, slices: 0 }),
    shelf("plates", "Plate of biscuits", ["landmark"], "plate", 1.1, {
        item: "circle",
        count: 6,
        label: "",
    }),
    shelf("baking-tray", "Tray of buns", ["landmark"], "bakingtray", 1.1, {
        rows: 3,
        cols: 4,
        iced: 5,
    }),
    shelf("mixing-bowl", "Mixing bowl", ["horizon", "landmark"], "mixingbowl", 1.1, {
        fill: 0.6,
        spoon: true,
    }),
    shelf("jug", "Measuring jug", ["horizon", "landmark"], "jug", 1.1, {
        max: 1000,
        step: 200,
        level: 350,
        unit: "ml",
    }),
    shelf("scales", "Dial scales", ["landmark"], "dialscale", 1.1, {
        max: 1000,
        step: 200,
        value: 450,
        unit: "g",
    }),
    shelf("beaker", "Beaker", ["horizon", "landmark"], "beaker", 1.1, {
        max: 400,
        step: 100,
        level: 250,
        unit: "ml",
        solid: 0,
        rod: false,
        label: "",
    }),
    shelf("burner", "Burner and flame", ["horizon", "landmark"], "flame", 1, {
        height: 3,
        on: 1,
        stand: true,
        holds: 0,
        minutes: 0,
    }),
    shelf("circuit", "Circuit", ["landmark"], "circuit", 1.1, { closed: 1, cells: 1, buzzer: 0 }),
    // the chain of clips rather than the poles: 22 pixels a square against 12.8, and its 418 units of
    // height sit inside the 1,000 or more a margin leaves between one landmark and the next
    shelf("magnet", "Magnet", ["landmark"], "magnet", 1.1, {
        mode: "chain",
        count: 4,
        sticks: 2,
        same: 0,
    }),
    shelf("particles", "Particles in a jar", ["horizon", "landmark"], "particles", 1.1, {
        spread: 0,
        count: 16,
        second: 0,
        lid: true,
        name: 1,
    }),
    shelf("thermometer", "Thermometer", ["landmark"], "thermometer", 1.1, {
        from: -10,
        to: 50,
        step: 10,
        value: 21,
        unit: "°C",
    }),
    shelf("spring-balance", "Spring balance", ["landmark"], "springscale", 1.1, {
        max: 500,
        step: 100,
        value: 250,
        unit: "g",
    }),
    shelf("stopwatch", "Stopwatch", ["landmark"], "stopwatch", 1.1, { seconds: 25, sweep: true }),
    shelf("balance", "Balance", ["horizon", "landmark"], "balance", 1.1, {
        left: ["cube"],
        right: ["ball", "ball", "ball"],
        tilt: 0,
        label: "",
    }),
    // the same ramp on a narrower page: five squares of run-out marked off rather than fifteen
    shelf("ramp", "Ramp", ["landmark"], "ramp", 1, {
        height: 3,
        flat: 5,
        ball: 0.35,
        rolled: 0,
        rough: 0,
        unit: "cm",
    }),
    // the night sky
    file("rocket", "Rocket", ["gate", "landmark"], "rocket", 1.5),
    // the sports ground, from the sports shelf
    shelf("race-track", "Race track", ["landmark"], "racetrack", 1, {
        lanes: 4,
        along: [0.9, 0.6, 0.75, 0.4],
        metres: 100,
    }),
    shelf("long-jump", "Long jump", ["landmark"], "longjump", 1, { to: 2.4, max: 4 }),
    shelf("podium", "Winners' podium", ["gate", "landmark"], "podium", 1.2, {
        filled: [true, true, false],
        names: ["", "", ""],
    }),
    shelf("scoreboard", "Scoreboard", ["horizon", "landmark"], "scoreboard", 1.1, {
        home: "Reds",
        away: "Blues",
        scores: [3, 2],
        note: "",
    }),
    shelf("target", "Target board", ["landmark"], "target", 1.1, {
        rings: [1, 2, 5, 10],
        shots: [
            [0.2, 0.1],
            [-0.5, 0.4],
        ],
    }),
    shelf("team-shirts", "Team shirts", ["landmark"], "teamgrid", 1, {
        rows: 2,
        cols: 4,
        numbers: true,
        second: 3,
    }),
    shelf("medals", "Medals", ["landmark"], "medalrow", 1.1, { labels: ["1", "2", "3"] }),

    // the fourth year: the mountains, the open sea and the volcano island, drawn for them and
    // kept on the shelf in "Places and creatures"
    shelf("peaks", "Mountain peaks", ["horizon", "landmark"], "peaks", 1.4, { count: 3, snow: 1 }),
    shelf("summit", "A summit", ["landmark"], "peaks", 1.2, { count: 1, snow: 1 }),
    shelf("snowy-firs", "Firs in snow", ["horizon", "landmark"], "firs", 1.4, {
        count: 3,
        snow: 1,
    }),
    shelf("frost-thermometer", "Thermometer below zero", ["landmark"], "thermometer", 1.1, {
        from: -20,
        to: 20,
        step: 10,
        value: -6,
        unit: "°C",
    }),
    shelf("eagle", "Eagle", ["creature", "sky"], "eagle", 1.1, { flying: 1, facing: 1 }, "bob"),
    shelf(
        "perched-eagle",
        "Eagle on a rock",
        ["creature"],
        "eagle",
        1.2,
        { flying: 0, facing: -1 },
        "bob",
    ),
    shelf(
        "hares",
        "Hares in the snow",
        ["creature"],
        "rabbits",
        1.1,
        { count: 2, facing: -1 },
        "hop",
    ),
    shelf("tent", "Tent", ["gate", "landmark"], "tent", 1.5, { lit: 1 }),
    shelf("ship", "Sailing ship", ["horizon", "gate", "landmark"], "ship", 1.3, {
        sails: 3,
        portholes: 5,
    }),
    shelf("compass", "Compass rose", ["landmark"], "compass", 1.2, { needle: 90 }),
    shelf("whale", "Whale", ["horizon", "creature"], "whale", 1, { spout: 1, facing: 1 }, "bob"),
    shelf("iceberg", "Iceberg", ["horizon", "landmark"], "iceberg", 1.1, { under: 1 }),
    shelf("gull-flying", "Gull in flight", ["sky", "creature"], "gull", 1.2, { flying: 1 }, "bob"),
    shelf("island", "An island with a volcano, far off", ["horizon"], "volcano", 0.9, {
        smoke: 1,
        island: 1,
    }),
    shelf("volcano", "Volcano", ["horizon", "landmark"], "volcano", 1.2, { smoke: 1, island: 0 }),
    shelf("palms", "Palm trees", ["horizon", "landmark"], "palms", 1.2, { count: 2, coconuts: 3 }),
    shelf("temple", "Stepped temple", ["horizon", "landmark"], "temple", 1.3, { rows: 4 }),
    shelf("chest", "Treasure chest", ["landmark"], "chest", 1.3, { open: 1, coins: 5 }),
    shelf("bottle", "Message in a bottle", ["landmark"], "bottle", 1, { cork: 1, letter: 1 }),
    shelf("lantern", "Lantern", ["gate", "landmark"], "lantern", 1.5, { lit: 1, post: 1 }),
    shelf("parrot", "Parrot", ["creature"], "parrot", 1.2, { facing: 1 }, "sway"),
    shelf("crabs", "A family of crabs", ["creature"], "crabs", 1, { count: 3 }, "sway"),
    shelf("rabbits", "Rabbits", ["creature"], "rabbits", 1.1, { count: 2, facing: 1 }, "hop"),
    // the land between the worlds on the map
    shelf("windmill", "Windmill", ["horizon", "landmark", "gate"], "windmill", 1.3, {
        sails: 4,
        turn: 0,
    }),
    shelf("cottage", "Cottage", ["horizon", "landmark", "gate"], "cottage", 1.3, {
        windows: 2,
        lit: 1,
    }),
    shelf("bridge", "Bridge", ["landmark"], "bridge", 1.2, { arches: 3 }),
    shelf("jetty", "Jetty", ["landmark"], "jetty", 1.2, { posts: 5 }),
    shelf("hall", "Hall with rows of windows", ["horizon", "landmark", "gate"], "hall", 1.3, {
        rows: 2,
        cols: 4,
        lit: 1,
    }),
    shelf("balloon", "Hot-air balloon", ["sky", "landmark", "gate"], "balloon", 1.3, {
        panels: 6,
        bags: 3,
    }),

    // the worlds to come (src/world/future.ts and .docs/overworld.md), drawn and on the shelf
    shelf("washing", "Washing on the line", ["horizon", "landmark"], "clothesline", 1.1, {
        count: 5,
        pattern: 2,
    }),
    shelf("bandstand", "Bandstand", ["horizon", "gate", "landmark"], "bandstand", 1.3, {
        posts: 5,
        notes: 3,
    }),
    shelf("heron", "Heron", ["creature", "horizon"], "heron", 1.1, { facing: 1, reeds: 3 }),
    shelf("bird-hide", "Bird hide", ["horizon", "gate", "landmark"], "birdhide", 1.3, { slots: 3 }),
    shelf("lock", "Canal lock", ["horizon", "gate", "landmark"], "canallock", 1.1, {
        level: 0.5,
        boat: 1,
    }),
    shelf("narrowboat", "Narrowboat", ["horizon", "landmark"], "narrowboat", 1.2, {
        windows: 5,
        pots: 3,
    }),

    // the eleven round the run, from the shelf and the drawings made for them ("Places round the
    // run")
    shelf("garden-gate", "Garden gate", ["gate", "landmark", "horizon"], "gardengate", 1.3, {
        bars: 5,
        open: 0,
    }),
    shelf("swing", "Swing", ["landmark", "horizon"], "swing", 1.3, { seats: 1 }),
    shelf("bubbles", "Bubbles", ["sky", "landmark"], "bubbles", 1.2, { count: 5 }),
    shelf(
        "snail",
        "Snail",
        ["creature"],
        "minibeasts",
        1.1,
        { kinds: ["snail"], spots: 0, legs: false },
        "sway",
    ),
    shelf("frog-cycle", "Frog life cycle", ["landmark"], "frogcycle", 1, {
        stage: 4,
        ring: 1,
        names: 0,
    }),
    shelf(
        "dragonfly",
        "Dragonfly",
        ["creature", "sky"],
        "dragonfly",
        1.1,
        { facing: 1, rings: 8 },
        "bob",
    ),
    shelf(
        "kingfisher",
        "Kingfisher",
        ["creature"],
        "kingfisher",
        1.1,
        { flying: 0, facing: 1 },
        "bob",
    ),
    shelf("kingfisher-flying", "Kingfisher in flight", ["sky", "horizon"], "kingfisher", 1.1, {
        flying: 1,
        facing: -1,
    }),
    shelf("chime-bars", "Chime bars", ["landmark"], "chimebars", 1.1, { bars: 8, letters: 1 }),
    shelf("drum", "Drum", ["landmark"], "drum", 1.2, { lugs: 5 }),
    shelf("red-balloon", "A red balloon", ["sky", "landmark"], "balloons", 1.2, { count: 1 }),
    shelf("balloons", "Balloons", ["landmark"], "balloons", 1.2, { count: 3 }),
    shelf("cows", "Cows in a field", ["horizon", "landmark", "creature"], "animals", 1.1, {
        kind: "cow",
        count: 2,
        label: "",
    }),
    shelf("pigs", "Pigs", ["landmark", "creature"], "animals", 1.1, {
        kind: "pig",
        count: 2,
        label: "",
    }),
    shelf("canal-bridge", "Humped bridge", ["horizon", "landmark"], "bridge", 1.2, { arches: 1 }),
    shelf("mill", "Mill by the water", ["horizon", "landmark"], "hall", 1.2, {
        rows: 3,
        cols: 5,
        lit: 0,
    }),
    shelf("carousel", "Carousel", ["gate", "landmark", "horizon"], "carousel", 1.4, {
        horses: 4,
        lit: 0,
    }),
    shelf("snowman", "Snowman", ["landmark"], "snowman", 1.2, { buttons: 3, hat: 1 }),
    shelf("sledge", "Sledge", ["landmark"], "sledge", 1.2, { slats: 5 }),
    shelf(
        "skater",
        "Skater",
        ["creature", "horizon"],
        "skater",
        1.2,
        { look: 0, facing: 1 },
        "sway",
    ),
    shelf("barn", "Barn", ["gate", "landmark", "horizon"], "barn", 1.4, { windows: 2, hay: 0 }),
    shelf("tractor", "Tractor", ["landmark", "horizon"], "tractor", 1.2, { trailer: 0, bales: 0 }),
    shelf("hay-cart", "Tractor and hay cart", ["landmark", "horizon"], "tractor", 1.1, {
        trailer: 1,
        bales: 4,
    }),
    shelf("crops", "A field of crops", ["landmark", "horizon"], "crops", 1.2, {
        stage: 2,
        rows: 3,
        plants: 6,
    }),
    shelf("stone-tower", "Old tower", ["gate", "landmark", "horizon"], "tower", 1.9, {
        courses: 8,
        flag: 0,
    }),
    shelf("ferry", "Ferry", ["gate", "landmark", "horizon"], "ferry", 1.3, { cars: 2, windows: 5 }),
    shelf("dolphins", "Dolphins", ["horizon", "creature"], "dolphins", 1.1, { count: 3 }),
    shelf("hut", "Painter's hut", ["gate", "landmark"], "hut", 1.3, { pictures: 0 }),
    shelf("easel", "Easel", ["landmark"], "easel", 1.2, { picture: 1 }),
    shelf("rainbow", "Rainbow", ["sky"], "rainbow", 1.6, { bands: 5, clouds: 1 }),
    shelf("observatory", "Observatory", ["gate", "landmark", "horizon"], "observatory", 1.4, {
        open: 0,
    }),
    shelf("comet", "Comet", ["sky"], "comet", 1.3, { tail: 5 }),
    shelf("planets", "The planets in order", ["landmark"], "planets", 0.9, { count: 3, names: 0 }),
    shelf("city-walls", "City walls", ["horizon", "gate"], "citywalls", 1.3, {
        towers: 3,
        open: 1,
    }),
    shelf("library", "Library", ["horizon", "landmark"], "library", 1.3, { columns: 6, open: 0 }),
    shelf("hola-sign", "A sign that says hello", ["landmark"], "sign", 1.2, {
        lines: ["HOLA"],
        kind: "post",
        color: "sky",
    }),
    shelf("plaza-sign", "The square's sign", ["landmark"], "sign", 1.1, {
        lines: ["LA PLAZA"],
        kind: "hanging",
        color: "berry",
    }),
    shelf("colour-wheel", "Colour wheel", ["landmark"], "colourwheel", 0.8, {
        segments: 6,
        labels: false,
    }),
    shelf("palette", "Painter's palette", ["landmark"], "palette", 0.8),
    shelf("paint-pots", "Paint pots to mix", ["landmark"], "paintpots", 0.8, {
        pots: ["blue", "yellow"],
        result: "mix",
        labels: false,
    }),
    shelf("sundial", "Sundial", ["landmark"], "sundial", 1.1, { hour: 15 }),

    // flying over the map of every world (src/world/flight.ts)
    shelf("paperplane", "Paper plane", ["sky"], "paperplane", 1.6, { bank: 0 }),
    shelf("windsock", "Windsock", ["landmark"], "windsock", 1.2, { wind: 1, stripes: 5 }),
    shelf("cloud", "Cloud", ["sky"], "cloud", 2.4, { puffs: 4, rain: 0 }),
    shelf("seal", "Seal on a rock", ["creature"], "seal", 1.1, { rock: 1, facing: 1 }),

    // what the twelve of the run wanted, and the sights a child may see once in each
    shelf("stile", "Stile", ["landmark", "gate"], "stile", 1.3, { steps: 2 }),
    shelf("hedge", "Hedge", ["landmark", "horizon"], "hedge", 1.3, {
        clumps: 4,
        berries: 5,
        gap: 0,
    }),
    shelf("footpath-sign", "A footpath sign", ["landmark"], "sign", 1.1, {
        lines: ["FOOTPATH"],
        kind: "post",
        color: "mint",
    }),
    shelf("farm-sign", "The farm's sign", ["landmark"], "sign", 1.1, {
        lines: ["VALLEY FARM"],
        kind: "board",
        color: "tang",
    }),
    shelf("rail-signal", "Signal and level crossing", ["landmark"], "railsignal", 1.2, {
        arm: 1,
        barrier: 0,
        crossing: 1,
    }),
    shelf("goods-train", "A goods train, far off", ["horizon"], "train", 1.6, {
        carriages: 6,
        windows: 2,
        on: 0,
    }),
    shelf("log", "Fallen log", ["landmark"], "log", 1.1, { rings: 5, toadstools: 3 }),
    shelf("badger", "Badger", ["creature", "horizon"], "badger", 1.2, { facing: -1, count: 1 }),
    shelf("oven", "Oven", ["landmark", "horizon"], "oven", 1.2, { lit: 1, minutes: 20, buns: 6 }),
    shelf("robin", "Robin", ["creature", "horizon"], "robin", 1.2, { post: 0, facing: 1 }),
    shelf("lamppost", "Lamp post and letterbox", ["landmark"], "lamppost", 1.3, {
        lit: 1,
        letterbox: 1,
    }),
    shelf("umbrellas", "People under umbrellas", ["landmark"], "umbrellas", 1.1, {
        count: 3,
        rain: 1,
    }),
    shelf("starlings", "Starlings", ["sky"], "starlings", 1.4, { count: 30, swirl: 0.5 }),
    shelf("shooting-star", "Shooting star", ["sky"], "shootingstar", 1.3, {
        sparkles: 3,
        facing: -1,
    }),
    shelf("runners", "Children running", ["horizon", "landmark"], "runners", 1.1, {
        count: 4,
        numbers: 1,
    }),
    shelf("microscope", "Microscope", ["landmark", "horizon"], "microscope", 1.3, {
        slide: 1,
        lamp: 0,
    }),
    shelf("test-tubes", "Test tubes in a rack", ["landmark", "horizon"], "testtubes", 1, {
        fills: [0.4, 0.6, 0.3],
        paints: ["", "red", "blue+yellow"],
        fizz: [0, 0, 6],
        bungs: 0,
        letters: 0,
    }),
    shelf("safety-kit", "Goggles, apron and glove", ["landmark"], "safety", 0.8, {
        kit: ["goggles", "apron", "glove"],
        letters: 0,
        names: 0,
    }),
    shelf("cable-car", "Cable car", ["landmark", "horizon"], "cablecar", 1.1, {
        cars: 2,
        windows: 3,
    }),
    shelf("goat", "Mountain goat", ["creature", "horizon"], "goat", 1.2, { facing: -1, rock: 1 }),
    shelf("ship-wheel", "Ship's wheel", ["landmark"], "shipwheel", 1.2, { spokes: 8, turn: 0 }),
    shelf("albatross", "Albatross", ["sky", "creature"], "albatross", 1.2, {
        facing: -1,
        waves: 0,
    }),
    shelf("sea-turtle", "Sea turtle", ["creature"], "seaturtle", 1.1, { facing: 1, plates: 5 }),
    shelf("rope-bridge", "Rope bridge", ["landmark"], "ropebridge", 1, { planks: 10, gaps: 0 }),
    shelf("owl-flying", "Owl in flight", ["sky"], "owlflying", 1.2, { facing: 1 }),

    // the six places that were concept scenes: the reef, the caves, the cloud islands, the oasis,
    // the fossil cliffs and the long grass
    shelf("diving-bell", "Diving bell", ["gate", "landmark"], "divingbell", 1.3, {
        windows: 3,
        lit: 1,
    }),
    shelf("coral", "Coral", ["landmark", "horizon"], "coral", 1.1, { fans: 2, spawn: 0 }),
    shelf("fish-shoal", "A shoal of fish", ["creature", "horizon"], "fishshoal", 1.1, {
        rows: 2,
        cols: 4,
        facing: 1,
    }),
    shelf("octopus", "Octopus", ["creature"], "octopus", 1.1, { spots: 5 }),
    shelf("starfish", "Starfish", ["creature", "landmark"], "starfish", 1.1, { count: 2, arms: 5 }),
    shelf("manta", "Manta ray", ["sky", "horizon"], "manta", 1.2, { bank: 1 }),
    shelf("crystals", "Crystals", ["gate", "landmark", "horizon"], "crystals", 1.3, {
        count: 5,
        lit: 0,
    }),
    shelf("stalactites", "Stalactites", ["landmark", "horizon"], "stalactites", 1.2, {
        pairs: 2,
        joined: 1,
        rock: 0,
    }),
    shelf("glow-worms", "Glow-worms", ["landmark", "sky"], "glowworms", 1.2, { worms: 8 }),
    shelf("bats", "Bats asleep", ["creature"], "bats", 1.1, { count: 4, flying: 0 }),
    shelf("bats-flying", "Bats streaming out", ["sky"], "bats", 1.1, { count: 5, flying: 1 }),
    shelf("sky-island", "An island in the sky", ["horizon", "landmark"], "skyisland", 1.2, {
        trees: 1,
        falls: 1,
    }),
    shelf("weather-station", "Weather station", ["landmark", "horizon"], "weatherstation", 1.2, {
        cups: 3,
    }),
    shelf("geese", "Geese in a V", ["sky"], "geese", 1.2, { count: 7 }),
    shelf("well", "Well", ["gate", "landmark"], "well", 1.3, { courses: 3, bucket: 1 }),
    shelf("oasis", "Oasis pool", ["landmark", "horizon"], "oasis", 1.2, { water: 1, bloom: 0 }),
    shelf("camel", "Camels resting", ["creature"], "camel", 1.1, {
        count: 2,
        resting: 1,
        facing: 1,
    }),
    shelf("camels", "A line of camels, far off", ["horizon"], "camel", 1.1, {
        count: 4,
        resting: 0,
        facing: -1,
    }),
    shelf("fennec", "Fennec fox", ["creature"], "fennec", 1.2, { facing: -1 }),
    shelf("water-sign", "A sign to the water", ["landmark"], "sign", 1.1, {
        lines: ["WATER"],
        kind: "post",
        color: "sky",
    }),
    // the slab cut to the head and neck, which is the fossil that reads beside a sheet
    shelf("fossil", "A fossil in the rock", ["gate", "landmark"], "fossil", 1, {
        dug: 0.33,
        close: 1,
    }),
    shelf("strata", "Layers of rock", ["landmark", "horizon"], "strata", 1, {
        layers: 5,
        names: 0,
    }),
    shelf("ammonite", "Ammonite", ["landmark"], "ammonite", 1.1, { count: 1, ribs: 16 }),
    shelf("seal-waves", "A seal in the waves, far off", ["horizon"], "seal", 1.1, {
        rock: 0,
        facing: -1,
    }),
    shelf("toadstools", "Toadstools", ["gate", "landmark"], "toadstools", 1.3, {
        count: 2,
        spots: 5,
    }),
    shelf("dandelion", "Dandelion clock", ["landmark", "horizon"], "dandelion", 1.2, {
        seeds: 18,
        blown: 0,
        flower: 0,
    }),
    shelf("cobweb", "Cobweb", ["landmark", "horizon"], "cobweb", 1.1, { spokes: 9, spider: 1 }),
    shelf("ants", "Ants in a line", ["creature"], "ants", 1.1, { count: 4, carry: 1 }),
    shelf("bumblebee", "Bumblebee", ["sky", "creature"], "bumblebee", 1.3, { facing: 1 }),

    // the islands in the seas and the worlds on the southern shore
    shelf("lamp-station", "Lamp station", ["gate", "landmark", "horizon"], "lampstation", 1.3, {
        lamps: 4,
        lit: 0,
    }),
    shelf("puffins", "Puffins", ["creature"], "puffins", 1.1, { count: 3, facing: 1 }, "bob"),
    shelf("gannet", "Gannet diving", ["sky"], "gannet", 1.2, { diving: 1 }),
    shelf("great-clock", "Great clock", ["gate", "landmark", "horizon"], "greatclock", 1.3, {
        figures: 0,
        hour: 10,
    }),
    shelf("gears", "Gears", ["landmark"], "gears", 1, {}),
    shelf("airship", "Airship", ["sky"], "airship", 1.3, { windows: 4 }),
    shelf("book-house", "Book house", ["gate", "landmark", "horizon"], "bookhouse", 1.3, {
        floors: 3,
        full: 0,
    }),
    shelf("story-sign", "A sign to the stories", ["landmark"], "sign", 1.1, {
        lines: ["STORIES"],
        kind: "post",
        color: "berry",
    }),
    shelf("swallows", "Swallows", ["sky"], "swallows", 1.2, { count: 5 }),
    shelf("printing-press", "Printing press", ["gate", "landmark"], "printingpress", 1.2, {
        printed: 0,
    }),
    shelf("loose-pages", "Loose pages in the wind", ["sky"], "loosepages", 1.2, { count: 5 }),
    shelf("mail-boat", "Mail boat", ["gate", "landmark", "horizon"], "mailboat", 1.2, {
        sacks: 3,
        sailing: 0,
    }),
    shelf("post-sign", "The post office's sign", ["landmark"], "sign", 1.1, {
        lines: ["POST"],
        kind: "hanging",
        color: "berry",
    }),
    shelf("seaplane", "Seaplane", ["sky", "horizon"], "seaplane", 1.2, { facing: -1 }),
    shelf("yachts", "Sailing boats racing", ["horizon", "landmark"], "yachts", 1.1, { count: 3 }),
    shelf("tree-platform", "Tree platform", ["gate", "landmark"], "treeplatform", 1.3, {
        basket: 0,
    }),
    shelf("giant-flower", "Giant flower", ["landmark", "horizon"], "giantflower", 1.2, { open: 0 }),
    shelf("parakeets", "Parakeets", ["sky"], "parakeets", 1.2, { count: 6 }),
    shelf("salt-pans", "Salt pans", ["gate", "landmark"], "saltpans", 1.1, { pans: 3, heaps: 3 }),
    shelf("salt-lake", "Salt lake", ["landmark", "horizon"], "saltlake", 1.1, { flooded: 0 }),
    shelf(
        "flamingos",
        "Flamingos",
        ["creature", "horizon"],
        "flamingos",
        1.1,
        { count: 3, flying: 0 },
        "sway",
    ),
    shelf("flamingos-flying", "Flamingos taking off", ["sky"], "flamingos", 1.1, {
        count: 5,
        flying: 1,
    }),
    shelf("geyser", "Geyser", ["gate", "landmark", "horizon"], "geyser", 1.3, { up: 0, count: 1 }),
    shelf("far-geysers", "Two geysers going up, far off", ["horizon"], "geyser", 1, {
        up: 1,
        count: 2,
    }),
    // the map's own small life between the worlds (life.ts)
    shelf("buoy", "Buoy", ["landmark"], "buoy", 1, { kind: "bell", bands: 2, light: 1, sea: 1 }),
    shelf("seaserpent", "Sea serpent in the margin", ["landmark"], "seaserpent", 1, {
        loops: 3,
        facing: 1,
    }),
];

export const artById = (id: string): ArtEntry | undefined => ART.find((a) => a.id === id);

/** The drawings that travel the country or stand in it on a page's backdrop, by art id, which every map's view carries a ref for. */
export const RIDERS: readonly string[] = [
    "train",
    "ship",
    "boat",
    "narrowboat",
    "heron",
    "kite",
    "moon",
    "rocket",
    "paperplane",
];

/** Every art id a world's declaration may show: its horizon, gate, landmarks and creatures, what a grown-up may choose instead, its chapter and its place on the map. */
/**
 * The drawings a way is drawn with, for the ways that stand one of the shelf's rather than drawing
 * their own marks: a page loads these with the world's own (engine/ui/scenery.ts, PATHS).
 */
const PATH_ART: Partial<Record<PathKind, readonly string[]>> = { buoys: ["buoy"] };

function artNamed(id: string): string[] {
    const w = worldById(id),
        c = w.chapter;
    return [
        ...w.horizon.far.map((f) => f.art),
        ...(w.horizon.sky ?? []).map((f) => f.art),
        w.horizon.gate,
        ...w.landmarks,
        ...w.creatures,
        ...w.offers.landmarks,
        ...w.offers.creatures,
        ...w.reaches.map((r) => r.art),
        c.moment.art,
        c.secret.art,
        ...(c.glimpse ? [c.glimpse.art] : []),
        ...(c.rare ? [c.rare.art] : []),
        ...(w.map?.spots ?? []).map((s) => s.art),
        ...(PATH_ART[w.path] ?? []),
    ];
}

/**
 * The shelf's names for the drawings the map draws of its own: its title scroll, its key, its
 * compass rose, the lantern by the road into each world, the bridge where a way crosses water, the
 * balloon that crosses the country once a visit, what rides the ways and stands in the country on a
 * page's backdrop (the riders in engine/ui/map.ts), the country's own small life (life.ts), and what
 * stands in the country and what the plane spots (geography.ts).
 */
export const MAP_REFS: readonly string[] = [
    ...new Set([
        "maptitle",
        "mapkey",
        "compass",
        ...[
            "lantern",
            "bridge",
            "balloon",
            ...RIDERS,
            ...lifeArt(),
            ...FEATURES.map((f) => f.art),
            ...SIGHTS.map((x) => x.art),
        ].map((id) => {
            const e = artById(id);
            return e ? artKey(e) : id;
        }),
    ]),
];

/**
 * The shelf's names for every drawing these worlds may show, once each, with the map's own, for a
 * page to load through the catalogue before it builds a view (`mapViewOf` and `worldViewOf` ask for
 * each drawing's size). A hand-drawn file is named by its file; a guide is not a drawing here
 * (GUIDE_IDS).
 */
export function refsOf(worldIds: readonly string[]): string[] {
    const refs = new Set<string>(MAP_REFS);
    for (const id of new Set(worldIds))
        for (const art of artNamed(id)) {
            const e = artById(art);
            if (e) refs.add(artKey(e));
        }
    return [...refs];
}

/**
 * A drawing's size in the world by its art id, from a shelf that has loaded the worlds' drawings
 * (engine/ui/drawings.ts): at the entry's scale, with its own numbers and any the caller adds, which
 * is what the view builders ask for. An id the list does not know takes no room.
 */
export const sizeOn =
    (shelf: {
        size(
            ref: string,
            scale: number,
            params?: Record<string, unknown>,
        ): { w: number; h: number };
    }) =>
    (id: string, params?: Record<string, unknown>): { w: number; h: number } => {
        const e = artById(id);
        return e ? shelf.size(artKey(e), e.scale, { ...e.params, ...params }) : { w: 0, h: 0 };
    };

/**
 * The guides a world may ask for, by id. The designs are in engine/parts/guide; this is only their
 * names, so a saved choice can be checked without drawing one.
 */
export const GUIDE_IDS = ["firefly", "glow", "hand", "stub", "bird", "snail", "dot"] as const;
