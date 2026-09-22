import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, numOn, say } from "../lettering";
import { ICONS, icon, lines } from "./pictures";

export const storyMap = defineDrawing({
    id: "storymap",
    family: "stories",
    title: "A story map",
    group: "Structures",
    about: "A story drawn as a path with stops along it: a small picture over each stop and what happened there under it, numbered in the order it happened. One stop can be left empty for the child to fill, and the stops can carry headings such as start, problem and end.",
    params: {
        stops: ["Ada sets off", "The bridge is down", "She borrows a boat", "Home for tea"],
        icons: ["cottage", "bridge", "boat", "cake"],
        heads: [] as string[],
        blank: -1,
    },
    settings: {
        stops: { kind: "words", most: 6 },
        icons: { kind: "words", most: 6, of: ICONS },
        heads: { kind: "words", most: 6 },
        blank: { kind: "whole", min: -1, max: 5 },
    },
    takes: [
        {
            label: "Four stops",
            params: {
                stops: ["Ada sets off", "The bridge is down", "She borrows a boat", "Home for tea"],
                icons: ["cottage", "bridge", "boat", "cake"],
                heads: [],
                blank: -1,
            },
        },
        {
            label: "Headings, one to fill",
            params: {
                stops: ["A fox lives in the wood", "The fox is hungry", "", "The fox has a feast"],
                icons: ["tree", "fox", "hen", "nest"],
                heads: ["Start", "Problem", "Fix", "End"],
                blank: 2,
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.stops.length) * 8 + 1, h: p.heads.length ? 14 : 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, p.stops.length),
            dy = p.heads.length ? 1 : 0,
            a: RawAnchors = {};
        const xs = p.stops.map((_, i) => (4.5 + i * 8) * U),
            path = (6.9 + dy) * U;
        const wob = (i: number) => (i % 2 ? -0.35 : 0.35) * U;
        const pts: [number, number][] = [
            [0.4 * U, path],
            ...xs.map((x, i) => [x, path + wob(i)] as [number, number]),
            [(n * 8 + 0.6) * U, path],
        ];
        pen.curve(g, pts, "pencil", {
            strokeWidth: 2.2,
            strokeLineDash: [9, 7],
            stroke: c.t["ink-soft"],
        });
        p.stops.forEach((stop, i) => {
            const x = xs[i] ?? 0,
                y = path + wob(i);
            if (p.heads[i]) cap(c, x, 1.1 * U, p.heads[i] ?? "", 11);
            const ib = (5.5 + dy) * U;
            icon(
                group(c, {
                    turn: [
                        ["translate", x, ib],
                        ["scale", 1.25],
                        ["translate", -x, -ib],
                    ],
                }),
                p.icons[i] ?? "",
                x,
                ib,
            );
            pen.circle(g, x, y, 1.5 * U, "ruler", pen.fill(i === p.blank ? "card" : "glow"), {
                strokeWidth: 1.8,
            });
            numOn(c, x, y + 6, String(i + 1), 16);
            if (i === p.blank || !stop) {
                for (const k of [0, 1])
                    pen.line(
                        g,
                        x - 3.2 * U,
                        (9.9 + dy + k * 1.5) * U,
                        x + 3.2 * U,
                        (9.9 + dy + k * 1.5) * U,
                        "ruler",
                        { strokeWidth: 1.4 },
                    );
            } else
                lines(stop, 17)
                    .slice(0, 3)
                    .forEach((line, k) => say(c, x, (9.4 + dy + k * 1.3) * U, line, 14));
            a[`stop(${i})`] = [x, y - 0.8 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A dashed path with numbered stops along it, a small picture over each stop and a sentence under it${p.heads.length ? ", with a heading over each" : ""}${p.blank >= 0 ? ", one stop left blank" : ""}.`,
});
