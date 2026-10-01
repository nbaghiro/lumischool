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

/** The box of a lead that drops `rise` squares from its left end to its right, in squares. */
export const curveBox = (run: number, rise: number) => ({ w: run, h: Math.ceil(rise + 2.2) });

export const railCurve = defineDrawing({
    id: "railcurve",
    family: "travel",
    title: "Railway lead",
    group: "Structures",
    about: "A short length of railway that bends down from a higher siding to the main line in an S, so a fan of sidings seen from the side reads as tracks that part at the points. It has no grass of its own, so it lies over the ground the yard is on.",
    params: { run: 8, rise: 5.5 },
    settings: {
        run: { kind: "whole", min: 4, max: 16 },
        rise: { kind: "number", min: 0, max: 14, step: 0.5 },
    },
    takes: [
        { label: "Down from the siding behind", params: { run: 8, rise: 5.5 } },
        { label: "Down from two sidings back", params: { run: 8, rise: 11 } },
        { label: "A gentle lead", params: { run: 12, rise: 3 } },
    ],
    box: (p) => curveBox(Math.round(within(p.run, 4, 16, 8)), within(p.rise, 0, 14, 5.5)),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            run = Math.round(within(p.run, 4, 16, 8)),
            rise = within(p.rise, 0, 14, 5.5),
            w = run * U;
        // the same S the yard rolls a wagon along: high on the left, level on the right
        const railAt = (x: number) => (RAILWAY.rail + rise - bankHeight("ramp", rise, x / w)) * U;
        const steps = run * 6,
            xs = Array.from({ length: steps + 1 }, (_, i) => (i / steps) * w);
        const along = (dy: number) =>
            xs.map((x) => {
                const at = Math.max(1.5, Math.min(w - 1.5, x));
                return `${at.toFixed(1)} ${(railAt(at) + dy).toFixed(1)}`;
            });
        pen.path(
            g,
            `M${along(0.45 * U).join("L")}L${[...along(1.5 * U)].reverse().join("L")}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6, hachureAngle: 62, fillWeight: 0.6 }),
            { stroke: "none" },
        );
        for (let x = 0.55 * U; x < w - 0.35 * U; x += 0.9 * U) {
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
        return {
            left: [0, railAt(0), "left"],
            right: [w, railAt(w), "right"],
        };
    },
    describe: (p) =>
        `A length of railway seen from the side, a rail on wooden sleepers over grey ballast, bending in an S down ${Math.round(within(p.rise, 0, 14, 5.5))} squares from a siding to the main line.`,
    motion: {
        still: "A lead is the ground the wagons run on; it is the wagon on it that rolls.",
    },
});
