import { type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

const SEG: Record<string, [number, number, number, number]> = {
    a: [0, 0, 1, 0],
    b: [1, 0, 1, 1],
    c: [1, 1, 1, 2],
    d: [0, 2, 1, 2],
    e: [0, 1, 0, 2],
    f: [0, 0, 0, 1],
    g: [0, 1, 1, 1],
};

const DIGIT: Record<string, string> = {
    "0": "abcdef",
    "1": "bc",
    "2": "abged",
    "3": "abgcd",
    "4": "fgbc",
    "5": "afgcd",
    "6": "afgedc",
    "7": "abc",
    "8": "abcdefg",
    "9": "abcdfg",
};

export const matchsticks = defineDrawing({
    id: "matchsticks",
    family: "puzzles",
    title: "Matchsticks",
    group: "Structures",
    about: "Seven-segment digits made of sticks, for move-one-stick puzzles.",
    params: { eq: "3+5=8" },
    settings: { eq: { kind: "text", most: 9 } },
    takes: [
        { label: "True", params: { eq: "3+5=8" } },
        { label: "Move one stick", params: { eq: "6+4=4" } },
        { label: "Taking away", params: { eq: "10-7=3" } },
    ],
    box: (p) => ({ w: Math.ceil((p.eq.length * 42 + 10) / 20), h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            u = 30,
            top = 15,
            a: RawAnchors = {};
        const stick = (x1: number, y1: number, x2: number, y2: number) => {
            pen.line(g, x1, y1, x2, y2, "ruler", {
                strokeWidth: 3.6,
                stroke: c.paper ? c.t.ink : c.t.tang,
            });
            pen.circle(g, x2, y2, 5.5, "ruler", pen.fill("berry"), { strokeWidth: 1 });
        };
        Array.from(p.eq).forEach((ch, i) => {
            const x = 14 + i * 42;
            if (DIGIT[ch]) {
                for (const s of DIGIT[ch]) {
                    const [x1, y1, x2, y2] = SEG[s] ?? [0, 0, 0, 0],
                        ix = x1 === x2 ? 0 : 5,
                        iy = y1 === y2 ? 0 : 5;
                    stick(x + x1 * u + ix, top + y1 * u + iy, x + x2 * u - ix, top + y2 * u - iy);
                }
                a[`digit(${i})`] = [x + u / 2, top + 2 * u + 6, "down"];
            } else if (ch === "+") {
                stick(x, top + u, x + u, top + u);
                stick(x + u / 2, top + u - 14, x + u / 2, top + u + 14);
            } else if (ch === "-") stick(x, top + u, x + u, top + u);
            else if (ch === "=") {
                stick(x, top + u - 7, x + u, top + u - 7);
                stick(x, top + u + 7, x + u, top + u + 7);
            }
        });
        return a;
    },
    describe: () =>
        "Digits and signs made of orange matchsticks with pink heads, each digit in seven segments as on a calculator, written as a sum.",
});
