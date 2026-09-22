import { createEffect, onCleanup, type JSX } from "solid-js";
import { loaderOf, type Id, type ParamsOf } from "../parts/catalog";
import { motionOf } from "../parts/drawing";
import { animate, type Group, type Playing } from "./animate";
import { render } from "./svg";

let calm: Group | undefined;

const still = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A shelf drawing on a page. It is loaded the first time it is drawn, named for a screen reader by
 * its own description, and played by its declared motion unless the person asked for less motion.
 */
export function Drawing<K extends Id>(props: {
    id: K;
    /** Its settings, or a take's by its label, or its own. */
    params?: ParamsOf<K>;
    take?: string;
    seed?: number;
    class: string;
    /** False for a drawing that must hold still wherever it is, such as one beside a question. */
    moves?: boolean;
}): JSX.Element {
    let host: HTMLSpanElement | undefined;
    let playing: Playing | null = null;
    let asked = 0;
    createEffect(() => {
        const { id, params, take, seed, moves } = props;
        const mine = ++asked;
        const load = loaderOf(id);
        if (!load) return;
        void load().then((d) => {
            if (!host || mine !== asked) return;
            const chosen = params ?? d.takes.find((t) => t.label === take)?.params ?? d.params;
            const { svg } = render(d, chosen, { host, seed: seed ?? 4127 });
            svg.style.width = "100%";
            svg.style.height = "100%";
            playing?.stop();
            host.replaceChildren(svg);
            if (moves === false || still()) return;
            calm ??= animate({ intensity: "calm", settle: 16, most: 18 });
            playing = calm.play(svg, { motion: motionOf(d), key: seed ?? 0, frame: host });
        });
    });
    onCleanup(() => playing?.stop());
    return (
        <span
            ref={(el) => {
                host = el;
            }}
            class={props.class}
        />
    );
}
