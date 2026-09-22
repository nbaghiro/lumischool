import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, soft } from "../lettering";
import { blade, clamp } from "../animals/nature";

const STAGES = ["seed", "shoot", "leaves", "flower"];

const stagesOf = (p: { stages: number }): string[] => {
    const n = clamp(p.stages, 1, 4);
    return n === 3 ? ["seed", "shoot", "flower"] : STAGES.slice(0, n);
};

const PLANT_H: Record<string, number> = {
    seed: 0,
    shoot: 1.6 * U,
    leaves: 3.4 * U,
    flower: 5.2 * U,
};

function plant<G>(c: Ctx<G>, kind: string, cx: number, base: number): number {
    const { pen, g } = c,
        h = PLANT_H[kind] ?? 0,
        leaf = pen.fill("mint", "solid", { hachureGap: 6, fillWeight: 0.7 });
    pen.rect(
        g,
        cx - 2.2 * U,
        base,
        4.4 * U,
        0.8 * U,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
        { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
    );
    pen.line(g, cx - 2.2 * U, base, cx + 2.2 * U, base, "ruler", { strokeWidth: 2.2 });
    if (kind === "seed") {
        pen.ellipse(g, cx, base + 9, 22, 14, "pencil", pen.fill("tang"), { strokeWidth: 1.6 });
        return base - 2;
    }
    pen.ellipse(g, cx, base + 10, 18, 12, "pencil", pen.fill("tang"), { strokeWidth: 1.3 });
    pen.curve(
        g,
        [
            [cx, base + 14],
            [cx - 4, base + 12 + 4],
            [cx - 7, base + 0.7 * U],
        ],
        "pencil",
        { strokeWidth: 1.1, stroke: c.t["ink-soft"] },
    );
    pen.curve(
        g,
        [
            [cx, base],
            [cx + 4, base - h * 0.5],
            [cx, base - h],
        ],
        "pencil",
        { strokeWidth: 2.4 },
    );
    const pairs = kind === "shoot" ? 1 : 2;
    for (let i = 0; i < pairs; i++) {
        const rise = kind === "shoot" ? 0.86 : kind === "leaves" ? 0.4 + i * 0.4 : 0.32 + i * 0.3;
        const y = base - h * rise,
            len = kind === "shoot" ? 16 : 28,
            wid = kind === "shoot" ? 11 : 17;
        for (const s of [-1, 1])
            pen.polygon(g, blade(cx, y, len, wid, -Math.PI / 2 + s * 0.8), "pencil", leaf, {
                strokeWidth: 1.5,
            });
    }
    if (kind !== "flower") return base - h - 10;
    const fy = base - h - 12;
    for (let k = 0; k < 6; k++) {
        pen.polygon(
            g,
            blade(cx, fy, 20, 15, (k / 6) * Math.PI * 2),
            "pencil",
            pen.fill("berry", "solid", { hachureGap: 5 }),
            { strokeWidth: 1.4 },
        );
    }
    pen.circle(g, cx, fy, 17, "pencil", pen.fill("glow"), { strokeWidth: 1.6 });
    return fy - 20;
}

export const growStages = defineDrawing({
    id: "growstages",
    family: "outdoors",
    title: "How a plant grows",
    group: "Props",
    about: "One plant at three or four numbered stages, each on its own baseline, from seed to flower. The stages differ in height and in what is on the stem, so the order can be worked out before the numbers are read.",
    params: { stages: 4, numbers: true, names: 1 },
    settings: {
        stages: { kind: "whole", min: 1, max: 4 },
        numbers: { kind: "flag" },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Four stages, numbered", params: { stages: 4, numbers: true, names: 1 } },
        { label: "Three, to order", params: { stages: 3, numbers: false, names: 1 } },
    ],
    box: (p) => ({ w: stagesOf(p).length * 6 + 1, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 7.4 * U,
            a: RawAnchors = {};
        stagesOf(p).forEach((kind, i) => {
            const cx = (3.5 + i * 6) * U;
            const top = plant(c, kind, cx, base);
            // a question that asks for the order of the stages turns their names off
            if (p.names > 0) soft(c, cx, 9 * U, kind, 13);
            if (p.numbers) {
                pen.circle(g, cx, 10 * U, 1.24 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.8,
                });
                numOn(c, cx, 10 * U + 6, i + 1, 16);
            }
            a[`stage(${i})`] = [cx, top, "up"];
        });
        return a;
    },
    describe: (p) =>
        `One plant drawn at several stages side by side, each on its own patch of soil, growing taller with more on its stem${p.numbers ? ", with a numbered circle under each" : ""}.`,
});
