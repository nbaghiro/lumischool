import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, sayOn } from "../lettering";

const listIn = <G>(c: Ctx<G>, x: number, y: number, items: string[], size = 16) =>
    items.forEach((s, i) => say(c, x, y + i * 22 - ((items.length - 1) * 22) / 2, s, size));

export const carroll = defineDrawing({
    id: "carroll",
    family: "data",
    title: "Carroll diagram",
    group: "Structures",
    about: 'The same sort as a Venn, laid out as a table so every thing has exactly one box. Naming the second column "not red" is what makes the four boxes cover everything.',
    params: {
        cols: ["Red", "Not red"],
        rows: ["Big", "Not big"],
        cells: [["A"], ["B", "C"], ["D"], ["E", "F"]] as string[][],
    },
    settings: {
        cols: { kind: "words", most: 2 },
        rows: { kind: "words", most: 2 },
        cells: { kind: "fixed" },
    },
    takes: [
        {
            label: "Red and big",
            params: {
                cols: ["Red", "Not red"],
                rows: ["Big", "Not big"],
                cells: [["A"], ["B", "C"], ["D"], ["E", "F"]],
            },
        },
        {
            label: "Odd and over 20",
            params: {
                cols: ["Odd", "Even"],
                rows: ["Over 20", "Under 20"],
                cells: [["23", "31"], ["24"], ["7"], ["6", "12"]],
            },
        },
        {
            label: "Blank, to fill in",
            params: {
                cols: ["Curved", "Straight"],
                rows: ["3 sides", "4 sides"],
                cells: [[], [], [], []],
            },
        },
    ],
    box: () => ({ w: 16, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            hx = 4.5 * U,
            hy = 2 * U,
            cw = 5.5 * U,
            ch = 3.5 * U,
            a: RawAnchors = {};
        p.cols.forEach((s, k) => sayOn(c, hx + k * cw + cw / 2, hy - 12, s, 16));
        p.rows.forEach((s, r) => sayOn(c, hx - 12, hy + r * ch + ch / 2 + 5, s, 16, "end"));
        for (let r = 0; r < 2; r++)
            for (let k = 0; k < 2; k++) {
                const x = hx + k * cw,
                    y = hy + r * ch,
                    i = r * 2 + k;
                pen.rect(g, x, y, cw, ch, "ruler", null, { strokeWidth: 1.6 });
                listIn(c, x + cw / 2, y + ch / 2, p.cells[i] ?? [], 17);
                a[`cell(${i})`] = [x + cw / 2, y, "up"];
            }
        pen.rect(g, hx, hy, 2 * cw, 2 * ch, "ruler", null, { strokeWidth: 2.4 });
        return a;
    },
    describe: () =>
        "A Carroll diagram, a two by two table with a heading for each column and row, and items written in each cell.",
});
