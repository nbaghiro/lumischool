import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, say } from "../lettering";
import { rings } from "./sound";

/** The bands as a question reads them: lengths in squares, and a thickness for each, 1 to 3. */
export function bandsOf(p: {
    lengths: readonly number[];
    thick: readonly number[];
}): { length: number; thick: number }[] {
    return p.lengths.slice(0, 4).map((l, i) => ({
        length: Math.max(3, Math.min(14, Math.round(l))),
        thick: Math.max(1, Math.min(3, Math.round(p.thick[i] ?? 1))),
    }));
}

export const bands = defineDrawing({
    id: "bands",
    family: "science",
    title: "Stretched bands",
    group: "Structures",
    about: "Bands stretched along a board, each held down by its own bridge, so the part that shakes when it is plucked is a different length for each. With the same thickness, the shorter the shaking part, the higher the note. A plucked band is drawn blurred with rings coming off it, and a hard pluck shakes it wider and sends out more rings than a gentle one. Thickness is 1 to 3, so a fair test of length keeps it the same.",
    params: { lengths: [12, 9, 6], thick: [1, 1, 1], pluck: -1, loud: 1, letters: 1 },
    settings: {
        lengths: { kind: "numbers", min: 3, max: 14, most: 4 },
        thick: { kind: "numbers", min: 1, max: 3, most: 4 },
        pluck: { kind: "whole", min: -1, max: 3 },
        loud: { kind: "whole", min: 1, max: 2 },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Three lengths",
            params: { lengths: [12, 9, 6], thick: [1, 1, 1], pluck: -1, loud: 1, letters: 1 },
        },
        {
            label: "The middle one plucked",
            params: { lengths: [12, 9, 6], thick: [1, 1, 1], pluck: 1, loud: 1, letters: 1 },
        },
        {
            label: "Plucked hard",
            params: { lengths: [12, 9, 6], thick: [1, 1, 1], pluck: 0, loud: 2, letters: 1 },
        },
        {
            label: "Thick and thin",
            params: {
                lengths: [10, 10, 7, 5],
                thick: [1, 3, 2, 1],
                pluck: -1,
                loud: 1,
                letters: 1,
            },
        },
    ],
    box: (p) => ({ w: 20, h: Math.ceil(Math.max(1, Math.min(4, p.lengths.length)) * 2.2 + 3.4) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            list = bandsOf(p),
            nut = 2.4 * U,
            right = 18.6 * U,
            top = 1.8 * U;
        const H = list.length * 2.2 * U + 0.4 * U;
        // on paper the board is left white: a wood colour prints as cross-hatching and would bury the bands
        pen.path(
            g,
            roundedRect(1.2 * U, top, 18.4 * U, H, 10),
            "pencil",
            c.paper
                ? pen.fill("card")
                : pen.fill("tang", "hachure", { hachureGap: 11, fillWeight: 0.5 }),
            { strokeWidth: 2 },
        );
        pen.rect(
            g,
            nut - 0.3 * U,
            top + 0.2 * U,
            0.3 * U,
            H - 0.4 * U,
            "ruler",
            pen.fill("ink-soft"),
            { strokeWidth: 1.4 },
        );
        const loud = p.loud > 1 ? 2 : 1;
        list.forEach((b, i) => {
            const y = top + (i + 0.6) * 2.2 * U,
                end = nut + b.length * U,
                w = [1.6, 2.6, 3.8][b.thick - 1] ?? 2.6;
            // the part beyond the bridge does not shake, so it is drawn quieter
            pen.line(g, end, y, right, y, "ruler", {
                strokeWidth: w * 0.7,
                stroke: c.t["ink-soft"],
            });
            pen.circle(g, right, y, 9, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
            if (i === Math.round(p.pluck)) {
                const amp = (loud > 1 ? 0.7 : 0.35) * U,
                    mid = (nut + end) / 2;
                pen.path(
                    g,
                    `M${nut} ${y}Q${mid} ${y - amp * 2} ${end} ${y}Q${mid} ${y + amp * 2} ${nut} ${y}Z`,
                    "pencil",
                    pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
                    { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
                );
                pen.line(g, nut, y, end, y, "ruler", { strokeWidth: w });
                rings(c, mid, y - amp, loud === 2 ? 3 : 2, -Math.PI / 2, 0.75);
            } else pen.line(g, nut, y, end, y, "ruler", { strokeWidth: w });
            pen.polygon(
                g,
                [
                    [end - 0.45 * U, y + 0.75 * U],
                    [end + 0.45 * U, y + 0.75 * U],
                    [end, y - 0.05 * U],
                ],
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            if (p.letters > 0) say(c, 0.6 * U, y + 6, "ABCD"[i] ?? "?", 16);
            a[`band(${i})`] = [(nut + end) / 2, y - 0.4 * U, "up"];
        });
        cap(
            c,
            10.4 * U,
            top + H + 1.1 * U,
            "the shaking part runs from the left to its bridge",
            10,
        );
        return a;
    },
    describe: (p) =>
        `Rubber bands stretched along a board, each held by its own bridge so a different length of each can shake${p.pluck >= 0 ? ", one plucked, blurred, with rings of sound coming off it" : ""}.`,
    reads: true,
});
