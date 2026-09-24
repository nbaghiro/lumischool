import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

interface TrackParams {
    points: number[];
    width: number;
    height: number;
    lane: number;
}
export const rallyTrack = defineDrawing<TrackParams>({
    id: "rallytrack",
    family: "sport",
    title: "Garden rally circuit",
    group: "Structures",
    about: "A closed top-down driving circuit with inked edges, a pale road surface, dashed guide line and a chequered starting line. The supplied centre line is also used by the game's surface physics.",
    params: { points: [5, 5, 25, 5, 25, 15, 5, 15], width: 30, height: 20, lane: 4 },
    settings: {
        points: { kind: "fixed" },
        width: { kind: "number", min: 10, max: 60, step: 1 },
        height: { kind: "number", min: 10, max: 40, step: 1 },
        lane: { kind: "number", min: 2, max: 6, step: 0.1 },
    },
    takes: [
        {
            label: "A garden circuit",
            params: { points: [5, 5, 25, 5, 25, 15, 5, 15], width: 30, height: 20, lane: 4 },
        },
        {
            label: "Wide bends",
            params: {
                points: [6, 6, 14, 4, 24, 6, 26, 14, 17, 17, 6, 15],
                width: 32,
                height: 22,
                lane: 5,
            },
        },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const points: [number, number][] = [];
        for (let i = 0; i + 1 < p.points.length; i += 2) {
            const x = p.points[i],
                y = p.points[i + 1];
            if (x !== undefined && y !== undefined) points.push([x * U, y * U]);
        }
        const first = points[0];
        if (!first) return {};
        const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + "Z";
        plain(c, {
            kind: "path",
            d: path,
            stroke: c.t.paper,
            width: p.lane * U,
            join: "round",
            cap: "round",
            fill: "none",
        });
        for (const side of [-1, 1]) {
            const edge: [number, number][] = points.map(([x, y], i) => {
                const before = points[(i + points.length - 1) % points.length] ?? [x, y];
                const after = points[(i + 1) % points.length] ?? [x, y];
                const angle = Math.atan2(after[1] - before[1], after[0] - before[0]);
                return [
                    x - (Math.sin(angle) * side * p.lane * U) / 2,
                    y + (Math.cos(angle) * side * p.lane * U) / 2,
                ];
            });
            c.pen.path(
                c.g,
                edge.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + "Z",
                "pencil",
                null,
                { strokeWidth: 1.8, roughness: 0.2, stroke: c.t["ink-soft"] },
            );
        }
        for (let i = 0; i < points.length; i += 3) {
            const a = points[i],
                b = points[(i + 1) % points.length];
            if (a && b)
                c.pen.line(c.g, a[0], a[1], b[0], b[1], "pencil", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                });
        }
        const second = points[1];
        if (second) {
            const a = Math.atan2(second[1] - first[1], second[0] - first[0]);
            const across = Math.floor(p.lane / 0.35);
            for (let n = 0; n < across; n++) {
                const offset = (n - across / 2 + 0.5) * 0.35 * U;
                const x = first[0] - Math.sin(a) * offset,
                    y = first[1] + Math.cos(a) * offset;
                c.pen.rect(
                    c.g,
                    x - 0.16 * U,
                    y - 0.16 * U,
                    0.32 * U,
                    0.32 * U,
                    "ruler",
                    c.pen.fill(n % 2 ? "card" : "ink", "solid"),
                    { strokeWidth: 0.4, roughness: 0 },
                );
            }
        }
        return {};
    },
    describe: () =>
        "A closed garden driving circuit, with a pale road, dark pencil edges, a broken centre line and a chequered starting line.",
});
