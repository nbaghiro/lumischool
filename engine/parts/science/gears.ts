import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned, soft } from "../lettering";

type Pt = [number, number];

/** Which way each gear turns, and how many times, for one turn of the first: neighbours turn opposite ways, by the ratio of teeth. */
export const gearTurns = (
    teeth: readonly number[],
    turn: number,
): { way: 1 | -1; times: number }[] =>
    teeth.map((t, i) => ({
        way: ((i % 2 === 0 ? 1 : -1) * (turn >= 0 ? 1 : -1)) as 1 | -1,
        times: (teeth[0] ?? t) / t,
    }));

/** How big a gear of so many teeth is, in squares: the pitch radius grows with the teeth, so neighbours mesh. */
const pitch = (teeth: number): number => teeth * 0.16;

const TOOTH = 0.36;

export const gearTeeth = (p: { a: number; b: number; c: number }): number[] =>
    [p.a, p.b, p.c]
        .map((t) => Math.round(t))
        .filter((t, i) => i < 2 || t > 0)
        .map((t) => Math.max(6, Math.min(24, t)));

/** A curved arrow over a gear, pointing the way it turns: to the right over the top is clockwise. */
function turnArrow<G>(c: Ctx<G>, x: number, y: number, r: number, way: 1 | -1): void {
    const { pen, g } = c,
        R = r + 0.75 * U,
        a0 = -Math.PI / 2 - 0.55,
        a1 = -Math.PI / 2 + 0.55;
    pen.arc(g, x, y, 2 * R, 2 * R, a0, a1, "pencil", { strokeWidth: 2, stroke: c.t.pen });
    // the head is where the turning arrives, and its two strokes point back along the arc
    const at = way > 0 ? a1 : a0,
        hx = x + R * Math.cos(at),
        hy = y + R * Math.sin(at);
    const bx = Math.sin(at) * way,
        by = -Math.cos(at) * way;
    for (const s of [-0.5, 0.5]) {
        const dx = bx * Math.cos(s) - by * Math.sin(s),
            dy = bx * Math.sin(s) + by * Math.cos(s);
        pen.line(g, hx, hy, hx + dx * 11, hy + dy * 11, "pencil", {
            strokeWidth: 2,
            stroke: c.t.pen,
        });
    }
}

export const gears = defineDrawing({
    id: "gears",
    family: "science",
    title: "Gears",
    group: "Structures",
    about: "Two or three gears meshing in a row, each as big as its teeth make it and marked with its letter, its number of teeth and a dot to count its turns. The first turns the way its arrow says, and each gear turns the other way from its neighbour, as many times for one turn of the first as the first has teeth for each of its own. With `show` at 0 only the first gear's arrow is drawn, and the others wait under a question mark.",
    params: { a: 16, b: 8, c: 0, turn: 1, show: 1 },
    settings: {
        a: { kind: "whole", min: 6, max: 24 },
        b: { kind: "whole", min: 6, max: 24 },
        c: { kind: "whole", min: 0, max: 24 },
        turn: { kind: "one of", of: [-1, 1] },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "A big gear and a small one", params: { a: 16, b: 8, c: 0, turn: 1, show: 1 } },
        { label: "Three in a row", params: { a: 24, b: 12, c: 8, turn: -1, show: 1 } },
        { label: "Which way do they turn?", params: { a: 12, b: 18, c: 9, turn: 1, show: 0 } },
    ],
    box: (p) => {
        const t = gearTeeth(p);
        const w = t.reduce((s, x) => s + 2 * pitch(x), 0) + 2 * TOOTH + 1;
        return { w: Math.ceil(w), h: Math.ceil(2 * pitch(Math.max(...t)) + 2 * TOOTH + 3.8) };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = gearTeeth(p),
            turns = gearTurns(t, p.turn);
        const big = Math.max(...t),
            cy = (pitch(big) + TOOTH + 2.4) * U;
        const fills = ["sky", "tang", "mint"] as const;
        let x = (0.5 + TOOTH) * U,
            phase = 0;
        t.forEach((teeth, i) => {
            const r = pitch(teeth) * U,
                cx = x + r,
                hp = Math.PI / teeth;
            // each gear is turned so a tooth of one sits in a gap of the next where they meet
            if (i > 0) {
                const q = -phase / ((2 * Math.PI) / (t[i - 1] ?? teeth));
                phase = Math.PI + (Math.abs(q - Math.round(q)) < 1e-6 ? hp : 0);
            }
            const pts: Pt[] = [];
            for (let k = 0; k < teeth; k++) {
                const m = phase + (2 * Math.PI * k) / teeth,
                    rootR = r - TOOTH * U * 0.5,
                    tipR = r + TOOTH * U * 0.5;
                for (const [da, rr] of [
                    [-0.3, rootR],
                    [-0.15, tipR],
                    [0.15, tipR],
                    [0.3, rootR],
                ] as const) {
                    pts.push([
                        cx + rr * Math.cos(m + da * hp * 2),
                        cy + rr * Math.sin(m + da * hp * 2),
                    ]);
                }
            }
            pen.polygon(g, pts, "ruler", pen.fill(fills[i], "solid"), { strokeWidth: 1.8 });
            pen.circle(g, cx, cy, Math.max(1.1 * U, r * 0.62), "ruler", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            pen.circle(g, cx, cy - r * 0.74, 9, "ruler", pen.fill("berry"), { strokeWidth: 1.2 });
            num(c, cx, cy + 6, "ABC"[i] ?? "?", 17);
            soft(c, cx, cy + r + TOOTH * U + 0.9 * U, `${teeth} teeth`, 12);
            if (i === 0 || p.show > 0)
                turnArrow(c, cx, cy, r + TOOTH * U * 0.5, turns[i]?.way ?? 1);
            else penned(c, cx, cy - r - 0.75 * U, "?", 22);
            a[`gear(${i})`] = [cx, cy - r - TOOTH * U, "up"];
            x += 2 * r;
        });
        return a;
    },
    describe: (p) =>
        `${p.c > 0 ? "Three" : "Two"} gears meshing in a row, each as big as its teeth make it and marked with its letter, its number of teeth and a dot to count its turns.`,
    reads: true,
});
