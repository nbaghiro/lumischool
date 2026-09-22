import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { MOTIF_NAMES, motif } from "./kit";

export const printRow = defineDrawing({
    id: "printrow",
    family: "art",
    title: "A printed repeat",
    group: "Structures",
    about: "Prints from the blocks laid along a strip in a unit that comes round again (leaf, star, leaf, star) with one print left out for the child to name, or one print (counted from 1) printed with the wrong block for the child to find. A border or a length of printed cloth is made this way, one unit after another. The shapes differ, so the pattern reads on paper as well as in colour.",
    params: {
        unit: ["leaf", "star"],
        colours: ["green", "orange"],
        count: 8,
        missing: 6,
        wrong: 0,
    },
    settings: {
        unit: { kind: "words", of: MOTIF_NAMES, most: 4 },
        colours: { kind: "words", most: 4 },
        count: { kind: "whole", min: 2, max: 11 },
        missing: { kind: "whole", min: -1, max: 11 },
        wrong: { kind: "whole", min: 0, max: 11 },
    },
    takes: [
        {
            label: "Leaf, star, the sixth left out",
            params: {
                unit: ["leaf", "star"],
                colours: ["green", "orange"],
                count: 8,
                missing: 6,
                wrong: 0,
            },
        },
        {
            label: "Fish, fish, shell",
            params: {
                unit: ["fish", "fish", "shell"],
                colours: ["blue", "blue", "pink"],
                count: 9,
                missing: 9,
                wrong: 0,
            },
        },
        {
            label: "Leaf, leaf, star, the seventh wrong",
            params: {
                unit: ["leaf", "leaf", "star"],
                colours: ["green", "green", "orange"],
                count: 9,
                missing: -1,
                wrong: 7,
            },
        },
    ],
    box: (p) => ({ w: Math.max(2, Math.round(p.count)) * 3 + 1, h: 4 }),
    draw: (c, p) => {
        const n = Math.max(2, Math.round(p.count)),
            unit = p.unit.length ? p.unit : ["leaf"],
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x = (0.5 + i * 3) * U,
                cx = x + 1.5 * U,
                cy = 2 * U;
            if (i + 1 === Math.round(p.missing)) {
                c.pen.path(
                    c.g,
                    roundedRect(x + 4, 0.35 * U, 3 * U - 8, 3.3 * U, 8),
                    "pencil",
                    null,
                    { strokeWidth: 1.8, strokeLineDash: [7, 6] },
                );
                num(c, cx, cy + 9, "?", 26, "middle", c.t.pen);
                a.gap = [cx, 0.35 * U, "up"];
            } else {
                // the wrong print uses the next block in the unit that is a different shape
                let k = i % unit.length;
                if (i + 1 === Math.round(p.wrong))
                    for (let d = 1; d < unit.length; d++)
                        if (unit[(k + d) % unit.length] !== unit[k]) {
                            k = (k + d) % unit.length;
                            break;
                        }
                const hex = colourOf(p.colours[k] ?? "") ?? panColour("blue");
                motif(c, unit[k] ?? "", cx, cy, 2.6 * U, {
                    fill: paintFill(c, hex, (2.6 * U) / 100),
                    outline: c.paper,
                    carve: c.t.card,
                });
            }
            a[`item(${i})`] = [cx, 0.35 * U, "up"];
        }
        return a;
    },
    describe: (p) => {
        const n = Math.max(2, Math.round(p.count)),
            shapes = [...new Set(p.unit.length ? p.unit : ["leaf"])];
        const named =
            shapes.length > 1
                ? `${shapes.slice(0, -1).join(", ")} and ${shapes[shapes.length - 1]}`
                : shapes[0];
        const gap =
            p.missing >= 1 && p.missing <= n ? ", one space left empty with a question mark" : "";
        return `A strip of ${n} paint prints in a row, ${named} shapes repeating along it${gap}.`;
    },
});
