import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** A cog seen face on, `teeth` of them round a rim of radius r, turned by `turn` radians. */
function cogAt(cx: number, cy: number, r: number, teeth: number, turn: number): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i < teeth * 4; i++) {
        const a = turn + (i / (teeth * 4)) * Math.PI * 2,
            rr = i % 4 < 2 ? r : r * 0.8;
        out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return out;
}

/** A wooden peg figure standing on a ledge: a round head with two dot eyes, a body, and a hat or none. */
function peg<G>(c: Ctx<G>, x: number, foot: number, hat: number): void {
    const { pen, g } = c,
        wood = pen.fill("card");
    pen.path(
        g,
        `M${x - 0.32 * U} ${foot}L${x - 0.26 * U} ${foot - 0.95 * U}Q${x} ${foot - 1.12 * U} ${x + 0.26 * U} ${foot - 0.95 * U}L${x + 0.32 * U} ${foot}Z`,
        "pencil",
        wood,
        calm(c, 1.3),
    );
    pen.line(g, x - 0.3 * U, foot - 0.42 * U, x + 0.3 * U, foot - 0.42 * U, "pencil", calm(c, 1));
    pen.circle(g, x, foot - 1.36 * U, 0.52 * U, "pencil", wood, calm(c, 1.3));
    for (const dx of [-0.09, 0.09])
        pen.circle(
            g,
            x + dx * U,
            foot - 1.38 * U,
            2.6,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
    if (hat === 1)
        pen.polygon(
            g,
            [
                [x - 0.26 * U, foot - 1.56 * U],
                [x, foot - 2.02 * U],
                [x + 0.26 * U, foot - 1.56 * U],
            ],
            "pencil",
            pen.fill("tang"),
            calm(c, 1.1),
        );
    if (hat === 2)
        pen.rect(
            g,
            x - 0.22 * U,
            foot - 1.86 * U,
            0.44 * U,
            0.26 * U,
            "pencil",
            pen.fill("tang"),
            calm(c, 1.1),
        );
}

export const greatClock = defineDrawing({
    id: "greatclock",
    family: "places",
    title: "Great clock",
    group: "Structures",
    about: "A wide stone clock tower with a big round clock face, a small bell under a wooden canopy on its roof, a round glass window showing two gears, and a little arched door either side of the window above a wooden ledge. Shut, the doors are closed; striking, they stand open, four wooden peg figures stand on the ledge and the bell rings. The hour hand points to the hour and the minute hand to twelve.",
    params: { figures: 0, hour: 10 },
    settings: {
        figures: { kind: "whole", min: 0, max: 1 },
        hour: { kind: "whole", min: 1, max: 12 },
    },
    takes: [
        { label: "Doors shut, ten o'clock", params: { figures: 0, hour: 10 } },
        { label: "Striking twelve, the figures out", params: { figures: 1, hour: 12 } },
        { label: "Striking three", params: { figures: 1, hour: 3 } },
    ],
    box: () => ({ w: 10, h: 16 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            W = 10 * U,
            base = 15.6 * U,
            eave = 5.2 * U,
            out = p.figures > 0;
        const hour = ((Math.round(p.hour) % 12) + 12) % 12,
            stone = pen.fill("card"),
            wood = pen.fill("tang");
        // the bell on the ridge, under a canopy on two posts, ringing when the clock strikes
        for (const x of [3.85, 6.15])
            pen.line(g, x * U, 1.35 * U, x * U, 3.9 * U, "pencil", calm(c, 1.6));
        pen.polygon(
            g,
            [
                [3.3 * U, 1.45 * U],
                [W / 2, 0.35 * U],
                [6.7 * U, 1.45 * U],
            ],
            "pencil",
            wood,
            calm(c, 1.7),
        );
        pen.path(
            g,
            `M${4.35 * U} ${3.05 * U}Q${4.45 * U} ${1.7 * U} ${W / 2} ${1.65 * U}Q${5.55 * U} ${1.7 * U} ${5.65 * U} ${3.05 * U}Q${W / 2} ${3.3 * U} ${4.35 * U} ${3.05 * U}Z`,
            "pencil",
            wood,
            calm(c, 1.6),
        );
        pen.circle(g, W / 2, 3.28 * U, 0.3 * U, "pencil", pen.fill("ink-soft"), calm(c, 1));
        if (out)
            for (const s of [-1, 1])
                for (const [d, len] of [
                    [-0.35, 0.55],
                    [0, 0.7],
                    [0.35, 0.55],
                ] as const) {
                    const y = 2.4 * U + d * U,
                        x0 = W / 2 + s * 1.0 * U;
                    pen.line(g, x0, y, x0 + s * len * U, y + d * 0.7 * U, "pencil", calm(c, 1.3));
                }
        // the roof over the tower
        pen.polygon(
            g,
            [
                [0.5 * U, eave],
                [W / 2, 3.7 * U],
                [W - 0.5 * U, eave],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 1.8 },
        );
        // the tower, stone laid in courses
        const x0 = 1.3 * U,
            x1 = W - 1.3 * U;
        pen.rect(g, x0, eave, x1 - x0, base - eave, "pencil", stone, { strokeWidth: 1.8 });
        for (let k = 1, y = eave + 1.3 * U; y < base - 0.3 * U; k++, y += 1.3 * U) {
            pen.line(g, x0, y, x1, y, "pencil", { strokeWidth: 0.7, stroke: c.t["ink-soft"] });
            for (let x = x0 + (k % 2 ? 0.9 : 1.6) * U; x < x1 - 0.3 * U; x += 1.5 * U)
                pen.line(g, x, y, x, y + 1.3 * U, "pencil", {
                    strokeWidth: 0.7,
                    stroke: c.t["ink-soft"],
                });
        }
        // the clock face, its twelve hours marked, the hour hand on the hour and the minute hand on twelve
        const cx = W / 2,
            cy = 7.75 * U,
            R = 2.15 * U;
        pen.circle(g, cx, cy, R * 2 + 0.5 * U, "pencil", wood, calm(c, 1.8));
        pen.circle(g, cx, cy, R * 2, "ruler", pen.fill("card"), { strokeWidth: 1.7 });
        for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2 - Math.PI / 2,
                long = i % 3 === 0,
                r0 = R * (long ? 0.72 : 0.8),
                r1 = R * 0.9;
            pen.line(
                g,
                cx + Math.cos(ang) * r0,
                cy + Math.sin(ang) * r0,
                cx + Math.cos(ang) * r1,
                cy + Math.sin(ang) * r1,
                "ruler",
                { strokeWidth: long ? 2 : 1.2 },
            );
        }
        const ha = (hour / 12) * Math.PI * 2 - Math.PI / 2;
        pen.line(g, cx, cy, cx + Math.cos(ha) * R * 0.5, cy + Math.sin(ha) * R * 0.5, "ruler", {
            strokeWidth: 3,
        });
        pen.line(g, cx, cy, cx, cy - R * 0.78, "ruler", { strokeWidth: 1.8 });
        pen.circle(
            g,
            cx,
            cy,
            7,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        a.clock = [cx, cy - R - 0.25 * U, "up"];
        // the gear window, and a little arched door either side of it
        const gy = 11.05 * U,
            gr = 1.1 * U;
        pen.circle(g, cx, gy, gr * 2 + 0.35 * U, "pencil", wood, calm(c, 1.6));
        pen.circle(
            g,
            cx,
            gy,
            gr * 2,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
            calm(c, 1.4),
        );
        pen.polygon(
            g,
            cogAt(cx - 0.35 * U, gy + 0.2 * U, 0.58 * U, 8, 0.2),
            "pencil",
            pen.fill("card"),
            calm(c, 1.2),
        );
        pen.polygon(
            g,
            cogAt(cx + 0.5 * U, gy - 0.4 * U, 0.4 * U, 6, 0.5),
            "pencil",
            pen.fill("card"),
            calm(c, 1.2),
        );
        for (const [x, y] of [
            [cx - 0.35 * U, gy + 0.2 * U],
            [cx + 0.5 * U, gy - 0.4 * U],
        ] as const)
            pen.circle(g, x, y, 5, "ruler", pen.fill("ink-soft"), { strokeWidth: 0.7 });
        const ledge = 12.35 * U,
            doorW = 1.25 * U,
            doorH = 1.85 * U;
        for (const [dx, s] of [
            [2.55, -1],
            [7.45, 1],
        ] as const) {
            const x = dx * U,
                top = ledge - doorH,
                arch = `M${x - doorW / 2} ${ledge}V${top + doorW / 2}Q${x - doorW / 2} ${top} ${x} ${top}Q${x + doorW / 2} ${top} ${x + doorW / 2} ${top + doorW / 2}V${ledge}Z`;
            if (out) {
                pen.path(
                    g,
                    arch,
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 2.6 }),
                    calm(c, 1.5),
                );
                // the door swung open against the wall on its outer side
                const hx = x + (s * doorW) / 2;
                pen.polygon(
                    g,
                    [
                        [hx, top + doorW / 2 - 3],
                        [hx + s * 0.55 * U, top + doorW / 2 + 4],
                        [hx + s * 0.55 * U, ledge - 2],
                        [hx, ledge],
                    ],
                    "pencil",
                    wood,
                    calm(c, 1.3),
                );
            } else {
                pen.path(g, arch, "pencil", wood, calm(c, 1.5));
                pen.line(g, x, top + 2, x, ledge, "pencil", calm(c, 1));
                pen.circle(g, x + s * 0.3 * U, ledge - 0.8 * U, 5, "ruler", pen.fill("ink-soft"), {
                    strokeWidth: 0.6,
                });
            }
            a[s < 0 ? "door(0)" : "door(1)"] = [x, top, "up"];
        }
        // the ledge on its brackets, where the figures march out
        pen.rect(g, 0.9 * U, ledge, W - 1.8 * U, 0.34 * U, "pencil", wood, calm(c, 1.6));
        for (const x of [1.8, 5, 8.2])
            pen.polygon(
                g,
                [
                    [(x - 0.3) * U, ledge + 0.34 * U],
                    [(x + 0.3) * U, ledge + 0.34 * U],
                    [x * U, ledge + 0.95 * U],
                ],
                "pencil",
                wood,
                calm(c, 1.1),
            );
        if (out)
            [
                [1.75, 1],
                [3.35, 2],
                [6.65, 0],
                [8.25, 1],
            ].forEach(([x, hat], i) => {
                peg(c, (x ?? 0) * U, ledge, hat ?? 0);
                a[`figure(${i})`] = [(x ?? 0) * U, ledge - 2 * U, "up"];
            });
        // the workshop door at the foot of the tower
        pen.path(
            g,
            roundedRect(cx - 1.05 * U, 13.4 * U, 2.1 * U, base - 13.4 * U + 6, 0.9 * U),
            "pencil",
            wood,
            calm(c, 1.7),
        );
        pen.line(g, cx, 13.55 * U, cx, base, "pencil", calm(c, 1));
        pen.line(g, 0.2 * U, base, W - 0.2 * U, base, "pencil", { strokeWidth: 2 });
        a.bell = [W / 2, 0.35 * U, "up"];
        a.ledge = [W / 2, ledge, "up"];
        a.door = [cx, 13.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A stone clock tower with a big round clock face, a bell under a wooden canopy on its roof, ${p.figures > 0 ? "its arched doors open and peg figures out on the ledge" : "a round window showing two gears, and its arched doors shut"}.`,
    motion: { still: "Its hands show an hour a lesson may ask about, so it holds still." },
});
