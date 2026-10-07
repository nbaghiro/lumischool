import type { Ctx, RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const BEAMS = ["wood", "road", "rope"] as const;
type BeamKind = (typeof BEAMS)[number];

/** The colour a beam glows in as it works harder, from easy to about to snap: in step with the strain key. */
export const STRAIN_HUES = [null, "glow", "tang", "berry"] as const;

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** A jagged end where a beam snapped, drawn down the beam's thickness at `x`. */
function jag<G>(c: Ctx<G>, x: number, top: number, bottom: number, dir: number): void {
    const n = 4,
        pts: [number, number][] = [];
    for (let i = 0; i <= n; i++)
        pts.push([x + (i % 2 ? 0.18 * U * dir : 0), top + ((bottom - top) * i) / n]);
    c.pen.linear(c.g, pts, "pencil", { strokeWidth: 1.4, ...FIRM });
}

export const trussBeam = defineDrawing({
    id: "trussbeam",
    family: "travel",
    title: "Bridge beam",
    group: "Props",
    about: "One beam of a bridge a child builds, seen from the side and laid between two joints: a wooden strut, a stretch of road deck to drive on, or a rope. It glows yellow, orange and then red the harder it is pulled or pushed, and a snapped one has a jagged end.",
    params: { kind: "wood", len: 3, strain: 0, broken: 0, ghost: 0 },
    settings: {
        kind: { kind: "one of", of: BEAMS },
        len: { kind: "whole", min: 1, max: 9 },
        strain: { kind: "whole", min: 0, max: 3 },
        broken: { kind: "whole", min: 0, max: 1 },
        ghost: { kind: "whole", min: 0, max: 2 },
    },
    takes: [
        {
            label: "A wooden strut",
            params: { kind: "wood", len: 3, strain: 0, broken: 0, ghost: 0 },
        },
        {
            label: "Road, working hard",
            params: { kind: "road", len: 4, strain: 2, broken: 0, ghost: 0 },
        },
        {
            label: "A rope about to snap",
            params: { kind: "rope", len: 5, strain: 3, broken: 0, ghost: 0 },
        },
        {
            label: "A snapped strut",
            params: { kind: "wood", len: 2, strain: 0, broken: 1, ghost: 0 },
        },
        {
            label: "A beam being laid that fits",
            params: { kind: "wood", len: 3, strain: 0, broken: 0, ghost: 1 },
        },
        {
            label: "A beam being laid that cannot go",
            params: { kind: "road", len: 5, strain: 0, broken: 0, ghost: 2 },
        },
    ],
    box: (p) => ({ w: whole(p.len, 1, 9, 3), h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.len, 1, 9, 3) * U,
            kind: BeamKind = BEAMS.find((b) => b === p.kind) ?? "wood",
            strain = whole(p.strain, 0, 3, 0),
            broken = whole(p.broken, 0, 1, 0) === 1,
            ghost = whole(p.ghost, 0, 2, 0),
            hue = ghost === 1 ? "mint" : ghost === 2 ? "berry" : (STRAIN_HUES[strain] ?? null),
            mid = 0.5 * U;
        const half = kind === "road" ? 0.24 * U : kind === "wood" ? 0.17 * U : 0.07 * U;
        // the glow sits under the beam a little wider than it, so the beam's own look still reads
        if (hue)
            pen.rect(g, 2, mid - half - 3, w - 4, 2 * half + 6, "ruler", pen.fill(hue), {
                stroke: "none",
            });
        if (kind === "rope") {
            pen.line(g, 3, mid, w - 3, mid, "pencil", { strokeWidth: 2.4, ...FIRM });
            for (let x = 0.5 * U; x < w - 0.3 * U; x += 0.5 * U)
                pen.line(g, x, mid - 2, x + 4, mid + 2, "ruler", { strokeWidth: 0.8, ...FIRM });
        } else if (kind === "road") {
            pen.rect(g, 2, mid - half, w - 4, 2 * half, "pencil", pen.fill("ink"), {
                strokeWidth: 1.4,
                ...FIRM,
            });
            for (let x = 0.3 * U; x < w - 0.5 * U; x += 0.8 * U)
                pen.line(g, x, mid, x + 0.35 * U, mid, "ruler", {
                    strokeWidth: 1.6,
                    stroke: c.t.card,
                    ...FIRM,
                });
        } else
            pen.rect(
                g,
                2,
                mid - half,
                w - 4,
                2 * half,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 4, hachureAngle: 90, fillWeight: 0.6 }),
                { strokeWidth: 1.5, ...FIRM },
            );
        if (broken) jag(c, w - 2, mid - half - 2, mid + half + 2, 1);
        // a beam that cannot go is crossed out at both ends, so it does not rest on its red alone
        if (ghost === 2)
            for (const x of [0.4 * U, w - 0.4 * U]) {
                pen.line(g, x - 6, mid - 6, x + 6, mid + 6, "ruler", { strokeWidth: 2, ...FIRM });
                pen.line(g, x - 6, mid + 6, x + 6, mid - 6, "ruler", { strokeWidth: 2, ...FIRM });
            }
        return { left: [0, mid, "left"], right: [w, mid, "right"] };
    },
    describe: (p) => {
        const kind = BEAMS.find((b) => b === p.kind) ?? "wood",
            what =
                kind === "road"
                    ? "a dark stretch of road deck with a dashed white line"
                    : kind === "rope"
                      ? "a thin twisted rope"
                      : "a wooden strut";
        const ghost = whole(p.ghost, 0, 2, 0);
        if (ghost > 0)
            return `A ${kind} beam of a bridge being laid between two joints, washed ${ghost === 1 ? "green because it fits" : "red and crossed out because it cannot go there"}.`;
        const state =
            whole(p.broken, 0, 1, 0) === 1
                ? "snapped off with a jagged end"
                : [
                      "resting easy",
                      "glowing yellow as it works",
                      "glowing orange as it works hard",
                      "glowing red, about to snap",
                  ][whole(p.strain, 0, 3, 0)];
        return `One beam of a bridge seen from the side, ${what}, ${state}, laid between two joints.`;
    },
    motion: { still: "A game lays each beam between its joints and moves it as the bridge bends." },
});
