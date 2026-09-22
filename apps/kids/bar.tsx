// The world's guide on the bar of a child's page (main.tsx mounts it once): one tap opens the guide's
// card on what the child is doing now, the question to do on their sheet or the map (engine/ui/nudge.ts
// carries the tap and the guide's name; the screens answer it). It is drawn once a child's page has
// named its guide, and the guide's drawing comes with that page rather than with the app, so the
// page's first script carries none of it.

import "./bar.css";
import { lazy, Show, Suspense, type JSX } from "solid-js";
import { onDemand } from "../../engine/ui/art";
import { guideOf, nudge } from "../../engine/ui/nudge";

const GuideButton = lazy(() =>
    onDemand(() => import("../../engine/ui/tutor")).then((m) => ({ default: m.GuideButton })),
);

export function KidBar(): JSX.Element {
    return (
        <Show when={guideOf()}>
            {(id) => (
                <div class="page-nav kid-bar">
                    <Suspense>
                        <GuideButton id={id()} px={48} class="kid-bar-guide" onClick={nudge} />
                    </Suspense>
                </div>
            )}
        </Show>
    );
}
