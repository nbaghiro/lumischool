// The companion's dock: the face to pick before a call, then the character's own video in a small
// tile with a bar of icon buttons under it (talk, say it again, the words, someone else, close). It
// floats over the page, or inside the dialog the lesson was asked from, and the child or grown-up can
// drag it anywhere by the video. It never takes focus from the sheet. The app that draws it hands the
// companion its way to the server (`Reach`), so a child's build names none of a grown-up's routes.

import "./companion-dock.css";
import {
    createEffect,
    createSignal,
    For,
    Match,
    onCleanup,
    onMount,
    Show,
    Switch,
    type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";
import type { Companion } from "../answer";
import {
    again,
    audio,
    caption,
    change,
    choose,
    close,
    face,
    hold,
    host,
    leaving,
    listening,
    offer,
    phase,
    speaking,
    video,
    withdraw,
    type Reach,
} from "./companion";
import { Icon } from "./icon";

/** Each face's still, a frame of its Tavus video; /assets/ is cached for a year, so a new still gets a new name. */
const FACES: { id: Companion; name: string; still: string }[] = [
    { id: "dr-paws", name: "Dr. Paws", still: "/assets/companion/dr-paws.jpg" },
    { id: "mr-edward", name: "Mr. Edward", still: "/assets/companion/mr-edward.jpg" },
    { id: "mrs-hart", name: "Mrs. Hart", still: "/assets/companion/mrs-hart.jpg" },
];

const stillOf = (id: Companion | null): string =>
    (FACES.find((f) => f.id === id) ?? FACES[0])?.still ?? "";

const still = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How far a press must move before it is a drag rather than a tap, in px. */
const DRAG_FROM = 4;

/** Where the dock was dragged to, in px from the window's top left; null where the stylesheet puts it. */
const [placed, setPlaced] = createSignal<{ x: number; y: number } | null>(null);
/** The words said, under the video, which a viewer turns on. */
const [words, setWords] = createSignal(false);

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

/**
 * The dock for `who`, a child's id or "" for a grown-up, who chose `chosen` last; the sheets offer
 * the companion while it is up.
 */
export function CompanionDock(props: {
    who: string;
    chosen: Companion | null;
    reach: Omit<Reach, "daily">;
}): JSX.Element {
    const gone = (): void => leaving();
    onMount(() => {
        const daily = () => import("@daily-co/daily-js");
        void offer(props.who, props.chosen, { ...props.reach, daily });
        addEventListener("pagehide", gone);
    });
    let dock: HTMLElement | undefined;
    const keep = (): void => {
        const at = placed();
        if (dock && at) setPlaced(inside(dock, at.x, at.y));
    };
    addEventListener("resize", keep);
    onCleanup(() => {
        removeEventListener("pagehide", gone);
        removeEventListener("resize", keep);
        withdraw();
    });
    return (
        <Show when={phase().at !== "off"}>
            <Portal mount={host() ?? document.body}>
                <aside
                    class="cp-dock"
                    classList={{ placed: placed() !== null }}
                    style={
                        placed()
                            ? { left: `${placed()?.x ?? 0}px`, top: `${placed()?.y ?? 0}px` }
                            : {}
                    }
                    aria-label="Your companion"
                    ref={(el) => {
                        dock = el;
                        draggable(el);
                        requestAnimationFrame(keep);
                    }}
                >
                    <Switch fallback={<Call />}>
                        <Match when={phase().at === "choosing"}>
                            <section class="cp-pick" aria-label="Who would you like to talk to?">
                                <For each={FACES}>
                                    {(f) => (
                                        <button
                                            type="button"
                                            class="cp-face-pick"
                                            aria-label={f.name}
                                            title={f.name}
                                            aria-pressed={f.id === (face() ?? "dr-paws")}
                                            onClick={() => choose(f.id, f.name)}
                                        >
                                            <img src={f.still} alt="" width="56" height="56" />
                                        </button>
                                    )}
                                </For>
                                <Control
                                    icon="close"
                                    label="Not now"
                                    onClick={() => void close()}
                                />
                            </section>
                        </Match>
                        <Match when={failedLine()}>
                            {(line) => (
                                <section class="cp-note">
                                    <p>{line()}</p>
                                    <Control
                                        icon="close"
                                        label="Close"
                                        onClick={() => void close()}
                                    />
                                </section>
                            )}
                        </Match>
                    </Switch>
                </aside>
            </Portal>
        </Show>
    );
}

/** One round icon button of the bar, named for a screen reader and on hover. */
function Control(props: {
    icon: "mic" | "restart" | "words" | "shuffle" | "close";
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    pressed?: boolean;
    class?: string;
    hands?: JSX.HTMLAttributes<HTMLButtonElement>;
}): JSX.Element {
    return (
        <button
            type="button"
            class={`cp-icon ${props.class ?? ""}`}
            aria-label={props.label}
            title={props.label}
            aria-pressed={props.pressed}
            disabled={props.disabled}
            onClick={() => props.onClick?.()}
            {...props.hands}
        >
            <Icon name={props.icon} />
        </button>
    );
}

function Call(): JSX.Element {
    const name = (): string => {
        const now = phase();
        return now.at === "coming" || now.at === "here" ? now.name : "";
    };
    const here = (): boolean => phase().at === "here";
    // the voice plays from an element off the page; the words said are under the video when asked for
    const sound = new Audio();
    onCleanup(() => {
        sound.pause();
        sound.srcObject = null;
    });
    let moving: HTMLVideoElement | undefined;
    createEffect(() => {
        const a = audio();
        sound.srcObject = a;
        if (a) void sound.play().catch(() => undefined);
    });
    createEffect(() => {
        const v = video();
        if (!moving) return;
        moving.srcObject = v;
        if (v) void moving.play().catch(() => undefined);
    });
    const press = (on: boolean) => (e: Event) => {
        e.preventDefault();
        if (listening() !== on) hold(on);
    };
    return (
        <section class="cp-call" classList={{ speaking: speaking(), coming: !here() }}>
            <div class="cp-stage">
                <img src={stillOf(face())} alt="" />
                <Show when={!still()}>
                    <video
                        ref={(el) => {
                            moving = el;
                        }}
                        classList={{ shown: !!video() }}
                        muted
                        autoplay
                        playsinline
                    />
                </Show>
                <Show when={!here()}>
                    <span class="cp-spin" aria-hidden="true" />
                    <output class="sr">{`${name()} is on the way`}</output>
                </Show>
                <span class="cp-name">{name()}</span>
            </div>
            <div class="cp-bar">
                <Control
                    icon="mic"
                    label={listening() ? "Listening" : "Hold to talk"}
                    class="cp-talk"
                    pressed={listening()}
                    disabled={!here()}
                    hands={{
                        onPointerDown: press(true),
                        onPointerUp: press(false),
                        onPointerLeave: () => listening() && hold(false),
                        onPointerCancel: () => listening() && hold(false),
                        onContextMenu: (e) => e.preventDefault(),
                        onKeyDown: (e) => {
                            if ((e.key === " " || e.key === "Enter") && !e.repeat) press(true)(e);
                        },
                        onKeyUp: (e) => {
                            if (e.key === " " || e.key === "Enter") press(false)(e);
                        },
                    }}
                />
                <Control icon="restart" label="Say it again" disabled={!here()} onClick={again} />
                <Control
                    icon="words"
                    label="Show the words"
                    pressed={words()}
                    onClick={() => setWords(!words())}
                />
                <Control
                    icon="shuffle"
                    label="Talk to someone else"
                    onClick={() => void change()}
                />
                <Control
                    icon="close"
                    label={`Say goodbye to ${name()}`}
                    onClick={() => void close()}
                />
            </div>
            <Show when={words() && here() && caption()}>
                <p class="cp-said" aria-live="polite">
                    {caption()}
                </p>
            </Show>
        </section>
    );
}

const failedLine = (): string | false => {
    const p = phase();
    return p.at === "failed" && p.line;
};
