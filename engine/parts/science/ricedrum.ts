import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { rings } from "./sound";

export const ricedrum = defineDrawing({
    id: "ricedrum",
    family: "science",
    title: "Drum with rice on it",
    group: "Structures",
    about: "A drum with grains of rice on its skin, just struck by a stick. The skin shakes when it is hit, and the rice jumps to show it: a gentle tap barely lifts the grains, a hard hit throws them high, and the harder the skin shakes the more rings of sound come off it. `hit` is 0 to 3, and 0 is the drum left alone.",
    params: { hit: 2, tag: "" },
    settings: { hit: { kind: "whole", min: 0, max: 3 }, tag: { kind: "text", most: 2 } },
    takes: [
        { label: "Left alone", params: { hit: 0, tag: "" } },
        { label: "A gentle tap", params: { hit: 1, tag: "" } },
        { label: "A hard hit", params: { hit: 3, tag: "" } },
    ],
    box: () => ({ w: 13, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            hit = Math.max(0, Math.min(3, Math.round(p.hit)));
        const cx = 5.6 * U,
            top = 7 * U,
            bottom = 11 * U,
            rx = 3.8 * U,
            ry = 0.9 * U;
        if (p.tag) num(c, 0.4 * U, top + 0.2 * U, p.tag, 22, "start");
        pen.path(
            g,
            `M${cx - rx} ${top}L${cx - rx} ${bottom}A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}L${cx + rx} ${top}Z`,
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 1.9 },
        );
        // the skin, a flat ellipse that dips a little in the middle when it is shaking
        pen.ellipse(g, cx, top, rx * 2, ry * 2, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        if (hit > 0)
            pen.arc(
                g,
                cx,
                top - ry * 0.2,
                rx * 1.6,
                ry * (0.6 + hit * 0.25),
                0.2,
                Math.PI - 0.2,
                "pencil",
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
        for (const y of [top + 0.3 * U, bottom - 0.1 * U])
            pen.arc(g, cx, y, rx * 2, ry * 2, 0.05, Math.PI - 0.05, "pencil", {
                strokeWidth: 2.4,
                stroke: c.t.glow,
            });
        // the rice: resting on the skin, or thrown up by as much as the skin shook
        const grains = [-2.6, -1.8, -1, -0.3, 0.5, 1.2, 2, 2.7];
        grains.forEach((dx, i) => {
            const lift = hit === 0 ? 0 : (hit * 1.1 + ((i * 7) % 5) * 0.28 * hit) * U;
            const x = cx + dx * U,
                y = top - 0.12 * U - lift + (i % 3) * 0.1 * U;
            pen.ellipse(g, x, y, 0.5 * U, 0.26 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.2,
            });
            if (hit > 0)
                pen.line(
                    g,
                    x,
                    y + 0.3 * U,
                    x,
                    y + 0.3 * U + Math.min(lift * 0.35, 0.8 * U),
                    "pencil",
                    { strokeWidth: 0.9, stroke: c.t["ink-soft"], strokeLineDash: [2, 3] },
                );
        });
        // the stick, lifted after the hit
        pen.line(g, cx + 1.2 * U, top - 1.6 * U, cx + 4.6 * U, top - 4.2 * U, "pencil", {
            strokeWidth: 3,
            stroke: c.t.tang,
        });
        pen.circle(g, cx + 1.1 * U, top - 1.5 * U, 0.7 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.2,
        });
        if (hit > 0) rings(c, cx + rx + 0.4 * U, top + 1.2 * U, hit);
        a.skin = [cx, top - ry, "up"];
        return a;
    },
    describe: (p) =>
        `A drum with grains of rice on its skin${p.hit > 0 ? " and a stick that has just struck it, the grains jumping and rings of sound coming off the skin" : ", the stick resting beside it and the grains lying still"}.`,
    reads: true,
});
