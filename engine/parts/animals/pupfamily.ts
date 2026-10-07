// The Pup family: four dogs who stand on their hind legs, one drawing with the member as a setting.
// Rufus the dad is a tan dog with long floppy ears, Maple the mum a curly yellow one, Pip the older pup
// a white terrier with a patch over one eye, and Dot the youngest a white pup with black spots. Each
// pose that is a movement has a part of its own: a hop for a cheer or a jump, a step for a walk, a
// shiver for a shake, a munch for a chomp. A catch opens the mouth wide for food coming down. A run, a leap, a swim and a carry face the way `dir` says.
import { part, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const PUPS = ["rufus", "maple", "pip", "dot"] as const;
export type Pup = (typeof PUPS)[number];
export const PUP_POSES = [
    "stand",
    "wave",
    "sit",
    "walk",
    "jump",
    "cheer",
    "run",
    "leap",
    "swim",
    "carry",
    "shake",
    "catch",
    "chomp",
] as const;
type PupPose = (typeof PUP_POSES)[number];
const MOODS = ["happy", "excited", "surprised", "worried", "sad"] as const;
type PupMood = (typeof MOODS)[number];
/** What a pup wears for a rescue job: a fire helmet, a flying cap with goggles, a hard hat or a life vest. */
export const PUP_GEAR = ["none", "helmet", "cap", "hardhat", "vest"] as const;
type PupGear = (typeof PUP_GEAR)[number];

export interface PupParams {
    member: Pup;
    pose: PupPose;
    mood: PupMood;
    /** Which way a wave and the tail go: 1 to the right, -1 to the left. */
    dir: number;
    gear: PupGear;
}

const pick = <T extends string>(list: readonly T[], v: string, fallback: T): T =>
    list.find((x) => x === v) ?? fallback;

/** Each member's name, place in the family, how big they are and what their coat is. */
export const PUP_FACTS: Record<
    Pup,
    { name: string; role: string; k: number; coat: string; words: string }
> = {
    rufus: {
        name: "Rufus",
        role: "the dad",
        k: 1,
        coat: "tang",
        words: "a tan dog with long grey floppy ears and a white muzzle",
    },
    maple: {
        name: "Maple",
        role: "the mum",
        k: 0.96,
        coat: "glow",
        words: "a curly yellow dog with fluffy ears and a white muzzle",
    },
    pip: {
        name: "Pip",
        role: "the older pup",
        k: 0.8,
        coat: "card",
        words: "a white pup with pointed grey ears and a grey patch over one eye",
    },
    dot: {
        name: "Dot",
        role: "the little pup",
        k: 0.72,
        coat: "card",
        words: "a white pup with black spots and short black floppy ears",
    },
};

const grownUp = (m: Pup) => m === "rufus" || m === "maple";
const boxOf = (p: PupParams) => ({
    w: 4,
    h:
        (grownUp(pick(PUPS, p.member, "rufus")) ? 6 : 5) +
        (p.pose === "jump" || p.pose === "leap" ? 1 : 0),
});

/** A thick line with round ends, for an arm, a leg or a tail. */
function capsule(a: [number, number], b: [number, number], w: number): string {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        d = Math.hypot(dx, dy) || 1,
        nx = (-dy / d) * w,
        ny = (dx / d) * w;
    return `M${a[0] + nx} ${a[1] + ny}L${b[0] + nx} ${b[1] + ny}A${w} ${w} 0 0 1 ${b[0] - nx} ${b[1] - ny}L${a[0] - nx} ${a[1] - ny}A${w} ${w} 0 0 1 ${a[0] + nx} ${a[1] + ny}Z`;
}

/** Bumps round a circle, for a curly coat. */
function curls(cx: number, cy: number, r: number, n: number): string {
    let d = "";
    for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2,
            m = ((i - 0.5) / n) * Math.PI * 2,
            x = cx + Math.cos(t) * r,
            y = cy + Math.sin(t) * r;
        d +=
            i === 0
                ? `M${x} ${y}`
                : `Q${cx + Math.cos(m) * r * 1.3} ${cy + Math.sin(m) * r * 1.3} ${x} ${y}`;
    }
    return `${d}Z`;
}

export const pupFamily = defineDrawing<PupParams>({
    id: "pupfamily",
    family: "animals",
    title: "The Pup family",
    group: "Characters",
    about: "A family of four dogs who stand on their hind legs: Rufus the dad, a tan dog with long floppy ears; Maple the mum, curly and yellow; Pip, a white terrier pup with a patch over one eye; and Dot, the youngest, white with black spots. Each member stands, waves, sits, walks, jumps, cheers, runs, leaps, swims, carries a thing, shakes off water, catches food in a wide open mouth or chomps it, and their tails wag. For a rescue each can wear a fire helmet, a flying cap, a hard hat or a life vest.",
    params: { member: "rufus", pose: "wave", mood: "happy", dir: 1, gear: "none" },
    settings: {
        member: { kind: "one of", of: PUPS },
        pose: { kind: "one of", of: PUP_POSES },
        mood: { kind: "one of", of: MOODS },
        dir: { kind: "whole", min: -1, max: 1 },
        gear: { kind: "one of", of: PUP_GEAR },
    },
    takes: [
        {
            label: "Rufus waving",
            params: { member: "rufus", pose: "wave", mood: "happy", dir: 1, gear: "none" },
        },
        {
            label: "Maple cheering",
            params: { member: "maple", pose: "cheer", mood: "excited", dir: 1, gear: "none" },
        },
        {
            label: "Pip walking",
            params: { member: "pip", pose: "walk", mood: "happy", dir: -1, gear: "none" },
        },
        {
            label: "Dot jumping",
            params: { member: "dot", pose: "jump", mood: "excited", dir: 1, gear: "none" },
        },
        {
            label: "Dot sitting",
            params: { member: "dot", pose: "sit", mood: "surprised", dir: 1, gear: "none" },
        },
        {
            label: "Rufus standing",
            params: { member: "rufus", pose: "stand", mood: "worried", dir: -1, gear: "none" },
        },
        {
            label: "Pip running",
            params: { member: "pip", pose: "run", mood: "excited", dir: 1, gear: "none" },
        },
        {
            label: "Maple leaping",
            params: { member: "maple", pose: "leap", mood: "excited", dir: 1, gear: "none" },
        },
        {
            label: "Rufus swimming",
            params: { member: "rufus", pose: "swim", mood: "happy", dir: 1, gear: "none" },
        },
        {
            label: "Dot carrying",
            params: { member: "dot", pose: "carry", mood: "happy", dir: -1, gear: "none" },
        },
        {
            label: "Rufus in a fire helmet",
            params: { member: "rufus", pose: "carry", mood: "happy", dir: 1, gear: "helmet" },
        },
        {
            label: "Maple in a flying cap",
            params: { member: "maple", pose: "wave", mood: "happy", dir: 1, gear: "cap" },
        },
        {
            label: "Pip in a hard hat",
            params: { member: "pip", pose: "stand", mood: "happy", dir: 1, gear: "hardhat" },
        },
        {
            label: "Dot in a life vest",
            params: { member: "dot", pose: "cheer", mood: "excited", dir: 1, gear: "vest" },
        },
        {
            label: "Pip catching",
            params: { member: "pip", pose: "catch", mood: "excited", dir: 1, gear: "none" },
        },
        {
            label: "Pip chomping",
            params: { member: "pip", pose: "chomp", mood: "happy", dir: -1, gear: "none" },
        },
        {
            label: "Rufus shaking",
            params: { member: "rufus", pose: "shake", mood: "surprised", dir: 1, gear: "none" },
        },
    ],
    box: boxOf,
    draw: (c, p): RawAnchors => {
        const m = pick(PUPS, p.member, "rufus"),
            pose = pick(PUP_POSES, p.pose, "stand"),
            mood = pick(MOODS, p.mood, "happy"),
            gear = pick(PUP_GEAR, p.gear, "none"),
            f = PUP_FACTS[m],
            k = f.k,
            box = boxOf(p),
            s = p.dir < 0 ? -1 : 1;
        const cx = (box.w * U) / 2,
            floor = box.h * U - 4;
        const whole =
            pose === "jump" || pose === "cheer"
                ? part(c, "hop", [cx, floor])
                : pose === "chomp"
                  ? part(c, "munch", [cx, floor])
                  : pose === "walk"
                    ? part(c, "step", [cx, floor])
                    : pose === "shake"
                      ? part(c, "shiver", [cx, floor])
                      : c;
        const { pen, g } = whole;
        const lift = pose === "jump" || pose === "leap" ? 16 : 0,
            sit = pose === "sit" ? 12 : 0;
        const base = floor - lift;
        const P = (dx: number, dy: number): [number, number] => [cx + dx * k, base + dy * k];
        const coat = pen.fill(f.coat === "card" ? "card" : f.coat === "glow" ? "glow" : "tang"),
            pale = pen.fill("card"),
            dark = pen.fill("ink-soft"),
            ink = { fill: c.t.ink, fillStyle: "solid" } as const;
        const line = calm(c, 1.6);
        const spots = (pts: [number, number][], r: number) => {
            if (m !== "dot") return;
            for (const [x, y] of pts)
                plain(whole, { kind: "circle", cx: x, cy: y, r: r * k, fill: c.t.ink });
        };

        // the tail, behind the body, wagging from the hip
        const hip = P(-s * 12, -30 + sit);
        const wag = part(whole, "tail", hip);
        wag.pen.path(
            wag.g,
            capsule(hip, P(-s * 26, -48 + sit), m === "dot" || m === "pip" ? 3 : 4),
            "pencil",
            m === "maple" ? coat : m === "rufus" ? coat : pale,
            calm(c, 1.4),
        );
        if (m === "maple")
            wag.pen.path(
                wag.g,
                curls(...P(-s * 27, -50 + sit), 5 * k, 7),
                "pencil",
                coat,
                calm(c, 1.2),
            );

        // legs and feet
        const foot = (x: number, y: number) =>
            pen.ellipse(g, x, y, 13 * k, 7 * k, "ruler", m === "rufus" ? pale : coat, {
                strokeWidth: 1.3,
                ...FIRM,
            });
        if (pose === "sit") {
            for (const d of [-1, 1]) {
                pen.path(g, capsule(P(d * 8, -22), P(d * 13, -8), 5), "pencil", coat, line);
                foot(...P(d * 14, -5));
            }
        } else if (pose === "walk") {
            pen.path(g, capsule(P(-7, -26), P(-14, -6), 5), "pencil", coat, line);
            pen.path(g, capsule(P(7, -26), P(12, -5), 5), "pencil", coat, line);
            foot(...P(-15, -4));
            foot(...P(13, -3));
        } else if (pose === "jump") {
            for (const d of [-1, 1]) {
                pen.path(g, capsule(P(d * 8, -26), P(d * 12, -14), 5), "pencil", coat, line);
                pen.path(g, capsule(P(d * 12, -14), P(d * 9, -4), 5), "pencil", coat, line);
                foot(...P(d * 9, -3));
            }
        } else if (pose === "run" || pose === "carry") {
            // one leg reaching ahead and one kicked up behind, mid-stride
            pen.path(g, capsule(P(s * 7, -26), P(s * 19, -7), 5), "pencil", coat, line);
            pen.path(g, capsule(P(-s * 7, -26), P(-s * 18, -16), 5), "pencil", coat, line);
            foot(...P(s * 21, -5));
            foot(...P(-s * 21, -14));
        } else if (pose === "leap" || pose === "swim") {
            // both legs stretched out behind, as a dog does in the air or paddling
            for (const d of [0, 1]) {
                pen.path(
                    g,
                    capsule(P(-s * (4 + d * 6), -26), P(-s * (20 + d * 4), -18 + d * 8), 5),
                    "pencil",
                    coat,
                    line,
                );
                foot(...P(-s * (23 + d * 4), -17 + d * 8));
            }
        } else if (pose === "shake") {
            for (const d of [-1, 1]) {
                pen.path(g, capsule(P(d * 9, -26), P(d * 15, -6), 5), "pencil", coat, line);
                foot(...P(d * 16, -4));
            }
        } else {
            for (const d of [-1, 1]) {
                pen.path(g, capsule(P(d * 8, -26), P(d * 9, -6), 5), "pencil", coat, line);
                foot(...P(d * 10, -4));
            }
        }

        // the body, with a pale chest and the coat's own marks
        const bodyY = -40 + sit;
        pen.ellipse(g, ...P(0, bodyY), 36 * k, 44 * k, "pencil", coat, calm(c, 1.7));
        pen.ellipse(g, ...P(0, bodyY + 4), 18 * k, 26 * k, "ruler", pale, {
            strokeWidth: 1,
            ...FIRM,
        });
        if (m === "pip")
            pen.ellipse(g, ...P(s * 10, bodyY + 6), 12 * k, 10 * k, "ruler", dark, {
                strokeWidth: 1,
                ...FIRM,
            });
        if (m === "maple")
            for (const [dx, dy] of [
                [-12, -12],
                [12, -12],
                [-14, 6],
                [14, 6],
            ] as const)
                pen.path(g, curls(...P(dx, bodyY + dy), 4 * k, 6), "ruler", coat, {
                    strokeWidth: 1,
                    ...FIRM,
                });
        spots([P(-10, bodyY - 8), P(9, bodyY + 10), P(-6, bodyY + 14), P(12, bodyY - 12)], 2.6);
        // a life vest over the chest, with two white straps
        if (gear === "vest") {
            pen.path(
                g,
                `M${P(-16, bodyY - 16).join(" ")}Q${P(0, bodyY - 22).join(" ")} ${P(16, bodyY - 16).join(" ")}L${P(15, bodyY + 12).join(" ")}Q${P(0, bodyY + 18).join(" ")} ${P(-15, bodyY + 12).join(" ")}Z`,
                "pencil",
                pen.fill("tang"),
                calm(c, 1.5),
            );
            for (const dy of [-6, 5])
                pen.line(g, ...P(-15, bodyY + dy), ...P(15, bodyY + dy), "ruler", {
                    strokeWidth: 2.2,
                    stroke: c.t.card,
                    ...FIRM,
                });
        }

        const shoulderY = bodyY - 14;

        // the head: ears, face, muzzle and nose
        const headY = shoulderY - 30;
        const H = (dx: number, dy: number) => P(dx, headY + dy);
        if (m === "rufus")
            for (const d of [-1, 1])
                pen.path(
                    g,
                    `M${H(d * 14, -12).join(" ")}Q${H(d * 30, -4).join(" ")} ${H(d * 26, 22).join(" ")}Q${H(d * 18, 26).join(" ")} ${H(d * 14, 6).join(" ")}Z`,
                    "pencil",
                    dark,
                    calm(c, 1.4),
                );
        if (m === "dot")
            for (const d of [-1, 1])
                pen.path(
                    g,
                    `M${H(d * 12, -16).join(" ")}Q${H(d * 32, -12).join(" ")} ${H(d * 28, 12).join(" ")}Q${H(d * 20, 16).join(" ")} ${H(d * 14, -2).join(" ")}Z`,
                    "pencil",
                    ink,
                    calm(c, 1.2),
                );
        if (m === "maple")
            for (const d of [-1, 1])
                pen.path(g, curls(...H(d * 20, 4), 9 * k, 9), "pencil", coat, calm(c, 1.3));
        pen.circle(g, ...H(0, 0), 44 * k, "pencil", coat, calm(c, 1.7));
        if (m === "pip") {
            for (const d of [-1, 1])
                pen.polygon(
                    g,
                    [H(d * 10, -18), H(d * 22, -32), H(d * 20, -10)],
                    "pencil",
                    dark,
                    calm(c, 1.3),
                );
            pen.circle(g, ...H(s * 8, -2), 16 * k, "ruler", dark, { strokeWidth: 1, ...FIRM });
        }
        if (m === "maple") pen.path(g, curls(...H(0, -20), 9 * k, 9), "pencil", coat, calm(c, 1.3));
        spots([H(-12, -8), H(13, -12), H(4, -17)], 2.2);
        pen.ellipse(g, ...H(0, 9), 24 * k, 16 * k, "ruler", pale, { strokeWidth: 1.2, ...FIRM });
        pen.ellipse(g, ...H(0, 4), 8 * k, 5.5 * k, "ruler", ink, { strokeWidth: 0.8, ...FIRM });
        const eyes = part(whole, "eyes", H(0, -6));
        for (const d of [-1, 1]) {
            const [ex, ey] = H(d * 8, -6);
            if (pose === "chomp") {
                eyes.pen.path(
                    eyes.g,
                    `M${ex - 3.5 * k} ${ey}Q${ex} ${ey - 3 * k} ${ex + 3.5 * k} ${ey}`,
                    "ruler",
                    null,
                    { strokeWidth: 1.3, ...FIRM },
                );
                continue;
            }
            eyes.pen.circle(eyes.g, ex, ey, 5.4 * k, "ruler", ink, { strokeWidth: 0.5, ...FIRM });
            plain(eyes, {
                kind: "circle",
                cx: ex + 0.8 * k,
                cy: ey - 0.8 * k,
                r: 0.9 * k,
                fill: c.t.card,
            });
        }
        const [mx, my] = H(0, 13);
        const w = 1.2;
        // a catch and a chomp draw their own mouth whatever the mood, since the mouth is the pose
        if (pose === "catch") {
            pen.path(
                g,
                `M${mx - 7 * k} ${my - 2}H${mx + 7 * k}Q${mx + 7 * k} ${my + 10 * k} ${mx} ${my + 10 * k}Q${mx - 7 * k} ${my + 10 * k} ${mx - 7 * k} ${my - 2}Z`,
                "ruler",
                pen.fill("berry"),
                { strokeWidth: w, ...FIRM },
            );
            pen.ellipse(g, mx, my + 7 * k, 7 * k, 4 * k, "ruler", pen.fill("card"), {
                strokeWidth: 0.8,
                ...FIRM,
            });
        } else if (pose === "chomp") {
            pen.circle(
                g,
                mx + s * 4 * k,
                my + 3 * k,
                13 * k,
                "pencil",
                pen.fill("tang"),
                calm(c, 1.2),
            );
            pen.line(g, mx - 6 * k, my + 1, mx + 6 * k, my + 1, "ruler", {
                strokeWidth: w,
                ...FIRM,
            });
        } else if (mood === "happy")
            pen.path(
                g,
                `M${mx - 5 * k} ${my - 1}Q${mx} ${my + 4 * k} ${mx + 5 * k} ${my - 1}`,
                "ruler",
                null,
                { strokeWidth: w, ...FIRM },
            );
        else if (mood === "excited")
            pen.path(
                g,
                `M${mx - 6 * k} ${my - 1}H${mx + 6 * k}Q${mx + 5 * k} ${my + 6 * k} ${mx} ${my + 6 * k}Q${mx - 5 * k} ${my + 6 * k} ${mx - 6 * k} ${my - 1}Z`,
                "ruler",
                pen.fill("berry"),
                { strokeWidth: w, ...FIRM },
            );
        else if (mood === "surprised")
            pen.ellipse(g, mx, my + 1.5 * k, 5 * k, 6 * k, "ruler", pen.fill("card"), {
                strokeWidth: w,
                ...FIRM,
            });
        else if (mood === "sad")
            pen.path(
                g,
                `M${mx - 5 * k} ${my + 3 * k}Q${mx} ${my - 2 * k} ${mx + 5 * k} ${my + 3 * k}`,
                "ruler",
                null,
                { strokeWidth: w, ...FIRM },
            );
        else
            pen.curve(
                g,
                [
                    [mx - 5 * k, my + 1],
                    [mx - 2 * k, my - 1],
                    [mx + 1 * k, my + 1.5],
                    [mx + 5 * k, my],
                ],
                "ruler",
                { strokeWidth: w, ...FIRM },
            );
        if (mood === "worried" || mood === "sad")
            for (const d of [-1, 1]) {
                const [bx, by] = H(d * 8, -14);
                pen.line(g, bx - d * 3 * k, by - 2 * k, bx + d * 3 * k, by + 1 * k, "ruler", {
                    strokeWidth: 1.1,
                    ...FIRM,
                });
            }

        // the hat a job wears, sitting on the crown
        if (gear === "helmet" || gear === "hardhat" || gear === "cap") {
            const fill = pen.fill(
                gear === "helmet" ? "berry" : gear === "hardhat" ? "glow" : "sky",
            );
            pen.path(
                g,
                `M${H(-21, -10).join(" ")}Q${H(-20, -34).join(" ")} ${H(0, -34).join(" ")}Q${H(20, -34).join(" ")} ${H(21, -10).join(" ")}Z`,
                "pencil",
                fill,
                calm(c, 1.5),
            );
            if (gear === "cap")
                for (const d of [-1, 1])
                    pen.circle(g, ...H(d * 8, -18), 11 * k, "ruler", pen.fill("card"), {
                        strokeWidth: 1,
                        ...FIRM,
                    });
            else pen.line(g, ...H(-27, -10), ...H(27, -10), "ruler", { strokeWidth: 2.4, ...FIRM });
            if (gear === "hardhat")
                pen.line(g, ...H(0, -33), ...H(0, -12), "ruler", { strokeWidth: 1.2, ...FIRM });
        }

        // arms, drawn over the head so a wave shows: the near one waves, both go up for a cheer or a jump
        const arm = (
            d: number,
            key: "rest" | "up" | "wave" | "lap" | "reach" | "back" | "hold" | "paddle" | "out",
        ) => {
            const S = P(d * 14, shoulderY),
                E =
                    key === "up"
                        ? P(d * 26, shoulderY - 26)
                        : key === "wave"
                          ? P(d * 26, shoulderY - 22)
                          : key === "lap"
                            ? P(d * 10, shoulderY + 22)
                            : key === "reach"
                              ? P(s * 30, shoulderY - 6 + (d === s ? 0 : 8))
                              : key === "back"
                                ? P(-s * 24, shoulderY + 14)
                                : key === "hold"
                                  ? P(s * 16 + d * 5, shoulderY + 10)
                                  : key === "paddle"
                                    ? P(s * (d === s ? 30 : 20), shoulderY + (d === s ? 14 : 22))
                                    : key === "out"
                                      ? P(d * 26, shoulderY + 4)
                                      : P(d * 20, shoulderY + 20);
            const moving = key === "wave" ? part(whole, "wave", S, { dir: d }) : whole;
            moving.pen.path(moving.g, capsule(S, E, 4.5 * k), "pencil", coat, calm(c, 1.5));
            moving.pen.circle(moving.g, E[0], E[1], 11 * k, "ruler", m === "rufus" ? pale : coat, {
                strokeWidth: 1.2,
                ...FIRM,
            });
        };
        for (const d of [-1, 1])
            arm(
                d,
                pose === "cheer" || pose === "jump" || pose === "catch"
                    ? "up"
                    : pose === "wave" && d === s
                      ? "wave"
                      : pose === "sit"
                        ? "lap"
                        : pose === "run"
                          ? d === s
                              ? "reach"
                              : "back"
                          : pose === "leap"
                            ? "reach"
                            : pose === "carry" || pose === "chomp"
                              ? "hold"
                              : pose === "swim"
                                ? "paddle"
                                : pose === "shake"
                                  ? "out"
                                  : "rest",
            );
        // the drops a shake throws off, in the water's own blue
        if (pose === "shake")
            for (const [dx, dy] of [
                [-26, -74],
                [28, -68],
                [-31, -44],
                [32, -38],
                [-28, -14],
                [30, -10],
            ] as const)
                whole.pen.ellipse(whole.g, ...P(dx, dy), 5 * k, 8 * k, "ruler", pen.fill("sky"), {
                    strokeWidth: 1,
                    ...FIRM,
                });

        const top = H(0, m === "pip" ? -32 : -24),
            nose = H(s * 22, 0),
            hand = pose === "carry" ? P(s * 16, shoulderY + 10) : P(s * 24, shoulderY - 20);
        return {
            head: [top[0], top[1], "up"],
            face: [nose[0], nose[1], s > 0 ? "right" : "left"],
            feet: [cx, floor, "down"],
            hand: [hand[0], hand[1], "up"],
        };
    },
    describe: (p) => {
        const m = pick(PUPS, p.member, "rufus"),
            f = PUP_FACTS[m],
            pose = pick(PUP_POSES, p.pose, "stand"),
            mood = pick(MOODS, p.mood, "happy"),
            gear = pick(PUP_GEAR, p.gear, "none");
        const doing: Record<PupPose, string> = {
            stand: "standing",
            wave: "waving",
            sit: "sitting",
            walk: "walking",
            jump: "jumping",
            cheer: "with both arms up",
            run: "running flat out",
            leap: "leaping forwards",
            swim: "paddling along",
            carry: "carrying something home",
            shake: "shaking off water",
            catch: "catching with its mouth wide open",
            chomp: "munching a biscuit, eyes shut",
        };
        const face: Record<PupMood, string> = {
            happy: "",
            excited: " Its mouth is wide open.",
            surprised: " Its mouth is round and open.",
            worried: " Its mouth is wavy.",
            sad: " Its mouth turns down.",
        };
        const wears: Record<PupGear, string> = {
            none: "",
            helmet: " in a red fire helmet",
            cap: " in a blue flying cap",
            hardhat: " in a yellow hard hat",
            vest: " in an orange life vest",
        };
        // gear takes the place of the mouth's words, so a description stays within thirty
        const mouth = gear === "none" && pose !== "catch" && pose !== "chomp" ? face[mood] : "";
        return `${f.name} ${f.role}, ${f.words}, ${doing[pose]}${wears[gear]}.${mouth}`;
    },
    motion: {
        body: { is: "idle" },
        parts: {
            eyes: { is: "blink", period: 4.2 },
            tail: { is: "wiggle", deg: 18, period: 2.6, cycles: 4 },
            wave: { is: "wiggle", deg: 10, period: 3.8, cycles: 3 },
            hop: { is: "hop", lift: 7, squash: 0.08, period: 2.6 },
            step: { is: "bob", lift: 2.2, arc: 0, deg: 0, period: 1.4 },
            shiver: { is: "wiggle", deg: 6, period: 1.2, cycles: 6 },
            munch: { is: "bob", lift: 1.6, arc: 0, deg: 0, period: 0.5 },
        },
    },
});
