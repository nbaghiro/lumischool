import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp } from "../animals/nature";

export const waterWheel = defineDrawing({
    id: "waterwheel",
    family: "places",
    title: "Water mill",
    group: "Structures",
    about: "The stone end wall of a water mill, with a slate roof, a door and small windows, and a wooden wheel beside it turned by water running onto it along a trough. At dusk the wheel turns and the mill's lamps come on.",
    params: { paddles: 8, lit: 0 },
    settings: {
        paddles: { kind: "whole", min: 6, max: 12 },
        lit: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Before the lamps", params: { paddles: 8, lit: 0 } },
        { label: "The lamps come on", params: { paddles: 8, lit: 1 } },
        { label: "Twelve paddles", params: { paddles: 12, lit: 0 } },
    ],
    box: () => ({ w: 15, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.paddles, 6, 12),
            lit = p.lit > 0,
            base = 10.6 * U,
            eaves = 4.4 * U,
            apex = 1.2 * U,
            wx0 = 0.6 * U,
            wx1 = 7.6 * U,
            mid = (wx0 + wx1) / 2,
            a: RawAnchors = {};
        pen.polygon(
            g,
            [
                [wx0, base],
                [wx0, eaves],
                [mid, apex],
                [wx1, eaves],
                [wx1, base],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.9 },
        );
        // a few stones, staggered in courses, kept off the windows and the door
        for (let row = 0; row < 7; row++) {
            const y = eaves + 0.5 * U + row * 0.85 * U;
            for (let k = 0; k < 4; k++) {
                const x = wx0 + (0.7 + k * 1.75 + (row % 2) * 0.85) * U;
                if (x > wx1 - 0.6 * U) continue;
                const onDoor = x > 1.4 * U && x < 3.9 * U && y > 7.4 * U,
                    onWindow =
                        y > 4.6 * U &&
                        y < 6.6 * U &&
                        (Math.abs(x - 2.4 * U) < 1.1 * U || Math.abs(x - 5.8 * U) < 1.1 * U),
                    onLower = y > 7.4 * U && y < 9.2 * U && Math.abs(x - 5.8 * U) < 1.1 * U;
                if (onDoor || onWindow || onLower) continue;
                pen.line(g, x, y, x + 0.9 * U, y, "pencil", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
                pen.line(g, x + 0.9 * U, y, x + 0.9 * U, y + 0.4 * U, "pencil", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
            }
        }
        // the slate roof seen end on: a band along each slope of the gable, standing a little proud
        for (const d of [-1, 1]) {
            const foot: Pt = [mid + d * (wx1 - mid + 0.5 * U), eaves + 0.35 * U],
                top: Pt = [mid, apex - 0.5 * U];
            pen.polygon(
                g,
                [top, foot, [foot[0] - d * 0.2 * U, foot[1] + 0.55 * U], [mid, apex + 0.1 * U]],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
                { strokeWidth: 1.6 },
            );
        }
        pen.rect(g, 5.4 * U, 0.6 * U, 0.8 * U, 1.8 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.5,
        });
        const glass = pen.fill(lit ? "glow" : "sky");
        const windows = lit ? part(c, "window", [mid, 6 * U]) : c;
        for (const [x, y, w, h] of [
            [2.4, 5.6, 1.3, 1.6],
            [5.8, 5.6, 1.3, 1.6],
            [5.8, 8.3, 1.3, 1.5],
            [4.1, 3.2, 0.9, 0.9],
        ] as const) {
            pen.rect(windows.g, (x - w / 2) * U, (y - h / 2) * U, w * U, h * U, "ruler", glass, {
                strokeWidth: 1.4,
            });
            pen.line(g, x * U, (y - h / 2) * U, x * U, (y + h / 2) * U, "ruler", {
                strokeWidth: 1,
            });
            pen.line(g, (x - w / 2) * U, y * U, (x + w / 2) * U, y * U, "ruler", {
                strokeWidth: 1,
            });
        }
        pen.path(
            g,
            `M${1.7 * U} ${base}L${1.7 * U} ${8.2 * U}Q${2.6 * U} ${7.3 * U} ${3.5 * U} ${8.2 * U}L${3.5 * U} ${base}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        const hub: Pt = [10.8 * U, 7 * U],
            R = 3.2 * U,
            inner = R - 0.5 * U;
        // the trough on its post, bringing the water from the right onto the top of the wheel
        pen.line(g, 14.2 * U, 3.3 * U, 14.2 * U, base, "pencil", {
            strokeWidth: 2.4,
            stroke: c.t.tang,
        });
        pen.polygon(
            g,
            [
                [15 * U, 2.5 * U],
                [10.2 * U, 2.5 * U],
                [10.2 * U, 3.3 * U],
                [15 * U, 3.3 * U],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        pen.line(g, 10.3 * U, 2.65 * U, 14.9 * U, 2.65 * U, "pencil", {
            strokeWidth: 2.2,
            stroke: c.t.sky,
        });
        const wheel = part(c, "wheel", hub, { symmetry: n }).g;
        pen.circle(wheel, hub[0], hub[1], 2 * R, "pencil", null, { strokeWidth: 2 });
        pen.circle(wheel, hub[0], hub[1], 2 * inner, "pencil", null, { strokeWidth: 1.5 });
        for (let i = 0; i < n; i++) {
            const t = (i / n) * Math.PI * 2,
                cos = Math.cos(t),
                sin = Math.sin(t),
                at = (r: number): Pt => [hub[0] + cos * r, hub[1] + sin * r];
            pen.line(wheel, ...at(0.4 * U), ...at(inner), "pencil", {
                strokeWidth: 1.5,
                stroke: c.t.tang,
            });
            const u = t + Math.PI / n,
                bx = Math.cos(u),
                by = Math.sin(u);
            pen.line(
                wheel,
                hub[0] + bx * (inner - 0.05 * U),
                hub[1] + by * (inner - 0.05 * U),
                hub[0] + bx * (R + 0.35 * U),
                hub[1] + by * (R + 0.35 * U),
                "pencil",
                { strokeWidth: 3, stroke: c.t.tang },
            );
        }
        pen.circle(g, hub[0], hub[1], 0.9 * U, "pencil", pen.fill("ink-soft"), {
            strokeWidth: 1.3,
        });
        // the water spilling off the end of the trough onto the paddles
        pen.path(
            g,
            `M${10.2 * U} ${2.7 * U}Q${9.5 * U} ${2.9 * U} ${9.4 * U} ${4.1 * U}L${10 * U} ${4.1 * U}Q${10.1 * U} ${3.2 * U} ${10.4 * U} ${3.2 * U}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.2 },
        );
        const race: Pt[] = [];
        for (let i = 0; i <= 16; i++)
            race.push([7.2 * U + i * 0.48 * U, 10.3 * U + (i % 2 ? -0.12 * U : 0.12 * U)]);
        pen.polygon(
            g,
            [...race, [15 * U, 11.6 * U], [7.2 * U, 11.6 * U]],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.7 }),
            { stroke: "none" },
        );
        pen.curve(g, race, "pencil", { strokeWidth: 1.6 });
        pen.line(g, 0.2 * U, base, 7.2 * U, base, "pencil", { strokeWidth: 2 });
        a.door = [2.6 * U, base - 1.4 * U, "down"];
        a.wheel = [hub[0], hub[1] - R - 0.4 * U, "up"];
        a.window = [5.8 * U, 4.8 * U, "up"];
        return a;
    },
    describe: (p) =>
        `The stone end wall of a water mill with a slate roof, a door and ${p.lit > 0 ? "lamplit windows" : "dark windows"}, and a wooden water wheel beside it fed by a trough.`,
    motion: {
        parts: {
            wheel: { is: "spin", rev: 16 },
            window: { is: "twinkle", dim: 0.2, amt: 0, period: 3.1 },
        },
    },
});
