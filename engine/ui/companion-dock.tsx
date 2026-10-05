// The companion's dock: Charlie, small, beside the lesson, with what she says in a bubble and three
// icon buttons (the next step, say it again, close). Her mouth opens and shuts with the loudness of
// her voice, a cheap way to have her talk without video, and stays still under reduced motion. The
// dock floats over the page, or inside the dialog the lesson was asked from, and can be dragged by
// Charlie. It never takes focus from the sheet. The app that draws it hands the companion its way to
// the server (`Reach`), so a child's build names none of a grown-up's routes.

import "./companion-dock.css";
import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { charlie } from "../parts/people/charlie";
import {
    anchor,
    close,
    host,
    next,
    offer,
    phase,
    withdraw,
    type Reach,
    type Step,
} from "./companion";
import { Icon } from "./icon";
import { render } from "./svg";

const still = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Charlie standing, drawn twice from the shelf, her mouth shut and open, and cut to her head and
 * shoulders: the top share of her drawing, which is all the dock has room for.
 */
const SHOULDERS = 0.42;
function charlieAt(talking: boolean): SVGSVGElement {
    const { svg } = render(charlie, { ...charlie.params, pose: "stand", talking }, { seed: 4021 });
    const [x = 0, y = 0, w = 0, h = 0] = (svg.getAttribute("viewBox") ?? "").split(" ").map(Number);
    // a square round her head and shoulders, in the middle of her box
    const side = h * SHOULDERS;
    svg.setAttribute("viewBox", `${x + (w - side) / 2} ${y} ${side} ${side}`);
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("cp-charlie");
    return svg;
}

/** How far a press must move before it is a drag rather than a tap, in px. */
const DRAG_FROM = 4;

/** Where the dock was dragged to, in px from the window's top left; null where the stylesheet puts it. */
const [placed, setPlaced] = createSignal<{ x: number; y: number } | null>(null);
/** Where the dock opens before anyone drags it: beside the sheet the call was asked from. */
const [beside, setBeside] = createSignal<{ x: number; y: number } | null>(null);
/** The room between the sheet's edge and the dock, in px. */
const GAP = 16;

/**
 * Beside the lesson, level with the button that asked: right of the sheet where the window has
 * room, else left of it, else null, where the stylesheet's corner is used.
 */
function besideSheet(dock: HTMLElement, from: Element | null): { x: number; y: number } | null {
    const sheet = from?.closest(".ls-sheet");
    if (!from || !sheet) return null;
    const s = sheet.getBoundingClientRect();
    const y = from.getBoundingClientRect().top - 8;
    const w = dock.offsetWidth;
    const x =
        s.right + GAP + w <= innerWidth
            ? s.right + GAP
            : s.left - GAP - w >= 0
              ? s.left - GAP - w
              : null;
    return x === null ? null : inside(dock, x, y);
}

/** The dock kept wholly inside the window, which may have shrunk since it was put there. */
const inside = (dock: HTMLElement, x: number, y: number): { x: number; y: number } => ({
    x: Math.max(0, Math.min(x, innerWidth - dock.offsetWidth)),
    y: Math.max(0, Math.min(y, innerHeight - dock.offsetHeight)),
});

/** Drags the dock by any part of it that is not a button, so the controls and the faces still take a tap. */
function draggable(dock: HTMLElement): void {
    dock.addEventListener("pointerdown", (down) => {
        if (down.button !== 0 || (down.target instanceof Element && down.target.closest("button")))
            return;
        const box = dock.getBoundingClientRect();
        let moving = false;
        const move = (e: PointerEvent): void => {
            const dx = e.clientX - down.clientX,
                dy = e.clientY - down.clientY;
            if (!moving && Math.hypot(dx, dy) < DRAG_FROM) return;
            if (!moving) {
                moving = true;
                dock.setPointerCapture(down.pointerId);
                dock.classList.add("dragging");
            }
            setPlaced(inside(dock, box.left + dx, box.top + dy));
        };
        const end = (): void => {
            dock.removeEventListener("pointermove", move);
            dock.removeEventListener("pointerup", end);
            dock.removeEventListener("pointercancel", end);
            dock.classList.remove("dragging");
        };
        dock.addEventListener("pointermove", move);
        dock.addEventListener("pointerup", end);
        dock.addEventListener("pointercancel", end);
    });
}

/** The dock for `who`, a child's id or "" for a grown-up; the sheets offer the companion while it is up. */
export function CompanionDock(props: { who: string; reach: Reach }): JSX.Element {
    onMount(() => void offer(props.who, props.reach));
    let dock: HTMLElement | undefined;
    const keep = (): void => {
        const at = placed();
        if (dock && at) setPlaced(inside(dock, at.x, at.y));
        else if (dock) setBeside(besideSheet(dock, anchor()));
    };
    // each step opens beside the button that asked for it, until the dock is dragged somewhere
    createEffect(() => {
        anchor();
        if (phase().at !== "off") requestAnimationFrame(keep);
    });
    addEventListener("resize", keep);
    onCleanup(() => {
        removeEventListener("resize", keep);
        withdraw();
    });
    return (
        <Show when={stepNow()}>
            {(step) => (
                <Portal mount={host() ?? document.body}>
                    <aside
                        class="cp-dock"
                        classList={{ placed: (placed() ?? beside()) !== null }}
                        style={(() => {
                            const at = placed() ?? beside();
                            return at ? { left: `${at.x}px`, top: `${at.y}px` } : {};
                        })()}
                        aria-label="Charlie"
                        ref={(el) => {
                            dock = el;
                            draggable(el);
                            requestAnimationFrame(keep);
                        }}
                    >
                        <Stepped step={step()} />
                    </aside>
                </Portal>
            )}
        </Show>
    );
}

/** One round icon button of the bar, named for a screen reader and on hover. */
function Control(props: {
    icon: "restart" | "close" | "right";
    label: string;
    onClick: () => void;
    disabled?: boolean;
}): JSX.Element {
    return (
        <button
            type="button"
            class="cp-icon"
            aria-label={props.label}
            title={props.label}
            disabled={props.disabled}
            onClick={() => props.onClick()}
        >
            <Icon name={props.icon} />
        </button>
    );
}

/** What Next says on a step, by what Help does next; nothing once every rung is climbed. */
const NEXT_WORDS = {
    hint: "Next hint",
    worked: "Show me an example",
    answer: "Show me how",
    done: null,
} as const;

/** How loud the voice must be, as the mean of its waveform's distance from silence, for her mouth to open. */
const OPEN_AT = 0.035;

/**
 * A step: Charlie, the step's words in a bubble read aloud in her voice, and Next, Say it again and
 * close. While the voice plays, her mouth follows its loudness, frame by frame.
 */
function Stepped(props: { step: Step }): JSX.Element {
    const [talking, setTalking] = createSignal(false);
    const shut = charlieAt(false);
    const open = charlieAt(true);
    const sound = new Audio();
    let listen: AnalyserNode | null = null;
    let frame = 0;
    const samples = new Uint8Array(256);
    const watch = (): void => {
        cancelAnimationFrame(frame);
        if (sound.paused || still()) {
            setTalking(false);
            return;
        }
        if (listen) {
            listen.getByteTimeDomainData(samples);
            let sum = 0;
            for (const v of samples) sum += Math.abs(v - 128);
            setTalking(sum / samples.length / 128 > OPEN_AT);
        } else setTalking(Math.floor(performance.now() / 160) % 2 === 0);
        frame = requestAnimationFrame(watch);
    };
    sound.addEventListener("play", () => {
        // the voice is heard through an analyser the first time it plays, which needs the page's
        // first tap; where the browser has no Web Audio, her mouth just opens and shuts in time
        if (!listen && "AudioContext" in window)
            try {
                const ears = new AudioContext();
                listen = ears.createAnalyser();
                listen.fftSize = 512;
                ears.createMediaElementSource(sound).connect(listen);
                listen.connect(ears.destination);
            } catch {
                listen = null;
            }
        watch();
    });
    sound.addEventListener("pause", watch);
    sound.addEventListener("ended", watch);
    onCleanup(() => {
        cancelAnimationFrame(frame);
        sound.pause();
        sound.removeAttribute("src");
    });
    createEffect(() => {
        const src = props.step.voice;
        if (!src) return;
        if (sound.src !== src) sound.src = src;
        sound.currentTime = 0;
        void sound.play().catch(() => undefined);
    });
    const replay = (): void => {
        if (!props.step.voice) return;
        sound.currentTime = 0;
        void sound.play().catch(() => undefined);
    };
    const following = (): string | null => NEXT_WORDS[props.step.next];
    return (
        <section class="cp-step" classList={{ speaking: talking() }}>
            <div class="cp-who">{talking() ? open : shut}</div>
            <div class="cp-said" aria-live="polite">
                <p>{props.step.words}</p>
                <Show when={props.step.note}>{(note) => <p class="cp-note-line">{note()}</p>}</Show>
                <div class="cp-bar">
                    <Show when={following()}>
                        {(label) => <Control icon="right" label={label()} onClick={next} />}
                    </Show>
                    <Control
                        icon="restart"
                        label="Say it again"
                        disabled={!props.step.voice}
                        onClick={replay}
                    />
                    <Control icon="close" label="Close" onClick={close} />
                </div>
            </div>
        </section>
    );
}

const stepNow = (): Step | false => {
    const p = phase();
    return p.at === "step" && p.step;
};
