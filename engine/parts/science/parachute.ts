import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch } from "../lettering";

/** The words a falling thing's motion is written in, on the drawing and in a question's options. */
export const FALLS = {
    faster: "speeding up",
    steady: "steady speed",
    slower: "slowing down",
} as const;

/** Whether a falling thing is speeding up, falling steadily or slowing down, from its two forces. */
export const fallOf = (weight: number, drag: number): "faster" | "steady" | "slower" =>
    drag < weight ? "faster" : drag === weight ? "steady" : "slower";

/** An arrow's length in squares for a force in newtons, so a bigger force is visibly longer. */
const armN = (v: number): number => Math.max(1.6, Math.min(4, 1.2 + v * 0.35));

/** A short streak above something falling fast. */
function ghostLine<G>(c: Ctx<G>, x: number, y: number, len: number): void {
    c.pen.line(c.g, x, y, x, y + len, "pencil", {
        strokeWidth: 1.4,
        stroke: c.t["ink-soft"],
        strokeLineDash: [5, 5],
    });
}

export const parachute = defineDrawing({
    id: "parachute",
    family: "science",
    title: "Parachute",
    group: "Structures",
    about: "A toy falling under a parachute, with its weight drawn as an arrow pulling down and the air pushing up on the canopy as an arrow the other way. A bigger force is a longer arrow. When the push of the air is less than the weight the toy speeds up, and the streaks behind it say so; when they are equal it falls at a steady speed; a wider canopy catches more air. With no canopy the air's push is small.",
    params: { canopy: 5, weight: 6, drag: 6, labels: 1, unit: "N", tag: "", show: 1 },
    settings: {
        canopy: { kind: "whole", min: 0, max: 9 },
        weight: { kind: "whole", min: 0, max: 10 },
        drag: { kind: "whole", min: 0, max: 10 },
        labels: { kind: "whole", min: 0, max: 1 },
        unit: { kind: "text", most: 3 },
        tag: { kind: "text", most: 2 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Falling steadily",
            params: { canopy: 5, weight: 6, drag: 6, labels: 1, unit: "N", tag: "", show: 1 },
        },
        {
            label: "A small canopy, speeding up",
            params: { canopy: 3, weight: 6, drag: 3, labels: 1, unit: "N", tag: "", show: 1 },
        },
        {
            label: "No canopy",
            params: { canopy: 0, weight: 6, drag: 1, labels: 1, unit: "N", tag: "", show: 1 },
        },
    ],
    box: () => ({ w: 12, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cx = 6 * U,
            cw = Math.max(0, Math.min(9, Math.round(p.canopy))) * U;
        const ctop = 4.6 * U,
            cbot = ctop + 1.8 * U,
            loadTop = 8.6 * U;
        if (p.tag) num(c, 0.5 * U, 1.4 * U, p.tag, 22, "start");
        const tag = (v: number) => (p.labels > 0 ? `${v} ${p.unit}` : "");
        const arrow = (x: number, y0: number, len: number, dir: 1 | -1, label: string) => {
            const y1 = y0 + dir * len;
            pen.line(g, x, y0, x, y1 - dir * 10, "ruler", { strokeWidth: 3 });
            pen.polygon(
                g,
                [
                    [x, y1],
                    [x - 8, y1 - dir * 13],
                    [x + 8, y1 - dir * 13],
                ],
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1.2 },
            );
            if (label) {
                patch(
                    c,
                    x + 0.5 * U + label.length * 4.2,
                    (y0 + y1) / 2 - 5,
                    label.length * 8.5 + 8,
                    18,
                );
                num(c, x + 0.5 * U, (y0 + y1) / 2, label, 14, "start");
            }
        };
        if (cw > 0) {
            const l = cx - cw / 2,
                r = cx + cw / 2,
                n = Math.max(2, Math.round(cw / U / 1.5));
            let d = `M${l} ${cbot}Q${l} ${ctop} ${cx} ${ctop}Q${r} ${ctop} ${r} ${cbot}`;
            for (let i = n - 1; i >= 0; i--)
                d += `Q${l + ((i + 0.5) * cw) / n} ${cbot - 0.5 * U} ${l + (i * cw) / n} ${cbot}`;
            pen.path(g, `${d}Z`, "pencil", pen.fill("berry"), { strokeWidth: 1.9 });
            for (let i = 1; i < n; i++)
                pen.line(
                    g,
                    l + (i * cw) / n,
                    cbot,
                    cx + (l + (i * cw) / n - cx) * 0.3,
                    ctop + 0.15 * U,
                    "pencil",
                    { strokeWidth: 1, stroke: c.t.card },
                );
            for (const x of [l, cx - cw / 6, cx + cw / 6, r])
                pen.line(g, x, cbot, cx + (x < cx ? -0.3 : 0.3) * U, loadTop, "pencil", {
                    strokeWidth: 1,
                });
            a.canopy = [cx, ctop, "up"];
        }
        // the toy: a round head and a body, hanging from its strings
        pen.circle(g, cx, loadTop + 0.4 * U, 0.8 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.5,
        });
        pen.path(
            g,
            `M${cx - 0.6 * U} ${loadTop + 0.8 * U}H${cx + 0.6 * U}L${cx + 0.8 * U} ${loadTop + 2.2 * U}H${cx - 0.8 * U}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.6 },
        );
        a.toy = [cx, loadTop + 2.2 * U, "down"];
        arrow(cx, loadTop + 2.3 * U, armN(p.weight) * U, 1, tag(p.weight));
        arrow(
            cw > 0 ? cx : cx + 1.5 * U,
            cw > 0 ? ctop - 0.1 * U : loadTop,
            armN(p.drag) * U,
            -1,
            tag(p.drag),
        );
        const fall = fallOf(p.weight, p.drag);
        // streaks either side of it, clear of the arrow and its label, while it is still speeding up;
        // a drawing for a prediction leaves out both the streaks and the words
        if (p.show > 0 && fall === "faster")
            for (const s of [-1, 1])
                for (const dx of [0.4, 1.1])
                    ghostLine(
                        c,
                        cx + s * (Math.max(cw / 2, 0.9 * U) + dx * U),
                        (cw > 0 ? ctop : loadTop) - 1.8 * U,
                        1.6 * U,
                    );
        if (p.show > 0) cap(c, cx, 14.6 * U, FALLS[fall], 10);
        return a;
    },
    describe: (p) =>
        `A toy falling ${p.canopy > 0 ? "under a parachute" : "with no parachute"}, its weight drawn as an arrow pulling down and the push of the air on it as an arrow up.`,
    reads: true,
});
