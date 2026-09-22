import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

type Pt = [number, number];

export const inequalityLine = defineDrawing({
    id: "inequality",
    family: "counting",
    title: "All the numbers that",
    group: "Structures",
    about: "A number line with everything past a point shaded and a ring at the point itself, hollow when it is not included. It is the picture that turns a sentence about many numbers into one thing.",
    params: { from: 0, to: 10, value: 6, dir: ">", closed: false },
    settings: {
        from: { kind: "whole", min: -20, max: 100 },
        to: { kind: "whole", min: -20, max: 100 },
        value: { kind: "whole", min: -20, max: 100 },
        dir: { kind: "one of", of: [">", "<", ">=", "<="] },
        closed: { kind: "flag" },
    },
    takes: [
        { label: "More than six", params: { from: 0, to: 10, value: 6, dir: ">", closed: false } },
        { label: "Six or more", params: { from: 0, to: 10, value: 6, dir: ">", closed: true } },
        { label: "Less than four", params: { from: 0, to: 10, value: 4, dir: "<", closed: false } },
    ],
    box: (p) => ({ w: p.to - p.from + 4, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 4 * U,
            a: RawAnchors = {};
        const x = (v: number) => 2 * U + (v - p.from) * U;
        pen.line(g, x(p.from) - 14, y, x(p.to) + 14, y, "ruler", { strokeWidth: 2.2 });
        for (let v = p.from; v <= p.to; v++) {
            pen.line(g, x(v), y - 7, x(v), y + 7, "ruler", { strokeWidth: 1.4 });
            num(c, x(v), y + 28, v, 14);
        }
        const more = p.dir === ">" || p.dir === ">=";
        const from: Pt = [x(p.value), y - 0.9 * U],
            to: Pt = [more ? x(p.to) + 14 : x(p.from) - 14, y - 0.9 * U];
        pen.line(g, from[0], from[1], to[0], to[1], "ruler", { strokeWidth: 4, stroke: c.t.ink });
        const t = more ? 0 : Math.PI;
        for (const s of [-0.45, 0.45])
            pen.line(
                g,
                to[0],
                to[1],
                to[0] - 16 * Math.cos(t + s),
                to[1] - 16 * Math.sin(t + s),
                "ruler",
                { strokeWidth: 3 },
            );
        pen.circle(
            g,
            x(p.value),
            y - 0.9 * U,
            17,
            "ruler",
            p.closed ? { fill: c.t.ink, fillStyle: "solid" } : pen.fill("card"),
            { strokeWidth: 2.4 },
        );
        say(
            c,
            x(p.value),
            y - 2.2 * U,
            `${more ? "more than" : "less than"} ${p.value}${p.closed ? " or equal" : ""}`,
            15,
        );
        a.point = [x(p.value), y - 0.9 * U, "up"];
        a.arrow = [to[0], to[1], more ? "right" : "left"];
        return a;
    },
    describe: () =>
        "A number line with numbers under every tick, a thick line shaded above it to one end with an arrow, a ring at the start and words above.",
});
