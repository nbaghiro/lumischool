// The world's guide on the bar of a child's page (main.tsx mounts it once): one tap opens the guide's
// card on what the child is doing now, the question to do on their sheet or the map (engine/ui/nudge.ts
// carries the tap and the guide's name; the screens answer it). It is drawn once a child's page has
// named its guide, and the guide's drawing comes with that page rather than with the app, so the
// page's first script carries none of it.

import "./bar.css";
import { createSignal, lazy, onCleanup, Show, Suspense, type JSX } from "solid-js";
import { Button } from "../../engine/ui/form";
import { signOut, watch } from "../../engine/ui/kid";
import { kidCredential } from "../../engine/ui/kid-session";
import { onDemand } from "../../engine/ui/art";
import { guideOf, nudge } from "../../engine/ui/nudge";

const GuideButton = lazy(() =>
    onDemand(() => import("../../engine/ui/tutor")).then((m) => ({ default: m.GuideButton })),
);

export function KidBar(): JSX.Element {
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
                <Button second busy={busy()} onClick={() => void leave()}>
                    Sign out of this tab
                </Button>
                <Show when={said()}>
                    <output>{said()}</output>
                </Show>
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
