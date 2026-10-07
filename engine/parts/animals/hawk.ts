import type { RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { eye } from "./nature";

const KINDS = ["bird", "shadow"] as const;

/** A hawk gliding with its wings spread, seen from below and the side, or the dark shadow it casts on the ground. */
export const hawk = defineDrawing<{ kind: string }>({
    id: "hawk",
    family: "animals",
    title: "Hawk",
    group: "Characters",
    about: "A brown hawk gliding high with its wings spread wide and its tail fanned, or the soft dark shadow of one sweeping over the grass.",
    params: { kind: "bird" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: [
        { label: "Gliding", params: { kind: "bird" } },
        { label: "Its shadow", params: { kind: "shadow" } },
    ],
    box: () => ({ w: 4, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        if (p.kind === "shadow") {
            pen.path(
                g,
                "M2 30Q20 22 34 26Q40 20 46 26Q60 22 78 30Q60 34 46 32Q40 38 34 32Q20 34 2 30Z",
                "pencil",
                pen.fill("ink-soft", "solid"),
                { stroke: "none" },
            );
            return { middle: [40, 30, "up"] };
        }
        const line = { strokeWidth: 1.5, roughness: 0.3 };
        pen.path(
            g,
            "M4 18Q18 6 34 16L46 16Q62 6 76 18Q62 16 48 24L32 24Q18 16 4 18Z",
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 3.5 }),
            line,
        );
        pen.ellipse(g, 40, 21, 22, 11, "pencil", pen.fill("tang", "solid"), line);
        pen.path(g, "M28 21L18 16L18 27Z", "pencil", pen.fill("tang", "solid"), line);
        pen.circle(g, 52, 18, 10, "pencil", pen.fill("card", "solid"), line);
        pen.path(g, "M56 17L62 20L56 21Z", "pencil", pen.fill("glow", "solid"), { strokeWidth: 1 });
        eye(c, 54, 17, 2.4);
        return { middle: [40, 20, "up"] };
    },
    describe: (p) =>
        p.kind === "shadow"
            ? "The soft dark shadow of a bird of prey with long spread wings, lying flat on the ground as it sweeps across."
            : "A brown hawk gliding with its long wings spread wide, its tail fanned out behind and a hooked yellow beak on its pale head.",
    motion: { body: { is: "idle", deg: 3, period: 2 }, weight: "light" },
});
