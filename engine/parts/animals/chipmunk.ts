import type { Ctx, RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { eye, type Pt } from "./nature";

const POSES = ["stand", "sit", "run", "leap", "climb", "shake", "spit", "hide", "cheer"] as const;
type Pose = (typeof POSES)[number];
const WHO = ["nutmeg", "hazel"] as const;

/** Where the body, the head and the tail sit in each pose, in units of a 60 by 40 box with the feet on its foot. */
interface Shape {
    body: { x: number; y: number; w: number; h: number; tilt: number };
    head: { x: number; y: number };
    /** The tail as a curve from its root, and how bushy it is. */
    tail: [Pt, Pt, Pt, Pt];
    /** Each foot: where the leg leaves the body and where the paw is. */
    legs: [Pt, Pt][];
    mouth?: true;
}

const SHAPES: Record<Pose, Shape> = {
    stand: {
        body: { x: 28, y: 28, w: 30, h: 17, tilt: -0.12 },
        head: { x: 45, y: 20 },
        tail: [
            [15, 27],
            [6, 22],
            [5, 12],
            [11, 6],
        ],
        legs: [
            [
                [20, 31],
                [19, 38],
            ],
            [
                [36, 32],
                [38, 38],
            ],
        ],
    },
    sit: {
        body: { x: 30, y: 26, w: 20, h: 24, tilt: -0.3 },
        head: { x: 40, y: 12 },
        tail: [
            [22, 34],
            [12, 33],
            [8, 22],
            [13, 10],
        ],
        legs: [
            [
                [27, 34],
                [31, 38],
            ],
            [
                [38, 24],
                [43, 26],
            ],
        ],
    },
    run: {
        body: { x: 30, y: 27, w: 34, h: 14, tilt: 0 },
        head: { x: 48, y: 23 },
        tail: [
            [14, 26],
            [7, 23],
            [5, 16],
            [8, 9],
        ],
        legs: [
            [
                [19, 30],
                [11, 37],
            ],
            [
                [39, 30],
                [47, 37],
            ],
        ],
    },
    leap: {
        body: { x: 30, y: 24, w: 36, h: 13, tilt: -0.2 },
        head: { x: 48, y: 17 },
        tail: [
            [14, 27],
            [8, 30],
            [5, 29],
            [5, 25],
        ],
        legs: [
            [
                [18, 28],
                [10, 33],
            ],
            [
                [40, 25],
                [50, 27],
            ],
        ],
    },
    climb: {
        body: { x: 30, y: 23, w: 16, h: 28, tilt: 0 },
        head: { x: 31, y: 8 },
        tail: [
            [28, 34],
            [24, 36],
            [19, 35],
            [16, 31],
        ],
        legs: [
            [
                [25, 15],
                [20, 13],
            ],
            [
                [35, 30],
                [41, 33],
            ],
        ],
    },
    shake: {
        body: { x: 29, y: 30, w: 30, h: 15, tilt: 0.05 },
        head: { x: 45, y: 24 },
        tail: [
            [15, 29],
            [7, 25],
            [6, 15],
            [13, 8],
        ],
        legs: [
            [
                [20, 33],
                [16, 38],
            ],
            [
                [37, 34],
                [42, 38],
            ],
        ],
    },
    spit: {
        body: { x: 27, y: 28, w: 30, h: 17, tilt: 0.08 },
        head: { x: 46, y: 25 },
        tail: [
            [13, 26],
            [5, 21],
            [5, 11],
            [11, 5],
        ],
        legs: [
            [
                [19, 32],
                [18, 38],
            ],
            [
                [35, 33],
                [38, 38],
            ],
        ],
        mouth: true,
    },
    hide: {
        body: { x: 29, y: 31, w: 30, h: 14, tilt: 0 },
        head: { x: 43, y: 30 },
        tail: [
            [15, 32],
            [9, 31],
            [7, 26],
            [12, 21],
        ],
        legs: [
            [
                [22, 36],
                [21, 38],
            ],
            [
                [35, 36],
                [37, 38],
            ],
        ],
    },
    cheer: {
        body: { x: 30, y: 25, w: 19, h: 25, tilt: 0 },
        head: { x: 32, y: 10 },
        tail: [
            [22, 33],
            [12, 31],
            [8, 20],
            [14, 8],
        ],
        legs: [
            [
                [27, 34],
                [27, 38],
            ],
            [
                [38, 20],
                [46, 13],
            ],
        ],
        mouth: true,
    },
};

/** An ellipse turned by `tilt` radians about its middle, as points round it. */
function oval(x: number, y: number, w: number, h: number, tilt: number, n = 22): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2,
            ex = (Math.cos(a) * w) / 2,
            ey = (Math.sin(a) * h) / 2;
        out.push([
            x + ex * Math.cos(tilt) - ey * Math.sin(tilt),
            y + ex * Math.sin(tilt) + ey * Math.cos(tilt),
        ]);
    }
    return out;
}

/** A point along the body's long middle line, `t` from the tail end (-1) to the head end (1), lifted by `up`. */
function along(s: Shape, t: number, up: number): Pt {
    const b = s.body,
        vertical = b.h > b.w;
    if (vertical) return [b.x - up, b.y + (t * b.h) / 2];
    const x = (t * b.w) / 2,
        y = -up;
    return [
        b.x + x * Math.cos(b.tilt) - y * Math.sin(b.tilt),
        b.y + x * Math.sin(b.tilt) + y * Math.cos(b.tilt),
    ];
}

function draw<G>(c: Ctx<G>, who: "nutmeg" | "hazel", pose: Pose, cheeks: number): RawAnchors {
    const { pen, g } = c,
        s = SHAPES[pose],
        coat = pen.fill(who === "hazel" ? "glow" : "tang"),
        pale = pen.fill("card"),
        line = { strokeWidth: 1.5, roughness: 0.3 };
    const [root, a, b, tip] = s.tail;
    // the tail as a bushy band round its curve, wide at its middle
    const side: Pt[] = [],
        other: Pt[] = [];
    const pts = [root, a, b, tip];
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i] ?? root,
            q = pts[Math.min(pts.length - 1, i + 1)] ?? tip,
            r = pts[Math.max(0, i - 1)] ?? root;
        const dx = q[0] - r[0],
            dy = q[1] - r[1],
            d = Math.hypot(dx, dy) || 1,
            wide = [2.5, 4.5, 4.5, 3][i] ?? 3;
        side.push([p[0] - (dy / d) * wide, p[1] + (dx / d) * wide]);
        other.unshift([p[0] + (dy / d) * wide, p[1] - (dx / d) * wide]);
    }
    pen.polygon(g, [...side, tip, ...other], "pencil", coat, line);
    pen.curve(g, [root, a, b, tip], "pencil", { strokeWidth: 1, stroke: c.t["ink-soft"] });
    for (const [p, q] of s.legs.slice(0, 1))
        pen.line(g, p[0], p[1], q[0], q[1], "pencil", {
            strokeWidth: 3.2,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
        });
    const b0 = s.body;
    pen.polygon(g, oval(b0.x, b0.y, b0.w, b0.h, b0.tilt), "pencil", coat, {
        strokeWidth: 1.8,
        roughness: 0.3,
    });
    // the pale belly, and the stripes down the back: dark, light, dark
    const vertical = b0.h > b0.w;
    if (vertical)
        pen.ellipse(g, b0.x + 3, b0.y + 2, b0.w * 0.45, b0.h * 0.6, "pencil", pale, {
            strokeWidth: 0.8,
        });
    else
        pen.polygon(
            g,
            oval(...along(s, 0.05, -b0.h * 0.22), b0.w * 0.6, b0.h * 0.38, b0.tilt),
            "pencil",
            pale,
            {
                strokeWidth: 0.8,
            },
        );
    for (const [up, dark] of [
        [0.34, true],
        [0.2, false],
        [0.07, true],
    ] as const) {
        const span = vertical
            ? ([
                  [b0.x - b0.w * up + 2, b0.y - b0.h * 0.32],
                  [b0.x - b0.w * up + 1, b0.y],
                  [b0.x - b0.w * up + 2, b0.y + b0.h * 0.3],
              ] satisfies Pt[])
            : ([
                  along(s, -0.62, b0.h * up),
                  along(s, 0, b0.h * up + 1.5),
                  along(s, 0.55, b0.h * up),
              ] satisfies Pt[]);
        pen.curve(g, span, "pencil", {
            strokeWidth: dark ? 2.6 : 2,
            stroke: dark ? c.t.ink : c.t.card,
            roughness: 0.2,
        });
    }
    for (const [p, q] of s.legs.slice(1))
        pen.line(g, p[0], p[1], q[0], q[1], "pencil", {
            strokeWidth: 3.2,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
        });
    const h = s.head,
        full = Math.max(0, Math.min(6, cheeks));
    // the ear, then the head and the cheek pouch, which swells with what it carries
    pen.circle(g, h.x - 3, h.y - 7, 6, "pencil", coat, { strokeWidth: 1.2 });
    pen.circle(g, h.x, h.y, 15, "pencil", coat, { strokeWidth: 1.7, roughness: 0.3 });
    pen.ellipse(g, h.x + 4, h.y + 3.5, 6 + full * 1.5, 5 + full * 1.1, "pencil", pale, {
        strokeWidth: 1.1,
        roughness: 0.3,
    });
    pen.line(g, h.x - 5, h.y - 2.5, h.x + 7, h.y - 2, "pencil", {
        strokeWidth: 1.4,
        stroke: c.t["ink-soft"],
    });
    eye(c, h.x + 3, h.y - 2.5, 3.6);
    pen.circle(g, h.x + 8, h.y + 0.5, 2.6, "ruler", pen.fill("berry"), { strokeWidth: 0.6 });
    if (s.mouth)
        pen.ellipse(g, h.x + 6.5, h.y + 4.5, 3.2, 2.4, "ruler", pen.fill("ink"), {
            strokeWidth: 0.6,
        });
    return { head: [h.x, h.y - 8, "up"], mouth: [h.x + 8, h.y + 3, "right"] };
}

const turn = (n: number): number => Math.max(0, Math.min(6, Math.round(n)));

/** Our chipmunk and her little sister, seen from the side, in the poses a gathering game needs, with cheek pouches that fill. */
export const chipmunk = defineDrawing<{ who: string; pose: string; cheeks: number }>({
    id: "chipmunk",
    family: "animals",
    title: "Chipmunk",
    group: "Characters",
    about: "A small striped chipmunk seen from the side, with a bushy tail, a dark eye stripe and cheek pouches that swell as it stuffs them, in many poses.",
    params: { who: "nutmeg", pose: "stand", cheeks: 0 },
    settings: {
        who: { kind: "one of", of: WHO },
        pose: { kind: "one of", of: POSES },
        cheeks: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        { label: "Nutmeg standing", params: { who: "nutmeg", pose: "stand", cheeks: 0 } },
        { label: "Running with full cheeks", params: { who: "nutmeg", pose: "run", cheeks: 6 } },
        { label: "Leaping, half full", params: { who: "nutmeg", pose: "leap", cheeks: 3 } },
        { label: "Climbing a trunk", params: { who: "nutmeg", pose: "climb", cheeks: 0 } },
        { label: "Shaking a branch", params: { who: "nutmeg", pose: "shake", cheeks: 2 } },
        { label: "Spitting out a cheekful", params: { who: "nutmeg", pose: "spit", cheeks: 0 } },
        { label: "Hiding low", params: { who: "nutmeg", pose: "hide", cheeks: 4 } },
        { label: "Hazel sitting", params: { who: "hazel", pose: "sit", cheeks: 0 } },
        { label: "Hazel cheering", params: { who: "hazel", pose: "cheer", cheeks: 0 } },
    ],
    box: () => ({ w: 3, h: 2 }),
    draw: (c, p) =>
        draw(
            c,
            p.who === "hazel" ? "hazel" : "nutmeg",
            POSES.find((x) => x === p.pose) ?? "stand",
            turn(p.cheeks),
        ),
    describe: (p) =>
        `A small ${p.who === "hazel" ? "pale yellow" : "orange"} chipmunk seen from the side with dark and white stripes down its back, a bushy tail${turn(p.cheeks) >= 4 ? ", and cheeks stuffed round and full" : turn(p.cheeks) > 0 ? ", and its cheeks a little full" : ""}.`,
    motion: { body: { is: "idle", deg: 4, period: 1.6 }, weight: "light" },
});
