import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, ghost, num, patch, soft } from "../lettering";

/** How far the slope runs along the ground, in squares: its `length`, or twice its height when that is 0. */
const runOf = (p: { height: number; length: number }): number =>
    p.length > 0 ? Math.round(p.length) : p.height * 2;

/** How many squares of the run-out are marked off past the slope's foot. */
const flatOf = (p: { flat: number }): number => Math.max(4, Math.min(15, Math.round(p.flat)));

/**
 * A paper cup lying on its side with its mouth at `x`, open towards the slope, its lower side on the
 * ground; `ghost` draws only a dashed outline, for where a pushed cup started.
 */
function paperCup<G>(c: Ctx<G>, x: number, ground: number, ghost: boolean): void {
    const { pen, g } = c,
        L = 2 * U,
        mouth = 1.6 * U,
        base = 1.1 * U,
        outline = `M${x} ${ground}H${x + L}V${ground - base}L${x} ${ground - mouth}Z`;
    if (ghost) {
        pen.path(g, outline, "ruler", null, {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
            strokeLineDash: [4, 4],
        });
        return;
    }
    pen.path(g, outline, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
    pen.line(g, x + 0.7 * U, ground - mouth + 0.18 * U, x + 0.7 * U, ground, "ruler", {
        strokeWidth: 1,
        stroke: c.t["ink-soft"],
    });
    pen.line(g, x + 1.3 * U, ground - mouth + 0.34 * U, x + 1.3 * U, ground, "ruler", {
        strokeWidth: 1,
        stroke: c.t["ink-soft"],
    });
    pen.ellipse(
        g,
        x,
        ground - mouth / 2,
        0.5 * U,
        mouth,
        "ruler",
        pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
        { strokeWidth: 1.6 },
    );
}

export const ramp = defineDrawing({
    id: "ramp",
    family: "science",
    title: "Ramp",
    group: "Structures",
    about: "A slope of a chosen height with a ball on it and a flat run-out marked off in squares, so how far the ball rolled is read off the page. Raising the slope is the one thing a child can change, which makes it the shelf's fair test. The slope runs twice its height along the ground unless `length` sets its run, so two slopes of one height can be steeper and gentler. With `cup` at 1 a paper cup lies on its side at the slope's foot, mouth to the slope, and once the ball has run into it the cup's mouth stands at the mark `pushed` squares along the run-out, with the ball against it and a dashed outline where it started; nothing is written at the cup. `flat` is how many squares of the run-out are marked off, fifteen by default and as few as four, which is the same ramp on a narrower page.",
    params: {
        height: 4,
        ball: 0.35,
        rolled: 0,
        rough: 0,
        unit: "cm",
        length: 0,
        cup: 0,
        pushed: 0,
        flat: 15,
    },
    settings: {
        height: { kind: "whole", min: 1, max: 8 },
        ball: { kind: "number", min: 0, max: 1, step: 0.05 },
        rolled: { kind: "whole", min: 0, max: 15 },
        rough: { kind: "whole", min: 0, max: 1 },
        unit: { kind: "text", most: 3 },
        length: { kind: "whole", min: 0, max: 16 },
        cup: { kind: "whole", min: 0, max: 1 },
        pushed: { kind: "whole", min: 0, max: 12 },
        flat: { kind: "whole", min: 4, max: 15 },
    },
    takes: [
        {
            label: "A smooth ramp",
            params: {
                height: 3,
                ball: 0,
                rolled: 6,
                rough: 0,
                unit: "cm",
                length: 0,
                cup: 0,
                pushed: 0,
                flat: 15,
            },
        },
        {
            label: "Carpet on the ramp",
            params: {
                height: 3,
                ball: 0,
                rolled: 3,
                rough: 1,
                unit: "cm",
                length: 0,
                cup: 0,
                pushed: 0,
                flat: 15,
            },
        },
        {
            label: "Steeper",
            params: {
                height: 5,
                ball: 0,
                rolled: 9,
                rough: 0,
                unit: "cm",
                length: 0,
                cup: 0,
                pushed: 0,
                flat: 15,
            },
        },
        {
            label: "A cup at the foot",
            params: {
                height: 4,
                ball: 0,
                rolled: 0,
                rough: 0,
                unit: "cm",
                length: 0,
                cup: 1,
                pushed: 0,
                flat: 15,
            },
        },
        {
            label: "The cup pushed 7 squares",
            params: {
                height: 6,
                ball: 0,
                rolled: 0,
                rough: 0,
                unit: "cm",
                length: 0,
                cup: 1,
                pushed: 7,
                flat: 15,
            },
        },
        {
            label: "A gentle slope of the same height",
            params: {
                height: 3,
                ball: 0,
                rolled: 0,
                rough: 0,
                unit: "cm",
                length: 12,
                cup: 1,
                pushed: 4,
                flat: 15,
            },
        },
        {
            label: "A short run-out, for a margin",
            params: {
                height: 3,
                ball: 0.35,
                rolled: 0,
                rough: 0,
                unit: "cm",
                length: 0,
                cup: 0,
                pushed: 0,
                flat: 5,
            },
        },
    ],
    box: (p) => ({ w: runOf(p) + flatOf(p) + 2, h: p.height + 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const run = runOf(p),
            flat = flatOf(p),
            cup = p.cup > 0,
            pushed = Math.max(0, Math.min(Math.min(12, flat), Math.round(p.pushed)));
        const ground = (p.height + 4) * U,
            topY = ground - p.height * U;
        const x0 = U,
            apex = x0 + run * U;
        pen.line(g, 0, ground, (run + flat + 2) * U, ground, "ruler", { strokeWidth: 2.6 });
        // the slope, as a right-angled wedge: the height is the thing being changed, so it is marked
        pen.polygon(
            g,
            [
                [x0, topY],
                [apex, ground],
                [x0, ground],
            ],
            "ruler",
            pen.fill(p.rough > 0 ? "ink-soft" : "card", "hachure", {
                hachureGap: p.rough > 0 ? 3 : 6,
            }),
            { strokeWidth: 2.2 },
        );
        pen.line(g, x0, topY, x0, ground, "ruler", { strokeWidth: 1.4, stroke: c.t["ink-soft"] });
        patch(c, x0 - 0.6 * U, ground - (p.height * U) / 2, 30, 18);
        num(c, x0 - 0.6 * U, ground - (p.height * U) / 2 + 5, p.height, 14, "end");
        // the ball, on the slope at the fraction along it the settings ask for
        const t = Math.max(0, Math.min(1, p.ball));
        const bx = x0 + (apex - x0) * t,
            by = topY + (ground - topY) * t;
        if (!cup || pushed === 0) {
            pen.circle(g, bx + 0.5 * U, by - 0.6 * U, 1.4 * U, "pencil", pen.fill("berry"), {
                strokeWidth: 1.8,
            });
            a.ball = [bx + 0.5 * U, by - 1.4 * U, "up"];
        }
        a.top = [x0, topY, "up"];
        a.foot = [apex, ground, "up"];
        for (let k = 0; k <= flat; k++) {
            const x = apex + k * U,
                tall = k % 5 === 0 ? 12 : 6;
            pen.line(g, x, ground, x, ground + tall, "ruler", {
                strokeWidth: k % 5 === 0 ? 1.6 : 0.9,
            });
            if (k % 5 === 0 && k > 0) {
                num(c, x, ground + 1.5 * U, k, 13);
                a[`mark(${k})`] = [x, ground, "down"];
            }
        }
        soft(c, apex + flat * U, ground + 2.5 * U, p.unit, 13, "end");
        if (p.rolled > 0) {
            // The ball rolls along the floor, so the trail and the ball that stopped sit on the line
            // rather than above it.
            const end = apex + Math.min(flat, p.rolled) * U;
            ghost(c, `M${apex} ${ground - 0.7 * U}H${end}`);
            pen.circle(g, end, ground - 0.7 * U, 1.4 * U, "pencil", pen.fill("berry"), {
                strokeWidth: 1.8,
            });
            a.stopped = [end, ground - 1.5 * U, "up"];
        }
        if (cup) {
            // the cup's mouth stands on a mark, so how far it moved is read at its mouth
            if (pushed > 0) {
                paperCup(c, apex, ground, true);
                const at = apex + pushed * U;
                paperCup(c, at, ground, false);
                pen.circle(
                    g,
                    at - 0.7 * U,
                    ground - 0.7 * U,
                    1.4 * U,
                    "pencil",
                    pen.fill("berry"),
                    {
                        strokeWidth: 1.8,
                    },
                );
                a.ball = [at - 0.7 * U, ground - 1.5 * U, "up"];
                a.cup = [at + U, ground - 1.7 * U, "up"];
            } else {
                paperCup(c, apex, ground, false);
                a.cup = [apex + U, ground - 1.7 * U, "up"];
            }
        }
        if (p.rough > 0) cap(c, apex + (flat * U) / 2, ground + 2.6 * U, "carpet", 11);
        return a;
    },
    describe: (p) =>
        p.cup > 0
            ? `A slope with a ball on it${p.rough > 0 ? ", carpet laid on its face," : ""} and a paper cup lying on its side beyond its foot, on a flat run marked off in squares.`
            : `A slope with a ball on it${p.rough > 0 ? ", carpet laid on its face," : ""} and a flat run marked off in squares along the ground beyond its foot.`,
    reads: true,
});
