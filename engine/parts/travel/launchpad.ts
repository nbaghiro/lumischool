import { type Ctx, type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const PAD = 216,
    GROUND = 236,
    RX = 74,
    TOWER_L = 112,
    TOWER_R = 134,
    TOWER_TOP = 40;

/** Where each floodlight stands: its lamp, which way it faces, and the foot of its pole if it has one. */
const LIGHTS: { x: number; y: number; dir: 1 | -1; foot: number | null }[] = [
    { x: 10, y: 150, dir: 1, foot: GROUND },
    { x: 156, y: 164, dir: -1, foot: GROUND + 2 },
    { x: TOWER_L - 2, y: 60, dir: -1, foot: null },
];

/** The rocket that stands on the pad: the shelf's small rocket, drawn taller and slimmer. */
function rocketOn<G>(c: Ctx<G>): void {
    const { pen, g } = c,
        cx = RX,
        w = 12,
        shoulder = 72,
        tail = 194;
    for (const side of [-1, 1])
        pen.path(
            g,
            `M${cx + side * w} ${tail - 26}L${cx + side * (w + 14)} ${tail + 12}L${cx + side * (w + 13)} ${PAD - 2}L${cx + side * w} ${tail + 4}Z`,
            "ruler",
            pen.fill("tang"),
            calm(c, 1.6),
        );
    pen.path(
        g,
        `M${cx - 7} ${tail}L${cx + 7} ${tail}L${cx + 10} ${tail + 10}L${cx - 10} ${tail + 10}Z`,
        "ruler",
        pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
        calm(c, 1.5),
    );
    pen.path(
        g,
        `M${cx - w} ${tail}V${shoulder}Q${cx - w} ${shoulder - 18} ${cx} ${shoulder - 32}Q${cx + w} ${shoulder - 18} ${cx + w} ${shoulder}V${tail}Z`,
        "pencil",
        pen.fill("card"),
        calm(c, 1.8),
    );
    for (const y of [shoulder, 150])
        pen.path(
            g,
            `M${cx - w} ${y}H${cx + w}V${y + 7}H${cx - w}Z`,
            "ruler",
            pen.fill("berry", "hachure", { hachureGap: 3.2 }),
            calm(c, 1.2),
        );
    pen.circle(g, cx, shoulder + 24, 13, "ruler", pen.fill("sky"), calm(c, 1.5));
    if (!c.paper)
        pen.arc(g, cx - 1.5, shoulder + 22.5, 6, 6, Math.PI * 1.05, Math.PI * 1.5, "ruler", {
            stroke: c.t.card,
            strokeWidth: 1.3,
            disableMultiStroke: true,
        });
}

export const launchpad = defineDrawing({
    id: "launchpad",
    family: "travel",
    title: "Launch pad",
    group: "Props",
    about: "A launch pad on a coast: a concrete pad over a flame trench, a lattice gantry tower with arms reaching out, up to three floodlights, and a tall rocket standing ready beside the tower or the pad left empty.",
    params: { rocket: 1, lights: 2 },
    settings: {
        rocket: { kind: "whole", min: 0, max: 1 },
        lights: { kind: "whole", min: 0, max: 3 },
    },
    takes: [
        { label: "Rocket on the pad, two lights", params: { rocket: 1, lights: 2 } },
        { label: "Empty pad", params: { rocket: 0, lights: 0 } },
        { label: "Rocket under three lights", params: { rocket: 1, lights: 3 } },
    ],
    box: () => ({ w: 12, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            rocket = p.rocket > 0,
            lights = Math.max(0, Math.min(3, Math.round(p.lights))),
            a: RawAnchors = {};
        pen.path(g, `M166 244L240 244V260H184Z`, "pencil", pen.fill("sky"), { strokeWidth: 1.4 });
        for (const [x, y] of [
            [184, 250],
            [206, 255],
            [220, 249],
        ] as const)
            pen.path(g, `M${x} ${y}q4 -3 8 0t8 0`, "pencil", null, {
                strokeWidth: 1.1,
                stroke: c.t.card,
            });
        pen.path(g, `M0 ${GROUND}H152Q164 ${GROUND} 172 248Q178 256 186 260`, "pencil", null, {
            strokeWidth: 1.8,
        });
        pen.polygon(
            g,
            [
                [22, PAD],
                [146, PAD],
                [152, PAD + 5],
                [16, PAD + 5],
            ],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
            calm(c, 1.5),
        );
        pen.rect(g, 16, PAD + 5, 136, GROUND - PAD - 5, "ruler", pen.fill("card"), calm(c, 1.8));
        pen.rect(
            g,
            RX - 17,
            PAD + 9,
            34,
            GROUND - PAD - 9,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 2.6, fillWeight: 0.7 }),
            calm(c, 1.3),
        );
        for (let y = PAD; y > TOWER_TOP; y -= 18) {
            const top = Math.max(TOWER_TOP, y - 18);
            pen.line(g, TOWER_L, y, TOWER_R, top, "ruler", calm(c, 0.9));
            pen.line(g, TOWER_R, y, TOWER_L, top, "ruler", calm(c, 0.9));
            pen.line(g, TOWER_L, top, TOWER_R, top, "ruler", calm(c, 1.1));
        }
        for (const x of [TOWER_L, TOWER_R]) {
            pen.line(g, x, PAD, x, TOWER_TOP - 2, "ruler", {
                ...calm(c, 4.5),
                stroke: c.t.tang,
            });
            pen.line(g, x, PAD, x, TOWER_TOP - 2, "ruler", calm(c, 1.5));
        }
        pen.rect(g, TOWER_L - 4, TOWER_TOP - 12, TOWER_R - TOWER_L + 8, 10, "ruler", null, {
            ...calm(c, 1.6),
        });
        pen.line(g, TOWER_L - 4, TOWER_TOP - 8, RX + 4, TOWER_TOP - 8, "ruler", calm(c, 1.4));
        pen.line(g, RX + 4, TOWER_TOP - 8, RX + 4, TOWER_TOP - 2, "ruler", calm(c, 1.1));
        const reach = rocket ? RX + 12 : 100;
        for (const y of [100, 156]) {
            pen.line(g, TOWER_L, y, reach, y, "ruler", calm(c, 1.4));
            pen.line(g, TOWER_L, y + 6, reach, y + 6, "ruler", calm(c, 1.4));
            for (let x = TOWER_L - 6; x > reach; x -= 6)
                pen.line(g, x, y, x - 3, y + 6, "ruler", calm(c, 0.9));
            pen.line(g, reach, y, reach, y + 6, "ruler", calm(c, 1.4));
        }
        if (rocket) {
            rocketOn(c);
            a.nose = [RX, 40, "up"];
        }
        LIGHTS.slice(0, lights).forEach((l, i) => {
            if (l.foot !== null) {
                pen.line(g, l.x, l.foot, l.x, l.y + 5, "ruler", calm(c, 1.6));
                pen.line(g, l.x - 5, l.foot, l.x + 5, l.foot, "ruler", calm(c, 1.4));
            }
            const d = l.dir;
            pen.polygon(
                g,
                [
                    [l.x - d * 2, l.y - 5],
                    [l.x + d * 9, l.y - 8],
                    [l.x + d * 9, l.y + 8],
                    [l.x - d * 2, l.y + 5],
                ],
                "ruler",
                pen.fill("glow"),
                calm(c, 1.4),
            );
            for (const k of [-1, 0, 1])
                pen.line(g, l.x + d * 13, l.y + k * 6, l.x + d * 21, l.y + k * 10, "ruler", {
                    ...calm(c, 1.1),
                    stroke: c.t["glow-ink"],
                });
            a[`light(${i})`] = [l.x, l.y - 8, "up"];
        });
        a.pad = [RX, PAD, "up"];
        a.tower = [(TOWER_L + TOWER_R) / 2, TOWER_TOP - 12, "up"];
        return a;
    },
    describe: (p) => {
        const lights = Math.max(0, Math.min(3, Math.round(p.lights)));
        return `A launch pad by the sea, a concrete pad beside a lattice tower with arms${p.rocket > 0 ? ", a tall rocket standing ready on the pad" : ", the pad empty"}${lights > 0 ? ", floodlights shining on it" : ""}.`;
    },
    motion: {
        still: "A pad and its tower stand on the ground, and a rocket waiting on the pad holds still until it goes.",
    },
});
