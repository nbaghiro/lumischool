import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

export const numberLadder = defineDrawing({
    id: "ladder",
    family: "counting",
    title: "Number ladder",
    group: "Structures",
    about: "A scale standing up with values pegged onto it at the right height. Up the page is more, which is the direction a bar chart uses and the one a number line does not.",
    params: {
        from: 0,
        to: 100,
        step: 20,
        marks: [
            { at: 65, label: "Ann" },
            { at: 30, label: "Ben" },
        ] as { at: number; label: string }[],
    },
    settings: {
        from: { kind: "whole", min: 0, max: 1000 },
        to: { kind: "whole", min: 1, max: 1000 },
        step: { kind: "whole", min: 1, max: 500 },
        marks: { kind: "fixed" },
    },
    takes: [
        {
            label: "Two pegs",
            params: {
                from: 0,
                to: 100,
                step: 20,
                marks: [
                    { at: 65, label: "Ann" },
                    { at: 30, label: "Ben" },
                ],
            },
        },
        {
            label: "A temperature",
            params: { from: -10, to: 30, step: 10, marks: [{ at: 18, label: "Today" }] },
        },
        { label: "Empty", params: { from: 0, to: 50, step: 10, marks: [] } },
    ],
    box: () => ({ w: 14, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x = 4.5 * U,
            top = U,
            bottom = 12.4 * U,
            span = p.to - p.from || 1,
            a: RawAnchors = {};
        const at = (v: number) =>
            bottom - ((Math.max(p.from, Math.min(v, p.to)) - p.from) / span) * (bottom - top);
        pen.line(g, x, top - 10, x, bottom + 10, "ruler", { strokeWidth: 2.6 });
        for (let v = p.from; v <= p.to; v += p.step / 2) {
            const y = at(v),
                major = (v - p.from) % p.step === 0;
            pen.line(g, x - (major ? 14 : 8), y, x + (major ? 14 : 8), y, "ruler", {
                strokeWidth: major ? 1.8 : 1,
            });
            if (major) {
                num(c, x - 22, y + 5, v, 15, "end");
                a[`mark(${v})`] = [x, y, "left"];
            }
        }
        p.marks.forEach((m, i) => {
            const y = at(m.at);
            pen.line(g, x + 14, y, x + 2.4 * U, y, "pencil", { strokeWidth: 1.6, stroke: c.t.pen });
            pen.path(
                g,
                roundedRect(x + 2.4 * U, y - 0.8 * U, 5.6 * U, 1.6 * U, 6),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            say(c, x + 2.9 * U, y + 6, m.label, 16, "start");
            num(c, x + 7.7 * U, y + 6, m.at, 16, "end");
            a[`peg(${i})`] = [x + 2.4 * U, y, "left"];
        });
        return a;
    },
    describe: () =>
        "A vertical scale with numbers up its left side and labelled pegs hooked onto it at their values, each peg a white card with a name and a number.",
});
