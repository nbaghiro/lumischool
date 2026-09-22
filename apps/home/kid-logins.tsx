import { createResource, createSignal, For, Show, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { Field } from "../../engine/ui/fields";
import { Button, PinInput } from "../../engine/ui/form";
import { Postcard } from "../../engine/ui/postcard";
import { Say } from "../../engine/ui/say";
import type { Failure } from "../../engine/ui/wire";
import type { KidLogins as Logins } from "../../server/api";

const failure = (f: Failure): string =>
    f.error === "fresh-sign-in"
        ? "Sign in again, then come back here to make this change."
        : (f.problem ?? "We could not save that. Check your connection and try again.");

export function KidLogins(props: { family: string; onChanged: () => void }): JSX.Element {
    const [data, { refetch }] = createResource(() => props.family, api.kidLogins);
    const [pin, setPin] = createSignal("");
    const [again, setAgain] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const ready = (): Logins | false => {
        const d = data();
        return !!d && !("error" in d) && d;
    };
    const changed = (): void => {
        void refetch();
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
        setBusy(false);
        setPin("");
        setAgain("");
        setSaid(
            r === true
                ? "The kids’ PIN is set. Previous username sign-ins are closed."
                : failure(r),
        );
        if (r === true) changed();
    };
    return (
        <Postcard focus={false} kicker="Your account" title="Kids’ sign-in">
            <p>
                Children can open their own learning page with a username and a shared kids’ PIN.
                Each browser tab keeps its own view.
            </p>
            <p class="note">
                Choose a different PIN from the grown-ups’ family PIN. This PIN never opens the
                family’s page. Changes need a sign-in in the last ten minutes.
            </p>
            <a href="/sign-in?again=1&next=%2Faccount">Sign in again</a>
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
                        <h2>{d().pinSet ? "Change the kids’ PIN" : "Set the kids’ PIN"}</h2>
                        <p class="note">
                            Setting it again closes all views opened with a username and unlocks the
                            kids’ PIN. After repeated tries, sign-in may still need a 15-minute
                            wait. Answers not sent yet are lost.
                        </p>
                        <form
                            class="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void save();
                            }}
                        >
                            <p class="note">New kids’ PIN</p>
                            <PinInput label="New kids’ PIN" value={pin()} onInput={setPin} />
                            <p class="note">Type the kids’ PIN again</p>
                            <PinInput
                                label="Type the kids’ PIN again"
                                value={again()}
                                onInput={setAgain}
                            />
                            <Button submit busy={busy()}>
                                Save kids’ PIN
                            </Button>
                        </form>
                        <Show when={said()}>
                            <Say text={said()} />
                        </Show>
                        <h2>Usernames</h2>
                        <p class="note">
                            Use 3–32 letters, numbers or hyphens, starting with a letter. Leave a
                            username blank to make one automatically. Saving closes that child’s
                            username sign-ins; answers not sent yet are lost.
                        </p>
                        <For each={d().kids}>
                            {(kid) => (
                                <LoginRow kid={kid} pinSet={d().pinSet} onChanged={changed} />
                            )}
                        </For>
                        <Show when={!d().kids.length}>
                            <p>Add a child to your family to set up their sign-in.</p>
                        </Show>
                        <a class="btn second" href="/kids/sign-in" target="_blank" rel="noopener">
                            Open kids’ sign-in in a new tab
                        </a>
                    </>
                )}
            </Show>
        </Postcard>
    );
}

function LoginRow(props: {
    kid: Logins["kids"][number];
    pinSet: boolean;
    onChanged: () => void;
}): JSX.Element {
    const [username, setUsername] = createSignal(props.kid.username ?? "");
    const [enabled, setEnabled] = createSignal(props.kid.enabled);
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const save = async (): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        const r = await api.setKidLogin(props.kid.id, username(), enabled());
        setBusy(false);
        setSaid(r === true ? "Saved." : failure(r));
        if (r === true) props.onChanged();
    };
    return (
        <form
            class="form part"
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
            <label>
                <input
                    type="checkbox"
                    checked={enabled()}
                    disabled={!props.pinSet}
                    onChange={(e) => setEnabled(e.currentTarget.checked)}
                />{" "}
                Allow {props.kid.name} to sign in
            </label>
            <Button submit second busy={busy()}>
                Save {props.kid.name}’s sign-in
            </Button>
            <Show when={said()}>
                <Say text={said()} />
            </Show>
        </form>
    );
}
