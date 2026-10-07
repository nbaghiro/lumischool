import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const spaceStation = defineDrawing<{ wings: number }>({
    id: "spacestation",
    family: "travel",
    title: "Space station",
    group: "Props",
    about: "A space station floating high above the Earth: a round white middle with portholes, a docking ring, a thin antenna, and blue solar panels on struts either side.",
    params: { wings: 2 },
    settings: { wings: { kind: "whole", min: 1, max: 2 } },
    takes: [
        { label: "One panel each side", params: { wings: 1 } },
        { label: "Two panels each side", params: { wings: 2 } },
    ],
    box: () => ({ w: 16, h: 8 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            wings = Math.max(1, Math.min(2, Math.round(p.wings))),
            edge = { strokeWidth: 1.3, roughness: 0.25 },
            soft = { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["ink-soft"], roughness: 0.2 },
            cx = 8 * U,
            cy = 4 * U;
        // the struts out to the panels
        pen.line(g, 1 * U, cy, 15 * U, cy, "ruler", { ...soft, strokeWidth: 2 });
        const panel = (x: number, y: number) => {
            pen.rect(
                g,
                x,
                y,
                2.6 * U,
                1.6 * U,
                "ruler",
                pen.fill("sky", "hachure", { hachureGap: 5 }),
                edge,
            );
            pen.line(g, x + 1.3 * U, y, x + 1.3 * U, y + 1.6 * U, "ruler", soft);
        };
        const rows = wings === 2 ? [cy - 2.3 * U, cy + 0.7 * U] : [cy - 0.8 * U];
        for (const y of rows) {
            panel(0.4 * U, y);
            panel(13 * U, y);
            if (wings === 2) {
                panel(3.2 * U, y);
                panel(10.2 * U, y);
            }
        }
        // the middle, its portholes and its docking ring
        pen.rect(g, cx - 2.2 * U, cy - 1.4 * U, 4.4 * U, 2.8 * U, "pencil", pen.fill("card"), {
            ...edge,
            strokeWidth: 1.6,
        });
        for (const dx of [-1.2, 0, 1.2])
            pen.circle(g, cx + dx * U, cy, 0.6 * U, "pencil", pen.fill("glow"), edge);
        pen.rect(g, cx - 0.7 * U, cy + 1.4 * U, 1.4 * U, 0.7 * U, "pencil", pen.fill("tang"), edge);
        // the antenna on top
        pen.line(g, cx, cy - 1.4 * U, cx, cy - 3.3 * U, "pencil", soft);
        pen.circle(g, cx, cy - 3.4 * U, 0.4 * U, "pencil", pen.fill("berry"), edge);
        return { dock: [cx, cy + 2.1 * U, "down"], middle: [cx, cy, "up"] };
    },
    describe: (p) =>
        `A space station high above the Earth, a round white middle with three portholes and a docking ring, and ${Math.round(p.wings) === 2 ? "two blue solar panels" : "one blue solar panel"} on each side.`,
    motion: { still: "The station hangs still far off while the game climbs past it." },
});
