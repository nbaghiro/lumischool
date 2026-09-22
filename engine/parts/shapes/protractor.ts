import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num } from "../lettering";

type Pt = [number, number];

const deg = (d: number): number => (d * Math.PI) / 180;

export const protractor = defineDrawing({
    id: "protractor",
    family: "shapes",
    title: "Protractor",
    group: "Props",
    about: "A half-circle scale over the angle it is measuring, numbered both ways round, because choosing the right scale is the part a child gets wrong. The arms are drawn on top, as if seen through the plastic.",
    params: { deg: 130, arms: true },
    settings: { deg: { kind: "whole", min: 0, max: 180 }, arms: { kind: "flag" } },
    takes: [
        { label: "Measuring 130\u00b0", params: { deg: 130, arms: true } },
        { label: "An acute angle", params: { deg: 40, arms: true } },
        { label: "A right angle", params: { deg: 90, arms: true } },
        { label: "The tool on its own", params: { deg: 0, arms: false } },
    ],
    box: () => ({ w: 17, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 8.5 * U,
            cy = 9 * U,
            R = 7 * U;
        const at = (d: number, r: number): Pt => [
            cx - r * Math.cos(deg(d)),
            cy - r * Math.sin(deg(d)),
        ];
        pen.path(
            g,
            `M${cx - R} ${cy}A${R} ${R} 0 0 1 ${cx + R} ${cy}Z`,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        pen.path(
            g,
            `M${cx - R * 0.42} ${cy}A${R * 0.42} ${R * 0.42} 0 0 1 ${cx + R * 0.42} ${cy}`,
            "ruler",
            null,
            { strokeWidth: 1, stroke: c.t["ink-soft"] },
        );
        for (let d = 0; d <= 180; d += 5) {
            const major = d % 10 === 0;
            const [ax, ay] = at(d, R - 4),
                [bx, by] = at(d, R - (major ? 20 : 12));
            pen.line(g, ax, ay, bx, by, "ruler", { strokeWidth: major ? 1.5 : 0.8 });
            if (major) {
                // At 0 and 180 the label would sit under the base line, so every label is lifted clear.
                const [ox, oy] = at(d, R - 28),
                    [ix, iy] = at(d, R - 56);
                num(c, ox, Math.min(oy + 4, cy - 8), d, 12);
                num(c, ix, Math.min(iy + 4, cy - 24), 180 - d, 10, "middle", c.t["ink-soft"]);
            }
        }
        pen.line(g, cx - R, cy, cx + R, cy, "ruler", { strokeWidth: 2 });
        pen.line(g, cx, cy - 14, cx, cy + 8, "ruler", { strokeWidth: 1.2 });
        pen.circle(g, cx, cy, 7, "ruler", null, { strokeWidth: 1.2 });
        const a: RawAnchors = { vertex: [cx, cy, "down"], zero: [cx - R, cy, "left"] };
        if (p.arms) {
            const [ex, ey] = at(p.deg, R + 12);
            pen.line(g, cx, cy, cx + R + 12, cy, "pencil", { strokeWidth: 2.4 });
            pen.line(g, cx, cy, ex, ey, "pencil", { strokeWidth: 2.4 });
            const [mx, my] = at(p.deg, R - 10);
            pen.circle(g, mx, my, 12, "pencil", null, { strokeWidth: 2, stroke: c.t.pen });
            a.reading = [mx, my - 12, "up"];
            a.arm = [ex, ey, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A half-circle protractor with its scale of degrees marked round the rim and a centre point${p.arms ? ", with two arms of an angle laid across it from the centre" : ""}.`,
    motion: { still: STILL.instrument },
});
