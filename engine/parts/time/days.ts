import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { sayOn } from "../lettering";
import { loop } from "../marks";
import { WEEK } from "./spans";

export const dayStrip = defineDrawing({
    id: "days",
    family: "time",
    title: "Days of the week",
    group: "Structures",
    about: "Seven cards in order, three squares each, with one of them looped. Enough for what comes after Thursday, and for counting on across the end of the week.",
    params: { mark: 2, start: 0 },
    settings: { mark: { kind: "whole", min: 0, max: 6 }, start: { kind: "whole", min: 0, max: 6 } },
    takes: [
        { label: "Wednesday", params: { mark: 2, start: 0 } },
        { label: "Starting Sunday", params: { mark: 0, start: 6 } },
        { label: "Nothing marked", params: { mark: -1, start: 0 } },
    ],
    box: () => ({ w: 22, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        for (let i = 0; i < 7; i++) {
            const name = WEEK[(i + p.start) % 7] ?? "",
                x = U + i * 3 * U,
                weekend = (i + p.start) % 7 > 4;
            const tint = weekend
                ? pen.fill("grid", "solid", { hachureGap: 9, fillWeight: 0.6 })
                : pen.fill("card");
            pen.path(g, roundedRect(x + 3, U, 3 * U - 6, 2 * U, 7), "ruler", tint, {
                strokeWidth: 1.8,
            });
            sayOn(c, x + 1.5 * U, 2.2 * U, name, 15);
            if (i === p.mark) loop(c, x + 1.5 * U, 2 * U, 3 * U + 4, 2 * U + 8);
            a[`day(${name})`] = [x + 1.5 * U, U, "up"];
        }
        return a;
    },
    describe: () =>
        "The seven days of the week as a strip of cards in order, one of them picked out with a ring.",
});
