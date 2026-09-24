import { createSignal, onCleanup, type JSX } from "solid-js";
import { Waiting } from "../../engine/ui/page";

/** The shared map loader, with recovery when a request fails or takes too long. */
export function Loading(props: {
    failed?: boolean;
    offline?: boolean;
    retry?: () => void;
}): JSX.Element {
    const [slow, setSlow] = createSignal(false);
    const timer = setTimeout(() => setSlow(true), 15_000);
    onCleanup(() => clearTimeout(timer));
    const stopped = () => props.failed || props.offline || slow();
    return (
        <Waiting
            title={
                props.offline
                    ? "Waiting for the internet"
                    : props.failed
                      ? "Your page could not load"
                      : slow()
                        ? "This is taking a long time"
                        : "Opening your page"
            }
            pending={!stopped()}
            retry={stopped() ? (props.retry ?? (() => location.reload())) : undefined}
        />
    );
}
