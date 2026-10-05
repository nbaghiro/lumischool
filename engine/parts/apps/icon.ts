// The apps' own controls, as one set: each icon is drawn on the same 2-square box with one stroke
// weight, round ends and a single marker under the pencil, so a row of them reads as one hand. Each control
// supplies a visible label or an accessible name and tooltip for compact controls. See .docs/shelf.md.
import { clip, group, plain, type Ctx } from "../../ink/surface";
import type { Marker } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

export const ICONS = [
    "home",
    "journal",
    "pictures",
    "map",
    "lessons",
    "calendar",
    "more",
    "games",
    "paint",
    "print",
    "settings",
    "back",
    "signout",
    "add",
    "help",
    "sound",
    "undo",
    "restart",
    "play",
    "pause",
    "stop",
    "up",
    "down",
    "right",
    "launch",
    "grab",
    "locate",
    "faster",
    "shuffle",
    "watch",
    "hook",
    "reel",
    "mic",
    "close",
    "words",
    "ball",
    "frisbee",
    "stick",
    "who",
    "broom",
    "curl",
    "less",
    "seed",
    "water",
    "basket",
    "sun",
] as const;
export type IconName = (typeof ICONS)[number];

/** The word each icon stands beside, which is also the button's name for a screen reader. */
export const ICON_LABEL: Record<IconName, string> = {
    home: "Home",
    journal: "Journal",
    pictures: "Your pictures",
    map: "Map",
    lessons: "Lessons",
    calendar: "Calendar",
    more: "More",
    games: "Games",
    paint: "Painting",
    print: "Print",
    settings: "Settings",
    back: "Back",
    signout: "Sign out",
    add: "Add",
    less: "Fewer",
    help: "Help",
    sound: "Sound",
    undo: "Undo",
    restart: "Start again",
    play: "Play",
    pause: "Pause",
    stop: "Brake",
    up: "Up",
    down: "Down",
    right: "Right",
    launch: "Launch",
    grab: "Pick up or release",
    locate: "Your location",
    faster: "Faster",
    shuffle: "New arrangement",
    watch: "Watch it again",
    hook: "Hook",
    reel: "Reel",
    mic: "Hold to talk",
    close: "Close",
    words: "Show the words",
    ball: "Ball",
    frisbee: "Frisbee",
    stick: "Stick",
    who: "Who lives here",
    broom: "Sweep",
    curl: "Change the curl",
    seed: "Plant",
    water: "Water",
    basket: "Pick",
    sun: "Next day",
};

/**
 * One stroke for the set, 2.8 units in a 40-unit box: about 1.7 px at 24 px, the weight of the
 * label's text beside it. The pen's wobble is turned down, since at 24 px it reads as a mistake.
 */
const W = 2.8;
const line = <G>(c: Ctx<G>, w = W) => ({
    strokeWidth: w,
    roughness: 0.45 * c.pen.o.roughness,
    bowing: 0.5 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/**
 * The marker under the pencil, laid a little down and to the left of the outline, the way a wash
 * misses the line. On paper it is a flat light grey, because a hatch at icon size is noise.
 */
const wash = <G>(c: Ctx<G>, d: string, m: Marker): void =>
    plain(c, {
        kind: "path",
        d,
        shift: [-1.3, 1.3],
        fill: c.paper ? c.t.grid : c.t[m],
        stroke: "none",
    });

const circle = (cx: number, cy: number, r: number) =>
    `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const poly = (pts: Pt[]) => `M${pts.map((p) => p.join(" ")).join("L")}Z`;
const rounded = (x: number, y: number, w: number, h: number, r: number) =>
    `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

/** An arrow along a line, with a two-stroke head, for back and sign out. */
function arrow<G>(c: Ctx<G>, from: Pt, to: Pt, head = 7.5): void {
    const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
    c.pen.line(c.g, from[0], from[1], to[0], to[1], "ruler", line(c));
    for (const s of [-1, 1]) {
        const x = to[0] - Math.cos(a + s * 0.7) * head;
        const y = to[1] - Math.sin(a + s * 0.7) * head;
        c.pen.line(c.g, to[0], to[1], x, y, "ruler", line(c));
    }
}

/**
 * The places' icons are things folded and cut from the squared book, drawn as the paper plane is:
 * a finer line than the controls', the page's grid showing through the paper, the side turned away
 * hatched, and one small colour. FINE is that line in the 40-unit box.
 */
const FINE = 1.25;

/** A piece of the squared book: white card, its grid clipped to the shape, and the line over both. */
function sheet<G>(c: Ctx<G>, d: string): void {
    plain(c, { kind: "path", d, fill: c.t.card, stroke: "none" });
    if (!c.paper) {
        const grid = clip(c, { kind: "path", d });
        for (let v = 2; v < 40; v += 4.5) {
            for (const g of [`M${v} 0V40`, `M0 ${v}H40`])
                plain(grid, { kind: "path", d: g, stroke: c.t.grid, width: 0.6, fill: "none" });
        }
    }
    c.pen.path(c.g, d, "ruler", null, line(c, FINE));
}

/** The side of a fold that is turned away, hatched in the soft ink as the plane's underside is. */
const shade = <G>(c: Ctx<G>, d: string): void =>
    c.pen.path(
        c.g,
        d,
        "ruler",
        c.pen.fill("ink-soft", "hachure", { hachureGap: 3.2, strokeWidth: 0.8 }),
        line(c, 0.7),
    );

/** A patch of one colour on the paper, with its own fine line. */
const dab = <G>(c: Ctx<G>, d: string, m: Marker): void =>
    c.pen.path(c.g, d, "ruler", c.pen.fill(m), line(c, 0.9));

const DRAW: Record<IconName, <G>(c: Ctx<G>) => void> = {
    seed: (c) => {
        // a sprout with two leaves coming up out of a mound of soil
        const mound = "M6 34C9 27 31 27 34 34Z";
        wash(c, mound, "tang");
        c.pen.path(c.g, mound, "ruler", null, line(c));
        c.pen.path(c.g, "M20 29V15", "ruler", null, line(c));
        const left = "M20 19C15 19 10 16 9 10C15 10 19 13 20 19Z",
            right = "M20 15C21 9 26 6 32 6C31 12 26 15 20 15Z";
        wash(c, left, "mint");
        wash(c, right, "mint");
        c.pen.path(c.g, left, "ruler", null, line(c));
        c.pen.path(c.g, right, "ruler", null, line(c));
    },
    water: (c) => {
        // a watering can tipped, and three drops falling from its rose
        const body = "M15 14H31V30H15Z";
        wash(c, body, "sky");
        c.pen.path(c.g, body, "ruler", null, line(c));
        c.pen.path(c.g, "M15 20L6 13", "ruler", null, line(c));
        c.pen.path(c.g, "M31 17C37 17 37 27 31 27", "ruler", null, line(c));
        for (const [x, y] of [
            [5, 21],
            [9, 27],
            [3, 31],
        ] as const)
            c.pen.path(c.g, `M${x} ${y}V${y + 3}`, "ruler", null, line(c));
    },
    basket: (c) => {
        // a basket with a handle over it, the way picked things are carried
        const d = "M6 18H34L30 34H10Z";
        wash(c, d, "glow");
        c.pen.path(c.g, d, "ruler", null, line(c));
        c.pen.path(c.g, "M11 18C11 6 29 6 29 18", "ruler", null, line(c));
        c.pen.path(c.g, "M8 25H32", "ruler", null, line(c, W * 0.8));
    },
    sun: (c) => {
        // the sun, for a night passing and the next day coming
        const d = circle(20, 20, 7);
        wash(c, d, "glow");
        c.pen.path(c.g, d, "ruler", null, line(c));
        for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI) / 4;
            c.pen.line(
                c.g,
                20 + Math.cos(a) * 11,
                20 + Math.sin(a) * 11,
                20 + Math.cos(a) * 15,
                20 + Math.sin(a) * 15,
                "ruler",
                line(c),
            );
        }
    },
    who: (c) => {
        // a head and shoulders, for choosing who a game is played as
        const head = "M26 14A6 6 0 1 1 14 14A6 6 0 1 1 26 14Z";
        wash(c, head, "berry");
        c.pen.path(c.g, head, "ruler", null, line(c));
        c.pen.path(c.g, "M8 34C8 26 13 22 20 22C27 22 32 26 32 34", "ruler", null, line(c));
    },
    broom: (c) => {
        // a curling broom: a long handle and its pad on the ice
        c.pen.path(c.g, "M31 5L18 25", "ruler", null, line(c));
        const pad = rounded(6, 25, 22, 8, 3);
        wash(c, pad, "tang");
        c.pen.path(c.g, pad, "ruler", null, line(c));
        c.pen.path(c.g, "M11 33V36M17 33V36M23 33V36", "ruler", null, line(c, W * 0.8));
    },
    curl: (c) => {
        // a stone and the curve it bends along, for which way it curls
        const stone = circle(10, 30, 5);
        wash(c, stone, "sky");
        c.pen.path(c.g, stone, "ruler", null, line(c));
        c.pen.path(c.g, "M15 27C19 15 25 11 32 11", "ruler", null, line(c));
        c.pen.linear(
            c.g,
            [
                [27, 6],
                [32, 11],
                [27, 16],
            ],
            "ruler",
            line(c),
        );
    },
    ball: (c) => {
        const d = "M32 20A12 12 0 1 1 8 20A12 12 0 1 1 32 20Z";
        wash(c, d, "glow");
        c.pen.path(c.g, d, "ruler", null, line(c));
        c.pen.path(c.g, "M11 13C17 18 17 23 11 28", "ruler", null, line(c));
        c.pen.path(c.g, "M29 13C23 18 23 23 29 28", "ruler", null, line(c));
    },
    frisbee: (c) => {
        const d = "M5 22C5 15 35 15 35 22C35 27 5 27 5 22Z";
        wash(c, d, "sky");
        c.pen.path(c.g, d, "ruler", null, line(c));
        c.pen.path(c.g, "M12 19C17 17 23 17 28 19", "ruler", null, line(c));
    },
    stick: (c) => {
        c.pen.path(c.g, "M7 31L33 9", "ruler", null, line(c));
        c.pen.path(c.g, "M20 20L26 23", "ruler", null, line(c));
    },
    faster: (c) => {
        for (const x of [8, 20])
            c.pen.linear(
                c.g,
                [
                    [x, 9],
                    [x + 11, 20],
                    [x, 31],
                ],
                "ruler",
                line(c),
            );
    },
    shuffle: (c) => {
        // two crossing paths with heads, the shuffle sign
        c.pen.path(c.g, "M7 13H13C20 13 21 27 28 27H33", "ruler", null, line(c));
        c.pen.path(c.g, "M7 27H13C20 27 21 13 28 13H33", "ruler", null, line(c));
        for (const y of [13, 27])
            c.pen.linear(
                c.g,
                [
                    [28, y - 5],
                    [33, y],
                    [28, y + 5],
                ],
                "ruler",
                line(c),
            );
    },
    watch: (c) => {
        c.pen.path(c.g, "M5 20C11 10 29 10 35 20C29 30 11 30 5 20Z", "ruler", null, line(c));
        c.pen.path(
            c.g,
            "M24.5 20A4.5 4.5 0 1 1 15.5 20A4.5 4.5 0 1 1 24.5 20Z",
            "ruler",
            null,
            line(c),
        );
    },
    hook: (c) => {
        // a fish hook with its barb, hanging from the eye
        c.pen.path(c.g, "M24 6V24A7 7 0 1 1 10 24V21", "ruler", null, line(c));
        c.pen.linear(
            c.g,
            [
                [6, 25],
                [10, 21],
                [14, 25],
            ],
            "ruler",
            line(c),
        );
        c.pen.path(c.g, "M26 6A2 2 0 1 1 22 6A2 2 0 1 1 26 6Z", "ruler", null, line(c));
    },
    mic: (c) => {
        // a microphone's head on its stand, the sign for talking
        wash(c, rounded(14, 5, 12, 20, 6), "sky");
        c.pen.path(c.g, rounded(14, 5, 12, 20, 6), "ruler", null, line(c));
        c.pen.path(c.g, "M9 19A11 11 0 0 0 31 19", "ruler", null, line(c));
        c.pen.line(c.g, 20, 30, 20, 35, "ruler", line(c));
        c.pen.line(c.g, 14, 35, 26, 35, "ruler", line(c));
    },
    close: (c) => {
        c.pen.line(c.g, 10, 10, 30, 30, "ruler", line(c));
        c.pen.line(c.g, 30, 10, 10, 30, "ruler", line(c));
    },
    words: (c) => {
        // a speech bubble with two lines of writing in it, for the words said shown under the face
        const bubble = "M8 8H32Q35 8 35 11V24Q35 27 32 27H18L11 33V27H8Q5 27 5 24V11Q5 8 8 8Z";
        wash(c, bubble, "glow");
        c.pen.path(c.g, bubble, "ruler", null, line(c));
        c.pen.line(c.g, 11, 15, 29, 15, "ruler", line(c));
        c.pen.line(c.g, 11, 20, 24, 20, "ruler", line(c));
    },
    reel: (c) => {
        // a reel's drum with its handle, turned to bring the line in
        c.pen.path(c.g, "M29 20A9 9 0 1 1 11 20A9 9 0 1 1 29 20Z", "ruler", null, line(c));
        c.pen.path(c.g, "M23 20A3 3 0 1 1 17 20A3 3 0 1 1 23 20Z", "ruler", null, line(c));
        c.pen.linear(
            c.g,
            [
                [20, 20],
                [33, 11],
                [36, 14],
            ],
            "ruler",
            line(c),
        );
    },
    undo: (c) => {
        c.pen.path(c.g, "M8 15H22C37 15 36 33 22 33", "ruler", null, line(c));
        c.pen.linear(
            c.g,
            [
                [16, 7],
                [8, 15],
                [16, 23],
            ],
            "ruler",
            line(c),
        );
    },
    restart: (c) => {
        c.pen.path(c.g, "M9 13A13 13 0 1 1 8 27", "ruler", null, line(c));
        c.pen.linear(
            c.g,
            [
                [9, 5],
                [9, 14],
                [18, 14],
            ],
            "ruler",
            line(c),
        );
    },
    play: (c) => {
        const d = poly([
            [12, 7],
            [33, 20],
            [12, 33],
        ]);
        wash(c, d, "mint");
        c.pen.path(c.g, d, "ruler", null, line(c));
    },
    pause: (c) => {
        for (const x of [11, 25]) {
            const d = rounded(x, 7, 5, 26, 1);
            wash(c, d, "glow");
            c.pen.path(c.g, d, "ruler", null, line(c));
        }
    },
    stop: (c) => {
        const d = rounded(9, 9, 22, 22, 2);
        wash(c, d, "berry");
        c.pen.path(c.g, d, "ruler", null, line(c));
    },
    up: (c) => arrow(c, [20, 33], [20, 7]),
    down: (c) => arrow(c, [20, 7], [20, 33]),
    right: (c) => arrow(c, [7, 20], [33, 20]),
    locate: (c) => {
        wash(c, "M20 10A10 10 0 1 0 20 30A10 10 0 1 0 20 10", "glow");
        c.pen.path(c.g, "M20 10A10 10 0 1 0 20 30A10 10 0 1 0 20 10", "ruler", null, line(c));
        c.pen.path(c.g, "M20 4V12M20 28V36M4 20H12M28 20H36", "ruler", null, line(c));
        c.pen.path(
            c.g,
            "M20 17A3 3 0 1 0 20 23A3 3 0 1 0 20 17",
            "ruler",
            c.pen.fill("glow"),
            line(c),
        );
    },
    launch: (c) => {
        c.pen.path(c.g, "M7 31Q12 7 31 10", "ruler", null, line(c));
        c.pen.linear(
            c.g,
            [
                [24, 4],
                [32, 10],
                [25, 17],
            ],
            "ruler",
            line(c),
        );
    },
    grab: (c) => {
        c.pen.path(c.g, "M20 5V21C20 32 31 33 31 23", "ruler", null, line(c));
        c.pen.path(c.g, rounded(7, 27, 12, 9, 1), "ruler", null, line(c));
    },
    home: (c) => {
        // a house folded from the squared page, its roof's far side in shade and a lit window
        sheet(c, "M8 19L20 9L32 19V33H8Z");
        shade(c, "M20 9L32 19H25Z");
        c.pen.path(c.g, "M5.5 20.5L20 8L34.5 20.5", "ruler", null, line(c, FINE));
        dab(c, "M17 33V25.5H23V33", "glow");
        dab(c, "M11.5 22H15.5V26H11.5Z", "sky");
    },
    pictures: (c) => {
        wash(c, rounded(8, 9, 27, 24, 2), "sky");
        c.pen.path(c.g, "M5 27V5H29", "ruler", null, line(c));
        c.pen.path(c.g, rounded(8, 9, 27, 24, 2), "ruler", null, line(c));
        c.pen.path(c.g, "M10 29L18 21L23 26L28 20L33 27", "ruler", null, line(c));
        c.pen.path(c.g, circle(26, 16, 2), "ruler", null, line(c));
    },
    journal: (c) => {
        // today's page of the squared book, set down askew, a line written on it and the pencil
        sheet(c, "M6.5 10.5L27 6.5L31.5 30.5L11 34.5Z");
        c.pen.path(c.g, "M11.5 16.5C14 14.5 15.5 18 18 15.5S22.5 15.5 24.5 13.5", "ruler", null, {
            ...line(c, 1.3),
            stroke: c.t.pen,
        });
        c.pen.path(c.g, "M12.5 22.5L23.5 20.4", "ruler", null, {
            ...line(c, 1.3),
            stroke: c.t.pen,
        });
        // the pencil across the page's corner: its yellow body, the pink end, the sharpened point
        dab(c, "M17 30.5L32.5 15L36 18.5L20.5 34Z", "glow");
        dab(c, "M32.5 15L34.5 13C35.5 12 37 12 38 13S39 15.5 38 16.5L36 18.5Z", "berry");
        c.pen.path(c.g, "M17 30.5L13.5 37.5L20.5 34Z", "ruler", c.pen.fill("card"), line(c, 0.9));
        plain(c, {
            kind: "path",
            d: "M14.6 35.2L13.5 37.5L15.8 36.4Z",
            fill: c.t.ink,
            stroke: "none",
        });
    },
    map: (c) => {
        // a pin of the squared page standing where you are, its shadow hatched and the way that led there
        c.pen.path(c.g, "M3.5 33.5C7 28.5 10 32.5 14 30", "ruler", null, {
            ...line(c, 1.4),
            stroke: c.t.pen,
            strokeLineDash: [2.4, 2.2],
        });
        shade(c, "M15 34.5C15 33 19 32 23 32S31 33 31 34.5S27 37 23 37S15 36 15 34.5Z");
        sheet(c, "M23 34C23 34 13 23.5 13 15.5A10 10 0 1 1 33 15.5C33 23.5 23 34 23 34Z");
        dab(c, circle(23, 15.5, 4), "berry");
    },
    print: (c) => {
        wash(c, rounded(7, 15.5, 26, 12.5, 3), "sky");
        c.pen.linear(
            c.g,
            [
                [12.5, 15.5],
                [12.5, 6],
                [27.5, 6],
                [27.5, 15.5],
            ],
            "ruler",
            line(c),
        );
        c.pen.path(c.g, rounded(6.5, 15, 27, 13, 3), "ruler", null, line(c));
        const sheet = poly([
            [12.5, 23.5],
            [27.5, 23.5],
            [27.5, 35],
            [12.5, 35],
        ]);
        c.pen.path(c.g, sheet, "ruler", { fill: c.t.card, fillStyle: "solid" }, line(c));
        for (const y of [27.5, 31]) c.pen.line(c.g, 15, y, 25, y, "ruler", line(c, 1.2));
        for (const x of [17.5, 22.5]) c.pen.line(c.g, x, 25.5, x, 33, "ruler", line(c, 1.2));
        c.pen.circle(
            c.g,
            29,
            19.5,
            2.2,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            line(c, 0.6),
        );
    },
    lessons: (c) => {
        // a book open on its squared pages, a ribbon keeping the place
        sheet(c, "M20 11C15 8 9 8 5.5 9.5V31C9 29.5 15 29.5 20 32Z");
        sheet(c, "M20 11C25 8 31 8 34.5 9.5V31C31 29.5 25 29.5 20 32Z");
        shade(c, "M20 11C18.5 10 17 9.4 15.5 9.1V30.2C17 30.6 18.5 31.2 20 32Z");
        dab(c, "M27 8.6L27 18L29 16.2L31 18V8.9", "berry");
        c.pen.line(c.g, 20, 11, 20, 32, "ruler", line(c, FINE));
    },
    calendar: (c) => {
        // a month's page of the squared book on two rings, today ringed in the pen
        sheet(c, "M7 11H33V34H7Z");
        dab(c, "M7 11H33V16.5H7Z", "berry");
        for (const x of [14, 26]) {
            c.pen.path(c.g, `M${x} 14.5V7.5`, "ruler", null, line(c, FINE));
            c.pen.circle(c.g, x, 14.5, 2.2, "ruler", c.pen.fill("card"), line(c, 1.1));
        }
        c.pen.circle(c.g, 25.5, 26.5, 7, "ruler", null, { ...line(c, 1.5), stroke: c.t.pen });
    },
    more: (c) => {
        // three dots, the sign for the rest
        for (const x of [9, 20, 31]) {
            wash(c, circle(x, 20, 3.2), "glow");
            c.pen.circle(c.g, x, 20, 5, "ruler", { fill: c.t.ink, fillStyle: "solid" }, line(c));
        }
    },
    games: (c) => {
        // a die folded from the squared page: its top and front in the light, its side in shade
        sheet(c, "M8 15L22 15L22 33L8 33Z");
        sheet(c, "M8 15L14 9L28 9L22 15Z");
        sheet(c, "M22 15L28 9L28 27L22 33Z");
        shade(c, "M22 15L28 9L28 27L22 33Z");
        const pip = { fill: c.t.ink, stroke: "none" } as const;
        for (const [x, y] of [
            [11.5, 19],
            [15, 24],
            [18.5, 29],
        ] as const)
            plain(c, { kind: "path", d: circle(x, y, 1.6), ...pip });
        plain(c, { kind: "path", d: circle(18, 12, 1.5), ...pip });
        for (const [x, y] of [
            [24.5, 17.5],
            [25.8, 25],
        ] as const)
            plain(c, { kind: "path", d: circle(x, y, 1.3), fill: c.t.card, stroke: "none" });
    },
    paint: (c) => {
        // a palette cut from the squared page, three paints on it and a brush across it
        sheet(
            c,
            "M8 28C3 21 7 10 18 8C29 6 36 13 34 20C33 24 28 23 26 26C24 30 27 34 21 34C15 34 11 32 8 28Z",
        );
        c.pen.circle(c.g, 25.5, 28.5, 3.4, "ruler", c.pen.fill("paper"), line(c, 1.1));
        dab(c, circle(13, 15, 3), "berry");
        dab(c, circle(21, 12.5, 3), "glow");
        dab(c, circle(12.5, 23.5, 3), "sky");
        dab(c, "M19.5 27.5L34.5 12.5L36 14L21 29Z", "glow");
        dab(c, "M16 32.5C14.5 30.5 16.5 27.5 19.5 27.5L21 29C21 32 18.5 34 16 32.5Z", "mint");
    },
    settings: (c) => {
        const teeth = 8;
        const outer = 14.5;
        const inner = 11.3;
        const pts: Pt[] = [];
        for (let i = 0; i < teeth * 4; i++) {
            const k = i % 4;
            const t = ((i - 0.5) / (teeth * 4)) * Math.PI * 2;
            const r = k === 1 || k === 2 ? outer : inner;
            pts.push([20 + Math.cos(t) * r, 20 + Math.sin(t) * r]);
        }
        wash(c, circle(20, 20, 12.5), "glow");
        c.pen.polygon(c.g, pts, "ruler", null, line(c));
        c.pen.circle(c.g, 20, 20, 9.5, "ruler", { fill: c.t.card, fillStyle: "solid" }, line(c));
    },
    back: (c) => {
        arrow(c, [33, 20], [7.5, 20], 8.5);
    },
    signout: (c) => {
        wash(
            c,
            poly([
                [9.5, 7],
                [19, 9.5],
                [19, 32.5],
                [9.5, 34.5],
            ]),
            "berry",
        );
        const door: Pt[] = [
            [20.5, 11],
            [20.5, 5.5],
            [8.5, 5.5],
            [8.5, 34.5],
            [20.5, 34.5],
            [20.5, 29],
        ];
        c.pen.linear(c.g, door, "ruler", line(c));
        c.pen.polygon(
            c.g,
            [
                [8.5, 5.5],
                [18, 8.5],
                [18, 31.5],
                [8.5, 34.5],
            ],
            "ruler",
            null,
            line(c, W * 0.85),
        );
        arrow(c, [18.5, 20], [35, 20], 7);
    },
    add: (c) => {
        wash(c, circle(20, 20, 14), "mint");
        c.pen.circle(c.g, 20, 20, 29, "ruler", null, line(c));
        c.pen.line(c.g, 20, 12.5, 20, 27.5, "ruler", line(c));
        c.pen.line(c.g, 12.5, 20, 27.5, 20, "ruler", line(c));
    },
    less: (c) => {
        wash(c, circle(20, 20, 14), "berry");
        c.pen.circle(c.g, 20, 20, 29, "ruler", null, line(c));
        c.pen.line(c.g, 12.5, 20, 27.5, 20, "ruler", line(c));
    },
    help: (c) => {
        wash(c, circle(20, 20, 14), "glow");
        c.pen.circle(c.g, 20, 20, 29, "ruler", null, line(c));
        const hook = "M15.2 16Q15.4 10.8 20.2 10.8Q25 11 25 15.3Q25 18.2 21.6 19.8Q20 20.7 20 23.5";
        c.pen.path(c.g, hook, "ruler", null, line(c));
        c.pen.circle(
            c.g,
            20,
            28.4,
            2.6,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            line(c, 0.8),
        );
    },
    sound: (c) => {
        wash(
            c,
            poly([
                [6.5, 15.5],
                [12.5, 15.5],
                [20, 9],
                [20, 31],
                [12.5, 24.5],
                [6.5, 24.5],
            ]),
            "sky",
        );
        const speaker: Pt[] = [
            [6, 15],
            [12.5, 15],
            [20.5, 8.5],
            [20.5, 31.5],
            [12.5, 25],
            [6, 25],
        ];
        c.pen.polygon(c.g, speaker, "ruler", null, line(c));
        c.pen.arc(c.g, 21, 20, 13, 14, -0.9, 0.9, "ruler", line(c, W * 0.9));
        c.pen.arc(c.g, 21, 20, 23, 25, -0.85, 0.85, "ruler", line(c, W * 0.9));
    },
};

export const icon = defineDrawing<{ name: IconName; on: boolean }>({
    id: "icon",
    family: "apps",
    title: "Icons for the apps' controls",
    group: "Marks",
    about: "Home, journal, map, print, settings, back, sign out, add, help, sound, faster, shuffle, watch, hook, reel, a microphone, close, the words said, a ball, a frisbee, a stick, a head and shoulders for who plays, a curling broom, a stone's curve, a minus for fewer, a sprout for planting, a watering can, a basket and the sun for the next day, drawn as one set on a two-square box: one stroke weight, round ends and one marker under the pencil. Every control supplies its name, and `on` lays a disc of highlighter behind it for the page a child or a grown-up is on.",
    params: { name: "home", on: false },
    settings: { name: { kind: "one of", of: ICONS }, on: { kind: "flag" } },
    takes: [
        ...ICONS.map((name) => ({ label: ICON_LABEL[name], params: { name, on: false } })),
        { label: "Journal, the page you are on", params: { name: "journal", on: true } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        if (p.on) {
            const disc = c.paper ? c.t.grid : c.t.glow;
            plain(c, {
                kind: "circle",
                cx: 21,
                cy: 21.5,
                r: 18.5,
                fill: disc,
                opacity: c.paper ? 1 : 0.8,
            });
        }
        const name = ICONS.find((n) => n === p.name) ?? "home";
        DRAW[name](group(c, { round: true }));
        return { centre: [20, 20, "up"] };
    },
    // an icon always sits beside its word, and the word names the control
    describe: () => null,
});
