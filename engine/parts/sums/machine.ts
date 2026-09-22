import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, slot } from "../lettering";
import { feed, hopper } from "./hopper";

export const machine = defineDrawing({
    id: "machine",
    family: "sums",
    title: "Function machine",
    group: "Structures",
    about: "A number goes in, a rule is applied, a number comes out. Either end can be the blank, which is what turns one drawing into both a forward question and an inverse one.",
    params: { rule: "× 3", input: "4", output: "" },
    settings: {
        rule: { kind: "text", most: 6 },
        input: { kind: "text", most: 4 },
        output: { kind: "text", most: 4 },
    },
    takes: [
        { label: "Times three", params: { rule: "\u00d7 3", input: "4", output: "" } },
        { label: "Working backwards", params: { rule: "+ 7", input: "", output: "15" } },
        { label: "The rule is hidden", params: { rule: "?", input: "6", output: "18" } },
        { label: "Both ends known", params: { rule: "\u00f7 2", input: "20", output: "10" } },
    ],
    box: () => ({ w: 18, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            mid = 3.4 * U,
            a: RawAnchors = {};
        const box = (x: number, v: string) => {
            if (v) {
                pen.rect(g, x, mid - U, 2.6 * U, 2 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.8,
                });
                num(c, x + 1.3 * U, mid + 0.35 * U, v, 24);
            } else slot(c, x, mid - U, 2.6 * U, 2 * U);
        };
        box(0.5 * U, p.input);
        feed(c, [3.3 * U, mid], [5.6 * U, mid]);
        hopper(c, 6 * U, 1.2 * U, 6 * U, 4.6 * U, p.rule);
        feed(c, [12.4 * U, mid], [14.6 * U, mid]);
        box(14.9 * U, p.output);
        cap(c, 1.8 * U, 6.6 * U, "in", 12);
        cap(c, 16.2 * U, 6.6 * U, "out", 12);
        a.in = [1.8 * U, mid - U, "up"];
        a.rule = [9 * U, 1.2 * U, "up"];
        a.out = [16.2 * U, mid - U, "up"];
        return a;
    },
    describe: () =>
        "A function machine: a box with a rule written on it, an arrow in from a card on the left and an arrow out to a card on the right.",
});
