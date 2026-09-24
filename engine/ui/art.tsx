// The two drawings a screen puts on its own paper, through the loader (drawings.ts), so a screen is
// on the page, styled and answering before its drawings, and a page that draws nothing never loads
// them. The drawing itself is draw.ts, behind a dynamic import with the loader, the drawing surface
// (svg.ts, with the pen) and the player, so a page's first script carries none of them, not even
// the loader's list of chunks to preload (tools/__tests__/first-view.test.ts).

import { createEffect, type JSX } from "solid-js";
import type { Kid } from "../../server/db/schema";
import type { Id, ParamsOf } from "../parts/catalog";

/** Nothing moves for a person who asked for less motion. */
export const still = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Once the page has nothing else to do, or after a second and a half whatever it is doing. Safari has
 * no idle callback, so there it is a moment after the screen is drawn.
 */
export const idle = (): Promise<void> =>
    new Promise((done) => {
        if (typeof window.requestIdleCallback === "function")
            window.requestIdleCallback(() => done(), { timeout: 1500 });
        else setTimeout(done, 200);
    });

/** Import failures belong to the requesting surface; they must never reload an active lesson. */
export const onDemand = <T,>(load: () => Promise<T>): Promise<T> => load();

/** The bar's bird (mark.tsx), drawn by draw.ts: the one dynamic import of it, here with the boxes', so the bar's own chunk names no list of chunks to preload. */
export const drawBird = (host: HTMLElement): Promise<void> =>
    import("./draw").then((m) => m.bird(host));

/** A box on the page that draw.ts draws into once it is there, and again when what it shows changes. */
function Box(props: {
    class: string;
    draw: (host: HTMLElement, drawer: Promise<typeof import("./draw")>) => Promise<void>;
}): JSX.Element {
    let host: HTMLSpanElement | undefined;
    createEffect(() => {
        if (host) void props.draw(host, import("./draw"));
    });
    return (
        <span
            ref={(el) => {
                host = el;
            }}
            class={props.class}
            aria-hidden="true"
        />
    );
}

/**
 * A child's picture: the creature their settings name, or the one their place in the family gives
 * them, never a brother's or sister's (pictures.ts), standing at the bottom middle of its box, as
 * big as the box allows. `family` is every child shown with them.
 */
export function KidPicture(props: {
    kid: Pick<Kid, "id" | "settings">;
    family: readonly Pick<Kid, "id" | "settings">[];
    seed: number;
    class: string;
}): JSX.Element {
    return (
        <Box
            class={props.class}
            draw={(host, drawer) => {
                const { kid, family, seed } = props;
                return drawer.then((m) => m.drawKid(host, { kid, family, seed }));
            }}
        />
    );
}

/** A shelf drawing filling its box, such as the envelope on the sheet that asks for a code, drawn once the box is on the page, since a drawing reads its colours from where it sits. */
export function Drawing<K extends Id>(props: {
    id: K;
    params: ParamsOf<K>;
    seed: number;
    class: string;
}): JSX.Element {
    return (
        <Box
            class={props.class}
            draw={(host, drawer) => {
                const { id, params, seed } = props;
                return drawer.then((m) => m.drawShelf(host, id, params, seed));
            }}
        />
    );
}
