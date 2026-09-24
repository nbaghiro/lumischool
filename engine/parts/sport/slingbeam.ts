import { U } from "../../paper";
import { defineDrawing } from "../drawing";
interface BeamParams {
    length: number;
    material: "timber" | "stone";
}
export const slingBeam = defineDrawing<BeamParams>({
    id: "slingbeam",
    family: "sport",
    title: "Building beam",
    group: "Props",
    about: "A rectangular building beam, either timber with long grain or a heavier grey stone lintel with small seams. Its outline is the physical rectangle.",
    params: { length: 5, material: "timber" },
    settings: {
        length: { kind: "number", min: 1, max: 15, step: 0.5 },
        material: { kind: "one of", of: ["timber", "stone"] },
    },
    takes: [
        { label: "Timber beam", params: { length: 5, material: "timber" } },
        { label: "Stone lintel", params: { length: 6, material: "stone" } },
    ],
    box: (p) => ({ w: p.length, h: 1 }),
    draw: (c, p) => {
        const w = p.length * U;
        c.pen.rect(
            c.g,
            0,
            0,
            w,
            U,
            "pencil",
            c.pen.fill(p.material === "timber" ? "tang" : "grid", "solid"),
            { strokeWidth: 1.8, roughness: 0.3 },
        );
        if (p.material === "timber") {
            c.pen.line(c.g, 0.2 * U, 0.38 * U, w - 0.15 * U, 0.32 * U, "pencil", {
                strokeWidth: 0.65,
                stroke: c.t["ink-soft"],
            });
            c.pen.line(c.g, 0.2 * U, 0.73 * U, w - 0.2 * U, 0.65 * U, "pencil", {
                strokeWidth: 0.65,
                stroke: c.t["ink-soft"],
            });
            c.pen.ellipse(c.g, w * 0.6, U * 0.5, 0.5 * U, 0.15 * U, "pencil", null, {
                strokeWidth: 0.6,
            });
        } else {
            for (let x = 1.7 * U; x < w - 0.2 * U; x += 2 * U)
                c.pen.line(c.g, x, 0.1 * U, x + 0.15 * U, 0.9 * U, "pencil", {
                    strokeWidth: 0.7,
                    stroke: c.t["ink-soft"],
                });
            c.pen.line(c.g, 0.16 * U, 0.8 * U, w - 0.16 * U, 0.8 * U, "pencil", {
                strokeWidth: 0.5,
                stroke: c.t["ink-soft"],
            });
        }
        return {};
    },
    describe: (p) =>
        p.material === "timber"
            ? "A long warm wooden beam seen from the side, with a dark rectangular outline, two lines of grain and a small knot."
            : "A heavy grey stone lintel seen from the side, with a dark rectangular outline, small vertical seams and a line along its lower edge.",
});
