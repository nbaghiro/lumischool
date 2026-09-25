import { onCleanup, onMount, createResource, createSignal, For, Show, type JSX } from "solid-js";
import * as api from "../../engine/ui/api";
import { Postcard } from "../../engine/ui/postcard";
import { Button } from "../../engine/ui/form";
import { Field } from "../../engine/ui/fields";
import { failureText } from "../../engine/ui/failure";
import { emailOf } from "../../school/family/login";
import type { Failure } from "../../engine/ui/wire";

export function Members(props: {
    family: string;
    user: string;
    children?: JSX.Element;
}): JSX.Element {
    const [data, { refetch }] = createResource(
        () => props.family,
        () => api.familyMembers(),
    );
    onMount(() => {
        const refresh = () => {
            if (!busy() && !data.loading && document.visibilityState === "visible") void refetch();
        };
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        onCleanup(() => {
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        });
    });
    const [inviting, setInviting] = createSignal(false);
    const [email, setEmail] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [said, say] = createSignal("");
    const [removing, setRemoving] = createSignal<{ id: string; name: string } | null>(null);
    const view = () => {
        const d = data.latest;
        return d && !("error" in d) ? d : null;
    };
    const fail = (f: Failure) => {
        say(failureText(f));
    };
    const run = async (work: () => Promise<void>) => {
        if (busy()) return;
        setBusy(true);
        say("");
        try {
            await work();
        } finally {
            setBusy(false);
        }
    };
    const invite = async (address: string) => {
        const valid = emailOf(address);
        if (!valid) {
            say("Enter a complete email address.");
            return;
        }
        const error = await api.inviteParent(valid);
        if (error) {
            fail(error);
            if (error.error === "delivery-failed") {
                setEmail(valid);
                setInviting(true);
            }
            await refetch();
            return;
        }
        say(`Invitation sent to ${valid}.`);
        setInviting(false);
        setEmail("");
        await refetch();
    };
    const remove = async () => {
        const target = removing();
        if (!target) return;
        const result = await api.removeParent(target.id);
        if ("error" in result) {
            fail(result);
            return;
        }
        setRemoving(null);
        if (result.left) {
            location.assign(
                result.notificationFailed ? "/sign-in?left=1&mail=failed" : "/sign-in?left=1",
            );
            return;
        }
        say(
            result.notificationFailed
                ? "Access ended. Some notification emails could not be sent. Let the other parents know."
                : "Access ended. Consider changing the shared parent and kids’ PINs.",
        );
        await refetch();
    };
    return (
        <div id="family-members">
            <Postcard wide kicker="Your family" title="Your family">
                {props.children}
                <h2 class="members-heading">Parents</h2>
                <p class="note">Each parent has full access and their own email sign-in.</p>
                <Show when={data.latest !== undefined} fallback={<p>Loading family members…</p>}>
                    <Show
                        when={view()}
                        fallback={
                            <>
                                <p>We could not load family members.</p>
                                <Button second onClick={() => void refetch()}>
                                    Try again
                                </Button>
                            </>
                        }
                    >
                        {(v) => (
                            <>
                                <ul class="member-list">
                                    <For each={v().parents}>
                                        {(parent) => (
                                            <li>
                                                <div>
                                                    <strong>
                                                        {parent.name ?? "Parent"}
                                                        {parent.id === props.user ? " · You" : ""}
                                                    </strong>
                                                    <span class="note">{parent.email}</span>
                                                </div>
                                                <Button
                                                    second
                                                    disabled={busy() || v().parents.length < 2}
                                                    onClick={() =>
                                                        setRemoving({
                                                            id: parent.id,
                                                            name: parent.name ?? parent.email,
                                                        })
                                                    }
                                                >
                                                    {parent.id === props.user ? "Leave" : "Remove"}
                                                </Button>
                                            </li>
                                        )}
                                    </For>
                                </ul>
                                <Show when={removing()}>
                                    {(target) => (
                                        <div class="member-confirm">
                                            <p>
                                                {target().id === props.user
                                                    ? "Leave this family?"
                                                    : `Remove ${target().name} from this family?`}{" "}
                                                Their access and child views opened by them will
                                                end. Past work stays in the record. Answers not yet
                                                sent may be lost.
                                            </p>
                                            <div class="acts">
                                                <Button
                                                    disabled={busy()}
                                                    onClick={() => void run(remove)}
                                                >
                                                    Confirm{" "}
                                                    {target().id === props.user
                                                        ? "leave"
                                                        : "removal"}
                                                </Button>
                                                <Button
                                                    second
                                                    disabled={busy()}
                                                    onClick={() => setRemoving(null)}
                                                >
                                                    Keep access
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Show>
                                <Show when={v().invitations.length}>
                                    <h3>Invited</h3>
                                    <p class="note">
                                        Resending replaces the earlier link. If sending fails,
                                        resend to get a working invitation.
                                    </p>
                                    <ul class="member-list">
                                        <For each={v().invitations}>
                                            {(invitation) => (
                                                <li>
                                                    <div>
                                                        <strong>{invitation.email}</strong>
                                                        <span class="note">
                                                            {invitation.expired
                                                                ? "Expired"
                                                                : `Expires ${new Date(invitation.expires).toLocaleDateString()}`}
                                                        </span>
                                                    </div>
                                                    <div class="acts">
                                                        <Button
                                                            second
                                                            disabled={busy()}
                                                            onClick={() =>
                                                                void run(() =>
                                                                    invite(invitation.email),
                                                                )
                                                            }
                                                        >
                                                            Resend
                                                        </Button>
                                                        <Button
                                                            second
                                                            disabled={busy()}
                                                            onClick={() =>
                                                                void run(async () => {
                                                                    const error =
                                                                        await api.cancelInvitation(
                                                                            invitation.id,
                                                                        );
                                                                    if (error) {
                                                                        fail(error);
                                                                        await refetch();
                                                                    } else {
                                                                        say(
                                                                            "Invitation cancelled.",
                                                                        );
                                                                        await refetch();
                                                                    }
                                                                })
                                                            }
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                </Show>
                                <Show
                                    when={inviting()}
                                    fallback={
                                        <Button
                                            second
                                            disabled={busy()}
                                            onClick={() => setInviting(true)}
                                        >
                                            Invite a parent
                                        </Button>
                                    }
                                >
                                    <form
                                        class="member-invite"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            void run(() => invite(email()));
                                        }}
                                    >
                                        <Field
                                            label="Their email address"
                                            type="email"
                                            name="email"
                                            value={email()}
                                            onInput={setEmail}
                                            autocomplete="email"
                                        />
                                        <p class="note">
                                            They will be able to manage every child, lesson, family
                                            setting and parent’s access.
                                        </p>
                                        <div class="acts">
                                            <Button submit disabled={busy() || !emailOf(email())}>
                                                {busy() ? "Sending…" : "Send invitation"}
                                            </Button>
                                            <Button
                                                second
                                                disabled={busy()}
                                                onClick={() => setInviting(false)}
                                            >
                                                Not now
                                            </Button>
                                        </div>
                                    </form>
                                </Show>
                            </>
                        )}
                    </Show>
                </Show>
                <output aria-live="polite">{said()}</output>
            </Postcard>
        </div>
    );
}
