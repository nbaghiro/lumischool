// A postcard taped onto the map, the card every step is written on in design B: the message on the
// left with its links at the foot, and on the right the corner with its stamp and postmark and the
// address under it, either side of a pencil rule. Without an address it is one side, a note.

import "./postcard.css";
import { createUniqueId, onMount, Show, type JSX } from "solid-js";
import type { Marker } from "../paper";
import { Drawing } from "./art";
import { detectedZone } from "./form";
import { focusOnceShown } from "./say";

/** The worlds along the road the map's camera travels between the steps. */
export type Place = "meadow" | "harbour" | "railway";

/**
 * Each place's stamp, so the stamp on a card shows the world the camera is at. The small pictures a
 * stamp carries have no train, so the railway's stamp is blank and the shelf's train is drawn on it.
 */
const STAMPS: Record<Place, { picture: string; ground: Marker }> = {
    meadow: { picture: "tree", ground: "mint" },
    harbour: { picture: "lighthouse", ground: "sky" },
    railway: { picture: "none", ground: "tang" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today as a postmark says it, "14 Sep", in the browser's own day. */
const today = (): string => {
    const d = new Date();
    return `${d.getDate()} ${MONTHS[d.getMonth()] ?? ""}`;
};

/** The city of the browser's own time zone, which a card is postmarked from. */
const postedFrom = (): string => {
    const zone = detectedZone();
    return (zone.split("/").pop() ?? zone).replaceAll("_", " ");
};

/** A postage stamp. `value` is the figure in its corner, and a child's picture stamp has none. */
export function Stamp(props: {
    picture: string;
    ground: Marker;
    seed: number;
    value?: string;
    class?: string;
    /** A washed ground, for the stamp a grown-up's portrait stands on beside a child's. */
    quiet?: boolean;
    /** Square rather than the 4 by 5 of a sheet, which is the grown-ups' own shape; unset is tall. */
    shape?: "tall" | "square";
}): JSX.Element {
    return (
        <Drawing
            class={props.class ?? "stamp"}
            id="poststamp"
            params={{
                picture: props.picture,
                ground: props.ground,
                value: props.value ?? "2",
                shape: props.shape,
                ...(props.quiet ? { quiet: 1 } : {}),
            }}
            seed={props.seed}
        />
    );
}

/** A card's corner: the postmark, from the browser's city unless `from` says, over the place's stamp. */
export function Corner(props: { place: Place; seed: number; from?: string }): JSX.Element {
    return (
        <div class="postcard-corner">
            <Drawing
                class="postmark"
                id="postmark"
                params={{ place: props.from ?? postedFrom(), date: today(), waves: 3 }}
                seed={props.seed + 1}
            />
            <Show
                when={props.place === "railway"}
                fallback={<Stamp {...STAMPS[props.place]} seed={props.seed} />}
            >
                <span class="stamp drawn">
                    <Stamp {...STAMPS.railway} seed={props.seed} class="stamp-paper" />
                    <Drawing
                        class="stamp-picture"
                        id="train"
                        params={{ carriages: 1, windows: 2, on: 0 }}
                        seed={props.seed + 2}
                    />
                </span>
            </Show>
        </div>
    );
}

/**
 * A postcard. The title takes focus when the card appears, so a screen reader hears the new step,
 * unless the step moves focus itself. `under` is the card a reply is laid on: it is seen and not
 * read, and nothing on it can be reached.
 */
export function Postcard(props: {
    kicker: JSX.Element;
    title: JSX.Element;
    lead?: JSX.Element;
    leadId?: string;
    focus?: boolean;
    corner?: JSX.Element;
    address?: JSX.Element;
    links?: JSX.Element;
    note?: boolean;
    wide?: boolean;
    under?: boolean;
    reply?: boolean;
    children?: JSX.Element;
}): JSX.Element {
    const id = createUniqueId();
    let title: HTMLHeadingElement | undefined;
    onMount(() => {
        if (props.focus !== false && !props.under && title) focusOnceShown(title);
    });
    return (
        <article
            class="postcard"
            classList={{
                one: !props.address,
                note: !!props.note,
                wide: !!props.wide,
                under: !!props.under,
                reply: !!props.reply,
            }}
            data-clear=""
            aria-labelledby={props.under ? undefined : id}
            aria-hidden={props.under ? true : undefined}
            inert={props.under}
        >
            <Show when={!props.note}>
                <span class="postcard-tape" aria-hidden="true" />
                <span class="postcard-tape r" aria-hidden="true" />
            </Show>
            <div class="postcard-msg">
                <p class="kicker">{props.kicker}</p>
                <h1
                    id={id}
                    class="postcard-title"
                    tabindex={-1}
                    ref={(el) => {
                        title = el;
                    }}
                >
                    {props.title}
                </h1>
                <Show when={props.lead}>
                    <p class="postcard-lead" id={props.leadId}>
                        {props.lead}
                    </p>
                </Show>
                {props.children}
            </div>
            <Show
                when={props.address}
                fallback={
                    <Show when={props.corner}>
                        <div class="postcard-float">{props.corner}</div>
                    </Show>
                }
            >
                <span class="postcard-rule" aria-hidden="true" />
                <div class="postcard-addr">
                    {props.corner}
                    {props.address}
                </div>
            </Show>
            <Show when={props.links}>
                <div class="postcard-links">{props.links}</div>
            </Show>
        </article>
    );
}

/** A line written on the card by hand, in the teacher's blue. */
export function Ps(props: { children: JSX.Element }): JSX.Element {
    return <p class="postcard-ps">{props.children}</p>;
}

/** Who the card is addressed to, on the address side. */
export function To(props: { who: JSX.Element }): JSX.Element {
    return (
        <p class="postcard-to">
            <span class="postcard-to-label">To</span>
            <span class="postcard-to-who">{props.who}</span>
        </p>
    );
}

/** A card addressed to one family, to choose it: its name, what the person is there, and a stamp. */
export function Addressed(props: {
    name: string;
    line: string;
    stamp: { picture: string; ground: Marker };
    seed: number;
    busy?: boolean;
    onChoose: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            class="postcard-choice"
            data-clear=""
            aria-disabled={props.busy ? true : undefined}
            onClick={() => {
                if (!props.busy) props.onChoose();
            }}
        >
            <span class="postcard-choice-words">
                <span class="postcard-choice-name">{props.name}</span>
                <span>{props.line}</span>
            </span>
            <span class="postcard-rule" aria-hidden="true" />
            <span class="postcard-choice-corner">
                <Stamp {...props.stamp} seed={props.seed} />
            </span>
        </button>
    );
}
