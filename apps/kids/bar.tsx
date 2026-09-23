// The world's guide on the bar of a child's page (main.tsx mounts it once): one tap opens the guide's
// card on what the child is doing now, the question to do on their sheet or the map (engine/ui/nudge.ts
// carries the tap and the guide's name; the screens answer it). It is drawn once a child's page has
// named its guide, and the guide's drawing comes with that page rather than with the app, so the
// page's first script carries none of it.

import "./bar.css";
import {
    createSignal,
    createUniqueId,
    lazy,
    onCleanup,
    onMount,
    Show,
    Suspense,
    type JSX,
} from "solid-js";
import { Button } from "../../engine/ui/form";
import { signOut, watch } from "../../engine/ui/kid";
import { kidCredential } from "../../engine/ui/kid-session";
import type { Kid } from "../../server/db/schema";
import type { KidView } from "../../server/api";
import { Portrait } from "../../engine/ui/kids";
import { onDemand } from "../../engine/ui/art";
import { guideOf, nudge } from "../../engine/ui/nudge";

const GuideButton = lazy(() =>
    onDemand(() => import("../../engine/ui/tutor")).then((m) => ({ default: m.GuideButton })),
);

export function KidBar(props: {
    profile?: { view: KidView; kid?: Kid };
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
    return (
        <Show when={active()}>
            <div class="page-nav kid-bar">
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
                    </Show>
                    <Show when={said()}>
                        <output>{said()}</output>
                    </Show>
                </div>
                <Show when={guideOf()}>
                    {(id) => (
                        <Suspense>
                            <GuideButton id={id()} px={48} class="kid-bar-guide" onClick={nudge} />
                        </Suspense>
                    )}
                </Show>
            </div>
        </Show>
    );
}
