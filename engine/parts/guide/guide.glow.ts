// Glow: a small light with a face. It has no arms, so it points by shining a highlighter beam on
// what it means, which is the one gesture no other design can make.
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
    clearFace,
    dist,
    gaze,
    halo,
    ink,
    inkEyes,
    layer,
    mouth,
    polar,
    sparkle,
    tapMarks,
    thought,
    writeMarks,
    zeds,
} from "./kit";

const C: Pt = [30, 32];
const EYES: Pt[] = [
    [25, 31],
    [35, 31],
];
const RAY_END: Record<GuidePose, number> = {
    idle: 25,
    point: 25,
    count: 25,
    write: 22,
    cheer: 29.5,
    think: 22,
    retry: 26,
    rest: 0,
};
/** The beam narrows as the ask narrows: a part of the page, then one thing, then one box. */
const SPREAD: Partial<Record<GuidePose, number>> = { point: 0.19, count: 0.13, write: 0.1 };
const DEFAULT_AIM: Pt = [104, 40];
/** How far the rays reach in each boil frame, so boiling reads as a flicker. */
const FRAME_REACH: [number, number, number] = [0, 0.9, -0.7];

export const glow: GuideDesign = {
    id: "glow",
    name: "Glow",
    seed: 5281,
    link: "beam",
    motions: ["bob", "blink", "flicker", "pulse"],
    concept:
        "A light with a face, drawn the way a child draws the sun. Pointing is the thing it does best: it shines a highlighter beam on the part of the scene it means.",
    construction:
        "A ruler-level core in marker yellow, a wash halo that only exists on screen, inked rays from perfect-freehand, and a highlighter wedge for the beam.",
    acting: "The beam replaces the arm and reaches the target however far away it is. The rays are the mood: long when cheering, short dashes when thinking, gone when it rests.",
    strengths: [
        "The clearest pointing of the seven, and it reads at any distance across a scene.",
        "Fewest parts, so it survives 60 px and print better than anything with limbs.",
        "The light motif carries the product name without spelling it out.",
    ],
    weaknesses: [
        "Without limbs it has a narrow range of feeling: eyes, rays and mouth only.",
        "A yellow circle with a face is close to a sun or a smiley, so it risks feeling generic.",
        "A beam over a structure in print becomes a grey band on top of the work.",
    ],

    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors {
        const { pen, t, paper, detail } = c;
        const p = s.pose;
        const aim = aims(p)
            ? (s.aim ?? DEFAULT_AIM)
            : p === "idle" || p === "retry"
              ? s.aim
              : undefined;
        const lookAt: Pt | undefined = p === "think" ? [8, -4] : aim;
        const lift = p === "cheer" ? -3 : p === "rest" ? 4 : 0;
        const root = layer(c, { layer: p === "rest" ? "g-breathe" : "g-bob", origin: [30, 56] });
        const b = lift ? layer(root, { turn: [["translate", 0, lift]] }) : root;

        if (p !== "rest") halo(layer(b, { layer: "g-flicker" }), C, p === "cheer" ? 66 : 56, 0.5);

        const beamA = aims(p) && aim ? angleTo(C, aim) : 0;
        if (aims(p) && aim) {
            const L = Math.max(34, dist(C, aim)),
                spread = SPREAD[p] ?? 0.19;
            const wedge = [
                polar(C, beamA - spread, 13),
                polar(C, beamA - spread, L),
                polar(C, beamA + spread, L),
                polar(C, beamA + spread, 13),
            ];
            const col = paper ? "#C8C8C8" : t.glow;
            pen.polygon(b.g, wedge, "doodle", null, {
                stroke: "none",
                fill: col,
                fillStyle: "solid",
                opacity: paper ? 0.7 : 0.45,
            });
            pen.ellipse(b.g, aim[0], aim[1], 17, 12, "doodle", null, {
                stroke: "none",
                fill: col,
                fillStyle: "solid",
                opacity: paper ? 0.75 : 0.55,
            });
        }

        const end = RAY_END[p];
        if (end) {
            const rays = layer(b, { layer: "g-pulse", origin: [C[0], C[1]] });
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4 + Math.PI / 8;
                if (aims(p) && Math.abs(Math.atan2(Math.sin(a - beamA), Math.cos(a - beamA))) < 0.3)
                    continue;
                ink(
                    rays,
                    [polar(C, a, 19.5), polar(C, a, end + (FRAME_REACH[c.frame % 3] ?? 0))],
                    1.6,
                    { taper: 1.6 },
                );
            }
        }

        const litFill =
            p === "rest"
                ? paper
                    ? pen.fill("card")
                    : pen.fill("glow", "hachure", { hachureGap: 3 })
                : pen.fill("glow");
        pen.circle(b.g, C[0], C[1], 31, "pencil", litFill, { strokeWidth: 1.9 });

        clearFace(b, [30, 33], 27, 19);
        const look = gaze(C, lookAt, 2.4, [0, 0.4]);
        const d = detail === "tiny" ? 4.8 : 4.2;
        inkEyes(b, EYES, d, look, p === "cheer" ? "happy" : p === "rest" ? "sleep" : "open");
        if (p === "think") brows(b, EYES, d, [0, 2.4]);
        if (p === "retry") brows(b, EYES, d, [2.2, 2.2]);
        mouth(
            b,
            30,
            37.6,
            p === "cheer"
                ? "grin"
                : p === "think"
                  ? "flat"
                  : p === "rest" || p === "write"
                    ? "small"
                    : "smile",
            p === "retry" ? 8 : 7,
        );

        if (p === "cheer") {
            const sparks: [number, number, number][] = [
                [6, 12, 5.5],
                [54, 8, 4.5],
                [52, 52, 4],
            ];
            for (const [x, y, r] of sparks) sparkle(b, x, y, r);
        }
        if (p === "think") thought(b, 48, 10);
        if (p === "retry") {
            again(b, 52, 52, 6);
            for (const a of [-Math.PI / 2, Math.PI / 2])
                pen.arc(b.g, C[0], C[1], 62, 62, a - 0.45, a + 0.45, "pencil", {
                    stroke: t["ink-soft"],
                    strokeWidth: 1.2,
                });
        }
        if (p === "rest") zeds(b, 46, 8, 6);

        const hp = aims(p) ? polar(C, beamA, 16) : ([45, 34] as Pt);
        if (p === "count") tapMarks(b, hp, aim);
        if (p === "write") writeMarks(b, hp, aim);
        return {
            hand: [hp[0], hp[1] + lift, hp[0] < 30 ? "left" : "right"],
            head: [30, 14 + lift, "up"],
            light: [C[0], C[1] + lift, "down"],
        };
    },
};

const POSE: Record<GuidePose, string> = {
    idle: "its rays out all round and its eyes looking straight ahead",
    point: "shining a pale beam out to one side, its eyes turned the same way",
    count: "shining a narrow beam along a row, with tally ticks beside it",
    write: "shining a narrow beam down to where an answer is written",
    cheer: "its rays long and its eyes closed in two happy arcs, with sparkles round it",
    think: "its rays short, its brows raised and a few dots rising above it",
    retry: "its brows raised and its rays out, with a small loop drawn beside it",
    rest: "its rays gone and its eyes closed, dozing",
};

export const guideGlow = guideDrawing(
    glow,
    (pose) =>
        `A round yellow light with a small face, drawn as a child draws the sun, ${POSE[pose]}.`,
);
