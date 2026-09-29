import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, say, slot } from "../lettering";

export const timeline = defineDrawing({
    id: "timeline",
    family: "time",
    title: "Timeline",
    group: "Structures",
    about: "A scale of years with events pegged to it, four squares to a step. Labels alternate above and below the line so two close dates do not collide. A lesson gives the events as years and labels, and can leave one label empty for the child to fill.",
    params: {
        from: 1900,
        to: 2000,
        step: 20,
        unit: "",
        events: [
            { at: 1912, label: "Ship sails" },
            { at: 1969, label: "Moon" },
        ] as { at: number; label: string }[],
        years: [] as number[],
        labels: [] as string[],
        blank: -1,
    },
    settings: {
        from: { kind: "whole", min: 0, max: 3000 },
        to: { kind: "whole", min: 1, max: 3000 },
        step: { kind: "whole", min: 1, max: 1000 },
        unit: { kind: "text", most: 6 },
        events: { kind: "fixed" },
        years: { kind: "numbers", min: 0, max: 3000, most: 8 },
        labels: { kind: "words", most: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
    },
    takes: [
        {
            label: "A century",
            params: {
                from: 1900,
                to: 2000,
                step: 20,
                unit: "",
                events: [
                    { at: 1912, label: "Ship sails" },
                    { at: 1969, label: "Moon" },
                ],
                years: [],
                labels: [],
                blank: -1,
            },
        },
        {
            label: "A school year",
            params: {
                from: 0,
                to: 12,
                step: 2,
                unit: "months",
                events: [
                    { at: 3, label: "Term ends" },
                    { at: 8, label: "Trip" },
                ],
                years: [],
                labels: [],
                blank: -1,
            },
        },
        {
            label: "Bare scale",
            params: {
                from: 1500,
                to: 2000,
                step: 100,
                unit: "",
                events: [],
                years: [],
                labels: [],
                blank: -1,
            },
        },
        {
            label: "A lesson's dates, one label to fill",
            params: {
                from: 1780,
                to: 2020,
                step: 40,
                unit: "",
                events: [],
                years: [1796, 1852, 1895, 1961, 1994],
                labels: ["Opens", "Railway", "Big freeze", "Closes", ""],
                blank: 4,
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, Math.round((p.to - p.from) / (p.step || 1))) * 4 + 4, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            step = p.step || 1,
            steps = Math.max(1, Math.round((p.to - p.from) / step));
        const y = 4.5 * U,
            x = (v: number) => 2 * U + ((v - p.from) / step) * 4 * U,
            a: RawAnchors = {};
        pen.line(g, x(p.from) - 14, y, x(p.to) + 14, y, "ruler", { strokeWidth: 2.4 });
        for (let i = 0; i <= steps; i++) {
            const v = p.from + i * step;
            pen.line(g, x(v), y - 7, x(v), y + 7, "ruler", { strokeWidth: 1.6 });
            num(c, x(v), y + 26, v, 14);
            a[`tick(${v})`] = [x(v), y + 7, "down"];
        }
        if (p.unit) cap(c, 2 * U, U, p.unit, 12, "start");
        const events = p.years.length
            ? p.years.map((at, i) => ({ at, label: p.labels[i] ?? "" }))
            : p.events;
        events.forEach((e, i) => {
            const ex = x(e.at),
                up = i % 2 === 0,
                ty = up ? y - 2.1 * U : y + 2.5 * U;
            pen.line(g, ex, y, ex, ty + (up ? 14 : -14), "pencil", {
                strokeWidth: 1.5,
                stroke: c.t.pen,
            });
            pen.circle(g, ex, y, 11, "ruler", pen.fill("berry"), { strokeWidth: 1.6 });
            if (i === p.blank) slot(c, ex - 2.2 * U, ty - (up ? 0.7 : 0.6) * U, 4.4 * U, 1.5 * U);
            else say(c, ex, ty, e.label, 14, "middle", c.t.pen);
            a[`event(${i})`] = [ex, up ? ty - 12 : ty + 6, up ? "up" : "down"];
        });
        return a;
    },
    describe: () =>
        "A timeline ruled across the page with years marked at even steps, and events written on flags standing up from it at their years.",
});
