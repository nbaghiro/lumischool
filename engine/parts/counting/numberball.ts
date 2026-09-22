import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

interface NumberBallParams {
    n: string;
    tone: Marker;
}

export const numberBall = defineDrawing<NumberBallParams>({
    id: "numberball",
    family: "counting",
    title: "Number ball",
    group: "Props",
    about: "A round ball in one colour with a number on a white patch in the middle, the kind that is dropped into a machine and rolls out again.",
    params: { n: "4", tone: "sky" },
    settings: { n: { kind: "text", most: 3 }, tone: { kind: "one of", of: MARKERS } },
    takes: [
        { label: "4 in blue", params: { n: "4", tone: "sky" } },
        { label: "12 in pink", params: { n: "12", tone: "berry" } },
        { label: "7 in yellow", params: { n: "7", tone: "glow" } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 1.5 * U,
            cy = 1.5 * U,
            r = 1.05 * U;
        const n = String(p.n),
            size = n.length > 2 ? 13 : n.length > 1 ? 17 : 19,
            tone = MARKERS.find((t) => t === p.tone) ?? "sky";
        pen.circle(g, cx, cy, 2 * r, "ruler", pen.fill(tone, "solid"), { strokeWidth: 2.2 });
        if (!c.paper)
            pen.arc(g, cx, cy, 1.76 * U, 1.76 * U, Math.PI * 1.08, Math.PI * 1.42, "ruler", {
                strokeWidth: 2.4,
                stroke: c.t.card,
                disableMultiStroke: true,
            });
        pen.circle(g, cx, cy, 1.4 * U, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
        num(c, cx, cy + size * 0.36, n, size);
        return { centre: [cx, cy, "right"], top: [cx, 0.4 * U, "up"] };
    },
    describe: (p) =>
        `A round ${MARKER_WORD[p.tone]} ball with a shine on its edge and a number written on a white patch in its middle.`,
});
