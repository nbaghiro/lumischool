import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp, eye } from "./nature";

export const bats = defineDrawing({
    id: "bats",
    family: "animals",
    title: "Bats",
    group: "Characters",
    about: "Bats hanging upside down from the roof of a cave with their wings folded round them like cloaks, or flying out at dusk with their wings spread wide. A bat finds its way in the dark by listening to the echoes of its own squeaks.",
    params: { count: 4, flying: 0 },
    settings: {
        count: { kind: "whole", min: 1, max: 8 },
        flying: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Four hanging", params: { count: 4, flying: 0 } },
        { label: "Five flying out", params: { count: 5, flying: 1 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 8) * 3 + 1, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 8),
            fly = p.flying > 0,
            W = (n * 3 + 1) * U,
            a: RawAnchors = {};
        const wing = pen.fill("ink-soft", "hachure", { hachureGap: 3.2, fillWeight: 0.8 }),
            fur = pen.fill("tang");
        if (!fly)
            pen.path(
                g,
                `M0 0H${W}V${0.5 * U}Q${W * 0.7} ${0.8 * U} ${W * 0.45} ${0.55 * U}Q${W * 0.2} ${0.85 * U} 0 ${0.6 * U}Z`,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 6 }),
                { strokeWidth: 1.5 },
            );
        for (let i = 0; i < n; i++) {
            const x = (2 + i * 3) * U;
            if (!fly) {
                // hanging by its feet, wrapped in its wings, its ears pointing down
                pen.line(g, x - 3, 0.6 * U, x - 4, 1.05 * U, "pencil", { strokeWidth: 1.4 });
                pen.line(g, x + 3, 0.6 * U, x + 4, 1.05 * U, "pencil", { strokeWidth: 1.4 });
                pen.path(
                    g,
                    `M${x - 0.3 * U} ${1 * U}Q${x - 1.05 * U} ${2 * U} ${x - 0.75 * U} ${3.25 * U}L${x + 0.75 * U} ${3.25 * U}Q${x + 1.05 * U} ${2 * U} ${x + 0.3 * U} ${1 * U}Z`,
                    "pencil",
                    wing,
                    { strokeWidth: 1.5 },
                );
                pen.curve(
                    g,
                    [
                        [x, 1.2 * U],
                        [x - 0.12 * U, 2.2 * U],
                        [x, 3.2 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1 },
                );
                pen.circle(g, x, 3.75 * U, 1.05 * U, "pencil", fur, { strokeWidth: 1.5 });
                for (const s of [-1, 1])
                    pen.polygon(
                        g,
                        [
                            [x + s * 0.18 * U, 4.2 * U],
                            [x + s * 0.45 * U, 4.75 * U],
                            [x + s * 0.5 * U, 4.05 * U],
                        ],
                        "pencil",
                        fur,
                        { strokeWidth: 1.2 },
                    );
                for (const s of [-1, 1]) eye(c, x + s * 0.2 * U, 3.62 * U, 3.6);
                a[`bat(${i})`] = [x, 4.6 * U, "down"];
            } else {
                const y = (2.2 + (i % 2 ? 0.9 : -0.3)) * U,
                    up = i % 2 ? 1 : -1;
                for (const s of [-1, 1]) {
                    const tip: Pt = [x + s * 1.45 * U, y - (0.8 + up * 0.35) * U];
                    pen.path(
                        g,
                        `M${x + s * 0.2 * U} ${y - 0.15 * U}Q${x + s * 0.9 * U} ${y - 0.9 * U} ${tip[0]} ${tip[1]}Q${x + s * 1.2 * U} ${y + 0.15 * U} ${x + s * 0.95 * U} ${y + 0.1 * U}Q${x + s * 0.75 * U} ${y + 0.45 * U} ${x + s * 0.5 * U} ${y + 0.2 * U}Q${x + s * 0.35 * U} ${y + 0.45 * U} ${x + s * 0.15 * U} ${y + 0.25 * U}Z`,
                        "pencil",
                        wing,
                        { strokeWidth: 1.3 },
                    );
                }
                pen.ellipse(g, x, y + 0.05 * U, 0.55 * U, 0.8 * U, "pencil", fur, {
                    strokeWidth: 1.3,
                });
                for (const s of [-1, 1])
                    pen.polygon(
                        g,
                        [
                            [x + s * 0.08 * U, y - 0.3 * U],
                            [x + s * 0.3 * U, y - 0.7 * U],
                            [x + s * 0.3 * U, y - 0.25 * U],
                        ],
                        "pencil",
                        fur,
                        { strokeWidth: 1 },
                    );
                a[`bat(${i})`] = [x, y - 0.7 * U, "up"];
            }
        }
        return a;
    },
    describe: (p) =>
        p.flying > 0
            ? "Bats flying out at dusk with their dark wings spread wide, small orange bodies and pointed ears, some higher than others."
            : "Bats hanging upside down from a cave roof, each wrapped in its dark wings like a cloak, with an orange head and pointed ears.",
});
