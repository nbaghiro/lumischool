import { plain, type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, lightFill, ellipsePath, crystal } from "./apparatus";

/** What each kind of grain looks like through a lens, and the words a question uses for it. */
const GRAINS: Record<string, { name: string; shape: string }> = {
    salt: { name: "salt", shape: "cubes" },
    sugar: { name: "sugar", shape: "slanted blocks" },
    sand: { name: "sand", shape: "rounded bits of rock" },
    flour: { name: "flour", shape: "fine dust" },
    rice: { name: "rice", shape: "long grains" },
};

export const magnifier = defineDrawing({
    id: "magnifier",
    family: "science",
    title: "Magnifying glass",
    group: "Structures",
    about: "A little heap of something on a saucer and a magnifying glass showing it close up: salt as tiny cubes, sugar as slanted blocks, sand as rounded bits of rock in different colours, flour as fine dust and rice as long grains. A powder pours like a liquid, and the lens is how a child sees that every grain of it is a solid with a shape. `count` is how many grains are in the lens, so a question can ask a count as well as a name.",
    params: { kind: "salt", count: 5 },
    settings: {
        kind: { kind: "one of", of: Object.keys(GRAINS) },
        count: { kind: "whole", min: 1, max: 9 },
    },
    takes: [
        { label: "Salt, cubes", params: { kind: "salt", count: 5 } },
        { label: "Sugar, slanted blocks", params: { kind: "sugar", count: 4 } },
        { label: "Sand, bits of rock", params: { kind: "sand", count: 7 } },
        { label: "Flour, fine dust", params: { kind: "flour", count: 5 } },
        { label: "Rice", params: { kind: "rice", count: 6 } },
    ],
    box: () => ({ w: 13, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t;
        const hx = 2.6 * U,
            hy = 8.7 * U,
            cx = 8.1 * U,
            cy = 4.3 * U,
            R = 3.7 * U;
        // the heap on its saucer, and where the lens is looking
        pen.ellipse(g, hx, hy + 0.2 * U, 4.2 * U, 1.2 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.ellipse(g, hx, hy + 0.15 * U, 3 * U, 0.7 * U, "pencil", null, {
            strokeWidth: 1,
            stroke: t["ink-soft"],
        });
        const heap =
            p.kind === "sand"
                ? lightFill(c, "tang", "hachure", 4)
                : p.kind === "rice"
                  ? pen.fill("card")
                  : pen.fill("card");
        pen.path(
            g,
            `M${hx - 1.2 * U} ${hy + 0.1 * U}Q${hx} ${hy - 1.1 * U} ${hx + 1.2 * U} ${hy + 0.1 * U}Z`,
            "pencil",
            heap,
            { strokeWidth: 1.5 },
        );
        const r0 = rng(7);
        for (let k = 0; k < 10; k++)
            pen.circle(
                g,
                hx + (r0() - 0.5) * 1.8 * U,
                hy - r0() * 0.55 * U,
                2.5,
                "pencil",
                { fill: t["ink-soft"], fillStyle: "solid" },
                { strokeWidth: 0.3 },
            );
        for (const [ex, ey] of [
            [cx - R * 0.98, cy + R * 0.2],
            [cx - R * 0.35, cy + R * 0.94],
        ] as Pt[])
            pen.line(g, hx + (ex < cx - R * 0.5 ? -0.6 : 0.6) * U, hy - 0.6 * U, ex, ey, "pencil", {
                strokeWidth: 1,
                strokeLineDash: [4, 5],
                stroke: t["ink-soft"],
            });
        // the handle, then the frame, then what the lens shows inside it
        const ang = Math.PI / 4,
            hx0 = cx + Math.cos(ang) * (R + 0.2 * U),
            hy0 = cy + Math.sin(ang) * (R + 0.2 * U);
        pen.path(
            g,
            `M${hx0 - 7} ${hy0 + 7}L${hx0 + 1.9 * U - 7} ${hy0 + 1.9 * U + 7}L${hx0 + 1.9 * U + 7} ${hy0 + 1.9 * U - 7}L${hx0 + 7} ${hy0 - 7}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.8 },
        );
        pen.circle(g, cx, cy, R * 2 + 12, "pencil", pen.fill("ink-soft"), { strokeWidth: 2 });
        pen.circle(g, cx, cy, R * 2, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        const n = Math.max(1, Math.min(9, Math.round(p.count))),
            r = rng(131 + n);
        const cols = n <= 2 ? n : n <= 4 ? 2 : 3,
            rows = Math.ceil(n / cols),
            s = (n <= 4 ? 1.55 : 1.2) * U;
        const places: Pt[] = [];
        for (let i = 0; i < n; i++) {
            const col = i % cols,
                row = Math.floor(i / cols),
                inRow = Math.min(cols, n - row * cols);
            places.push([
                cx + (col - (inRow - 1) / 2) * s * 1.45 + (r() - 0.5) * 0.25 * s,
                cy + (row - (rows - 1) / 2) * s * 1.3 + (r() - 0.5) * 0.25 * s,
            ]);
        }
        if (p.kind === "flour") {
            for (let k = 0; k < 70; k++) {
                const rr = Math.sqrt(r()) * R * 0.82,
                    th = r() * Math.PI * 2;
                pen.circle(
                    g,
                    cx + Math.cos(th) * rr,
                    cy + Math.sin(th) * rr,
                    2 + r() * 2.5,
                    "pencil",
                    { fill: t["ink-soft"], fillStyle: "solid" },
                    { strokeWidth: 0.3 },
                );
            }
            for (const [dx, dy] of [
                [-1, -0.6],
                [0.9, 0.7],
                [0.4, -1.2],
            ] as Pt[])
                pen.path(
                    g,
                    ellipsePath(cx + dx * U, cy + dy * U, 0.8 * U, 0.5 * U, 20),
                    "pencil",
                    pen.fill("ink-soft", "dots", { hachureGap: 4 }),
                    { strokeWidth: 1, stroke: t["ink-soft"] },
                );
        } else {
            places.forEach(([x, y], i) => {
                if (p.kind === "salt") crystal(c, x, y, s * 0.62, s * 0.62);
                else if (p.kind === "sugar")
                    crystal(c, x, y, s * 0.85, s * 0.45, s * 0.12 * (i % 2 ? 1 : -1));
                else if (p.kind === "rice")
                    pen.path(
                        g,
                        ellipsePath(x, y, s * 0.55, s * 0.2, -30 + r() * 60),
                        "pencil",
                        pen.fill("card"),
                        { strokeWidth: 1.5 },
                    );
                else {
                    const pts: Pt[] = [];
                    for (let k = 0; k < 8; k++) {
                        const th = (k / 8) * Math.PI * 2,
                            rr = s * (0.4 + r() * 0.14);
                        pts.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr * 0.85]);
                    }
                    const tones = [
                        lightFill(c, "tang", "hachure", 5),
                        pen.fill("card"),
                        lightFill(c, "glow", "hachure", 5),
                        pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                    ];
                    pen.polygon(g, pts, "pencil", tones[i % tones.length], { strokeWidth: 1.4 });
                }
            });
        }
        if (!c.paper)
            plain(c, {
                kind: "path",
                d: `M${cx - R * 0.72} ${cy - R * 0.2}A${R * 0.78} ${R * 0.78} 0 0 1 ${cx - R * 0.2} ${cy - R * 0.72}`,
                fill: "none",
                stroke: "#FFFFFF",
                width: 5,
                cap: "round",
                opacity: 0.85,
            });
        a.lens = [cx, cy - R, "up"];
        a.heap = [hx, hy - 1.2 * U, "up"];
        return a;
    },
    describe: () =>
        "A little heap of something on a saucer, and a magnifying glass beside it with its lens showing a few grains of it close up.",
    reads: true,
});
