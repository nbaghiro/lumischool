// One upright of a show jump, with the cups a pole rests in. A fence is two of them, so the game
// places a left and a right and lays its pole between their cups.
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);
const toneOf = (v: unknown): Marker => MARKERS.find((m) => m === v) ?? "tang";
const FLAGS = ["none", "red", "white"] as const;
const flagOf = (v: unknown) => FLAGS.find((f) => f === v) ?? "none";

export const jumpStand = defineDrawing({
    id: "jumpstand",
    family: "sport",
    title: "Jump stand",
    group: "Structures",
    about: "One upright of a show jump: a post on a flat foot, with a row of cups up its inner face and one cup holding the pole at the height it is set to, and a red or white flag on top if it marks a fence. A fence is two of these facing each other, and the game lays a pole between their cups.",
    params: { tall: 3, set: 2, facing: 1, tone: "tang", flag: "none" },
    settings: {
        tall: { kind: "whole", min: 2, max: 4 },
        set: { kind: "whole", min: 1, max: 4 },
        facing: { kind: "one of", of: [1, -1] },
        tone: { kind: "one of", of: MARKERS },
        flag: { kind: "one of", of: FLAGS },
    },
    takes: [
        {
            label: "A low fence",
            params: { tall: 3, set: 1, facing: 1, tone: "tang", flag: "none" },
        },
        { label: "Set high", params: { tall: 4, set: 3, facing: 1, tone: "sky", flag: "white" } },
        {
            label: "The far upright",
            params: { tall: 3, set: 2, facing: -1, tone: "berry", flag: "red" },
        },
    ],
    box: (p) => ({ w: 1, h: whole(p.tall, 2, 4, 3) + (flagOf(p.flag) === "none" ? 0 : 1) }),
    draw: (c, p) => {
        const { pen, g } = c;
        const tall = whole(p.tall, 2, 4, 3);
        const held = Math.min(whole(p.set, 1, 4, 2), tall - 1);
        const dir = p.facing < 0 ? -1 : 1;
        const tone = toneOf(p.tone);
        const flag = flagOf(p.flag);
        // a flag stands a square over the post, so the post and its cups are drawn a square lower
        const T = flag === "none" ? 0 : U;
        const H = tall * U + T;
        const F = H - 4;
        const X = (x: number) => (dir > 0 ? x : U - x);
        // The foot it stands on, then the post, then the cups up the face a pole is laid against.
        pen.polygon(
            g,
            [
                [X(1.5), F],
                [X(18.5), F],
                [X(16), F - 4],
                [X(4), F - 4],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            calm(c, 1.5),
        );
        pen.polygon(
            g,
            [
                [X(6), F - 3],
                [X(14), F - 3],
                [X(13), T + 5],
                [X(7), T + 5],
            ],
            "pencil",
            pen.fill("card"),
            calm(c, 1.7),
        );
        // A band of the fence's colour at the top, so two fences read apart at a glance.
        pen.polygon(
            g,
            [
                [X(6.6), T + 12],
                [X(13.4), T + 12],
                [X(13.2), T + 5],
                [X(6.8), T + 5],
            ],
            "pencil",
            pen.fill(tone, "hachure", { hachureGap: 3.2, fillWeight: 0.8 }),
            calm(c, 1.2),
        );
        // A cup sits exactly n squares above the grass, so a pole laid in it lines up with a game's
        // own rail at that height.
        const cupY = (n: number) => F - n * U;
        for (let n = 1; n <= tall - 1; n++) {
            const y = cupY(n);
            const inCup = n === held;
            pen.polygon(
                g,
                [
                    [X(13), y + 3],
                    [X(19), y + 2],
                    [X(19), y - 3],
                    [X(13), y - 2],
                ],
                "ruler",
                inCup ? pen.fill(tone) : pen.fill("card"),
                { strokeWidth: inCup ? 1.3 : 1 },
            );
        }
        if (flag !== "none") {
            pen.line(g, X(10), T + 5, X(10), 2, "ruler", { strokeWidth: 1.3 });
            pen.polygon(
                g,
                [
                    [X(10), 2],
                    [X(1), 6],
                    [X(10), 10],
                ],
                "pencil",
                pen.fill(flag === "red" ? "berry" : "card"),
                calm(c, 1.2),
            );
        }
        return {
            cup: [X(18), cupY(held), dir > 0 ? "right" : "left"],
            top: [X(10), T + 5, "up"],
            foot: [X(10), F, "down"],
        } satisfies RawAnchors;
    },
    describe: (p) => {
        const tall = whole(p.tall, 2, 4, 3);
        const flag = flagOf(p.flag);
        return `One upright of a show jump, ${tall} squares tall, on a flat foot, with cups up its face and a ${MARKER_WORD[toneOf(p.tone)]} band at the top${flag === "none" ? "" : ` under a ${flag} flag`}.`;
    },
    motion: { still: "A jump stand is planted on the grass and waits for the pole to be knocked." },
});
