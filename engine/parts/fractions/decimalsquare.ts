import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

export const decimalSquare = defineDrawing({
    id: "decimalsquare",
    family: "fractions",
    title: "Hundred square in tenths",
    group: "Structures",
    about: "Ten by ten, shaded a column at a time for tenths and a cell at a time for hundredths, so 0.47 is four full columns and seven more cells. The value is written underneath in both ways.",
    params: { hundredths: 47, write: true },
    settings: { hundredths: { kind: "whole", min: 0, max: 100 }, write: { kind: "flag" } },
    takes: [
        { label: "0.47", params: { hundredths: 47, write: true } },
        { label: "Whole tenths", params: { hundredths: 60, write: true } },
        { label: "Just a few hundredths", params: { hundredths: 8, write: true } },
        { label: "Unwritten", params: { hundredths: 25, write: false } },
    ],
    box: () => ({ w: 12, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = U,
            x0 = U,
            y0 = U,
            n = Math.max(0, Math.min(100, p.hundredths));
        const cols = Math.floor(n / 10),
            rest = n % 10,
            a: RawAnchors = {};
        for (let k = 0; k < cols; k++) {
            pen.rect(
                g,
                x0 + k * s,
                y0,
                s,
                10 * s,
                "ruler",
                pen.fill("sky", "solid", { hachureGap: 5 }),
                { strokeWidth: 0 },
            );
        }
        for (let k = 0; k < rest; k++) {
            pen.rect(
                g,
                x0 + cols * s,
                y0 + k * s,
                s,
                s,
                "ruler",
                pen.fill("tang", "solid", { hachureGap: 4 }),
                { strokeWidth: 0 },
            );
        }
        for (let k = 1; k < 10; k++) {
            pen.line(g, x0 + k * s, y0, x0 + k * s, y0 + 10 * s, "ruler", {
                strokeWidth: k === 5 ? 1.4 : 0.8,
            });
            pen.line(g, x0, y0 + k * s, x0 + 10 * s, y0 + k * s, "ruler", {
                strokeWidth: k === 5 ? 1.4 : 0.8,
            });
            a[`column(${k})`] = [x0 + k * s - s / 2, y0, "up"];
        }
        pen.rect(g, x0, y0, 10 * s, 10 * s, "ruler", null, { strokeWidth: 2.6 });
        if (p.write) {
            say(c, 6 * U, 12.6 * U, `${cols} tenths and ${rest} hundredths`, 15);
            num(c, 6 * U, 13.7 * U, `${n}/100 = ${(n / 100).toFixed(2)} = ${n}%`, 17);
        }
        a.square = [6 * U, y0, "up"];
        a.written = [6 * U, 12 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A hundred square ruled ten by ten, shaded a column at a time in blue and then cell by cell in orange${p.write ? ", the value written under it three ways" : ""}.`,
});
