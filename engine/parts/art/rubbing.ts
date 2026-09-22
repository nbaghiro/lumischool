import { type Fill } from "../../ink/pen";
import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { PIGMENTS, colourOf, nameOf, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { cap, num } from "../lettering";

/** A leaf with a stalk and `veins` pairs of side veins, pointing up, `h` tall. */
function leafShape<G>(
    c: Ctx<G>,
    cx: number,
    top: number,
    h: number,
    veins: number,
    o: { fill: Fill; stroke?: string; width?: number },
): void {
    const { pen, g } = c,
        w = h * 0.55,
        bottom = top + h * 0.86;
    pen.path(
        g,
        `M${cx} ${top}C${cx + w * 0.7} ${top + h * 0.2} ${cx + w * 0.62} ${top + h * 0.7} ${cx} ${bottom}C${cx - w * 0.62} ${top + h * 0.7} ${cx - w * 0.7} ${top + h * 0.2} ${cx} ${top}Z`,
        "pencil",
        o.fill,
        { strokeWidth: o.width ?? 1.8, stroke: o.stroke ?? c.t.ink },
    );
    const line = { strokeWidth: o.width ?? 1.4, stroke: o.stroke ?? c.t.ink };
    pen.line(g, cx, top + 6, cx, top + h, "pencil", line);
    const n = Math.max(1, Math.round(veins));
    for (let i = 0; i < n; i++) {
        const vy = top + h * (0.22 + (0.55 * (i + 0.5)) / n),
            reach = w * 0.42 * (1 - Math.abs(i + 0.5 - n / 2) / (n + 1));
        for (const s of [-1, 1]) pen.line(g, cx, vy, cx + s * reach, vy - h * 0.08, "pencil", line);
    }
}

export const rubbing = defineDrawing({
    id: "rubbing",
    family: "art",
    title: "Leaf rubbing",
    group: "Structures",
    about: "Three leaves, each with a different number of veins, and a rubbing made by laying paper over one of them and rubbing the side of a crayon across it. The rubbing shows the edge and the veins and nothing else, so which leaf made it is found by counting the veins.",
    params: { veins: [3, 5, 4], made: 1, colour: "green" },
    settings: {
        veins: { kind: "numbers", min: 1, max: 9, most: 3 },
        made: { kind: "whole", min: 0, max: 2 },
        colour: { kind: "one of", of: PIGMENTS },
    },
    takes: [
        { label: "Made by B", params: { veins: [3, 5, 4], made: 1, colour: "green" } },
        { label: "Made by C, in orange", params: { veins: [2, 3, 4], made: 2, colour: "orange" } },
    ],
    box: () => ({ w: 23, h: 9 }),
    draw: (c, p) => {
        const { pen } = c,
            a: RawAnchors = {},
            veins = p.veins.slice(0, 3);
        veins.forEach((v, i) => {
            const cx = (2 + i * 4) * U;
            leafShape(c, cx, 0.8 * U, 6 * U, v, { fill: c.pen.fill("mint") });
            num(c, cx, 8.6 * U, "ABC"[i] ?? "", 16);
            a[`leaf(${i})`] = [cx, 0.8 * U, "up"];
        });
        const made = veins[Math.max(0, Math.min(veins.length - 1, Math.round(p.made)))] ?? 3;
        const hex = colourOf(p.colour) ?? panColour("green");
        const rub = group(c, { turn: [["rotate", -3, 18 * U, 4.5 * U]] }),
            sheet = rub.g;
        pen.rect(sheet, 13.2 * U, 0.4 * U, 9.4 * U, 8 * U, "pencil", c.pen.fill("card"), {
            strokeWidth: 1.8,
        });
        // the crayon catches only where the leaf lifts the paper: the edge and the veins
        const deep = colourOf(`${p.colour} 3+black`) ?? hex;
        leafShape(rub, 17.9 * U, 1 * U, 6.8 * U, made, {
            fill: c.paper
                ? {
                      fill: c.t.ink,
                      fillStyle: "hachure",
                      hachureAngle: -30,
                      hachureGap: 3.2,
                      fillWeight: 0.9,
                  }
                : {
                      fill: hex,
                      fillStyle: "hachure",
                      hachureAngle: -30,
                      hachureGap: 2.6,
                      fillWeight: 1.6,
                  },
            stroke: c.paper ? c.t.ink : deep,
            width: 3.4,
        });
        for (let k = 0; k < 14; k++)
            pen.line(sheet, 13.8 * U + k * 12, 8.1 * U, 13.8 * U + k * 12 + 16, 7.4 * U, "doodle", {
                strokeWidth: 1.2,
                stroke: c.paper ? c.t["ink-soft"] : hex,
            });
        cap(c, 18 * U, 8.9 * U, "rubbing", 10);
        a.rubbing = [18 * U, 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `Three leaves lettered A, B and C, each with a different number of veins, and beside them a ${nameOf(colourOf(p.colour) ?? panColour("green")).name} crayon rubbing of one leaf on a tilted sheet.`,
});
