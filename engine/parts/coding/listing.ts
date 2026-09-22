// The hand a program is drawn with: a line of code in the mono face, the kind of each block and its
// colour, the icons on the blocks, a bug, an oval number, the words of a block and their widths, and
// the block's body and label, which the blocks, the tray, the listing, the code pad, the pixels, the
// variable and the dance draw with.
import { letter, type Ctx } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type TokenName } from "../../paper";
import { type Colour } from "../../coding";

/** A line of a program in the mono face, because a listing is read column by column. */
export const code = <G>(c: Ctx<G>, x: number, y: number, s: string, size = 16, fill = c.t.ink) =>
    letter(c, { x, y, s, face: "mono", weight: 500, size, fill, anchor: "start" });

/** What kind of block a line is, which is its colour on screen and its hatch on paper. */
export type Kind =
    "move" | "pen" | "sound" | "control" | "event" | "vars" | "proc" | "else" | "blank";

export const KIND_FILL: Record<Kind, TokenName> = {
    move: "sky",
    pen: "berry",
    sound: "mint",
    control: "tang",
    event: "glow",
    vars: "card",
    proc: "glow",
    else: "tang",
    blank: "card",
};

export function kindOfLine(text: string): Kind {
    const w = text.trim().toLowerCase().split(/\s+/)[0] ?? "";
    if (!w) return "blank";
    if (
        [
            "right",
            "left",
            "up",
            "down",
            "forward",
            "forwards",
            "back",
            "backward",
            "turn",
            "face",
            "move",
            "go",
            "step",
            "walk",
        ].includes(w)
    )
        return "move";
    if (["pen", "paint", "colour", "color", "fill"].includes(w) || /^\d+$/.test(w)) return "pen";
    if (
        [
            "play",
            "rest",
            "wait",
            "flash",
            "light",
            "say",
            "clap",
            "jump",
            "spin",
            "wave",
            "stamp",
            "hop",
            "bow",
        ].includes(w)
    )
        return "sound";
    if (["repeat", "if", "until"].includes(w)) return "control";
    if (["otherwise", "else"].includes(w)) return "else";
    if (w === "when") return "event";
    if (["define", "to"].includes(w)) return "proc";
    if (["set", "add", "take", "change", "double", "subtract"].includes(w)) return "vars";
    return "proc";
}

export const COLOUR_FILL: Record<Colour, TokenName> = {
    red: "berry",
    blue: "sky",
    green: "mint",
    yellow: "glow",
    orange: "tang",
    black: "ink",
    white: "card",
};

/** A fill for a painted square: the colour on screen, its own hatch on paper, and black stays black. */
export function paintFill<G>(c: Ctx<G>, colour: Colour) {
    if (colour === "black") return { fill: c.t.ink, fillStyle: "solid" as const };
    if (colour === "white") return c.pen.fill("card");
    return c.pen.fill(COLOUR_FILL[colour]);
}

/** A small arrow, drawn in the pencil, pointing along `deg` from (x, y) and `len` long. */
export function arrowIcon<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    deg: number,
    len = 18,
    w = 2.4,
    stroke = c.t.ink,
) {
    const a = (deg * Math.PI) / 180,
        dx = Math.cos(a),
        dy = Math.sin(a);
    const x0 = x - (dx * len) / 2,
        y0 = y - (dy * len) / 2,
        x1 = x + (dx * len) / 2,
        y1 = y + (dy * len) / 2;
    c.pen.line(c.g, x0, y0, x1, y1, "ruler", { strokeWidth: w, stroke });
    for (const s of [-0.62, 0.62]) {
        const b = a + Math.PI + s;
        c.pen.line(c.g, x1, y1, x1 + 7 * Math.cos(b), y1 + 7 * Math.sin(b), "ruler", {
            strokeWidth: w,
            stroke,
        });
    }
}

/** A turning arrow: an arc with a head, clockwise for right and anticlockwise for left. */
export function turnIcon<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    way: "left" | "right" | "around",
    stroke = c.t.ink,
) {
    const r = 7.5,
        cw = way !== "left";
    const from = cw ? Math.PI * 0.95 : Math.PI * 0.05,
        sweep = way === "around" ? Math.PI * 1.55 : Math.PI * 1.15;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
        const t = from + (cw ? 1 : -1) * sweep * (i / 12);
        pts.push([x + r * Math.cos(t), y + r * Math.sin(t)]);
    }
    c.pen.linear(c.g, pts, "ruler", { strokeWidth: 2.2, stroke });
    const [ex, ey] = pts[pts.length - 1] ?? [0, 0],
        [px, py] = pts[pts.length - 2] ?? [0, 0];
    const a = Math.atan2(ey - py, ex - px);
    for (const s of [-0.6, 0.6])
        c.pen.line(
            c.g,
            ex,
            ey,
            ex + 6 * Math.cos(a + Math.PI + s),
            ey + 6 * Math.sin(a + Math.PI + s),
            "ruler",
            { strokeWidth: 2.2, stroke },
        );
}

/** The picture on a block, so a child who cannot read yet can still tell the blocks apart. */
export function blockIcon<G>(c: Ctx<G>, x: number, y: number, line: string) {
    const ws = line.trim().toLowerCase().split(/\s+/);
    const w = ws[0] ?? "",
        { pen, g } = c;
    const dirDeg: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };
    const deg = dirDeg[w],
        next = dirDeg[ws[1] ?? ""];
    if (deg !== undefined) return arrowIcon(c, x, y, deg);
    if (["move", "go", "step", "walk"].includes(w) && next !== undefined)
        return arrowIcon(c, x, y, next);
    if (w === "forward" || w === "forwards" || w === "move" || w === "step") {
        for (const dx of [-4, 3])
            pen.linear(
                g,
                [
                    [x + dx - 3, y - 6],
                    [x + dx + 3, y],
                    [x + dx - 3, y + 6],
                ],
                "ruler",
                { strokeWidth: 2.4 },
            );
        return;
    }
    if (w === "back" || w === "backward") {
        for (const dx of [-3, 4])
            pen.linear(
                g,
                [
                    [x + dx + 3, y - 6],
                    [x + dx - 3, y],
                    [x + dx + 3, y + 6],
                ],
                "ruler",
                { strokeWidth: 2.4 },
            );
        return;
    }
    if (w === "turn")
        return turnIcon(
            c,
            x,
            y,
            ws[1] === "left" ? "left" : ws[1] === "right" ? "right" : "around",
        );
    if (w === "face") return arrowIcon(c, x, y, dirDeg[ws[1] ?? "right"] ?? 0);
    if (w === "pen") {
        const up = ws[1] === "up";
        pen.polygon(
            g,
            [
                [x - 3, y - 9 + (up ? -3 : 0)],
                [x + 3, y - 9 + (up ? -3 : 0)],
                [x + 3, y + 3 + (up ? -3 : 0)],
                [x, y + 8 + (up ? -3 : 0)],
                [x - 3, y + 3 + (up ? -3 : 0)],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
        if (!up) pen.line(g, x - 8, y + 9, x + 8, y + 9, "pencil", { strokeWidth: 1.6 });
        return;
    }
    if (w === "paint" || w === "colour" || w === "color" || w === "fill" || /^\d+$/.test(w)) {
        const colour =
            (["red", "blue", "green", "yellow", "orange", "black", "white"] as const).find((k) =>
                ws.includes(k),
            ) ?? "red";
        pen.rect(g, x - 7, y - 7, 14, 14, "ruler", paintFill(c, colour), { strokeWidth: 1.6 });
        return;
    }
    if (w === "repeat") {
        if (ws[1] === "until") {
            turnIcon(c, x - 1, y, "right");
            pen.line(g, x + 7, y - 8, x + 7, y + 8, "ruler", { strokeWidth: 2.2 });
            return;
        }
        return turnIcon(c, x, y, "around");
    }
    if (w === "if") {
        pen.polygon(
            g,
            [
                [x, y - 8],
                [x + 8, y],
                [x, y + 8],
                [x - 8, y],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
        letter(c, {
            x,
            y: y + 4,
            s: "?",
            face: "read",
            weight: 700,
            size: 11,
            fill: c.t.ink,
            anchor: "middle",
        });
        return;
    }
    if (w === "when") {
        if (ws.includes("flag")) {
            pen.line(g, x - 5, y + 9, x - 5, y - 9, "ruler", { strokeWidth: 2 });
            pen.polygon(
                g,
                [
                    [x - 5, y - 9],
                    [x + 8, y - 5],
                    [x - 5, y - 1],
                ],
                "ruler",
                pen.fill("mint"),
                { strokeWidth: 1.5 },
            );
        } else {
            pen.circle(g, x, y, 8, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
            pen.arc(g, x, y, 18, 18, -Math.PI * 0.8, -Math.PI * 0.2, "pencil", {
                strokeWidth: 1.4,
            });
        }
        return;
    }
    if (w === "play") {
        pen.ellipse(
            g,
            x - 3,
            y + 5,
            9,
            7,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1.2 },
        );
        pen.line(g, x + 1.2, y + 5, x + 1.2, y - 9, "ruler", { strokeWidth: 1.8 });
        pen.line(g, x + 1.2, y - 9, x + 7, y - 5, "ruler", { strokeWidth: 1.8 });
        return;
    }
    // the lamp lit in its colour, with rays, so a pictures-only listing still says which colour
    if (w === "light") {
        const colour =
            (["red", "blue", "green", "yellow", "orange", "black", "white"] as const).find((k) =>
                ws.includes(k),
            ) ?? "white";
        pen.circle(g, x, y + 2, 12, "ruler", paintFill(c, colour), { strokeWidth: 1.6 });
        for (const deg of [200, 250, 290, 340]) {
            const a = (deg * Math.PI) / 180;
            pen.line(
                g,
                x + Math.cos(a) * 7.5,
                y + 2 + Math.sin(a) * 7.5,
                x + Math.cos(a) * 10,
                y + 2 + Math.sin(a) * 10,
                "pencil",
                { strokeWidth: 1.3 },
            );
        }
        return;
    }
    if (w === "say") {
        pen.path(g, roundedRect(x - 9, y - 7, 18, 11, 4), "ruler", pen.fill("card"), {
            strokeWidth: 1.5,
        });
        pen.linear(
            g,
            [
                [x - 4, y + 4],
                [x - 6, y + 9],
                [x + 1, y + 4],
            ],
            "ruler",
            { strokeWidth: 1.5 },
        );
        return;
    }
    if (["clap", "jump", "spin", "wave", "stamp", "hop", "bow", "rest", "wait"].includes(w))
        return danceIcon(c, x, y, w);
    if (["set", "add", "take", "change", "double", "subtract"].includes(w)) {
        pen.rect(g, x - 8, y - 6, 16, 13, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        pen.line(g, x - 8, y - 2, x + 8, y - 2, "ruler", { strokeWidth: 1.2 });
        return;
    }
    // a block of the child's own making: two small blocks stacked
    pen.rect(g, x - 7, y - 8, 14, 7, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
    pen.rect(g, x - 7, y + 1, 14, 7, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
}

export function danceIcon<G>(c: Ctx<G>, x: number, y: number, w: string) {
    const { pen, g } = c;
    if (w === "clap") {
        pen.ellipse(g, x - 4, y, 7, 13, "ruler", pen.fill("card"), { strokeWidth: 1.5 });
        pen.ellipse(g, x + 4, y, 7, 13, "ruler", pen.fill("card"), { strokeWidth: 1.5 });
        for (const [dx, dy] of [
            [-9, -8],
            [9, -8],
            [0, -11],
        ] as const)
            pen.line(g, x + dx * 0.7, y + dy * 0.7, x + dx, y + dy, "pencil", { strokeWidth: 1.3 });
    } else if (w === "jump" || w === "hop") {
        pen.arc(g, x, y + 6, 18, w === "jump" ? 26 : 14, Math.PI, Math.PI * 2, "ruler", {
            strokeWidth: 2,
        });
        pen.line(g, x - 9, y + 8, x + 9, y + 8, "pencil", { strokeWidth: 1.4 });
    } else if (w === "spin") {
        turnIcon(c, x, y, "around");
    } else if (w === "wave") {
        pen.curve(
            g,
            [
                [x - 9, y + 2],
                [x - 4, y - 4],
                [x + 1, y + 3],
                [x + 6, y - 4],
                [x + 9, y - 1],
            ],
            "ruler",
            { strokeWidth: 2 },
        );
    } else if (w === "stamp") {
        pen.path(
            g,
            `M${x - 5} ${y - 8}Q${x + 2} ${y - 9} ${x + 2} ${y}L${x + 7} ${y + 2}Q${x + 8} ${y + 7} ${x + 3} ${y + 7}L${x - 5} ${y + 7}Z`,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.5 },
        );
    } else if (w === "bow") {
        pen.arc(g, x, y + 4, 20, 20, Math.PI * 1.1, Math.PI * 1.9, "ruler", { strokeWidth: 2 });
        arrowIcon(c, x + 6, y + 2, 110, 10, 1.8);
    } else {
        pen.line(g, x - 7, y, x + 7, y, "ruler", { strokeWidth: 2.4 });
    }
}

/** A small ladybird with its spots, for the line a bug is on. */
export function bug<G>(c: Ctx<G>, x: number, y: number) {
    const { pen, g } = c;
    pen.ellipse(g, x, y, 15, 12, "pencil", pen.fill("berry"), { strokeWidth: 1.4 });
    pen.circle(
        g,
        x + 8,
        y,
        5.5,
        "pencil",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1 },
    );
    pen.line(g, x - 7, y, x + 6, y, "pencil", { strokeWidth: 1 });
    for (const [dx, dy] of [
        [-3, -3],
        [-3, 3],
        [2, -2.5],
        [2, 2.5],
    ] as const)
        pen.circle(
            g,
            x + dx,
            y + dy,
            2,
            "pencil",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
}

/** A number written in a small white oval, which is how a block shows what a child can change. */
export function oval<G>(c: Ctx<G>, x: number, y: number, s: string, size = 15): number {
    const w = Math.max(20, s.length * size * 0.62 + 12);
    c.pen.path(
        c.g,
        roundedRect(x, y - 9, w, 18, 9),
        "ruler",
        { fill: c.t.card, fillStyle: "solid" },
        { strokeWidth: 1.3 },
    );
    letter(c, {
        x: x + w / 2,
        y: y + 5,
        s,
        face: "read",
        weight: 700,
        size,
        fill: c.t.ink,
        anchor: "middle",
    });
    return w;
}

export const tokens = (line: string): string[] => line.trim().split(/\s+/).filter(Boolean);

/** How wide a letter of the reading face runs at weight 600, as a share of its size. */
export const WORD_W = 0.6;

export const isNumber = (t: string): boolean => /^-?\d+$/.test(t);

/** The width of a block's words and ovals, in user units, by the same estimate the layout uses. */
export function labelWidth(line: string, words: boolean, size = 15): number {
    const ts = tokens(line);
    if (!words)
        return ts
            .filter(isNumber)
            .reduce((n, t) => n + Math.max(20, t.length * size * 0.62 + 12) + 4, 0);
    return ts.reduce(
        (n, t) =>
            n +
            (isNumber(t)
                ? Math.max(20, t.length * size * 0.62 + 12) + 6
                : t.length * size * WORD_W + 7),
        0,
    );
}

export const BLOCK_H = 2;

/** The outline of one block: a notch on top, a tab underneath, and round corners. */
export function blockPath(
    x: number,
    y: number,
    w: number,
    h: number,
    o: { notch: boolean; tab: boolean; hat?: boolean },
): string {
    const r = 6,
        n = 12;
    const top = o.hat
        ? `M${x} ${y + 8}Q${x + 22} ${y - 10} ${x + 44} ${y + 4}H${x + w - r}Q${x + w} ${y + 4} ${x + w} ${y + 4 + r}`
        : `M${x} ${y + r}Q${x} ${y} ${x + r} ${y}${o.notch ? `H${x + n}l4 5h10l4 -5` : ""}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}`;
    const bottom = `V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}${o.tab ? `H${x + n + 18}l-4 5h-10l-4 -5` : ""}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}Z`;
    return top + bottom;
}

/** The outline of a C block's head, its arm and its foot, drawn as one shape round its mouth. */
export function cPath(
    x: number,
    y: number,
    w: number,
    arm: number,
    mouthTop: number,
    mouthBottom: number,
    footW: number,
    footH: number,
    elseRows: [number, number, number][] = [],
): string {
    const r = 6,
        n = 12;
    let d = `M${x} ${y + r}Q${x} ${y} ${x + r} ${y}H${x + n}l4 5h10l4 -5H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}`;
    d += `V${mouthTop - r}Q${x + w} ${mouthTop} ${x + w - r} ${mouthTop}H${x + arm + n + 18}l-4 5h-10l-4 -5H${x + arm + r}Q${x + arm} ${mouthTop} ${x + arm} ${mouthTop + r}`;
    for (const [top, bottom, ew] of elseRows) {
        d += `V${top - r}Q${x + arm} ${top} ${x + arm + r} ${top}H${x + arm + n}l4 5h10l4 -5H${x + ew - r}Q${x + ew} ${top} ${x + ew} ${top + r}`;
        d += `V${bottom - r}Q${x + ew} ${bottom} ${x + ew - r} ${bottom}H${x + arm + n + 18}l-4 5h-10l-4 -5H${x + arm + r}Q${x + arm} ${bottom} ${x + arm} ${bottom + r}`;
    }
    d += `V${mouthBottom - r}Q${x + arm} ${mouthBottom} ${x + arm + r} ${mouthBottom}H${x + arm + n}l4 5h10l4 -5H${x + footW - r}Q${x + footW} ${mouthBottom} ${x + footW} ${mouthBottom + r}`;
    d += `V${mouthBottom + footH - r}Q${x + footW} ${mouthBottom + footH} ${x + footW - r} ${mouthBottom + footH}H${x + n + 18}l-4 5h-10l-4 -5H${x + r}Q${x} ${mouthBottom + footH} ${x} ${mouthBottom + footH - r}Z`;
    return d;
}

/**
 * On screen a block is filled with its kind's colour. On paper the colour would be hatching, and
 * hatching crosses out words, so a block prints white with a hatched tab down its left edge.
 */
export function blockBody<G>(
    c: Ctx<G>,
    d: string,
    kind: Kind,
    x: number,
    y: number,
    h: number,
    dashed = false,
) {
    const { pen, g } = c;
    if (dashed) {
        pen.path(g, d, "ruler", null, {
            strokeWidth: 1.6,
            strokeLineDash: [6, 5],
            stroke: c.t["ink-soft"],
        });
        return;
    }
    if (c.paper) {
        pen.path(g, d, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
        if (kind !== "vars" && kind !== "blank")
            pen.rect(g, x + 2, y + 3, 7, h - 6, "ruler", pen.fill(KIND_FILL[kind]), {
                strokeWidth: 0.8,
                stroke: c.t.card,
            });
    } else {
        pen.path(g, d, "ruler", pen.fill(KIND_FILL[kind]), {
            strokeWidth: kind === "vars" ? 2.2 : 1.8,
        });
    }
}

/** A block's label: its icon, then its words with every number in an oval. */
export function blockLabel<G>(c: Ctx<G>, x: number, y: number, line: string, words: boolean) {
    const mid = y + (BLOCK_H * U) / 2,
        bare = kindOfLine(line) === "else";
    if (!bare) blockIcon(c, x + 20, mid, line);
    let cx = x + (bare ? 14 : 36);
    for (const t of tokens(line)) {
        if (isNumber(t)) {
            cx += oval(c, cx, mid, t) + 6;
            continue;
        }
        if (!words) continue;
        letter(c, {
            x: cx,
            y: mid + 5.5,
            s: t,
            face: "read",
            weight: 600,
            size: 15,
            fill: c.t.ink,
            anchor: "start",
        });
        cx += t.length * 15 * WORD_W + 7;
    }
}
