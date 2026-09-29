import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, say, soft, wide } from "../lettering";
import { wrapTo } from "../writing/lines";

type Layer = "near" | "middle" | "far";

/**
 * The works a lesson looks at, all in the public domain, with where each hangs and the frame each is
 * drawn in, in squares, in proportion to the work's own height and width in centimetres.
 */
export const WORKS = [
    {
        title: "Early Spring",
        known: "Guo Xi's Early Spring",
        artist: "Guo Xi",
        date: "1072",
        where: "National Palace Museum, Taipei",
        cm: [158.3, 108.1],
        frame: [11, 16],
        ruled: "",
        layers: { near: "rocks and pines", middle: "knolls and a hall", far: "the great peak" },
        areas: ["dark ink", "mist"],
    },
    {
        title: "Kirifuri Waterfall at Kurokami Mountain in Shimotsuke",
        known: "Hokusai's Kirifuri Waterfall",
        artist: "Katsushika Hokusai",
        date: "about 1832",
        where: "a print of it in the Metropolitan Museum of Art, New York",
        cm: [37.1, 26.2],
        frame: [12, 17],
        ruled: "",
        layers: { near: "three travellers", middle: "the waterfall", far: "the mountain top" },
        areas: ["blue and white water", "rock"],
    },
    {
        title: "The Fighting Temeraire",
        known: "Turner's The Fighting Temeraire",
        artist: "J. M. W. Turner",
        date: "shown 1839",
        where: "National Gallery, London",
        cm: [90.7, 121.6],
        frame: [20, 15],
        ruled: "horizon",
        layers: { near: "the tug", middle: "the old warship", far: "the setting sun" },
        areas: ["warm sunset", "cool blue sky"],
    },
    {
        title: "Morning in a Pine Forest",
        known: "Shishkin and Savitsky's Morning in a Pine Forest",
        artist: "Ivan Shishkin, bears by Konstantin Savitsky",
        date: "1889",
        where: "Tretyakov Gallery, Moscow",
        cm: [139, 213],
        frame: [20, 13],
        ruled: "",
        layers: { near: "bears on a fallen pine", middle: "trunks", far: "forest" },
        areas: ["morning light", "blue mist"],
    },
    {
        title: "March",
        known: "Levitan's March",
        artist: "Isaac Levitan",
        date: "1895",
        where: "Tretyakov Gallery, Moscow",
        cm: [60, 75],
        frame: [20, 16],
        ruled: "far edge of the field",
        layers: {
            near: "snow",
            middle: "the horse and the house",
            far: "dark pines",
        },
        areas: ["yellow sunlit wall", "blue shadows"],
    },
] as const;

const LAYERS: Layer[] = ["near", "middle", "far"];
const which = (work: number) =>
    WORKS[Math.max(0, Math.min(WORKS.length - 1, Math.round(work)))] ?? WORKS[0];

/** What the study draws on: its frame's corner, in units, and a point given in the frame's squares. */
interface Frame<G> {
    c: Ctx<G>;
    x: number;
    y: number;
}
const at = <G>(f: Frame<G>, x: number, y: number): string => `${f.x + x * U} ${f.y + y * U}`;
/** A path written in the frame's squares: `M`, `L`, `Q` and `C` followed by pairs. */
const path = <G>(f: Frame<G>, parts: readonly (string | readonly [number, number])[]): string =>
    parts.map((p) => (typeof p === "string" ? p : at(f, p[0], p[1]))).join(" ");

function line<G>(
    f: Frame<G>,
    parts: readonly (string | readonly [number, number])[],
    w = 1.5,
    fill: TokenName | null = null,
): void {
    const { pen, g } = f.c;
    pen.path(
        g,
        path(f, parts),
        "pencil",
        fill === "card"
            ? pen.fill("card")
            : fill
              ? pen.fill(fill, "hachure", {
                    hachureGap: f.c.paper ? (w > 0 ? 10 : 13) : w > 0 ? 7 : 8,
                    fillWeight: 0.8,
                })
              : null,
        w > 0
            ? {
                  strokeWidth: w,
                  roughness: 0.6,
                  bowing: 0.8,
                  disableMultiStroke: true,
                  preserveVertices: true,
              }
            : { stroke: "none" },
    );
}

/** A shape filled with paper and then hatched, so what is behind it does not show through. */
function solidShape<G>(
    f: Frame<G>,
    parts: readonly (string | readonly [number, number])[],
    w: number,
    fill: TokenName,
): void {
    line(f, parts, 0, "card");
    line(f, parts, w, fill);
}

/** A pine seen from the side: a trunk and three flat tiers of needles. */
function pine<G>(f: Frame<G>, x: number, base: number, h: number): void {
    line(f, ["M", [x, base], "L", [x, base - h]], 1.4);
    for (let k = 0; k < 3; k++) {
        const y = base - h + 0.2 + k * (h / 4),
            w = 0.4 + k * 0.3;
        line(f, ["M", [x - w, y + 0.3], "Q", [x, y - 0.15], [x + w, y + 0.3]], 1.2);
    }
}

function earlySpring<G>(f: Frame<G>): void {
    // the great peak climbing in lumps to the top, with lower peaks at each side
    solidShape(
        f,
        [
            "M",
            [2, 7.4],
            "C",
            [2.2, 6],
            [3.4, 5.6],
            [3.2, 4.4],
            "C",
            [3, 3.2],
            [4.4, 2.8],
            [4.4, 1.8],
            "C",
            [4.6, 0.8],
            [6.4, 0.7],
            [6.6, 1.6],
            "C",
            [7, 2.6],
            [7.8, 2.8],
            [7.6, 3.8],
            "C",
            [7.4, 5],
            [8.8, 5.6],
            [9, 7.4],
            "Z",
        ],
        1.8,
        "ink-soft",
    );
    line(f, ["M", [0.3, 8], "Q", [1, 5.4], [2.6, 5.8]], 1.5);
    line(f, ["M", [10.7, 7.4], "Q", [10, 5], [8.4, 5.4]], 1.5);
    // threads of a waterfall falling from a cleft in the peak
    line(f, ["M", [8.2, 6.2], "L", [8.3, 8.6]], 1.1);
    line(f, ["M", [8.55, 6.4], "L", [8.6, 8.4]], 1.1);
    // the middle ground: knolls standing out of the mist, and a hall among them on the right
    line(f, ["M", [0.6, 10.8], "Q", [2.2, 8.6], [4, 10.4]], 1.5);
    line(f, ["M", [6.8, 10.6], "Q", [8.6, 9], [10.4, 10.4]], 1.5);
    solidShape(
        f,
        ["M", [8.4, 9.7], "L", [8.4, 9.1], "L", [8.9, 8.6], "L", [9.4, 9.1], "L", [9.4, 9.7], "Z"],
        1.2,
        "ink-soft",
    );
    // the near boulder at the bottom, with its gnarled pines
    pine(f, 4.4, 12.6, 2.4);
    pine(f, 6.8, 12.6, 2);
    solidShape(
        f,
        [
            "M",
            [2.2, 15.7],
            "C",
            [2.4, 13.6],
            [4.2, 12.2],
            [5.6, 12.4],
            "C",
            [7.4, 12.2],
            [8.8, 13.8],
            [9, 15.7],
            "Z",
        ],
        1.8,
        "ink-soft",
    );
    // water at the foot, and a small boat on it
    line(f, ["M", [0.4, 15.2], "L", [2, 15.2]], 1);
    line(f, ["M", [0.6, 14.7], "Q", [1.2, 15.1], [1.8, 14.7]], 1.3);
}

function kirifuri<G>(f: Frame<G>): void {
    // the falls: long streams from the notch at the top, spreading into fingers at the foot
    line(f, ["M", [4.6, 1.9], "L", [7.4, 1.9], "L", [8.6, 13.6], "L", [2.4, 13.6], "Z"], 0, "sky");
    for (let k = 0; k < 6; k++) {
        const x0 = 4.8 + k * 0.48,
            x1 = 2.8 + k * 1.1;
        line(f, ["M", [x0, 1.9], "C", [x0, 7], [x1 - 0.3, 10], [x1, 13.4]], k % 2 ? 1.1 : 1.7);
    }
    // the rock walls either side of the falls, drawn over the water's edges
    solidShape(
        f,
        [
            "M",
            [0.3, 16.7],
            "L",
            [0.3, 9],
            "Q",
            [1, 4],
            [4.6, 1.6],
            "L",
            [4.7, 2],
            "C",
            [3.4, 7],
            [2.6, 10],
            [2.2, 13.8],
            "L",
            [0.3, 16.7],
            "Z",
        ],
        1.8,
        "ink-soft",
    );
    solidShape(
        f,
        [
            "M",
            [11.7, 16.7],
            "L",
            [11.7, 8],
            "Q",
            [10.6, 3.4],
            [7.2, 1.6],
            "L",
            [7.3, 2],
            "C",
            [8.2, 7],
            [8.6, 10],
            [8.8, 13.8],
            "L",
            [8.8, 16.7],
            "Z",
        ],
        1.8,
        "ink-soft",
    );
    // pines along the mountain top
    for (const x of [3.8, 5.2, 6.6, 8]) pine(f, x, 1.8, 1.2);
    // the ledge at the foot and three travellers looking up at the falls
    solidShape(
        f,
        ["M", [0.3, 15], "Q", [3, 14.2], [6.8, 15.2], "L", [6.8, 16.7], "L", [0.3, 16.7], "Z"],
        1.6,
        "card",
    );
    for (const x of [2, 3.2, 4.4]) {
        const { pen, g } = f.c;
        solidShape(f, ["M", [x, 13.6], "L", [x - 0.45, 15], "L", [x + 0.45, 15], "Z"], 1.3, "card");
        pen.circle(g, f.x + x * U, f.y + 13.3 * U, 0.5 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.3,
        });
    }
}

function temeraire<G>(f: Frame<G>): void {
    const { pen, g } = f.c,
        hy = 10;
    line(
        f,
        [
            "M",
            [11.5, 0.3],
            "L",
            [19.7, 0.3],
            "L",
            [19.7, hy],
            "L",
            [11.5, hy],
            "Q",
            [12.5, 5],
            [11.5, 0.3],
            "Z",
        ],
        0,
        "tang",
    );
    line(f, ["M", [0.3, 0.3], "L", [7, 0.3], "Q", [5, 4], [0.3, 6], "Z"], 0, "sky");
    // the sun on the horizon at the right, as far from the frame as the warship's mainmast, and its rays
    pen.circle(g, f.x + 15.4 * U, f.y + (hy - 0.4) * U, 1.2 * U, "ruler", pen.fill("card"), {
        strokeWidth: 0,
    });
    pen.circle(g, f.x + 15.4 * U, f.y + (hy - 0.4) * U, 1.2 * U, "pencil", pen.fill("glow"), {
        strokeWidth: 1.5,
    });
    for (const [dx, dy] of [
        [-1.4, -1.4],
        [0, -2],
        [1.4, -1.4],
    ] as const)
        line(
            f,
            ["M", [15.4 + dx * 0.55, hy - 0.4 + dy * 0.55], "L", [15.4 + dx, hy - 0.4 + dy]],
            1.1,
        );
    // a sliver of moon behind the warship
    line(f, ["M", [2.2, 1.6], "Q", [3.2, 2.2], [2.4, 3.2], "Q", [2.9, 2.3], [2.2, 1.6], "Z"], 1.2);
    // the old warship, pale, with three masts and furled yards
    for (const [x, top] of [
        [3.4, 3.8],
        [5.4, 2.6],
        [7.6, 3.6],
    ] as const) {
        line(f, ["M", [x, 9.4], "L", [x, top]], 1.4);
        for (let k = 0; k < 3; k++) {
            const y = top + 0.8 + k * 1.6,
                w = 0.7 + k * 0.25;
            line(f, ["M", [x - w, y], "L", [x + w, y]], 1.1);
        }
    }
    solidShape(
        f,
        ["M", [2.2, 9.4], "L", [9.6, 9.4], "L", [9.2, 10.8], "L", [2.8, 10.8], "Z"],
        1.6,
        "card",
    );
    // the tug in front of her, dark, with its funnel and its smoke
    line(f, ["M", [9.9, 8], "Q", [9, 6.8], [9.8, 6], "Q", [10.6, 5], [9.6, 4.2]], 1.2);
    solidShape(
        f,
        ["M", [9.6, 10.4], "L", [9.6, 8.2], "L", [10.2, 8.2], "L", [10.2, 10.4], "Z"],
        1.6,
        "ink-soft",
    );
    solidShape(
        f,
        ["M", [7.4, 10.4], "L", [12, 10.4], "L", [11.6, 11.6], "L", [7.8, 11.6], "Z"],
        1.8,
        "ink-soft",
    );
    // the river, and the sun's light on it
    for (const [x0, x1, y] of [
        [13.6, 17, 11.4],
        [14.2, 16.4, 12.6],
        [2, 6, 12.2],
        [1, 4, 13.6],
    ] as const)
        line(f, ["M", [x0, y], "L", [x1, y]], 1);
}

function morning<G>(f: Frame<G>): void {
    // mist behind on the left, light breaking in at the top right, and the standing trunks
    line(f, ["M", [0.3, 0.3], "L", [9, 0.3], "Q", [7, 5], [0.3, 7], "Z"], 0, "sky");
    line(
        f,
        ["M", [12, 0.3], "L", [19.7, 0.3], "L", [19.7, 4], "Q", [15, 3], [12, 0.3], "Z"],
        0,
        "glow",
    );
    for (const [x, w] of [
        [2.4, 0.6],
        [5.4, 0.9],
        [12.6, 0.5],
        [16.4, 1.1],
        [18.6, 0.5],
    ] as const)
        solidShape(
            f,
            ["M", [x, 12.7], "L", [x, 0.3], "L", [x + w, 0.3], "L", [x + w, 12.7], "Z"],
            1.5,
            "card",
        );
    // a pine snapped off: its jagged stump, and its trunk fallen across the front
    solidShape(
        f,
        [
            "M",
            [6.3, 12.7],
            "L",
            [6.3, 8.2],
            "L",
            [6.7, 7.4],
            "L",
            [6.9, 8.4],
            "L",
            [7.3, 7.8],
            "L",
            [7.4, 12.7],
            "Z",
        ],
        1.5,
        "tang",
    );
    solidShape(
        f,
        ["M", [7, 8.8], "L", [18, 11.2], "L", [18.2, 12.3], "L", [7.2, 9.9], "Z"],
        1.8,
        "tang",
    );
    // a mother bear on the ground and three cubs on the fallen trunk
    const bear = (x: number, y: number, s: number) => {
        const { pen, g } = f.c,
            P = (dx: number, dy: number): [number, number] => [x + dx * s, y + dy * s];
        for (const dx of [-0.75, -0.35, 0.35, 0.7])
            solidShape(
                f,
                [
                    "M",
                    P(dx - 0.14, -0.4),
                    "L",
                    P(dx - 0.14, 0),
                    "L",
                    P(dx + 0.16, 0),
                    "L",
                    P(dx + 0.16, -0.4),
                    "Z",
                ],
                1.2,
                "ink-soft",
            );
        solidShape(
            f,
            [
                "M",
                P(-1, -0.4),
                "Q",
                P(-1.05, -1.15),
                P(-0.1, -1.1),
                "Q",
                P(0.8, -1.1),
                P(1, -0.55),
                "Q",
                P(1, -0.25),
                P(0.6, -0.25),
                "L",
                P(-0.7, -0.25),
                "Q",
                P(-1, -0.25),
                P(-1, -0.4),
                "Z",
            ],
            1.5,
            "ink-soft",
        );
        const [hx, hy] = P(1.1, -1.2);
        pen.circle(g, f.x + hx * U, f.y + hy * U, 0.34 * s * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.2,
        });
        solidShape(
            f,
            [
                "M",
                P(0.8, -0.8),
                "Q",
                P(0.85, -1.25),
                P(1.2, -1.2),
                "Q",
                P(1.45, -1.15),
                P(1.5, -0.85),
                "L",
                P(1.8, -0.7),
                "Q",
                P(1.75, -0.5),
                P(1.5, -0.5),
                "Q",
                P(0.85, -0.45),
                P(0.8, -0.8),
                "Z",
            ],
            1.3,
            "card",
        );
        pen.circle(
            g,
            f.x + (x + 1.3 * s) * U,
            f.y + (y - 0.9 * s) * U,
            2.4,
            "ruler",
            pen.fill("ink"),
            { strokeWidth: 0.9 },
        );
    };
    bear(3.6, 12.5, 1.3);
    bear(9.4, 9.2, 0.7);
    bear(12.2, 9.85, 0.7);
    bear(15, 10.45, 0.7);
}

function march<G>(f: Frame<G>): void {
    const edge = 8;
    line(f, ["M", [0.3, 0.3], "L", [19.7, 0.3], "L", [19.7, 5.6], "L", [0.3, 5.6], "Z"], 0, "sky");
    // the dark pines along the far edge of the field, which halves the picture
    const pts: (string | [number, number])[] = ["M", [0.3, edge]];
    for (let x = 0.3, k = 0; x < 13.6; x += 0.7, k++)
        pts.push("L", [x + 0.35, 5.2 + ((k * 7) % 5) * 0.28], "L", [x + 0.7, 6.9]);
    pts.push("L", [13.6, edge], "Z");
    solidShape(f, pts, 1.3, "mint");
    // the sunlit trees in front, reaching up with bare branches
    for (const x of [4.4, 6, 7.4]) {
        line(f, ["M", [x, 12.4], "L", [x + 0.2, 1]], 1.6);
        line(
            f,
            ["M", [x + 0.1, 5], "L", [x - 1, 2.6], "M", [x + 0.15, 3.6], "L", [x + 1.2, 1.6]],
            1.1,
        );
    }
    // the house on the right: its yellow wall in the sun, a window and the porch
    solidShape(
        f,
        ["M", [14, 12], "L", [14, 3.4], "L", [19.7, 2], "L", [19.7, 12], "Z"],
        1.8,
        "glow",
    );
    solidShape(
        f,
        ["M", [16.4, 5], "L", [17.8, 4.8], "L", [17.8, 6.6], "L", [16.4, 6.8], "Z"],
        1.2,
        "card",
    );
    line(
        f,
        [
            "M",
            [12.6, 9],
            "L",
            [15.6, 8.4],
            "M",
            [13, 9],
            "L",
            [13, 12.2],
            "M",
            [15.2, 8.5],
            "L",
            [15.2, 12.2],
        ],
        1.4,
    );
    // the sledge, and the horse in front of it standing in the road, facing the porch
    solidShape(
        f,
        ["M", [7.6, 11.2], "L", [9.4, 11.2], "L", [9.8, 12.2], "L", [7.4, 12.2], "Z"],
        1.4,
        "card",
    );
    line(f, ["M", [9.4, 11.4], "L", [10.2, 10.8]], 1.2);
    for (const x of [10.2, 10.6, 11.8, 12.2]) line(f, ["M", [x, 10.6], "L", [x, 12.2]], 1.5);
    line(f, ["M", [9.8, 10], "Q", [9.3, 10.5], [9.5, 11.3]], 1.4);
    solidShape(
        f,
        [
            "M",
            [9.8, 10.2],
            "Q",
            [9.8, 9.4],
            [10.8, 9.4],
            "L",
            [12, 9.4],
            "L",
            [12.6, 8.3],
            "L",
            [13.1, 8.2],
            "L",
            [13.8, 9],
            "Q",
            [13.9, 9.3],
            [13.6, 9.3],
            "L",
            [13.1, 8.9],
            "L",
            [12.8, 9.8],
            "Q",
            [12.6, 10.8],
            [11.8, 10.8],
            "L",
            [10.4, 10.8],
            "Q",
            [9.8, 10.8],
            [9.8, 10.2],
            "Z",
        ],
        1.6,
        "ink-soft",
    );
    line(f, ["M", [12.8, 8.25], "L", [12.9, 7.8], "L", [13.1, 8.2]], 1.2);
    // snow in front, crossed by the trees' blue shadows
    for (const [x0, y0, x1, y1] of [
        [0.8, 15.6, 4.2, 12.6],
        [3, 15.8, 5.8, 12.8],
        [6, 15.8, 7.2, 12.8],
    ] as const)
        line(
            f,
            ["M", [x0, y0], "L", [x1, y1], "L", [x1 + 0.5, y1], "L", [x0 + 0.9, y0], "Z"],
            1,
            "sky",
        );
}

const DRAW = [earlySpring, kirifuri, temeraire, morning, march] as const;

/** Where each layer's name and each colour area's name sit in its frame, in squares. */
const PLACES: readonly {
    layers: Record<Layer, [number, number]>;
    areas: [[number, number], [number, number]];
    ruled: number;
}[] = [
    {
        layers: { near: [5.6, 13.9], middle: [5.4, 11.6], far: [5.6, 4.4] },
        areas: [
            [5.6, 15.3],
            [5.5, 8.2],
        ],
        ruled: 0,
    },
    {
        layers: { near: [3.4, 16.2], middle: [5.4, 6.4], far: [8.8, 3.2] },
        areas: [
            [5.4, 10.4],
            [10.4, 12.4],
        ],
        ruled: 0,
    },
    {
        layers: { near: [9.8, 12.9], middle: [5, 8.4], far: [16.4, 7.2] },
        areas: [
            [16, 2.2],
            [3.6, 5.2],
        ],
        ruled: 10,
    },
    {
        layers: { near: [13.4, 12.9], middle: [14.4, 6], far: [3.8, 3.2] },
        areas: [
            [16, 1.6],
            [4, 5.4],
        ],
        ruled: 0,
    },
    {
        layers: { near: [15.6, 14.4], middle: [11.2, 7.3], far: [3, 6.9] },
        areas: [
            [16.9, 10.4],
            [4, 14.8],
        ],
        ruled: 8,
    },
];

const NOWHERE: (typeof PLACES)[number] = {
    layers: { near: [1, 1], middle: [1, 1], far: [1, 1] },
    areas: [
        [1, 1],
        [1, 1],
    ],
    ruled: 0,
};

/** A name on the study, on a patch of paper so no line or hatching crosses it, on screen as on paper. */
function label<G>(c: Ctx<G>, x: number, y: number, s: string): void {
    const w = wide(s, 13) + 8;
    plain(c, { kind: "rect", x: x - w / 2, y: y - 12, w, h: 16, r: 3, fill: c.t.card });
    say(c, x, y, s, 13);
}

interface StudiesParams {
    /** 0 Guo Xi, 1 Hokusai, 2 Turner, 3 Shishkin, 4 Levitan. */
    work: number;
    /** 0 the lines alone, 1 the layers and colour areas named, 2 lettered A to E for a question. */
    names: number;
    /** 1 writes the title, the artist, the date and where it hangs under the study. */
    card: number;
}

const CAPTION = 13;
const cardLines = (p: StudiesParams): string[][] => {
    const w = which(p.work),
        max = (w.frame[0] + 1) * U;
    return Math.round(p.card) === 1
        ? [
              wrapTo(w.title, max, 15),
              wrapTo(`${w.artist}, ${w.date}`, max, CAPTION),
              wrapTo(w.where, max, CAPTION),
          ]
        : [];
};

export const studies = defineDrawing<StudiesParams>({
    id: "studies",
    family: "art",
    title: "Studies after landscapes",
    group: "Structures",
    about: "A line study on squared paper after a landscape in the public domain, one take for each work (`work`: 0 Guo Xi's Early Spring, 1072; 1 Hokusai's Kirifuri Waterfall, about 1832; 2 Turner's The Fighting Temeraire, shown 1839; 3 Shishkin and Savitsky's Morning in a Pine Forest, 1889; 4 Levitan's March, 1895), drawn in a frame in the proportions of the work. `names` 1 names its near, middle and far layers and two colour areas, and rules its horizon, or the far edge of a field that halves the picture, where one shows; 2 letters the same places A to E for a question. `card` writes the title, the artist, the date and where it hangs, so a family can find the painting itself.",
    params: { work: 0, names: 1, card: 1 },
    settings: {
        work: { kind: "whole", min: 0, max: 4 },
        names: { kind: "whole", min: 0, max: 2 },
        card: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Guo Xi, Early Spring", params: { work: 0, names: 1, card: 1 } },
        { label: "Hokusai, Kirifuri Waterfall", params: { work: 1, names: 1, card: 1 } },
        { label: "Turner, The Fighting Temeraire", params: { work: 2, names: 1, card: 1 } },
        {
            label: "Shishkin and Savitsky, Morning in a Pine Forest",
            params: { work: 3, names: 1, card: 1 },
        },
        { label: "Levitan, March", params: { work: 4, names: 1, card: 1 } },
        { label: "The Temeraire lettered, no card", params: { work: 2, names: 2, card: 0 } },
        { label: "Early Spring, the lines alone", params: { work: 0, names: 0, card: 1 } },
    ],
    box: (p) => {
        const w = which(p.work),
            lines = cardLines(p).flat().length;
        return { w: w.frame[0] + 2, h: w.frame[1] + 2 + Math.ceil(lines * 0.95) };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            i = Math.max(0, Math.min(WORKS.length - 1, Math.round(p.work))),
            w = which(i),
            [fw, fh] = w.frame,
            f: Frame<typeof g> = { c, x: U, y: U },
            place = PLACES[i] ?? NOWHERE,
            names = Math.round(p.names);
        pen.rect(g, U, U, fw * U, fh * U, "ruler", null, { strokeWidth: 2.4 });
        (DRAW[i] ?? earlySpring)(f);
        if (names > 0 && w.ruled) {
            const y = U + place.ruled * U;
            pen.line(g, U, y, (fw + 1) * U, y, "ruler", {
                strokeWidth: 1.4,
                stroke: c.t.pen,
                strokeLineDash: [8, 5],
            });
            // the horizon's name sits above it at the right, clear of the ships; the field's edge under it at the left, on the snow
            if (names === 1)
                if (w.ruled === "horizon")
                    cap(c, (fw + 0.8) * U, y - 5, w.ruled, 11, "end", c.t.pen);
                else cap(c, 1.2 * U, y + 15, w.ruled, 11, "start", c.t.pen);
            a.ruled = [U, y, "left"];
        }
        const spots: [string, [number, number]][] = [
            ...LAYERS.map((l): [string, [number, number]] => [w.layers[l], place.layers[l]]),
            ...w.areas.map((name, k): [string, [number, number]] => [
                name,
                place.areas[k] ?? [1, 1],
            ]),
        ];
        spots.forEach(([name, [x, y]], k) => {
            const px = U + x * U,
                py = U + y * U;
            if (names === 1) label(c, px, py, name);
            else if (names === 2) {
                pen.circle(g, px, py - 5, 1.2 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.6,
                    stroke: c.t.pen,
                });
                say(c, px, py + 1, "ABCDE".charAt(k), 17, "middle", c.t.pen);
            }
            a[`spot(${k})`] = [px, py, "up"];
        });
        let y = (fh + 2.2) * U;
        cardLines(p).forEach((block, k) =>
            block.forEach((s) => {
                if (k === 0) say(c, U, y, s, 15, "start");
                else soft(c, U, y, s, CAPTION, "start");
                y += 0.95 * U;
            }),
        );
        a.frame = [U + (fw * U) / 2, U, "up"];
        return a;
    },
    describe: (p) => {
        const w = which(p.work);
        return `A line study on squared paper after ${w.known}, with ${w.layers.near} near, ${w.layers.middle} in the middle and ${w.layers.far} far.`;
    },
});
