import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";
import { LIQUID } from "./apparatus";

const X0 = 2 * U;
const LONG = 12 * U;
const TOP = 1.6 * U;
const BOTTOM = 3.8 * U;

/** Where the plunger's seal sits for a reading, from the nozzle end of the scale. */
const sealAt = (level: number, max: number): number =>
    X0 + (Math.max(0, Math.min(level, max)) / Math.max(1, max)) * LONG;

export const syringe = defineDrawing({
    id: "syringe",
    family: "science",
    title: "Syringe",
    group: "Structures",
    about: "A plastic syringe lying on its side, marked in millilitres from the nozzle, with the plunger's seal drawn exactly at the reading. With the nozzle capped, whatever is inside is shut in: air can be squashed into less room and springs back, and water hardly squashes at all. `particles` draws the same number of dots in the air however far the plunger is pushed, so a squashed syringe shows the particles closer together rather than fewer of them.",
    params: { max: 60, step: 10, level: 60, capped: 1, water: 0, particles: 0 },
    settings: {
        max: { kind: "whole", min: 10, max: 200 },
        step: { kind: "whole", min: 1, max: 50 },
        level: { kind: "whole", min: 0, max: 200 },
        capped: { kind: "whole", min: 0, max: 1 },
        water: { kind: "whole", min: 0, max: 1 },
        particles: { kind: "whole", min: 0, max: 40 },
    },
    takes: [
        {
            label: "60 ml of air, capped",
            params: { max: 60, step: 10, level: 60, capped: 1, water: 0, particles: 18 },
        },
        {
            label: "Squashed to 30 ml",
            params: { max: 60, step: 10, level: 30, capped: 1, water: 0, particles: 18 },
        },
        {
            label: "Full of water",
            params: { max: 60, step: 10, level: 40, capped: 1, water: 1, particles: 0 },
        },
    ],
    box: (p) => ({ w: Math.ceil((sealAt(p.level, p.max) + LONG + 1.4 * U) / U), h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            max = Math.max(1, p.max),
            seal = sealAt(p.level, max),
            mid = (TOP + BOTTOM) / 2;
        if (p.water > 0 && seal > X0 + 3)
            pen.rect(
                g,
                X0 + 2,
                TOP + 3,
                seal - X0 - 4,
                BOTTOM - TOP - 6,
                "ruler",
                pen.fill(LIQUID),
                {
                    strokeWidth: 0,
                },
            );
        const n = Math.max(0, Math.round(p.particles));
        if (p.water <= 0 && n > 0 && seal - X0 > 0.8 * U) {
            const w = seal - X0 - 10,
                h = BOTTOM - TOP - 10,
                rows = 3,
                cols = Math.ceil(n / rows);
            for (let k = 0; k < n; k++) {
                const r = k % rows,
                    col = Math.floor(k / rows),
                    jx = (((k * 37) % 11) / 11 - 0.5) * 0.5,
                    jy = (((k * 53) % 7) / 7 - 0.5) * 0.5;
                const x = X0 + 5 + ((col + 0.5 + jx) / cols) * w,
                    y = TOP + 5 + ((r + 0.5 + jy) / rows) * h;
                pen.circle(g, x, y, 0.32 * U, "pencil", pen.fill("berry"), { strokeWidth: 1 });
            }
        }
        // the barrel, the nozzle and its cap
        pen.rect(g, X0, TOP, LONG, BOTTOM - TOP, "ruler", null, { strokeWidth: 2.2 });
        pen.line(g, X0 + LONG, TOP - 0.5 * U, X0 + LONG, BOTTOM + 0.5 * U, "ruler", {
            strokeWidth: 2.4,
        });
        pen.path(
            g,
            `M${X0} ${mid - 0.45 * U}L${X0 - 1 * U} ${mid - 0.2 * U}V${mid + 0.2 * U}L${X0} ${mid + 0.45 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.8 },
        );
        if (p.capped > 0)
            pen.rect(g, X0 - 1.7 * U, mid - 0.4 * U, 0.8 * U, 0.8 * U, "ruler", pen.fill("berry"), {
                strokeWidth: 1.6,
            });
        // the plunger: its seal at the reading and its rod out past the end
        pen.rect(
            g,
            seal - 0.35 * U,
            TOP + 2,
            0.7 * U,
            BOTTOM - TOP - 4,
            "ruler",
            pen.fill("ink-soft"),
            {
                strokeWidth: 1.6,
            },
        );
        const end = seal + LONG + 0.4 * U;
        pen.line(g, seal + 0.35 * U, mid - 0.25 * U, end, mid - 0.25 * U, "ruler", {
            strokeWidth: 1.6,
        });
        pen.line(g, seal + 0.35 * U, mid + 0.25 * U, end, mid + 0.25 * U, "ruler", {
            strokeWidth: 1.6,
        });
        pen.line(g, end, TOP - 0.2 * U, end, BOTTOM + 0.2 * U, "ruler", { strokeWidth: 3 });
        // the scale along the top of the barrel
        const step = Math.max(1, p.step);
        for (let v = 0; v <= max + 1e-9; v += step) {
            const x = sealAt(v, max);
            pen.line(g, x, TOP, x, TOP + 0.45 * U, "ruler", { strokeWidth: 1.3 });
            patch(c, x, TOP - 0.5 * U, 1.4 * U, 14);
            num(c, x, TOP - 0.25 * U, v, 11);
            a[`mark(${v})`] = [x, TOP, "up"];
        }
        soft(c, X0 + LONG / 2, BOTTOM + 0.95 * U, "ml", 12);
        a.seal = [seal, BOTTOM, "down"];
        a.tip = [X0 - 1 * U, mid, "left"];
        a.inside = [(X0 + seal) / 2, BOTTOM, "down"];
        return a;
    },
    describe: (p) =>
        `A syringe on its side marked from 0 to ${p.max} ml with its plunger in, ${p.water > 0 ? "full of water" : p.particles > 0 ? `with ${p.particles} particles of air drawn inside` : "full of air"}${p.capped > 0 ? ", its nozzle capped" : ""}.`,
    reads: true,
});
