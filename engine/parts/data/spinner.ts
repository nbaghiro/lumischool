import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, onCircle, patch, say, sector } from "../lettering";

interface Wedge {
    label: string;
    value: number;
    color: Marker;
}

export const spinner = defineDrawing({
    id: "spinner",
    family: "data",
    title: "Spinner",
    group: "Structures",
    about: "A dial divided into sections that need not be equal, with an arrow resting on one. Unequal sections are the point: a spinner where red is half of it is not the same as one where red is a quarter.",
    params: {
        wedges: [
            { label: "1", value: 1, color: "sky" },
            { label: "2", value: 1, color: "mint" },
            { label: "3", value: 1, color: "tang" },
            { label: "4", value: 1, color: "berry" },
        ] as Wedge[],
        lands: 0,
    },
    settings: { wedges: { kind: "fixed" }, lands: { kind: "whole", min: 0, max: 8 } },
    takes: [
        {
            label: "Four equal",
            params: {
                wedges: [
                    { label: "1", value: 1, color: "sky" },
                    { label: "2", value: 1, color: "mint" },
                    { label: "3", value: 1, color: "tang" },
                    { label: "4", value: 1, color: "berry" },
                ],
                lands: 0,
            },
        },
        {
            label: "Half red",
            params: {
                wedges: [
                    { label: "Red", value: 2, color: "berry" },
                    { label: "Blue", value: 1, color: "sky" },
                    { label: "Green", value: 1, color: "mint" },
                ],
                lands: 1,
            },
        },
        {
            label: "Three equal",
            params: {
                wedges: [
                    { label: "A", value: 1, color: "glow" },
                    { label: "B", value: 1, color: "sky" },
                    { label: "C", value: 1, color: "mint" },
                ],
                lands: 2,
            },
        },
        {
            label: "One unlikely section",
            params: {
                wedges: [
                    { label: "Win", value: 1, color: "tang" },
                    { label: "Lose", value: 7, color: "sky" },
                ],
                lands: 0,
            },
        },
    ],
    box: () => ({ w: 11, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 5.5 * U,
            cy = 5.8 * U,
            R = 4.4 * U,
            a: RawAnchors = {};
        const total = p.wedges.reduce((s, w) => s + w.value, 0) || 1;
        let from = 0,
            landAngle = 0;
        p.wedges.forEach((w, i) => {
            const span = (w.value / total) * Math.PI * 2,
                mid = from + span / 2;
            pen.path(
                g,
                sector(cx, cy, R, from, from + span),
                "ruler",
                pen.fill(w.color, "solid", { hachureGap: 7 }),
                { strokeWidth: 1.8 },
            );
            const [lx, ly] = onCircle(cx, cy, R * 0.66, mid / (Math.PI * 2));
            patch(c, lx, ly - 6, 34, 22);
            num(c, lx, ly + 6, w.label, 17);
            if (i === p.lands) landAngle = mid;
            a[`wedge(${i})`] = [lx, ly - 12, "up"];
            from += span;
        });
        pen.circle(g, cx, cy, R * 2, "ruler", null, { strokeWidth: 2.6 });
        const [hx, hy] = onCircle(cx, cy, R - 0.8 * U, landAngle / (Math.PI * 2));
        const [tx, ty] = onCircle(cx, cy, -0.9 * U, landAngle / (Math.PI * 2));
        pen.line(g, tx, ty, hx, hy, "ruler", { strokeWidth: 3.4 });
        for (const s of [-1, 1]) {
            const b = Math.atan2(hy - ty, hx - tx) + Math.PI + s * 0.42;
            pen.line(g, hx, hy, hx + 16 * Math.cos(b), hy + 16 * Math.sin(b), "ruler", {
                strokeWidth: 3,
            });
        }
        pen.circle(g, cx, cy, 14, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
        say(c, cx, 11.3 * U, `${p.wedges.length} sections`, 14, "middle", c.t["ink-soft"]);
        a.pointer = [hx, hy, "up"];
        a.centre = [cx, cy, "down"];
        return a;
    },
    describe: () =>
        "A spinner cut into coloured wedges from its centre, each wedge labelled, with a pointer drawn on it.",
    motion: { still: STILL.instrument },
    reads: true,
});
