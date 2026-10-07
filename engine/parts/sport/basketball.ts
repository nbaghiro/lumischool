import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const PARTS = ["ball", "shadow"] as const;

export const basketball = defineDrawing<{ part: string; worn: boolean }>({
    id: "basketball",
    family: "sport",
    title: "Basketball",
    group: "Props",
    about: "An orange basketball with its black seams, new or scuffed from the drive, and the soft round shadow it throws on the ground under it as it flies.",
    params: { part: "ball", worn: false },
    settings: { part: { kind: "one of", of: PARTS }, worn: { kind: "flag" } },
    takes: [
        { label: "A new ball", params: { part: "ball", worn: false } },
        { label: "A scuffed ball", params: { part: "ball", worn: true } },
        { label: "Its shadow", params: { part: "shadow", worn: false } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            cx = U,
            cy = U,
            r = 0.9 * U;
        if (p.part === "shadow") {
            plain(c, {
                kind: "ellipse",
                cx,
                cy: 1.6 * U,
                rx: r,
                ry: 0.22 * U,
                fill: c.t.ink,
                opacity: 0.16,
            });
            return { centre: [cx, 1.6 * U, "up"] };
        }
        pen.circle(
            g,
            cx,
            cy,
            r * 2,
            "pencil",
            pen.fill("tang", p.worn ? "hachure" : "solid", { hachureGap: 4 }),
            { strokeWidth: 1.6, roughness: 0.4 },
        );
        // the seams: one round the middle each way, and two curving in from the sides
        const seam = { strokeWidth: 1.2, roughness: 0.3 };
        pen.line(g, cx, cy - r, cx, cy + r, "ruler", seam);
        pen.line(g, cx - r, cy, cx + r, cy, "ruler", seam);
        pen.path(
            g,
            `M${cx - r * 0.62} ${cy - r * 0.78}Q${cx - r * 0.18} ${cy} ${cx - r * 0.62} ${cy + r * 0.78}`,
            "ruler",
            null,
            seam,
        );
        pen.path(
            g,
            `M${cx + r * 0.62} ${cy - r * 0.78}Q${cx + r * 0.18} ${cy} ${cx + r * 0.62} ${cy + r * 0.78}`,
            "ruler",
            null,
            seam,
        );
        if (!c.paper)
            plain(c, {
                kind: "path",
                d: `M${cx - r * 0.55} ${cy - r * 0.45}Q${cx - r * 0.35} ${cy - r * 0.72} ${cx - r * 0.05} ${cy - r * 0.75}`,
                fill: "none",
                stroke: c.t.card,
                width: 2,
                cap: "round",
                opacity: 0.55,
            });
        return { centre: [cx, cy, "up"], top: [cx, cy - r, "up"] };
    },
    describe: (p) =>
        p.part === "shadow"
            ? "The soft grey oval shadow a flying basketball throws on the ground below it, smaller and fainter the higher the ball goes."
            : `An orange basketball${p.worn ? ", scuffed from bouncing on the drive," : ""} with black seams running round its middle each way and two more curving in from its sides.`,
});
