import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, wide } from "../lettering";

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

/** Where the scale on the pole runs, in squares: its top mark below the box's top, and its nought above the box's bottom. */
export const POLE = { top: 2.8, foot: 1.2, x: 1.9 } as const;

/** A label as a child writes it: a fraction as one number over another, anything else on one line. */
function label<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    s: string,
    size: number,
    align: "start" | "middle" | "end",
): void {
    const m = /^(\d+)\/(\d+)$/.exec(s);
    if (!m) {
        num(c, x, y + size * 0.36, s, size, align);
        return;
    }
    const top = m[1] ?? "",
        bottom = m[2] ?? "",
        small = Math.round(size * 0.78),
        wd = Math.max(wide(top, small), wide(bottom, small)) + 4;
    const mx = align === "end" ? x - wd / 2 : align === "start" ? x + wd / 2 : x;
    num(c, mx, y - 2, top, small);
    c.pen.line(c.g, mx - wd / 2, y + 0.5, mx + wd / 2, y + 0.5, "ruler", {
        strokeWidth: 1.3,
        disableMultiStroke: true,
    });
    num(c, mx, y + small * 0.88 + 1, bottom, small);
}

export const scalePole = defineDrawing({
    id: "scalepole",
    family: "measuring",
    title: "Pole with a scale",
    group: "Structures",
    about: "A tall pole planted in the ground and marked as a number line from its foot to its top, with a flag at the top that can carry a number. The marks are the same distance apart all the way up, so a height on it is a number on a line, and a fraction is written as one number over another.",
    params: {
        tall: 16,
        ticks: 10,
        labels: ["0", "", "", "", "", "5", "", "", "", "", "10"] as string[],
        flag: "",
    },
    settings: {
        tall: { kind: "whole", min: 6, max: 30 },
        ticks: { kind: "whole", min: 1, max: 20 },
        labels: { kind: "words", most: 21 },
        flag: { kind: "text", most: 5 },
    },
    takes: [
        {
            label: "Nought to ten",
            params: {
                tall: 16,
                ticks: 10,
                labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
                flag: "7",
            },
        },
        {
            label: "To a hundred in tens",
            params: {
                tall: 16,
                ticks: 10,
                labels: ["0", "", "20", "", "40", "", "60", "", "80", "", "100"],
                flag: "70",
            },
        },
        {
            label: "Nought to one in eighths",
            params: {
                tall: 16,
                ticks: 8,
                labels: ["0", "", "", "", "1/2", "", "", "", "1"],
                flag: "3/8",
            },
        },
    ],
    box: (p) => ({ w: 5, h: whole(p.tall, 6, 30, 16) }),
    draw: (c, p) => {
        const { pen, g } = c,
            h = whole(p.tall, 6, 30, 16),
            n = whole(p.ticks, 1, 20, 10),
            x = POLE.x * U;
        const top = POLE.top * U,
            base = (h - POLE.foot) * U,
            ground = (h - POLE.foot + 0.4) * U;
        pen.ellipse(g, x, ground + 3, 1.6 * U, 0.5 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1.2,
        });
        pen.rect(g, x - 3.5, 0.4 * U, 7, ground - 0.4 * U, "ruler", pen.fill("card"), calm(c, 1.6));
        // the pole is banded in tang every two marks, so the eye can hold its place going up it
        for (let i = 0; i < n; i += 2) {
            const y0 = base - (i / n) * (base - top),
                y1 = base - (Math.min(n, i + 1) / n) * (base - top);
            pen.rect(
                g,
                x - 3.5,
                y1,
                7,
                y0 - y1,
                "ruler",
                pen.fill("tang", "hachure", { hachureGap: 3, fillWeight: 0.8 }),
                { strokeWidth: 0.6, roughness: 0.3 },
            );
        }
        const a: RawAnchors = { foot: [x, ground, "down"] };
        for (let i = 0; i <= n; i++) {
            const y = base - (i / n) * (base - top),
                text = String(p.labels[i] ?? ""),
                major = text !== "" || i === 0 || i === n;
            pen.line(g, x + 3.5, y, x + (major ? 17 : 11), y, "ruler", {
                strokeWidth: major ? 2 : 1.4,
                disableMultiStroke: true,
            });
            pen.line(g, x - 3.5, y, x - (major ? 9 : 6), y, "ruler", {
                strokeWidth: major ? 1.6 : 1.1,
                disableMultiStroke: true,
            });
            if (text) {
                patch(c, x - 12 - wide(text, 16) / 2, y, wide(text, 16) + 6, 20);
                label(c, x - 12, y, text, 16, "end");
            }
            a[`tick(${i})`] = [x, y, "right"];
        }
        // the flag flies from the top of the pole, and carries the number it asks for
        const fy = 0.2 * U,
            fh = 2 * U,
            fw = 2.55 * U;
        pen.path(
            g,
            `M${x + 3} ${fy}L${x + fw + 6} ${fy + 3}Q${x + fw} ${fy + fh / 2} ${x + fw + 6} ${fy + fh - 3}L${x + 3} ${fy + fh}Z`,
            "ruler",
            pen.fill("glow"),
            calm(c, 1.5),
        );
        if (p.flag) {
            const s = String(p.flag),
                fx = x + fw / 2 + 3,
                size = /\//.test(s) ? 19 : 22;
            patch(c, fx, fy + fh / 2, wide(s, size) + 4, fh - 6);
            label(c, fx, fy + fh / 2 - (/\//.test(s) ? 3 : 0), s, size, "middle");
        }
        pen.circle(g, x, 0.35 * U, 8, "ruler", pen.fill("berry"), calm(c, 1.2));
        a.flag = [x + fw / 2, fy, "up"];
        return a;
    },
    describe: () =>
        "A tall white pole banded in orange, planted in the ground and marked as a number line up its side, with a yellow flag flying at its top.",
});
