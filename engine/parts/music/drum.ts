import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const drum = defineDrawing({
    id: "drum",
    family: "music",
    title: "Drum",
    group: "Props",
    about: "A drum from the side, its skin stretched by cords that zigzag between the hoops and the lugs round its middle, with two sticks resting on top. One hit is one beat, and the lugs can be counted.",
    params: { lugs: 5 },
    settings: { lugs: { kind: "whole", min: 3, max: 8 } },
    takes: [
        { label: "Five lugs", params: { lugs: 5 } },
        { label: "Seven lugs", params: { lugs: 7 } },
    ],
    box: () => ({ w: 7, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(7, Math.round(p.lugs))),
            W = 7 * U,
            cx = W / 2,
            top = 2 * U,
            bottom = 5.3 * U,
            rx = 2.9 * U,
            ry = 0.7 * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${cx - rx} ${top}L${cx - rx} ${bottom}A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}L${cx + rx} ${top}Z`,
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 1.9 },
        );
        pen.ellipse(g, cx, top, rx * 2, ry * 2, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        for (const y of [top + 0.25 * U, bottom - 0.1 * U])
            pen.arc(g, cx, y, rx * 2, ry * 2, 0.05, Math.PI - 0.05, "pencil", {
                strokeWidth: 2.4,
                stroke: c.t.glow,
            });
        // the cords zigzag between the hoops, and a lug sits at each place they cross
        const pts: [number, number][] = [];
        for (let i = 0; i <= n * 2; i++) {
            const t = i / (n * 2),
                x = cx - rx * 0.92 + t * rx * 1.84,
                y =
                    i % 2
                        ? bottom - 0.15 * U + Math.sin(Math.PI * t) * ry * 0.8
                        : top + 0.4 * U + Math.sin(Math.PI * t) * ry * 0.8;
            pts.push([x, y]);
        }
        pen.linear(g, pts, "pencil", { strokeWidth: 1.2 });
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n,
                x = cx - rx * 0.92 + t * rx * 1.84,
                y = (top + bottom) / 2 + Math.sin(Math.PI * t) * ry * 0.8;
            pen.rect(g, x - 0.18 * U, y - 0.26 * U, 0.36 * U, 0.52 * U, "ruler", pen.fill("glow"), {
                strokeWidth: 1,
            });
            a[`lug(${i})`] = [x, y, "down"];
        }
        for (const [x0, x1] of [
            [cx - 2.4 * U, cx + 1.6 * U],
            [cx - 1.4 * U, cx + 2.6 * U],
        ] as const) {
            pen.line(
                g,
                x0,
                top - 1.4 * U + (x0 < cx - 2 * U ? 0 : 0.4 * U),
                x1,
                top - 0.1 * U - (x0 < cx - 2 * U ? 0.2 * U : 0),
                "pencil",
                { strokeWidth: 2.6, stroke: c.t.tang },
            );
        }
        a.skin = [cx, top - ry, "up"];
        return a;
    },
    describe: () =>
        "A drum seen from the side, its skin stretched by cords that zigzag between the hoops and the lugs round its middle, two sticks resting on top.",
});
