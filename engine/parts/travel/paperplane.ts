import { plain, clip, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/**
 * A paper plane seen from above, folded from a page of the squared book so the grid shows through
 * its wings. It points right. `bank` narrows one wing and widens the other, as a plane turning looks
 * from above. The journal's map flies it (src/world/flight.ts).
 */
export const paperPlane = defineDrawing({
    id: "paperplane",
    family: "travel",
    title: "Paper plane",
    group: "Props",
    about: "A paper plane from above, folded from squared paper: two wings either side of the centre crease and a narrow keel under the nose. The two wings are the same shape, which makes it a picture of a line of symmetry that flies.",
    params: { bank: 0 },
    settings: { bank: { kind: "number", min: -1, max: 1, step: 0.5 } },
    takes: [
        { label: "Flying straight", params: { bank: 0 } },
        { label: "Banking into a turn", params: { bank: 0.8 } },
    ],
    box: () => ({ w: 6, h: 4 }),
    draw: (c, p) => {
        const { pen, g, t } = c,
            bank = Math.max(-1, Math.min(1, Number(p.bank) || 0)),
            a: RawAnchors = {};
        const nose: Pt = [5.8 * U, 2 * U],
            tail: Pt = [0.9 * U, 2 * U];
        const top: Pt = [0.3 * U, (2 - 1.75 * (1 + bank * 0.45)) * U],
            bottom: Pt = [0.3 * U, (2 + 1.75 * (1 - bank * 0.45)) * U];
        const wings: Pt[][] = [
            [nose, top, tail],
            [nose, tail, bottom],
        ];
        wings.forEach((w) => {
            pen.polygon(g, w, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
            if (c.paper) return;
            // the squared page showing through, clipped to the wing
            const grid = clip(c, { kind: "polygon", points: w });
            for (let v = 0; v <= 6 * U; v += U / 2) {
                plain(grid, {
                    kind: "path",
                    d: `M${v} 0V${4 * U}`,
                    stroke: t.grid,
                    width: 0.6,
                    fill: "none",
                });
                if (v <= 4 * U)
                    plain(grid, {
                        kind: "path",
                        d: `M0 ${v}H${6 * U}`,
                        stroke: t.grid,
                        width: 0.6,
                        fill: "none",
                    });
            }
        });
        // the underside of the lower wing's fold in shade, the keel, and the creases
        pen.polygon(
            g,
            [nose, tail, [1.9 * U, (2 + 0.55 * (1 - bank * 0.45)) * U]],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1 },
        );
        pen.polygon(g, [nose, [1.2 * U, 1.78 * U], [1.2 * U, 2.22 * U]], "ruler", pen.fill("sky"), {
            strokeWidth: 1.2,
        });
        pen.line(g, nose[0], nose[1], tail[0], tail[1], "ruler", { strokeWidth: 1.2 });
        for (const w of [top, bottom])
            pen.line(g, nose[0], nose[1], 1.7 * U, w[1] + (2 * U - w[1]) * 0.35, "ruler", {
                strokeWidth: 0.8,
            });
        a.nose = [nose[0], nose[1], "right"];
        a.tail = [tail[0], tail[1], "left"];
        return a;
    },
    describe: () =>
        "A paper plane seen from above pointing right, folded from squared paper so the grid shows through its two wings, with a crease down the middle.",
});
