import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/**
 * The jug's box and places on it, in its own squares: its inside, the lip of the spout on the right,
 * and the middle of the handle on the left, where a hand holds it and it turns. A game that tips the
 * jug reads these to pour from the spout and to draw the drink inside it.
 */
export const PITCHER = {
    w: 7,
    h: 7,
    inside: [
        { x: 1.8, y: 1.3 },
        { x: 5.3, y: 1.3 },
        { x: 5.45, y: 6.3 },
        { x: 1.7, y: 6.3 },
    ],
    spout: { x: 6.55, y: 1.1 },
    handle: { x: 0.75, y: 3.4 },
} as const;

export const pitcher = defineDrawing({
    id: "pitcher",
    family: "food",
    title: "Glass jug",
    group: "Props",
    about: "A tall glass jug for lemonade, seen from the side, with its spout to the right, a looped handle to the left and a slice of lemon on the rim. It is drawn empty, so a game can draw the drink inside and tip it.",
    params: { lemon: 1 },
    settings: { lemon: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "With a slice of lemon", params: { lemon: 1 } },
        { label: "Plain", params: { lemon: 0 } },
    ],
    box: () => ({ w: PITCHER.w, h: PITCHER.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            top = 1.05 * U,
            bottom = 6.75 * U,
            l = 1.45 * U,
            r = 5.6 * U;
        // the glass, flaring out into the spout at the top right
        pen.path(
            g,
            `M${l} ${top}L${l - 0.12 * U} ${bottom - 0.3 * U}Q${l} ${bottom} ${l + 0.4 * U} ${bottom}H${r - 0.2 * U}Q${r + 0.15 * U} ${bottom} ${r + 0.1 * U} ${bottom - 0.3 * U}L${r - 0.1 * U} ${1.9 * U}Q${r + 0.2 * U} ${1.2 * U} ${PITCHER.spout.x * U} ${PITCHER.spout.y * U}`,
            "ruler",
            null,
            calm(c, 2.4),
        );
        pen.line(g, l, top, r - 0.4 * U, top, "ruler", {
            ...calm(c, 1.4),
            stroke: c.t["ink-soft"],
        });
        pen.path(
            g,
            `M${l} ${1.7 * U}C${0.05 * U} ${1.6 * U} ${0.05 * U} ${5.2 * U} ${l - 0.05 * U} ${5.1 * U}`,
            "ruler",
            null,
            calm(c, 2.6),
        );
        pen.path(
            g,
            `M${l} ${2.3 * U}C${0.45 * U} ${2.3 * U} ${0.4 * U} ${4.5 * U} ${l - 0.05 * U} ${4.5 * U}`,
            "ruler",
            null,
            calm(c, 1.4),
        );
        pen.line(g, l + 0.35 * U, 1.8 * U, l + 0.35 * U, 5.9 * U, "pencil", {
            ...calm(c, 1.8),
            stroke: c.t.card,
        });
        if (p.lemon) {
            const cx = 2.6 * U,
                cy = 1.05 * U;
            pen.path(
                g,
                `M${cx - 0.75 * U} ${cy}A${0.75 * U} ${0.75 * U} 0 0 1 ${cx + 0.75 * U} ${cy}Z`,
                "pencil",
                pen.fill("glow", "solid"),
                calm(c, 1.6),
            );
            for (const a of [0.5, 1.1, 1.6, 2.2, 2.7])
                pen.line(
                    g,
                    cx,
                    cy - 0.05 * U,
                    cx - Math.cos(a) * 0.55 * U,
                    cy - Math.sin(a) * 0.55 * U,
                    "pencil",
                    { ...calm(c, 0.9), stroke: c.t["ink-soft"] },
                );
        }
        return {
            spout: [PITCHER.spout.x * U, PITCHER.spout.y * U, "right"],
            handle: [PITCHER.handle.x * U, PITCHER.handle.y * U, "left"],
        };
    },
    describe: (p) =>
        `A tall empty glass jug seen from the side, its spout pointing right and its looped handle on the left${p.lemon ? ", with a slice of lemon resting on the rim" : ""}.`,
    motion: {
        still: "A jug is still until a hand tips it; the drink inside is the game's to draw.",
    },
});
