// Pencil stub: the guide comes from the same desk as the squared paper. It leans the way it points,
// the way a pencil leans when you write with it, and it lies down flat when it is resting.
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
    again,
    angleTo,
    brows,
    clampAngle,
    gaze,
    hand,
    hop,
    inkEyes,
    layer,
    limb,
    mouth,
    polar,
    rotate,
    sparkle,
    tapMarks,
    thought,
    waveMarks,
    writeMarks,
    zeds,
} from "./kit";

const TIP: Pt = [30, 57.5];
const EYES: Pt[] = [
    [25.2, 27.5],
    [34.8, 27.5],
];
const SHOULDER: [Pt, Pt] = [
    [19, 31],
    [41, 31],
];
const REST_HAND: [Pt, Pt] = [
    [12.5, 40],
    [47.5, 40],
];

export const stub: GuideDesign = {
    id: "stub",
    name: "Pencil stub",
    seed: 3391,
    link: "arrow",
    motions: ["blink", "sway"],
    concept:
        "A worn pencil with a face, from the same pencil case as the child's. It belongs to the stationery world of the page instead of being a creature visiting it.",
    construction:
        "Rough.js at the pencil level with flat marker fills: yellow barrel, pink eraser, hatched ferrule, bare wood and a graphite tip. Arms are thin graphite lines.",
    acting: "It leans toward what it points at, tip first, and raises an arm. Resting is the strongest pose: a pencil put down flat on the paper, which is also what a locked lesson looks like.",
    strengths: [
        "The eraser is a built-in answer to a wrong answer: rub it out and go again.",
        "Lying down reads as resting without any sleep symbols.",
        "Flat colour and a tall simple shape print well and survive 60 px.",
    ],
    weaknesses: [
        "Tall and narrow, so it wastes the 3 by 3 box and its face is small in it.",
        "An object with a face on it is a well-worn idea and can feel like clip art.",
        "It needs ground to stand on, which is awkward when a scene has none.",
    ],

    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors {
        const { pen, t, detail } = c;
        const p = s.pose;
        const aim = p === "point" || p === "idle" || p === "retry" ? s.aim : undefined;
        const lookAt: Pt | undefined = p === "think" ? [8, -4] : aim;
        const resting = p === "rest";
        // Writing leans it further over, the way a pencil leans when it is actually writing.
        const lean = resting
            ? 0
            : aims(p) && s.aim
              ? Math.max(-0.24, Math.min(0.24, (s.aim[0] - 30) / 90)) * (p === "write" ? 1.7 : 1)
              : p === "think"
                ? -0.09
                : p === "retry"
                  ? 0.1
                  : 0;
        const lift = p === "cheer" ? -5 : 0;

        const root = layer(
            c,
            resting
                ? { layer: "g-breathe", origin: [30, 54] }
                : { layer: "g-sway", origin: [TIP[0], TIP[1]] },
        );
        const outer = lift ? layer(root, { turn: [["translate", 0, lift]] }) : root;
        const body = layer(outer, {
            turn: resting
                ? [
                      ["translate", 0, 12],
                      ["rotate", 90, 30, 31],
                  ]
                : [["rotate", (lean * 180) / Math.PI, TIP[0], TIP[1]]],
        });

        pen.path(
            body.g,
            "M19 13V8.5Q19 4 23.5 4H36.5Q41 4 41 8.5V13Z",
            "pencil",
            pen.fill("berry"),
            {
                strokeWidth: 1.6,
            },
        );
        pen.rect(
            body.g,
            18.5,
            13,
            23,
            5.5,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 2.2 }),
            { strokeWidth: 1.3 },
        );
        pen.rect(body.g, 19, 18.5, 22, 25, "ruler", pen.fill("glow"), { strokeWidth: 1.8 });
        if (detail !== "tiny")
            for (const x of [23.5, 36.5])
                pen.line(body.g, x, 19.5, x, 42.5, "ruler", {
                    stroke: t["ink-soft"],
                    strokeWidth: 0.9,
                });
        pen.polygon(
            body.g,
            [
                [19, 43.5],
                [41, 43.5],
                [33.4, 52.5],
                [26.6, 52.5],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            body.g,
            [
                [26.6, 52.5],
                [33.4, 52.5],
                [30, 57.5],
            ],
            "pencil",
            { fill: t.ink, fillStyle: "solid" },
            { strokeWidth: 1.2 },
        );

        const d = detail === "tiny" ? 4.6 : 4.2;
        if (resting) {
            // The pencil lies flat, but the face stays upright so it still reads as a face.
            inkEyes(
                outer,
                [
                    [26, 43],
                    [34, 43],
                ],
                d,
                [0, 0],
                "sleep",
            );
            mouth(outer, 30, 48.5, "small", 6);
            zeds(outer, 47, 20, 6);
        } else {
            const look = gaze([30, 27.5], lookAt, 2, [0, 0.4]);
            inkEyes(body, EYES, d, look, p === "cheer" ? "happy" : "open");
            if (p === "think") brows(body, EYES, d, [0, 2.3]);
            if (p === "retry") brows(body, EYES, d, [2.1, 2.1]);
            mouth(
                body,
                30,
                33.6,
                p === "cheer" ? "grin" : p === "think" ? "flat" : p === "write" ? "small" : "smile",
                p === "retry" ? 8 : 7,
            );
        }

        const hands: [Pt, Pt] = [REST_HAND[0], REST_HAND[1]];
        let pointing: 0 | 1 = 1;
        if (p === "cheer") {
            hands[0] = [8, 17];
            hands[1] = [52, 17];
        } else if (p === "think") hands[0] = [24.5, 36.5];
        else if (p === "retry") {
            hands[0] = [18.5, 40.5];
            hands[1] = [50, 21];
        } else if (aims(p) && s.aim) {
            pointing = s.aim[0] < 28 ? 0 : 1;
            const sh = rotate(SHOULDER[pointing], TIP, lean);
            const a = angleTo(sh, s.aim);
            hands[pointing] = polar(
                sh,
                pointing === 1
                    ? clampAngle(a, -1.4, 1.1)
                    : clampAngle(a, Math.PI - 1.1, Math.PI + 1.4),
                p === "write" ? 15 : 18,
            );
            if (p === "write") hands[pointing] = [hands[pointing][0], hands[pointing][1] + 3];
        }
        if (!resting) {
            for (const i of [0, 1] as const) {
                const sh = rotate(SHOULDER[i], TIP, lean);
                if (p === "retry" && i === 0) limb(outer, sh, [11.5, 36], 1.5, 0.1);
                limb(
                    outer,
                    p === "retry" && i === 0 ? [11.5, 36] : sh,
                    hands[i],
                    1.5,
                    i === 0 ? 0.16 : -0.16,
                );
                hand(outer, hands[i], 4);
            }
        }

        if (p === "count") tapMarks(outer, hands[pointing], s.aim);
        if (p === "write") writeMarks(outer, hands[pointing], s.aim);
        if (p === "cheer") {
            const sparks: [number, number, number][] = [
                [7, 12, 5.5],
                [53, 9, 4.5],
                [55, 44, 4],
            ];
            for (const [x, y, r] of sparks) sparkle(outer, x, y, r);
            hop(outer, 30, 60, 15);
        }
        if (p === "think") {
            thought(outer, 45, 8);
            const scuffs: Pt[] = [
                [36, 55],
                [38.5, 57],
            ];
            for (const [x, y] of scuffs)
                pen.line(outer.g, x, y, x + 3, y - 1, "pencil", {
                    stroke: t["ink-soft"],
                    strokeWidth: 1.1,
                });
        }
        if (p === "retry") {
            again(outer, 10, 50, 6);
            waveMarks(outer, hands[1], -1);
        }

        const hp = resting ? ([46, 43] as Pt) : aims(p) && s.aim ? hands[pointing] : hands[1];
        const top = resting ? ([30, 32] as Pt) : rotate([30, 2], TIP, lean);
        return {
            hand: [hp[0], hp[1] + lift, hp[0] < 30 ? "left" : "right"],
            head: [top[0], top[1] + lift, "up"],
            tip: [TIP[0], TIP[1] + lift, "down"],
        };
    },
};

const POSE: Record<GuidePose, string> = {
    idle: "standing on its point with its thin arms down, looking straight ahead",
    point: "leaning to one side with one thin arm raised to point that way",
    count: "leaning with one arm out along a row, with tally ticks beside it",
    write: "leaning over with one arm down to where an answer is written",
    cheer: "both thin arms up and a wide grin, with sparkles round it",
    think: "one arm up at its chin, its brows raised and a few dots rising above it",
    retry: "one arm waving, its brows raised, with a small loop drawn beside it",
    rest: "lying flat on its side with its eyes closed, dozing",
};

export const guideStub = guideDrawing(
    stub,
    (pose) =>
        `A short yellow pencil with a face, a pink eraser and a sharpened point, ${POSE[pose]}.`,
);
