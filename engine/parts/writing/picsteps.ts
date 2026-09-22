import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, say, soft } from "../lettering";
import { writeLine, wrapTo } from "./lines";

type Pt = [number, number];

const PANEL = 8;

function stepPicture<G>(c: Ctx<G>, kind: string, x: number, y: number): void {
    const { pen, g } = c,
        fillCard = pen.fill("card");
    const bowl = (fill: "glow" | "card" = "card") => {
        pen.path(
            g,
            `M${x - 30} ${y - 2}Q${x - 28} ${y + 26} ${x} ${y + 26}Q${x + 28} ${y + 26} ${x + 30} ${y - 2}Z`,
            "pencil",
            pen.fill(fill === "glow" ? "glow" : "sky"),
            { strokeWidth: 2 },
        );
        pen.ellipse(g, x, y - 2, 60, 12, "pencil", fill === "glow" ? pen.fill("glow") : fillCard, {
            strokeWidth: 1.6,
        });
    };
    const pot = (soil: boolean) => {
        pen.path(
            g,
            `M${x - 22} ${y - 6}L${x - 16} ${y + 26}H${x + 16}L${x + 22} ${y - 6}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 2 },
        );
        pen.rect(g, x - 25, y - 12, 50, 8, "pencil", pen.fill("tang"), { strokeWidth: 1.8 });
        if (soil)
            pen.ellipse(
                g,
                x,
                y - 12,
                44,
                7,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.2 },
            );
    };
    switch (kind) {
        case "flour": {
            pen.path(
                g,
                `M${x - 20} ${y + 26}V${y - 14}L${x - 14} ${y - 24}H${x + 14}L${x + 20} ${y - 14}V${y + 26}Z`,
                "pencil",
                fillCard,
                { strokeWidth: 2 },
            );
            pen.line(g, x - 14, y - 24, x - 10, y - 14, "pencil", { strokeWidth: 1.2 });
            cap(c, x, y + 8, "flour", 10);
            pen.path(
                g,
                `M${x + 24} ${y + 26}Q${x + 36} ${y + 12} ${x + 46} ${y + 26}Z`,
                "pencil",
                fillCard,
                { strokeWidth: 1.4 },
            );
            break;
        }
        case "eggs": {
            bowl();
            for (const dx of [-14, 2])
                pen.ellipse(g, x + dx, y - 16, 16, 21, "pencil", fillCard, { strokeWidth: 1.6 });
            pen.path(g, `M${x + 20} ${y - 26}l6 5l5 -5l5 5v10h-16Z`, "pencil", fillCard, {
                strokeWidth: 1.4,
            });
            pen.path(g, `M${x + 20} ${y - 12}q8 10 16 0`, "pencil", pen.fill("glow"), {
                strokeWidth: 1.4,
            });
            break;
        }
        case "stir": {
            bowl("glow");
            pen.line(g, x + 4, y + 2, x + 26, y - 30, "pencil", { strokeWidth: 3 });
            pen.curve(
                g,
                [
                    [x - 18, y - 4],
                    [x - 6, y - 8],
                    [x + 8, y - 5],
                    [x - 4, y - 1],
                ],
                "pencil",
                { stroke: c.t.pen, strokeWidth: 1.6 },
            );
            break;
        }
        case "tin": {
            pen.path(
                g,
                `M${x - 30} ${y + 4}V${y + 24}H${x + 30}V${y + 4}`,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
                { strokeWidth: 2 },
            );
            pen.rect(g, x - 27, y + 10, 54, 12, "pencil", pen.fill("glow"), { strokeWidth: 1.2 });
            pen.path(
                g,
                `M${x - 6} ${y - 34}Q${x + 20} ${y - 40} ${x + 30} ${y - 18}L${x + 4} ${y - 8}Q${x - 10} ${y - 18} ${x - 6} ${y - 34}Z`,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.8 },
            );
            pen.curve(
                g,
                [
                    [x + 2, y - 10],
                    [x - 2, y - 2],
                    [x, y + 10],
                ],
                "pencil",
                { stroke: c.paper ? c.t.ink : c.t.tang, strokeWidth: 4 },
            );
            break;
        }
        case "oven": {
            pen.rect(g, x - 30, y - 30, 60, 56, "pencil", fillCard, { strokeWidth: 2.2 });
            pen.rect(
                g,
                x - 22,
                y - 12,
                44,
                30,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 5 }),
                { strokeWidth: 1.8 },
            );
            for (const k of [-16, -4, 8])
                pen.circle(g, x + k, y - 22, 8, "ruler", pen.fill("ink-soft"), { strokeWidth: 1 });
            pen.line(g, x - 12, y - 7, x + 12, y - 7, "pencil", { strokeWidth: 2.4 });
            break;
        }
        case "timer": {
            pen.circle(g, x, y, 56, "pencil", fillCard, { strokeWidth: 2.2 });
            pen.rect(g, x - 5, y - 36, 10, 8, "pencil", pen.fill("berry"), { strokeWidth: 1.4 });
            for (let k = 0; k < 12; k++) {
                const t = (k / 12) * Math.PI * 2;
                pen.line(
                    g,
                    x + 22 * Math.sin(t),
                    y - 22 * Math.cos(t),
                    x + 26 * Math.sin(t),
                    y - 26 * Math.cos(t),
                    "ruler",
                    { strokeWidth: 1.2 },
                );
            }
            pen.line(g, x, y, x, y - 18, "pencil", { strokeWidth: 2.2 });
            pen.line(g, x, y, x + 13, y + 7, "pencil", { strokeWidth: 2.2 });
            break;
        }
        case "cake": {
            pen.ellipse(g, x, y - 6, 58, 14, "pencil", pen.fill("berry"), { strokeWidth: 1.8 });
            pen.path(
                g,
                `M${x - 29} ${y - 6}V${y + 18}Q${x} ${y + 26} ${x + 29} ${y + 18}V${y - 6}`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 2 },
            );
            for (const k of [-12, 0, 12]) {
                pen.rect(g, x + k - 2, y - 24, 5, 16, "pencil", pen.fill("sky"), {
                    strokeWidth: 1,
                });
                pen.ellipse(g, x + k + 0.5, y - 29, 6, 9, "pencil", pen.fill("tang"), {
                    strokeWidth: 0.8,
                });
            }
            pen.ellipse(g, x, y + 24, 72, 10, "pencil", fillCard, { strokeWidth: 1.4 });
            break;
        }
        case "pot":
            pot(false);
            break;
        case "soil": {
            pot(true);
            pen.polygon(
                g,
                [
                    [x + 6, y - 34],
                    [x + 30, y - 34],
                    [x + 24, y - 18],
                    [x + 12, y - 18],
                ],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.4 },
            );
            break;
        }
        case "seed": {
            pot(true);
            for (const [dx, dy] of [
                [-6, -26],
                [4, -32],
                [12, -22],
            ] as Pt[])
                pen.ellipse(g, x + dx, y + dy, 7, 10, "pencil", pen.fill("tang"), {
                    strokeWidth: 1,
                });
            break;
        }
        case "water": {
            pot(true);
            pen.path(
                g,
                `M${x + 2} ${y - 44}H${x + 30}L${x + 26} ${y - 24}H${x + 6}Z`,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.8 },
            );
            pen.arc(g, x + 16, y - 44, 22, 16, Math.PI, Math.PI * 2, "pencil", {
                strokeWidth: 1.8,
            });
            pen.line(g, x + 5, y - 30, x - 16, y - 42, "pencil", { strokeWidth: 2.4 });
            for (const [dx, dy] of [
                [-18, -34],
                [-12, -28],
                [-22, -26],
            ] as Pt[])
                pen.line(g, x + dx, y + dy, x + dx + 2, y + dy + 6, "pencil", {
                    stroke: c.paper ? c.t.ink : c.t.sky,
                    strokeWidth: 2,
                });
            break;
        }
        case "sun": {
            pot(true);
            pen.line(g, x, y - 12, x, y - 22, "pencil", { strokeWidth: 2 });
            pen.circle(g, x + 24, y - 34, 18, "pencil", pen.fill("glow"), { strokeWidth: 1.4 });
            for (let k = 0; k < 8; k++) {
                const t = (k / 8) * Math.PI * 2;
                pen.line(
                    g,
                    x + 24 + 12 * Math.cos(t),
                    y - 34 + 12 * Math.sin(t),
                    x + 24 + 17 * Math.cos(t),
                    y - 34 + 17 * Math.sin(t),
                    "pencil",
                    { strokeWidth: 1.2 },
                );
            }
            break;
        }
        case "shoot": {
            pot(true);
            pen.line(g, x, y - 12, x, y - 34, "pencil", { strokeWidth: 2.4 });
            for (const s of [-1, 1])
                pen.ellipse(
                    g,
                    x + s * 10,
                    y - 30 + (s > 0 ? 6 : 0),
                    20,
                    10,
                    "pencil",
                    pen.fill("mint"),
                    { strokeWidth: 1.4 },
                );
            pen.circle(g, x, y - 40, 14, "pencil", pen.fill("berry"), { strokeWidth: 1.2 });
            break;
        }
        default: {
            pen.circle(g, x, y, 40, "pencil", fillCard, { strokeWidth: 1.8 });
            soft(c, x, y + 5, "?", 16);
        }
    }
}

const perRow = (p: { pictures: string[]; per: number }) =>
    Math.max(1, Math.min(4, Math.round(p.per), p.pictures.length));

const stepsBox = (p: { pictures: string[]; per: number }) => {
    const per = perRow(p),
        rows = Math.ceil(p.pictures.length / per);
    return { w: per * PANEL + 1, h: rows * (PANEL + 1) };
};

export const picSteps = defineDrawing({
    id: "picsteps",
    family: "writing",
    title: "Pictures of the steps",
    group: "Structures",
    about: "The steps of a job as numbered pictures, with a line under each for the child to write the step on: a cake from flour to candles, or a seed from an empty pot to a flower. The pictures carry the order and the child supplies the words, which is how instructions are first written.",
    params: {
        pictures: ["flour", "eggs", "stir", "tin", "oven", "cake"],
        texts: ["", "", "", "", "", ""],
        per: 3,
        numbers: true,
        write: true,
    },
    settings: {
        pictures: { kind: "words", most: 8 },
        texts: { kind: "words", most: 8 },
        per: { kind: "whole", min: 1, max: 4 },
        numbers: { kind: "flag" },
        write: { kind: "flag" },
    },
    takes: [
        {
            label: "A cake, to write",
            params: {
                pictures: ["flour", "eggs", "stir", "tin", "oven", "cake"],
                texts: ["", "", "", "", "", ""],
                per: 3,
                numbers: true,
                write: true,
            },
        },
        {
            label: "A seed, two steps written",
            params: {
                pictures: ["pot", "soil", "seed", "water"],
                texts: ["Get a pot.", "Fill it with soil.", "", ""],
                per: 4,
                numbers: true,
                write: true,
            },
        },
    ],
    box: (p) => stepsBox(p),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            per = perRow(p);
        p.pictures.forEach((kind, i) => {
            const col = i % per,
                row = Math.floor(i / per);
            const x = (0.5 + col * PANEL) * U,
                y = row * (PANEL + 1) * U + 0.3 * U;
            pen.path(
                g,
                roundedRect(x + 3, y, (PANEL - 0.3) * U, PANEL * U, 10),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            stepPicture(c, kind, x + (PANEL / 2) * U, y + 3.4 * U);
            if (p.numbers) {
                pen.circle(g, x + 0.9 * U, y + 0.9 * U, 0.95 * U, "ruler", pen.fill("glow"), {
                    strokeWidth: 1.3,
                });
                num(c, x + 0.9 * U, y + 0.9 * U + 5, i + 1, 13);
            }
            const t = p.texts[i] ?? "";
            if (t)
                wrapTo(t, (PANEL - 1) * U, 14)
                    .slice(0, 2)
                    .forEach((l, k) => say(c, x + (PANEL / 2) * U, y + (6.3 + k * 1.1) * U, l, 14));
            else if (p.write) writeLine(c, x + 0.6 * U, y + 7.1 * U, (PANEL - 1.5) * U);
            a[`step(${i})`] = [x + (PANEL / 2) * U, y, "up"];
        });
        return a;
    },
    describe: () =>
        "The steps of a job as a row of numbered pictures in boxes, each with a ruled line under it for the step to be written on.",
});
