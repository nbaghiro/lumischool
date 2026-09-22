import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A ten by ten flat, a rod of ten, or a single cube, at six units to the smallest cube. */
function dienes<G>(c: Ctx<G>, kind: "flat" | "rod" | "one", x: number, bottom: number): void {
    const { pen, g } = c,
        u = 6;
    if (kind === "one") {
        pen.rect(g, x, bottom - u, u, u, "ruler", pen.fill("tang"), { strokeWidth: 0.9 });
        return;
    }
    if (kind === "rod") {
        pen.rect(g, x, bottom - 10 * u, u, 10 * u, "ruler", pen.fill("mint"), { strokeWidth: 1.2 });
        for (let i = 1; i < 10; i++)
            pen.line(g, x, bottom - i * u, x + u, bottom - i * u, "ruler", { strokeWidth: 0.6 });
        return;
    }
    pen.rect(g, x, bottom - 10 * u, 10 * u, 10 * u, "ruler", pen.fill("sky"), { strokeWidth: 1.4 });
    for (let i = 1; i < 10; i++) {
        pen.line(g, x + i * u, bottom - 10 * u, x + i * u, bottom, "ruler", { strokeWidth: 0.6 });
        pen.line(g, x, bottom - i * u, x + 10 * u, bottom - i * u, "ruler", { strokeWidth: 0.6 });
    }
}

/** The thousand: a flat given depth, so it is visibly ten of them stacked. */
function dienesCube<G>(c: Ctx<G>, x: number, bottom: number): void {
    const { pen, g } = c,
        s = 60,
        d = 18;
    pen.polygon(
        g,
        [
            [x, bottom - s],
            [x + d, bottom - s - d],
            [x + s + d, bottom - s - d],
            [x + s, bottom - s],
        ],
        "ruler",
        pen.fill("card"),
        { strokeWidth: 1.4 },
    );
    pen.polygon(
        g,
        [
            [x + s, bottom - s],
            [x + s + d, bottom - s - d],
            [x + s + d, bottom - d],
            [x + s, bottom],
        ],
        "ruler",
        pen.fill("berry", "hachure", { hachureGap: 4 }),
        { strokeWidth: 1.4 },
    );
    dienes(c, "flat", x, bottom);
    for (const k of [3, 6]) {
        pen.line(g, x + s, bottom - s + k * 6, x + s + d, bottom - s - d + k * 6, "ruler", {
            strokeWidth: 0.6,
        });
        pen.line(g, x + k * 6, bottom - s, x + k * 6 + d, bottom - s - d, "ruler", {
            strokeWidth: 0.6,
        });
    }
}

const blockWidth = (p: {
    thousands: number;
    hundreds: number;
    tens: number;
    ones: number;
}): number => p.thousands * 78 + p.hundreds * 70 + p.tens * 12 + Math.ceil(p.ones / 5) * 12 + 20;

export const baseTen = defineDrawing({
    id: "baseten",
    family: "place",
    title: "Base ten blocks",
    group: "Props",
    about: "Thousand cube, hundred flat, ten rod and one cube at their true relative sizes: six units to the smallest cube, so a flat is exactly three squares across and a rod is exactly ten ones.",
    params: { thousands: 1, hundreds: 2, tens: 4, ones: 3 },
    settings: {
        thousands: { kind: "whole", min: 0, max: 3 },
        hundreds: { kind: "whole", min: 0, max: 5 },
        tens: { kind: "whole", min: 0, max: 9 },
        ones: { kind: "whole", min: 0, max: 9 },
    },
    takes: [
        { label: "1243", params: { thousands: 1, hundreds: 2, tens: 4, ones: 3 } },
        { label: "126", params: { thousands: 0, hundreds: 1, tens: 2, ones: 6 } },
        { label: "Two thousand and five", params: { thousands: 2, hundreds: 0, tens: 0, ones: 5 } },
        { label: "Ones only", params: { thousands: 0, hundreds: 0, tens: 0, ones: 8 } },
    ],
    box: (p) => ({ w: Math.ceil(blockWidth(p) / U) + 1, h: 6 }),
    draw: (c, p) => {
        const bottom = 5 * U,
            a: RawAnchors = {};
        let x = U / 2;
        for (let i = 0; i < p.thousands; i++) {
            dienesCube(c, x, bottom);
            if (i === 0) a.thousands = [x + 30, bottom - 78, "up"];
            x += 78;
        }
        for (let i = 0; i < p.hundreds; i++) {
            dienes(c, "flat", x, bottom);
            if (i === 0) a.hundreds = [x + 30, bottom - 60, "up"];
            x += 70;
        }
        for (let i = 0; i < p.tens; i++) {
            dienes(c, "rod", x, bottom);
            if (i === 0) a.tens = [x + 3, bottom - 60, "up"];
            x += 12;
        }
        const onesX = x;
        for (let i = 0; i < p.ones; i++)
            dienes(c, "one", onesX + Math.floor(i / 5) * 12, bottom - (i % 5) * 8);
        if (p.ones) a.ones = [onesX + 3, bottom - 44, "up"];
        return a;
    },
    describe: () =>
        "Base ten blocks in a row: a large cube with depth, flat squares ruled into a hundred, rods ruled into ten and small orange cubes.",
});
