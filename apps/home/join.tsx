import { createResource, createSignal, Show, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { Postcard } from "../../engine/ui/postcard";
import { Button } from "../../engine/ui/form";
import { CodeInput, Field, Check } from "../../engine/ui/fields";
import { failureText } from "../../engine/ui/failure";
import { useLook } from "../../engine/ui/page";

export function Join(): JSX.Element {
    const token = new URLSearchParams(location.hash.slice(1)).get("t") ?? "";
    const [data, { refetch }] = createResource(() => api.invitation(token));
    const unavailable = () => {
        const d = data();
        return d && "error" in d && d.error === "not-found";
    };
    const [name, setName] = createSignal("");
    const [code, setCode] = createSignal("");
    const [sent, setSent] = createSignal(false);
    const [shared, setShared] = createSignal(true);
    const [busy, setBusy] = createSignal(false);
    const [said, say] = createSignal("");
    const [joined, setJoined] = createSignal(false);
    const view = () => {
        const d = data();
        return d && !("error" in d) ? d : null;
    };
    useLook()({ place: "harbour" });
    const send = async () => {
        const invitation = view();
        if (!invitation || busy()) return;
        setBusy(true);
        say("");
        try {
            const result = await api.startEmail(invitation.email, { shared: shared() });
            if (result !== true) say(failureText(result));
            else {
                setSent(true);
                setCode("");
                say("A code is on its way. Use the newest code from this tab.");
            }
        } finally {
            setBusy(false);
        }
    };
    const accept = async () => {
        if (busy()) return;
        setBusy(true);
        say("");
        try {
            const result = await api.acceptInvitation(token, code(), name());
            if ("error" in result) say(failureText(result));
            else {
                setJoined(true);
                say(
                    result.notificationFailed
                        ? "You have joined. Some notification emails could not be sent; let the other parents know."
                        : "You have joined. The other parents have been notified.",
                );
            }
        } finally {
            setBusy(false);
        }
    };
    return (
        <Show
            when={!data.loading}
            fallback={<Postcard kicker="An invitation" title="Opening your invitation" />}
        >
            <Show
                when={view()}
                fallback={
                    <Postcard
                        kicker="An invitation"
                        title={
                            unavailable()
                                ? "This invitation is no longer available"
                                : "We could not open this invitation"
                        }
                        lead={
                            unavailable()
                                ? "It may have expired or been cancelled. Ask a parent in the family for a new invitation."
                                : "Please try again when you have a connection."
                        }
                    >
                        <Show when={!unavailable()}>
                            <Button second onClick={() => void refetch()}>
                                Try again
                            </Button>
                        </Show>
                        <a class="link" href="/sign-in">
                            Sign in
                        </a>
                    </Postcard>
                }
            >
                {(invitation) => (
                    <Postcard
                        kicker="An invitation"
                        title={
                            joined() ? "You’re part of the family" : `Join ${invitation().family}`
                        }
                        lead={`${invitation().inviter} invited you to join as a parent.`}
                    >
                        <Show
                            when={!joined()}
                            fallback={
                                <a class="btn" href="/">
                                    Open your family’s page
                                </a>
                            }
                        >
                            <p>
                                You will have full access to the children, lessons, calendar and
                                family settings, including managing parents. You share the family
                                PIN.
                            </p>
                            <p class="note">
                                We’ll verify <strong>{invitation().email}</strong>. This signs this
                                browser in as you. Other families on your account stay yours.
                            </p>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void (sent() ? accept() : send());
                                }}
                            >
                                <Field
                                    label="Your name"
                                    name="name"
                                    value={name()}
                                    onInput={setName}
                                    autocomplete="name"
                                    maxlength={80}
                                />
                                <Show when={!sent()}>
                                    <Check
                                        checked={shared()}
                                        onChange={setShared}
                                        label="This is a shared device"
                                    />
                                </Show>
                                <Show when={sent()}>
                                    <CodeInput
                                        label="Email code"
                                        value={code()}
                                        onInput={setCode}
                                    />
                                </Show>
                                <div class="acts">
                                    <Button
                                        submit
                                        disabled={
                                            busy() ||
                                            !name().trim() ||
                                            (sent() && code().length !== 8)
                                        }
                                    >
                                        {busy()
                                            ? "Please wait…"
                                            : sent()
                                              ? "Join family"
                                              : "Send me a code"}
                                    </Button>
                                    <Show when={sent()}>
                                        <Button
                                            second
                                            disabled={busy()}
                                            onClick={() => void send()}
                                        >
                                            Send another code
                                        </Button>
                                    </Show>
                                </div>
                            </form>
                            <p class="note">
                                Ask the other parent for the shared PIN. It is never included in
                                email.
                            </p>
                        </Show>
                        <output aria-live="polite">{said()}</output>
                    </Postcard>
                )}
            </Show>
        </Show>
    );
}
