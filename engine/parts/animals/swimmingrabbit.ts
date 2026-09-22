import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** Where the water's surface runs across the swimming rabbit's box, in squares from its top. */
export const SWIMMER = { surface: 1.5, w: 3, h: 2 } as const;

export const swimmingRabbit = defineDrawing({
    id: "swimmingrabbit",
    family: "animals",
    title: "Swimming rabbit",
    group: "Characters",
    about: "A rabbit swimming, seen from the side: its head and ears up out of the water, its back a hump behind, and a wake of two ripples. It faces left or right, the way it is swimming.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [-1, 1] } },
    takes: [
        { label: "Swimming right", params: { facing: 1 } },
        { label: "Swimming left", params: { facing: -1 } },
    ],
    box: () => ({ w: SWIMMER.w, h: SWIMMER.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = SWIMMER.w * U,
            right = Number(p.facing) >= 0,
            X = (sq: number) => (right ? sq * U : w - sq * U),
            s = SWIMMER.surface * U,
            d = right ? 1 : -1;
        const fur = pen.fill("card", "solid");
        // the back, a hump behind the head, then the head with two ears, an eye, a nose and whiskers
        pen.path(
            g,
            `M${X(0.3)} ${s + 2}Q${X(0.75)} ${s - 0.6 * U} ${X(1.45)} ${s - 0.35 * U}L${X(1.6)} ${s + 2}Z`,
            "pencil",
            fur,
            calm(c, 1.7),
        );
        pen.ellipse(g, X(2), s - 0.42 * U, 1.15 * U, 0.95 * U, "pencil", fur, calm(c, 1.8));
        for (const [dx, tilt] of [
            [-0.3, -0.12],
            [0.08, 0.1],
        ] as const) {
            const ex = X(2 + dx),
                ey = s - 0.8 * U,
                top = ey - 0.72 * U,
                sx = tilt * d * U;
            pen.path(
                g,
                `M${ex - 4} ${ey}Q${ex - 5 + sx} ${top} ${ex + sx} ${top - 2}Q${ex + 5 + sx} ${top} ${ex + 4} ${ey}Z`,
                "pencil",
                fur,
                calm(c, 1.5),
            );
            pen.path(
                g,
                `M${ex - 1.5} ${ey - 2}Q${ex - 1.5 + sx} ${top + 5} ${ex + sx} ${top + 3}Q${ex + 1.5 + sx} ${top + 5} ${ex + 1.5} ${ey - 2}Z`,
                "ruler",
                pen.fill("berry", "solid"),
                { stroke: "none" },
            );
        }
        pen.circle(g, X(2.3), s - 0.5 * U, 4, "ruler", pen.fill("ink"), { strokeWidth: 1 });
        pen.circle(g, X(2.3) + 1.2 * d, s - 0.5 * U - 1.2, 1.4, "ruler", pen.fill("card"), {
            stroke: "none",
        });
        pen.circle(g, X(2.55), s - 0.28 * U, 3.2, "ruler", pen.fill("berry"), { strokeWidth: 0.8 });
        for (const dy of [-2, 2])
            pen.line(g, X(2.5), s - 0.28 * U + dy, X(2.95), s - 0.28 * U + dy * 2, "ruler", {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
                disableMultiStroke: true,
            });
        // the water over the body, and a wake behind
        pen.path(
            g,
            `M${X(0.05)} ${s}Q${X(0.6)} ${s - 4} ${X(1.15)} ${s}T${X(2.25)} ${s}T${X(2.95)} ${s - 1}`,
            "ruler",
            null,
            { strokeWidth: 1.7, stroke: c.t.sky, disableMultiStroke: true },
        );
        pen.path(
            g,
            `M${X(0.05)} ${s + 0.35 * U}Q${X(0.45)} ${s + 0.18 * U} ${X(0.9)} ${s + 0.35 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.2, stroke: c.t.sky, disableMultiStroke: true },
        );
        return {
            head: [X(2), s - 1.55 * U, "up"],
            surface: [w / 2, s, "down"],
            nose: [X(2.55), s - 0.28 * U, right ? "right" : "left"],
        };
    },
    describe: (p) =>
        `A white rabbit swimming to the ${Number(p.facing) >= 0 ? "right" : "left"} seen from the side, its head and two pink-lined ears above the water, its back a hump behind it and a ripple following.`,
    motion: {
        still: "A game moves it along the water; on the shelf it holds still so its face can be seen.",
    },
});
