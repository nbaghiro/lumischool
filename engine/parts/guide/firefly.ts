// Firefly: the placeholder guide redrawn as a design. Bigger head, a lantern that dims when it
// rests, two front legs that work as arms, and antennae that do most of the acting. It is not on
// the shelf, because the placeholder in guide.firefly.ts still holds its id there; it takes that
// place when the placeholder is retired.
import {
    aims,
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
    fine,
    gaze,
    halo,
    hand,
    hop,
    inkEyes,
    layer,
    limb,
    mouth,
    polar,
    sparkle,
    tapMarks,
    thought,
    waveMarks,
    writeMarks,
    zeds,
} from "./kit";

const HEAD: Pt = [30, 21];
const BELLY: Pt = [30, 43];
const EYES: Pt[] = [
    [25.3, 21],
    [34.7, 21],
];
const SHOULDER: [Pt, Pt] = [
    [20.5, 37],
    [39.5, 37],
];
const ANT: [Pt, Pt] = [
    [25.5, 10.2],
    [34.5, 10.2],
];
const REST_HAND: [Pt, Pt] = [
    [13, 46.5],
    [47, 46.5],
];

const WING_RAISE: Record<GuidePose, number> = {
    idle: 24,
    point: 26,
    count: 25,
    write: 18,
    cheer: 52,
    think: 18,
    retry: 32,
    rest: -12,
};
/** How the wings sit in each boil frame, so boiling reads as a flutter. */
const FRAME_RAISE: [number, number, number] = [0, 2.2, -1.6];

/** Antenna shape per pose: the two control points after the base, then the tip. */
function antenna(p: GuidePose, i: 0 | 1, shift: number): Pt[] {
    const s = i === 0 ? -1 : 1,
        base = ANT[i];
    const at = (dx: number, dy: number): Pt => [base[0] + s * dx + shift, base[1] + dy];
    if (p === "cheer") return [base, at(4.5, -8), at(10, -12.5)];
    if (p === "retry") return [base, at(4, -7), at(9, -11)];
    if (p === "rest") return [base, at(5, -2.7), at(10.5, -0.7)];
    if (p === "think" && i === 1)
        return [base, at(5, -6), at(10.5, -7), at(11.5, -2.7), at(8, -2.2)];
    return [base, at(3.5, -6.2), at(7, -9.7)];
}

export const firefly: GuideDesign = {
    id: "firefly",
    name: "Firefly",
    seed: 4127,
    link: "arrow",
    motions: ["bob", "blink", "flutter", "flicker"],
    concept:
        "A small night insect that carries its own light. The light is the brand's, and a firefly can hover anywhere on a page without needing ground to stand on.",
    construction:
        "Seeded rough.js at the doodle level, a solid marker wash in the lantern, hatched wings, and a soft yellow halo that only exists on screen.",
    acting: "A front leg reaches for the target and the eyes follow it. The antennae carry the mood: up for cheering, curled into a hook for thinking, drooping when it rests.",
    strengths: [
        "The light motif gives it a job no other design has: it lights up what matters.",
        "Hovering suits both a lesson scene and a map, with no ground line to place.",
        "The lantern reads as a single bright shape at 60 px.",
    ],
    weaknesses: [
        "The heaviest of the seven in print: the halo goes, and hatched wings next to a dotted lantern fill the shape with texture.",
        "Insect legs are thin, so the pointing arm is the least visible at 60 px.",
        "Wings plus antennae plus legs plus a face is a lot of small parts to keep apart at small sizes.",
    ],

    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors {
        const { pen, paper, detail } = c;
        const p = s.pose;
        const aim = aims(p) || p === "idle" || p === "retry" ? s.aim : undefined;
        const lookAt: Pt | undefined = p === "think" ? [6, -6] : aim;
        const lift = p === "cheer" ? -4 : p === "rest" ? 4 : 0;
        const root = layer(c, { layer: p === "rest" ? "g-breathe" : "g-bob", origin: [30, 56] });
        const b = lift ? layer(root, { turn: [["translate", 0, lift]] }) : root;

        if (p !== "rest")
            halo(layer(b, { layer: "g-flicker" }), BELLY, p === "cheer" ? 62 : 52, 0.5);

        // The wings sit at a slightly different angle in each boil frame, so boiling reads as a flutter.
        const raise = WING_RAISE[p] + (FRAME_RAISE[c.frame % 3] ?? 0);
        for (const side of [-1, 1]) {
            const hinge: Pt = [30 + side * 3, 32];
            const flap = layer(b, {
                layer: "g-flutter",
                origin: [hinge[0], hinge[1]],
                flap: -side * 11,
            });
            const w = layer(flap, { turn: [["rotate", side * raise, hinge[0], hinge[1]]] });
            w.pen.ellipse(
                w.g,
                30 + side * 15,
                31,
                24,
                13,
                "doodle",
                pen.fill("sky", "hachure", { hachureGap: paper ? 7 : 3.4 }),
                { strokeWidth: 1.3 },
            );
        }

        // In print the lantern is a field of dots; they need room or the whole body goes solid black.
        const lit =
            p === "rest"
                ? paper
                    ? pen.fill("card")
                    : pen.fill("glow", "hachure", { hachureGap: 3 })
                : pen.fill("glow", "solid", paper ? { hachureGap: 9 } : {});
        pen.ellipse(b.g, BELLY[0], BELLY[1], 25, 25, "doodle", lit, { strokeWidth: 1.8 });
        if (detail !== "tiny")
            pen.arc(b.g, 30, 37, 22, 9, 0.25, Math.PI - 0.25, "pencil", fine({ strokeWidth: 1.1 }));
        pen.circle(b.g, HEAD[0], HEAD[1], 25, "doodle", pen.fill("card"), { strokeWidth: 1.8 });

        const shift = aims(p) && s.aim ? Math.max(-3, Math.min(3, (s.aim[0] - 30) / 12)) : 0;
        for (const i of [0, 1] as const) {
            const pts = antenna(p, i, shift);
            pen.curve(b.g, pts, "doodle", { strokeWidth: 1.3 });
            const tip = pts[pts.length - 1] ?? ANT[i];
            pen.circle(
                b.g,
                tip[0],
                tip[1],
                3.6,
                "pencil",
                pen.fill(p === "rest" ? "card" : "glow"),
                fine({ strokeWidth: 1.1 }),
            );
        }

        const look = gaze(HEAD, lookAt, 2.1, [0, 0.4]);
        const d = detail === "tiny" ? 5 : 4.4;
        inkEyes(b, EYES, d, look, p === "cheer" ? "happy" : p === "rest" ? "sleep" : "open");
        if (p === "think") brows(b, EYES, d, [0, 2.4]);
        if (p === "retry") brows(b, EYES, d, [2.2, 2.2]);
        mouth(
            b,
            30,
            27.6,
            p === "cheer"
                ? "grin"
                : p === "think"
                  ? "flat"
                  : p === "rest" || p === "write"
                    ? "small"
                    : "smile",
            p === "retry" ? 8 : 7,
        );

        const hands: [Pt, Pt] = [REST_HAND[0], REST_HAND[1]];
        let pointing: 0 | 1 = 1;
        if (p === "cheer") {
            hands[0] = [10, 26];
            hands[1] = [50, 26];
        } else if (p === "think") hands[0] = [26, 30.5];
        else if (p === "rest") {
            hands[0] = [23.5, 47.5];
            hands[1] = [36.5, 47.5];
        } else if (p === "retry") {
            hands[0] = [16.5, 42];
            hands[1] = [49, 27];
        } else if (aims(p) && s.aim) {
            pointing = s.aim[0] < 28 ? 0 : 1;
            const sh = SHOULDER[pointing];
            const a = angleTo(sh, s.aim);
            // Writing is done with the hand lower and closer in, the way a hand rests on the paper.
            const reach = p === "write" ? 17 : 21;
            hands[pointing] = polar(
                sh,
                pointing === 1
                    ? clampAngle(a, -1.45, 1.15)
                    : clampAngle(a, Math.PI - 1.15, Math.PI + 1.45),
                reach,
            );
            if (p === "write") hands[pointing] = [hands[pointing][0], hands[pointing][1] + 3];
        }
        for (const i of [0, 1] as const) {
            limb(b, SHOULDER[i], hands[i], 1.7, i === 0 ? 0.16 : -0.16);
            hand(b, hands[i], 4.2);
        }

        if (p === "count") tapMarks(b, hands[pointing], s.aim);
        if (p === "write") writeMarks(b, hands[pointing], s.aim);
        if (p === "cheer") {
            const sparks: [number, number, number][] = [
                [7, 11, 5.5],
                [54, 7, 4.5],
                [56, 41, 4],
            ];
            for (const [x, y, r] of sparks) sparkle(b, x, y, r);
            hop(b, 30, 60, 16);
        }
        if (p === "think") thought(b, 45, 9);
        if (p === "retry") {
            again(b, 7, 27, 6);
            waveMarks(b, hands[1], -0.9);
        }
        if (p === "rest") zeds(b, 44, 5, 6);

        const hp = aims(p) && s.aim ? hands[pointing] : hands[1];
        return {
            hand: [hp[0], hp[1] + lift, hp[0] < 30 ? "left" : "right"],
            head: [30, 7 + lift, "up"],
            light: [BELLY[0], BELLY[1] + lift, "down"],
        };
    },
};
