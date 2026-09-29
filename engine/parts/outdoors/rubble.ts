import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const rubble = defineDrawing({
    id: "rubble",
    family: "outdoors",
    title: "Rock of rubble",
    group: "Props",
    about: "A lumpy grey rock seen from the side, sitting on its flat base, with a pale face where the light falls and a crack or two, like the rubble a landslide leaves on a road.",
    params: { cracks: 1 },
    settings: { cracks: { kind: "whole", min: 0, max: 2 } },
    takes: [
        { label: "One crack", params: { cracks: 1 } },
        { label: "Two cracks", params: { cracks: 2 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        const pts: [number, number][] = [
            [0.15 * U, 1.85 * U],
            [0.1 * U, 1.2 * U],
            [0.45 * U, 0.55 * U],
            [1.05 * U, 0.2 * U],
            [1.6 * U, 0.5 * U],
            [1.9 * U, 1.15 * U],
            [1.85 * U, 1.85 * U],
        ];
        pen.polygon(g, pts, "pencil", pen.fill("ink-soft"), { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [0.55 * U, 0.75 * U],
                [1.05 * U, 0.45 * U],
                [1.35 * U, 0.7 * U],
                [0.9 * U, 0.95 * U],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 0.8, ...FIRM },
        );
        const n = Math.max(0, Math.min(2, Math.round(p.cracks)));
        if (n >= 1)
            pen.linear(
                g,
                [
                    [1.2 * U, 1.85 * U],
                    [1.3 * U, 1.45 * U],
                    [1.15 * U, 1.2 * U],
                ],
                "ruler",
                { strokeWidth: 1.1, ...FIRM },
            );
        if (n >= 2)
            pen.linear(
                g,
                [
                    [0.25 * U, 1.3 * U],
                    [0.55 * U, 1.4 * U],
                    [0.7 * U, 1.65 * U],
                ],
                "ruler",
                { strokeWidth: 1.1, ...FIRM },
            );
        return { middle: [U, 1.1 * U, "up"] };
    },
    describe: (p) =>
        `A lumpy grey rock seen from the side, sitting on its flat base, with a pale face where the light falls and ${Math.max(0, Math.min(2, Math.round(p.cracks))) === 2 ? "two cracks" : "a crack"} in it.`,
});
