import "./waiting.css";
import { createSignal, onCleanup, Show, type JSX } from "solid-js";
import { Button } from "./form";

/**
 * What a screen shows while it loads, or when it could not: the map stays the ground and one label
 * sits in the middle of it (.docs/parent-app.md, "Loading and failure"). A load shows nothing for a
 * moment, since most loads are quicker than that; a failure shows at once.
 */
export function Waiting(props: {
    title: string;
    /** Why it stopped, such as `failureText` of the failure, in a line under the title. */
    detail?: string | undefined;
    retry?: (() => void) | undefined;
    pending?: boolean;
}): JSX.Element {
    const [shown, setShown] = createSignal(props.pending === false);
    const timer = setTimeout(() => setShown(true), 400);
    onCleanup(() => clearTimeout(timer));
    return (
        <Show when={shown()}>
            <output class="page-waiting" aria-live="polite">
                <span class="page-waiting-label">
                    <Show when={props.pending !== false}>
                        <span class="page-waiting-spinner" aria-hidden="true" />
                    </Show>
                    <span class="page-waiting-text">
                        <span>
                            {props.title}
                            {props.pending !== false ? "…" : ""}
                        </span>
                        <Show when={props.detail}>
                            {(d) => <span class="page-waiting-detail">{d()}</span>}
                        </Show>
                    </span>
                    <Show when={props.retry}>
                        {(retry) => (
                            <Button second onClick={() => retry()()}>
                                Try again
                            </Button>
                        )}
                    </Show>
                </span>
            </output>
        </Show>
    );
}
