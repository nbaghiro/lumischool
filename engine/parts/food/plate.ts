import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { drawProp } from "../props";
import { named } from "../stories/pictures";

export const plateOf = defineDrawing({
    id: "plate",
    family: "food",
    title: "Plate",
    group: "Props",
    about: "A plate seen from above with things on it, laid out in a ring so they can be counted round rather than in a line. Sharing a plate between children is the first division story there is.",
    params: { item: "circle", count: 6, label: "" },
    settings: {
        item: { kind: "text", most: 12 },
        count: { kind: "whole", min: 1, max: 12 },
        label: { kind: "text", most: 20 },
    },
    takes: [
        { label: "Six biscuits", params: { item: "circle", count: 6, label: "" } },
        { label: "Four cakes, named", params: { item: "apple", count: 4, label: "Ann's plate" } },
        { label: "One left", params: { item: "circle", count: 1, label: "" } },
        { label: "Eight round the rim", params: { item: "counter", count: 8, label: "" } },
    ],
    box: () => ({ w: 9, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 4.5 * U,
            cy = 4.2 * U,
            R = 3.6 * U;
        pen.ellipse(g, cx, cy, R * 2, R * 1.7, "pencil", pen.fill("card"), { strokeWidth: 2.4 });
        pen.ellipse(g, cx, cy, R * 1.62, R * 1.36, "pencil", null, {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
        });
        const a: RawAnchors = { centre: [cx, cy, "up"], rim: [cx, cy - R * 0.85, "up"] };
        const r = p.count > 6 ? R * 0.62 : R * 0.5;
        for (let i = 0; i < p.count; i++) {
            const t = (i / Math.max(1, p.count)) * Math.PI * 2 - Math.PI / 2;
            const x = p.count === 1 ? cx : cx + r * Math.cos(t),
                y = p.count === 1 ? cy : cy + r * 0.82 * Math.sin(t);
            drawProp(c, p.item, x, y, 30);
            a[`item(${i})`] = [x, y - 16, "up"];
        }
        if (p.label) say(c, cx, 8.4 * U, p.label, 16);
        return a;
    },
    describe: (p) =>
        `A plate seen from above, with a rim, and ${p.count > 1 ? `${named(p.item)} laid out in a ring on it` : `${named(p.item, 1)} in the middle of it`}${p.label ? ", and a label under it" : ""}.`,
});
