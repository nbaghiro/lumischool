import { type Ctx, type RawAnchors } from "../../ink/surface";
import { type Fill, rng, roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { penned, say, soft } from "../lettering";
import {
    type Pt,
    LIQUID,
    lightFill,
    glassPath,
    liquid,
    gleam,
    bubble,
    paint,
    iceCube,
    curls,
    nail,
    candleOn,
} from "./apparatus";
import { CHANGES } from "./substances";

/** A tumbler with its base on `base`, filled to `fill` (0 to 1) with `stuff`, a paint recipe; empty is plain water. */
function tumbler<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    fill: number,
    stuff = "",
    w = 2.4 * U,
    h = 3 * U,
): { top: number; level: number } {
    const lx = x - w / 2,
        rx = x + w / 2,
        top = base - h,
        level = base - 4 - (h - 8) * Math.max(0, Math.min(1, fill));
    if (fill > 0) liquid(c, lx, rx, level, base, stuff ? paint(c, stuff) : c.pen.fill(LIQUID), 8);
    c.pen.path(c.g, glassPath(lx, rx, top, base, 8), "pencil", null, { strokeWidth: 2 });
    c.pen.line(c.g, lx - 2, top, rx + 2, top, "pencil", { strokeWidth: 1.4 });
    gleam(c, lx + 5, top + 6, base - 8, 2.4);
    return { top, level };
}

/** One half of a change: what there is before it (`after` false) or after it, centred at x with its base on `base`. */
function changeHalf<G>(c: Ctx<G>, change: string, after: boolean, x: number, base: number): void {
    const { pen, g } = c,
        t = c.t;
    const bowl = (fill: Fill, level = 0.55) => {
        const w = 3.6 * U,
            h = 1.6 * U,
            top = base - h;
        pen.path(
            g,
            `M${x - w / 2 + 6} ${top + h * (1 - level) + 2}Q${x} ${top + h * (1 - level) + 5} ${x + w / 2 - 6} ${top + h * (1 - level) + 2}L${x + w / 2 - 12} ${base - 8}Q${x} ${base + 2} ${x - w / 2 + 12} ${base - 8}Z`,
            "pencil",
            fill,
            { strokeWidth: 0 },
        );
        pen.path(
            g,
            `M${x - w / 2} ${top}Q${x - w / 2 + 4} ${base} ${x} ${base}Q${x + w / 2 - 4} ${base} ${x + w / 2} ${top}`,
            "pencil",
            null,
            { strokeWidth: 2 },
        );
        pen.ellipse(g, x, top, w, 0.55 * U, "pencil", null, { strokeWidth: 1.4 });
    };
    const pan = (fill: number) => {
        const w = 3.4 * U,
            top = base - 1.5 * U;
        if (fill > 0)
            liquid(c, x - w / 2, x + w / 2, base - fill * 1.2 * U, base, pen.fill(LIQUID), 6);
        pen.path(g, glassPath(x - w / 2, x + w / 2, top, base, 6), "pencil", null, {
            strokeWidth: 2.2,
        });
        pen.path(
            g,
            roundedRect(x + w / 2, top + 0.2 * U, 1.3 * U, 0.35 * U, 4),
            "pencil",
            pen.fill("ink-soft"),
            { strokeWidth: 1.5 },
        );
    };
    switch (change) {
        case "melt-ice":
        case "freeze-water": {
            const ice = (change === "melt-ice") !== after;
            if (ice) iceCube(c, x, base - 0.1 * U, 2.4 * U);
            else if (change === "freeze-water") {
                // water poured into an ice tray, which is where a child has seen water freeze
                const l = x - 1.8 * U,
                    w = 3.6 * U,
                    top = base - 1.1 * U;
                pen.path(g, roundedRect(l, top, w, 1.1 * U, 4), "pencil", pen.fill("card"), {
                    strokeWidth: 1.8,
                });
                for (let k = 0; k < 3; k++) {
                    const cx = l + (k + 0.5) * (w / 3);
                    pen.path(
                        g,
                        roundedRect(cx - 0.45 * U, top + 0.18 * U, 0.9 * U, 0.72 * U, 3),
                        "pencil",
                        pen.fill("sky"),
                        { strokeWidth: 1.2 },
                    );
                }
            } else {
                pen.ellipse(g, x, base - 0.3 * U, 3.6 * U, 1 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 1.6,
                });
                pen.ellipse(g, x, base - 0.35 * U, 2.8 * U, 0.6 * U, "pencil", pen.fill("sky"), {
                    strokeWidth: 1.2,
                });
            }
            return;
        }
        case "melt-chocolate": {
            const brown = paint(c, "brown");
            if (!after) {
                const l = x - 1.5 * U,
                    top = base - 2.2 * U,
                    w = 3 * U,
                    h = 1.9 * U;
                pen.path(g, roundedRect(l, top, w, h, 4), "pencil", brown, { strokeWidth: 1.8 });
                for (const k of [1, 2])
                    pen.line(g, l + (k * w) / 3, top + 3, l + (k * w) / 3, top + h - 3, "pencil", {
                        strokeWidth: 1.2,
                        stroke: c.paper ? t.card : "#5E3B26",
                    });
                pen.line(g, l + 3, top + h / 2, l + w - 3, top + h / 2, "pencil", {
                    strokeWidth: 1.2,
                    stroke: c.paper ? t.card : "#5E3B26",
                });
            } else {
                bowl(brown, 0.7);
                pen.path(
                    g,
                    `M${x + 1.2 * U} ${base - 1.55 * U}q2 ${0.5 * U} 0 ${0.8 * U}q-3 ${0.2 * U} -3 -3Z`,
                    "pencil",
                    brown,
                    { strokeWidth: 1 },
                );
            }
            return;
        }
        case "boil-water": {
            pan(0.7);
            if (after) {
                curls(c, x - 0.1 * U, base - 1.8 * U, 3, 1.8 * U);
                for (const dx of [-0.8, 0.1, 0.9]) bubble(c, x + dx * U, base - 0.5 * U, 7);
            }
            return;
        }
        case "dissolve-sugar": {
            tumbler(c, after ? x : x - 0.6 * U, base, 0.7);
            if (!after)
                for (const [dx, dy] of [
                    [1.3, 0],
                    [1.8, 0],
                    [1.55, -0.55],
                ] as Pt[])
                    pen.path(
                        g,
                        roundedRect(x + dx * U - 7, base + dy * U - 13, 14, 12, 2),
                        "pencil",
                        pen.fill("card"),
                        { strokeWidth: 1.3 },
                    );
            else
                pen.line(g, x + 0.3 * U, base - 3.6 * U, x - 0.5 * U, base - 0.5 * U, "pencil", {
                    strokeWidth: 2.4,
                    stroke: t["ink-soft"],
                });
            return;
        }
        case "toast-bread": {
            const l = x - 1.35 * U,
                top = base - 3 * U,
                w = 2.7 * U;
            const slice = `M${l} ${base}V${top + 0.9 * U}Q${l - 0.35 * U} ${top} ${l + 0.6 * U} ${top}Q${x} ${top - 0.35 * U} ${l + w - 0.6 * U} ${top}Q${l + w + 0.35 * U} ${top} ${l + w} ${top + 0.9 * U}V${base}Z`;
            pen.path(
                g,
                slice,
                "pencil",
                after ? paint(c, "yellow + brown 2") : paint(c, "yellow + white 4"),
                { strokeWidth: 2.2 },
            );
            const inner = `M${l + 5} ${base - 5}V${top + 0.95 * U}Q${l - 0.1 * U} ${top + 0.25 * U} ${l + 0.65 * U} ${top + 0.25 * U}Q${x} ${top} ${l + w - 0.65 * U} ${top + 0.25 * U}Q${l + w + 0.1 * U} ${top + 0.25 * U} ${l + w - 5} ${top + 0.95 * U}V${base - 5}Z`;
            pen.path(g, inner, "pencil", null, { strokeWidth: 1, stroke: t["ink-soft"] });
            if (after)
                for (const k of [0.35, 0.65])
                    pen.line(
                        g,
                        l + 0.4 * U,
                        top + (k + 0.3) * 2.2 * U - 0.6 * U,
                        l + w - 0.4 * U,
                        top + (k + 0.3) * 2.2 * U - 0.6 * U,
                        "pencil",
                        { strokeWidth: 1.6, stroke: c.paper ? t.ink : "#6B4228" },
                    );
            return;
        }
        case "cook-egg": {
            if (!after) {
                bowl(pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.5 }), 0.6);
                pen.circle(
                    g,
                    x + 0.2 * U,
                    base - 1.05 * U,
                    0.9 * U,
                    "pencil",
                    lightFill(c, "glow", "solid"),
                    { strokeWidth: 1.4 },
                );
            } else {
                pen.ellipse(g, x, base - 0.6 * U, 4 * U, 1.2 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 1.6,
                });
                pen.path(
                    g,
                    `M${x - 1.4 * U} ${base - 0.7 * U}Q${x - 1.5 * U} ${base - 1.5 * U} ${x - 0.4 * U} ${base - 1.35 * U}Q${x + 0.4 * U} ${base - 1.9 * U} ${x + 1.2 * U} ${base - 1.2 * U}Q${x + 1.7 * U} ${base - 0.6 * U} ${x + 0.6 * U} ${base - 0.45 * U}Q${x - 0.6 * U} ${base - 0.2 * U} ${x - 1.4 * U} ${base - 0.7 * U}Z`,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.6 },
                );
                pen.circle(
                    g,
                    x - 0.1 * U,
                    base - 1.05 * U,
                    0.95 * U,
                    "pencil",
                    lightFill(c, "glow", "solid"),
                    { strokeWidth: 1.5 },
                );
            }
            return;
        }
        case "bake-cake": {
            if (!after) {
                bowl(paint(c, "yellow + white 3"), 0.7);
                pen.line(g, x + 0.6 * U, base - 3.2 * U, x - 0.2 * U, base - 0.8 * U, "pencil", {
                    strokeWidth: 3,
                    stroke: c.paper ? t.ink : t.tang,
                });
            } else {
                const l = x - 1.6 * U,
                    w = 3.2 * U,
                    top = base - 2.2 * U;
                pen.path(
                    g,
                    `M${l} ${base}V${top + 0.3 * U}Q${x} ${top - 0.5 * U} ${l + w} ${top + 0.3 * U}V${base}Z`,
                    "pencil",
                    paint(c, "yellow + white 2 + brown"),
                    { strokeWidth: 2 },
                );
                pen.path(
                    g,
                    `M${l} ${top + 0.35 * U}Q${x} ${top - 0.45 * U} ${l + w} ${top + 0.35 * U}Q${x} ${top + 0.25 * U} ${l} ${top + 0.35 * U}Z`,
                    "pencil",
                    paint(c, "yellow + brown"),
                    { strokeWidth: 1.2 },
                );
                pen.line(g, l, top + 1.2 * U, l + w, top + 1.2 * U, "pencil", {
                    strokeWidth: 1,
                    stroke: t["ink-soft"],
                });
            }
            return;
        }
        case "burn-candle":
            candleOn(c, x, base, after ? 0.9 * U : 2.6 * U, true, after ? 3 : 0);
            return;
        case "rust-nail":
            nail(c, x - 1.9 * U, x + 1.9 * U, base - 0.9 * U, after ? 1 : 0, 11);
            return;
        case "fizz": {
            const { level } = tumbler(c, x - (after ? 0 : 0.5) * U, base, 0.45);
            if (!after) {
                pen.path(
                    g,
                    `M${x + 0.4 * U} ${base - 3.6 * U}L${x + 1.9 * U} ${base - 4.1 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 2.2, stroke: t["ink-soft"] },
                );
                pen.ellipse(
                    g,
                    x + 0.3 * U,
                    base - 3.5 * U,
                    0.9 * U,
                    0.5 * U,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.4 },
                );
                pen.path(
                    g,
                    `M${x - 0.1 * U} ${base - 3.55 * U}Q${x + 0.3 * U} ${base - 4 * U} ${x + 0.7 * U} ${base - 3.55 * U}Z`,
                    "pencil",
                    pen.fill("card", "dots"),
                    { strokeWidth: 1 },
                );
            } else {
                const foamTop = base - 3.6 * U;
                pen.path(
                    g,
                    `M${x - 1.25 * U} ${level}V${foamTop + 0.4 * U}Q${x - 1.3 * U} ${foamTop - 0.3 * U} ${x - 0.6 * U} ${foamTop}Q${x - 0.2 * U} ${foamTop - 0.6 * U} ${x + 0.3 * U} ${foamTop - 0.1 * U}Q${x + 1 * U} ${foamTop - 0.4 * U} ${x + 1.25 * U} ${foamTop + 0.4 * U}V${level}Z`,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.4 },
                );
                const r = rng(71);
                for (let k = 0; k < 9; k++)
                    bubble(
                        c,
                        x + (r() - 0.5) * 2 * U,
                        foamTop + 0.3 * U + r() * (level - foamTop - 0.5 * U),
                        5 + r() * 6,
                    );
                for (const [dx, dy] of [
                    [-1, -0.9],
                    [0.9, -1.1],
                ] as Pt[])
                    for (let k = 0; k < 4; k++) {
                        const th = (k / 4) * Math.PI * 2 + 0.4;
                        pen.line(
                            g,
                            x + dx * U + Math.cos(th) * 4,
                            foamTop + dy * U + Math.sin(th) * 4,
                            x + dx * U + Math.cos(th) * 9,
                            foamTop + dy * U + Math.sin(th) * 9,
                            "pencil",
                            { strokeWidth: 1.3, stroke: t.pen },
                        );
                    }
            }
            return;
        }
        case "rise-dough": {
            const h = after ? 1.9 : 1.1,
                w = after ? 3.2 : 2.3;
            bowl(pen.fill("card"), 0.2);
            pen.path(
                g,
                `M${x - (w / 2) * U} ${base - 1.4 * U}Q${x - (w / 2) * U} ${base - (1.4 + h) * U} ${x} ${base - (1.4 + h) * U}Q${x + (w / 2) * U} ${base - (1.4 + h) * U} ${x + (w / 2) * U} ${base - 1.4 * U}Z`,
                "pencil",
                paint(c, "yellow + white 4"),
                { strokeWidth: 1.8 },
            );
            if (after)
                for (const [dx, dy] of [
                    [-0.6, 2.3],
                    [0.4, 2.6],
                    [0.9, 2.0],
                ] as Pt[])
                    pen.circle(g, x + dx * U, base - dy * U, 4, "pencil", null, {
                        strokeWidth: 0.9,
                        stroke: t["ink-soft"],
                    });
            return;
        }
        default:
            say(c, x, base - 1.2 * U, "?", 20);
    }
}

export const beforeAfter = defineDrawing({
    id: "beforeafter",
    family: "science",
    title: "Before and after a change",
    group: "Structures",
    about: "What there is before a change and after it, with what made it happen on the arrow: ice melting and water freezing, chocolate melting, water boiling, sugar dissolving, bread toasting, an egg cooking, a cake baking, a candle burning, a nail rusting, vinegar and baking soda fizzing, and dough rising. Whether it can be undone and whether it makes a new material is one table, which the checker marks from. With `show` at 0 the after picture waits under a question mark, and `names` writes what each half is.",
    params: { change: "melt-chocolate", show: 1, names: 1 },
    settings: {
        change: { kind: "one of", of: Object.keys(CHANGES) },
        show: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Chocolate melts", params: { change: "melt-chocolate", show: 1, names: 1 } },
        { label: "Bread toasts", params: { change: "toast-bread", show: 1, names: 1 } },
        { label: "Water freezes", params: { change: "freeze-water", show: 1, names: 1 } },
        { label: "An egg cooks", params: { change: "cook-egg", show: 1, names: 1 } },
        { label: "Sugar dissolves", params: { change: "dissolve-sugar", show: 1, names: 1 } },
        { label: "Water boils", params: { change: "boil-water", show: 1, names: 1 } },
        { label: "A cake bakes", params: { change: "bake-cake", show: 1, names: 1 } },
        { label: "A candle burns", params: { change: "burn-candle", show: 1, names: 1 } },
        { label: "A nail rusts", params: { change: "rust-nail", show: 1, names: 1 } },
        { label: "Vinegar and soda fizz", params: { change: "fizz", show: 1, names: 1 } },
        { label: "Dough rises", params: { change: "rise-dough", show: 1, names: 1 } },
        { label: "Ice melts, to predict", params: { change: "melt-ice", show: 0, names: 1 } },
    ],
    box: (p) => ({ w: 15, h: p.names > 0 ? 8 : 7 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            facts = CHANGES[p.change],
            base = 5.6 * U,
            bx = 3.2 * U,
            ax = 11.8 * U;
        changeHalf(c, p.change, false, bx, base);
        if (p.show > 0) changeHalf(c, p.change, true, ax, base);
        else penned(c, ax, base - 1.2 * U, "?", 36);
        c.pen.arrow(c.g, [6.3 * U, 3.9 * U], [8.7 * U, 3.9 * U], c.t.ink, 0.1);
        if (facts) soft(c, 7.5 * U, 2.9 * U, facts.by, 11);
        if (p.names > 0 && facts) {
            soft(c, bx, 7.1 * U, facts.before, 13);
            if (p.show > 0) soft(c, ax, 7.1 * U, facts.after, 13);
        }
        a.before = [bx, 0.8 * U, "up"];
        a.after = [ax, 0.8 * U, "up"];
        return a;
    },
    describe: (p) =>
        `${CHANGES[p.change]?.before ?? "Something"} on the left and an arrow to ${p.show > 0 ? (CHANGES[p.change]?.after ?? "what it becomes") : "a question mark"} on the right, what makes the change written on the arrow${p.names > 0 ? ", both halves named" : ""}.`,
    reads: true,
});
