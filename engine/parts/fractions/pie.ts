import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, sector } from "../lettering";

interface Slice {
    label: string;
    value: number;
    color: Marker;
}

export const pieChart = defineDrawing({
    id: "pie",
    family: "fractions",
    title: "Pie chart",
    group: "Structures",
    about: "Slices in proportion, each one labelled outside the circle with its share. Halves, quarters and thirds are the sizes a child can name by eye, which is what makes a pie readable before it is measured.",
    params: {
        slices: [
            { label: "Walk", value: 1, color: "sky" },
            { label: "Bus", value: 2, color: "mint" },
            { label: "Car", value: 1, color: "tang" },
        ] as Slice[],
        show: "share",
    },
    settings: { slices: { kind: "fixed" }, show: { kind: "one of", of: ["share", "percent"] } },
    takes: [
        {
            label: "How we get to school",
            params: {
                slices: [
                    { label: "Walk", value: 1, color: "sky" },
                    { label: "Bus", value: 2, color: "mint" },
                    { label: "Car", value: 1, color: "tang" },
                ],
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
        const total = p.slices.reduce((s, q) => s + q.value, 0) || 1;
        let from = 0;
        p.slices.forEach((s, i) => {
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
