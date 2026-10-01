import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, soft } from "../lettering";

/**
 * The places in one made-up market town, each in its square of the map and there from the year it
 * was built until the year it went (none for still there). The dates are the town's own, invented
 * for the lessons, so a question about the town is proved from this list alone.
 */
export const TOWN: { name: string; col: number; row: number; from: number; to?: number }[] = [
    { name: "castle", col: 0, row: 0, from: 1100, to: 1600 },
    { name: "church", col: 1, row: 0, from: 1150 },
    { name: "station", col: 2, row: 0, from: 1848 },
    { name: "farm", col: 3, row: 0, from: 1400, to: 1970 },
    { name: "school", col: 0, row: 1, from: 1875 },
    { name: "market", col: 1, row: 1, from: 1250 },
    { name: "mill", col: 2, row: 1, from: 1300, to: 1960 },
    { name: "bridge", col: 3, row: 1, from: 1780 },
    { name: "park", col: 0, row: 2, from: 1920 },
    { name: "houses", col: 1, row: 2, from: 1890 },
    { name: "supermarket", col: 2, row: 2, from: 1985 },
    { name: "car park", col: 3, row: 2, from: 1995 },
];

/** Whether a place of the town stands in a given year. */
export const standsIn = (place: (typeof TOWN)[number], year: number): boolean =>
    place.from <= year && (place.to === undefined || year < place.to);

/** A square's name as the map writes it: a letter across, then a number down. */
export const squareOf = (place: (typeof TOWN)[number]): string =>
    `${"ABCD".charAt(place.col)}${place.row + 1}`;

interface TownMapParams {
    /** The year the map was drawn, which says what is on it. */
    year: number;
    town: string;
    /** 1 writes each place's name under its picture; 0 leaves the pictures to be read. */
    labels: number;
}

const CELL = 3.8;
const LEFT = 1.2;
const TOP = 2.6;

function place<G>(c: Ctx<G>, name: string, x: number, y: number, old: boolean): void {
    const { pen, g } = c,
        w = { strokeWidth: 1.4 },
        roof = pen.fill(old ? "tang" : "berry", "hachure", { hachureGap: 5 });
    switch (name) {
        case "castle":
            pen.rect(g, x - 1.1 * U, y - 1.2 * U, 2.2 * U, 1.6 * U, "pencil", pen.fill("card"), w);
            for (const dx of [-1.1, -0.35, 0.4])
                pen.rect(g, x + dx * U, y - 1.55 * U, 0.7 * U, 0.35 * U, "pencil", null, w);
            break;
        case "church":
            pen.rect(g, x - 0.9 * U, y - 0.7 * U, 1.8 * U, 1.1 * U, "pencil", pen.fill("card"), w);
            pen.polygon(
                g,
                [
                    [x - 0.35 * U, y - 0.7 * U],
                    [x, y - 1.8 * U],
                    [x + 0.35 * U, y - 0.7 * U],
                ],
                "pencil",
                roof,
                w,
            );
            break;
        case "station":
            pen.rect(g, x - 1.1 * U, y - 0.8 * U, 2.2 * U, 1.2 * U, "pencil", pen.fill("card"), w);
            pen.line(g, x - 1.7 * U, y + 0.7 * U, x + 1.7 * U, y + 0.7 * U, "ruler", {
                strokeWidth: 1.6,
            });
            for (let k = -3; k <= 3; k++)
                pen.line(g, x + k * 0.5 * U, y + 0.55 * U, x + k * 0.5 * U, y + 0.85 * U, "ruler", {
                    strokeWidth: 1,
                });
            break;
        case "farm":
            pen.polygon(
                g,
                [
                    [x - 1 * U, y + 0.4 * U],
                    [x - 1 * U, y - 0.5 * U],
                    [x, y - 1.3 * U],
                    [x + 1 * U, y - 0.5 * U],
                    [x + 1 * U, y + 0.4 * U],
                ],
                "pencil",
                pen.fill("berry"),
                w,
            );
            break;
        case "school":
            pen.rect(g, x - 1.1 * U, y - 0.8 * U, 2.2 * U, 1.2 * U, "pencil", pen.fill("card"), w);
            pen.circle(g, x, y - 1.2 * U, 0.6 * U, "pencil", pen.fill("glow"), { strokeWidth: 1 });
            break;
        case "market":
            for (const dx of [-0.7, 0.7])
                pen.line(g, x + dx * U, y - 0.6 * U, x + dx * U, y + 0.4 * U, "ruler", w);
            pen.polygon(
                g,
                [
                    [x - 1.1 * U, y - 0.6 * U],
                    [x, y - 1.3 * U],
                    [x + 1.1 * U, y - 0.6 * U],
                ],
                "pencil",
                pen.fill("mint", "hachure"),
                w,
            );
            break;
        case "mill":
            pen.rect(g, x - 0.9 * U, y - 0.9 * U, 1.4 * U, 1.3 * U, "pencil", pen.fill("card"), w);
            pen.circle(g, x + 0.9 * U, y - 0.1 * U, 1.2 * U, "pencil", null, w);
            break;
        case "bridge":
            pen.path(
                g,
                `M${x - 1.4 * U} ${y + 0.4 * U}Q${x} ${y - 1.2 * U} ${x + 1.4 * U} ${y + 0.4 * U}`,
                "pencil",
                null,
                { strokeWidth: 2.2 },
            );
            break;
        case "park":
            for (const [dx, dy] of [
                [-0.7, 0],
                [0.5, -0.4],
                [0.2, 0.4],
            ] as const) {
                pen.circle(
                    g,
                    x + dx * U,
                    y + dy * U - 0.3 * U,
                    0.9 * U,
                    "pencil",
                    pen.fill("mint", "solid"),
                    { strokeWidth: 1.1 },
                );
                pen.line(
                    g,
                    x + dx * U,
                    y + dy * U + 0.15 * U,
                    x + dx * U,
                    y + dy * U + 0.5 * U,
                    "pencil",
                    { strokeWidth: 1.2 },
                );
            }
            break;
        case "houses":
            for (const dx of [-0.9, 0, 0.9]) {
                pen.rect(
                    g,
                    x + (dx - 0.4) * U,
                    y - 0.5 * U,
                    0.8 * U,
                    0.9 * U,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.1 },
                );
                pen.polygon(
                    g,
                    [
                        [x + (dx - 0.45) * U, y - 0.5 * U],
                        [x + dx * U, y - 1 * U],
                        [x + (dx + 0.45) * U, y - 0.5 * U],
                    ],
                    "pencil",
                    roof,
                    { strokeWidth: 1.1 },
                );
            }
            break;
        case "supermarket":
            pen.rect(
                g,
                x - 1.3 * U,
                y - 0.9 * U,
                2.6 * U,
                1.3 * U,
                "ruler",
                pen.fill("sky", "solid"),
                w,
            );
            pen.rect(g, x - 0.4 * U, y - 0.4 * U, 0.8 * U, 0.8 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1,
            });
            break;
        default:
            pen.rect(g, x - 1.3 * U, y - 0.9 * U, 2.6 * U, 1.3 * U, "ruler", null, w);
            for (const dx of [-0.65, 0, 0.65])
                pen.line(g, x + dx * U, y - 0.9 * U, x + dx * U, y + 0.4 * U, "ruler", {
                    strokeWidth: 0.9,
                });
    }
}

const THEN: TownMapParams = { year: 1850, town: "Millbrook", labels: 1 };

export const townMap = defineDrawing<TownMapParams>({
    id: "townmap",
    family: "travel",
    title: "A town's map in a given year",
    group: "Structures",
    about: "A map of one small market town on a grid of squares lettered A to D across and numbered 1 to 3 down, drawn as it was in `year`: a castle, a church, a market, a mill on the river, a farm, and later a bridge, a railway station, a school, houses, a park, a supermarket and a car park, each there only from the year it was built until the year it went. Two maps of different years side by side show what changed, and `labels` names each place or leaves the pictures to be read.",
    params: THEN,
    settings: {
        year: { kind: "whole", min: 1000, max: 2100 },
        town: { kind: "text", most: 16 },
        labels: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Millbrook in 1850", params: THEN },
        { label: "Millbrook today", params: { year: 2026, town: "Millbrook", labels: 1 } },
        { label: "In 1500, unlabelled", params: { year: 1500, town: "Millbrook", labels: 0 } },
    ],
    box: () => ({ w: 17, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            year = Math.round(p.year),
            old = year < 1900;
        const x0 = LEFT * U,
            y0 = TOP * U,
            side = CELL * U;
        say(c, x0, 1.2 * U, `${p.town} in ${year}`, 14, "start");
        pen.rect(g, x0, y0, 4 * side, 3 * side, old ? "doodle" : "ruler", null, {
            strokeWidth: old ? 2.2 : 1.7,
        });
        // the river runs between the middle row and the bottom row, under the mill and the bridge
        pen.curve(
            g,
            [
                [x0, y0 + 2.05 * side],
                [x0 + 1.3 * side, y0 + 1.95 * side],
                [x0 + 2.6 * side, y0 + 2.12 * side],
                [x0 + 4 * side, y0 + 1.98 * side],
            ],
            "pencil",
            { strokeWidth: 5, stroke: c.t.sky },
        );
        for (let i = 1; i < 4; i++)
            pen.line(g, x0 + i * side, y0, x0 + i * side, y0 + 3 * side, "ruler", {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
        for (let j = 1; j < 3; j++)
            pen.line(g, x0, y0 + j * side, x0 + 4 * side, y0 + j * side, "ruler", {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
        for (let i = 0; i < 4; i++)
            num(c, x0 + (i + 0.5) * side, y0 - 0.25 * U, "ABCD".charAt(i), 13);
        for (let j = 0; j < 3; j++) num(c, x0 - 0.55 * U, y0 + (j + 0.55) * side, j + 1, 13);
        for (const t of TOWN) {
            const cx = x0 + (t.col + 0.5) * side,
                cy = y0 + (t.row + 0.5) * side;
            a[`square(${squareOf(t)})`] = [cx, cy - 1.4 * U, "up"];
            if (!standsIn(t, year)) continue;
            place(c, t.name, cx, cy - (Math.round(p.labels) === 1 ? 0.3 * U : 0), old);
            if (Math.round(p.labels) === 1) soft(c, cx, cy + 1.3 * U, t.name, 11);
        }
        return a;
    },
    describe: (p) =>
        `A map of the town of ${p.town} in ${Math.round(p.year)} on a lettered and numbered grid, with a river across it and the buildings that stood there that year.`,
});
