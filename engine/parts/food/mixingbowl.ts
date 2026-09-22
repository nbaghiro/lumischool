import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const mixingBowl = defineDrawing({
    id: "mixingbowl",
    family: "food",
    title: "Mixing bowl",
    group: "Props",
    about: "A bowl from the side with mixture in it and a spoon resting against the rim. The level is drawn as a surface rather than a flat line, so how full the bowl is can be judged against the rim.",
    params: { fill: 0.6, spoon: true },
    settings: {
        fill: { kind: "number", min: 0, max: 1, step: 0.05 },
        spoon: { kind: "flag" },
    },
    takes: [
        { label: "Half full", params: { fill: 0.6, spoon: true } },
        { label: "Nearly full", params: { fill: 0.9, spoon: false } },
        { label: "A little in it", params: { fill: 0.25, spoon: true } },
    ],
    box: () => ({ w: 12, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 6 * U,
            rimY = 4.4 * U,
            half = 4.2 * U,
            deep = 3.6 * U,
            bottom = rimY + deep;
        const inside = (y: number) =>
            half * Math.sqrt(Math.max(0, 1 - ((y - rimY) / deep) ** 2)) - 4;
        const t = Math.max(0, Math.min(1, p.fill)),
            level = rimY + (1 - t) * deep;
        pen.ellipse(g, cx, rimY, half * 2, 1.2 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.6,
        });
        if (t > 0) {
            // The mixture takes the bowl's own width at its own height, so it curves in towards the base
            // instead of sitting in it as a block.
            const steps = 8,
                left: string[] = [],
                right: string[] = [];
            for (let k = 0; k <= steps; k++) {
                const y = level + ((bottom - 6 - level) * k) / steps,
                    w = inside(y);
                left.push(`${cx - w} ${y}`);
                right.unshift(`${cx + w} ${y}`);
            }
            pen.path(
                g,
                `M${left.join("L")}L${right.join("L")}Z`,
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 5 }),
                { strokeWidth: 0 },
            );
            const w = inside(level);
            pen.ellipse(
                g,
                cx,
                level,
                w * 2,
                w * 0.3,
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.8 },
            );
        }
        pen.arc(g, cx, rimY, half * 2, deep * 2, 0, Math.PI, "pencil", { strokeWidth: 2.4 });
        pen.polygon(
            g,
            [
                [cx - 1.2 * U, bottom - 6],
                [cx + 1.2 * U, bottom - 6],
                [cx + 0.95 * U, bottom + 0.6 * U],
                [cx - 0.95 * U, bottom + 0.6 * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        const a: RawAnchors = {
            rim: [cx, rimY - 0.6 * U, "up"],
            bowl: [cx, rimY + 1.6 * U, "up"],
            level: [cx + inside(level), level, "right"],
        };
        if (p.spoon) {
            const bx = cx - 1.6 * U,
                by = rimY + 2 * U,
                tx = cx + 3.8 * U,
                ty = rimY - 2.9 * U;
            const L = Math.hypot(tx - bx, ty - by),
                ux = (tx - bx) / L,
                uy = (ty - by) / L;
            const at = (along: number, side: number): [number, number] => [
                bx + ux * along - uy * side,
                by + uy * along + ux * side,
            ];
            pen.polygon(
                g,
                [at(0.5 * U, 3.5), at(L, 2.5), at(L, -2.5), at(0.5 * U, -3.5)],
                "pencil",
                pen.fill("tang", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.6 },
            );
            const [ax, ay] = at(-0.8 * U, 0),
                [zx, zy] = at(0.6 * U, 0);
            const [c1x, c1y] = at(-0.8 * U, 0.55 * U),
                [c2x, c2y] = at(0.6 * U, 0.5 * U);
            const [c3x, c3y] = at(0.6 * U, -0.5 * U),
                [c4x, c4y] = at(-0.8 * U, -0.55 * U);
            pen.path(
                g,
                `M${ax} ${ay}C${c1x} ${c1y} ${c2x} ${c2y} ${zx} ${zy}C${c3x} ${c3y} ${c4x} ${c4y} ${ax} ${ay}Z`,
                "pencil",
                pen.fill("tang", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.8 },
            );
            a.spoon = [tx, ty, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A wide mixing bowl seen from the side, standing on its foot, ${Math.max(0, Math.min(1, p.fill)) > 0 ? "with mixture in it below the rim" : "with nothing in it"}${p.spoon ? ", and a wooden spoon resting against the rim" : ""}.`,
});
