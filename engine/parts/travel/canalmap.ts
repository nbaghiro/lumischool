import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { sayOn, slot } from "../lettering";

type Pt = [number, number];

/** Every leg is drawn eight squares long whatever its length on the ground, so locks are counted, not measured. */
const LEG = 8;

export const canalMap = defineDrawing({
    id: "canalmap",
    family: "travel",
    title: "Canal map",
    group: "Structures",
    about: "A canal seen from above, winding from place to place with the towpath beside it, each place named on it and every lock drawn across the water as a pair of gates. A reading lesson fills one place from a passage, and the locks between two places can be counted.",
    params: { stops: ["Mill", "Ash Bridge", "Hill Top", "Quarry"], locks: [0, 1, 5], blank: -1 },
    settings: {
        stops: { kind: "words", most: 5 },
        locks: { kind: "numbers", min: 0, max: 6, most: 4 },
        blank: { kind: "whole", min: -1, max: 4 },
    },
    takes: [
        {
            label: "Four places and a flight of locks",
            params: {
                stops: ["Mill", "Ash Bridge", "Hill Top", "Quarry"],
                locks: [0, 1, 5],
                blank: -1,
            },
        },
        {
            label: "One place to fill",
            params: { stops: ["Wharf", "", "Kingsford"], locks: [2, 3], blank: 1 },
        },
        {
            label: "Five places, locks on every leg",
            params: {
                stops: ["Mill", "Wharf", "Ash Bridge", "Hill Top", "Quarry"],
                locks: [1, 2, 1, 4],
                blank: -1,
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.stops.length - 1) * LEG + 4, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = p.stops.length,
            W = (Math.max(1, n - 1) * LEG + 4) * U,
            mid = 4.6 * U,
            half = 0.55 * U;
        const yAt = (x: number): number => mid + 0.9 * U * Math.sin((x / (LEG * U)) * Math.PI);
        const xs: number[] = [];
        for (let x = 0.4 * U; x <= W - 0.4 * U; x += 0.25 * U) xs.push(x);
        const top: Pt[] = xs.map((x) => [x, yAt(x) - half]),
            bottom: Pt[] = xs.map((x) => [x, yAt(x) + half]);
        pen.polygon(g, [...top, ...[...bottom].reverse()], "pencil", pen.fill("sky"), {
            strokeWidth: 0.6,
        });
        pen.linear(g, top, "pencil", { strokeWidth: 1.8 });
        pen.linear(g, bottom, "pencil", { strokeWidth: 1.8 });
        pen.linear(
            g,
            xs.map((x) => [x, yAt(x) + half + 0.45 * U]),
            "pencil",
            { strokeWidth: 1.1, strokeLineDash: [6, 6], stroke: c.t["ink-soft"] },
        );
        const stopX = (i: number): number => (2 + i * LEG) * U;
        for (let i = 0; i + 1 < n; i++) {
            const k = Math.max(0, Math.min(6, Math.round(p.locks[i] ?? 0)));
            for (let j = 0; j < k; j++) {
                const x = stopX(i) + ((j + 1) * LEG * U) / (k + 1),
                    y = yAt(x);
                for (const dx of [-0.22 * U, 0.22 * U])
                    pen.line(g, x + dx, y - half - 0.25 * U, x + dx, y + half + 0.25 * U, "ruler", {
                        strokeWidth: 2.6,
                        stroke: c.t.ink,
                    });
            }
            const lx = stopX(i) + (LEG * U) / 2;
            a[`leg(${i})`] = [lx, yAt(lx) - half - 0.3 * U, "up"];
        }
        p.stops.forEach((s, i) => {
            const x = stopX(i),
                y = yAt(x),
                up = i % 2 === 1,
                ty = up ? y - 1.3 * U : y + 2.5 * U;
            pen.circle(g, x, y, 0.8 * U, "ruler", pen.fill("berry"), { strokeWidth: 1.8 });
            if (i === p.blank) slot(c, x - 2.2 * U, ty - 1 * U, 4.4 * U, 1.5 * U);
            else sayOn(c, x, ty, s, 15);
            a[`stop(${i})`] = [x, up ? y - half : y + half, up ? "up" : "down"];
        });
        return a;
    },
    describe: (p) =>
        `A canal from above, winding past ${p.stops.length} named places with a dashed towpath beside it, and locks drawn across the water as pairs of gates.`,
    reads: true,
});
