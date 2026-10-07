import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const KINDS = ["star", "ball", "wide", "sticky"] as const;
type Kind = (typeof KINDS)[number];
const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "star";

const WORDS: Record<Kind, string> = {
    star: "a falling star",
    ball: "a falling token with a second ball in it",
    wide: "a falling token with arrows pointing out, that makes the tray wider",
    sticky: "a falling honey pot that makes the tray sticky",
};

export const knockGift = defineDrawing<{ kind: string; n: number }>({
    id: "knockgift",
    family: "sport",
    title: "Falling gift",
    group: "Props",
    about: "What drops out of a broken block in a knock-down game, to be caught on the tray: a star, sometimes with a number, a second ball, arrows that widen the tray, or a honey pot that makes it sticky.",
    params: { kind: "star", n: 0 },
    settings: { kind: { kind: "one of", of: KINDS }, n: { kind: "whole", min: 0, max: 20 } },
    takes: [
        { label: "A star with a 5", params: { kind: "star", n: 5 } },
        { label: "Another ball", params: { kind: "ball", n: 0 } },
        { label: "A wider tray", params: { kind: "wide", n: 0 } },
        { label: "A sticky tray", params: { kind: "sticky", n: 0 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            kind = kindOf(p.kind),
            edge = { strokeWidth: 1.1, roughness: 0.25 },
            ink = { strokeWidth: 1.1, stroke: c.t.ink, roughness: 0.2 };
        if (kind === "star") {
            const pts: string[] = [];
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + (i / 10) * Math.PI * 2,
                    r = i % 2 === 0 ? 0.92 * U : 0.46 * U;
                pts.push(`${U + Math.cos(a) * r} ${1.05 * U + Math.sin(a) * r}`);
            }
            pen.path(g, `M${pts.join("L")}Z`, "pencil", pen.fill("glow", "solid"), edge);
            const n = Math.max(0, Math.min(20, Math.round(p.n)));
            if (n > 0) num(c, U, 1.32 * U, n, n > 9 ? 12 : 15, "middle", c.t.ink);
        } else {
            pen.circle(
                g,
                U,
                U,
                1.7 * U,
                "pencil",
                pen.fill(kind === "sticky" ? "glow" : kind === "ball" ? "sky" : "mint", "solid"),
                edge,
            );
            if (kind === "ball")
                pen.circle(g, U, U, 0.75 * U, "pencil", pen.fill("card", "solid"), edge);
            else if (kind === "wide")
                pen.path(
                    g,
                    `M${0.45 * U} ${U}H${1.55 * U}M${0.45 * U} ${U}L${0.75 * U} ${0.72 * U}M${0.45 * U} ${U}L${0.75 * U} ${1.28 * U}M${1.55 * U} ${U}L${1.25 * U} ${0.72 * U}M${1.55 * U} ${U}L${1.25 * U} ${1.28 * U}`,
                    "pencil",
                    null,
                    ink,
                );
            else
                pen.path(
                    g,
                    `M${0.6 * U} ${0.75 * U}H${1.4 * U}V${1.4 * U}Q${U} ${1.6 * U} ${0.6 * U} ${1.4 * U}ZM${0.55 * U} ${0.62 * U}H${1.45 * U}`,
                    "pencil",
                    pen.fill("tang", "solid"),
                    ink,
                );
        }
        return { middle: [U, U, "up"] };
    },
    describe: (p) => {
        const n = Math.round(p.n),
            kind = kindOf(p.kind);
        return `A round gift dropping from a broken block in a knock-down game: ${WORDS[kind]}${kind === "star" && n > 0 ? ` with the number ${n} on it` : ""}, to catch on the tray.`;
    },
    motion: { still: "It falls only as the game drops it." },
});
