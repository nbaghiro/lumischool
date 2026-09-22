import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp, eye } from "./nature";

function crabAt<G>(c: Ctx<G>, cx: number, base: number): void {
    const { pen, g } = c,
        shell = pen.fill("berry");
    for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const y = base - 26 + i * 5;
            pen.linear(
                g,
                [
                    [cx + s * 18, y],
                    [cx + s * (34 + i * 2), y - 6],
                    [cx + s * (40 + i * 3), base - 2],
                ],
                "ruler",
                { strokeWidth: 1.5 },
            );
        }
        pen.linear(
            g,
            [
                [cx + s * 16, base - 34],
                [cx + s * 26, base - 46],
                [cx + s * 30, base - 54],
            ],
            "pencil",
            { strokeWidth: 1.8 },
        );
        pen.circle(g, cx + s * 32, base - 60, 16, "pencil", shell, { strokeWidth: 1.6 });
        pen.line(g, cx + s * 30, base - 66, cx + s * 36, base - 56, "pencil", { strokeWidth: 1.3 });
        pen.line(g, cx + s * 6, base - 40, cx + s * 8, base - 50, "pencil", { strokeWidth: 1.4 });
        pen.circle(g, cx + s * 8, base - 52, 7, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
        eye(c, cx + s * 8, base - 52, 3.5);
    }
    pen.ellipse(g, cx, base - 28, 52, 30, "pencil", shell, { strokeWidth: 2 });
    pen.arc(g, cx, base - 26, 22, 10, 0.3, Math.PI - 0.3, "pencil", { strokeWidth: 1.2 });
}

export const crabs = defineDrawing({
    id: "crabs",
    family: "animals",
    title: "Crabs",
    group: "Characters",
    about: "Crabs seen from the front, each with eight legs and two claws on stalked eyes. Ten limbs a crab, drawn at the ruler level and evenly set, so the legs can be counted in tens.",
    params: { count: 1 },
    settings: { count: { kind: "whole", min: 1, max: 5 } },
    takes: [
        { label: "One crab", params: { count: 1 } },
        { label: "Three crabs", params: { count: 3 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 5) * 5 + 1, h: 4 }),
    draw: (c, p) => {
        const n = clamp(p.count, 1, 5),
            base = 3.8 * U,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const cx = (3 + i * 5) * U;
            crabAt(c, cx, base);
            a[`crab(${i})`] = [cx, base - 62, "up"];
        }
        return a;
    },
    describe: (p) =>
        `${clamp(p.count, 1, 5) > 1 ? "Crabs side by side seen from the front, each" : "A crab seen from the front"} with a red shell, two claws held up, eyes on stalks and legs spread evenly on either side.`,
    motion: {
        body: { is: "float", lift: 0, dx: 9, deg: 3, pivot: [0.5, 1], period: 5.8, units: true },
        react: { kind: "step", by: 34 },
    },
});
