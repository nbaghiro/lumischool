import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap } from "../lettering";

const whole = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

/** A weather station, for the cloud islands (.docs/worlds-next.md). */
export const weatherStation = defineDrawing({
    id: "weatherstation",
    family: "science",
    title: "Weather station",
    group: "Structures",
    about: "A weather station: cups on a mast that spin in the wind, a vane that points to where the wind comes from, a white slatted box with a thermometer inside and a gauge that catches the rain. Each part measures something a weather chart records.",
    params: { cups: 3 },
    settings: { cups: { kind: "whole", min: 2, max: 4 } },
    takes: [
        { label: "Three cups", params: { cups: 3 } },
        { label: "Four cups", params: { cups: 4 } },
    ],
    box: () => ({ w: 9, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = whole(p.cups, 2, 4),
            mx = 5.8 * U,
            ground = 12.4 * U,
            hub: [number, number] = [mx, 1.6 * U],
            a: RawAnchors = {};
        pen.rect(g, mx - 0.13 * U, hub[1], 0.26 * U, ground - hub[1], "ruler", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        const cups = part(c, "cups", hub, { symmetry: n });
        for (let i = 0; i < n; i++) {
            const th = (i / n) * Math.PI * 2 + 0.4,
                x = hub[0] + Math.cos(th) * 1.5 * U,
                y = hub[1] + Math.sin(th) * 0.45 * U;
            pen.line(cups.g, hub[0], hub[1], x, y, "ruler", { strokeWidth: 1.4 });
            const s = Math.sin(th) >= 0 ? 1 : -1;
            pen.path(
                cups.g,
                `M${x - 0.38 * U} ${y}A${0.38 * U} ${0.38 * U} 0 0 ${s > 0 ? 0 : 1} ${x + 0.38 * U} ${y}Z`,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.2 },
            );
        }
        pen.circle(g, hub[0], hub[1], 0.4 * U, "ruler", pen.fill("ink-soft"), { strokeWidth: 1 });
        // the vane, pointing the way the wind comes from, over the four directions
        const vy = 4.1 * U;
        pen.line(g, mx - 1.9 * U, vy, mx + 1.5 * U, vy, "ruler", { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [mx - 2.4 * U, vy],
                [mx - 1.7 * U, vy - 0.4 * U],
                [mx - 1.7 * U, vy + 0.4 * U],
            ],
            "ruler",
            pen.fill("ink-soft"),
            { strokeWidth: 1.1 },
        );
        pen.polygon(
            g,
            [
                [mx + 0.9 * U, vy],
                [mx + 1.8 * U, vy - 0.7 * U],
                [mx + 1.8 * U, vy + 0.25 * U],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.2 },
        );
        const cy = 5.2 * U;
        pen.line(g, mx - 1.3 * U, cy, mx + 1.3 * U, cy, "ruler", { strokeWidth: 1.1 });
        pen.line(g, mx - 0.55 * U, cy + 0.35 * U, mx + 0.55 * U, cy - 0.35 * U, "ruler", {
            strokeWidth: 1.1,
        });
        for (const [t, x, y] of [
            ["W", mx - 1.65 * U, cy + 4],
            ["E", mx + 1.65 * U, cy + 4],
            ["N", mx + 0.75 * U, cy - 0.45 * U],
            ["S", mx - 0.75 * U, cy + 0.85 * U],
        ] as const)
            cap(c, x, y, t, 10);
        // the white box with the thermometer in it, on its legs
        for (const x of [0.9, 3.3])
            pen.line(g, x * U, 9.9 * U, x * U, ground, "pencil", { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [0.4 * U, 7.2 * U],
                [2.1 * U, 6.5 * U],
                [3.8 * U, 7.2 * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        pen.rect(g, 0.6 * U, 7.2 * U, 3 * U, 2.7 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        for (let y = 7.6 * U; y < 9.8 * U; y += 0.34 * U)
            pen.line(g, 0.8 * U, y, 3.4 * U, y + 2, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        // the rain gauge, with its funnel and its marks
        pen.rect(g, 7.2 * U, 10.5 * U, 1.1 * U, ground - 10.5 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        pen.polygon(
            g,
            [
                [7 * U, 10.1 * U],
                [8.5 * U, 10.1 * U],
                [8 * U, 10.5 * U],
                [7.5 * U, 10.5 * U],
            ],
            "ruler",
            pen.fill("sky"),
            { strokeWidth: 1.2 },
        );
        for (let k = 0; k < 4; k++)
            pen.line(g, 7.2 * U, (10.9 + k * 0.35) * U, 7.55 * U, (10.9 + k * 0.35) * U, "ruler", {
                strokeWidth: 0.9,
            });
        pen.line(g, 0.1 * U, ground, 8.9 * U, ground, "pencil", { strokeWidth: 1.8 });
        for (const x of [1.7, 4.6, 6.6, 8.6])
            pen.line(g, x * U, ground, x * U + 3, ground - 0.4 * U, "pencil", {
                strokeWidth: 1,
                stroke: c.t.ok,
            });
        a.cups = [hub[0], hub[1] - 0.6 * U, "up"];
        a.vane = [mx - 2.4 * U, vy, "left"];
        a.gauge = [7.75 * U, 10.1 * U, "up"];
        return a;
    },
    describe: () =>
        "A weather station: cups on a mast that spin in the wind, a vane pointing where it comes from, a slatted box with a thermometer inside and a rain gauge.",
});
