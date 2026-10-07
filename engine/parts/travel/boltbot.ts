import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const POSES = ["stand", "run", "stride", "jump", "hover", "spin", "cheer", "fly"] as const;
type Pose = (typeof POSES)[number];
const poseOf = (v: string): Pose => POSES.find((p) => p === v) ?? "stand";

const GEAR = ["none", "gloves", "rocket", "magnet"] as const;
type Gear = (typeof GEAR)[number];
const gearOf = (v: string): Gear => GEAR.find((g) => g === v) ?? "none";

/** Where each hand is, from the shoulder, and where each foot is, from the hip, for a pose: [near, far]. */
const LIMBS: Record<Pose, { hands: [number, number][]; feet: [number, number][] }> = {
    stand: {
        hands: [
            [-0.55, 0.55],
            [0.55, 0.55],
        ],
        feet: [
            [-0.3, 0.85],
            [0.3, 0.85],
        ],
    },
    run: {
        hands: [
            [0.5, 0.35],
            [-0.55, 0.45],
        ],
        feet: [
            [-0.5, 0.7],
            [0.45, 0.8],
        ],
    },
    stride: {
        hands: [
            [-0.5, 0.4],
            [0.5, 0.4],
        ],
        feet: [
            [0.35, 0.75],
            [-0.4, 0.8],
        ],
    },
    jump: {
        hands: [
            [-0.55, -0.35],
            [0.6, -0.3],
        ],
        feet: [
            [-0.25, 0.6],
            [0.35, 0.55],
        ],
    },
    hover: {
        hands: [
            [-0.75, 0.1],
            [0.75, 0.1],
        ],
        feet: [
            [-0.15, 0.85],
            [0.15, 0.85],
        ],
    },
    spin: {
        hands: [
            [-0.85, -0.05],
            [0.85, -0.05],
        ],
        feet: [
            [-0.25, 0.85],
            [0.25, 0.85],
        ],
    },
    fly: {
        hands: [
            [-0.4, -0.8],
            [0.5, -0.85],
        ],
        feet: [
            [-0.35, 0.75],
            [0.1, 0.9],
        ],
    },
    cheer: {
        hands: [
            [-0.45, -0.75],
            [0.45, -0.75],
        ],
        feet: [
            [-0.35, 0.85],
            [0.35, 0.85],
        ],
    },
};

const WORDS: Record<Pose, string> = {
    stand: "standing ready",
    run: "running",
    stride: "running",
    jump: "jumping with its arms up",
    hover: "hovering with its arms out",
    spin: "spinning with its arms out wide",
    cheer: "cheering with both arms up",
    fly: "flying upward with its arms reaching high",
};

export const boltBot = defineDrawing<{ pose: string; gear: string }>({
    id: "boltbot",
    family: "travel",
    title: "Bolt the robot",
    group: "Characters",
    about: "Bolt, a small white robot who rescues lost crew on far planets: a round helmet with a dark visor and two blue eyes, an antenna, a little body with a glowing chest light, and the gadget a planet gives.",
    params: { pose: "stand", gear: "none" },
    settings: {
        pose: { kind: "one of", of: POSES },
        gear: { kind: "one of", of: GEAR },
    },
    takes: [
        { label: "Standing ready", params: { pose: "stand", gear: "none" } },
        { label: "Running", params: { pose: "run", gear: "none" } },
        { label: "Jumping", params: { pose: "jump", gear: "none" } },
        { label: "Hovering", params: { pose: "hover", gear: "none" } },
        { label: "Spinning", params: { pose: "spin", gear: "none" } },
        { label: "Cheering", params: { pose: "cheer", gear: "none" } },
        { label: "Flying up", params: { pose: "fly", gear: "none" } },
        { label: "With spring gloves", params: { pose: "stand", gear: "gloves" } },
        { label: "With a rocket pack", params: { pose: "jump", gear: "rocket" } },
        { label: "With a magnet", params: { pose: "stand", gear: "magnet" } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            pose = poseOf(p.pose),
            gear = gearOf(p.gear),
            limbs = LIMBS[pose],
            cx = U,
            edge = { strokeWidth: 1.4, roughness: 0.25 },
            ink = { strokeWidth: 1.6, stroke: c.t.ink, roughness: 0.2 };
        const hip = { x: cx, y: 2.25 * U },
            shoulder = { x: cx, y: 1.5 * U },
            limb = 0.55 * U,
            leg = 0.75 * U;
        if (gear === "rocket")
            pen.rect(g, 0.25 * U, 1.35 * U, 0.4 * U, 0.85 * U, "pencil", pen.fill("tang"), edge);
        // legs first, so the body sits over their tops
        for (const [fx, fy] of limbs.feet) {
            const x = hip.x + fx * leg,
                y = hip.y + fy * leg;
            pen.line(g, hip.x + fx * 0.15 * U, hip.y, x, y, "pencil", ink);
            pen.ellipse(g, x, y, 0.42 * U, 0.2 * U, "pencil", pen.fill("card"), edge);
        }
        pen.path(
            g,
            `M${0.6 * U} ${1.4 * U}H${1.4 * U}Q${1.5 * U} ${1.4 * U} ${1.5 * U} ${1.5 * U}V${2.1 * U}Q${1.5 * U} ${2.25 * U} ${1.35 * U} ${2.25 * U}H${0.65 * U}Q${0.5 * U} ${2.25 * U} ${0.5 * U} ${2.1 * U}V${1.5 * U}Q${0.5 * U} ${1.4 * U} ${0.6 * U} ${1.4 * U}Z`,
            "pencil",
            pen.fill("card"),
            edge,
        );
        pen.circle(g, cx, 1.8 * U, 0.42 * U, "pencil", pen.fill("sky"), edge);
        for (const [hx, hy] of limbs.hands) {
            const x = shoulder.x + hx * limb * 1.3,
                y = shoulder.y + hy * limb * 1.3;
            pen.line(
                g,
                shoulder.x + Math.sign(hx) * 0.45 * U,
                shoulder.y + 0.05 * U,
                x,
                y,
                "pencil",
                ink,
            );
            const glove = gear === "gloves";
            pen.circle(
                g,
                x,
                y,
                (glove ? 0.58 : 0.36) * U,
                "pencil",
                pen.fill(glove ? "berry" : "card"),
                edge,
            );
        }
        if (gear === "magnet") {
            const [hx, hy] = limbs.hands[1] ?? [0.55, 0.55],
                x = shoulder.x + hx * limb * 1.3,
                y = shoulder.y + hy * limb * 1.3;
            pen.path(
                g,
                `M${x - 0.2 * U} ${y - 0.05 * U}V${y + 0.25 * U}Q${x - 0.2 * U} ${y + 0.45 * U} ${x} ${y + 0.45 * U}Q${x + 0.2 * U} ${y + 0.45 * U} ${x + 0.2 * U} ${y + 0.25 * U}V${y - 0.05 * U}`,
                "pencil",
                null,
                { strokeWidth: 3, stroke: c.paper ? c.t.ink : c.t.berry, roughness: 0.2 },
            );
        }
        // the helmet, with its visor and the two eyes in it
        pen.line(g, cx, 0.35 * U, cx, 0.12 * U + 0.2 * U, "pencil", ink);
        pen.circle(g, cx, 0.17 * U, 0.32 * U, "pencil", pen.fill("glow"), edge);
        pen.path(
            g,
            `M${0.35 * U} ${0.75 * U}Q${0.35 * U} ${0.3 * U} ${cx} ${0.3 * U}Q${1.65 * U} ${0.3 * U} ${1.65 * U} ${0.75 * U}V${1.05 * U}Q${1.65 * U} ${1.4 * U} ${cx} ${1.4 * U}Q${0.35 * U} ${1.4 * U} ${0.35 * U} ${1.05 * U}Z`,
            "pencil",
            pen.fill("card"),
            edge,
        );
        pen.path(
            g,
            `M${0.55 * U} ${0.8 * U}Q${0.55 * U} ${0.52 * U} ${cx} ${0.52 * U}Q${1.45 * U} ${0.52 * U} ${1.45 * U} ${0.8 * U}V${0.98 * U}Q${1.45 * U} ${1.2 * U} ${cx} ${1.2 * U}Q${0.55 * U} ${1.2 * U} ${0.55 * U} ${0.98 * U}Z`,
            "pencil",
            pen.fill("ink-soft"),
            edge,
        );
        const happy = pose === "cheer" || pose === "jump" || pose === "fly";
        for (const dx of [-0.24, 0.24]) {
            if (happy)
                pen.path(
                    g,
                    `M${cx + (dx - 0.1) * U} ${0.92 * U}Q${cx + dx * U} ${0.74 * U} ${cx + (dx + 0.1) * U} ${0.92 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 2.2, stroke: c.paper ? c.t.card : c.t.sky, roughness: 0.15 },
                );
            else
                pen.ellipse(
                    g,
                    cx + dx * U,
                    0.86 * U,
                    0.16 * U,
                    0.24 * U,
                    "pencil",
                    pen.fill("sky"),
                    {
                        strokeWidth: 0.6,
                        stroke: c.paper ? c.t.card : c.t.sky,
                        roughness: 0.15,
                    },
                );
        }
        if (pose === "spin")
            for (const side of [-1, 1])
                pen.path(
                    g,
                    `M${cx + side * 0.95 * U} ${1.2 * U}Q${cx + side * 1.0 * U} ${1.65 * U} ${cx + side * 0.7 * U} ${2.0 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["ink-soft"], roughness: 0.3 },
                );
        return { feet: [cx, 3 * U, "down"], chest: [cx, 1.8 * U, "right"] };
    },
    describe: (p) => {
        const gear = gearOf(p.gear);
        return `Bolt, a small white robot with a round helmet, a dark visor and two blue eyes, ${WORDS[poseOf(p.pose)]}${gear === "gloves" ? ", wearing big red spring gloves" : gear === "rocket" ? ", with a rocket pack on its back" : gear === "magnet" ? ", holding a red magnet" : ""}.`;
    },
    motion: { still: "Bolt moves only as the game runs, jumps and spins it." },
});
