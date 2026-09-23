import { createEffect, type JSX } from "solid-js";
import { icon, type IconName } from "../parts/apps/icon";
import { render } from "./svg";
import "./icon.css";

export function iconElement(name: IconName): SVGSVGElement {
    const { svg } = render(icon, { name, on: false }, { seed: 2711 });
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.classList.add("control-icon");
    return svg;
}

/** The containing control supplies the accessible name. */
export function Icon(props: { name: IconName }): JSX.Element {
    let host: HTMLSpanElement | undefined;
    createEffect(() => host?.replaceChildren(iconElement(props.name)));
    return (
        <span
            class="control-icon-wrap"
            aria-hidden="true"
            ref={(el) => {
                host = el;
            }}
        />
    );
}
