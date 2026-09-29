// The characters of the six whole books grades five and six read, each a specific person or animal
// from its book's own words and first pictures: the people are the figure kit dressed for their
// time, and Toad and Buck are drawn as the Pup family and the wolf are.
import { part, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import {
    FIRM,
    calm,
    cloth,
    figure,
    lookOf,
    personBox,
    type PersonParams,
    type Pose,
    type Torso,
} from "../people/figure";

export const BOOK_CAST = [
    "toad",
    "mole",
    "rat",
    "alice",
    "caterpillar",
    "cat",
    "mary",
    "buck",
    "jim",
    "bedford",
    "cavor",
    "sphere",
    "tortoise",
] as const;
type Who = (typeof BOOK_CAST)[number];
export const CAST_POSES = [
    "stand",
    "walk",
    "wave",
    "hold",
    "point",
    "think",
    "pull",
    "fade",
    "open",
] as const;
type CastPose = (typeof CAST_POSES)[number];

interface CastParams {
    who: Who;
    pose: CastPose;
    /** Which way they face: 1 to the right, -1 to the left. */
    dir: number;
}

type Pt = [number, number];

/** The poses each can take; any other is drawn standing. */
const CAN: Record<Who, readonly CastPose[]> = {
    toad: ["stand", "walk", "wave"],
    alice: ["stand", "walk", "wave", "hold", "point", "think"],
    mary: ["stand", "walk", "wave", "hold", "point", "think"],
    buck: ["stand", "walk", "pull"],
    jim: ["stand", "walk", "wave", "hold", "point", "think"],
    bedford: ["stand", "walk", "wave", "hold", "point", "think"],
    cavor: ["stand", "walk", "wave", "hold", "point", "think"],
    mole: ["stand", "walk", "wave"],
    rat: ["stand", "walk", "wave"],
    caterpillar: ["stand"],
    cat: ["stand", "fade"],
    tortoise: ["stand", "walk"],
    sphere: ["stand", "open"],
};
const poseOf = (p: CastParams): CastPose => (CAN[p.who].includes(p.pose) ? p.pose : "stand");

const person = (who: Who, pose: Pose, dir: number): PersonParams => {
    const base: PersonParams = {
        pose,
        age: "child",
        tone: 1,
        hair: "short",
        colour: "brown",
        top: "white",
        sleeves: "long",
        print: "none",
        wear: "trousers",
        bottom: "grey",
        pattern: "plain",
        legs: "covered",
        feet: "shoes",
        glasses: false,
        hearing: "none",
        aid: "none",
        mood: "happy",
        dir,
        holding: "",
    };
    if (who === "alice")
        return {
            ...base,
            hair: "long",
            colour: "blonde",
            top: "glow",
            sleeves: "short",
            wear: "dress",
        };
    if (who === "mary")
        return {
            ...base,
            hair: "bob",
            colour: "blonde",
            top: "mint",
            wear: "dress",
            mood: "worried",
        };
    if (who === "jim") return { ...base, tone: 2, top: "sky", wear: "shorts", bottom: "tang" };
    if (who === "bedford") return { ...base, age: "grownup", top: "sky", bottom: "sky" };
    return { ...base, age: "grownup", hair: "short", colour: "grey", top: "tang", wear: "shorts" };
};

/** Mr Cavor is short and round with thin legs, so his build is a grown-up's cut down. */
const cavorBuild = (look: ReturnType<typeof lookOf>): ReturnType<typeof lookOf> => ({
    ...look,
    b: { ...look.b, head: 114, shoulder: 96, hip: 55, sw: 17, hw: 16.5, leg: 4.4, ua: 18, fa: 17 },
});

const card = <G>(c: Ctx<G>) => c.pen.fill("card");

/** What each wears over the figure's clothes, drawn under the arms. */
function over<G>(c: Ctx<G>, who: Who, t: Torso, sw: number): void {
    const { pen, g } = c;
    const x = t.x;
    if (who === "alice") {
        const bib: Pt[] = [
            [x - sw * 0.55, t.shoulderY + 6],
            [x + sw * 0.55, t.shoulderY + 6],
            [x + sw * 0.62, t.hipY],
            [x + sw * 1.05, t.hemY - 3],
            [x - sw * 1.05, t.hemY - 3],
            [x - sw * 0.62, t.hipY],
        ];
        pen.polygon(g, bib, "pencil", card(c), calm(c, 1.3));
        for (const s of [-1, 1])
            pen.line(
                g,
                x + s * sw * 0.55,
                t.shoulderY + 6,
                x + s * sw * 0.8,
                t.shoulderY + 1,
                "ruler",
                {
                    strokeWidth: 1.3,
                    ...FIRM,
                },
            );
        pen.line(g, x - sw * 0.62, t.hipY, x + sw * 0.62, t.hipY, "ruler", {
            strokeWidth: 1.1,
            ...FIRM,
        });
    }
    if (who === "mary") {
        const hem = t.hemY + 5;
        pen.polygon(
            g,
            [
                [x - sw - 1, t.shoulderY + 1],
                [x + sw + 1, t.shoulderY + 1],
                [x + sw + 4, hem],
                [x - sw - 4, hem],
            ],
            "pencil",
            c.pen.fill("mint"),
            calm(c, 1.6),
        );
        pen.line(g, x, t.shoulderY + 4, x, hem, "ruler", { strokeWidth: 1.1, ...FIRM });
        for (const s of [-1, 1])
            pen.polygon(
                g,
                [
                    [x, t.shoulderY + 1],
                    [x + s * sw * 0.7, t.shoulderY],
                    [x + s * sw * 0.35, t.shoulderY + 9],
                ],
                "ruler",
                card(c),
                { strokeWidth: 1.1, ...FIRM },
            );
        for (const k of [0, 1, 2])
            pen.circle(
                g,
                x + 3,
                t.shoulderY + 14 + k * 9,
                3,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8, ...FIRM },
            );
    }
    if (who === "jim") {
        pen.polygon(
            g,
            [
                [x - sw * 0.42, t.shoulderY + 1],
                [x + sw * 0.42, t.shoulderY + 1],
                [x + sw * 0.3, t.hipY + 3],
                [x - sw * 0.3, t.hipY + 3],
            ],
            "ruler",
            card(c),
            { strokeWidth: 1.1, ...FIRM },
        );
        for (const s of [-1, 1]) {
            pen.line(g, x + s * sw * 0.42, t.shoulderY + 1, x + s * sw * 0.3, t.hipY + 6, "ruler", {
                strokeWidth: 1.3,
                ...FIRM,
            });
            for (const k of [0, 1, 2])
                pen.circle(g, x + s * sw * 0.55, t.shoulderY + 8 + k * 7, 2.6, "ruler", card(c), {
                    strokeWidth: 0.9,
                    ...FIRM,
                });
        }
    }
    if (who === "bedford") {
        pen.polygon(
            g,
            [
                [x - sw * 0.38, t.shoulderY + 1],
                [x + sw * 0.38, t.shoulderY + 1],
                [x, t.shoulderY + 22],
            ],
            "ruler",
            card(c),
            { strokeWidth: 1.1, ...FIRM },
        );
        pen.polygon(
            g,
            [
                [x - 2.5, t.shoulderY + 3],
                [x + 2.5, t.shoulderY + 3],
                [x + 3.5, t.shoulderY + 18],
                [x, t.shoulderY + 22],
                [x - 3.5, t.shoulderY + 18],
            ],
            "ruler",
            c.pen.fill("berry"),
            { strokeWidth: 1, ...FIRM },
        );
        for (const k of [0, 1])
            pen.circle(g, x + 2, t.shoulderY + 28 + k * 8, 2.6, "ruler", card(c), {
                strokeWidth: 0.9,
                ...FIRM,
            });
    }
    if (who === "cavor") {
        const knee = t.base - 24;
        for (const d of [-1, 1])
            pen.path(
                g,
                `M${x + d * 2} ${t.hipY}L${x + d * sw * 1.05} ${t.hipY}Q${x + d * sw * 1.3} ${knee - 10} ${x + d * sw * 0.85} ${knee}L${x + d * 3} ${knee}Z`,
                "pencil",
                cloth(c, "grey"),
                calm(c, 1.5),
            );
        for (const d of [-1, 1])
            pen.line(g, x + d * 4, knee, x + d * sw * 0.8, knee, "ruler", {
                strokeWidth: 2.4,
                ...FIRM,
            });
        const mid = (t.shoulderY + t.hipY) / 2 + 4;
        pen.ellipse(
            g,
            x,
            mid,
            sw * 2.5,
            t.hipY - t.shoulderY + 16,
            "pencil",
            c.pen.fill("tang", "solid", { hachureGap: 8 }),
            calm(c, 1.7),
        );
        pen.line(g, x, t.shoulderY + 6, x, t.hipY + 10, "ruler", { strokeWidth: 1.2, ...FIRM });
        for (const d of [-1, 1])
            pen.polygon(
                g,
                [
                    [x, t.shoulderY + 1],
                    [x + d * sw * 0.75, t.shoulderY + 1],
                    [x + d * 2, t.shoulderY + 16],
                ],
                "ruler",
                c.pen.fill("tang"),
                { strokeWidth: 1.2, ...FIRM },
            );
        for (const k of [0, 1, 2])
            pen.circle(
                g,
                x + 4,
                mid - 8 + k * 9,
                3,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8, ...FIRM },
            );
    }
}

/** What each wears on the head, drawn over the figure's head. */
function hat<G>(c: Ctx<G>, who: Who, hx: number, hy: number, r: number, s: number): void {
    const { pen, g } = c;
    if (who === "alice")
        pen.path(
            g,
            `M${hx - r * 0.95} ${hy - r * 0.4}Q${hx} ${hy - r * 1.55} ${hx + r * 0.95} ${hy - r * 0.4}`,
            "ruler",
            null,
            { strokeWidth: 3.2, stroke: c.t.sky, ...FIRM },
        );
    if (who === "mary") {
        pen.path(
            g,
            `M${hx - r * 0.85} ${hy - r * 0.55}Q${hx - r * 0.85} ${hy - r * 1.5} ${hx} ${hy - r * 1.5}Q${hx + r * 0.85} ${hy - r * 1.5} ${hx + r * 0.85} ${hy - r * 0.55}Z`,
            "pencil",
            card(c),
            calm(c, 1.4),
        );
        pen.ellipse(g, hx, hy - r * 0.55, r * 3.1, r * 0.62, "pencil", card(c), calm(c, 1.4));
        pen.line(g, hx - r * 0.85, hy - r * 0.8, hx + r * 0.85, hy - r * 0.8, "ruler", {
            strokeWidth: 2.4,
            stroke: c.t["ink-soft"],
            ...FIRM,
        });
    }
    if (who === "jim")
        pen.polygon(
            g,
            [
                [hx - r * 1.55, hy - r * 0.55],
                [hx - r * 0.75, hy - r * 1.55],
                [hx, hy - r * 1.25],
                [hx + r * 0.75, hy - r * 1.55],
                [hx + r * 1.55, hy - r * 0.55],
                [hx, hy - r * 0.8],
            ],
            "pencil",
            c.pen.fill("ink-soft"),
            calm(c, 1.5),
        );
    if (who === "bedford") {
        pen.path(
            g,
            `M${hx - r * 0.9} ${hy - r * 0.6}Q${hx - r * 0.95} ${hy - r * 1.75} ${hx} ${hy - r * 1.75}Q${hx + r * 0.95} ${hy - r * 1.75} ${hx + r * 0.9} ${hy - r * 0.6}Z`,
            "pencil",
            c.pen.fill("ink-soft"),
            calm(c, 1.5),
        );
        pen.ellipse(
            g,
            hx,
            hy - r * 0.6,
            r * 2.6,
            r * 0.4,
            "pencil",
            c.pen.fill("ink-soft"),
            calm(c, 1.4),
        );
    }
    if (who === "cavor") {
        pen.path(
            g,
            `M${hx - r * 0.95} ${hy - r * 0.45}Q${hx - r} ${hy - r * 1.45} ${hx} ${hy - r * 1.45}Q${hx + r} ${hy - r * 1.45} ${hx + r * 0.95} ${hy - r * 0.45}Z`,
            "pencil",
            c.pen.fill("sky"),
            calm(c, 1.5),
        );
        pen.path(
            g,
            `M${hx + s * r * 0.55} ${hy - r * 0.5}Q${hx + s * r * 1.2} ${hy - r * 0.5} ${hx + s * r * 1.3} ${hy - r * 0.3}L${hx + s * r * 0.45} ${hy - r * 0.38}Z`,
            "ruler",
            c.pen.fill("sky"),
            { strokeWidth: 1.3, ...FIRM },
        );
        pen.line(g, hx, hy - r * 1.45, hx, hy - r * 0.5, "ruler", { strokeWidth: 1, ...FIRM });
    }
}

/** What each holds out in both hands, centred where the figure's hands meet. */
function held<G>(c: Ctx<G>, who: Who, x: number, y: number): void {
    const { pen, g } = c;
    if (who === "alice") {
        pen.path(
            g,
            `M${x - 3} ${y - 13}L${x - 3} ${y - 8}Q${x - 8} ${y - 6} ${x - 8} ${y}L${x - 8} ${y + 8}Q${x - 8} ${y + 10} ${x - 6} ${y + 10}L${x + 6} ${y + 10}Q${x + 8} ${y + 10} ${x + 8} ${y + 8}L${x + 8} ${y}Q${x + 8} ${y - 6} ${x + 3} ${y - 8}L${x + 3} ${y - 13}Z`,
            "ruler",
            c.pen.fill("sky"),
            { strokeWidth: 1.3, ...FIRM },
        );
        pen.rect(g, x - 3.5, y - 17, 7, 5, "ruler", card(c), { strokeWidth: 1.1, ...FIRM });
        pen.rect(g, x - 6, y - 1, 12, 7, "ruler", card(c), { strokeWidth: 1, ...FIRM });
    }
    if (who === "mary") {
        const k = { strokeWidth: 2.6, ...FIRM },
            ky = y - 8;
        pen.circle(g, x - 12, ky, 13, "ruler", null, k);
        pen.line(g, x - 5.5, ky, x + 16, ky, "ruler", k);
        pen.line(g, x + 10, ky, x + 10, ky + 7, "ruler", k);
        pen.line(g, x + 15, ky, x + 15, ky + 8, "ruler", k);
    }
    if (who === "jim") {
        pen.rect(g, x - 14, y - 10, 28, 19, "ruler", card(c), { strokeWidth: 1.3, ...FIRM });
        pen.path(
            g,
            `M${x - 10} ${y + 4}Q${x - 4} ${y - 6} ${x + 2} ${y}T${x + 8} ${y - 4}`,
            "ruler",
            null,
            {
                strokeWidth: 1,
                strokeLineDash: [2, 2],
                ...FIRM,
            },
        );
        pen.line(g, x + 6, y - 7, x + 11, y - 2, "ruler", {
            strokeWidth: 1.6,
            stroke: c.t.berry,
            ...FIRM,
        });
        pen.line(g, x + 11, y - 7, x + 6, y - 2, "ruler", {
            strokeWidth: 1.6,
            stroke: c.t.berry,
            ...FIRM,
        });
    }
}

/** A thick line with round ends, for an arm or a leg. */
function capsule(a: Pt, b: Pt, w: number): string {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        d = Math.hypot(dx, dy) || 1,
        nx = (-dy / d) * w,
        ny = (dx / d) * w;
    return `M${a[0] + nx} ${a[1] + ny}L${b[0] + nx} ${b[1] + ny}A${w} ${w} 0 0 1 ${b[0] - nx} ${b[1] - ny}L${a[0] - nx} ${a[1] - ny}A${w} ${w} 0 0 1 ${a[0] + nx} ${a[1] + ny}Z`;
}

/** Two eyes with a highlight each, inside a part that blinks. */
function eyesAt<G>(c: Ctx<G>, pts: Pt[], d: number): void {
    const eyes = part(c, "eyes", pts[0] ?? [0, 0]);
    for (const [ex, ey] of pts) {
        eyes.pen.circle(
            eyes.g,
            ex,
            ey,
            d,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5, ...FIRM },
        );
        plain(eyes, {
            kind: "circle",
            cx: ex + d * 0.15,
            cy: ey - d * 0.15,
            r: d * 0.17,
            fill: c.t.card,
        });
    }
}

function drawToad<G>(c0: Ctx<G>, pose: CastPose, s: number): RawAnchors {
    const cx = 2.5 * U,
        floor = 6 * U - 4;
    const c = pose === "walk" ? part(c0, "step", [cx, floor]) : c0;
    const { pen, g } = c;
    const skin = pen.fill("mint", "solid", { hachureGap: 7 }),
        coat = pen.fill("tang", "solid", { hachureGap: 8 });
    const P = (dx: number, dy: number): Pt => [cx + dx, floor + dy];
    const stride = pose === "walk" ? 6 : 0;
    for (const d of [-1, 1]) {
        pen.path(
            g,
            capsule(P(d * 9, -32), P(d * 11 + d * s * stride, -6), 5.4),
            "pencil",
            skin,
            calm(c, 1.5),
        );
        pen.ellipse(g, ...P(d * 13 + d * s * stride + s * 3, -4), 22, 8, "ruler", skin, {
            strokeWidth: 1.3,
            ...FIRM,
        });
    }
    pen.path(
        g,
        `M${cx - 15} ${floor - 62}L${cx + 15} ${floor - 62}Q${cx + 20} ${floor - 58} ${cx + 21} ${floor - 50}L${cx + 25} ${floor - 26}Q${cx} ${floor - 21} ${cx - 25} ${floor - 26}L${cx - 21} ${floor - 50}Q${cx - 20} ${floor - 58} ${cx - 15} ${floor - 62}Z`,
        "pencil",
        coat,
        calm(c, 1.7),
    );
    pen.line(g, cx - 21, floor - 42, cx + 21, floor - 42, "ruler", { strokeWidth: 2.6, ...FIRM });
    pen.line(g, cx + s * 3, floor - 60, cx + s * 3, floor - 25, "ruler", {
        strokeWidth: 1.1,
        ...FIRM,
    });
    for (const k of [0, 1, 2])
        pen.circle(
            g,
            cx + s * 7,
            floor - 55 + k * 9,
            3.6,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            {
                strokeWidth: 0.9,
                ...FIRM,
            },
        );
    const arm = (d: number) => {
        const S = P(d * 16, -56),
            waving = pose === "wave" && d === s;
        const E = waving ? P(d * 30, -84) : P(d * 25, -32);
        const w = waving ? part(c, "wave", S, { dir: d }) : c;
        w.pen.path(w.g, capsule(S, E, 5.2), "pencil", coat, calm(c, 1.5));
        w.pen.circle(w.g, E[0], E[1] + (waving ? -3 : 3), 12, "ruler", skin, {
            strokeWidth: 1.2,
            ...FIRM,
        });
    };
    arm(-s);
    const hy = floor - 80;
    pen.ellipse(g, cx, hy, 64, 38, "pencil", skin, calm(c, 1.7));
    pen.path(g, `M${cx - 24} ${hy + 4}Q${cx} ${hy + 16} ${cx + 24} ${hy + 4}`, "ruler", null, {
        strokeWidth: 1.4,
        ...FIRM,
    });
    for (const d of [-1, 1]) {
        pen.circle(g, cx + d * 14, hy - 8, 17, "ruler", skin, { strokeWidth: 1.3, ...FIRM });
        pen.circle(
            g,
            cx + d * 2,
            hy - 2,
            2.2,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5, ...FIRM },
        );
    }
    eyesAt(
        c,
        [
            [cx - 14 + s * 1.5, hy - 8],
            [cx + 14 + s * 1.5, hy - 8],
        ],
        6.5,
    );
    const top = hy - 17;
    pen.path(
        g,
        `M${cx - 19} ${top + 3}Q${cx - 18} ${top - 14} ${cx} ${top - 14}Q${cx + 18} ${top - 14} ${cx + 19} ${top + 3}Z`,
        "pencil",
        pen.fill("ink-soft"),
        calm(c, 1.5),
    );
    pen.path(
        g,
        `M${cx + s * 10} ${top + 1}Q${cx + s * 26} ${top + 1} ${cx + s * 30} ${top + 6}L${cx + s * 12} ${top + 5}Z`,
        "ruler",
        pen.fill("ink-soft"),
        { strokeWidth: 1.3, ...FIRM },
    );
    pen.line(g, cx - 19, top - 3, cx + 19, top - 3, "ruler", { strokeWidth: 2.2, ...FIRM });
    for (const d of [-1, 1])
        pen.circle(g, cx + d * 8, top - 4, 12, "ruler", card(c), { strokeWidth: 1.6, ...FIRM });
    arm(s);
    return {
        head: [cx, top - 14, "up"],
        face: [cx + s * 30, hy, s > 0 ? "right" : "left"],
        feet: [cx, floor, "down"],
    };
}

function drawBuck<G>(c0: Ctx<G>, pose: CastPose, s: number): RawAnchors {
    const W = 8 * U,
        floor = 5 * U - 4,
        cx = W / 2;
    const c = pose === "walk" || pose === "pull" ? part(c0, "step", [cx, floor]) : c0;
    const { pen, g } = c;
    // a coat this big opens its hatch on paper, and the harness prints as card so its straps stay clear
    const coat = pen.fill("tang", "solid", { hachureGap: 9 }),
        pale = card(c),
        harness = c.paper ? pale : pen.fill("sky"),
        pulling = pose === "pull";
    const X = (dx: number) => cx + s * dx;
    const bodyY = pulling ? 50 : 46;
    const step = pose === "walk" ? 7 : 0;
    // back far, back near, front far, front near: hip, and how far forward the paw lands
    const legs: [number, number, boolean][] = pulling
        ? [
              [-30, -14, false],
              [-38, -10, true],
              [30, 14, false],
              [22, 8, true],
          ]
        : [
              [-30, -step, false],
              [-38, step * 0.6, true],
              [30, step, false],
              [22, -step * 0.4, true],
          ];
    const tailAt: Pt = [X(-46), bodyY - 10];
    const tail = part(c, "tail", tailAt);
    tail.pen.path(
        tail.g,
        `M${X(-46)} ${bodyY - 2}Q${X(-72)} ${bodyY - 6} ${X(-70)} ${bodyY - 32}Q${X(-68)} ${bodyY - 40} ${X(-60)} ${bodyY - 34}Q${X(-58)} ${bodyY - 18} ${X(-42)} ${bodyY - 16}Z`,
        "pencil",
        coat,
        calm(c, 1.5),
    );
    const leg = (hipX: number, reach: number, near: boolean) => {
        const top: Pt = [X(hipX), bodyY + 6],
            foot: Pt = [X(hipX + reach), floor - 6];
        pen.path(
            g,
            capsule(top, foot, near ? 7.5 : 6.8),
            "pencil",
            near ? coat : pen.fill("ink-soft"),
            calm(c, 1.5),
        );
        pen.ellipse(g, foot[0] + s * 3, floor - 4, 19, 9, "ruler", pale, {
            strokeWidth: 1.3,
            ...FIRM,
        });
    };
    for (const [hipX, reach, near] of legs) if (!near) leg(hipX, reach, near);
    for (const [hipX, reach, near] of legs) if (near) leg(hipX, reach, near);
    pen.ellipse(g, X(-6), bodyY, 96, 46, "pencil", coat, calm(c, 1.8));
    pen.ellipse(g, X(26), bodyY + 6, 24, 30, "ruler", pale, { strokeWidth: 1.1, ...FIRM });
    // the sled harness: a band round the chest behind the front legs, a strap along the back and the trace to the sled
    pen.path(g, capsule([X(10), bodyY - 21], [X(12), bodyY + 20], 3.4), "ruler", harness, {
        strokeWidth: 1.2,
        ...FIRM,
    });
    pen.path(g, capsule([X(-44), bodyY - 19], [X(28), bodyY - 19], 2.8), "ruler", harness, {
        strokeWidth: 1.1,
        ...FIRM,
    });
    const trace: Pt = [X(-48), bodyY - 14];
    pen.line(g, trace[0], trace[1], X(-76), pulling ? bodyY - 12 : bodyY + 16, "ruler", {
        strokeWidth: 1.8,
        stroke: c.t["ink-soft"],
        ...FIRM,
    });
    const hx = X(pulling ? 48 : 44),
        hy = pulling ? bodyY - 18 : bodyY - 24;
    pen.path(
        g,
        capsule([X(24), bodyY - 8], [hx - s * 6, hy + 6], 14),
        "pencil",
        coat,
        calm(c, 1.6),
    );
    pen.path(g, capsule([X(26), bodyY - 20], [X(36), bodyY + 2], 3.8), "ruler", harness, {
        strokeWidth: 1.2,
        ...FIRM,
    });
    pen.circle(g, hx, hy, 40, "pencil", coat, calm(c, 1.7));
    pen.path(g, capsule([hx + s * 2, hy - 17], [hx + s * 8, hy + 2], 3.6), "ruler", pale, {
        strokeWidth: 1,
        ...FIRM,
    });
    const snout: Pt = [hx + s * 16, hy + 8];
    pen.ellipse(g, ...snout, 26, 20, "pencil", pale, calm(c, 1.4));
    pen.ellipse(
        g,
        snout[0] + s * 11,
        snout[1] - 4,
        9,
        7,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.8, ...FIRM },
    );
    pen.path(
        g,
        `M${snout[0] - s * 4} ${snout[1] + 6}Q${snout[0] + s * 3} ${snout[1] + 9} ${snout[0] + s * 10} ${snout[1] + 4}`,
        "ruler",
        null,
        { strokeWidth: 1.1, ...FIRM },
    );
    pen.path(
        g,
        `M${hx - s * 6} ${hy - 16}Q${hx - s * 22} ${hy - 14} ${hx - s * 20} ${hy + 12}Q${hx - s * 12} ${hy + 16} ${hx - s * 5} ${hy - 2}Z`,
        "pencil",
        pen.fill("ink-soft"),
        calm(c, 1.4),
    );
    eyesAt(c, [[hx + s * 8, hy - 5]], 5.6);
    return {
        head: [hx, hy - 20, "up"],
        face: [snout[0] + s * 13, snout[1], s > 0 ? "right" : "left"],
        harness: [trace[0], trace[1], s > 0 ? "left" : "right"],
        feet: [cx, floor, "down"],
    };
}

const OWN_BOX: Partial<Record<Who, { w: number; h: number }>> = {
    mole: { w: 4, h: 5 },
    rat: { w: 4, h: 6 },
    caterpillar: { w: 6, h: 7 },
    cat: { w: 6, h: 5 },
    tortoise: { w: 6, h: 4 },
    sphere: { w: 7, h: 7 },
};

const INK = <G>(c: Ctx<G>) => ({ fill: c.t.ink, fillStyle: "solid" });

/** An upright animal's two arms, the near one waving when it waves, ending in paws. */
function uprightArms<G>(
    c: Ctx<G>,
    fur: ReturnType<Ctx<G>["pen"]["fill"]>,
    paw: ReturnType<Ctx<G>["pen"]["fill"]>,
    at: { cx: number; y: number; sw: number; drop: number; w: number; paw: number },
    waving: boolean,
    s: number,
    side: number,
): void {
    const S: Pt = [at.cx + side * at.sw, at.y],
        up = waving && side === s;
    const E: Pt = up
        ? [at.cx + side * (at.sw + 10), at.y - 26]
        : [at.cx + side * (at.sw + 7), at.y + at.drop];
    const w = up ? part(c, "wave", S, { dir: side }) : c;
    w.pen.path(w.g, capsule(S, E, at.w), "pencil", fur, calm(c, 1.5));
    w.pen.ellipse(w.g, E[0], E[1] + (up ? -2 : 2), at.paw, at.paw * 0.85, "ruler", paw, {
        strokeWidth: 1.2,
        ...FIRM,
    });
}

function drawMole<G>(c0: Ctx<G>, pose: CastPose, s: number): RawAnchors {
    const cx = 2 * U,
        floor = 5 * U - 4;
    const c = pose === "walk" ? part(c0, "step", [cx, floor]) : c0;
    const { pen, g } = c;
    const fur = pen.fill("ink-soft", "solid", { hachureGap: 7 }),
        pink = pen.fill("berry");
    const stride = pose === "walk" ? 5 : 0;
    for (const d of [-1, 1]) {
        pen.path(
            g,
            capsule([cx + d * 8, floor - 24], [cx + d * 9 + d * s * stride, floor - 6], 5),
            "pencil",
            fur,
            calm(c, 1.5),
        );
        pen.ellipse(g, cx + d * 10 + d * s * stride + s * 3, floor - 4, 16, 7, "ruler", pink, {
            strokeWidth: 1.2,
            ...FIRM,
        });
    }
    pen.ellipse(g, cx, floor - 38, 42, 48, "pencil", fur, calm(c, 1.7));
    const arms = { cx, y: floor - 50, sw: 16, drop: 18, w: 4.6, paw: 13 };
    uprightArms(c, fur, pink, arms, pose === "wave", s, -s);
    const hy = floor - 70;
    pen.path(
        g,
        `M${cx - s * 16} ${hy + 8}Q${cx - s * 18} ${hy - 14} ${cx} ${hy - 14}Q${cx + s * 14} ${hy - 13} ${cx + s * 28} ${hy + 3}Q${cx + s * 14} ${hy + 14} ${cx - s * 16} ${hy + 8}Z`,
        "pencil",
        fur,
        calm(c, 1.6),
    );
    pen.circle(g, cx + s * 29, hy + 3, 8, "ruler", pink, { strokeWidth: 1.2, ...FIRM });
    for (const k of [-1, 1])
        pen.line(g, cx + s * 22, hy + 5, cx + s * 30, hy + 7 + k * 6, "ruler", {
            strokeWidth: 0.9,
            ...FIRM,
        });
    pen.circle(g, cx - s * 4, hy - 12, 8, "ruler", fur, { strokeWidth: 1.1, ...FIRM });
    pen.circle(g, cx + s * 9, hy - 3, 7, "ruler", card(c), { strokeWidth: 0.9, ...FIRM });
    eyesAt(c, [[cx + s * 9.5, hy - 3]], 4);
    uprightArms(c, fur, pink, arms, pose === "wave", s, s);
    return {
        head: [cx, hy - 14, "up"],
        face: [cx + s * 30, hy + 3, s > 0 ? "right" : "left"],
        feet: [cx, floor, "down"],
    };
}

function drawRat<G>(c0: Ctx<G>, pose: CastPose, s: number): RawAnchors {
    const cx = 2 * U,
        floor = 6 * U - 4;
    const c = pose === "walk" ? part(c0, "step", [cx, floor]) : c0;
    const { pen, g } = c;
    const fur = pen.fill("tang", "solid", { hachureGap: 7 }),
        pale = card(c);
    const tailAt: Pt = [cx - s * 12, floor - 26];
    const tail = part(c, "tail", tailAt);
    tail.pen.path(
        tail.g,
        `M${tailAt[0]} ${tailAt[1]}Q${cx - s * 34} ${floor - 18} ${cx - s * 30} ${floor - 6}T${cx - s * 8} ${floor - 3}`,
        "pencil",
        null,
        calm(c, 2.4),
    );
    const stride = pose === "walk" ? 5 : 0;
    for (const d of [-1, 1]) {
        pen.path(
            g,
            capsule([cx + d * 8, floor - 30], [cx + d * 9 + d * s * stride, floor - 6], 5),
            "pencil",
            fur,
            calm(c, 1.5),
        );
        pen.ellipse(g, cx + d * 10 + d * s * stride + s * 4, floor - 4, 17, 7, "ruler", pale, {
            strokeWidth: 1.2,
            ...FIRM,
        });
    }
    pen.ellipse(g, cx, floor - 44, 40, 54, "pencil", fur, calm(c, 1.7));
    pen.ellipse(g, cx + s * 4, floor - 40, 20, 34, "ruler", pale, { strokeWidth: 1, ...FIRM });
    const arms = { cx, y: floor - 60, sw: 15, drop: 20, w: 4.4, paw: 10 };
    uprightArms(c, fur, pale, arms, pose === "wave", s, -s);
    const hy = floor - 84;
    pen.circle(g, cx - s * 8, hy - 12, 13, "ruler", fur, { strokeWidth: 1.2, ...FIRM });
    pen.circle(g, cx - s * 8, hy - 12, 6, "ruler", pale, { strokeWidth: 0.9, ...FIRM });
    pen.ellipse(g, cx, hy, 32, 26, "pencil", fur, calm(c, 1.6));
    pen.ellipse(g, cx + s * 15, hy + 4, 18, 14, "pencil", fur, calm(c, 1.4));
    pen.circle(g, cx + s * 23, hy + 2, 6, "ruler", INK(c), { strokeWidth: 0.8, ...FIRM });
    for (const k of [-1, 1])
        pen.line(g, cx + s * 18, hy + 7, cx + s * 30, hy + 8 + k * 5, "ruler", {
            strokeWidth: 0.9,
            ...FIRM,
        });
    eyesAt(c, [[cx + s * 6, hy - 3]], 4.6);
    const top = hy - 12;
    pen.rect(g, cx - 10, top - 10, 20, 10, "ruler", pale, { strokeWidth: 1.3, ...FIRM });
    pen.line(g, cx - 10, top - 3, cx + 10, top - 3, "ruler", {
        strokeWidth: 2.6,
        stroke: c.t.sky,
        ...FIRM,
    });
    pen.ellipse(g, cx, top, 38, 6, "ruler", pale, { strokeWidth: 1.3, ...FIRM });
    uprightArms(c, fur, pale, arms, pose === "wave", s, s);
    return {
        head: [cx, top - 10, "up"],
        face: [cx + s * 26, hy + 3, s > 0 ? "right" : "left"],
        feet: [cx, floor, "down"],
    };
}

function drawCaterpillar<G>(c: Ctx<G>, s: number): RawAnchors {
    const { pen, g } = c,
        cx = 3 * U,
        floor = 7 * U - 4;
    pen.path(
        g,
        `M${cx - 9} ${floor - 44}L${cx - 12} ${floor - 2}Q${cx} ${floor + 1} ${cx + 12} ${floor - 2}L${cx + 9} ${floor - 44}Z`,
        "pencil",
        card(c),
        calm(c, 1.6),
    );
    const capY = floor - 42;
    pen.path(
        g,
        `M${cx - 54} ${capY}Q${cx - 50} ${capY - 34} ${cx} ${capY - 34}Q${cx + 50} ${capY - 34} ${cx + 54} ${capY}Q${cx} ${capY + 8} ${cx - 54} ${capY}Z`,
        "pencil",
        pen.fill("tang", "solid", { hachureGap: 8 }),
        calm(c, 1.8),
    );
    for (const [dx, dy, d] of [
        [-36, -10, 9],
        [36, -12, 10],
        [-16, -22, 7],
        [20, -26, 7],
        [-44, -2, 6],
        [46, -3, 6],
    ] as const)
        pen.circle(g, cx + dx, capY + dy, d, "ruler", card(c), { strokeWidth: 1, ...FIRM });
    const body = pen.fill("sky");
    const seg: Pt[] = (
        [
            [-s * 34, -39],
            [-s * 23, -41],
            [-s * 12, -41],
            [-s * 1, -40],
            [s * 7, -48],
            [s * 10, -58],
            [s * 10, -68],
        ] satisfies Pt[]
    ).map(([dx, dy]): Pt => [cx + dx, capY + dy + 4]);
    seg.forEach(([x, y], i) => {
        plain(c, { kind: "circle", cx: x, cy: y, r: i < 4 ? 7 : 8, fill: c.t.card });
        pen.circle(g, x, y, i < 4 ? 14 : 16, "ruler", body, { strokeWidth: 1.4, ...FIRM });
        if (i < 4) pen.line(g, x, y + 7, x - s * 2, y + 10, "ruler", { strokeWidth: 1.2, ...FIRM });
    });
    const arm = seg[5] ?? [cx, capY];
    pen.path(g, capsule([arm[0] - 7, arm[1] - 1], [arm[0] + 7, arm[1] + 2], 2.6), "ruler", body, {
        strokeWidth: 1.1,
        ...FIRM,
    });
    pen.path(g, capsule([arm[0] - 7, arm[1] + 4], [arm[0] + 7, arm[1] + 1], 2.6), "ruler", body, {
        strokeWidth: 1.1,
        ...FIRM,
    });
    const hx = cx + s * 14,
        hy = capY - 78;
    pen.ellipse(g, hx, hy, 24, 22, "pencil", body, calm(c, 1.6));
    for (const k of [-1, 1])
        pen.path(
            g,
            `M${hx + k * 4} ${hy - 10}Q${hx + k * 6} ${hy - 18} ${hx + k * 10} ${hy - 19}`,
            "ruler",
            null,
            { strokeWidth: 1.2, ...FIRM },
        );
    eyesAt(c, [[hx + s * 5, hy - 2]], 4);
    pen.path(
        g,
        `M${hx + s * 4} ${hy + 6}Q${hx + s * 8} ${hy + 8} ${hx + s * 11} ${hy + 5}`,
        "ruler",
        null,
        { strokeWidth: 1.1, ...FIRM },
    );
    return {
        head: [hx, hy - 19, "up"],
        face: [hx + s * 12, hy, s > 0 ? "right" : "left"],
        feet: [cx, floor, "down"],
    };
}

function drawCat<G>(c: Ctx<G>, pose: CastPose): RawAnchors {
    const { pen, g } = c,
        cx = 3 * U,
        floor = 5 * U - 4,
        fading = pose === "fade";
    const fur = fading ? null : pen.fill("tang", "solid", { hachureGap: 8 });
    const faint = { strokeWidth: 1.2, stroke: c.t["ink-soft"], strokeLineDash: [3, 5], ...FIRM };
    const line = fading ? faint : calm(c, 1.7);
    if (!fading) {
        const tail = part(c, "tail", [cx + 22, floor - 10]);
        tail.pen.path(
            tail.g,
            `M${cx + 22} ${floor - 8}Q${cx + 50} ${floor - 6} ${cx + 48} ${floor - 30}Q${cx + 46} ${floor - 44} ${cx + 38} ${floor - 40}Q${cx + 42} ${floor - 18} ${cx + 18} ${floor - 18}Z`,
            "pencil",
            fur,
            calm(c, 1.5),
        );
    }
    pen.path(
        g,
        `M${cx - 16} ${floor - 58}Q${cx - 34} ${floor - 30} ${cx - 26} ${floor - 3}L${cx + 26} ${floor - 3}Q${cx + 34} ${floor - 30} ${cx + 16} ${floor - 58}Z`,
        "pencil",
        fur,
        line,
    );
    if (!fading) {
        for (const k of [0, 1, 2])
            for (const d of [-1, 1])
                pen.path(
                    g,
                    `M${cx + d * 26} ${floor - 40 + k * 12}Q${cx + d * 18} ${floor - 38 + k * 12} ${cx + d * 14} ${floor - 34 + k * 12}`,
                    "ruler",
                    null,
                    { strokeWidth: 1.3, ...FIRM },
                );
        for (const d of [-1, 1])
            pen.ellipse(g, cx + d * 10, floor - 4, 16, 8, "ruler", card(c), {
                strokeWidth: 1.2,
                ...FIRM,
            });
    }
    const hy = floor - 62;
    for (const d of [-1, 1])
        pen.polygon(
            g,
            [
                [cx + d * 10, hy - 20],
                [cx + d * 25, hy - 31],
                [cx + d * 25, hy - 8],
            ],
            "pencil",
            fur,
            line,
        );
    pen.ellipse(g, cx, hy, 60, 46, "pencil", fur, line);
    if (!fading)
        for (const k of [-1, 0, 1])
            pen.line(g, cx + k * 7, hy - 22, cx + k * 6, hy - 14, "ruler", {
                strokeWidth: 1.3,
                ...FIRM,
            });
    const eyes = part(c, "eyes", [cx, hy - 6]);
    for (const d of [-1, 1]) {
        eyes.pen.ellipse(eyes.g, cx + d * 11, hy - 6, 13, 11, "ruler", pen.fill("glow"), {
            strokeWidth: 1.2,
            ...FIRM,
        });
        eyes.pen.ellipse(eyes.g, cx + d * 11, hy - 6, 3.5, 10, "ruler", INK(c), {
            strokeWidth: 0.6,
            ...FIRM,
        });
    }
    pen.path(
        g,
        `M${cx - 23} ${hy + 4}Q${cx} ${hy + 10} ${cx + 23} ${hy + 4}Q${cx + 16} ${hy + 20} ${cx} ${hy + 20}Q${cx - 16} ${hy + 20} ${cx - 23} ${hy + 4}Z`,
        "ruler",
        card(c),
        { strokeWidth: 1.5, ...FIRM },
    );
    for (const k of [-2, -1, 0, 1, 2])
        pen.line(
            g,
            cx + k * 7,
            hy + 7 + Math.abs(k) * 0.6,
            cx + k * 6.4,
            hy + 18 - Math.abs(k) * 2,
            "ruler",
            { strokeWidth: 1, ...FIRM },
        );
    pen.circle(g, cx, hy + 1, 4, "ruler", INK(c), { strokeWidth: 0.6, ...FIRM });
    return { head: [cx, hy - 31, "up"], face: [cx, hy + 12, "right"], feet: [cx, floor, "down"] };
}

function drawTortoise<G>(c0: Ctx<G>, pose: CastPose, s: number): RawAnchors {
    const cx = 3 * U - s * 6,
        floor = 4 * U - 4;
    const c = pose === "walk" ? part(c0, "step", [cx, floor]) : c0;
    const { pen, g } = c;
    const skin = pen.fill("mint", "solid", { hachureGap: 7 });
    const X = (dx: number) => cx + s * dx;
    const step = pose === "walk" ? 5 : 0;
    for (const [dx, reach] of [
        [-26, -step],
        [22, step],
        [-16, step],
        [30, -step],
    ] as const) {
        pen.path(
            g,
            capsule([X(dx), floor - 24], [X(dx + reach), floor - 6], 6.5),
            "pencil",
            skin,
            calm(c, 1.5),
        );
        pen.ellipse(g, X(dx + reach) + s * 2, floor - 4, 14, 7, "ruler", skin, {
            strokeWidth: 1.2,
            ...FIRM,
        });
    }
    pen.path(g, capsule([X(-38), floor - 22], [X(-50), floor - 14], 3), "ruler", skin, {
        strokeWidth: 1.1,
        ...FIRM,
    });
    const neck: Pt = [X(52), floor - 40];
    pen.path(g, capsule([X(34), floor - 24], neck, 7), "pencil", skin, calm(c, 1.5));
    pen.ellipse(g, neck[0] + s * 4, neck[1], 24, 17, "pencil", skin, calm(c, 1.5));
    eyesAt(c, [[neck[0] + s * 7, neck[1] - 3]], 3.6);
    pen.path(
        g,
        `M${neck[0] + s * 6} ${neck[1] + 5}L${neck[0] + s * 14} ${neck[1] + 3}`,
        "ruler",
        null,
        { strokeWidth: 1, ...FIRM },
    );
    const rim = floor - 22;
    pen.path(
        g,
        `M${X(-44)} ${rim}Q${X(-42)} ${rim - 50} ${X(0)} ${rim - 50}Q${X(42)} ${rim - 50} ${X(44)} ${rim}Z`,
        "pencil",
        pen.fill("tang", "solid", { hachureGap: 8 }),
        calm(c, 1.8),
    );
    pen.path(g, capsule([X(-46), rim], [X(46), rim], 3.5), "ruler", card(c), {
        strokeWidth: 1.2,
        ...FIRM,
    });
    const plates = { strokeWidth: 1.2, ...FIRM };
    pen.polygon(
        g,
        [
            [X(-10), rim - 38],
            [X(10), rim - 38],
            [X(16), rim - 22],
            [X(0), rim - 12],
            [X(-16), rim - 22],
        ],
        "ruler",
        null,
        plates,
    );
    for (const d of [-1, 1]) {
        pen.line(g, X(d * 16), rim - 22, X(d * 34), rim - 22, "ruler", plates);
        pen.line(g, X(d * 10), rim - 38, X(d * 20), rim - 46, "ruler", plates);
        pen.line(g, X(d * 26), rim - 22, X(d * 22), rim - 3, "ruler", plates);
    }
    pen.line(g, X(0), rim - 12, X(0), rim - 3, "ruler", plates);
    return {
        head: [neck[0], neck[1] - 9, "up"],
        shell: [X(0), rim - 50, "up"],
        feet: [cx, floor, "down"],
    };
}

function drawSphere<G>(c: Ctx<G>, pose: CastPose, s: number): RawAnchors {
    const { pen, g } = c,
        cx = 3.5 * U,
        R = 62,
        cy = 7 * U - 6 - R;
    const tilt = 0.28;
    const at = (lat: number, lon: number): Pt => [
        cx + R * Math.cos(lat) * Math.sin(lon),
        cy - R * (Math.sin(lat) * Math.cos(tilt) - Math.cos(lat) * Math.cos(lon) * Math.sin(tilt)),
    ];
    pen.line(g, cx - 64, 7 * U - 5, cx + 64, 7 * U - 5, "pencil", calm(c, 1.6));
    // on paper the glass is the card, so the shut blinds' hatch is all that prints
    pen.circle(g, cx, cy, 2 * R, "pencil", c.paper ? card(c) : pen.fill("sky"), calm(c, 1.9));
    const steel = pen.fill("ink-soft", "solid", { hachureGap: 6 });
    const deg = Math.PI / 180;
    // the blinds rolled up to show the glass, by band and column
    const open = new Set(["1,2", "2,4", "3,1", "0,5", "4,3"]);
    for (let i = 0; i < 6; i++)
        for (let j = 0; j < 7; j++) {
            const la0 = (-75 + i * 25) * deg,
                la1 = la0 + 25 * deg,
                lo0 = (-84 + j * 24) * deg,
                lo1 = lo0 + 24 * deg,
                n = 5;
            const pts: Pt[] = [];
            for (let k = 0; k <= n; k++) pts.push(at(la0, lo0 + ((lo1 - lo0) * k) / n));
            for (let k = 0; k <= n; k++) pts.push(at(la1, lo1 - ((lo1 - lo0) * k) / n));
            pen.polygon(g, pts, "ruler", open.has(`${i},${j}`) ? null : steel, {
                strokeWidth: 1,
                ...FIRM,
            });
        }
    const hole = at(-22 * deg, s * -30 * deg);
    const lid = { strokeWidth: 1.6, ...FIRM };
    if (pose === "open") {
        pen.ellipse(g, hole[0], hole[1], 26, 30, "ruler", INK(c), lid);
        pen.ellipse(g, hole[0] - s * 24, hole[1] + 4, 10, 30, "ruler", card(c), lid);
        pen.line(g, hole[0] - s * 13, hole[1], hole[0] - s * 20, hole[1] + 2, "ruler", lid);
    } else {
        pen.ellipse(g, hole[0], hole[1], 26, 30, "ruler", card(c), lid);
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            pen.circle(
                g,
                hole[0] + Math.cos(a) * 9,
                hole[1] + Math.sin(a) * 11,
                2.4,
                "ruler",
                INK(c),
                { strokeWidth: 0.8, ...FIRM },
            );
        }
    }
    return {
        top: [cx, cy - R, "up"],
        manhole: [hole[0], hole[1], s > 0 ? "left" : "right"],
        feet: [cx, cy + R, "down"],
    };
}

function drawPersonCast<G>(c: Ctx<G>, who: Who, pose: CastPose, dir: number): RawAnchors {
    const p = person(who, PERSON_POSE[pose], dir),
        box = personBox(p),
        look = who === "cavor" ? cavorBuild(lookOf(p)) : lookOf(p),
        base = box.h * U - 4;
    const x = pose === "point" ? (look.dir > 0 ? 2 : box.w - 2) * U : (box.w * U) / 2;
    const worn: { t?: Torso } = {};
    const a = figure(c, x, base, look, PERSON_POSE[pose], "", false, (t) => {
        worn.t = t;
        over(c, who, t, look.b.sw);
    });
    if (worn.t) {
        const t = worn.t;
        hat(c, who, t.headX, t.headY, look.b.r, look.dir);
        if (pose === "hold") held(c, who, t.x, t.hipY - look.b.ua * 0.42 - look.b.hand * 0.6);
    }
    return a;
}

const PERSON_POSE: Record<CastPose, Pose> = {
    stand: "stand",
    walk: "walk",
    wave: "wave",
    hold: "hold",
    point: "point",
    think: "think",
    pull: "stand",
    fade: "stand",
    open: "stand",
};

const NAME: Record<Who, string> = {
    toad: "Toad of Toad Hall, a green toad standing upright in a long orange motoring coat, a flat cap and goggles,",
    alice: "Alice, a girl with long fair hair held back by a blue band, in a yellow dress and a white pinafore,",
    mary: "Mary Lennox, a thin girl with fair hair, in a plain green coat and a straw hat,",
    buck: "Buck, a big heavy dog with a red-brown coat and a white chest, part St Bernard and part shepherd, in a blue sled harness,",
    jim: "Jim Hawkins, a boy in a blue jacket, orange breeches, stockings and a three-cornered hat,",
    bedford: "Mr Bedford, a man in a blue suit, a pink tie and a bowler hat,",
    cavor: "Mr Cavor, a short round scientist with thin legs, in an orange overcoat, a blue cricket cap, knickerbockers and stockings,",
    mole: "Mole, a small velvety grey mole standing on his hind legs, with a pointed pink nose, tiny eyes and broad pink digging paws,",
    rat: "The Water Rat, a brown water vole on his hind legs, with small round ears, a long tail and a straw hat with a blue band,",
    caterpillar: "",
    cat: "",
    tortoise: "",
    sphere: "",
};
const HOLDS: Record<Who, string> = {
    toad: "holding out his hands",
    alice: "holding a little bottle with a label",
    mary: "holding out an old key",
    buck: "",
    jim: "holding out a map marked with a cross",
    bedford: "holding out both hands",
    cavor: "holding out both hands",
    mole: "",
    rat: "",
    caterpillar: "",
    cat: "",
    tortoise: "",
    sphere: "",
};

/** The creatures and the sphere, whose whole description does not follow a name and a pose. */
function sentenceOf(who: Who, pose: CastPose, s: number): string | null {
    const way = s > 0 ? "right" : "left";
    if (who === "caterpillar")
        return "The Caterpillar, a long blue caterpillar sitting up on top of a big orange mushroom with white spots, its arms folded and its head turned to one side.";
    if (who === "cat")
        return pose === "fade"
            ? "The Cheshire Cat fading away: only a faint dotted outline of a sitting striped cat is left round its two eyes and its wide toothy grin."
            : "The Cheshire Cat, a big striped orange cat sitting up with its tail curled round, looking out with wide eyes and a very wide toothy grin.";
    if (who === "tortoise")
        return `A tortoise with a high domed brown shell marked in plates, its green head and stumpy legs out, ${pose === "walk" ? "walking" : "standing"} and facing ${way}.`;
    if (who === "sphere")
        return pose === "open"
            ? "Mr Cavor's sphere, a great glass ball covered in steel blinds, a few rolled up to show the glass, standing on the ground with its round manhole lid swung open."
            : "Mr Cavor's sphere, a great glass ball covered in steel blinds, a few rolled up to show the glass, standing on the ground with its round manhole shut.";
    return null;
}

export const bookCast = defineDrawing<CastParams>({
    id: "bookcast",
    family: "stories",
    title: "Characters from the books",
    group: "Characters",
    about: "The people and animals of the six whole books in grades five and six, each as its book describes them: Toad in his motoring coat, Alice in her pinafore, Mary Lennox in a plain coat with the garden's key, Buck in a sled harness, Jim Hawkins with the map, and Mr Bedford and Mr Cavor, who go to the moon; with Mole and the Water Rat, the Caterpillar on his mushroom, the Cheshire Cat, which can fade to its grin, Mr Cavor's sphere with its steel blinds, and a tortoise for the fables. `who` picks one, and `pose` what they are doing; a pose a character cannot take is drawn standing.",
    params: { who: "toad", pose: "stand", dir: 1 },
    settings: {
        who: { kind: "one of", of: BOOK_CAST },
        pose: { kind: "one of", of: CAST_POSES },
        dir: { kind: "whole", min: -1, max: 1 },
    },
    takes: [
        { label: "Toad in his motoring coat", params: { who: "toad", pose: "stand", dir: 1 } },
        { label: "Toad waving", params: { who: "toad", pose: "wave", dir: -1 } },
        { label: "Alice", params: { who: "alice", pose: "stand", dir: 1 } },
        { label: "Alice with the little bottle", params: { who: "alice", pose: "hold", dir: 1 } },
        { label: "Mary Lennox with the key", params: { who: "mary", pose: "hold", dir: 1 } },
        { label: "Mary Lennox walking", params: { who: "mary", pose: "walk", dir: 1 } },
        { label: "Buck in harness", params: { who: "buck", pose: "stand", dir: 1 } },
        { label: "Buck pulling the sled", params: { who: "buck", pose: "pull", dir: 1 } },
        { label: "Jim Hawkins with the map", params: { who: "jim", pose: "hold", dir: 1 } },
        { label: "Mr Bedford pointing", params: { who: "bedford", pose: "point", dir: 1 } },
        { label: "Mr Cavor thinking", params: { who: "cavor", pose: "think", dir: -1 } },
        { label: "Mole", params: { who: "mole", pose: "stand", dir: 1 } },
        { label: "Mole waving", params: { who: "mole", pose: "wave", dir: -1 } },
        { label: "The Water Rat", params: { who: "rat", pose: "stand", dir: -1 } },
        { label: "The Water Rat walking", params: { who: "rat", pose: "walk", dir: 1 } },
        {
            label: "The Caterpillar on his mushroom",
            params: { who: "caterpillar", pose: "stand", dir: 1 },
        },
        { label: "The Cheshire Cat", params: { who: "cat", pose: "stand", dir: 1 } },
        { label: "The Cheshire Cat fading", params: { who: "cat", pose: "fade", dir: 1 } },
        { label: "A tortoise", params: { who: "tortoise", pose: "stand", dir: 1 } },
        { label: "A tortoise walking", params: { who: "tortoise", pose: "walk", dir: -1 } },
        { label: "The sphere shut", params: { who: "sphere", pose: "stand", dir: 1 } },
        {
            label: "The sphere with its manhole open",
            params: { who: "sphere", pose: "open", dir: 1 },
        },
    ],
    box: (p) => {
        if (p.who === "toad") return { w: 5, h: 6 };
        if (p.who === "buck") return { w: 8, h: 5 };
        const own = OWN_BOX[p.who];
        if (own) return own;
        return personBox(person(p.who, PERSON_POSE[poseOf(p)], p.dir));
    },
    draw: (c, p) => {
        const pose = poseOf(p),
            s = p.dir < 0 ? -1 : 1;
        if (p.who === "toad") return drawToad(c, pose, s);
        if (p.who === "buck") return drawBuck(c, pose, s);
        if (p.who === "mole") return drawMole(c, pose, s);
        if (p.who === "rat") return drawRat(c, pose, s);
        if (p.who === "caterpillar") return drawCaterpillar(c, s);
        if (p.who === "cat") return drawCat(c, pose);
        if (p.who === "tortoise") return drawTortoise(c, pose, s);
        if (p.who === "sphere") return drawSphere(c, pose, s);
        return drawPersonCast(c, p.who, pose, s);
    },
    describe: (p) => {
        const pose = poseOf(p),
            her = p.who === "alice" || p.who === "mary" ? "her" : "his";
        const doing: Record<CastPose, string> = {
            stand: "standing",
            walk: "walking",
            wave: "waving",
            hold: HOLDS[p.who],
            point: "pointing",
            think: `with a hand at ${her} chin`,
            pull: "leaning hard into the harness",
            fade: "standing",
            open: "standing",
        };
        return sentenceOf(p.who, pose, p.dir < 0 ? -1 : 1) ?? `${NAME[p.who]} ${doing[pose]}.`;
    },
    motion: {
        body: { is: "idle" },
        parts: {
            eyes: { is: "blink", period: 4.4 },
            wave: { is: "wiggle", deg: 10, period: 3.8, cycles: 3 },
            hair: { is: "sway", deg: 4, period: 3.4, lag: 0.15 },
            tail: { is: "wiggle", deg: 10, period: 3, cycles: 3 },
            step: { is: "bob", lift: 2.2, arc: 0, deg: 0, period: 1.4 },
        },
    },
});
