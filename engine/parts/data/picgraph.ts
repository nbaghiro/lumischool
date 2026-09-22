import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { drawProp } from "../props";

/** Width in squares of the label column of a graph. */
const labelWidth = (labels: string[]): number =>
    Math.max(4, ...labels.map((s) => Math.ceil(s.length * 0.45) + 1));

export const pictureGraph = defineDrawing({
    id: "picgraph",
    family: "data",
    title: "Picture graph",
    group: "Structures",
    about: "One row per label and one picture per unit, so rows can be compared by looking.",
    params: { labels: ["Apples", "Pears", "Plums"], counts: [5, 3, 4], prop: "star" },
    settings: {
        labels: { kind: "words", most: 6 },
        counts: { kind: "numbers", min: 0, max: 10, most: 6 },
        prop: { kind: "text", most: 8 },
    },
    takes: [
        {
            label: "Fruit, in stars",
            params: { labels: ["Apples", "Pears", "Plums"], counts: [5, 3, 4], prop: "star" },
        },
        {
            label: "Pets, in apples",
            params: { labels: ["Cats", "Dogs"], counts: [4, 6], prop: "apple" },
        },
        {
            label: "Colours, in circles",
            params: { labels: ["Red", "Blue", "Green"], counts: [2, 5, 3], prop: "circle" },
        },
    ],
    box: (p) => ({
        w: labelWidth(p.labels) + Math.max(...p.counts, 1) * 2 + 2,
        h: p.labels.length * 2 + 2,
    }),
    draw: (c, p) => {
        const lw = labelWidth(p.labels) * U,
            a: RawAnchors = {};
        c.pen.line(c.g, lw, U, lw, U + p.labels.length * 2 * U, "ruler", { strokeWidth: 1.6 });
        p.labels.forEach((label, i) => {
            const y = U + i * 2 * U;
            say(c, lw - 10, y + U + 6, label, 16, "end");
            for (let k = 0; k < (p.counts[i] ?? 0); k++)
                drawProp(c, p.prop, lw + U + k * 2 * U, y + U, 30);
            a[`row(${i})`] = [lw, y + U, "left"];
        });
        return a;
    },
    describe: () =>
        "A picture graph with one row per label, each row a line of small pictures, one for each unit counted.",
});
