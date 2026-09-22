import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill } from "../../pigment";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { loop } from "../marks";
import { LAYER_NAMES } from "./kit";

interface Light {
    sun: [number, number];
    shadow: number;
}
const NOON: Light = { sun: [0.78, 0.2], shadow: 0 };
/**
 * Where the sun stands, as a fraction of the sky, and how far the near tree's shadow reaches, in
 * squares, with a shadow to the right at morning and to the left at dusk. Noon is the landscape as
 * it has always been drawn: the sun high and no shadow on the ground, which is what a lesson that
 * does not ask about the time of day still draws.
 */
const LIGHTS: Record<string, Light> = {
    noon: NOON,
    morning: { sun: [0.12, 0.34], shadow: 3 },
    dusk: { sun: [0.88, 0.36], shadow: -3 },
};

export const layers = defineDrawing({
    id: "layers",
    family: "art",
    title: "A landscape in three layers",
    group: "Props",
    about: "Hills one behind another under a sky: the far hills palest and bluest, the middle ones greener, and the near field darkest with a tree and grass in it. Things far away look paler and bluer through the air between, which is how a flat sheet shows distance. Each layer can be named and one ringed. `light` is the time of day: at noon the sun is high and the tree casts no shadow on the ground, at morning it is low on the left with the shadow reaching right, and at dusk low on the right with the shadow reaching left, so the three can be put in order by the shadows alone, which is what survives on paper.",
    params: { labels: true, ring: -1, sun: true, light: "noon" },
    settings: {
        labels: { kind: "flag" },
        ring: { kind: "whole", min: -1, max: 2 },
        sun: { kind: "flag" },
        light: { kind: "one of", of: ["noon", "morning", "dusk"] },
    },
    takes: [
        { label: "Named", params: { labels: true, ring: -1, sun: true, light: "noon" } },
        {
            label: "The far hills ringed",
            params: { labels: false, ring: 0, sun: false, light: "noon" },
        },
        {
            label: "Morning, the shadow reaching right",
            params: { labels: false, ring: -1, sun: true, light: "morning" },
        },
        {
            label: "Dusk, the shadow reaching left",
            params: { labels: false, ring: -1, sun: true, light: "dusk" },
        },
    ],
    box: (p) => ({ w: p.labels ? 19 : 15, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            f = (s: string) => paintFill(c, colourOf(s) ?? "#FFFFFF"),
            x = 0.5 * U,
            y = 0.5 * U,
            w = 14 * U,
            h = 10 * U;
        const light = LIGHTS[p.light] ?? NOON;
        pen.rect(g, x, y, w, h, "ruler", f("sky+white 2"), { strokeWidth: 0 });
        if (p.sun)
            pen.circle(
                g,
                x + w * light.sun[0],
                y + h * light.sun[1],
                2 * U,
                "pencil",
                f("yellow"),
                { strokeWidth: 1.4 },
            );
        const band = (top: number, wave: number, colour: string) =>
            pen.path(
                g,
                `M${x} ${y + h * top}Q${x + w * 0.22} ${y + h * (top - wave)} ${x + w * 0.46} ${y + h * top}Q${x + w * 0.72} ${y + h * (top + wave)} ${x + w} ${y + h * (top - wave * 0.6)}L${x + w} ${y + h}L${x} ${y + h}Z`,
                "pencil",
                f(colour),
                { strokeWidth: 1.6 },
            );
        band(0.42, 0.14, "blue+white 4");
        band(0.6, 0.1, "green+white 2");
        band(0.8, 0.05, "green 2+yellow");
        const tx = x + w * 0.24,
            ty = y + h * 0.72;
        if (light.shadow !== 0) {
            const foot = ty + 1.6 * U,
                far = tx + light.shadow * U;
            pen.path(
                g,
                `M${tx - 5} ${foot}L${far} ${foot - 0.42 * U}L${far} ${foot + 0.1 * U}L${tx + 5} ${foot + 0.3 * U}Z`,
                "pencil",
                f("green 2+blue"),
                { strokeWidth: 1.2 },
            );
        }
        pen.rect(g, tx - 4, ty, 8, 1.6 * U, "pencil", f("brown"), { strokeWidth: 1.4 });
        pen.circle(g, tx, ty - 0.5 * U, 2.6 * U, "pencil", f("green 2+blue"), { strokeWidth: 1.6 });
        for (let k = 0; k < 7; k++)
            pen.line(
                g,
                x + w * (0.5 + k * 0.06),
                y + h * 0.93,
                x + w * (0.51 + k * 0.06),
                y + h * 0.86,
                "pencil",
                { strokeWidth: 1.4 },
            );
        pen.rect(g, x, y, w, h, "pencil", null, { strokeWidth: 2 });
        const at: [number, number][] = [
            [y + h * 0.36, 0],
            [y + h * 0.6, 1],
            [y + h * 0.84, 2],
        ];
        const a: RawAnchors = {};
        for (const [ly, i] of at) {
            if (p.labels) {
                pen.line(g, x + w + 4, ly, x + w + 0.9 * U, ly, "ruler", {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                });
                say(c, x + w + 1.1 * U, ly + 5, LAYER_NAMES[i] ?? "", 14, "start");
            }
            if (i === p.ring) loop(c, x + w * 0.62, ly + 4, 5 * U, 1.8 * U);
            a[`layer(${i})`] = [x + w * 0.62, ly, "up"];
        }
        return a;
    },
    describe: (p) => {
        const light = LIGHTS[p.light] ?? NOON;
        const sun = p.sun
            ? light.shadow === 0
                ? ", the sun high in the sky"
                : `, the sun low on the ${light.sun[0] < 0.5 ? "left" : "right"}`
            : "";
        const shadow =
            light.shadow === 0
                ? ""
                : `, its shadow reaching ${light.shadow > 0 ? "right" : "left"}`;
        const ring =
            p.ring >= 0 && p.ring < 3 ? `, the ${LAYER_NAMES[p.ring] ?? "far"} band ringed` : "";
        return `Hills in three bands under a sky, the far ones palest, a round tree in the near field${sun}${shadow}${p.labels ? ", each band named" : ""}${ring}.`;
    },
});
