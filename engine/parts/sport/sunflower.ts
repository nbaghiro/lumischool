import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const sunflower = defineDrawing<{ turn: number }>({
    id: "sunflower",
    family: "sport",
    title: "Sunflower spinner",
    group: "Props",
    about: "A sunflower head seen from above that spins when a pinball rolls under it: a ring of pointed yellow petals round a brown middle dotted with seeds. The turn sets how far round it has spun.",
    params: { turn: 0 },
    settings: { turn: { kind: "number", min: 0, max: 1, step: 0.125 } },
    takes: [
        { label: "Still", params: { turn: 0 } },
        { label: "Spun a little", params: { turn: 0.25 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            // twelve petals look the same every twelfth of a turn, so a turn is read modulo that
            off = (((p.turn % 1) + 1) % 1) * ((Math.PI * 2) / 12);
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + off,
                tip = [U + Math.cos(a) * 0.9 * U, U + Math.sin(a) * 0.9 * U] as const,
                l = [U + Math.cos(a - 0.22) * 0.48 * U, U + Math.sin(a - 0.22) * 0.48 * U] as const,
                r = [U + Math.cos(a + 0.22) * 0.48 * U, U + Math.sin(a + 0.22) * 0.48 * U] as const;
            pen.polygon(g, [[...l], [...tip], [...r]], "pencil", pen.fill("glow", "solid"), {
                strokeWidth: 0.9,
                roughness: 0.3,
            });
        }
        pen.circle(g, U, U, 1.0 * U, "pencil", pen.fill("tang", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.3,
        });
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            pen.circle(
                g,
                U + Math.cos(a) * 0.24 * U,
                U + Math.sin(a) * 0.24 * U,
                0.12 * U,
                "ruler",
                pen.fill("ink-soft"),
                {
                    strokeWidth: 0.3,
                    disableMultiStroke: true,
                },
            );
        }
        return { middle: [U, U, "up"] };
    },
    describe: () =>
        "A sunflower head seen from above that spins on a pinball table, a ring of pointed yellow petals round a brown middle dotted with seeds.",
    motion: { still: "The sunflower spins only when the ball rolls under it." },
});
