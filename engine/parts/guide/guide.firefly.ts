// The guide a lesson places: a placeholder firefly drawn by the same pen as everything else, in
// three poses. The redrawn firefly in firefly.ts is the design the worlds use; this keeps the
// shelf's id until one of the two is retired.
import { starPoints } from "../../ink/pen";
import type { Ctx, RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

type Pose = "idle" | "point" | "cheer";

const POSES: readonly Pose[] = ["idle", "point", "cheer"];

function firefly<G>(c: Ctx<G>, pose: Pose = "idle"): { hand: [number, number] } {
    const { pen, g, t, paper } = c;
    if (!paper) {
        pen.circle(g, 30, 36, 60, "doodle", null, {
            stroke: "none",
            fill: t.glow,
            fillStyle: "solid",
            opacity: 0.3,
        });
    }
    const wing = pen.fill("sky", "hachure", { hachureGap: 3.2 });
    pen.ellipse(g, 15, 27, 23, 13, "doodle", wing, { strokeWidth: 1.3 });
    pen.ellipse(g, 45, 27, 23, 13, "doodle", wing, { strokeWidth: 1.3 });
    pen.ellipse(g, 30, 39, 25, 30, "doodle", pen.fill("glow"), { strokeWidth: 1.8 });
    pen.circle(g, 30, 18, 20, "doodle", pen.fill("card"), { strokeWidth: 1.8 });
    pen.curve(
        g,
        [
            [26, 9],
            [23, 3],
            [17, -1],
        ],
        "doodle",
        { strokeWidth: 1.3 },
    );
    pen.curve(
        g,
        [
            [34, 9],
            [37, 3],
            [43, -1],
        ],
        "doodle",
        { strokeWidth: 1.3 },
    );
    pen.circle(
        g,
        26.5,
        17,
        3.6,
        "ruler",
        { fill: t.ink, fillStyle: "solid" },
        { strokeWidth: 0.5 },
    );
    pen.circle(
        g,
        33.5,
        17,
        3.6,
        "ruler",
        { fill: t.ink, fillStyle: "solid" },
        { strokeWidth: 0.5 },
    );
    if (pose === "cheer") {
        pen.arc(g, 30, 20, 10, 8, 0.2, Math.PI - 0.2, "pencil", { strokeWidth: 1.4 });
        for (const [x, y] of [
            [4, 6],
            [56, 8],
            [58, 46],
        ] as const)
            pen.polygon(g, starPoints(x, y, 5), "doodle", pen.fill("glow"), { strokeWidth: 1 });
    } else {
        pen.arc(g, 30, 21, 8, 5, 0.3, Math.PI - 0.3, "pencil", { strokeWidth: 1.3 });
    }
    if (pose === "point")
        pen.curve(
            g,
            [
                [42, 40],
                [50, 44],
                [58, 43],
            ],
            "doodle",
            { strokeWidth: 1.6 },
        );
    return { hand: pose === "point" ? [58, 43] : [30, 55] };
}

const SAID: Record<Pose, string> = {
    idle: "hovering and looking ahead",
    point: "with one front leg reaching out to the right",
    cheer: "smiling wide, with three small yellow stars round it",
};

export const guideV = defineDrawing<{ pose: Pose }>({
    id: "guide.firefly",
    family: "guide",
    title: "Guide (placeholder)",
    group: "Characters",
    about: "Three poses. Turn on Boil to see the three stored frames cycle.",
    params: { pose: "idle" },
    settings: { pose: { kind: "one of", of: POSES } },
    takes: [
        { label: "Idle", params: { pose: "idle" } },
        { label: "Pointing", params: { pose: "point" } },
        { label: "Cheering", params: { pose: "cheer" } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { hand } = firefly(c, p.pose);
        return {
            hand: [hand[0], hand[1], p.pose === "point" ? "right" : "down"],
            head: [30, 4, "up"],
        };
    },
    describe: (p) =>
        `A small round firefly with two hatched blue wings, a glowing yellow body, two antennae and dot eyes, ${SAID[p.pose]}.`,
    motion: { body: { is: "bob", lift: 0.05, period: 2.6 } },
});
