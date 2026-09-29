import type { RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export const pocketSign = defineDrawing({
    id: "pocketsign",
    family: "sport",
    title: "Pocket sign",
    group: "Props",
    about: "A small card clipped to a table's rail beside a pocket, with a word on it such as even or odd that says which balls that pocket takes.",
    params: { word: "even" },
    settings: { word: { kind: "text", most: 6 } },
    takes: [
        { label: "Even numbers only", params: { word: "even" } },
        { label: "Odd numbers only", params: { word: "odd" } },
    ],
    box: () => ({ w: 4, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.path(
            g,
            roundedRect(0.15 * U, 0.2 * U, 3.7 * U, 1.6 * U, 6),
            "ruler",
            pen.fill("card"),
            {
                strokeWidth: 1.6,
                disableMultiStroke: true,
                preserveVertices: true,
            },
        );
        pen.circle(g, 2 * U, 0.35 * U, 0.3 * U, "ruler", pen.fill("berry"), {
            strokeWidth: 0.8,
            disableMultiStroke: true,
        });
        say(c, 2 * U, 1.38 * U, String(p.word).slice(0, 6), 17);
        return { middle: [2 * U, U, "up"] };
    },
    describe: () =>
        "A small white card with a pink pin clipped to a table rail beside a pocket, with one short word written on it in large letters.",
    motion: { still: "A sign is pinned to the rail and holds still." },
});
