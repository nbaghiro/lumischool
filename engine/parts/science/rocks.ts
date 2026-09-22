import { type Ctx, type RawAnchors } from "../../ink/surface";
import { type Fill, rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { type Pt, lightFill, gleam, bubble, lettered } from "./apparatus";
import { ROCKS } from "./substances";

/** A lump of rock, about three and a half squares across, with the look of its kind. */
function rockLump<G>(c: Ctx<G>, kind: string, x: number, base: number): { top: number } {
    const { pen, g } = c,
        t = c.t,
        r = rng(kind.length * 97 + kind.charCodeAt(0));
    const flat = kind === "slate",
        w = (flat ? 3.7 : 3.5) * U,
        h = (flat ? 1.6 : 2.6) * U,
        top = base - h;
    const pts: Pt[] = [];
    for (let k = 0; k < 11; k++) {
        const th = Math.PI + (k / 11) * Math.PI * 2,
            rr = 0.82 + r() * 0.24;
        pts.push([
            x + Math.cos(th) * (w / 2) * rr,
            base - h / 2 + Math.sin(th) * (h / 2) * rr * (Math.sin(th) > 0 ? 0.85 : 1),
        ]);
    }
    const [x0, y0] = pts[0] ?? [0, 0];
    let d = `M${x0} ${y0}`;
    for (let k = 0; k < pts.length; k++) {
        const p = pts[k] ?? [0, 0],
            q = pts[(k + 1) % pts.length] ?? [0, 0];
        d += `Q${p[0]} ${p[1]} ${(p[0] + q[0]) / 2} ${(p[1] + q[1]) / 2}`;
    }
    d += "Z";
    const fills: Record<string, Fill> = {
        granite: pen.fill("card"),
        basalt: pen.fill("ink-soft", "hachure", { hachureGap: 2.6, fillWeight: 1 }),
        pumice: lightFill(c, "glow", "hachure", 7),
        sandstone: lightFill(c, "tang", "hachure", 5),
        chalk: pen.fill("card"),
        limestone: pen.fill("ink-soft", "hachure", { hachureGap: 8, fillWeight: 0.5 }),
        marble: pen.fill("card"),
        slate: pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.9 }),
    };
    pen.path(g, d, "pencil", fills[kind] ?? pen.fill("card"), { strokeWidth: 1.9 });
    const inside = () => {
        const u = r(),
            v = r();
        return [x + (u - 0.5) * w * 0.7, top + h * 0.2 + v * h * 0.6] as Pt;
    };
    if (kind === "granite")
        for (let k = 0; k < 16; k++) {
            const [px, py] = inside(),
                s = 3 + r() * 4;
            pen.polygon(
                g,
                [
                    [px - s, py],
                    [px, py - s * 0.8],
                    [px + s, py + s * 0.2],
                    [px, py + s * 0.7],
                ],
                "pencil",
                k % 3 === 0
                    ? { fill: t.ink, fillStyle: "solid" }
                    : k % 3 === 1
                      ? pen.fill("berry")
                      : pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                { strokeWidth: 0.6 },
            );
        }
    if (kind === "basalt" || kind === "pumice")
        for (let k = 0; k < (kind === "pumice" ? 14 : 5); k++) {
            const [px, py] = inside();
            pen.ellipse(
                g,
                px,
                py,
                kind === "pumice" ? 5 + r() * 5 : 3,
                kind === "pumice" ? 3 + r() * 3 : 2,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 0.8 },
            );
        }
    if (kind === "sandstone")
        for (const k of [0.4, 0.62, 0.8])
            pen.curve(
                g,
                [
                    [x - w * 0.42, top + h * k],
                    [x, top + h * (k + 0.05)],
                    [x + w * 0.42, top + h * (k - 0.03)],
                ],
                "pencil",
                { strokeWidth: 1, stroke: t["ink-soft"] },
            );
    if (kind === "sandstone" || kind === "chalk")
        for (let k = 0; k < 14; k++) {
            const [px, py] = inside();
            pen.circle(
                g,
                px,
                py,
                2.2,
                "pencil",
                { fill: t["ink-soft"], fillStyle: "solid" },
                { strokeWidth: 0.3 },
            );
        }
    if (kind === "limestone" || kind === "chalk") {
        const [px, py] = [x + 0.35 * U, top + h * 0.5];
        pen.path(
            g,
            `M${px - 7} ${py + 5}Q${px} ${py - 10} ${px + 7} ${py + 5}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1 },
        );
        for (const dx of [-3, 0, 3])
            pen.line(g, px, py + 5, px + dx, py - 3, "pencil", { strokeWidth: 0.7 });
    }
    if (kind === "marble")
        for (let k = 0; k < 3; k++) {
            const [px, py] = inside();
            pen.curve(
                g,
                [
                    [px - 0.8 * U, py],
                    [px - 0.2 * U, py - 5],
                    [px + 0.3 * U, py + 3],
                    [px + 0.8 * U, py - 2],
                ],
                "pencil",
                { strokeWidth: 1.2, stroke: t["ink-soft"] },
            );
        }
    if (kind === "slate")
        for (const k of [0.35, 0.6])
            pen.line(g, x - w * 0.45, top + h * k, x + w * 0.45, top + h * k + 2, "pencil", {
                strokeWidth: 1,
                stroke: t.card,
            });
    return { top };
}

export const rocks = defineDrawing({
    id: "rocks",
    family: "science",
    title: "Rocks to test",
    group: "Structures",
    about: "Lettered rock samples: speckled granite, dark basalt, pumice full of holes, sandstone in bands of grains, white chalk and grey limestone with a shell in them, veined marble and flat slate. `test` puts a drop on each: at 1 a drop of water, which soaks in (a dark patch) or sits on top (a bead); at 2 a drop of vinegar, which fizzes on chalk, limestone and marble. What each rock does is one table, which the checker marks from.",
    params: { rocks: ["granite", "chalk", "sandstone", "slate"], test: 0, letters: 1, names: 0 },
    settings: {
        rocks: { kind: "words", most: 6, of: Object.keys(ROCKS) },
        test: { kind: "whole", min: 0, max: 2 },
        letters: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Four rocks",
            params: {
                rocks: ["granite", "chalk", "sandstone", "slate"],
                test: 0,
                letters: 1,
                names: 1,
            },
        },
        {
            label: "A drop of water on each",
            params: {
                rocks: ["granite", "chalk", "sandstone", "slate"],
                test: 1,
                letters: 1,
                names: 0,
            },
        },
        {
            label: "A drop of vinegar on each",
            params: {
                rocks: ["marble", "basalt", "limestone", "pumice"],
                test: 2,
                letters: 1,
                names: 0,
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(6, p.rocks.length)) * 4 + 1, h: p.names > 0 ? 8 : 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            test = Math.round(p.test);
        p.rocks.slice(0, 6).forEach((kind, i) => {
            const x = (2.5 + i * 4) * U,
                base = 4.8 * U,
                { top } = rockLump(c, kind, x, base),
                facts = ROCKS[kind];
            if (test > 0 && facts) {
                const dy = top + 0.3 * U;
                if (test === 1 && facts.is.soaks) {
                    pen.ellipse(
                        g,
                        x,
                        dy + 3,
                        1.7 * U,
                        0.6 * U,
                        "pencil",
                        pen.fill("sky", "cross-hatch", { hachureGap: 3, fillWeight: 0.9 }),
                        { strokeWidth: 1.1, stroke: c.t["ink-soft"], strokeLineDash: [3, 3] },
                    );
                } else {
                    pen.path(
                        g,
                        `M${x - 0.45 * U} ${dy + 3}Q${x - 0.45 * U} ${dy - 0.45 * U} ${x} ${dy - 0.45 * U}Q${x + 0.45 * U} ${dy - 0.45 * U} ${x + 0.45 * U} ${dy + 3}Z`,
                        "pencil",
                        pen.fill("sky"),
                        { strokeWidth: 1.2 },
                    );
                    gleam(c, x - 0.15 * U, dy - 0.3 * U, dy - 0.1 * U, 2);
                }
                if (test === 2 && facts.is.fizzes)
                    for (const [dx, dh, s] of [
                        [-0.35, 0.9, 6],
                        [0.05, 1.3, 5],
                        [0.4, 0.8, 7],
                        [0.2, 1.7, 4],
                    ] as [number, number, number][])
                        bubble(c, x + dx * U, dy - dh * U, s);
            }
            if (p.letters > 0) lettered(c, x, 6.2 * U, i);
            if (p.names > 0)
                soft(c, x, (p.letters > 0 ? 7.4 : 6.3) * U, ROCKS[kind]?.name ?? kind, 12);
            a[`rock(${i})`] = [x, 0.4 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `Lettered lumps of rock in a row, each with the grain and colour of its kind${p.test === 1 ? ", a drop of water on each" : p.test === 2 ? ", a drop of vinegar on each" : ""}${p.names > 0 ? ", each named underneath" : ""}.`,
    reads: true,
});
