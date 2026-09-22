import { starPoints } from "../ink/pen";
import { group, letter, plain, type Ctx } from "../ink/surface";

/** What a teacher's pen or a child's highlighter adds on top of a page or a drawing, in user units. */
export function tick<G>(c: Ctx<G>, x: number, y: number, s = 1): void {
    const points: [number, number][] = [
        [x, y],
        [x + 7 * s, y + 8 * s],
        [x + 22 * s, y - 10 * s],
    ];
    c.pen.linear(c.g, points, "pencil", { stroke: c.paper ? c.t.ink : c.t.ok, strokeWidth: 3 });
}

export function loop<G>(c: Ctx<G>, cx: number, cy: number, w: number, h: number): void {
    c.pen.ellipse(c.g, cx, cy, w, h, "doodle", null, { stroke: c.t.pen, strokeWidth: 2 });
}

/** A highlighter swipe. On paper it prints as a light grey band. */
export function highlight<G>(
    c: Ctx<G>,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width = 10,
): void {
    plain(c, {
        kind: "path",
        d: `M${x1} ${y1}L${x2} ${y2}`,
        fill: "none",
        stroke: c.paper ? "#C8C8C8" : c.t.glow,
        width,
        cap: "round",
        opacity: c.paper ? 0.7 : 0.85,
    });
}

export function tape<G>(c: Ctx<G>, x: number, y: number, w = 60, h = 18, angle = -4): void {
    const turned = group(c, { turn: [["rotate", angle, x + w / 2, y + h / 2]] });
    // the paper grey is the tape's own print grey, lighter than a hatch
    plain(turned, { kind: "rect", x, y, w, h, fill: c.paper ? "#E6E6E6" : "#F1E3AFCC" });
}

export function starSticker<G>(c: Ctx<G>, x: number, y: number, r = 16): void {
    c.pen.polygon(c.g, starPoints(x, y, r), "doodle", c.pen.fill("glow"), { strokeWidth: 2 });
}

export function note<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    w: number,
    lines: readonly string[],
): void {
    const h = lines.length * 20 + 16;
    c.pen.rect(c.g, x, y, w, h, "doodle", c.pen.fill("card"), { strokeWidth: 1.6 });
    tape(c, x + w / 2 - 28, y - 9, 56, 16);
    lines.forEach((s, i) => {
        const at = { x: x + 12, y: y + 24 + i * 20, s, weight: 600, size: 15, fill: c.t.pen };
        letter(c, { ...at, face: "hand", anchor: "start", informal: 100 });
    });
}
