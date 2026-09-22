import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const counterTub = defineDrawing({
    id: "tub",
    family: "counting",
    title: "Tub of counters",
    group: "Props",
    about: "A tub of two-colour counters seen from above, spilled so both colours show. It is where a random handful comes from, and the count of each colour is the start of a chance question.",
    params: { first: 6, second: 4, colors: ["berry", "sky"] as [Marker, Marker] },
    settings: {
        first: { kind: "whole", min: 0, max: 12 },
        second: { kind: "whole", min: 0, max: 12 },
        colors: { kind: "fixed" },
    },
    takes: [
        { label: "Six and four", params: { first: 6, second: 4, colors: ["berry", "sky"] } },
        { label: "A bigger handful", params: { first: 9, second: 5, colors: ["mint", "tang"] } },
        { label: "Two only", params: { first: 1, second: 1, colors: ["berry", "sky"] } },
    ],
    box: () => ({ w: 13, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 4.4 * U,
            cy = 4.4 * U,
            R = 3.4 * U,
            a: RawAnchors = {};
        pen.circle(
            g,
            cx,
            cy,
            R * 2,
            "pencil",
            pen.fill("grid", "solid", { hachureGap: 12, fillWeight: 0.4 }),
            { strokeWidth: 2.6 },
        );
        pen.circle(g, cx, cy, R * 1.72, "pencil", null, {
            strokeWidth: 1.4,
            stroke: c.t["ink-soft"],
        });
        // Inside the tub, laid out on a ring so they can be counted; spilled ones sit to the right.
        const total = p.first + p.second,
            inside = Math.min(total, 7);
        for (let i = 0; i < inside; i++) {
            const t = (i / inside) * Math.PI * 2 - Math.PI / 2,
                r = inside > 1 ? R * 0.5 : 0;
            pen.circle(
                g,
                cx + r * Math.cos(t),
                cy + r * Math.sin(t),
                1.1 * U,
                "pencil",
                pen.fill(i < p.first ? p.colors[0] : p.colors[1]),
                { strokeWidth: 1.4 },
            );
        }
        for (let i = 0; i < total - inside; i++) {
            const x = 9 * U + (i % 3) * 1.5 * U,
                y = (2.6 + Math.floor(i / 3) * 1.5) * U;
            pen.circle(
                g,
                x,
                y,
                1.1 * U,
                "pencil",
                pen.fill(inside + i < p.first ? p.colors[0] : p.colors[1]),
                { strokeWidth: 1.4 },
            );
        }
        pen.circle(g, 9.4 * U, 7.4 * U, 0.8 * U, "ruler", pen.fill(p.colors[0]), {
            strokeWidth: 1.2,
        });
        num(c, 10.1 * U, 7.7 * U, p.first, 15, "start");
        pen.circle(g, 11 * U, 7.4 * U, 0.8 * U, "ruler", pen.fill(p.colors[1]), {
            strokeWidth: 1.2,
        });
        num(c, 11.7 * U, 7.7 * U, p.second, 15, "start");
        a.tub = [cx, cy - R, "up"];
        a.spilled = [10 * U, 2 * U, "up"];
        return a;
    },
    describe: () =>
        "A round tub of two-colour counters seen from above, some spilled beside it, with a count of each colour written under them.",
});
