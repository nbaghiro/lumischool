import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const steel = <G>(c: Ctx<G>) =>
    c.pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 });

export const coupling = defineDrawing({
    id: "coupling",
    family: "travel",
    title: "Coupling",
    group: "Props",
    about: "The coupling between two railway vehicles, seen from the side: a hook on the left and an eye on the right, with a short chain. Closed, the hook is down through the eye and the chain hangs in a loop between them; open, the hook is lifted clear and the eye is free.",
    params: { closed: 1 },
    settings: { closed: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Closed", params: { closed: 1 } },
        { label: "Open", params: { closed: 0 } },
    ],
    box: () => ({ w: 2, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            closed = Number(p.closed) > 0,
            y = 0.55 * U,
            w = 2 * U;
        pen.rect(g, 0, y - 0.14 * U, 0.4 * U, 0.28 * U, "ruler", steel(c), calm(c, 1.2));
        pen.rect(g, w - 0.4 * U, y - 0.14 * U, 0.4 * U, 0.28 * U, "ruler", steel(c), calm(c, 1.2));
        pen.ellipse(g, w - 0.62 * U, y, 0.42 * U, 0.34 * U, "ruler", null, {
            strokeWidth: 2,
            disableMultiStroke: true,
        });
        if (closed) {
            pen.path(
                g,
                `M${0.4 * U} ${y}L${0.95 * U} ${y}Q${1.3 * U} ${y - 0.02 * U} ${1.36 * U} ${y - 0.3 * U}Q${1.45 * U} ${y - 0.42 * U} ${1.52 * U} ${y - 0.12 * U}`,
                "ruler",
                null,
                { strokeWidth: 2.4, disableMultiStroke: true },
            );
            pen.path(
                g,
                `M${0.5 * U} ${y + 0.1 * U}Q${U} ${y + 0.55 * U} ${1.5 * U} ${y + 0.1 * U}`,
                "ruler",
                null,
                { strokeWidth: 1.3, strokeLineDash: [2.5, 2.5], disableMultiStroke: true },
            );
        } else {
            pen.path(
                g,
                `M${0.4 * U} ${y}L${0.8 * U} ${y - 0.05 * U}Q${1.1 * U} ${y - 0.45 * U} ${1.28 * U} ${y - 0.5 * U}Q${1.42 * U} ${y - 0.5 * U} ${1.3 * U} ${y - 0.25 * U}`,
                "ruler",
                null,
                { strokeWidth: 2.4, disableMultiStroke: true },
            );
            pen.path(
                g,
                `M${0.5 * U} ${y + 0.1 * U}Q${0.85 * U} ${y + 0.4 * U} ${1.15 * U} ${y + 0.1 * U}`,
                "ruler",
                null,
                { strokeWidth: 1.3, strokeLineDash: [2.5, 2.5], disableMultiStroke: true },
            );
        }
        return { hook: [1.3 * U, y - 0.3 * U, "up"], middle: [U, y, "down"] };
    },
    describe: (p) =>
        `A railway coupling seen from the side, a hook on the left and an eye on the right, ${Number(p.closed) > 0 ? "the hook down through the eye with the chain in a loop" : "the hook lifted clear and the eye free"}.`,
    motion: {
        still: "A coupling is opened and closed by the game, and hangs still between two vehicles.",
    },
});
