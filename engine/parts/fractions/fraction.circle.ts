import { defineDrawing } from "../drawing";

export const fractionCircle = defineDrawing({
    id: "fraction.circle",
    family: "fractions",
    title: "Fraction circle",
    group: "Structures",
    about: "Equal sectors; the first k are shaded.",
    params: { n: 4, k: 1 },
    settings: { n: { kind: "whole", min: 1, max: 12 }, k: { kind: "whole", min: 0, max: 12 } },
    takes: [
        { label: "A quarter", params: { n: 4, k: 1 } },
        { label: "A half", params: { n: 2, k: 1 } },
        { label: "Two thirds", params: { n: 3, k: 2 } },
        { label: "Five eighths", params: { n: 8, k: 5 } },
    ],
    box: () => ({ w: 5, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 50,
            cy = 50,
            r = 42;
        for (let i = 0; i < p.n; i++) {
            const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / p.n,
                a1 = a0 + (2 * Math.PI) / p.n;
            const d = `M${cx} ${cy}L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}A${r} ${r} 0 ${p.n === 1 ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}Z`;
            pen.path(
                g,
                d,
                "ruler",
                i < p.k ? pen.fill("tang", "hachure", { hachureGap: 5 }) : null,
                { strokeWidth: 1.6 },
            );
        }
        pen.circle(g, cx, cy, r * 2, "ruler", null, { strokeWidth: 2.2 });
        return { centre: [cx, cy, "up"], top: [cx, cy - r, "up"] };
    },
    describe: () =>
        "A circle cut into equal sectors from its centre, some of them shaded with orange hatching and the rest left white.",
});
