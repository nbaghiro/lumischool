import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { HAIR, MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** The canoe's box in squares and its bow and stern along it: a game turns the drawing about its middle. */
export const CANOE = { w: 5, h: 3, bow: 2.3 } as const;

interface CanoeParams {
    /** Where the paddle is, from -1 to 1: the side its blade is in the water, and from the front of the stroke to the back of it. */
    stroke: number;
    top: Marker;
}

export const canoe = defineDrawing<CanoeParams>({
    id: "canoe",
    family: "travel",
    title: "Canoe from above",
    group: "Props",
    about: "An open canoe seen from straight above with its bow to the right, and a child with long fair hair sitting in it holding a paddle. The paddle's place is a setting, so a game can dip the blade on one side and draw it back through a stroke.",
    params: { stroke: 0.6, top: "berry" },
    settings: {
        stroke: { kind: "number", min: -1, max: 1, step: 0.05 },
        top: { kind: "one of", of: MARKERS },
    },
    takes: [
        { label: "Paddling on the right", params: { stroke: 0.6, top: "berry" } },
        { label: "Paddling on the left, a blue top", params: { stroke: -0.8, top: "sky" } },
        { label: "Paddle across the canoe", params: { stroke: 0, top: "mint" } },
    ],
    box: () => ({ w: CANOE.w, h: CANOE.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            mid = (CANOE.h * U) / 2,
            half = 0.52 * U;
        const hull = `M${0.2 * U} ${mid}Q${1.2 * U} ${mid - half} ${2.5 * U} ${mid - half}Q${3.8 * U} ${mid - half} ${4.8 * U} ${mid}Q${3.8 * U} ${mid + half} ${2.5 * U} ${mid + half}Q${1.2 * U} ${mid + half} ${0.2 * U} ${mid}Z`;
        pen.path(g, hull, "ruler", pen.fill("tang"), calm(c, 1.8));
        pen.path(
            g,
            `M${0.7 * U} ${mid}Q${1.5 * U} ${mid - half * 0.62} ${2.5 * U} ${mid - half * 0.62}Q${3.5 * U} ${mid - half * 0.62} ${4.3 * U} ${mid}Q${3.5 * U} ${mid + half * 0.62} ${2.5 * U} ${mid + half * 0.62}Q${1.5 * U} ${mid + half * 0.62} ${0.7 * U} ${mid}Z`,
            "ruler",
            pen.fill("card"),
            calm(c, 1.1),
        );
        for (const x of [1.3, 3.7])
            pen.line(g, x * U, mid - half * 0.55, x * U, mid + half * 0.55, "ruler", calm(c, 1.2));
        // the paddle: its blade on the side the stroke is on, drawn back from the front of the stroke
        const t = Math.max(-1, Math.min(1, Number(p.stroke) || 0)),
            side = t >= 0 ? 1 : -1;
        const bladeX = 2.5 * U + (0.55 - Math.abs(t)) * 1.3 * U,
            bladeY = mid + side * (half + 0.55 * U);
        const gripX = 2.5 * U + 0.15 * U,
            gripY = mid - side * 0.55 * U;
        pen.line(g, gripX, gripY, bladeX, bladeY, "ruler", calm(c, 2.2));
        pen.ellipse(g, bladeX, bladeY, 0.62 * U, 0.34 * U, "ruler", pen.fill("glow"), calm(c, 1.3));
        // the child: shoulders across the canoe, arms to the paddle, and the head in fair hair
        pen.ellipse(g, 2.3 * U, mid, 0.5 * U, 1.05 * U, "ruler", pen.fill(p.top), calm(c, 1.5));
        for (const s of [-1, 1])
            pen.line(
                g,
                2.35 * U,
                mid + s * 0.42 * U,
                s === side ? bladeX * 0.4 + gripX * 0.6 : gripX,
                s === side ? mid + side * 0.45 * U : gripY,
                "ruler",
                calm(c, 1.4),
            );
        const hair = HAIR.blonde;
        pen.circle(
            g,
            2.3 * U,
            mid,
            0.62 * U,
            "ruler",
            c.paper
                ? { fill: c.t.ink, fillStyle: "dots", hachureGap: 3.4, fillWeight: 0.9 }
                : { fill: hair.screen, fillStyle: "solid" },
            calm(c, 1.3),
        );
        if (!c.paper)
            plain(c, {
                kind: "path",
                d: `M${2.44 * U} ${mid - 0.22 * U}Q${2.6 * U} ${mid} ${2.44 * U} ${mid + 0.22 * U}`,
                fill: "none",
                stroke: hair.strand,
                width: 1.1,
            });
        return {
            bow: [4.8 * U, mid, "right"],
            stern: [0.2 * U, mid, "left"],
            blade: [bladeX, bladeY, side > 0 ? "down" : "up"],
        };
    },
    describe: () =>
        "An orange canoe seen from straight above, a child with long fair hair sitting in the middle and holding a paddle with its yellow blade in the water.",
    motion: {
        still: "A game steers it down the river and draws each stroke of the paddle; on the shelf it holds still.",
    },
});
