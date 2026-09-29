import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { penned, say, soft } from "../lettering";

/** How many vibrations a second a trace shows: its whole waves over the seconds its screen spans. */
export const hertzOf = (waves: number, across: number): number =>
    (Math.max(1, Math.round(waves)) * 1000) / Math.max(1, Math.round(across));

/** The time one screen spans, in words: 10 milliseconds is "0.01 s". */
const spanWords = (ms: number): string => `${Math.round(ms) / 1000} s`;

const W = 18 * U;
const H = 4.4 * U;
const LEFT = 2 * U;
const ROW = 5 * U;

export const wave = defineDrawing({
    id: "wave",
    family: "science",
    title: "A sound on a screen",
    group: "Structures",
    about: "Sounds picked up by a microphone and drawn as waves on a screen with a squared grid, one screen for each lettered sound. The more waves across the screen, the faster the thing vibrates and the higher the note; the taller the waves, the harder it vibrates and the louder the note. Every screen spans the same short time (`across`, in thousandths of a second), so the vibrations a second, in hertz, are the whole waves counted across it divided by that time: 4 waves across 0.01 s is 400 hertz. `blank` leaves one screen empty under a question mark, for a prediction.",
    params: { waves: [4, 8], heights: [2, 2], across: 10, letters: 1, blank: -1 },
    settings: {
        waves: { kind: "numbers", min: 1, max: 10, most: 3 },
        heights: { kind: "numbers", min: 1, max: 3, most: 3 },
        across: { kind: "whole", min: 1, max: 1000 },
        letters: { kind: "whole", min: 0, max: 1 },
        blank: { kind: "whole", min: -1, max: 2 },
    },
    takes: [
        {
            label: "Low and high",
            params: { waves: [4, 8], heights: [2, 2], across: 10, letters: 1, blank: -1 },
        },
        {
            label: "Quiet and loud",
            params: { waves: [5, 5], heights: [1, 3], across: 10, letters: 1, blank: -1 },
        },
        {
            label: "Three sounds, one to find",
            params: { waves: [3, 6, 6], heights: [3, 1, 2], across: 10, letters: 1, blank: 2 },
        },
        {
            label: "One sound",
            params: { waves: [2], heights: [2], across: 10, letters: 0, blank: -1 },
        },
    ],
    box: (p) => ({ w: 21, h: Math.max(1, Math.min(3, p.waves.length)) * 5 + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(1, Math.min(3, p.waves.length));
        for (let i = 0; i < n; i++) {
            const top = 0.3 * U + i * ROW,
                mid = top + H / 2,
                waves = Math.max(1, Math.min(10, Math.round(p.waves[i] ?? 1))),
                tall = Math.max(1, Math.min(3, Math.round(p.heights[i] ?? 1)));
            pen.path(g, roundedRect(LEFT, top, W, H, 8), "ruler", pen.fill("card"), {
                strokeWidth: 2,
            });
            // the grid: a line at each step of height a wave is drawn to, so two heights compare by lines
            for (let k = 1; k < 18; k++)
                pen.line(g, LEFT + k * U, top + 0.1 * U, LEFT + k * U, top + H - 0.1 * U, "ruler", {
                    strokeWidth: 0.5,
                    stroke: c.t["ink-soft"],
                    strokeLineDash: [2, 4],
                });
            for (const dy of [-1.8, -1.2, -0.6, 0.6, 1.2, 1.8])
                pen.line(
                    g,
                    LEFT + 0.1 * U,
                    mid + dy * U,
                    LEFT + W - 0.1 * U,
                    mid + dy * U,
                    "ruler",
                    {
                        strokeWidth: 0.5,
                        stroke: c.t["ink-soft"],
                        strokeLineDash: [2, 4],
                    },
                );
            pen.line(g, LEFT + 0.1 * U, mid, LEFT + W - 0.1 * U, mid, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
            if (p.letters > 0) say(c, 0.8 * U, mid + 6, "ABC"[i] ?? "?", 18);
            a[`screen(${i})`] = [LEFT + W / 2, top, "up"];
            if (i === p.blank) {
                penned(c, LEFT + W / 2, mid + 9, "?", 28);
                continue;
            }
            // each wave sampled finely enough that the tallest and the most crowded stay smooth
            const amp = tall * 0.6 * U,
                pts: [number, number][] = [];
            for (let k = 0; k <= 360; k++) {
                const x = LEFT + 0.2 * U + ((W - 0.4 * U) * k) / 360;
                pts.push([x, mid - amp * Math.sin((2 * Math.PI * waves * k) / 360)]);
            }
            pen.curve(g, pts, "ruler", { strokeWidth: 2.2, stroke: c.t.berry });
            a[`wave(${i})`] = [LEFT + W * 0.25, mid - amp, "up"];
        }
        soft(c, LEFT + W / 2, n * ROW + 0.9 * U, `each screen shows ${spanWords(p.across)}`, 12);
        return a;
    },
    describe: (p) =>
        `${p.waves.length === 1 ? "A sound" : `${p.waves.length} sounds`} drawn as waves on a squared screen, each screen the same short time across.`,
    reads: true,
});
