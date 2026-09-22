import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, patch, say, soft } from "../lettering";

/** A word on a small white card, so it reads over the Earth's colours on screen as well as in print. */
function sayLabel<G>(c: Ctx<G>, x: number, y: number, s: string): void {
    const w = s.length * 8 + 10;
    c.pen.rect(c.g, x - w / 2, y - 12, w, 17, "ruler", c.pen.fill("card"), {
        strokeWidth: 0.6,
        stroke: c.t["ink-soft"],
    });
    soft(c, x, y + 1, s, 12);
}

export const globe = defineDrawing({
    id: "globe",
    family: "science",
    title: "Day and night",
    group: "Structures",
    about: "The Earth seen from above the North Pole, with the sun's light coming from the left, so the half facing the sun has day and the far half has night. The Earth turns the way its arrow shows, once a day. Lettered children stand where it is the given hour: noon is facing the sun, midnight is on the far side, and sunrise and sunset are where day meets night.",
    params: { hours: [12, 21, 3], turn: 1 },
    settings: {
        hours: { kind: "numbers", min: 0, max: 23, most: 4 },
        turn: { kind: "one of", of: [-1, 1] },
    },
    takes: [
        {
            label: "Noon, nine at night, three in the morning",
            params: { hours: [12, 21, 3], turn: 1 },
        },
        { label: "Four children round the world", params: { hours: [8, 14, 20, 2], turn: 1 } },
    ],
    box: () => ({ w: 20, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cx = 12.2 * U,
            cy = 7 * U,
            R = 4.2 * U;
        // the sun at the edge of the page, and its light coming across in straight lines
        pen.path(g, `M0 ${2.2 * U}Q${3.2 * U} ${cy} 0 ${11.8 * U}Z`, "pencil", pen.fill("glow"), {
            strokeWidth: 1.8,
        });
        for (const y of [4.4, 7, 9.6]) {
            pen.line(g, 2.8 * U, y * U, 6.4 * U, y * U, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.tang,
            });
            pen.polygon(
                g,
                [
                    [6.8 * U, y * U],
                    [6.3 * U, y * U - 5],
                    [6.3 * U, y * U + 5],
                ],
                "ruler",
                { fill: c.t.tang, fillStyle: "solid" },
                { strokeWidth: 0.8, stroke: c.t.tang },
            );
        }
        cap(c, 1.4 * U, 13.3 * U, "sun", 10);
        // the Earth: day on the sun's side, night on the far side
        pen.circle(g, cx, cy, 2 * R, "ruler", pen.fill("sky"), { strokeWidth: 2.2 });
        pen.path(
            g,
            `M${cx} ${cy - R}A${R} ${R} 0 0 1 ${cx} ${cy + R}Z`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.9 }),
            { strokeWidth: 1.4 },
        );
        pen.circle(
            g,
            cx,
            cy,
            8,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
        c.pen.rect(g, cx - 36, cy + 0.9 * U - 9, 72, 15, "ruler", pen.fill("card"), {
            strokeWidth: 0.6,
            stroke: c.t["ink-soft"],
        });
        cap(c, cx, cy + 1 * U + 1, "north pole", 9);
        sayLabel(c, cx - R * 0.5, cy - R * 0.35, "day");
        sayLabel(c, cx + R * 0.5, cy - R * 0.35, "night");
        // the way it turns, anticlockwise seen from above the North Pole
        const way = p.turn >= 0 ? 1 : -1,
            ar = R + 0.85 * U,
            a0 = -0.35,
            a1 = 0.35;
        pen.arc(g, cx, cy, 2 * ar, 2 * ar, Math.PI / 2 + a0, Math.PI / 2 + a1, "pencil", {
            strokeWidth: 2,
            stroke: c.t.pen,
        });
        const at = way > 0 ? Math.PI / 2 + a0 : Math.PI / 2 + a1,
            hx = cx + ar * Math.cos(at),
            hy = cy + ar * Math.sin(at);
        const bx = -Math.sin(at) * (way > 0 ? 1 : -1),
            by = Math.cos(at) * (way > 0 ? 1 : -1);
        for (const s of [-0.5, 0.5])
            pen.line(
                g,
                hx,
                hy,
                hx + (bx * Math.cos(s) - by * Math.sin(s)) * 11,
                hy + (bx * Math.sin(s) + by * Math.cos(s)) * 11,
                "pencil",
                { strokeWidth: 2, stroke: c.t.pen },
            );
        // the children, each standing on the surface where it is their hour
        p.hours.slice(0, 4).forEach((hour, i) => {
            const ang = Math.PI + ((hour - 12) * Math.PI) / 12,
                ux = Math.cos(ang),
                uy = -Math.sin(ang);
            const fx = cx + ux * R,
                fy = cy + uy * R,
                hxx = cx + ux * (R + 0.95 * U),
                hyy = cy + uy * (R + 0.95 * U);
            pen.line(g, fx, fy, cx + ux * (R + 0.6 * U), cy + uy * (R + 0.6 * U), "ruler", {
                strokeWidth: 2.2,
            });
            pen.circle(g, hxx, hyy, 0.7 * U, "ruler", pen.fill("tang"), { strokeWidth: 1.4 });
            const lx = cx + ux * (R + 1.9 * U),
                ly = cy + uy * (R + 1.9 * U);
            patch(c, lx, ly, 18, 18);
            say(c, lx, ly + 6, "ABCD"[i] ?? "?", 16);
            a[`child(${i})`] = [hxx, hyy, uy < 0 ? "up" : "down"];
        });
        return a;
    },
    describe: () =>
        "The Earth seen from above the North Pole with the sun's light coming from the left, an arrow for the way it turns and lettered children standing round its edge.",
    reads: true,
});
