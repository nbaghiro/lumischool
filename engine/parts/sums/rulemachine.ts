import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

type Pt = [number, number];

/** Teeth on the two cogs: the small one turns BIG / SMALL times the other way for each turn of the big one. */
const BIG = 10;

const SMALL = 5;

/** Pitch radius per tooth and tooth depth, in squares, so the cogs mesh and both fit inside the glass. */
const PITCH = 0.138;

const TOOTH = 0.36;

const GLASS = 2.35;

const WINDOW: Pt = [4.6, 8.2];

const PIVOT: Pt = [13, 8.2];

const ARM = 3;

function cog<G>(
    c: Ctx<G>,
    cx: number,
    cy: number,
    teeth: number,
    angle: number,
    fill: "mint" | "tang",
): void {
    const { pen, g } = c,
        r = teeth * PITCH * U,
        step = (2 * Math.PI) / teeth;
    const root = r - (TOOTH * U) / 2,
        tip = r + (TOOTH * U) / 2,
        pts: Pt[] = [];
    for (let k = 0; k < teeth; k++) {
        const m = angle + k * step;
        for (const [da, rr] of [
            [-0.3, root],
            [-0.15, tip],
            [0.15, tip],
            [0.3, root],
        ] as const) {
            pts.push([cx + rr * Math.cos(m + da * step), cy + rr * Math.sin(m + da * step)]);
        }
    }
    pen.polygon(g, pts, "ruler", pen.fill(fill, "solid"), { strokeWidth: 1.8 });
    pen.circle(g, cx, cy, r * 0.9, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
    const sx = r * 0.45 * Math.cos(angle),
        sy = r * 0.45 * Math.sin(angle);
    pen.line(g, cx - sx, cy - sy, cx + sx, cy + sy, "ruler", { strokeWidth: 1.8 });
    pen.circle(g, cx, cy, 6, "ruler", { fill: c.t.ink, fillStyle: "solid" }, { strokeWidth: 0.8 });
}

export const ruleMachine = defineDrawing({
    id: "rulemachine",
    family: "sums",
    title: "Rule machine",
    group: "Structures",
    about: "A machine on legs with a funnel on top to drop a numbered ball into, two cogs behind a round window, a lever on its side and a chute the ball rolls out along. A panel on the front shows its rule or a question mark, a slot on its roof takes a rule card, and a bulb on top can light.",
    params: { rule: "", pull: 0, turn: 0, lit: false },
    settings: {
        rule: { kind: "text", most: 6 },
        pull: { kind: "whole", min: 0, max: 1 },
        turn: { kind: "number", min: 0, max: 1, step: 0.05 },
        lit: { kind: "flag" },
    },
    takes: [
        { label: "Waiting for a number", params: { rule: "", pull: 0, turn: 0, lit: false } },
        {
            label: "Lever pulled, cogs turning",
            params: { rule: "", pull: 1, turn: 0.3, lit: false },
        },
        {
            label: "Lit, with its rule showing",
            params: { rule: "× 2 + 1", pull: 0, turn: 0, lit: true },
        },
    ],
    box: () => ({ w: 17, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            S = (x: number, y: number): Pt => [x * U, y * U];
        const metal = pen.fill("grid", "solid", { hachureGap: 5 }),
            black = { fill: c.t.ink, fillStyle: "solid" };

        for (const [top, bottom] of [
            [2.8, 2.4],
            [9.8, 10.2],
        ] as const) {
            pen.polygon(
                g,
                [
                    S(top - 0.3, 12.1),
                    S(top + 0.3, 12.1),
                    S(bottom + 0.3, 14.3),
                    S(bottom - 0.3, 14.3),
                ],
                "ruler",
                metal,
                { strokeWidth: 1.8 },
            );
            pen.path(
                g,
                roundedRect((bottom - 0.8) * U, 14.2 * U, 1.6 * U, 0.4 * U, 3),
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.6 },
            );
        }

        pen.polygon(
            g,
            [S(10.8, 11.7), S(16.6, 13.7), S(16.6, 14.2), S(10.8, 12.15)],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.4 },
        );
        pen.polygon(
            g,
            [S(10.8, 12.15), S(16.6, 14.2), S(16.6, 14.75), S(10.8, 12.7)],
            "ruler",
            pen.fill("tang", "solid"),
            { strokeWidth: 2 },
        );

        pen.polygon(
            g,
            [S(2, 0.6), S(7, 0.6), S(5.2, 2.5), S(5.2, 3.3), S(3.8, 3.3), S(3.8, 2.5)],
            "ruler",
            pen.fill("tang", "solid"),
            { strokeWidth: 2.2 },
        );
        pen.path(g, roundedRect(1.7 * U, 0.35 * U, 5.6 * U, 0.5 * U, 4), "ruler", metal, {
            strokeWidth: 2,
        });

        pen.path(
            g,
            roundedRect(U, 3.2 * U, 12 * U, 9 * U, 10),
            "ruler",
            pen.fill("sky", "solid", { hachureGap: 9, fillWeight: 0.5 }),
            { strokeWidth: 2.8 },
        );
        for (const [x, y] of [
            [1.55, 3.75],
            [12.45, 3.75],
            [1.55, 11.65],
            [12.45, 11.65],
        ] as const) {
            pen.circle(g, x * U, y * U, 7, "ruler", pen.fill("card"), { strokeWidth: 1.1 });
        }

        const [wx, wy] = S(...WINDOW);
        pen.circle(g, wx, wy, 2 * 2.6 * U, "ruler", metal, { strokeWidth: 2.4 });
        pen.circle(g, wx, wy, 2 * GLASS * U, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
        const axis = 0.6,
            ux = Math.cos(axis),
            uy = Math.sin(axis),
            turn = Number(p.turn) || 0;
        const rBig = BIG * PITCH * U,
            rSmall = SMALL * PITCH * U;
        // a tooth of the big cog points along the axis and a gap of the small one faces it, so they mesh at every turn
        cog(c, wx - ux * rSmall, wy - uy * rSmall, BIG, axis + turn * 2 * Math.PI, "mint");
        cog(
            c,
            wx + ux * rBig,
            wy + uy * rBig,
            SMALL,
            axis + Math.PI + Math.PI / SMALL - turn * 2 * Math.PI * (BIG / SMALL),
            "tang",
        );
        const glint = { strokeWidth: 1.8, stroke: c.t["ink-soft"], disableMultiStroke: true };
        pen.arc(g, wx, wy, 3.9 * U, 3.9 * U, Math.PI * 1.56, Math.PI * 1.78, "ruler", glint);
        pen.arc(g, wx, wy, 3.3 * U, 3.3 * U, Math.PI * 1.62, Math.PI * 1.72, "ruler", glint);

        pen.rect(g, 7.6 * U, 4.4 * U, 4.8 * U, 2.2 * U, "ruler", pen.fill("card"), {
            strokeWidth: 2.4,
        });
        const rule = p.rule.trim();
        if (rule) {
            const size = Math.min(26, Math.floor((4.2 * U) / (rule.length * 0.56)));
            num(c, 10 * U, 5.5 * U + size * 0.35, rule, size);
        } else soft(c, 10 * U, 5.5 * U + 10, "?", 28);

        pen.rect(g, 7.9 * U, 2.85 * U, 4.2 * U, 0.5 * U, "ruler", metal, { strokeWidth: 1.8 });
        pen.rect(g, 8.2 * U, 3.0 * U, 3.6 * U, 0.2 * U, "ruler", black, { strokeWidth: 1 });

        const [bx, by] = S(12.4, 2.2);
        if (p.lit) {
            for (const t of [-0.5, -0.25, 0, 0.25, 0.5]) {
                const ang = -Math.PI / 2 + t * Math.PI,
                    cos = Math.cos(ang),
                    sin = Math.sin(ang);
                pen.line(
                    g,
                    bx + cos * 1.0 * U,
                    by + sin * 1.0 * U,
                    bx + cos * 1.5 * U,
                    by + sin * 1.5 * U,
                    "ruler",
                    { strokeWidth: 2.2 },
                );
            }
        }
        pen.rect(g, bx - 0.32 * U, 2.75 * U, 0.64 * U, 0.45 * U, "ruler", metal, {
            strokeWidth: 1.4,
        });
        pen.circle(
            g,
            bx,
            by - 0.05 * U,
            1.35 * U,
            "ruler",
            pen.fill(p.lit ? "glow" : "card", "solid"),
            { strokeWidth: 1.9 },
        );
        pen.path(
            g,
            `M${bx - 5} ${by + 9}V${by}l2.5 -4l2.5 4l2.5 -4l2.5 4V${by + 9}`,
            "ruler",
            null,
            { strokeWidth: 1.1, stroke: c.t["ink-soft"], disableMultiStroke: true },
        );

        const pull = Math.max(0, Math.min(1, Number(p.pull) || 0)),
            swing = ((-50 + 100 * pull) * Math.PI) / 180;
        const [px, py] = S(...PIVOT),
            kx = px + Math.cos(swing) * ARM * U,
            ky = py + Math.sin(swing) * ARM * U;
        pen.path(g, roundedRect(px - 0.45 * U, py - 0.9 * U, 0.9 * U, 1.8 * U, 5), "ruler", metal, {
            strokeWidth: 1.8,
        });
        pen.line(g, px, py, kx, ky, "ruler", { strokeWidth: 5.5 });
        pen.circle(g, kx, ky, 1.2 * U, "ruler", pen.fill("berry", "solid"), { strokeWidth: 2 });
        pen.circle(g, px, py, 0.6 * U, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        pen.circle(g, px, py, 5, "ruler", black, { strokeWidth: 0.8 });

        pen.path(g, roundedRect(10.9 * U, 11.9 * U, 1.8 * U, 0.5 * U, 4), "ruler", black, {
            strokeWidth: 1.2,
        });

        a.hopper = [4.5 * U, 0.6 * U, "up"];
        a.slot = [10 * U, 3.2 * U, "up"];
        a.display = [10 * U, 5.5 * U, "right"];
        a.cogs = [wx, wy, "left"];
        a.bulb = [bx, by, "up"];
        a.lever = [kx, ky, "right"];
        a.chute = [11.8 * U, 12.6 * U, "down"];
        a.out = [16 * U, 14.2 * U, "right"];
        a.foot = [7 * U, 14.6 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A blue machine on legs with a funnel on top, two cogs behind a round window, a lever on its side and a chute to the right${p.lit ? ", its bulb lit" : ", its bulb dark"}.`,
});
