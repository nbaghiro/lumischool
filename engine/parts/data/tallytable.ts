import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, sayOn } from "../lettering";

/** Four uprights and a stroke across, in a cell of its own: the tally column of a frequency table. */
function tally<G>(c: Ctx<G>, x: number, y: number, count: number): void {
    const { pen, g } = c,
        fives = Math.floor(count / 5),
        rest = count % 5;
    const up = (px: number) => pen.line(g, px, y - 13, px, y + 13, "pencil", { strokeWidth: 2.2 });
    for (let f = 0; f < fives; f++) {
        const x0 = x + f * 2.6 * U;
        for (let i = 0; i < 4; i++) up(x0 + i * 11);
        pen.line(g, x0 - 4, y + 12, x0 + 37, y - 12, "pencil", { strokeWidth: 2.2 });
    }
    for (let i = 0; i < rest; i++) up(x + fives * 2.6 * U + i * 11);
}

interface Row {
    label: string;
    count: number;
}

export const tallyTable = defineDrawing({
    id: "tallytable",
    family: "data",
    title: "Frequency table",
    group: "Structures",
    about: "The table a survey is written into: what it was, the tally as it was counted, and the number. Two columns say the same thing, so one of them can be left blank for the child to fill in.",
    params: {
        rows: [
            { label: "Red", count: 7 },
            { label: "Blue", count: 12 },
            { label: "Green", count: 4 },
        ] as Row[],
        numbers: true,
        heading: "Colour",
    },
    settings: {
        rows: { kind: "fixed" },
        numbers: { kind: "flag" },
        heading: { kind: "text", most: 10 },
    },
    takes: [
        {
            label: "Three colours",
            params: {
                rows: [
                    { label: "Red", count: 7 },
                    { label: "Blue", count: 12 },
                    { label: "Green", count: 4 },
                ],
                numbers: true,
                heading: "Colour",
            },
        },
        {
            label: "Numbers to fill in",
            params: {
                rows: [
                    { label: "Cat", count: 9 },
                    { label: "Dog", count: 6 },
                ],
                numbers: false,
                heading: "Pet",
            },
        },
        {
            label: "A longer survey",
            params: {
                rows: [
                    { label: "Walk", count: 11 },
                    { label: "Bus", count: 8 },
                    { label: "Car", count: 15 },
                    { label: "Bike", count: 3 },
                ],
                numbers: true,
                heading: "How",
            },
        },
    ],
    box: (p) => ({ w: 20, h: p.rows.length * 2 + 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = U / 2,
            cols = [5, 9, 4],
            top = U,
            rh = 2 * U,
            a: RawAnchors = {};
        const at = (k: number) => x0 + cols.slice(0, k).reduce((s, n) => s + n, 0) * U;
        [p.heading, "Tally", "Number"].forEach((s, k) => {
            pen.rect(
                g,
                at(k),
                top,
                (cols[k] ?? 0) * U,
                rh,
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 8, fillWeight: 0.6 }),
                { strokeWidth: 1.6 },
            );
            sayOn(c, at(k) + ((cols[k] ?? 0) * U) / 2, top + 1.3 * U, s, 16);
            a[`col(${k})`] = [at(k) + ((cols[k] ?? 0) * U) / 2, top, "up"];
        });
        p.rows.forEach((row, r) => {
            const y = top + (r + 1) * rh;
            cols.forEach((n, k) =>
                pen.rect(g, at(k), y, n * U, rh, "ruler", null, { strokeWidth: 1.3 }),
            );
            say(c, at(0) + 14, y + 1.3 * U, row.label, 16, "start");
            tally(c, at(1) + 14, y + U, row.count);
            if (p.numbers) num(c, at(2) + ((cols[2] ?? 0) * U) / 2, y + 1.35 * U, row.count, 18);
            a[`row(${r})`] = [at(0), y + U, "left"];
            a[`count(${r})`] = [at(2) + ((cols[2] ?? 0) * U) / 2, y, "up"];
        });
        pen.rect(g, x0, top, 18 * U, (p.rows.length + 1) * rh, "ruler", null, { strokeWidth: 2.4 });
        const ty = top + (p.rows.length + 1) * rh;
        say(c, at(1) - 14, ty + 26, "Total", 15, "end");
        if (p.numbers)
            num(
                c,
                at(2) + ((cols[2] ?? 0) * U) / 2,
                ty + 28,
                p.rows.reduce((s, r) => s + r.count, 0),
                17,
            );
        a.total = [at(2) + ((cols[2] ?? 0) * U) / 2, ty + 10, "down"];
        return a;
    },
    describe: (p) =>
        `A tally table with a heading row, one row per item with its tally marks in fives${p.numbers ? " and the number written in the last column" : ""}, and a total line.`,
});
