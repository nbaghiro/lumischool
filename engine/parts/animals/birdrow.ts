import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp, eye } from "./nature";

function bird<G>(c: Ctx<G>, cx: number, feet: number, dir: number): void {
    const { pen, g } = c,
        body = pen.fill("sky", "solid", { hachureGap: 6 }),
        k = 0.85;
    const X = (n: number) => cx + dir * n * k,
        Y = (n: number) => feet - n * k;
    pen.polygon(
        g,
        [
            [X(-14), Y(24)],
            [X(-40), Y(34)],
            [X(-34), Y(14)],
        ],
        "pencil",
        body,
        { strokeWidth: 1.6 },
    );
    for (const s of [-1, 1])
        pen.line(g, cx + s * 4, Y(14), cx + s * 5, feet, "pencil", { strokeWidth: 1.6 });
    pen.ellipse(g, X(-3), Y(22), 31, 23, "pencil", body, { strokeWidth: 2 });
    pen.circle(g, X(12), Y(36), 17, "pencil", body, { strokeWidth: 1.8 });
    pen.polygon(
        g,
        [
            [X(19), Y(38)],
            [X(31), Y(35)],
            [X(19), Y(31)],
        ],
        "pencil",
        pen.fill("tang"),
        { strokeWidth: 1.2 },
    );
    pen.arc(g, X(-5), Y(22), 19, 14, 0.2, Math.PI - 0.2, "pencil", {
        strokeWidth: 1.2,
        stroke: c.t["ink-soft"],
    });
    eye(c, X(14), Y(38), 5);
}

export const birdRow = defineDrawing({
    id: "birdrow",
    family: "animals",
    title: "Birds",
    group: "Characters",
    about: "Birds evenly spaced on a wire or standing on the ground, each facing left or right. Once the birds have been counted there is a second count in the picture, which is how many of them are looking each way.",
    params: { count: 5, facing: [1, 1, -1, 1, -1], wire: true },
    settings: {
        count: { kind: "whole", min: 1, max: 8 },
        facing: { kind: "numbers", min: -1, max: 1, most: 8 },
        wire: { kind: "flag" },
    },
    takes: [
        { label: "Five on a wire", params: { count: 5, facing: [1, 1, -1, 1, -1], wire: true } },
        { label: "Three, no wire", params: { count: 3, facing: [1, -1, 1], wire: false } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 8) * 4 + 2, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 8),
            w = (n * 4 + 2) * U,
            a: RawAnchors = {};
        const ends = 3.2 * U,
            sag = 0.5 * U,
            mid = w / 2,
            half = mid - 0.3 * U;
        const level = (x: number) =>
            p.wire ? ends + sag * (1 - Math.pow((x - mid) / half, 2)) : 3.6 * U;
        if (p.wire)
            pen.path(
                g,
                `M${0.3 * U} ${ends}Q${mid} ${ends + 2 * sag} ${w - 0.3 * U} ${ends}`,
                "ruler",
                null,
                { strokeWidth: 2 },
            );
        else pen.line(g, 0.4 * U, 3.6 * U, w - 0.4 * U, 3.6 * U, "pencil", { strokeWidth: 2.2 });
        for (let i = 0; i < n; i++) {
            const cx = (3 + i * 4) * U,
                dir = (p.facing[i] ?? 1) < 0 ? -1 : 1;
            bird(part(c, "bird", [cx, level(cx)]), cx, level(cx), dir);
            a[`bird(${i})`] = [cx, level(cx) - 2.3 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `${p.wire ? "Birds sitting evenly spaced along a sagging wire" : "Birds standing evenly spaced on a line of ground"}, each facing left or right, blue with an orange beak and a small eye.`,
    motion: { parts: { bird: { is: "hop", lift: 9, squash: 0.14, period: 4.6, wave: 0.3 } } },
});
