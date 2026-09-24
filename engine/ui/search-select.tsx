import { createMemo, createSignal, createUniqueId, For, Show, type JSX } from "solid-js";
import "./search-select.css";

/**
 * A borderless searchable choice. Only choosing an option changes the saved value.
 * Uses the ARIA combobox/listbox pattern so focus stays in the search input on every
 * browser. Native select popups cannot provide this interaction consistently on iOS;
 * the tag-preference lint rule is scoped off for this component in .oxlintrc.json.
 */
export function SearchSelect(props: {
    label: string;
    value: string;
    options: readonly { value: string; label: string }[];
    disabled?: boolean;
    describedBy?: string;
    invalid?: boolean;
    onChange: (value: string) => void;
}): JSX.Element {
    const id = createUniqueId();
    const [open, setOpen] = createSignal(false);
    const [query, setQuery] = createSignal("");
    const [active, setActive] = createSignal(-1);
    const label = () =>
        props.options.find((option) => option.value === props.value)?.label ?? props.value;
    const matches = createMemo(() => {
        const words = query().toLowerCase().trim().split(/\s+/);
        return props.options.filter((option) =>
            words.every((word) => option.label.toLowerCase().includes(word)),
        );
    });
    const close = () => {
        setOpen(false);
        setQuery("");
        setActive(-1);
    };
    const choose = (value: string) => {
        close();
        props.onChange(value);
    };
    return (
        <div class="search-select">
            <label class="search-select-field">
                <input
                    role="combobox"
                    aria-label={props.label}
                    aria-expanded={open()}
                    aria-controls={id}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        open() && active() >= 0 ? `${id}-${active()}` : undefined
                    }
                    aria-describedby={props.describedBy}
                    aria-invalid={props.invalid || undefined}
                    autocomplete="off"
                    disabled={props.disabled}
                    value={open() ? query() : label()}
                    placeholder={open() ? "Search…" : undefined}
                    onFocus={() => setOpen(true)}
                    onClick={() => setOpen(true)}
                    onBlur={close}
                    onInput={(event) => {
                        setQuery(event.currentTarget.value);
                        setActive(-1);
                        setOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            close();
                        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                            event.preventDefault();
                            setOpen(true);
                            const count = matches().length;
                            if (!count) return;
                            const next =
                                active() < 0
                                    ? event.key === "ArrowDown"
                                        ? 0
                                        : count - 1
                                    : (active() + (event.key === "ArrowDown" ? 1 : -1) + count) %
                                      count;
                            setActive(next);
                            document
                                .getElementById(`${id}-${next}`)
                                ?.scrollIntoView({ block: "nearest" });
                        } else if (event.key === "Enter" && open()) {
                            event.preventDefault();
                            const option = matches()[active() >= 0 ? active() : 0];
                            if (option) choose(option.value);
                        }
                    }}
                />
                <span aria-hidden="true" class="search-select-arrow">
                    ▾
                </span>
            </label>
            <Show when={open()}>
                <div class="search-select-menu">
                    <div id={id} role="listbox" aria-label={props.label}>
                        <For each={matches()}>
                            {(option, index) => (
                                <div
                                    id={`${id}-${index()}`}
                                    role="option"
                                    tabIndex={-1}
                                    aria-selected={option.value === props.value}
                                    classList={{ "search-select-active": active() === index() }}
                                    onPointerDown={(event) => event.preventDefault()}
                                    onClick={() => choose(option.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            choose(option.value);
                                        }
                                    }}
                                >
                                    {option.label}
                                </div>
                            )}
                        </For>
                    </div>
                    <Show when={!matches().length}>
                        <output>No matches</output>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
