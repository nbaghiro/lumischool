import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const islandCave = defineDrawing<{ mouth: boolean }>({
    id: "islandcave",
    family: "outdoors",
    title: "Cave in the rocks",
    group: "Props",
    about: "A low hill of grey rocks seen a little from above, with a dark cave mouth opening at its foot, tufts of grass on its top and a few stones fallen beside it.",
    params: { mouth: true },
    settings: { mouth: { kind: "flag" } },
    takes: [
        { label: "With its cave", params: { mouth: true } },
        { label: "Just the rocks", params: { mouth: false } },
    ],
    box: () => ({ w: 8, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const foot = 4.6 * U;
        // three boulders run together into one hill, the middle one highest
        for (const [x, y, w] of [
            [0.4, 2.2, 3.6],
            [4, 2, 3.6],
            [1.8, 0.4, 4.6],
        ] as const) {
            const d = `M${x * U} ${foot}C${x * U} ${(y + 0.4) * U} ${(x + w * 0.25) * U} ${y * U} ${(x + w / 2) * U} ${y * U}C${(x + w * 0.8) * U} ${y * U} ${(x + w) * U} ${(y + 0.6) * U} ${(x + w) * U} ${foot}Z`;
            // white under each boulder, so the one in front hides the one behind it
            if (!c.paper) plain(c, { kind: "path", d, fill: c.t.card });
            pen.path(
                g,
                d,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 7, fillWeight: 0.6 }),
                {
                    strokeWidth: 1.6,
                },
            );
        }
        // the cracks and the light on the top, so it reads as rock and not as a heap
        for (const [x1, y1, x2, y2] of [
            [2.6, 1.6, 3.2, 2.6],
            [5.2, 1.4, 4.8, 2.2],
            [1.2, 3.2, 1.6, 3.9],
            [6.6, 3, 6.1, 3.8],
        ] as const)
            pen.line(g, x1 * U, y1 * U, x2 * U, y2 * U, "pencil", {
                strokeWidth: 1,
                roughness: 0.6,
            });
        for (const x of [3.2, 4.4])
            pen.line(g, x * U, 0.5 * U, (x + 0.15) * U, 0.05 * U, "pencil", {
                strokeWidth: 1.1,
                stroke: c.t.ok,
                roughness: 0.4,
            });
        if (p.mouth) {
            pen.path(
                g,
                `M${3 * U} ${foot}C${3 * U} ${2.6 * U} ${5 * U} ${2.6 * U} ${5 * U} ${foot}Z`,
                "pencil",
                pen.fill("ink", c.paper ? "hachure" : "solid", { hachureGap: 3 }),
                { strokeWidth: 1.8 },
            );
            a.mouth = [4 * U, foot, "down"];
        }
        for (const [x, r] of [
            [0.3, 0.25],
            [7.5, 0.3],
            [7.0, 0.18],
        ] as const)
            pen.circle(
                g,
                x * U,
                foot - r * U,
                r * 2 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                {
                    strokeWidth: 1.1,
                },
            );
        a.foot = [4 * U, foot, "down"];
        return a;
    },
    describe: (p) =>
        p.mouth
            ? "A low hill of grey rocks seen a little from above, with a dark cave mouth opening at its foot and grass growing on its top."
            : "A low hill of grey boulders run together, seen a little from above, with cracks in the rock and grass growing on its top.",
    motion: { still: "Rock does not move; a cave is somewhere to start counting from." },
});
