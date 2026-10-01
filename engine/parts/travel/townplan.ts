import { roundedRect } from "../../ink/pen";
import type { RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { say, wide } from "../lettering";
import { kid } from "../stories/pictures";

interface PlanParams {
    /**
     * What stands at each of the seven places, in any language, empty for nothing: by the road on the
     * left and on the right before the first crossing, at the end of the first street left and right,
     * at the end of the second street left and right, and straight on at the top.
     */
    places: string[];
}

/** Each place's building, in squares: its middle, and whether a street ends at its side. */
const SLOTS: readonly { x: number; y: number }[] = [
    { x: 7, y: 17 },
    { x: 19, y: 17 },
    { x: 3.2, y: 13 },
    { x: 22.8, y: 13 },
    { x: 3.2, y: 6 },
    { x: 22.8, y: 6 },
    { x: 13, y: 1.9 },
];

const WALLS: Marker[] = ["glow", "sky", "mint", "berry", "tang", "sky", "glow"];

export const townPlan = defineDrawing<PlanParams>({
    id: "townplan",
    family: "travel",
    title: "A town plan to follow directions on",
    group: "Structures",
    about: "A small town from above: one road going up from a child at the bottom, crossed by a first and a second street, with a building at the end of each street, two by the road before the first crossing and one straight on at the top, each with its name. Directions such as the second on the left then lead to exactly one place.",
    params: {
        places: [
            "el café",
            "la tienda",
            "el parque",
            "la playa",
            "el museo",
            "la estación",
            "la plaza",
        ],
    },
    settings: { places: { kind: "words", most: 7 } },
    takes: [
        {
            label: "Seven places",
            params: {
                places: [
                    "el café",
                    "la tienda",
                    "el parque",
                    "la playa",
                    "el museo",
                    "la estación",
                    "la plaza",
                ],
            },
        },
        {
            label: "Only the streets",
            params: { places: ["", "", "el mercado", "", "", "el puerto", "la iglesia"] },
        },
        {
            label: "Lettered",
            params: { places: ["A", "B", "C", "D", "E", "F", "G"] },
        },
    ],
    box: () => ({ w: 26, h: 21 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const road = pen.fill("grid", "solid");
        const edge = { strokeWidth: 1.6 };
        pen.rect(g, 12 * U, 3 * U, 2 * U, 18 * U, "ruler", road, edge);
        pen.rect(g, 6 * U, 12 * U, 14 * U, 2 * U, "ruler", road, edge);
        pen.rect(g, 6 * U, 5 * U, 14 * U, 2 * U, "ruler", road, edge);
        for (const [x0, y0, x1, y1] of [
            [13, 20.6, 13, 14.4],
            [13, 11.6, 13, 7.4],
            [13, 4.6, 13, 3.4],
        ] as const)
            pen.line(g, x0 * U, y0 * U, x1 * U, y1 * U, "ruler", {
                strokeWidth: 1.2,
                strokeLineDash: [6, 6],
            });
        SLOTS.forEach((slot, i) => {
            const name = p.places[i] ?? "";
            if (!name) return;
            const w = 6 * U,
                h = 3 * U,
                x = slot.x * U - w / 2,
                y = slot.y * U - h / 2;
            pen.polygon(
                g,
                [
                    [x - 3, y + 0.9 * U],
                    [x + w / 2, y - 0.3 * U],
                    [x + w + 3, y + 0.9 * U],
                ],
                "pencil",
                pen.fill("berry", "hachure", { hachureGap: 5 }),
                { strokeWidth: 1.6 },
            );
            pen.rect(g, x, y + 0.9 * U, w, h - 0.9 * U, "pencil", pen.fill(WALLS[i] ?? "glow"), {
                strokeWidth: 1.7,
            });
            pen.path(
                g,
                roundedRect(x + 0.3 * U, y + 1.15 * U, w - 0.6 * U, 1.5 * U, 5),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.2 },
            );
            const size = Math.min(15, ((w - 0.9 * U) / Math.max(1, wide(name, 15))) * 15);
            say(c, x + w / 2, y + 2.25 * U, name, size);
            a[`place(${i})`] = [x + w / 2, y - 0.3 * U, "up"];
        });
        kid(c, 13 * U, 20.8 * U, 0.42, 0, "happy");
        pen.path(
            g,
            `M${14.6 * U} ${19.6 * U}V${17.4 * U}M${14.1 * U} ${18 * U}L${14.6 * U} ${17.3 * U}L${15.1 * U} ${18 * U}`,
            "pencil",
            null,
            { stroke: c.t.ink, strokeWidth: 2 },
        );
        a.start = [13 * U, 18.6 * U, "up"];
        return a;
    },
    describe: () =>
        "A small town seen from above: one road going up from a child, crossed by two streets, with named buildings at the ends of the streets and along the road.",
    motion: { still: STILL.clues },
});
