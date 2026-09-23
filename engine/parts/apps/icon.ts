// The apps' own controls, as one set: each icon is drawn on the same 2-square box with one stroke
// weight, round ends and a single marker under the pencil, so a row of them reads as one hand. Each control
// supplies a visible label or an accessible name and tooltip for compact controls. See .docs/shelf.md.
import { group, plain, type Ctx } from "../../ink/surface";
import type { Marker } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

export const ICONS = [
    "home",
    "journal",
    "map",
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
] as const;
export type IconName = (typeof ICONS)[number];

/** The word each icon stands beside, which is also the button's name for a screen reader. */
export const ICON_LABEL: Record<IconName, string> = {
    home: "Home",
    journal: "Journal",
    map: "Map",
    print: "Print",
    settings: "Settings",
    back: "Back",
    signout: "Sign out",
    add: "Add",
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

const DRAW: Record<IconName, <G>(c: Ctx<G>) => void> = {
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
        wash(
            c,
            poly([
                [10, 17.5],
                [20, 8.5],
                [30, 17.5],
                [30, 34.5],
                [10, 34.5],
            ]),
            "glow",
        );
        c.pen.linear(
            c.g,
            [
                [5.5, 19.5],
                [20, 6.5],
                [34.5, 19.5],
            ],
            "ruler",
            line(c),
        );
        c.pen.linear(
            c.g,
            [
                [9.5, 16.5],
                [9.5, 34.5],
                [30.5, 34.5],
                [30.5, 16.5],
            ],
            "ruler",
            line(c),
        );
        c.pen.path(
            c.g,
            `M16.5 34.5V26.5Q16.5 23 20 23Q23.5 23 23.5 26.5V34.5`,
            "ruler",
            null,
            line(c),
        );
        c.pen.linear(
            c.g,
            [
                [26, 11],
                [26, 7.5],
                [29.5, 7.5],
                [29.5, 14],
            ],
            "ruler",
            line(c, W * 0.85),
        );
    },
    journal: (c) => {
        wash(c, rounded(9.5, 5.5, 22, 29.5, 3), "sky");
        c.pen.path(c.g, rounded(9, 5, 22.5, 30, 3), "ruler", null, line(c));
        c.pen.line(c.g, 13.5, 5.5, 13.5, 34.5, "ruler", line(c, W * 0.8));
        const label = { fill: c.t.card, fillStyle: "solid" };
        c.pen.path(c.g, rounded(17, 11, 10.5, 7, 1.8), "ruler", label, line(c, W * 0.8));
    },
    map: (c) => {
        wash(
            c,
            poly([
                [15, 10],
                [25, 13.5],
                [25, 31],
                [15, 27.5],
            ]),
            "mint",
        );
        const edge: Pt[] = [
            [5.5, 13.5],
            [15, 9.5],
            [25, 13],
            [34.5, 9.5],
            [34.5, 27],
            [25, 30.5],
            [15, 27],
            [5.5, 30.5],
            [5.5, 13.5],
        ];
        c.pen.linear(c.g, edge, "ruler", line(c));
        c.pen.line(c.g, 15, 10, 15, 26.5, "ruler", line(c, W * 0.7));
        c.pen.line(c.g, 25, 13.5, 25, 30, "ruler", line(c, W * 0.7));
        const route = { ...line(c, W * 0.7), strokeLineDash: [2.4, 2.6] };
        c.pen.path(c.g, "M9 25Q14 19 19 21T30 16", "ruler", null, route);
        for (const s of [-1, 1]) {
            c.pen.line(
                c.g,
                30 - 2.4,
                16 + s * 2.4,
                30 + 2.4,
                16 - s * 2.4,
                "ruler",
                line(c, W * 0.8),
            );
        }
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
    about: "Home, journal, map, print, settings, back, sign out, add, help and sound, drawn as one set on a two-square box: one stroke weight, round ends and one marker under the pencil. Every control supplies its name, and `on` lays a disc of highlighter behind it for the page a child or a grown-up is on.",
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
