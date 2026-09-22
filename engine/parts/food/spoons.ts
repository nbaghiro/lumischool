import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const measuringSpoons = defineDrawing({
    id: "spoons",
    family: "food",
    title: "Measuring spoons",
    group: "Props",
    about: "A set of spoons on a ring, hung largest to smallest with the size written under each one. Half and quarter spoons are where a fraction is an amount of something rather than a part of a shape.",
    params: { sizes: ["1 tbsp", "1 tsp", "1/2 tsp", "1/4 tsp"] },
    settings: { sizes: { kind: "words", most: 6 } },
    takes: [
        { label: "The whole set", params: { sizes: ["1 tbsp", "1 tsp", "1/2 tsp", "1/4 tsp"] } },
        { label: "Two spoons", params: { sizes: ["1 tsp", "1/2 tsp"] } },
        { label: "Three", params: { sizes: ["1 tbsp", "1 tsp", "1/4 tsp"] } },
    ],
    box: (p) => ({ w: Math.ceil(Math.max(1, p.sizes.length) * 3.2) + 2, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            sizes = p.sizes.length ? p.sizes : [""];
        const n = sizes.length,
            pitch = 3.2 * U,
            boxW = (Math.ceil(n * 3.2) + 2) * U;
        const x0 = (boxW - n * pitch) / 2,
            rcx = boxW / 2;
        const RX = (n - 1) * 1.6 * U + 1.1 * U,
            RY = 0.8 * U,
            ringY = 1.7 * U,
            baseY = 6.4 * U;
        pen.ellipse(g, rcx, ringY, RX * 2, RY * 2, "pencil", null, { strokeWidth: 2 });
        const a: RawAnchors = { ring: [rcx, ringY - RY, "up"] };
        sizes.forEach((s, i) => {
            const hx = x0 + (i + 0.5) * pitch,
                k = Math.min(1, Math.abs(hx - rcx) / RX);
            // Each handle hangs from the point on the ring it is actually threaded through, so the
            // spoons sit on a shallow curve; the bowls still finish on one line, which is what is read.
            const holeY = ringY + RY * Math.sqrt(1 - k * k);
            const rx = Math.max(0.66 * U, (1.45 - i * 0.22) * U),
                ry = rx * 0.74,
                by = baseY - ry;
            pen.path(
                g,
                roundedRect(hx - 5, holeY - 0.4 * U, 10, by - holeY + 0.4 * U, 5),
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            pen.circle(g, hx, holeY, 8, "pencil", null, {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
            });
            pen.ellipse(
                g,
                hx,
                by,
                rx * 2,
                ry * 2,
                "pencil",
                pen.fill("sky", "solid", { hachureGap: 5 }),
                { strokeWidth: 2 },
            );
            pen.ellipse(g, hx, by, rx * 1.3, ry * 1.3, "pencil", pen.fill("card"), {
                strokeWidth: 1.1,
            });
            num(c, hx, 7.7 * U, s, Math.min(14, (pitch * 0.92) / Math.max(1, s.length * 0.56)));
            a[`spoon(${i})`] = [hx, by - ry, "up"];
        });
        return a;
    },
    describe: () =>
        "A set of measuring spoons hanging from a ring, largest to smallest, with the size of each written under its bowl.",
});
