import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The bucket's rim, in squares from the middle of its five-square box: the game's catch is this wide. */
export const BUCKET_HALF = 1.9;

export const pegBucket = defineDrawing<{ lit: boolean }>({
    id: "pegbucket",
    family: "sport",
    title: "Sliding bucket",
    group: "Props",
    about: "The bucket that slides to and fro along the foot of a marble peg board: a wide wooden pail open at the top, with a rim each side that a marble can bounce off.",
    params: { lit: false },
    settings: { lit: { kind: "flag" } },
    takes: [
        { label: "Waiting", params: { lit: false } },
        { label: "A marble caught", params: { lit: true } },
    ],
    box: () => ({ w: 5, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            l = (2.5 - BUCKET_HALF) * U,
            r = (2.5 + BUCKET_HALF) * U;
        pen.path(
            g,
            `M${l} ${0.3 * U}L${l + 0.35 * U} ${1.8 * U}H${r - 0.35 * U}L${r} ${0.3 * U}`,
            "pencil",
            pen.fill(p.lit ? "glow" : "tang", "solid"),
            { strokeWidth: 1.3, roughness: 0.25 },
        );
        for (const y of [0.85, 1.35])
            pen.line(g, l + 0.25 * U, y * U, r - 0.25 * U, y * U, "pencil", {
                strokeWidth: 0.7,
                stroke: c.t.ink,
                roughness: 0.2,
            });
        for (const x of [l, r])
            pen.circle(g, x, 0.3 * U, 0.5 * U, "pencil", pen.fill("ink-soft", "solid"), {
                strokeWidth: 0.9,
                roughness: 0.2,
            });
        return { mouth: [2.5 * U, 0.3 * U, "up"] };
    },
    describe: (p) =>
        `A wide wooden bucket open at the top, with a round rim at each side, that slides along the foot of a marble board${p.lit ? ", glowing with a marble caught" : ""}.`,
    motion: { still: "It slides only when the game moves it." },
});
