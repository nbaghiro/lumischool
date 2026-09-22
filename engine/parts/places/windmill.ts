import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

export const windmill = defineDrawing({
    id: "windmill",
    family: "places",
    title: "Windmill",
    group: "Structures",
    about: "A tower windmill with a cap, a door and a window, and its sails set evenly round the hub. The sails are drawn as lattices at equal angles, so they can be counted and a turn of the sails can be a fraction of a turn.",
    params: { sails: 4, turn: 0 },
    settings: {
        sails: { kind: "whole", min: 3, max: 6 },
        turn: { kind: "whole", min: 0, max: 360 },
    },
    takes: [
        { label: "Four sails", params: { sails: 4, turn: 0 } },
        { label: "Five sails, turned a little", params: { sails: 5, turn: 20 } },
    ],
    box: () => ({ w: 8, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(6, Math.round(p.sails))),
            cx = 4 * U,
            base = 9.6 * U,
            top = 3.6 * U,
            a: RawAnchors = {};
        pen.polygon(
            g,
            [
                [cx - 1.5 * U, base],
                [cx - 1 * U, top],
                [cx + 1 * U, top],
                [cx + 1.5 * U, base],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            `M${cx - 1.25 * U} ${top}Q${cx} ${top - 1.5 * U} ${cx + 1.25 * U} ${top}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            `M${cx - 0.45 * U} ${base}L${cx - 0.45 * U} ${base - 1.2 * U}Q${cx} ${base - 1.7 * U} ${cx + 0.45 * U} ${base - 1.2 * U}L${cx + 0.45 * U} ${base}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.4 },
        );
        pen.rect(g, cx - 0.35 * U, top + 1.6 * U, 0.7 * U, 0.8 * U, "ruler", pen.fill("sky"), {
            strokeWidth: 1.2,
        });
        const hub: Pt = [cx, top - 0.2 * U],
            sails = part(c, "sails", hub, { symmetry: n }).g;
        for (let i = 0; i < n; i++) {
            const ang = (p.turn / 360 + i / n) * Math.PI * 2 - Math.PI / 2,
                dx = Math.cos(ang),
                dy = Math.sin(ang),
                nx = -dy,
                ny = dx;
            const at = (u: number, v: number): Pt => [
                hub[0] + dx * u + nx * v,
                hub[1] + dy * u + ny * v,
            ];
            pen.line(sails, ...at(0, 0), ...at(3.4 * U, 0), "ruler", { strokeWidth: 2.2 });
            pen.polygon(
                sails,
                [at(0.9 * U, 0), at(3.4 * U, 0), at(3.4 * U, 0.75 * U), at(0.9 * U, 0.75 * U)],
                "pencil",
                pen.fill("card", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.3 },
            );
            for (const u of [1.7, 2.5])
                pen.line(sails, ...at(u * U, 0), ...at(u * U, 0.75 * U), "ruler", {
                    strokeWidth: 0.9,
                });
            a[`sail(${i})`] = [...at(3.4 * U, 0.35 * U), "up"] as RawAnchors[string];
        }
        pen.circle(g, hub[0], hub[1], 12, "ruler", pen.fill("ink-soft"), { strokeWidth: 1.2 });
        pen.line(g, 0.6 * U, base, 7.4 * U, base, "pencil", { strokeWidth: 2 });
        a.door = [cx, base - 1.5 * U, "down"];
        return a;
    },
    describe: () =>
        "A tower windmill with a red cap, a door and a window, its latticed sails set evenly round the hub.",
    motion: { parts: { sails: { is: "spin", rev: 18 } } },
});
