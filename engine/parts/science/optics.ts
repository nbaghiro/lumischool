// What the light drawings share: a ray with its arrow, a flat mirror, a torch, an eye seen from the
// side and a child's head in profile, which the mirror maze, the periscope, the torch through a sheet
// and how we see draw with.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";

export type Pt = [number, number];

/** A beam of light drawn as a ray: a warm band under an ink line on screen, the ink line alone on paper. */
export function ray<G>(c: Ctx<G>, pts: Pt[], arrowAt = -1): void {
    const { pen, g } = c;
    if (!c.paper) pen.linear(g, pts, "ruler", { strokeWidth: 7, stroke: c.t.glow });
    pen.linear(g, pts, "ruler", { strokeWidth: 2 });
    const k = arrowAt < 0 ? pts.length - 1 : arrowAt;
    const [x0, y0] = pts[k - 1] ?? pts[0] ?? [0, 0],
        [x1, y1] = pts[k] ?? [0, 0];
    const L = Math.hypot(x1 - x0, y1 - y0) || 1,
        ux = (x1 - x0) / L,
        uy = (y1 - y0) / L;
    const hx = arrowAt < 0 ? x1 : (x0 + x1) / 2 + ux * 6,
        hy = arrowAt < 0 ? y1 : (y0 + y1) / 2 + uy * 6;
    pen.polygon(
        g,
        [
            [hx, hy],
            [hx - ux * 12 - uy * 6, hy - uy * 12 + ux * 6],
            [hx - ux * 12 + uy * 6, hy - uy * 12 - ux * 6],
        ],
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1 },
    );
}

/** A flat mirror: a strip of glass from p to q, with short strokes on its back where it is not silvered. */
export function mirrorStrip<G>(c: Ctx<G>, p: Pt, q: Pt, back = 0): void {
    const { pen, g } = c,
        L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1,
        nx = -(q[1] - p[1]) / L,
        ny = (q[0] - p[0]) / L,
        t = 3.5;
    pen.polygon(
        g,
        [
            [p[0] + nx * t, p[1] + ny * t],
            [q[0] + nx * t, q[1] + ny * t],
            [q[0] - nx * t, q[1] - ny * t],
            [p[0] - nx * t, p[1] - ny * t],
        ],
        "ruler",
        pen.fill("sky"),
        { strokeWidth: 1.6 },
    );
    if (back)
        for (let k = 1; k < 5; k++) {
            const x = p[0] + ((q[0] - p[0]) * k) / 5,
                y = p[1] + ((q[1] - p[1]) * k) / 5;
            pen.line(
                g,
                x + nx * t * back,
                y + ny * t * back,
                x + nx * (t + 6) * back - ((q[0] - p[0]) / L) * 4,
                y + ny * (t + 6) * back - ((q[1] - p[1]) / L) * 4,
                "ruler",
                { strokeWidth: 1 },
            );
        }
}

/** A torch pointing along dir from (x, y), which is where its lens is. */
export function torchAt<G>(c: Ctx<G>, x: number, y: number, dir: 1 | -1 = 1): void {
    const { pen, g } = c,
        s = dir;
    pen.polygon(
        g,
        [
            [x, y - 0.55 * U],
            [x - s * 0.6 * U, y - 0.32 * U],
            [x - s * 0.6 * U, y + 0.32 * U],
            [x, y + 0.55 * U],
        ],
        "ruler",
        pen.fill("sky"),
        { strokeWidth: 1.6 },
    );
    pen.polygon(
        g,
        [
            [x - s * 0.6 * U, y - 0.3 * U],
            [x - s * 2.2 * U, y - 0.3 * U],
            [x - s * 2.2 * U, y + 0.3 * U],
            [x - s * 0.6 * U, y + 0.3 * U],
        ],
        "ruler",
        pen.fill("sky"),
        { strokeWidth: 1.6 },
    );
    pen.line(g, x, y - 0.55 * U, x, y + 0.55 * U, "ruler", { strokeWidth: 2.6 });
}

/** An eye seen from the side, looking along dir. */
export function eyeAt<G>(c: Ctx<G>, x: number, y: number, dir: 1 | -1 = -1): void {
    const { pen, g } = c,
        w = 0.75 * U;
    pen.path(
        g,
        `M${x - w} ${y}Q${x} ${y - 0.55 * U} ${x + w} ${y}Q${x} ${y + 0.55 * U} ${x - w} ${y}Z`,
        "ruler",
        pen.fill("card"),
        { strokeWidth: 1.6 },
    );
    pen.circle(g, x + dir * 0.28 * U, y, 0.5 * U, "ruler", pen.fill("sky"), { strokeWidth: 1.2 });
    pen.circle(
        g,
        x + dir * 0.34 * U,
        y,
        5,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );
}

/** A child's head in profile, facing along dir, with its eye at (x, y). */
export function headAt<G>(c: Ctx<G>, x: number, y: number, dir: 1 | -1 = -1): void {
    const { pen, g } = c,
        hx = x - dir * 0.9 * U;
    pen.circle(
        g,
        hx,
        y + 0.2 * U,
        3 * U,
        "pencil",
        pen.fill("tang", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
        { strokeWidth: 1.8 },
    );
    pen.path(
        g,
        `M${hx - 1.4 * U} ${y - 0.3 * U}Q${hx - 0.4 * U} ${y - 2.4 * U} ${hx + 1.45 * U} ${y - 0.2 * U}`,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
        { strokeWidth: 1.6 },
    );
    eyeAt(c, x, y, dir);
}
