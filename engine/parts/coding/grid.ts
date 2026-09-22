// The grid a robot or a turtle walks and where its squares are, the group a drawing is made facing
// right and turned to its heading in, the burst where a robot bumps, and the cast that stands on the
// stage, which the maze, the turtle, the stage and the dance draw with and the runner animates.
import { letter, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { soft } from "../lettering";
import { type Dance, type Dir } from "../../coding";

/** Rotation for a heading, in degrees, with right as nought and turning clockwise. */
export const ANGLE: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };

/** A group rotated about a point, so a drawing can be made facing right and turned to any heading. */
export const turnedCtx = <G>(c: Ctx<G>, x: number, y: number, deg: number): Ctx<G> =>
    group(c, {
        turn: [
            ["translate", x.toFixed(1), y.toFixed(1)],
            ["rotate", deg],
        ],
    });

/** A burst where the robot met a rock or the edge, on the line between the two squares. */
export function bump<G>(c: Ctx<G>, x: number, y: number) {
    const { pen, g } = c,
        pts: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
        const r = i % 2 ? 5 : 12,
            t = (i / 16) * Math.PI * 2;
        pts.push([x + r * Math.cos(t), y + r * Math.sin(t)]);
    }
    pen.polygon(g, pts, "pencil", c.paper ? pen.fill("card") : pen.fill("glow"), {
        strokeWidth: 1.6,
    });
    letter(c, {
        x,
        y: y + 5,
        s: "!",
        face: "read",
        weight: 800,
        size: 14,
        fill: c.t.ink,
        anchor: "middle",
    });
}

export interface GridLay {
    x0: number;
    y0: number;
    s: number;
    at(col: number, row: number): [number, number];
}

export const gridLay = (): GridLay => {
    const x0 = 2 * U,
        y0 = 2 * U,
        s = 2 * U;
    return {
        x0,
        y0,
        s,
        at: (col, row) => [x0 + (col - 1) * s + s / 2, y0 + (row - 1) * s + s / 2],
    };
};

export function gridLines<G>(
    c: Ctx<G>,
    cols: number,
    rows: number,
    numbers: boolean,
    a: RawAnchors,
) {
    const L = gridLay(),
        { pen, g } = c;
    if (numbers) {
        for (let k = 0; k < cols; k++) soft(c, L.x0 + k * L.s + U, 1.5 * U, String(k + 1), 13);
        for (let r = 0; r < rows; r++)
            soft(c, 1.4 * U, L.y0 + r * L.s + U + 5, String(r + 1), 13, "end");
    }
    for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++) {
            pen.rect(g, L.x0 + k * L.s, L.y0 + r * L.s, L.s, L.s, "ruler", null, {
                strokeWidth: 1,
                // on paper the grid token is the sheet's own squares, so the cells take the soft ink
                stroke: c.paper ? c.t["ink-soft"] : c.t.grid,
            });
            a[`cell(${r * cols + k})`] = [L.x0 + k * L.s + U, L.y0 + r * L.s, "up"];
        }
    pen.rect(g, L.x0, L.y0, cols * L.s, rows * L.s, "ruler", null, { strokeWidth: 1.8 });
}

/** The centre of a square of a maze or a turtle's grid, in the drawing's own units. */
export const gridAt = (col: number, row: number): [number, number] => gridLay().at(col, row);

/** One of the cast, side on and facing right, in a pose. The runner draws the same figure it moves. */
export function drawActor<G>(
    c: Ctx<G>,
    who: string,
    x: number,
    y: number,
    pose: Dance | "rest",
    face: "left" | "right" = "right",
    size = 1,
): void {
    const t = turnedCtx(c, x, y, 0);
    const k = group(t, { turn: [["scale", face === "left" ? -size : size, size]] });
    const lift = pose === "jump" ? -12 : pose === "hop" ? -6 : 0,
        { pen } = k;
    if (who === "crab") {
        for (const s of [-1, 1])
            for (const dx of [6, 11, 16])
                pen.line(k.g, s * dx * 0.6, lift + 2, s * (dx + 4), lift + 12, "pencil", {
                    strokeWidth: 1.6,
                });
        pen.ellipse(k.g, 0, lift - 2, 32, 20, "pencil", pen.fill("tang"), { strokeWidth: 1.8 });
        const up = pose === "clap" || pose === "wave" ? -14 : 0;
        for (const s of [-1, 1]) {
            pen.line(k.g, s * 13, lift - 6, s * 19, lift - 14 + up, "pencil", { strokeWidth: 1.6 });
            pen.ellipse(
                k.g,
                s * (pose === "clap" ? 8 : 20),
                lift - 18 + up,
                10,
                9,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.5 },
            );
        }
        for (const s of [-1, 1]) {
            pen.line(k.g, s * 4, lift - 11, s * 5, lift - 17, "pencil", { strokeWidth: 1.3 });
            pen.circle(k.g, s * 5, lift - 19, 4.5, "pencil", pen.fill("card"), { strokeWidth: 1 });
        }
    } else if (who === "bot") {
        pen.line(k.g, -6, lift + 8, -6, lift + 18, "pencil", { strokeWidth: 2 });
        pen.line(
            k.g,
            6,
            lift + 8,
            pose === "stamp" ? 12 : 6,
            lift + (pose === "stamp" ? 12 : 18),
            "pencil",
            { strokeWidth: 2 },
        );
        pen.path(k.g, roundedRect(-12, lift - 14, 24, 24, 6), "pencil", pen.fill("sky"), {
            strokeWidth: 1.8,
        });
        pen.path(k.g, roundedRect(-8, lift - 10, 16, 9, 3), "ruler", pen.fill("card"), {
            strokeWidth: 1.2,
        });
        for (const ex of [-3.5, 3.5])
            pen.circle(
                k.g,
                ex,
                lift - 5.5,
                3.2,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
        pen.line(k.g, 0, lift - 14, 0, lift - 20, "pencil", { strokeWidth: 1.4 });
        pen.circle(k.g, 0, lift - 22, 5, "pencil", pen.fill("glow"), { strokeWidth: 1.2 });
        const arms: Record<string, [number, number, number, number]> = {
            clap: [-3, -18, 3, -18],
            wave: [-16, 4, 18, -18],
            rest: [-16, 6, 16, 6],
            jump: [-18, -12, 18, -12],
            bow: [-14, 10, 14, 10],
        };
        const [l1, l2, r1, r2] = arms[pose] ?? arms.rest ?? [0, 0, 0, 0];
        pen.line(k.g, -12, lift - 2, l1, lift + l2, "pencil", { strokeWidth: 2 });
        pen.line(k.g, 12, lift - 2, r1, lift + r2, "pencil", { strokeWidth: 2 });
    } else {
        // the rabbit
        pen.ellipse(k.g, -2, lift + 4, 30, 20, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        pen.circle(k.g, -16, lift + 2, 8, "pencil", pen.fill("card"), { strokeWidth: 1.4 });
        pen.circle(k.g, 12, lift - 7, 16, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        const ear = pose === "wave" || pose === "clap" ? -30 : -26;
        pen.ellipse(k.g, 9, lift + ear + 2, 6, 18, "pencil", pen.fill("berry"), {
            strokeWidth: 1.4,
        });
        pen.ellipse(k.g, 15, lift + ear + 4, 6, 17, "pencil", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        pen.circle(
            k.g,
            16,
            lift - 8,
            3,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        pen.line(k.g, -6, lift + 13, -8, lift + 18, "pencil", { strokeWidth: 1.6 });
        pen.line(
            k.g,
            6,
            lift + 13,
            pose === "stamp" ? 12 : 8,
            lift + (pose === "stamp" ? 14 : 18),
            "pencil",
            { strokeWidth: 1.6 },
        );
        if (pose === "clap" || pose === "wave")
            pen.line(k.g, 6, lift + 2, 12, lift - 12, "pencil", { strokeWidth: 1.6 });
    }
    if (pose === "spin")
        for (const s of [-1, 1])
            pen.arc(
                k.g,
                0,
                lift,
                46,
                30,
                s > 0 ? -0.4 : Math.PI - 0.4,
                s > 0 ? 0.6 : Math.PI + 0.6,
                "pencil",
                { strokeWidth: 1.4, stroke: c.t["ink-soft"] },
            );
    if (pose === "jump" || pose === "hop")
        for (const dx of [-6, 0, 6])
            pen.line(k.g, dx, 24, dx, 28, "pencil", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
}
