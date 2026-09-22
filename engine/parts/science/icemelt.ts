import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, soft } from "../lettering";
import { lightFill, gleam } from "./apparatus";
import { ICE_PLACES, iceLeft } from "./substances";

export const icemelt = defineDrawing({
    id: "icemelt",
    family: "science",
    title: "Ice melting",
    group: "Structures",
    about: "The same ice cube on a saucer, looked at every few minutes: the cube shrinks, the puddle round it grows, and a tag under each says how long it has been. `place` is where the saucer is (0 the freezer, 1 the table, 2 the sun), and how fast it melts there is one rule, a quarter of the cube every ten minutes on the table and twice that in the sun, so the pictures and the answer key agree. `blank` hides one saucer under a question mark, for a prediction.",
    params: { every: 10, count: 4, place: 1, blank: -1, words: 1 },
    settings: {
        every: { kind: "whole", min: 1, max: 60 },
        count: { kind: "whole", min: 2, max: 5 },
        place: { kind: "whole", min: 0, max: 2 },
        blank: { kind: "whole", min: -1, max: 4 },
        words: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "On the table", params: { every: 10, count: 5, place: 1, blank: -1, words: 1 } },
        { label: "In the sun", params: { every: 10, count: 3, place: 2, blank: -1, words: 1 } },
        { label: "In the freezer", params: { every: 10, count: 3, place: 0, blank: -1, words: 1 } },
        {
            label: "What comes next?",
            params: { every: 10, count: 4, place: 1, blank: 3, words: 1 },
        },
    ],
    box: (p) => ({ w: Math.max(2, Math.min(5, Math.round(p.count))) * 5 + 1, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            n = Math.max(2, Math.min(5, Math.round(p.count))),
            place = Math.max(0, Math.min(2, Math.round(p.place)));
        if (p.words > 0) soft(c, 0.6 * U, 1 * U, ICE_PLACES[place]?.name ?? "", 13, "start");
        const right = (n * 5 + 1) * U - 1.2 * U;
        if (place === 2) {
            for (let k = 0; k < 8; k++) {
                const th = (k / 8) * Math.PI * 2;
                pen.line(
                    g,
                    right + Math.cos(th) * 0.75 * U,
                    1.1 * U + Math.sin(th) * 0.75 * U,
                    right + Math.cos(th) * 1.05 * U,
                    1.1 * U + Math.sin(th) * 1.05 * U,
                    "pencil",
                    { strokeWidth: 1.4 },
                );
            }
            pen.circle(g, right, 1.1 * U, 1.2 * U, "pencil", lightFill(c, "glow", "solid"), {
                strokeWidth: 1.6,
            });
        } else if (place === 0) {
            for (let k = 0; k < 3; k++) {
                const th = (k / 3) * Math.PI;
                pen.line(
                    g,
                    right - Math.cos(th) * 0.7 * U,
                    1.1 * U - Math.sin(th) * 0.7 * U,
                    right + Math.cos(th) * 0.7 * U,
                    1.1 * U + Math.sin(th) * 0.7 * U,
                    "pencil",
                    { strokeWidth: 1.6, stroke: c.paper ? t.ink : t.pen },
                );
            }
        }
        for (let i = 0; i < n; i++) {
            const x = (3 + i * 5) * U,
                base = 5.9 * U,
                minutes = i * p.every,
                left = iceLeft(minutes, place) / 4,
                melt = 1 - left;
            pen.ellipse(g, x, base, 4.4 * U, 1.4 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.7,
            });
            pen.ellipse(g, x, base - 0.08 * U, 3.3 * U, 0.85 * U, "pencil", null, {
                strokeWidth: 0.9,
                stroke: t["ink-soft"],
            });
            if (i === Math.round(p.blank)) {
                penned(c, x, base - 0.6 * U, "?", 32);
            } else {
                if (melt > 0)
                    pen.ellipse(
                        g,
                        x,
                        base - 0.05 * U,
                        (1.3 + 2.1 * melt) * U,
                        (0.35 + 0.5 * melt) * U,
                        "pencil",
                        pen.fill("sky"),
                        { strokeWidth: 1.2 },
                    );
                if (left > 0) {
                    const s = (0.7 + 1.5 * Math.sqrt(left)) * U,
                        dx = s * 0.34,
                        dy = s * 0.26,
                        l = x - s / 2 - dx / 2,
                        top = base - 0.15 * U - s * 0.9;
                    const ice = pen.fill("sky", "hachure", { hachureGap: 7, fillWeight: 0.6 });
                    pen.path(
                        g,
                        `M${l + 5} ${top}L${l + dx + 5} ${top - dy}H${l + s + dx - 5}L${l + s - 5} ${top}Z`,
                        "pencil",
                        ice,
                        { strokeWidth: 1.4 },
                    );
                    pen.path(
                        g,
                        `M${l + s - 3} ${top + 2}L${l + s + dx - 3} ${top - dy + 3}V${top + s * 0.9 - dy - 4}L${l + s - 3} ${top + s * 0.9 - 4}Z`,
                        "pencil",
                        pen.fill("sky", "hachure", { hachureGap: 4.5, fillWeight: 0.6 }),
                        { strokeWidth: 1.4 },
                    );
                    pen.path(
                        g,
                        roundedRect(l, top, s, s * 0.9, left < 1 ? s * 0.22 : 4),
                        "pencil",
                        pen.fill("card"),
                        { strokeWidth: 1.7 },
                    );
                    gleam(c, l + 0.22 * s, top + 0.2 * s, top + 0.55 * s, 2.4);
                    if (left < 1)
                        pen.path(
                            g,
                            `M${l + s * 0.7} ${top + s * 0.9}q-3 6 0 9q3 -3 0 -9Z`,
                            "pencil",
                            pen.fill("sky"),
                            { strokeWidth: 1 },
                        );
                }
            }
            patch(c, x, 7.8 * U - 5, 3.4 * U, 20);
            num(c, x, 7.9 * U, `${minutes} min`, 14);
            a[`saucer(${i})`] = [x, base - 2.6 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A row of saucers with an ice cube on each, looked at a few minutes apart${p.words > 0 ? `, ${ICE_PLACES[Math.max(0, Math.min(2, Math.round(p.place)))]?.name ?? "on the table"}` : ""}, the minutes written under each${p.blank >= 0 ? ", one hidden under a question mark" : ""}.`,
    reads: true,
});
