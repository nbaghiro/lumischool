// The map behind a page: the sample child's on the site's opening, and the country with nobody on it
// behind every other page. Until the live map is drawn the box shows the map's squared paper and, where
// one was made, a snapshot of the map standing where the live map will draw (snapshot.ts). The live map
// is Overworld (overworld.tsx) framed on the page's aim, drawn from the view the page gives once its box
// comes near the window and the page has nothing else to do, and it fades in over the snapshot. The
// snapshot is grown about the aim until it covers the box, so a wide, short window shows no bare edge.

import "./backdrop.css";
import { createEffect, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Camera, MapView } from "../space";
import { idle, onDemand, still } from "./art";
import type { Overworld } from "./overworld";
import {
    aimCamera,
    OPENING,
    stillFor,
    type Aimed,
    type Box,
    type MapAim,
    type Snapshot,
} from "./snapshot";
import { whenNear } from "./viewport";

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
    onDrawn?: () => void;
}): JSX.Element {
    // Read here and in the effect, inside the component: an aim written as an expression is a memo,
    // and reading it in a callback after the view's first await would make one that nothing disposes.
    let aim = props.aim;
    const sample = props.sample === true;
    let box: HTMLDivElement | undefined;
    const [drawn, setDrawn] = createSignal(false);
    const [live, setLive] = createSignal<Ground | null>(null);
    const [picture, setPicture] = createSignal<{ src: string; at: Box } | null>(null);
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
    /** Puts the snapshot where the live map would draw for the aim and the box as they are now, grown to cover the box. */
    const frame = (): void => {
        const f = framed();
        const still = f && stillFor(props.stills, aim, ...f);
        setPicture(still && { src: still.snapshot.src, at: still.at });
    };
    /** The live map's camera for the aim, by the same arithmetic the snapshot is placed by. */
    const camera = (aimed: Aimed, at: MapAim): Camera => {
        const f = framed() ?? [{ left: 0, top: 0, width: 1, height: 1 }, null, []];
        return aimCamera(aimed, at, ...f);
    };
    onMount(() => {
        frame();
        if (!box) return;
        const watch = new ResizeObserver(() => {
            if (picture()) frame();
        });
        watch.observe(box);
        onCleanup(() => watch.disconnect());
        onCleanup(
            whenNear(box, () => {
                // a map whose modules the server no longer has loads the page again, once, rather
                // than leaving the snapshot standing
                void onDemand(props.ground).then(async (ground) => {
                    // the drawings the screen's own cards wait for go first
                    await idle();
                    setLive(ground);
                });
            }),
        );
    });
    createEffect(
        on(
            () => props.aim,
            (next) => {
                aim = next;
                if (!drawn()) frame();
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
                        hud={false}
                        steps
                        life={{ keepOff: () => props.keepOff?.() ?? [] }}
                        title="The map"
                        onDrawn={() => {
                            setDrawn(true);
                            props.onDrawn?.();
                            setTimeout(() => setPicture(null), still() ? 0 : FADE + 100);
                        }}
                    />
                )}
            </Show>
        </div>
    );
}
