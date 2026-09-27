import { type Ctx, type RawAnchors } from "../../ink/surface";
import { bankHeight } from "../../motion/rail";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { RAILWAY } from "./railway";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const within = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Number(v) : d));

/** How far the level rail sits below the top of a bank's box, and the box's height, in squares. */
export function bankBox(rise: number): { rail: number; h: number } {
    const up = Math.max(0, rise),
        down = Math.max(0, -rise);
    return { rail: RAILWAY.rail + up, h: Math.ceil(up + down + RAILWAY.h) };
}

export const railBank = defineDrawing({
    id: "railbank",
    family: "travel",
    title: "Railway bank",
    group: "Structures",
    about: "A stretch of railway that leaves the level: over a hump, down into a dip, or up a ramp to higher ground. It joins a level railway at each end, so a line of them makes a hilly track a carriage has to be pushed over.",
    params: { run: 10, rise: 2, shape: "hump" },
    settings: {
        run: { kind: "whole", min: 4, max: 24 },
        rise: { kind: "number", min: -3, max: 3, step: 0.5 },
        shape: { kind: "one of", of: ["hump", "ramp"] },
    },
    takes: [
        { label: "A hump two squares high", params: { run: 10, rise: 2, shape: "hump" } },
        { label: "A dip", params: { run: 8, rise: -1.5, shape: "hump" } },
        { label: "A ramp up to the left", params: { run: 12, rise: 2, shape: "ramp" } },
    ],
    box: (p) => ({
        w: Math.round(within(p.run, 4, 24, 10)),
        h: bankBox(within(p.rise, -3, 3, 2)).h,
    }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            run = Math.round(within(p.run, 4, 24, 10)),
            rise = within(p.rise, -3, 3, 2),
            shape = p.shape === "ramp" ? "ramp" : "hump",
            { rail, h } = bankBox(rise),
            w = run * U;
        const railAt = (x: number) => (rail - bankHeight(shape, rise, x / w)) * U;
        const steps = run * 4,
            xs = Array.from({ length: steps + 1 }, (_, i) => (i / steps) * w);
        // a stroke is held a pixel and a half in from each end, so its width stays inside the box
        const along = (dy: number) =>
            xs.map((x) => {
                const at = Math.max(1.5, Math.min(w - 1.5, x));
                return `${at.toFixed(1)} ${(railAt(at) + dy).toFixed(1)}`;
            });
        const grass = (RAILWAY.grass - RAILWAY.rail) * U;
        pen.path(
            g,
            `M${along(grass).join("L")}L${w - 1.5} ${h * U - 1.5}L1.5 ${h * U - 1.5}Z`,
            "ruler",
            pen.fill("mint", "hachure", { hachureGap: 10, fillWeight: 0.8 }),
            { stroke: "none" },
        );
        pen.path(g, `M${along(grass).join("L")}`, "pencil", null, calm(c, 2.2));
        for (let x = 0.7 * U; x < w - 10; x += 2.3 * U) {
            const y = railAt(x) + grass;
            pen.line(g, x, y, x - 3, y - 7, "pencil", { strokeWidth: 1.2 });
            pen.line(g, x + 4, y, x + 6, y - 8, "pencil", { strokeWidth: 1.2 });
        }
        const top = 0.45 * U,
            foot = 1.5 * U;
        pen.path(
            g,
            `M${along(top).join("L")}L${[...along(foot)].reverse().join("L")}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6, hachureAngle: 62, fillWeight: 0.6 }),
            { stroke: "none" },
        );
        for (let x = 0.55 * U; x < w - 0.35 * U; x += U) {
            const a = Math.atan2(railAt(x + 1) - railAt(x - 1), 2),
                cos = Math.cos(a),
                sin = Math.sin(a),
                y = railAt(x);
            const corner = (dx: number, dy: number) =>
                `${(x + dx * cos - dy * sin).toFixed(1)} ${(y + dx * sin + dy * cos).toFixed(1)}`;
            pen.path(
                g,
                `M${corner(-0.3 * U, 0.12 * U)}L${corner(0.3 * U, 0.12 * U)}L${corner(0.3 * U, 0.54 * U)}L${corner(-0.3 * U, 0.54 * U)}Z`,
                "ruler",
                pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 }),
                calm(c, 1.1),
            );
        }
        pen.path(g, `M${along(0.14 * U).join("L")}`, "ruler", null, {
            ...calm(c, 1.1),
            stroke: c.t["ink-soft"],
        });
        pen.path(g, `M${along(0).join("L")}`, "ruler", null, calm(c, 2.8));
        const crest = xs.reduce((best, x) => (railAt(x) < railAt(best) ? x : best), 0);
        return {
            left: [0, railAt(0), "left"],
            right: [w, railAt(w), "right"],
            crest: [crest, railAt(crest), "up"],
        };
    },
    describe: (p) => {
        const rise = within(p.rise, -3, 3, 2);
        const what =
            p.shape === "ramp"
                ? `climbs a grassy ramp to higher ground on the ${rise >= 0 ? "left" : "right"}`
                : rise >= 0
                  ? "climbs over a grassy hump and comes down again"
                  : "runs down into a grassy dip and climbs out again";
        return `A stretch of railway seen from the side, a rail on wooden sleepers over grey ballast, that ${what}.`;
    },
    motion: {
        still: "A bank is the ground the line is laid on; it is the carriage on it that rolls.",
    },
});
