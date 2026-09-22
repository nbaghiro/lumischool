import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, slot, wide } from "../lettering";
import { sign } from "./sign";

export const compareSigns = defineDrawing({
    id: "compare",
    family: "counting",
    title: "Which is bigger",
    group: "Inputs",
    about: "Two numbers with a box between them for the sign, or the sign already written in. The sign is drawn as two strokes at a size nothing else on the page uses, because which way it points is the answer.",
    params: { left: "34", right: "43", sign: "?" },
    settings: {
        left: { kind: "text", most: 6 },
        right: { kind: "text", most: 6 },
        sign: { kind: "one of", of: ["?", "<", ">", "="] },
    },
    takes: [
        { label: "A sign to write in", params: { left: "34", right: "43", sign: "?" } },
        { label: "Less than", params: { left: "34", right: "43", sign: "<" } },
        { label: "Equal", params: { left: "6 + 4", right: "10", sign: "=" } },
        { label: "Three digits", params: { left: "408", right: "480", sign: "?" } },
    ],
    box: (p) => ({
        w: Math.ceil(wide(p.left, 34) / U) + Math.ceil(wide(p.right, 34) / U) + 11,
        h: 6,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 3 * U,
            a: RawAnchors = {};
        const lw = Math.max(3, Math.ceil(wide(p.left, 34) / U) + 2) * U;
        const rw = Math.max(3, Math.ceil(wide(p.right, 34) / U) + 2) * U;
        pen.path(g, roundedRect(U, U, lw, 4 * U, 8), "ruler", pen.fill("card"), { strokeWidth: 2 });
        num(c, U + lw / 2, y + 0.6 * U, p.left, 34);
        const mx = U + lw + 2.5 * U;
        if (p.sign === "?") slot(c, mx - 1.5 * U, 1.6 * U, 3 * U, 2.8 * U);
        else sign(c, mx, y, p.sign);
        const rx = U + lw + 5 * U;
        pen.path(g, roundedRect(rx, U, rw, 4 * U, 8), "ruler", pen.fill("card"), {
            strokeWidth: 2,
        });
        num(c, rx + rw / 2, y + 0.6 * U, p.right, 34);
        a.left = [U + lw / 2, U, "up"];
        a.sign = [mx, 1.6 * U, "up"];
        a.right = [rx + rw / 2, U, "up"];
        return a;
    },
    describe: (p) =>
        `Two numbers written large on white cards side by side${p.sign === "?" ? ", with an empty box between them for a sign" : ", with a sign drawn between them in two strokes"}.`,
});
