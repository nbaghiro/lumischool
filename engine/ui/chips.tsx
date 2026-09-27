// A row of choices drawn as chips, one of which is chosen: the filters a page's first card carries.
import "./chips.css";
import { For, type JSX } from "solid-js";

export function Chips<V extends string | number | null>(props: {
    legend: string;
    name: string;
    options: readonly { value: V; label: string }[];
    value: V;
    onChange: (v: V) => void;
}): JSX.Element {
    return (
        <fieldset class="filter-chips">
            <legend>{props.legend}</legend>
            <For each={props.options}>
                {(o) => (
                    <label class="filter-chip">
                        <input
                            type="radio"
                            name={props.name}
                            checked={o.value === props.value}
                            onChange={() => props.onChange(o.value)}
                        />
                        <span>{o.label}</span>
                    </label>
                )}
            </For>
        </fieldset>
    );
}
