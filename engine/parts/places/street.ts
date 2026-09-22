import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num } from "../lettering";
import { critter, pip } from "../stories/pictures";

const flag = (xs: number[], i: number) => (xs[i] ?? 0) > 0;

const clamp = (n: number | undefined, lo: number, hi: number, dflt: number) =>
    Math.max(lo, Math.min(hi, Math.round(n ?? dflt)));

export const street = defineDrawing({
    id: "street",
    family: "places",
    title: "A street to read the clues on",
    group: "Props",
    about: "A row of numbered houses that differ in things a clue can name: how many windows upstairs, a round or a square door, a chimney, a cat on the step. A child reads the clues and writes the number of the one house that fits them all.",
    params: {
        windows: [2, 1, 2, 3],
        doors: [0, 1, 1, 0],
        chimneys: [1, 0, 1, 1],
        cats: [0, 1, 0, 0],
        numbers: ["1", "3", "5", "7"],
    },
    settings: {
        windows: { kind: "numbers", min: 1, max: 3, most: 8 },
        doors: { kind: "numbers", min: 0, max: 1, most: 8 },
        chimneys: { kind: "numbers", min: 0, max: 1, most: 8 },
        cats: { kind: "numbers", min: 0, max: 1, most: 8 },
        numbers: { kind: "words", most: 8 },
    },
    takes: [
        {
            label: "Four houses",
            params: {
                windows: [2, 1, 2, 3],
                doors: [0, 1, 1, 0],
                chimneys: [1, 0, 1, 1],
                cats: [0, 1, 0, 0],
                numbers: ["1", "3", "5", "7"],
            },
        },
        {
            label: "Three, two cats",
            params: {
                windows: [1, 1, 2],
                doors: [1, 0, 1],
                chimneys: [0, 1, 1],
                cats: [1, 0, 1],
                numbers: ["2", "4", "6"],
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.numbers.length) * 6 + 1, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 9.6 * U,
            a: RawAnchors = {};
        const walls: Marker[] = ["glow", "sky", "mint", "berry", "tang"];
        p.numbers.forEach((label, i) => {
            const x = (0.8 + i * 6) * U,
                w = 5.4 * U,
                top = base - 5.6 * U;
            if (flag(p.chimneys, i)) {
                pen.rect(
                    g,
                    x + w * 0.68,
                    top - 2.6 * U,
                    0.8 * U,
                    1.6 * U,
                    "pencil",
                    pen.fill("tang"),
                    { strokeWidth: 1.4 },
                );
                for (const [dx, dy, d] of [
                    [0.5, -3.1, 0.6],
                    [0.9, -3.7, 0.5],
                ] as const)
                    pen.circle(
                        g,
                        x + w * 0.68 + dx * U,
                        top + dy * U,
                        d * U,
                        "doodle",
                        pen.fill("card"),
                        { strokeWidth: 1 },
                    );
            }
            pen.polygon(
                g,
                [
                    [x - 5, top],
                    [x + w / 2, top - 2.3 * U],
                    [x + w + 5, top],
                ],
                "pencil",
                pen.fill("berry", "hachure", { hachureGap: 5 }),
                { strokeWidth: 1.9 },
            );
            pen.rect(
                g,
                x,
                top,
                w,
                base - top,
                "pencil",
                pen.fill(walls[i % walls.length], "solid"),
                { strokeWidth: 1.9 },
            );
            const n = clamp(p.windows[i], 1, 3, 2);
            for (let k = 0; k < n; k++) {
                const wx = x + (w / (n + 1)) * (k + 1) - 0.55 * U;
                pen.rect(g, wx, top + 0.6 * U, 1.1 * U, 1.3 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.4,
                });
                pen.line(g, wx + 0.55 * U, top + 0.6 * U, wx + 0.55 * U, top + 1.9 * U, "ruler", {
                    strokeWidth: 0.9,
                });
            }
            const dx = x + 0.7 * U,
                dw = 1.5 * U,
                dtop = base - 2.9 * U;
            pen.path(
                g,
                flag(p.doors, i)
                    ? `M${dx} ${base}V${dtop + 0.75 * U}Q${dx} ${dtop} ${dx + dw / 2} ${dtop}Q${dx + dw} ${dtop} ${dx + dw} ${dtop + 0.75 * U}V${base}Z`
                    : `M${dx} ${base}V${dtop}H${dx + dw}V${base}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            pip(c, dx + dw - 0.35 * U, base - 1.4 * U, 3);
            pen.rect(g, x + 3 * U, base - 2.8 * U, 1.7 * U, 1.3 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            if (flag(p.cats, i)) critter(c, "cat", x + 2.75 * U, base, 0.5, -1);
            if (label) {
                pen.path(
                    g,
                    roundedRect(x + w / 2 - 1.1 * U, base + 0.5 * U, 2.2 * U, 1.4 * U, 5),
                    "ruler",
                    pen.fill("card"),
                    { strokeWidth: 1.5 },
                );
                num(c, x + w / 2, base + 1.55 * U, label, 17);
            }
            a[`house(${i})`] = [x + w / 2, top - 2.3 * U, "up"];
            a[`number(${i})`] = [x + w / 2, base + 1.9 * U, "down"];
        });
        pen.line(g, 0.2 * U, base, (p.numbers.length * 6 + 0.8) * U, base, "pencil", {
            strokeWidth: 2.2,
        });
        return a;
    },
    describe: () =>
        "A row of numbered houses along a street that differ in their windows upstairs, their doors, their chimneys and whether a cat sits on the step.",
    motion: { still: STILL.clues },
});
