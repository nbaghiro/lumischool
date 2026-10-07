import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const knockCover = defineDrawing<{ flying: number }>({
    id: "knockcover",
    family: "sport",
    title: "Knock it down",
    group: "Props",
    about: "The knock-down game in one picture: a little brick house with a roof and windows, a ball flying up from a wooden tray along a dotted path, and bricks knocked loose tumbling away from the corner it struck.",
    params: { flying: 3 },
    settings: { flying: { kind: "whole", min: 0, max: 4 } },
    takes: [
        { label: "Bricks flying", params: { flying: 3 } },
        { label: "Before the hit", params: { flying: 0 } },
    ],
    box: () => ({ w: 14, h: 12 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            edge = { strokeWidth: 1.2, roughness: 0.3 },
            soft = c.paper ? c.t.ink : c.t["ink-soft"],
            flying = Math.max(0, Math.min(4, Math.round(p.flying))),
            brick = (x: number, y: number, w: number, tone: "berry" | "tang", turn = 0) => {
                const cx = (x + w / 2) * U,
                    cy = (y + 0.5) * U,
                    a = turn,
                    dx = (w / 2) * U,
                    dy = 0.45 * U,
                    pt = (sx: number, sy: number) =>
                        `${cx + sx * dx * Math.cos(a) - sy * dy * Math.sin(a)} ${cy + sx * dx * Math.sin(a) + sy * dy * Math.cos(a)}`;
                pen.path(
                    g,
                    `M${pt(-1, -1)}L${pt(1, -1)}L${pt(1, 1)}L${pt(-1, 1)}Z`,
                    "pencil",
                    pen.fill(tone, "solid"),
                    edge,
                );
            };
        // the rock the house stands on
        pen.rect(
            g,
            3 * U,
            7.6 * U,
            6 * U,
            1.2 * U,
            "pencil",
            pen.fill("ink-soft", "cross-hatch", { hachureGap: 5 }),
            edge,
        );
        pen.rect(g, 3 * U, 7.6 * U, 6 * U, 0.4 * U, "pencil", pen.fill("mint", "solid"), {
            strokeWidth: 0.8,
            roughness: 0.2,
        });
        for (let row = 0; row < 3; row++)
            for (let col = 0; col < 4; col++) {
                if (row === 0 && col === 3 && flying > 0) continue;
                if (row === 1 && col === 3 && flying > 1) continue;
                const x = 2 + col * 2 + (row % 2) * 0.5;
                if (row === 1 && (col === 1 || col === 2)) {
                    pen.rect(
                        g,
                        x * U,
                        (6.6 - row) * U + 0.05 * U,
                        1.9 * U,
                        0.9 * U,
                        "pencil",
                        pen.fill("sky", "solid"),
                        edge,
                    );
                    continue;
                }
                brick(x, 6.6 - row, 1.9, row % 2 ? "tang" : "berry");
            }
        pen.path(
            g,
            `M${1.6 * U} ${4.6 * U}L${6 * U} ${1.4 * U}L${10.4 * U} ${4.6 * U}Z`,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            edge,
        );
        const loose: [number, number, number][] = [
            [11.2, 3.2, 0.6],
            [11.6, 5.4, -0.5],
            [10.6, 1.6, 1.1],
            [11.8, 0.7, -1],
        ];
        loose.slice(0, flying).forEach(([x, y, a], i) => {
            brick(x, y, 1.6, i % 2 ? "tang" : "berry", a);
            pen.line(g, (x - 0.4) * U, (y + 1.3) * U, (x - 1.1) * U, (y + 2) * U, "pencil", {
                strokeWidth: 0.6,
                stroke: soft,
                roughness: 0.2,
            });
        });
        // the ball's way up from the tray, and the ball where it struck
        for (let i = 0; i < 6; i++)
            pen.circle(
                g,
                (6.4 + i * 0.75) * U,
                (10.2 - i * 0.95) * U,
                0.18 * U,
                "pencil",
                pen.fill("ink-soft", "solid"),
                { strokeWidth: 0.3, roughness: 0.1 },
            );
        pen.circle(g, 11 * U, 4.6 * U, 0.9 * U, "pencil", pen.fill("sky", "solid"), edge);
        pen.path(
            g,
            `M${3.4 * U} ${10.6 * U}L${3.7 * U} ${11.6 * U}H${9.3 * U}L${9.6 * U} ${10.6 * U}H${9.3 * U}V${11 * U}H${3.7 * U}V${10.6 * U}Z`,
            "pencil",
            pen.fill("tang", "solid"),
            edge,
        );
        return { ball: [11 * U, 4.6 * U, "up"], tray: [6.5 * U, 11 * U, "up"] };
    },
    describe: (p) =>
        `A little brick house on a grassy rock, a ball flying up from a wooden tray${Math.round(p.flying) > 0 ? ", and bricks tumbling away from the corner it hit" : ", about to hit its corner"}.`,
    motion: { still: "A cover picture that does not move." },
});
