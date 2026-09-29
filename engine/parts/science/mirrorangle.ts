import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, soft } from "../lettering";
import { mirrorStrip, ray, type Pt } from "./optics";

/** Where the beam meets the mirror, and how high the screen hangs above it, in squares. */
const HIT: Pt = [8 * U, 9.6 * U],
    SCREEN = 2.2 * U,
    RIGHT = 21.4 * U;

/** How far along the screen, from above the hit point, a beam leaving at an angle from the upright lands. */
const landsAt = (deg: number): number =>
    HIT[0] + (HIT[1] - SCREEN) * Math.tan((deg * Math.PI) / 180);

/** The angle a beam leaves a flat mirror at: the same as the one it came in at, both measured from the upright line. */
export const reflectOut = (angleIn: number): number => angleIn;

/** The letter of the target a beam coming in at an angle lands on, or null when it lands on none. */
export const targetHit = (angleIn: number, targets: readonly number[]): string | null => {
    const i = targets.findIndex((t) => t === reflectOut(angleIn));
    return i < 0 ? null : ("ABCDE"[i] ?? null);
};

export const mirrorangle = defineDrawing({
    id: "mirrorangle",
    family: "science",
    title: "A beam on a mirror",
    group: "Structures",
    about: "A torch shining a beam onto a flat mirror, with a dashed line standing upright from the mirror where the beam meets it, and a screen above with lettered targets. The beam leaves the mirror at the same angle to the upright line as it came in at, on the other side, so it lands on the target for that angle. `angle` is the angle in, in degrees from the upright line, written by its arc when `marks` is 1; the targets are placed by the angles that would reach them. With `show` at 0 the beam stops at the mirror and a question mark waits where it leaves, for a prediction.",
    params: { angle: 40, targets: [20, 40, 60], marks: 1, show: 1 },
    settings: {
        angle: { kind: "whole", min: 10, max: 70 },
        targets: { kind: "numbers", min: 10, max: 60, most: 5 },
        marks: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "In at 40°, out at 40°",
            params: { angle: 40, targets: [20, 40, 60], marks: 1, show: 1 },
        },
        { label: "A steep beam", params: { angle: 20, targets: [20, 30, 50], marks: 1, show: 1 } },
        {
            label: "Which target will it hit?",
            params: { angle: 50, targets: [30, 40, 50, 60], marks: 1, show: 0 },
        },
    ],
    box: () => ({ w: 22, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            deg = Math.max(10, Math.min(70, Math.round(p.angle))),
            th = (deg * Math.PI) / 180,
            show = p.show > 0;
        const [hx, hy] = HIT;
        // the screen and its targets
        pen.line(g, hx - 0.5 * U, SCREEN, RIGHT, SCREEN, "ruler", { strokeWidth: 2.4 });
        for (let x = hx; x < RIGHT; x += 0.6 * U)
            pen.line(g, x, SCREEN, x + 0.4 * U, SCREEN - 0.4 * U, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        p.targets.slice(0, 5).forEach((t, i) => {
            const x = landsAt(Math.max(10, Math.min(60, t)));
            pen.circle(g, x, SCREEN + 0.35 * U, 0.7 * U, "ruler", pen.fill("berry"), {
                strokeWidth: 1.4,
            });
            patch(c, x, SCREEN + 1.35 * U, 18, 16);
            num(c, x, SCREEN + 1.55 * U, "ABCDE"[i] ?? "?", 13);
            a[`target(${i})`] = [x, SCREEN, "up"];
        });
        // the mirror, silvered on top, and the upright line where the beam meets it
        mirrorStrip(c, [0.8 * U, hy + 0.2 * U], [RIGHT, hy + 0.2 * U], -1);
        pen.line(g, hx, hy, hx, SCREEN + 2 * U, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
            strokeLineDash: [6, 5],
        });
        // the torch and the beam coming in
        const len = 6.6 * U,
            sx = hx - len * Math.sin(th),
            sy = hy - len * Math.cos(th),
            ux = Math.sin(th),
            uy = Math.cos(th);
        const at = (u: number, v: number): Pt => [sx - ux * u - uy * v, sy - uy * u + ux * v];
        pen.polygon(
            g,
            [at(0, -0.5 * U), at(0, 0.5 * U), at(0.6 * U, 0.3 * U), at(0.6 * U, -0.3 * U)],
            "ruler",
            pen.fill("sky"),
            {
                strokeWidth: 1.6,
            },
        );
        pen.polygon(
            g,
            [at(0.6 * U, -0.3 * U), at(0.6 * U, 0.3 * U), at(2 * U, 0.3 * U), at(2 * U, -0.3 * U)],
            "ruler",
            pen.fill("sky"),
            {
                strokeWidth: 1.6,
            },
        );
        ray(
            c,
            [
                [sx, sy],
                [hx, hy],
            ],
            1,
        );
        const arcR = 2.3 * U,
            label = (mid: number, s: string) => {
                const ly = hy - (arcR + 0.55 * U) * Math.cos(mid),
                    inside = (arcR + 0.7 * U) * Math.sin(mid),
                    // a narrow angle has no room between the rays for both labels, so each goes outside its ray
                    lx =
                        Math.abs(inside) < 19
                            ? hx + Math.sign(mid) * ((hy - ly) * Math.tan(th) + 24)
                            : hx + inside;
                patch(c, lx, ly - 5, 34, 16);
                num(c, lx, ly, s, 12);
            };
        if (p.marks > 0) {
            pen.arc(g, hx, hy, 2 * arcR, 2 * arcR, -Math.PI / 2 - th, -Math.PI / 2, "pencil", {
                strokeWidth: 1.2,
            });
            label(-th / 2, `${deg}°`);
        }
        if (show) {
            let ex = landsAt(deg),
                ey = SCREEN;
            if (ex > RIGHT) {
                ex = RIGHT;
                ey = hy - (RIGHT - hx) / Math.tan(th);
            }
            ray(c, [
                [hx, hy],
                [ex, ey],
            ]);
            if (p.marks > 0) {
                pen.arc(g, hx, hy, 2 * arcR, 2 * arcR, -Math.PI / 2, -Math.PI / 2 + th, "pencil", {
                    strokeWidth: 1.2,
                });
                label(th / 2, `${deg}°`);
            }
        } else penned(c, hx + 2.2 * U, hy - 2.6 * U, "?", 26);
        a.torch = [sx, sy, "left"];
        a.hit = [hx, hy, "down"];
        soft(c, 1 * U, hy + 1.1 * U, "mirror", 11, "start");
        return a;
    },
    describe: (p) =>
        `A torch shining a beam onto a flat mirror beside a dashed upright line, with lettered targets on a screen above${p.show > 0 ? " and the beam drawn leaving the mirror" : ", the beam out left to predict"}.`,
    reads: true,
});
