// The world's guide drawn small, turned toward what it points at, with three arcs at its head while
// the device's voice reads (voice.ts). The teaching board draws it (teaching.tsx). Nothing here moves
// under reduced motion.

import "./tutor.css";
import { createEffect, createSignal, on, onMount, type JSX } from "solid-js";
import type { GuideAnchors, GuidePose } from "../parts/guide/design";
import { DEFAULT_FRAME, designOf, renderGuide } from "./guide";
import { el } from "./svg";
import { voice } from "./voice";

const [speaking, setSpeaking] = createSignal(false);
let listening = false;
const hear = (): void => {
    if (listening) return;
    listening = true;
    voice().onChange(setSpeaking);
};

const still = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The guide drawn at `px` tall, turned toward `aim` (the guide's own units, 0..60 its box), with
 * the speaking mark at its head while the voice plays. The drawing is made once per pose.
 */
export function Guide(props: {
    id: string;
    px: number;
    pose: GuidePose;
    aim: [number, number];
    /** A drawing that does not idle, on a button or in a bar. */
    quiet?: boolean;
    class?: string;
}): JSX.Element {
    hear();
    let host: HTMLSpanElement | undefined;
    let anchors: GuideAnchors | null = null;
    const k = (): number => props.px / (DEFAULT_FRAME[3] ?? 72);
    const draw = (): void => {
        if (!host) return;
        const g = renderGuide(
            designOf(props.id),
            { pose: props.pose, aim: props.aim },
            { host, k: k(), frame: DEFAULT_FRAME, boil: !props.quiet && !still() },
        );
        g.svg.removeAttribute("role");
        g.svg.removeAttribute("aria-label");
        anchors = g.anchors;
        host.replaceChildren(g.svg, mark());
    };
    /** Three arcs at the guide's head, shown while the voice plays. */
    const mark = (): SVGSVGElement => {
        const [hx, hy, side] = anchors?.head ?? [30, 0, "top"];
        const [fx, fy] = DEFAULT_FRAME;
        const s = el("svg", {
            viewBox: "0 0 24 24",
            width: 14 * k() * 1.6,
            height: 14 * k() * 1.6,
            class: "tu-mark",
            "aria-hidden": "true",
        });
        const dx = side === "right" ? 6 : side === "left" ? -18 : -6;
        s.style.left = `${(hx - fx + dx) * k()}px`;
        s.style.top = `${(hy - fy - 16) * k()}px`;
        for (const r of [5, 9, 13]) {
            const p = el("path", { d: arc(r), fill: "none", "stroke-width": "2.2" }, s);
            p.setAttribute("stroke", "currentColor");
            p.setAttribute("stroke-linecap", "round");
        }
        return s;
    };
    onMount(draw);
    createEffect(on(() => [props.pose, props.aim, props.px], draw, { defer: true }));
    return (
        <span
            class={`tu-guide ${props.class ?? ""}`}
            classList={{ speaking: speaking() }}
            style={{ width: `${props.px}px`, height: `${props.px}px` }}
            aria-hidden="true"
            ref={(node) => {
                host = node;
            }}
        />
    );
}

/** An arc of radius r round the point 4,12, opening to the right, in the mark's 24 by 24 box. */
const arc = (r: number): string => {
    const a = Math.PI / 4;
    const x0 = 4 + r * Math.cos(-a),
        y0 = 12 + r * Math.sin(-a);
    const x1 = 4 + r * Math.cos(a),
        y1 = 12 + r * Math.sin(a);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
