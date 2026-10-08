// The map behind a page: the sample child's on the site's opening, and the country with nobody on it
// behind every other page. Where a snapshot of the map was made for the page's aim (snapshot.ts), the
// snapshot is the map: a picture behind a page's cards needs nothing a live map adds, and drawing one
// costs a scene of its own, which showed as it drew. Only an aim no snapshot was made for is drawn live,
// by Overworld (overworld.tsx), from the view the page gives once its box comes near the window and
// the page has nothing else to do. The snapshot is grown about the aim until it covers the box, so a
// wide, short window shows no bare edge.

import "./backdrop.css";
import { createEffect, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Camera, MapView } from "../space";
import { idle, onDemand, still } from "./art";
import type { Overworld } from "./overworld";
import {
    aimCamera,
    grown,
    OPENING,
    stillFor,
    type Aimed,
    type Box,
    type MapAim,
    type Snapshot,
} from "./snapshot";
import { whileNear } from "./viewport";

export type { MapAim };
export { OPENING };

/**
 * What a backdrop draws: the map's view, which the app works out (school/worlds/view.ts, which
 * engine/ui may not import), and the component that draws it, whose code the app loads with the
 * view rather than with the page, so a screen is drawn before either.
 */
export interface Ground {
    view: MapView;
    map: typeof Overworld;
}

/** How long the live map takes to come in over the snapshot, in milliseconds, as backdrop.css has it. */
const FADE = 450;
/** How long the page's framing is followed after it last changed, while late cards settle, in ms. */
const QUIET = 1000;

/** Resolves when nothing moves `el`, waiting again when a glide is taken over by a newer one, which cancels it. */
async function rested(el: Element | null | undefined): Promise<void> {
    for (let moving = el?.getAnimations() ?? []; moving.length; moving = el?.getAnimations() ?? [])
        await Promise.allSettled(moving.map((a) => a.finished));
}

const boxOf = (x: Element | DOMRect): Box => (x instanceof Element ? x.getBoundingClientRect() : x);

/**
 * A map filling a box the page sizes and places with `class`, drawn from the view `view` gives: the
 * sample child's with `sample`, which has snapshots of its own, and otherwise the country alone, which
 * shows nobody's progress and has no guide standing on it. It is framed on `aim`, and flies to a new
 * aim in about a second and a half, or cuts there under reduced motion, when its drawings rest too. The
 * place it looks at, and the drawings that travel the country, keep clear of `keepOff`, which is read
 * again whenever the camera is set. `at` is a share of `band` when a page gives one, such as the strip a
 * phone shows under a card, and of the whole box otherwise. `fade` runs its foot into the page. Nothing
 * on the page moves when the map arrives, and `onDrawn` hears when it has.
 */
export function MapBackdrop(props: {
    class: string;
    aim: MapAim;
    /** The map to draw, read once the box is near the window and the page idle: the sample child's, or the country with nobody on it. */
    ground: () => Promise<Ground>;
    /** The snapshots this map may show while it is drawn (snapshots/site.ts or country.ts). */
    stills: readonly Snapshot[];
    sample?: boolean;
    keepOff?: () => readonly (Element | DOMRect)[];
    band?: () => Element | DOMRect | null;
    fade?: boolean;
    /** Show the snapshot and never draw the map live, as in the mobile app, where a live map would be a second GPU context. */
    stillOnly?: boolean;
    onDrawn?: () => void;
}): JSX.Element {
    // Read here and in the effect, inside the component: an aim written as an expression is a memo,
    // and reading it in a callback after the view's first await would make one that nothing disposes.
    let aim = props.aim;
    const sample = props.sample === true;
    let box: HTMLDivElement | undefined;
    let disposed = false;
    /** Whether the box is near the window, which a live map is drawn only while it is. */
    let nearNow = false;
    let announced = false;
    let generation = 0;
    const announce = (): void => {
        if (disposed || announced) return;
        announced = true;
        props.onDrawn?.();
    };
    onCleanup(() => {
        disposed = true;
    });
    const [drawn, setDrawn] = createSignal(false);
    const [live, setLive] = createSignal<Ground | null>(null);
    const [picture, setPicture] = createSignal<{ src: string; at: Box } | null>(null);
    /** The zoom the chosen snapshot was drawn at, which the live map sizes its words for. */
    const [words, setWords] = createSignal<number | undefined>(undefined);
    /** The box, the band and what stands over the map, as they are now. */
    const framed = (): [Box, Box | null, Box[]] | null => {
        if (!box) return null;
        const band = props.band?.();
        return [
            box.getBoundingClientRect(),
            band ? boxOf(band) : null,
            (props.keepOff?.() ?? []).map(boxOf),
        ];
    };
    /** How much the still was grown for the aim it was framed for, which the live map keeps until it flies to another. */
    let growth: { aim: string; k: number } | null = null;
    /** Puts the snapshot where the live map would draw for the aim and the box as they are now, grown to cover the box. */
    const frame = (): void => {
        const f = framed();
        const still = f && stillFor(props.stills, aim, ...f);
        setPicture(still && { src: still.snapshot.src, at: still.at });
        if (still) setWords(still.snapshot.zoom);
        growth = still && { aim: JSON.stringify(aim), k: still.k };
    };
    /** The live map's camera for the aim, by the same arithmetic the snapshot is placed and grown by. */
    const camera = (aimed: Aimed, at: MapAim): Camera => {
        const f = framed() ?? [{ left: 0, top: 0, width: 1, height: 1 }, null, []];
        const c = aimCamera(aimed, at, ...f);
        return grown(c, aimed, at, growth?.aim === JSON.stringify(at) ? growth.k : 1);
    };
    // the still and the live map both follow the page as its cards come and move: the still glides there,
    // and the live map is put there at once until it is shown, so it opens exactly where the still is,
    // and glides there after; the following rests once the framing has held for a moment, and wakes
    // when the page changes size or the aim changes
    const [reframe, setReframe] = createSignal<{ key: string; glide: boolean }>();
    let following = 0,
        framedAs = "",
        changedAt = 0;
    const follow = (): void => {
        following = 0;
        if (disposed) return;
        const key = JSON.stringify([framed(), aim]);
        if (key !== framedAs) {
            framedAs = key;
            changedAt = performance.now();
            if (!drawn()) frame();
            setReframe({ key, glide: drawn() });
        }
        if (performance.now() - changedAt < QUIET) following = requestAnimationFrame(follow);
    };
    const wake = (): void => {
        changedAt = performance.now();
        if (!following && !disposed) following = requestAnimationFrame(follow);
    };
    onCleanup(() => {
        if (following) cancelAnimationFrame(following);
    });
    onMount(() => {
        frame();
        wake();
        if (!box) return;
        const watch = new ResizeObserver(() => {
            if (picture()) frame();
            wake();
        });
        watch.observe(box);
        // the page's cards arriving or growing change the page's height before they move the framing
        watch.observe(document.body);
        onCleanup(() => watch.disconnect());
        onCleanup(
            whileNear(box, (near) => {
                const current = ++generation;
                nearNow = near;
                // a snapshot of the aim is the map, and is shown as the map
                if (picture()) {
                    announce();
                    return;
                }
                if (!near || props.stillOnly === true) {
                    announce();
                    frame();
                    setDrawn(false);
                    setLive(null);
                    wake();
                    return;
                }
                void onDemand(props.ground)
                    .then(async (ground) => {
                        await idle();
                        if (!disposed && generation === current) setLive(ground);
                    })
                    .catch(() => announce());
            }),
        );
    });
    createEffect(
        on(
            () => props.aim,
            (next) => {
                aim = next;
                if (!drawn()) frame();
                wake();
                // an aim no snapshot was made for is drawn live
                if (!picture() && nearNow && !live() && props.stillOnly !== true) {
                    const current = ++generation;
                    void onDemand(props.ground)
                        .then(async (ground) => {
                            await idle();
                            if (!disposed && generation === current) setLive(ground);
                        })
                        .catch(() => announce());
                }
            },
            { defer: true },
        ),
    );
    return (
        <div
            ref={(el) => {
                box = el;
            }}
            class={`backdrop paper${props.fade ? " fade" : ""}${drawn() ? " drawn" : ""}${sample ? "" : " country"} ${props.class}`}
            aria-hidden="true"
        >
            <Show when={picture()}>
                {(p) => (
                    <img
                        class="backdrop-still"
                        src={p().src}
                        alt=""
                        onLoad={() => {
                            if (!live()) announce();
                        }}
                        style={{
                            left: `${p().at.left}px`,
                            top: `${p().at.top}px`,
                            width: `${p().at.width}px`,
                            height: `${p().at.height}px`,
                        }}
                    />
                )}
            </Show>
            <Show when={live()}>
                {(g) => (
                    <Dynamic
                        component={g().map}
                        class="backdrop-live"
                        view={g().view}
                        aim={props.aim}
                        aimCamera={camera}
                        wordsAt={words()}
                        reframe={reframe()}
                        hud={false}
                        steps
                        life={{ keepOff: () => props.keepOff?.() ?? [] }}
                        title="The map"
                        onDrawn={() => {
                            // the live map fades in once the still has glided to where it opens
                            void rested(box?.querySelector(".backdrop-still")).then(() => {
                                if (disposed) return;
                                setDrawn(true);
                                announce();
                                setTimeout(
                                    () => {
                                        if (!disposed && drawn()) setPicture(null);
                                    },
                                    still() ? 0 : FADE + 100,
                                );
                            });
                        }}
                    />
                )}
            </Show>
        </div>
    );
}
