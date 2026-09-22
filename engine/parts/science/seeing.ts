import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { type Pt, headAt } from "./optics";

/** The ways the arrows in the seeing picture can go, and which of them is how we see. */
export const SIGHT = [
    "none",
    "lamp to ball to eye",
    "eye to ball",
    "lamp to eye",
    "lamp to ball",
] as const;

export const seesRight = (lamp: number, arrows: number): boolean =>
    lamp > 0 && Math.round(arrows) === 1;

export const seeing = defineDrawing({
    id: "seeing",
    family: "science",
    title: "How we see",
    group: "Structures",
    about: "A lamp, a ball and a child looking at it, with arrows for the light. We see the ball because light from the lamp bounces off it and into the eye, which is arrows 1; arrows 2 go from the eye to the ball, the way many children think it works; 3 go from the lamp to the eye and leave the ball out; 4 stop at the ball. With the lamp off the room is dark and there is nothing to see by.",
    params: { lamp: 1, arrows: 1, tag: "" },
    settings: {
        lamp: { kind: "whole", min: 0, max: 1 },
        arrows: { kind: "whole", min: 0, max: 4 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        { label: "Lamp to ball to eye", params: { lamp: 1, arrows: 1, tag: "" } },
        { label: "The eye sends it out", params: { lamp: 1, arrows: 2, tag: "" } },
        { label: "The lamp is off", params: { lamp: 0, arrows: 0, tag: "" } },
    ],
    box: () => ({ w: 17, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            on = p.lamp > 0,
            k = Math.round(p.arrows),
            floor = 8.2 * U;
        if (!on)
            pen.rect(
                g,
                0.2 * U,
                0.2 * U,
                16.6 * U,
                8.6 * U,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
                { strokeWidth: 0 },
            );
        if (p.tag) num(c, 16.4 * U, 1.4 * U, p.tag, 22, "end");
        pen.line(g, 0.4 * U, floor, 16.6 * U, floor, "ruler", { strokeWidth: 2.2 });
        // the lamp, hanging from the ceiling
        const lx = 2.8 * U,
            ly = 2.4 * U;
        pen.line(g, lx, 0, lx, ly - 0.9 * U, "ruler", { strokeWidth: 1.6 });
        pen.path(
            g,
            `M${lx - 1.2 * U} ${ly}L${lx - 0.5 * U} ${ly - 0.9 * U}H${lx + 0.5 * U}L${lx + 1.2 * U} ${ly}Z`,
            "ruler",
            pen.fill("berry"),
            { strokeWidth: 1.8 },
        );
        pen.circle(g, lx, ly + 0.2 * U, 0.9 * U, "ruler", pen.fill(on ? "glow" : "card"), {
            strokeWidth: 1.4,
        });
        a.lamp = [lx, ly + 0.7 * U, "down"];
        // the ball on the floor, and the child looking at it
        const bx = 8.4 * U,
            by = floor - 0.9 * U;
        pen.circle(g, bx, by, 1.8 * U, "pencil", pen.fill("tang"), { strokeWidth: 1.8 });
        pen.arc(
            g,
            bx - 0.2 * U,
            by - 0.3 * U,
            1 * U,
            0.8 * U,
            Math.PI * 1.1,
            Math.PI * 1.7,
            "pencil",
            { strokeWidth: 1.2 },
        );
        a.ball = [bx, by - 0.9 * U, "up"];
        const ex = 13.4 * U,
            ey = 4.2 * U,
            bx0 = ex + 0.9 * U;
        pen.path(
            g,
            `M${bx0 - 0.8 * U} ${ey + 1.6 * U}H${bx0 + 0.8 * U}L${bx0 + 1.3 * U} ${floor}H${bx0 - 1.3 * U}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.8 },
        );
        headAt(c, ex, ey, -1);
        a.eye = [ex, ey - 1.6 * U, "up"];
        if (!on) return a;
        const arrow = (from: Pt, to: Pt) => {
            const L = Math.hypot(to[0] - from[0], to[1] - from[1]),
                ux = (to[0] - from[0]) / L,
                uy = (to[1] - from[1]) / L;
            pen.line(
                g,
                from[0] + ux * 8,
                from[1] + uy * 8,
                to[0] - ux * 10,
                to[1] - uy * 10,
                "pencil",
                { strokeWidth: 2.2, stroke: c.t.pen },
            );
            const hx = to[0] - ux * 8,
                hy = to[1] - uy * 8;
            for (const s of [-1, 1])
                pen.line(
                    g,
                    hx,
                    hy,
                    hx - ux * 11 + s * uy * 6,
                    hy - uy * 11 - s * ux * 6,
                    "pencil",
                    { strokeWidth: 2.2, stroke: c.t.pen },
                );
        };
        const lamp: Pt = [lx + 0.6 * U, ly + 0.8 * U],
            ball: Pt = [bx - 0.2 * U, by - 0.9 * U],
            ball2: Pt = [bx + 0.8 * U, by - 0.5 * U],
            eye: Pt = [ex - 0.8 * U, ey + 0.1 * U];
        if (k === 1) {
            arrow(lamp, ball);
            arrow(ball2, eye);
        } else if (k === 2) arrow(eye, ball2);
        else if (k === 3) arrow(lamp, eye);
        else if (k === 4) arrow(lamp, ball);
        return a;
    },
    describe: (p) =>
        `A lamp${p.lamp > 0 ? "" : ", switched off"}, a ball and a child looking at it, ${p.arrows > 0 ? "with arrows drawn for the way the light goes between them" : "with no arrows drawn for the light yet"}.`,
    reads: true,
});
