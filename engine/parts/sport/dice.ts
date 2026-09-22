// The dice game's hand: the faces a die shows on top as it rolls, the pips, a rounded rectangle, a die
// drawn part way through a roll and a hinged number standing on its hinge, which the die, the number tile
// and the shut-the-box draw with. Listed as construction in the catalogue suite.
import { group, type Ctx } from "../../ink/surface";
import { num } from "../lettering";

/**
 * The faces a die shows on top as it rolls over and over. Each is next to the one before on a real
 * die, never opposite it, so a tumble only passes through faces a rolling die could show.
 */
export const ROLLING = [1, 2, 3, 6, 5, 4];

const PIPS: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
        [-1, -1],
        [1, 1],
    ],
    3: [
        [-1, -1],
        [0, 0],
        [1, 1],
    ],
    4: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
    ],
    5: [
        [-1, -1],
        [1, -1],
        [0, 0],
        [-1, 1],
        [1, 1],
    ],
    6: [
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
    ],
};

export const rounded = (
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
): string =>
    `M${x + rx} ${y}H${x + w - rx}Q${x + w} ${y} ${x + w} ${y + ry}V${y + h - ry}Q${x + w} ${y + h} ${x + w - rx} ${y + h}` +
    `H${x + rx}Q${x} ${y + h} ${x} ${y + h - ry}V${y + ry}Q${x} ${y} ${x + rx} ${y}Z`;

/** One face, `s` across and `h` tall from `top`, with its pips squashed to that height. A side face is shaded. */
function face<G>(
    c: Ctx<G>,
    cx: number,
    top: number,
    s: number,
    h: number,
    n: number,
    side: boolean,
): void {
    if (h < 1.2) return;
    const r = Math.min(6, s / 5),
        k = h / s;
    const d = rounded(cx - s / 2, top, s, h, r, Math.max(0.6, r * k));
    c.pen.path(c.g, d, "ruler", c.pen.fill("card"), { strokeWidth: 1.8 });
    if (side)
        c.pen.path(
            c.g,
            d,
            "ruler",
            c.pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
            { stroke: "none" },
        );
    if (k < 0.25) return;
    const q = s * 0.27,
        w = s * 0.18;
    for (const [a, b] of PIPS[n] ?? []) {
        c.pen.ellipse(
            c.g,
            cx + a * q,
            top + h / 2 + b * q * k,
            w,
            w * k,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
    }
}

/**
 * A die centred on (cx, cy), `s` across. `roll` counts quarter turns from `n` on top: a whole number
 * is a die at rest, and in between it is tipping over an edge, the face going down foreshortened and
 * the one coming up beside it. `turn` is how far it has spun flat on the table, in degrees.
 */
export function drawDie<G>(
    c: Ctx<G>,
    cx: number,
    cy: number,
    s: number,
    n: number,
    roll: number,
    turn: number,
): void {
    const q = Math.round(roll),
        f = roll - q,
        th = Math.abs(f) * (Math.PI / 2);
    const at = (k: number): number => ROLLING[(((ROLLING.indexOf(n) + k) % 6) + 6) % 6] ?? n;
    const up = s * Math.cos(th),
        side = s * Math.sin(th),
        tall = up + side;
    const on = group(c, { turn: [["rotate", turn.toFixed(2), cx, cy]] }),
        g = on.g;
    // Off the table while it tips: a shadow that grows with how far up the edge it is.
    if (!c.paper && th > 0.02) {
        const lift = Math.sin(th * 2);
        c.pen.ellipse(
            g,
            cx + 2 + lift * 3,
            cy + tall / 2 + 1 + lift * 4,
            s * (0.9 - lift * 0.2),
            s * 0.24,
            "doodle",
            c.pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            { stroke: "none" },
        );
    }
    const top = cy - tall / 2;
    if (f >= 0) {
        face(on, cx, top, s, up, at(q), false);
        face(on, cx, top + up, s, side, at(q + 1), true);
    } else {
        face(on, cx, top, s, side, at(q - 1), true);
        face(on, cx, top + side, s, up, at(q), false);
    }
}

/**
 * One hinged number, standing on its hinge at (cx, hinge). `down` runs from 0, standing with its
 * number to the front, to 1, lying flat face down with its plain back showing below the hinge.
 */
export function drawTile<G>(c: Ctx<G>, cx: number, hinge: number, n: number, down: number): void {
    const w = 44,
        tall = 48,
        back = 14;
    const th = Math.min(1, Math.max(0, down)) * (Math.PI / 2);
    const front = tall * Math.cos(th),
        under = back * Math.sin(th);
    if (under > 0.8) {
        c.pen.path(
            c.g,
            rounded(cx - w / 2, hinge, w, under, 4, Math.min(4, under / 2)),
            "ruler",
            c.pen.fill("tang", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 1.8 },
        );
    }
    if (front > 0.8) {
        c.pen.path(
            c.g,
            rounded(cx - w / 2, hinge - front, w, front, 5, Math.min(5, front / 2)),
            "ruler",
            c.pen.fill("card"),
            { strokeWidth: 2 },
        );
        const k = front / tall;
        if (k > 0.3) {
            const mid = hinge - front / 2;
            num(
                group(c, {
                    turn: [
                        ["translate", 0, mid],
                        ["scale", 1, k.toFixed(3)],
                        ["translate", 0, -mid],
                    ],
                }),
                cx,
                mid + 8,
                n,
                n > 9 ? 21 : 23,
            );
        }
    }
    c.pen.line(c.g, cx - w / 2 - 1, hinge, cx + w / 2 + 1, hinge, "ruler", { strokeWidth: 2.4 });
}
