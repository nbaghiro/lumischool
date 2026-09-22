import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const tower = defineDrawing({
    id: "tower",
    family: "places",
    title: "Old tower",
    group: "Structures",
    about: "A round stone tower built up in courses, one row of stones laid on the row before, with slits for windows, battlements on top and a flag that flies when it is raised. The courses can be counted from the ground up, the oldest at the bottom.",
    params: { courses: 8, flag: 0 },
    settings: {
        courses: { kind: "whole", min: 4, max: 10 },
        flag: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Eight courses", params: { courses: 8, flag: 0 } },
        { label: "Six, the flag flying", params: { courses: 6, flag: 1 } },
    ],
    box: () => ({ w: 6, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.courses, 4, 10),
            W = 6 * U,
            base = 11.8 * U,
            top = 3.2 * U,
            a: RawAnchors = {};
        const x0 = 1.1 * U,
            x1 = W - 1.1 * U,
            rise = (base - top) / n,
            stone = pen.fill("card");
        pen.rect(
            g,
            x0,
            top,
            x1 - x0,
            base - top,
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 7, fillWeight: 0.45 }),
            { strokeWidth: 2 },
        );
        for (let i = 0; i < n; i++) {
            const y = base - (i + 1) * rise,
                per = 4,
                shift = i % 2 ? 0.5 : 0;
            pen.line(g, x0, y, x1, y, "pencil", { strokeWidth: 1.1 });
            for (let k = 0; k <= per; k++) {
                const x = x0 + ((k + shift) / per) * (x1 - x0);
                if (x > x0 + 4 && x < x1 - 4)
                    pen.line(g, x, y, x, y + rise, "pencil", { strokeWidth: 1 });
            }
            a[`course(${i})`] = [x1, y + rise / 2, "right"];
        }
        // the battlements, as merlons along the top
        for (let k = 0; k < 4; k++)
            pen.rect(
                g,
                x0 - 0.2 * U + k * ((x1 - x0 + 0.4 * U) / 4),
                top - 0.9 * U,
                (x1 - x0 + 0.4 * U) / 4 - 0.25 * U,
                0.9 * U,
                "pencil",
                stone,
                { strokeWidth: 1.4 },
            );
        pen.rect(g, x0 - 0.3 * U, top - 0.15 * U, x1 - x0 + 0.6 * U, 0.3 * U, "pencil", stone, {
            strokeWidth: 1.4,
        });
        for (const y of [top + 1.4 * U, top + 3.8 * U])
            pen.rect(
                g,
                W / 2 - 0.16 * U,
                y,
                0.32 * U,
                1 * U,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
        pen.path(
            g,
            `M${W / 2 - 0.7 * U} ${base}L${W / 2 - 0.7 * U} ${base - 1.3 * U}Q${W / 2} ${base - 2.1 * U} ${W / 2 + 0.7 * U} ${base - 1.3 * U}L${W / 2 + 0.7 * U} ${base}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        pen.line(g, W / 2 + 0.2 * U, top - 0.9 * U, W / 2 + 0.2 * U, 0.2 * U, "pencil", {
            strokeWidth: 1.6,
        });
        if (p.flag > 0)
            pen.path(
                part(c, "flag", [W / 2 + 0.2 * U, 0.6 * U]).g,
                `M${W / 2 + 0.2 * U} ${0.25 * U}Q${W / 2 + 1.2 * U} ${0.1 * U} ${W / 2 + 2.3 * U} ${0.6 * U}Q${W / 2 + 1.2 * U} ${0.9 * U} ${W / 2 + 0.2 * U} ${1.3 * U}Z`,
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 1.3 },
            );
        pen.line(g, 0.2 * U, base, W - 0.2 * U, base, "pencil", { strokeWidth: 2 });
        a.top = [W / 2 + 0.2 * U, 0.2 * U, "up"];
        a.door = [W / 2, base - 1.9 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A round stone tower built up in courses, with slits for windows, battlements on top and a flagpole ${p.flag > 0 ? "flying a red flag" : "with no flag"}, and an arched door at the foot.`,
    motion: { parts: { flag: { is: "sway", deg: 8, range: [-1, 0.4], period: 2.2 } } },
});
