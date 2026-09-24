import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { wash } from "../outdoors/wash";

export const golfGreen = defineDrawing({
    id: "golfgreen",
    family: "sport",
    title: "Garden putting green",
    group: "Structures",
    about: "A quiet top-down putting lawn, with a pencil border and alternating pale mowing stripes. Its rectangle is the playable boundary.",
    params: { width: 30, height: 20 },
    settings: {
        width: { kind: "number", min: 4, max: 60, step: 1 },
        height: { kind: "number", min: 4, max: 40, step: 1 },
    },
    takes: [
        { label: "Garden course", params: { width: 30, height: 20 } },
        { label: "Small lawn", params: { width: 16, height: 10 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const w = p.width * U,
            h = p.height * U;
        wash(c, `M0 0H${w}V${h}H0Z`, "mint", 0.22, false);
        for (let x = 0; x < w; x += 4 * U) {
            const end = Math.min(w, x + 2 * U);
            wash(c, `M${x} 0H${end}V${h}H${x}Z`, "mint", 0.12, false);
        }
        c.pen.rect(c.g, 0, 0, w, h, "pencil", null, { strokeWidth: 2.4, roughness: 0.45 });
        c.pen.rect(c.g, 0.18 * U, 0.18 * U, w - 0.36 * U, h - 0.36 * U, "pencil", null, {
            strokeWidth: 0.7,
            stroke: c.t.mint,
            roughness: 0.4,
        });
        return { centre: [w / 2, h / 2, "up"] };
    },
    describe: () =>
        "A rectangular garden putting green, washed mint green with pale mowing stripes and a dark pencil border around the playable lawn.",
});
