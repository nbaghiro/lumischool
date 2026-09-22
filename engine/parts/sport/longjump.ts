import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, ghost, num, soft } from "../lettering";

/** Squares per metre on the tape: as many as will fit the page, and never fewer than two. */
const perMetre = (max: number): number =>
    Math.max(2, Math.min(5, Math.floor(31 / Math.max(1, max))));

/** A jumper at the top of the flight, leaning back with both legs thrown out in front. */
function jumper<G>(c: Ctx<G>, x: number, y: number, s: number): void {
    const { pen, g } = c;
    const nx = x - 0.42 * s,
        ny = y - 0.85 * s,
        hx = 0.18 * s,
        hy = 0.09 * s;
    pen.polygon(
        g,
        [
            [nx - hx, ny - hy],
            [nx + hx, ny + hy],
            [x + hx, y + hy],
            [x - hx, y - hy],
        ],
        "pencil",
        pen.fill("sky", "solid", { hachureGap: 6 }),
        { strokeWidth: 1.8 },
    );
    pen.curve(
        g,
        [
            [nx, ny + 0.06 * s],
            [x + 0.35 * s, y - 1.2 * s],
            [x + 0.85 * s, y - 1.05 * s],
        ],
        "pencil",
        { strokeWidth: 1.8 },
    );
    pen.curve(
        g,
        [
            [nx, ny + 0.2 * s],
            [x + 0.3 * s, y - 0.95 * s],
            [x + 0.78 * s, y - 0.72 * s],
        ],
        "pencil",
        { strokeWidth: 1.6 },
    );
    pen.curve(
        g,
        [
            [x, y],
            [x + 0.55 * s, y - 0.08 * s],
            [x + 0.95 * s, y - 0.45 * s],
        ],
        "pencil",
        { strokeWidth: 2.2 },
    );
    pen.curve(
        g,
        [
            [x, y],
            [x + 0.5 * s, y + 0.12 * s],
            [x + 0.9 * s, y - 0.12 * s],
        ],
        "pencil",
        { strokeWidth: 2.2 },
    );
    pen.circle(g, nx - 0.1 * s, ny - 0.48 * s, 0.62 * s, "pencil", pen.fill("card"), {
        strokeWidth: 1.8,
    });
}

export const longJump = defineDrawing({
    id: "longjump",
    family: "sport",
    title: "Long jump",
    group: "Structures",
    about: "A pit from the side with the take-off board at zero and a tape along the ground in metres and tenths. One jump is marked, so what is read off is a decimal rather than a whole number of metres.",
    params: { to: 2.4, max: 4 },
    settings: {
        to: { kind: "number", min: 0, max: 15, step: 0.05 },
        max: { kind: "whole", min: 1, max: 15 },
    },
    takes: [
        { label: "2.4 metres", params: { to: 2.4, max: 4 } },
        { label: "A short jump", params: { to: 1.15, max: 3 } },
        { label: "A long one", params: { to: 5.6, max: 7 } },
    ],
    box: (p) => ({ w: Math.ceil(p.max * perMetre(p.max)) + 5, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const W = Math.ceil(p.max * perMetre(p.max)) + 5,
            per = perMetre(p.max) * U;
        const x0 = 3 * U,
            xEnd = x0 + p.max * per,
            ground = 6.8 * U,
            pit = 8.4 * U,
            sy = 9.7 * U;
        const xTo = x0 + Math.min(p.max, Math.max(0, p.to)) * per;
        pen.line(g, 0.5 * U, ground, x0, ground, "pencil", { strokeWidth: 2.4 });
        pen.line(g, xEnd + 0.6 * U, ground, (W - 0.5) * U, ground, "pencil", { strokeWidth: 2.4 });
        pen.rect(
            g,
            x0,
            ground,
            xEnd - x0 + 0.6 * U,
            pit - ground,
            "ruler",
            pen.fill("glow", "solid", { hachureGap: 7, fillWeight: 0.7 }),
            { strokeWidth: 1.8 },
        );
        for (let k = 0; k < 9; k++) {
            const gx = x0 + 0.7 * U + ((xEnd - x0) * k) / 9,
                gy = ground + 0.45 * U + (k % 3) * 7;
            pen.line(g, gx, gy, gx + 11, gy, "doodle", { strokeWidth: 1, stroke: c.t["ink-soft"] });
        }
        // The board is white and its front edge is zero, which is where the tape starts.
        pen.rect(g, x0 - 0.7 * U, ground - 0.26 * U, 0.7 * U, 0.26 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        cap(c, x0 - 0.35 * U, ground - 0.55 * U, "board", 10);
        pen.curve(
            g,
            [
                [x0, ground - 0.25 * U],
                [(x0 + xTo) / 2, ground - 3.3 * U],
                [xTo, ground + 0.1 * U],
            ],
            "pencil",
            { strokeWidth: 2, stroke: c.t.pen },
        );
        jumper(c, (x0 + xTo) / 2, ground - 2.7 * U, 1.7 * U);
        pen.line(g, x0, sy, xEnd, sy, "ruler", { strokeWidth: 1.8 });
        const ticks = Math.round(p.max * 10);
        for (let i = 0; i <= ticks; i++) {
            const x = x0 + (i * per) / 10,
                metre = i % 10 === 0,
                half = i % 5 === 0;
            const arm = metre ? 10 : half ? 7 : 4;
            pen.line(g, x, sy - arm, x, sy + arm, "ruler", { strokeWidth: metre ? 1.6 : 0.9 });
            if (metre) num(c, x, sy + 1.15 * U, i / 10, 13);
        }
        soft(c, xEnd + 0.4 * U, sy + 5, "m", 12, "start");
        ghost(c, `M${x0} ${pit + 0.2 * U}V${sy - 0.5 * U}`, "ruler");
        // The mark in the sand runs down through the tape, so the reading is taken off it and not guessed.
        pen.line(g, xTo, ground - 0.3 * U, xTo, sy + 0.6 * U, "ruler", { strokeWidth: 1.6 });
        const room = xTo < (W - 4.5) * U;
        num(
            c,
            xTo + (room ? 0.35 : -0.35) * U,
            ground - 0.95 * U,
            `${p.to} m`,
            16,
            room ? "start" : "end",
            c.t.pen,
        );
        a.board = [x0, ground - 0.3 * U, "up"];
        a.landing = [xTo, ground, "up"];
        a.jumper = [(x0 + xTo) / 2, ground - 4.6 * U, "up"];
        a.tape = [(x0 + xEnd) / 2, sy, "down"];
        return a;
    },
    describe: () =>
        "A long jump pit seen from the side, a white take-off board, yellow sand, a jumper in the air, and a tape marked in metres along the ground.",
    reads: true,
});
