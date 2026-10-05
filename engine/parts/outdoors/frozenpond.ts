import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "./wash";

/**
 * The pond's edge as points round a rounded oblong (a superellipse, so a long sheet of ice fits it),
 * pushed in and out a little so the shore reads as drawn by hand. `grow` widens it for the snow.
 */
function shore(w: number, h: number, grow: number): string {
    const a = w / 2 - 1.3 * U + grow,
        b = h / 2 - 1.3 * U + grow,
        n = 5,
        pts: string[] = [];
    for (let i = 0; i < 72; i++) {
        const t = (i / 72) * Math.PI * 2,
            c = Math.cos(t),
            s = Math.sin(t),
            wob = (Math.sin(t * 5 + 1.3) * 0.5 + hash(i, 41) - 0.5) * 0.35 * U,
            x = w / 2 + Math.sign(c) * Math.abs(c) ** (2 / n) * (a + wob),
            y = h / 2 + Math.sign(s) * Math.abs(s) ** (2 / n) * (b + wob);
        pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return `M${pts.join("L")}Z`;
}

export const frozenPond = defineDrawing<{ width: number; height: number; reeds: number }>({
    id: "frozenpond",
    family: "outdoors",
    title: "Frozen pond",
    group: "Props",
    about: "A frozen pond seen from above, its shore a soft hand-drawn line with snow drifted against it, pale ice with skate loops, and reeds and pebbles poking through the snow.",
    params: { width: 30, height: 14, reeds: 1 },
    settings: {
        width: { kind: "number", min: 10, max: 80, step: 0.5 },
        height: { kind: "number", min: 8, max: 40, step: 0.5 },
        reeds: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "A long pond with reeds", params: { width: 30, height: 14, reeds: 1 } },
        { label: "A small bare pond", params: { width: 16, height: 10, reeds: 0 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const w = p.width * U,
            h = p.height * U,
            snow = shore(w, h, 0.9 * U),
            ice = shore(w, h, 0);
        if (!c.paper) {
            // snow drifted round the shore, then the ice laid over it, pale at the edge and clearer in the middle
            plain(c, { kind: "path", d: snow, fill: c.t.card, opacity: 0.95 });
            plain(c, { kind: "path", d: ice, fill: c.t.sky, opacity: 0.16 });
            plain(c, { kind: "path", d: shore(w, h, -1.1 * U), fill: c.t.card, opacity: 0.35 });
            // skate loops wandering over the ice, faint enough to sit under everything drawn on it
            for (let i = 0; i < Math.round(p.width / 9); i++) {
                const x = (2.5 + hash(i, 3) * (p.width - 5)) * U,
                    y = (2.2 + hash(i, 7) * (p.height - 4.4)) * U,
                    r = (0.6 + hash(i, 11) * 0.9) * U;
                plain(c, {
                    kind: "path",
                    d: `M${x - r} ${y}C${x - r} ${y - r * 0.8} ${x + r} ${y - r * 0.8} ${x + r} ${y}S${x - r * 0.4} ${y + r * 0.6} ${x - r * 0.2} ${y + r * 0.1}`,
                    fill: "none",
                    stroke: c.t.sky,
                    width: 0.7,
                    cap: "round",
                    opacity: 0.18,
                });
            }
        }
        // the shore: the snow's soft outer edge and the line where the ice meets it
        plain(c, {
            kind: "path",
            d: snow,
            fill: "none",
            stroke: c.paper ? c.t.ink : c.t.sky,
            width: 1,
            cap: "round",
            join: "round",
            opacity: c.paper ? 0.5 : 0.35,
        });
        plain(c, {
            kind: "path",
            d: ice,
            fill: "none",
            stroke: c.paper ? c.t.ink : c.t.sky,
            width: 1.4,
            cap: "round",
            join: "round",
            opacity: c.paper ? 0.9 : 0.75,
        });
        // pebbles in the snow, and reeds standing in tufts along the shore
        const along = (i: number, k: number) => {
            const t = hash(i, k) * Math.PI * 2,
                a = w / 2 - 0.55 * U,
                b = h / 2 - 0.55 * U;
            return {
                x: w / 2 + Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** 0.4 * a,
                y: h / 2 + Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** 0.4 * b,
            };
        };
        for (let i = 0; i < 6; i++) {
            const at = along(i, 53);
            c.pen.ellipse(
                c.g,
                at.x,
                at.y,
                (0.35 + hash(i, 59) * 0.2) * U,
                0.24 * U,
                "pencil",
                c.pen.fill("ink-soft", "solid"),
                { strokeWidth: 0.8, roughness: 0.4 },
            );
        }
        if (p.reeds > 0)
            for (let i = 0; i < 5; i++) {
                const at = along(i, 61);
                for (let j = 0; j < 4; j++) {
                    const x = at.x + (j - 1.5) * 0.18 * U,
                        lean = (j - 1.5) * 0.12 * U,
                        tall = (0.6 + hash(i * 4 + j, 67) * 0.45) * U;
                    plain(c, {
                        kind: "path",
                        d: `M${x} ${at.y}Q${x + lean * 0.5} ${at.y - tall * 0.6} ${x + lean} ${at.y - tall}`,
                        fill: "none",
                        stroke: c.paper ? c.t.ink : c.t.mint,
                        width: 1.2,
                        cap: "round",
                        opacity: 0.9,
                    });
                }
            }
        return { middle: [w / 2, h / 2, "up"] };
    },
    describe: (p) =>
        `A frozen pond seen from above, ${Math.round(p.width)} squares long, with pale ice and skate loops, snow drifted round its soft shore${p.reeds > 0 ? ", and reeds and pebbles poking through" : " and a few pebbles"}.`,
    motion: { still: "Ice and snow lying on a pond never move." },
});
