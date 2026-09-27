import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

export const EDGES = ["right", "left", "both", "none"] as const;

/** Where the grass line runs down the box, and how far a slope runs out from it, in squares. */
export const STREAMBANK = { top: 0.4, slope: 1 } as const;

export const streamBank = defineDrawing({
    id: "streambank",
    family: "outdoors",
    title: "Stream bank",
    group: "Structures",
    about: "The ground at the edge of a stream or a ravine, seen from the side: a grass line along the top, earth with a few pebbles and roots below it, and a bank that slopes down to the water or a rocky cliff that drops straight down.",
    params: { w: 12, h: 8, edge: "right", cliff: 0 },
    settings: {
        w: { kind: "whole", min: 2, max: 36 },
        h: { kind: "whole", min: 2, max: 16 },
        edge: { kind: "one of", of: EDGES },
        cliff: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A bank sloping down to the right",
            params: { w: 12, h: 8, edge: "right", cliff: 0 },
        },
        { label: "A cliff on the left", params: { w: 10, h: 12, edge: "left", cliff: 1 } },
        { label: "A strip with no edge", params: { w: 16, h: 4, edge: "none", cliff: 0 } },
    ],
    box: (p) => ({ w: whole(p.w, 2, 36, 12), h: whole(p.h, 2, 16, 8) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.w, 2, 36, 12) * U,
            h = whole(p.h, 2, 16, 8) * U,
            top = STREAMBANK.top * U,
            cliff = p.cliff > 0,
            edge = EDGES.find((e) => e === p.edge) ?? "right";
        // a slope runs a square out into the water from the grass line to its foot at the box's edge;
        // a cliff drops straight with a jag or two
        const lean = cliff ? 0.25 * U : U;
        const right = edge === "right" || edge === "both",
            left = edge === "left" || edge === "both";
        const down = (y: number) => Math.min(1, (y - top) / (2.2 * U));
        const rx = (y: number) => {
            if (!right) return w;
            if (cliff) return w - (Math.floor(y / (1.6 * U)) % 2 ? lean : 0);
            return w - lean * (1 - down(y));
        };
        const lx = (y: number) => {
            if (!left) return 0;
            if (cliff) return Math.floor(y / (1.6 * U)) % 2 ? lean : 0;
            return lean * (1 - down(y));
        };
        const ys: number[] = [];
        for (let y = top; y < h; y += 0.4 * U) ys.push(y);
        ys.push(h);
        const outline: [number, number][] = [
            ...ys.map((y): [number, number] => [lx(y), y]),
            ...[...ys].reverse().map((y): [number, number] => [rx(y), y]),
        ];
        // paper under the earth's hatching, so the water it stands in does not show through
        pen.polygon(g, outline, "ruler", pen.fill("card"), { stroke: "none" });
        pen.polygon(
            g,
            outline,
            "pencil",
            cliff
                ? pen.fill("tang", "hachure", { hachureGap: 7, hachureAngle: 0, fillWeight: 0.5 })
                : pen.fill("tang", "hachure", {
                      hachureGap: 9,
                      hachureAngle: -41,
                      fillWeight: 0.5,
                  }),
            { stroke: "none" },
        );
        // the turf under the grass line, green, like the ground strips elsewhere
        pen.polygon(
            g,
            [
                [lx(top), top],
                [rx(top), top],
                [rx(top + 1.2 * U), top + 1.2 * U],
                [lx(top + 1.2 * U), top + 1.2 * U],
            ],
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 10, fillWeight: 0.8 }),
            { stroke: "none" },
        );
        if (right)
            pen.linear(
                g,
                ys.map((y): [number, number] => [rx(y), y]),
                "pencil",
                { strokeWidth: 1.8 },
            );
        if (left)
            pen.linear(
                g,
                ys.map((y): [number, number] => [lx(y), y]),
                "pencil",
                { strokeWidth: 1.8 },
            );
        if (cliff)
            for (let y = top + 2 * U; y < h - U; y += 1.9 * U)
                pen.line(g, lx(y) + 4, y, rx(y) - 4, y + 3, "pencil", {
                    strokeWidth: 0.9,
                    stroke: c.t["ink-soft"],
                });
        else
            for (let x = 1.3 * U; x < w - U; x += 3.1 * U) {
                const y = top + (2 + ((x / U) % 3)) * U;
                if (y < h - 0.6 * U && x > lx(y) + 8 && x < rx(y) - 8)
                    pen.ellipse(g, x, y, 9, 6, "pencil", pen.fill("card"), { strokeWidth: 1 });
            }
        pen.line(g, lx(top), top, rx(top), top, "ruler", { strokeWidth: 2.4 });
        for (let x = 0.7 * U; x < w - 10; x += 2.3 * U) {
            pen.line(g, x, top, x - 3, top - 7, "pencil", { strokeWidth: 1.2 });
            pen.line(g, x + 4, top, x + 6, top - 8, "pencil", { strokeWidth: 1.2 });
        }
        return { top: [w / 2, top, "up"] };
    },
    describe: (p) =>
        p.cliff > 0
            ? "The edge of a ravine seen from the side: grass along the top and a rocky cliff of layered stone dropping straight down below it."
            : "The bank of a stream seen from the side: grass along the top, brown earth with a few pebbles, and the bank sloping down into the water.",
    motion: {
        still: "It is the ground a game stands its scene on, and ground holds still.",
    },
});
