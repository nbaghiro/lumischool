import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, clamp, eye, tapered, spline } from "./nature";

/** One camel in a 7 by 8 cell, facing right: standing, or lying down to rest with its legs under it. */
function camelAt<G>(c: Ctx<G>, X: (x: number) => number, resting: boolean): void {
    const { pen, g } = c,
        dy = resting ? 0.6 * U : 0,
        fur = pen.fill("tang"),
        far = pen.fill("tang", "hachure", { hachureGap: 3 });
    const leg = (hip: Pt, knee: Pt, foot: Pt, f: typeof fur) => {
        pen.polygon(g, tapered(spline([hip, knee, foot], 3), 0.55 * U, 0.3 * U), "pencil", f, {
            strokeWidth: 1.2,
        });
        pen.circle(g, knee[0], knee[1], 0.36 * U, "pencil", f, { strokeWidth: 1 });
        pen.ellipse(
            g,
            foot[0] + 3,
            foot[1],
            0.7 * U,
            0.26 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1 },
        );
    };
    if (resting) {
        for (const [x, s] of [
            [1.7, 1],
            [4.7, -1],
        ] as const)
            pen.path(
                g,
                `M${X(x * U)} ${5.3 * U}Q${X((x + s * 0.8) * U)} ${5.75 * U} ${X((x + s * 1.4) * U)} ${5.6 * U}`,
                "pencil",
                null,
                { strokeWidth: 2.2 },
            );
    } else {
        leg([X(1.9 * U), 4.3 * U], [X(1.6 * U), 6 * U], [X(1.9 * U), 7.6 * U], far);
        leg([X(4.9 * U), 4.3 * U], [X(5.2 * U), 6 * U], [X(5.1 * U), 7.6 * U], far);
    }
    const b = (x: number, y: number): Pt => [X(x * U), y * U + dy];
    pen.path(
        g,
        ring([
            b(1, 3.9),
            b(1.7, 3.1),
            b(2.6, 1.8),
            b(3.5, 1.6),
            b(4.4, 2.6),
            b(5.2, 3.2),
            b(5.6, 4),
            b(4.8, 4.8),
            b(3.2, 5.1),
            b(1.6, 4.8),
        ]),
        "pencil",
        fur,
        { strokeWidth: 1.9 },
    );
    pen.polygon(
        g,
        tapered(spline([b(5.1, 3.4), b(5.9, 4.1), b(6.35, 3.2), b(6.3, 2.1)], 4), 1 * U, 0.62 * U),
        "pencil",
        fur,
        { strokeWidth: 1.5 },
    );
    pen.path(
        g,
        ring([
            b(5.9, 1.95),
            b(6.5, 1.55),
            b(6.95, 1.8),
            b(6.95, 2.35),
            b(6.55, 2.55),
            b(6.05, 2.4),
        ]),
        "pencil",
        fur,
        { strokeWidth: 1.5 },
    );
    pen.polygon(g, [b(6, 1.7), b(5.8, 1.35), b(6.15, 1.55)], "pencil", fur, { strokeWidth: 1 });
    const [ex, ey] = b(6.35, 1.9);
    eye(c, ex, ey, 4.4);
    pen.line(g, ex - 3, ey - 4, ex - 1, ey - 7, "pencil", { strokeWidth: 0.9 });
    pen.line(g, ex + 1, ey - 4, ex + 3, ey - 7, "pencil", { strokeWidth: 0.9 });
    pen.curve(g, [b(6.95, 2.25), b(6.75, 2.35), b(6.6, 2.3)], "pencil", { strokeWidth: 1 });
    pen.curve(g, [b(1.1, 3.9), b(0.8, 4.6), b(0.85, 5.2)], "pencil", { strokeWidth: 1.6 });
    if (!resting) {
        leg([X(2.3 * U), 4.5 * U], [X(2.1 * U), 6.1 * U], [X(2.4 * U), 7.6 * U], fur);
        leg([X(4.5 * U), 4.6 * U], [X(4.7 * U), 6.1 * U], [X(4.5 * U), 7.6 * U], fur);
    }
}

export const camel = defineDrawing({
    id: "camel",
    family: "animals",
    title: "Camel",
    group: "Characters",
    about: "A camel with one hump, long legs with knobbly knees and wide soft feet for walking on sand, standing or lying down to rest. The hump is fat, not water, and a thirsty camel can drink a bathful at once: a question about capacity waiting to happen.",
    params: { count: 1, resting: 0, facing: 1 },
    settings: {
        count: { kind: "whole", min: 1, max: 5 },
        resting: { kind: "whole", min: 0, max: 1 },
        facing: { kind: "one of", of: [1, -1] },
    },
    takes: [
        { label: "Standing", params: { count: 1, resting: 0, facing: 1 } },
        { label: "Two resting", params: { count: 2, resting: 1, facing: -1 } },
        { label: "Three in a line", params: { count: 3, resting: 0, facing: -1 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 5) * 7 + 1, h: p.resting > 0 ? 6 : 8 }),
    draw: (c, p) => {
        const n = clamp(p.count, 1, 5),
            s = p.facing < 0 ? -1 : 1,
            W = (n * 7 + 1) * U,
            rest = p.resting > 0,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x0 = 0.5 * U + i * 7 * U,
                X = (x: number) => (s > 0 ? x0 + x : W - x0 - x);
            camelAt(c, X, rest);
            a[`camel(${i})`] = [X(3.4 * U), (rest ? 2.2 : 1.6) * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `${clamp(p.count, 1, 5) > 1 ? "Camels side by side, each" : "A camel"} with one hump, a long neck and a small head, ${p.resting > 0 ? "lying down to rest with its legs folded under it" : "standing on long legs with knobbly knees and wide soft feet"}.`,
});
