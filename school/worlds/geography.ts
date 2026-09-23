// Eight regions share one sea; lesson grades do not determine where a world stands.
import type { Pt, Rect, WoodKind } from "../../engine/space";

/** A land as control points round its coast, clockwise, which terrain.ts smooths and wobbles. */
export interface LandShape {
    id: string;
    coast: Pt[];
    /**
     * The first grade whose run reaches it: the fifth year's far shore is drawn once a fifth year is
     * on the map. A land is also drawn whenever a world of the run stands on it, so a land for worlds
     * a family has not got yet can wait at a grade no run reaches.
     */
    from?: number;
    /** How far the coast wobbles either side of the smoothed line, in world units. */
    wobble?: number;
}

const p = (x: number, y: number): Pt => ({ x, y });

/**
 * The box each year's land fills, which is what a child's map frames and how far their camera may
 * travel. The lands are the same size but for the fourth, which is narrower because its year goes on
 * out to the island.
 */
export const LAND_AT: Record<number, Rect> = {
    1: { x: -19000, y: 1750, w: 14800, h: 9300 },
    2: { x: 5500, y: 2300, w: 12600, h: 8200 },
    3: { x: 3000, y: -10600, w: 12400, h: 8000 },
    4: { x: -16200, y: -10600, w: 10400, h: 8000 },
};

/** The island the fourth year sails out to, in the water north-east of its land. */
export const ISLAND: Rect = { x: -2600, y: -3500, w: 3200, h: 2400 };

export const LANDS: LandShape[] = [
    {
        id: "year-one",
        from: 1,
        wobble: 150,
        coast: [
            p(-4100, 6400),
            p(-4450, 7850),
            p(-5750, 9050),
            p(-7000, 10350),
            p(-9200, 11000),
            p(-11600, 11550),
            p(-14050, 11100),
            p(-15850, 10100),
            p(-17800, 9250),
            p(-18700, 7850),
            p(-20450, 6400),
            p(-19850, 4700),
            p(-17650, 3650),
            p(-15900, 2700),
            p(-13900, 1900),
            p(-11600, 3000),
            p(-9850, 3050),
            p(-7300, 2700),
            p(-5950, 3800),
            p(-4450, 4950),
        ],
    },
    {
        id: "year-two",
        from: 2,
        wobble: 170,
        coast: [
            p(18200, 6400),
            p(17600, 7650),
            p(16650, 8700),
            p(15100, 9350),
            p(13200, 9150),
            p(11800, 10550),
            p(9850, 10250),
            p(8050, 9750),
            p(6800, 8750),
            p(5550, 7700),
            p(5000, 6400),
            p(5300, 5050),
            p(6350, 3850),
            p(8250, 3200),
            p(9850, 2500),
            p(11800, 2500),
            p(13650, 2750),
            p(15950, 2700),
            p(17450, 3700),
            p(18200, 5050),
        ],
    },
    {
        id: "year-three",
        from: 3,
        wobble: 160,
        coast: [
            p(15500, -6600),
            p(15550, -5250),
            p(15050, -3850),
            p(13100, -3150),
            p(11200, -2650),
            p(9200, -2800),
            p(7300, -2850),
            p(5750, -3550),
            p(3950, -4150),
            p(4300, -5600),
            p(4900, -6600),
            p(3050, -7900),
            p(3900, -9100),
            p(5450, -9900),
            p(7350, -10250),
            p(9200, -10550),
            p(11000, -10200),
            p(13100, -10050),
            p(14800, -9200),
            p(15400, -7900),
        ],
    },
    {
        id: "year-four",
        from: 4,
        wobble: 180,
        coast: [
            p(-5750, -6600),
            p(-7300, -5650),
            p(-7500, -4650),
            p(-7850, -3300),
            p(-9400, -2800),
            p(-11000, -2700),
            p(-12600, -2800),
            p(-14150, -3250),
            p(-15900, -3850),
            p(-16650, -5200),
            p(-16050, -6600),
            p(-16100, -7850),
            p(-15350, -9050),
            p(-14000, -9800),
            p(-12850, -10950),
            p(-11000, -11100),
            p(-9450, -10250),
            p(-7800, -10000),
            p(-6900, -8900),
            p(-6200, -7800),
        ],
    },
    {
        id: "volcano",
        from: 4,
        wobble: 120,
        coast: [
            p(550, -2300),
            p(350, -1750),
            p(-100, -1300),
            p(-800, -1100),
            p(-1600, -1150),
            p(-2100, -1550),
            p(-2550, -2000),
            p(-2450, -2550),
            p(-2250, -3100),
            p(-1500, -3300),
            p(-800, -3550),
            p(-100, -3300),
            p(500, -2900),
        ],
    },
    {
        id: "skerry",
        wobble: 90,
        coast: [
            p(-2600, 2600),
            p(-4850, 2750),
            p(-5050, 2800),
            p(-5300, 2800),
            p(-5450, 2700),
            p(-5400, 2550),
            p(-5300, 2400),
            p(-5050, 2400),
            p(-4850, 2450),
        ],
    },
    {
        id: "north-rocks",
        wobble: 90,
        coast: [
            p(1700, -4200),
            p(1650, -4050),
            p(1450, -4000),
            p(1250, -4050),
            p(1100, -4150),
            p(1150, -4250),
            p(1250, -4350),
            p(1450, -4400),
            p(1650, -4300),
        ],
    },
    {
        id: "far-rock",
        wobble: 90,
        coast: [
            p(4450, -1800),
            p(4400, -1700),
            p(4250, -1650),
            p(4100, -1650),
            p(3950, -1750),
            p(3900, -1850),
            p(4050, -1950),
            p(4250, -1950),
            p(4400, -1900),
        ],
    },
    {
        id: "gull-rock",
        wobble: 90,
        coast: [
            p(5100, 3900),
            p(5000, 4000),
            p(4850, 4100),
            p(2450, 4050),
            p(2300, 3950),
            p(2250, 3800),
            p(2450, 3700),
            p(4850, 3700),
            p(5100, 3750),
        ],
    },
    {
        id: "south-isle",
        wobble: 90,
        coast: [
            p(-800, 10100),
            p(-850, 10300),
            p(-1150, 10350),
            p(-1400, 10300),
            p(-1550, 10200),
            p(-1550, 10000),
            p(-1400, 9900),
            p(-1150, 9850),
            p(-850, 9900),
        ],
    },
    {
        id: "bight-isle",
        wobble: 90,
        coast: [
            p(2600, -10600),
            p(2550, -10400),
            p(2250, -10350),
            p(2000, -10400),
            p(1850, -10500),
            p(1850, -10700),
            p(2000, -10800),
            p(2250, -10850),
            p(2550, -10750),
        ],
    },
    {
        // the far shore, across the northern ocean: the fifth year's, on a second sheet
        id: "far-shore",
        from: 0,
        wobble: 170,
        coast: [
            p(-9000, -16800),
            p(-6000, -17400),
            p(-2000, -17000),
            p(2000, -17600),
            p(6000, -17200),
            p(10000, -17600),
            p(11000, -15800),
            p(9200, -14400),
            p(7000, -13900),
            p(4500, -14200),
            p(2600, -14300),
            p(800, -13900),
            p(-1400, -14100),
            p(-3000, -13700),
            p(-5000, -14000),
            p(-7200, -14300),
            p(-8800, -15200),
        ],
    },
    {
        id: "wetlands",
        wobble: 150,
        coast: [
            p(-21500, -1600),
            p(-22500, 500),
            p(-24300, 1900),
            p(-26500, 2600),
            p(-28600, 1300),
            p(-30000, -800),
            p(-29400, -3200),
            p(-27500, -4700),
            p(-25000, -4500),
            p(-22800, -3500),
        ],
    },
    {
        id: "sunlands",
        wobble: 170,
        coast: [
            p(29900, -1600),
            p(31400, 900),
            p(30500, 3300),
            p(28600, 5000),
            p(26000, 5100),
            p(23800, 3500),
            p(22000, 1400),
            p(22900, -1100),
            p(24900, -3300),
            p(27600, -3700),
        ],
    },
    {
        id: "raincoast",
        wobble: 160,
        coast: [
            p(1700, 15800),
            p(3400, 17700),
            p(2400, 19600),
            p(300, 20800),
            p(-2200, 21400),
            p(-4600, 20500),
            p(-6500, 19100),
            p(-7600, 17100),
            p(-6500, 15000),
            p(-4300, 14200),
            p(-1700, 14600),
        ],
    },
];

export const slotOf = (grade: number, term: number): string => `${grade}.${term}`;

/**
 * Where each term's world stands, by the middle of its 1100 by 720 box (overworld.ts), keyed by
 * slot: three to a land, laid so that every step of the run has a direction of its own for the arrow
 * keys. Each place was made for the world DEFAULT_YEARS puts in its term, which the comments name,
 * and holds whichever world stands in that term.
 */
export const SLOTS: Record<string, Pt> = {
    "0.1": p(-17700, 8000),
    "1.1": p(-14650, 6600),
    "1.2": p(-11050, 3600),
    "1.3": p(-5650, 6800),
    "2.1": p(5900, 6150),
    "2.2": p(11950, 8100),
    "2.3": p(14700, 3700),
    "3.1": p(10950, -3550),
    "3.2": p(12200, -7900),
    "3.3": p(5750, -7100),
    "4.1": p(-8400, -7100),
    "4.2": p(-5600, -4300),
    "4.3": p(-1000, -2300),
    // the fifth year, on the far shore: the canal town, the observatory, the old city
    "5.1": p(-4200, -15300),
    "5.2": p(1300, -16100),
    "5.3": p(6500, -15400),
};

/**
 * A spot beside each term's place for a world made to be chosen instead of that term's own, so the
 * road runs past where the term's world would have been rather than doubling back. Keyed by slot, and
 * clear of every other term's place, since a family's choices can fill the terms either side.
 */
export const ALTS: Record<string, Pt> = {
    "0.1": p(-17400, 8400),
    "1.1": p(-16800, 4600),
    "1.2": p(-9700, 8500),
    "1.3": p(-7250, 8450),
    "2.1": p(7650, 7800),
    "2.2": p(11950, 8850),
    "2.3": p(15450, 4400),
    "3.1": p(9550, -3650),
    "3.2": p(13800, -9100),
    "3.3": p(5350, -8900),
    "4.1": p(-8400, -8850),
    "4.2": p(-6600, -3200),
    "4.3": p(-1600, -1200),
    "5.1": p(-6600, -15500),
    "5.2": p(3900, -15000),
    "5.3": p(8900, -15600),
};

/** Fixed sites keep a shared subject world in the same place for every family and grade. */
export const WORLD_SITES: Record<string, Pt> = {
    "reed-marsh": p(-26600, -2600),
    "painters-hut": p(-23800, -1400),
    "long-grass": p(-27100, 500),
    "bandstand-park": p(9200, 8200),
    "old-tower": p(-13200, -4600),
    "ferry-town": p(-7200, 4300),
    "crystal-caves": p(-13200, -8250),
    "fossil-cliffs": p(-800, 19000),
    treetops: p(-4300, 17200),
    "dune-oasis": p(25100, -1000),
    "salt-flats": p(28400, 1000),
    "geyser-valley": p(25300, 2800),
    "coral-reef": p(4900, 16100),
    "cloud-islands": p(20000, -10500),
    "book-island": p(-18500, -15500),
    "printing-works": p(-23500, -11500),
    "post-office": p(8000, 14300),
    "windmill-island": p(15500, 14600),
    "clockwork-island": p(19200, -4300),
    "lamp-rocks": p(-20500, 13100),
};

/** Each offshore world has a small, asymmetric coast around its permanent site. */
for (const id of [
    "coral-reef",
    "book-island",
    "printing-works",
    "post-office",
    "windmill-island",
    "clockwork-island",
    "lamp-rocks",
]) {
    const at = WORLD_SITES[id];
    if (!at) continue;
    const outline = [
        [-1500, -300],
        [-1150, -1050],
        [-150, -1350],
        [1000, -1000],
        [1550, -150],
        [1050, 800],
        [150, 1150],
        [-1000, 800],
    ];
    LANDS.push({ id, wobble: 80, coast: outline.map(([x = 0, y = 0]) => p(at.x + x, at.y + y)) });
}

export function spotsOn(
    _grade: number,
    places: readonly { id: string; terrain: string }[],
): Record<string, Pt> {
    return Object.fromEntries(
        places.flatMap(({ id }) => (WORLD_SITES[id] ? [[id, WORLD_SITES[id]]] : [])),
    );
}

/**
 * The way the story travels from one term's place to the next, as the points it passes on the way,
 * keyed `from>to` by slot. A way inside a land follows its own country; a way between two lands is
 * the crossing at the end of a year, which goes out of one land's shore and into the next. The ends
 * are the worlds' own feet, which overworld.ts adds; a way with an end off its term's place (a chosen
 * world beside it) is joined by a plain curve.
 */
export const ROUTES: Record<string, Pt[]> = {
    "1.1>1.2": [p(-13800, 5600), p(-12800, 4750)],
    "1.2>1.3": [p(-10300, 4900), p(-8650, 6000)],
    "1.3>2.1": [p(-3000, 6900), p(0, 6650), p(5000, 6350)],
    "2.1>2.2": [p(6700, 6750), p(8100, 7350)],
    "2.2>2.3": [p(13300, 6950), p(14300, 5150)],
    "2.3>3.1": [p(14700, 1800), p(13000, -300), p(11800, -2200)],
    "3.1>3.2": [p(11800, -5000), p(12400, -6350)],
    "3.2>3.3": [p(10200, -7800), p(7700, -7500)],
    "3.3>4.1": [p(3200, -8400), p(0, -8800), p(-3600, -8600)],
    "4.1>4.2": [p(-6950, -6450), p(-6100, -6350)],
    "4.2>4.3": [p(-4200, -4000), p(-3000, -3400)],
    // the island to the far shore, and along it
    "4.3>5.1": [p(-1500, -6400), p(-500, -9500), p(-300, -12200)],
    "5.1>5.2": [p(-2200, -15100), p(-400, -15500)],
    "5.2>5.3": [p(3000, -16000), p(4600, -15400)],
};

/**
 * The points the way to a place off the run passes, keyed by the place's id, where a way straight
 * from the world it leaves would cross another world's place. The ends are the worlds' own feet,
 * which overworld.ts adds, from whichever world of the run the way leaves.
 */
export const SPURS: Record<string, Pt[]> = {};

/** Rivers, as control points from spring to mouth: one to a land, and each the way into a world. */
export const RIVERS: Pt[][] = [
    [p(-28300, -3600), p(-26800, -1900), p(-25200, -700), p(-23900, 500), p(-24500, 1800)],
    [p(-5000, 15000), p(-3600, 16700), p(-2600, 17900), p(-800, 18600), p(1700, 19200)],
    [p(-17200, 5000), p(-16350, 6000), p(-15600, 7200), p(-14700, 8450), p(-14050, 9950)],
    [p(10150, 5150), p(11300, 6400), p(12550, 7650), p(13950, 8800), p(15350, 10150)],
    [p(5100, -5800), p(6100, -7000), p(6450, -8350), p(7350, -9650)],
    [p(-11500, -8600), p(-10250, -7800), p(-9150, -6900), p(-7800, -6350), p(-6650, -6200)],
];

/** Lakes, each a middle and two radii; terrain.ts draws a wobbly outline round it. */
export const LAKES: { at: Pt; rx: number; ry: number }[] = [
    { at: p(-27900, -1300), rx: 800, ry: 420 },
    { at: p(24000, 1000), rx: 650, ry: 320 },
    { at: p(-12450, 8450), rx: 950, ry: 520 },
    { at: p(10050, 5100), rx: 620, ry: 330 },
    { at: p(8450, -8900), rx: 700, ry: 380 },
];

export const WOODS: { at: Pt; rx: number; ry: number; kind: WoodKind }[] = [
    { at: p(-27900, -3400), rx: 700, ry: 340, kind: "trees" },
    { at: p(-4800, 18600), rx: 1200, ry: 520, kind: "palms" },
    { at: p(-1700, 16400), rx: 1000, ry: 440, kind: "palms" },
    { at: p(24300, -2100), rx: 500, ry: 260, kind: "palms" },
    { at: p(-15700, 6150), rx: 620, ry: 300, kind: "trees" },
    { at: p(-10800, 7800), rx: 560, ry: 280, kind: "trees" },
    { at: p(-7650, 5900), rx: 480, ry: 260, kind: "firs" },
    { at: p(7900, 5100), rx: 1400, ry: 520, kind: "firs" },
    { at: p(9800, 6150), rx: 800, ry: 420, kind: "firs" },
    { at: p(13300, 7400), rx: 700, ry: 340, kind: "trees" },
    { at: p(15700, 8950), rx: 520, ry: 260, kind: "trees" },
    { at: p(10200, -9100), rx: 700, ry: 300, kind: "firs" },
    { at: p(6100, -5800), rx: 620, ry: 300, kind: "trees" },
    { at: p(-11600, -7250), rx: 700, ry: 300, kind: "firs" },
    { at: p(-13600, -5400), rx: 560, ry: 280, kind: "firs" },
];

/** Hills drawn side on, a row of brows from one point to another: each land's own. */
export const HILLS: { from: Pt; to: Pt; n: number }[] = [
    { from: p(-16950, 4350), to: p(-15200, 3950), n: 5 },
    { from: p(13700, 4350), to: p(15700, 4750), n: 4 },
    { from: p(10200, -3950), to: p(12050, -3800), n: 4 },
    { from: p(-14200, -7000), to: p(-12750, -7400), n: 4 },
];

/** Ranges of mountains, peaks with snow on them, through the middle of the fourth year's land. */
export const PEAKS: { from: Pt; to: Pt; n: number }[] = [
    { from: p(-11100, -7950), to: p(-9450, -8300), n: 4 },
    { from: p(-10600, -6200), to: p(-9000, -6500), n: 4 },
    { from: p(-12350, -8850), to: p(-10900, -9250), n: 3 },
];

/** Patchwork fields, each a corner, a size and a lean; terrain.ts cuts them into plots. */
export const FIELDS: { at: Pt; cols: number; rows: number }[] = [
    { at: p(-13950, 6900), cols: 3, rows: 2 },
    { at: p(-10300, 5750), cols: 2, rows: 2 },
    { at: p(12550, 8850), cols: 3, rows: 2 },
    { at: p(12300, -7100), cols: 2, rows: 2 },
    { at: p(-13900, -5000), cols: 2, rows: 1 },
];

/** Drawings from the shelf standing in the land and on the water. */
export const FEATURES: { art: string; at: Pt; k: number; flip?: boolean; on: "land" | "sea" }[] = [
    { art: "lighthouse", at: p(-10150, 3450), k: 0.6, on: "land" },
    { art: "windmill", at: p(-12450, 7400), k: 1.1, on: "land" },
    { art: "cottage", at: p(-15950, 7900), k: 0.8, on: "land" },
    { art: "jetty", at: p(-12200, 3700), k: 1, on: "sea" },
    { art: "boat", at: p(-14050, 3200), k: 0.5, flip: true, on: "sea" },
    { art: "sheep", at: p(-13050, 5850), k: 0.55, on: "land" },
    { art: "cottage", at: p(11050, 7450), k: 0.7, flip: true, on: "land" },
    { art: "sheep", at: p(14550, 5150), k: 0.5, flip: true, on: "land" },
    { art: "boat", at: p(16100, 9950), k: 0.45, on: "sea" },
    { art: "jetty", at: p(5750, -6350), k: 0.9, on: "sea" },
    { art: "gull-flying", at: p(4500, -5650), k: 0.6, on: "sea" },
    { art: "boat", at: p(-6750, -5700), k: 0.5, flip: true, on: "sea" },
    { art: "gull-flying", at: p(-4000, -3400), k: 0.5, flip: true, on: "sea" },
];

/** Creatures a child can spot from the paper plane (flight.ts), where each lives. */
export const SIGHTS: { art: string; at: Pt; name: string; k: number; flip?: boolean }[] = [
    { art: "whale", at: p(-2600, 5600), name: "A whale", k: 0.9 },
    { art: "whale", at: p(-3600, -3600), name: "A whale", k: 0.8, flip: true },
    { art: "seal", at: p(-17600, 3850), name: "A seal", k: 0.7 },
    { art: "rabbits", at: p(-13950, 5150), name: "Rabbits", k: 0.7 },
    { art: "heron", at: p(-12700, 7950), name: "A heron", k: 0.8 },
    { art: "fox", at: p(9150, 5500), name: "A fox", k: 0.7 },
    { art: "duck", at: p(10650, 6800), name: "A duck", k: 0.6 },
    { art: "sheep", at: p(14950, 4900), name: "Sheep", k: 0.6 },
    { art: "eagle", at: p(11050, -9100), name: "An eagle", k: 0.8 },
    { art: "crabs", at: p(5350, -5400), name: "Crabs", k: 0.6 },
    { art: "hares", at: p(-13600, -6050), name: "Hares", k: 0.7 },
];

/** Where each year's name is lettered for a grown-up, and at what angle in degrees. */
export const REGIONS: { id: string; name: string; line: string; at: Pt; angle: number }[] = [
    {
        id: "year-one",
        name: "Home country",
        line: "Fields, gardens and the harbour",
        at: p(-12700, 10300),
        angle: -3,
    },
    {
        id: "year-two",
        name: "The woodlands",
        line: "Forest paths and warm windows",
        at: p(11400, 10000),
        angle: 2,
    },
    {
        id: "year-three",
        name: "Discovery hills",
        line: "Stars, experiments and open skies",
        at: p(9500, -5600),
        angle: -2,
    },
    {
        id: "year-four",
        name: "The highlands",
        line: "Peaks, caves and old stone",
        at: p(-11600, -10200),
        angle: -3,
    },
    {
        id: "wetlands",
        name: "The wetlands",
        line: "Reeds, rivers and small wonders",
        at: p(-25700, 2100),
        angle: 3,
    },
    {
        id: "sunlands",
        name: "The sunlands",
        line: "Sand, salt and steaming springs",
        at: p(27100, 4500),
        angle: -3,
    },
    {
        id: "raincoast",
        name: "The rain coast",
        line: "Tall trees and ancient shores",
        at: p(-2400, 20700),
        angle: 2,
    },
    {
        id: "far-shore",
        name: "The far shore",
        line: "Canals, cities and distant stars",
        at: p(1000, -18100),
        angle: 0,
    },
];

/** The map's title, its key and its compass rose, each in a corner of the sea. */
export const FURNITURE = { title: p(-15600, -1800), key: p(13400, 700), compass: p(1200, 1300) };

/**
 * The same on a child's map, which is one land: in its own sea, clear of its places and its ways, near
 * the corners of the frame the map opens on, the title top left, the compass top right and the key
 * bottom right.
 */
export const FURNITURE_ON: Record<number, typeof FURNITURE> = {
    1: { title: p(-17600, 2100), key: p(-3800, 9450), compass: p(-5000, 2400) },
    2: { title: p(8050, 1750), key: p(17650, 9550), compass: p(17800, 2650) },
    3: { title: p(4500, -10850), key: p(16200, -3350), compass: p(16350, -9800) },
    4: { title: p(-13650, -11900), key: p(-8100, -1850), compass: p(-7200, -10850) },
};

/**
 * Where each land's year ends: the jetty at its shore, just out past where the way to the next land's
 * first world meets the coast, where the ship waits for the sail. The fourth year's is off the island,
 * toward the far shore.
 */
export const SAILS: Record<number, Pt> = {
    1: p(-4150, 6950),
    2: p(15050, 2600),
    3: p(3100, -8450),
    4: p(-1650, -3300),
};

/**
 * The sheet for the school's four years: the four lands with the sea round them, and 2,000 of sea past
 * the outermost coasts, where each land keeps isles of its own rather than sharing the water between
 * the lands with the next year's.
 */
export const SHEET: Rect = { x: -32600, y: -20400, w: 66500, h: 44200 };

/** Extra sea fills wide screens at the atlas zoom without shrinking the continents. */
export const SEA_SIDES = 24000;
/** What a fifth year adds: the far shore, on a sheet taped along the top. */
export const SHEET_FIVE: Rect = { x: -12000, y: -20400, w: 26000, h: 6000 };

/**
 * How a world stands in a term: in the term's own place, which is where any world a family may put in
 * a term stands; beside it, for a world made to be chosen instead of the term's own; or at a site of
 * its own, for a place a track brings a child to.
 */
export type Footing = "in" | "beside" | "own";

/**
 * Where each world of a run stands, and in which term's place, if any: `slot` is set when it stands
 * in its term's own place, so the ways to its neighbours can follow ROUTES. A world made to be chosen
 * stands on the spot kept beside its term, a place a track brings a child to stands on the spot its
 * land keeps for it (`ownSpot`), and a world the geography has no spot for stands beside its term's
 * place, or else in a row below the sheet.
 */
export function sitesFor(
    run: { grade: number; term: number; world: string }[],
    footing: (id: string) => Footing = () => "in",
    ownSpot: (r: { grade: number; world: string }) => Pt | undefined = () => undefined,
): { at: Pt; slot: string | null }[] {
    const used: Pt[] = [];
    const free = (q: Pt) => !used.some((u) => Math.hypot(u.x - q.x, u.y - q.y) < 1900);
    return run.map((r, i) => {
        const slot = slotOf(r.grade, r.term),
            how = footing(r.world);
        let at: Pt | undefined,
            placed: string | null = null;
        if (how === "own") at = ownSpot(r);
        else if (how === "beside") at = ALTS[slot];
        else if (SLOTS[slot]) {
            at = SLOTS[slot];
            placed = slot;
        }
        const by = SLOTS[slot];
        if (!at && by)
            for (const [dx, dy] of [
                [2400, 600],
                [-2400, 600],
                [0, 2300],
                [0, -2300],
            ] as const) {
                const q = p(by.x + dx, by.y + dy);
                if (free(q)) {
                    at = q;
                    break;
                }
            }
        at ??= p(SHEET.x + 2000 + i * 2600, SHEET.y + SHEET.h + 2000);
        used.push(at);
        return { at, slot: placed };
    });
}

/** A route's points from one term's place to another's, when the geography has one for that pair (either way round). */
export function routeOf(from: string, to: string): Pt[] | null {
    const there = ROUTES[`${from}>${to}`];
    if (there) return there;
    const back = ROUTES[`${to}>${from}`];
    return back ? [...back].reverse() : null;
}
