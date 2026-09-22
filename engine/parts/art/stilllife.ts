import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill } from "../../pigment";
import { defineDrawing } from "../drawing";

const STILL_THINGS = ["apple", "cup", "ball", "box"] as const;

/** An outline's weight by the word a lesson writes; thick is twice thin, which survives the hatch on paper. */
const STILL_WEIGHTS: Record<string, number> = { thick: 2.8, thin: 1.4 };

/** One thing on the table, lit from one side: its far side shaded and its shadow cast away from the light. */
function stillThing<G>(
    c: Ctx<G>,
    kind: string,
    cx: number,
    base: number,
    lightLeft: boolean,
    width = 1.8,
): void {
    const { pen, g } = c,
        away = lightLeft ? 1 : -1,
        detail = (width / 1.8) * 2.2,
        shade = c.paper
            ? {
                  fill: c.t.ink,
                  fillStyle: "hachure" as const,
                  hachureGap: 3,
                  hachureAngle: lightLeft ? -50 : 50,
              }
            : { fill: "#22262E33", fillStyle: "solid" as const };
    pen.ellipse(
        g,
        cx + away * 1.3 * U,
        base - 2,
        3.2 * U,
        0.9 * U,
        "pencil",
        c.paper
            ? { fill: c.t.ink, fillStyle: "hachure", hachureGap: 2.5 }
            : { fill: "#22262E40", fillStyle: "solid" },
        { strokeWidth: 0 },
    );
    const body = (d: string, colour: string) => {
        pen.path(g, d, "pencil", paintFill(c, colourOf(colour) ?? "#FFFFFF"), {
            strokeWidth: width,
        });
    };
    if (kind === "cup") {
        body(
            `M${cx - 1.1 * U} ${base - 2.6 * U}L${cx + 1.1 * U} ${base - 2.6 * U}L${cx + 0.9 * U} ${base}L${cx - 0.9 * U} ${base}Z`,
            "sky",
        );
        pen.path(
            g,
            `M${cx + away * 0.2 * U} ${base - 2.5 * U}L${cx + away * 1.05 * U} ${base - 2.5 * U}L${cx + away * 0.85 * U} ${base - 2}L${cx + away * 0.15 * U} ${base - 2}Z`,
            "ruler",
            shade,
            { strokeWidth: 0 },
        );
        pen.arc(
            g,
            cx - away * 1.3 * U,
            base - 1.3 * U,
            1 * U,
            1.3 * U,
            Math.PI / 2,
            Math.PI * 1.5,
            "pencil",
            { strokeWidth: detail },
        );
    } else if (kind === "box") {
        body(
            `M${cx - 1.2 * U} ${base - 2 * U}L${cx + 1.2 * U} ${base - 2 * U}L${cx + 1.2 * U} ${base}L${cx - 1.2 * U} ${base}Z`,
            "orange",
        );
        pen.path(
            g,
            `M${cx + away * 0.4 * U} ${base - 2 * U}L${cx + away * 1.2 * U} ${base - 2 * U}L${cx + away * 1.2 * U} ${base}L${cx + away * 0.4 * U} ${base}Z`,
            "ruler",
            shade,
            { strokeWidth: 0 },
        );
    } else {
        const r = kind === "ball" ? 1.2 * U : 1.1 * U,
            cy = base - r;
        body(
            `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z`,
            kind === "ball" ? "blue" : "red",
        );
        pen.path(
            g,
            `M${cx + away * 0.1 * r} ${cy - r * 0.98}A${r} ${r} 0 0 ${lightLeft ? 1 : 0} ${cx + away * 0.1 * r} ${cy + r * 0.98}A${r * 0.62} ${r} 0 0 ${lightLeft ? 0 : 1} ${cx + away * 0.1 * r} ${cy - r * 0.98}Z`,
            "ruler",
            shade,
            { strokeWidth: 0 },
        );
        if (!c.paper)
            plain(c, {
                kind: "circle",
                cx: cx - away * r * 0.4,
                cy: cy - r * 0.4,
                r: r * 0.18,
                fill: "#FFFFFFB0",
            });
        if (kind === "apple")
            pen.line(g, cx, cy - r, cx + 3, cy - r - 8, "pencil", { strokeWidth: detail });
    }
}

export const stillLife = defineDrawing({
    id: "stilllife",
    family: "art",
    title: "Things in the light",
    group: "Props",
    about: "A few things on a table lit from one side, drawn the way an artist looks at them: the side facing the light is palest, the side away from it is darkest, and each casts a shadow away from the light. A lamp shows which side the light comes from, or can be left out so a question asks. `weights` gives each thing's outline its line weight, thick or thin, in the order of `things`; a thick line is twice the width of a thin one, which is a difference that survives the hatch on paper, and an empty list draws them all at one weight.",
    params: {
        light: "left",
        things: ["apple", "cup", "ball"],
        lamp: true,
        weights: [] as string[],
    },
    settings: {
        light: { kind: "one of", of: ["left", "right"] },
        things: { kind: "words", of: STILL_THINGS, most: 3 },
        lamp: { kind: "flag" },
        weights: { kind: "words", of: ["thick", "thin"], most: 3 },
    },
    takes: [
        {
            label: "Lit from the left",
            params: { light: "left", things: ["apple", "cup", "ball"], lamp: true, weights: [] },
        },
        {
            label: "From the right, no lamp",
            params: { light: "right", things: ["box", "apple", "cup"], lamp: false, weights: [] },
        },
        {
            label: "A thick line and two thin",
            params: {
                light: "left",
                things: ["apple", "cup", "ball"],
                lamp: true,
                weights: ["thick", "thin", "thin"],
            },
        },
    ],
    box: () => ({ w: 16, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            left = p.light !== "right",
            base = 6.6 * U,
            a: RawAnchors = {};
        pen.line(g, 0.4 * U, base, 15.6 * U, base, "pencil", { strokeWidth: 2 });
        pen.rect(
            g,
            0.4 * U,
            base,
            15.2 * U,
            1.2 * U,
            "ruler",
            c.pen.fill("tang", "hachure", { hachureGap: 6, hachureAngle: 0 }),
            { strokeWidth: 0 },
        );
        const things = p.things
            .filter((t) => (STILL_THINGS as readonly string[]).includes(t))
            .slice(0, 3);
        things.forEach((t, i) => {
            const cx = (4.5 + i * 3.6) * U;
            stillThing(c, t, cx, base, left, STILL_WEIGHTS[p.weights[i] ?? ""] ?? 1.8);
            a[`thing(${i})`] = [cx, 2.5 * U, "up"];
        });
        if (p.lamp) {
            const lx = left ? 1.4 * U : 14.6 * U;
            pen.circle(g, lx, 1.6 * U, 1.6 * U, "pencil", c.pen.fill("glow"), { strokeWidth: 1.6 });
            for (let k = 0; k < 5; k++) {
                const ang = (left ? 0 : Math.PI) + (k - 2) * 0.35;
                pen.line(
                    g,
                    lx + Math.cos(ang) * 1.1 * U,
                    1.6 * U + Math.sin(ang) * 1.1 * U,
                    lx + Math.cos(ang) * 1.8 * U,
                    1.6 * U + Math.sin(ang) * 1.8 * U,
                    "pencil",
                    { strokeWidth: 1.6, stroke: c.paper ? c.t.ink : c.t["glow-ink"] },
                );
            }
            a.lamp = [lx, 0.8 * U, "up"];
        }
        return a;
    },
    describe: (p) => {
        const things = p.things
            .filter((t) => (STILL_THINGS as readonly string[]).includes(t))
            .slice(0, 3);
        const names = things.map((t) => (t === "apple" ? "an apple" : `a ${t}`));
        const list =
            names.length > 1
                ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
                : (names[0] ?? "nothing");
        const said = list.charAt(0).toUpperCase() + list.slice(1);
        return `${said} on a table, each shaded on one side with a shadow cast along the table${p.lamp ? `, and a lamp shining from the ${p.light !== "right" ? "left" : "right"}` : ", and no lamp in sight"}.`;
    },
});
