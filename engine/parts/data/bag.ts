import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

interface Fill {
    color: Marker;
    count: number;
    label: string;
}

/** The legend runs along the bottom, so the bag is as wide as the words under it. */
const legendW = (fills: Fill[]): number =>
    1 + fills.reduce((s, f) => s + 2.2 + f.label.length * 0.45, 0);

export const counterBag = defineDrawing({
    id: "bag",
    family: "data",
    title: "Bag of counters",
    group: "Props",
    about: "A bag with what is in it on show, which is the fiction every chance question runs on: you can see the counters while you pretend not to. The counts are what the fraction is built from.",
    params: {
        fills: [
            { color: "berry", count: 3, label: "red" },
            { color: "sky", count: 5, label: "blue" },
        ] as Fill[],
    },
    settings: { fills: { kind: "fixed" } },
    takes: [
        {
            label: "Three red, five blue",
            params: {
                fills: [
                    { color: "berry", count: 3, label: "red" },
                    { color: "sky", count: 5, label: "blue" },
                ],
            },
        },
        {
            label: "Even chance",
            params: {
                fills: [
                    { color: "mint", count: 4, label: "green" },
                    { color: "tang", count: 4, label: "orange" },
                ],
            },
        },
        {
            label: "One of each",
            params: {
                fills: [
                    { color: "berry", count: 1, label: "red" },
                    { color: "sky", count: 1, label: "blue" },
                    { color: "glow", count: 1, label: "yellow" },
                ],
            },
        },
    ],
    box: (p) => ({ w: Math.max(11, Math.ceil(legendW(p.fills)) + 1), h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = (Math.max(11, Math.ceil(legendW(p.fills)) + 1) / 2) * U,
            top = 2.6 * U,
            bottom = 9.4 * U,
            half = 3.2 * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${cx - 1.5 * U} ${top}C${cx - half} ${top + 40} ${cx - half} ${bottom - 40} ${cx - half + 20} ${bottom}` +
                `H${cx + half - 20}C${cx + half} ${bottom - 40} ${cx + half} ${top + 40} ${cx + 1.5 * U} ${top}Z`,
            "pencil",
            pen.fill("grid", "solid", { hachureGap: 11, fillWeight: 0.5 }),
            { strokeWidth: 2.4 },
        );
        pen.path(
            g,
            `M${cx - 1.6 * U} ${top}Q${cx} ${top - 26} ${cx + 1.6 * U} ${top}`,
            "pencil",
            null,
            { strokeWidth: 2 },
        );
        pen.line(g, cx - 1.5 * U, top + 6, cx + 1.5 * U, top + 6, "pencil", { strokeWidth: 1.6 });
        const all = p.fills.flatMap((f) => Array.from({ length: f.count }, () => f.color));
        all.forEach((color, i) => {
            const row = Math.floor(i / 4),
                inRow = Math.min(4, all.length - row * 4);
            const cxx = cx + ((i % 4) - (inRow - 1) / 2) * 1.3 * U,
                cyy = bottom - 1.1 * U - row * 1.3 * U;
            pen.circle(g, cxx, cyy, 22, "pencil", pen.fill(color), { strokeWidth: 1.4 });
        });
        let x = U;
        p.fills.forEach((f, i) => {
            pen.circle(g, x + 12, 11.2 * U, 18, "ruler", pen.fill(f.color), { strokeWidth: 1.3 });
            num(c, x + 28, 11.5 * U, `${f.count} ${f.label}`, 15, "start");
            a[`fill(${i})`] = [x + 12, 11.2 * U, "up"];
            x += (2.2 + f.label.length * 0.45) * U;
        });
        a.bag = [cx, top, "up"];
        return a;
    },
    describe: () =>
        "A cloth bag with counters inside it in two or more colours, and a key beside it naming each colour and how many are in the bag.",
});
