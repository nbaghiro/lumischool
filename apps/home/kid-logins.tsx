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

export function KidLogins(props: { family: string; onChanged: () => void }): JSX.Element {
    const [data, { refetch }] = createResource(() => props.family, api.kidLogins);
    const [editingPin, setEditingPin] = createSignal(false);
    const [pin, setPin] = createSignal("");
    const [again, setAgain] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const ready = (): Logins | false => {
        const d = data();
        return !!d && !("error" in d) && d;
    };
    const changed = async (): Promise<void> => {
        await refetch();
        props.onChanged();
    };
    const save = async (): Promise<void> => {
        if (busy()) return;
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
        setSaid(
            r === true
                ? "The kids’ PIN is set. Previous username sign-ins are closed."
                : failure(r),
        );
    };
    return (
        <Postcard focus={false} kicker="Your account" title="Kids’ sign-in">
            <p class="note">A username for each child, one shared kids’ PIN.</p>
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
                                    ? "Kids’ PIN is set"
                                    : "Set a PIN to let children sign in"}
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
                                Use a different PIN from your family PIN. Saving signs children out
                                of username sessions; unsent answers are lost.
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
                            <Say text={said()} />
                        </Show>
                        <fieldset
                            disabled={busy() || data.loading}
                            style={{ border: "0", padding: "0", margin: "0", "min-width": "0" }}
                        >
                            <For each={d().kids}>
                                {(kid) => <LoginRow kid={kid} onChanged={changed} />}
                            </For>
                        </fieldset>
                        <Show when={!d().kids.length}>
                            <p>Add a child to your family to set up their sign-in.</p>
                        </Show>
                    </>
                )}
            </Show>
        </Postcard>
    );
}

function LoginRow(props: {
    kid: Logins["kids"][number];
    onChanged: () => Promise<void>;
}): JSX.Element {
    const [editing, setEditing] = createSignal(false);
    const [username, setUsername] = createSignal(props.kid.username ?? "");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const unchanged = (): boolean => usernameOf(username()) === props.kid.username;
    const save = async (): Promise<void> => {
        if (busy() || unchanged()) return;
        if (username() !== "" && !usernameOf(username())) {
            setSaid("Use 3–32 letters, numbers or hyphens, starting with a letter.");
            return;
        }
        setBusy(true);
        const r = await api.setKidLogin(props.kid.id, username());
        setBusy(false);
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
                    <span>{props.kid.username ?? "No username yet"}</span>
                </div>
                <Show when={!editing()}>
                    <button
                        type="button"
                        class="btn second"
                        aria-label={`Edit ${props.kid.name}’s username`}
                        onClick={() => {
                            setUsername(props.kid.username ?? "");
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
                    <p class="note">
                        Leave blank for an automatic username. Changing it signs this child out of
                        username sessions; unsent answers are lost.
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
                                setSaid("");
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Show>
            <Show when={said()}>
                <Say text={said()} />
            </Show>
        </div>
    );
}
