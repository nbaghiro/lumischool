// The children as a page shows them, in design B: in the children's view, a stamp for each child it
// was opened for, with their picture on it and their name under it, large enough for a five-year-old's
// finger, and a line while the internet is away (.docs/auth.md, flow 5); on a grown-up's card, a short
// list of the family's children.

import "./kids.css";
import { createEffect, For, Show, type JSX } from "solid-js";
import type { Marker } from "../paper";
import type { Kid } from "../../server/db/schema";
import { KidPicture } from "./art";
import { Stamp } from "./postcard";
import { announce } from "./say";

/** Each child's stamp colour, in turn, so two stamps side by side never share one. */
const GROUNDS: readonly Marker[] = ["glow", "mint", "berry", "sky", "tang"];
const TILTS = [-3, 1.5, -1, 2, -2];

const groundOf = (i: number): Marker => GROUNDS[i % GROUNDS.length] ?? "glow";

export function Stamps(props: { kids: readonly Kid[]; onChoose: (kid: Kid) => void }): JSX.Element {
    return (
        <ul class="kid-stamps">
            <For each={props.kids}>
                {(kid, i) => (
                    <li>
                        <button
                            type="button"
                            class="kid-stamp"
                            data-clear=""
                            style={{ "--tilt": `${TILTS[i() % TILTS.length] ?? 0}deg` }}
                            onClick={() => props.onChoose(kid)}
                        >
                            <span class="kid-stamp-art">
                                <Stamp
                                    class="kid-stamp-paper"
                                    picture="none"
                                    value=""
                                    ground={groundOf(i())}
                                    seed={861 + i()}
                                />
                                <KidPicture
                                    class="kid-stamp-pic"
                                    kid={kid}
                                    family={props.kids}
                                    seed={700 + i()}
                                />
                            </span>
                            <span class="kid-stamp-name">{kid.name}</span>
                        </button>
                    </li>
                )}
            </For>
        </ul>
    );
}

/**
 * The family's children on a grown-up's card, drawn small, with a line under each name and, where the
 * card offers one, something to do for each child.
 */
export function KidList(props: {
    kids: readonly Kid[];
    line: (kid: Kid) => string;
    act?: (kid: Kid) => JSX.Element;
}): JSX.Element {
    return (
        <ul class="kid-list">
            <For each={props.kids}>
                {(kid, i) => (
                    <li>
                        <KidPicture
                            class="kid-list-pic"
                            kid={kid}
                            family={props.kids}
                            seed={700 + i()}
                        />
                        <span>
                            {kid.name}
                            <small>{props.line(kid)}</small>
                        </span>
                        <Show when={props.act}>
                            {(act) => <span class="kid-list-act">{act()(kid)}</span>}
                        </Show>
                    </li>
                )}
            </For>
        </ul>
    );
}

const OFFLINE = "No internet just now. Your answers wait here until it comes back.";

/** While the internet is away, that a child's answers wait here, which is also read out once when it happens. */
export function Offline(props: { when: boolean }): JSX.Element {
    createEffect(() => {
        if (props.when) announce(OFFLINE);
    });
    return (
        <Show when={props.when}>
            <p class="offline-note" data-clear="">
                {OFFLINE}
            </p>
        </Show>
    );
}

/** One child's own stamp, in the corner of their page, coloured and drawn as it is among `kids`. */
export function Portrait(props: { kid: Kid; kids: readonly Kid[] }): JSX.Element {
    const i = (): number =>
        Math.max(
            0,
            props.kids.findIndex((k) => k.id === props.kid.id),
        );
    return (
        <span class="kid-portrait" aria-hidden="true">
            <Stamp
                class="kid-stamp-paper"
                picture="none"
                value=""
                ground={groundOf(i())}
                seed={861 + i()}
            />
            <KidPicture
                class="kid-stamp-pic"
                kid={props.kid}
                family={props.kids}
                seed={700 + i()}
            />
        </span>
    );
}
