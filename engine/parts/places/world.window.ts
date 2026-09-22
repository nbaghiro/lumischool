import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const OUTSIDE: readonly Outside[] = ["clear", "cloudy", "rain", "snow", "starry", "breezy"];
/** What the weather outside looks like, for a screen reader. */
const SEEN: Record<Outside, string> = {
    clear: "a clear sky and the sun",
    cloudy: "a cloud beside the sun",
    rain: "rain falling from a cloud",
    snow: "snow falling from a cloud",
    starry: "stars in a night sky",
    breezy: "a clear sky and the sun",
};

// A window and a door for the worlds indoors, shelved like every other drawing.
type Outside = "clear" | "cloudy" | "rain" | "snow" | "starry" | "breezy";

/** A window with a sill and curtains, and whatever the weather is doing outside it. */
export const windowV = defineDrawing<{ outside: Outside }>({
    id: "world.window",
    family: "places",
    title: "Window",
    group: "Props",
    about: "A window with a sill and curtains tied back, showing the weather outside. Scenery for a world indoors.",
    params: { outside: "clear" },
    settings: { outside: { kind: "one of", of: OUTSIDE } },
    takes: [
        { label: "Clear", params: { outside: "clear" } },
        { label: "Rain", params: { outside: "rain" } },
        { label: "Snow", params: { outside: "snow" } },
        { label: "A starry night", params: { outside: "starry" } },
    ],
    box: () => ({ w: 14, h: 13 }),
    draw: (c, p) => {
        const { pen, g, t } = c;
        const x = 2 * U,
            y = 1 * U,
            w = 10 * U,
            h = 9 * U;
        pen.rect(g, x, y, w, h, "ruler", pen.fill("sky", "solid"), { strokeWidth: 2.4 });
        // outside, drawn before the frame so the bars sit over it
        if (p.outside === "starry") {
            for (const [sx, sy] of [
                [0.25, 0.3],
                [0.6, 0.22],
                [0.8, 0.5],
                [0.4, 0.62],
                [0.15, 0.75],
            ] as const) {
                pen.circle(g, x + w * sx, y + h * sy, 7, "pencil", pen.fill("glow"), {
                    strokeWidth: 1,
                });
            }
        } else {
            pen.circle(
                g,
                x + w * 0.74,
                y + h * 0.28,
                2.2 * U,
                "pencil",
                pen.fill(p.outside === "clear" || p.outside === "breezy" ? "glow" : "card"),
                { strokeWidth: 1.6 },
            );
        }
        if (p.outside === "cloudy" || p.outside === "rain" || p.outside === "snow") {
            pen.ellipse(g, x + w * 0.38, y + h * 0.36, 4.4 * U, 2 * U, "doodle", pen.fill("card"), {
                strokeWidth: 1.4,
            });
        }
        if (p.outside === "rain") {
            for (let i = 0; i < 9; i++) {
                const rx = x + 0.6 * U + (i % 5) * 1.9 * U,
                    ry = y + 4.6 * U + Math.floor(i / 5) * 2 * U;
                pen.line(g, rx, ry, rx - 0.4 * U, ry + 1.1 * U, "pencil", {
                    stroke: t["ink-soft"],
                    strokeWidth: 1.3,
                });
            }
        }
        if (p.outside === "snow") {
            for (let i = 0; i < 8; i++) {
                const fx = x + 0.9 * U + (i % 4) * 2.4 * U + (i > 3 ? 1.1 * U : 0),
                    fy = y + 4.8 * U + Math.floor(i / 4) * 2.1 * U;
                for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
                    pen.line(
                        g,
                        fx - 7 * Math.cos(a),
                        fy - 7 * Math.sin(a),
                        fx + 7 * Math.cos(a),
                        fy + 7 * Math.sin(a),
                        "pencil",
                        { stroke: t["ink-soft"], strokeWidth: 1.1 },
                    );
                }
            }
        }
        if (p.outside !== "starry")
            pen.line(g, x, y + h * 0.84, x + w, y + h * 0.84, "pencil", {
                stroke: t["ink-soft"],
                strokeWidth: 1.6,
            });
        // the frame: a cross of glazing bars, a sill, curtains tied back either side
        pen.line(g, x + w / 2, y, x + w / 2, y + h, "ruler", { strokeWidth: 2.6 });
        pen.line(g, x, y + h / 2, x + w, y + h / 2, "ruler", { strokeWidth: 2.6 });
        pen.rect(g, x - 0.6 * U, y + h, w + 1.2 * U, 0.8 * U, "ruler", pen.fill("card"), {
            strokeWidth: 2.2,
        });
        for (const side of [-1, 1] as const) {
            const cx = side < 0 ? x - 0.2 * U : x + w + 0.2 * U;
            const inner = cx + side * -2.2 * U;
            pen.polygon(
                g,
                [
                    [cx, y - 0.4 * U],
                    [inner, y - 0.4 * U],
                    [cx + side * -0.8 * U, y + 5 * U],
                    [cx + side * -1.6 * U, y + h + 0.2 * U],
                    [cx, y + h + 0.2 * U],
                ],
                "pencil",
                pen.fill("berry", "hachure", { hachureGap: 5, fillWeight: 0.8 }),
                { strokeWidth: 1.8 },
            );
        }
        pen.line(g, x - 1.4 * U, y - 0.5 * U, x + w + 1.4 * U, y - 0.5 * U, "ruler", {
            strokeWidth: 2.4,
        });
        const a: RawAnchors = {
            pane: [x + w / 2, y + h / 2, "up"],
            sill: [x + w / 2, y + h + 0.8 * U, "down"],
        };
        return a;
    },
    describe: (p) =>
        `A window with glazing bars, a sill and curtains tied back either side, showing ${SEEN[p.outside]} outside.`,
});
