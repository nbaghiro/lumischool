import { plain, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, soft, wide } from "../lettering";

type Pt = [number, number];

const HEADINGS = ["right", "up", "left", "down"] as const;

const STEP_DIR: Pt[] = [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
];

const MAP_PAD = 3.2;

function mapPoints(p: { heading: string; turns: string[]; stops: string[]; step: number }): Pt[] {
    let dir = Math.max(0, HEADINGS.indexOf(p.heading as (typeof HEADINGS)[number]));
    const pts: Pt[] = [[0, 0]];
    const n = p.stops.length;
    for (let k = 0; k <= n; k++) {
        const [x, y] = pts[pts.length - 1] ?? [0, 0],
            [dx, dy] = STEP_DIR[dir] ?? [0, 0];
        pts.push([x + dx * p.step, y + dy * p.step]);
        const t = p.turns[k] ?? "";
        if (k < n) dir = t === "left" ? (dir + 1) % 4 : t === "right" ? (dir + 3) % 4 : dir;
    }
    return pts;
}

function mapBox(p: { heading: string; turns: string[]; stops: string[]; step: number }) {
    const pts = mapPoints(p),
        xs = pts.map((q) => q[0]),
        ys = pts.map((q) => q[1]);
    const minX = Math.min(...xs),
        minY = Math.min(...ys);
    return {
        w: Math.ceil(Math.max(...xs) - minX + 2 * MAP_PAD),
        h: Math.ceil(Math.max(...ys) - minY + 2 * MAP_PAD + 0.6),
        ox: MAP_PAD - minX,
        oy: MAP_PAD - minY,
        pts,
    };
}

function landmark<G>(c: Ctx<G>, kind: string, x: number, y: number): void {
    const { pen, g } = c;
    if (kind === "tree") {
        pen.rect(g, x - 4, y + 2, 8, 16, "pencil", pen.fill("tang"), { strokeWidth: 1.4 });
        pen.circle(g, x, y - 6, 34, "pencil", pen.fill("mint"), { strokeWidth: 1.6 });
    } else if (kind === "palm") {
        pen.curve(
            g,
            [
                [x - 2, y + 18],
                [x + 2, y + 4],
                [x, y - 10],
            ],
            "pencil",
            { strokeWidth: 3 },
        );
        for (const s of [-1, 1])
            for (const t of [0.4, 1])
                pen.curve(
                    g,
                    [
                        [x, y - 10],
                        [x + s * 10 * t, y - 18],
                        [x + s * 18 * t, y - 8 - 6 * t],
                    ],
                    "pencil",
                    { strokeWidth: 2.2, stroke: c.t.ink },
                );
    } else if (kind === "rock") {
        pen.path(
            g,
            `M${x - 17} ${y + 14}L${x - 12} ${y - 4}L${x - 2} ${y - 11}L${x + 11} ${y - 6}L${x + 17} ${y + 14}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.8 },
        );
    } else if (kind === "bridge") {
        pen.path(g, `M${x - 20} ${y + 12}Q${x} ${y - 4} ${x + 20} ${y + 12}`, "pencil", null, {
            strokeWidth: 2.4,
        });
        pen.line(g, x - 20, y + 4, x + 20, y + 4, "pencil", { strokeWidth: 2 });
        for (const k of [-12, 0, 12])
            pen.line(g, x + k, y + 4, x + k, y + 9 - Math.abs(k) / 3, "pencil", {
                strokeWidth: 1.4,
            });
        pen.curve(
            g,
            [
                [x - 6, y + 20],
                [x, y + 14],
                [x + 8, y + 20],
            ],
            "pencil",
            { stroke: c.t.sky, strokeWidth: 2 },
        );
    } else if (kind === "cave") {
        pen.path(
            g,
            `M${x - 20} ${y + 14}Q${x - 18} ${y - 14} ${x} ${y - 14}Q${x + 18} ${y - 14} ${x + 20} ${y + 14}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            `M${x - 8} ${y + 14}Q${x - 8} ${y - 2} ${x} ${y - 2}Q${x + 8} ${y - 2} ${x + 8} ${y + 14}Z`,
            "pencil",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1.2 },
        );
    } else if (kind === "hut") {
        pen.rect(g, x - 12, y - 2, 24, 16, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [x - 16, y - 2],
                [x, y - 16],
                [x + 16, y - 2],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.6 },
        );
        pen.rect(g, x - 3, y + 4, 7, 10, "pencil", null, { strokeWidth: 1.2 });
    } else if (kind === "pond") {
        pen.ellipse(g, x, y + 4, 40, 24, "pencil", pen.fill("sky"), { strokeWidth: 1.6 });
        pen.curve(
            g,
            [
                [x - 10, y + 2],
                [x - 4, y - 1],
                [x + 2, y + 2],
            ],
            "pencil",
            { strokeWidth: 1.2, stroke: c.t.card },
        );
    } else if (kind === "gate") {
        for (const k of [-14, 14])
            pen.line(g, x + k, y - 12, x + k, y + 14, "pencil", { strokeWidth: 2.2 });
        for (const k of [-6, 2, 10])
            pen.line(g, x - 14, y + k, x + 14, y + k, "pencil", { strokeWidth: 1.6 });
        pen.line(g, x - 14, y + 10, x + 14, y - 6, "pencil", { strokeWidth: 1.6 });
    } else if (kind === "tent") {
        pen.polygon(
            g,
            [
                [x - 18, y + 14],
                [x, y - 14],
                [x + 18, y + 14],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.8 },
        );
        pen.polygon(
            g,
            [
                [x - 5, y + 14],
                [x, y + 2],
                [x + 5, y + 14],
            ],
            "pencil",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
    } else {
        pen.ellipse(
            g,
            x,
            y + 10,
            30,
            10,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.4 },
        );
        pen.rect(g, x - 12, y - 6, 24, 16, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        pen.line(g, x - 14, y - 12, x + 14, y - 12, "pencil", { strokeWidth: 2 });
        for (const s of [-1, 1])
            pen.line(g, x + s * 12, y - 12, x + s * 12, y - 6, "pencil", { strokeWidth: 1.6 });
    }
}

export const treasureMap = defineDrawing({
    id: "treasuremap",
    family: "writing",
    title: "Treasure map",
    group: "Structures",
    about: "A path from a landing boat past numbered landmarks to an X, drawn from the turns it takes: `turns` says left, right or on at each landmark and the path bends to match. Directions a child writes can be followed on it, and a question about which way to turn at the bridge reads its answer off the setting that drew the bridge.",
    params: {
        stops: ["tree", "rock", "bridge"],
        turns: ["left", "right", "left"],
        heading: "right",
        step: 5,
        names: true,
    },
    settings: {
        stops: { kind: "words", most: 5 },
        turns: { kind: "words", most: 5, of: ["left", "right", "on"] },
        heading: { kind: "one of", of: HEADINGS },
        step: { kind: "whole", min: 3, max: 8 },
        names: { kind: "flag" },
    },
    takes: [
        {
            label: "Three stops",
            params: {
                stops: ["tree", "rock", "bridge"],
                turns: ["left", "right", "left"],
                heading: "right",
                step: 5,
                names: true,
            },
        },
        {
            label: "Four stops, going up",
            params: {
                stops: ["palm", "cave", "pond", "hut"],
                turns: ["right", "left", "left", "right"],
                heading: "up",
                step: 4,
                names: true,
            },
        },
    ],
    box: (p) => {
        const b = mapBox(p);
        return { w: b.w, h: b.h };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            b = mapBox(p);
        const P = (q: Pt): Pt => [(q[0] + b.ox) * U, (q[1] + b.oy) * U];
        pen.path(
            g,
            roundedRect(0.3 * U, 0.3 * U, (b.w - 0.6) * U, (b.h - 0.6) * U, 14),
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            roundedRect(1.1 * U, 1.1 * U, (b.w - 2.2) * U, (b.h - 2.2) * U, 40),
            "doodle",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            roundedRect(1.1 * U, 1.1 * U, (b.w - 2.2) * U, (b.h - 2.2) * U, 40),
            "doodle",
            pen.fill("glow", "hachure", { hachureGap: 10, fillWeight: 0.6 }),
            { strokeWidth: 0.1, stroke: "none" },
        );
        const cxn = (b.w - 1.4) * U,
            cyn = 1.6 * U;
        pen.line(g, cxn, cyn + 12, cxn, cyn - 12, "pencil", { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [cxn - 5, cyn - 5],
                [cxn, cyn - 14],
                [cxn + 5, cyn - 5],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.2 },
        );
        cap(c, cxn, cyn + 26, "N", 12);
        const pts = b.pts.map(P);
        for (let i = 1; i < pts.length; i++) {
            const [x0, y0] = pts[i - 1] ?? [0, 0],
                [x1, y1] = pts[i] ?? [0, 0];
            pen.line(g, x0, y0, x1, y1, "pencil", {
                strokeWidth: 2.4,
                strokeLineDash: [8, 7],
                stroke: c.t.pen,
            });
            const mx = (x0 + x1) / 2,
                my = (y0 + y1) / 2,
                ang = Math.atan2(y1 - y0, x1 - x0);
            for (const s of [-1, 1]) {
                const t = ang + Math.PI + s * 0.5;
                pen.line(
                    g,
                    mx + 6 * Math.cos(ang),
                    my + 6 * Math.sin(ang),
                    mx + 6 * Math.cos(ang) + 11 * Math.cos(t),
                    my + 6 * Math.sin(ang) + 11 * Math.sin(t),
                    "pencil",
                    { stroke: c.t.pen, strokeWidth: 2 },
                );
            }
        }
        const [sx, sy] = pts[0] ?? [0, 0];
        pen.path(g, `M${sx - 18} ${sy + 2}h36l-7 11h-22Z`, "pencil", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        pen.line(g, sx, sy + 2, sx, sy - 18, "pencil", { strokeWidth: 1.8 });
        pen.polygon(
            g,
            [
                [sx + 2, sy - 17],
                [sx + 14, sy - 2],
                [sx + 2, sy - 2],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        if (p.names) {
            patch(c, sx, sy + 1.75 * U, wide("start", 14) + 6, 18);
            soft(c, sx, sy + 1.95 * U, "start", 14);
        }
        a.start = [sx, sy - U, "up"];
        p.stops.forEach((kind, i) => {
            const [x, y] = pts[i + 1] ?? [0, 0];
            plain(c, { kind: "circle", cx: x, cy: y, r: 30, fill: c.t.card });
            landmark(
                group(c, {
                    turn: [
                        ["translate", x, y],
                        ["scale", 1.35],
                        ["translate", -x, -y],
                    ],
                }),
                kind,
                x,
                y,
            );
            pen.circle(g, x + 27, y - 24, 22, "ruler", pen.fill("card"), {
                strokeWidth: 1.3,
                stroke: c.t.pen,
            });
            num(c, x + 27, y - 19, i + 1, 14, "middle", c.t.pen);
            if (p.names) {
                patch(c, x, y + 1.75 * U, wide(kind, 14) + 6, 18);
                soft(c, x, y + 1.95 * U, kind, 14);
            }
            a[`stop(${i + 1})`] = [x, y - U, "up"];
        });
        const [ex, ey] = pts[pts.length - 1] ?? [0, 0];
        for (const s of [-1, 1])
            pen.line(g, ex - 14, ey - 14 * s, ex + 14, ey + 14 * s, "pencil", {
                stroke: c.paper ? c.t.ink : c.t.berry,
                strokeWidth: 4.5,
            });
        pen.path(g, roundedRect(ex + 12, ey - 2, 22, 15, 3), "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        a.x = [ex, ey - U, "up"];
        return a;
    },
    describe: () =>
        "A treasure map with a path drawn from a boat at the shore past numbered landmarks to a cross, the path bending at each landmark it passes.",
});
