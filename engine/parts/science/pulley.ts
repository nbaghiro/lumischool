import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch } from "../lettering";
import { pushDown } from "./push";

/** How hard the free end of a pulley's rope is pulled: the load shared among the ropes that hold it up. */
export const pulleyPull = (load: number, ropes: number): number =>
    load / Math.max(1, Math.min(4, Math.round(ropes)));

export const pulley = defineDrawing({
    id: "pulley",
    family: "science",
    title: "Pulleys",
    group: "Structures",
    about: "A load hung from pulleys, with one rope running up and down over wheels on a beam and wheels on the load, and its free end pulled down by a hand. The ropes holding the load up share its weight, so with two of them the pull is half the load and with four it is a quarter. The pull is worked out from the load and drawn on the arrow, or left as a question.",
    params: { ropes: 1, load: 48, show: 1, unit: "N", tag: "" },
    settings: {
        ropes: { kind: "whole", min: 1, max: 4 },
        load: { kind: "whole", min: 1, max: 100 },
        show: { kind: "whole", min: 0, max: 1 },
        unit: { kind: "text", most: 3 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        { label: "One rope", params: { ropes: 1, load: 48, show: 1, unit: "N", tag: "" } },
        {
            label: "Two ropes, half the pull",
            params: { ropes: 2, load: 48, show: 1, unit: "N", tag: "" },
        },
        {
            label: "Four ropes, to work out",
            params: { ropes: 4, load: 48, show: 0, unit: "N", tag: "" },
        },
    ],
    box: () => ({ w: 14, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(1, Math.min(4, Math.round(p.ropes))),
            r = 1.1 * U;
        if (p.tag) num(c, 0.6 * U, 3.4 * U, p.tag, 22);
        const beam = 1.2 * U,
            yF = 2.6 * U,
            yM = 8.2 * U;
        // the wheels, left to right, alternate between the beam and the load and always end on the beam
        const wheels: ("F" | "M")[] = Array.from({ length: n }, (_, i) =>
            (n - 1 - i) % 2 === 0 ? "F" : "M",
        );
        const x1 = 3.4 * U,
            xs = wheels.map((_, i) => x1 + i * 2 * r);
        pen.rect(
            g,
            1 * U,
            beam - 0.5 * U,
            11.5 * U,
            0.5 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2 },
        );
        const rope = { strokeWidth: 1.8, stroke: c.t.ink };
        const movers = xs.filter((_, i) => wheels[i] === "M");
        const loadX = movers.length
            ? ((movers[0] ?? 0) + (movers[movers.length - 1] ?? 0)) / 2
            : x1 - r;
        const hookY = movers.length ? yM + r + 0.9 * U : yM;
        // the rope, from where it is tied to the last wheel's free side
        // an even number of ropes is tied to the beam; an odd number to the load's own block
        const anchorX = x1 - r,
            anchorTop = wheels[0] === "M",
            barY = yM + r + 0.4 * U;
        pen.line(
            g,
            anchorX,
            anchorTop ? beam : movers.length ? barY : yM,
            anchorX,
            wheels[0] === "F" ? yF : yM,
            "ruler",
            rope,
        );
        if (anchorTop)
            pen.circle(
                g,
                anchorX,
                beam + 4,
                7,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
        for (let i = 0; i + 1 < n; i++)
            pen.line(
                g,
                (xs[i] ?? 0) + r,
                wheels[i] === "F" ? yF : yM,
                (xs[i] ?? 0) + r,
                wheels[i + 1] === "F" ? yF : yM,
                "ruler",
                rope,
            );
        for (const [i, x] of xs.entries()) {
            const up = wheels[i] === "F",
                y = up ? yF : yM;
            if (up) pen.line(g, x, beam, x, y, "ruler", { strokeWidth: 2.2 });
            pen.arc(
                g,
                x,
                y,
                2 * r,
                2 * r,
                up ? Math.PI : 0,
                up ? Math.PI * 2 : Math.PI,
                "ruler",
                rope,
            );
            pen.circle(g, x, y, 2 * r - 6, "ruler", pen.fill(up ? "sky" : "mint"), {
                strokeWidth: 1.6,
            });
            pen.circle(
                g,
                x,
                y,
                7,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
            a[`wheel(${i})`] = [x, y - r, "up"];
        }
        if (movers.length) {
            const l = anchorTop ? (movers[0] ?? anchorX) : anchorX,
                rr = movers[movers.length - 1] ?? l;
            for (const m of movers) pen.line(g, m, yM, m, barY, "ruler", { strokeWidth: 2.2 });
            pen.line(g, l, barY, rr, barY, "ruler", { strokeWidth: 2.2 });
            pen.line(g, loadX, barY, loadX, hookY, "ruler", { strokeWidth: 2.2 });
        }
        // the load, a crate with its weight on it
        const bw = 3 * U,
            bh = 2.4 * U,
            top = hookY + 0.2 * U;
        pen.path(
            g,
            `M${loadX - 0.35 * U} ${hookY}q0 ${0.25 * U} ${0.35 * U} ${0.25 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.8 },
        );
        pen.rect(g, loadX - bw / 2, top, bw, bh, "ruler", pen.fill("tang"), { strokeWidth: 2.2 });
        patch(c, loadX, top + bh / 2, 46, 18);
        num(c, loadX, top + bh / 2 + 5, `${p.load} ${p.unit}`, 14);
        a.load = [loadX, top + bh, "down"];
        // the free end, pulled down
        const fx = (xs[n - 1] ?? 0) + r,
            pull = pulleyPull(p.load, n);
        const label =
            p.show > 0 ? `${Number.isInteger(pull) ? pull : pull.toFixed(1)} ${p.unit}` : "?";
        pen.line(g, fx, yF, fx, 8.8 * U, "ruler", rope);
        pushDown(c, fx, 12.2 * U, 3.2 * U, label);
        a.pull = [fx, 12.2 * U, "down"];
        cap(c, 7 * U, 14.4 * U, n === 1 ? "1 rope holds it" : `${n} ropes hold it`, 11);
        return a;
    },
    describe: () =>
        "A load hung from pulleys with one rope running over wheels on a beam and wheels on the load, its free end pulled down by a hand.",
    reads: true,
});
