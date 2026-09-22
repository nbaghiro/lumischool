import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const barn = defineDrawing({
    id: "barn",
    family: "places",
    title: "Barn",
    group: "Structures",
    about: "A red barn with a roof that bends halfway down, big double doors with their braces, a loft door under the ridge and windows either side. The loft can be full of hay or empty, and the windows counted.",
    params: { windows: 2, hay: 0 },
    settings: {
        windows: { kind: "whole", min: 0, max: 2 },
        hay: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "The loft empty", params: { windows: 2, hay: 0 } },
        { label: "The harvest in", params: { windows: 2, hay: 1 } },
        { label: "No windows", params: { windows: 0, hay: 0 } },
    ],
    box: () => ({ w: 10, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.windows, 0, 2),
            hay = p.hay > 0,
            W = 10 * U,
            base = 8.7 * U,
            eave = 4 * U,
            a: RawAnchors = {};
        const red = pen.fill("berry", "hachure", { hachureGap: 4.5 }),
            white = pen.fill("card");
        pen.rect(g, 1 * U, eave, 8 * U, base - eave, "pencil", red, { strokeWidth: 2 });
        // the roof bends at its shoulders, which is what makes it a barn and not a house
        pen.polygon(
            g,
            [
                [0.4 * U, eave + 0.1 * U],
                [1.6 * U, 1.8 * U],
                [W / 2, 0.6 * U],
                [W - 1.6 * U, 1.8 * U],
                [W - 0.4 * U, eave + 0.1 * U],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            { strokeWidth: 2 },
        );
        for (const x of [1.6 * U, W - 1.6 * U])
            pen.line(g, x, 1.8 * U, x, eave, "pencil", { strokeWidth: 1, stroke: c.t["ink-soft"] });
        // the loft door, with hay showing when the harvest is in
        const lx = W / 2 - 0.9 * U,
            ly = 1.9 * U;
        pen.rect(
            g,
            lx,
            ly,
            1.8 * U,
            1.6 * U,
            "pencil",
            hay ? pen.fill("glow") : pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.4 },
        );
        if (hay)
            for (let k = 0; k < 7; k++)
                pen.line(
                    g,
                    lx + (0.2 + k * 0.23) * U,
                    ly + 1.6 * U,
                    lx + (0.1 + k * 0.25) * U,
                    ly + 0.6 * U + (k % 3) * 0.12 * U,
                    "pencil",
                    { strokeWidth: 1.1, stroke: c.t.tang },
                );
        pen.line(g, W / 2, ly - 0.35 * U, W / 2 + 1.2 * U, ly - 0.35 * U, "pencil", {
            strokeWidth: 1.4,
        });
        pen.line(g, W / 2 + 1.1 * U, ly - 0.35 * U, W / 2 + 1.1 * U, ly + 0.2 * U, "pencil", {
            strokeWidth: 1,
        });
        a.loft = [W / 2, ly, "up"];
        // the big doors, each with its brace
        const dx0 = W / 2 - 1.9 * U,
            dy0 = base - 3.4 * U;
        for (const [x0, x1] of [
            [dx0, W / 2],
            [W / 2, W / 2 + 1.9 * U],
        ] as const) {
            pen.rect(g, x0, dy0, x1 - x0, base - dy0, "pencil", white, { strokeWidth: 1.5 });
            pen.line(g, x0 + 0.1 * U, dy0 + 0.1 * U, x1 - 0.1 * U, base - 0.1 * U, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.berry,
            });
            pen.line(g, x1 - 0.1 * U, dy0 + 0.1 * U, x0 + 0.1 * U, base - 0.1 * U, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.berry,
            });
        }
        a.door = [W / 2, dy0, "up"];
        for (let i = 0; i < n; i++) {
            const x = i ? W - 2.2 * U : 1.6 * U,
                y = eave + 0.9 * U;
            pen.rect(g, x, y, 0.9 * U, 0.9 * U, "ruler", white, { strokeWidth: 1.3 });
            pen.line(g, x + 0.45 * U, y, x + 0.45 * U, y + 0.9 * U, "ruler", { strokeWidth: 0.8 });
            pen.line(g, x, y + 0.45 * U, x + 0.9 * U, y + 0.45 * U, "ruler", { strokeWidth: 0.8 });
            a[`window(${i})`] = [x + 0.45 * U, y, "up"];
        }
        pen.line(g, 0.1 * U, base, W - 0.1 * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) =>
        `A red barn with a roof that bends halfway down, big double doors with braces, a loft door under the ridge${p.hay > 0 ? " full of hay" : ""}${within(p.windows, 0, 2) > 1 ? " and windows either side" : within(p.windows, 0, 2) > 0 ? " and a window at one side" : ""}.`,
});
