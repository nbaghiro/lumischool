import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const KINDS = ["spring", "handle", "beacon", "gate", "battery", "flame", "fuel"] as const;
type Kind = (typeof KINDS)[number];
const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "spring";

const BOXES: Record<Kind, { w: number; h: number }> = {
    spring: { w: 2, h: 1 },
    handle: { w: 1, h: 1 },
    beacon: { w: 1, h: 3 },
    gate: { w: 2, h: 4 },
    battery: { w: 2, h: 1 },
    flame: { w: 1, h: 1 },
    fuel: { w: 3, h: 3 },
};

/** Segments in a full fuel ring. */
const RING = 6;

export const spaceKit = defineDrawing<{ kind: string; n: number; on: boolean }>({
    id: "spacekit",
    family: "travel",
    title: "Planet kit",
    group: "Props",
    about: "The small things on Bolt's planets: a bounce spring, a handle for the spring gloves, a checkpoint beacon, a crew gate with its number, a battery, a jet flame and the ring of jet fuel.",
    params: { kind: "spring", n: 0, on: false },
    settings: {
        kind: { kind: "one of", of: KINDS },
        n: { kind: "whole", min: 0, max: 20 },
        on: { kind: "flag" },
    },
    takes: [
        { label: "A bounce spring", params: { kind: "spring", n: 0, on: false } },
        { label: "A glove handle", params: { kind: "handle", n: 0, on: false } },
        { label: "A beacon, lit", params: { kind: "beacon", n: 0, on: true } },
        { label: "A crew gate for 6", params: { kind: "gate", n: 6, on: false } },
        { label: "An open gate", params: { kind: "gate", n: 6, on: true } },
        { label: "A full battery", params: { kind: "battery", n: 0, on: true } },
        { label: "A jet flame", params: { kind: "flame", n: 2, on: true } },
        { label: "Fuel left", params: { kind: "fuel", n: 4, on: true } },
    ],
    box: (p) => BOXES[kindOf(p.kind)],
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            kind = kindOf(p.kind),
            edge = { strokeWidth: 1.3, roughness: 0.25 },
            ink = { strokeWidth: 1.4, stroke: c.t.ink, roughness: 0.2 },
            soft = c.paper ? c.t.ink : c.t["ink-soft"],
            n = Math.max(0, Math.min(20, Math.round(p.n)));
        if (kind === "spring") {
            pen.path(
                g,
                `M${0.3 * U} ${0.85 * U}Q${0.6 * U} ${0.5 * U} ${0.9 * U} ${0.85 * U}Q${1.2 * U} ${0.5 * U} ${1.5 * U} ${0.85 * U}Q${1.6 * U} ${0.6 * U} ${1.7 * U} ${0.85 * U}`,
                "pencil",
                null,
                ink,
            );
            pen.rect(g, 0.15 * U, 0.2 * U, 1.7 * U, 0.3 * U, "pencil", pen.fill("berry"), edge);
            pen.rect(
                g,
                0.25 * U,
                0.85 * U,
                1.5 * U,
                0.12 * U,
                "pencil",
                pen.fill("ink-soft"),
                edge,
            );
            return { top: [U, 0.2 * U, "up"] };
        }
        if (kind === "handle") {
            pen.circle(g, 0.5 * U, 0.5 * U, 0.75 * U, "pencil", pen.fill("glow"), edge);
            pen.circle(g, 0.5 * U, 0.5 * U, 0.32 * U, "pencil", pen.fill("card"), edge);
            return { grip: [0.5 * U, 0.5 * U, "up"] };
        }
        if (kind === "beacon") {
            pen.line(g, 0.5 * U, 0.8 * U, 0.5 * U, 2.95 * U, "pencil", { ...ink, strokeWidth: 2 });
            pen.rect(g, 0.2 * U, 2.75 * U, 0.6 * U, 0.2 * U, "pencil", pen.fill("ink-soft"), edge);
            pen.circle(
                g,
                0.5 * U,
                0.5 * U,
                0.8 * U,
                "pencil",
                pen.fill(p.on ? "glow" : "card"),
                edge,
            );
            if (p.on)
                for (const a of [-0.9, -0.3, 0.3, 0.9])
                    pen.line(
                        g,
                        0.5 * U + Math.sin(a) * 0.48 * U,
                        0.5 * U - Math.cos(a) * 0.48 * U,
                        0.5 * U + Math.sin(a) * 0.5 * U,
                        0.5 * U - Math.cos(a) * 0.5 * U,
                        "pencil",
                        { strokeWidth: 1, stroke: soft, roughness: 0.2 },
                    );
            return { light: [0.5 * U, 0.5 * U, "up"], foot: [0.5 * U, 3 * U, "down"] };
        }
        if (kind === "gate") {
            for (const x of [0.25 * U, 1.75 * U])
                pen.rect(
                    g,
                    x - 0.2 * U,
                    0.9 * U,
                    0.4 * U,
                    3.05 * U,
                    "pencil",
                    pen.fill("ink-soft"),
                    edge,
                );
            if (!p.on)
                for (let y = 1.3 * U; y < 3.9 * U; y += 0.45 * U)
                    pen.line(g, 0.45 * U, y, 1.55 * U, y + 0.15 * U, "pencil", {
                        strokeWidth: 1.6,
                        stroke: c.paper ? c.t.ink : c.t.sky,
                        roughness: 0.4,
                    });
            pen.rect(
                g,
                0.15 * U,
                0.05 * U,
                1.7 * U,
                0.8 * U,
                "pencil",
                pen.fill(p.on ? "mint" : "card"),
                edge,
            );
            if (n > 0) num(c, U, 0.65 * U, n, 13, "middle", c.t.ink);
            return { sign: [U, 0.45 * U, "up"], foot: [U, 4 * U, "down"] };
        }
        if (kind === "battery") {
            pen.rect(g, 0.15 * U, 0.2 * U, 1.5 * U, 0.6 * U, "pencil", pen.fill("card"), edge);
            pen.rect(
                g,
                1.65 * U,
                0.38 * U,
                0.2 * U,
                0.24 * U,
                "pencil",
                pen.fill("ink-soft"),
                edge,
            );
            if (p.on)
                pen.rect(g, 0.25 * U, 0.3 * U, 1.3 * U, 0.4 * U, "pencil", pen.fill("mint"), edge);
            return { middle: [U, 0.5 * U, "up"] };
        }
        if (kind === "flame") {
            const long = 0.35 + Math.min(3, Math.max(1, n)) * 0.2;
            pen.path(
                g,
                `M${0.25 * U} ${0.05 * U}Q${0.3 * U} ${long * 0.6 * U} ${0.5 * U} ${long * U}Q${0.7 * U} ${long * 0.6 * U} ${0.75 * U} ${0.05 * U}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["glow-ink"], roughness: 0.3 },
            );
            pen.path(
                g,
                `M${0.38 * U} ${0.05 * U}Q${0.42 * U} ${long * 0.45 * U} ${0.5 * U} ${long * 0.7 * U}Q${0.58 * U} ${long * 0.45 * U} ${0.62 * U} ${0.05 * U}Z`,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 0.6, stroke: "none", roughness: 0.3 },
            );
            return { nozzle: [0.5 * U, 0, "up"] };
        }
        const lit = Math.min(RING, n);
        for (let k = 0; k < RING; k++) {
            const a0 = -Math.PI / 2 + (k / RING) * Math.PI * 2 + 0.08,
                a1 = a0 + (Math.PI * 2) / RING - 0.16,
                r = 1.3 * U,
                cx = 1.5 * U,
                cy = 1.5 * U;
            pen.path(
                g,
                `M${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r}A${r} ${r} 0 0 1 ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}`,
                "pencil",
                null,
                {
                    strokeWidth: k < lit ? 3.2 : 1.2,
                    stroke: k < lit ? (c.paper ? c.t.ink : c.t.sky) : soft,
                    roughness: 0.15,
                },
            );
        }
        return { middle: [1.5 * U, 1.5 * U, "up"] };
    },
    describe: (p) => {
        const kind = kindOf(p.kind),
            n = Math.round(p.n);
        const words: Record<Kind, string> = {
            spring: "A springy bounce pad on Bolt's planet, a red top on a coiled spring that throws a robot high into the air",
            handle: "A round yellow handle on the end of a sliding plank, for Bolt's spring gloves to grab and pull",
            beacon: `A checkpoint beacon on a thin pole where Bolt starts again after a fall${p.on ? ", its light glowing because Bolt has reached it" : ", its light dark until Bolt reaches it"}`,
            gate: `A crew gate between two metal posts with ${n} on its sign${p.on ? ", standing open now that enough crew have been rescued" : ", shut by a crackling barrier until enough crew are rescued"}`,
            battery: `A small battery for Bolt${p.on ? ", full and glowing green" : ", empty and grey"}, one of the tries left on a planet`,
            flame: "A little jet flame, yellow outside and orange inside, pointing down from under Bolt's feet while it hovers",
            fuel: `A ring of six blue segments around Bolt showing the jet fuel left, ${n} of them still lit`,
        };
        return `${words[kind]}.`;
    },
    motion: { still: "Each piece of the planet kit moves only as the game moves it." },
});
