import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const workshopPiece = defineDrawing({
    id: "workshop-piece",
    family: "science",
    title: "Workshop pieces",
    group: "Structures",
    about: "Wooden cargo crates, ramps, a marble, a crane hook and a collecting tray. The drawing's box matches the physical piece, with its centre available as an attachment anchor.",
    params: { kind: "crate", w: 2, h: 2 },
    settings: {
        kind: { kind: "one of", of: ["crate", "ramp", "marble", "boat", "hook"] },
        w: { kind: "whole", min: 1, max: 30 },
        h: { kind: "whole", min: 1, max: 10 },
    },
    takes: [
        { label: "Cargo crate", params: { kind: "crate", w: 2, h: 2 } },
        { label: "Wooden ramp", params: { kind: "ramp", w: 8, h: 1 } },
        { label: "Blue marble", params: { kind: "marble", w: 1, h: 1 } },
        { label: "Barge", params: { kind: "boat", w: 16, h: 3 } },
        { label: "Crane hook", params: { kind: "hook", w: 1, h: 2 } },
    ],
    describe: (p) =>
        `A ${p.kind} piece with a clear outline, ready to place in a workshop scene and move among other pieces.`,
    box: (p) => ({ w: p.w, h: p.h }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = p.w * U,
            h = p.h * U;
        if (p.kind === "marble") {
            pen.circle(g, w / 2, h / 2, w * 0.9, "ruler", pen.fill("sky", "solid"), {
                strokeWidth: 1.5,
            });
        } else if (p.kind === "hook") {
            pen.path(
                g,
                `M ${w / 2} 0 L ${w / 2} ${h * 0.6} Q ${w} ${h} ${w * 0.25} ${h * 0.9} Q 0 ${h * 0.8} ${w * 0.2} ${h * 0.65}`,
                "ruler",
                undefined,
                { strokeWidth: 2.5 },
            );
        } else if (p.kind === "boat") {
            pen.path(
                g,
                `M 1 1 L ${w - 1} 1 L ${w * 0.9} ${h - 1} L ${w * 0.1} ${h - 1} Z`,
                "ruler",
                pen.fill("sky"),
                { strokeWidth: 2 },
            );
            pen.line(g, w * 0.1, h * 0.6, w * 0.9, h * 0.6, "ruler", { strokeWidth: 1.3 });
        } else {
            pen.path(
                g,
                `M 1 1 L ${w - 1} 1 L ${w - 1} ${h - 1} L 1 ${h - 1} Z`,
                "ruler",
                pen.fill("glow"),
                { strokeWidth: 1.6 },
            );
            if (p.kind === "crate") {
                pen.line(g, 2, 2, w - 2, h - 2, "ruler", { strokeWidth: 1 });
                pen.line(g, w - 2, 2, 2, h - 2, "ruler", { strokeWidth: 1 });
            } else pen.line(g, 3, h * 0.6, w - 3, h * 0.6, "ruler", { strokeWidth: 0.7 });
        }
        return { centre: [w / 2, h / 2] };
    },
});
