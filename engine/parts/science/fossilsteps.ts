import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned } from "../lettering";
import { type Pt, lightFill, lettered } from "./apparatus";

/** One step of a fossil forming, in a square panel whose top-left corner is (x0, y0). */
function fossilPanel<G>(c: Ctx<G>, step: number, x0: number, y0: number, s: number): void {
    const { pen, g } = c,
        t = c.t,
        mid = x0 + s / 2;
    const shell = (x: number, y: number, rock: boolean) => {
        pen.circle(
            g,
            x,
            y,
            1.3 * U,
            "pencil",
            rock ? pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }) : pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        const pts: Pt[] = [];
        for (let k = 0; k <= 24; k++) {
            const th = k * 0.55,
                rr = 0.6 * U * (1 - k / 30);
            pts.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr]);
        }
        pen.curve(g, pts, "pencil", { strokeWidth: 1.1 });
    };
    const floorY = y0 + s * 0.78;
    if (step <= 2) {
        pen.rect(
            g,
            x0 + 3,
            y0 + 3,
            s - 6,
            floorY - y0 - 3,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 0 },
        );
        pen.curve(
            g,
            [
                [x0 + 3, y0 + 0.9 * U],
                [x0 + s * 0.3, y0 + 0.7 * U],
                [x0 + s * 0.6, y0 + 1.05 * U],
                [x0 + s - 3, y0 + 0.8 * U],
            ],
            "pencil",
            { strokeWidth: 1.4 },
        );
        pen.rect(
            g,
            x0 + 3,
            floorY,
            s - 6,
            y0 + s - 3 - floorY,
            "pencil",
            lightFill(c, "glow", "hachure", 5),
            { strokeWidth: 0 },
        );
        pen.line(g, x0 + 3, floorY, x0 + s - 3, floorY, "pencil", { strokeWidth: 1.4 });
        if (step === 1) {
            shell(mid, floorY - 0.65 * U, false);
            pen.line(g, mid, y0 + 1.4 * U, mid, floorY - 1.6 * U, "pencil", {
                strokeWidth: 1.3,
                strokeLineDash: [4, 4],
                stroke: t.pen,
            });
            pen.line(g, mid, floorY - 1.6 * U, mid - 4, floorY - 1.9 * U, "pencil", {
                strokeWidth: 1.3,
                stroke: t.pen,
            });
            pen.line(g, mid, floorY - 1.6 * U, mid + 4, floorY - 1.9 * U, "pencil", {
                strokeWidth: 1.3,
                stroke: t.pen,
            });
        } else {
            const mud = floorY - 1.5 * U;
            pen.path(
                g,
                `M${x0 + 3} ${floorY}V${mud + 4}Q${mid} ${mud - 6} ${x0 + s - 3} ${mud + 4}V${floorY}Z`,
                "pencil",
                lightFill(c, "tang", "hachure", 4),
                { strokeWidth: 1.3 },
            );
            shell(mid, floorY - 0.55 * U, false);
        }
    } else if (step === 3) {
        const bands = ["glow", "tang", "ink-soft", "tang", "glow"] as const;
        const h = (s - 6) / bands.length;
        bands.forEach((b, k) =>
            pen.rect(
                g,
                x0 + 3,
                y0 + 3 + k * h,
                s - 6,
                h,
                "pencil",
                pen.fill(b, "hachure", { hachureGap: 4 + k }),
                { strokeWidth: 1 },
            ),
        );
        shell(mid, y0 + 3 + 4.4 * h, true);
    } else {
        pen.path(
            g,
            `M${x0 + 3} ${y0 + s - 3}V${y0 + 1.8 * U}L${x0 + s * 0.7} ${y0 + 1.8 * U}L${x0 + s * 0.78} ${y0 + s - 3}Z`,
            "pencil",
            lightFill(c, "glow", "hachure", 5),
            { strokeWidth: 1.6 },
        );
        for (const k of [0.45, 0.62, 0.8])
            pen.line(
                g,
                x0 + 3,
                y0 + s * k,
                x0 + s * (0.7 + (k - 0.3) * 0.13),
                y0 + s * k,
                "pencil",
                { strokeWidth: 1, stroke: t["ink-soft"] },
            );
        shell(x0 + s * 0.45, y0 + s * 0.7, true);
        pen.circle(
            g,
            x0 + s - 1 * U,
            y0 + 0.95 * U,
            1.1 * U,
            "pencil",
            lightFill(c, "glow", "solid"),
            { strokeWidth: 1.4 },
        );
        for (let k = 0; k < 4; k++)
            pen.line(
                g,
                x0 + s * 0.78 + k * 5,
                y0 + 2.2 * U + k * 3,
                x0 + s * 0.74 + k * 5,
                y0 + 2.8 * U + k * 3,
                "pencil",
                { strokeWidth: 1.2, stroke: t.pen },
            );
    }
    pen.rect(g, x0, y0, s, s, "pencil", null, { strokeWidth: 2 });
}

export const fossilsteps = defineDrawing({
    id: "fossilsteps",
    family: "science",
    title: "How a fossil forms",
    group: "Structures",
    about: "Four pictures of a fossil forming: a sea creature dies and sinks to the sea floor, mud covers it, more layers pile on and over millions of years it turns to rock, and at last the rock wears away and the fossil is found in a cliff. `order` says which step each picture shows, so the four can be muddled for a child to put right, and `blank` puts a question mark in one place.",
    params: { order: [1, 2, 3, 4], blank: -1, letters: 1 },
    settings: {
        order: { kind: "numbers", min: 1, max: 4, most: 4 },
        blank: { kind: "whole", min: -1, max: 3 },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "In order", params: { order: [1, 2, 3, 4], blank: -1, letters: 1 } },
        { label: "Muddled, to put right", params: { order: [3, 1, 4, 2], blank: -1, letters: 1 } },
        { label: "One missing", params: { order: [1, 2, 3, 4], blank: 2, letters: 1 } },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(4, p.order.length)) * 7 - 1, h: p.letters > 0 ? 9 : 7 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            s = 6 * U;
        p.order.slice(0, 4).forEach((step, i) => {
            const x0 = i * 7 * U,
                y0 = 0.4 * U;
            if (i === Math.round(p.blank)) {
                c.pen.rect(c.g, x0, y0, s, s, "pencil", null, {
                    strokeWidth: 2,
                    strokeLineDash: [7, 6],
                    stroke: c.t["ink-soft"],
                });
                penned(c, x0 + s / 2, y0 + s / 2 + 12, "?", 38);
            } else fossilPanel(c, Math.max(1, Math.min(4, Math.round(step))), x0, y0, s);
            if (p.letters > 0) lettered(c, x0 + s / 2, 7.9 * U, i);
            if (i < p.order.length - 1) num(c, x0 + s + 0.5 * U, y0 + s / 2 + 7, "→", 18);
            a[`panel(${i})`] = [x0 + s / 2, y0, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A row of square pictures telling how a fossil forms, each showing the shell at one step${p.blank >= 0 ? ", one hidden under a question mark" : ""}${p.letters > 0 ? ", lettered underneath" : ""}.`,
    reads: true,
});
