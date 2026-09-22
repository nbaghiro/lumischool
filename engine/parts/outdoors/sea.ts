import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash, wash } from "./wash";

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

export const sea = defineDrawing({
    id: "sea",
    family: "outdoors",
    title: "Sea",
    group: "Structures",
    about: "A length of sea seen from the side: waves along the top, water that grows a deeper blue towards the bottom, and a sandy bed with pebbles, shells and weed. Lengths meet, so a sea can be as wide as a scene needs.",
    params: { across: 16, deep: 14, x0: 0, bed: true },
    settings: {
        across: { kind: "whole", min: 2, max: 36 },
        deep: { kind: "whole", min: 3, max: 40 },
        x0: { kind: "whole", min: 0, max: 400 },
        bed: { kind: "flag" },
    },
    takes: [
        { label: "With its bed", params: { across: 16, deep: 14, x0: 0, bed: true } },
        { label: "Further along", params: { across: 16, deep: 14, x0: 16, bed: true } },
        { label: "Open water", params: { across: 12, deep: 6, x0: 0, bed: false } },
    ],
    box: (p) => ({ w: whole(p.across, 2, 36, 16), h: whole(p.deep, 3, 40, 14) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = whole(p.across, 2, 36, 16),
            h = whole(p.deep, 3, 40, 14),
            x0 = Math.round(Number(p.x0) || 0),
            W = w * U,
            H = h * U;
        const top = 0.5 * U,
            bed = p.bed ? H - 1.7 * U : H;
        const wave = (x: number) => top + Math.sin(((x / U + x0) / 2.5) * Math.PI * 2) * 2.2;
        const surf: Pt[] = [];
        for (let x = 0; x <= W; x += U / 4) surf.push([x, wave(x)]);
        const sandTop = (x: number) =>
            bed +
            Math.sin(((x / U + x0) / 7) * Math.PI * 2) * 5 +
            Math.sin(((x / U + x0) / 3.1) * Math.PI * 2) * 2;
        const water = `M0 ${wave(0)}${surf.map((q) => `L${q[0]} ${q[1]}`).join("")}L${W} ${H}L0 ${H}Z`;
        wash(c, water, "sky", 0.2, true);
        if (!c.paper)
            plain(c, {
                kind: "path",
                d: `M0 ${top + (bed - top) * 0.45}H${W}V${H}H0Z`,
                fill: c.t.sky,
                opacity: 0.1,
            });
        pen.curve(g, surf, "pencil", { strokeWidth: 1.6, stroke: c.t["ink-soft"], roughness: 0.6 });
        // little crests a square or so under the surface, placed by where they fall along the whole sea
        for (let k = Math.floor(x0 / 3); k * 3 < x0 + w; k++) {
            const x = (k * 3 + hash(k, 5) * 2 - x0) * U,
                y = top + (0.9 + hash(k, 6) * 1.6) * U;
            if (x < 8 || x > W - 14 || y > bed - 10) continue;
            pen.arc(g, x, y, 12, 5, Math.PI * 1.1, Math.PI * 1.9, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
                disableMultiStroke: true,
            });
        }
        const a: RawAnchors = { surface: [W / 2, top, "up"] };
        if (!p.bed) return a;
        const sand: Pt[] = [];
        for (let x = 0; x <= W; x += U / 3) sand.push([x, sandTop(x)]);
        const floor = `M0 ${sandTop(0)}${sand.map((q) => `L${q[0]} ${q[1]}`).join("")}L${W} ${H}L0 ${H}Z`;
        if (!c.paper) plain(c, { kind: "path", d: floor, fill: c.t.card });
        wash(c, floor, "tang", 0.26, true);
        pen.curve(g, sand, "pencil", { strokeWidth: 1.5, stroke: c.t["ink-soft"], roughness: 0.6 });
        for (let k = Math.floor(x0 / 2); k * 2 < x0 + w; k++) {
            const x = (k * 2 + hash(k, 8) * 1.6 - x0) * U,
                r = hash(k, 9);
            if (x < 6 || x > W - 6) continue;
            const y = sandTop(x) + (0.35 + hash(k, 10) * 0.8) * U;
            if (r < 0.3)
                pen.ellipse(g, x, y, 7 + r * 10, 4.5, "ruler", pen.fill("card"), {
                    ...calm(c, 0.9),
                    stroke: c.t["ink-soft"],
                });
            else if (r < 0.45) {
                pen.path(
                    g,
                    `M${x - 5} ${y + 2}Q${x} ${y - 7} ${x + 5} ${y + 2}Z`,
                    "ruler",
                    pen.fill("berry"),
                    calm(c, 0.9),
                );
                for (const dx of [-2, 0, 2])
                    pen.line(g, x, y + 2, x + dx * 1.4, y - 3, "ruler", {
                        strokeWidth: 0.6,
                        disableMultiStroke: true,
                    });
            } else if (r < 0.7) {
                // weed, rooted in the sand and leaning with the water
                const tall = (1.1 + hash(k, 11) * 1.6) * U,
                    root = sandTop(x) + 3,
                    lean = (hash(k, 12) - 0.5) * 10;
                for (const dx of [-3, 2])
                    pen.curve(
                        g,
                        [
                            [x + dx, root],
                            [x + dx + lean * 0.5 + 4, root - tall * 0.45],
                            [x + dx + lean - 2, root - tall * 0.8],
                            [x + dx + lean + 2, root - tall],
                        ],
                        "pencil",
                        { strokeWidth: 1.8, stroke: c.t.ok, roughness: 0.6 },
                    );
            }
        }
        a.bed = [W / 2, bed, "up"];
        return a;
    },
    describe: (p) =>
        `A length of sea seen from the side, waves along the top and blue water growing deeper below${p.bed ? ", with a sandy bed of pebbles, shells and weed" : ", open water with no bed drawn"}.`,
});
