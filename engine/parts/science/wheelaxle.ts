import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { pushDown } from "./push";

/** The wheel's and the axle's radii as drawn, in the drawing's units. */
export const wheelSizes = (p: {
    wheel: number;
    axle: number;
}): { wheel: number; axle: number } => ({
    wheel: Math.max(2, Math.min(6, Math.round(p.wheel))),
    axle: Math.max(1, Math.min(2, Math.round(p.axle))),
});

/** The pull on a wheel's rope that holds the load on its axle: the load times the axle's radius, over the wheel's. */
export const wheelPull = (load: number, axle: number, wheel: number): number =>
    (load * axle) / Math.max(1, wheel);

export const wheelAxle = defineDrawing({
    id: "wheelaxle",
    family: "science",
    title: "Wheel and axle",
    group: "Structures",
    about: "A big wheel fixed to a thin axle on a stand, with the load hanging from a rope wound on the axle and a pull on a rope wound round the wheel. The two ropes hang from the ends of the two radii, which are marked, so the wheel is a lever whose arms are those radii: the pull is the load made smaller by the ratio of the wheel to the axle, and the pull's rope goes down further for it. The pull is worked out from the settings, or left as a question.",
    params: { wheel: 4, axle: 1, load: 40, show: 1, unit: "N", tag: "" },
    settings: {
        wheel: { kind: "whole", min: 2, max: 6 },
        axle: { kind: "whole", min: 1, max: 2 },
        load: { kind: "whole", min: 1, max: 100 },
        show: { kind: "whole", min: 0, max: 1 },
        unit: { kind: "text", most: 3 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "Wheel 4, axle 1",
            params: { wheel: 4, axle: 1, load: 40, show: 1, unit: "N", tag: "" },
        },
        {
            label: "Wheel 6, axle 2, to work out",
            params: { wheel: 6, axle: 2, load: 60, show: 0, unit: "N", tag: "" },
        },
    ],
    box: () => ({ w: 14, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        if (p.tag) num(c, 0.6 * U, 3 * U, p.tag, 22, "start");
        const { wheel, axle } = wheelSizes(p);
        const k = 0.62 * U,
            R = wheel * k,
            r = axle * k,
            cx = 6.6 * U,
            cy = 5.8 * U,
            beam = 1.2 * U;
        // hung from a beam, as the pulleys are, so both ropes drop clear of anything holding it up
        pen.rect(
            g,
            1 * U,
            beam - 0.5 * U,
            12 * U,
            0.5 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2 },
        );
        pen.circle(g, cx, cy, 2 * R, "ruler", pen.fill("sky", "solid"), { strokeWidth: 2.2 });
        pen.circle(g, cx, cy, 2 * R - 0.6 * U, "ruler", null, {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        pen.circle(g, cx, cy, 2 * r, "ruler", pen.fill("tang"), { strokeWidth: 2.2 });
        // the hanger is in front of the wheel, so print's hatching never looks like it runs through it
        pen.line(g, cx - 0.9 * U, beam, cx, cy, "ruler", { strokeWidth: 2.4 });
        pen.line(g, cx + 0.9 * U, beam, cx, cy, "ruler", { strokeWidth: 2.4 });
        pen.circle(
            g,
            cx,
            cy,
            7,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
        // the two radii the ropes hang from, which are the two arms of the lever
        pen.line(g, cx, cy, cx - r, cy, "ruler", { strokeWidth: 2, stroke: c.t.pen });
        pen.line(g, cx, cy, cx + R, cy, "ruler", { strokeWidth: 2, stroke: c.t.pen });
        patch(c, cx + R / 2 + 0.3 * U, cy - 0.7 * U, 18, 18);
        num(c, cx + R / 2 + 0.3 * U, cy - 0.45 * U, wheel, 15, "middle", c.t.pen);
        patch(c, cx - r / 2, cy + 0.7 * U, 18, 18);
        num(c, cx - r / 2, cy + 0.95 * U, axle, 15, "middle", c.t.pen);
        // the load on the axle's rope, and the pull on the wheel's
        const lx = cx - r,
            top = 10 * U;
        pen.line(g, lx, cy, lx, top, "ruler", { strokeWidth: 1.8 });
        pen.rect(g, lx - 1.4 * U, top, 2.8 * U, 2.2 * U, "ruler", pen.fill("tang"), {
            strokeWidth: 2.2,
        });
        patch(c, lx, top + 1.1 * U, 44, 18);
        num(c, lx, top + 1.1 * U + 5, `${p.load} ${p.unit}`, 14);
        a.load = [lx, top + 2.2 * U, "down"];
        const px = cx + R,
            pull = wheelPull(p.load, axle, wheel);
        const label =
            p.show > 0 ? `${Number.isInteger(pull) ? pull : pull.toFixed(1)} ${p.unit}` : "?";
        pen.line(g, px, cy, px, 9.4 * U, "ruler", { strokeWidth: 1.8 });
        pushDown(c, px, 12.6 * U, 3.2 * U, label);
        a.pull = [px, 12.6 * U, "down"];
        a.wheel = [cx, cy - R, "up"];
        return a;
    },
    describe: () =>
        "A big wheel fixed to a thin axle on a stand, the load hanging from a rope wound on the axle and a pull on a rope round the wheel.",
    reads: true,
});
