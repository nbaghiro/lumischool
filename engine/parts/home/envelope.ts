import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U, MARKERS, MARKER_WORD, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/**
 * An envelope, sealed or open with its letter sliding out. Open, the letter shows up to eight
 * digits in boxes, which is how an emailed code is drawn: a row of numbers to copy, and nothing else
 * on the card, so the eye goes straight to them.
 */
interface EnvelopeParams {
    open: number;
    code: string;
    stamp: Marker;
}

export const envelope = defineDrawing<EnvelopeParams>({
    id: "envelope",
    family: "home",
    title: "Envelope",
    group: "Props",
    about: "An envelope with a stamp in the corner, sealed with a wax dot or open with its letter sliding out. The letter can carry a row of up to eight digits in boxes, the way a code arrives by post or by email, or two ruled lines when there is nothing written on it yet.",
    params: { open: 1, code: "48207316", stamp: "berry" },
    settings: {
        open: { kind: "whole", min: 0, max: 1 },
        code: { kind: "text", most: 8 },
        stamp: { kind: "one of", of: MARKERS },
    },
    takes: [
        { label: "Open, a code inside", params: { open: 1, code: "48207316", stamp: "berry" } },
        { label: "Open, nothing written", params: { open: 1, code: "", stamp: "sky" } },
        { label: "Sealed", params: { open: 0, code: "", stamp: "mint" } },
    ],
    box: () => ({ w: 9, h: 8 }),
    draw: (c, p) => {
        const { pen, g, t } = c;
        const x0 = 0.5 * U,
            x1 = 8.5 * U,
            top = 3.2 * U,
            bottom = 7.6 * U,
            mid = (x0 + x1) / 2;
        const digits = String(p.code).replace(/\D/g, "").slice(0, 8);
        const a: RawAnchors = { envelope: [mid, bottom, "down"] };
        if (p.open > 0) {
            pen.polygon(
                g,
                [
                    [x0, top],
                    [mid, 0.7 * U],
                    [x1, top],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.7 },
            );
            const lx = 1.3 * U,
                lw = 6.4 * U,
                ly = 1.3 * U;
            pen.path(g, roundedRect(lx, ly, lw, 4.6 * U, 5), "ruler", pen.fill("card"), {
                strokeWidth: 1.6,
            });
            if (digits) {
                const box = 0.62 * U,
                    gap = 0.08 * U,
                    space = 0.3 * U;
                const width =
                    digits.length * box +
                    (digits.length - 1) * gap +
                    (digits.length > 4 ? space : 0);
                let x = mid - width / 2;
                digits.split("").forEach((d, i) => {
                    if (i === 4) x += space;
                    pen.rect(g, x, ly + 0.5 * U, box, 0.9 * U, "ruler", null, {
                        strokeWidth: 1.1,
                        stroke: t["ink-soft"],
                    });
                    num(c, x + box / 2, ly + 1.2 * U, d, 13);
                    x += box + gap;
                });
                a.code = [mid, ly + 0.5 * U, "up"];
            } else {
                for (const y of [ly + 0.8 * U, ly + 1.5 * U])
                    pen.line(g, lx + 0.6 * U, y, lx + lw - 0.6 * U, y, "ruler", {
                        strokeWidth: 1,
                        stroke: t["ink-soft"],
                    });
                a.letter = [mid, ly, "up"];
            }
        }
        pen.rect(g, x0, top, x1 - x0, bottom - top, "pencil", pen.fill("card"), { strokeWidth: 2 });
        pen.linear(
            g,
            [
                [x0, bottom],
                [mid, 5.3 * U],
                [x1, bottom],
            ],
            "pencil",
            { strokeWidth: 1.4 },
        );
        if (p.open > 0) {
            pen.line(g, x0, top, mid - 0.9 * U, 5.1 * U, "pencil", {
                strokeWidth: 1.1,
                stroke: t["ink-soft"],
            });
            pen.line(g, x1, top, mid + 0.9 * U, 5.1 * U, "pencil", {
                strokeWidth: 1.1,
                stroke: t["ink-soft"],
            });
        } else {
            pen.polygon(
                g,
                [
                    [x0, top],
                    [mid, 5.6 * U],
                    [x1, top],
                ],
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
                { strokeWidth: 1.7 },
            );
            pen.circle(g, mid, 5.3 * U, 0.8 * U, "pencil", pen.fill("berry"), { strokeWidth: 1.3 });
            a.seal = [mid, 5.3 * U, "down"];
        }
        const sx = x1 - 1.6 * U,
            sy = top + 0.35 * U;
        pen.rect(g, sx, sy, 1.2 * U, 1.35 * U, "ruler", pen.fill(p.stamp, "solid"), {
            strokeWidth: 1.3,
            strokeLineDash: [3, 2],
        });
        pen.circle(g, sx + 0.6 * U, sy + 0.65 * U, 0.5 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1,
        });
        a.stamp = [sx + 0.6 * U, sy, "up"];
        return a;
    },
    describe: (p) =>
        `An envelope with a ${MARKER_WORD[p.stamp]} stamp in the corner, ${p.open > 0 ? (String(p.code).replace(/\D/g, "") ? "open with its letter sliding out and a row of digits in boxes on it" : "open with its letter sliding out and two ruled lines on it") : "sealed with a red wax dot"}.`,
});
