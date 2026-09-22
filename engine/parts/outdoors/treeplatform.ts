import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/** A big pointed leaf from (x, y) along an angle, with its middle vein. */
function leaf<G>(c: Ctx<G>, x: number, y: number, len: number, wid: number, angle: number): void {
    const ca = Math.cos(angle),
        sa = Math.sin(angle),
        at = (t: number, o: number): Pt => [x + t * ca - o * sa, y + t * sa + o * ca],
        out: Pt[] = [];
    for (let i = 0; i <= 10; i++)
        out.push(at((i / 10) * len, (wid / 2) * Math.sin(Math.PI * Math.pow(i / 10, 0.7))));
    for (let i = 9; i >= 1; i--)
        out.push(at((i / 10) * len, -(wid / 2) * Math.sin(Math.PI * Math.pow(i / 10, 0.7))));
    c.pen.polygon(c.g, out, "pencil", c.pen.fill("mint"), { strokeWidth: 1.6 });
    c.pen.line(c.g, ...at(0.08 * len, 0), ...at(0.85 * len, 0), "pencil", { strokeWidth: 1 });
}

/** A basket woven in bands, its handle up, hanging or standing at (x, top). */
function basket<G>(c: Ctx<G>, x: number, top: number): void {
    const { pen, g } = c;
    pen.arc(g, x, top, 1.1 * U, 1.1 * U, Math.PI, Math.PI * 2, "pencil", { strokeWidth: 1.5 });
    pen.polygon(
        g,
        [
            [x - 0.75 * U, top],
            [x + 0.75 * U, top],
            [x + 0.55 * U, top + 1.05 * U],
            [x - 0.55 * U, top + 1.05 * U],
        ],
        "pencil",
        pen.fill("tang"),
        { strokeWidth: 1.7 },
    );
    for (const t of [0.35, 0.7])
        pen.line(
            g,
            x - (0.75 - t * 0.2) * U,
            top + t * U,
            x + (0.75 - t * 0.2) * U,
            top + t * U,
            "pencil",
            { strokeWidth: 1 },
        );
    for (let k = -2; k <= 2; k++)
        pen.line(g, x + k * 0.28 * U, top + 0.05 * U, x + k * 0.22 * U, top + U, "pencil", {
            strokeWidth: 0.8,
        });
}

export const treePlatform = defineDrawing({
    id: "treeplatform",
    family: "outdoors",
    title: "Tree platform",
    group: "Structures",
    about: "A very tall forest tree with roots spreading out from its foot, and high up a round wooden platform built round its trunk, with a rail, a rope ladder hanging down and big leaves overhead. A rope runs over a pulley on a branch to a basket, which stands on the ground by the roots or is hauled up beside the platform.",
    params: { basket: 0 },
    settings: { basket: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "The basket at the bottom", params: { basket: 0 } },
        { label: "The basket hauled up", params: { basket: 1 } },
    ],
    box: () => ({ w: 12, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            up = p.basket > 0,
            cx = 5.6 * U,
            ground = 14.7 * U,
            deck = 6.3 * U,
            a: RawAnchors = {};
        const wood = pen.fill("tang", "hachure", { hachureGap: 4.5, fillWeight: 0.7 });
        // the crown: three branches out from the top of the trunk, each ending in a fan of big leaves
        for (const [bx, by, ang] of [
            [1.9, 2.4, -2.75],
            [9.6, 2.1, -0.45],
            [5.9, 1.3, -1.55],
        ] as const) {
            pen.path(
                g,
                `M${cx - 0.3 * U} ${3.4 * U}Q${(cx + bx * U) / 2} ${((3.3 + by) / 2) * U - 0.5 * U} ${bx * U} ${by * U}L${bx * U} ${(by + 0.3) * U}Q${(cx + bx * U) / 2} ${((3.6 + by) / 2) * U - 0.3 * U} ${cx + 0.3 * U} ${3.8 * U}Z`,
                "pencil",
                wood,
                { strokeWidth: 1.4 },
            );
            for (const d of [-1.05, -0.5, 0, 0.5, 1.05])
                leaf(
                    c,
                    bx * U,
                    (by + 0.15) * U,
                    (Math.abs(d) > 0.8 ? 1.7 : 2.2) * U,
                    1 * U,
                    ang + d,
                );
        }
        // the branch out to the pulley
        pen.path(
            g,
            `M${cx + 0.4 * U} ${3.9 * U}Q${cx + 2.6 * U} ${3.35 * U} ${10.9 * U} ${3.25 * U}L${10.9 * U} ${3.7 * U}Q${cx + 2.6 * U} ${3.85 * U} ${cx + 0.4 * U} ${4.5 * U}Z`,
            "pencil",
            wood,
            { strokeWidth: 1.6 },
        );
        // the far side of the rail, behind the trunk
        pen.arc(g, cx, deck - 0.9 * U, 8 * U, 1.6 * U, Math.PI, Math.PI * 2, "pencil", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
        // the trunk, tall and a little flared, with its buttress roots
        const trunk = `M${cx - 0.5 * U} ${2.9 * U}L${cx + 0.5 * U} ${2.9 * U}Q${cx + 0.6 * U} ${9 * U} ${cx + 0.95 * U} ${12.3 * U}Q${cx + 2 * U} ${13.6 * U} ${cx + 3.3 * U} ${ground}L${cx - 3.3 * U} ${ground}Q${cx - 2 * U} ${13.6 * U} ${cx - 0.95 * U} ${12.3 * U}Q${cx - 0.6 * U} ${9 * U} ${cx - 0.5 * U} ${2.9 * U}Z`;
        pen.path(g, trunk, "pencil", pen.fill("card"), { stroke: "none" });
        pen.path(g, trunk, "pencil", wood, { strokeWidth: 1.8 });
        for (const s of [-1, 1])
            pen.curve(
                g,
                [
                    [cx + s * 0.35 * U, 12.4 * U],
                    [cx + s * 1.2 * U, 13.8 * U],
                    [cx + s * 1.7 * U, ground],
                ],
                "pencil",
                { strokeWidth: 1.2 },
            );
        for (const [dx, y0, y1] of [
            [-0.2, 7.6, 10.4],
            [0.25, 8.8, 11.6],
            [0.05, 3.8, 5.2],
        ] as const)
            pen.line(g, cx + dx * U, y0 * U, cx + (dx + 0.05) * U, y1 * U, "pencil", {
                strokeWidth: 1,
            });
        // the braces under the platform
        for (const s of [-1, 1])
            pen.line(
                g,
                cx + s * 0.45 * U,
                deck + 2.3 * U,
                cx + s * 3 * U,
                deck + 0.5 * U,
                "pencil",
                { strokeWidth: 2.6, stroke: c.t.tang },
            );
        for (const s of [-1, 1])
            pen.line(
                g,
                cx + s * 0.45 * U,
                deck + 2.3 * U,
                cx + s * 3 * U,
                deck + 0.5 * U,
                "pencil",
                { strokeWidth: 1.1 },
            );
        // the platform: its top seen a little from above, its planks, and its edge
        pen.path(
            g,
            `M${cx - 4 * U} ${deck}A${4 * U} ${0.8 * U} 0 0 0 ${cx + 4 * U} ${deck}L${cx + 4 * U} ${deck + 0.4 * U}A${4 * U} ${0.8 * U} 0 0 1 ${cx - 4 * U} ${deck + 0.4 * U}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.7 },
        );
        pen.ellipse(g, cx, deck, 8 * U, 1.6 * U, "pencil", pen.fill("card"), { strokeWidth: 1.7 });
        for (let k = -3; k <= 3; k++)
            if (k)
                pen.line(
                    g,
                    cx + k * 1.05 * U,
                    deck - 0.72 * U * Math.sqrt(1 - ((k * 1.05) / 4) ** 2),
                    cx + k * 1.05 * U,
                    deck + 0.72 * U * Math.sqrt(1 - ((k * 1.05) / 4) ** 2),
                    "pencil",
                    { strokeWidth: 0.9 },
                );
        pen.rect(g, cx - 0.55 * U, deck - 0.9 * U, 1.1 * U, 0.9 * U, "pencil", wood, {
            strokeWidth: 1.4,
        });
        // the near rail on its posts
        const rail = (t: number): Pt => [cx + Math.cos(t) * 4 * U, deck + Math.sin(t) * 0.8 * U];
        for (let k = 0; k <= 6; k++) {
            const [x, y] = rail((k / 6) * Math.PI);
            pen.line(g, x, y + 0.1 * U, x, y - 0.9 * U, "pencil", { strokeWidth: 1.6 });
        }
        pen.arc(g, cx, deck - 0.9 * U, 8 * U, 1.6 * U, 0, Math.PI, "pencil", { strokeWidth: 1.7 });
        // the rope ladder down from the platform's front
        const lx = cx - 2.2 * U,
            ly = deck + 0.9 * U;
        for (const dx of [-0.4, 0.4])
            pen.curve(
                g,
                [
                    [lx + dx * U, ly],
                    [lx + (dx + 0.08) * U, 10.5 * U],
                    [lx + (dx - 0.05) * U, 13.9 * U],
                ],
                "pencil",
                { strokeWidth: 1.2 },
            );
        for (let y = ly + 0.6 * U; y < 13.9 * U; y += 0.75 * U)
            pen.line(g, lx - 0.4 * U, y, lx + 0.42 * U, y + 2, "pencil", {
                strokeWidth: 2.2,
                stroke: c.t.tang,
            });
        // the pulley under the branch, the rope over it, one end tied to the rail and the other to the basket
        const px = 10.1 * U,
            py = 4.3 * U;
        pen.line(g, px, 3.55 * U, px, py - 0.35 * U, "pencil", { strokeWidth: 1.6 });
        pen.circle(g, px, py, 0.8 * U, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        pen.circle(g, px, py, 0.18 * U, "pencil", pen.fill("ink"), { strokeWidth: 0.8 });
        const top = up ? deck - 0.6 * U : ground - 1.05 * U;
        pen.line(g, px + 0.4 * U, py, px + 0.4 * U, top - 0.55 * U, "pencil", { strokeWidth: 1.2 });
        pen.linear(
            g,
            [
                [px - 0.4 * U, py],
                [px - 0.4 * U, deck - 1.4 * U],
                [cx + 3.7 * U, deck - 0.9 * U],
            ],
            "pencil",
            { strokeWidth: 1.2 },
        );
        basket(c, px + 0.4 * U, top);
        // the ground, and small plants round the roots
        pen.line(g, 0.2 * U, ground, 11.8 * U, ground, "pencil", { strokeWidth: 2 });
        for (const [x, s] of [
            [1.2, 1],
            [2.2, -1],
            [8.9, 1],
            [11.3, -1],
        ] as const)
            for (const ang of [-2.2, -1.6, -1]) {
                const t = ang + s * 0.1;
                pen.polygon(
                    g,
                    [
                        [x * U, ground],
                        [
                            x * U + Math.cos(t - 0.12) * 0.9 * U,
                            ground + Math.sin(t - 0.12) * 0.9 * U,
                        ],
                        [x * U + Math.cos(t) * 1.1 * U, ground + Math.sin(t) * 1.1 * U],
                        [
                            x * U + Math.cos(t + 0.12) * 0.9 * U,
                            ground + Math.sin(t + 0.12) * 0.9 * U,
                        ],
                    ],
                    "pencil",
                    pen.fill("mint"),
                    { strokeWidth: 1 },
                );
            }
        a.platform = [cx, deck - 1.2 * U, "up"];
        a.basket = [px + 0.4 * U, top, "up"];
        a.ladder = [lx, 13.9 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A tall tree with a round wooden platform high round its trunk, a rope ladder hanging down and a basket on a rope over a pulley, ${p.basket > 0 ? "hauled up beside it" : "standing by the roots"}.`,
    motion: { still: "A platform is built into its tree, and its basket is read as up or down." },
});
