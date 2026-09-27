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

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** A nettle leaf: a pointed heart with a toothed edge, from its stalk at `at` out towards `dir`. */
function leaf(x: number, y: number, dir: number, size: number): string {
    const teeth = 5,
        pts: string[] = [];
    for (let i = 0; i <= teeth; i++) {
        const t = i / teeth,
            along = x + dir * size * t,
            wide = Math.sin(Math.PI * t) * size * 0.42 * (1 - 0.35 * t);
        pts.push(`${along.toFixed(1)} ${(y - wide - (i % 2 ? 1.6 : 0)).toFixed(1)}`);
    }
    for (let i = teeth - 1; i >= 1; i--) {
        const t = i / teeth,
            along = x + dir * size * t,
            wide = Math.sin(Math.PI * t) * size * 0.42 * (1 - 0.35 * t);
        pts.push(`${along.toFixed(1)} ${(y + wide * 0.55 + (i % 2 ? 1.2 : 0)).toFixed(1)}`);
    }
    return `M${x} ${y}L${pts.join("L")}Z`;
}

export const nettle = defineDrawing({
    id: "nettle",
    family: "outdoors",
    title: "Stinging nettles",
    group: "Props",
    about: "A clump of stinging nettles seen from the side: upright square stems, toothed leaves in pairs up each stem, and the fine stinging hairs that make them a thing to go round rather than through.",
    params: { stems: 3 },
    settings: { stems: { kind: "whole", min: 1, max: 5 } },
    takes: [
        { label: "Three stems", params: { stems: 3 } },
        { label: "One stem", params: { stems: 1 } },
        { label: "A thick clump of five", params: { stems: 5 } },
    ],
    box: (p) => ({ w: Math.ceil(whole(p.stems, 1, 5, 3) * 1.4 + 1.4), h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            n = whole(p.stems, 1, 5, 3),
            w = Math.ceil(n * 1.4 + 1.4) * U,
            base = 3.9 * U;
        for (let k = 0; k < n; k++) {
            const x = 1.2 * U + k * 1.4 * U,
                top = (0.4 + (k % 2) * 0.5) * U;
            pen.line(g, x, base, x + (k % 2 ? 2 : -2), top, "ruler", {
                ...calm(c, 1.6),
                stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            });
            for (let j = 0; j < 3; j++) {
                const y = base - (0.8 + j * 0.95) * U + (k % 2) * 3,
                    size = (1.05 - j * 0.2) * U;
                for (const dir of [-1, 1])
                    pen.path(
                        g,
                        leaf(x, y, dir, size),
                        "ruler",
                        pen.fill("mint", "solid"),
                        calm(c, 1.2),
                    );
                for (const dir of [-1, 1])
                    pen.line(
                        g,
                        x + dir * size * 0.5,
                        y - 3,
                        x + dir * size * 0.5 + dir * 2,
                        y - 7,
                        "ruler",
                        {
                            strokeWidth: 0.8,
                            disableMultiStroke: true,
                        },
                    );
            }
        }
        return { top: [w / 2, 0.4 * U, "up"], foot: [w / 2, base, "down"] };
    },
    describe: (p) =>
        `${whole(p.stems, 1, 5, 3) === 1 ? "A single stinging nettle" : "A clump of stinging nettles"} seen from the side, upright stems with pairs of toothed green leaves and fine hairs standing out from them.`,
});
