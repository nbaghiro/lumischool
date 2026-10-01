import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, slot, soft } from "../lettering";

interface FamilyTreeParams {
    /** Seven names: four grandparents, the two parents under them, and the child at the bottom. */
    names: string[];
    /** The year each was born, in the same order; 0 leaves a box with no year. */
    years: number[];
    /** A box whose year is left blank for the child to fill in: -1 none, else its place in `names`. */
    blank: number;
}

const BOX_W = 7;
const BOX_H = 3;
/** Each box's left edge and top, in squares, in the order of `names`. */
const BOXES: [number, number][] = [
    [0.5, 0.5],
    [8.2, 0.5],
    [16.3, 0.5],
    [24, 0.5],
    [4.35, 5.5],
    [20.15, 5.5],
    [12.25, 10.5],
];

const SMITHS: FamilyTreeParams = {
    names: ["Grandma Rose", "Grandpa Tom", "Nana Mei", "Grandad Li", "Mum", "Dad", "Sam"],
    years: [1950, 1948, 1953, 1951, 1982, 1980, 2018],
    blank: -1,
};

export const familyTree = defineDrawing<FamilyTreeParams>({
    id: "familytree",
    family: "writing",
    title: "Family tree",
    group: "Structures",
    about: "Three generations of one family in boxes joined by lines: four grandparents at the top, the two parents below them, and the child at the bottom, each with a name and the year they were born. `blank` leaves one year as a box to fill in, so a question can ask for a year from the others, or how old someone was when someone else was born.",
    params: SMITHS,
    settings: {
        names: { kind: "words", most: 7 },
        years: { kind: "numbers", min: 0, max: 2100, most: 7 },
        blank: { kind: "whole", min: -1, max: 6 },
    },
    takes: [
        { label: "Sam's family", params: SMITHS },
        {
            label: "One year to find",
            params: {
                names: [
                    "Babushka Vera",
                    "Dedushka Ivan",
                    "Gran Ada",
                    "Grandpa Joe",
                    "Mama",
                    "Papa",
                    "Nina",
                ],
                years: [1956, 1954, 1958, 1955, 1985, 1983, 2017],
                blank: 4,
            },
        },
        {
            label: "The child's year to find",
            params: {
                names: ["Obaachan", "Ojiichan", "Granny", "Grandpa", "Mum", "Dad", "Ken"],
                years: [1955, 1952, 1957, 1956, 1984, 1981, 2019],
                blank: 6,
            },
        },
    ],
    box: () => ({ w: 32, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            mid = (i: number): [number, number] => {
                const [x, y] = BOXES[i] ?? [0, 0];
                return [(x + BOX_W / 2) * U, y * U];
            };
        // a line from each pair down to the one they are the parents of
        for (const [l, r, child] of [
            [0, 1, 4],
            [2, 3, 5],
            [4, 5, 6],
        ] as const) {
            const [lx, ly] = mid(l),
                [rx] = mid(r),
                [cx, cy] = mid(child),
                y = ly + BOX_H * U;
            pen.linear(
                g,
                [
                    [lx, y],
                    [lx, y + 0.8 * U],
                    [rx, y + 0.8 * U],
                    [rx, y],
                ],
                "ruler",
                { strokeWidth: 1.5 },
            );
            pen.line(g, (lx + rx) / 2, y + 0.8 * U, (lx + rx) / 2, y + 1.2 * U, "ruler", {
                strokeWidth: 1.5,
            });
            pen.linear(
                g,
                [
                    [(lx + rx) / 2, y + 1.2 * U],
                    [cx, y + 1.2 * U],
                    [cx, cy],
                ],
                "ruler",
                { strokeWidth: 1.5 },
            );
        }
        BOXES.forEach(([bx, by], i) => {
            const x = bx * U,
                y = by * U,
                cx = x + (BOX_W * U) / 2;
            pen.rect(g, x, y, BOX_W * U, BOX_H * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.7,
            });
            say(c, cx, y + 1.15 * U, p.names[i] ?? "", 13);
            const year = Math.round(p.years[i] ?? 0);
            if (Math.round(p.blank) === i) {
                soft(c, x + 1.3 * U, y + 2.35 * U, "born", 11);
                slot(c, cx - 0.7 * U, y + 1.55 * U, 3.2 * U, 1.1 * U);
            } else if (year > 0) {
                soft(c, x + 1.3 * U, y + 2.35 * U, "born", 11);
                num(c, cx + 0.9 * U, y + 2.4 * U, year, 14);
            }
            a[`person(${i})`] = [cx, y, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A family tree of three generations in boxes joined by lines: four grandparents, two parents and ${p.names[6] ?? "a child"}, each with the year they were born.`,
});
