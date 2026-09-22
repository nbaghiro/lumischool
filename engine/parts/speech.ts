import type { Fill } from "../ink/pen";
import { letter, part, type Ctx } from "../ink/surface";

/**
 * The tail of a speech bubble, from the bubble's edge towards a point, both in user units from the
 * same origin, so a scene draws it after it knows where the speaker ended up.
 */
export function bubbleTail<G>(
    c: Ctx<G>,
    box: { x: number; y: number; w: number; h: number },
    to: readonly [number, number],
): void {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const dx = to[0] - cx;
    const dy = to[1] - cy;
    const side = Math.abs(dx) / Math.max(1, box.w) > Math.abs(dy) / Math.max(1, box.h);
    const ex = side ? (dx > 0 ? box.x + box.w : box.x) : cx + Math.sign(dx) * box.w * 0.2;
    const ey = side ? cy + Math.sign(dy) * box.h * 0.2 : dy > 0 ? box.y + box.h : box.y;
    const px = side ? 0 : 10;
    const py = side ? 10 : 0;
    const tip: [number, number] = [ex + (to[0] - ex) * 0.7, ey + (to[1] - ey) * 0.7];
    const corners: [number, number][] = [[ex - px, ey - py], [ex + px, ey + py], tip];
    c.pen.polygon(c.g, corners, "pencil", c.pen.fill("card"), { strokeWidth: 1.6 });
}

/** The feelings a face shows. Each differs in the brows and the mouth, which survive being printed in black. */
export const MOODS = [
    "happy",
    "sad",
    "cross",
    "scared",
    "surprised",
    "worried",
    "tired",
    "excited",
] as const;
export type Mood = (typeof MOODS)[number];

export const moodOf = (s: string): Mood => MOODS.find((m) => m === s) ?? "happy";

/**
 * A face on a head of radius r centred at (cx, cy), in user units. `hair` is 0 short, 1 bunches,
 * 2 curls and 3 long. The open eyes are a part of their own, so a face can blink.
 */
export function faceAt<G>(
    c: Ctx<G>,
    cx: number,
    cy: number,
    r: number,
    mood: string,
    hair = 0,
): void {
    const { pen, g } = c;
    const ink = c.t.ink;
    const w = Math.max(1.2, r * 0.07);
    const hairFill = pen.fill("ink-soft", "hachure", { hachureGap: Math.max(2.5, r * 0.1) });
    if (hair === 3) {
        pen.path(
            g,
            `M${cx - r * 1.02} ${cy - r * 0.1}V${cy + r * 0.95}H${cx - r * 0.6}V${cy}Z M${cx + r * 1.02} ${cy - r * 0.1}V${cy + r * 0.95}H${cx + r * 0.6}V${cy}Z`,
            "pencil",
            hairFill,
            { strokeWidth: w },
        );
    }
    if (hair === 1) {
        for (const s of [-1, 1]) {
            pen.circle(g, cx + s * r * 1.12, cy - r * 0.15, r * 0.62, "pencil", hairFill, {
                strokeWidth: w,
            });
        }
    }
    pen.circle(g, cx, cy, r * 2, "pencil", pen.fill("card"), { strokeWidth: w * 1.3 });
    if (hair === 2) {
        for (let k = 0; k < 7; k++) {
            const t = Math.PI + (k / 6) * Math.PI;
            pen.circle(
                g,
                cx + Math.cos(t) * r * 0.9,
                cy + Math.sin(t) * r * 0.9,
                r * 0.45,
                "pencil",
                hairFill,
                {
                    strokeWidth: w,
                },
            );
        }
    } else {
        pen.path(
            g,
            `M${cx - r * 0.97} ${cy - r * 0.2}A${r} ${r} 0 0 1 ${cx + r * 0.97} ${cy - r * 0.2}Q${cx + r * 0.2} ${cy - r * 0.62} ${cx - r * 0.97} ${cy - r * 0.2}Z`,
            "pencil",
            hairFill,
            { strokeWidth: w },
        );
    }
    const ex = r * 0.36;
    const ey = cy + r * 0.02;
    const dot = Math.max(3, r * 0.17);
    const eyes = (): void => {
        const e = part(c, "eyes", [cx, ey]).g;
        for (const s of [-1, 1]) {
            pen.circle(
                e,
                cx + s * ex,
                ey,
                dot,
                "ruler",
                { fill: ink, fillStyle: "solid" },
                { strokeWidth: 0.5 },
            );
        }
    };
    const wide = (): void => {
        const e = part(c, "eyes", [cx, ey]).g;
        for (const s of [-1, 1]) {
            pen.circle(e, cx + s * ex, ey, r * 0.36, "ruler", pen.fill("card"), { strokeWidth: w });
            pen.circle(
                e,
                cx + s * ex,
                ey + r * 0.03,
                dot * 0.8,
                "ruler",
                { fill: ink, fillStyle: "solid" },
                {
                    strokeWidth: 0.5,
                },
            );
        }
    };
    /** A brow for each eye, from its outer end to its inner end; `lift` raises the inner end. */
    const brows = (y: number, lift: number): void => {
        for (const s of [-1, 1]) {
            pen.line(
                g,
                cx + s * r * 0.58,
                cy - y * r,
                cx + s * r * 0.16,
                cy - (y + lift) * r,
                "pencil",
                {
                    strokeWidth: w * 1.1,
                },
            );
        }
    };
    const mouth = (d: string, fill: Fill = null): void =>
        pen.path(g, d, "pencil", fill, { strokeWidth: w * 1.1 });
    const cheeks = (): void => {
        for (const s of [-1, 1]) {
            const blush = pen.fill("berry", "hachure", { hachureGap: 2.5 });
            pen.ellipse(g, cx + s * r * 0.62, cy + r * 0.32, r * 0.34, r * 0.2, "pencil", blush, {
                strokeWidth: 0.6,
            });
        }
    };
    const drop = (x: number, y: number): void =>
        pen.path(
            g,
            `M${x} ${y - r * 0.2}Q${x + r * 0.13} ${y} ${x} ${y + r * 0.08}Q${x - r * 0.13} ${y} ${x} ${y - r * 0.2}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: w * 0.8 },
        );
    const m = moodOf(mood);
    if (m === "happy") {
        eyes();
        brows(0.36, 0.04);
        cheeks();
        mouth(
            `M${cx - r * 0.38} ${cy + r * 0.34}Q${cx} ${cy + r * 0.72} ${cx + r * 0.38} ${cy + r * 0.34}`,
        );
    } else if (m === "excited") {
        for (const s of [-1, 1]) {
            pen.arc(
                g,
                cx + s * ex,
                ey + r * 0.06,
                r * 0.34,
                r * 0.3,
                Math.PI,
                Math.PI * 2,
                "pencil",
                {
                    strokeWidth: w * 1.2,
                },
            );
        }
        brows(0.46, 0.06);
        cheeks();
        mouth(
            `M${cx - r * 0.44} ${cy + r * 0.28}H${cx + r * 0.44}Q${cx + r * 0.36} ${cy + r * 0.78} ${cx} ${cy + r * 0.78}Q${cx - r * 0.36} ${cy + r * 0.78} ${cx - r * 0.44} ${cy + r * 0.28}Z`,
            pen.fill("berry"),
        );
        for (const s of [-1, 1]) {
            for (const k of [0, 1, 2]) {
                const t = -Math.PI / 2 + s * (0.5 + k * 0.28);
                pen.line(
                    g,
                    cx + Math.cos(t) * r * 1.22,
                    cy + Math.sin(t) * r * 1.22,
                    cx + Math.cos(t) * r * 1.45,
                    cy + Math.sin(t) * r * 1.45,
                    "pencil",
                    { strokeWidth: w },
                );
            }
        }
    } else if (m === "sad") {
        eyes();
        brows(0.3, 0.16);
        mouth(
            `M${cx - r * 0.34} ${cy + r * 0.6}Q${cx} ${cy + r * 0.32} ${cx + r * 0.34} ${cy + r * 0.6}`,
        );
        drop(cx - ex - r * 0.06, ey + r * 0.4);
    } else if (m === "cross") {
        eyes();
        brows(0.42, -0.16);
        mouth(
            `M${cx - r * 0.3} ${cy + r * 0.52}Q${cx} ${cy + r * 0.4} ${cx + r * 0.3} ${cy + r * 0.52}`,
        );
        for (const s of [-1, 1]) {
            pen.line(
                g,
                cx + s * r * 0.3,
                cy + r * 0.52,
                cx + s * r * 0.36,
                cy + r * 0.58,
                "pencil",
                { strokeWidth: w },
            );
        }
    } else if (m === "scared") {
        wide();
        brows(0.52, 0.12);
        mouth(
            `M${cx - r * 0.2} ${cy + r * 0.56}Q${cx - r * 0.1} ${cy + r * 0.4} ${cx} ${cy + r * 0.52}Q${cx + r * 0.1} ${cy + r * 0.4} ${cx + r * 0.2} ${cy + r * 0.56}Q${cx} ${cy + r * 0.74} ${cx - r * 0.2} ${cy + r * 0.56}Z`,
            pen.fill("card"),
        );
        drop(cx + r * 0.86, cy - r * 0.34);
    } else if (m === "surprised") {
        wide();
        for (const s of [-1, 1]) {
            pen.arc(
                g,
                cx + s * ex,
                cy - r * 0.42,
                r * 0.44,
                r * 0.24,
                Math.PI * 1.1,
                Math.PI * 1.9,
                "pencil",
                {
                    strokeWidth: w * 1.1,
                },
            );
        }
        pen.ellipse(g, cx, cy + r * 0.52, r * 0.3, r * 0.36, "pencil", pen.fill("berry"), {
            strokeWidth: w,
        });
    } else if (m === "worried") {
        eyes();
        brows(0.32, 0.14);
        pen.curve(
            g,
            [
                [cx - r * 0.34, cy + r * 0.52],
                [cx - r * 0.17, cy + r * 0.44],
                [cx, cy + r * 0.54],
                [cx + r * 0.17, cy + r * 0.44],
                [cx + r * 0.34, cy + r * 0.52],
            ],
            "pencil",
            { strokeWidth: w * 1.1 },
        );
        drop(cx + r * 0.86, cy - r * 0.34);
    } else {
        for (const s of [-1, 1]) {
            pen.line(g, cx + s * ex - r * 0.16, ey, cx + s * ex + r * 0.16, ey, "pencil", {
                strokeWidth: w * 1.2,
            });
            pen.arc(g, cx + s * ex, ey, r * 0.32, r * 0.18, 0, Math.PI, "pencil", {
                strokeWidth: w * 0.8,
            });
        }
        pen.ellipse(g, cx, cy + r * 0.52, r * 0.2, r * 0.14, "pencil", pen.fill("card"), {
            strokeWidth: w,
        });
        const zs = Math.max(10, r * 0.34);
        const z = {
            s: "z",
            face: "read",
            weight: 700,
            fill: c.t["ink-soft"],
            anchor: "middle",
        } as const;
        letter(c, { ...z, x: cx + r * 1.02, y: cy - r * 0.7, size: zs });
        letter(c, { ...z, x: cx + r * 1.3, y: cy - r * 1.02, size: zs * 1.3 });
    }
}
