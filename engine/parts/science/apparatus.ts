// What the chemistry drawings draw with: the liquid in a glass and the glass round it, its gleam, a
// bubble, a paint-box fill, a lettered tag, a crystal, an ice cube, a curl of steam, a nail, a candle,
// the pieces of a mixture and an atom as a ball, which the beakers, jars, tubes and the pictures of a
// change share.
import { plain, type Ctx } from "../../ink/surface";
import { type Fill, rng, roundedRect } from "../../ink/pen";
import { U, type FillStyle, type Marker } from "../../paper";
import { colourOf, paintFill } from "../../pigment";
import { num, patch, say } from "../lettering";
import { MIXABLES } from "./substances";

export type Pt = [number, number];

/** Whatever is in the glass. One colour throughout, so a level is never ambiguous. */
export const LIQUID: Marker = "sky";

/** A fill that keeps a big area light in print, where a marker becomes hatching: the hatch is spread twice as far. */
export const lightFill = <G>(
    c: Ctx<G>,
    token: Marker | "ink-soft",
    style: FillStyle = "hachure",
    gap = 5,
): Fill => c.pen.fill(token, style, { hachureGap: c.paper ? gap * 2 : gap });

/** An open glass with straight sides and a rounded floor, as a path. */
export const glassPath = (lx: number, rx: number, top: number, bottom: number, r = 12): string =>
    `M${lx} ${top}V${bottom - r}Q${lx} ${bottom} ${lx + r} ${bottom}H${rx - r}Q${rx} ${bottom} ${rx} ${bottom - r}V${top}`;

/** What is in a glass, from its level down to the floor, inset so the glass's own line stays crisp. */
export function liquid<G>(
    c: Ctx<G>,
    lx: number,
    rx: number,
    level: number,
    bottom: number,
    fill: Fill,
    r = 12,
    line = true,
): void {
    const i = 3,
        h = bottom - i - level;
    if (h <= 1) return;
    const rr = Math.max(0, Math.min(r - i, h));
    c.pen.path(
        c.g,
        `M${lx + i} ${level}V${bottom - i - rr}Q${lx + i} ${bottom - i} ${lx + i + rr} ${bottom - i}H${rx - i - rr}Q${rx - i} ${bottom - i} ${rx - i} ${bottom - i - rr}V${level}Z`,
        "ruler",
        fill,
        { strokeWidth: 0 },
    );
    if (line) c.pen.line(c.g, lx + i, level, rx - i, level, "ruler", { strokeWidth: 1.8 });
}

/** The white streak that makes an outline read as glass. Screen only: on paper it would be a gap in the hatching. */
export function gleam<G>(c: Ctx<G>, x: number, y1: number, y2: number, w = 3): void {
    if (c.paper) return;
    plain(c, {
        kind: "path",
        d: `M${x} ${y1}L${x} ${y2}`,
        fill: "none",
        stroke: "#FFFFFF",
        width: w,
        cap: "round",
        opacity: 0.8,
    });
}

/** A bubble: a white ring with a darker edge, so it reads on a coloured liquid and in print. */
export const bubble = <G>(c: Ctx<G>, x: number, y: number, d: number): void =>
    c.pen.circle(c.g, x, y, d, "pencil", c.pen.fill("card"), {
        strokeWidth: 1.1,
        stroke: c.t["ink-soft"],
    });

/** A lettered tag under a row of things, with a patch so hatching never crosses it. */
export function lettered<G>(c: Ctx<G>, x: number, y: number, i: number): void {
    patch(c, x, y - 5, 24, 20);
    say(c, x, y, "ABCDEFGH"[i] ?? "?", 17);
}

/** A colour from the paint box, as a fill: the same mixing as the art lessons, and its family's hatch on paper. */
export const paint = <G>(c: Ctx<G>, recipe: string): Fill =>
    paintFill(c, colourOf(recipe) ?? "#8CC7EF");

/** An ellipse turned by `deg` degrees, as a path, for grains that do not lie square to the page. */
export const ellipsePath = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    deg: number,
): string => {
    const t = (deg * Math.PI) / 180,
        dx = Math.cos(t) * rx,
        dy = Math.sin(t) * rx;
    return `M${cx + dx} ${cy + dy}A${rx} ${ry} ${deg} 1 0 ${cx - dx} ${cy - dy}A${rx} ${ry} ${deg} 1 0 ${cx + dx} ${cy + dy}Z`;
};

/** A box seen from above and to the side: a front, a top and a right face, for salt and sugar grains. */
export function crystal<G>(c: Ctx<G>, x: number, y: number, w: number, h: number, skew = 0): void {
    const { pen, g } = c,
        dx = h * 0.42,
        dy = h * 0.34;
    const front: [Pt, Pt, Pt, Pt] = [
        [x - w / 2 + skew, y - h / 2],
        [x + w / 2 + skew, y - h / 2],
        [x + w / 2 - skew, y + h / 2],
        [x - w / 2 - skew, y + h / 2],
    ];
    pen.polygon(
        g,
        [
            front[0],
            [front[0][0] + dx, front[0][1] - dy],
            [front[1][0] + dx, front[1][1] - dy],
            front[1],
        ],
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
        { strokeWidth: 1.3 },
    );
    pen.polygon(
        g,
        [
            front[1],
            [front[1][0] + dx, front[1][1] - dy],
            [front[2][0] + dx, front[2][1] - dy],
            front[2],
        ],
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
        { strokeWidth: 1.3 },
    );
    pen.polygon(g, front, "pencil", pen.fill("card"), { strokeWidth: 1.5 });
}

/** An ice cube seen from above and to one side, with its base on `base`; `round` softens the corners of one that is melting. */
export function iceCube<G>(c: Ctx<G>, x: number, base: number, s: number, round = 4): void {
    const { pen, g } = c,
        dx = s * 0.34,
        dy = s * 0.26,
        l = x - s / 2 - dx / 2,
        top = base - s * 0.9;
    pen.path(
        g,
        `M${l + 5} ${top}L${l + dx + 5} ${top - dy}H${l + s + dx - 5}L${l + s - 5} ${top}Z`,
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 7, fillWeight: 0.6 }),
        { strokeWidth: 1.4 },
    );
    pen.path(
        g,
        `M${l + s - 3} ${top + 2}L${l + s + dx - 3} ${top - dy + 3}V${top + s * 0.9 - dy - 4}L${l + s - 3} ${top + s * 0.9 - 4}Z`,
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 4.5, fillWeight: 0.6 }),
        { strokeWidth: 1.4 },
    );
    pen.path(g, roundedRect(l, top, s, s * 0.9, round), "pencil", pen.fill("card"), {
        strokeWidth: 1.7,
    });
    gleam(c, l + 0.22 * s, top + 0.2 * s, top + 0.55 * s, 2.4);
}

/** Curls of steam or smoke rising from (x, y), for a pan or a candle that has just gone out. */
export function curls<G>(c: Ctx<G>, x: number, y: number, n = 3, h = 1.6 * U): void {
    for (let k = 0; k < n; k++) {
        const x0 = x + (k - (n - 1) / 2) * 0.55 * U;
        c.pen.curve(
            c.g,
            [
                [x0, y],
                [x0 - 5, y - h * 0.3],
                [x0 + 5, y - h * 0.6],
                [x0 - 3, y - h],
            ],
            "pencil",
            { strokeWidth: 1.5, stroke: c.t["ink-soft"] },
        );
    }
}

/** A nail lying on its side from x0 to x1, with rust over `rust` of it (0 to 1), in seeded patches. */
export function nail<G>(
    c: Ctx<G>,
    x0: number,
    x1: number,
    y: number,
    rust: number,
    seed = 3,
): void {
    const { pen, g } = c,
        w = 0.2 * U;
    pen.polygon(
        g,
        [
            [x0 + 0.2 * U, y - w],
            [x1 - 0.45 * U, y - w],
            [x1, y],
            [x1 - 0.45 * U, y + w],
            [x0 + 0.2 * U, y + w],
        ],
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
        { strokeWidth: 1.4 },
    );
    pen.rect(
        g,
        x0,
        y - 0.5 * U,
        0.22 * U,
        U,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
        { strokeWidth: 1.5 },
    );
    if (rust <= 0) {
        gleam(c, x0 + 0.5 * U, y - 2, x1 - 0.8 * U, 1.6);
        return;
    }
    const r = rng(seed),
        n = Math.round(3 + rust * 9);
    for (let k = 0; k < n; k++) {
        const px = x0 + 0.25 * U + r() * (x1 - x0 - 0.6 * U) * Math.min(1, 0.35 + rust),
            py = y + (r() - 0.5) * w * 1.4;
        pen.ellipse(
            g,
            px,
            py,
            (0.25 + r() * 0.35) * U * (0.6 + rust * 0.6),
            (0.16 + r() * 0.12) * U,
            "pencil",
            paint(c, "orange 2 + brown"),
            { strokeWidth: 0.6, stroke: c.paper ? c.t.ink : "#8B5A3C" },
        );
    }
}

/** A candle in a holder with its base on `base`, `tall` squares of wax, lit or not; drips grow with `drips`. */
export function candleOn<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    tall: number,
    lit: boolean,
    drips = 0,
    w = 1.1 * U,
): void {
    const { pen, g } = c,
        top = base - 0.5 * U - tall;
    pen.ellipse(g, x, base - 0.2 * U, w * 2.4, 0.55 * U, "pencil", pen.fill("tang"), {
        strokeWidth: 1.6,
    });
    pen.rect(g, x - w / 2, top, w, base - 0.35 * U - top, "pencil", pen.fill("card"), {
        strokeWidth: 1.8,
    });
    pen.ellipse(g, x, top, w, 0.3 * U, "pencil", pen.fill("card"), { strokeWidth: 1.2 });
    for (let k = 0; k < Math.min(4, drips); k++) {
        const dx = (k % 2 ? 1 : -1) * w * 0.5,
            len = (0.4 + 0.25 * k) * U;
        pen.path(
            g,
            `M${x + dx} ${top + 2}v${len}q0 ${0.22 * U} ${-dx * 0.12} ${0.22 * U}q${-dx * 0.12} 0 ${-dx * 0.12} ${-0.22 * U}v${-len + 4}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.1 },
        );
    }
    pen.line(g, x, top, x, top - 0.3 * U, "pencil", { strokeWidth: 1.6 });
    if (lit) {
        pen.path(
            g,
            `M${x} ${top - 1.5 * U}Q${x + 0.5 * U} ${top - 0.75 * U} ${x} ${top - 0.25 * U}Q${x - 0.5 * U} ${top - 0.75 * U} ${x} ${top - 1.5 * U}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        pen.path(
            g,
            `M${x} ${top - 1.05 * U}Q${x + 0.25 * U} ${top - 0.62 * U} ${x} ${top - 0.35 * U}Q${x - 0.25 * U} ${top - 0.62 * U} ${x} ${top - 1.05 * U}Z`,
            "pencil",
            lightFill(c, "glow", "solid"),
            { strokeWidth: 1 },
        );
    }
}

/** A handful of one thing from MIXABLES scattered over a region, seeded so the same setting draws the same heap. */
export function pieces<G>(
    c: Ctx<G>,
    thing: string,
    x0: number,
    y0: number,
    w: number,
    h: number,
    n: number,
    seed: number,
): void {
    const { pen, g } = c,
        t = c.t,
        r = rng(seed);
    for (let k = 0; k < n; k++) {
        const x = x0 + r() * w,
            y = y0 + r() * h;
        if (thing === "pebbles")
            pen.path(
                g,
                ellipsePath(x, y, 0.5 * U + r() * 4, 0.36 * U + r() * 3, r() * 40 - 20),
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.3 },
            );
        else if (thing === "peas")
            pen.circle(g, x, y, 0.62 * U, "pencil", pen.fill("mint"), { strokeWidth: 1.2 });
        else if (thing === "rice")
            pen.path(
                g,
                ellipsePath(x, y, 0.36 * U, 0.14 * U, r() * 180),
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1 },
            );
        else if (thing === "cork")
            pen.path(
                g,
                roundedRect(x - 0.35 * U, y - 0.25 * U, 0.7 * U, 0.5 * U, 3),
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.1 },
            );
        else if (thing === "clips")
            pen.path(
                g,
                roundedRect(x - 0.4 * U, y - 0.14 * U, 0.8 * U, 0.28 * U, 0.14 * U),
                "pencil",
                null,
                { strokeWidth: 1.3, stroke: t["ink-soft"] },
            );
        else if (thing === "iron")
            pen.line(g, x - 3, y + 1, x + 3, y - 1, "pencil", { strokeWidth: 1.8, stroke: t.ink });
        else if (thing === "salt" || thing === "sugar")
            pen.rect(g, x - 2.5, y - 2.5, 5, 5, "pencil", pen.fill("card"), { strokeWidth: 0.9 });
        else if (thing === "flour")
            pen.circle(
                g,
                x,
                y,
                2.2,
                "pencil",
                { fill: t["ink-soft"], fillStyle: "solid" },
                { strokeWidth: 0.2 },
            );
        else
            pen.circle(
                g,
                x,
                y,
                3,
                "pencil",
                { fill: c.paper ? t.ink : t.tang, fillStyle: "solid" },
                { strokeWidth: 0.3 },
            );
    }
}

/** A low mound of something fine (sand, salt, flour, iron filings) with its grains on top, its base on `base`. */
export function heap<G>(
    c: Ctx<G>,
    thing: string,
    cx: number,
    base: number,
    w: number,
    h: number,
    seed: number,
): void {
    const fills: Record<string, Fill> = {
        sand: lightFill(c, "tang", "hachure", 4),
        iron: c.pen.fill("ink-soft", "hachure", { hachureGap: 2.6, fillWeight: 1 }),
        flour: c.pen.fill("card"),
        salt: c.pen.fill("card"),
        sugar: c.pen.fill("card"),
    };
    c.pen.path(
        c.g,
        `M${cx - w / 2} ${base}Q${cx - w * 0.2} ${base - h * 1.1} ${cx} ${base - h}Q${cx + w * 0.25} ${base - h * 1.1} ${cx + w / 2} ${base}Z`,
        "pencil",
        fills[thing] ?? c.pen.fill("card"),
        { strokeWidth: 1.4 },
    );
    pieces(c, thing, cx - w * 0.35, base - h * 0.75, w * 0.7, h * 0.6, 12, seed);
}

/** How many pieces fill a heap of one thing: few big ones, many grains. */
export const countFor = (thing: string): number =>
    [18, 26, 14, 7][Math.max(0, Math.min(3, 3 - (MIXABLES[thing]?.size ?? 1)))] ?? 12;

/** Atoms as a model draws them: a colour for each element (the usual model-kit colours, as near as the palette goes), a size, and a letter. */
export const ATOMS: Record<
    string,
    { name: string; fill: Marker | "card" | "ink-soft"; r: number }
> = {
    H: { name: "hydrogen", fill: "card", r: 0.42 },
    O: { name: "oxygen", fill: "berry", r: 0.62 },
    C: { name: "carbon", fill: "ink-soft", r: 0.62 },
    N: { name: "nitrogen", fill: "sky", r: 0.6 },
};

/** One atom, as a ball with its letter. */
export function atomBall<G>(
    c: Ctx<G>,
    el0: string,
    x: number,
    y: number,
    scale: number,
    letters: boolean,
): void {
    const a0 = ATOMS[el0];
    if (!a0) return;
    c.pen.circle(
        c.g,
        x,
        y,
        a0.r * 2 * U * scale,
        "pencil",
        c.pen.fill(
            a0.fill,
            a0.fill === "ink-soft" ? "hachure" : "solid",
            a0.fill === "ink-soft" ? { hachureGap: 3 } : {},
        ),
        { strokeWidth: 1.6 },
    );
    if (!c.paper)
        plain(c, {
            kind: "path",
            d: `M${x - a0.r * U * scale * 0.5} ${y - a0.r * U * scale * 0.2}Q${x - a0.r * U * scale * 0.45} ${y - a0.r * U * scale * 0.6} ${x - a0.r * U * scale * 0.05} ${y - a0.r * U * scale * 0.62}`,
            fill: "none",
            stroke: "#FFFFFF",
            width: 2.4,
            cap: "round",
            opacity: 0.85,
        });
    if (letters) {
        const size = Math.round(Math.min(14, a0.r * U * scale * 1.15));
        if (a0.fill === "ink-soft")
            c.pen.circle(c.g, x, y, size * 1.15, "pencil", c.pen.fill("card"), {
                strokeWidth: 0.6,
            });
        else patch(c, x, y - size * 0.3, size + 3, size + 1);
        num(c, x, y + size * 0.35, el0, size);
    }
}
