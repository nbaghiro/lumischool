import { splitProps, type JSX } from "solid-js";
import "./select.css";

/** A native select with the shared paper picker where the browser supports it. */
export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
    const [local, rest] = splitProps(props, ["class", "children"]);
    return (
        <select {...rest} class={`select-control ${local.class ?? ""}`}>
            {local.children}
        </select>
    );
}
