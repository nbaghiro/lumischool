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

interface FrogParams {
    pose: "sit" | "snap" | "leap";
    facing: number;
}

const POSES = ["sit", "snap", "leap"] as const;
const poseOf = (v: string) => POSES.find((p) => p === v) ?? "sit";
const boxOf = (p: FrogParams) => {
    const pose = poseOf(p.pose);
    return { w: pose === "snap" ? 6 : pose === "leap" ? 5 : 4, h: 3 };
};

export const frog = defineDrawing<FrogParams>({
    id: "frog",
    family: "animals",
    title: "Frog",
    group: "Characters",
    about: "A green frog seen from the side: sitting with its back legs folded under it, snapping with its long pink tongue out after something passing, or leaping with its legs stretched behind.",
    params: { pose: "sit", facing: 1 },
    settings: {
        pose: { kind: "one of", of: POSES },
        facing: { kind: "whole", min: -1, max: 1 },
    },
    takes: [
        { label: "Sitting", params: { pose: "sit", facing: 1 } },
        { label: "Snapping its tongue out", params: { pose: "snap", facing: 1 } },
        { label: "Leaping, facing left", params: { pose: "leap", facing: -1 } },
    ],
    box: boxOf,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            pose = poseOf(p.pose),
            w = boxOf(p).w * U,
            s = p.facing < 0 ? -1 : 1;
        const X = (u: number) => (s > 0 ? u * U : w - u * U),
            Y = (u: number) => u * U;
        const skin = pen.fill("mint", "solid"),
            line = calm(c, 1.6);
        const leap = pose === "leap",
            dx = leap ? 0.8 : 0;
        const wiggle = part(c, "legs", [X(1.2 + dx), Y(2.4)]);
        if (leap) {
            wiggle.pen.polygon(
                wiggle.g,
                [
                    [X(1.3), Y(2.1)],
                    [X(0.2), Y(2.7)],
                    [X(0.15), Y(2.95)],
                    [X(1.5), Y(2.5)],
                ],
                "ruler",
                skin,
                line,
            );
        } else {
            wiggle.pen.ellipse(wiggle.g, X(1.25), Y(2.35), 1.7 * U, 0.95 * U, "ruler", skin, line);
            wiggle.pen.line(wiggle.g, X(0.6), Y(2.85), X(2.1), Y(2.85), "ruler", calm(c, 1.8));
        }
        pen.ellipse(g, X(2 + dx), Y(1.95), 2.5 * U, 1.55 * U, "ruler", skin, line);
        pen.ellipse(g, X(3 + dx), Y(1.65), 1.4 * U, 1.15 * U, "ruler", skin, line);
        pen.circle(g, X(3.05 + dx), Y(1.05), 0.72 * U, "ruler", pen.fill("card"), calm(c, 1.3));
        plain(c, { kind: "circle", cx: X(3.12 + dx), cy: Y(1.05), r: 0.16 * U, fill: c.t.ink });
        pen.line(g, X(2.9 + dx), Y(2.35), X(3.05 + dx), Y(2.9), "ruler", calm(c, 1.5));
        const mouth: [number, number] = [X(3.62 + dx), Y(1.85)];
        if (pose === "snap") {
            pen.path(
                g,
                `M${X(3.2)} ${Y(1.85)}L${mouth[0]} ${Y(1.7)}L${mouth[0]} ${Y(2.02)}Z`,
                "ruler",
                pen.fill("berry"),
                calm(c, 1.1),
            );
            pen.line(g, mouth[0], Y(1.85), X(5.55), Y(1.6), "ruler", {
                ...calm(c, 3),
                stroke: c.paper ? c.t.ink : c.t.berry,
            });
            pen.circle(g, X(5.6), Y(1.6), 0.32 * U, "ruler", pen.fill("berry"), calm(c, 1));
        } else pen.line(g, X(3.15 + dx), Y(1.9), mouth[0], Y(1.8), "ruler", calm(c, 1.2));
        const out: RawAnchors = {
            mouth: [mouth[0], mouth[1], s > 0 ? "right" : "left"],
            feet: [X(2), Y(2.95), "down"],
        };
        if (pose === "snap") out.tip = [X(5.6), Y(1.6), s > 0 ? "right" : "left"];
        return out;
    },
    describe: (p) =>
        poseOf(p.pose) === "snap"
            ? "A green frog seen from the side with its mouth open and its long pink tongue shooting out straight in front of it."
            : poseOf(p.pose) === "leap"
              ? "A green frog seen from the side in mid leap, its back legs stretched out long behind it and its big eye up."
              : "A green frog seen from the side, sitting with its back legs folded under it and its big round eye looking ahead.",
    motion: { body: { is: "breathe", amt: 0.04 }, parts: { legs: { is: "wiggle", deg: 4 } } },
});
