import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const christmasGift = defineDrawing<{ ribbon: boolean }>({
    id: "christmasgift",
    family: "home",
    title: "A wrapped Christmas present",
    group: "Props",
    about: "A paper-wrapped parcel with a broad ribbon and two curling loops, ready for a chimney delivery.",
    params: { ribbon: true },
    settings: { ribbon: { kind: "flag" } },
    takes: [
        { label: "Red wrapping, golden ribbon", params: { ribbon: true } },
        { label: "Golden wrapping, red ribbon", params: { ribbon: false } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            edge = { strokeWidth: 1.2, roughness: 0.3 };
        pen.rect(
            g,
            0.2 * U,
            0.6 * U,
            1.6 * U,
            1.2 * U,
            "pencil",
            pen.fill(p.ribbon ? "berry" : "glow", "solid"),
            edge,
        );
        pen.rect(
            g,
            0.85 * U,
            0.6 * U,
            0.3 * U,
            1.2 * U,
            "pencil",
            pen.fill(p.ribbon ? "glow" : "berry", "solid"),
            edge,
        );
        pen.path(
            g,
            `M${U} ${0.6 * U}C${0.2 * U} ${0.6 * U} ${0.4 * U} ${0.05 * U} ${U} ${0.6 * U}C${1.6 * U} ${0.05 * U} ${1.8 * U} ${0.6 * U} ${U} ${0.6 * U}`,
            "pencil",
            null,
            edge,
        );
        return { middle: [U, U, "up"] };
    },
    describe: (p) =>
        `A ${p.ribbon ? "red" : "golden"} Christmas present wrapped in paper, tied with a broad ribbon and two curling loops on top.`,
    motion: { still: "The game drops and turns the parcel." },
});
