import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, wide } from "../lettering";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** The rope's width down the middle of its two-square box, and where its knot sits above the foot, in squares. */
export const SWINGROPE = { thick: 0.34, knot: 0.9 } as const;

function twist<G>(c: Ctx<G>, x: number, y0: number, y1: number, half: number): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${x - half} ${y0}L${x - half} ${y1}L${x + half} ${y1}L${x + half} ${y0}Z`,
        "pencil",
        pen.fill("glow", "solid"),
        { strokeWidth: 1.3, disableMultiStroke: true, preserveVertices: true },
    );
    // the lay of the strands: short slants all one way, as a twisted rope shows them
    for (let y = y0 + 4; y < y1 - 2; y += 5.5)
        pen.line(g, x - half + 0.6, y + 2.4, x + half - 0.6, y - 1.6, "pencil", {
            strokeWidth: 0.8,
            stroke: c.t["ink-soft"],
            disableMultiStroke: true,
        });
}

export const swingRope = defineDrawing({
    id: "swingrope",
    family: "outdoors",
    title: "Swing rope",
    group: "Props",
    about: "A thick twisted rope tied at the top, with a fat knot near its frayed end to hold on to, for swinging across a stream. It can carry a small white tag with a number on it, so a game can ask for the rope at 5 or the ropes that count in fives.",
    params: { long: 8, tag: "" },
    settings: {
        long: { kind: "whole", min: 3, max: 16 },
        tag: { kind: "text", most: 4 },
    },
    takes: [
        { label: "Eight squares long", params: { long: 8, tag: "" } },
        { label: "A long rope tagged 10", params: { long: 12, tag: "10" } },
        { label: "A short rope tagged 3", params: { long: 4, tag: "3" } },
    ],
    box: (p) => ({ w: 2, h: whole(p.long, 3, 16, 8) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            h = whole(p.long, 3, 16, 8) * U,
            x = U,
            half = (SWINGROPE.thick * U) / 2,
            knot = h - SWINGROPE.knot * U;
        // the loop it is tied on by
        pen.ellipse(g, x, 3, 9, 6, "pencil", null, { strokeWidth: 1.4 });
        twist(c, x, 5, knot - 3, half);
        pen.ellipse(g, x, knot, half * 2 + 6, 8, "pencil", pen.fill("glow", "solid"), {
            strokeWidth: 1.5,
        });
        pen.line(g, x - half - 2, knot - 1, x + half + 2, knot + 1.5, "pencil", {
            strokeWidth: 0.9,
            stroke: c.t["ink-soft"],
        });
        twist(c, x, knot + 3, h - 7, half * 0.9);
        for (const dx of [-2.6, -0.8, 1, 2.8])
            pen.line(g, x + dx * 0.6, h - 7, x + dx, h - 1.5, "pencil", {
                strokeWidth: 1,
                disableMultiStroke: true,
            });
        if (p.tag) {
            const w = Math.min(2 * U - 2, wide(p.tag, 12) + 8),
                ty = knot - 1.6 * U;
            pen.rect(g, x - w / 2, ty - 8, w, 15, "ruler", pen.fill("card"), {
                strokeWidth: 1.1,
                disableMultiStroke: true,
                preserveVertices: true,
            });
            num(c, x, ty + 4, p.tag, 12);
        }
        return {
            top: [x, 3, "up"],
            grip: [x, knot, "down"],
            foot: [x, h, "down"],
        };
    },
    describe: (p) =>
        `A thick twisted yellow rope hanging from a loop at the top, with a fat knot near its frayed end${p.tag ? ` and a white tag saying ${p.tag}` : ""}.`,
    motion: {
        still: "A game swings it from its branch; on the shelf it hangs still so its tag can be read.",
    },
});
