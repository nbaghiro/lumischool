import { usernameOf } from "../../school/family/login";
import { createResource, createSignal, For, Show, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { Field } from "../../engine/ui/fields";
import { Button, PinInput } from "../../engine/ui/form";
import { Postcard } from "../../engine/ui/postcard";
import { Say } from "../../engine/ui/say";
import type { Failure } from "../../engine/ui/wire";
import type { KidLogins as Logins } from "../../server/api";

const failure = (f: Failure): string =>
    f.problem ?? "We could not save that. Check your connection and try again.";

export function KidLogins(props: {
    family: string;
    onChanged: () => void;
    children?: JSX.Element;
}): JSX.Element {
    const [data, { refetch }] = createResource(() => props.family, api.kidLogins);
    const [editingPin, setEditingPin] = createSignal(false);
    const [pin, setPin] = createSignal("");
    const [again, setAgain] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const [success, setSuccess] = createSignal(false);
    const ready = (): Logins | false => {
        const d = data.latest;
        return !!d && !("error" in d) && d;
    };
    const changed = async (): Promise<void> => {
        await refetch();
        props.onChanged();
    };
    const save = async (): Promise<void> => {
        if (busy()) return;
        setSuccess(false);
        if (pin().length !== 4 || pin() !== again()) {
            setSaid("Type the same four-digit PIN twice.");
            return;
        }
        setBusy(true);
        const r = await api.setKidsPin(pin());
        if (r === true) {
            setEditingPin(false);
            await changed();
        }
        setBusy(false);
        setPin("");
        setAgain("");
        setSuccess(r === true);
        setSaid(
            r === true
                ? "Shared kids’ PIN saved. Children using it have been signed out."
                : failure(r),
        );
    };
    return (
        <Postcard focus={false} kicker="Your family" title="Sign-in & PINs">
            <h2 class="kids-heading">Kids</h2>
            <p class="note">One username per child. A shared PIN, or a PIN of their own.</p>
            <Show
                when={ready()}
                fallback={
                    <output>
                        {data() ? "We could not load kids’ sign-in." : "Loading kids’ sign-in…"}
                    </output>
                }
            >
                {(d) => (
                    <>
                        <div class="kid-login-summary">
                            <span>
                                {d().pinSet
                                    ? "Shared kids’ PIN · Set"
                                    : "Shared kids’ PIN · Not set"}
                            </span>
                            <Show when={!editingPin()}>
                                <Button
                                    second
                                    onClick={() => {
                                        setEditingPin(true);
                                        setSaid("");
                                    }}
                                >
                                    {d().pinSet ? "Change kids’ PIN" : "Set kids’ PIN"}
                                </Button>
                            </Show>
                        </div>
                        <Show when={editingPin()}>
                            <p class="note">
                                Use a different PIN from your parent PIN. Saving signs out children
                                who use the shared PIN. Children with their own PIN stay signed in.
                            </p>
                            <form
                                class="form kids-pin-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void save();
                                }}
                            >
                                <div class="kids-pin-fields">
                                    <div class="kids-pin-field">
                                        <p class="note">New kids’ PIN</p>
                                        <PinInput
                                            label="New kids’ PIN"
                                            value={pin()}
                                            onInput={setPin}
                                        />
                                    </div>
                                    <div class="kids-pin-field">
                                        <p class="note">Type it again</p>
                                        <PinInput
                                            label="Type the kids’ PIN again"
                                            value={again()}
                                            onInput={setAgain}
                                        />
                                    </div>
                                </div>
                                <div class="acts">
                                    <Button submit busy={busy()}>
                                        Save kids’ PIN
                                    </Button>
                                    <Button
                                        second
                                        disabled={busy()}
                                        onClick={() => {
                                            setEditingPin(false);
                                            setPin("");
                                            setAgain("");
                                            setSaid("");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </Show>
                        <Show when={said()}>
                            <Say tone={success() ? "success" : "error"} text={said()} />
                        </Show>
                        <fieldset
                            disabled={busy() || data.loading}
                            style={{ border: "0", padding: "0", margin: "0", "min-width": "0" }}
                        >
                            <For each={d().kids}>
                                {(kid) => (
                                    <LoginRow
                                        kid={kid}
                                        sharedPin={d().pinSet}
                                        onChanged={changed}
                                    />
                                )}
                            </For>
                        </fieldset>
                        <Show when={!d().kids.length}>
                            <p>Add a child to your family to set up their sign-in.</p>
                        </Show>
                    </>
                )}
            </Show>
            {props.children}
        </Postcard>
    );
}

function LoginRow(props: {
    kid: Logins["kids"][number];
    sharedPin: boolean;
    onChanged: () => Promise<void>;
}): JSX.Element {
    const [editing, setEditing] = createSignal(false);
    const [username, setUsername] = createSignal(props.kid.username ?? "");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const [success, setSuccess] = createSignal(false);
    const [own, setOwn] = createSignal(props.kid.ownPin);
    const [pin, setPin] = createSignal("");
    const [again, setAgain] = createSignal("");
    const unchanged = (): boolean =>
        usernameOf(username()) === props.kid.username &&
        own() === props.kid.ownPin &&
        !pin() &&
        !again();
    const save = async (): Promise<void> => {
        if (busy() || unchanged()) return;
        setSuccess(false);
        if (username() !== "" && !usernameOf(username())) {
            setSaid("Use 3–32 letters, numbers or hyphens, starting with a letter.");
            return;
        }
        if (
            own() &&
            (!props.kid.ownPin || pin() || again()) &&
            (pin().length !== 4 || pin() !== again())
        ) {
            setSaid("Type the same four-digit PIN twice.");
            return;
        }
        if (!own() && !props.sharedPin) {
            setSaid("Set the shared PIN first, or choose Use own PIN.");
            return;
        }
        setBusy(true);
        const r = await api.setKidLogin(
            props.kid.id,
            username(),
            own() ? pin() || undefined : null,
        );
        setPin("");
        setAgain("");
        setBusy(false);
        setSuccess(r === true);
        setSaid(r === true ? "Saved." : failure(r));
        if (r === true) {
            setEditing(false);
            await props.onChanged();
        }
    };
    return (
        <div class="kid-login-row">
            <div class="kid-login-summary">
                <div class="kid-login-identity">
                    <strong>{props.kid.name}</strong>
                    <span>
                        <span>{props.kid.username ?? "No username yet"}</span> ·{" "}
                        {props.kid.ownPin ? "Own PIN" : "Shared PIN"}
                    </span>
                </div>
                <Show when={!editing()}>
                    <button
                        type="button"
                        class="btn second"
                        aria-label={`Edit ${props.kid.name}’s sign-in`}
                        onClick={() => {
                            setUsername(props.kid.username ?? "");
                            setOwn(props.kid.ownPin);
                            setPin("");
                            setAgain("");
                            setSaid("");
                            setEditing(true);
                        }}
                    >
                        Edit
                    </button>
                </Show>
            </div>
            <Show when={editing()}>
                <form
                    class="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                >
                    <Field
                        label={`${props.kid.name}’s username`}
                        name={`username-${props.kid.id}`}
                        value={username()}
                        onInput={setUsername}
                        maxlength={32}
                        autocapitalize="none"
                        autocomplete="off"
                    />
                    <fieldset class="kid-pin-choice" disabled={busy()}>
                        <legend>PIN</legend>
                        <label>
                            <input
                                type="radio"
                                name={`pin-mode-${props.kid.id}`}
                                checked={!own()}
                                disabled={!props.sharedPin}
                                onChange={() => {
                                    setOwn(false);
                                    setPin("");
                                    setAgain("");
                                }}
                            />
                            Use shared PIN
                        </label>
                        <label>
                            <input
                                type="radio"
                                name={`pin-mode-${props.kid.id}`}
                                checked={own()}
                                onChange={() => {
                                    setOwn(true);
                                    setPin("");
                                    setAgain("");
                                }}
                            />
                            Use own PIN
                        </label>
                    </fieldset>
                    <Show when={!props.sharedPin}>
                        <p class="note">Set the shared PIN above to use it here.</p>
                    </Show>
                    <Show when={own()}>
                        <Show when={props.kid.ownPin}>
                            <p class="note">Leave the PIN blank to keep it.</p>
                        </Show>
                        <div class="kids-pin-fields">
                            <div class="kids-pin-field">
                                <p class="note">New PIN</p>
                                <PinInput
                                    label={`${props.kid.name}’s new PIN`}
                                    value={pin()}
                                    onInput={setPin}
                                />
                            </div>
                            <div class="kids-pin-field">
                                <p class="note">Type it again</p>
                                <PinInput
                                    label={`Repeat ${props.kid.name}’s PIN`}
                                    value={again()}
                                    onInput={setAgain}
                                />
                            </div>
                        </div>
                    </Show>
                    <p class="note">
                        Saving changes signs out only this child. Unsent answers may be lost.
                    </p>
                    <div class="acts">
                        <Button submit second busy={busy()} disabled={unchanged()}>
                            Save {props.kid.name}’s sign-in
                        </Button>
                        <Button
                            second
                            disabled={busy()}
                            onClick={() => {
                                setEditing(false);
                                setPin("");
                                setAgain("");
                                setSaid("");
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Show>
            <Show when={said()}>
                <Say tone={success() ? "success" : "error"} text={said()} />
            </Show>
        </div>
    );
}
