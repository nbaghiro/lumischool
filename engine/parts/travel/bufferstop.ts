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

const wood = <G>(c: Ctx<G>) => c.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 });

const steel = <G>(c: Ctx<G>) =>
    c.pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 });

export const bufferStop = defineDrawing({
    id: "bufferstop",
    family: "travel",
    title: "Buffer stop",
    group: "Props",
    about: "The stop at the end of a railway line: two sloping steel legs bolted to the sleepers with a beam across them and a pair of buffers on the beam, facing the line. It faces the line on its right, or the line on its left.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [-1, 1] } },
    takes: [
        { label: "Facing the line on its right", params: { facing: 1 } },
        { label: "Facing the line on its left", params: { facing: -1 } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = 3 * U,
            right = Number(p.facing) >= 0,
            X = (sq: number) => (right ? sq * U : w - sq * U),
            rail = 2.5 * U,
            d = right ? 1 : -1;
        pen.line(g, X(0.4), rail, X(2.1), rail - 1.5 * U, "ruler", {
            strokeWidth: 3.2,
            disableMultiStroke: true,
        });
        pen.line(g, X(1), rail, X(2.1), rail - 1.05 * U, "ruler", {
            strokeWidth: 2.3,
            disableMultiStroke: true,
        });
        pen.rect(
            g,
            X(2.05),
            rail - 1.8 * U,
            0.45 * U * d,
            1.15 * U,
            "ruler",
            steel(c),
            calm(c, 1.6),
        );
        for (const dy of [-1.5, -0.85]) {
            pen.rect(
                g,
                X(2.5),
                rail + dy * U - 0.15 * U,
                0.42 * U * d,
                0.3 * U,
                "ruler",
                pen.fill("berry"),
                calm(c, 1.3),
            );
        }
        pen.rect(g, X(0.2), rail - 0.12 * U, 2.2 * U * d, 0.24 * U, "ruler", wood(c), calm(c, 1.3));
        return {
            face: [X(2.92), rail - 1.2 * U, right ? "right" : "left"],
            foot: [w / 2, rail, "down"],
        };
    },
    describe: (p) =>
        `A buffer stop at the end of a railway line seen from the side, two sloping steel legs with a beam across them and two red buffers facing ${Number(p.facing) >= 0 ? "right" : "left"}.`,
    motion: {
        still: "A buffer stop is bolted to the sleepers, and a carriage that bumps it is what moves.",
    },
});
