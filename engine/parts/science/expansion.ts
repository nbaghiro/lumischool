import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, say, soft } from "../lettering";

/** How much a length grows for each degree, as a share of it: steel, brass and window glass. */
export const GROWS = { steel: 12e-6, brass: 19e-6, glass: 9e-6 } as const;

/** The temperature a joint's gap is set to close at, in degrees. */
export const CLOSES_AT = 55;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const spanOf = (v: number): number => clamp(Math.round(v / 25) * 25, 25, 100);

/**
 * The gap at a steel bridge's joint or between two steel rails, in millimetres, at `temp` degrees:
 * `span` metres of steel on each side of it grow by 0.012 mm a metre for each degree, and the gap is
 * set so it closes at 55 °C. A span in steps of 25 m keeps the gap to one decimal place.
 */
export function gapAt(span: number, temp: number): number {
    const t = clamp(Math.round(temp), -20, CLOSES_AT);
    return Math.round(GROWS.steel * 1000 * spanOf(span) * (CLOSES_AT - t) * 10) / 10;
}

/** A brass ball 25.00 mm across and a brass ring whose hole is 25.05 mm across, both at 20 °C. */
const BALL_MM = 25,
    HOLE_MM = 25.05;

/** How wide a brass thing that is `mm` across at 20 °C is at `temp` degrees. */
const brassAt = (mm: number, temp: number): number => mm * (1 + GROWS.brass * (temp - 20));

/** Whether the ball drops through the ring, with each at its own temperature in degrees. */
export const ballPasses = (ball: number, ring: number): boolean =>
    brassAt(BALL_MM, ball) <= brassAt(HOLE_MM, ring);

/**
 * How much wider a steel lid 70 mm across grows than the glass rim of its jar, in millimetres, with
 * each at its own temperature: above nought the lid is looser than when it was screwed on at 20 °C.
 */
export const lidEase = (lid: number, jar: number): number =>
    70 * (GROWS.steel * (lid - 20) - GROWS.glass * (jar - 20));

const MODES = ["bridge", "ball", "rails", "lid"] as const;

/** A thermometer's temperature written beside a word, or a question mark when it is the question. */
function tempAt<G>(c: Ctx<G>, x: number, y: number, what: string, t: number): void {
    soft(c, x, y, what, 13, "start");
    num(c, x + what.length * 7.6 + 6, y, `${Math.round(t)} °C`, 14, "start");
}

/** Wavy lines rising off something hot. */
function shimmer<G>(c: Ctx<G>, x: number, y: number): void {
    for (const dx of [-0.5, 0, 0.5])
        c.pen.path(
            c.g,
            `M${x + dx * U} ${y}q${0.25 * U} ${-0.3 * U} 0 ${-0.6 * U}t0 ${-0.5 * U}`,
            "pencil",
            null,
            { strokeWidth: 1.2, stroke: c.t.tang },
        );
}

function gapLabel<G>(c: Ctx<G>, x: number, y: number, mm: number, show: boolean): void {
    if (show) {
        patch(c, x, y - 5, 64, 17);
        num(c, x, y, `${mm} mm`, 14);
    } else penned(c, x, y + 2, "?", 20);
}

export const expansion = defineDrawing({
    id: "expansion",
    family: "science",
    title: "Things grow when heated",
    group: "Structures",
    about: "Things grow a little when they are heated and shrink when they cool. `mode` 0 is a steel bridge's joint over a pier, and 2 two steel rails end to end: each side is `span` metres of steel (25 to 100, in steps of 25), steel grows by 12 millionths of its length for each degree, and the gap is set to close at 55 °C, so at `temp` degrees it is 0.012 × span × (55 − temp) millimetres, drawn larger than the steel. `mode` 1 is a brass ball 25.00 mm across and a brass ring with a hole 25.05 mm across at 20 °C, at `ball` and `ring` degrees: brass grows by 19 millionths a degree, so a ball heated past about 125 °C sticks in a cold ring and drops through again when the ring is heated too. `mode` 3 is a jar with a steel lid 70 mm across, the lid at `lid` degrees and the jar at `jar`: steel grows by 12 millionths a degree and glass by 9, so hot water over the lid alone loosens it. With `show` 0 the gap or what the ball does waits under a question mark.",
    params: { mode: 0, span: 50, temp: 20, ball: 20, ring: 20, lid: 20, jar: 20, show: 1 },
    settings: {
        mode: { kind: "whole", min: 0, max: 3 },
        span: { kind: "number", min: 25, max: 100, step: 25 },
        temp: { kind: "whole", min: -20, max: 55 },
        ball: { kind: "number", min: 20, max: 400, step: 10 },
        ring: { kind: "number", min: 20, max: 400, step: 10 },
        lid: { kind: "number", min: 20, max: 90, step: 10 },
        jar: { kind: "number", min: 20, max: 90, step: 10 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A bridge's joint on a mild day",
            params: { mode: 0, span: 50, temp: 20, ball: 20, ring: 20, lid: 20, jar: 20, show: 1 },
        },
        {
            label: "The joint on a frosty night, waiting",
            params: { mode: 0, span: 50, temp: -10, ball: 20, ring: 20, lid: 20, jar: 20, show: 0 },
        },
        {
            label: "A hot ball stuck in a cold ring",
            params: { mode: 1, span: 50, temp: 20, ball: 300, ring: 20, lid: 20, jar: 20, show: 1 },
        },
        {
            label: "Both hot, the ball drops through",
            params: {
                mode: 1,
                span: 50,
                temp: 20,
                ball: 300,
                ring: 300,
                lid: 20,
                jar: 20,
                show: 1,
            },
        },
        {
            label: "Rails in summer",
            params: { mode: 2, span: 25, temp: 35, ball: 20, ring: 20, lid: 20, jar: 20, show: 1 },
        },
        {
            label: "A tight lid under hot water",
            params: { mode: 3, span: 50, temp: 20, ball: 20, ring: 20, lid: 60, jar: 20, show: 1 },
        },
    ],
    box: () => ({ w: 16, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            mode = MODES[clamp(Math.round(p.mode), 0, 3)] ?? "bridge",
            show = p.show > 0,
            mid = 8 * U;
        if (mode === "bridge" || mode === "rails") {
            const span = spanOf(p.span),
                mm = gapAt(span, p.temp),
                gap = Math.max(2, mm * 1.2),
                top = mode === "bridge" ? 4.6 * U : 6 * U;
            if (mode === "bridge") {
                // the pier under the joint, and the two decks meeting over it
                pen.rect(
                    g,
                    mid - 1.6 * U,
                    6.6 * U,
                    3.2 * U,
                    4.4 * U,
                    "pencil",
                    pen.fill("ink-soft"),
                    {
                        strokeWidth: 1.8,
                    },
                );
                pen.rect(g, mid - 2.2 * U, 6.2 * U, 4.4 * U, 0.4 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.6,
                });
                for (const [x0, x1] of [
                    [0.2 * U, mid - gap / 2],
                    [mid + gap / 2, 15.8 * U],
                ] as const) {
                    pen.rect(g, x0, top, x1 - x0, 1.6 * U, "ruler", pen.fill("sky"), {
                        strokeWidth: 1.8,
                    });
                    pen.line(g, x0, top + 0.35 * U, x1, top + 0.35 * U, "ruler", {
                        strokeWidth: 1.2,
                    });
                }
                soft(c, 3.4 * U, top + 3.3 * U, `${span} m of steel`, 12);
                soft(c, 12.6 * U, top + 3.3 * U, `${span} m of steel`, 12);
            } else {
                // two rails on their sleepers, the fishplate bolted across the joint
                for (let k = 0; k < 5; k++)
                    pen.rect(
                        g,
                        (0.8 + k * 3.3) * U,
                        8 * U,
                        1.6 * U,
                        0.7 * U,
                        "pencil",
                        pen.fill("tang"),
                        {
                            strokeWidth: 1.5,
                        },
                    );
                pen.line(g, 0, 8.7 * U, 16 * U, 8.7 * U, "pencil", { strokeWidth: 1.6 });
                for (const [x0, x1] of [
                    [0.2 * U, mid - gap / 2],
                    [mid + gap / 2, 15.8 * U],
                ] as const) {
                    pen.rect(g, x0, top, x1 - x0, 0.7 * U, "ruler", pen.fill("ink-soft"), {
                        strokeWidth: 1.8,
                    });
                    pen.rect(g, x0, top + 0.7 * U, x1 - x0, 0.7 * U, "ruler", null, {
                        strokeWidth: 1.4,
                    });
                    pen.rect(
                        g,
                        x0,
                        top + 1.4 * U,
                        x1 - x0,
                        0.6 * U,
                        "ruler",
                        pen.fill("ink-soft"),
                        {
                            strokeWidth: 1.6,
                        },
                    );
                }
                pen.rect(
                    g,
                    mid - 2.4 * U,
                    top + 0.8 * U,
                    4.8 * U,
                    0.55 * U,
                    "ruler",
                    pen.fill("card"),
                    {
                        strokeWidth: 1.4,
                    },
                );
                for (const dx of [-1.6, -0.8, 0.8, 1.6])
                    pen.circle(
                        g,
                        mid + dx * U,
                        top + 1.07 * U,
                        6,
                        "ruler",
                        { fill: c.t.ink, fillStyle: "solid" },
                        {
                            strokeWidth: 1,
                        },
                    );
                soft(c, 3.4 * U, 10.2 * U, `${span} m rail`, 12);
                soft(c, 12.6 * U, 10.2 * U, `${span} m rail`, 12);
            }
            pen.line(g, mid, top - 0.3 * U, mid, top - 1.2 * U, "ruler", { strokeWidth: 1.2 });
            gapLabel(c, mid, top - 1.6 * U, mm, show);
            soft(c, mid, top - 2.8 * U, "gap", 13);
            tempAt(c, 0.4 * U, 1.2 * U, "air", p.temp);
            a.gap = [mid, top, "up"];
            return a;
        }
        if (mode === "ball") {
            const ball = Math.round(p.ball),
                ring = Math.round(p.ring),
                ry = 6.4 * U,
                passes = ballPasses(ball, ring);
            // the ring on its handle, seen a little from above
            pen.line(g, 0.6 * U, ry, mid - 1.7 * U, ry, "ruler", { strokeWidth: 2.4 });
            pen.rect(g, 0.4 * U, ry - 0.35 * U, 3 * U, 0.7 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.6,
            });
            pen.ellipse(g, mid, ry, 3.6 * U, 1.3 * U, "ruler", pen.fill("glow"), {
                strokeWidth: 2,
            });
            pen.ellipse(g, mid, ry, 2.7 * U, 0.8 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.6,
            });
            const by = !show ? 2.6 * U : passes ? 9.9 * U : ry - 0.9 * U;
            // the ball on its chain, held from above
            pen.line(g, mid, 0.4 * U, mid, by - 1.3 * U, "ruler", { strokeWidth: 1.4 });
            pen.circle(g, mid, by, 2.6 * U, "ruler", pen.fill("glow"), { strokeWidth: 2 });
            // a stuck ball sits in the hole, so the ring's near half is drawn over it
            if (show && !passes)
                pen.path(
                    g,
                    `M${mid - 1.8 * U} ${ry}A${1.8 * U} ${0.65 * U} 0 0 0 ${mid + 1.8 * U} ${ry}L${mid + 1.35 * U} ${ry}A${1.35 * U} ${0.4 * U} 0 0 1 ${mid - 1.35 * U} ${ry}Z`,
                    "ruler",
                    pen.fill("glow"),
                    { strokeWidth: 2 },
                );
            if (!show) penned(c, mid + 2.2 * U, ry + 0.4 * U, "?", 22);
            if (ball >= 100) shimmer(c, mid + 1.9 * U, by - 0.2 * U);
            if (ring >= 100) shimmer(c, mid - 2.6 * U, ry - 0.5 * U);
            tempAt(c, 10.4 * U, 2.6 * U, "ball", ball);
            tempAt(c, 0.4 * U, 8.6 * U, "ring", ring);
            a.ball = [mid, by - 1.3 * U, "right"];
            a.ring = [mid, ry + 0.7 * U, "down"];
            return a;
        }
        // the jar with its steel lid, and hot water poured over the lid when it is the hotter
        const lid = Math.round(p.lid),
            jar = Math.round(p.jar),
            top = 5 * U,
            w = 5 * U;
        pen.path(
            g,
            `M${mid - w / 2} ${top + 0.8 * U}L${mid - w / 2} ${10.6 * U}Q${mid - w / 2} ${11.2 * U} ${mid - w / 2 + 0.6 * U} ${11.2 * U}L${mid + w / 2 - 0.6 * U} ${11.2 * U}Q${mid + w / 2} ${11.2 * U} ${mid + w / 2} ${10.6 * U}L${mid + w / 2} ${top + 0.8 * U}`,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 7 }),
            { strokeWidth: 1.8 },
        );
        pen.rect(
            g,
            mid - w / 2 - 0.2 * U,
            top,
            w + 0.4 * U,
            0.9 * U,
            "ruler",
            pen.fill("ink-soft"),
            {
                strokeWidth: 1.8,
            },
        );
        for (let k = 1; k < 8; k++)
            pen.line(
                g,
                mid - w / 2 + k * 0.65 * U,
                top + 0.15 * U,
                mid - w / 2 + k * 0.65 * U,
                top + 0.75 * U,
                "ruler",
                {
                    strokeWidth: 1,
                },
            );
        if (lid > jar) {
            // a kettle's stream falling on the lid
            pen.path(
                g,
                `M${mid - 5.5 * U} ${1 * U}q${2.5 * U} ${-0.4 * U} ${4 * U} ${3.6 * U}`,
                "pencil",
                null,
                { strokeWidth: 2.2, stroke: c.t.sky },
            );
            pen.path(
                g,
                `M${mid - 5.5 * U} ${1.4 * U}q${2.3 * U} ${-0.2 * U} ${3.6 * U} ${3.4 * U}`,
                "pencil",
                null,
                { strokeWidth: 1.4, stroke: c.t.sky },
            );
            soft(c, 0.3 * U, 2.6 * U, "hot water", 12, "start");
        }
        // a loosened lid turns: an arrow round its front
        if (show && lidEase(lid, jar) > 0)
            pen.arrow(
                g,
                [mid - 2.2 * U, top - 0.9 * U],
                [mid + 2.2 * U, top - 0.9 * U],
                c.t.pen,
                0.18,
            );
        if (!show) penned(c, mid + w / 2 + 0.8 * U, top - 0.6 * U, "?", 22);
        say(c, mid, 8.6 * U, "jam", 15);
        tempAt(c, 11.2 * U, 5.7 * U, "lid", lid);
        tempAt(c, 11.2 * U, 9.4 * U, "jar", jar);
        a.lid = [mid, top, "up"];
        a.jar = [mid, 11.2 * U, "down"];
        return a;
    },
    describe: (p) =>
        [
            "The joint in a steel bridge over a pier, the two decks meeting with a gap between their ends, and the air's temperature written above.",
            "A brass ball on a chain above a brass ring on a handle, the kind a class heats in a flame, with each one's temperature written beside it.",
            "Two steel rails end to end on their sleepers, a plate bolted across the joint and a gap between the rails, with the air's temperature.",
            "A glass jar of jam with a steel lid screwed on tight, the lid and the jar each with its temperature written beside it.",
        ][clamp(Math.round(p.mode), 0, 3)] ?? "",
    reads: true,
    motion: {
        still: "The gap and where the ball sits are the reading, so the drawing holds still.",
    },
});
