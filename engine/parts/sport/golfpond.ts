import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash, wash } from "../outdoors/wash";

const KINDS = ["water", "mud"] as const;

export const golfPond = defineDrawing<{ kind: string; width: number; height: number }>({
    id: "golfpond",
    family: "sport",
    title: "Putting hazard",
    group: "Props",
    about: "A hazard on a putting course seen from above: still water drawn with short ripples, which sends a ball back, or brown mud with dabs, which slows it hard.",
    params: { kind: "water", width: 6, height: 5 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        width: { kind: "number", min: 1, max: 20, step: 0.5 },
        height: { kind: "number", min: 1, max: 20, step: 0.5 },
    },
    takes: [
        { label: "A pond", params: { kind: "water", width: 6, height: 5 } },
        { label: "A strip of mud", params: { kind: "mud", width: 4, height: 9 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const w = p.width * U,
            h = p.height * U,
            water = p.kind !== "mud";
        // inset by the pencil's wobble, so the rough outline stays inside the box; on paper the
        // hatched fill overshoots its shape by a few units, so it is inset further
        const m = 0.15 * U,
            f = 0.5 * U;
        wash(c, `M${f} ${f}H${w - f}V${h - f}H${f}Z`, water ? "sky" : "tang", 0.3, true);
        c.pen.rect(c.g, m, m, w - 2 * m, h - 2 * m, "pencil", null, {
            strokeWidth: 1.4,
            stroke: water ? c.t.sky : c.t["ink-soft"],
            roughness: 0.3,
        });
        // a ripple runs 1.3 squares right of its start and a dab 0.3 below it, so neither leaves the box
        for (let y = 0.8 * U; y < h - 0.8 * U; y += 1.3 * U)
            for (let x = 0.6 * U; x < w - 1.6 * U; x += 1.6 * U) {
                const k = hash(x, y);
                const px = x + k * 0.5 * U;
                if (water)
                    c.pen.path(
                        c.g,
                        `M${px} ${y}q${0.2 * U} ${-0.18 * U} ${0.4 * U} 0t${0.4 * U} 0`,
                        "pencil",
                        null,
                        { strokeWidth: 0.9, stroke: c.t.sky },
                    );
                else
                    c.pen.circle(
                        c.g,
                        px,
                        y,
                        (0.18 + k * 0.12) * U,
                        "pencil",
                        c.pen.fill("ink-soft", "solid"),
                        {
                            strokeWidth: 0.6,
                            roughness: 0.4,
                        },
                    );
            }
        return {};
    },
    describe: (p) =>
        p.kind === "mud"
            ? "A brown patch of mud on a putting course seen from above, dabbed with dark lumps, thick enough to slow a rolling ball almost to a stop."
            : "A rectangular pond on a putting course seen from above, washed blue with small curling ripples, where a ball that rolls in is sent back.",
});
