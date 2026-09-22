import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { slot } from "./blank";

/** Two squares per digit, plus the divisor, the bracket and room for "r ▢". */
const busStopWidth = (n: string, by: string): number =>
    Math.ceil(by.length * 1.5 + n.length * 1.6 + 6);

export const busStop = defineDrawing({
    id: "longdiv",
    family: "sums",
    title: "Bus stop division",
    group: "Structures",
    about: "The short division frame: the divisor outside, the dividend under the bar, the quotient and the remainder to fill in.",
    params: { n: "94", by: "7", quotient: "", remainder: "" },
    settings: {
        n: { kind: "text", most: 4 },
        by: { kind: "text", most: 2 },
        quotient: { kind: "text", most: 4 },
        remainder: { kind: "text", most: 2 },
    },
    takes: [
        { label: "Empty", params: { n: "94", by: "7", quotient: "", remainder: "" } },
        { label: "With the answer", params: { n: "94", by: "7", quotient: "13", remainder: "3" } },
    ],
    box: (p) => ({ w: busStopWidth(p.n, p.by), h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            dw = p.by.length * 1.5 * U,
            bar = 2.4 * U;
        const x0 = U / 2,
            x1 = x0 + dw,
            nw = p.n.length * 1.6 * U;
        say(c, x0 + dw / 2, bar + 22, p.by, 22);
        pen.line(g, x1, bar, x1, bar + 1.7 * U, "ruler", { strokeWidth: 2 });
        pen.line(g, x1, bar, x1 + nw + 8, bar, "ruler", { strokeWidth: 2 });
        say(c, x1 + 10 + nw / 2, bar + 22, p.n, 22);
        slot(c, x1 + 8, bar - 1.9 * U, nw, 1.7 * U, p.quotient || undefined);
        say(c, x1 + nw + 28, bar - 6, "r", 18, "start");
        slot(c, x1 + nw + 44, bar - 1.9 * U, 1.6 * U, 1.7 * U, p.remainder || undefined);
        return { bar: [x1 + nw / 2, bar, "up"], divisor: [x0 + dw / 2, bar, "up"] };
    },
    describe: () =>
        "A bus stop division frame, the divisor outside the bracket, the dividend under the bar, and boxes above for the quotient and the remainder.",
});
