import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { say } from "../lettering";

export const angleFig = defineDrawing({
    id: "angle",
    family: "shapes",
    title: "Angle",
    group: "Structures",
    about: "Two arms from one vertex, with an arc across the turn. Reads right up to a reflex angle.",
    params: { deg: 130, arm: 5, label: "", mark: "arc", line: false },
    settings: {
        deg: { kind: "whole", min: 0, max: 180 },
        arm: { kind: "whole", min: 2, max: 8 },
        label: { kind: "text", most: 6 },
        mark: { kind: "one of", of: ["arc", "square", "none"] },
        line: { kind: "flag" },
    },
    takes: [
        {
            label: "Obtuse, with an arc",
            params: { deg: 130, arm: 5, label: "", mark: "arc", line: false },
        },
        {
            label: "A right angle",
            params: { deg: 90, arm: 5, label: "", mark: "square", line: false },
        },
        {
            label: "On a straight line",
            params: { deg: 55, arm: 5, label: "a", mark: "arc", line: true },
        },
    ],
    box: (p) => ({ w: p.arm * 2 + 2, h: p.arm * 2 + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            L = p.arm * U,
            vx = (p.arm + 1) * U,
            vy = (p.arm + 1) * U;
        const rad = (p.deg * Math.PI) / 180;
        const end: [number, number] = [vx + L * Math.cos(rad), vy - L * Math.sin(rad)];
        // With `line` the first arm runs straight through the vertex, so the drawing shows two angles
        // on a straight line rather than one angle on its own.
        if (p.line) pen.line(g, vx - L, vy, vx, vy, "ruler", { strokeWidth: 2.2 });
        pen.line(g, vx, vy, vx + L, vy, "ruler", { strokeWidth: 2.2 });
        pen.line(g, vx, vy, end[0], end[1], "ruler", { strokeWidth: 2.2 });
        const r = Math.max(22, L * 0.32);
        if (p.mark === "square") {
            const s = 16;
            pen.linear(
                g,
                [
                    [vx + s, vy],
                    [vx + s, vy - s],
                    [vx, vy - s],
                ],
                "ruler",
                { strokeWidth: 1.6 },
            );
        } else if (p.mark === "arc") {
            // rough.js arcs run clockwise in screen coordinates, so an angle of d degrees above the
            // first arm is the arc from -d to 0.
            pen.arc(g, vx, vy, r * 2, r * 2, -rad, 0, "ruler", { strokeWidth: 1.6 });
        }
        if (p.label) {
            const mid = rad / 2,
                rr = r + 18;
            say(c, vx + rr * Math.cos(mid), vy - rr * Math.sin(mid) + 6, p.label, 17);
        }
        pen.circle(g, vx, vy, 7, "ruler", pen.fill("ink"), { strokeWidth: 1 });
        return {
            vertex: [vx, vy, "up"],
            "arm(0)": [vx + L, vy, "right"],
            "arm(1)": [end[0], end[1], "up"],
        };
    },
    describe: (p) =>
        `An angle drawn in ink as two straight arms meeting at a point${p.mark === "square" ? ", with a small square marked at the corner" : p.mark === "arc" ? ", with an arc marked at the corner" : ", the corner left plain"}${p.label ? " and a label written by it" : ""}.`,
    motion: { still: STILL.instrument },
});
