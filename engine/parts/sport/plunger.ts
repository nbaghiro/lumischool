import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const plunger = defineDrawing<{ pull: number }>({
    id: "plunger",
    family: "sport",
    title: "Pinball plunger",
    group: "Props",
    about: "The plunger at the foot of a pinball shooter lane, seen from above: a round wooden knob, a coiled spring and a rod with a plate at its top that the ball sits on. Pulled back, the spring squeezes.",
    params: { pull: 0 },
    settings: { pull: { kind: "number", min: 0, max: 1, step: 0.1 } },
    takes: [
        { label: "At rest", params: { pull: 0 } },
        { label: "Pulled right back", params: { pull: 1 } },
    ],
    box: () => ({ w: 2, h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            pull = Math.max(0, Math.min(1, p.pull)),
            plate = (0.4 + pull * 1.3) * U,
            knob = 3.3 * U;
        pen.linear(
            g,
            [
                [U, plate],
                [U, knob],
            ],
            "ruler",
            { strokeWidth: 2.2, stroke: c.t["ink-soft"] },
        );
        // the spring's coils crowd together as the plate comes down
        const coils = 7,
            top = plate + 0.25 * U,
            bottom = knob - 0.45 * U;
        const pts: [number, number][] = [];
        for (let i = 0; i <= coils * 2; i++)
            pts.push([U + (i % 2 ? 0.45 : -0.45) * U, top + ((bottom - top) * i) / (coils * 2)]);
        pen.linear(g, pts, "pencil", { strokeWidth: 1.1, stroke: c.t.ink, roughness: 0.2 });
        pen.rect(g, 0.35 * U, plate - 0.2 * U, 1.3 * U, 0.35 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.2,
            roughness: 0.2,
        });
        pen.circle(g, U, knob, 1.1 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
            roughness: 0.3,
        });
        return { plate: [U, plate, "up"], knob: [U, knob, "down"] };
    },
    describe: () =>
        "A pinball plunger seen from above, a round wooden knob below a coiled spring and a rod topped by the small plate the ball rests on.",
    motion: { still: "The plunger moves only as far as the game pulls it back." },
});
