import { starPoints } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

export const divider = defineDrawing({
    id: "divider",
    family: "page",
    title: "Divider",
    group: "Marks",
    about: "A rule between sections, in four flavours. A page of maths needs somewhere to breathe, and a line that was clearly drawn by hand does it without looking like a table border.",
    params: { style: "wave", width: 22 },
    settings: {
        style: { kind: "one of", of: ["wave", "dots", "stars", "rule"] },
        width: { kind: "whole", min: 6, max: 30 },
    },
    takes: [
        { label: "Wave", params: { style: "wave", width: 22 } },
        { label: "Dots", params: { style: "dots", width: 22 } },
        { label: "Stars", params: { style: "stars", width: 22 } },
        { label: "Double rule", params: { style: "rule", width: 22 } },
    ],
    box: (p) => ({ w: p.width, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = U,
            w = (p.width - 2) * U,
            y = 1.5 * U;
        if (p.style === "wave") {
            const pts: Pt[] = [];
            for (let i = 0; i <= 24; i++)
                pts.push([x0 + (w * i) / 24, y + Math.sin((i / 24) * Math.PI * 6) * 7]);
            pen.curve(g, pts, "pencil", { strokeWidth: 2.2 });
        } else if (p.style === "dots") {
            for (let i = 0; i <= 12; i++)
                pen.circle(
                    g,
                    x0 + (w * i) / 12,
                    y,
                    7,
                    "pencil",
                    { fill: c.t["ink-soft"], fillStyle: "solid" },
                    { strokeWidth: 0.6, stroke: c.t["ink-soft"] },
                );
        } else if (p.style === "stars") {
            pen.line(g, x0, y, x0 + w / 2 - 1.4 * U, y, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t["ink-soft"],
            });
            pen.line(g, x0 + w / 2 + 1.4 * U, y, x0 + w, y, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t["ink-soft"],
            });
            for (const dx of [-0.9, 0, 0.9])
                pen.polygon(
                    g,
                    starPoints(x0 + w / 2 + dx * U, y, dx === 0 ? 0.5 * U : 0.34 * U),
                    "doodle",
                    pen.fill("glow"),
                    { strokeWidth: 1.2 },
                );
        } else {
            pen.line(g, x0, y, x0 + w, y, "pencil", { strokeWidth: 2.6 });
            pen.line(g, x0 + 10, y + 6, x0 + w - 10, y + 6, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        }
        const a: RawAnchors = {
            middle: [x0 + w / 2, y, "up"],
            left: [x0, y, "left"],
            right: [x0 + w, y, "right"],
        };
        return a;
    },
    describe: (p) => {
        const how =
            p.style === "dots"
                ? "drawn as a row of small dots"
                : p.style === "stars"
                  ? "a thin line broken in the middle by three small stars"
                  : p.style === "rule"
                    ? "a heavy line with a thinner one under it"
                    : "drawn as a gentle wave";
        return `A hand-drawn rule running across the page to separate one section from the next, ${how}.`;
    },
});
