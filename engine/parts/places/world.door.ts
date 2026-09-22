import {} from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A door with a round window, left ajar: where a world indoors is arrived at. */
export const doorV = defineDrawing({
    id: "world.door",
    family: "places",
    title: "Door",
    group: "Props",
    about: "A panelled door with a round window and a step, standing a little open. The way into a world indoors.",
    params: { panes: 1 },
    settings: { panes: { kind: "whole", min: 1, max: 2 } },
    takes: [
        { label: "One round window", params: { panes: 1 } },
        { label: "Two", params: { panes: 2 } },
    ],
    box: () => ({ w: 8, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const x = 1 * U,
            y = 0.6 * U,
            w = 6 * U,
            h = 12.4 * U;
        pen.rect(g, x - 0.5 * U, y - 0.5 * U, w + 1 * U, h + 0.5 * U, "ruler", null, {
            strokeWidth: 2.6,
        });
        pen.polygon(
            g,
            [
                [x, y],
                [x + w - 0.8 * U, y + 0.4 * U],
                [x + w - 0.8 * U, y + h - 0.2 * U],
                [x, y + h],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 6, fillWeight: 0.9 }),
            { strokeWidth: 2.2 },
        );
        for (let i = 0; i < Math.max(1, Math.min(2, p.panes)); i++) {
            pen.circle(
                g,
                x + (w - 0.8 * U) / 2,
                y + 2.6 * U + i * 2.6 * U,
                2.2 * U,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 2 },
            );
        }
        pen.rect(g, x + 0.9 * U, y + 6.6 * U, w - 2.6 * U, 4.4 * U, "pencil", null, {
            strokeWidth: 1.4,
        });
        pen.circle(g, x + w - 1.7 * U, y + h * 0.56, 0.7 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 1.4,
        });
        pen.rect(g, x - 1 * U, y + h, w + 2 * U, 0.8 * U, "ruler", pen.fill("card"), {
            strokeWidth: 2,
        });
        return {
            handle: [x + w - 1.7 * U, y + h * 0.56, "right"],
            step: [x + w / 2, y + h + 0.8 * U, "down"],
        };
    },
    describe: (p) =>
        `A panelled wooden door with ${p.panes > 1 ? "round windows one above the other" : "a round window"} and a brass handle, standing a little open in its frame, with a step below it.`,
});
