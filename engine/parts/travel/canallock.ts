import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const canalLock = defineDrawing({
    id: "canallock",
    family: "travel",
    title: "Canal lock",
    group: "Structures",
    about: "A canal lock seen from the side: the high water, the chamber between two gates, and the low water, with marks up the chamber wall. Filling the chamber lifts a boat from the low water to the high, so the level can be read off the wall as it rises.",
    params: { level: 0.5, boat: 1 },
    settings: {
        level: { kind: "number", min: 0, max: 1, step: 0.25 },
        boat: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Half full, with a boat", params: { level: 0.5, boat: 1 } },
        { label: "Empty", params: { level: 0, boat: 0 } },
        { label: "Full, the boat at the top", params: { level: 1, boat: 1 } },
    ],
    box: () => ({ w: 16, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = 16 * U,
            bank = 1.7 * U,
            high = 2.4 * U,
            low = 4.7 * U,
            bed = 6.5 * U,
            g0 = 5 * U,
            g1 = 11 * U;
        const lv = Math.max(0, Math.min(1, p.level)),
            wl = low - lv * (low - high),
            a: RawAnchors = {};
        const water = pen.fill("sky"),
            stone = pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 });
        // the walls and the bed, in stone
        pen.polygon(
            g,
            [
                [0, bank],
                [g0, bank],
                [g0, 4.3 * U],
                [0, 4.3 * U],
            ],
            "pencil",
            stone,
            { strokeWidth: 1.4 },
        );
        pen.polygon(
            g,
            [
                [0, 4.3 * U],
                [g0, 4.3 * U],
                [g0, bed],
                [W, bed],
                [W, bed + 0.4 * U],
                [0, bed + 0.4 * U],
            ],
            "pencil",
            stone,
            { strokeWidth: 1.4 },
        );
        pen.rect(g, 0, high, g0, 4.3 * U - high, "pencil", water, { strokeWidth: 1 });
        pen.rect(g, g0, wl, g1 - g0, bed - wl, "pencil", water, { strokeWidth: 1 });
        pen.rect(g, g1, low, W - g1, bed - low, "pencil", water, { strokeWidth: 1 });
        for (let k = 0; k <= 4; k++) {
            const y = low - (k / 4) * (low - high);
            pen.line(g, g0 + 0.15 * U, y, g0 + 0.55 * U, y, "ruler", { strokeWidth: 1.2 });
        }
        // the gates, each with its beam out over the towpath
        for (const [x, s] of [
            [g0, -1],
            [g1, 1],
        ] as const) {
            pen.rect(
                g,
                x - 0.25 * U,
                bank - 0.3 * U,
                0.5 * U,
                bed - bank + 0.3 * U,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.6 },
            );
            pen.line(g, x, bank - 0.15 * U, x + s * 2.4 * U, bank - 0.55 * U, "pencil", {
                strokeWidth: 3,
            });
        }
        pen.line(g, 0, bank, W, bank, "pencil", { strokeWidth: 2 });
        if (p.boat) {
            const bx = (g0 + g1) / 2,
                y = wl;
            pen.path(
                g,
                `M${bx - 2.3 * U} ${y - 0.5 * U}L${bx + 2.1 * U} ${y - 0.5 * U}Q${bx + 2.6 * U} ${y - 0.4 * U} ${bx + 2.3 * U} ${y + 0.35 * U}L${bx - 2.3 * U} ${y + 0.35 * U}Z`,
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 1.5 },
            );
            pen.rect(g, bx - 1.6 * U, y - 1.2 * U, 2.8 * U, 0.7 * U, "pencil", pen.fill("mint"), {
                strokeWidth: 1.2,
            });
        }
        for (const [x0, y] of [
            [0.4 * U, high],
            [g1 + 0.4 * U, low],
            [g0 + 1.2 * U, wl],
        ] as const) {
            for (let x = x0; x < x0 + 3.5 * U; x += 1.2 * U)
                pen.curve(
                    g,
                    [
                        [x, y + 0.3 * U],
                        [x + 0.3 * U, y + 0.15 * U],
                        [x + 0.6 * U, y + 0.3 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1 },
                );
        }
        a.high = [0.5 * U, high, "up"];
        a.low = [W - 0.5 * U, low, "up"];
        a.chamber = [(g0 + g1) / 2, wl, "up"];
        a["gate(0)"] = [g0, bank, "up"];
        a["gate(1)"] = [g1, bank, "up"];
        return a;
    },
    describe: (p) =>
        `A canal lock seen from the side in grey stone: high water on the left, low water on the right, a chamber between two gates${p.boat ? " with a boat in it" : ""}.`,
    reads: true,
});
