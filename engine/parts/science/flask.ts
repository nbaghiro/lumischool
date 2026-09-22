import { plain, type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { LIQUID, gleam, bubble, paint } from "./apparatus";

export const flask = defineDrawing({
    id: "flask",
    family: "science",
    title: "Flask",
    group: "Structures",
    about: "A conical flask or a round-bottomed one, with a liquid in it that can be any colour from the paint box, bubbles rising, and a stopper or a balloon on the neck. A balloon on a flask of fizzing vinegar and baking soda fills with the gas the reaction makes, and `balloon` says how big it has grown, so flasks side by side show which made the most gas.",
    params: { shape: "conical", fill: 0.35, paint: "", bubbles: 0, balloon: 0, bung: 0, tag: "" },
    settings: {
        shape: { kind: "one of", of: ["conical", "round"] },
        fill: { kind: "number", min: 0, max: 0.8, step: 0.05 },
        paint: { kind: "text", most: 20 },
        bubbles: { kind: "whole", min: 0, max: 14 },
        balloon: { kind: "whole", min: 0, max: 3 },
        bung: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "Conical, a balloon filling",
            params: {
                shape: "conical",
                fill: 0.35,
                paint: "",
                bubbles: 8,
                balloon: 2,
                bung: 0,
                tag: "",
            },
        },
        {
            label: "Round, stoppered",
            params: {
                shape: "round",
                fill: 0.4,
                paint: "blue+sky",
                bubbles: 0,
                balloon: 0,
                bung: 1,
                tag: "",
            },
        },
        {
            label: "A big balloon",
            params: {
                shape: "conical",
                fill: 0.3,
                paint: "",
                bubbles: 4,
                balloon: 3,
                bung: 0,
                tag: "B",
            },
        },
    ],
    box: () => ({ w: 9, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cx = 5 * U,
            base = 14.4 * U,
            neckTop = 7.2 * U,
            nw = 0.75 * U;
        const round = p.shape === "round",
            fill = Math.max(0, Math.min(0.8, p.fill));
        const body = round
            ? `M${cx - nw} ${neckTop}V${9.3 * U}A${2.6 * U} ${2.6 * U} 0 1 0 ${cx + nw} ${9.3 * U}V${neckTop}`
            : `M${cx - nw} ${neckTop}V${9.6 * U}L${cx - 3 * U} ${base - 0.3 * U}Q${cx - 3.1 * U} ${base} ${cx - 2.7 * U} ${base}H${cx + 2.7 * U}Q${cx + 3.1 * U} ${base} ${cx + 3 * U} ${base - 0.3 * U}L${cx + nw} ${9.6 * U}V${neckTop}`;
        const bottom = round ? 14.2 * U : base,
            span = round ? 4.9 * U : 4.6 * U,
            level = bottom - 4 - fill * span;
        const stuff = p.paint ? paint(c, p.paint) : pen.fill(LIQUID, "solid");
        if (fill > 0) {
            const halfAt = (y: number) =>
                round
                    ? Math.sqrt(Math.max(0, (2.6 * U) ** 2 - (y - 11.7 * U) ** 2))
                    : nw + ((y - 9.6 * U) / (base - 9.9 * U)) * (3 * U - nw);
            const hw = Math.max(nw, halfAt(level)) - 3;
            const shape = round
                ? `M${cx - hw} ${level}A${2.6 * U - 3} ${2.6 * U - 3} 0 ${level < 11.7 * U ? 1 : 0} 0 ${cx + hw} ${level}Z`
                : `M${cx - hw} ${level}L${cx - 3 * U + 4} ${base - 0.3 * U}Q${cx - 3 * U + 4} ${base - 3} ${cx - 2.7 * U} ${base - 3}H${cx + 2.7 * U}Q${cx + 3 * U - 4} ${base - 3} ${cx + 3 * U - 4} ${base - 0.3 * U}L${cx + hw} ${level}Z`;
            pen.path(g, shape, "ruler", stuff, { strokeWidth: 0 });
            pen.line(g, cx - hw, level, cx + hw, level, "ruler", { strokeWidth: 1.6 });
            const r = rng(31);
            for (let k = 0; k < Math.max(0, Math.min(14, Math.round(p.bubbles))); k++) {
                const y = level + 6 + r() * (bottom - level - 16),
                    hwy = Math.max(6, halfAt(y) - 10);
                bubble(c, cx + (r() - 0.5) * 2 * hwy, y, 4 + r() * 5);
            }
        }
        pen.path(g, body, "ruler", null, { strokeWidth: 2.4 });
        pen.ellipse(g, cx, neckTop, nw * 2 + 8, 7, "ruler", null, { strokeWidth: 1.6 });
        gleam(c, cx - (round ? 1.8 : 1.6) * U, 11 * U, 13.2 * U);
        const b = Math.max(0, Math.min(3, Math.round(p.balloon)));
        if (b > 0) {
            const rr = (0.85 + b * 0.65) * U,
                by = neckTop - 0.5 * U - rr;
            pen.path(
                g,
                `M${cx - nw - 2} ${neckTop + 0.4 * U}V${neckTop - 0.4 * U}Q${cx - nw} ${neckTop - 0.7 * U} ${cx - rr * 0.35} ${by + rr * 0.9}A${rr} ${rr * 1.08} 0 1 1 ${cx + rr * 0.35} ${by + rr * 0.9}Q${cx + nw} ${neckTop - 0.7 * U} ${cx + nw + 2} ${neckTop - 0.4 * U}V${neckTop + 0.4 * U}Z`,
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 1.8 },
            );
            if (!c.paper)
                plain(c, {
                    kind: "path",
                    d: `M${cx - rr * 0.55} ${by - rr * 0.25}Q${cx - rr * 0.45} ${by - rr * 0.7} ${cx - rr * 0.05} ${by - rr * 0.75}`,
                    fill: "none",
                    stroke: "#FFFFFF",
                    width: 3,
                    cap: "round",
                    opacity: 0.8,
                });
            a.balloon = [cx, by - rr, "up"];
        } else if (p.bung > 0) {
            pen.polygon(
                g,
                [
                    [cx - nw - 5, neckTop - 0.7 * U],
                    [cx + nw + 5, neckTop - 0.7 * U],
                    [cx + nw - 1, neckTop + 0.5 * U],
                    [cx - nw + 1, neckTop + 0.5 * U],
                ],
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
                { strokeWidth: 1.6 },
            );
        }
        if (p.tag) {
            patch(c, 1 * U, 1.3 * U, 30, 24);
            num(c, 1 * U, 1.8 * U, p.tag, 22);
        }
        a.neck = [cx, neckTop, "up"];
        return a;
    },
    describe: (p) =>
        `A ${p.shape === "round" ? "round bottomed" : "conical"} glass flask with a narrow neck${p.fill > 0 ? ", liquid in the bottom of it" : ", nothing in it yet"}${p.bubbles > 0 && p.fill > 0 ? ", bubbles rising through the liquid" : ""}${p.balloon > 0 ? ", a balloon on its neck" : p.bung > 0 ? ", a stopper in its neck" : ", its neck open"}${p.tag ? ", lettered in the corner" : ""}.`,
    reads: true,
});
