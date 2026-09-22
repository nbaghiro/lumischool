import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const crane = defineDrawing({
    id: "crane",
    family: "science",
    title: "Crane",
    group: "Structures",
    about: "A yellow crane seen from the side: a lattice jib across the top that a trolley runs along, and a tower at one end with a cab and a counterweight, standing on the ground.",
    params: { w: 32, tall: 18 },
    settings: { w: { kind: "whole", min: 8, max: 36 }, tall: { kind: "whole", min: 6, max: 46 } },
    takes: [
        { label: "A long jib", params: { w: 32, tall: 18 } },
        { label: "A short crane", params: { w: 16, tall: 10 } },
    ],
    box: (p) => ({ w: Math.max(8, Math.round(p.w)), h: Math.max(6, Math.round(p.tall)) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = Math.max(8, Math.round(p.w)) * U,
            h = Math.max(6, Math.round(p.tall)) * U;
        const top = 0.6 * U,
            low = 1.1 * U,
            tower = w - 2.4 * U,
            tw = 1.3 * U;
        const steel = pen.fill("glow", "solid");
        const bar = (x1: number, y1: number, x2: number, y2: number, sw = 1.6) =>
            pen.line(g, x1, y1, x2, y2, "ruler", { strokeWidth: sw, disableMultiStroke: true });
        // The tower, braced in an X at every square and a half, from the jib to the ground.
        pen.rect(
            g,
            tower,
            low,
            tw,
            h - low - 0.3 * U,
            "ruler",
            pen.fill("glow", "hachure", { hachureGap: 30, fillWeight: 0.5 }),
            { strokeWidth: 0 },
        );
        bar(tower, low, tower, h - 0.3 * U, 2.2);
        bar(tower + tw, low, tower + tw, h - 0.3 * U, 2.2);
        for (let y = low; y + 1.5 * U <= h - 0.3 * U; y += 1.5 * U) {
            bar(tower, y, tower + tw, y + 1.5 * U, 1.2);
            bar(tower + tw, y, tower, y + 1.5 * U, 1.2);
            bar(tower, y, tower + tw, y, 1.2);
        }
        pen.rect(
            g,
            tower - 0.4 * U,
            h - 0.35 * U,
            tw + 0.8 * U,
            0.35 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            calm(c, 1.6),
        );
        // The jib: two chords and a zigzag between, and the counterweight past the tower.
        pen.rect(g, 0.4 * U, top - 2, w - 0.6 * U, 4, "ruler", steel, calm(c, 1.4));
        pen.rect(g, 0.4 * U, low - 2, tower - 0.4 * U + tw, 4, "ruler", steel, calm(c, 1.4));
        for (let x = 0.4 * U; x + 0.5 * U <= tower; x += U) {
            bar(x, low, x + 0.5 * U, top, 1.2);
            bar(x + 0.5 * U, top, x + U, low, 1.2);
        }
        pen.rect(
            g,
            w - 1.1 * U,
            top + 2,
            0.9 * U,
            1.3 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            calm(c, 1.6),
        );
        // The cab hangs off the tower under the jib, with its window facing the load.
        pen.rect(
            g,
            tower - 1.1 * U,
            low + 0.15 * U,
            1.1 * U,
            1.3 * U,
            "ruler",
            pen.fill("card"),
            calm(c, 1.6),
        );
        pen.rect(
            g,
            tower - 0.95 * U,
            low + 0.35 * U,
            0.7 * U,
            0.55 * U,
            "ruler",
            pen.fill("sky"),
            calm(c, 1.2),
        );
        return { rail: [w / 2, low, "down"], cab: [tower - 0.55 * U, low + 0.15 * U, "left"] };
    },
    describe: () =>
        "A tall yellow crane seen from the side, a lattice jib running across the top on a braced tower with a cab and a counterweight, standing on the ground.",
});
