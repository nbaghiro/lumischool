import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const SHAPES = ["diamond", "delta", "box"] as const;
const TONES = ["berry", "sky", "tang", "mint", "glow"] as const;
const LOOKS = ["kite", "shadow"] as const;
type Pt = [number, number];

const pick = <T extends string>(of: readonly T[], v: string, d: T): T =>
    of.find((x) => x === v) ?? d;

/** A kite in flight seen from the flyer, its nose at the top of its box and its tail tied on at the foot. */
export const flyingKite = defineDrawing<{ shape: string; tone: string; look: string }>({
    id: "flyingkite",
    family: "sport",
    title: "Flying kite",
    group: "Props",
    about: "A kite in the air as its flyer sees it: a diamond with crossed spars, a delta with a keel, or a box kite of two cells, in one bright colour and white. Its shadow is the same shape, flat and grey.",
    params: { shape: "diamond", tone: "berry", look: "kite" },
    settings: {
        shape: { kind: "one of", of: SHAPES },
        tone: { kind: "one of", of: TONES },
        look: { kind: "one of", of: LOOKS },
    },
    takes: [
        { label: "A pink diamond", params: { shape: "diamond", tone: "berry", look: "kite" } },
        { label: "An orange delta", params: { shape: "delta", tone: "tang", look: "kite" } },
        { label: "A yellow box kite", params: { shape: "box", tone: "glow", look: "kite" } },
        { label: "A diamond's shadow", params: { shape: "diamond", tone: "sky", look: "shadow" } },
    ],
    box: () => ({ w: 3, h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            shape = pick(SHAPES, p.shape, "diamond"),
            tone = pick(TONES, p.tone, "berry"),
            shadow = p.look === "shadow";
        const ink = shadow
            ? { strokeWidth: 0.6, stroke: c.t["ink-soft"], roughness: 0.2 }
            : { strokeWidth: 1.4, roughness: 0.25 };
        const paint = (t: "card" | (typeof TONES)[number]) =>
            shadow ? pen.fill("ink-soft", "solid") : pen.fill(t, "solid");
        const spar = (a: Pt, b: Pt) => {
            if (!shadow)
                pen.line(g, a[0], a[1], b[0], b[1], "ruler", {
                    strokeWidth: 1.1,
                    stroke: c.t["ink-soft"],
                });
        };
        // a shadow is the kite's shape lying flat on the grass, along the foot of the box
        if (shadow) {
            const w = shape === "delta" ? 1.4 : shape === "box" ? 0.9 : 1.3;
            pen.polygon(
                g,
                [
                    [(1.5 - w) * U, 3.45 * U],
                    [1.5 * U, 3.15 * U],
                    [(1.5 + w) * U, 3.45 * U],
                    [1.5 * U, 3.8 * U],
                ],
                "pencil",
                paint(tone),
                ink,
            );
            return { middle: [1.5 * U, 3.45 * U, "up"] };
        }
        if (shape === "diamond") {
            const top: Pt = [1.5 * U, 0.15 * U],
                right: Pt = [2.85 * U, 1.45 * U],
                foot: Pt = [1.5 * U, 3.85 * U],
                left: Pt = [0.15 * U, 1.45 * U],
                mid: Pt = [1.5 * U, 1.45 * U];
            pen.polygon(g, [top, right, mid], "pencil", paint(tone), ink);
            pen.polygon(g, [top, mid, left], "pencil", paint("card"), ink);
            pen.polygon(g, [left, mid, foot], "pencil", paint(tone), ink);
            pen.polygon(g, [mid, right, foot], "pencil", paint("card"), ink);
            spar(top, foot);
            spar(left, right);
        } else if (shape === "delta") {
            const top: Pt = [1.5 * U, 0.2 * U],
                left: Pt = [0.1 * U, 3.1 * U],
                right: Pt = [2.9 * U, 3.1 * U],
                keel: Pt = [1.5 * U, 3.6 * U];
            pen.polygon(g, [top, [1.5 * U, 3.1 * U], left], "pencil", paint(tone), ink);
            pen.polygon(g, [top, right, [1.5 * U, 3.1 * U]], "pencil", paint("card"), ink);
            pen.polygon(
                g,
                [[1.5 * U, 1.6 * U], [1.5 * U, 3.1 * U], keel],
                "pencil",
                paint(tone),
                ink,
            );
            spar(top, [1.5 * U, 3.1 * U]);
            spar([0.75 * U, 2.1 * U], [2.25 * U, 2.1 * U]);
        } else {
            for (const y of [0.2, 2.3]) {
                pen.rect(g, 0.6 * U, y * U, 0.9 * U, 1.3 * U, "pencil", paint(tone), ink);
                pen.rect(g, 1.5 * U, y * U, 0.9 * U, 1.3 * U, "pencil", paint("card"), ink);
            }
            spar([0.6 * U, 0.2 * U], [0.6 * U, 3.6 * U]);
            spar([2.4 * U, 0.2 * U], [2.4 * U, 3.6 * U]);
            spar([1.5 * U, 0.2 * U], [1.5 * U, 3.6 * U]);
        }
        if (!shadow)
            pen.circle(g, 1.5 * U, 1.6 * U, 0.22 * U, "ruler", pen.fill("ink-soft", "solid"), {
                strokeWidth: 0.4,
                disableMultiStroke: true,
            });
        return {
            nose: [1.5 * U, 0.15 * U, "up"],
            bridle: [1.5 * U, 1.6 * U, "down"],
            tail: [1.5 * U, 3.85 * U, "down"],
        };
    },
    describe: (p) =>
        p.look === "shadow"
            ? `The flat grey shadow of a ${pick(SHAPES, p.shape, "diamond")} kite, the same shape as the kite above it, lying on the ground below.`
            : `A ${pick(SHAPES, p.shape, "diamond") === "box" ? "box kite of two cells" : `${pick(SHAPES, p.shape, "diamond")} kite`} in one bright colour and white, with thin spars crossing it and a knot where its line is tied.`,
    motion: { still: "A kite in the air moves as the wind and the game fly it." },
});
