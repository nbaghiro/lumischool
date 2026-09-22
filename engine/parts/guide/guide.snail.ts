// Snail: hand-inked with pressure strokes rather than rough.js outlines, so it looks drawn with a
// soft pencil. It has no arms; the two eye stalks lean at what it means, which is also its blink.
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
    blinking,
    blob,
    clampAngle,
    fine,
    gaze,
    ink,
    jitter,
    layer,
    mirrorPt,
    mix,
    polar,
    sparkle,
    tapMarks,
    thought,
    towardAngle,
    writeMarks,
    zeds,
} from "./kit";

const FOOT: Pt[] = [
    [5, 54],
    [16, 56],
    [32, 56.4],
    [45, 55.8],
    [52.5, 53],
    [56, 48],
    [55.5, 41],
    [52.5, 35.5],
    [47.5, 33],
    [43.5, 35.5],
    [42, 41.5],
    [39, 47.5],
    [30, 50],
    [17, 51],
    [7, 51.5],
];
const SHELL: Pt = [25, 33];
const R = 15.5;
const BASE: [Pt, Pt] = [
    [47, 35],
    [52, 37],
];
const STALK: Record<GuidePose, [number, number]> = {
    idle: [-2, -1.25],
    point: [-2, -1.25],
    count: [-2, -1.25],
    write: [-1.7, -1.05],
    cheer: [-2.25, -1],
    think: [-1.9, -1.15],
    retry: [-1.85, -1.15],
    rest: [-2.2, -1.1],
};
const LEN: Record<GuidePose, number> = {
    idle: 15,
    point: 18,
    count: 18,
    write: 16,
    cheer: 17,
    think: 15,
    retry: 16,
    rest: 5,
};

export const snail: GuideDesign = {
    id: "snail",
    name: "Snail",
    seed: 7717,
    link: "arrow",
    motions: ["blink", "sway", "breathe"],
    concept:
        "A small animal that carries its house and takes its time. Slow is the right feeling for a child who is stuck, and the spiral shell is a strong shape at any size.",
    construction:
        "Perfect-freehand pressure strokes for the body, the shell outline and one continuous spiral, over an offset marker wash that print leaves out so the spiral stays legible.",
    acting: "Both eye stalks lean at the target and the pupils follow, so looking and pointing are the same gesture. Thinking bends one stalk into a hook; resting pulls both in.",
    strengths: [
        "The spiral is the most recognisable silhouette of the seven at 60 px and in print.",
        "Eye stalks are cheap to animate and carry mood without a face full of parts.",
        "Inked strokes match a hand-drawn page better than rough.js outlines do.",
    ],
    weaknesses: [
        "Stalks point vaguely: a target behind or below it is hard to indicate.",
        "Slowness is a good feeling for being stuck and a poor one for finishing a lesson.",
        "Pressure strokes cost more to draw than rough.js shapes, three frames at a time.",
    ],

    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors {
        const { pen, t, detail } = c;
        const p = s.pose;
        const aim = aims(p) || p === "idle" || p === "retry" ? s.aim : undefined;
        const mirrored = !!aim && aim[0] < 22;
        const A: Pt | undefined = aim ? (mirrored ? mirrorPt(aim) : aim) : undefined;
        const lookAt: Pt | undefined = p === "think" ? [30, -6] : A;
        const mx = (x: number): number => (mirrored ? 60 - x : x);

        const root = layer(c, { layer: "g-breathe", origin: [30, 56] });
        const b = mirrored ? layer(root, { turn: MIRROR }) : root;

        const foot = jitter(b, FOOT, 0.6);
        blob(b, foot, t.card);
        ink(b, foot, 1.8, { closed: true, taper: 0 });

        const ring = jitter(
            b,
            Array.from({ length: 14 }, (_, i) => polar(SHELL, (i / 14) * Math.PI * 2, R)),
            0.5,
        );
        blob(b, ring, t.card);
        // The wash sits a little off the outline, the way a child colours a shape in. On paper it is
        // left out: hatching over the spiral hides the one line that makes the shell a shell.
        if (!c.paper) {
            const tang = pen.fill("tang", "solid", { hachureGap: 4 }) ?? {};
            pen.circle(b.g, SHELL[0] + 1.6, SHELL[1] + 1.4, R * 2, "doodle", null, {
                ...tang,
                stroke: "none",
            });
        }
        ink(b, ring, 1.9, { closed: true, taper: 0 });
        const turns = detail === "tiny" ? 1.7 : 2.3;
        const spiral: Pt[] = Array.from({ length: 44 }, (_, i) => {
            const u = i / 43;
            return polar(SHELL, 0.9 + u * turns * Math.PI * 2, R * (1 - u * 0.93));
        });
        ink(b, spiral, 1.5, { taper: 1.4 });

        const d = detail === "tiny" ? 8 : 7;
        const stalk = (i: 0 | 1): Pt => {
            const base = BASE[i];
            let path: Pt[];
            let eye: Pt;
            if (p === "think" && i === 1) {
                eye = [51, 21.5];
                path = [base, [56, 29], [57.5, 23], [54, 20.7], eye];
            } else {
                let a = STALK[p][i];
                if (aims(p) && A) a = clampAngle(towardAngle(a, angleTo(base, A), 0.9), -2.9, 0.5);
                eye = polar(base, a, LEN[p]);
                const m = mix(base, eye, 0.5);
                path = [
                    base,
                    [
                        m[0] + Math.cos(a + Math.PI / 2) * 1.4,
                        m[1] + Math.sin(a + Math.PI / 2) * 1.4,
                    ],
                    eye,
                ];
            }
            const g = layer(b, p === "rest" ? {} : { layer: "g-sway", origin: [base[0], base[1]] });
            ink(g, jitter(g, path, 0.4), 1.7, { taper: 1.2 });
            g.pen.circle(
                g.g,
                eye[0],
                eye[1],
                d,
                "pencil",
                g.pen.fill("card"),
                fine({ strokeWidth: 1.4 }),
            );
            if (p === "rest") {
                g.pen.arc(
                    g.g,
                    eye[0],
                    eye[1] - 0.6,
                    d * 0.7,
                    d * 0.5,
                    0.3,
                    Math.PI - 0.3,
                    "pencil",
                    fine({ strokeWidth: 1.3 }),
                );
            } else if (p === "cheer") {
                g.pen.arc(
                    g.g,
                    eye[0],
                    eye[1] + 1.2,
                    d * 0.75,
                    d * 0.6,
                    Math.PI + 0.3,
                    2 * Math.PI - 0.3,
                    "pencil",
                    fine({ strokeWidth: 1.4 }),
                );
            } else {
                const look = gaze(eye, lookAt, 1.5, [0.6, 0]);
                blinking(
                    g,
                    (o) =>
                        o.pen.circle(
                            o.g,
                            eye[0] + look[0],
                            eye[1] + look[1],
                            3.6,
                            "ruler",
                            { fill: t.ink, fillStyle: "solid" },
                            fine({ strokeWidth: 0.6 }),
                        ),
                    (o) =>
                        o.pen.line(
                            o.g,
                            eye[0] - 2.4,
                            eye[1],
                            eye[0] + 2.4,
                            eye[1],
                            "pencil",
                            fine({ strokeWidth: 1.3 }),
                        ),
                );
            }
            return eye;
        };
        const eyes: [Pt, Pt] = [stalk(0), stalk(1)];

        if (p !== "rest") {
            const my = p === "cheer" ? 46.5 : 46;
            if (p === "cheer")
                pen.arc(
                    b.g,
                    53.5,
                    my,
                    7,
                    6,
                    Math.PI * 0.1,
                    Math.PI * 0.85,
                    "pencil",
                    fine({ strokeWidth: 1.4 }),
                );
            else
                pen.arc(
                    b.g,
                    53.5,
                    my,
                    5.5,
                    4,
                    0.3,
                    Math.PI - 0.3,
                    "pencil",
                    fine({ strokeWidth: 1.3 }),
                );
        }

        if (p === "count") tapMarks(b, eyes[1], A);
        if (p === "write") writeMarks(b, eyes[1], A);
        if (p === "cheer") {
            const sparks: [number, number, number][] = [
                [mx(9), 13, 5.5],
                [mx(38), 6, 4.5],
                [mx(20), 2, 4],
            ];
            for (const [x, y, r] of sparks) sparkle(root, x, y, r);
        }
        if (p === "think") thought(root, mx(12), 14);
        if (p === "retry") again(root, mx(24), 9, 6);
        if (p === "rest") zeds(root, mx(34), 14, 6);

        const front = mirrored ? mirrorPt(eyes[1]) : eyes[1];
        const top = eyes[0][1] < eyes[1][1] ? eyes[0] : eyes[1];
        return {
            hand: [front[0], front[1], front[0] < 30 ? "left" : "right"],
            head: [mirrored ? 60 - top[0] : top[0], top[1] - 5, "up"],
            shell: [mx(SHELL[0]), SHELL[1], "up"],
        };
    },
};

const POSE: Record<GuidePose, string> = {
    idle: "its two eye stalks up and its eyes looking straight ahead",
    point: "both eye stalks leaning out to one side, its eyes turned the same way",
    count: "both eye stalks leaning toward a row, with tally ticks beside it",
    write: "both eye stalks leaning down to where an answer is written",
    cheer: "its eyes closed in two happy arcs, with sparkles round it",
    think: "one eye stalk bent into a hook and a few dots rising above it",
    retry: "its eye stalks up, with a small loop drawn beside it",
    rest: "its eye stalks pulled in and its eyes closed, dozing",
};

export const guideSnail = guideDrawing(
    snail,
    (pose) =>
        `A small snail drawn in soft pencil, with an orange spiral shell on its back, ${POSE[pose]}.`,
);
