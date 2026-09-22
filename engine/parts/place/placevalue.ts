import { defineDrawing } from "../drawing";

export const placeValue = defineDrawing({
    id: "placevalue",
    family: "place",
    title: "Tens and ones",
    group: "Structures",
    about: "Rods of ten and single cubes, each cube half a square.",
    params: { tens: 3, ones: 4 },
    settings: { tens: { kind: "whole", min: 0, max: 9 }, ones: { kind: "whole", min: 0, max: 9 } },
    takes: [
        { label: "34", params: { tens: 3, ones: 4 } },
        { label: "18", params: { tens: 1, ones: 8 } },
        { label: "50", params: { tens: 5, ones: 0 } },
        { label: "27", params: { tens: 2, ones: 7 } },
    ],
    box: (p) => ({ w: Math.ceil((p.tens * 18 + 16 + Math.ceil(p.ones / 5) * 14 + 16) / 20), h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c;
        for (let t = 0; t < p.tens; t++) {
            const x = 12 + t * 18;
            pen.rect(g, x, 10, 12, 100, "ruler", pen.fill("mint"), { strokeWidth: 1.5 });
            for (let i = 1; i < 10; i++)
                pen.line(g, x, 10 + i * 10, x + 12, 10 + i * 10, "ruler", { strokeWidth: 0.8 });
        }
        const ox = 12 + p.tens * 18 + 12;
        for (let i = 0; i < p.ones; i++)
            pen.rect(
                g,
                ox + Math.floor(i / 5) * 14,
                98 - (i % 5) * 14,
                12,
                12,
                "ruler",
                pen.fill("tang"),
                { strokeWidth: 1.5 },
            );
        return { tens: [12 + (p.tens * 18) / 2, 10, "up"], ones: [ox + 6, 40, "up"] };
    },
    describe: () =>
        "Green rods of ten standing side by side, each ruled into ten, with small orange cubes for the ones stacked beside them.",
});
