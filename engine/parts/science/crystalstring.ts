import { type Ctx, type RawAnchors } from "../../ink/surface";
import { rng, roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { lightFill, glassPath, liquid, gleam, crystal, type Pt } from "./apparatus";

/** An alum crystal, an octahedron seen from a little above: two four-sided points meeting at a square. */
function octahedron<G>(c: Ctx<G>, x: number, y: number, s: number): void {
    const { pen, g } = c,
        h = s * 0.55,
        w = s * 0.5,
        d = s * 0.14;
    const left: Pt = [x - w, y + d],
        right: Pt = [x + w, y - d],
        front: Pt = [x + w * 0.25, y + d * 1.6],
        top: Pt = [x, y - h],
        bottom: Pt = [x, y + h];
    pen.polygon(
        g,
        [top, right, bottom, left],
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
        { strokeWidth: 1.3 },
    );
    for (const [a, b] of [
        [top, front],
        [front, bottom],
        [left, front],
        [front, right],
    ] as const)
        pen.line(g, a[0], a[1], b[0], b[1], "pencil", { strokeWidth: 1.1 });
}

export const crystalstring = defineDrawing({
    id: "crystalstring",
    family: "science",
    title: "Crystals on a string",
    group: "Structures",
    about: "A jar of very salty water with a string hanging into it from a pencil laid across the top. As the water evaporates over the days the level drops and crystals grow along the string, bigger each day; a tag says which day it is. `crystals` is how many there are on the string, so a question can count them, and `kind` grows salt's cubes, sugar's slanted blocks or alum's eight-sided points.",
    params: { days: 5, crystals: 6, kind: "salt" },
    settings: {
        days: { kind: "whole", min: 0, max: 14 },
        crystals: { kind: "whole", min: 0, max: 10 },
        kind: { kind: "one of", of: ["salt", "sugar", "alum"] },
    },
    takes: [
        { label: "Day 1", params: { days: 1, crystals: 2, kind: "salt" } },
        { label: "Day 7, salt", params: { days: 7, crystals: 7, kind: "salt" } },
        { label: "Day 5, sugar", params: { days: 5, crystals: 5, kind: "sugar" } },
        { label: "Day 6, alum", params: { days: 6, crystals: 6, kind: "alum" } },
    ],
    box: () => ({ w: 11, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            days = Math.max(0, Math.min(14, Math.round(p.days)));
        const lx = 1.5 * U,
            rx = 8 * U,
            top = 3.4 * U,
            bottom = 13.2 * U,
            mid = (lx + rx) / 2;
        const level = top + (1 + days * 0.12) * U;
        liquid(
            c,
            lx,
            rx,
            level,
            bottom,
            pen.fill("sky", "hachure", { hachureGap: 7, fillWeight: 0.6 }),
            12,
        );
        if (days > 0)
            pen.line(g, lx + 3, top + 1 * U, rx - 3, top + 1 * U, "pencil", {
                strokeWidth: 1,
                strokeLineDash: [4, 4],
                stroke: t["ink-soft"],
            });
        // the string, and the crystals on it growing with the days
        pen.line(g, mid, 2.8 * U, mid + 2, 11.8 * U, "pencil", {
            strokeWidth: 1.4,
            stroke: t["ink-soft"],
        });
        const n = Math.max(0, Math.min(10, Math.round(p.crystals))),
            size = (0.35 + Math.min(10, days) * 0.06) * U,
            r = rng(17 + n);
        for (let k = 0; k < n; k++) {
            const y = level + 0.6 * U + ((k + 0.5) / Math.max(1, n)) * (11.6 * U - level - 0.6 * U),
                side = k % 2 ? 1 : -1,
                s = size * (0.8 + r() * 0.4);
            if (p.kind === "sugar")
                crystal(c, mid + side * s * 0.45, y, s * 1.2, s * 0.6, s * 0.15 * side);
            else if (p.kind === "alum") octahedron(c, mid + side * s * 0.5, y, s * 1.2);
            else crystal(c, mid + side * s * 0.4, y, s, s);
        }
        for (let k = 0; k < Math.min(6, Math.floor(days / 2)); k++) {
            const x = lx + 0.8 * U + k * 0.95 * U;
            if (p.kind === "alum") octahedron(c, x, bottom - 0.5 * U, size * 0.8);
            else crystal(c, x, bottom - 0.45 * U, size * 0.75, size * 0.75);
        }
        pen.path(g, glassPath(lx, rx, top, bottom, 12), "pencil", null, { strokeWidth: 2.6 });
        pen.line(g, lx - 4, top, rx + 4, top, "pencil", { strokeWidth: 1.6 });
        gleam(c, lx + 0.4 * U, top + 0.4 * U, bottom - 0.6 * U);
        // the pencil laid across the top
        pen.path(
            g,
            `M${0.6 * U} ${2.5 * U}H${8.4 * U}L${9.4 * U} ${2.8 * U}L${8.4 * U} ${3.1 * U}H${0.6 * U}Z`,
            "pencil",
            lightFill(c, "glow", "solid"),
            { strokeWidth: 1.5 },
        );
        pen.polygon(
            g,
            [
                [9.1 * U, 2.72 * U],
                [9.4 * U, 2.8 * U],
                [9.1 * U, 2.88 * U],
            ],
            "pencil",
            { fill: t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
        pen.rect(g, 0.3 * U, 2.5 * U, 0.4 * U, 0.6 * U, "pencil", pen.fill("berry"), {
            strokeWidth: 1.3,
        });
        pen.path(
            g,
            roundedRect(6.6 * U, 0.2 * U, 3.8 * U, 1.5 * U, 5),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.5 },
        );
        num(c, 8.5 * U, 1.3 * U, `day ${days}`, 15);
        a.string = [mid, level + U, "right"];
        a.tag = [8.5 * U, 0.2 * U, "up"];
        return a;
    },
    describe: () =>
        "A jar of pale blue water with a string hanging into it from a pencil laid across the top, crystals grown along the string, a day tag above.",
    reads: true,
});
