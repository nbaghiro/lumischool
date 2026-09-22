import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { loop } from "../marks";
import { glyph } from "./glyphs";

export const alphabetLine = defineDrawing({
    id: "alphabet",
    family: "letters",
    title: "Alphabet line",
    group: "Structures",
    about: 'The alphabet on one line at one letter to a square, so "three letters after m" is a count along rather than a recital from the beginning.',
    params: { from: 0, to: 25, mark: "m", capitals: false },
    settings: {
        from: { kind: "whole", min: 0, max: 25 },
        to: { kind: "whole", min: 0, max: 25 },
        mark: { kind: "text", most: 1 },
        capitals: { kind: "flag" },
    },
    takes: [
        { label: "a to z, m marked", params: { from: 0, to: 25, mark: "m", capitals: false } },
        { label: "a to m", params: { from: 0, to: 12, mark: "f", capitals: false } },
        { label: "Capitals", params: { from: 0, to: 25, mark: "", capitals: true } },
    ],
    box: (p) => ({ w: p.to - p.from + 3, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const all = "abcdefghijklmnopqrstuvwxyz".slice(p.from, p.to + 1);
        pen.rect(g, U, 1.6 * U, all.length * U, 1.8 * U, "ruler", pen.fill("card"), {
            strokeWidth: 2,
        });
        Array.from(all).forEach((ch, i) => {
            const x = U + (i + 0.5) * U;
            if (i)
                pen.line(g, U + i * U, 1.6 * U, U + i * U, 3.4 * U, "ruler", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
            glyph(c, x, 3 * U, p.capitals ? ch.toUpperCase() : ch, 17);
            if (ch === p.mark) loop(c, x, 2.5 * U, U + 6, 1.8 * U + 6);
            a[`letter(${ch})`] = [x, 1.6 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A run of the alphabet written along one line, one letter to a square with a tick between each${p.mark ? ", one letter ringed to count along from" : ""}.`,
});
