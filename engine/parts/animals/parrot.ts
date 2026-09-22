import { part } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade, eye } from "./nature";

export const parrot = defineDrawing({
    id: "parrot",
    family: "animals",
    title: "Parrot",
    group: "Characters",
    about: "A red parrot on a branch with green and blue in its wings, a long tail and a hooked beak. A creature for an island, and one that repeats what it hears, which is where a question about fact and opinion can start.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Facing right", params: { facing: 1 } },
        { label: "Facing left", params: { facing: -1 } },
    ],
    box: () => ({ w: 5, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            dir = p.facing < 0 ? -1 : 1,
            cx = 2.4 * U,
            X = (n: number) => cx + dir * n;
        pen.polygon(
            g,
            blade(X(-4), 4.6 * U, 3.3 * U, 16, dir > 0 ? Math.PI * 0.6 : Math.PI * 0.4),
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.4 },
        );
        pen.polygon(
            g,
            blade(X(2), 4.6 * U, 3 * U, 14, dir > 0 ? Math.PI * 0.53 : Math.PI * 0.47),
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.4 },
        );
        pen.line(g, 0.1 * U, 5.2 * U, 4.9 * U, 5.5 * U, "pencil", {
            strokeWidth: 3.2,
            stroke: c.t.tang,
        });
        pen.line(g, 0.1 * U, 5.2 * U, 4.9 * U, 5.5 * U, "pencil", { strokeWidth: 1.2 });
        pen.ellipse(g, cx, 3.5 * U, 34, 56, "pencil", pen.fill("berry"), { strokeWidth: 1.9 });
        const wing = part(c, "wing", [X(-12), 2.6 * U], { dir }).g;
        pen.polygon(
            wing,
            blade(X(-12), 2.6 * U, 2.4 * U, 18, Math.PI / 2 + dir * 0.18),
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.5 },
        );
        pen.polygon(
            wing,
            blade(X(-12), 4 * U, 1.2 * U, 12, Math.PI / 2 + dir * 0.18),
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.2 },
        );
        pen.circle(g, X(4), 1.5 * U, 30, "pencil", pen.fill("berry"), { strokeWidth: 1.7 });
        pen.ellipse(g, X(9), 1.5 * U, 14, 18, "pencil", pen.fill("card"), { strokeWidth: 1.1 });
        pen.path(
            g,
            `M${X(14)} ${1.2 * U}Q${X(26)} ${1.1 * U} ${X(24)} ${2.2 * U}Q${X(20)} ${1.9 * U} ${X(15)} ${2 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.4 },
        );
        eye(c, X(9), 1.35 * U, 4);
        for (const dx of [-5, 5])
            pen.line(g, X(dx), 5.1 * U, X(dx + 2), 5.4 * U, "pencil", {
                strokeWidth: 2.4,
                stroke: c.t["ink-soft"],
            });
        return {
            head: [X(4), 0.8 * U, "up"],
            beak: [X(24), 1.6 * U, dir > 0 ? "right" : "left"],
            tail: [X(-6), 7.8 * U, "down"],
        };
    },
    describe: () =>
        "A red parrot perched on a branch, with green and blue in its wing, a long tail, a white cheek and a dark hooked beak.",
    motion: {
        body: { is: "bob", lift: 0.03, period: 3.4 },
        parts: { wing: { is: "flap", deg: 18, burst: 2, period: 3.6 } },
    },
});
