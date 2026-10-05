import type { Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const CROPS = ["carrot", "lettuce", "strawberry", "sunflower", "pumpkin"] as const;
export type Crop = (typeof CROPS)[number];

export const isCrop = (v: unknown): v is Crop => CROPS.some((c) => c === v);

const pickCrop = (v: string): Crop => (isCrop(v) ? v : "carrot");

/** What each crop is called, one and many. */
export const CROP_WORDS: Record<Crop, { one: string; many: string }> = {
    carrot: { one: "carrot", many: "carrots" },
    lettuce: { one: "lettuce", many: "lettuces" },
    strawberry: { one: "strawberry", many: "strawberries" },
    sunflower: { one: "sunflower", many: "sunflowers" },
    pumpkin: { one: "pumpkin", many: "pumpkins" },
};

const STAGE_WORDS = ["sown", "a sprout", "growing", "ripe"] as const;

/**
 * A crop's picked produce, centred on `cx`, `cy` and `r` units across its middle: a carrot, a lettuce,
 * a strawberry, a sunflower's head or a pumpkin, drawn the same in a packet, a basket and a bed.
 */
export function drawProduce<G>(c: Ctx<G>, crop: Crop, cx: number, cy: number, r: number): void {
    const leaf = c.pen.fill("mint", "solid");
    switch (crop) {
        case "carrot": {
            c.pen.path(
                c.g,
                `M${cx - r * 0.55} ${cy - r * 0.45}L${cx + r * 0.55} ${cy - r * 0.45}L${cx} ${cy + r}Z`,
                "pencil",
                c.pen.fill("tang", "solid"),
                { strokeWidth: 1.2 },
            );
            for (const dx of [-0.3, 0, 0.3])
                c.pen.line(c.g, cx + dx * r, cy - r * 0.45, cx + dx * r * 1.6, cy - r, "pencil", {
                    stroke: c.t.ok,
                    strokeWidth: 1.4,
                });
            return;
        }
        case "lettuce":
            c.pen.circle(c.g, cx, cy, r * 1.9, "pencil", leaf, { strokeWidth: 1.2 });
            c.pen.circle(c.g, cx, cy, r * 1, "pencil", null, { strokeWidth: 0.9, stroke: c.t.ok });
            return;
        case "strawberry":
            c.pen.path(
                c.g,
                `M${cx - r * 0.7} ${cy - r * 0.35}Q${cx} ${cy - r * 0.75} ${cx + r * 0.7} ${cy - r * 0.35}L${cx} ${cy + r * 0.85}Z`,
                "pencil",
                c.pen.fill("berry", "solid"),
                { strokeWidth: 1.2 },
            );
            c.pen.path(
                c.g,
                `M${cx - r * 0.45} ${cy - r * 0.5}L${cx} ${cy - r * 0.85}L${cx + r * 0.45} ${cy - r * 0.5}`,
                "pencil",
                null,
                { stroke: c.t.ok, strokeWidth: 1.3 },
            );
            return;
        case "sunflower": {
            for (let k = 0; k < 10; k++) {
                const a = (k / 10) * Math.PI * 2;
                c.pen.ellipse(
                    c.g,
                    cx + Math.cos(a) * r * 0.62,
                    cy + Math.sin(a) * r * 0.62,
                    r * 0.55,
                    r * 0.55,
                    "pencil",
                    c.pen.fill("glow", "solid"),
                    { strokeWidth: 0.8 },
                );
            }
            c.pen.circle(c.g, cx, cy, r * 0.9, "pencil", c.pen.fill("ink-soft", "solid"), {
                strokeWidth: 1,
            });
            return;
        }
        case "pumpkin":
            for (const dx of [-0.42, 0.42, 0])
                c.pen.ellipse(
                    c.g,
                    cx + dx * r,
                    cy,
                    r * 1.15,
                    r * 1.5,
                    "pencil",
                    c.pen.fill("tang", "solid"),
                    {
                        strokeWidth: 1.1,
                    },
                );
            c.pen.line(c.g, cx, cy - r * 0.7, cx + r * 0.2, cy - r * 1.05, "pencil", {
                stroke: c.t.ok,
                strokeWidth: 1.6,
            });
            return;
    }
}

/** A sprouting pair of leaves on a stem from `base`, `h` units tall. */
function sprout<G>(c: Ctx<G>, x: number, base: number, h: number, droop: boolean): void {
    const top = base - h;
    c.pen.line(c.g, x, base, x, top, "pencil", { stroke: c.t.ok, strokeWidth: 1.4 });
    const tip = droop ? h * 0.35 : -h * 0.15;
    const leaf = c.pen.fill("mint", "solid");
    c.pen.path(
        c.g,
        `M${x} ${top}Q${x - h * 0.55} ${top - h * 0.1} ${x - h * 0.6} ${top - tip}Q${x - h * 0.2} ${top + h * 0.25} ${x} ${top}Z`,
        "pencil",
        leaf,
        { strokeWidth: 1 },
    );
    c.pen.path(
        c.g,
        `M${x} ${top}Q${x + h * 0.55} ${top - h * 0.1} ${x + h * 0.6} ${top - tip}Q${x + h * 0.2} ${top + h * 0.25} ${x} ${top}Z`,
        "pencil",
        leaf,
        { strokeWidth: 1 },
    );
}

/**
 * A crop growing in its hole, seen from the front as the beds are from above: a mound with a seed in
 * it, a sprout, leaves growing, and the crop ripe. A thirsty plant droops.
 */
export const gardenCrop = defineDrawing<{ crop: string; stage: number; droop: boolean }>({
    id: "gardencrop",
    family: "outdoors",
    title: "Crop growing",
    group: "Props",
    about: "A garden crop standing in its hole at one stage of growing: a mound of soil with a seed, a sprout, leafy and growing, then ripe. Carrots, lettuces, strawberries, sunflowers and pumpkins.",
    params: { crop: "carrot", stage: 3, droop: false },
    settings: {
        crop: { kind: "one of", of: CROPS },
        stage: { kind: "number", min: 0, max: 3, step: 1 },
        droop: { kind: "flag" },
    },
    takes: [
        { label: "A ripe carrot", params: { crop: "carrot", stage: 3, droop: false } },
        { label: "A lettuce sprouting", params: { crop: "lettuce", stage: 1, droop: false } },
        { label: "Strawberries, ripe", params: { crop: "strawberry", stage: 3, droop: false } },
        { label: "A sunflower, ripe", params: { crop: "sunflower", stage: 3, droop: false } },
        { label: "A pumpkin growing, thirsty", params: { crop: "pumpkin", stage: 2, droop: true } },
        { label: "Just sown", params: { crop: "carrot", stage: 0, droop: false } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p) => {
        const crop = pickCrop(p.crop),
            stage = Math.max(0, Math.min(3, Math.round(p.stage))),
            x = U,
            base = 2.6 * U;
        // the mound the seed went into, there at every stage
        c.pen.ellipse(c.g, x, base, 1.3 * U, 0.55 * U, "pencil", c.pen.fill("tang", "hachure"), {
            strokeWidth: 0.9,
            stroke: c.t["ink-soft"],
        });
        if (stage === 0) {
            c.pen.circle(
                c.g,
                x,
                base - 0.1 * U,
                0.22 * U,
                "pencil",
                c.pen.fill("ink-soft", "solid"),
                {
                    strokeWidth: 0.6,
                },
            );
            return {};
        }
        if (stage === 1) {
            sprout(c, x, base - 0.1 * U, 0.7 * U, p.droop);
            return {};
        }
        const ripe = stage === 3;
        switch (crop) {
            case "carrot":
                if (ripe) drawProduce(c, "carrot", x, base - 0.45 * U, 0.45 * U);
                for (const dx of [-0.35, 0, 0.35])
                    c.pen.line(
                        c.g,
                        x + dx * U * 0.4,
                        base - 0.7 * U,
                        x + dx * U * (p.droop ? 1.6 : 1),
                        base - (p.droop ? 1.1 : 1.7) * U,
                        "pencil",
                        { stroke: c.t.ok, strokeWidth: 1.6 },
                    );
                break;
            case "lettuce":
                drawProduce(c, "lettuce", x, base - 0.5 * U, (ripe ? 0.62 : 0.4) * U);
                break;
            case "strawberry":
                sprout(c, x - 0.35 * U, base - 0.1 * U, 0.75 * U, p.droop);
                sprout(c, x + 0.35 * U, base - 0.1 * U, 0.65 * U, p.droop);
                if (ripe) {
                    drawProduce(c, "strawberry", x - 0.45 * U, base - 0.35 * U, 0.32 * U);
                    drawProduce(c, "strawberry", x + 0.45 * U, base - 0.3 * U, 0.3 * U);
                }
                break;
            case "sunflower": {
                const top = base - (ripe ? 2.05 : 1.4) * U,
                    bend = p.droop ? 0.45 * U : 0;
                c.pen.path(
                    c.g,
                    `M${x} ${base}Q${x} ${top + 0.6 * U} ${x + bend} ${top}`,
                    "pencil",
                    null,
                    { stroke: c.t.ok, strokeWidth: 1.8 },
                );
                sprout(c, x, base - 0.6 * U, 0.55 * U, p.droop);
                if (ripe) drawProduce(c, "sunflower", x + bend, top, 0.5 * U);
                else
                    c.pen.circle(
                        c.g,
                        x + bend,
                        top,
                        0.35 * U,
                        "pencil",
                        c.pen.fill("mint", "solid"),
                        { strokeWidth: 0.9 },
                    );
                break;
            }
            case "pumpkin":
                sprout(c, x - 0.4 * U, base - 0.1 * U, 0.6 * U, p.droop);
                sprout(c, x + 0.45 * U, base - 0.1 * U, 0.5 * U, p.droop);
                drawProduce(c, "pumpkin", x, base - 0.45 * U, (ripe ? 0.55 : 0.28) * U);
                break;
        }
        return {};
    },
    describe: (p) => {
        const crop = pickCrop(p.crop),
            stage = STAGE_WORDS[Math.max(0, Math.min(3, Math.round(p.stage)))] ?? "sown";
        return `A ${CROP_WORDS[crop].one} plant in a small mound of soil in a garden bed, ${stage}${p.droop ? " and drooping because the soil is dry" : ""}, drawn from the front.`;
    },
});
