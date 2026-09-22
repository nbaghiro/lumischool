import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

type Pt = [number, number];

export const solid = defineDrawing({
    id: "solid",
    family: "shapes",
    title: "Solid",
    group: "Props",
    about: "A three-dimensional shape in the same pencil as everything else, with the edges you could not see dashed. Enough for naming faces, edges and vertices, and for asking which net folds into it.",
    params: { kind: "cube", label: "" },
    settings: {
        kind: {
            kind: "one of",
            of: ["cube", "cuboid", "sphere", "cylinder", "cone", "pyramid", "prism"],
        },
        label: { kind: "text", most: 12 },
    },
    takes: [
        { label: "Cube", params: { kind: "cube", label: "cube" } },
        { label: "Cuboid", params: { kind: "cuboid", label: "cuboid" } },
        { label: "Cylinder", params: { kind: "cylinder", label: "cylinder" } },
        { label: "Cone", params: { kind: "cone", label: "cone" } },
        { label: "Square pyramid", params: { kind: "pyramid", label: "pyramid" } },
        { label: "Triangular prism", params: { kind: "prism", label: "prism" } },
        { label: "Sphere, unlabelled", params: { kind: "sphere", label: "" } },
    ],
    box: () => ({ w: 8, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            d = 1.5 * U,
            x = 1.4 * U,
            y = 2.2 * U,
            w = 4 * U,
            h = 4 * U;
        const hid = { strokeWidth: 1.2, strokeLineDash: [6, 5], stroke: c.t["ink-soft"] };
        const fill = (m: Marker) => pen.fill(m, "solid", { hachureGap: 8, fillWeight: 0.6 });
        const a: RawAnchors = {
            middle: [x + w / 2, y + h / 2, "up"],
            top: [x + w / 2 + d / 2, y - d / 2, "up"],
        };
        if (p.kind === "cylinder" || p.kind === "cone") {
            const cx = x + w / 2,
                ry = 0.6 * U,
                base = y + h;
            if (p.kind === "cylinder") {
                pen.path(
                    g,
                    `M${x} ${y}V${base}A${w / 2} ${ry} 0 0 0 ${x + w} ${base}V${y}`,
                    "ruler",
                    fill("mint"),
                    { strokeWidth: 1.8 },
                );
                pen.arc(g, cx, base, w, ry * 2, 0, Math.PI, "ruler", { strokeWidth: 1.8 });
                pen.arc(g, cx, base, w, ry * 2, Math.PI, 2 * Math.PI, "ruler", hid);
                pen.ellipse(g, cx, y, w, ry * 2, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
            } else {
                pen.path(g, `M${x} ${base}L${cx} ${y}L${x + w} ${base}`, "ruler", fill("tang"), {
                    strokeWidth: 1.8,
                });
                pen.arc(g, cx, base, w, ry * 2, 0, Math.PI, "ruler", { strokeWidth: 1.8 });
                pen.arc(g, cx, base, w, ry * 2, Math.PI, 2 * Math.PI, "ruler", hid);
            }
        } else if (p.kind === "sphere") {
            pen.circle(g, x + w / 2, y + h / 2, w, "ruler", fill("berry"), { strokeWidth: 2 });
            pen.arc(g, x + w / 2, y + h / 2, w, 0.9 * U, 0, Math.PI, "ruler", { strokeWidth: 1.2 });
            pen.arc(g, x + w / 2, y + h / 2, w, 0.9 * U, Math.PI, 2 * Math.PI, "ruler", hid);
        } else if (p.kind === "pyramid") {
            const apex: Pt = [x + w / 2 + d / 2, y - d / 2];
            const A: Pt = [x, y + h],
                B: Pt = [x + w, y + h],
                C: Pt = [x + w + d, y + h - d],
                D: Pt = [x + d, y + h - d];
            pen.polygon(g, [A, B, apex], "ruler", fill("glow"), { strokeWidth: 1.8 });
            pen.polygon(g, [B, C, apex], "ruler", fill("tang"), { strokeWidth: 1.8 });
            pen.linear(g, [A, D, C], "ruler", hid);
            pen.line(g, D[0], D[1], apex[0], apex[1], "ruler", hid);
        } else if (p.kind === "prism") {
            const A: Pt = [x, y + h],
                B: Pt = [x + w, y + h],
                T: Pt = [x + w / 2, y];
            const off = ([px, py]: Pt): Pt => [px + d, py - d];
            pen.polygon(g, [A, B, T], "ruler", fill("sky"), { strokeWidth: 1.8 });
            pen.polygon(g, [B, off(B), off(T), T], "ruler", fill("mint"), { strokeWidth: 1.8 });
            pen.linear(g, [A, off(A), off(T)], "ruler", hid);
            pen.line(g, off(A)[0], off(A)[1], off(B)[0], off(B)[1], "ruler", hid);
        } else {
            const ww = p.kind === "cuboid" ? 5 * U : w;
            const A: Pt = [x, y],
                B: Pt = [x + ww, y],
                C: Pt = [x + ww, y + h],
                D: Pt = [x, y + h];
            const off = ([px, py]: Pt): Pt => [px + d, py - d];
            pen.polygon(g, [A, B, off(B), off(A)], "ruler", pen.fill("card"), { strokeWidth: 1.6 });
            pen.polygon(g, [B, C, off(C), off(B)], "ruler", fill("sky"), { strokeWidth: 1.6 });
            pen.polygon(g, [A, B, C, D], "ruler", fill("sky"), { strokeWidth: 2 });
            pen.linear(g, [off(A), [off(A)[0], off(A)[1] + h], off(C)], "ruler", hid);
            pen.line(g, D[0], D[1], off(D)[0], off(D)[1], "ruler", hid);
            a.middle = [x + ww / 2, y + h / 2, "up"];
        }
        if (p.label) say(c, 4 * U, 7.4 * U, p.label, 16);
        return a;
    },
    describe: (p) =>
        `A three-dimensional solid drawn in oblique view with its hidden edges dashed and its visible faces shaded${p.label ? ", with a label written under it" : ""}.`,
});
