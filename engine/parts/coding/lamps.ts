import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** Where a lamp, a sorting card and a cup are inside their drawings, for a hand on screen. */
export const lampAt = (i: number): { x: number; y: number; w: number; h: number } => ({
    x: (2 + i * 3) * U - 1.4 * U,
    y: 2.2 * U,
    w: 2.8 * U,
    h: 3.2 * U,
});

export const lamps = defineDrawing({
    id: "lamps",
    family: "coding",
    title: "Lamps that count in binary",
    group: "Structures",
    about: "A row of lamps, each worth double the one on its right (1, 2, 4, 8 and on), lit to show a number. A child adds up the lit lamps to read it, or lights the lamps to make one: on screen by tapping them, on paper by colouring them in. `sum` writes the total under the row, and `places` writes each lamp's worth over it.",
    params: { bits: 4, n: 5, places: true, sum: false },
    settings: {
        bits: { kind: "whole", min: 1, max: 8 },
        n: { kind: "whole", min: 0, max: 255 },
        places: { kind: "flag" },
        sum: { kind: "flag" },
    },
    takes: [
        { label: "5 in four lamps", params: { bits: 4, n: 5, places: true, sum: true } },
        { label: "All off", params: { bits: 4, n: 0, places: true, sum: false } },
        { label: "13 in five lamps", params: { bits: 5, n: 13, places: true, sum: false } },
    ],
    box: (p) => ({ w: Math.max(1, Math.round(p.bits)) * 3 + 1, h: 7 + (p.sum ? 2 : 0) }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            bits = Math.max(1, Math.min(8, Math.round(p.bits)));
        const n = Math.max(0, Math.round(p.n));
        for (let i = 0; i < bits; i++) {
            const place = 2 ** (bits - 1 - i),
                on = Math.floor(n / place) % 2 === 1;
            const x = (2 + i * 3) * U,
                y = 3.6 * U;
            if (p.places) num(c, x, 1.5 * U, String(place), 16, "middle", c.t["ink-soft"]);
            if (on && !c.paper)
                for (let k = 0; k < 8; k++) {
                    const t = (k / 8) * Math.PI * 2;
                    pen.line(
                        g,
                        x + 17 * Math.cos(t),
                        y + 17 * Math.sin(t),
                        x + 22 * Math.cos(t),
                        y + 22 * Math.sin(t),
                        "pencil",
                        { strokeWidth: 1.6, stroke: "#E0A800" },
                    );
                }
            pen.circle(
                g,
                x,
                y,
                1.4 * U,
                "pencil",
                on
                    ? pen.fill("glow")
                    : { fill: c.paper ? c.t.card : "#E7EBF0", fillStyle: "solid" },
                { strokeWidth: 1.8 },
            );
            pen.rect(g, x - 0.45 * U, y + 0.75 * U, 0.9 * U, 0.8 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            for (const dy of [0.95, 1.25])
                pen.line(g, x - 0.45 * U, y + dy * U, x + 0.45 * U, y + dy * U, "ruler", {
                    strokeWidth: 0.8,
                });
            if (on && c.paper)
                for (let k = 0; k < 6; k++) {
                    const t = (k / 6) * Math.PI * 2 - Math.PI / 2;
                    pen.line(
                        g,
                        x + 17 * Math.cos(t),
                        y + 17 * Math.sin(t),
                        x + 21 * Math.cos(t),
                        y + 21 * Math.sin(t),
                        "pencil",
                        { strokeWidth: 1.3 },
                    );
                }
            a[`lamp(${i + 1})`] = [x, y - 1.4 * U, "up"];
        }
        if (p.sum) num(c, ((bits * 3 + 1) * U) / 2, 7.6 * U, `= ${n}`, 20);
        return a;
    },
    describe: (p) =>
        `A row of ${p.bits} lamps each worth double the one on its right, some lit, ${p.places ? "each lamp's worth written over it" : "with no worths written over them"}.`,
});
