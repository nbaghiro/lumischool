import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { penned, say, soft } from "../lettering";

type Pt = [number, number];

/**
 * A block, an upright cylinder, a ball or a square pyramid, in units of the solid: x across, y back
 * from the front, z up from the ground. A ball's and a cylinder's x, y is their centre.
 */
type Piece =
    | { is: "box"; x: number; y: number; z: number; w: number; d: number; h: number }
    | { is: "cylinder"; x: number; y: number; z: number; r: number; h: number }
    | { is: "ball"; x: number; y: number; z: number; r: number }
    | { is: "pyramid"; x: number; y: number; z: number; w: number; h: number }
    | { is: "extruded"; profile: Pt[]; d: number };

/** The four solids, bottom piece first, each drawn so no piece hides another from the front, the left or above. */
const SOLIDS: readonly { name: string; pieces: readonly Piece[] }[] = [
    {
        name: "a ball on a column on a plinth",
        pieces: [
            { is: "box", x: 0, y: 0, z: 0, w: 4, d: 4, h: 1 },
            { is: "cylinder", x: 2, y: 2, z: 1, r: 0.75, h: 2 },
            { is: "ball", x: 2, y: 2, z: 3, r: 1.25 },
        ],
    },
    {
        name: "a pyramid on a plinth",
        pieces: [
            { is: "box", x: 0, y: 0, z: 0, w: 4, d: 4, h: 1 },
            { is: "pyramid", x: 0.5, y: 0.5, z: 1, w: 3, h: 3 },
        ],
    },
    {
        name: "a block with a step",
        pieces: [
            {
                is: "extruded",
                profile: [
                    [0, 0],
                    [4, 0],
                    [4, 1],
                    [2, 1],
                    [2, 3],
                    [0, 3],
                ],
                d: 2,
            },
        ],
    },
    {
        name: "an arch of three stones",
        pieces: [
            { is: "box", x: 0, y: 0, z: 0, w: 1, d: 2, h: 3 },
            { is: "box", x: 3, y: 0, z: 0, w: 1, d: 2, h: 3 },
            { is: "box", x: 0, y: 0, z: 3, w: 4, d: 2, h: 1 },
        ],
    },
];

type View = "front" | "left" | "top";

/** The outline of a piece seen from one side, as a closed polygon or a circle, in the view's units with z (or y) up. */
type Outline = { poly: Pt[] } | { circle: [number, number, number] };

function outlineOf(p: Piece, v: View): Outline[] {
    // across and up in each view: the front sees x and z, the left sees y and z, the top sees x and y
    if (p.is === "ball")
        return [
            {
                circle: [v === "left" ? p.y : p.x, v === "top" ? p.y : p.z + p.r, p.r],
            },
        ];
    if (p.is === "cylinder") {
        const c = v === "left" ? p.y : p.x;
        if (v === "top") return [{ circle: [p.x, p.y, p.r] }];
        return [{ poly: rect(c - p.r, p.z, 2 * p.r, p.h) }];
    }
    if (p.is === "pyramid") {
        if (v === "top") {
            const [x0, y0, x1, y1, cx, cy] = [
                p.x,
                p.y,
                p.x + p.w,
                p.y + p.w,
                p.x + p.w / 2,
                p.y + p.w / 2,
            ];
            return [
                { poly: rect(x0, y0, p.w, p.w) },
                {
                    poly: [
                        [x0, y0],
                        [cx, cy],
                        [x1, y1],
                    ],
                },
                {
                    poly: [
                        [x1, y0],
                        [cx, cy],
                        [x0, y1],
                    ],
                },
            ];
        }
        const a = v === "left" ? p.y : p.x;
        return [
            {
                poly: [
                    [a, p.z],
                    [a + p.w, p.z],
                    [a + p.w / 2, p.z + p.h],
                ],
            },
        ];
    }
    if (p.is === "extruded") {
        const xs = p.profile.map(([x]) => x),
            x0 = Math.min(...xs),
            x1 = Math.max(...xs),
            top = Math.max(...p.profile.map(([, z]) => z));
        if (v === "front") return [{ poly: p.profile }];
        if (v === "left") return [{ poly: rect(0, 0, p.d, top) }];
        // from above, a line runs back from every upright edge inside the profile, where the top steps
        const steps = [...new Set(xs.filter((x) => x > x0 && x < x1))];
        return [
            { poly: rect(x0, 0, x1 - x0, p.d) },
            ...steps.map((x): Outline => ({
                poly: [
                    [x, 0],
                    [x, p.d],
                ],
            })),
        ];
    }
    if (v === "front") return [{ poly: rect(p.x, p.z, p.w, p.h) }];
    if (v === "left") return [{ poly: rect(p.y, p.z, p.d, p.h) }];
    return [{ poly: rect(p.x, p.y, p.w, p.d) }];
}

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
];

/** How far a view reaches across and up, in the solid's units, which is what lets three views be checked against each other. */
export function extentOf(shape: number, v: View): { w: number; h: number } {
    let w = 0,
        h = 0;
    for (const piece of solidOf(shape).pieces)
        for (const o of outlineOf(piece, v)) {
            const pts: Pt[] =
                "circle" in o
                    ? [
                          [o.circle[0] + o.circle[2], o.circle[1] + o.circle[2]],
                          [o.circle[0] - o.circle[2], o.circle[1] - o.circle[2]],
                      ]
                    : o.poly;
            for (const [x, y] of pts) {
                w = Math.max(w, x);
                h = Math.max(h, y);
            }
        }
    return { w, h };
}

const solidOf = (shape: number) =>
    SOLIDS[Math.max(0, Math.min(SOLIDS.length - 1, Math.round(shape)))] ?? {
        name: "",
        pieces: [],
    };

/** How far each kind of relief stands out of its ground, in squares, for a figure a square and a half deep in the round. */
export const RELIEFS = [
    { name: "low relief", rise: 0.35, cut: 0 },
    { name: "high relief", rise: 1.1, cut: 0 },
    { name: "sunk relief", rise: 0, cut: 0.45 },
] as const;
export const ROUND_DEPTH = 1.5;

/** Low relief stands out less than half the figure's depth, high relief more, and sunk relief lies below the ground. */
export const reliefKind = (rise: number, cut: number): number =>
    cut > 0 && rise <= 0 ? 2 : rise > ROUND_DEPTH / 2 ? 1 : 0;

const S = 1.4 * U;
const VIEW_WORDS: Record<View, string> = {
    front: "from the front",
    left: "from the left",
    top: "from above",
};

function view<G>(c: Ctx<G>, shape: number, v: View, ox: number, base: number, ask: boolean): void {
    const { pen, g } = c,
        { w, h } = extentOf(shape, v);
    // first-angle, as China's three views are drawn: the side of the left and top views away from the front view is the front
    const at = ([x, y]: Pt): Pt => [ox + (v === "left" ? w - x : x) * S, base - y * S];
    say(c, ox, base - h * S - 0.5 * U, VIEW_WORDS[v], 13, "start", c.t["ink-soft"]);
    if (ask) {
        pen.rect(g, ox, base - h * S, w * S, h * S, "ruler", null, {
            strokeWidth: 1.4,
            stroke: c.t["ink-soft"],
            strokeLineDash: [5, 5],
        });
        penned(c, ox + (w * S) / 2, base - (h * S) / 2 + 10, "?", 30);
        return;
    }
    for (const piece of solidOf(shape).pieces)
        for (const o of outlineOf(piece, v)) {
            if ("circle" in o) {
                const [cx, cy] = at([o.circle[0], o.circle[1]]);
                pen.circle(g, cx, cy, 2 * o.circle[2] * S, "ruler", pen.fill("card"), {
                    strokeWidth: 1.8,
                });
            } else pen.polygon(g, o.poly.map(at), "ruler", pen.fill("card"), { strokeWidth: 1.8 });
        }
}

/** The solid drawn oblique: depth goes back and up to the right at half its length. */
function solid<G>(c: Ctx<G>, shape: number, ox: number, base: number): void {
    const { pen, g } = c,
        k = 0.5 * Math.SQRT1_2;
    const at = (x: number, y: number, z: number): Pt => [
        ox + (x + y * k) * S,
        base - (z + y * k) * S,
    ];
    const face = (pts: Pt[], tint: "card" | "ink-soft") =>
        pen.polygon(
            g,
            pts,
            "ruler",
            tint === "card" ? pen.fill("card") : pen.fill("ink-soft", "hachure", { hachureGap: 6 }),
            { strokeWidth: 1.6 },
        );
    for (const p of solidOf(shape).pieces) {
        if (p.is === "box") {
            const { x, y, z, w, d, h } = p;
            face([at(x, y, z), at(x + w, y, z), at(x + w, y, z + h), at(x, y, z + h)], "card");
            face(
                [
                    at(x, y, z + h),
                    at(x + w, y, z + h),
                    at(x + w, y + d, z + h),
                    at(x, y + d, z + h),
                ],
                "card",
            );
            face(
                [
                    at(x + w, y, z),
                    at(x + w, y + d, z),
                    at(x + w, y + d, z + h),
                    at(x + w, y, z + h),
                ],
                "ink-soft",
            );
        } else if (p.is === "cylinder") {
            const [cx, cb] = at(p.x, p.y, p.z),
                [, ct] = at(p.x, p.y, p.z + p.h),
                rx = p.r * S,
                ry = p.r * S * 0.4;
            pen.path(
                g,
                `M${cx - rx} ${cb}L${cx - rx} ${ct}L${cx + rx} ${ct}L${cx + rx} ${cb}A${rx} ${ry} 0 0 1 ${cx - rx} ${cb}Z`,
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            pen.ellipse(g, cx, ct, 2 * rx, 2 * ry, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        } else if (p.is === "ball") {
            const [cx, cy] = at(p.x, p.y, p.z + p.r);
            pen.circle(g, cx, cy, 2 * p.r * S, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
            pen.arc(g, cx, cy, 1.4 * p.r * S, 1.4 * p.r * S, 0.2, 1.3, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        } else if (p.is === "extruded") {
            const n = p.profile.length;
            p.profile.forEach(([ax, az], i) => {
                const [bx, bz] = p.profile[(i + 1) % n] ?? [ax, az];
                // a strip going back from an edge shows when the profile's outside there faces up or right
                const up = bx < ax && bz === az,
                    right = bz > az && bx === ax;
                if (up || right)
                    face(
                        [at(ax, 0, az), at(bx, 0, bz), at(bx, p.d, bz), at(ax, p.d, az)],
                        up ? "card" : "ink-soft",
                    );
            });
            face(
                p.profile.map(([x, z]) => at(x, 0, z)),
                "card",
            );
        } else {
            const { x, y, z, w, h } = p,
                apex = at(x + w / 2, y + w / 2, z + h);
            face([at(x, y, z), at(x + w, y, z), apex], "card");
            face([at(x + w, y, z), at(x + w, y + w, z), apex], "ink-soft");
        }
    }
}

/** A fish carved on a panel, seen from the front, with its eye and fins, centred on (cx, cy) and `s` squares long. */
function fish<G>(c: Ctx<G>, cx: number, cy: number, s: number, kind: number): void {
    const { pen, g } = c,
        L = s * U,
        h = L * 0.32;
    const body = (x: number, y: number): string =>
        `M${x - L / 2} ${y}Q${x - L / 6} ${y - h} ${x + L / 4} ${y - h * 0.2}L${x + L / 2} ${y - h * 0.7}L${x + L / 2} ${y + h * 0.7}L${x + L / 4} ${y + h * 0.2}Q${x - L / 6} ${y + h} ${x - L / 2} ${y}Z`;
    // the shadow falls where light from the top left meets the figure's edge: outside a raised one, inside a cut one
    if (kind === 2)
        pen.path(g, body(cx, cy), "ruler", pen.fill("ink-soft", "hachure", { hachureGap: 5 }), {
            strokeWidth: 2.4,
        });
    else {
        const off = kind === 1 ? 4 : 2;
        pen.path(
            g,
            body(cx + off, cy + off),
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
            {
                strokeWidth: 0,
            },
        );
        pen.path(g, body(cx, cy), "ruler", pen.fill("card"), { strokeWidth: 1.8 });
    }
    pen.circle(g, cx - L / 4, cy - h * 0.15, 4, "ruler", pen.fill("ink"), { strokeWidth: 1 });
}

/** One relief: the panel from the front with a dashed cut across it, and under it the panel cut through there. */
function relief<G>(c: Ctx<G>, kind: number, ox: number, w: number, label: string): void {
    const { pen, g } = c,
        top = 1.2 * U,
        panelH = 3.6 * U,
        cy = top + panelH / 2;
    pen.rect(g, ox, top, w, panelH, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
    fish(c, ox + w / 2, cy, Math.min(4.2, w / U - 1.2), kind);
    pen.line(g, ox - 0.3 * U, cy, ox + w + 0.3 * U, cy, "ruler", {
        strokeWidth: 1.2,
        stroke: c.t.pen,
        strokeLineDash: [6, 4],
    });
    // the section: the panel's ground as a band, and the fish's profile standing out of it or cut into it
    const ground = 8.4 * U,
        back = 9.6 * U,
        L = Math.min(4.2, w / U - 1.2) * U,
        x0 = ox + w / 2 - L / 2,
        x1 = ox + w / 2 + L / 2,
        r = RELIEFS[kind] ?? RELIEFS[0],
        rise = r.rise * U,
        cut = r.cut * U;
    const profile =
        kind === 2
            ? `M${ox} ${ground}L${x0} ${ground}L${x0 + 3} ${ground + cut}Q${(x0 + x1) / 2} ${ground + cut * 0.35} ${x1 - 3} ${ground + cut}L${x1} ${ground}L${ox + w} ${ground}L${ox + w} ${back}L${ox} ${back}Z`
            : kind === 1
              ? `M${ox} ${ground}L${x0 + 6} ${ground}Q${x0 - 4} ${ground - rise * 0.5} ${x0 + 10} ${ground - rise}Q${(x0 + x1) / 2} ${ground - rise * 1.15} ${x1 - 10} ${ground - rise}Q${x1 + 4} ${ground - rise * 0.5} ${x1 - 6} ${ground}L${ox + w} ${ground}L${ox + w} ${back}L${ox} ${back}Z`
              : `M${ox} ${ground}L${x0} ${ground}Q${x0 + 8} ${ground - rise} ${(x0 + x1) / 2} ${ground - rise}Q${x1 - 8} ${ground - rise} ${x1} ${ground}L${ox + w} ${ground}L${ox + w} ${back}L${ox} ${back}Z`;
    pen.path(g, profile, "ruler", pen.fill("ink-soft", "hachure", { hachureGap: 5 }), {
        strokeWidth: 1.8,
    });
    soft(c, ox + w / 2, 6.3 * U, "cut through", 11);
    say(c, ox + w / 2, 11 * U, label, 13);
}

interface SculptureParams {
    /** 0 a solid's three views, 1 reliefs cut through. */
    mode: number;
    shape: number;
    /** A view that waits under a question mark: 0 none, 1 front, 2 left, 3 top. */
    ask: number;
    /** 1 draws the solid itself beside its views. */
    solid: number;
    /** 0 low, 1 high, 2 sunk relief, or -1 for all three side by side. */
    kind: number;
    /** 1 names each relief; 0 letters them A, B and C. */
    names: number;
}

const VIEWS: View[] = ["front", "left", "top"];

/** The squares the three views take, and the solid beside them: its width across and depth going back at half length. */
function viewsBox(shape: number, withSolid: boolean): { w: number; h: number } {
    const front = extentOf(shape, "front"),
        left = extentOf(shape, "left"),
        top = extentOf(shape, "top"),
        sq = S / U,
        oblique = withSolid ? 1.5 + (front.w + top.h * 0.5 * Math.SQRT1_2) * sq : 0;
    return {
        w: Math.ceil(1 + front.w * sq + 2 + Math.max(5, left.w * sq + oblique) + 0.5),
        h: Math.ceil(1.4 + front.h * sq + 1.6 + top.h * sq + 0.6),
    };
}

export const sculpture = defineDrawing<SculptureParams>({
    id: "sculpture",
    family: "art",
    title: "Sculpture: views and relief",
    group: "Structures",
    about: "Sculpture on squared paper. With `mode` 0 a solid (`shape`: 0 a ball on a column on a plinth, 1 a pyramid on a plinth, 2 a block with a step, 3 an arch of three stones) is drawn from the front, from the left (to the right of the front) and from above (under the front), and the three agree: the front and the top are as wide, the front and the left as tall, and the left as wide as the top is deep. `solid` draws it in the round beside them, and `ask` hides one view (1 front, 2 left, 3 top). With `mode` 1 a carved fish is shown as a relief and cut through: low relief standing out less than half its depth, high relief more than half with its edges undercut, and sunk relief cut into the ground (`kind` 0, 1, 2, or -1 for all three), named or lettered (`names`).",
    params: { mode: 0, shape: 0, ask: 0, solid: 1, kind: -1, names: 1 },
    settings: {
        mode: { kind: "whole", min: 0, max: 1 },
        shape: { kind: "whole", min: 0, max: 3 },
        ask: { kind: "whole", min: 0, max: 3 },
        solid: { kind: "whole", min: 0, max: 1 },
        kind: { kind: "whole", min: -1, max: 2 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A ball on a column, three views",
            params: { mode: 0, shape: 0, ask: 0, solid: 1, kind: -1, names: 1 },
        },
        {
            label: "A pyramid, its top view asked",
            params: { mode: 0, shape: 1, ask: 3, solid: 1, kind: -1, names: 1 },
        },
        {
            label: "A block with a step",
            params: { mode: 0, shape: 2, ask: 0, solid: 1, kind: -1, names: 1 },
        },
        {
            label: "An arch, views only, the left asked",
            params: { mode: 0, shape: 3, ask: 2, solid: 0, kind: -1, names: 1 },
        },
        {
            label: "Three reliefs, named",
            params: { mode: 1, shape: 0, ask: 0, solid: 0, kind: -1, names: 1 },
        },
        {
            label: "Three reliefs, lettered",
            params: { mode: 1, shape: 0, ask: 0, solid: 0, kind: -1, names: 0 },
        },
        {
            label: "High relief alone",
            params: { mode: 1, shape: 0, ask: 0, solid: 0, kind: 1, names: 1 },
        },
    ],
    box: (p) =>
        Math.round(p.mode) === 1
            ? { w: Math.round(p.kind) < 0 ? 24 : 10, h: 12 }
            : viewsBox(p.shape, Math.round(p.solid) === 1),
    draw: (c, p) => {
        const a: RawAnchors = {};
        if (Math.round(p.mode) === 1) {
            const one = Math.round(p.kind);
            const kinds = one < 0 ? [0, 1, 2] : [Math.min(2, one)];
            kinds.forEach((k, i) => {
                const ox = (0.8 + i * 7.9) * U;
                relief(
                    c,
                    k,
                    ox,
                    6.6 * U + (one < 0 ? 0 : 1.8 * U),
                    Math.round(p.names) === 1 ? (RELIEFS[k]?.name ?? "") : "ABC".charAt(i),
                );
                a[`relief(${i})`] = [ox + 3.3 * U, 1.2 * U, "up"];
            });
            return a;
        }
        const shape = Math.round(p.shape),
            front = extentOf(shape, "front"),
            left = extentOf(shape, "left"),
            ox = 1 * U,
            base = 1.4 * U + front.h * S,
            sx = ox + front.w * S + 2 * U,
            topBase = base + 1.6 * U + extentOf(shape, "top").h * S;
        VIEWS.forEach((v, i) => {
            const x = v === "left" ? sx : ox,
                b = v === "top" ? topBase : base;
            view(c, shape, v, x, b, Math.round(p.ask) === i + 1);
            a[v] = [x, b, "down"];
        });
        if (Math.round(p.solid) === 1) {
            const x = sx + left.w * S + 1.5 * U;
            solid(c, shape, x, topBase);
            a.solid = [x, topBase, "down"];
        }
        return a;
    },
    describe: (p) =>
        Math.round(p.mode) === 1
            ? "A carved fish on a panel shown as a relief, with a dashed line across it and the panel cut through along that line underneath."
            : `Three views of ${solidOf(p.shape).name}: from the front, from the left beside it and from above underneath${Math.round(p.solid) === 1 ? ", and the solid itself" : ""}.`,
});
