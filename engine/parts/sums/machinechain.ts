import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, slot } from "../lettering";
import { feed, hopper } from "./hopper";

export const machineChain = defineDrawing({
    id: "machinechain",
    family: "sums",
    title: "Two machines",
    group: "Structures",
    about: "Two rules one after the other, with the number between them shown or left blank. Getting the middle number is the step a child skips, so the drawing gives it a box of its own.",
    params: { rules: ["+ 2", "× 5"], input: "3", middle: "", output: "" },
    settings: {
        rules: { kind: "words", most: 2 },
        input: { kind: "text", most: 4 },
        middle: { kind: "text", most: 4 },
        output: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "Add then multiply",
            params: { rules: ["+ 2", "\u00d7 5"], input: "3", middle: "", output: "" },
        },
        {
            label: "Middle shown",
            params: { rules: ["\u00d7 4", "- 3"], input: "5", middle: "20", output: "17" },
        },
        {
            label: "Both blank",
            params: { rules: ["\u00d7 10", "- 7"], input: "4", middle: "", output: "" },
        },
    ],
    // Three machines in a row would run off a printed page, so the width is worked out honestly
    // and the caller is expected to keep to two.
    box: (p) => ({ w: Math.ceil(12.9 * p.rules.length + 3.4), h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            mid = 3.4 * U,
            a: RawAnchors = {};
        const box = (x: number, v: string, name: string) => {
            if (v) {
                pen.rect(g, x, mid - U, 2.4 * U, 2 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.8,
                });
                num(c, x + 1.2 * U, mid + 0.35 * U, v, 22);
            } else slot(c, x, mid - U, 2.4 * U, 2 * U);
            a[name] = [x + 1.2 * U, mid - U, "up"];
        };
        box(0.4 * U, p.input, "in");
        let x = 3.2 * U;
        p.rules.forEach((rule, i) => {
            feed(c, [x, mid], [x + 1.6 * U, mid]);
            hopper(c, x + 2 * U, 1.2 * U, 5 * U, 4.6 * U, rule);
            a[`rule(${i})`] = [x + 4.5 * U, 1.2 * U, "up"];
            x += 7 * U;
            feed(c, [x, mid], [x + 1.4 * U, mid]);
            if (i < p.rules.length - 1) {
                box(x + 1.7 * U, p.middle, `middle(${i})`);
                x += 4.5 * U;
            }
        });
        box(x + 1.7 * U, p.output, "out");
        return a;
    },
    describe: () =>
        "Two function machines in a row, each a box with a rule on it, joined by arrows with a card between them and a card at each end.",
});
