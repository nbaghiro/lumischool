import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, soft } from "../lettering";

/**
 * Each pen's ink and the colours it comes apart into, each at how many centimetres above the pencil
 * line it stops. Two blacks share their blue at 7 and differ in the rest, so one line tells them apart.
 */
export const INKS = {
    black1: {
        dot: "ink",
        bands: [
            ["glow", 2],
            ["berry", 4],
            ["sky", 7],
        ],
    },
    black2: {
        dot: "ink",
        bands: [
            ["tang", 5],
            ["sky", 7],
        ],
    },
    black3: {
        dot: "ink",
        bands: [
            ["berry", 4],
            ["mint", 6],
            ["sky", 8],
        ],
    },
    brown: {
        dot: "tang",
        bands: [
            ["tang", 3],
            ["berry", 5],
        ],
    },
    green: {
        dot: "mint",
        bands: [
            ["glow", 3],
            ["sky", 6],
        ],
    },
} as const satisfies Record<
    string,
    { dot: Marker | "ink"; bands: readonly (readonly [Marker, number])[] }
>;
type Ink = keyof typeof INKS;
const INK_NAMES = Object.keys(INKS) as Ink[];
const isInk = (s: string): s is Ink => s in INKS;

/** One centimetre up the strip. The picture is smaller than the real strip. */
const CM = 1.1 * U;
const START = 12 * U;
/** How far the water climbs by the time a strip is finished, in centimetres. */
const FRONT = 9;

export const chromatography = defineDrawing({
    id: "chromatography",
    family: "science",
    title: "Colours coming apart",
    group: "Structures",
    about: "Paper strips hanging from a stick into a beaker of water, each with a pencil line near its foot where a pen drew a dot. With `run` at 0 the strips have just been dipped and each ink is still a dot on the line; at 1 the water has climbed to the dashed line and carried each ink up as the colours it is made of. The pens and their bands, in centimetres above the line: black1 yellow at 2, pink at 4 and blue at 7; black2 orange at 5 and blue at 7; black3 pink at 4, green at 6 and blue at 8; brown orange at 3 and pink at 5; green yellow at 3 and blue at 6. `labels` letters the strips, `beaker` at 0 lays them out of the water, and `ruler` stands a ruler in centimetres beside them, its zero on the pencil line. No pen's name is written on the picture.",
    params: {
        inks: ["black1", "black2", "black3"],
        labels: ["A", "B", "C"],
        run: 1,
        beaker: 1,
        ruler: 0,
    },
    settings: {
        inks: { kind: "words", most: 4, of: INK_NAMES },
        labels: { kind: "words", most: 4, of: ["A", "B", "C", "D"] },
        run: { kind: "whole", min: 0, max: 1 },
        beaker: { kind: "whole", min: 0, max: 1 },
        ruler: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Three blacks",
            params: {
                inks: ["black1", "black2", "black3"],
                labels: ["A", "B", "C"],
                run: 1,
                beaker: 1,
                ruler: 0,
            },
        },
        {
            label: "Just dipped",
            params: {
                inks: ["black1", "brown", "green"],
                labels: ["A", "B", "C"],
                run: 0,
                beaker: 1,
                ruler: 0,
            },
        },
        {
            label: "Four strips with a ruler",
            params: {
                inks: ["green", "black2", "brown", "black1"],
                labels: ["A", "B", "C", "D"],
                run: 1,
                beaker: 0,
                ruler: 1,
            },
        },
        {
            label: "One strip",
            params: { inks: ["black3"], labels: [], run: 1, beaker: 1, ruler: 1 },
        },
    ],
    box: (p) => ({
        w: Math.max(1, Math.min(4, p.inks.length)) * 3 + 2 + (p.ruler > 0 ? 3 : 0),
        h: 16,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            list = p.inks.slice(0, 4).filter(isInk),
            n = Math.max(1, list.length),
            right = (n * 3 + 1.5) * U,
            water = 12.8 * U,
            done = p.run > 0,
            front = START - FRONT * CM;
        if (p.beaker > 0) {
            pen.rect(
                g,
                0.6 * U,
                water,
                right - 0.7 * U,
                1.8 * U,
                "ruler",
                pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.6 }),
                {
                    strokeWidth: 0,
                },
            );
        }
        // the stick the strips hang from
        pen.line(g, 0.2 * U, 1 * U, right + 0.3 * U, 1 * U, "pencil", { strokeWidth: 4 });
        list.forEach((ink, i) => {
            const x = (1 + i * 3) * U,
                w = 1.8 * U,
                cx = x + w / 2,
                foot = p.beaker > 0 ? 13.4 * U : 12.9 * U;
            pen.rect(g, x, 1.3 * U, w, foot - 1.3 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.5,
            });
            pen.rect(
                g,
                cx - 0.35 * U,
                0.7 * U,
                0.7 * U,
                0.9 * U,
                "ruler",
                pen.fill("ink-soft", "solid"),
                { strokeWidth: 1.2 },
            );
            pen.line(g, x + 0.1 * U, START, x + w - 0.1 * U, START, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
            const { dot, bands } = INKS[ink];
            const dotFill =
                dot === "ink" ? { fill: c.t.ink, fillStyle: "solid" } : pen.fill(dot, "solid");
            if (done) {
                pen.path(
                    g,
                    `M${x + 0.15 * U} ${front}q${0.4 * U} ${-0.2 * U} ${0.8 * U} 0t${0.75 * U} 0`,
                    "pencil",
                    null,
                    {
                        strokeWidth: 1,
                        stroke: c.t.sky,
                        strokeLineDash: [4, 3],
                    },
                );
                pen.circle(
                    g,
                    cx,
                    START,
                    0.3 * U,
                    "ruler",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                    { strokeWidth: 0.6 },
                );
                for (const [colour, cm] of bands) {
                    pen.ellipse(
                        g,
                        cx,
                        START - cm * CM,
                        1.4 * U,
                        0.7 * U,
                        "ruler",
                        pen.fill(colour, "hachure", { hachureGap: 2.5 }),
                        {
                            strokeWidth: 1.1,
                        },
                    );
                }
            } else {
                pen.circle(g, cx, START, 0.55 * U, "ruler", dotFill, { strokeWidth: 1 });
            }
            const label = p.labels[i];
            if (label) say(c, cx, 15.4 * U, label, 16);
            a[`strip(${i})`] = [cx, 1.3 * U, "up"];
        });
        if (p.beaker > 0) {
            pen.path(
                g,
                `M${0.3 * U} ${4.6 * U}H${0.6 * U}V${14.4 * U}H${right}V${4.6 * U}H${right + 0.3 * U}`,
                "ruler",
                null,
                { strokeWidth: 2.2 },
            );
            pen.line(g, 0.6 * U, water, right, water, "ruler", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
        }
        if (p.ruler > 0) {
            const rx = right + 0.9 * U,
                top = START - FRONT * CM - 0.4 * U;
            pen.rect(g, rx, top, 1.6 * U, START - top + 0.4 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.5,
            });
            for (let k = 0; k <= 2 * FRONT; k++) {
                const y = START - (k / 2) * CM,
                    whole = k % 2 === 0;
                pen.line(g, rx, y, rx + (whole ? 0.55 : 0.3) * U, y, "ruler", {
                    strokeWidth: whole ? 1.2 : 0.8,
                });
                if (whole) num(c, rx + 1.15 * U, y + 4, k / 2, 11);
            }
            soft(c, rx + 0.8 * U, START + 1.3 * U, "cm", 12);
            a.ruler = [rx + 0.8 * U, top, "up"];
        }
        a.start = [0.6 * U, START, "left"];
        a.front = [0.6 * U, front, "left"];
        return a;
    },
    describe: (p) =>
        `Paper strips hanging from a stick${p.beaker > 0 ? " into a beaker of water" : ""}, a pencil line across each near its foot${p.run > 0 ? " and bands of colour above it" : " with a dot of ink on it"}.`,
    reads: true,
});
