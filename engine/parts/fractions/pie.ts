import { type RawAnchors } from "../../ink/surface";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, sector } from "../lettering";

interface Slice {
    label: string;
    value: number;
    color: Marker;
}

/** The slices as drawn: `values` with their `labels` and `colors` where a question gives them, or else the drawing's own `slices`. */
const slicesOf = (p: {
    slices: Slice[];
    labels: string[];
    values: number[];
    colors: Marker[];
}): Slice[] =>
    p.values.length
        ? p.values.map((value, i) => ({
              label: p.labels[i] ?? "",
              value,
              color: MARKERS.find((m) => m === p.colors[i]) ?? MARKERS[i % MARKERS.length] ?? "sky",
          }))
        : p.slices;

export const pieChart = defineDrawing({
    id: "pie",
    family: "fractions",
    title: "Pie chart",
    group: "Structures",
    about: "Slices in proportion, each one labelled outside the circle with its share. Halves, quarters and thirds are the sizes a child can name by eye, which is what makes a pie readable before it is measured. A question gives its slices as `values`, with `labels` and `colors`, which may hold parameters; without `values` the chart draws its own slices.",
    params: {
        slices: [
            { label: "Walk", value: 1, color: "sky" },
            { label: "Bus", value: 2, color: "mint" },
            { label: "Car", value: 1, color: "tang" },
        ] as Slice[],
        labels: [] as string[],
        values: [] as number[],
        colors: [] as Marker[],
        show: "share",
    },
    settings: {
        slices: { kind: "fixed" },
        labels: { kind: "words", most: 6 },
        values: { kind: "numbers", min: 0, max: 100, most: 6 },
        colors: { kind: "words", of: MARKERS, most: 6 },
        show: { kind: "one of", of: ["share", "percent"] },
    },
    takes: [
        {
            label: "How we get to school",
            params: {
                slices: [
                    { label: "Walk", value: 1, color: "sky" },
                    { label: "Bus", value: 2, color: "mint" },
                    { label: "Car", value: 1, color: "tang" },
                ],
                labels: [],
                values: [],
                colors: [],
                show: "share",
            },
        },
        {
            label: "In percent",
            params: {
                slices: [
                    { label: "Yes", value: 3, color: "mint" },
                    { label: "No", value: 1, color: "berry" },
                ],
                labels: [],
                values: [],
                colors: [],
                show: "percent",
            },
        },
        {
            label: "Five slices",
            params: {
                slices: [
                    { label: "Red", value: 4, color: "berry" },
                    { label: "Blue", value: 3, color: "sky" },
                    { label: "Green", value: 2, color: "mint" },
                    { label: "Other", value: 1, color: "glow" },
                ],
                labels: [],
                values: [],
                colors: [],
                show: "share",
            },
        },
    ],
    box: () => ({ w: 16, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 8 * U,
            cy = 6.4 * U,
            R = 4.4 * U,
            a: RawAnchors = {};
        const slices = slicesOf(p);
        const total = slices.reduce((s, q) => s + q.value, 0) || 1;
        let from = 0;
        slices.forEach((s, i) => {
            const span = (s.value / total) * Math.PI * 2,
                mid = from + span / 2;
            pen.path(
                g,
                sector(cx, cy, R, from, from + span),
                "ruler",
                pen.fill(s.color, "solid", { hachureGap: 7 }),
                { strokeWidth: 2 },
            );
            const lr = R + 0.9 * U,
                lx = cx + lr * Math.sin(mid),
                ly = cy - lr * Math.cos(mid);
            const align = Math.sin(mid) > 0.25 ? "start" : Math.sin(mid) < -0.25 ? "end" : "middle";
            say(c, lx, ly, s.label, 15, align);
            const share =
                p.show === "percent"
                    ? `${Math.round((s.value / total) * 100)}%`
                    : `${s.value}/${total}`;
            say(c, lx, ly + 17, share, 14, align, c.t["ink-soft"]);
            a[`slice(${i})`] = [cx + R * 0.6 * Math.sin(mid), cy - R * 0.6 * Math.cos(mid), "up"];
            from += span;
        });
        pen.circle(g, cx, cy, R * 2, "ruler", null, { strokeWidth: 2.4 });
        a.centre = [cx, cy, "up"];
        return a;
    },
    describe: () =>
        "A pie chart cut into coloured slices from its centre, each slice labelled outside the circle with a name and its share.",
});
