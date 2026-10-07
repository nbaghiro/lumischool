import type { RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

const KINDS = ["acorn", "pinecone"] as const;

/** One acorn with its cap, or one pinecone in its scales, in a square: food for a woodland game to count. */
export const acorn = defineDrawing<{ kind: string }>({
    id: "acorn",
    family: "outdoors",
    title: "Acorn or pinecone",
    group: "Props",
    about: "A single acorn in its rough little cap with a stalk on top, or a single brown pinecone with its scales in rows, small enough to count in a pile.",
    params: { kind: "acorn" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: [
        { label: "An acorn", params: { kind: "acorn" } },
        { label: "A pinecone", params: { kind: "pinecone" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            line = { strokeWidth: 1.2, roughness: 0.25 };
        if (p.kind === "pinecone") {
            pen.path(
                g,
                "M10 1.5C15.5 3 17.5 9 16 14C14.5 17.5 12 18.5 10 18.5C8 18.5 5.5 17.5 4 14C2.5 9 4.5 3 10 1.5Z",
                "pencil",
                pen.fill("tang", "solid"),
                line,
            );
            for (const y of [6, 9.5, 13])
                pen.path(g, `M${4.6} ${y}Q10 ${y + 3} ${15.4} ${y}`, "pencil", null, {
                    strokeWidth: 0.9,
                    stroke: c.t.ink,
                });
            for (const x of [7.5, 12.5])
                pen.line(g, x, 4, x, 17, "pencil", { strokeWidth: 0.7, stroke: c.t["ink-soft"] });
            return { middle: [10, 10, "up"] };
        }
        pen.path(
            g,
            "M5 9C5 14 7.5 18.5 10 18.5C12.5 18.5 15 14 15 9Z",
            "pencil",
            pen.fill("glow", "solid"),
            line,
        );
        pen.path(
            g,
            "M3.5 9.5C3.5 5.5 6.5 4 10 4C13.5 4 16.5 5.5 16.5 9.5Z",
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 2.2 }),
            line,
        );
        pen.line(g, 10, 4, 10.8, 1.2, "pencil", { strokeWidth: 1.4 });
        return { middle: [10, 11, "up"] };
    },
    describe: (p) =>
        p.kind === "pinecone"
            ? "A single brown pinecone standing upright, its woody scales drawn in curved rows from the tip down to its round base."
            : "A single acorn with a pale yellow nut under a rough brown cap, and a short stalk sticking up from the top of the cap.",
    motion: { still: "An acorn lies still until a game drops it or a hand picks it up." },
});
