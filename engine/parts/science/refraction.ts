import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, penned, soft, wide } from "../lettering";
import { eyeAt, ray, type Pt } from "./optics";

/** How much each clear thing slows light, as the refractive index of water and of glass. */
export const INDEX = [1.33, 1.5] as const;
const NAMES = ["water", "glass"] as const;

const within = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));
const indexOf = (into: number): number => INDEX[within(into, 0, 1)] ?? 1.33;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * The angle from the upright a beam travels at inside water (0) or glass (1), for a beam coming in
 * from air at `angle` degrees from the upright, by Snell's law, to the nearest whole degree.
 */
export const bentAngle = (angle: number, into: number): number =>
    Math.round((Math.asin(Math.sin(rad(within(angle, 0, 80))) / indexOf(into)) * 180) / Math.PI);

/** How deep a thing under water looks, seen from straight above: its real depth over 1.33, to one decimal. */
export const looksDeep = (depth: number): number => Math.round((depth / 1.33) * 10) / 10;

const MODES = 4;

/** An eye seen from the side, turned to look at a point. */
function eyeLooking<G>(c: Ctx<G>, x: number, y: number, tx: number, ty: number): void {
    const back = tx < x,
        deg = (Math.atan2(ty - y, tx - x) * 180) / Math.PI + (back ? 180 : 0);
    eyeAt(group(c, { turn: [["rotate", deg.toFixed(1), x, y]] }), x, y, back ? -1 : 1);
}
const TOP = 6 * U;

export const refraction = defineDrawing({
    id: "refraction",
    family: "science",
    title: "Light bending at a surface",
    group: "Structures",
    about: "Light bending where it goes from air into water or glass. With `mode` 0 a torch shines a beam at `angle` degrees from the dashed upright onto water (`into` 0) or a glass block (`into` 1); inside, it bends towards the upright by Snell's law, sin of the angle in over 1.33 for water or 1.5 for glass, and `marks` writes both angles to the nearest degree. With `show` 0 the beam inside waits under a question mark. With `mode` 1 a pencil leaning at `lean` degrees stands in a glass of water and looks broken at the surface, since each point under water looks raised to its depth over 1.33; `real` adds a dashed line where the pencil really is. With `mode` 2 a coin lies in a cup just out of sight over its rim, and with `water` 1 the cup is filled and the bent light brings the coin into view. With `mode` 3 a coin lies `depth` centimetres down in water, seen from straight above, and looks raised to the depth over 1.33, to one decimal; `show` 0 hides that depth.",
    params: {
        mode: 0,
        into: 0,
        angle: 40,
        marks: 1,
        show: 1,
        lean: 40,
        real: 1,
        water: 1,
        depth: 8,
    },
    settings: {
        mode: { kind: "whole", min: 0, max: MODES - 1 },
        into: { kind: "whole", min: 0, max: 1 },
        angle: { kind: "whole", min: 0, max: 80 },
        marks: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        lean: { kind: "whole", min: 20, max: 60 },
        real: { kind: "whole", min: 0, max: 1 },
        water: { kind: "whole", min: 0, max: 1 },
        depth: { kind: "whole", min: 3, max: 12 },
    },
    takes: [
        {
            label: "Into water at 40°",
            params: {
                mode: 0,
                into: 0,
                angle: 40,
                marks: 1,
                show: 1,
                lean: 40,
                real: 1,
                water: 1,
                depth: 8,
            },
        },
        {
            label: "Into glass, the angle to find",
            params: {
                mode: 0,
                into: 1,
                angle: 60,
                marks: 1,
                show: 0,
                lean: 40,
                real: 1,
                water: 1,
                depth: 8,
            },
        },
        {
            label: "The pencil that looks broken",
            params: {
                mode: 1,
                into: 0,
                angle: 40,
                marks: 1,
                show: 1,
                lean: 40,
                real: 1,
                water: 1,
                depth: 8,
            },
        },
        {
            label: "The coin out of sight",
            params: {
                mode: 2,
                into: 0,
                angle: 40,
                marks: 1,
                show: 1,
                lean: 40,
                real: 1,
                water: 0,
                depth: 8,
            },
        },
        {
            label: "The coin comes into view",
            params: {
                mode: 2,
                into: 0,
                angle: 40,
                marks: 1,
                show: 1,
                lean: 40,
                real: 1,
                water: 1,
                depth: 8,
            },
        },
        {
            label: "A coin 12 cm down",
            params: {
                mode: 3,
                into: 0,
                angle: 40,
                marks: 1,
                show: 1,
                lean: 40,
                real: 1,
                water: 1,
                depth: 12,
            },
        },
    ],
    box: (p) => (within(p.mode, 0, MODES - 1) === 3 ? { w: 16, h: 17 } : { w: 18, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            mode = within(p.mode, 0, MODES - 1),
            dashed = { strokeWidth: 1.2, stroke: c.t["ink-soft"], strokeLineDash: [6, 5] };
        const waterFill = pen.fill("sky", "hachure", {
            hachureGap: c.paper ? 10 : 7,
            fillWeight: 0.8,
        });
        if (mode === 0) {
            const into = within(p.into, 0, 1),
                deg = within(p.angle, 0, 80),
                bent = bentAngle(deg, into),
                hit: Pt = [9 * U, TOP],
                floor = 13 * U;
            pen.rect(
                g,
                1 * U,
                TOP,
                16 * U,
                floor - TOP,
                "ruler",
                into === 0 ? waterFill : pen.fill("card"),
                { strokeWidth: into === 0 ? 1.2 : 2 },
            );
            if (into === 0) pen.line(g, 1 * U, TOP, 17 * U, TOP, "ruler", { strokeWidth: 2 });
            else
                for (let x = 1.6 * U; x < 16.6 * U; x += 1.4 * U)
                    pen.line(g, x, TOP + 0.3 * U, x + 0.6 * U, TOP + 0.9 * U, "ruler", {
                        strokeWidth: 0.9,
                        stroke: c.t["ink-soft"],
                    });
            cap(c, 1.4 * U, TOP - 0.3 * U, "air", 11, "start");
            cap(c, 1.4 * U, floor - 0.4 * U, NAMES[into] ?? "water", 11, "start");
            pen.line(g, hit[0], 0.6 * U, hit[0], floor - 0.3 * U, "ruler", dashed);
            const th = rad(deg),
                len = 5.4 * U,
                from: Pt = [hit[0] - len * Math.sin(th), hit[1] - len * Math.cos(th)];
            const ux = Math.sin(th),
                uy = Math.cos(th),
                at = (u: number, v: number): Pt => [
                    from[0] - ux * u - uy * v,
                    from[1] - uy * u + ux * v,
                ];
            pen.polygon(
                g,
                [at(0, -0.5 * U), at(0, 0.5 * U), at(0.6 * U, 0.3 * U), at(0.6 * U, -0.3 * U)],
                "ruler",
                pen.fill("sky"),
                { strokeWidth: 1.6 },
            );
            pen.polygon(
                g,
                [
                    at(0.6 * U, -0.3 * U),
                    at(0.6 * U, 0.3 * U),
                    at(2 * U, 0.3 * U),
                    at(2 * U, -0.3 * U),
                ],
                "ruler",
                pen.fill("sky"),
                { strokeWidth: 1.6 },
            );
            ray(c, [from, hit], 1);
            const arcR = 2.2 * U,
                label = (mid: number, below: boolean, s: string) => {
                    const r = arcR + 0.75 * U,
                        lx =
                            hit[0] +
                            r * Math.sin(mid) +
                            (Math.abs(mid) < 0.25 ? Math.sign(mid || 1) * 16 : 0),
                        ly = hit[1] + (below ? 1 : -1) * r * Math.cos(mid) + 5;
                    patch(c, lx, ly - 5, 36, 17);
                    num(c, lx, ly, s, 13);
                };
            if (p.marks > 0 && deg > 0) {
                pen.arc(
                    g,
                    hit[0],
                    hit[1],
                    2 * arcR,
                    2 * arcR,
                    -Math.PI / 2 - th,
                    -Math.PI / 2,
                    "pencil",
                    {
                        strokeWidth: 1.2,
                    },
                );
                label(-th / 2, false, `${deg}°`);
            }
            if (p.show > 0) {
                const b = rad(bent),
                    dx = Math.sin(b),
                    dy = Math.cos(b),
                    t = Math.min(
                        (floor - 0.2 * U - hit[1]) / dy,
                        dx > 0 ? (16.8 * U - hit[0]) / dx : Infinity,
                    );
                ray(c, [hit, [hit[0] + t * dx, hit[1] + t * dy]], 1);
                if (p.marks > 0 && bent > 0) {
                    pen.arc(
                        g,
                        hit[0],
                        hit[1],
                        2 * arcR,
                        2 * arcR,
                        Math.PI / 2 - b,
                        Math.PI / 2,
                        "pencil",
                        {
                            strokeWidth: 1.2,
                        },
                    );
                    label(b / 2, true, `${bent}°`);
                }
            } else penned(c, hit[0] + 1.8 * U, hit[1] + 3.6 * U, "?", 26);
            a.torch = [from[0], from[1], "left"];
            a.hit = [hit[0], hit[1], "up"];
            return a;
        }
        if (mode === 1) {
            const left = 4.5 * U,
                right = 13.5 * U,
                rim = 2.2 * U,
                bottom = 13.2 * U,
                level = TOP,
                lean = rad(within(p.lean, 20, 60)),
                at: Pt = [8.2 * U, level],
                ux = Math.sin(lean),
                uy = Math.cos(lean),
                under = Math.min((bottom - 0.4 * U - level) / uy, (right - 0.5 * U - at[0]) / ux),
                tip: Pt = [at[0] + under * ux, at[1] + under * uy],
                seen: Pt = [tip[0], level + (tip[1] - level) / 1.33],
                over = Math.min((level - 0.6 * U) / uy, (at[0] - 0.6 * U) / ux),
                top: Pt = [at[0] - over * ux, at[1] - over * uy];
            pen.rect(g, left, level, right - left, bottom - level, "ruler", waterFill, {
                stroke: "none",
            });
            pen.linear(
                g,
                [
                    [left, rim],
                    [left, bottom],
                    [right, bottom],
                    [right, rim],
                ],
                "ruler",
                { strokeWidth: 2 },
            );
            pen.line(g, left, level, right, level, "ruler", { strokeWidth: 1.6 });
            const stick = (p0: Pt, p1: Pt, sharp: boolean) => {
                const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1,
                    nx = (-(p1[1] - p0[1]) / L) * 0.28 * U,
                    ny = ((p1[0] - p0[0]) / L) * 0.28 * U,
                    ex = ((p1[0] - p0[0]) / L) * 0.8 * U,
                    ey = ((p1[1] - p0[1]) / L) * 0.8 * U;
                const end: Pt = sharp ? [p1[0] - ex, p1[1] - ey] : p1;
                pen.polygon(
                    g,
                    [
                        [p0[0] + nx, p0[1] + ny],
                        [end[0] + nx, end[1] + ny],
                        ...(sharp ? [p1] : []),
                        [end[0] - nx, end[1] - ny],
                        [p0[0] - nx, p0[1] - ny],
                    ],
                    "ruler",
                    pen.fill("glow"),
                    { strokeWidth: 1.5 },
                );
            };
            stick(at, top, false);
            stick(at, seen, true);
            if (p.real > 0) pen.line(g, at[0], at[1], tip[0], tip[1], "ruler", dashed);
            eyeLooking(c, 15.8 * U, 1.6 * U, seen[0], seen[1]);
            cap(c, right + 0.3 * U, level + 0.4 * U, "water", 11, "start");
            a.pencil = [top[0], top[1], "up"];
            a.surface = [at[0], at[1], "right"];
            a.tip = [seen[0], seen[1], "down"];
            return a;
        }
        if (mode === 2) {
            const left = 7 * U,
                right = 15 * U,
                rim = 5 * U,
                bottom = 12.6 * U,
                level = rim + 0.6 * U,
                water = p.water > 0,
                sight = rad(50),
                sx = Math.sin(sight),
                sy = Math.cos(sight),
                bent = Math.asin(sx / 1.33),
                hitX = left + (level - rim) * Math.tan(sight),
                coinX = hitX + (bottom - level) * Math.tan(bent),
                eye: Pt = [left - 4.6 * U * sx, rim - 4.6 * U * sy];
            if (water)
                pen.rect(g, left, level, right - left, bottom - level, "ruler", waterFill, {
                    stroke: "none",
                });
            pen.linear(
                g,
                [
                    [left, rim],
                    [left, bottom],
                    [right, bottom],
                    [right, rim],
                ],
                "ruler",
                { strokeWidth: 2.2 },
            );
            if (water) pen.line(g, left, level, right, level, "ruler", { strokeWidth: 1.6 });
            pen.ellipse(g, coinX, bottom - 0.25 * U, 1.4 * U, 0.45 * U, "ruler", pen.fill("tang"), {
                strokeWidth: 1.4,
            });
            eyeLooking(c, eye[0], eye[1], hitX, level);
            const toRim: Pt = [left + 0.1 * U, rim];
            if (water) {
                ray(c, [[coinX, bottom - 0.4 * U], [hitX, level], eye], 2);
                pen.line(
                    g,
                    hitX,
                    level,
                    hitX + (bottom - level - 1.4 * U) * Math.tan(sight),
                    bottom - 1.4 * U,
                    "ruler",
                    dashed,
                );
            } else {
                const across = (right - left) / Math.tan(sight);
                pen.line(g, eye[0], eye[1], right, rim + across, "ruler", dashed);
                penned(c, coinX - 0.2 * U, bottom - 1 * U, "?", 18);
            }
            soft(c, toRim[0] - 0.3 * U, bottom - 0.2 * U, "cup", 13, "end");
            a.eye = [eye[0], eye[1], "left"];
            a.coin = [coinX, bottom, "down"];
            a.cup = [(left + right) / 2, rim, "up"];
            return a;
        }
        const depth = within(p.depth, 3, 12),
            surface = 3.4 * U,
            per = U,
            left = 2 * U,
            right = 11 * U,
            coinY = surface + depth * per,
            seenY = surface + looksDeep(depth) * per,
            bottom = coinY + 0.6 * U;
        pen.rect(g, left, surface, right - left, bottom - surface, "ruler", waterFill, {
            stroke: "none",
        });
        pen.linear(
            g,
            [
                [left, surface - 0.8 * U],
                [left, bottom],
                [right, bottom],
                [right, surface - 0.8 * U],
            ],
            "ruler",
            { strokeWidth: 2 },
        );
        pen.line(g, left, surface, right, surface, "ruler", { strokeWidth: 1.6 });
        const cx = 6.5 * U;
        eyeLooking(c, cx, 1.2 * U, cx, coinY);
        pen.line(g, cx, 1.9 * U, cx, seenY - 0.4 * U, "ruler", dashed);
        pen.ellipse(g, cx, coinY, 1.6 * U, 0.5 * U, "ruler", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        pen.ellipse(g, cx, seenY, 1.6 * U, 0.5 * U, "ruler", null, dashed);
        // a ruler down the side, one square a centimetre from the surface
        const rx = right + 0.8 * U;
        pen.line(g, rx, surface, rx, surface + 12 * per, "ruler", { strokeWidth: 1.6 });
        for (let k = 0; k <= 12; k++) {
            pen.line(
                g,
                rx,
                surface + k * per,
                rx + (k % 2 === 0 ? 0.6 : 0.35) * U,
                surface + k * per,
                "ruler",
                {
                    strokeWidth: 1,
                },
            );
            if (k % 2 === 0) soft(c, rx + 0.9 * U, surface + k * per + 4, `${k}`, 11, "start");
        }
        soft(c, rx + 0.2 * U, surface - 0.6 * U, "cm", 11, "start");
        const note = (y: number, s: string) => {
            patch(c, left + 0.3 * U + wide(s, 13) / 2, y - 5, wide(s, 13) + 8, 17);
            num(c, left + 0.3 * U, y, s, 13, "start");
        };
        note(coinY + 5, "coin");
        if (p.show > 0) note(seenY + 5, "looks");
        else penned(c, left + 1.4 * U, seenY + 6, "?", 20);
        cap(c, left + 0.2 * U, surface - 0.3 * U, "water", 11, "start");
        a.coin = [cx, coinY, "right"];
        a.seen = [cx, seenY, "right"];
        a.eye = [cx, 1.2 * U, "up"];
        return a;
    },
    describe: (p) => {
        const mode = within(p.mode, 0, MODES - 1);
        if (mode === 0)
            return `A torch shining a beam from the air onto ${within(p.into, 0, 1) === 0 ? "water" : "a glass block"}, beside a dashed upright line where the beam meets the surface${p.show > 0 ? ", and the beam going on inside" : ""}.`;
        if (mode === 1)
            return "A pencil leaning in a glass of water, seen from above and to the side, which looks bent where it goes into the water.";
        if (mode === 2)
            return p.water > 0
                ? "A cup full of water with a coin on its bottom, and an eye over the rim seeing the coin by light bent at the surface."
                : "An empty cup with a coin on its bottom, and an eye looking over the rim along a dashed line that passes above the coin.";
        return "A coin lying in water, seen from straight above, with a dashed coin where it looks to be and a ruler in centimetres down the side.";
    },
    reads: true,
    motion: {
        still: "An angle and a depth are read off it, so it holds still while they are measured.",
    },
});
