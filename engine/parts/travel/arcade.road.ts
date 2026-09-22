import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

/** The road's lanes, in squares from the top of the drawing. The road game steers between these. */
export const ROAD_LANES = { top: 5, lane: 3, lanes: 3, h: 20 } as const;

interface RoadParams {
    x0: number;
    w: number;
    from: number;
    to: number;
    per: number;
    tick: number;
    labels: "each" | "ends";
    start: number;
    end: number;
}

export const road = defineDrawing<RoadParams>({
    id: "arcade.road",
    family: "travel",
    title: "Road",
    group: "Structures",
    about: "A length of road with three lanes, seen from above, and a number line along its lower kerb. The road is drawn in lengths so no one drawing is wider than a screen, and the line carries on from one length to the next.",
    params: {
        x0: 0,
        w: 16,
        from: 0,
        to: 30,
        per: 2,
        tick: 1,
        labels: "each",
        start: 12,
        end: 95,
    },
    settings: {
        x0: { kind: "whole", min: 0, max: 400 },
        w: { kind: "whole", min: 4, max: 36 },
        from: { kind: "whole", min: -100, max: 1000 },
        to: { kind: "whole", min: -100, max: 1000 },
        per: { kind: "number", min: 0.25, max: 10, step: 0.25 },
        tick: { kind: "number", min: 0.5, max: 100, step: 0.5 },
        labels: { kind: "one of", of: ["each", "ends"] },
        start: { kind: "whole", min: 0, max: 400 },
        end: { kind: "whole", min: 0, max: 400 },
    },
    takes: [
        {
            label: "The first length",
            params: {
                x0: 0,
                w: 16,
                from: 0,
                to: 30,
                per: 2,
                tick: 1,
                labels: "each",
                start: 12,
                end: 95,
            },
        },
        {
            label: "Further along",
            params: {
                x0: 16,
                w: 16,
                from: 0,
                to: 30,
                per: 2,
                tick: 1,
                labels: "each",
                start: 12,
                end: 95,
            },
        },
        {
            label: "Only the ends written",
            params: {
                x0: 0,
                w: 16,
                from: 0,
                to: 100,
                per: 1,
                tick: 10,
                labels: "ends",
                start: 12,
                end: 135,
            },
        },
    ],
    box: (p) => ({ w: p.w, h: ROAD_LANES.h }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        // x0, start and end are places along the whole road, in squares; the line runs from `start`
        // at `per` squares to a unit, and `end` is the barrier past the end of the line.
        const X = (wx: number) => (wx - p.x0) * U;
        const place = (v: number) => p.start + (v - p.from) * p.per;
        const top = ROAD_LANES.top * U,
            bottom = (ROAD_LANES.top + ROAD_LANES.lane * ROAD_LANES.lanes) * U,
            w = p.w * U;
        pen.line(g, 0, top, w, top, "ruler", { strokeWidth: 2.6 });
        pen.line(g, 0, bottom, w, bottom, "ruler", { strokeWidth: 2.6 });
        for (let i = 1; i < ROAD_LANES.lanes; i++) {
            const y = top + i * ROAD_LANES.lane * U;
            pen.line(g, 0, y, w, y, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
                strokeLineDash: [14, 12],
            });
        }
        // A tick at every step of the line that falls in this length, and the values the line writes.
        // Only the ends are written at the harder level, which is the question.
        const ends = [p.from, p.to];
        for (let v = p.from; v <= p.to + 1e-9; v += p.tick) {
            const x = X(place(v));
            if (x < -1 || x > w + 1) continue;
            const big = ends.includes(v) || (p.labels === "each" && v % 5 === 0);
            pen.line(g, x, bottom, x, bottom + (big ? 13 : 8), "ruler", {
                strokeWidth: big ? 2 : 1.3,
            });
            if (p.labels === "each" || ends.includes(v))
                num(c, x, bottom + 30, v, p.labels === "each" && !big ? 13 : 16);
        }
        const start = X(place(p.from));
        if (start >= 0 && start <= w) {
            pen.line(g, start, top, start, bottom, "ruler", { strokeWidth: 3 });
            soft(c, start - 6, top - 8, "start", 12, "end");
        }
        const end = X(p.end);
        if (end >= 0 && end <= w) {
            pen.rect(
                g,
                end,
                top,
                U,
                bottom - top,
                "pencil",
                pen.fill("berry", "hachure", { hachureGap: 7 }),
                { strokeWidth: 2.2 },
            );
        }
        a.top = [w / 2, top, "up"];
        return a;
    },
    describe: () =>
        "A length of road with three lanes seen from above, dashed lines between the lanes, and a number line with ticks and numbers along its lower kerb.",
    reads: true,
});
