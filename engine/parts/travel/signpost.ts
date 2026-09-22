import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, sayOn, wide } from "../lettering";

interface Arm {
    to: string;
    km: number;
    left: boolean;
}

export const signpost = defineDrawing({
    id: "signpost",
    family: "travel",
    title: "Signpost",
    group: "Props",
    about: "A post with arms pointing left and right, each one carrying a place name and how far away it is. Two distances on the same post are a comparison and a difference without a word of setting up.",
    params: {
        arms: [
            { to: "Ash", km: 3, left: true },
            { to: "Bray", km: 7, left: false },
            { to: "Cole", km: 12, left: true },
        ] as Arm[],
    },
    settings: { arms: { kind: "fixed" } },
    takes: [
        {
            label: "Three places",
            params: {
                arms: [
                    { to: "Ash", km: 3, left: true },
                    { to: "Bray", km: 7, left: false },
                    { to: "Cole", km: 12, left: true },
                ],
            },
        },
        {
            label: "Two, both ways",
            params: {
                arms: [
                    { to: "Ash", km: 5, left: true },
                    { to: "Dell", km: 9, left: false },
                ],
            },
        },
    ],
    box: (p) => ({ w: 16, h: p.arms.length * 2 + 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            ground = (p.arms.length * 2 + 3.4) * U,
            a: RawAnchors = {};
        const armY = (i: number) => (2.3 + i * 2) * U;
        pen.rect(
            g,
            7.65 * U,
            armY(0) - 1.2 * U,
            0.7 * U,
            ground - armY(0) + 1.2 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            { strokeWidth: 2.2 },
        );
        pen.polygon(
            g,
            [
                [7.65 * U, armY(0) - 1.2 * U],
                [8 * U, armY(0) - 1.7 * U],
                [8.35 * U, armY(0) - 1.2 * U],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            { strokeWidth: 1.8 },
        );
        p.arms.forEach((arm, i) => {
            const y = armY(i),
                tip = arm.left ? 1.6 * U : 14.4 * U,
                back = arm.left ? 7.8 * U : 8.2 * U;
            const sh = arm.left ? 0.9 * U : -0.9 * U;
            pen.polygon(
                g,
                [
                    [tip, y],
                    [tip + sh, y - 0.75 * U],
                    [back, y - 0.75 * U],
                    [back, y + 0.75 * U],
                    [tip + sh, y + 0.75 * U],
                ],
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 7, fillWeight: 0.7 }),
                { strokeWidth: 2 },
            );
            const nameX = arm.left ? tip + 1.2 * U : back + 0.4 * U,
                farX = arm.left ? back - 0.5 * U : tip + sh - 0.4 * U;
            sayOn(c, nameX, y + 0.25 * U, arm.to, 16, "start");
            const far = `${arm.km} km`;
            patch(c, farX - wide(far, 16) / 2, y + 0.2 * U, wide(far, 16) + 10, 21);
            num(c, farX, y + 0.25 * U, far, 16, "end");
            a[`arm(${i})`] = [tip, y, arm.left ? "left" : "right"];
        });
        pen.line(g, 2 * U, ground, 14 * U, ground, "pencil", { strokeWidth: 2.2 });
        a.post = [8 * U, armY(0) - 1.7 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A wooden signpost with ${p.arms.length === 1 ? "one yellow arm" : "yellow arms"} pointing left or right, each carrying a place name and a distance, standing on a line of ground.`,
    motion: { still: "A signpost stands in the ground, and its distances are read." },
    reads: true,
});
