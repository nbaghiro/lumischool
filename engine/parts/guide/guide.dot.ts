// Dot: a drop of the teacher's ballpoint with eyes, and nothing else. No limbs and no mouth; it
// points by stretching toward the target, and the whole body squashes and stretches to emote.
import { plain } from "../../ink/surface";
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
    blinking,
    blob,
    fine,
    gaze,
    hop,
    layer,
    polar,
    sparkle,
    tapMarks,
    writeMarks,
    zeds,
} from "./kit";

// Eyes keep the same two colours in every theme and in print, so the face never inverts.
const WHITE = "#FFFFFF";
const PUPIL = "#1A1A1A";
const R = 16;
const GROUND = 56;
const SHAPE: Record<GuidePose, { c: Pt; sx: number; sy: number }> = {
    idle: { c: [30, 38], sx: 1.03, sy: 0.97 },
    point: { c: [30, 38], sx: 1.02, sy: 0.98 },
    count: { c: [30, 38], sx: 1.02, sy: 0.98 },
    write: { c: [30, 40], sx: 1.07, sy: 0.93 },
    cheer: { c: [30, 31], sx: 0.92, sy: 1.12 },
    think: { c: [30, 38], sx: 1.05, sy: 0.95 },
    retry: { c: [30, 41], sx: 1.16, sy: 0.85 },
    rest: { c: [30, 47], sx: 1.34, sy: 0.58 },
};

export const dot: GuideDesign = {
    id: "dot",
    name: "Dot",
    seed: 8431,
    link: "arrow",
    motions: ["blink", "squash"],
    concept:
        "The least drawing that still has a character in it: one ink blot and two eyes. It is a mark on the page rather than a creature standing on it.",
    construction:
        "One filled shape from a seeded closed curve in ballpoint blue, redrawn per boil frame, with white eyes and dark pupils that never change with the theme.",
    acting: "Pointing stretches the blot into a drop aimed at the target and turns the face with it. Cheering stretches it tall, trying again lands it in a wide squash, resting spreads it into a puddle.",
    strengths: [
        "Best contrast of the seven at 60 px and the safest in print: a solid shape and two eyes.",
        "Squash and stretch is the cheapest animation there is, and it never breaks.",
        "Nothing about it suggests an age, a gender or a place.",
    ],
    weaknesses: [
        "No hand, so the arrow to the target starts from a body edge and reads less clearly.",
        "Mouthless and limbless, all feeling has to come through eyes and shape.",
        "It can read as a generic blob mascot, and the ink blot is close to a full stop or a spill.",
    ],

    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors {
        const { t, detail } = c;
        const p = s.pose;
        const aim = aims(p) || p === "idle" || p === "retry" ? s.aim : undefined;
        const lookAt: Pt | undefined = p === "think" ? [8, -8] : aim;
        const k = SHAPE[p];
        const centre: Pt = aims(p) && s.aim ? polar(k.c, angleTo(k.c, s.aim), 2) : k.c;
        const aimA = aims(p) && s.aim ? angleTo(centre, s.aim) : 0;

        const root = layer(c, {
            layer: p === "rest" ? "g-breathe" : "g-squash",
            origin: [30, GROUND],
        });

        const n = 16;
        const pts: Pt[] = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            let r = R * (1 + (c.rand() - 0.5) * 0.07);
            if (aims(p) && s.aim)
                r *=
                    1 + (p === "write" ? 0.4 : 0.55) * Math.pow(Math.max(0, Math.cos(a - aimA)), 4);
            const x = centre[0] + r * k.sx * Math.cos(a);
            pts.push([x, Math.min(centre[1] + r * k.sy * Math.sin(a), GROUND)]);
        }
        blob(root, pts, c.paper ? t.ink : t.pen);

        const turn = gaze(centre, lookAt, 3.4, [0, 0]);
        const ew = detail === "tiny" ? 8.4 : 7.6,
            eh = detail === "tiny" ? 10 : 9.2;
        const eyes: Pt[] = [-1, 1].map((sd) => [
            centre[0] + sd * 5.8 * k.sx + turn[0],
            centre[1] - 4 * k.sy + turn[1] * 0.7,
        ]);
        const drawEyes = (o: GuideCtx<G>, mood: "open" | "happy" | "sleep"): void => {
            for (const [x, y] of eyes) {
                if (mood === "open") {
                    o.pen.ellipse(o.g, x, y, ew, eh, "pencil", null, {
                        stroke: "none",
                        fill: WHITE,
                        fillStyle: "solid",
                    });
                } else {
                    const up = mood === "happy";
                    o.pen.arc(
                        o.g,
                        x,
                        y + (up ? 2 : -1),
                        ew * 0.95,
                        eh * 0.62,
                        up ? Math.PI + 0.25 : 0.25,
                        up ? 2 * Math.PI - 0.25 : Math.PI - 0.25,
                        "pencil",
                        fine({ stroke: WHITE, strokeWidth: 2 }),
                    );
                }
            }
        };
        if (p === "cheer") drawEyes(root, "happy");
        else if (p === "rest") drawEyes(root, "sleep");
        else {
            drawEyes(root, "open");
            const look = gaze(centre, lookAt, 1.7, [0, 0.4]);
            blinking(
                root,
                (o) => {
                    for (const [x, y] of eyes)
                        plain(o, {
                            kind: "circle",
                            cx: x + look[0],
                            cy: y + look[1],
                            r: detail === "tiny" ? 2.5 : 2.2,
                            fill: PUPIL,
                        });
                },
                (o) => {
                    for (const [x, y] of eyes)
                        o.pen.line(
                            o.g,
                            x - ew * 0.45,
                            y,
                            x + ew * 0.45,
                            y,
                            "pencil",
                            fine({ stroke: PUPIL, strokeWidth: 1.6 }),
                        );
                },
            );
        }

        if (p === "cheer") {
            const sparks: [number, number, number][] = [
                [7, 16, 5.5],
                [53, 12, 4.5],
                [50, 44, 4],
            ];
            for (const [x, y, r] of sparks) sparkle(root, x, y, r);
            hop(root, 30, 58, 16);
        }
        if (p === "think") {
            const dots: [number, number, number][] = [
                [50, 20, 2.6],
                [56, 14, 3.6],
                [63, 5.5, 5],
            ];
            for (const [x, y, r] of dots) {
                const ring: Pt[] = Array.from({ length: 9 }, (_, i) =>
                    polar([x, y], (i / 9) * Math.PI * 2, r * (1 + (c.rand() - 0.5) * 0.12)),
                );
                blob(root, ring, c.paper ? t.ink : t.pen);
            }
        }
        if (p === "retry") again(root, 50, 16, 6);
        if (p === "rest") zeds(root, 48, 24, 6);

        const edge =
            aims(p) && s.aim
                ? polar(centre, aimA, R * (p === "write" ? 1.45 : 1.6))
                : ([centre[0] + R * 1.05, centre[1]] as Pt);
        if (p === "count") tapMarks(root, edge, s.aim);
        if (p === "write") writeMarks(root, edge, s.aim);
        return {
            hand: [edge[0], edge[1], edge[0] < 30 ? "left" : "right"],
            head: [centre[0], centre[1] - R * k.sy - 3, "up"],
            eyes: [centre[0] + turn[0], centre[1] - 4, "up"],
        };
    },
};

const POSE: Record<GuidePose, string> = {
    idle: "sitting round and still, its eyes looking straight ahead",
    point: "stretched into a drop toward one side, its eyes turned the same way",
    count: "stretched toward a row, its eyes turned the same way, with tally ticks beside it",
    write: "leaning toward where an answer is written, its eyes turned the same way",
    cheer: "stretched tall with its eyes closed in two happy arcs, with sparkles round it",
    think: "its eyes rolled up toward a few small blots rising above it",
    retry: "squashed wide, with a small loop drawn beside it",
    rest: "spread flat into a puddle with its eyes closed, dozing",
};

export const guideDot = guideDrawing(
    dot,
    (pose) =>
        `A round blot of blue ballpoint ink with two white eyes and dark pupils, ${POSE[pose]}.`,
);
