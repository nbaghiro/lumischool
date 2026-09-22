import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp } from "../animals/nature";

export const ammonite = defineDrawing({
    id: "ammonite",
    family: "outdoors",
    title: "Ammonite",
    group: "Props",
    about: "An ammonite: the stone shell of a sea animal that lived before the last dinosaurs, coiled in a spiral with ribs across it that get wider as the shell grows. The ribs can be counted, and the spiral grows by the same rule all the way round.",
    params: { count: 1, ribs: 14 },
    settings: {
        count: { kind: "whole", min: 1, max: 4 },
        ribs: { kind: "whole", min: 6, max: 24 },
    },
    takes: [
        { label: "One, fourteen ribs", params: { count: 1, ribs: 14 } },
        { label: "Three", params: { count: 3, ribs: 10 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 4) * 5 + 1, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 4),
            ribs = clamp(p.ribs, 6, 24),
            turns = 3.2,
            R = 2.15 * U,
            a: RawAnchors = {};
        const k = Math.log(R / (0.14 * U)) / (turns * Math.PI * 2);
        for (let i = 0; i < n; i++) {
            const cx = (2.9 + i * 5) * U,
                cy = 2.5 * U,
                rot = i * 1.3,
                S = (th: number): Pt => {
                    const r = 0.14 * U * Math.exp(k * th);
                    return [cx + r * Math.cos(th + rot), cy + r * Math.sin(th + rot)];
                };
            const max = turns * Math.PI * 2;
            const outline: Pt[] = [];
            for (let th = max - Math.PI * 2; th <= max + 0.01; th += 0.2) outline.push(S(th));
            pen.polygon(
                g,
                outline,
                "pencil",
                pen.fill(i % 2 ? "glow" : "tang", "hachure", { hachureGap: 4.5, fillWeight: 0.8 }),
                { strokeWidth: 1.9 },
            );
            const line: Pt[] = [];
            for (let th = 0; th <= max - Math.PI * 2; th += 0.25) line.push(S(th));
            pen.curve(g, line, "pencil", { strokeWidth: 1.5 });
            // the ribs across the last whorl, and finer ones across the whorl inside it
            for (let j = 0; j < ribs; j++) {
                const th = max - Math.PI * 2 + ((j + 0.5) / ribs) * Math.PI * 2,
                    o = S(th),
                    inner = S(th - Math.PI * 2);
                pen.curve(
                    g,
                    [inner, [(inner[0] + o[0]) / 2 + 2, (inner[1] + o[1]) / 2 + 2], o],
                    "pencil",
                    { strokeWidth: 1.1 },
                );
            }
            for (let j = 0; j < Math.floor(ribs * 0.7); j++) {
                const th = max - Math.PI * 2 + ((j + 0.5) / Math.floor(ribs * 0.7)) * Math.PI * 2;
                pen.line(g, ...S(th - Math.PI * 4), ...S(th - Math.PI * 2), "pencil", {
                    strokeWidth: 0.9,
                });
            }
            a[`shell(${i})`] = [cx, cy - R, "up"];
        }
        return a;
    },
    describe: (p) =>
        `${clamp(p.count, 1, 4) > 1 ? "Ammonite shells side by side, each" : "An ammonite shell"} coiled in a spiral, with ribs curving across the outer whorl and finer ribs across the whorl inside it.`,
});
