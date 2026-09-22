// The country the map of every world is drawn on: four lands in one sea, one for each year of the
// school, with the island the fourth year sails out to in the water between them. .docs/overworld.md
// has the reasoning; this file is only where things are.
//
// The lands lie clockwise round the sea from the south-west, in the order a child meets them. The
// first year's is the home isle: the meadow inland, the harbour at the head of a bay on its north
// coast, the railway on the flat by its east shore. The second year's lies across the strait to the
// east, the woods on its western shoulder, the kitchen's cottage in a clearing and the town on the
// estuary of its south coast. The third year's is north of that, the night hill on its southern
// slope, the sports ground on the flat above it and the laboratory on a sea loch cut into its west
// side. The fourth year's is the last, in the north-west, mountains through the middle of it and a
// firth to the south-east, and the year leaves it for the open sea and the island.
//
// A year ends by sailing to the next land, so the way into the first world of a year is the sea while
// the ways inside a land are its own: a path, a road, rails or a river, at least three kinds on each,
// so the keyboard journey and the vehicles it rides survive the crossing moving to the year's end.
//
// Every term of a year has its place here, keyed by its slot (`1.2` is year 1, term 2). A place a
// track brings a child to stands on a spot its land keeps for the kind of country it asks for, so a
// year has its own marsh, park and painter's hut rather than the school sharing one of each. Units
// are the map's world units, twenty to a square of the paper; x runs east and y south.
//
// Pure data and small helpers, like the rest of the map's geometry, so a test can walk it.
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
        from: 5,
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
        id: "isle-1-1",
        from: 9,
        wobble: 110,
        coast: [
            p(-10050, 1000),
            p(-10150, 1400),
            p(-10650, 1600),
            p(-11150, 1650),
            p(-11650, 1550),
            p(-12000, 1200),
            p(-11950, 750),
            p(-11650, 450),
            p(-11150, 300),
            p(-10550, 250),
            p(-10100, 550),
        ],
    },
    {
        id: "isle-1-2",
        from: 9,
        wobble: 110,
        coast: [
            p(-7050, 700),
            p(-7050, 1150),
            p(-7550, 1400),
            p(-8150, 1500),
            p(-8700, 1300),
            p(-8900, 900),
            p(-9050, 450),
            p(-8750, 50),
            p(-8150, -100),
            p(-7550, -50),
            p(-7200, 300),
        ],
    },
    {
        id: "isle-1-3",
        from: 9,
        wobble: 110,
        coast: [
            p(-3150, 11200),
            p(-3250, 11600),
            p(-3700, 11850),
            p(-4250, 11950),
            p(-4700, 11700),
            p(-4950, 11350),
            p(-4950, 11000),
            p(-4750, 10600),
            p(-4250, 10450),
            p(-3650, 10450),
            p(-3350, 10800),
        ],
    },
    {
        id: "isle-1-4",
        from: 9,
        wobble: 110,
        coast: [
            p(-4050, 400),
            p(-4250, 750),
            p(-4500, 1150),
            p(-5150, 1050),
            p(-5650, 950),
            p(-6050, 600),
            p(-5950, 200),
            p(-5600, -100),
            p(-5150, -250),
            p(-4550, -350),
            p(-4100, -50),
        ],
    },
    {
        id: "isle-2-1",
        from: 9,
        wobble: 110,
        coast: [
            p(6050, 10850),
            p(6000, 11250),
            p(5500, 11450),
            p(4950, 11700),
            p(4400, 11450),
            p(4250, 11000),
            p(4000, 10600),
            p(4350, 10200),
            p(4950, 10100),
            p(5500, 10150),
            p(5950, 10450),
        ],
    },
    {
        id: "isle-2-2",
        from: 9,
        wobble: 110,
        coast: [
            p(18650, 11450),
            p(18450, 11800),
            p(18150, 12200),
            p(17550, 12200),
            p(17150, 11900),
            p(16650, 11650),
            p(16800, 11250),
            p(17050, 10850),
            p(17550, 10750),
            p(18100, 10750),
            p(18450, 11050),
        ],
    },
    {
        id: "isle-2-3",
        from: 9,
        wobble: 110,
        coast: [
            p(6350, 1850),
            p(6300, 2250),
            p(5800, 2500),
            p(5250, 2500),
            p(4750, 2400),
            p(4400, 2050),
            p(4400, 1600),
            p(4800, 1350),
            p(5250, 1000),
            p(5800, 1150),
            p(6350, 1400),
        ],
    },
    {
        id: "isle-2-4",
        from: 9,
        wobble: 110,
        coast: [
            p(15400, 11750),
            p(15200, 12100),
            p(14800, 12350),
            p(14250, 12550),
            p(13700, 12350),
            p(13500, 11950),
            p(13300, 11500),
            p(13700, 11150),
            p(14250, 11000),
            p(14800, 11050),
            p(15300, 11300),
        ],
    },
    {
        id: "isle-3-1",
        from: 9,
        wobble: 110,
        coast: [
            p(2100, -6250),
            p(2000, -5850),
            p(1500, -5600),
            p(950, -5500),
            p(350, -5600),
            p(100, -6050),
            p(150, -6500),
            p(450, -6850),
            p(950, -7100),
            p(1500, -6900),
            p(1900, -6650),
        ],
    },
    {
        id: "isle-3-2",
        from: 9,
        wobble: 110,
        coast: [
            p(16800, -850),
            p(16600, -500),
            p(16300, -100),
            p(15650, -150),
            p(15150, -350),
            p(14850, -650),
            p(14750, -1100),
            p(15050, -1500),
            p(15650, -1600),
            p(16200, -1500),
            p(16750, -1350),
        ],
    },
    {
        id: "isle-3-3",
        from: 9,
        wobble: 110,
        coast: [
            p(16500, -11350),
            p(16450, -10900),
            p(15950, -10650),
            p(15350, -10500),
            p(14800, -10750),
            p(14650, -11200),
            p(14650, -11550),
            p(14800, -11950),
            p(15350, -12050),
            p(15900, -12000),
            p(16400, -11800),
        ],
    },
    {
        id: "isle-3-4",
        from: 9,
        wobble: 110,
        coast: [
            p(13200, -12250),
            p(13050, -11850),
            p(12600, -11600),
            p(12050, -11500),
            p(11450, -11600),
            p(11150, -12050),
            p(11250, -12500),
            p(11600, -12800),
            p(12050, -13100),
            p(12600, -12900),
            p(13050, -12650),
        ],
    },
    {
        id: "isle-3-5",
        from: 9,
        wobble: 110,
        coast: [
            p(18600, -7750),
            p(18550, -7300),
            p(18050, -7000),
            p(17450, -7100),
            p(16950, -7250),
            p(16650, -7550),
            p(16550, -8000),
            p(16900, -8350),
            p(17450, -8500),
            p(18000, -8400),
            p(18350, -8150),
        ],
    },
    {
        id: "isle-4-1",
        from: 9,
        wobble: 110,
        coast: [
            p(-2400, -5350),
            p(-2450, -4900),
            p(-3000, -4700),
            p(-3550, -4650),
            p(-4050, -4850),
            p(-4300, -5200),
            p(-4500, -5600),
            p(-4150, -6000),
            p(-3550, -6050),
            p(-3050, -6000),
            p(-2650, -5750),
        ],
    },
    {
        id: "isle-4-2",
        from: 9,
        wobble: 110,
        coast: [
            p(-4500, -10750),
            p(-4650, -10350),
            p(-5100, -10150),
            p(-5650, -10100),
            p(-6200, -10150),
            p(-6600, -10550),
            p(-6400, -10950),
            p(-6150, -11350),
            p(-5650, -11600),
            p(-5150, -11350),
            p(-4550, -11200),
        ],
    },
    {
        id: "isle-4-3",
        from: 9,
        wobble: 110,
        coast: [
            p(-8100, -12250),
            p(-8350, -11900),
            p(-8650, -11500),
            p(-9250, -11500),
            p(-9850, -11600),
            p(-10100, -12050),
            p(-10100, -12500),
            p(-9700, -12800),
            p(-9250, -13050),
            p(-8750, -12850),
            p(-8250, -12700),
        ],
    },
    {
        id: "isle-4-4",
        from: 9,
        wobble: 110,
        coast: [
            p(-15300, -11050),
            p(-15450, -10650),
            p(-15900, -10400),
            p(-16450, -10350),
            p(-16950, -10550),
            p(-17200, -10850),
            p(-17400, -11300),
            p(-17000, -11650),
            p(-16450, -11750),
            p(-15800, -11850),
            p(-15500, -11450),
        ],
    },
    {
        id: "isle-4-5",
        from: 9,
        wobble: 110,
        coast: [
            p(-17100, -8350),
            p(-17350, -8000),
            p(-17750, -7750),
            p(-18250, -7500),
            p(-18800, -7800),
            p(-19200, -8150),
            p(-19000, -8550),
            p(-18700, -8900),
            p(-18250, -9200),
            p(-17600, -9150),
            p(-17150, -8850),
        ],
    },
    {
        id: "isle-4-6",
        from: 9,
        wobble: 110,
        coast: [
            p(-17400, -3250),
            p(-17500, -2850),
            p(-17950, -2550),
            p(-18550, -2500),
            p(-19150, -2600),
            p(-19450, -3050),
            p(-19400, -3500),
            p(-19100, -3900),
            p(-18550, -4000),
            p(-17900, -4050),
            p(-17500, -3700),
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
    "0.1": p(-17000, 7100),
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
    "1.1": p(-15600, 4600),
    "1.2": p(-9000, 4400),
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

/** A spot a land keeps for a place a track brings a child to, and the kind of country it is. */
export interface Spot {
    terrain: string;
    at: Pt;
}

/**
 * The spots each land keeps for the places a track brings a child to: one for each place its year's
 * lessons bring a child to, since each year has its own marsh, park and painter's hut. A place
 * takes the first free spot of its kind in the order its id sorts, so a kind several places share
 * (the seaside) lists its spots in that order. The places that ask for an island stand on isles in
 * the land's own water, and the cloud islands over it. Every way to them was checked clear of every
 * place's drawings when they were set out, on the grown-up's map, which holds them all. */
export const SPOTS: Record<number, Spot[]> = {
    1: [
        { terrain: "seaside", at: p(-7600, 9650) },
        { terrain: "isle", at: p(-4100, 10950) },
        { terrain: "sky", at: p(-2000, 8250) },
        { terrain: "isle", at: p(-5000, 150) },
        { terrain: "cave", at: p(-10850, 6650) },
        { terrain: "seaside", at: p(-17850, 5150) },
        { terrain: "bay", at: p(-6350, 4900) },
        { terrain: "cliffs", at: p(-6600, 8400) },
        { terrain: "isle", at: p(-8000, 450) },
        { terrain: "grass", at: p(-8600, 7400) },
        { terrain: "hilltop", at: p(-10600, 8400) },
        { terrain: "riverbank", at: p(-14600, 9900) },
        { terrain: "isle", at: p(-11000, 750) },
        { terrain: "lakeshore", at: p(-14100, 8400) },
        { terrain: "seaside", at: p(-12600, 10150) },
    ],
    2: [
        { terrain: "seaside", at: p(12400, 3700) },
        { terrain: "isle", at: p(5400, 1600) },
        { terrain: "sky", at: p(3300, 7900) },
        { terrain: "isle", at: p(14400, 11500) },
        { terrain: "cave", at: p(10150, 3450) },
        { terrain: "seaside", at: p(7150, 7950) },
        { terrain: "cliffs", at: p(7400, 4450) },
        { terrain: "seaside", at: p(16400, 7200) },
        { terrain: "isle", at: p(17700, 11200) },
        { terrain: "grass", at: p(8900, 6450) },
        { terrain: "riverbank", at: p(14150, 8450) },
        { terrain: "isle", at: p(5100, 10600) },
        { terrain: "lakeshore", at: p(11900, 5700) },
        { terrain: "seaside", at: p(16900, 5700) },
        { terrain: "seaside", at: p(9650, 9450) },
    ],
    3: [
        { terrain: "seaside", at: p(14150, -6700) },
        { terrain: "isle", at: p(17600, -8000) },
        { terrain: "isle", at: p(12200, -12500) },
        { terrain: "sky", at: p(10100, -1400) },
        { terrain: "isle", at: p(1100, -6500) },
        { terrain: "cave", at: p(10650, -6450) },
        { terrain: "seaside", at: p(8650, -3450) },
        { terrain: "cliffs", at: p(12900, -3950) },
        { terrain: "seaside", at: p(7900, -6700) },
        { terrain: "riverbank", at: p(6650, -5200) },
        { terrain: "isle", at: p(15500, -11600) },
        { terrain: "lakeshore", at: p(6400, -8950) },
        { terrain: "seaside", at: p(9650, -5200) },
        { terrain: "seaside", at: p(9650, -8950) },
        { terrain: "isle", at: p(15800, -1100) },
    ],
    4: [
        { terrain: "seaside", at: p(-14550, -7700) },
        { terrain: "isle", at: p(-18100, -8600) },
        { terrain: "isle", at: p(-5500, -11000) },
        { terrain: "sky", at: p(-6400, -2600) },
        { terrain: "isle", at: p(-16300, -11300) },
        { terrain: "cave", at: p(-11300, -5450) },
        { terrain: "seaside", at: p(-13550, -4450) },
        { terrain: "cliffs", at: p(-10550, -9200) },
        { terrain: "seaside", at: p(-8550, -5200) },
        { terrain: "riverbank", at: p(-15550, -4700) },
        { terrain: "isle", at: p(-3400, -5600) },
        { terrain: "isle", at: p(-18400, -3500) },
        { terrain: "lakeshore", at: p(-11300, -3450) },
        { terrain: "seaside", at: p(-9050, -3700) },
        { terrain: "seaside", at: p(-8300, -8950) },
        { terrain: "isle", at: p(-9100, -12500) },
    ],
};

/**
 * The kind of country a place asks for, from the word its own declaration uses: the worlds were
 * written with a word apiece (`site.land.terrain`), and the lands keep spots by kind.
 */
const KIND: Record<string, string> = {
    lakeshore: "lakeshore",
    "frozen-lake": "lakeshore",
    riverbank: "riverbank",
    valley: "riverbank",
    hilltop: "hilltop",
    "walled-hill": "hilltop",
    "sea-cliffs": "cliffs",
    "seaside-park": "seaside",
    "across-the-bay": "bay",
    "south-shore": "seaside",
    "far-shore": "seaside",
    home: "grass",
    sky: "sky",
    "under-the-mountains": "cave",
    atoll: "isle",
    "book-island": "isle",
    "windmill-island": "isle",
    "clockwork-island": "isle",
    "lamp-rocks": "isle",
    "post-office": "isle",
    "printing-works": "isle",
};

/**
 * Where the places off the run stand on one land: each takes the first free spot of the kind it asks
 * for, or the first free spot of any kind, in the order they are given, so the same set of places
 * always lands the same way. A land with more places than spots puts the rest in a row below it.
 */
export function spotsOn(
    grade: number,
    places: readonly { id: string; terrain: string }[],
): Record<string, Pt> {
    const spots = SPOTS[grade] ?? [];
    const taken = new Set<number>();
    const out: Record<string, Pt> = {};
    const land = LAND_AT[grade];
    let spare = 0;
    for (const place of [...places].sort((a, b) => a.id.localeCompare(b.id))) {
        const kind = KIND[place.terrain] ?? place.terrain;
        let at = spots.findIndex((s, i) => !taken.has(i) && s.terrain === kind);
        // a place that does not ask for water is never put in it: the sky and the isles are kept for
        // the places that belong there, and anything else takes the next spot on the land itself
        if (at < 0)
            at = spots.findIndex(
                (s, i) => !taken.has(i) && s.terrain !== "sky" && s.terrain !== "isle",
            );
        if (at < 0) at = spots.findIndex((_, i) => !taken.has(i));
        if (at < 0) {
            out[place.id] = land
                ? p(land.x + 1200 + spare * 2600, land.y + land.h + 1800)
                : p(spare * 2600, 0);
            spare += 1;
            continue;
        }
        taken.add(at);
        const spot = spots[at];
        if (spot) out[place.id] = spot.at;
    }
    return out;
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
    [p(-17200, 5000), p(-16350, 6000), p(-15600, 7200), p(-14700, 8450), p(-14050, 9950)],
    [p(10150, 5150), p(11300, 6400), p(12550, 7650), p(13950, 8800), p(15350, 10150)],
    [p(5100, -5800), p(6100, -7000), p(6450, -8350), p(7350, -9650)],
    [p(-11500, -8600), p(-10250, -7800), p(-9150, -6900), p(-7800, -6350), p(-6650, -6200)],
];

/** Lakes, each a middle and two radii; terrain.ts draws a wobbly outline round it. */
export const LAKES: { at: Pt; rx: number; ry: number }[] = [
    { at: p(-12450, 8450), rx: 950, ry: 520 },
    { at: p(10050, 5100), rx: 620, ry: 330 },
    { at: p(8450, -8900), rx: 700, ry: 380 },
];

export const WOODS: { at: Pt; rx: number; ry: number; kind: WoodKind }[] = [
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
export const YEAR_LABELS: { grade: number; at: Pt; angle: number }[] = [
    { grade: 1, at: p(-11800, 9950), angle: 0 },
    { grade: 2, at: p(11800, 9950), angle: 0 },
    { grade: 3, at: p(9200, -3300), angle: 0 },
    { grade: 4, at: p(-11000, -3250), angle: 0 },
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
export const SHEET: Rect = { x: -21600, y: -14600, w: 43000, h: 29200 };

/**
 * The open water kept beyond each side of the country, so a hand has as much room to drag sideways
 * as it has up and down. The country is half again as wide as it is tall and a window is wider
 * still, so a map drawn all the way back has slack above and below and none at the sides; this
 * water is that slack. It widens what the map is drawn on and fenced to, and not what the map opens
 * on or works its zoom out from, which stay the country (`core` in engine/space.ts). */
export const SEA_SIDES = 4000;
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
