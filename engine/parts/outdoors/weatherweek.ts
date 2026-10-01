import { roundedRect } from "../../ink/pen";
import type { Ctx, RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { say, wide } from "../lettering";

export const SKIES = ["sun", "cloud", "rain", "snow", "wind", "storm", "sunny-spells"] as const;
type Sky = (typeof SKIES)[number];

interface WeekParams {
    /** The heading over each column, in any language: a day, a town or a month. */
    days: string[];
    skies: string[];
    /** A line under each picture, such as a temperature; empty for none. */
    temps: string[];
}

const isSky = (s: string): s is Sky => (SKIES as readonly string[]).includes(s);

function sun<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    const { pen, g } = c;
    for (let k = 0; k < 8; k++) {
        const t = (k / 8) * Math.PI * 2;
        pen.line(
            g,
            x + Math.cos(t) * r * 1.3,
            y + Math.sin(t) * r * 1.3,
            x + Math.cos(t) * r * 1.75,
            y + Math.sin(t) * r * 1.75,
            "pencil",
            { strokeWidth: 1.6 },
        );
    }
    pen.circle(g, x, y, r * 2, "pencil", pen.fill("glow"), { strokeWidth: 1.6 });
}

function cloud<G>(c: Ctx<G>, x: number, y: number, w: number, dark = false): void {
    const { pen, g } = c,
        h = w * 0.3;
    pen.path(
        g,
        `M${x - w / 2} ${y + h / 2}Q${x - w / 2 - 4} ${y - h / 2} ${x - w / 4} ${y - h / 3}Q${x - w / 6} ${y - h * 1.5} ${x + w / 8} ${y - h}Q${x + w / 3} ${y - h * 1.4} ${x + w / 2.6} ${y - h / 3}Q${x + w / 2 + 6} ${y - h / 4} ${x + w / 2} ${y + h / 2}Z`,
        "pencil",
        dark ? pen.fill("ink-soft", "hachure", { hachureGap: 5 }) : pen.fill("card"),
        { strokeWidth: 1.7 },
    );
}

function sky<G>(c: Ctx<G>, kind: Sky, x: number, y: number): void {
    const { pen, g } = c,
        w = 2.8 * U;
    switch (kind) {
        case "sun":
            sun(c, x, y, 0.55 * U);
            return;
        case "cloud":
            cloud(c, x, y, w);
            return;
        case "sunny-spells":
            sun(c, x - 0.5 * U, y - 0.4 * U, 0.45 * U);
            cloud(c, x + 0.25 * U, y + 0.3 * U, w * 0.85);
            return;
        case "rain":
            cloud(c, x, y - 0.4 * U, w, true);
            for (const d of [-0.8, 0, 0.8])
                pen.line(g, x + d * U, y + 0.35 * U, x + d * U - 4, y + 1.05 * U, "pencil", {
                    stroke: c.t.sky,
                    strokeWidth: 2,
                });
            return;
        case "snow":
            cloud(c, x, y - 0.4 * U, w);
            for (const d of [-0.8, 0, 0.8]) {
                const fx = x + d * U,
                    fy = y + 0.75 * U + (d === 0 ? 4 : 0);
                for (const t of [0, Math.PI / 3, (2 * Math.PI) / 3])
                    pen.line(
                        g,
                        fx - Math.cos(t) * 5,
                        fy - Math.sin(t) * 5,
                        fx + Math.cos(t) * 5,
                        fy + Math.sin(t) * 5,
                        "pencil",
                        { strokeWidth: 1.3 },
                    );
            }
            return;
        case "wind":
            for (const [dy, len] of [
                [-0.6, 2.4],
                [0, 2.8],
                [0.6, 2],
            ] as const) {
                const x0 = x - 1.4 * U,
                    yy = y + dy * U,
                    x1 = x0 + len * U;
                pen.path(
                    g,
                    `M${x0} ${yy}H${x1}Q${x1 + 0.5 * U} ${yy} ${x1 + 0.5 * U} ${yy - 0.35 * U}Q${x1 + 0.5 * U} ${yy - 0.7 * U} ${x1 + 0.1 * U} ${yy - 0.6 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 1.8 },
                );
            }
            return;
        case "storm":
            cloud(c, x, y - 0.4 * U, w, true);
            pen.polygon(
                g,
                [
                    [x + 0.1 * U, y + 0.1 * U],
                    [x - 0.45 * U, y + 0.85 * U],
                    [x - 0.05 * U, y + 0.85 * U],
                    [x - 0.3 * U, y + 1.45 * U],
                    [x + 0.45 * U, y + 0.6 * U],
                    [x + 0.05 * U, y + 0.6 * U],
                ],
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.3 },
            );
            return;
    }
}

export const weatherWeek = defineDrawing<WeekParams>({
    id: "weatherweek",
    family: "outdoors",
    title: "A weather chart",
    group: "Structures",
    about: "The weather the way a forecast shows it: a column for each day, town or month with its name at the top, a picture of its sky (sun, cloud, rain, snow, wind, a storm, or sun and cloud) and a line under it for the temperature. Each picture is a shape, not a colour, so it reads the same in print.",
    params: {
        days: ["lunes", "martes", "miércoles"],
        skies: ["sun", "rain", "wind"],
        temps: ["25 °C", "18 °C", "20 °C"],
    },
    settings: {
        days: { kind: "words", most: 7 },
        skies: { kind: "words", most: 7, of: SKIES },
        temps: { kind: "words", most: 7 },
    },
    takes: [
        {
            label: "Three days",
            params: {
                days: ["lunes", "martes", "miércoles"],
                skies: ["sun", "rain", "wind"],
                temps: ["25 °C", "18 °C", "20 °C"],
            },
        },
        {
            label: "A whole week",
            params: {
                days: ["L", "M", "X", "J", "V", "S", "D"],
                skies: ["sun", "sunny-spells", "cloud", "rain", "storm", "wind", "snow"],
                temps: ["", "", "", "", "", "", ""],
            },
        },
        {
            label: "Four towns",
            params: {
                days: ["Madrid", "Sevilla", "Bilbao", "León"],
                skies: ["sun", "sun", "rain", "snow"],
                temps: ["30 °C", "35 °C", "19 °C", "2 °C"],
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.skies.length) * 4 + 1, h: p.temps.some(Boolean) ? 9 : 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(1, p.skies.length),
            temps = p.temps.some(Boolean),
            H = (temps ? 9 : 7) * U - 0.4 * U;
        pen.path(
            g,
            roundedRect(0.2 * U, 0.2 * U, n * 4 * U + 0.6 * U, H, 8),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.7 },
        );
        pen.line(g, 0.2 * U, 2 * U, n * 4 * U + 0.8 * U, 2 * U, "ruler", { strokeWidth: 1.3 });
        p.skies.forEach((kind, i) => {
            const x = (0.5 + i * 4 + 2) * U;
            if (i > 0) pen.line(g, x - 2 * U, 0.4 * U, x - 2 * U, H, "ruler", { strokeWidth: 1 });
            const day = p.days[i] ?? "";
            const size = Math.min(15, ((3.6 * U) / Math.max(1, wide(day, 15))) * 15);
            if (day) say(c, x, 1.45 * U, day, size);
            if (isSky(kind)) sky(c, kind, x, 4.2 * U);
            const t = p.temps[i] ?? "";
            if (t) say(c, x, 7.7 * U, t, 14);
            a[`day(${i})`] = [x, 0.2 * U, "up"];
            a[`sky(${i})`] = [x, 4.2 * U, "down"];
        });
        return a;
    },
    describe: (p) =>
        `A weather chart of ${p.skies.length} columns, each with a name at the top, a picture of the sky below it, and sometimes a temperature underneath.`,
    motion: { still: STILL.clues },
});
