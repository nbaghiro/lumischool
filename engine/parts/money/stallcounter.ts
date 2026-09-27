import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";

interface StallParams {
    /** Across, in squares. */
    w: number;
    /** Tall, in squares, from the top of the awning to the floor. */
    h: number;
    /** How tall the counter is, in squares from the floor to its top board. */
    counter: number;
}

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const stallCounter = defineDrawing<StallParams>({
    id: "stallcounter",
    family: "money",
    title: "Stall counter",
    group: "Props",
    about: "A market stall seen from the front: a striped awning on two poles over a long wooden counter whose top board juts past its planks. Things bounce off its edge and rest on its top, so a game can be played across it.",
    params: { w: 20, h: 24, counter: 6 },
    settings: {
        w: { kind: "whole", min: 8, max: 36 },
        h: { kind: "whole", min: 8, max: 40 },
        counter: { kind: "whole", min: 3, max: 12 },
    },
    takes: [
        { label: "A long stall", params: { w: 20, h: 24, counter: 6 } },
        { label: "A small stall", params: { w: 10, h: 12, counter: 4 } },
    ],
    box: (p) => ({ w: Math.round(p.w), h: Math.round(p.h) }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = Math.round(p.w) * U,
            H = Math.round(p.h) * U;
        const top = H - Math.round(p.counter) * U,
            awning = 1.8 * U;
        for (const x of [0.6 * U, W - 0.6 * U])
            pen.line(g, x, awning, x, top, "pencil", { strokeWidth: 2.6, ...FIRM });
        const stripes = Math.max(4, Math.round(W / (1.5 * U)));
        const sw = (W - 0.4 * U) / stripes;
        for (let i = 0; i < stripes; i++) {
            const x = 0.2 * U + i * sw;
            pen.path(
                g,
                `M${x} ${0.3 * U}H${x + sw}V${awning}Q${x + sw / 2} ${awning + 0.7 * U} ${x} ${awning}Z`,
                "pencil",
                pen.fill(i % 2 ? "card" : "berry"),
                { strokeWidth: 1.4, ...FIRM },
            );
        }
        pen.rect(
            g,
            0.3 * U,
            top + 0.5 * U,
            W - 0.6 * U,
            H - top - 0.5 * U,
            "pencil",
            pen.fill("tang"),
            {
                strokeWidth: 1.8,
                ...FIRM,
            },
        );
        for (let x = 0.3 * U + 2 * U; x < W - 0.5 * U; x += 2 * U)
            pen.line(g, x, top + 0.7 * U, x, H - 0.2 * U, "ruler", { strokeWidth: 0.9, ...FIRM });
        pen.rect(g, 0.2 * U, top, W - 0.4 * U, 0.5 * U, "ruler", pen.fill("tang"), {
            strokeWidth: 2,
            ...FIRM,
        });
        const a: RawAnchors = {
            top: [W / 2, top, "up"],
            edge: [0, top, "left"],
            awning: [W / 2, 0.3 * U, "up"],
        };
        return a;
    },
    describe: () =>
        "A market stall with a red and white striped awning on two poles over a long wooden counter made of planks, its top board jutting a little past the front.",
    motion: { still: STILL.setting },
});
