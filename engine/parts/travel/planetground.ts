import { plain, type RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "../outdoors/wash";

const KINDS = [
    "moon",
    "ice",
    "jungle",
    "lava",
    "sand",
    "cloud",
    "junk",
    "crystal",
    "metal",
] as const;
type Kind = (typeof KINDS)[number];
const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "moon";

/** The colour of each ground's top, and of the body under it. */
const TONES: Record<Kind, { top: TokenName; body: TokenName; solid?: true; words: string }> = {
    moon: {
        top: "card",
        body: "grid",
        solid: true,
        words: "pale grey moon rock with little craters",
    },
    ice: { top: "sky", body: "sky", words: "slippery blue ice with a shine" },
    jungle: { top: "mint", body: "tang", words: "green jungle moss over brown earth" },
    lava: { top: "ink-soft", body: "tang", words: "dark cooled rock with hot orange cracks" },
    sand: { top: "glow", body: "glow", words: "yellow sand in soft ripples" },
    cloud: { top: "card", body: "sky", words: "a puffy cloud of a gas giant" },
    junk: { top: "tang", body: "grid", solid: true, words: "rusty junk plates bolted together" },
    crystal: { top: "berry", body: "berry", words: "pink crystal with sharp facets" },
    metal: { top: "grid", body: "card", solid: true, words: "a riveted metal plank" },
};

export const planetGround = defineDrawing<{ kind: string; w: number; h: number }>({
    id: "planetground",
    family: "travel",
    title: "Planet ground",
    group: "Structures",
    about: "A length of ground or a ledge on one of Bolt's planets, drawn by the planet: moon rock, ice, jungle moss, cooled lava, sand, cloud, junk plates, crystal or a metal plank.",
    params: { kind: "moon", w: 6, h: 3 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        w: { kind: "whole", min: 1, max: 12 },
        h: { kind: "whole", min: 1, max: 12 },
    },
    takes: [
        { label: "Moon rock", params: { kind: "moon", w: 6, h: 3 } },
        { label: "Ice", params: { kind: "ice", w: 6, h: 3 } },
        { label: "Jungle", params: { kind: "jungle", w: 6, h: 3 } },
        { label: "Lava rock ledge", params: { kind: "lava", w: 3, h: 1 } },
        { label: "Sand", params: { kind: "sand", w: 6, h: 3 } },
        { label: "Cloud ledge", params: { kind: "cloud", w: 4, h: 1 } },
        { label: "Junk", params: { kind: "junk", w: 6, h: 3 } },
        { label: "Crystal", params: { kind: "crystal", w: 6, h: 3 } },
        { label: "Metal plank", params: { kind: "metal", w: 6, h: 1 } },
    ],
    box: (p) => ({
        w: Math.max(1, Math.min(12, Math.round(p.w))),
        h: Math.max(1, Math.min(12, Math.round(p.h))),
    }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            kind = kindOf(p.kind),
            tone = TONES[kind],
            w = Math.max(1, Math.min(12, Math.round(p.w))) * U,
            h = Math.max(1, Math.min(12, Math.round(p.h))) * U,
            edge = { strokeWidth: 1.4, roughness: 0.3 },
            soft = c.paper ? c.t.ink : c.t["ink-soft"],
            band = Math.min(h, 0.45 * U);
        if (kind === "cloud") {
            const bumps = Math.max(2, Math.round(w / (0.9 * U)));
            let d = `M${0.1 * U} ${h * 0.7}`;
            for (let k = 0; k < bumps; k++) {
                const x0 = 0.1 * U + ((w - 0.2 * U) * k) / bumps,
                    x1 = 0.1 * U + ((w - 0.2 * U) * (k + 1)) / bumps;
                d += `Q${(x0 + x1) / 2} ${0.05 * U} ${x1} ${h * 0.45}`;
            }
            d += `Q${w - 0.1 * U} ${h * 0.95} ${w / 2} ${h * 0.92}Q${0.1 * U} ${h * 0.95} ${0.1 * U} ${h * 0.7}Z`;
            pen.path(g, d, "pencil", pen.fill("card"), edge);
            return { top: [w / 2, 0.25 * U, "up"] };
        }
        if (h > band + 1)
            pen.rect(
                g,
                0.05 * U,
                band,
                w - 0.1 * U,
                h - band - 0.08 * U,
                "pencil",
                tone.solid
                    ? pen.fill(tone.body, "solid")
                    : pen.fill(tone.body, "hachure", { hachureGap: 7 }),
                edge,
            );
        pen.rect(
            g,
            0.05 * U,
            0.1 * U,
            w - 0.1 * U,
            band - 0.1 * U,
            "pencil",
            pen.fill(tone.top),
            edge,
        );
        const n = Math.round(w / U);
        if (!c.paper)
            for (let k = 0; k < n; k++) {
                const x = (k + 0.2 + hash(k, 3) * 0.6) * U,
                    y = band + (0.3 + hash(k, 7) * Math.max(0, h / U - 0.8)) * U;
                if (y > h - 0.25 * U) continue;
                if (kind === "moon")
                    plain(c, {
                        kind: "circle",
                        cx: x,
                        cy: y,
                        r: 0.18 * U,
                        fill: "none",
                        stroke: soft,
                        width: 1,
                        opacity: 0.6,
                    });
                else if (kind === "lava")
                    plain(c, {
                        kind: "path",
                        d: `M${x - 0.2 * U} ${y}L${x - 0.05 * U} ${y + 0.2 * U}L${x + 0.15 * U} ${y + 0.1 * U}`,
                        fill: "none",
                        stroke: c.t.tang,
                        width: 1.6,
                        cap: "round",
                        opacity: 0.9,
                    });
                else if (kind === "crystal")
                    plain(c, {
                        kind: "path",
                        d: `M${x} ${y - 0.25 * U}L${x + 0.15 * U} ${y}L${x} ${y + 0.25 * U}L${x - 0.15 * U} ${y}Z`,
                        fill: c.t.berry,
                        stroke: soft,
                        width: 0.8,
                        opacity: 0.7,
                    });
                else if (kind === "junk" || kind === "metal")
                    plain(c, {
                        kind: "circle",
                        cx: x,
                        cy: Math.min(y, band + 0.3 * U),
                        r: 0.07 * U,
                        fill: soft,
                        opacity: 0.8,
                    });
            }
        if (kind === "ice" && !c.paper)
            plain(c, {
                kind: "path",
                d: `M${0.3 * U} ${0.15 * U}H${w - 0.3 * U}`,
                fill: "none",
                stroke: c.t.card,
                width: 2,
                cap: "round",
                opacity: 0.9,
            });
        if (kind === "sand")
            for (let x = 0.4 * U; x < w - 0.4 * U; x += 1.2 * U)
                pen.path(
                    g,
                    `M${x} ${0.3 * U}Q${x + 0.25 * U} ${0.18 * U} ${x + 0.5 * U} ${0.3 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 0.8, stroke: soft, roughness: 0.3 },
                );
        if (kind === "jungle")
            for (let x = 0.3 * U; x < w - 0.2 * U; x += 0.7 * U)
                pen.path(g, `M${x} ${0.4 * U}L${x + 0.08 * U} ${0.12 * U}`, "pencil", null, {
                    strokeWidth: 0.8,
                    stroke: soft,
                    roughness: 0.3,
                });
        return { top: [w / 2, 0, "up"] };
    },
    describe: (p) => {
        const kind = kindOf(p.kind);
        return `A length of ground on one of Bolt's planets, ${Math.round(p.w)} squares long, made of ${TONES[kind].words}, for Bolt and the crew to stand on.`;
    },
    motion: { still: "The ground stays where the planet has it, unless the game moves a ledge." },
});
