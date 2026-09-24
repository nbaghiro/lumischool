import { kidCredential, keepKidCredential } from "./kid-session";
// When the children's view cannot open (.docs/auth.md, flow 5): this browser holds no kid session, so
// a grown-up signs in and opens it from the family's page; or it holds one and lumischool cannot be
// reached yet, and the view waits and asks again by itself.

import { createEffect, createSignal, Show, type JSX } from "solid-js";
import { Button, PinInput } from "./form";
import { signIn } from "./kid";
import { Say } from "./say";
import { useLook } from "./page";
import { Corner, Postcard, To } from "./postcard";

const FOOT = ["A grown-up sets up your username and kids’ PIN. You do not need an email address."];

export function KidSignIn(): JSX.Element {
    if (kidCredential() === null) keepKidCredential("");
    const look = useLook();
    const [username, setUsername] = createSignal("");
    const [pin, setPin] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const submit = async (): Promise<void> => {
        if (busy()) return;
        if (!username().trim() || pin().length !== 4) {
            setSaid("Type your username and four-digit kids’ PIN.");
            return;
        }
        setBusy(true);
        setSaid("");
        const answer = await signIn(username(), pin());
        if (answer === true) {
            location.replace("/kids");
            return;
        }
        setBusy(false);
        setPin("");
        setSaid(
            answer.error === "offline"
                ? "This needs the internet. Try again when you are connected."
                : (answer.problem ??
                      "Check your username and kids’ PIN, or ask a grown-up. After several tries, wait 15 minutes before trying again."),
        );
    };
    createEffect(() => look({ logo: "none", foot: FOOT, place: "meadow" }));
    return (
        <Postcard
            kicker="The children's view"
            title="Your learning page"
            lead="Type the username and kids’ PIN your grown-up gave you."
            corner={<Corner place="meadow" seed={891} />}
            address={
                <>
                    <To who="A grown-up in this family" />
                    <a class="btn wide" href="/sign-in?shared=1">
                        Grown-ups’ sign in
                    </a>
                    <p class="note">
                        A grown-up can set up kids’ sign-in from the account page, or open a view
                        for you.
                    </p>
                </>
            }
        >
            <form
                class="form"
                autocomplete="off"
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <div class="field">
                    <label>
                        Your username
                        <input
                            name="username"
                            autocomplete="off"
                            autocapitalize="none"
                            spellcheck={false}
                            maxlength={32}
                            value={username()}
                            onInput={(e) => setUsername(e.currentTarget.value)}
                        />
                    </label>
                </div>
                <p class="note">Your kids’ PIN</p>
                <PinInput type="text" label="Your kids’ PIN" value={pin()} onInput={setPin} />
                <Button submit busy={busy()}>
                    Open my page
                </Button>
                <Show when={said()}>
                    <Say text={said()} />
                </Show>
            </form>
        </Postcard>
    );
}
