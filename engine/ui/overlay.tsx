// A look at the map of every world, at a world with its run, or at a lesson as a child sees it, over
// whatever page opened it (.docs/parent-app.md, "The map, for grown-ups"): a dialog over the page
// with the same map and roll the grown-ups' map screen draws, from views the page hands in, since
// only the page may build them. Where it looks is the address after the `#` (hash.ts), so back,
// Escape and a shared link all work; focus is held inside it and given back on close; nothing is
// recorded. It opens the same way over every page: the site's opening, the grown-ups' lesson page.

import "./overlay.css";
import type { MapView } from "../space";
import {
    createResource,
    createEffect,
    createSignal,
    Match,
    onCleanup,
    onMount,
    Show,
    Switch,
    type JSX,
} from "solid-js";
import { upOf, type OverlayAt } from "./hash";
import { Overworld } from "./overworld";
import { Reading, type ReadingSource } from "./reading";
import { readingShelf } from "./reading-source";

export type { OverlayAt };

/** What a page hands the overlay to look at: the map, and each world's reading. */
export interface OverlaySource {
    /** The map, whose limits say what may be gone into. */
    map(): MapView;
    /** A world's roll and its sheets, or null for a world this page cannot show. */
    reading(world: string): ReadingSource | null;
    /** A world's name, for the heading. */
    nameOf(world: string): string;
    /** The world a lesson is met in, for a look the page named by the lesson alone (hash.ts). */
    whereIs(lesson: string): string | null;
    /** The sample child's own location when first opening the marketing map. */
    opening?: number;
}

/** The world a place on the map is of, by its index in the view. */
const worldAt = (map: MapView, place: number): string | null =>
    map.places[place]?.shown?.world ?? null;

/** The place on the map a world stands at, or null for a world the map does not draw. */
const placeOf = (map: MapView, world: string): number | null =>
    map.places.find((x) => x.shown?.world === world)?.i ?? null;

export function Overlay(props: {
    /**
     * Where the overlay looks. The page mounts it while there is a look and takes it down when there
     * is none; null is the moment between, while the page's own signal has moved on and the overlay
     * is being taken down, which reads as the map.
     */
    at: OverlayAt | null;
    /** The views, read once the overlay is open, so the page carries none of them until then. */
    source: () => Promise<OverlaySource>;
    /** The words over the stage, such as "As a child sees it". */
    kicker: string;
    /** The overlay asks to look elsewhere: into a world, up to the map, or closed (null). The page changes the address, which changes `at`. */
    go: (at: OverlayAt | null) => void;
}): JSX.Element {
    let dialog: HTMLDialogElement | undefined;
    let stage: HTMLDivElement | undefined;
    const [source] = createResource(() => props.source().catch(() => null));
    const shelf = readingShelf((world) => source()?.reading(world) ?? null);
    onCleanup(() => shelf.dispose());
    createEffect(() => {
        const s = source();
        if (!s || s.opening === undefined) return;
        const world = worldAt(s.map(), s.opening);
        if (world) shelf.warm(world);
    });
    // `box` is where the view being left put the world on the screen, so the one opening picks the
    // movement up there, as on the map screen (apps/home/map.tsx)
    const [box, setBox] = createSignal<DOMRect | undefined>();
    const [back, setBack] = createSignal<{ place: number; from: DOMRect } | undefined>();
    const [placeBack, setPlaceBack] = createSignal<number | undefined>();
    // the element that opened the overlay takes the keyboard back when it closes
    const opener = document.activeElement;
    // a lazily loaded overlay can be mounted a frame before its dialog is in the document, and a
    // dialog not in a document cannot be shown modal, so it waits for the frame that attaches it
    onMount(() => {
        const open = (): void => {
            if (!dialog || dialog.open) return;
            if (dialog.isConnected) dialog.showModal();
            else requestAnimationFrame(open);
        };
        open();
    });
    onCleanup(() => {
        dialog?.close();
        if (opener instanceof HTMLElement && opener.isConnected)
            opener.focus({ preventScroll: true });
    });
    /**
     * Escape: the roll takes it itself while it has the keyboard, and goes out with its own movement;
     * otherwise it is one layer up, and off the map the overlay closes. The key comes two ways: as a
     * keydown inside the dialog, when the map or the roll has the keyboard, which the roll's own view
     * takes and the map's leaves for here; and as the dialog's own cancel when nothing inside has it,
     * as after the roll has gone. Either way the same rule decides, and a cancel from elsewhere, such
     * as a back gesture, goes the same way.
     */
    const up = (): boolean => {
        const here = props.at ?? { world: null, lesson: null };
        if ((here.world || here.lesson) && stage?.contains(document.activeElement)) return false;
        props.go(upOf(here));
        return true;
    };
    const onKey = (e: KeyboardEvent): void => {
        if (e.key === "Escape" && up()) e.preventDefault();
    };
    const onCancel = (e: Event): void => {
        e.preventDefault();
        up();
    };
    /** The look, with a lesson's world found where the page left it to the source; a lesson nowhere is the map. */
    const at = (s: OverlaySource): OverlayAt => {
        const here = props.at ?? { world: null, lesson: null };
        const { world, lesson } = here;
        if (world || !lesson) return here;
        const found = s.whereIs(lesson);
        return found ? { world: found, lesson } : { world: null, lesson: null };
    };
    /** The world's reading the look is in, or null on the map and for a world the source cannot show. */
    const readingOf = (s: OverlaySource): ReadingSource | null => {
        const world = at(s).world;
        return world ? shelf.source(world) : null;
    };
    const title = (s: OverlaySource): string => {
        const world = at(s).world;
        return world ? s.nameOf(world) : "The map of every world";
    };
    return (
        <dialog
            class="ov"
            ref={(el) => {
                dialog = el;
            }}
            aria-label={props.kicker}
            onKeyDown={onKey}
            onCancel={onCancel}
        >
            <div class="ov-top">
                <p class="ov-words">
                    <span class="kicker">{props.kicker}</span>
                    <Show when={source()}>{(s) => <b>{title(s())}</b>}</Show>
                </p>
                <button type="button" class="btn second ov-close" onClick={() => props.go(null)}>
                    Close
                </button>
            </div>
            <div
                class="ov-stage"
                ref={(el) => {
                    stage = el;
                }}
            >
                <Switch fallback={<p class="ov-note">The map is opening.</p>}>
                    <Match when={source.state === "ready" && source() === null}>
                        <p class="ov-note">The map could not be read. Close this and try again.</p>
                    </Match>
                    <Match when={source()}>
                        {(s) => (
                            <Switch>
                                <Match when={readingOf(s())} keyed>
                                    {(reading) => (
                                        <Reading
                                            source={reading}
                                            onApproachWorld={(id) => shelf.warm(id)}
                                            onWorld={(world) => {
                                                setBox(undefined);
                                                setBack(undefined);
                                                props.go({ world, lesson: null });
                                            }}
                                            from={box()}
                                            lesson={at(s()).lesson}
                                            class="ov-world"
                                            title={title(s())}
                                            onOut={(out) => {
                                                const world = at(s()).world;
                                                const place = world
                                                    ? placeOf(s().map(), world)
                                                    : null;
                                                setBox(undefined);
                                                setPlaceBack(place ?? undefined);
                                                setBack(
                                                    place !== null && out
                                                        ? { place, from: out }
                                                        : undefined,
                                                );
                                                props.go({ world: null, lesson: null });
                                            }}
                                        />
                                    )}
                                </Match>
                                <Match when={!at(s()).world}>
                                    <Overworld
                                        view={s().map()}
                                        focus={placeBack() ?? s().opening ?? "all"}
                                        onApproach={(place) => {
                                            const world = worldAt(s().map(), place);
                                            if (world) shelf.warm(world);
                                        }}
                                        arrive={back()}
                                        class="ov-map"
                                        title="The map of every world"
                                        onGoIn={(place, at) => {
                                            const world = worldAt(s().map(), place);
                                            if (!world) return;
                                            setBack(undefined);
                                            setBox(at ?? undefined);
                                            props.go({ world, lesson: null });
                                        }}
                                    />
                                </Match>
                                <Match when={at(s()).world}>
                                    <p class="ov-note">This world cannot be shown here yet.</p>
                                </Match>
                            </Switch>
                        )}
                    </Match>
                </Switch>
            </div>
        </dialog>
    );
}
