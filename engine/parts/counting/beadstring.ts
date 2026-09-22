import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const beadString = defineDrawing({
    id: "beadstring",
    family: "counting",
    title: "Bead string",
    group: "Structures",
    about: "Beads on a string in alternating fives, one square each, so a number can be found by seeing the fives rather than counting from one. The cut shows how far along a value is.",
    params: { beads: 20, mark: 13 },
    settings: {
        beads: { kind: "whole", min: 5, max: 30 },
        mark: { kind: "whole", min: 0, max: 30 },
    },
    takes: [
        { label: "Twenty, cut at 13", params: { beads: 20, mark: 13 } },
        { label: "Ten", params: { beads: 10, mark: 7 } },
        { label: "Twenty, uncut", params: { beads: 20, mark: 0 } },
    ],
    box: (p) => ({ w: p.beads + 2, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 2 * U,
            a: RawAnchors = {};
        pen.line(g, 0.6 * U, y, (p.beads + 1.4) * U, y, "ruler", {
            strokeWidth: 1.4,
            stroke: c.t["ink-soft"],
        });
        for (let i = 0; i < p.beads; i++) {
            const x = (i + 1.5) * U,
                five = Math.floor(i / 5) % 2 === 0;
            // Sky against tang: those two hatch at different angles and in different styles, so the
            // fives are still two different things on a black and white printer.
            pen.circle(g, x, y, 17, "ruler", pen.fill(five ? "tang" : "sky"), { strokeWidth: 1.2 });
            a[`bead(${i + 1})`] = [x, y - 10, "up"];
        }
        if (p.mark > 0 && p.mark <= p.beads) {
            const mx = (p.mark + 1) * U;
            pen.line(g, mx, y - 26, mx, y + 26, "pencil", { strokeWidth: 2, stroke: c.t.pen });
            num(c, mx, y + 44, p.mark, 16, "middle", c.t.pen);
            a.cut = [mx, y + 26, "down"];
        }
        return a;
    },
    describe: () =>
        "Beads on a string in groups of five, orange and blue in turn, with a pencil line cut across the string and a number under it.",
});
