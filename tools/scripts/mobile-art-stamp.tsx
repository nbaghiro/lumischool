// Mounts what tools/scripts/mobile-art.ts pictures from the web: a grown-up's stamp and the paper plane, in the
// browser through the dev server, which is what turns this file and its imports into modules.
import { render } from "solid-js/web";
import { Drawing } from "../../engine/ui/art";
import { GrownStamp } from "../../engine/ui/grown-stamp";

export function grownup(kind: string, into: Element): void {
    render(
        () => (
            <GrownStamp
                me={{ user: { id: "", email: "", name: null, settings: { picture: kind } } }}
            />
        ),
        into,
    );
}

/** The paper plane as the map's Fly button draws it, for the app's splash to fly. */
export function plane(into: Element): void {
    render(() => <Drawing id="paperplane" params={{ bank: 0 }} seed={3} class="art-plane" />, into);
}
