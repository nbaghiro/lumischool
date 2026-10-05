import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** Where the spout's rose is, in squares from the drawing's top-left corner: the water comes out here. */
export const ROSE = { x: 0.35, y: 0.75 } as const;

/**
 * A garden watering can side on, its long spout and rose to the left and its handle over the top. The
 * game tips it by turning the sprite, so the drawing itself never tilts.
 */
export const wateringCan = defineDrawing<{ tone: string }>({
    id: "wateringcan",
    family: "outdoors",
    title: "Watering can",
    group: "Props",
    about: "A garden watering can seen side on, with a round body, a handle arching over the top and a long spout ending in a sprinkling rose on the left.",
    params: { tone: "sky" },
    settings: { tone: { kind: "one of", of: ["sky", "mint", "berry", "tang", "glow"] } },
    takes: [
        { label: "A blue can", params: { tone: "sky" } },
        { label: "A green can", params: { tone: "mint" } },
    ],
    box: () => ({ w: 4, h: 3 }),
    draw: (c, p) => {
        const tone =
            p.tone === "mint" || p.tone === "berry" || p.tone === "tang" || p.tone === "glow"
                ? p.tone
                : "sky";
        // the body
        c.pen.path(
            c.g,
            `M${1.6 * U} ${1.15 * U}L${3.6 * U} ${1.15 * U}L${3.45 * U} ${2.8 * U}L${1.75 * U} ${2.8 * U}Z`,
            "pencil",
            c.pen.fill(tone, "solid"),
            { strokeWidth: 1.5 },
        );
        // the handle, arching over the top
        c.pen.path(
            c.g,
            `M${1.95 * U} ${1.15 * U}Q${2.6 * U} ${0.15 * U} ${3.35 * U} ${1.15 * U}`,
            "pencil",
            null,
            {
                strokeWidth: 1.6,
            },
        );
        // the spout from the bottom of the body up to the rose
        c.pen.path(
            c.g,
            `M${1.7 * U} ${2.35 * U}L${ROSE.x * U + 0.25 * U} ${ROSE.y * U + 0.15 * U}`,
            "pencil",
            null,
            { strokeWidth: 2.4 },
        );
        c.pen.ellipse(
            c.g,
            ROSE.x * U,
            ROSE.y * U,
            0.45 * U,
            0.7 * U,
            "pencil",
            c.pen.fill("card", "solid"),
            {
                strokeWidth: 1.1,
            },
        );
        return {};
    },
    describe: () =>
        "A garden watering can seen from the side, with a round painted body, a handle arching over the top and a long spout with a sprinkling rose.",
});
