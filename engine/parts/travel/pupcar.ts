import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;
const PAINTS = ["berry", "sky", "mint"] as const;

/** The car's box, where a pup sits in each seat and where its wheels touch the road, in squares from its top left. */
export const PUPCAR = {
    w: 5,
    h: 3,
    seats: [
        { x: 1.55, y: 1.45 },
        { x: 2.85, y: 1.45 },
    ],
    road: 2.95,
} as const;

export const pupCar = defineDrawing({
    id: "pupcar",
    family: "travel",
    title: "The Pup family's car",
    group: "Props",
    about: "The Pup family's little open-topped car, seen from the side and facing right: a round bonnet with a headlight, two seats with room for a pup in each, a spare wheel at the back and two big wheels.",
    params: { paint: "berry" },
    settings: { paint: { kind: "one of", of: PAINTS } },
    takes: [
        { label: "Red, as the family has it", params: { paint: "berry" } },
        { label: "Painted blue", params: { paint: "sky" } },
    ],
    box: () => ({ w: PUPCAR.w, h: PUPCAR.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            paint = PAINTS.find((x) => x === p.paint) ?? "berry";
        // the body: a tub with a low back and a rounded bonnet running down to the front bumper
        pen.polygon(
            g,
            [
                [0.35 * U, 1.35 * U],
                [1.05 * U, 1.35 * U],
                [1.15 * U, 1.75 * U],
                [3.35 * U, 1.75 * U],
                [3.6 * U, 1.5 * U],
                [4.3 * U, 1.55 * U],
                [4.75 * U, 1.95 * U],
                [4.8 * U, 2.45 * U],
                [0.25 * U, 2.45 * U],
            ],
            "pencil",
            pen.fill(paint),
            { strokeWidth: 1.7 },
        );
        // the windscreen, leaning back from the bonnet
        pen.line(g, 3.4 * U, 1.7 * U, 3.15 * U, 0.95 * U, "ruler", { strokeWidth: 1.8, ...FIRM });
        pen.line(g, 3.15 * U, 0.95 * U, 3.0 * U, 1.0 * U, "ruler", { strokeWidth: 1.2, ...FIRM });
        pen.rect(g, 1.3 * U, 1.95 * U, 1.6 * U, 0.08 * U, "ruler", null, {
            strokeWidth: 0.9,
            ...FIRM,
        });
        pen.circle(g, 4.62 * U, 1.95 * U, 0.3 * U, "ruler", pen.fill("glow"), {
            strokeWidth: 1,
            ...FIRM,
        });
        pen.circle(g, 0.3 * U, 1.75 * U, 0.75 * U, "pencil", pen.fill("ink"), {
            strokeWidth: 1.2,
        });
        for (const x of [1.15, 3.85]) {
            pen.circle(g, x * U, 2.42 * U, 1.05 * U, "pencil", pen.fill("ink"), {
                strokeWidth: 1.5,
            });
            pen.circle(g, x * U, 2.42 * U, 0.4 * U, "ruler", pen.fill("card"), {
                strokeWidth: 0.8,
                ...FIRM,
            });
        }
        return {
            back: [PUPCAR.seats[0].x * U, PUPCAR.seats[0].y * U, "up"],
            front: [PUPCAR.seats[1].x * U, PUPCAR.seats[1].y * U, "up"],
        };
    },
    describe: (p) =>
        `The Pup family's little ${p.paint === "sky" ? "blue" : p.paint === "mint" ? "green" : "red"} open-topped car seen from the side, with a round bonnet, a headlight, two seats, a spare wheel and two big wheels.`,
    motion: { still: "The car moves only as the game drives it over the bridge and tips it." },
});
