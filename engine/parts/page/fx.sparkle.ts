import { defineDrawing } from "../drawing";
import { MARKERS, MARKER_WORD, type Marker } from "../../paper";

type Pt = [number, number];

interface SparkleParams {
    tone: Marker;
}

export const sparkle = defineDrawing<SparkleParams>({
    id: "fx.sparkle",
    family: "page",
    title: "Sparkle",
    group: "Marks",
    about: "A four-pointed twinkle in marker with a pen outline, the size of a square. A handful of them fly up where something has just gone right.",
    params: { tone: "glow" },
    settings: { tone: { kind: "one of", of: MARKERS } },
    takes: [
        { label: "Yellow", params: { tone: "glow" } },
        { label: "Pink", params: { tone: "berry" } },
        { label: "Blue", params: { tone: "sky" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p) => {
        const pts: Pt[] = [];
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2,
                r = i % 2 ? 2.6 : 8.6;
            pts.push([10 + Math.cos(a) * r, 10 + Math.sin(a) * r]);
        }
        const tone: Marker =
            (["sky", "mint", "berry", "tang", "glow"] as const).find((t) => t === p.tone) ?? "glow";
        c.pen.polygon(c.g, pts, "ruler", c.pen.fill(tone), {
            strokeWidth: 1.2,
            roughness: 0.4,
            disableMultiStroke: true,
            preserveVertices: true,
        });
        return { centre: [10, 10, "up"] };
    },
    describe: (p) =>
        `A four-pointed ${MARKER_WORD[MARKERS.find((t) => t === p.tone) ?? "glow"]} sparkle the size of one square, drawn in marker with a pen outline, its long points up, down, left and right.`,
});
