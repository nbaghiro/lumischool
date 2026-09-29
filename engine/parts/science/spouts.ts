import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, soft } from "../lettering";

/** Centimetres to a square, down the tank and along the ground. */
const CM = 5;
/** Where the rim, the water and the ground stand, in squares from the top, whatever the water's depth. */
const RIM = 1.2,
    SURFACE = RIM + 1,
    GROUND = 22.5;

/** The tank as drawn: its water's depth in centimetres, how wide it is, and its holes' depths, deepest last allowed at five above the floor. */
export const tankOf = (p: {
    depth: number;
    wide: number;
    holes: readonly number[];
}): { depth: number; width: number; holes: number[] } => {
    const depth = Math.max(4, Math.min(10, Math.round(p.depth / CM))) * CM;
    return {
        depth,
        width: p.wide > 0 ? 7 : 3,
        holes: p.holes
            .slice(0, 3)
            .map((h) => Math.max(1, Math.min(depth / CM - 1, Math.round(h / CM))) * CM),
    };
};

/**
 * How far along the ground a jet lands from the tank's side, in centimetres: water leaves a hole
 * faster the deeper it is, as fast as if it had fallen that depth, and falls the hole's height to
 * the ground on the way, so the range is twice the square root of depth times height. The stand is
 * never lower than the water is deep, so a deeper hole always throws its jet further.
 */
export const jetRange = (hole: number): number => {
    const height = (GROUND - SURFACE) * CM - hole;
    return 2 * Math.sqrt(hole * height);
};

/** How many squares wide the drawing is: the scale, the tank and the furthest jet, or room for the question mark when the jets are hidden. */
const wideOf = (t: ReturnType<typeof tankOf>, show: boolean): number =>
    Math.min(
        36,
        Math.ceil(
            2.2 +
                t.width +
                Math.max(7, ...(show ? t.holes.map((h) => jetRange(h) / CM) : [])) +
                1.2,
        ),
    );

export const spouts = defineDrawing({
    id: "spouts",
    family: "science",
    title: "Tank with holes",
    group: "Structures",
    about: "A tank of water on a stand with up to three lettered holes in its side, a scale down its side in centimetres from the surface, and a jet from each hole curving down to the ground. The deeper a hole is, the harder the water behind it pushes, so its jet leaves faster and lands further out; how wide the tank is makes no difference. Each jet is drawn by the rule for water falling from a hole, and with `show` at 0 the holes are taped over and the ground waits under a question mark, for a prediction.",
    params: { depth: 40, holes: [10, 20, 30], wide: 0, show: 1, tag: "" },
    settings: {
        depth: { kind: "whole", min: 20, max: 50 },
        holes: { kind: "numbers", min: 5, max: 45, most: 3 },
        wide: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "Three holes",
            params: { depth: 40, holes: [10, 20, 30], wide: 0, show: 1, tag: "" },
        },
        {
            label: "A wide tank, one hole",
            params: { depth: 30, holes: [20], wide: 1, show: 1, tag: "" },
        },
        {
            label: "Which lands furthest?",
            params: { depth: 50, holes: [15, 25, 40], wide: 0, show: 0, tag: "A" },
        },
    ],
    box: (p) => ({ w: wideOf(tankOf(p), p.show > 0), h: 24 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = tankOf(p),
            show = p.show > 0;
        const lx = 2.2 * U,
            rx = lx + t.width * U,
            rim = RIM * U,
            surface = SURFACE * U,
            floor = surface + (t.depth / CM) * U,
            ground = GROUND * U;
        if (p.tag) num(c, 0.3 * U, 1 * U, p.tag, 22, "start");
        // the stand, under the tank's floor down to the ground
        for (const x of [lx + 0.4 * U, rx - 0.4 * U])
            pen.line(g, x, floor, x, ground, "ruler", { strokeWidth: 2.4 });
        pen.line(
            g,
            lx + 0.4 * U,
            (floor + ground) / 2,
            rx - 0.4 * U,
            (floor + ground) / 2,
            "ruler",
            {
                strokeWidth: 1.6,
            },
        );
        pen.line(g, 0.3 * U, ground, (wideOf(t, show) - 0.3) * U, ground, "ruler", {
            strokeWidth: 2.2,
        });
        // the water, then the tank round it
        pen.rect(g, lx, surface, rx - lx, floor - surface, "ruler", pen.fill("sky", "solid"), {
            strokeWidth: 0,
        });
        pen.line(g, lx, surface, rx, surface, "ruler", { strokeWidth: 1.8 });
        pen.path(g, `M${lx} ${rim}V${floor}H${rx}V${rim}`, "ruler", null, { strokeWidth: 2.6 });
        // the scale down the tank's left side, from the surface, numbered every ten centimetres
        const sx = lx - 0.3 * U;
        for (let d = 0; d <= t.depth; d += CM) {
            const y = surface + (d / CM) * U,
                long = d % 10 === 0;
            pen.line(g, sx - (long ? 0.45 : 0.25) * U, y, sx, y, "ruler", {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
            });
            if (long && d > 0) soft(c, sx - 0.55 * U, y + 4, String(d), 11, "end");
        }
        soft(c, sx - 0.55 * U, surface - 0.35 * U, "cm", 11, "end");
        // the holes, each lettered inside the tank, and its jet to the ground or its tape
        t.holes.forEach((h, i) => {
            const y = surface + (h / CM) * U,
                letter = "ABC"[i] ?? "?";
            patch(c, rx - 0.6 * U, y - 4, 16, 16);
            num(c, rx - 0.6 * U, y + 5, letter, 13);
            pen.circle(g, rx, y, 7, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
            a[`hole(${i})`] = [rx, y, "right"];
            if (!show) {
                pen.rect(g, rx - 3, y - 0.35 * U, 6, 0.7 * U, "pencil", pen.fill("tang"), {
                    strokeWidth: 1,
                });
                return;
            }
            const far = rx + (jetRange(h) / CM) * U;
            pen.path(
                g,
                `M${rx + 3} ${y}Q${(rx + far) / 2} ${y} ${far} ${ground - 2}`,
                "pencil",
                null,
                {
                    strokeWidth: 3.2,
                    stroke: c.paper ? c.t.ink : "#4f9fd6",
                },
            );
            pen.ellipse(g, far, ground - 2, 0.9 * U, 0.25 * U, "pencil", pen.fill("sky", "solid"), {
                strokeWidth: 1,
            });
            patch(c, far, ground + 0.75 * U, 16, 16);
            num(c, far, ground + 0.95 * U, letter, 13);
            a[`jet(${i})`] = [far, ground, "down"];
        });
        if (!show) penned(c, rx + 4 * U, ground - 1.2 * U, "?", 30);
        a.tank = [(lx + rx) / 2, rim, "up"];
        a.ground = [rx + 4 * U, ground, "down"];
        return a;
    },
    describe: (p) =>
        `A ${p.wide > 0 ? "wide" : "narrow"} tank of water on a stand with lettered holes in its side and a scale down it${p.show > 0 ? ", a jet from each hole curving to the ground" : ", the holes taped over"}.`,
    reads: true,
});
