// The wolf who huffs and puffs at the pups' houses: a grey wolf on his hind legs with a bushy tail,
// who breathes in with his cheeks puffed, blows a gust from a round mouth, or walks along.
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

export const WOLF_POSES = ["stand", "huff", "blow", "walk"] as const;
type WolfPose = (typeof WOLF_POSES)[number];

interface WolfParams {
    pose: WolfPose;
    /** Which way he faces and blows: 1 to the right, -1 to the left. */
    dir: number;
}

const poseOf = (v: string): WolfPose => WOLF_POSES.find((p) => p === v) ?? "stand";

/** A thick line with round ends, for an arm or a leg. */
function capsule(a: [number, number], b: [number, number], w: number): string {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        d = Math.hypot(dx, dy) || 1,
        nx = (-dy / d) * w,
        ny = (dx / d) * w;
    return `M${a[0] + nx} ${a[1] + ny}L${b[0] + nx} ${b[1] + ny}A${w} ${w} 0 0 1 ${b[0] - nx} ${b[1] - ny}L${a[0] - nx} ${a[1] - ny}A${w} ${w} 0 0 1 ${a[0] + nx} ${a[1] + ny}Z`;
}

export const wolf = defineDrawing<WolfParams>({
    id: "wolf",
    family: "animals",
    title: "The huffing wolf",
    group: "Characters",
    about: "A grey wolf on his hind legs with pointed ears, a long snout and a big bushy tail, who breathes in with his cheeks puffed and blows a gust at a house of blocks.",
    params: { pose: "stand", dir: 1 },
    settings: {
        pose: { kind: "one of", of: WOLF_POSES },
        dir: { kind: "whole", min: -1, max: 1 },
    },
    takes: [
        { label: "Standing with a grin", params: { pose: "stand", dir: 1 } },
        { label: "Breathing in", params: { pose: "huff", dir: 1 } },
        { label: "Blowing", params: { pose: "blow", dir: 1 } },
        { label: "Walking away", params: { pose: "walk", dir: -1 } },
    ],
    box: () => ({ w: 5, h: 6 }),
    draw: (c, p): RawAnchors => {
        const pose = poseOf(p.pose),
            s = p.dir < 0 ? -1 : 1,
            cx = 2.5 * U,
            floor = 6 * U - 4;
        const whole = pose === "walk" ? part(c, "step", [cx, floor]) : c;
        const { pen, g } = whole;
        const P = (dx: number, dy: number): [number, number] => [cx + dx, floor + dy];
        const coat = pen.fill("ink-soft", "hachure", { hachureGap: 3.2, fillWeight: 0.7 }),
            pale = pen.fill("card"),
            ink = { fill: c.t.ink, fillStyle: "solid" } as const;
        const line = calm(c, 1.6);
        // breathing in puffs his chest and leans him back; blowing leans him into the gust
        const lean = pose === "blow" ? s * 5 : pose === "huff" ? -s * 3 : 0,
            chest = pose === "huff" ? 1.12 : 1;

        const hip = P(-s * 12, -30);
        const wag = part(whole, "tail", hip);
        wag.pen.path(
            wag.g,
            `M${hip[0]} ${hip[1]}Q${hip[0] - s * 30} ${hip[1] + 4} ${hip[0] - s * 34} ${hip[1] - 26}Q${hip[0] - s * 22} ${hip[1] - 20} ${hip[0] - s * 4} ${hip[1] - 12}Z`,
            "pencil",
            coat,
            calm(c, 1.5),
        );
        wag.pen.path(
            wag.g,
            `M${hip[0] - s * 34} ${hip[1] - 26}Q${hip[0] - s * 30} ${hip[1] - 14} ${hip[0] - s * 22} ${hip[1] - 12}`,
            "pencil",
            pale,
            calm(c, 1.1),
        );

        const foot = (x: number, y: number) =>
            pen.ellipse(g, x + s * 3, y, 16, 7, "ruler", coat, { strokeWidth: 1.3, ...FIRM });
        if (pose === "walk") {
            pen.path(g, capsule(P(-7, -28), P(-15, -6), 5.5), "pencil", coat, line);
            pen.path(g, capsule(P(7, -28), P(13, -5), 5.5), "pencil", coat, line);
            foot(...P(-15, -4));
            foot(...P(13, -3));
        } else
            for (const d of [-1, 1]) {
                pen.path(g, capsule(P(d * 9, -28), P(d * 11, -6), 5.5), "pencil", coat, line);
                foot(...P(d * 11, -4));
            }

        const bodyY = -40;
        const B = (dx: number, dy: number) => P(dx + lean * ((-dy - 20) / 40), dy);
        pen.ellipse(g, ...B(0, bodyY), 40 * chest, 50 * chest, "pencil", coat, calm(c, 1.7));
        pen.ellipse(g, ...B(s * 2, bodyY + 4), 20 * chest, 30 * chest, "ruler", pale, {
            strokeWidth: 1,
            ...FIRM,
        });

        const headY = bodyY - 36;
        const H = (dx: number, dy: number) => B(dx, headY + dy);
        for (const d of [-1, 1])
            pen.polygon(g, [H(d * 8, -14), H(d * 18, -32), H(d * 20, -8)], "pencil", coat, {
                ...calm(c, 1.4),
            });
        pen.circle(g, ...H(0, 0), 42, "pencil", coat, calm(c, 1.7));
        // the snout reaches out the way he faces, with his nose at its end
        const snout = H(s * 16, 8);
        pen.ellipse(g, ...snout, 30, 16, "pencil", pale, calm(c, 1.4));
        pen.ellipse(g, snout[0] + s * 13, snout[1] - 3, 8, 6, "ruler", ink, {
            strokeWidth: 0.8,
            ...FIRM,
        });
        if (pose === "huff")
            for (const d of [-1, 1])
                pen.circle(g, snout[0] + d * 7, snout[1] + 7, 13, "pencil", pale, calm(c, 1.2));
        const mouth: [number, number] = [snout[0] + s * 10, snout[1] + 6];
        if (pose === "blow")
            pen.ellipse(g, ...mouth, 7, 8, "ruler", pen.fill("berry"), {
                strokeWidth: 1.2,
                ...FIRM,
            });
        else if (pose === "stand" || pose === "walk")
            pen.path(
                g,
                `M${snout[0] - s * 4} ${snout[1] + 5}Q${snout[0] + s * 4} ${snout[1] + 10} ${snout[0] + s * 12} ${snout[1] + 3}`,
                "ruler",
                null,
                { strokeWidth: 1.2, ...FIRM },
            );

        const eyes = part(whole, "eyes", H(0, -6));
        for (const d of [-1, 1]) {
            const [ex, ey] = H(s * 4 + d * 8, -6);
            if (pose === "huff")
                eyes.pen.line(eyes.g, ex - 4, ey, ex + 4, ey, "ruler", {
                    strokeWidth: 1.4,
                    ...FIRM,
                });
            else {
                eyes.pen.circle(eyes.g, ex, ey, 5.4, "ruler", ink, { strokeWidth: 0.5, ...FIRM });
                plain(eyes, { kind: "circle", cx: ex + 0.8, cy: ey - 0.8, r: 0.9, fill: c.t.card });
            }
        }
        for (const d of [-1, 1]) {
            const [bx, by] = H(s * 4 + d * 8, -15);
            pen.line(g, bx - 4, by + d * s * 1.5, bx + 4, by - d * s * 1.5, "ruler", {
                strokeWidth: 1.1,
                ...FIRM,
            });
        }

        const shoulderY = bodyY - 16;
        for (const d of [-1, 1]) {
            const S = B(d * 15, shoulderY),
                E =
                    pose === "huff" || pose === "blow"
                        ? B(d * 24, shoulderY + 14)
                        : pose === "walk"
                          ? B(d * 18 + d * s * 5, shoulderY + 22)
                          : B(d * 20, shoulderY + 22);
            pen.path(g, capsule(S, E, 4.8), "pencil", coat, calm(c, 1.5));
            pen.circle(g, E[0], E[1], 11, "ruler", coat, { strokeWidth: 1.2, ...FIRM });
        }

        if (pose === "blow")
            for (let k = -1; k <= 1; k++) {
                const [x0, y0] = mouth;
                const y1 = y0 + k * 9;
                pen.path(
                    g,
                    `M${x0 + s * 6} ${y0 + k * 2}Q${x0 + s * 12} ${y1 - 5} ${x0 + s * 20} ${y1}`,
                    "ruler",
                    null,
                    { strokeWidth: 1.2, ...FIRM },
                );
            }

        const top = H(0, -28);
        return {
            head: [top[0], top[1], "up"],
            face: [mouth[0], mouth[1], s > 0 ? "right" : "left"],
            feet: [cx, floor, "down"],
        };
    },
    describe: (p) => {
        const doing: Record<WolfPose, string> = {
            stand: "standing still with a sly grin",
            huff: "breathing in hard with his cheeks puffed out",
            blow: "blowing a great gust of wind from his round mouth",
            walk: "walking along",
        };
        return `A grey wolf on his hind legs, with pointed ears, a long snout and a big bushy tail, ${doing[poseOf(p.pose)]}.`;
    },
    motion: {
        body: { is: "idle" },
        parts: {
            eyes: { is: "blink", period: 4.6 },
            tail: { is: "wiggle", deg: 10, period: 3, cycles: 3 },
            step: { is: "bob", lift: 2.2, arc: 0, deg: 0, period: 1.4 },
        },
    },
});
