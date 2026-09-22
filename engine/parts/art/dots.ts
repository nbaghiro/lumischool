import { rng } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, lightness, nameOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";

export const dotPicture = defineDrawing({
    id: "dots",
    family: "art",
    title: "A picture in dots",
    group: "Props",
    about: "A picture painted only in small dots, the way Georges Seurat painted in the 1880s: the sun in two colours of dots side by side, the sea and the sky in others. From across the room the dots run together in the eye, which averages them, so red and yellow dots read as orange. A magnifying glass shows the separate dots.",
    params: { scene: "sun", colours: ["red", "yellow"], magnify: true },
    settings: {
        scene: { kind: "one of", of: ["sun", "tree"] },
        colours: { kind: "words", most: 2 },
        magnify: { kind: "flag" },
    },
    takes: [
        {
            label: "A sun of red and yellow dots",
            params: { scene: "sun", colours: ["red", "yellow"], magnify: true },
        },
        {
            label: "A tree of green and yellow dots",
            params: { scene: "tree", colours: ["green", "yellow"], magnify: true },
        },
        {
            label: "Without the glass",
            params: { scene: "sun", colours: ["red", "yellow"], magnify: false },
        },
    ],
    box: (p) => ({ w: p.magnify ? 20 : 13, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            rand = rng(4127),
            a: RawAnchors = {};
        const hexes = p.colours.map((s) => colourOf(s)).filter((h): h is string => !!h);
        const main = hexes.length ? hexes : [panColour("red"), panColour("yellow")];
        // printed in black, a dark colour is a solid dot and a light one a ring, so the two still tell apart
        const dot = (x: number, y: number, hex: string, r = 3.4) =>
            c.paper
                ? pen.circle(
                      g,
                      x,
                      y,
                      r * 1.6,
                      "ruler",
                      lightness(hex) < 0.75 ? { fill: c.t.ink, fillStyle: "solid" } : null,
                      { strokeWidth: 1 },
                  )
                : pen.circle(g, x, y, r * 2, "ruler", paintFill(c, hex), { strokeWidth: 0 });
        pen.rect(g, 0.5 * U, 0.5 * U, 12 * U, 9 * U, "pencil", c.pen.fill("card"), {
            strokeWidth: 2,
        });
        const inSun = (x: number, y: number) => Math.hypot(x - 8.4 * U, y - 3.4 * U) < 1.9 * U;
        const inTree = (x: number, y: number) => Math.hypot(x - 6.5 * U, y - 4 * U) < 2.6 * U;
        for (let y = 1 * U; y < 9.2 * U; y += 8)
            for (let x = 1 * U; x < 12.2 * U; x += 8) {
                const jx = x + (rand() - 0.5) * 4,
                    jy = y + (rand() - 0.5) * 4,
                    pick = rand();
                let hex: string;
                if (p.scene === "tree" && inTree(jx, jy))
                    hex = main[pick < 0.5 ? 0 : 1 % main.length] ?? panColour("red");
                else if (
                    p.scene === "tree" &&
                    jx > 6.1 * U &&
                    jx < 6.9 * U &&
                    jy > 6 * U &&
                    jy < 8 * U
                )
                    hex = panColour("brown");
                else if (p.scene === "sun" && inSun(jx, jy))
                    hex = main[pick < 0.5 ? 0 : 1 % main.length] ?? panColour("red");
                else if (jy > (p.scene === "tree" ? 7.6 : 6.4) * U)
                    hex =
                        p.scene === "tree"
                            ? pick < 0.6
                                ? panColour("green")
                                : panColour("yellow")
                            : pick < 0.6
                              ? panColour("blue")
                              : panColour("green");
                else hex = pick < 0.6 ? panColour("sky") : panColour("white");
                if (hex === panColour("white") && c.paper) continue;
                dot(jx, jy, hex);
            }
        a.picture = [6.5 * U, 0.5 * U, "up"];
        if (p.magnify) {
            const mx = 16.4 * U,
                my = 4 * U,
                R = 2.9 * U;
            pen.circle(g, mx, my, R * 2, "pencil", c.pen.fill("card"), { strokeWidth: 2.4 });
            (
                [
                    [-1, -1],
                    [0, -1],
                    [1, -1],
                    [-1, 0],
                    [0, 0],
                    [1, 0],
                    [-1, 1],
                    [0, 1],
                    [1, 1],
                ] as const
            ).forEach(([i, j], k) => {
                if (Math.hypot(i, j) > 1.3) return;
                dot(
                    mx + i * 0.95 * U,
                    my + j * 0.95 * U,
                    main[k % main.length] ?? panColour("red"),
                    0.38 * U,
                );
            });
            pen.line(g, mx + R * 0.72, my + R * 0.72, mx + R * 1.2, my + R * 1.2 + 10, "pencil", {
                strokeWidth: 7,
                stroke: c.paper ? c.t.ink : panColour("brown"),
            });
            pen.line(g, (p.scene === "tree" ? 8.8 : 10.2) * U, 3.6 * U, mx - R, my, "ruler", {
                strokeWidth: 1.2,
                strokeLineDash: [4, 5],
                stroke: c.t["ink-soft"],
            });
            a.glass = [mx, my - R, "up"];
        }
        return a;
    },
    describe: (p) => {
        const hexes = p.colours.map((s) => colourOf(s)).filter((h): h is string => h !== null);
        const names = (hexes.length ? hexes : [panColour("red"), panColour("yellow")]).map(
            (h) => nameOf(h).name,
        );
        const pair =
            names.length > 1
                ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
                : names[0];
        const scene =
            p.scene === "tree"
                ? `a tree of ${pair} dots on a lawn under the sky`
                : `a sun of ${pair} dots over sea and sky`;
        return `A picture made only of small dots, ${scene}${p.magnify ? ", and a magnifying glass showing the dots large" : ""}.`;
    },
});
