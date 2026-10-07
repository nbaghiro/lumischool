import type { Ctx, RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const LOOKS = [
    "brick",
    "window",
    "roof",
    "door",
    "plank",
    "toy",
    "leaf",
    "apple",
    "snow",
    "metal",
    "sail",
    "stone",
    "rock",
    "trunk",
    "mast",
    "pad",
] as const;
type Look = (typeof LOOKS)[number];
const TONES = ["berry", "tang", "sky", "mint", "glow"] as const;
type Tone = (typeof TONES)[number];
const STATES = ["whole", "cracked", "grey"] as const;
type State = (typeof STATES)[number];

const lookOf = (v: string): Look => LOOKS.find((l) => l === v) ?? "brick";
const toneOf = (v: string): Tone => TONES.find((t) => t === v) ?? "berry";
const stateOf = (v: string): State => STATES.find((s) => s === v) ?? "whole";
/** The looks nothing breaks, which hold up what stands on them. */
const FIXED: readonly Look[] = ["rock", "trunk", "mast", "pad"];

interface BlockParams {
    look: string;
    tone: string;
    n: number;
    state: string;
    w: number;
    h: number;
}

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.45 * c.pen.o.roughness,
    bowing: 0.5 * c.pen.o.roughness,
    disableMultiStroke: true,
});

const NAMES: Record<Look, string> = {
    brick: "a brick",
    window: "a window pane",
    roof: "a roof tile",
    door: "a door",
    plank: "a wooden plank",
    toy: "a toy block",
    leaf: "a clump of leaves",
    apple: "an apple among leaves",
    snow: "a block of snow",
    metal: "a metal panel",
    sail: "a piece of sail",
    stone: "a castle stone",
    rock: "a rock that holds the rest up",
    trunk: "a tree trunk that holds the rest up",
    mast: "a mast that holds the rest up",
    pad: "a launch pad that holds the rest up",
};

export const knockBlock = defineDrawing<BlockParams>({
    id: "knockblock",
    family: "sport",
    title: "Knock-down block",
    group: "Props",
    about: "One block of a structure built to be knocked down with a ball: a brick, a window, a roof tile, a plank, a toy block, leaves, an apple, snow, a metal panel or a sail, sometimes with a number, cracked after a first hit, or a rock, trunk, mast or pad that never breaks.",
    params: { look: "brick", tone: "berry", n: 0, state: "whole", w: 2, h: 1 },
    settings: {
        look: { kind: "one of", of: LOOKS },
        tone: { kind: "one of", of: TONES },
        n: { kind: "whole", min: 0, max: 99 },
        state: { kind: "one of", of: STATES },
        w: { kind: "whole", min: 1, max: 6 },
        h: { kind: "whole", min: 1, max: 3 },
    },
    takes: [
        {
            label: "A red brick",
            params: { look: "brick", tone: "berry", n: 0, state: "whole", w: 2, h: 1 },
        },
        {
            label: "A window with a 4",
            params: { look: "window", tone: "sky", n: 4, state: "whole", w: 2, h: 2 },
        },
        {
            label: "A cracked toy block",
            params: { look: "toy", tone: "mint", n: 6, state: "cracked", w: 2, h: 2 },
        },
        {
            label: "A roof tile",
            params: { look: "roof", tone: "tang", n: 0, state: "whole", w: 2, h: 1 },
        },
        {
            label: "An apple that does not count",
            params: { look: "apple", tone: "berry", n: 7, state: "grey", w: 1, h: 1 },
        },
        {
            label: "A sail",
            params: { look: "sail", tone: "glow", n: 8, state: "whole", w: 3, h: 2 },
        },
        {
            label: "The rock",
            params: { look: "rock", tone: "mint", n: 0, state: "whole", w: 6, h: 2 },
        },
        {
            label: "A metal panel",
            params: { look: "metal", tone: "sky", n: 12, state: "whole", w: 2, h: 1 },
        },
    ],
    box: (p) => ({
        w: Math.max(1, Math.min(6, Math.round(p.w))),
        h: Math.max(1, Math.min(3, Math.round(p.h))),
    }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            look = lookOf(p.look),
            tone = toneOf(p.tone),
            state = stateOf(p.state),
            w = Math.max(1, Math.min(6, Math.round(p.w))) * U,
            h = Math.max(1, Math.min(3, Math.round(p.h))) * U,
            m = 0.08 * U,
            ink = c.paper ? c.t.ink : c.t["ink-soft"],
            line = (x1: number, y1: number, x2: number, y2: number, width = 0.7) =>
                pen.line(g, x1, y1, x2, y2, "pencil", {
                    strokeWidth: width,
                    stroke: ink,
                    roughness: 0.2,
                });
        const box = (fill: ReturnType<typeof pen.fill> | null, width = 1.2) =>
            pen.rect(g, m, m, w - 2 * m, h - 2 * m, "pencil", fill, calm(c, width));
        switch (look) {
            case "brick":
                box(pen.fill(tone, "solid"));
                for (let y = h / 2; y < h - m; y += U) line(m * 2, y, w - m * 2, y);
                for (let x = U; x < w - m; x += U) line(x, m * 2, x, h / 2);
                break;
            case "window":
                box(pen.fill("card", "solid"), 1.3);
                pen.rect(
                    g,
                    0.25 * U,
                    0.25 * U,
                    w - 0.5 * U,
                    h - 0.5 * U,
                    "pencil",
                    pen.fill("sky", "solid"),
                    calm(c, 0.8),
                );
                line(w / 2, 0.25 * U, w / 2, h - 0.25 * U, 1);
                line(0.25 * U, h / 2, w - 0.25 * U, h / 2, 1);
                break;
            case "roof":
                box(pen.fill(tone, "hachure", { hachureGap: 4, fillWeight: 0.8 }));
                for (let x = 0; x < w - m; x += U / 2)
                    pen.path(
                        g,
                        `M${x + m} ${h - m}Q${x + U / 4} ${h - 0.45 * U} ${x + U / 2} ${h - m}`,
                        "pencil",
                        null,
                        {
                            strokeWidth: 0.7,
                            stroke: ink,
                            roughness: 0.2,
                        },
                    );
                break;
            case "door":
                box(pen.fill("tang", "solid"));
                for (let x = U / 2; x < w - m; x += U / 2) line(x, m * 2, x, h - m * 2, 0.5);
                pen.circle(
                    g,
                    w - 0.35 * U,
                    h / 2,
                    0.22 * U,
                    "pencil",
                    pen.fill("glow", "solid"),
                    calm(c, 0.6),
                );
                break;
            case "plank":
            case "mast":
                box(
                    pen.fill("tang", look === "mast" ? "cross-hatch" : "solid", {
                        hachureGap: 4,
                        fillWeight: 0.7,
                    }),
                    look === "mast" ? 1.5 : 1.2,
                );
                pen.path(
                    g,
                    `M${0.3 * U} ${h * 0.4}Q${w / 2} ${h * 0.25} ${w - 0.3 * U} ${h * 0.45}`,
                    "pencil",
                    null,
                    {
                        strokeWidth: 0.6,
                        stroke: ink,
                        roughness: 0.3,
                    },
                );
                break;
            case "toy":
                box(pen.fill(tone, "solid"), 1.3);
                pen.rect(
                    g,
                    0.2 * U,
                    0.2 * U,
                    w - 0.4 * U,
                    h - 0.4 * U,
                    "pencil",
                    null,
                    calm(c, 0.6),
                );
                break;
            case "leaf":
            case "apple":
                pen.path(
                    g,
                    `M${m + 0.3 * U} ${m}H${w - m - 0.3 * U}Q${w - m} ${m} ${w - m} ${m + 0.3 * U}V${h - m - 0.3 * U}Q${w - m} ${h - m} ${w - m - 0.3 * U} ${h - m}H${m + 0.3 * U}Q${m} ${h - m} ${m} ${h - m - 0.3 * U}V${m + 0.3 * U}Q${m} ${m} ${m + 0.3 * U} ${m}Z`,
                    "pencil",
                    pen.fill("mint", "solid"),
                    calm(c, 1),
                );
                if (look === "apple") {
                    const d = Math.min(w, h) * 0.78;
                    pen.circle(
                        g,
                        w / 2,
                        h / 2 + 0.04 * U,
                        d,
                        "pencil",
                        pen.fill(tone, "solid"),
                        calm(c, 1),
                    );
                    line(
                        w / 2,
                        h / 2 - d / 2 + 0.05 * U,
                        w / 2 + 0.08 * U,
                        h / 2 - d / 2 - 0.12 * U,
                        1,
                    );
                } else
                    for (let x = 0.5 * U; x < w - m; x += U)
                        pen.path(
                            g,
                            `M${x - 0.2 * U} ${h / 2}Q${x} ${h / 2 - 0.3 * U} ${x + 0.2 * U} ${h / 2}`,
                            "pencil",
                            null,
                            {
                                strokeWidth: 0.6,
                                stroke: ink,
                                roughness: 0.2,
                            },
                        );
                break;
            case "snow":
                box(pen.fill("card", "solid"), 1.1);
                for (let x = 0.5 * U; x < w - m; x += U)
                    pen.circle(
                        g,
                        x,
                        h * 0.35,
                        0.12 * U,
                        "pencil",
                        pen.fill("sky", "solid"),
                        calm(c, 0.4),
                    );
                break;
            case "metal":
                box(pen.fill(tone, "hachure", { hachureGap: 5, fillWeight: 0.7 }), 1.3);
                for (const x of [0.25 * U, w - 0.25 * U])
                    for (const y of [0.25 * U, h - 0.25 * U])
                        pen.circle(
                            g,
                            x,
                            y,
                            0.14 * U,
                            "pencil",
                            pen.fill("ink-soft", "solid"),
                            calm(c, 0.4),
                        );
                break;
            case "sail":
                box(pen.fill("card", "solid"), 1);
                for (let y = U / 2; y < h - m; y += U)
                    pen.rect(
                        g,
                        m * 2,
                        y - 0.15 * U,
                        w - m * 4,
                        0.3 * U,
                        "pencil",
                        pen.fill(tone, "solid"),
                        calm(c, 0.4),
                    );
                break;
            case "stone":
                box(pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.5 }), 1.2);
                line(w * 0.3, h * 0.3, w * 0.45, h * 0.35, 0.6);
                break;
            case "rock":
                box(pen.fill("ink-soft", "cross-hatch", { hachureGap: 5, fillWeight: 0.6 }), 1.6);
                pen.rect(
                    g,
                    m,
                    m,
                    w - 2 * m,
                    Math.min(h - 2 * m, 0.45 * U),
                    "pencil",
                    pen.fill("mint", "solid"),
                    calm(c, 0.9),
                );
                break;
            case "trunk":
                box(pen.fill("tang", "cross-hatch", { hachureGap: 4, fillWeight: 0.7 }), 1.6);
                break;
            case "pad":
                box(pen.fill("ink-soft", "cross-hatch", { hachureGap: 5, fillWeight: 0.6 }), 1.6);
                for (let x = 0.5 * U; x < w - m; x += U)
                    line(x, h - m * 2, x + 0.4 * U, m * 2, 1.2);
                break;
        }
        if (state === "cracked")
            pen.path(
                g,
                `M${w * 0.2} ${m * 2}L${w * 0.38} ${h * 0.45}L${w * 0.3} ${h * 0.6}L${w * 0.52} ${h - m * 2}M${w * 0.38} ${h * 0.45}L${w * 0.62} ${h * 0.38}L${w * 0.78} ${h * 0.55}`,
                "pencil",
                null,
                { strokeWidth: 1.1, stroke: c.t.ink, roughness: 0.3 },
            );
        if (state === "grey")
            pen.rect(
                g,
                m,
                m,
                w - 2 * m,
                h - 2 * m,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.8 }),
                {
                    strokeWidth: 0,
                    stroke: "none",
                },
            );
        const n = Math.max(0, Math.min(99, Math.round(p.n)));
        if (n > 0) {
            const d = Math.min(w, h) * 0.9,
                size = Math.max(11, Math.round(d * (n > 9 ? 0.52 : 0.62)));
            pen.circle(g, w / 2, h / 2, d, "pencil", pen.fill("card", "solid"), calm(c, 0.9));
            num(
                c,
                w / 2,
                h / 2 + size * 0.36,
                n,
                size,
                "middle",
                state === "grey" ? c.t["ink-soft"] : c.t.ink,
            );
        }
        return { middle: [w / 2, h / 2, "up"] };
    },
    describe: (p) => {
        const look = lookOf(p.look),
            state = stateOf(p.state),
            n = Math.round(p.n),
            how =
                state === "cracked"
                    ? ", cracked from a first hit"
                    : state === "grey"
                      ? ", greyed because it does not count"
                      : "";
        return `A block of a structure to knock down with a ball, drawn as ${NAMES[look]}${n > 0 ? `, numbered ${n}` : ""}${how}${FIXED.includes(look) ? ", and never breaks" : ""}.`;
    },
    motion: { still: "A block stands still; the game cracks it, breaks it or lets it fall." },
});
