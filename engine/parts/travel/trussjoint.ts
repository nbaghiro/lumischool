import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const JOINTS = ["joint", "anchor"] as const;

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const trussJoint = defineDrawing({
    id: "trussjoint",
    family: "travel",
    title: "Bridge joint",
    group: "Props",
    about: "Where the beams of a bridge a child builds meet: a round plate with a bolt through it, which turns freely, or an anchor, a square iron plate bolted into the rock of a bank, which holds still.",
    params: { kind: "joint" },
    settings: { kind: { kind: "one of", of: JOINTS } },
    takes: [
        { label: "A joint between beams", params: { kind: "joint" } },
        { label: "An anchor in the bank", params: { kind: "anchor" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            m = 0.5 * U;
        if (p.kind === "anchor") {
            pen.rect(g, 0.12 * U, 0.12 * U, 0.76 * U, 0.76 * U, "ruler", pen.fill("sky"), {
                strokeWidth: 1.5,
                ...FIRM,
            });
            for (const [x, y] of [
                [0.27, 0.27],
                [0.73, 0.27],
                [0.27, 0.73],
                [0.73, 0.73],
            ] as const)
                pen.circle(g, x * U, y * U, 2.4, "ruler", pen.fill("ink"), {
                    strokeWidth: 0.5,
                    ...FIRM,
                });
        }
        pen.circle(g, m, m, 0.5 * U, "ruler", pen.fill("card"), { strokeWidth: 1.5, ...FIRM });
        pen.circle(g, m, m, 0.16 * U, "ruler", pen.fill("ink"), { strokeWidth: 0.6, ...FIRM });
        return { centre: [m, m, "up"] };
    },
    describe: (p) =>
        p.kind === "anchor"
            ? "An anchor for a bridge, a square blue iron plate bolted into the rock of a bank, with a round pin in the middle for beams to hang from."
            : "A joint where the beams of a bridge meet, a small round white plate with a dark bolt through its middle that lets the beams turn.",
    motion: { still: "A joint moves only where the game's bridge carries it as it bends." },
});
