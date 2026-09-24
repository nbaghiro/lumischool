import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import type { MapView } from "../../engine/space";
import { Overworld } from "../../engine/ui/overworld";

export function mountMap(
    host: HTMLElement,
    initial: MapView,
): {
    update(change: boolean): void;
    dispose(): void;
} {
    const [view, setView] = createSignal(initial);
    const dispose = render(() => <Overworld view={view()} title="Map continuity fixture" />, host);
    const map = host.querySelector<HTMLElement>(".ow-host");
    if (map) map.style.height = "100%";
    return {
        update(change) {
            const next = structuredClone(view());
            if (change) next.frame.w += 1;
            setView(next);
        },
        dispose,
    };
}
