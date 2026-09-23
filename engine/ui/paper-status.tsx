import "./reading.css";
import { Show, type JSX } from "solid-js";

export function PaperStatus(props: {
    waiting: boolean;
    failed: boolean;
    retry(): void;
}): JSX.Element {
    return (
        <Show when={props.waiting}>
            <output class="rd-status" aria-live="polite">
                <span class="hand">
                    {props.failed ? "The lessons couldn’t load." : "Opening your lessons…"}
                </span>
                <Show when={props.failed}>
                    <button type="button" class="btn second" onClick={() => props.retry()}>
                        Try again
                    </button>
                </Show>
            </output>
        </Show>
    );
}
