import {
    createEffect,
    createSignal,
    createUniqueId,
    on,
    Show,
    splitProps,
    type JSX,
} from "solid-js";
import { SearchSelect } from "./search-select";
import "./inline-edit.css";

/** A borderless input for controlled flows, such as verifying a changed email address. */
export function InlineInput(props: JSX.InputHTMLAttributes<HTMLInputElement>): JSX.Element {
    const [local, rest] = splitProps(props, ["class", "onKeyDown"]);
    return (
        <input
            {...rest}
            class={`inline-input ${local.class ?? ""}`}
            onKeyDown={(event) => {
                if (typeof local.onKeyDown === "function") local.onKeyDown(event);
                else if (local.onKeyDown) local.onKeyDown[0](local.onKeyDown[1], event);
                if (event.key === "Enter" && !event.defaultPrevented) event.currentTarget.blur();
            }}
        />
    );
}

/** Text saves on blur or Enter; choices save on selection. Return an error message to retain the draft. */
export function InlineEdit(props: {
    label: string;
    value: string;
    readonly?: boolean;
    maxlength?: number;
    options?: readonly { value: string; label: string }[];
    validate?: (value: string) => string | null;
    save: (value: string) => Promise<true | string>;
    onSaved?: (value: string) => void;
}): JSX.Element {
    const status = createUniqueId();
    const [value, setValue] = createSignal(props.value);
    const [saved, setSaved] = createSignal(props.value);
    const [busy, setBusy] = createSignal(false);
    const [message, setMessage] = createSignal("");
    const [invalid, setInvalid] = createSignal(false);
    createEffect(
        on(
            () => props.value,
            (next) => {
                if (value() === saved()) setValue(next);
                setSaved(next);
            },
            { defer: true },
        ),
    );
    const save = async (): Promise<void> => {
        if (busy() || props.readonly || value().trim() === saved()) return;
        const next = value().trim();
        const error = props.validate?.(next);
        if (error) {
            setInvalid(true);
            setMessage(error);
            return;
        }
        setBusy(true);
        setInvalid(false);
        setMessage("Saving…");
        let result: true | string;
        try {
            result = await props.save(next);
        } catch {
            result = "Could not save. Try again.";
        }
        setBusy(false);
        if (result === true) {
            setValue(next);
            setSaved(next);
            setMessage("Saved");
            props.onSaved?.(next);
        } else {
            setInvalid(true);
            setMessage(result);
        }
    };
    return (
        <div class="inline-edit">
            <Show when={!props.readonly} fallback={props.value}>
                <Show
                    when={props.options}
                    fallback={
                        <InlineInput
                            aria-label={props.label}
                            aria-describedby={message() ? status : undefined}
                            aria-invalid={invalid() || undefined}
                            value={value()}
                            maxlength={props.maxlength}
                            disabled={busy()}
                            onInput={(event) => {
                                setValue(event.currentTarget.value);
                                setMessage("");
                                setInvalid(false);
                            }}
                            onBlur={() => void save()}
                        />
                    }
                >
                    {(options) => (
                        <SearchSelect
                            label={props.label}
                            describedBy={message() ? status : undefined}
                            invalid={invalid()}
                            value={value()}
                            disabled={busy()}
                            options={options()}
                            onChange={(next) => {
                                setValue(next);
                                void save();
                            }}
                        />
                    )}
                </Show>
            </Show>
            <output id={status} class="inline-status" aria-live="polite">
                {message()}
            </output>
        </div>
    );
}
