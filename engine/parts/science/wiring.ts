// The parts a circuit is built from: cells on a run of wire, a switch on an upright, the glass of a
// bulb and the rays round a lit one, a crocodile clip and the everyday things held across a gap, which
// the circuit, the series circuit, the conductor tester and the things to test draw with.
import { type Ctx } from "../../ink/surface";
import { type Fill, roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { say } from "../lettering";

export const CELL_W = 1.1 * U,
    CELL_GAP = 0.5 * U;

/** How wide a row of cells is, in user units, from the first long plate to the last short one. */
export const cellsWide = (n: number): number => n * (CELL_W + CELL_GAP) - CELL_GAP;

/** Cells on a run of wire: a long plate and a short one each, starting at x. The wires are the caller's. */
export function cellPlates<G>(c: Ctx<G>, x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
        c.pen.line(c.g, x, y - 1.1 * U, x, y + 1.1 * U, "ruler", { strokeWidth: 3.4 });
        c.pen.line(c.g, x + CELL_W, y - 0.6 * U, x + CELL_W, y + 0.6 * U, "ruler", {
            strokeWidth: 2,
        });
        x += CELL_W + CELL_GAP;
    }
}

/** A switch on an upright run: a hinge at y0, a contact at y1 and the blade, which swings out when open. */
export function switchUp<G>(c: Ctx<G>, x: number, y0: number, y1: number, closed: boolean): void {
    const { pen, g } = c;
    pen.circle(g, x, y0, 8, "ruler", { fill: c.t.ink, fillStyle: "solid" }, { strokeWidth: 0.8 });
    pen.circle(g, x, y1, 8, "ruler", { fill: c.t.ink, fillStyle: "solid" }, { strokeWidth: 0.8 });
    if (closed) pen.line(g, x, y0, x, y1, "ruler", { strokeWidth: 2.8 });
    else pen.line(g, x, y0, x + 1.6 * U, y1 - 0.2 * U, "ruler", { strokeWidth: 2.8 });
}

/** The glass of a bulb: the globe, the filament and the cap. The wires to it are the caller's. */
export function bulbGlass<G>(c: Ctx<G>, x: number, y: number, fill: Fill): void {
    const { pen, g } = c;
    pen.circle(g, x, y, 2.4 * U, "ruler", fill, { strokeWidth: 2.2 });
    pen.path(
        g,
        `M${x - 0.7 * U} ${y + 0.5 * U}L${x - 0.3 * U} ${y - 0.4 * U}L${x + 0.3 * U} ${y + 0.3 * U}L${x + 0.7 * U} ${y - 0.5 * U}`,
        "pencil",
        null,
        { strokeWidth: 1.8 },
    );
    pen.rect(g, x - 0.8 * U, y + 1.1 * U, 1.6 * U, 0.7 * U, "ruler", pen.fill("ink-soft"), {
        strokeWidth: 1.4,
    });
}

/**
 * The rays round a lit bulb: more of them, and longer, is brighter. Lengths are in squares from the
 * middle, and `fan` is how far from upright the outermost ray leans, in radians, so bulbs side by
 * side keep their rays apart.
 */
export function bulbRays<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    n = 6,
    from = 1.7,
    to = 2.4,
    fan = 1.05,
): void {
    const spread = n > 1 ? Math.min(0.42, (2 * fan) / (n - 1)) : 0;
    for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i - (n - 1) / 2) * spread;
        c.pen.line(
            c.g,
            x + from * U * Math.cos(ang),
            y + from * U * Math.sin(ang),
            x + to * U * Math.cos(ang),
            y + to * U * Math.sin(ang),
            "pencil",
            { strokeWidth: 1.5 },
        );
    }
}

/** A crocodile clip, its jaws at (x, y), pointing along `dir` (+1 right, -1 left) and turned by `turn` radians. */
export function croc<G>(c: Ctx<G>, x: number, y: number, dir: number, turn = 0): void {
    const { pen, g } = c,
        cos = Math.cos(turn),
        sin = Math.sin(turn);
    const at = (dx: number, dy: number): [number, number] => [
        x + (dx * cos - dy * sin) * dir,
        y + dx * sin * dir + dy * cos,
    ];
    pen.polygon(
        g,
        [
            at(-1.25 * U, -0.3 * U),
            at(-0.1 * U, -0.1 * U),
            at(0, 0),
            at(-0.1 * U, 0.1 * U),
            at(-1.25 * U, 0.3 * U),
        ],
        "ruler",
        pen.fill("berry"),
        { strokeWidth: 1.4 },
    );
    const [jx, jy] = at(-0.55 * U, 0);
    pen.line(g, jx, jy, x, y, "ruler", { strokeWidth: 1 });
}

/** One thing from the table, drawn about (x, y) inside three and a half squares by two and a half. */
export function thingIcon<G>(c: Ctx<G>, kind: string, x: number, y: number): void {
    const { pen, g } = c,
        soft2 = { strokeWidth: 0.9, stroke: c.t["ink-soft"] };
    if (kind === "nail") {
        pen.polygon(
            g,
            [
                [x - 1.2 * U, y - 0.16 * U],
                [x + 1 * U, y - 0.16 * U],
                [x + 1.5 * U, y],
                [x + 1 * U, y + 0.16 * U],
                [x - 1.2 * U, y + 0.16 * U],
            ],
            "ruler",
            pen.fill("ink-soft"),
            { strokeWidth: 1.4 },
        );
        pen.rect(g, x - 1.5 * U, y - 0.6 * U, 0.3 * U, 1.2 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1.6,
        });
    } else if (kind === "clip") {
        const x0 = x - 1.4 * U,
            x1 = x + 1.4 * U;
        pen.path(
            g,
            `M${x0 + 1.1 * U} ${y + 0.15 * U}H${x1 - 0.6 * U}A${0.15 * U} ${0.15 * U} 0 0 0 ${x1 - 0.6 * U} ${y - 0.15 * U}` +
                `H${x0 + 0.45 * U}A${0.3 * U} ${0.3 * U} 0 0 0 ${x0 + 0.45 * U} ${y + 0.45 * U}H${x1 - 0.45 * U}` +
                `A${0.45 * U} ${0.45 * U} 0 0 0 ${x1 - 0.45 * U} ${y - 0.45 * U}H${x0 + 1.3 * U}`,
            "ruler",
            null,
            { strokeWidth: 2.2, stroke: c.t["ink-soft"] },
        );
    } else if (kind === "foil") {
        const pts: [number, number][] = [
            [-1.3, -0.5],
            [-0.6, -0.75],
            [0.1, -0.55],
            [0.8, -0.8],
            [1.3, -0.4],
            [1.15, 0.25],
            [1.35, 0.7],
            [0.4, 0.6],
            [-0.5, 0.8],
            [-1.25, 0.55],
            [-1.1, 0],
        ];
        pen.polygon(
            g,
            pts.map(([dx, dy]) => [x + dx * U, y + dy * U] as [number, number]),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
            { strokeWidth: 1.5 },
        );
        pen.line(g, x - 0.7 * U, y - 0.4 * U, x + 0.1 * U, y + 0.35 * U, "pencil", soft2);
        pen.line(g, x + 0.3 * U, y - 0.5 * U, x + 0.8 * U, y + 0.2 * U, "pencil", soft2);
    } else if (kind === "coin") {
        pen.circle(g, x, y, 1.6 * U, "ruler", pen.fill("glow"), { strokeWidth: 1.8 });
        pen.circle(g, x, y, 1.05 * U, "ruler", null, { strokeWidth: 0.9, stroke: c.t["glow-ink"] });
    } else if (kind === "ruler") {
        pen.rect(
            g,
            x - 1.8 * U,
            y - 0.38 * U,
            3.6 * U,
            0.76 * U,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.6 },
        );
        for (let k = 1; k < 12; k++) {
            const tx = x - 1.8 * U + k * 0.3 * U;
            pen.line(
                g,
                tx,
                y - 0.38 * U,
                tx,
                y - 0.38 * U + (k % 5 === 0 ? 0.36 : 0.2) * U,
                "ruler",
                { strokeWidth: 0.9 },
            );
        }
    } else if (kind === "eraser") {
        pen.path(
            g,
            roundedRect(x - 1.1 * U, y - 0.55 * U, 2.2 * U, 1.1 * U, 5),
            "ruler",
            pen.fill("berry"),
            { strokeWidth: 1.7 },
        );
        pen.rect(g, x - 0.05 * U, y - 0.62 * U, 1 * U, 1.24 * U, "ruler", pen.fill("sky"), {
            strokeWidth: 1.4,
        });
    } else if (kind === "stick") {
        pen.path(
            g,
            roundedRect(x - 1.7 * U, y - 0.32 * U, 3.4 * U, 0.64 * U, 0.32 * U),
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        pen.line(g, x - 1.2 * U, y - 0.04 * U, x + 1.1 * U, y + 0.03 * U, "pencil", {
            strokeWidth: 0.8,
            stroke: c.t.tang,
        });
    } else if (kind === "marble") {
        pen.circle(g, x, y, 1.3 * U, "ruler", pen.fill("sky"), { strokeWidth: 1.7 });
        pen.arc(g, x + 0.1 * U, y + 0.1 * U, 0.7 * U, 0.5 * U, 0.2, Math.PI * 0.9, "pencil", {
            strokeWidth: 1.3,
            stroke: c.t.mint,
        });
        pen.arc(g, x, y, 0.8 * U, 0.8 * U, Math.PI * 1.1, Math.PI * 1.6, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.card,
        });
    } else if (kind === "candle") {
        const top = y - 0.2 * U;
        pen.rect(g, x - 0.45 * U, top, 0.9 * U, 1.7 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.path(
            g,
            `M${x - 0.45 * U} ${top + 0.1 * U}q${0.2 * U} ${0.1 * U} ${0.2 * U} ${0.5 * U}q0 ${0.2 * U} ${0.12 * U} 0q0 ${-0.4 * U} ${0.2 * U} ${-0.5 * U}`,
            "pencil",
            null,
            { strokeWidth: 1.1 },
        );
        pen.line(g, x, top, x, top - 0.35 * U, "pencil", { strokeWidth: 1.3 });
        pen.path(
            g,
            `M${x} ${top - 1.6 * U}Q${x + 0.55 * U} ${top - 0.8 * U} ${x} ${top - 0.3 * U}Q${x - 0.55 * U} ${top - 0.8 * U} ${x} ${top - 1.6 * U}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.5 },
        );
    } else if (kind === "torch") {
        pen.path(
            g,
            roundedRect(x - 1.7 * U, y - 0.35 * U, 1.9 * U, 0.7 * U, 4),
            "ruler",
            pen.fill("sky"),
            { strokeWidth: 1.7 },
        );
        pen.polygon(
            g,
            [
                [x + 0.2 * U, y - 0.35 * U],
                [x + 0.8 * U, y - 0.62 * U],
                [x + 0.8 * U, y + 0.62 * U],
                [x + 0.2 * U, y + 0.35 * U],
            ],
            "ruler",
            pen.fill("sky"),
            { strokeWidth: 1.7 },
        );
        pen.rect(g, x - 0.9 * U, y - 0.5 * U, 0.4 * U, 0.15 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1,
        });
        for (const dy of [-0.8, 0, 0.8])
            pen.line(g, x + 1.05 * U, y + dy * 0.45 * U, x + 1.7 * U, y + dy * U, "pencil", {
                strokeWidth: 1.5,
            });
    } else if (kind === "lamp") {
        bulbGlass(c, x, y - 0.3 * U, pen.fill("glow"));
        bulbRays(c, x, y - 0.3 * U, 6, 1.5, 1.95);
    } else if (kind === "sun") {
        for (let k = 0; k < 8; k++) {
            const t = (k / 8) * Math.PI * 2;
            pen.line(
                g,
                x + 1.2 * U * Math.cos(t),
                y + 1.2 * U * Math.sin(t),
                x + 1.6 * U * Math.cos(t),
                y + 1.6 * U * Math.sin(t),
                "pencil",
                { strokeWidth: 1.6 },
            );
        }
        pen.circle(g, x, y, 1.9 * U, "pencil", pen.fill("glow"), { strokeWidth: 1.9 });
    } else if (kind === "moon") {
        pen.path(
            g,
            `M${x + 0.2 * U} ${y - 1.08 * U}A${1.1 * U} ${1.1 * U} 0 1 0 ${x + 0.2 * U} ${y + 1.08 * U}A${1.42 * U} ${1.42 * U} 0 0 1 ${x + 0.2 * U} ${y - 1.08 * U}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.8 },
        );
    } else if (kind === "mirror") {
        pen.path(
            g,
            roundedRect(x - 0.17 * U, y + 0.45 * U, 0.34 * U, 1.1 * U, 4),
            "ruler",
            pen.fill("tang"),
            { strokeWidth: 1.4 },
        );
        pen.ellipse(g, x, y - 0.5 * U, 1.8 * U, 2.2 * U, "ruler", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        pen.ellipse(g, x, y - 0.5 * U, 1.35 * U, 1.75 * U, "ruler", pen.fill("sky"), {
            strokeWidth: 1.2,
        });
        pen.line(g, x - 0.35 * U, y - 0.6 * U, x + 0.05 * U, y - 1.05 * U, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.card,
        });
        pen.line(g, x - 0.25 * U, y - 0.2 * U, x + 0.3 * U, y - 0.8 * U, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.card,
        });
    } else {
        pen.path(g, roundedRect(x - 1.2 * U, y - 1.2 * U, 2.4 * U, 2.4 * U, 6), "pencil", null, {
            strokeWidth: 1.4,
            strokeLineDash: [5, 5],
            stroke: c.t["ink-soft"],
        });
        say(c, x, y + 6, "?", 18);
    }
}
