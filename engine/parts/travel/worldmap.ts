import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, sayOn, slot } from "../lettering";

type Pt = [number, number];

/** The seven continents as schools in England and the US count them, in the order `blank` and the letters use. */
export const CONTINENTS = [
    "North America",
    "South America",
    "Europe",
    "Africa",
    "Asia",
    "Australia",
    "Antarctica",
] as const;
export type Continent = (typeof CONTINENTS)[number];

/** Coarse coastlines in degrees of longitude and latitude, enough to be known at a glance. */
const LAND: { of: Continent; at: Pt; outline: Pt[] }[] = [
    {
        of: "North America",
        at: [-100, 45],
        outline: [
            [-168, 66],
            [-140, 70],
            [-95, 72],
            [-80, 62],
            [-62, 55],
            [-55, 48],
            [-70, 43],
            [-76, 35],
            [-81, 25],
            [-90, 29],
            [-97, 26],
            [-97, 20],
            [-87, 21],
            [-83, 10],
            [-78, 8],
            [-90, 14],
            [-105, 20],
            [-112, 30],
            [-118, 34],
            [-124, 40],
            [-125, 48],
            [-135, 58],
            [-150, 60],
            [-165, 60],
        ],
    },
    {
        of: "North America",
        at: [-42, 72],
        outline: [
            [-50, 60],
            [-40, 65],
            [-20, 70],
            [-20, 80],
            [-40, 83],
            [-60, 80],
            [-70, 77],
            [-55, 70],
        ],
    },
    {
        of: "South America",
        at: [-60, -15],
        outline: [
            [-78, 8],
            [-60, 10],
            [-50, 0],
            [-35, -5],
            [-40, -20],
            [-48, -28],
            [-58, -38],
            [-65, -45],
            [-68, -55],
            [-75, -50],
            [-73, -40],
            [-71, -20],
            [-76, -12],
            [-81, -5],
            [-80, 0],
        ],
    },
    {
        of: "Europe",
        at: [20, 54],
        outline: [
            [-10, 36],
            [-9, 43],
            [-2, 44],
            [-5, 48],
            [2, 51],
            [8, 54],
            [10, 57],
            [5, 62],
            [12, 66],
            [20, 70],
            [30, 70],
            [40, 67],
            [45, 68],
            [60, 68],
            [60, 50],
            [50, 45],
            [40, 42],
            [30, 41],
            [26, 38],
            [22, 36],
            [20, 40],
            [15, 38],
            [12, 44],
            [8, 44],
            [3, 42],
            [-5, 36],
        ],
    },
    {
        of: "Europe",
        at: [-3, 54],
        outline: [
            [-5, 50],
            [1, 51],
            [1, 53],
            [-3, 56],
            [-5, 58],
            [-6, 55],
            [-4, 53],
        ],
    },
    {
        of: "Africa",
        at: [20, 5],
        outline: [
            [-17, 21],
            [-10, 35],
            [10, 37],
            [20, 32],
            [32, 31],
            [35, 28],
            [43, 12],
            [51, 12],
            [40, -5],
            [40, -15],
            [35, -24],
            [26, -34],
            [18, -34],
            [12, -18],
            [9, -2],
            [9, 4],
            [-8, 5],
            [-17, 14],
        ],
    },
    {
        of: "Asia",
        at: [95, 50],
        outline: [
            [60, 68],
            [80, 73],
            [100, 77],
            [140, 72],
            [180, 68],
            [170, 60],
            [160, 58],
            [142, 50],
            [135, 43],
            [128, 35],
            [122, 30],
            [120, 23],
            [108, 18],
            [106, 10],
            [100, 13],
            [100, 5],
            [104, 1],
            [98, 8],
            [92, 20],
            [88, 22],
            [80, 15],
            [78, 8],
            [73, 20],
            [66, 25],
            [57, 25],
            [52, 17],
            [43, 12],
            [35, 28],
            [34, 31],
            [36, 36],
            [30, 41],
            [40, 42],
            [50, 45],
            [60, 50],
        ],
    },
    {
        of: "Asia",
        at: [138, 37],
        outline: [
            [130, 31],
            [135, 34],
            [140, 35],
            [142, 40],
            [141, 45],
            [140, 42],
            [136, 36],
            [131, 34],
        ],
    },
    {
        of: "Australia",
        at: [134, -25],
        outline: [
            [114, -22],
            [122, -18],
            [130, -12],
            [137, -12],
            [142, -11],
            [146, -19],
            [153, -25],
            [150, -37],
            [141, -38],
            [131, -31],
            [115, -34],
        ],
    },
    {
        of: "Antarctica",
        at: [20, -72],
        outline: [
            [-170, -70],
            [-120, -73],
            [-60, -64],
            [-30, -72],
            [30, -69],
            [90, -66],
            [150, -68],
            [190, -72],
            [190, -78],
            [-170, -78],
        ],
    },
];

const OCEANS: { name: string; at: Pt }[] = [
    { name: "Pacific Ocean", at: [-140, 5] },
    { name: "Atlantic Ocean", at: [-35, 22] },
    { name: "Indian Ocean", at: [78, -22] },
    { name: "Arctic Ocean", at: [10, 80] },
    { name: "Pacific Ocean", at: [165, 18] },
];

/** Places a map can mark, each on its continent, which the history checker reads. */
export const PLACES: Record<string, { at: Pt; on: Continent }> = {
    London: { at: [0, 51.5], on: "Europe" },
    Washington: { at: [-77, 39], on: "North America" },
    Tokyo: { at: [139.7, 35.7], on: "Asia" },
    Moscow: { at: [37.6, 55.8], on: "Europe" },
    Beijing: { at: [116.4, 39.9], on: "Asia" },
    Baghdad: { at: [44.4, 33.3], on: "Asia" },
    Kaifeng: { at: [114.3, 34.8], on: "Asia" },
    Kyoto: { at: [135.8, 35], on: "Asia" },
    Kyiv: { at: [30.5, 50.5], on: "Europe" },
    "Benin City": { at: [5.6, 6.3], on: "Africa" },
    Cairo: { at: [31.2, 30], on: "Africa" },
    Rome: { at: [12.5, 41.9], on: "Europe" },
    Athens: { at: [23.7, 38], on: "Europe" },
    Canberra: { at: [149.1, -35.3], on: "Australia" },
    Brasília: { at: [-47.9, -15.8], on: "South America" },
    Seville: { at: [-6, 37.4], on: "Europe" },
    Nanjing: { at: [118.8, 32], on: "Asia" },
    Calicut: { at: [75.8, 11.3], on: "Asia" },
    Malindi: { at: [40.1, -3.2], on: "Africa" },
    "Mexico City": { at: [-99.1, 19.4], on: "North America" },
    Uruk: { at: [45.6, 31.3], on: "Asia" },
    "Mohenjo-daro": { at: [68.1, 27.3], on: "Asia" },
    Memphis: { at: [31.3, 29.8], on: "Africa" },
    Anyang: { at: [114.4, 36.1], on: "Asia" },
    Constantinople: { at: [29, 41], on: "Europe" },
    "Chang'an": { at: [108.9, 34.3], on: "Asia" },
    Samarkand: { at: [67, 39.7], on: "Asia" },
    Venice: { at: [12.3, 45.4], on: "Europe" },
};

/** The routes a map can draw, as lines of longitude and latitude. */
const ROUTES: Pt[][] = [
    [],
    // Zheng He's fleets, from Nanjing round to Calicut and on to the coast of East Africa
    [
        [118.8, 32],
        [120, 24],
        [110, 12],
        [104, 2],
        [96, 5],
        [81, 6],
        [75.8, 11.3],
        [60, 12],
        [48, 10],
        [40.1, -3.2],
    ],
    // the first voyage round the world, from Seville westwards and home round Africa
    [
        [-6, 37.4],
        [-17, 20],
        [-35, -5],
        [-48, -28],
        [-68, -53],
        [-80, -45],
        [-110, -20],
        [-150, 5],
        [-170, 8],
        [190, 10],
        [145, 13],
        [124, 10],
        [118, -5],
        [100, -12],
        [60, -30],
        [20, -36],
        [5, -10],
        [-18, 10],
        [-9, 36],
        [-6, 37.4],
    ],
    // the Silk Road, from Chang'an by Samarkand and Baghdad to Constantinople
    [
        [108.9, 34.3],
        [94.7, 40.1],
        [76, 39.5],
        [67, 39.7],
        [61.8, 37.6],
        [44.4, 33.3],
        [36.2, 36.2],
        [29, 41],
    ],
];

interface WorldMapParams {
    /** How the continents are named: 0 by name, 1 by letter A to G, 2 not at all. */
    names: number;
    /** A continent left unnamed for the child: -1 none, else its place in the list. */
    blank: number;
    oceans: number;
    /** Places marked with a dot, by name. */
    places: string[];
    /** 1 numbers the places' dots rather than naming them. */
    numbered: number;
    /** 0 no route, 1 Zheng He's voyages, 2 the first voyage round the world, 3 the Silk Road. */
    route: number;
}

const W = 34;
const H = 17;
const LON0 = -170;
const LAT0 = 84;
const PER = 360 / (W - 2);
const xy = ([lon, lat]: Pt): Pt => [(1 + (lon - LON0) / PER) * U, (0.5 + (LAT0 - lat) / PER) * U];

const NAMED: WorldMapParams = {
    names: 0,
    blank: -1,
    oceans: 1,
    places: [],
    numbered: 0,
    route: 0,
};

export const worldMap = defineDrawing<WorldMapParams>({
    id: "worldmap",
    family: "travel",
    title: "World map",
    group: "Structures",
    about: "The whole world on one page, with the seven continents drawn plainly and named, lettered A to G, or left for the child (`names`, with `blank` leaving one unnamed), the oceans named (`oceans`), cities marked with a dot and named or numbered (`places`, `numbered`), and a voyage drawn as a dashed line (`route`: 1 Zheng He's fleets to India and Africa, 2 the first voyage round the world, 3 the Silk Road from Chang'an to Constantinople).",
    params: NAMED,
    settings: {
        names: { kind: "whole", min: 0, max: 2 },
        blank: { kind: "whole", min: -1, max: 6 },
        oceans: { kind: "whole", min: 0, max: 1 },
        places: { kind: "words", of: Object.keys(PLACES), most: 8 },
        numbered: { kind: "whole", min: 0, max: 1 },
        route: { kind: "whole", min: 0, max: 3 },
    },
    takes: [
        { label: "Continents and oceans", params: NAMED },
        {
            label: "Lettered, with cities",
            params: {
                names: 1,
                blank: -1,
                oceans: 0,
                places: ["Baghdad", "Kaifeng", "Kyoto", "Kyiv", "Benin City"],
                numbered: 0,
                route: 0,
            },
        },
        {
            label: "One continent to name",
            params: { names: 0, blank: 3, oceans: 1, places: [], numbered: 0, route: 0 },
        },
        {
            label: "The Silk Road",
            params: {
                names: 2,
                blank: -1,
                oceans: 0,
                places: ["Chang'an", "Samarkand", "Baghdad", "Constantinople"],
                numbered: 1,
                route: 3,
            },
        },
        {
            label: "Round the world",
            params: { names: 2, blank: -1, oceans: 1, places: ["Seville"], numbered: 0, route: 2 },
        },
        {
            label: "Zheng He's voyages",
            params: {
                names: 2,
                blank: -1,
                oceans: 0,
                places: ["Nanjing", "Calicut", "Malindi"],
                numbered: 0,
                route: 1,
            },
        },
    ],
    box: () => ({ w: W, h: H }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            names = Math.round(p.names),
            blank = Math.round(p.blank);
        pen.rect(
            g,
            0.3 * U,
            0.2 * U,
            (W - 0.6) * U,
            (H - 0.4) * U,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 18 }),
            { strokeWidth: 1.6 },
        );
        for (const land of LAND)
            pen.polygon(
                g,
                land.outline.map(xy),
                "pencil",
                pen.fill(land.of === "Antarctica" ? "card" : "mint", "solid"),
                { strokeWidth: 1.5 },
            );
        if (Math.round(p.oceans) === 1)
            for (const o of OCEANS) {
                const [x, y] = xy(o.at);
                sayOn(c, x, y, o.name, 11);
            }
        const route = ROUTES[Math.round(p.route)] ?? [];
        // a voyage that crosses the map's edge is drawn as two lines, one leaving and one coming in
        const legs: Pt[][] = [];
        route.forEach((pt, i) => {
            const prev = route[i - 1];
            if (!prev || Math.abs(pt[0] - prev[0]) > 180) legs.push([pt]);
            else legs[legs.length - 1]?.push(pt);
        });
        for (const leg of legs)
            if (leg.length > 1)
                pen.linear(g, leg.map(xy), "pencil", {
                    strokeWidth: 1.8,
                    stroke: c.t.berry,
                    strokeLineDash: [7, 6],
                });
        CONTINENTS.forEach((name, i) => {
            const land = LAND.find((l) => l.of === name);
            if (!land) return;
            const [x, y] = xy(land.at);
            a[`continent(${i})`] = [x, y - 0.6 * U, "up"];
            if (i === blank) slot(c, x - 2.4 * U, y - 0.7 * U, 4.8 * U, 1.3 * U);
            else if (names === 0) sayOn(c, x, y + 0.2 * U, name, 12);
            else if (names === 1) numOn(c, x, y + 0.3 * U, "ABCDEFG".charAt(i), 16);
        });
        p.places.forEach((name, i) => {
            const place = PLACES[name];
            if (!place) return;
            const [x, y] = xy(place.at);
            pen.circle(g, x, y, 7, "ruler", pen.fill("berry", "solid"), { strokeWidth: 1.2 });
            if (Math.round(p.numbered) === 1) numOn(c, x + 0.7 * U, y - 0.3 * U, i + 1, 13);
            else sayOn(c, x + 0.4 * U, y - 0.3 * U, name, 11, "start");
            a[`place(${i})`] = [x, y, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A map of the whole world laid flat, with the seven continents and the oceans between them${p.places.length ? `, and ${p.places.length} cities marked with dots` : ""}${Math.round(p.route) ? ", and a voyage as a dashed line" : ""}.`,
});
