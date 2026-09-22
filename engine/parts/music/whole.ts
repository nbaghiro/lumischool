// A whole instrument stood up facing you, drawn from its plan: the guitar's and the ukulele's shapes,
// a fret's place, the body's outline and the drawing itself, which the guitar and the ukulele share.
import { plain, clip, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { say } from "../lettering";
import { TUNINGS, type TuningName } from "../../sound/fretted";
import { gauge, wood, rosette, stringLine } from "./luthier";

export interface WholeParams {
    /** Name the parts, with a line to each. */
    labels: boolean;
    /** Write each string's letter over the head. */
    letters: boolean;
    /** A string to ring, by its number, or 0 for none. */
    ring: number;
}

/**
 * Where everything on a whole instrument goes, in squares, stood up facing you. The frets are placed
 * by the rule a luthier uses, each one closer to the last by the twelfth root of two, and the neck
 * meets the body at the twelfth fret, halfway to the saddle. The neck is drawn wider than life so
 * the strings on it can be told apart.
 */
export interface Plan {
    tuning: TuningName;
    w: number;
    h: number;
    cx: number;
    headTop: number;
    headHalf: number;
    nut: number;
    scale: number;
    neckHalf: [number, number];
    frets: number;
    inlays: number[];
    boardEnd: number;
    bodyTop: number;
    bodyEnd: number;
    bouts: { upper: [number, number]; waist: [number, number]; lower: [number, number] };
    hole: [number, number];
    saddleSpan: number;
    bridgeHalf: number;
    posts: number[];
    pickguard: boolean;
}

export const PLANS: Record<TuningName, Plan> = {
    guitar: {
        tuning: "guitar",
        w: 16,
        h: 35,
        cx: 8,
        headTop: 1.8,
        headHalf: 1.95,
        nut: 7,
        scale: 20,
        neckHalf: [1.3, 1.6],
        frets: 16,
        inlays: [3, 5, 7, 9, 12],
        boardEnd: 19.2,
        bodyTop: 16.7,
        bodyEnd: 33.8,
        bouts: { upper: [19.8, 4.8], waist: [23.6, 3.75], lower: [28.8, 6.4] },
        hole: [21.9, 1.9],
        saddleSpan: 2.7,
        bridgeHalf: 2.4,
        posts: [1.3, 2.55, 3.8],
        pickguard: true,
    },
    uke: {
        tuning: "uke",
        w: 12,
        h: 28,
        cx: 6,
        headTop: 1.8,
        headHalf: 1.65,
        nut: 6.2,
        scale: 16,
        neckHalf: [1.1, 1.3],
        frets: 14,
        inlays: [5, 7, 10, 12],
        boardEnd: 15.2,
        bodyTop: 13.9,
        bodyEnd: 25.9,
        bouts: { upper: [16.4, 3.4], waist: [19.2, 2.8], lower: [22.6, 4.1] },
        hole: [17.1, 1.35],
        saddleSpan: 2,
        bridgeHalf: 1.9,
        posts: [1.35, 2.85],
        pickguard: false,
    },
};

/** Where fret `f` is, in squares from the top of the box. */
export const fretY = (q: Plan, f: number) => q.nut + q.scale * (1 - Math.pow(2, -f / 12));

/** The body's outline: the upper bout, the waist and the lower bout, the same on both sides. */
export function bodyPath(q: Plan, grow = 0): string {
    const x = (half: number, side: -1 | 1) => (q.cx + side * (half + grow)) * U;
    const y = (v: number) => v * U;
    const { upper, waist, lower } = q.bouts;
    const top = q.bodyTop - grow,
        end = q.bodyEnd + grow;
    const heel = q.neckHalf[1] + 0.2;
    const left = [
        `C${x(upper[1] * 0.55, -1)} ${y(top - 0.05)} ${x(upper[1], -1)} ${y(upper[0] - 2)} ${x(upper[1], -1)} ${y(upper[0])}`,
        `C${x(upper[1], -1)} ${y(upper[0] + 1.6)} ${x(waist[1], -1)} ${y(waist[0] - 1.4)} ${x(waist[1], -1)} ${y(waist[0])}`,
        `C${x(waist[1], -1)} ${y(waist[0] + 1.6)} ${x(lower[1], -1)} ${y(lower[0] - 2.6)} ${x(lower[1], -1)} ${y(lower[0])}`,
        `C${x(lower[1], -1)} ${y(lower[0] + (end - lower[0]) * 0.75)} ${x(lower[1] * 0.55, -1)} ${y(end)} ${q.cx * U} ${y(end)}`,
    ];
    // The right side is the left walked backwards, its control points in reverse order.
    const right = [
        `C${x(lower[1] * 0.55, 1)} ${y(end)} ${x(lower[1], 1)} ${y(lower[0] + (end - lower[0]) * 0.75)} ${x(lower[1], 1)} ${y(lower[0])}`,
        `C${x(lower[1], 1)} ${y(lower[0] - 2.6)} ${x(waist[1], 1)} ${y(waist[0] + 1.6)} ${x(waist[1], 1)} ${y(waist[0])}`,
        `C${x(waist[1], 1)} ${y(waist[0] - 1.4)} ${x(upper[1], 1)} ${y(upper[0] + 1.6)} ${x(upper[1], 1)} ${y(upper[0])}`,
        `C${x(upper[1], 1)} ${y(upper[0] - 2)} ${x(upper[1] * 0.55, 1)} ${y(top - 0.05)} ${x(heel, 1)} ${y(top)}`,
    ];
    return [`M${x(heel, -1)} ${y(top)}`, ...left, ...right, "Z"].join("");
}

export function drawWhole<G>(c: Ctx<G>, p: WholeParams, q: Plan): RawAnchors {
    const { pen, g } = c;
    const t = TUNINGS[q.tuning];
    const n = t.strings.length;
    const X = (v: number) => (q.cx + v) * U;
    const Y = (v: number) => v * U;
    const a: RawAnchors = {};
    const neckAt = (y: number) =>
        q.neckHalf[0] + ((q.neckHalf[1] - q.neckHalf[0]) * (y - q.nut)) / (q.bodyTop + 0.3 - q.nut);
    const saddle = q.nut + q.scale;
    const [holeY, holeR] = q.hole;

    // The body, its binding a line inside the edge, and a little grain along the top.
    pen.path(g, bodyPath(q), "pencil", wood(c, q.tuning === "uke" ? "koa" : "top"), {
        strokeWidth: 2.2,
    });
    pen.path(g, bodyPath(q, -0.28), "ruler", null, { strokeWidth: 1, stroke: c.t["ink-soft"] });
    // Grain down the top, clipped to the body so it never runs off the edge.
    const grained = clip({ ...c, g }, { kind: "path", d: bodyPath(q, -0.3) }).g;
    const { lower } = q.bouts;
    for (const k of [-1, 1] as const) {
        for (const off of [0.5, 0.8]) {
            const gx = q.cx + k * lower[1] * off;
            pen.curve(
                grained,
                [
                    [gx * U, Y(q.bodyTop)],
                    [(gx + k * 0.2) * U, Y((q.bodyTop + q.bodyEnd) / 2)],
                    [gx * U, Y(q.bodyEnd)],
                ],
                "pencil",
                { strokeWidth: 0.8, stroke: c.t["ink-soft"] },
            );
        }
    }
    if (q.pickguard) {
        const d = `M${X(1.2)} ${Y(holeY + 1.1)}C${X(2.4)} ${Y(holeY - 0.1)} ${X(3.9)} ${Y(holeY + 0.8)} ${X(3.7)} ${Y(holeY + 2.5)}C${X(3.5)} ${Y(holeY + 3.7)} ${X(1.8)} ${Y(holeY + 3.5)} ${X(1.1)} ${Y(holeY + 2.2)}Z`;
        pen.path(g, d, "pencil", wood(c, "shell"), { strokeWidth: 1.4 });
    }
    rosette(c, g, X(0), Y(holeY), holeR * U);

    // The bridge with its saddle, and the pins or the tie that hold the strings behind it.
    const bh = q.bridgeHalf;
    pen.path(
        g,
        `M${X(-bh)} ${Y(saddle - 0.15)}Q${X(-bh * 0.5)} ${Y(saddle - 0.6)} ${X(0)} ${Y(saddle - 0.55)}Q${X(bh * 0.5)} ${Y(saddle - 0.6)} ${X(bh)} ${Y(saddle - 0.15)}L${X(bh)} ${Y(saddle + 0.75)}Q${X(0)} ${Y(saddle + 1.05)} ${X(-bh)} ${Y(saddle + 0.75)}Z`,
        "ruler",
        wood(c, "board"),
        { strokeWidth: 1.6 },
    );
    pen.rect(
        g,
        X(-q.saddleSpan / 2 - 0.3),
        Y(saddle - 0.2),
        (q.saddleSpan + 0.6) * U,
        0.3 * U,
        "ruler",
        wood(c, "bone"),
        { strokeWidth: 1.1 },
    );

    // The neck and its fingerboard, over the body as far as the sound hole.
    const heelY = q.bodyTop + 0.3;
    pen.polygon(
        g,
        [
            [X(-q.neckHalf[0] - 0.12), Y(q.nut)],
            [X(q.neckHalf[0] + 0.12), Y(q.nut)],
            [X(q.neckHalf[1] + 0.2), Y(heelY)],
            [X(-q.neckHalf[1] - 0.2), Y(heelY)],
        ],
        "ruler",
        wood(c, "neck"),
        { strokeWidth: 1.5 },
    );
    const endHalf = neckAt(q.boardEnd);
    pen.polygon(
        g,
        [
            [X(-q.neckHalf[0]), Y(q.nut)],
            [X(q.neckHalf[0]), Y(q.nut)],
            [X(endHalf), Y(q.boardEnd)],
            [X(-endHalf), Y(q.boardEnd)],
        ],
        "ruler",
        wood(c, "board"),
        { strokeWidth: 1.5 },
    );
    for (let f = 1; f <= q.frets; f++) {
        const fy = fretY(q, f);
        const half = neckAt(fy);
        pen.line(g, X(-half + 0.05), Y(fy), X(half - 0.05), Y(fy), "ruler", {
            strokeWidth: 3,
            stroke: wood(c, "wire").fill,
        });
        pen.line(g, X(-half + 0.05), Y(fy + 0.06), X(half - 0.05), Y(fy + 0.06), "ruler", {
            strokeWidth: 0.8,
            stroke: c.t.ink,
        });
    }
    for (const f of q.inlays) {
        const iy = (fretY(q, f - 1) + fretY(q, f)) / 2;
        const r = Math.min(0.42, (fretY(q, f) - fretY(q, f - 1)) * 0.36);
        const xs = f === 12 ? [-0.55, 0.55] : [0];
        for (const ix of xs)
            pen.circle(g, X(ix), Y(iy), r * U, "ruler", wood(c, "bone"), {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
    }

    // The head, the pegs down both sides, and the nut across the foot of it.
    const hh = q.headHalf,
        nh = q.neckHalf[0];
    const top = q.headTop;
    pen.path(
        g,
        `M${X(-nh - 0.1)} ${Y(q.nut)}L${X(-hh)} ${Y(top + 0.7)}C${X(-hh + 0.1)} ${Y(top)} ${X(-0.7)} ${Y(top + 0.3)} ${X(0)} ${Y(top)}C${X(0.7)} ${Y(top + 0.3)} ${X(hh - 0.1)} ${Y(top)} ${X(hh)} ${Y(top + 0.7)}L${X(nh + 0.1)} ${Y(q.nut)}Z`,
        "pencil",
        wood(c, "neck"),
        { strokeWidth: 1.9 },
    );
    const headEdge = (y: number) =>
        nh + 0.1 + ((hh - nh - 0.1) * (q.nut - y)) / (q.nut - top - 0.7);
    const half = Math.ceil(n / 2);
    const post = new Map<number, [number, number]>();
    for (let i = 0; i < n; i++) {
        const left = i < half;
        const k = left ? i : n - 1 - i;
        const py = q.nut - (q.posts[k] ?? 1.3);
        const edge = headEdge(py);
        const px = left ? -(edge - 0.5) : edge - 0.5;
        post.set(n - i, [X(px), Y(py)]);
        const side = left ? -1 : 1;
        pen.line(g, X(side * edge), Y(py), X(side * (edge + 0.45)), Y(py), "ruler", {
            strokeWidth: 3,
        });
        pen.ellipse(
            g,
            X(side * (edge + 0.85)),
            Y(py),
            0.85 * U,
            0.7 * U,
            "pencil",
            wood(c, "bone"),
            { strokeWidth: 1.5 },
        );
        pen.circle(g, X(px), Y(py), 0.42 * U, "ruler", wood(c, "wire"), { strokeWidth: 1.2 });
    }
    pen.rect(
        g,
        X(-nh - 0.1),
        Y(q.nut - 0.3),
        (2 * nh + 0.2) * U,
        0.3 * U,
        "ruler",
        wood(c, "bone"),
        { strokeWidth: 1.4 },
    );

    // The strings, in the order a chord box has them, from their posts over the nut to the saddle,
    // and behind it into their pins or round the tie.
    const nutSpan = 2 * (nh - 0.3),
        sadSpan = q.saddleSpan;
    for (let string = n; string >= 1; string--) {
        const i = n - string;
        const nx = X(-nutSpan / 2 + (i * nutSpan) / (n - 1));
        const sx = X(-sadSpan / 2 + (i * sadSpan) / (n - 1));
        const from = post.get(string) ?? [nx, Y(top + 1)];
        const wound = q.tuning === "guitar" && string >= 4;
        const tail = Y(saddle + (q.tuning === "guitar" ? 0.45 : 0.6));
        stringLine(
            c,
            g,
            [from, [nx, Y(q.nut - 0.15)], [sx, Y(saddle - 0.05)], [sx, tail]],
            gauge(t, string) * 0.75,
            wound,
        );
        if (q.tuning === "guitar")
            pen.circle(g, sx, tail, 0.34 * U, "ruler", wood(c, "bone"), { strokeWidth: 1 });
        if (p.letters)
            say(
                c,
                X((i - (n - 1) / 2) * 0.95),
                Y(1.1),
                t.names[i] ?? "",
                13,
                "middle",
                c.t["ink-soft"],
            );
        const midY = (q.nut + q.bodyTop) / 2;
        const mx = nx + ((sx - nx) * (midY - q.nut)) / (saddle - q.nut);
        if (p.ring === string) {
            pen.ellipse(g, mx, Y(midY), 1.1 * U, (q.bodyTop - q.nut + 1) * U, "doodle", null, {
                strokeWidth: 5,
                stroke: c.t.card,
            });
            pen.ellipse(g, mx, Y(midY), 1.1 * U, (q.bodyTop - q.nut + 1) * U, "doodle", null, {
                strokeWidth: 2.6,
                stroke: c.t.pen,
            });
        }
        a[`string(${string})`] = [mx, Y(q.nut + 1.2), "up"];
    }

    const f2 = (fretY(q, 1) + fretY(q, 2)) / 2;
    const f7 = (fretY(q, 6) + fretY(q, 7)) / 2;
    const pegY = q.nut - (q.posts[1] ?? 2.5);
    a.head = [X(0), Y(top + 0.4), "up"];
    a.pegs = [X(headEdge(pegY) + 1.3), Y(pegY), "right"];
    a.nut = [X(nh + 0.1), Y(q.nut - 0.15), "right"];
    a.frets = [X(neckAt(f2)), Y(f2), "right"];
    a.neck = [X(neckAt(f7) + 0.12), Y(f7), "right"];
    a.hole = [X(holeR * 0.7), Y(holeY - holeR * 0.7), "right"];
    a.bridge = [X(q.bridgeHalf), Y(saddle + 0.4), "right"];
    a.saddle = [X(q.saddleSpan / 2 + 0.3), Y(saddle - 0.05), "right"];
    a.body = [X(q.bouts.lower[1]), Y(q.bouts.lower[0]), "right"];
    a.under = [X(0), Y(q.h), "down"];
    if (!p.labels) return a;

    // Each part and the point its line starts from, top to bottom; the words are pushed apart so no
    // two sit closer than a square and a half.
    const lx = (q.w + 1.2) * U;
    const parts: [string, number, number][] = [
        ["tuning pegs", X(headEdge(pegY) + 1.3), Y(pegY)],
        ["head", X(hh * 0.5), Y(top + 0.9)],
        ["nut", X(nh + 0.1), Y(q.nut - 0.15)],
        ["frets", X(neckAt(f2)), Y(fretY(q, 2))],
        ["neck", X(neckAt(f7) + 0.12), Y(f7)],
        ["strings", X(0.25), Y(q.bodyTop - 0.6)],
        ["sound hole", X(holeR * 0.55), Y(holeY - holeR * 0.2)],
        ["saddle", X(q.saddleSpan / 2 + 0.25), Y(saddle - 0.05)],
        ["bridge", X(q.bridgeHalf - 0.2), Y(saddle + 0.55)],
        ["body", X(q.bouts.lower[1] - 1), Y(q.bouts.lower[0] + 0.6)],
    ];
    let last = -Infinity;
    for (const [word, x, y] of parts) {
        const ly = Math.max(y, last + 1.5 * U);
        last = ly;
        pen.line(g, x, y, lx - 4, ly, "pencil", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
        plain({ ...c, g }, { kind: "circle", cx: x, cy: y, r: 2.4, fill: c.t.ink });
        say(c, lx, ly + 5, word, 15, "start");
    }
    return a;
}
