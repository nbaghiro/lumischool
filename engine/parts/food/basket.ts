import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { inside } from "../props";
import { named } from "../stories/pictures";

type Pt = [number, number];

export const basket = defineDrawing({
    id: "basket",
    family: "food",
    title: "Basket",
    group: "Props",
    about: "A woven basket with what is in it showing over the rim. The basket is the thing a story hands someone; what is in it is a prop, so the same drawing carries apples, eggs or balls.",
    params: { item: "apple", count: 5, label: "" },
    settings: {
        item: { kind: "text", most: 12 },
        count: { kind: "whole", min: 0, max: 12 },
        label: { kind: "text", most: 20 },
    },
    takes: [
        { label: "Five apples", params: { item: "apple", count: 5, label: "" } },
        { label: "Balls, labelled", params: { item: "ball", count: 3, label: "Ben's basket" } },
        { label: "A full basket", params: { item: "apple", count: 9, label: "" } },
        { label: "Empty", params: { item: "apple", count: 0, label: "" } },
    ],
    box: () => ({ w: 9, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 4.5 * U,
            rim = 4.6 * U,
            bottom = 7.6 * U,
            top = 3.4 * U,
            foot = 2.1 * U;
        inside(c, cx, rim + 6, 5.4 * U, p.item, p.count, 34);
        const body: Pt[] = [
            [cx - top, rim],
            [cx + top, rim],
            [cx + foot, bottom],
            [cx - foot, bottom],
        ];
        pen.polygon(
            g,
            body,
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 2.4 },
        );
        // The weave: two sets of slanted lines, drawn light so the count above stays the loud thing.
        for (let k = 1; k < 5; k++) {
            const t = k / 5,
                lx = cx - top + (top - foot) * t,
                rx = cx + top - (top - foot) * t;
            pen.line(g, lx, rim + (bottom - rim) * t, rx, rim + (bottom - rim) * t, "pencil", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        }
        for (const s of [-0.5, 0, 0.5])
            pen.line(g, cx + s * top * 1.1, rim, cx + s * foot * 1.1, bottom, "pencil", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        pen.path(
            g,
            roundedRect(cx - top - 6, rim - 10, top * 2 + 12, 20, 6),
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 6 }),
            { strokeWidth: 2 },
        );
        pen.arc(g, cx, rim - 6, top * 1.7, 3 * U, Math.PI, 2 * Math.PI, "pencil", {
            strokeWidth: 2.4,
        });
        if (p.label) say(c, cx, 8.6 * U, p.label, 16);
        const a: RawAnchors = {
            rim: [cx, rim - 10, "up"],
            handle: [cx, rim - 1.6 * U, "up"],
            inside: [cx, rim, "up"],
        };
        return a;
    },
    describe: (p) =>
        `${p.count > 0 ? `A woven basket with a handle and a rim, with ${named(p.item)} showing over the rim` : "An empty woven basket with a handle and a rim"}${p.label ? ", and a label written under it" : ""}, drawn with a light weave.`,
});
