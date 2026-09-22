// Hand: the gesture without the character. It is the one pointer on the shelf that cannot be given
// a name or a backstory, which is what the Trust section asks of the guide, and it is the gesture a
// grown-up already makes over a page: this one, these in order, write it here. No face, so every
// pose is a gesture, and no skin: the hand is drawn as an outline on white, like everything else
// the child is asked to read.
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
    clampAngle,
    fine,
    layer,
    polar,
    sparkle,
    tapMarks,
    thought,
    writeMarks,
} from "./kit";

const WRIST: Pt = [35, 57];
/** The palm, used as a fist with the fingers curled inside it and as the palm of an open hand. */
const PALM = "M23 31 Q23 22 32 22 H42 Q50 22 50 32 V43 Q50 52 39 52 H31 Q23 52 23 43 Z";
/** How far the hand turns from pointing straight up, when it is not aiming at anything. */
const TURN: Record<GuidePose, number> = {
    idle: 0.14,
    point: 0.14,
    count: 0.14,
    write: 0.14,
    cheer: -0.05,
    think: -0.08,
    retry: -0.16,
    rest: 0,
};
const INDEX_TIP: Partial<Record<GuidePose, number>> = { idle: 17, point: 8, count: 8, think: 7 };

/** A finger or a thumb: a capsule from its base to its tip, with a hand-drawn edge. */
function capsule<G>(c: GuideCtx<G>, from: Pt, to: Pt, w: number, fill = "card" as const): void {
    const a = Math.atan2(to[1] - from[1], to[0] - from[0]),
        r = w / 2;
    const nx = -Math.sin(a) * r,
        ny = Math.cos(a) * r;
    const t1 = polar(to, a - Math.PI / 2, r),
        t2 = polar(to, a + Math.PI / 2, r);
    const tip = polar(to, a, r * 1.25);
    const d =
        `M${(from[0] + nx).toFixed(1)} ${(from[1] + ny).toFixed(1)} L${t2[0].toFixed(1)} ${t2[1].toFixed(1)}` +
        ` Q${tip[0].toFixed(1)} ${tip[1].toFixed(1)} ${t1[0].toFixed(1)} ${t1[1].toFixed(1)}` +
        ` L${(from[0] - nx).toFixed(1)} ${(from[1] - ny).toFixed(1)} Z`;
    c.pen.path(c.g, d, "pencil", c.pen.fill(fill), { strokeWidth: 1.5 });
}

/** The three curled fingers inside a fist, as bars across it. */
function curled<G>(c: GuideCtx<G>): void {
    for (const [y, x0, x1] of [
        [30, 30, 47],
        [37, 29, 48],
        [44, 30, 47],
    ] as const) {
        capsule(c, [x0, y], [x1, y], 6.2);
    }
}

export const hand: GuideDesign = {
    id: "hand",
    name: "Hand",
    seed: 9173,
    link: "arrow",
    motions: ["sway", "breathe"],
    concept:
        "A hand, drawn as an outline with nothing inside it. It points, taps along a row and holds the pencil, and there is nothing there to make friends with: no face, no name, no creature.",
    construction:
        "Rough.js at the pencil level. The palm is one path used twice, as a fist with bars across it and as the palm of an open hand; fingers and the thumb are capsules built from the same helper; the cuff is the only colour.",
    acting: "The whole hand turns about the wrist to aim, and the index finger extends. Feeling is carried by the gesture instead of a face: a thumb up for the hard one done, an open palm for going again, the pencil held for writing, the hand laid flat when there is nothing to do.",
    strengths: [
        "It is the only design that cannot become a character: the product document rules out a name, a backstory and affection, and a hand has nowhere to put them.",
        "It is the clearest of the seven at the three aiming poses, because pointing, tapping and holding a pencil are what a hand is for.",
        "An outline on white takes no position on whose hand it is, and it prints as well as it draws.",
    ],
    weaknesses: [
        "Its range of feeling is the narrowest: with no face, cheering and trying again are one gesture each and nothing more.",
        "A hand implies a grown-up beside the child, which is right for a printed page with a parent and less right for a child working alone.",
        "A fist at 60 px is a blob with three bars on it, and the bars are the first thing to go.",
    ],

    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors {
        const { pen, detail } = c;
        const p = s.pose;
        const aim = aims(p) ? s.aim : undefined;
        // Up is the hand's own direction, so the turn is measured from there.
        const turn = aim
            ? clampAngle(
                  Math.atan2(aim[1] - WRIST[1], aim[0] - WRIST[0]) + Math.PI / 2,
                  -1.15,
                  1.15,
              )
            : TURN[p];

        const root = layer(c, {
            layer: p === "rest" ? "g-breathe" : "g-sway",
            origin: [WRIST[0], WRIST[1]],
        });

        if (p === "rest") {
            // A hand laid flat on the page, seen from above. It needs no sleep mark: a hand is not asleep,
            // it is put down, which is what a lesson with nothing to do today looks like.
            const b = layer(root, { turn: [["translate", -9, 2]] });
            for (const [y, len] of [
                [36, 15],
                [43, 18],
                [50, 17],
                [56, 13],
            ] as const) {
                capsule(b, [42, y], [42 + len, y + (y > 50 ? 2 : 0)], 6.4);
            }
            b.pen.path(
                b.g,
                "M18 34 Q18 28 26 28 H42 Q48 28 48 36 V52 Q48 60 38 60 H26 Q18 60 18 52 Z",
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.7 },
            );
            capsule(b, [24, 34], [14, 26], 7);
            if (detail !== "tiny")
                for (const x of [28, 34, 40])
                    b.pen.line(b.g, x, 32, x, 36, "pencil", fine({ strokeWidth: 1 }));
            b.pen.path(
                b.g,
                "M18 46 Q12 46 12 52 Q12 58 18 58 H24 V46 Z",
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.5 },
            );
            return { hand: [57, 45, "right"], head: [30, 24, "up"], wrist: [16, 52, "left"] };
        }

        // The turn is written to a tenth of a degree, as it always was.
        const b = layer(root, {
            turn: [["rotate", Number(((turn * 180) / Math.PI).toFixed(1)), WRIST[0], WRIST[1]]],
        });
        const open = p === "retry";
        const tip = INDEX_TIP[p] ?? 8;

        // Fingers first, so the palm's edge draws over their bases.
        if (open) {
            for (const [x, top] of [
                [27.5, 13],
                [34, 7],
                [40.5, 9],
                [46.5, 15],
            ] as const)
                capsule(b, [x, 34], [x, top], 7);
        } else if (p === "write") {
            capsule(b, [30, 30], [27, 16], 7.5);
        } else {
            capsule(b, [29.5, 34], [28, tip], 8);
        }

        b.pen.path(b.g, PALM, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        if (!open && detail !== "tiny") curled(b);
        if (open && detail !== "tiny")
            for (const x of [30, 36.5, 43])
                b.pen.line(b.g, x, 26, x, 33, "pencil", fine({ strokeWidth: 1 }));

        // The thumb: up on its own for a cheer, out to the side of an open palm, tucked otherwise.
        if (p === "cheer") capsule(b, [27, 42], [22, 13], 8.5);
        else if (open) capsule(b, [24, 40], [12, 33], 7.5);
        else capsule(b, [26, 44], [17, 36], 7.5);

        b.pen.path(
            b.g,
            "M25 50 Q20 50 20 54 V58 Q20 62 25 62 H45 Q50 62 50 58 V54 Q50 50 45 50 Z",
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.6 },
        );
        if (detail !== "tiny")
            b.pen.line(b.g, 21, 56, 49, 56, "pencil", fine({ strokeWidth: 1.1 }));

        // The pencil the writing pose holds, drawn along the reach so its point lands where the mark is.
        let nib: Pt = [28, tip];
        if (p === "write") {
            const from: Pt = [37, 48];
            nib = [26, 7];
            const a = Math.atan2(nib[1] - from[1], nib[0] - from[0]);
            const w = 4.6,
                nx = -Math.sin(a) * w,
                ny = Math.cos(a) * w;
            const wood = polar(nib, a, -8);
            b.pen.polygon(
                b.g,
                [
                    [from[0] + nx, from[1] + ny],
                    [wood[0] + nx, wood[1] + ny],
                    [wood[0] - nx, wood[1] - ny],
                    [from[0] - nx, from[1] - ny],
                ],
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.4 },
            );
            b.pen.polygon(
                b.g,
                [[wood[0] + nx, wood[1] + ny], nib, [wood[0] - nx, wood[1] - ny]],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.3 },
            );
            b.pen.polygon(
                b.g,
                [polar(nib, a, -2.6), nib, polar(nib, a, -2.6)],
                "pencil",
                { fill: c.t.ink, fillStyle: "solid" },
                fine({ strokeWidth: 1.4 }),
            );
        }

        // The fingertip, or the pencil point, in the box's own coordinates after the turn. The arrow
        // to the target starts here, and so do the marks, which is why they are drawn outside the
        // turned group: they belong to the page rather than to the hand.
        const reach = p === "write" ? nib : ([28, tip] as Pt);
        const d = Math.hypot(reach[0] - WRIST[0], reach[1] - WRIST[1]);
        const a0 = Math.atan2(reach[1] - WRIST[1], reach[0] - WRIST[0]) + turn;
        const at = polar(WRIST, a0, d);

        if (p === "count") tapMarks(root, at, s.aim);
        // The mark's nib is placed on the pencil's point, so the two read as one pencil on one line.
        if (p === "write")
            writeMarks(
                root,
                polar(at, s.aim ? Math.atan2(s.aim[1] - at[1], s.aim[0] - at[0]) : 0, -9),
                s.aim,
            );
        if (p === "cheer") {
            const sparks: [number, number, number][] = [
                [8, 16, 5.5],
                [52, 10, 4.5],
                [54, 40, 4],
            ];
            for (const [x, y, r] of sparks) sparkle(root, x, y, r);
        }
        if (p === "think") thought(root, 44, 14);
        if (p === "retry") again(root, 52, 26, 6);
        const crown = polar(
            WRIST,
            Math.atan2(20 - WRIST[1], 36 - WRIST[0]) + turn,
            Math.hypot(36 - WRIST[0], 20 - WRIST[1]),
        );
        return {
            hand: [at[0], at[1], at[0] < 30 ? "left" : "right"],
            head: [crown[0], crown[1] - 6, "up"],
            wrist: [WRIST[0], WRIST[1] + 3, "down"],
        };
    },
};

const POSE: Record<GuidePose, string> = {
    idle: "held up with its index finger raised and the other fingers curled",
    point: "turned to point its index finger out to one side",
    count: "its index finger out, tapping along a row, with tally ticks beside it",
    write: "holding a yellow pencil, its point on the line where an answer is written",
    cheer: "closed in a fist with the thumb up, with sparkles round it",
    think: "held up with one finger out and a few dots rising above it",
    retry: "open with the palm out and fingers spread, with a small loop beside it",
    rest: "laid flat on the page, seen from above, with the fingers together",
};

export const guideHand = guideDrawing(
    hand,
    (pose) => `A hand drawn as an outline on white, with a blue cuff at the wrist, ${POSE[pose]}.`,
);
