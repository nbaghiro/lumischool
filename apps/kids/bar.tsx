// The bar of a child's page (main.tsx mounts it once): the child's portrait, which opens switching
// child, signing out and the way to the grown-ups.

import "./bar.css";
import { createSignal, createUniqueId, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Button } from "../../engine/ui/form";
import { signOut, watch } from "../../engine/ui/kid";
import { kidCredential } from "../../engine/ui/kid-session";
import type { Kid } from "../../server/db/schema";
import type { KidView } from "../../server/api";
import { Portrait } from "../../engine/ui/kids";

/** The places a child's bar opens over the map, beside their portrait; the logo goes back to the map. */
export type Place = "games" | "painting";

export function KidBar(props: {
    profile?: { view: KidView; kid?: Kid };
    /** The place open now, or null on the map; the places show only once a child is chosen. */
    place: Place | null;
    onPlace: (place: Place) => void;
    onGrownUps: () => void;
}): JSX.Element {
    const [open, setOpen] = createSignal(false);
    const id = createUniqueId();
    let menu: HTMLDivElement | undefined;
    let trigger: HTMLButtonElement | undefined;
    onMount(() => {
        const outside = (event: PointerEvent): void => {
            if (event.target instanceof Node && !menu?.contains(event.target)) setOpen(false);
        };
        const escape = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && open()) {
                setOpen(false);
                trigger?.focus();
            }
        };
        document.addEventListener("pointerdown", outside);
        document.addEventListener("keydown", escape);
        onCleanup(() => {
            document.removeEventListener("pointerdown", outside);
            document.removeEventListener("keydown", escape);
        });
    });
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const [active, setActive] = createSignal(false);
    onCleanup(
        watch((s) =>
            setActive(!s.ended && !!kidCredential() && location.pathname !== "/kids/sign-in"),
        ),
    );
    const leave = async (): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        const result = await signOut();
        if (result === true || result.error === "no-kid-session") {
            location.replace("/sign-in?for=kids");
            return;
        }
        setBusy(false);
        setSaid("Connect to the internet so your answers can be sent before you sign out.");
    };
    const link = (place: Place, label: string): JSX.Element => (
        <a
            href={`#${place}`}
            aria-current={props.place === place ? "page" : undefined}
            onClick={(e) => {
                e.preventDefault();
                props.onPlace(place);
            }}
        >
            {label}
        </a>
    );
    return (
        <Show when={active()}>
            <div class="page-nav kid-bar">
                <Show when={props.profile?.kid}>
                    <nav class="kid-places" aria-label="Places">
                        {link("games", "Games")}
                        {link("painting", "Painting")}
                    </nav>
                </Show>
                <div
                    class="kid-profile"
                    ref={(el) => {
                        menu = el;
                    }}
                    onFocusOut={(event) => {
                        if (
                            event.relatedTarget instanceof Node &&
                            !event.currentTarget.contains(event.relatedTarget)
                        )
                            setOpen(false);
                    }}
                >
                    <button
                        type="button"
                        class="kid-profile-toggle"
                        ref={(el) => {
                            trigger = el;
                        }}
                        aria-label="Your profile"
                        title={props.profile?.kid?.name ?? "Your profile"}
                        aria-expanded={open()}
                        aria-controls={id}
                        onClick={() => setOpen(!open())}
                    >
                        <Show when={props.profile?.kid} fallback={<span>Your profile</span>}>
                            {(kid) => (
                                <Portrait kid={kid()} kids={props.profile?.view.kids ?? []} />
                            )}
                        </Show>
                    </button>
                    <Show when={open()}>
                        <div class="kid-profile-options" id={id}>
                            <Show when={props.profile?.kid}>
                                <p class="kid-profile-name">{props.profile?.kid?.name}</p>
                            </Show>
                            <div class="kid-profile-actions">
                                <Button second busy={busy()} onClick={() => void leave()}>
                                    Switch child
                                </Button>
                                <Button second busy={busy()} onClick={() => void leave()}>
                                    Sign out
                                </Button>
                                <Button
                                    second
                                    disabled={busy()}
                                    onClick={() => {
                                        setOpen(false);
                                        props.onGrownUps();
                                    }}
                                >
                                    For grown-ups
                                </Button>
                            </div>
                        </div>
                    </Show>
                    <Show when={said()}>
                        <output>{said()}</output>
                    </Show>
                </div>
            </div>
        </Show>
    );
}
