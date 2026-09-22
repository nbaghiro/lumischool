// The grown-ups' controls a sheet is filled in with, apart from form.tsx so the child's script never
// carries them (.docs/structure.md): a field with its label, hint and what is wrong with it, a list
// to choose from, the tick, a button that reads as a link, the time zone offered rather than asked,
// the eight-digit code in eight boxes, and a row to choose. Their styles are form.css, one sheet for
// both.

import "./form.css";
import { createSignal, createUniqueId, For, Show, type JSX } from "solid-js";
import { digitsOf } from "./codes";

type Input = JSX.InputHTMLAttributes<HTMLInputElement>;

export function Field(props: {
    label: string;
    hint?: string;
    /** What is wrong with the value, which marks the field and is read with it. */
    error?: string;
    type?: "email" | "text";
    name: string;
    value: string;
    onInput: (value: string) => void;
    autocomplete?: Input["autocomplete"];
    autocapitalize?: Input["autocapitalize"];
    maxlength?: number;
    ref?: (el: HTMLInputElement) => void;
}): JSX.Element {
    const id = createUniqueId();
    const described = (): string | undefined =>
        [props.hint ? `${id}-hint` : "", props.error ? `${id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined;
    return (
        <div class="field">
            <label for={id}>{props.label}</label>
            <Show when={props.hint}>
                <span class="field-hint" id={`${id}-hint`}>
                    {props.hint}
                </span>
            </Show>
            <input
                id={id}
                ref={props.ref}
                type={props.type ?? "text"}
                name={props.name}
                value={props.value}
                autocomplete={props.autocomplete}
                autocapitalize={props.autocapitalize}
                maxlength={props.maxlength}
                spellcheck={false}
                aria-invalid={props.error ? true : undefined}
                aria-describedby={described()}
                onInput={(e) => props.onInput(e.currentTarget.value)}
            />
            <Show when={props.error}>
                <span class="field-error" id={`${id}-error`}>
                    {props.error}
                </span>
            </Show>
        </div>
    );
}

export function SelectField(props: {
    label: string;
    hint?: string;
    name: string;
    value: string;
    options: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
}): JSX.Element {
    const id = createUniqueId();
    return (
        <div class="field">
            <label for={id}>{props.label}</label>
            <Show when={props.hint}>
                <span class="field-hint" id={`${id}-hint`}>
                    {props.hint}
                </span>
            </Show>
            <select
                id={id}
                name={props.name}
                aria-describedby={props.hint ? `${id}-hint` : undefined}
                onChange={(e) => props.onChange(e.currentTarget.value)}
            >
                <For each={props.options}>
                    {(o) => (
                        <option value={o.value} selected={o.value === props.value}>
                            {o.label}
                        </option>
                    )}
                </For>
            </select>
        </div>
    );
}

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
            <span>{props.label}</span>
        </label>
    );
}

/** A button that reads as a link, for a step's lesser choices. */
export function TextButton(props: {
    onClick: () => void;
    label?: string;
    children: JSX.Element;
}): JSX.Element {
    return (
        <button type="button" class="link" aria-label={props.label} onClick={() => props.onClick()}>
            {props.children}
        </button>
    );
}

/**
 * The time zone as a line with a Change button, which puts the list of zones in its place. A
 * family's school days are days in one zone.
 */
export function TimeZone(props: { value: string; onChange: (zone: string) => void }): JSX.Element {
    const [open, setOpen] = createSignal(false);
    let select: HTMLSelectElement | undefined;
    const city = (): string => (props.value.split("/").pop() ?? props.value).replaceAll("_", " ");
    const zones = (): string[] => {
        const all = Intl.supportedValuesOf("timeZone");
        return all.includes(props.value) ? all : [props.value, ...all];
    };
    return (
        <div class="zone">
            <Show
                when={open()}
                fallback={
                    <>
                        <p>
                            Days are in <b>{city()} time</b>.
                        </p>
                        <button
                            type="button"
                            class="link"
                            aria-label="Change the time zone"
                            onClick={() => {
                                setOpen(true);
                                requestAnimationFrame(() => select?.focus());
                            }}
                        >
                            Change
                        </button>
                    </>
                }
            >
                <label class="zone-pick">
                    Your time zone
                    <select
                        ref={(el) => {
                            select = el;
                        }}
                        onChange={(e) => props.onChange(e.currentTarget.value)}
                    >
                        <For each={zones()}>
                            {(z) => (
                                <option value={z} selected={z === props.value}>
                                    {z.replaceAll("_", " ")}
                                </option>
                            )}
                        </For>
                    </select>
                </label>
            </Show>
        </div>
    );
}

/**
 * The sign-in code as eight boxes, four and four. It is one input under the boxes, so a phone offers
 * the code from its messages, a screen reader hears one field, and a pasted code with its space, its
 * dash or the words round it lands whole. `onFull` is called when the eighth digit arrives.
 */
export function CodeInput(props: {
    label: string;
    value: string;
    onInput: (digits: string) => void;
    onFull?: (digits: string) => void;
    describedBy?: string;
    wrong?: boolean;
    ref?: (el: HTMLInputElement) => void;
}): JSX.Element {
    const [focused, setFocused] = createSignal(false);
    const take = (el: HTMLInputElement, raw: string): void => {
        const digits = digitsOf(raw);
        if (el.value !== digits) el.value = digits;
        if (digits === props.value) return;
        props.onInput(digits);
        if (digits.length === 8) props.onFull?.(digits);
    };
    return (
        <div class="code" classList={{ wrong: !!props.wrong }}>
            <div class="code-boxes" aria-hidden="true">
                <For each={[0, 1, 2, 3, 4, 5, 6, 7]}>
                    {(i) => (
                        <>
                            <span
                                class="code-cell"
                                classList={{
                                    now: focused() && i === Math.min(props.value.length, 7),
                                }}
                            >
                                {props.value[i] ?? ""}
                            </span>
                            <Show when={i === 3}>
                                <span class="code-gap" />
                            </Show>
                        </>
                    )}
                </For>
            </div>
            <input
                ref={props.ref}
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
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

/** A row to choose, with a picture, a name and a line under it. */
export function Choice(props: {
    picture?: JSX.Element;
    name: string;
    line: string;
    busy?: boolean;
    onChoose: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            class="choice"
            classList={{ plain: !props.picture }}
            aria-disabled={props.busy ? true : undefined}
            onClick={() => {
                if (!props.busy) props.onChoose();
            }}
        >
            <Show when={props.picture}>{props.picture}</Show>
            <span class="choice-words">
                {props.name}
                <small>{props.line}</small>
            </span>
        </button>
    );
}
