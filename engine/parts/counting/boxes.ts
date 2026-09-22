import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { drawProp, inside } from "../props";
import { named } from "../stories/pictures";

export const boxesOf = defineDrawing({
    id: "boxes",
    family: "counting",
    title: "Boxes of things",
    group: "Props",
    about: "Equal groups you can see: so many boxes with so many in each, and any left over standing outside. This is the picture multiplication is invented for, and the one division reads backwards.",
    params: { boxes: 3, per: 4, loose: 2, item: "cube" },
    settings: {
        boxes: { kind: "whole", min: 1, max: 6 },
        per: { kind: "whole", min: 1, max: 12 },
        loose: { kind: "whole", min: 0, max: 6 },
        item: { kind: "text", most: 12 },
    },
    takes: [
        {
            label: "Three boxes of four, two over",
            params: { boxes: 3, per: 4, loose: 2, item: "cube" },
        },
        { label: "Four boxes of six", params: { boxes: 4, per: 6, loose: 0, item: "ball" } },
        { label: "Two boxes of three", params: { boxes: 2, per: 3, loose: 0, item: "apple" } },
        { label: "One box, one left over", params: { boxes: 1, per: 5, loose: 1, item: "star" } },
    ],
    box: (p) => ({ w: p.boxes * 5 + (p.loose ? p.loose * 2 + 2 : 0) + 1, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            bottom = 7.4 * U,
            a: RawAnchors = {};
        for (let b = 0; b < p.boxes; b++) {
            const x = U / 2 + b * 5 * U,
                w = 4.6 * U,
                top = bottom - 3.4 * U;
            // Seen from the front with the flaps folded out, so nothing inside can hide behind a panel:
            // every one of them has to be countable, or the drawing cannot carry "boxes of six".
            pen.rect(
                g,
                x,
                top,
                w,
                bottom - top,
                "pencil",
                pen.fill("tang", "solid", { hachureGap: 9, fillWeight: 0.5 }),
                { strokeWidth: 2.4 },
            );
            for (const s of [-1, 1]) {
                const ex = s < 0 ? x : x + w;
                pen.polygon(
                    g,
                    [
                        [ex, top],
                        [ex + s * 0.7 * U, top - 0.5 * U],
                        [ex + s * 1.1 * U, top - 0.2 * U],
                        [ex + s * 0.2 * U, top + 0.15 * U],
                    ],
                    "pencil",
                    pen.fill("tang", "solid", { hachureGap: 9, fillWeight: 0.5 }),
                    { strokeWidth: 1.8 },
                );
            }
            pen.rect(g, x + 8, top + 8, w - 16, bottom - top - 16, "pencil", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            inside(c, x + w / 2, bottom - 14, w - 14, p.item, p.per, 26);
            a[`box(${b})`] = [x + w / 2, top - 0.5 * U, "up"];
        }
        for (let i = 0; i < p.loose; i++) {
            const x = (p.boxes * 5 + 1.5 + i * 2) * U;
            drawProp(c, p.item, x, bottom - 20, 34);
            a[`loose(${i})`] = [x, bottom - 44, "up"];
        }
        if (p.loose) soft(c, (p.boxes * 5 + 0.5 + p.loose) * U, 8.6 * U, "left over", 13);
        return a;
    },
    describe: (p) =>
        p.boxes > 1
            ? `Cardboard boxes in a row seen from the front with their flaps folded out and ${named(p.item)} stacked inside each${p.loose > 0 ? ", and some standing loose beside them" : ""}.`
            : `A cardboard box seen from the front with its flaps folded out and ${named(p.item)} stacked inside${p.loose > 0 ? ", and some standing loose beside it" : ""}.`,
});
