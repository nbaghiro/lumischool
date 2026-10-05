import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const ENDS = ["in", "out"] as const;

export const golfPipe = defineDrawing<{ end: string }>({
    id: "golfpipe",
    family: "sport",
    title: "Putting pipe",
    group: "Props",
    about: "One end of a pipe under a putting course, seen from above as a round mouth in a collar: a ball that rolls into the way in comes out at the way out.",
    params: { end: "in" },
    settings: { end: { kind: "one of", of: ENDS } },
    takes: [
        { label: "The way in", params: { end: "in" } },
        { label: "The way out", params: { end: "out" } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        c.pen.circle(c.g, U, U, 1.8 * U, "pencil", c.pen.fill("sky", "solid"), {
            strokeWidth: 1.6,
            roughness: 0.25,
        });
        c.pen.circle(c.g, U, U, 1.1 * U, "pencil", c.pen.fill("ink", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.2,
        });
        // an arrow over the mouth says which way the ball goes: down into it, or up out of it
        const tip = p.end === "out" ? 0.62 * U : 1.38 * U,
            tail = p.end === "out" ? 1.38 * U : 0.62 * U,
            head = p.end === "out" ? 0.25 * U : -0.25 * U;
        c.pen.line(c.g, U, tail, U, tip, "ruler", { strokeWidth: 1.4, stroke: c.t.paper });
        c.pen.line(c.g, U - 0.25 * U, tip + head, U, tip, "ruler", {
            strokeWidth: 1.4,
            stroke: c.t.paper,
        });
        c.pen.line(c.g, U + 0.25 * U, tip + head, U, tip, "ruler", {
            strokeWidth: 1.4,
            stroke: c.t.paper,
        });
        return { mouth: [U, U, "up"] };
    },
    describe: (p) =>
        p.end === "out"
            ? "The far end of a pipe under a putting course, a dark round mouth in a blue collar with a pale arrow pointing up out of it."
            : "The near end of a pipe under a putting course, a dark round mouth in a blue collar with a pale arrow pointing down into it.",
});
