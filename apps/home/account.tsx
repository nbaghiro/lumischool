import { InlineEdit, InlineInput } from "../../engine/ui/inline-edit";
import { Members } from "./members";
import { Select } from "../../engine/ui/select";
import "./account.css";
import { KidLogins } from "./kid-logins";
import {
    createEffect,
    createResource,
    createSignal,
    For,
    Match,
    on,
    onCleanup,
    Show,
    Switch,
    type JSX,
} from "solid-js";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { Choice, Field } from "../../engine/ui/fields";
import { Button, PinInput } from "../../engine/ui/form";
import { useLook, Waiting } from "../../engine/ui/page";
import { Corner, Postcard } from "../../engine/ui/postcard";
import { go } from "../../engine/ui/router";
import { focusOnceShown, Say } from "../../engine/ui/say";
import type { Failure } from "../../engine/ui/wire";
import { isParent } from "../../school/family/access";
import { familyName } from "../../school/family/names";
import type { FamilyView, Me } from "../../server/api";
import { Drawing } from "../../engine/ui/art";
import { GROWNUP_WORD, GROWNUPS } from "../../engine/parts/apps/grownup";
import { familyChanged, GrownStamp, knowFamily, pickedPortrait, portraitOf } from "./bar";
import { signInFor } from "./routes";

const local = onThisComputer(location.hostname);

interface Seen {
    me: Me;
    view: FamilyView;
}

/** Account identity and family details, without session-list dependencies. */
async function load(): Promise<Seen | { failure: Failure } | null> {
    const me = await api.me({ ask: true });
    if ("error" in me) {
        if (me.error === "put-away") {
            location.replace("/sign-in?locked=1");
            return null;
        }
        if (me.error !== "signed-out") return { failure: me };
        go(signInFor("/account"), { replace: true });
        return null;
    }
    const view = await api.familyRows({ ask: true });
    if ("error" in view) return { failure: view };
    return { me, view };
}

export function Account(): JSX.Element {
    const look = useLook();
    const [seen, { refetch }] = createResource(load);
    createEffect(on(familyChanged, () => void refetch(), { defer: true }));
    const refreshOnReturn = (): void => {
        if (document.visibilityState === "visible" && !seen.loading) void refetch();
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    onCleanup(() => {
        window.removeEventListener("focus", refreshOnReturn);
        document.removeEventListener("visibilitychange", refreshOnReturn);
    });
    const signed = (): Seen | null => {
        const s = seen.latest;
        return s && "me" in s ? s : null;
    };
    const failed = (): Failure | null => {
        const s = seen.latest;
        return s && "failure" in s ? s.failure : null;
    };
    createEffect(() => {
        const s = signed();
        if (s) knowFamily(s.me, s.view);
        look({
            place: "harbour",
            wide: true,
            foot: s
                ? [
                      `Signed in as ${s.me.user.email}`,
                      "Everything here is your family's, and nobody else's.",
                  ]
                : [],
        });
    });
    return (
        <Show when={seen.latest} fallback={<Waiting title="Opening your account" />}>
            <Switch>
                <Match when={failed()}>
                    {(f) => (
                        <Postcard note kicker="Your account" title="Your account did not load">
                            <Say
                                text={failureText(f(), local)}
                                action={{ label: "Try again", run: () => void refetch() }}
                            />
                        </Postcard>
                    )}
                </Match>
                <Match when={signed()}>
                    {(s) => (
                        <div class="ga">
                            <You seen={s()} onRefetch={() => void refetch()} />
                            <Show when={isParent(s().me.members)}>
                                <Members family={s().me.family.id} user={s().me.user.id}>
                                    <Show when={s().me.family.id} keyed>
                                        {(_family) => (
                                            <FamilyDetails
                                                me={s().me}
                                                onChanged={() => void refetch()}
                                            />
                                        )}
                                    </Show>
                                </Members>
                                <KidLogins
                                    family={s().me.family.id}
                                    onChanged={() => void refetch()}
                                >
                                    <ParentPin
                                        pinSet={s().view.pin}
                                        onChanged={() => void refetch()}
                                    />
                                </KidLogins>
                            </Show>
                            <Show when={isParent(s().me.members)}>
                                <Postcard focus={false} kicker="Your account" title="Notifications">
                                    <WeeklyEmail />
                                </Postcard>
                                <DeleteFamily me={s().me} kids={s().view.kids} />
                            </Show>
                        </div>
                    )}
                </Match>
            </Switch>
        </Show>
    );
}

/** Who is signed in, their family and the others they are in, and the way out of this browser or every one. */
function You(props: { seen: Seen; onRefetch: () => void }): JSX.Element {
    const me = (): Me => props.seen.me;
    const others = (): Me["families"] =>
        me().families.filter((f) => f.family_id !== me().family.id);
    const [busy, setBusy] = createSignal<"switch" | "out" | null>(null);
    const [said, setSaid] = createSignal("");
    const switchTo = async (family: string): Promise<void> => {
        if (busy()) return;
        setBusy("switch");
        const r = await api.switchFamily(family);
        setBusy(null);
        if ("me" in r) props.onRefetch();
        else setSaid(failureText(r, local));
    };
    const out = async (): Promise<void> => {
        if (busy()) return;
        setBusy("out");
        setSaid("");
        const r = await api.signOut();
        if (r === true) {
            location.assign("/sign-in");
            return;
        }
        setBusy(null);
        setSaid(`You are still signed in. ${failureText(r, local)}`);
    };
    return (
        <Postcard
            kicker="Your account"
            title={me().user.name?.trim() || me().user.email}
            corner={<Corner place="harbour" seed={903} />}
        >
            <Show when={me().family.id} keyed>
                {(_family) => <AccountDetails me={me()} onChanged={props.onRefetch} />}
            </Show>
            <YourPicture me={me()} onPicked={props.onRefetch} />
            <Show when={others().length}>
                <section class="part">
                    <h2>Your other families</h2>
                    <ul class="choices">
                        <For each={others()}>
                            {(f) => (
                                <li>
                                    <Choice
                                        name={`Switch to ${familyName(f.name, true)}`}
                                        line={
                                            f.kid_id
                                                ? "You tutor a child there"
                                                : "You are a parent there"
                                        }
                                        busy={busy() !== null}
                                        onChoose={() => void switchTo(f.family_id)}
                                    />
                                </li>
                            )}
                        </For>
                    </ul>
                </section>
            </Show>
            <section class="part">
                <h2>Sign out</h2>
                <p class="note">
                    Signs you out on this browser across tabs. Children stay signed in.
                </p>
                <div class="acts">
                    <Button second busy={busy() === "out"} onClick={() => void out()}>
                        Sign out
                    </Button>
                </div>
                <Show when={said()}>
                    <Say text={said()} />
                </Show>
            </section>
        </Postcard>
    );
}

/** The picture on the grown-up's stamp: one of the shelf's people, as a child has a creature. */
function YourPicture(props: { me: Me; onPicked: () => void }): JSX.Element {
    const [busy, setBusy] = createSignal<string | null>(null);
    const [said, setSaid] = createSignal("");
    const pick = async (kind: string): Promise<void> => {
        if (busy()) return;
        setBusy(kind);
        setSaid("");
        const r = await api.setPicture(kind);
        setBusy(null);
        if (r !== true) {
            setSaid(failureText(r, local));
            return;
        }
        props.onPicked();
    };
    return (
        <section class="part">
            <h2>Your picture</h2>
            <p class="note">
                {pickedPortrait(props.me)
                    ? "The picture on your stamp on the bar. Pick another to change it."
                    : "The picture on your stamp on the bar was picked for you. Pick another to change it."}
            </p>
            <div class="ga-stamp">
                <GrownStamp me={props.me} />
            </div>
            <ul class="ga-pictures" aria-label="Pictures to choose from">
                <For each={GROWNUPS}>
                    {(kind) => (
                        <li>
                            <button
                                type="button"
                                class="ga-picture"
                                aria-pressed={portraitOf(props.me) === kind}
                                aria-disabled={busy() ? true : undefined}
                                onClick={() => void pick(kind)}
                            >
                                <Drawing
                                    class="ga-picture-pic"
                                    id="grownup"
                                    params={{ kind }}
                                    seed={878}
                                />
                                <span>{GROWNUP_WORD[kind]}</span>
                            </button>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={said()}>
                <Say text={said()} />
            </Show>
        </section>
    );
}

/** Edit the PIN used to return from a shared child view. */
function ParentPin(props: { pinSet: boolean; onChanged: () => void }): JSX.Element {
    const [editing, setEditing] = createSignal(false);
    const [said, setSaid] = createSignal("");
    return (
        <section class="part">
            <h2>Parents</h2>
            <p class="note">Use this PIN to unlock parent pages on a shared browser.</p>
            <div class="kid-login-summary">
                <span>{props.pinSet ? "Parent PIN · Set" : "Parent PIN · Not set"}</span>
                <Show when={!editing()}>
                    <Button
                        second
                        onClick={() => {
                            setSaid("");
                            setEditing(true);
                        }}
                    >
                        {props.pinSet ? "Change parent PIN" : "Set parent PIN"}
                    </Button>
                </Show>
            </div>
            <Show when={editing()}>
                <SetPin
                    onDone={(saved) => {
                        setEditing(false);
                        if (saved) {
                            setSaid("Parent PIN saved.");
                            props.onChanged();
                        }
                    }}
                />
            </Show>
            <Show when={said()}>
                <Say tone="success" text={said()} />
            </Show>
        </section>
    );
}

function SetPin(props: { onDone: (set: boolean) => void }): JSX.Element {
    const [pin, setPin] = createSignal("");
    const [again, setAgain] = createSignal("");
    const [said, setSaid] = createSignal<{ text: string; fresh: boolean } | null>(null);
    const [busy, setBusy] = createSignal(false);
    let first: HTMLInputElement | undefined;
    let second: HTMLInputElement | undefined;
    const save = async (): Promise<void> => {
        if (busy()) return;
        if (pin().length !== 4) {
            setSaid({ text: "The PIN is four digits.", fresh: false });
            first?.focus();
            return;
        }
        if (again() !== pin()) {
            setSaid({ text: "The two PINs are not the same. Type it again.", fresh: false });
            setAgain("");
            second?.focus();
            return;
        }
        setBusy(true);
        setSaid(null);
        const r = await api.setPin(pin());
        setBusy(false);
        if (r === true) props.onDone(true);
        else
            setSaid({
                text: r.error === "bad-request" && r.problem ? r.problem : failureText(r, local),
                fresh: r.error === "fresh-sign-in",
            });
    };
    return (
        <section class="part">
            <p class="note">
                Choose four digits the children do not know, different from the kids’ PIN.
            </p>
            <form
                class="form"
                novalidate
                onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                }}
            >
                <div class="kids-pin-fields">
                    <div class="kids-pin-field">
                        <p class="note">The new PIN</p>
                        <PinInput
                            label="The new PIN"
                            value={pin()}
                            onInput={setPin}
                            onFull={() => second?.focus()}
                            ref={(el) => {
                                first = el;
                                focusOnceShown(el);
                            }}
                        />
                    </div>
                    <div class="kids-pin-field">
                        <p class="note">The same PIN again</p>
                        <PinInput
                            label="The same PIN again"
                            value={again()}
                            onInput={setAgain}
                            onFull={() => void save()}
                            ref={(el) => {
                                second = el;
                            }}
                        />
                    </div>
                </div>
                <Show when={said()}>
                    {(s) => (
                        <Say
                            text={s().text}
                            action={
                                s().fresh
                                    ? {
                                          label: "Sign in again",
                                          run: () => go(signInFor("/account", { again: true })),
                                      }
                                    : undefined
                            }
                        />
                    )}
                </Show>
                <div class="acts">
                    <Button submit busy={busy()}>
                        Save the PIN
                    </Button>
                    <Button second disabled={busy()} onClick={() => props.onDone(false)}>
                        Cancel
                    </Button>
                </div>
            </form>
        </section>
    );
}

function WeeklyEmail(): JSX.Element {
    const [data, { refetch }] = createResource(api.emailPreferences);
    const [mode, setMode] = createSignal<"off" | "private" | "detailed">("off");
    const [saving, setSaving] = createSignal(false);
    const [message, setMessage] = createSignal("");
    const saved = () => {
        const value = data.latest;
        return value && !("error" in value) ? value : null;
    };
    createEffect(() => {
        const value = saved();
        if (value) setMode(value.mode);
    });
    const save = async () => {
        setSaving(true);
        setMessage("");
        try {
            const error = await api.setLetters(mode());
            if (error) setMessage(failureText(error));
            else {
                await refetch();
                setMessage("Your weekly email choice is saved.");
            }
        } finally {
            setSaving(false);
        }
    };
    return (
        <section class="part" id="weekly-email">
            <h2>Weekly email</h2>
            <p>A Monday email for this family. Each parent chooses for themselves.</p>
            <Show when={data.latest !== undefined} fallback={<p>Loading your email choice…</p>}>
                <Show
                    when={saved()}
                    fallback={
                        <>
                            <p>We could not load your email choice.</p>
                            <Button second onClick={() => void refetch()}>
                                Try again
                            </Button>
                        </>
                    }
                >
                    <div class="weekly-email-controls">
                        <span id="weekly-email-label">Send me</span>
                        <Select
                            id="weekly-email-mode"
                            aria-labelledby="weekly-email-label"
                            value={mode()}
                            disabled={saving()}
                            onChange={(e) => {
                                const value = e.currentTarget.value;
                                if (
                                    value === "off" ||
                                    value === "private" ||
                                    value === "detailed"
                                ) {
                                    setMode(value);
                                    setMessage("");
                                }
                            }}
                        >
                            <option value="off">No weekly emails</option>
                            <option value="private">A reminder to review our week</option>
                            <option value="detailed">The full weekly report</option>
                        </Select>
                        <Button
                            second
                            disabled={saving() || mode() === saved()?.mode}
                            onClick={() => void save()}
                        >
                            {saving() ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </Show>
            </Show>
            <output aria-live="polite">{message()}</output>
        </section>
    );
}

function DeleteFamily(props: { me: Me; kids: FamilyView["kids"] }): JSX.Element {
    const [confirming, setConfirming] = createSignal(false);
    const [name, setName] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const [freshRequired, setFreshRequired] = createSignal(false);
    const remove = async (): Promise<void> => {
        if (busy() || name().trim() !== props.me.family.name) return;
        setBusy(true);
        const result = await api.deleteFamily(props.me.family.id, name());
        if (result === true) {
            location.replace("/sign-in");
            return;
        }
        setBusy(false);
        setFreshRequired(result.error === "fresh-sign-in");
        setSaid(failureText(result, local));
    };
    return (
        <Postcard focus={false} kicker="Your family" title="Delete family">
            <p>
                Permanently delete {familyName(props.me.family.name, true)}, including every child’s
                lessons, progress, artwork and plans. Everyone loses access to this family. Your
                account and other families stay.
            </p>
            <p class="note">
                {props.kids.length
                    ? `Children in this family: ${props.kids.map((kid) => kid.name).join(", ")}.`
                    : "This family has no children."}
            </p>
            <Show
                when={confirming()}
                fallback={
                    <button type="button" class="btn ga-danger" onClick={() => setConfirming(true)}>
                        Delete family
                    </button>
                }
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void remove();
                    }}
                >
                    <p>
                        This cannot be undone. Type <strong>{props.me.family.name}</strong> to
                        confirm.
                    </p>
                    <Field
                        name="delete-family-name"
                        label="Family name to delete"
                        value={name()}
                        onInput={setName}
                    />
                    <div class="acts">
                        <button
                            type="submit"
                            class="btn ga-danger"
                            disabled={busy() || name().trim() !== props.me.family.name}
                        >
                            {busy() ? "Deleting…" : "Permanently delete family"}
                        </button>
                        <Button
                            second
                            disabled={busy()}
                            onClick={() => {
                                setConfirming(false);
                                setName("");
                                setSaid("");
                                setFreshRequired(false);
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
            <Show when={freshRequired()}>
                <a href="/sign-in?again=1&next=%2Faccount">Sign in again to continue</a>
            </Show>
        </Postcard>
    );
}

function AccountDetails(props: { me: Me; onChanged: () => void }): JSX.Element {
    return (
        <dl class="ga-facts">
            <AccountField
                label="Your name"
                value={props.me.user.name ?? ""}
                save={(value) => api.saveAccountField(props.me.family.id, "name", value)}
                onChanged={props.onChanged}
            />
            <AccountEmail value={props.me.user.email} onChanged={props.onChanged} />
        </dl>
    );
}

function FamilyDetails(props: { me: Me; onChanged: () => void }): JSX.Element {
    const zones = [
        ...new Set(["UTC", props.me.family.time_zone, ...Intl.supportedValuesOf("timeZone")]),
    ].sort();
    return (
        <dl class="ga-facts">
            <AccountField
                label="Your family"
                value={props.me.family.name}
                readonly={!isParent(props.me.members)}
                save={(value) => api.saveAccountField(props.me.family.id, "family", value)}
                onChanged={props.onChanged}
            />
            <AccountField
                label="The family's time zone"
                value={props.me.family.time_zone}
                readonly={!isParent(props.me.members)}
                zones={zones}
                save={(value) => api.saveAccountField(props.me.family.id, "time_zone", value)}
                onChanged={props.onChanged}
            />
        </dl>
    );
}

function AccountField(props: {
    label: string;
    value: string;
    readonly?: boolean;
    zones?: string[];
    save: (value: string) => Promise<true | Failure>;
    onChanged: () => void;
}): JSX.Element {
    return (
        <div class="ga-account-field">
            <dt>{props.label}</dt>
            <dd>
                <InlineEdit
                    label={props.label}
                    value={props.value}
                    readonly={props.readonly}
                    maxlength={100}
                    options={props.zones?.map((zone) => ({
                        value: zone,
                        label: zone.replaceAll("_", " ").replaceAll("/", " / "),
                    }))}
                    validate={(value) => (value ? null : "Please enter a value.")}
                    save={async (value) => {
                        const result = await props.save(value);
                        return result === true ? true : failureText(result, local);
                    }}
                    onSaved={props.onChanged}
                />
            </dd>
        </div>
    );
}

function AccountEmail(props: { value: string; onChanged: () => void }): JSX.Element {
    const [value, setValue] = createSignal(props.value);
    const [saved, setSaved] = createSignal(props.value);
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
    const [pending, setPending] = createSignal<{ challenge: string; email: string } | null>(null);
    const [code, setCode] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [message, setMessage] = createSignal("");
    const request = async (): Promise<void> => {
        const email = value().trim().toLowerCase();
        if (busy() || email === props.value || email === pending()?.email) return;
        setBusy(true);
        setMessage("Sending a code…");
        const result = await api.requestAccountEmail(email);
        setBusy(false);
        if ("error" in result) setMessage(failureText(result, local));
        else {
            setPending({ challenge: result.challenge, email });
            setCode("");
            setMessage(
                `Enter the code sent to ${email}. Your current address stays until verified.`,
            );
        }
    };
    const verify = async (): Promise<void> => {
        const p = pending();
        if (busy() || !p || code().length !== 8) return;
        setBusy(true);
        setMessage("Verifying…");
        const result = await api.confirmAccountEmail(p.challenge, code());
        setBusy(false);
        if (result === true) {
            setValue(p.email);
            setPending(null);
            setCode("");
            setMessage("Saved");
            props.onChanged();
        } else {
            setMessage(failureText(result, local));
            setCode("");
        }
    };
    return (
        <div class="ga-account-field">
            <dt>Your address</dt>
            <dd>
                <InlineInput
                    aria-label="Your address"
                    type="email"
                    autocomplete="email"
                    value={value()}
                    disabled={busy()}
                    onInput={(e) => {
                        setValue(e.currentTarget.value);
                        setPending(null);
                        setMessage("");
                    }}
                    onBlur={() => void request()}
                />
                <Show when={pending()}>
                    <InlineInput
                        class="ga-email-code"
                        aria-label="Email verification code"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        placeholder="8-digit code"
                        maxlength={8}
                        value={code()}
                        disabled={busy()}
                        onInput={(e) => {
                            setCode(e.currentTarget.value.replace(/\D/g, ""));
                            if (code().length === 8) void verify();
                        }}
                    />
                </Show>
                <output class="inline-status" aria-live="polite">
                    {message()}
                </output>
            </dd>
        </div>
    );
}
