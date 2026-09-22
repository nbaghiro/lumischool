import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, sayOn } from "../lettering";

const listIn = <G>(c: Ctx<G>, x: number, y: number, items: string[], size = 16) =>
    items.forEach((s, i) => say(c, x, y + i * 22 - ((items.length - 1) * 22) / 2, s, size));

export const venn = defineDrawing({
    id: "venn",
    family: "data",
    title: "Venn diagram",
    group: "Structures",
    about: "Two rings that overlap, with the things themselves written in, not counted. What goes in the middle is the whole question; what goes outside the rings but inside the box is the half of it children forget.",
    params: {
        labels: ["Even", "More than 10"],
        left: ["2", "6", "8"],
        both: ["12", "14"],
        right: ["11", "15"],
        outside: ["7"],
    },
    settings: {
        labels: { kind: "words", most: 2 },
        left: { kind: "words", most: 6 },
        both: { kind: "words", most: 6 },
        right: { kind: "words", most: 6 },
        outside: { kind: "words", most: 6 },
    },
    takes: [
        {
            label: "Even and over ten",
            params: {
                labels: ["Even", "More than 10"],
                left: ["2", "6", "8"],
                both: ["12", "14"],
                right: ["11", "15"],
                outside: ["7"],
            },
        },
        {
            label: "Nothing in the middle",
            params: {
                labels: ["Square", "Red"],
                left: ["A", "B"],
                both: [],
                right: ["C"],
                outside: ["D"],
            },
        },
        {
            label: "Multiples",
            params: {
                labels: ["Times 3", "Times 4"],
                left: ["3", "9"],
                both: ["12", "24"],
                right: ["8", "16"],
                outside: ["5"],
            },
        },
        {
            label: "Empty rings",
            params: { labels: ["Yes", "No"], left: [], both: [], right: [], outside: [] },
        },
    ],
    box: () => ({ w: 19, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cy = 7 * U,
            r = 3.6 * U,
            cx1 = 6.2 * U,
            cx2 = 11.2 * U;
        pen.rect(g, U / 2, U / 2, 18 * U, 12 * U, "ruler", null, { strokeWidth: 1.8 });
        // Hatched rather than filled, on screen as well as on paper: a solid second ring would paint
        // over the first and the overlap would stop looking like an overlap.
        pen.circle(
            g,
            cx1,
            cy,
            r * 2,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 9, hachureAngle: -45, fillWeight: 1.4 }),
            { strokeWidth: 2.2 },
        );
        pen.circle(
            g,
            cx2,
            cy,
            r * 2,
            "ruler",
            pen.fill("mint", "hachure", { hachureGap: 9, hachureAngle: 45, fillWeight: 1.4 }),
            { strokeWidth: 2.2 },
        );
        sayOn(c, U, cy - r - 12, p.labels[0] ?? "", 16, "start");
        sayOn(c, 18 * U, cy - r - 12, p.labels[1] ?? "", 16, "end");
        listIn(c, cx1 - r * 0.52, cy, p.left);
        listIn(c, (cx1 + cx2) / 2, cy, p.both);
        listIn(c, cx2 + r * 0.52, cy, p.right);
        listIn(c, 16 * U, 10.6 * U, p.outside);
        return {
            left: [cx1 - r * 0.52, cy, "up"],
            both: [(cx1 + cx2) / 2, cy, "up"],
            right: [cx2 + r * 0.52, cy, "up"],
            outside: [16 * U, 10.6 * U, "up"],
        };
    },
    describe: () =>
        "A Venn diagram, two rings overlapping inside a box, each ring labelled, with items written in the rings, in the overlap and outside them.",
});
