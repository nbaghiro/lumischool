import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "./wash";

/** A slatted compost bin seen from above, heaped with peelings and leaves. */
export const compostBin = defineDrawing<{ heap: number }>({
    id: "compostbin",
    family: "outdoors",
    title: "Compost bin",
    group: "Structures",
    about: "A square compost bin of wooden slats seen from above, heaped inside with brown earth, green leaves and orange peelings slowly turning back into soil.",
    params: { heap: 2 },
    settings: { heap: { kind: "number", min: 0, max: 3, step: 1 } },
    takes: [
        { label: "Heaped", params: { heap: 3 } },
        { label: "Nearly empty", params: { heap: 0 } },
    ],
    box: () => ({ w: 4, h: 4 }),
    draw: (c, p) => {
        const m = 0.2 * U,
            s = 4 * U - 2 * m,
            heap = Math.max(0, Math.min(3, Math.round(p.heap)));
        if (!c.paper)
            plain(c, {
                kind: "rect",
                x: m,
                y: m,
                w: s,
                h: s,
                fill: c.t["ink-soft"],
                opacity: 0.14,
            });
        c.pen.rect(c.g, m, m, s, s, "pencil", null, { strokeWidth: 1.6 });
        for (const f of [0.25, 0.5, 0.75])
            c.pen.line(c.g, m + 0.2 * U, m + s * f, m + s - 0.2 * U, m + s * f, "pencil", {
                stroke: c.t["ink-soft"],
                strokeWidth: 0.6,
            });
        const bits = heap * 5;
        for (let i = 0; i < bits; i++) {
            const x = m + 0.6 * U + hash(i, 3) * (s - 1.2 * U),
                y = m + 0.6 * U + hash(i, 7) * (s - 1.2 * U);
            c.pen.ellipse(
                c.g,
                x,
                y,
                0.55 * U,
                0.3 * U,
                "pencil",
                c.pen.fill(i % 3 === 0 ? "tang" : "mint", "solid"),
                {
                    strokeWidth: 0.5,
                },
            );
        }
        return {};
    },
    describe: (p) =>
        p.heap > 0
            ? "A square wooden compost bin seen from above, heaped with brown earth, green leaves and orange peelings slowly turning back into rich soil."
            : "A square wooden compost bin seen from above, its slatted sides round an almost empty floor of dark earth, ready for peelings and leaves.",
    motion: { still: "A bin stands in its corner of the plot; it does not move." },
});
