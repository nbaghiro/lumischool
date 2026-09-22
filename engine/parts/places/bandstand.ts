import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const bandstand = defineDrawing({
    id: "bandstand",
    family: "places",
    title: "Bandstand",
    group: "Structures",
    about: "A bandstand in a park: a raised floor with a railing, posts standing evenly round it and a pointed roof with a scalloped edge, with a few notes of music going up. The posts can be counted, and seen from the side a stand of eight shows five.",
    params: { posts: 5, notes: 3 },
    settings: {
        posts: { kind: "whole", min: 3, max: 7 },
        notes: { kind: "whole", min: 0, max: 4 },
    },
    takes: [
        { label: "Five posts, three notes", params: { posts: 5, notes: 3 } },
        { label: "Seven posts, quiet", params: { posts: 7, notes: 0 } },
    ],
    box: () => ({ w: 10, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(7, Math.round(p.posts))),
            notes = Math.max(0, Math.min(4, Math.round(p.notes)));
        const W = 10 * U,
            floor = 7.3 * U,
            base = 9.5 * U,
            eave = 3.9 * U,
            a: RawAnchors = {};
        pen.polygon(
            g,
            [
                [0.9 * U, floor],
                [W - 0.9 * U, floor],
                [W - 1.2 * U, base],
                [1.2 * U, base],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        for (let y = floor + 0.7 * U; y < base; y += 0.7 * U)
            pen.line(g, 1.1 * U, y, W - 1.1 * U, y, "ruler", {
                strokeWidth: 0.7,
                stroke: c.t["ink-soft"],
            });
        for (let k = 0; k < 3; k++)
            pen.rect(
                g,
                W / 2 - (1 + k * 0.3) * U,
                base - (0.45 + k * 0.45) * U,
                (2 + k * 0.6) * U,
                0.45 * U,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1 },
            );
        for (let i = 0; i < n; i++) {
            const x = 1.5 * U + (i / (n - 1)) * (W - 3 * U);
            pen.rect(g, x - 0.14 * U, eave, 0.28 * U, floor - eave, "pencil", pen.fill("card"), {
                strokeWidth: 1.2,
            });
            a[`post(${i})`] = [x, floor, "down"];
        }
        pen.line(g, 1 * U, floor - 0.8 * U, W - 1 * U, floor - 0.8 * U, "pencil", {
            strokeWidth: 1.4,
        });
        for (let x = 1.3 * U; x < W - 1.1 * U; x += 0.45 * U)
            pen.line(g, x, floor - 0.8 * U, x, floor, "ruler", { strokeWidth: 0.7 });
        pen.path(
            g,
            `M${0.4 * U} ${eave}Q${2.4 * U} ${2.8 * U} ${W / 2 - 0.3 * U} ${1.2 * U}L${W / 2 + 0.3 * U} ${1.2 * U}Q${W - 2.4 * U} ${2.8 * U} ${W - 0.4 * U} ${eave}Z`,
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 2 },
        );
        for (let x = 0.4 * U; x < W - 0.5 * U; x += 0.92 * U)
            pen.path(
                g,
                `M${x} ${eave}Q${x + 0.46 * U} ${eave + 0.7 * U} ${x + 0.92 * U} ${eave}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.1 },
            );
        pen.line(g, W / 2, 1.2 * U, W / 2, 0.45 * U, "pencil", { strokeWidth: 1.5 });
        pen.circle(g, W / 2, 0.45 * U, 9, "pencil", pen.fill("glow"), { strokeWidth: 1 });
        for (let i = 0; i < notes; i++) {
            const x = (i % 2 ? 7.9 : 1.9) * U + (i > 1 ? 0.9 * U : 0),
                y = (2.4 - (i > 1 ? 0.9 : 0)) * U;
            pen.ellipse(
                g,
                x,
                y,
                11,
                8,
                "pencil",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
            pen.line(g, x + 5, y - 1, x + 5, y - 22, "pencil", { strokeWidth: 1.3 });
            pen.curve(
                g,
                [
                    [x + 5, y - 22],
                    [x + 11, y - 16],
                    [x + 12, y - 9],
                ],
                "pencil",
                { strokeWidth: 1.2 },
            );
            a[`note(${i})`] = [x, y - 22, "up"];
        }
        pen.line(g, 0.2 * U, base, W - 0.2 * U, base, "pencil", { strokeWidth: 2 });
        a.roof = [W / 2, 0.4 * U, "up"];
        a.stage = [W / 2, floor, "up"];
        return a;
    },
    describe: (p) =>
        `A bandstand with a raised floor and a railing, posts standing evenly round it under a pointed roof with a scalloped edge${Math.round(p.notes) > 0 ? ", with notes of music going up" : ""}.`,
});
