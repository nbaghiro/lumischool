import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const observatory = defineDrawing({
    id: "observatory",
    family: "places",
    title: "Observatory",
    group: "Structures",
    about: "An observatory: a round white dome on a round building, with a slit in the dome that opens to let the telescope look out. Shut, it waits for dark; open, the telescope points up at the sky.",
    params: { open: 0 },
    settings: { open: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Shut", params: { open: 0 } },
        { label: "Open to the stars", params: { open: 1 } },
    ],
    box: () => ({ w: 9, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            open = p.open > 0,
            W = 9 * U,
            base = 8.8 * U,
            cx = W / 2,
            drum = 4.6 * U,
            r = 3.1 * U,
            a: RawAnchors = {};
        if (open) {
            // the telescope, pointing up out of the slit
            pen.polygon(
                g,
                [
                    [cx - 0.3 * U, drum - 1.2 * U],
                    [cx + 1.6 * U, drum - 3.8 * U],
                    [cx + 2.2 * U, drum - 3.4 * U],
                    [cx + 0.3 * U, drum - 0.8 * U],
                ],
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.5 },
            );
            a.telescope = [cx + 1.9 * U, drum - 3.6 * U, "up"];
        }
        pen.path(
            g,
            `M${cx - r} ${drum}A${r} ${r} 0 0 1 ${cx + r} ${drum}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        for (const f of [0.35, 0.7])
            pen.arc(g, cx, drum, r * 2 * f, r * 2, Math.PI, Math.PI * 2, "pencil", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        // the slit, a dark stripe up the dome, or open to the sky with the telescope in it
        pen.polygon(
            g,
            [
                [cx - 0.45 * U, drum - 0.1 * U],
                [cx - 0.35 * U, drum - r + 0.15 * U],
                [cx + 0.35 * U, drum - r + 0.15 * U],
                [cx + 0.45 * U, drum - 0.1 * U],
            ],
            "pencil",
            open ? pen.fill("sky", "hachure", { hachureGap: 3 }) : pen.fill("ink-soft"),
            { strokeWidth: 1.2 },
        );
        pen.rect(g, cx - 3.4 * U, drum, 6.8 * U, base - drum, "pencil", pen.fill("card"), {
            strokeWidth: 2,
        });
        pen.rect(g, cx - 3.6 * U, drum - 0.1 * U, 7.2 * U, 0.35 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.3,
        });
        for (const dx of [-2.2, 1.6]) {
            pen.rect(g, cx + dx * U, drum + 1 * U, 0.7 * U, 0.8 * U, "ruler", pen.fill("glow"), {
                strokeWidth: 1.2,
            });
        }
        pen.path(
            g,
            `M${cx - 0.6 * U} ${base}L${cx - 0.6 * U} ${base - 1.6 * U}Q${cx} ${base - 2.2 * U} ${cx + 0.6 * U} ${base - 1.6 * U}L${cx + 0.6 * U} ${base}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.5 },
        );
        pen.line(g, 0.2 * U, base, W - 0.2 * U, base, "pencil", { strokeWidth: 2 });
        a.dome = [cx, drum - r, "up"];
        a.door = [cx, base - 2 * U, "up"];
        return a;
    },
    describe: (p) =>
        `An observatory with a round white dome on a round building, a slit in the dome ${p.open > 0 ? "open with the telescope pointing up at the sky" : "shut"}, and an arched door.`,
});
