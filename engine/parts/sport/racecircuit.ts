import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch } from "../lettering";

/** One cell of a track grid, in squares. A car is drawn in one cell and still prints. */
export const CELL = 2;

/** What a character in a track row means. Everything but "." can be driven on. */
const OFF = ".";

export const raceCircuit = defineDrawing({
    id: "racecircuit",
    family: "sport",
    title: "Race circuit",
    group: "Structures",
    about: "A closed track on a numbered grid of cells, with a start line, a chequered finish band and the marker a lap has to pass. The kerb is drawn only where the track stops, so the shape of the corner is the shape of the ink, and the line of the turns taken is drawn over it.",
    params: {
        /** One string per row of cells: "#" track, "." off it, "S" the start, "F" the finish, "C" the lap marker. */
        track: ["SC#F", "#..#", "####"],
        /** The cells the car has landed on, oldest first, as [column, row] counting from one. */
        trail: [] as [number, number][],
    },
    settings: { track: { kind: "words", most: 12 }, trail: { kind: "fixed" } },
    takes: [
        {
            label: "The ring",
            params: {
                track: [
                    "######C######",
                    "######C######",
                    "##.........##",
                    "##.........##",
                    "##.........##",
                    "##.........##",
                    "#####FS######",
                    "#####FS######",
                ],
                trail: [],
            },
        },
        {
            label: "A lap part driven",
            params: {
                track: [
                    "######C######",
                    "######C######",
                    "##.........##",
                    "##.........##",
                    "##.........##",
                    "##.........##",
                    "#####FS######",
                    "#####FS######",
                ],
                trail: [
                    [7, 8],
                    [9, 8],
                    [12, 8],
                    [13, 6],
                ],
            },
        },
        {
            label: "The chicane",
            params: {
                track: [
                    "######C#####",
                    "######C#####",
                    "##......####",
                    "##......####",
                    "####......##",
                    "####......##",
                    "#####FS#####",
                ],
                trail: [],
            },
        },
    ],
    box: (p) => ({ w: (p.track[0]?.length ?? 1) * CELL + 3, h: p.track.length * CELL + 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            s = CELL * U;
        const rows = p.track.length,
            cols = p.track[0]?.length ?? 0;
        const x0 = 2 * U,
            y0 = 2 * U;
        const at = (col: number, row: number) => p.track[row]?.[col] ?? OFF;
        const on = (col: number, row: number) => at(col, row) !== OFF;
        for (let k = 0; k < cols; k++) num(c, x0 + k * s + s / 2, 1.5 * U, k + 1, 13);
        for (let r = 0; r < rows; r++) num(c, 1.4 * U, y0 + r * s + s / 2 + 5, r + 1, 13, "end");
        const said = new Set<string>();
        for (let r = 0; r < rows; r++)
            for (let k = 0; k < cols; k++) {
                const x = x0 + k * s,
                    y = y0 + r * s,
                    kind = at(k, r);
                a[`cell(${k + 1},${r + 1})`] = [x + s / 2, y, "up"];
                // The track is the clean paper and the ground is hatched, so where the track is and is not is
                // the difference between two inks rather than between two colours.
                if (kind === OFF) {
                    pen.rect(
                        g,
                        x,
                        y,
                        s,
                        s,
                        "pencil",
                        pen.fill("mint", "hachure", { hachureGap: 11, fillWeight: 0.9 }),
                        { stroke: "none" },
                    );
                    continue;
                }
                pen.rect(g, x, y, s, s, "ruler", pen.fill("card"), { strokeWidth: 0.9 });
                if (kind === "S") {
                    pen.rect(
                        g,
                        x,
                        y,
                        s,
                        s,
                        "ruler",
                        pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 1.1 }),
                        { strokeWidth: 0.9 },
                    );
                    // The word goes inside the cell, once for the band rather than once for each of its cells:
                    // above it there is either another cell or the row of numbers, and neither has room.
                    if (!said.has(kind)) {
                        patch(c, x + s / 2, y + s / 2 + 1, 34, 15);
                        cap(c, x + s / 2, y + s / 2 + 5, "start", 11);
                    }
                    a.start = [x + s / 2, y, "up"];
                } else if (kind === "C") {
                    for (let i = 0; i < 4; i++)
                        pen.line(g, x + 4, y + 5 + i * 10, x + s - 4, y + 5 + i * 10, "ruler", {
                            strokeWidth: 1,
                            strokeLineDash: [4, 5],
                        });
                    if (!said.has(kind)) {
                        patch(c, x + s / 2, y + s / 2 + 1, 30, 15);
                        cap(c, x + s / 2, y + s / 2 + 5, "lap", 11);
                    }
                    a.lap = [x + s / 2, y, "up"];
                } else if (kind === "F") {
                    // The same chequered band the lanes use, so a finish is a finish in black ink.
                    for (let i = 0; i < 4; i++)
                        for (let j = 0; j < 4; j++) {
                            if ((i + j) % 2) continue;
                            pen.rect(
                                g,
                                x + j * 10,
                                y + i * 10,
                                10,
                                10,
                                "ruler",
                                { fill: c.t.ink, fillStyle: "solid" },
                                { strokeWidth: 0.4 },
                            );
                        }
                    a.finish = [x + s / 2, y, "up"];
                }
                said.add(kind);
            }
        // The kerb: one heavy line wherever the track stops, drawn after the cells so it sits on top.
        for (let r = 0; r < rows; r++)
            for (let k = 0; k < cols; k++) {
                if (!on(k, r)) continue;
                const x = x0 + k * s,
                    y = y0 + r * s;
                if (!on(k, r - 1)) pen.line(g, x, y, x + s, y, "ruler", { strokeWidth: 2.6 });
                if (!on(k, r + 1))
                    pen.line(g, x, y + s, x + s, y + s, "ruler", { strokeWidth: 2.6 });
                if (!on(k - 1, r)) pen.line(g, x, y, x, y + s, "ruler", { strokeWidth: 2.6 });
                if (!on(k + 1, r))
                    pen.line(g, x + s, y, x + s, y + s, "ruler", { strokeWidth: 2.6 });
            }
        const mid = (t: [number, number]): [number, number] => [
            x0 + (t[0] - 1) * s + s / 2,
            y0 + (t[1] - 1) * s + s / 2,
        ];
        p.trail.forEach((t, i) => {
            const [cx, cy] = mid(t);
            if (i > 0) {
                const [px, py] = mid(p.trail[i - 1] ?? t);
                pen.line(g, px, py, cx, cy, "pencil", { strokeWidth: 1.8, stroke: c.t.pen });
            }
            pen.circle(
                g,
                cx,
                cy,
                7,
                "pencil",
                { fill: c.t.pen, fillStyle: "solid" },
                { strokeWidth: 1.2, stroke: c.t.pen },
            );
        });
        return a;
    },
    describe: (p) =>
        `A race track on a numbered grid of cells, a blue start band, a chequered finish and a dashed lap marker${p.trail.length > 0 ? ", and a pen trail drawn on it" : ""}.`,
});
