import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The seat's top above the ground, in squares: the pups' park sets the bench's seat to it. */
export const BENCH_SEAT = 1.2;

export const parkBench = defineDrawing<{ tone: "tang" | "sky" }>({
    id: "parkbench",
    family: "outdoors",
    title: "Park bench",
    group: "Props",
    about: "A wooden park bench seen from the side: a slatted seat on two legs with a backrest, and room underneath for a ball to roll or a small dog to crawl.",
    params: { tone: "tang" },
    settings: { tone: { kind: "one of", of: ["tang", "sky"] } },
    takes: [
        { label: "An orange bench", params: { tone: "tang" } },
        { label: "A blue bench", params: { tone: "sky" } },
    ],
    box: () => ({ w: 4, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 3 * U,
            seat = base - BENCH_SEAT * U,
            wood = pen.fill(p.tone === "sky" ? "sky" : "tang");
        for (const x of [0.5, 3.3])
            pen.rect(g, x * U, seat, 0.22 * U, BENCH_SEAT * U, "pencil", pen.fill("ink-soft"), {
                strokeWidth: 1.2,
            });
        pen.rect(g, 0.1 * U, seat - 0.26 * U, 3.8 * U, 0.26 * U, "pencil", wood, {
            strokeWidth: 1.5,
        });
        pen.rect(g, 0.3 * U, 0.2 * U, 0.24 * U, seat - 0.4 * U, "pencil", wood, {
            strokeWidth: 1.4,
        });
        for (const y of [0.35, 0.9])
            pen.rect(g, 0.1 * U, y * U, 1.4 * U, 0.3 * U, "pencil", wood, { strokeWidth: 1.3 });
        return { seat: [2 * U, seat - 0.26 * U, "up"] };
    },
    describe: (p) =>
        `A wooden park bench seen from the side, with ${p.tone === "sky" ? "a blue" : "an orange"} slatted seat on two grey legs, a backrest behind it and a space underneath.`,
});
