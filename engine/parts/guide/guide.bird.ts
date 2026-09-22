// Paper bird: folded from a page of the same squared book, so the grid shows through its facets.
// Straight creases only, drawn at the ruler level, with one wing that does the pointing.
import { clip, plain } from "../../ink/surface";
import {
    aims,
    guideDrawing,
    type GuideAnchors,
    type GuideCtx,
    type GuideDesign,
    type GuidePose,
    type GuideState,
    type Pt,
} from "./design";
import {
    MIRROR,
    again,
    angleTo,
    clampAngle,
    fine,
    gaze,
    inkEyes,
    layer,
    mirrorPt,
    polar,
    sparkle,
    tapMarks,
    thought,
    writeMarks,
    zeds,
} from "./kit";

const BODY: [Pt, Pt, Pt, Pt] = [
    [12, 42],
    [31, 26],
    [47, 36],
    [33, 51],
];
const TAIL: Pt[] = [
    [22, 40],
    [3, 21],
    [14, 42],
];
const HEAD: [Pt, Pt, Pt, Pt] = [
    [39.5, 31],
    [38.5, 16],
    [46.5, 11],
    [51, 22.5],
];
const BEAK: [Pt, Pt, Pt] = [
    [48.2, 15.5],
    [58, 19.5],
    [50.3, 21],
];
const NECK: Pt = [41, 29.5];
const EYE: Pt = [44.5, 19.5];
const WING: Pt = [29, 34];
const WING_BASE: [Pt, Pt] = [
    [23.5, 32],
    [33, 37],
];
const FEET: Pt[] = [
    [28, 50],
    [35, 50.5],
];
const HEAD_TURN: Record<GuidePose, number> = {
    idle: 0,
    point: 0,
    count: 0,
    write: 0.22,
    cheer: -0.25,
    think: -0.3,
    retry: -0.12,
    rest: 0.85,
};
const WING_REST: Record<GuidePose, [number, number]> = {
    idle: [2.93, 19],
    point: [0, 21],
    count: [0, 21],
    write: [0.4, 17],
    cheer: [-1.3, 20],
    think: [-0.35, 13],
    retry: [-0.6, 19],
    rest: [3, 16],
};

/** Fine grid lines inside a facet, so the bird reads as folded from the page it stands on. */
function grid<G>(c: GuideCtx<G>, poly: Pt[]): void {
    const g = clip(c, { kind: "polygon", points: poly });
    for (let v = 0; v <= 60; v += 5.5) {
        plain(g, {
            kind: "path",
            d: `M${v} 0V60`,
            stroke: c.t.grid,
            width: 0.7 * c.line,
            fill: "none",
        });
        plain(g, {
            kind: "path",
            d: `M0 ${v}H60`,
            stroke: c.t.grid,
            width: 0.7 * c.line,
            fill: "none",
        });
    }
}

export const bird: GuideDesign = {
    id: "bird",
    name: "Paper bird",
    seed: 6173,
    link: "arrow",
    motions: ["bob", "blink", "flutter"],
    concept:
        "A bird folded out of a page of the exercise book, grid and all. It is made of the same material as the lesson rather than drawn on top of it.",
    construction:
        "Ruler-level straight creases, flat facets in paper white with one hatched facet for shade, a clipped grid texture, and a marker beak.",
    acting: "The wing swings to the target and the head turns so the beak lines up with it. Cheering opens the beak and lifts both wings; resting tucks the head down.",
    strengths: [
        "The folded-paper idea is the most specific to this product of the seven.",
        "Flat facets and straight edges print perfectly: no colour is needed to read it.",
        "Beak and wing point at the same time, which is a clear double cue.",
    ],
    weaknesses: [
        "In profile it has one eye, so it can only look in a half circle before it must turn round.",
        "The grid texture turns to noise below about 90 px and has to be dropped.",
        "Angular and still, closer to an object than to a companion.",
    ],

    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors {
        const { pen, t, detail } = c;
        const p = s.pose;
        const aim = aims(p) || p === "idle" || p === "retry" ? s.aim : undefined;
        const mirrored = !!aim && aim[0] < 24;
        const A: Pt | undefined = aim ? (mirrored ? mirrorPt(aim) : aim) : undefined;
        const lookAt: Pt | undefined = p === "think" ? [20, -6] : A;
        const lift = p === "cheer" ? -5 : p === "rest" ? 4 : 0;
        const mx = (x: number): number => (mirrored ? 60 - x : x);

        const root = layer(c, { layer: p === "rest" ? "g-breathe" : "g-bob", origin: [30, 56] });
        const out = lift ? layer(root, { turn: [["translate", 0, lift]] }) : root;
        const b = mirrored ? layer(out, { turn: MIRROR }) : out;

        const shade = pen.fill("ink-soft", "hachure", { hachureGap: 3.2 });
        let [wa, wl] = WING_REST[p];
        if (aims(p) && A) wa = clampAngle(angleTo(WING, A), -1.4, 0.8) + (p === "write" ? 0.3 : 0);
        // The far wing only appears where there is room for it to read as a second wing.
        if (p === "cheer" && detail !== "tiny")
            pen.polygon(b.g, [WING_BASE[0], polar(WING, -1.95, 18), WING_BASE[1]], "ruler", shade, {
                strokeWidth: 1.4,
            });

        if (p !== "cheer" && p !== "rest")
            for (const [x, y] of FEET)
                pen.line(b.g, x, y, x + 0.6, y + 6.5, "ruler", { strokeWidth: 1.5 });
        pen.polygon(b.g, TAIL, "ruler", shade, { strokeWidth: 1.5 });
        pen.polygon(b.g, BODY, "ruler", pen.fill("card"), { strokeWidth: 1.9 });
        if (detail !== "tiny" && !c.paper) grid(b, BODY);
        pen.line(b.g, BODY[1][0], BODY[1][1], BODY[3][0], BODY[3][1], "ruler", {
            strokeWidth: 1.2,
        });
        const tip = polar(WING, wa, wl);
        const wing = layer(b, { layer: "g-flutter", origin: [WING[0], WING[1]], flap: -9 });
        pen.polygon(wing.g, [WING_BASE[0], tip, WING_BASE[1]], "ruler", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.line(wing.g, WING[0], WING[1], tip[0], tip[1], "ruler", { strokeWidth: 1 });

        const h =
            aims(p) && A
                ? clampAngle(angleTo(EYE, A) - 0.2, -0.55, 0.5) + (p === "write" ? 0.15 : 0)
                : HEAD_TURN[p];
        const head = layer(b, { turn: [["rotate", (h * 180) / Math.PI, NECK[0], NECK[1]]] });
        pen.polygon(head.g, HEAD, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
        if (detail !== "tiny" && !c.paper) grid(head, HEAD);
        if (p === "cheer") {
            pen.polygon(
                head.g,
                [
                    [48.2, 14.5],
                    [58, 17],
                    [49.8, 19],
                ],
                "ruler",
                pen.fill("tang"),
                { strokeWidth: 1.4 },
            );
            pen.polygon(
                head.g,
                [
                    [49, 20],
                    [56.5, 22.5],
                    [50.5, 23],
                ],
                "ruler",
                pen.fill("tang"),
                { strokeWidth: 1.4 },
            );
        } else {
            pen.polygon(head.g, BEAK, "ruler", pen.fill("tang"), { strokeWidth: 1.5 });
        }
        const d = detail === "tiny" ? 4.8 : 4.2;
        inkEyes(
            head,
            [EYE],
            d,
            gaze(EYE, lookAt, 1.3, [0.3, 0]),
            p === "cheer" ? "happy" : p === "rest" ? "sleep" : "open",
        );
        if (p === "think" || p === "retry")
            pen.arc(
                head.g,
                EYE[0],
                EYE[1] - d * 1.1,
                d * 1.8,
                d * 1.2,
                Math.PI + 0.2,
                2 * Math.PI - 0.2,
                "pencil",
                fine({ strokeWidth: 1.2 }),
            );

        if (p === "count") tapMarks(b, tip, A);
        if (p === "write") writeMarks(b, tip, A);
        if (p === "cheer") {
            const sparks: [number, number, number][] = [
                [mx(13), 6, 5.5],
                [mx(4), 24, 4],
                [mx(36), 1, 4.5],
            ];
            for (const [x, y, r] of sparks) sparkle(out, x, y, r);
        }
        if (p === "think") thought(out, mx(16), 12);
        if (p === "retry") again(out, mx(12), 13, 6);
        if (p === "rest") zeds(out, mx(22), 8, 6);
        if (p === "cheer")
            for (const y of [56, 60])
                pen.line(out.g, 22, y, 38, y + 1, "pencil", {
                    stroke: t["ink-soft"],
                    strokeWidth: 1.1,
                });

        const beakTip = polar(
            NECK,
            angleTo(NECK, BEAK[1]) + h,
            Math.hypot(BEAK[1][0] - NECK[0], BEAK[1][1] - NECK[1]),
        );
        const crown = polar(
            NECK,
            angleTo(NECK, HEAD[2]) + h,
            Math.hypot(HEAD[2][0] - NECK[0], HEAD[2][1] - NECK[1]),
        );
        const out3 = (q: Pt): Pt => (mirrored ? mirrorPt(q) : q);
        const [hx, hy] = out3(aims(p) ? tip : beakTip);
        const [cx, cy] = out3(crown);
        return {
            hand: [hx, hy + lift, hx < 30 ? "left" : "right"],
            head: [cx, cy + lift - 4, "up"],
            beak: [out3(beakTip)[0], beakTip[1] + lift, "right"],
        };
    },
};

const POSE: Record<GuidePose, string> = {
    idle: "standing with its wing folded, looking ahead",
    point: "its wing swung out to point to one side",
    count: "its wing out, tapping along a row one thing at a time",
    write: "its wing lowered to where an answer is written",
    cheer: "both wings lifted and its beak open in a cheer, with sparkles round it",
    think: "its head tilted up with a few dots rising above it",
    retry: "its head turned a little, with a small loop drawn beside it",
    rest: "its head tucked down and its eye closed, dozing",
};

export const guideBird = guideDrawing(
    bird,
    (pose) =>
        `A small bird folded from a page of squared paper, with a marker-orange beak, ${POSE[pose]}.`,
);
