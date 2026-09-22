// The world's guide as a child's help, one tap away (.docs/ai.md, "The guide"): a button that is the
// guide drawn small, and the card it opens, with the guide turned toward the work, the lines it can
// say and a small speaker on each, and the asks under them. The card decides nothing and holds no
// content: the page hands it every line, each an authored string or a fixed one, and hears each
// press. Every line can be read aloud with the device's voice (voice.ts), which the guide marks by
// three arcs at its head while it plays; there is no lip sync and no persona. Nothing here moves
// under reduced motion.

import "./tutor.css";
import { createEffect, createSignal, For, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import type { GuideAnchors, GuidePose } from "../parts/guide/design";
import { ASK_WORDS, type GuideAsk } from "./asks";
import { announce } from "./say";
import { DEFAULT_FRAME, designOf, renderGuide } from "./guide";
import { el } from "./svg";
import { voice } from "./voice";

export type { GuideAsk } from "./asks";

/** A line on the card: the question's words, a hint, a rule's line, or a fixed line. */
export interface GuideLine {
    text: string;
    kind: "ask" | "hint" | "said" | "fixed";
}

/** The guide's word on a button: "the firefly", "the paper bird". */
export const guideWord = (id: string): string => `the ${designOf(id).name.toLowerCase()}`;

const [speaking, setSpeaking] = createSignal(false);
let listening = false;
const hear = (): void => {
    if (listening) return;
    listening = true;
    voice().onChange(setSpeaking);
};

/** Reads a line aloud, if the device can and the page has been touched. */
export const read = (text: string): boolean => {
    hear();
    return voice().speak(text);
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

/** The guide as a button: on the bar, at the end of a question's strip, or over the map. */
export function GuideButton(props: {
    id: string;
    px: number;
    /** The card it opens is open. */
    open?: boolean;
    /** Lit after a wrong try, so a child who is stuck finds it. */
    lit?: boolean;
    onClick: () => void;
    class?: string;
}): JSX.Element {
    return (
        <button
            type="button"
            class={`tu-btn ${props.class ?? ""}`}
            classList={{ lit: props.lit ?? false }}
            aria-label={`Help from ${guideWord(props.id)}`}
            aria-expanded={props.open ?? false}
            onClick={props.onClick}
        >
            <Guide id={props.id} px={props.px} pose="idle" aim={[-40, 20]} quiet />
            <span class="tu-label">Help</span>
        </button>
    );
}

/**
 * The card the guide opens: the guide turned toward the work, the lines said so far with a speaker on
 * each, and the asks. `lines[0]` is read aloud as the card opens when the voice is on. In a sheet
 * it stands in the flow under the question's strip; over the map it stands beside the guide.
 */
export function GuideCard(props: {
    id: string;
    lines: readonly GuideLine[];
    asks: readonly Exclude<GuideAsk, "read">[];
    /** Read the first line aloud as the card opens, and offer a speaker on each line. */
    voice: boolean;
    pose: GuidePose;
    onAsk: (ask: Exclude<GuideAsk, "read">) => void;
    onClose: () => void;
    closeWord?: string;
    class?: string;
}): JSX.Element {
    hear();
    const canRead = (): boolean => props.voice && voice().available();
    let card: HTMLElement | undefined;
    // the question's words alone as the card opens, whatever was already opened under it, and each
    // new line as it comes; every line is announced for a child who uses a reader
    let heard = 0;
    createEffect(() => {
        const lines = props.lines;
        const fresh = heard === 0 ? lines.slice(0, 1) : lines.slice(heard);
        heard = lines.length;
        const text = fresh.map((l) => l.text).join(" ");
        if (!text) return;
        announce(text);
        if (canRead()) read(text);
    });
    onCleanup(() => voice().stop());
    return (
        <section
            class={`tu-card ${props.class ?? ""}`}
            aria-label={`${designOf(props.id).name} says`}
            ref={(node) => {
                card = node;
            }}
        >
            <Guide id={props.id} px={56} pose={props.pose} aim={[70, -20]} class="tu-card-guide" />
            <div class="tu-body">
                <Show when={props.lines.length > 0}>
                    <ol class="tu-lines">
                        <For each={props.lines}>
                            {(line) => (
                                <li class={`tu-line ${line.kind}`}>
                                    <span class="tu-words">{line.text}</span>
                                    <Show when={canRead()}>
                                        <button
                                            type="button"
                                            class="tu-speak"
                                            aria-label={`${ASK_WORDS.read}: ${line.text}`}
                                            onClick={() => read(line.text)}
                                        >
                                            <span class="tu-ear" aria-hidden="true" />
                                        </button>
                                    </Show>
                                </li>
                            )}
                        </For>
                    </ol>
                </Show>
                <div class="tu-asks">
                    <For each={props.asks}>
                        {(ask) => (
                            <button
                                type="button"
                                class={`tu-ask ${ask}`}
                                onClick={() => props.onAsk(ask)}
                            >
                                <span class="tu-pic" aria-hidden="true" />
                                {ASK_WORDS[ask]}
                            </button>
                        )}
                    </For>
                    <button
                        type="button"
                        class="tu-ask off"
                        onClick={() => {
                            voice().stop();
                            props.onClose();
                            card?.dispatchEvent(new CustomEvent("tu-closed", { bubbles: true }));
                        }}
                    >
                        {props.closeWord ?? "Got it"}
                    </button>
                </div>
            </div>
        </section>
    );
}
