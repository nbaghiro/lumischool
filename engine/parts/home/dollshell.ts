import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["plinth", "glow"] as const;

export interface ShellParams {
    kind: (typeof KINDS)[number];
    /** Squares across, and for a glow squares down. */
    w: number;
    h: number;
}

const kindOf = (v: unknown): ShellParams["kind"] => KINDS.find((k) => k === v) ?? "plinth";
const across = (v: unknown, most: number): number =>
    Math.max(1, Math.min(most, Math.round(Number(v) || 1)));

/**
 * What a dollhouse stands on and where a held thing may go: the plinth is the slab of stone under the
 * whole house, a square deep; a glow is a soft green patch over a place a room or a piece of furniture
 * fits, drawn on screen only, so a printed page shows none.
 */
export const dollShell = defineDrawing<ShellParams>({
    id: "dollshell",
    family: "home",
    title: "Dollhouse plinth and glow",
    group: "Structures",
    about: "The stone slab a dollhouse stands on, as wide as the house, or a soft green glow over a place a room or a piece of furniture can go.",
    params: { kind: "plinth", w: 8, h: 1 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        w: { kind: "whole", min: 1, max: 24 },
        h: { kind: "whole", min: 1, max: 4 },
    },
    takes: [
        { label: "A plinth under a house", params: { kind: "plinth", w: 12, h: 1 } },
        { label: "A short plinth", params: { kind: "plinth", w: 4, h: 1 } },
        { label: "A glow where a room fits", params: { kind: "glow", w: 4, h: 3 } },
        { label: "A glow along a floor", params: { kind: "glow", w: 5, h: 1 } },
    ],
    box: (p) =>
        kindOf(p.kind) === "glow"
            ? { w: across(p.w, 24), h: across(p.h, 4) }
            : { w: across(p.w, 24), h: 1 },
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        const w = across(p.w, 24) * U;
        if (kindOf(p.kind) === "glow") {
            const h = across(p.h, 4) * U;
            if (!c.paper) {
                plain(c, {
                    kind: "rect",
                    x: 1,
                    y: 1,
                    w: w - 2,
                    h: h - 2,
                    r: 0.3 * U,
                    fill: c.t.mint,
                    opacity: 0.38,
                });
                plain(c, {
                    kind: "rect",
                    x: 2,
                    y: 2,
                    w: w - 4,
                    h: h - 4,
                    r: 0.25 * U,
                    fill: "none",
                    stroke: c.t.ok,
                    width: 1.4,
                    opacity: 0.55,
                });
            }
            return { middle: [w / 2, h / 2, "up"] };
        }
        // the slab: a top course and stones below it, a step at each end
        pen.rect(g, 1, 1, w - 2, 0.3 * U, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        pen.rect(g, 3, 0.3 * U + 1, w - 6, 0.6 * U - 2, "pencil", pen.fill("ink-soft", "hachure"), {
            strokeWidth: 1.4,
        });
        for (let x = 1.2 * U; x < w - 0.8 * U; x += 1.4 * U)
            pen.line(g, x, 0.3 * U + 1, x, 0.9 * U - 1, "ruler", { strokeWidth: 0.9 });
        return { top: [w / 2, 1, "up"] };
    },
    describe: (p) =>
        kindOf(p.kind) === "glow"
            ? "A soft green patch with a faint green edge, laid over a place in a dollhouse where a held room or piece of furniture would fit."
            : `A long stone slab ${across(p.w, 24)} squares wide that a dollhouse stands on, a pale top course over a row of shaded stones.`,
    motion: {
        still: "The plinth carries the house, and a glow marks a place until something fills it.",
    },
});
