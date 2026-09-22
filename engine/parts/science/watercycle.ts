import { type Ctx, type RawAnchors } from "../../ink/surface";
import { type Fill } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned, say } from "../lettering";
import { type Pt, lightFill } from "./apparatus";
import { CYCLE } from "./substances";

/** A cloud from overlapping puffs, `w` wide with its flat base on `base`. */
function cloudShape<G>(c: Ctx<G>, x: number, base: number, w: number, fill: Fill): void {
    const h = w * 0.42;
    c.pen.path(
        c.g,
        `M${x - w / 2} ${base}Q${x - w / 2 - 6} ${base - h * 0.55} ${x - w * 0.28} ${base - h * 0.6}Q${x - w * 0.22} ${base - h * 1.1} ${x} ${base - h}Q${x + w * 0.2} ${base - h * 1.25} ${x + w * 0.32} ${base - h * 0.7}Q${x + w / 2 + 8} ${base - h * 0.6} ${x + w / 2} ${base}Z`,
        "pencil",
        fill,
        { strokeWidth: 1.8 },
    );
}

export const watercycle = defineDrawing({
    id: "watercycle",
    family: "science",
    title: "The water cycle",
    group: "Structures",
    about: "The sea, the sun, clouds, rain on the hills and a river running back to the sea, with the four stages numbered where they happen: water evaporating from the sea, the vapour condensing into cloud, rain falling, and the water collecting in the river and back in the sea. A key underneath names each number, in England's words or, with `plain`, in a child's; `blank` puts a question mark in place of one name.",
    params: { blank: -1, key: 1, plain: 0 },
    settings: {
        blank: { kind: "whole", min: -1, max: 3 },
        key: { kind: "whole", min: 0, max: 1 },
        plain: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "The four stages", params: { blank: -1, key: 1, plain: 0 } },
        { label: "In plain words", params: { blank: -1, key: 1, plain: 1 } },
        { label: "Which one is missing?", params: { blank: 1, key: 1, plain: 0 } },
    ],
    box: (p) => ({ w: 20, h: p.key > 0 ? 16 : 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            ground = 10.6 * U,
            seaTop = 10 * U;
        // the sea, then the land over its right-hand edge, and the river running down to it
        pen.path(
            g,
            `M${14.4 * U} ${6.9 * U}Q${13.4 * U} ${8.2 * U} ${12.4 * U} ${8.6 * U}Q${10.8 * U} ${9.2 * U} ${9.6 * U} ${10.3 * U}L${8.6 * U} ${10.5 * U}L${8.9 * U} ${10.9 * U}L${10 * U} ${10.6 * U}Q${11.2 * U} ${9.6 * U} ${12.7 * U} ${9 * U}Q${13.8 * U} ${8.5 * U} ${14.7 * U} ${7.1 * U}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.4 },
        );
        pen.path(
            g,
            `M${0.3 * U} ${seaTop}Q${2.2 * U} ${seaTop - 0.25 * U} ${4.2 * U} ${seaTop}Q${6.2 * U} ${seaTop + 0.25 * U} ${10.4 * U} ${seaTop}V${ground + 1.2 * U}H${0.3 * U}Z`,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5 }),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            `M${8.6 * U} ${ground}L${11.5 * U} ${ground - 0.4 * U}Q${13.5 * U} ${6.8 * U} ${15.8 * U} ${5.6 * U}Q${17.2 * U} ${5.1 * U} ${18.2 * U} ${6.4 * U}L${19.8 * U} ${7.6 * U}V${ground + 1.2 * U}H${8.6 * U}Z`,
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 6 }),
            { strokeWidth: 2 },
        );
        for (const x of [1.4, 3.6, 6.2])
            pen.curve(
                g,
                [
                    [x * U, seaTop + 0.6 * U],
                    [(x + 0.4) * U, seaTop + 0.4 * U],
                    [(x + 0.8) * U, seaTop + 0.6 * U],
                ],
                "pencil",
                { strokeWidth: 1.2 },
            );
        pen.arrow(g, [11.6 * U, 9.3 * U], [10.2 * U, 10.1 * U], t.pen, 0.1);
        // the sun, the vapour rising, the clouds and the rain
        for (let k = 0; k < 8; k++) {
            const th = (k / 8) * Math.PI * 2;
            pen.line(
                g,
                2 * U + Math.cos(th) * 1.25 * U,
                2 * U + Math.sin(th) * 1.25 * U,
                2 * U + Math.cos(th) * 1.7 * U,
                2 * U + Math.sin(th) * 1.7 * U,
                "pencil",
                { strokeWidth: 1.6 },
            );
        }
        pen.circle(g, 2 * U, 2 * U, 2 * U, "pencil", lightFill(c, "glow", "solid"), {
            strokeWidth: 1.8,
        });
        for (const x of [2.6, 4.6, 6.6]) {
            const pts: Pt[] = [];
            for (let k = 0; k <= 8; k++)
                pts.push([
                    x * U + Math.sin(k * 1.1) * 0.25 * U + k * 0.12 * U,
                    (9.5 - k * 0.55) * U,
                ]);
            pen.curve(g, pts, "pencil", {
                strokeWidth: 1.6,
                stroke: t.pen,
                strokeLineDash: [5, 4],
            });
            const [ex, ey] = pts[pts.length - 1] ?? [0, 0];
            pen.line(g, ex, ey, ex - 5, ey + 7, "pencil", { strokeWidth: 1.6, stroke: t.pen });
            pen.line(g, ex, ey, ex + 6, ey + 5, "pencil", { strokeWidth: 1.6, stroke: t.pen });
        }
        cloudShape(c, 9.8 * U, 3.4 * U, 5.4 * U, pen.fill("card"));
        cloudShape(
            c,
            16 * U,
            3.3 * U,
            4.6 * U,
            pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
        );
        pen.arrow(g, [12.6 * U, 2.4 * U], [13.6 * U, 2.4 * U], t.pen, 0);
        for (let k = 0; k < 7; k++)
            pen.line(
                g,
                (14.2 + k * 0.55) * U,
                3.8 * U,
                (13.9 + k * 0.55) * U,
                (4.9 + (k % 3) * 0.3) * U,
                "pencil",
                { strokeWidth: 1.5, stroke: t.pen },
            );
        // the numbers where each stage happens
        const at: Pt[] = [
            [5.4 * U, 7.8 * U],
            [9.8 * U, 1.1 * U],
            [18.6 * U, 4.4 * U],
            [11.4 * U, 10.2 * U],
        ];
        at.forEach(([x, y], i) => {
            pen.circle(g, x, y, 1.15 * U, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
            num(c, x, y + 6, i + 1, 16);
            a[`stage(${i + 1})`] = [x, y - 0.6 * U, "up"];
        });
        if (p.key > 0) {
            pen.line(g, 0.3 * U, 12.4 * U, 19.7 * U, 12.4 * U, "pencil", {
                strokeWidth: 1,
                stroke: t["ink-soft"],
            });
            CYCLE.forEach((stage, i) => {
                const x = (i % 2 ? 10.3 : 0.6) * U,
                    y = (i < 2 ? 13.6 : 15.1) * U;
                pen.circle(g, x + 0.5 * U, y - 0.3 * U, 0.95 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.4,
                });
                num(c, x + 0.5 * U, y + 0.05 * U, i + 1, 13);
                if (i === Math.round(p.blank)) {
                    pen.rect(g, x + 1.3 * U, y - 0.95 * U, 7.6 * U, 1.3 * U, "ruler", null, {
                        strokeWidth: 1.6,
                    });
                    penned(c, x + 5.1 * U, y + 0.1 * U, "?", 20);
                } else
                    say(
                        c,
                        x + 1.3 * U,
                        y + 0.05 * U,
                        p.plain > 0 ? stage.plain : stage.name,
                        15,
                        "start",
                    );
            });
        }
        return a;
    },
    describe: (p) =>
        `The sea, the sun, clouds, rain on hills and a river running back, with four numbers placed where each stage happens${p.key > 0 ? ", a numbered key underneath" : ""}${p.blank >= 0 ? " with one line blank" : ""}.`,
    reads: true,
});
