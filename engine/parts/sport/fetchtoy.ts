import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["ball", "frisbee", "stick"] as const;
type Toy = (typeof KINDS)[number];

const pick = (v: string): Toy => KINDS.find((k) => k === v) ?? "ball";
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const fetchToy = defineDrawing<{ kind: Toy }>({
    id: "fetchtoy",
    family: "sport",
    title: "Something to fetch",
    group: "Props",
    about: "A thing to throw for a dog to fetch, seen from the side: a yellow tennis ball with its curved seams, a blue frisbee that glides, or a forked stick with bark marks that tumbles as it flies.",
    params: { kind: "ball" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: [
        { label: "A tennis ball", params: { kind: "ball" } },
        { label: "A frisbee", params: { kind: "frisbee" } },
        { label: "A stick", params: { kind: "stick" } },
    ],
    box: (p) => (pick(p.kind) === "ball" ? { w: 1, h: 1 } : { w: 2, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            kind = pick(p.kind);
        if (kind === "ball") {
            const r = 0.42 * U,
                cx = 0.5 * U,
                cy = 0.5 * U;
            pen.circle(g, cx, cy, r * 2, "pencil", pen.fill("glow"), { strokeWidth: 1.6 });
            for (const d of [-1, 1])
                pen.path(
                    g,
                    `M${cx + d * r * 0.55} ${cy - r * 0.8}Q${cx + d * r * 0.05} ${cy} ${cx + d * r * 0.55} ${cy + r * 0.8}`,
                    "ruler",
                    null,
                    { strokeWidth: 1.4, stroke: c.t.card, ...FIRM },
                );
            return { middle: [cx, cy, "up"] };
        }
        if (kind === "frisbee") {
            const cx = U,
                cy = 0.55 * U;
            pen.ellipse(g, cx, cy, 1.8 * U, 0.55 * U, "pencil", pen.fill("sky"), {
                strokeWidth: 1.6,
            });
            pen.ellipse(g, cx, cy - 0.04 * U, 1.1 * U, 0.26 * U, "ruler", null, {
                strokeWidth: 1,
                ...FIRM,
            });
            pen.line(g, cx - 0.9 * U, cy + 0.06 * U, cx + 0.9 * U, cy + 0.06 * U, "ruler", {
                strokeWidth: 1.2,
                ...FIRM,
            });
            return { middle: [cx, cy, "up"] };
        }
        const y = 0.55 * U;
        pen.path(
            g,
            `M${0.1 * U} ${y + 0.05 * U}L${1.9 * U} ${y - 0.12 * U}L${1.9 * U} ${y + 0.1 * U}L${0.1 * U} ${y + 0.25 * U}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        pen.line(g, 1.2 * U, y - 0.05 * U, 1.55 * U, y - 0.42 * U, "pencil", { strokeWidth: 2.2 });
        for (const x of [0.5, 0.9, 1.5])
            pen.line(g, x * U, y + 0.02 * U, (x + 0.12) * U, y + 0.1 * U, "ruler", {
                strokeWidth: 1,
                ...FIRM,
            });
        return { middle: [U, y, "up"] };
    },
    describe: (p) =>
        ({
            ball: "A yellow tennis ball seen from the side, with two curved white seams, the kind a dog chases, catches and brings back to be thrown again.",
            frisbee:
                "A blue frisbee seen from the side, a flat disc with a raised rim that glides a long way when it is thrown with a flick.",
            stick: "A short forked stick with a few bark marks, the kind a dog picks up in the park and carries back to be thrown again.",
        })[pick(p.kind)],
});
