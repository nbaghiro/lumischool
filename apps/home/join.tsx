import { onMount, onCleanup, createResource, createSignal, Show, type JSX } from "solid-js";
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
        const d = data.latest;
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
        const d = data.latest;
        return d && !("error" in d) ? d : null;
    };
    const [recover, setRecover] = createSignal(false);
    onMount(() => {
        const refresh = () => {
            if (!joined() && !busy() && !data.loading && document.visibilityState === "visible")
                void refetch();
        };
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        onCleanup(() => {
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        });
    });
    useLook()({ place: "harbour" });
    const send = async () => {
        const invitation = view();
        if (!invitation || busy()) return;
        setBusy(true);
        say("");
        try {
            const current = await refetch();
            if (!current || "error" in current) return;
            const result = await api.startEmail(current.email, { shared: shared() });
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
            if ("error" in result) {
                say(failureText(result));
                setRecover(true);
                await refetch();
            } else {
                setJoined(true);
                say("You have joined.");
            }
        } finally {
            setBusy(false);
        }
    };
    return (
        <Show
            when={data.latest !== undefined}
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
                                ? "It may have expired, been cancelled, or already been used. If you already joined, sign in. Otherwise, ask a parent for a new invitation."
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
                        <Show when={recover() && !joined()}>
                            <p class="note">
                                If you joined but this page did not finish, sign in to open your
                                family.
                            </p>
                            <a class="link" href="/sign-in">
                                Sign in
                            </a>
                        </Show>
                        <output aria-live="polite">{said()}</output>
                    </Postcard>
                )}
            </Show>
        </Show>
    );
}
