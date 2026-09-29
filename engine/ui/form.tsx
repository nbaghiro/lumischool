// The controls a child's screen presses, the same in both apps (fields.tsx has the grown-ups' own,
// apart so the child's script never carries them): buttons, the tick, the parent PIN in four boxes,
// and the browser's own time zone, which the postcards read.

import "./form.css";
import { createSignal, For, Show, type JSX } from "solid-js";

/**
 * A tick with its words, the one checkbox every screen uses: the browser's own box stays in the page
 * for the keyboard and a screen reader, under a box drawn in the app's pen (form.css).
 */
export function Check(props: {
    label: JSX.Element;
    checked: boolean;
    onChange: (checked: boolean) => void;
    name?: string;
}): JSX.Element {
    return (
        <label class="check">
            <input
                type="checkbox"
                name={props.name}
                checked={props.checked}
                onChange={(e) => props.onChange(e.currentTarget.checked)}
            />
            <span class="check-box" aria-hidden="true" />
            <span>{props.label}</span>
        </label>
    );
}

/**
 * A button, the sheet's main one unless `second`. While `busy` it stays where it is, and in the tab
 * order, but does nothing, so focus is not lost while a request is out.
 */
export function Button(props: {
    second?: boolean;
    wide?: boolean;
    submit?: boolean;
    busy?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    children: JSX.Element;
}): JSX.Element {
    return (
        <button
            type={props.submit ? "submit" : "button"}
            class="btn"
            classList={{ second: !!props.second, wide: !!props.wide }}
            disabled={props.disabled}
            aria-disabled={props.busy || props.disabled ? true : undefined}
            onClick={(e) => {
                if (props.busy || props.disabled) {
                    e.preventDefault();
                    return;
                }
                props.onClick?.();
            }}
        >
            {props.children}
        </button>
    );
}

/**
 * The search a tab's head carries: the name of the field on its left, the field, and beside it what
 * the page found, which the page words itself. Explore and Games both use this one control.
 */
export function Search(props: {
    label: string;
    placeholder?: string;
    value: string;
    onInput: (words: string) => void;
    found?: string;
}): JSX.Element {
    return (
        <div class="search">
            <label class="field search-field">
                <span class="field-label">{props.label}</span>
                <input
                    type="search"
                    autocomplete="off"
                    placeholder={props.placeholder}
                    value={props.value}
                    onInput={(e) => props.onInput(e.currentTarget.value)}
                />
            </label>
            <Show when={props.found}>
                <p class="search-found" aria-live="polite">
                    {props.found}
                </p>
            </Show>
        </div>
    );
}

/** The browser's own time zone, which is nearly everyone's family's zone. */
export const detectedZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/**
 * Four visually masked digits. Text mode lacks native password privacy for assistive technology.
 * `onFull` is called when the fourth digit arrives.
 */
export function PinInput(props: {
    label: string;
    type?: "password" | "text";
    value: string;
    onInput: (digits: string) => void;
    onFull?: (digits: string) => void;
    describedBy?: string;
    wrong?: boolean;
    ref?: (el: HTMLInputElement) => void;
}): JSX.Element {
    const [focused, setFocused] = createSignal(false);
    const take = (el: HTMLInputElement, raw: string): void => {
        const digits = raw.replace(/\D/g, "").slice(0, 4);
        if (el.value !== digits) el.value = digits;
        if (digits === props.value) return;
        props.onInput(digits);
        if (digits.length === 4) props.onFull?.(digits);
    };
    return (
        <div class="code" classList={{ wrong: !!props.wrong }}>
            <div class="code-boxes" aria-hidden="true">
                <For each={[0, 1, 2, 3]}>
                    {(i) => (
                        <span
                            class="code-cell"
                            classList={{ now: focused() && i === Math.min(props.value.length, 3) }}
                        >
                            {i < props.value.length ? "•" : ""}
                        </span>
                    )}
                </For>
            </div>
            <input
                ref={props.ref}
                type={props.type ?? "password"}
                inputmode="numeric"
                autocomplete="off"
                enterkeyhint="go"
                spellcheck={false}
                aria-label={props.label}
                aria-describedby={props.describedBy}
                aria-invalid={props.wrong ? true : undefined}
                value={props.value}
                onInput={(e) => take(e.currentTarget, e.currentTarget.value)}
                onPaste={(e) => {
                    e.preventDefault();
                    take(e.currentTarget, e.clipboardData?.getData("text") ?? "");
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </div>
    );
}
