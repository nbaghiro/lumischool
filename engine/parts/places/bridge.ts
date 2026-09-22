import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The directions rain falls in, in degrees from straight down; the second is only drawn at `rain=2`. */
const RAIN_ANGLES = [14, -34];

/**
 * Rain in one direction, cut off at the box's edges. Near rain is drawn at twice the width of far
 * rain, since on paper a weight reads where a grey does not.
 */
function rainLines<G>(c: Ctx<G>, W: number, H: number, deg: number, width: number, step: number) {
    const { pen, g } = c,
        t = Math.tan((deg * Math.PI) / 180),
        m = 0.3 * U,
        run = Math.abs(t) * H;
    for (let x = m - run; x < W + run; x += step) {
        let top = m,
            bottom = H - m;
        if (t !== 0) {
            const a = m + (m - x) / t,
                b = m + (W - m - x) / t;
            top = Math.max(top, Math.min(a, b));
            bottom = Math.min(bottom, Math.max(a, b));
        }
        if (bottom - top < 0.8 * U) continue;
        pen.line(g, x + t * (top - m), top, x + t * (bottom - m), bottom, "ruler", {
            strokeWidth: width,
        });
    }
}

export const bridge = defineDrawing({
    id: "bridge",
    family: "places",
    title: "Bridge",
    group: "Structures",
    about: "A stone bridge of round arches over a river, with a parapet along the top and water under it. The arches are the same width, so a bridge can be a row to count or a length to share. `rain` draws straight rain over the scene, in one direction or, at 2, in two directions crossing, which is what a print gets wrong; the near rain is drawn at twice the width of the far rain, and `weight` draws the near lines, the far lines or both. With `far` at 1 there is a bank behind the arches and a bank at the front, the far one hatched twice as open as the near one, so which is further reads without colour.",
    params: { arches: 3, rain: 0, weight: "both", far: 0 },
    settings: {
        arches: { kind: "whole", min: 1, max: 6 },
        rain: { kind: "whole", min: 0, max: 2 },
        weight: { kind: "one of", of: ["both", "near", "far"] },
        far: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three arches", params: { arches: 3, rain: 0, weight: "both", far: 0 } },
        { label: "Five arches", params: { arches: 5, rain: 0, weight: "both", far: 0 } },
        { label: "Rain over it", params: { arches: 3, rain: 1, weight: "both", far: 0 } },
        {
            label: "Rain from two ways",
            params: { arches: 3, rain: 2, weight: "both", far: 0 },
        },
        {
            label: "The far bank, in far rain",
            params: { arches: 5, rain: 1, weight: "far", far: 1 },
        },
    ],
    box: (p) => ({
        w: Math.max(1, Math.min(6, Math.round(p.arches))) * 4 + 2,
        h: p.far > 0 ? 6 : 5,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(6, Math.round(p.arches))),
            W = (n * 4 + 2) * U,
            H = (p.far > 0 ? 6 : 5) * U,
            deck = 1.4 * U,
            spring = 3.6 * U,
            a: RawAnchors = {};
        if (p.far > 0) {
            pen.rect(
                g,
                0.2 * U,
                3.4 * U,
                W - 0.4 * U,
                0.65 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 10, fillWeight: 0.5 }),
                { strokeWidth: 1.2 },
            );
            a.farbank = [W / 2, 3.4 * U, "up"];
        }
        let d = `M${0.2 * U} ${deck}L${W - 0.2 * U} ${deck}L${W - 0.2 * U} ${spring + 0.6 * U}`;
        for (let i = n - 1; i >= 0; i--) {
            const x0 = (1 + i * 4) * U,
                x1 = x0 + 4 * U;
            d += `L${x1 - 0.3 * U} ${spring + 0.6 * U}L${x1 - 0.3 * U} ${spring}A${1.7 * U} ${1.6 * U} 0 0 0 ${x0 + 0.3 * U} ${spring}L${x0 + 0.3 * U} ${spring + 0.6 * U}`;
            a[`arch(${i})`] = [(x0 + x1) / 2, spring - 1.6 * U, "down"];
        }
        d += `L${0.2 * U} ${spring + 0.6 * U}Z`;
        pen.path(
            g,
            d,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
            { strokeWidth: 1.9 },
        );
        pen.rect(g, 0.2 * U, deck - 0.5 * U, W - 0.4 * U, 0.5 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.5,
        });
        for (let x = 0.8 * U; x < W - 0.5 * U; x += 1.1 * U)
            pen.line(g, x, deck - 0.5 * U, x, deck, "ruler", { strokeWidth: 0.9 });
        for (let x = 0.4 * U; x < W - 0.4 * U; x += 1.6 * U)
            pen.curve(
                g,
                [
                    [x, 4.6 * U],
                    [x + 0.4 * U, 4.3 * U],
                    [x + 0.8 * U, 4.6 * U],
                ],
                "pencil",
                { strokeWidth: 1.3 },
            );
        if (p.far > 0) {
            pen.rect(
                g,
                0.2 * U,
                5 * U,
                W - 0.4 * U,
                0.8 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
                { strokeWidth: 1.4 },
            );
            a.nearbank = [W / 2, 5 * U, "up"];
        }
        if (p.rain > 0) {
            const near = RAIN_ANGLES[0] ?? 14,
                far = p.rain > 1 ? (RAIN_ANGLES[1] ?? -34) : near;
            if (p.weight !== "far") rainLines(c, W, H, near, 2, 1.7 * U);
            if (p.weight !== "near") rainLines(c, W, H, far, 1, 1.1 * U);
            a.rain = [W / 2, 0.3 * U, "up"];
        }
        a.deck = [W / 2, deck - 0.5 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A stone bridge of ${p.arches === 1 ? "one round arch" : "round arches"} over a river, a parapet along the top, wavy water under it${p.rain > 0 ? ", and straight rain falling across" : ""}${p.far > 0 ? ", with banks behind and in front" : ""}.`,
});
