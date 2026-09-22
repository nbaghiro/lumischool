import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, wide } from "../lettering";
import { hash, wash } from "../outdoors/wash";

type Pt = [number, number];

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);

/** Where a sheep pen's floor is in its box, in squares from the box's top left, which a game keeps sheep inside. */
export const PEN = {
    back: 1.6,
    side: 0.35,
    narrow: 0.35,
    gate: 3.2,
    rail: [0.55, 1.15],
    post: 1.45,
} as const;

interface SheepPenParams {
    across: number;
    deep: number;
    part: "whole" | "back" | "front";
    shut: number;
    sign: string;
    gate: boolean;
}

export const sheepPen = defineDrawing<SheepPenParams>({
    id: "sheeppen",
    family: "places",
    title: "Sheep pen",
    group: "Structures",
    about: "A pen of wooden hurdles seen from the front and a little above, with straw on its floor and a gate at the front that swings shut. A board on the gatepost can carry the number it is for. A scene can draw the back and the front apart, so whatever is in the pen stands between them, and a front with no gate is a length of hurdle fence.",
    params: {
        across: 8,
        deep: 5,
        part: "whole",
        shut: 0,
        sign: "",
        gate: true,
    },
    settings: {
        across: { kind: "whole", min: 5, max: 20 },
        deep: { kind: "whole", min: 3, max: 12 },
        part: { kind: "one of", of: ["whole", "back", "front"] },
        shut: { kind: "number", min: 0, max: 1, step: 0.1 },
        sign: { kind: "text", most: 4 },
        gate: { kind: "flag" },
    },
    takes: [
        {
            label: "Open, for five",
            params: { across: 8, deep: 5, part: "whole", shut: 0, sign: "5", gate: true },
        },
        {
            label: "Shut",
            params: { across: 8, deep: 5, part: "whole", shut: 1, sign: "5", gate: true },
        },
        {
            label: "Wide, no board",
            params: { across: 11, deep: 4, part: "whole", shut: 0.4, sign: "", gate: true },
        },
        {
            label: "A length of fence",
            params: { across: 6, deep: 3, part: "front", shut: 0, sign: "", gate: false },
        },
    ],
    box: (p) => ({ w: whole(p.across, 5, 20, 8), h: whole(p.deep, 3, 12, 5) + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = whole(p.across, 5, 20, 8),
            d = whole(p.deep, 3, 12, 5),
            W = w * U;
        const yb = PEN.back * U,
            yf = (PEN.back + d) * U,
            xl = PEN.side * U,
            xr = W - PEN.side * U;
        const inset = PEN.narrow * U,
            bl = xl + inset,
            br = xr - inset,
            [r1, r2] = PEN.rail.map((r) => r * U) as [number, number];
        const wood = pen.fill("tang", "hachure", {
            hachureGap: 4,
            fillWeight: 0.8,
            hachureAngle: 80,
        });
        const post = (x: number, base: number, tall = PEN.post * U) =>
            pen.rect(g, x - 2.6, base - tall, 5.2, tall + 2, "ruler", wood, calm(c, 1.3));
        const rail = (a: Pt, b: Pt) =>
            pen.polygon(
                g,
                [
                    [a[0], a[1] - 2],
                    [b[0], b[1] - 2],
                    [b[0], b[1] + 2],
                    [a[0], a[1] + 2],
                ],
                "ruler",
                pen.fill("tang"),
                calm(c, 1.1),
            );
        const a: RawAnchors = { gate: [W / 2, yf, "down"], floor: [W / 2, (yb + yf) / 2, "up"] };
        if (p.part !== "front") {
            const floor = `M${bl} ${yb}L${br} ${yb}L${xr} ${yf}L${xl} ${yf}Z`;
            wash(c, floor, "tang", 0.2, true);
            // straw, a few short strokes the colour of the wash
            for (let i = 0; i < w * d * 0.9; i++) {
                const u = hash(i, w, d),
                    v = hash(i, d, w),
                    x = bl + (xl - bl) * v + (br - bl + (xr - xl - (br - bl)) * v) * u,
                    y = yb + (yf - yb) * v;
                if (y > yf - 6 || y < yb + 4) continue;
                const k = (hash(i, 3) - 0.5) * 0.9;
                pen.line(g, x - 3.5, y + k * 3, x + 3.5, y - k * 3, "ruler", {
                    strokeWidth: 0.9,
                    stroke: c.t.tang,
                    disableMultiStroke: true,
                });
            }
            const n = Math.max(2, Math.round(w / 2.2));
            for (const r of [r1, r2]) rail([bl, yb - r], [br, yb - r]);
            for (let i = 0; i <= n; i++) post(bl + ((br - bl) * i) / n, yb);
            for (const [x0, x1] of [
                [bl, xl],
                [br, xr],
            ] as const) {
                for (const r of [r1, r2]) rail([x0, yb - r], [x1, yf - r]);
                post((x0 + x1) / 2, (yb + yf) / 2);
            }
        }
        if (p.part !== "back" && p.gate === false) {
            for (const r of [r1, r2]) rail([0, yf - r], [W, yf - r]);
            const n = Math.max(1, Math.round(W / (2.2 * U)));
            for (let i = 0; i <= n; i++) post(3 + ((W - 6) * i) / n, yf);
            return a;
        }
        if (p.part !== "back") {
            const gw = PEN.gate * U,
                g0 = W / 2 - gw / 2,
                g1 = W / 2 + gw / 2;
            for (const r of [r1, r2]) {
                rail([xl, yf - r], [g0, yf - r]);
                rail([g1, yf - r], [xr, yf - r]);
            }
            post(xl, yf);
            post(xr, yf);
            const n = Math.max(1, Math.round((g0 - xl) / (2.2 * U)));
            for (let i = 1; i < n; i++) {
                post(xl + ((g0 - xl) * i) / n, yf);
                post(g1 + ((xr - g1) * i) / n, yf);
            }
            // The gate swings on its left post into the pen: shut, it spans the gap; open, it points up the page, foreshortened.
            const th = (1 - clamp(Number(p.shut) || 0, 0, 1)) * 1.3,
                len = gw - 6;
            const end: Pt = [g0 + 3 + Math.cos(th) * len, yf - Math.sin(th) * len * 0.42];
            const up = (q: Pt, r: number): Pt => [q[0], q[1] - r];
            const hinge: Pt = [g0 + 3, yf];
            for (const r of [r1 * 0.8, r2 * 1.05]) rail(up(hinge, r), up(end, r));
            pen.line(g, ...up(hinge, r1 * 0.8), ...up(end, r2 * 1.05), "ruler", {
                ...calm(c, 1.6),
                stroke: c.t.tang,
            });
            post(end[0], end[1], r2 * 1.05 + 5);
            post(g0, yf, (PEN.post + 0.35) * U);
            post(g1, yf, (PEN.post + 0.35) * U);
            if (p.sign) {
                const s = String(p.sign),
                    size = 22,
                    bw = Math.max(1.5 * U, wide(s, size) + 12),
                    bx = g1 + 5,
                    by = yf - (PEN.post + 0.35) * U - 1.35 * U;
                pen.line(g, g1, by + 1.2 * U, g1, yf - PEN.post * U, "ruler", { strokeWidth: 1.4 });
                pen.rect(
                    g,
                    bx - bw / 2 + 4,
                    by,
                    bw,
                    1.25 * U,
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1.6),
                );
                patch(c, bx + 4, by + 0.62 * U - 3, bw - 6, size * 1.1);
                num(c, bx + 4, by + 0.62 * U + size * 0.36, s, size);
                a.sign = [bx + 4, by, "up"];
            }
        }
        return a;
    },
    describe: (p) =>
        p.part === "back"
            ? "The back and sides of a pen of wooden hurdles seen from the front, with straw on the floor between them."
            : p.part === "front" && p.gate === false
              ? "A length of wooden hurdle fence seen from the front, two rails on a row of posts, with no gate in it."
              : `${p.part === "front" ? "The front of a pen of wooden hurdles seen from the front, two rails on posts with a gate in the middle" : "A pen of wooden hurdles seen from the front, straw on its floor and a gate at the front"}${p.gate !== false && p.sign ? ", with a numbered board on the gatepost" : ""}.`,
});
