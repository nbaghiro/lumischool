import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** The flags of the countries whose national units the history track has, in that order. */
export const FLAGS = ["britain", "usa", "japan", "russia", "china"] as const;
type Nation = (typeof FLAGS)[number];
const isNation = (s: string): s is Nation => (FLAGS as readonly string[]).includes(s);

const FW = 6;
const FH = 4;
const STEP = 7;

function star<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    const pts: [number, number][] = [];
    for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5,
            d = k % 2 === 0 ? r : r * 0.45;
        pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
    }
    c.pen.polygon(c.g, pts, "ruler", c.pen.fill("glow", "solid"), { strokeWidth: 0.8 });
}

function flag<G>(c: Ctx<G>, nation: Nation, x: number, y: number): void {
    const { pen, g } = c,
        w = FW * U,
        h = FH * U,
        thin = { strokeWidth: 1 };
    pen.rect(g, x, y, w, h, "ruler", pen.fill(nation === "china" ? "berry" : "card", "solid"), {
        strokeWidth: 1.6,
    });
    if (nation === "britain") {
        pen.line(g, x, y, x + w, y + h, "ruler", { strokeWidth: 6, stroke: c.t.sky });
        pen.line(g, x + w, y, x, y + h, "ruler", { strokeWidth: 6, stroke: c.t.sky });
        pen.line(g, x, y, x + w, y + h, "ruler", { strokeWidth: 2, stroke: c.t.berry });
        pen.line(g, x + w, y, x, y + h, "ruler", { strokeWidth: 2, stroke: c.t.berry });
        pen.rect(g, x + w / 2 - 0.5 * U, y, 1 * U, h, "ruler", pen.fill("card", "solid"), thin);
        pen.rect(g, x, y + h / 2 - 0.5 * U, w, 1 * U, "ruler", pen.fill("card", "solid"), thin);
        pen.rect(g, x + w / 2 - 0.3 * U, y, 0.6 * U, h, "ruler", pen.fill("berry", "solid"), thin);
        pen.rect(g, x, y + h / 2 - 0.3 * U, w, 0.6 * U, "ruler", pen.fill("berry", "solid"), thin);
    } else if (nation === "usa") {
        // thirteen stripes, and a blue corner of stars, too many to draw each one at this size
        for (let k = 0; k < 13; k += 2)
            pen.rect(g, x, y + (k * h) / 13, w, h / 13, "ruler", pen.fill("berry", "solid"), thin);
        pen.rect(g, x, y, w * 0.42, (h * 7) / 13, "ruler", pen.fill("sky", "solid"), thin);
        for (let r = 0; r < 4; r++)
            for (let k = 0; k < 5; k++)
                pen.circle(
                    g,
                    x + (0.3 + k * 0.45) * U,
                    y + (0.3 + r * 0.5) * U,
                    3,
                    "ruler",
                    pen.fill("card", "solid"),
                    {
                        strokeWidth: 0.5,
                    },
                );
    } else if (nation === "japan") {
        pen.circle(g, x + w / 2, y + h / 2, h * 0.6, "ruler", pen.fill("berry", "solid"), thin);
    } else if (nation === "russia") {
        pen.rect(g, x, y + h / 3, w, h / 3, "ruler", pen.fill("sky", "solid"), thin);
        pen.rect(g, x, y + (2 * h) / 3, w, h / 3, "ruler", pen.fill("berry", "solid"), thin);
    } else {
        star(c, x + 1.1 * U, y + 1.1 * U, 0.65 * U);
        for (const [dx, dy] of [
            [2.1, 0.45],
            [2.5, 0.9],
            [2.5, 1.5],
            [2.1, 1.95],
        ] as const)
            star(c, x + dx * U, y + dy * U, 0.22 * U);
    }
}

const ALL = { flags: [...FLAGS], letters: 1 };

export const flags = defineDrawing({
    id: "flags",
    family: "travel",
    title: "Flags of five countries",
    group: "Props",
    about: "The flags of the United Kingdom, the United States, Japan, Russia and China, drawn plainly side by side and lettered when `letters` is 1: the Union Flag's crosses, the stripes and the starry corner, the red sun, three stripes of white, blue and red, and five gold stars on red. A child finds their own country's flag, or reads what one is made of.",
    params: ALL,
    settings: {
        flags: { kind: "words", of: FLAGS, most: 5 },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "All five, lettered", params: ALL },
        { label: "Two to compare", params: { flags: ["japan", "china"], letters: 0 } },
    ],
    box: (p) => ({ w: Math.max(8, p.flags.length * STEP), h: 7 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        p.flags.forEach((f, i) => {
            if (!isNation(f)) return;
            const x = (0.5 + i * STEP) * U;
            flag(c, f, x, 0.5 * U);
            if (Math.round(p.letters) === 1)
                num(c, x + (FW * U) / 2, 6.1 * U, "ABCDE".charAt(i), 15);
            a[`flag(${i})`] = [x + (FW * U) / 2, 0.5 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A row of ${p.flags.length} national flags side by side, each a plain rectangle with its own stripes, crosses, stars or circle${Math.round(p.letters) === 1 ? ", with a letter under each" : ""}.`,
});
