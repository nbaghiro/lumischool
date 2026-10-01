import type { RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const parcel = defineDrawing({
    id: "parcel",
    family: "travel",
    title: "Parcel",
    group: "Props",
    about: "A small cardboard parcel tied with string both ways, drawn square so it reads from above on a roof rack and from the side on a doorstep, with or without a blank address tag.",
    params: { tag: true },
    settings: { tag: { kind: "flag" } },
    takes: [
        { label: "With a tag", params: { tag: true } },
        { label: "Plain", params: { tag: false } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = U,
            h = U;
        pen.path(
            g,
            roundedRect(0.06 * U, 0.06 * U, 0.88 * U, 0.88 * U, 3),
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4, fillWeight: 0.7 }),
            { strokeWidth: 1.5, ...FIRM },
        );
        pen.line(g, w / 2, 0.08 * U, w / 2, 0.92 * U, "ruler", { strokeWidth: 1.4, ...FIRM });
        pen.line(g, 0.08 * U, h / 2, 0.92 * U, h / 2, "ruler", { strokeWidth: 1.4, ...FIRM });
        if (p.tag)
            pen.rect(g, 0.54 * U, 0.14 * U, 0.34 * U, 0.26 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1,
                ...FIRM,
            });
        return { middle: [w / 2, h / 2, "up"], top: [w / 2, 0, "up"] };
    },
    describe: (p) =>
        `A small cardboard parcel tied with string both ways${p.tag ? " with a blank address tag" : ""}, ready to be carried along a street and delivered to a door.`,
});
