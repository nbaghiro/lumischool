import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export const bus = defineDrawing({
    id: "bus",
    family: "travel",
    title: "Bus",
    group: "Props",
    about: "A bus with countable windows and someone in some of them. Getting on and getting off is the story every addition and subtraction of a two-digit number can be told as.",
    params: { windows: 5, on: 3, sign: "12" },
    settings: {
        windows: { kind: "whole", min: 1, max: 8 },
        on: { kind: "whole", min: 0, max: 8 },
        sign: { kind: "text", most: 4 },
    },
    takes: [
        { label: "Five windows, three on", params: { windows: 5, on: 3, sign: "12" } },
        { label: "A full bus", params: { windows: 6, on: 6, sign: "7A" } },
        { label: "Empty", params: { windows: 4, on: 0, sign: "3" } },
    ],
    box: (p) => ({ w: p.windows * 2 + 7, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = (p.windows * 2 + 6) * U,
            x = U / 2,
            top = 1.4 * U,
            bottom = 5.6 * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${x + 18} ${top}H${x + w - 30}Q${x + w} ${top} ${x + w} ${top + 40}V${bottom}H${x}V${top + 18}Q${x} ${top} ${x + 18} ${top}Z`,
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 9, fillWeight: 0.6 }),
            { strokeWidth: 2.6 },
        );
        pen.rect(g, x + 0.5 * U, top + 0.4 * U, 2.4 * U, 1 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        say(c, x + 1.7 * U, top + 1.1 * U, p.sign, 15);
        for (let i = 0; i < p.windows; i++) {
            const wx = x + (3.6 + i * 2) * U,
                wy = top + 0.6 * U;
            pen.rect(g, wx, wy, 1.6 * U, 1.6 * U, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
            if (i < p.on) {
                pen.circle(g, wx + 0.8 * U, wy + 0.72 * U, 17, "pencil", pen.fill("card"), {
                    strokeWidth: 1.3,
                });
                pen.path(
                    g,
                    `M${wx + 0.8 * U - 15} ${wy + 1.6 * U}Q${wx + 0.8 * U} ${wy + 1.05 * U} ${wx + 0.8 * U + 15} ${wy + 1.6 * U}Z`,
                    "pencil",
                    pen.fill("sky", "solid", { hachureGap: 4 }),
                    { strokeWidth: 1.3 },
                );
            }
            a[`window(${i})`] = [wx + 0.8 * U, wy, "up"];
        }
        pen.rect(g, x + w - 1.6 * U, top + 0.6 * U, 1.2 * U, 2.4 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        for (const wx of [x + 2 * U, x + w - 3 * U]) {
            pen.circle(
                g,
                wx,
                bottom,
                1.5 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 2 },
            );
            pen.circle(g, wx, bottom, 0.6 * U, "pencil", pen.fill("card"), { strokeWidth: 1.2 });
        }
        pen.line(g, x - 10, bottom + 1.5 * U, x + w + 10, bottom + 1.5 * U, "pencil", {
            strokeWidth: 2,
        });
        a.bus = [x + w / 2, top, "up"];
        a.door = [x + w - U, top + 3 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A bus seen from the side with a row of square windows, ${p.on <= 0 ? "nobody at the windows" : p.on >= p.windows ? "someone looking out of every window" : "someone looking out of some of them"}, a door at the back and a sign at the front.`,
});
