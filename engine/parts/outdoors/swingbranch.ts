import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** The underside of the branch down its box, in squares, where a game ties its ropes. */
export const SWINGBRANCH = { under: 3.35 } as const;

function clump<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    const { pen, g } = c;
    const d = `M${x - r} ${y}C${x - r} ${y - r * 0.9} ${x - r * 0.3} ${y - r * 1.2} ${x} ${y - r * 0.9}C${x + r * 0.4} ${y - r * 1.3} ${x + r} ${y - r * 0.8} ${x + r} ${y}Q${x} ${y + r * 0.35} ${x - r} ${y}Z`;
    pen.path(g, d, "pencil", pen.fill("mint", "solid"), { strokeWidth: 1.4 });
}

const LOOKS = ["bough", "limb"] as const;

/** A leaf seen from the side: a pointed oval on a short stalk, tipped by `turn` radians from upright. */
function leaf<G>(c: Ctx<G>, x: number, y: number, size: number, turn: number): void {
    const { pen, g } = c,
        dx = Math.sin(turn),
        dy = -Math.cos(turn),
        tx = x + dx * size,
        ty = y + dy * size,
        nx = -dy * size * 0.38,
        ny = dx * size * 0.38,
        mx = (x + tx) / 2,
        my = (y + ty) / 2;
    pen.path(
        g,
        `M${x} ${y}Q${mx + nx} ${my + ny} ${tx} ${ty}Q${mx - nx} ${my - ny} ${x} ${y}Z`,
        "pencil",
        pen.fill("mint", "solid"),
        { strokeWidth: 1.2 },
    );
}

/**
 * A limb growing out of a garden tree: bark hatched like the tree's own trunk, tapering from the
 * crown to a twig, with leaves along it. Its underside stays within a few pixels of the bough's, so a
 * game that knows where the bough's underside is can use either.
 */
function limb<G>(c: Ctx<G>, w: number, leaves: number, under: number): RawAnchors {
    const { pen, g } = c;
    // flared where it leaves the tree and thinning fast, as a limb does, rather than an even taper like a pole
    const thick = (x: number) => (0.25 + 1.5 * (1 - x / w) ** 2) * U;
    const low = (x: number) => under - Math.sin((Math.PI * x) / w) * 2,
        high = (x: number) => low(x) - thick(x);
    const n = 14,
        upper: [number, number][] = [],
        lower: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
        const x = (i / n) * (w - 0.6 * U);
        upper.push([x, high(x)]);
        lower.push([x, low(x)]);
    }
    const tip: [number, number] = [w - 0.15 * U, low(w) - 0.2 * U];
    const outline = [...upper, tip, ...lower.reverse()];
    // solid paper under the hatching, so the sky behind does not show through the bark
    pen.polygon(g, outline, "pencil", pen.fill("card", "solid"), { strokeWidth: 0 });
    pen.polygon(
        g,
        outline,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 8, fillWeight: 0.6 }),
        { strokeWidth: 2 },
    );
    // two twigs off the top, each ending in a leaf
    for (const f of [0.42, 0.7]) {
        const x = f * w,
            y = high(x) + 1,
            ex = x + 0.9 * U,
            ey = y - 1.1 * U;
        pen.path(g, `M${x} ${y}Q${x + 0.2 * U} ${y - 0.7 * U} ${ex} ${ey}`, "pencil", null, {
            strokeWidth: 1.4,
        });
        leaf(c, ex, ey, 1.05 * U, 0.5);
    }
    // leaves along the top, leaning back towards the tree as if the wind came from the hoop
    for (let k = 0; k < leaves * 2; k++) {
        const x = ((k + 0.6) / (leaves * 2 + 0.2)) * (w - 1.2 * U) + 0.4 * U;
        leaf(c, x, high(x) + 2, (0.8 + (k % 3) * 0.12) * U, k % 2 ? -0.55 : -0.15);
        // and a few hanging under it, clear of the middle where a ball comes up to meet it
        if (k % 3 === 1 && x < w * 0.35) leaf(c, x, low(x) - 1, 0.7 * U, Math.PI - 0.4);
    }
    return {
        under: [w / 2, under, "down"],
        trunk: [0, (high(0) + under) / 2, "left"],
        tip,
    };
}

export const swingBranch = defineDrawing({
    id: "swingbranch",
    family: "outdoors",
    title: "Branch for ropes",
    group: "Props",
    about: "A long thick branch reaching out over water from a tree on the bank, with bark lines along it and clumps of leaves on top, strong enough to tie swinging ropes to its underside; or a leafy limb of a garden tree, hatched like its trunk.",
    params: { long: 12, leaves: 3, look: "bough" },
    settings: {
        long: { kind: "whole", min: 4, max: 24 },
        leaves: { kind: "whole", min: 0, max: 6 },
        look: { kind: "one of", of: LOOKS },
    },
    takes: [
        { label: "Twelve squares, three clumps", params: { long: 12, leaves: 3, look: "bough" } },
        { label: "A long bare branch", params: { long: 20, leaves: 0, look: "bough" } },
        { label: "A short leafy one", params: { long: 6, leaves: 4, look: "bough" } },
        { label: "A leafy limb of a garden tree", params: { long: 14, leaves: 4, look: "limb" } },
    ],
    box: (p) => ({ w: whole(p.long, 4, 24, 12), h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.long, 4, 24, 12) * U,
            leaves = whole(p.leaves, 0, 6, 3),
            under = SWINGBRANCH.under * U;
        if (p.look === "limb") return limb(c, w, leaves, under);
        // thick where it leaves the trunk on the left and thin at the tip, bowing up a little on top,
        // while its underside stays level so every rope is tied at the same height
        const thick = (x: number) => 1.15 * U - (x / w) * 0.8 * U;
        const top = (x: number) => under - thick(x) - Math.sin((Math.PI * x) / w) * 3;
        const n = 12,
            upper: [number, number][] = [],
            lower: [number, number][] = [];
        for (let i = 0; i <= n; i++) {
            const x = (i / n) * (w - 3);
            upper.push([x, top(x)]);
            lower.push([x, under + Math.sin(i * 1.7) * 0.8]);
        }
        const tip: [number, number] = [w - 1, (top(w - 3) + under) / 2];
        pen.polygon(
            g,
            [...upper, tip, ...lower.reverse()],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 6, hachureAngle: -25, fillWeight: 0.55 }),
            { strokeWidth: 1.7 },
        );
        // bark: short curved strokes along the grain, and a knot
        for (let x = 0.9 * U; x < w - 2 * U; x += 1.7 * U) {
            const y = (top(x) + under) / 2;
            pen.path(g, `M${x} ${y - 2}q${0.5 * U} -3 ${U} 0`, "pencil", null, {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        }
        pen.ellipse(g, 0.35 * w, (top(0.35 * w) + under) / 2 + 1, 7, 5, "pencil", null, {
            strokeWidth: 1,
        });
        for (let k = 0; k < leaves; k++) {
            const x = ((k + 0.7) / (leaves + 0.4)) * (w - 2 * U) + U;
            const y = top(x) + 1;
            pen.line(g, x - 3, y, x + 4, y - 0.7 * U, "pencil", { strokeWidth: 1.3 });
            clump(c, x + 5, y - 0.55 * U, 0.75 * U);
        }
        return {
            under: [w / 2, under, "down"],
            trunk: [0, (top(0) + under) / 2, "left"],
            tip,
        };
    },
    describe: (p) =>
        p.look === "limb"
            ? "A limb of a garden tree seen from the side, its bark hatched like the trunk, tapering to a twig, with green leaves along its top and two twigs."
            : `A long brown branch seen from the side, thick at the trunk end and thinner at the tip${whole(p.leaves, 0, 6, 3) ? ", with clumps of green leaves along its top" : ", bare of leaves"}.`,
    motion: {
        still: "Ropes are tied to it and it holds them where a game swings them from, so it stays still.",
    },
});
