import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** One centimetre is two squares, so a printed ruler measures real centimetres. */
const CM = 2 * U;

const ZERO = 2 * U;

function thing<G>(c: Ctx<G>, kind: string, x1: number, x2: number): void {
    const { pen, g } = c,
        y = 22,
        h = 26;
    // A small shape hatched at the usual density prints as a black bar, so paper gets a wider gap.
    const soft = c.paper ? { hachureGap: 9, fillWeight: 0.6 } : {};
    if (kind === "ribbon") {
        pen.path(
            g,
            roundedRect(x1, y, x2 - x1, h, 10),
            "pencil",
            pen.fill("berry", "solid", soft),
            { strokeWidth: 1.6 },
        );
        return;
    }
    if (kind === "stick") {
        pen.path(
            g,
            roundedRect(x1, y + 5, x2 - x1, h - 10, 6),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: c.paper ? 9 : 4 }),
            { strokeWidth: 1.6 },
        );
        return;
    }
    const tip = Math.min(16, (x2 - x1) / 3);
    pen.rect(g, x1, y, x2 - x1 - tip, h, "pencil", pen.fill("glow", "solid", soft), {
        strokeWidth: 1.6,
    });
    pen.polygon(
        g,
        [
            [x2 - tip, y],
            [x2, y + h / 2],
            [x2 - tip, y + h],
        ],
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.6 },
    );
    pen.rect(g, x1, y, 8, h, "pencil", pen.fill("berry", "solid", soft), { strokeWidth: 1.4 });
}

export const rulerCm = defineDrawing({
    id: "ruler",
    family: "measuring",
    title: "Ruler",
    group: "Structures",
    about: "One centimetre is two squares, so the printed ruler is life size. The object can start off zero.",
    params: { cm: 10, length: 6, start: 0, thing: "pencil" },
    settings: {
        cm: { kind: "whole", min: 1, max: 15 },
        length: { kind: "number", min: 0, max: 15, step: 0.5 },
        start: { kind: "number", min: 0, max: 15, step: 0.5 },
        thing: { kind: "one of", of: ["pencil", "ribbon", "stick"] },
    },
    takes: [
        { label: "Pencil from zero", params: { cm: 10, length: 6, start: 0, thing: "pencil" } },
        { label: "Ribbon from 2", params: { cm: 10, length: 5, start: 2, thing: "ribbon" } },
        { label: "Stick, 12 cm rule", params: { cm: 12, length: 7, start: 0, thing: "stick" } },
        { label: "Short rule", params: { cm: 6, length: 3, start: 1, thing: "pencil" } },
    ],
    box: (p) => ({ w: p.cm * 2 + 3, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            top = 3.5 * U,
            a: RawAnchors = {};
        const at = (n: number) => ZERO + n * CM;
        pen.rect(g, U, top, p.cm * CM + 2 * U, 2.6 * U, "ruler", pen.fill("card"), {
            strokeWidth: 2,
        });
        for (let n = 0; n <= p.cm; n++) {
            pen.line(g, at(n), top, at(n), top + 20, "ruler", { strokeWidth: 1.6 });
            if (n < p.cm)
                pen.line(g, at(n) + CM / 2, top, at(n) + CM / 2, top + 11, "ruler", {
                    strokeWidth: 1,
                });
            say(c, at(n), top + 40, String(n), 13);
            a[`tick(${n})`] = [at(n), top, "up"];
        }
        thing(c, p.thing, at(p.start), at(p.start + p.length));
        a["object-start"] = [at(p.start), 22, "up"];
        a["object-end"] = [at(p.start + p.length), 22, "up"];
        return a;
    },
    describe: (p) =>
        `A ruler marked in centimetres, two squares each, with a ${p.thing} lying along it${p.start > 0 ? " starting past the zero" : " from the zero"}.`,
});
