import type { Ctx, RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const LOOKS = ["peg", "sweet", "shell", "star", "cog", "bulb", "plank", "brick"] as const;
type Look = (typeof LOOKS)[number];
const TONES = ["sky", "berry", "tang", "mint"] as const;
type Tone = (typeof TONES)[number];
const STATES = ["plain", "lit", "grey"] as const;
type State = (typeof STATES)[number];

const lookOf = (v: string): Look => LOOKS.find((l) => l === v) ?? "peg";
const toneOf = (v: string): Tone => TONES.find((t) => t === v) ?? "sky";
const stateOf = (v: string): State => STATES.find((s) => s === v) ?? "plain";
/** Long looks are bars; the rest are round. */
const isLong = (look: string): boolean => look === "plank" || look === "brick";

interface PegParams {
    n: number;
    look: string;
    tone: string;
    state: string;
    /** A long peg's length in squares; a round one ignores it. */
    len: number;
}

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.5 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
});

/**
 * A round peg of diameter `d` units about `cx`, `cy` in its look and state, with its number: the cover
 * draws its pegs with it too.
 */
export function roundPeg<G>(
    c: Ctx<G>,
    cx: number,
    cy: number,
    d: number,
    p: { n: number; look: string; tone: string; state: string },
): void {
    const { pen, g } = c,
        look = lookOf(p.look),
        state = stateOf(p.state),
        r = d / 2,
        fill =
            state === "grey"
                ? pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 })
                : pen.fill(state === "lit" ? "glow" : toneOf(p.tone), "solid"),
        edge = calm(c, 1.2);
    if (look === "star") {
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i / 10) * Math.PI * 2,
                rr = i % 2 === 0 ? r : r * 0.62;
            pts.push(`${cx + Math.cos(a) * rr} ${cy + Math.sin(a) * rr}`);
        }
        pen.path(g, `M${pts.join("L")}Z`, "pencil", fill, edge);
    } else if (look === "cog") {
        const pts: string[] = [];
        for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2,
                rr = Math.floor(i / 2) % 2 === 0 ? r : r * 0.84;
            pts.push(`${cx + Math.cos(a) * rr} ${cy + Math.sin(a) * rr}`);
        }
        pen.path(g, `M${pts.join("L")}Z`, "pencil", fill, edge);
    } else if (look === "shell") {
        // a scallop: a fan of ribs from a hinge at its foot
        pen.path(
            g,
            `M${cx - r * 0.3} ${cy + r * 0.95}L${cx - r * 0.95} ${cy - r * 0.05}Q${cx - r * 0.8} ${cy - r * 0.95} ${cx} ${cy - r * 0.98}Q${cx + r * 0.8} ${cy - r * 0.95} ${cx + r * 0.95} ${cy - r * 0.05}L${cx + r * 0.3} ${cy + r * 0.95}Z`,
            "pencil",
            fill,
            edge,
        );
        for (const k of [-0.62, 0.62])
            pen.line(g, cx + k * 0.3 * r, cy + r * 0.9, cx + k * r, cy - r * 0.3, "pencil", {
                strokeWidth: 0.6,
                stroke: c.t.ink,
                roughness: 0.2,
            });
    } else {
        pen.circle(g, cx, cy, d, "pencil", fill, edge);
        if (look === "sweet" && state !== "grey")
            pen.path(
                g,
                `M${cx - r * 0.72} ${cy - r * 0.35}Q${cx} ${cy - r * 0.95} ${cx + r * 0.72} ${cy - r * 0.35}`,
                "pencil",
                null,
                { strokeWidth: 1.4, stroke: c.t.paper, roughness: 0.2 },
            );
        if (look === "bulb")
            pen.circle(g, cx, cy, d * 0.72, "pencil", null, {
                strokeWidth: 0.7,
                stroke: c.t.ink,
                roughness: 0.2,
            });
    }
    if (look === "peg" && state !== "grey")
        pen.circle(g, cx - r * 0.42, cy - r * 0.48, r * 0.34, "ruler", pen.fill("paper"), {
            strokeWidth: 0.3,
            disableMultiStroke: true,
        });
    const n = Math.max(0, Math.min(99, Math.round(p.n)));
    if (n > 0)
        num(
            c,
            cx,
            cy + d * 0.19,
            n,
            Math.round(Math.max(11, d * (n > 9 ? 0.36 : 0.44))),
            "middle",
            state === "grey" ? c.t["ink-soft"] : c.t.ink,
        );
}

export const numberPeg = defineDrawing<PegParams>({
    id: "numberpeg",
    family: "sport",
    title: "Numbered peg",
    group: "Props",
    about: "A peg on a marble board with a number on it: round as a peg, a sweet, a shell, a star, a cog or a bulb, or long as a plank or a brick. It glows yellow when lit and greys when it does not count.",
    params: { n: 3, look: "peg", tone: "sky", state: "plain", len: 3 },
    settings: {
        n: { kind: "whole", min: 0, max: 99 },
        look: { kind: "one of", of: LOOKS },
        tone: { kind: "one of", of: TONES },
        state: { kind: "one of", of: STATES },
        len: { kind: "whole", min: 2, max: 6 },
    },
    takes: [
        {
            label: "A blue three",
            params: { n: 3, look: "peg", tone: "sky", state: "plain", len: 3 },
        },
        {
            label: "A lit sweet",
            params: { n: 5, look: "sweet", tone: "berry", state: "lit", len: 3 },
        },
        {
            label: "A grey shell",
            params: { n: 7, look: "shell", tone: "tang", state: "grey", len: 3 },
        },
        {
            label: "A star twelve",
            params: { n: 12, look: "star", tone: "sky", state: "plain", len: 3 },
        },
        { label: "A cog", params: { n: 4, look: "cog", tone: "tang", state: "plain", len: 3 } },
        { label: "A plank", params: { n: 6, look: "plank", tone: "tang", state: "plain", len: 4 } },
        {
            label: "A lit brick",
            params: { n: 5, look: "brick", tone: "berry", state: "lit", len: 3 },
        },
    ],
    // a long peg draws at half its box, as a round one does: two squares of box a square of its length, and one more at each rounded end
    box: (p) =>
        isLong(p.look)
            ? { w: 2 * Math.max(2, Math.min(6, Math.round(p.len))) + 2, h: 2 }
            : { w: 2, h: 2 },
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            look = lookOf(p.look),
            state = stateOf(p.state);
        if (!isLong(look)) {
            roundPeg(c, U, U, 1.84 * U, p);
            return { middle: [U, U, "up"] };
        }
        const w = (2 * Math.max(2, Math.min(6, Math.round(p.len))) + 2) * U,
            h = 1.4 * U,
            y = (2 * U - h) / 2,
            fill =
                state === "grey"
                    ? pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 })
                    : pen.fill(
                          state === "lit" ? "glow" : look === "brick" ? "berry" : "tang",
                          "solid",
                      );
        pen.path(
            g,
            `M${0.5 * U + h / 2} ${y}H${w - 0.5 * U - h / 2}A${h / 2} ${h / 2} 0 0 1 ${w - 0.5 * U - h / 2} ${y + h}H${0.5 * U + h / 2}A${h / 2} ${h / 2} 0 0 1 ${0.5 * U + h / 2} ${y}Z`,
            "pencil",
            fill,
            calm(c, 1.3),
        );
        if (look === "brick")
            for (const x of [w * 0.36, w * 0.64])
                pen.line(g, x, y + 0.15 * U, x, y + h - 0.15 * U, "pencil", {
                    strokeWidth: 0.7,
                    stroke: c.t.ink,
                    roughness: 0.2,
                });
        else
            pen.path(
                g,
                `M${1.2 * U} ${y + h * 0.35}Q${w / 2} ${y + h * 0.15} ${w - 1.2 * U} ${y + h * 0.4}`,
                "pencil",
                null,
                { strokeWidth: 0.6, stroke: c.t.ink, roughness: 0.3 },
            );
        const n = Math.max(0, Math.min(99, Math.round(p.n)));
        if (n > 0) {
            // a badge wider than the bar, since a long peg draws at half its box and its number must still read
            pen.circle(g, w / 2, U, 1.9 * U, "pencil", pen.fill("card", "solid"), calm(c, 1.1));
            num(
                c,
                w / 2,
                U + 0.45 * U,
                n,
                n > 9 ? 22 : 26,
                "middle",
                state === "grey" ? c.t["ink-soft"] : c.t.ink,
            );
        }
        return { middle: [w / 2, U, "up"] };
    },
    describe: (p) => {
        const look = lookOf(p.look),
            state = stateOf(p.state),
            how =
                state === "lit"
                    ? "glowing yellow, lit"
                    : state === "grey"
                      ? "greyed out, not counting"
                      : "plain";
        return isLong(look)
            ? `A long ${look} peg on a marble board, a bar with its number in a pale circle at its middle, ${how}.`
            : `A round peg on a marble board drawn as a ${look}, with its number written across its middle, ${how}.`;
    },
    motion: {
        still: "A peg is fixed to its board; the game lights it, greys it and pops it away.",
    },
});
