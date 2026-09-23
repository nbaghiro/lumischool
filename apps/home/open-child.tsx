import { createSignal, onMount, Show, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { Postcard } from "../../engine/ui/postcard";
import { Say } from "../../engine/ui/say";

/** A noopener link enters here with the parent cookie; no credential is passed through the URL. */
export function OpenChild(): JSX.Element {
    const [said, setSaid] = createSignal("");
    onMount(
        () =>
            void (async () => {
                const kid = new URLSearchParams(location.search).get("child");
                if (!kid) {
                    setSaid("Choose a child from your family’s page.");
                    return;
                }
                const answer = await api.openKidSession([kid]);
                if (answer === true) {
                    location.replace("/kids");
                    return;
                }
                if (answer.error === "signed-out" || answer.error === "put-away") {
                    location.replace(
                        `/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`,
                    );
                    return;
                }
                setSaid("The view could not open. Return to your family’s page and try again.");
            })(),
    );
    return (
        <Postcard kicker="Your family" title="Opening the child’s view">
            <Show when={said()} fallback={<p>Please wait…</p>}>
                <Say text={said()} />
            </Show>
            <a href="/">Back to your family’s page</a>
        </Postcard>
    );
}
