import type { RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { eye, type Pt } from "./nature";

const POSES = ["sit", "run", "carry"] as const;

/** A grey squirrel seen from the side, sitting up, running, or running with acorns in its mouth. */
export const squirrel = defineDrawing<{ pose: string }>({
    id: "squirrel",
    family: "animals",
    title: "Squirrel",
    group: "Characters",
    about: "A grey squirrel seen from the side with a big curled tail, sitting up on its haunches or bounding along, sometimes with acorns held in its mouth.",
    params: { pose: "sit" },
    settings: { pose: { kind: "one of", of: POSES } },
    takes: [
        { label: "Sitting up", params: { pose: "sit" } },
        { label: "Running", params: { pose: "run" } },
        { label: "Carrying acorns", params: { pose: "carry" } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            coat = pen.fill("grid", "solid"),
            line = { strokeWidth: 1.6, roughness: 0.3 },
            run = p.pose !== "sit";
        const tail: Pt[] = run
            ? [
                  [16, 44],
                  [6, 40],
                  [3, 26],
                  [10, 16],
                  [18, 20],
                  [14, 30],
                  [20, 40],
              ]
            : [
                  [20, 54],
                  [8, 50],
                  [4, 34],
                  [10, 18],
                  [20, 16],
                  [18, 30],
                  [24, 48],
              ];
        pen.polygon(g, tail, "pencil", coat, line);
        pen.curve(g, tail.slice(1, 5), "pencil", { strokeWidth: 0.9, stroke: c.t["ink-soft"] });
        if (run) {
            pen.ellipse(g, 30, 44, 30, 15, "pencil", coat, line);
            pen.line(g, 20, 48, 14, 57, "pencil", { strokeWidth: 3, stroke: c.t["ink-soft"] });
            pen.line(g, 40, 48, 46, 57, "pencil", { strokeWidth: 3, stroke: c.t["ink-soft"] });
            pen.circle(g, 46, 36, 14, "pencil", coat, line);
            pen.circle(g, 42, 28, 5, "pencil", coat, { strokeWidth: 1 });
            eye(c, 49, 34, 3.2);
            if (p.pose === "carry")
                for (const x of [52, 56])
                    pen.ellipse(g, x, 42, 5, 6, "pencil", pen.fill("glow"), { strokeWidth: 0.9 });
            return { head: [46, 28, "up"] };
        }
        pen.ellipse(g, 32, 42, 20, 26, "pencil", coat, line);
        pen.ellipse(g, 35, 45, 9, 15, "pencil", pen.fill("card"), { strokeWidth: 0.8 });
        pen.line(g, 30, 54, 34, 58, "pencil", { strokeWidth: 3, stroke: c.t["ink-soft"] });
        pen.circle(g, 37, 26, 14, "pencil", coat, line);
        pen.circle(g, 33, 18, 5, "pencil", coat, { strokeWidth: 1 });
        eye(c, 40, 24, 3.2);
        pen.line(g, 38, 34, 44, 36, "pencil", { strokeWidth: 2.4, stroke: c.t["ink-soft"] });
        return { head: [37, 18, "up"] };
    },
    describe: (p) =>
        p.pose === "sit"
            ? "A grey squirrel seen from the side, sitting up on its back legs with its big bushy tail curled up behind it."
            : `A grey squirrel seen from the side, bounding along with its big bushy tail streaming out behind${p.pose === "carry" ? " and two acorns in its mouth" : ""}.`,
    motion: { body: { is: "idle", deg: 4, period: 1.2 }, weight: "light" },
});
