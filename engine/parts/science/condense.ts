import { type RawAnchors } from "../../ink/surface";
import { rng, roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, LIQUID, lightFill, glassPath, liquid, gleam, iceCube, curls } from "./apparatus";

export const condense = defineDrawing({
    id: "condense",
    family: "science",
    title: "Condensing",
    group: "Structures",
    about: "Water appearing where no water was poured: drops on the outside of a glass of iced water, which came out of the air as it cooled on the cold glass, and drops under a cold lid held over hot water, which came from the steam. Children often think the drops leaked through the glass, and the two pictures side by side are how that idea gets tested. `drops` is how many drops there are.",
    params: { kind: "cold-glass", drops: 7 },
    settings: {
        kind: { kind: "one of", of: ["cold-glass", "hot-lid"] },
        drops: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        { label: "Drops on a cold glass", params: { kind: "cold-glass", drops: 7 } },
        { label: "Drops under a lid over hot water", params: { kind: "hot-lid", drops: 6 } },
    ],
    box: () => ({ w: 10, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            n = Math.max(0, Math.min(12, Math.round(p.drops))),
            r = rng(29 + n);
        const drop = (x: number, y: number, hang = false) =>
            pen.path(
                g,
                hang
                    ? `M${x} ${y}Q${x + 7} ${y + 10} ${x} ${y + 14}Q${x - 7} ${y + 10} ${x} ${y}Z`
                    : `M${x} ${y - 9}Q${x + 7} ${y + 3} ${x} ${y + 6}Q${x - 7} ${y + 3} ${x} ${y - 9}Z`,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.3 },
            );
        if (p.kind === "hot-lid") {
            // a mug of hot water, steam rising, and a cold lid held over it with drops hanging under it
            const lx = 2.6 * U,
                rx = 6.8 * U,
                top = 5.4 * U,
                base = 10.4 * U;
            liquid(
                c,
                lx,
                rx,
                top + 0.8 * U,
                base,
                pen.fill(LIQUID, "hachure", { hachureGap: 7 }),
                10,
            );
            pen.path(g, glassPath(lx, rx, top, base, 10), "pencil", null, { strokeWidth: 2.4 });
            pen.path(
                g,
                `M${rx} ${top + 1 * U}Q${rx + 1.6 * U} ${top + 1 * U} ${rx + 1.6 * U} ${top + 2.3 * U}Q${rx + 1.6 * U} ${top + 3.6 * U} ${rx} ${top + 3.6 * U}`,
                "pencil",
                null,
                { strokeWidth: 2.2 },
            );
            curls(c, (lx + rx) / 2, top - 0.2 * U, 3, 1.6 * U);
            pen.path(
                g,
                roundedRect(1.2 * U, 2 * U, 7.2 * U, 0.55 * U, 4),
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.8 },
            );
            for (let k = 0; k < n; k++)
                drop(
                    1.7 * U + ((k + 0.5) / Math.max(1, n)) * 6.2 * U + (r() - 0.5) * 6,
                    2.55 * U + 2,
                    true,
                );
            a.lid = [4.8 * U, 2 * U, "up"];
        } else {
            // a glass of water with ice floating in it, and drops on the outside of the glass
            const lx = 2.4 * U,
                rx = 7.4 * U,
                top = 2.4 * U,
                base = 10 * U,
                level = 4.4 * U;
            liquid(c, lx, rx, level, base, pen.fill(LIQUID, "hachure", { hachureGap: 7 }), 10);
            for (const [dx, s] of [
                [-1.2, 1.3 * U],
                [0.6, 1.5 * U],
            ] as Pt[])
                iceCube(c, (lx + rx) / 2 + dx * U, level + 0.35 * U, s);
            pen.path(g, glassPath(lx, rx, top, base, 10), "pencil", null, { strokeWidth: 2.4 });
            pen.line(g, lx - 3, top, rx + 3, top, "pencil", { strokeWidth: 1.5 });
            gleam(c, lx + 0.4 * U, level + 0.5 * U, base - 0.6 * U);
            for (let k = 0; k < n; k++) {
                const side = k % 2 ? 1 : -1,
                    y = level + 0.6 * U + r() * (base - level - 1.4 * U);
                drop(side > 0 ? rx + 0.3 * U : lx - 0.3 * U, y);
            }
            pen.ellipse(
                g,
                (lx + rx) / 2,
                base + 0.25 * U,
                6.6 * U,
                0.6 * U,
                "pencil",
                lightFill(c, "sky", "hachure", 4),
                { strokeWidth: 0.9, stroke: t["ink-soft"] },
            );
            a.glass = [(lx + rx) / 2, top, "up"];
        }
        return a;
    },
    describe: (p) =>
        p.kind === "hot-lid"
            ? `A mug of hot water with steam rising and a cold lid held over it, drops hanging under the lid.`
            : `A glass of water with ice floating in it, drops of water on the outside of the glass and a wet ring below.`,
    reads: true,
});
