import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned, say, soft } from "../lettering";

export type Eclipse = "solar eclipse" | "lunar eclipse" | "no eclipse";

/**
 * What the line-up makes: the moon between the sun and the Earth (0) or behind the Earth (1), and on
 * the line through the sun and the Earth (offset 0) or above or below it. The moon's path is tilted a
 * little, so most months it passes above or below the line and nothing is eclipsed.
 */
export const eclipseOf = (moon: number, offset: number): Eclipse =>
    Math.round(offset) !== 0
        ? "no eclipse"
        : Math.round(moon) === 0
          ? "solar eclipse"
          : "lunar eclipse";

const EX = 12 * U;
const EY = 5.6 * U;
const ER = 1.5 * U;
const MR = 0.55 * U;

export const eclipse = defineDrawing({
    id: "eclipse",
    family: "science",
    title: "Eclipses",
    group: "Structures",
    about: "The sun, the Earth and the moon seen side on and not to scale, with the sunlight coming from the left and a dashed line through the sun and the Earth. The moon is either between the sun and the Earth (`moon` 0), where it is new, or behind the Earth (1), where it is full, and either on the line (`offset` 0) or above or below it, since its path round the Earth is tilted a little. Only on the line does a shadow land: the new moon's shadow falls on the Earth and makes an eclipse of the sun, and a full moon inside the Earth's shadow is an eclipse of the moon, dim and red. With `show` at 0 the shadows are not drawn, for a prediction, and `names` writes the names.",
    params: { moon: 0, offset: 0, show: 1, names: 1 },
    settings: {
        moon: { kind: "whole", min: 0, max: 1 },
        offset: { kind: "whole", min: -1, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "An eclipse of the sun", params: { moon: 0, offset: 0, show: 1, names: 1 } },
        { label: "An eclipse of the moon", params: { moon: 1, offset: 0, show: 1, names: 1 } },
        { label: "A full moon above the line", params: { moon: 1, offset: -1, show: 1, names: 1 } },
        { label: "What will happen?", params: { moon: 0, offset: 1, show: 0, names: 0 } },
    ],
    box: () => ({ w: 22, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            behind = Math.round(p.moon) === 1,
            off = Math.max(-1, Math.min(1, Math.round(p.offset))),
            mx = behind ? 18.4 * U : 6.6 * U,
            my = EY + off * 2.1 * U,
            show = p.show > 0,
            kind = eclipseOf(p.moon, p.offset);
        // the sun at the edge of the page, and its light coming across
        pen.path(g, `M2 ${0.6 * U}Q${3.4 * U} ${EY} 2 ${10.6 * U}Z`, "pencil", pen.fill("glow"), {
            strokeWidth: 1.8,
        });
        pen.line(g, 1.4 * U, EY, 21.6 * U, EY, "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
            strokeLineDash: [6, 5],
        });
        if (show) {
            // the Earth's shadow, narrowing away from the sun
            pen.polygon(
                g,
                [
                    [EX, EY - ER],
                    [21.8 * U, EY - 0.6 * U],
                    [21.8 * U, EY + 0.6 * U],
                    [EX, EY + ER],
                ],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
            if (!behind) {
                // the new moon's shadow, a thin cone reaching as far as the Earth
                const tip = EX - (off === 0 ? ER * 0.4 : 0);
                pen.polygon(
                    g,
                    [
                        [mx, my - MR],
                        [tip, my - 0.05 * U],
                        [tip, my + 0.05 * U],
                        [mx, my + MR],
                    ],
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
                    { strokeWidth: 1, stroke: c.t["ink-soft"] },
                );
            }
        }
        // the Earth, lit on its left
        pen.circle(
            g,
            EX,
            EY,
            2 * ER,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 }),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            `M${EX} ${EY - ER}A${ER} ${ER} 0 0 0 ${EX} ${EY + ER}Z`,
            "ruler",
            pen.fill(c.paper ? "card" : "sky"),
            {
                strokeWidth: 1.8,
            },
        );
        if (show && kind === "solar eclipse")
            pen.circle(
                g,
                EX - ER * 0.97,
                EY,
                0.35 * U,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                {
                    strokeWidth: 1,
                },
            );
        // the moon: lit on its left, or dim and red in the Earth's shadow
        if (show && kind === "lunar eclipse")
            pen.circle(
                g,
                mx,
                my,
                2 * MR,
                "ruler",
                pen.fill("berry", "hachure", { hachureGap: 3 }),
                {
                    strokeWidth: 1.6,
                },
            );
        else {
            pen.circle(
                g,
                mx,
                my,
                2 * MR,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
                { strokeWidth: 1.6 },
            );
            pen.path(
                g,
                `M${mx} ${my - MR}A${MR} ${MR} 0 0 0 ${mx} ${my + MR}Z`,
                "ruler",
                pen.fill("card"),
                {
                    strokeWidth: 1.6,
                },
            );
        }
        if (p.names > 0) {
            say(c, 1.6 * U, 10.4 * U, "Sun", 14, "start");
            say(c, EX, EY + ER + 1 * U, "Earth", 14);
            say(c, mx, my + (off > 0 ? 1.5 : -1) * U, "Moon", 13);
        }
        if (!show) penned(c, EX + 3.2 * U, EY - 2.6 * U, "?", 26);
        cap(c, 21.6 * U, 10.4 * U, "not to scale", 11, "end");
        soft(c, 1.6 * U, 1.2 * U, "sunlight", 11, "start");
        a.earth = [EX, EY - ER, "up"];
        a.moon = [mx, my - MR, "up"];
        a.line = [20 * U, EY, "up"];
        return a;
    },
    describe: (p) =>
        `The sun, the Earth and the moon side on, not to scale, with the moon ${Math.round(p.moon) === 1 ? "behind the Earth" : "between the sun and the Earth"}${Math.round(p.offset) === 0 ? " on the line through them" : Math.round(p.offset) < 0 ? " above the line through them" : " below the line through them"}.`,
    reads: true,
});
