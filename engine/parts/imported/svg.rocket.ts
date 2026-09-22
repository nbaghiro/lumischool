import { svgDrawing } from "./hand";

export const rocket = svgDrawing({
    name: "rocket",
    family: "travel",
    title: "Rocket",
    about: "A rocket with a porthole, a panelled body, rivets and a flame, for counting down and for anything that needs a journey with a start. Anchors at the nose, the window, a fin and the flame. Hand-drawn SVG.",
    describe:
        "A rocket standing upright with a round porthole, a panelled body with rivets, fins at its base and a flame coming out underneath.",
    motion: {
        body: { is: "bob", lift: 0.03, arc: 0, deg: 0, period: 2.7 },
        parts: {
            flame: {
                is: "twinkle",
                of: [[16, 17]],
                dim: 0.15,
                amt: 0.12,
                period: 1.7,
                origin: [0.5, 0],
            },
        },
    },
});
