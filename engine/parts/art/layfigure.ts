import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { type Pt } from "./kit";

/** One head's height, in squares. */
const HEAD = 1.4;
/** The room at the left for the head numbers, in squares. */
const GUTTER = 1.6;

type Pose = "stand" | "walk" | "run" | "reach" | "bend" | "balance";
type Wrong = "none" | "arms" | "knees" | "head";

/**
 * A side-on pose as angles in degrees: the torso from upright, forward positive, and each limb's
 * upper and lower part from hanging straight down, forward positive. `on` is the foot the weight
 * is over, which the line of action ends at.
 */
interface Angles {
    torso: number;
    near: { arm: [number, number]; leg: [number, number] };
    far: { arm: [number, number]; leg: [number, number] };
    on: "near" | "far" | "both";
}
const POSES: Record<Exclude<Pose, "stand">, Angles> = {
    walk: {
        torso: 3,
        near: { arm: [-22, -12], leg: [22, 8] },
        far: { arm: [22, 40], leg: [-16, -30] },
        on: "near",
    },
    run: {
        torso: 22,
        near: { arm: [-50, 40], leg: [75, 10] },
        far: { arm: [45, 125], leg: [-30, -35] },
        on: "far",
    },
    reach: {
        torso: -10,
        near: { arm: [168, 172], leg: [-4, -4] },
        far: { arm: [158, 166], leg: [4, 2] },
        on: "both",
    },
    // knees bent, the back leaning in and both hands reaching down to a ball on the ground in front of
    // the feet, so the bend reads at once as picking something up
    bend: {
        torso: 64,
        near: { arm: [-6, -10], leg: [58, -22] },
        far: { arm: [4, -2], leg: [50, -28] },
        on: "both",
    },
    balance: {
        torso: 40,
        near: { arm: [100, 96], leg: [0, 0] },
        far: { arm: [-70, -80], leg: [-78, -88] },
        on: "near",
    },
};

interface Params {
    heads: number;
    pose: Pose;
    lines: boolean;
    action: boolean;
    wrong: Wrong;
    dir: number;
}

/** Heights down the body, in heads from the top of the head, for a figure `n` heads tall. */
function body(n: number, wrong: Wrong) {
    // the body's halfway point is at the top of the legs on a grown-up and higher on a small child
    const crotch = n * (0.5 + (8 - n) * 0.019),
        shoulder = 1.3,
        elbow = shoulder + (crotch - shoulder) * 0.6,
        wrist = wrong === "arms" ? elbow : crotch,
        leg = n - crotch,
        knee = crotch + leg * (wrong === "knees" ? 0.3 : 0.5),
        span = 1 + (n - 4) * 0.25;
    return { crotch, shoulder, elbow, wrist, knee, span, head: wrong === "head" ? 1.5 : 1 };
}

const dirOf = (deg: number): Pt => [
    Math.sin((deg * Math.PI) / 180),
    Math.cos((deg * Math.PI) / 180),
];
const step = ([x, y]: Pt, deg: number, len: number): Pt => {
    const [dx, dy] = dirOf(deg);
    return [x + dx * len, y + dy * len];
};

interface Figure {
    head: { c: Pt; w: number; h: number };
    chest: { c: Pt; w: number; h: number; deg: number };
    pelvis: { c: Pt; w: number; h: number; deg: number };
    neck: [Pt, Pt];
    limbs: { far: boolean; pts: Pt[]; w: number }[];
    feet: { at: Pt; far: boolean }[];
    action: Pt[];
    marks: Record<string, Pt>;
}

/** The figure in heads, with its feet on y = n and x = 0 at its middle. */
function figure(p: Params): Figure {
    const n = Math.max(4, Math.min(8, Math.round(p.heads * 2) / 2)),
        b = body(n, p.wrong),
        hw = 0.72 * b.head,
        hh = b.head;
    if (p.pose === "stand") {
        const sx = b.span / 2,
            hx = sx * 0.55,
            limbs: Figure["limbs"] = [];
        for (const s of [-1, 1]) {
            const sh: Pt = [s * sx, b.shoulder + 0.15],
                el: Pt = [s * (sx + 0.12), b.elbow],
                wr: Pt = [s * (sx + 0.18), b.wrist],
                hand: Pt = [s * (sx + 0.2), b.wrist + 0.6],
                hip: Pt = [s * hx * 0.7, b.crotch],
                kn: Pt = [s * hx * 0.6, b.knee],
                an: Pt = [s * hx * 0.55, n - 0.2];
            limbs.push({ far: false, pts: [sh, el, wr, hand], w: 0.3 });
            limbs.push({ far: false, pts: [hip, kn, an], w: 0.4 });
        }
        return {
            head: { c: [0, hh / 2], w: hw, h: hh },
            chest: {
                c: [0, b.shoulder + (b.crotch - b.shoulder) * 0.33],
                w: b.span * 0.9,
                h: (b.crotch - b.shoulder) * 0.6,
                deg: 0,
            },
            pelvis: {
                c: [0, b.crotch - (b.crotch - b.shoulder) * 0.12],
                w: b.span * 0.65,
                h: (b.crotch - b.shoulder) * 0.3,
                deg: 0,
            },
            neck: [
                [0, hh * 0.9],
                [0, b.shoulder + 0.1],
            ],
            limbs,
            feet: [
                { at: [-hx * 0.55, n - 0.1], far: false },
                { at: [hx * 0.55, n - 0.1], far: false },
            ],
            action: [
                [0, 0],
                [0, b.crotch],
                [0, n],
            ],
            marks: {
                eyes: [0, hh / 2],
                chin: [0, hh],
                elbow: [sx + 0.12, b.elbow],
                wrist: [sx + 0.18, b.wrist],
                hips: [0, b.crotch],
                knee: [hx * 0.6, b.knee],
            },
        };
    }
    const a = POSES[p.pose],
        torso = b.crotch - b.shoulder,
        hip: Pt = [0, 0],
        top = step(hip, 180 - a.torso, torso),
        headC = step(top, 180 - a.torso * 0.8, 0.25 + hh / 2),
        upper = b.elbow - b.shoulder,
        fore = b.wrist - b.elbow,
        thigh = b.knee - b.crotch,
        shin = n - b.knee - 0.1,
        limbs: Figure["limbs"] = [],
        feet: Figure["feet"] = [];
    const ends: Record<"near" | "far", Pt> = { near: hip, far: hip };
    for (const side of ["far", "near"] as const) {
        const s = a[side],
            el = step(top, s.arm[0], upper),
            wr = step(el, s.arm[1], fore),
            hand = step(wr, s.arm[1], 0.6),
            kn = step(hip, s.leg[0], thigh),
            an = step(kn, s.leg[1], shin);
        limbs.push({ far: side === "far", pts: [top, el, wr, hand], w: 0.3 });
        limbs.push({ far: side === "far", pts: [hip, kn, an], w: 0.4 });
        feet.push({ at: an, far: side === "far" });
        ends[side] = an;
    }
    const support: Pt =
        a.on === "both"
            ? [(ends.near[0] + ends.far[0]) / 2, Math.max(ends.near[1], ends.far[1])]
            : ends[a.on];
    const crown = step(headC, 180 - a.torso * 0.8, hh / 2);
    const fig: Figure = {
        head: { c: headC, w: hw, h: hh },
        chest: {
            c: step(hip, 180 - a.torso, torso * 0.7),
            w: 1.1,
            h: torso * 0.75,
            deg: a.torso,
        },
        pelvis: { c: step(hip, 180 - a.torso, 0.2), w: 0.9, h: 0.75, deg: a.torso },
        neck: [top, step(top, 180 - a.torso * 0.8, 0.3)],
        limbs,
        feet,
        action: [crown, step(hip, 180 - a.torso, torso * 0.35), support],
        marks: { hips: hip },
    };
    // stand it on the lowest foot
    const low = Math.max(...feet.map((f) => f.at[1])),
        shift = (q: Pt): Pt => [q[0], q[1] + n - 0.1 - low];
    return {
        ...fig,
        head: { ...fig.head, c: shift(fig.head.c) },
        chest: { ...fig.chest, c: shift(fig.chest.c) },
        pelvis: { ...fig.pelvis, c: shift(fig.pelvis.c) },
        neck: [shift(fig.neck[0]), shift(fig.neck[1])],
        limbs: fig.limbs.map((l) => ({ ...l, pts: l.pts.map(shift) })),
        feet: fig.feet.map((f) => ({ ...f, at: shift(f.at) })),
        action: fig.action.map(shift),
        marks: { hips: shift(hip) },
    };
}

/** How far the figure reaches either side of its middle and above its head, in heads. */
function extent(f: Figure): { left: number; right: number; top: number } {
    const pts: Pt[] = [
        ...f.limbs.flatMap((l) => l.pts),
        ...f.feet.map((q) => q.at),
        f.head.c,
        f.chest.c,
    ];
    return {
        left: Math.min(...pts.map((q) => q[0])) - 0.8,
        right: Math.max(...pts.map((q) => q[0])) + 0.8,
        top: Math.min(0, ...pts.map((q) => q[1] - 0.5), f.head.c[1] - f.head.h / 2),
    };
}

const sizeOf = (p: Params) => {
    const f = figure(p),
        e = extent(f),
        n = Math.max(4, Math.min(8, Math.round(p.heads * 2) / 2));
    return {
        f,
        e,
        n,
        w: Math.ceil(GUTTER + (e.right - e.left) * HEAD + 0.6),
        h: Math.ceil((n - e.top) * HEAD + 1),
    };
};

const STANDING: Params = {
    heads: 7.5,
    pose: "stand",
    lines: true,
    action: false,
    wrong: "none",
    dir: 1,
};

export const layFigure = defineDrawing({
    id: "layfigure",
    family: "art",
    title: "The artist's wooden figure",
    group: "Structures",
    about: "The jointed wooden figure artists pose to draw people from: an oval head, a chest and hips, and limbs that bend at ball joints. Standing, it can be ruled into head heights and numbered, about seven and a half heads for a grown-up and four for a small child, with the halfway point higher on a child. It can walk, run, reach up, bend to pick something up or balance on one foot, with its line of action drawn through it, or be made with one part wrong: arms too short, knees too high or a head too big.",
    params: STANDING,
    settings: {
        heads: { kind: "number", min: 4, max: 8, step: 0.5 },
        pose: { kind: "one of", of: ["stand", "walk", "run", "reach", "bend", "balance"] },
        lines: { kind: "flag" },
        action: { kind: "flag" },
        wrong: { kind: "one of", of: ["none", "arms", "knees", "head"] },
        dir: { kind: "one of", of: [1, -1] },
    },
    takes: [
        {
            label: "A grown-up, ruled in heads",
            params: {
                heads: 7.5,
                pose: "stand",
                lines: true,
                action: false,
                wrong: "none",
                dir: 1,
            },
        },
        {
            label: "A small child, four heads",
            params: { heads: 4, pose: "stand", lines: true, action: false, wrong: "none", dir: 1 },
        },
        {
            label: "Arms too short",
            params: { heads: 7, pose: "stand", lines: true, action: false, wrong: "arms", dir: 1 },
        },
        {
            label: "Running, the line of action",
            params: { heads: 7.5, pose: "run", lines: false, action: true, wrong: "none", dir: 1 },
        },
        {
            label: "Balancing on one foot",
            params: {
                heads: 7.5,
                pose: "balance",
                lines: false,
                action: true,
                wrong: "none",
                dir: -1,
            },
        },
        {
            label: "Bending to pick something up",
            params: { heads: 7, pose: "bend", lines: false, action: false, wrong: "none", dir: 1 },
        },
    ],
    box: (p) => {
        const s = sizeOf(p);
        return { w: s.w, h: s.h };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            s = sizeOf(p),
            { f, e, n } = s,
            flip = p.dir === -1 ? -1 : 1,
            ox = (GUTTER + (flip === 1 ? -e.left : e.right) * HEAD + 0.3) * U,
            oy = (-e.top * HEAD + 0.5) * U,
            at = ([x, y]: Pt): Pt => [ox + flip * x * HEAD * U, oy + y * HEAD * U],
            a: RawAnchors = {},
            // wood on screen; on paper the parts stay white so the joints and the head lines read
            wood = (far: boolean) => (far || c.paper ? pen.fill("card") : pen.fill("tang")),
            line = { strokeWidth: 1.6 },
            faint = { strokeWidth: 1.2, stroke: c.t["ink-soft"] };
        if (p.lines && p.pose === "stand") {
            const bands = Math.ceil(n);
            for (let i = 0; i <= bands; i++) {
                const y = oy + Math.min(i, n) * HEAD * U;
                pen.line(g, GUTTER * U - 6, y, s.w * U - 4, y, "ruler", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                    strokeLineDash: [4, 5],
                });
            }
            for (let i = 0; i < Math.floor(n); i++) {
                const mid = oy + (i + Math.min(1, n - i) / 2) * HEAD * U;
                num(c, GUTTER * U * 0.45, mid + 6, i + 1, 15);
            }
        }
        const ellipse = (q: { c: Pt; w: number; h: number; deg?: number }, far = false) => {
            const [x, y] = at(q.c),
                w = q.w * HEAD * U,
                h = q.h * HEAD * U,
                t = ((q.deg ?? 0) * flip * Math.PI) / 180,
                pts: Pt[] = Array.from({ length: 18 }, (_, i) => {
                    const u = (i / 18) * Math.PI * 2,
                        ex = (Math.cos(u) * w) / 2,
                        ey = (Math.sin(u) * h) / 2;
                    return [
                        x + ex * Math.cos(t) - ey * Math.sin(t),
                        y + ex * Math.sin(t) + ey * Math.cos(t),
                    ];
                });
            pen.polygon(g, pts, "pencil", wood(far), far ? faint : line);
        };
        const limb = (pts: Pt[], w: number, far: boolean) => {
            const k = pts.map(at),
                r = w * HEAD * U;
            for (let i = 0; i + 1 < k.length; i++) {
                const [x0, y0] = k[i] ?? [0, 0],
                    [x1, y1] = k[i + 1] ?? [0, 0],
                    len = Math.hypot(x1 - x0, y1 - y0) || 1,
                    nx = ((y0 - y1) / len) * (r / 2),
                    ny = ((x1 - x0) / len) * (r / 2),
                    taper = i === k.length - 2 ? 0.7 : 0.85;
                pen.polygon(
                    g,
                    [
                        [x0 + nx, y0 + ny],
                        [x1 + nx * taper, y1 + ny * taper],
                        [x1 - nx * taper, y1 - ny * taper],
                        [x0 - nx, y0 - ny],
                    ],
                    "pencil",
                    wood(far),
                    far ? faint : line,
                );
            }
            for (const [x, y] of k.slice(0, -1))
                pen.circle(g, x, y, r * 0.95, "pencil", pen.fill("card"), far ? faint : line);
        };
        const foot = (q: { at: Pt; far: boolean }) => {
            const [x, y] = at(q.at),
                len = 0.9 * HEAD * U,
                forward = p.pose === "stand" ? 0 : flip * len * 0.35;
            pen.ellipse(
                g,
                x + forward,
                y + 3,
                p.pose === "stand" ? len * 0.45 : len,
                len * 0.3,
                "pencil",
                wood(q.far),
                q.far ? faint : line,
            );
        };
        for (const l of f.limbs.filter((l) => l.far)) limb(l.pts, l.w, true);
        for (const q of f.feet.filter((q) => q.far)) foot(q);
        const [n0, n1] = f.neck;
        limb([n0, n1], 0.3, false);
        ellipse(f.pelvis);
        ellipse(f.chest);
        for (const l of f.limbs.filter((l) => !l.far)) limb(l.pts, l.w, false);
        for (const q of f.feet.filter((q) => !q.far)) foot(q);
        ellipse(f.head);
        const hand = f.limbs.find((l) => !l.far && l.pts.length === 4)?.pts[3];
        if (p.pose === "bend" && hand) {
            const r = 0.3 * HEAD * U,
                [hx] = at(hand);
            pen.circle(
                g,
                hx + flip * r * 0.4,
                oy + n * HEAD * U - r - 1,
                2 * r,
                "pencil",
                pen.fill("berry"),
                {
                    strokeWidth: 1.6,
                },
            );
        }
        if (p.action) {
            const [p0, p1, p2] = f.action.map(at);
            if (p0 && p1 && p2)
                pen.path(
                    g,
                    `M${p0[0]} ${p0[1]}Q${2 * p1[0] - (p0[0] + p2[0]) / 2} ${2 * p1[1] - (p0[1] + p2[1]) / 2} ${p2[0]} ${p2[1]}`,
                    "pencil",
                    null,
                    { strokeWidth: 3, stroke: c.t.pen },
                );
        }
        for (const [k, q] of Object.entries(f.marks)) {
            const [x, y] = at(q);
            a[k] = [x, y, "up"];
        }
        const [hx, hy] = at(f.head.c);
        a.head = [hx, hy - (f.head.h / 2) * HEAD * U, "up"];
        const low = f.feet.map((q) => at(q.at));
        a.feet = [
            low.reduce((t, q) => t + q[0], 0) / Math.max(1, low.length),
            Math.max(...low.map((q) => q[1])),
            "down",
        ];
        return a;
    },
    describe: (p) => {
        const doing: Record<Pose, string> = {
            stand: "standing",
            walk: "walking",
            run: "running",
            reach: "reaching up high",
            bend: "bending to pick up a ball from the ground",
            balance: "balancing on one foot",
        };
        const wrong: Record<Wrong, string> = {
            none: "",
            arms: ", its arms drawn short",
            knees: ", its knees drawn high",
            head: ", its head drawn large",
        };
        return `A jointed wooden lay figure, the kind artists pose to draw people from, shown ${doing[p.pose]}${p.lines && p.pose === "stand" ? `, ruled into head heights and numbered` : ""}${wrong[p.wrong]}${p.action ? ", its line of action drawn" : ""}.`;
    },
});
