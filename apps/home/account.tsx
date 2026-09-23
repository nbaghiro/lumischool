import { Members } from "./members";
import { Select } from "../../engine/ui/select";
// The account page (.docs/auth.md, flows 7, 10 and 12): who is signed in and their family, the other
// families they are in, sign out here or everywhere, the family PIN, the children's views open in the
// family, their own sessions, what the notice promised about their data, and paying for lumischool.
// It holds what exists: export and deletion wait on their routes, and say so.

import "./account.css";
import { KidLogins } from "./kid-logins";
import {
    batch,
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
import { Choice } from "../../engine/ui/fields";
import { Button, PinInput } from "../../engine/ui/form";
import { useLook, Waiting } from "../../engine/ui/page";
import { Corner, Postcard } from "../../engine/ui/postcard";
import { go } from "../../engine/ui/router";
import { focusOnceShown, Say } from "../../engine/ui/say";
import type { Failure } from "../../engine/ui/wire";
import { isParent } from "../../school/family/access";
import { familyName, longDate } from "../../school/family/names";
import { NOTICE } from "../../school/family/privacy";
import type { FamilyView, KidSessions, Me, Sessions, SessionView } from "../../server/api";
import { Drawing } from "../../engine/ui/art";
import { GROWNUP_WORD, GROWNUPS } from "../../engine/parts/apps/grownup";
import { familyChanged, GrownStamp, knowFamily, pickedPortrait, portraitOf } from "./bar";
import { signInFor } from "./routes";

const local = onThisComputer(location.hostname);

interface Seen {
    me: Me;
    view: FamilyView;
    sessions: Sessions;
    kidSessions: KidSessions | null;
}

/** Who is signed in, their family, their sessions and, for a parent, the children's views. */
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
    const parent = isParent(me.members);
    const [view, sessions, kidSessions] = await Promise.all([
        api.familyRows({ ask: true }),
        api.sessions(),
        parent ? api.kidSessions() : Promise.resolve(null),
    ]);
    if ("error" in view) return { failure: view };
    if ("error" in sessions) return { failure: sessions };
    if (kidSessions && "error" in kidSessions) return { failure: kidSessions };
    return { me, view, sessions, kidSessions };
}

/** The day a key was made or last used, or "today" for an instant of this day. */
const dayOf = (instant: string): string => longDate(instant.slice(0, 10));

/** What a session is called: the browser the user agent named, or a browser with no name. */
const browserOf = (s: Pick<SessionView, "name">): string => s.name ?? "A browser";

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
    const [card, setCard] = createSignal<"page" | "pin">("page");
    const [said, setSaid] = createSignal("");
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
    const back = (line: string, again: boolean): void => {
        batch(() => {
            setSaid(line);
            setCard("page");
        });
        if (again) void refetch();
        scrollTo(0, 0);
    };
    return (
        <Show
            when={seen.latest}
            fallback={<Waiting kicker="For grown-ups" title="Opening your account" />}
        >
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
                <Match when={card() === "pin" && signed()}>
                    {(s) => (
                        <SetPin
                            me={s().me}
                            pinSet={s().view.pin}
                            onDone={(set) => back(set ? "The family PIN is set." : "", set)}
                        />
                    )}
                </Match>
                <Match when={signed()}>
                    {(s) => (
                        <div class="ga">
                            <You seen={s()} said={said()} onRefetch={() => void refetch()} />
                            <Show when={isParent(s().me.members)}>
                                <Members family={s().me.family.id} user={s().me.user.id} />
                                <KidLogins
                                    family={s().me.family.id}
                                    onChanged={() => void refetch()}
                                />
                                <ViewsAndPin
                                    seen={s()}
                                    onPin={() => {
                                        setSaid("");
                                        setCard("pin");
                                        scrollTo(0, 0);
                                    }}
                                    onChanged={() => void refetch()}
                                />
                            </Show>
                            <YourSessions seen={s()} onChanged={() => void refetch()} />
                            <YourData />
                            <Paying />
                        </div>
                    )}
                </Match>
            </Switch>
        </Show>
    );
}

/** Who is signed in, their family and the others they are in, and the way out of this browser or every one. */
function You(props: { seen: Seen; said: string; onRefetch: () => void }): JSX.Element {
    const me = (): Me => props.seen.me;
    const others = (): Me["families"] =>
        me().families.filter((f) => f.family_id !== me().family.id);
    const [busy, setBusy] = createSignal<"switch" | "out" | "everywhere" | null>(null);
    const [said, setSaid] = createSignal("");
    const switchTo = async (family: string): Promise<void> => {
        if (busy()) return;
        setBusy("switch");
        const r = await api.switchFamily(family);
        setBusy(null);
        if ("me" in r) props.onRefetch();
        else setSaid(failureText(r, local));
    };
    const out = async (everywhere: boolean): Promise<void> => {
        if (busy()) return;
        setBusy(everywhere ? "everywhere" : "out");
        setSaid("");
        const r = await api.signOut(everywhere);
        if (r === true) {
            location.assign("/sign-in");
            return;
        }
        setBusy(null);
        setSaid(`You are still signed in. ${failureText(r, local)}`);
    };
    const browserAction = async (lock: boolean): Promise<void> => {
        if (busy()) return;
        setBusy("out");
        const answer = lock ? await api.lockParent() : await api.signOutBrowser();
        if (answer === true) {
            location.assign(lock ? "/sign-in?locked=1" : "/sign-in");
            return;
        }
        setBusy(null);
        setSaid(
            answer.error === "no-pin"
                ? "Set an adult family PIN below before locking parent access."
                : failureText(answer, local),
        );
    };
    return (
        <Postcard
            kicker="Your account"
            title={me().user.name?.trim() || me().user.email}
            corner={<Corner place="harbour" seed={903} />}
        >
            <Show when={props.said}>
                <Say calm focus text={props.said} />
            </Show>
            <dl class="ga-facts">
                <div>
                    <dt>Your name</dt>
                    <dd>{me().user.name?.trim() || "Not given"}</dd>
                </div>
                <div>
                    <dt>Your address</dt>
                    <dd>{me().user.email}</dd>
                </div>
                <div>
                    <dt>Your family</dt>
                    <dd>{familyName(me().family.name)}</dd>
                </div>
                <div>
                    <dt>The family's time zone</dt>
                    <dd>{me().family.time_zone.replaceAll("_", " ")}</dd>
                </div>
            </dl>
            <p class="note">
                Your name, your address and the family's name and time zone were set when the family
                was started, and cannot be changed here yet.
            </p>
            <YourPicture me={me()} onPicked={props.onRefetch} />
            <Show when={me().members.some((m) => m.kid_id === null && m.ended_at === null)}>
                <WeeklyEmail />
            </Show>
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
                    Sign out of this browser, or of every browser you are signed in to in this
                    family, a lost phone included.
                </p>
                <div class="acts">
                    <Button second busy={busy() === "out"} onClick={() => void out(false)}>
                        Sign out of this browser
                    </Button>
                    <Button second busy={busy() === "everywhere"} onClick={() => void out(true)}>
                        Sign out of this family on all browsers
                    </Button>
                </div>
                <Show when={said()}>
                    <Say text={said()} />
                </Show>
            </section>
            <Show when={isParent(me().members)}>
                <div class="acts">
                    <Button second busy={busy() === "out"} onClick={() => void browserAction(true)}>
                        Lock parent access on this browser
                    </Button>
                    <Button
                        second
                        busy={busy() === "out"}
                        onClick={() => {
                            if (
                                confirm(
                                    "Sign out the parent and every child view on this browser? Answers that have not been sent will be lost.",
                                )
                            )
                                void browserAction(false);
                        }}
                    >
                        Sign out everyone on this browser
                    </Button>
                </div>
                <p class="note">
                    Parent sign-in is shared across tabs. Lock it before handing this browser to a
                    child. Signing out only your account keeps children’s views open.
                </p>
            </Show>
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

/** The children's views open in the family, each with End, and the family PIN, moved here from the family's page whole. */
function ViewsAndPin(props: { seen: Seen; onPin: () => void; onChanged: () => void }): JSX.Element {
    const views = (): KidSessions["views"] => props.seen.kidSessions?.views ?? [];
    const kidName = (id: string): string =>
        props.seen.view.kids.find((k) => k.id === id)?.name ?? "a child";
    const [busy, setBusy] = createSignal<string | null>(null);
    const [said, setSaid] = createSignal("");
    const end = async (view: string | null): Promise<void> => {
        if (busy() || (view === null && views().length === 0)) return;
        setBusy(view ?? "all");
        setSaid("");
        const r = view === null ? await api.endKidSessions() : await api.endKidSession(view);
        setBusy(null);
        if (r !== true && "error" in r) {
            setSaid(failureText(r, local));
            return;
        }
        setSaid(
            view !== null
                ? "That child sign-in has ended."
                : r === true || r.ended === 0
                  ? "There were no child sign-ins to end."
                  : r.ended === 1
                    ? "The child sign-in has ended."
                    : `${r.ended} child sign-ins have ended.`,
        );
        props.onChanged();
    };
    return (
        <Postcard
            focus={false}
            kicker="Your account"
            title="Children’s sign-ins and the family PIN"
        >
            <section class="part">
                <h2>The family PIN</h2>
                <p class="note">
                    {props.seen.view.pin
                        ? "The adult family PIN is set. Use it to unlock parent access or return from a child’s view on this browser."
                        : "Set an adult PIN to lock and unlock parent access on this browser."}
                </p>
                <div class="acts">
                    <Button second onClick={props.onPin}>
                        {props.seen.view.pin ? "Change the family PIN" : "Set the family PIN"}
                    </Button>
                </div>
                <p class="note">Setting the PIN needs a sign-in in the last ten minutes.</p>
            </section>
            <section class="part">
                <h2>Children’s sign-ins</h2>
                <p class="note">
                    These are saved sign-ins, not a list of tabs open right now. Closing a tab may
                    leave its sign-in here until it expires. Last-used dates are approximate.
                </p>
                <Show
                    when={views().length}
                    fallback={<p class="note">No children are signed in.</p>}
                >
                    <ul class="ga-list">
                        <For each={views()}>
                            {(v) => (
                                <li class="ga-row">
                                    <div class="ga-row-words">
                                        <b>{v.name ?? "A browser"}</b>
                                        <span>
                                            {`${v.login ? "Username sign-in" : "Opened by a parent"} for ${v.kids.map(kidName).join(", ")}. Started ${dayOf(v.created_at)}${v.seen_at ? `, last used ${dayOf(v.seen_at)}` : ""}.`}
                                        </span>
                                    </div>
                                    <Button
                                        second
                                        busy={busy() === v.view}
                                        onClick={() => void end(v.view)}
                                    >
                                        End this sign-in
                                    </Button>
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>
                <div class="acts">
                    <Button
                        second
                        disabled={views().length === 0}
                        busy={busy() === "all"}
                        onClick={() => void end(null)}
                    >
                        End all children’s sign-ins
                    </Button>
                </div>
                <p class="note">
                    Ending a sign-in stops access when that tab next connects. Answers not sent yet
                    are lost. It does not sign out parents or delete finished work.
                </p>
                <Show when={said()}>
                    <Say text={said()} />
                </Show>
            </section>
        </Postcard>
    );
}

/** The person's own sessions in this family, this browser's marked, each with Sign out (flow 10). */
function YourSessions(props: { seen: Seen; onChanged: () => void }): JSX.Element {
    const list = (): SessionView[] => props.seen.sessions.sessions;
    const [busy, setBusy] = createSignal<string | null>(null);
    const [said, setSaid] = createSignal("");
    const end = async (s: SessionView): Promise<void> => {
        if (busy()) return;
        setBusy(s.id);
        setSaid("");
        const r = await api.endSession(s.id, s.own);
        if (r === true && s.own) {
            location.assign("/sign-in");
            return;
        }
        setBusy(null);
        if (r !== true) {
            setSaid(failureText(r, local));
            return;
        }
        setSaid(`${browserOf(s)} is signed out.`);
        props.onChanged();
    };
    const line = (s: SessionView): string =>
        [
            s.kind === "shared-session" ? "a shared device" : "",
            s.byPin ? "signed in with the family PIN" : "",
            s.putAway ? "put away while a children's view is open" : "",
            `signed in ${dayOf(s.created_at)}`,
            s.seen_at ? `last used ${dayOf(s.seen_at)}` : "",
        ]
            .filter(Boolean)
            .join(", ");
    return (
        <Postcard focus={false} kicker="Your account" title="Where you are signed in">
            <p class="note">
                Each browser you signed in on in this family. Signing one out ends it there; a lost
                phone is signed out from here.
            </p>
            <ul class="ga-list">
                <For each={list()}>
                    {(s) => (
                        <li class="ga-row" classList={{ own: s.own }}>
                            <div class="ga-row-words">
                                <b>{`${browserOf(s)}${s.own ? " (this browser)" : ""}`}</b>
                                <span>{`${line(s)}.`}</span>
                            </div>
                            <Button second busy={busy() === s.id} onClick={() => void end(s)}>
                                {s.own ? "Sign out" : "Sign out there"}
                            </Button>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={said()}>
                <Say text={said()} />
            </Show>
        </Postcard>
    );
}

/** What the notice promised about a child's data, in its own words, and what of it exists to press. */
function YourData(): JSX.Element {
    return (
        <Postcard focus={false} kicker="Your account" title="Your family's data">
            <p class="note">The notice you agreed to when adding a child says:</p>
            <ul class="ga-notice">
                <For each={NOTICE}>{(line) => <li>{line}</li>}</For>
            </ul>
            <p class="note">
                Seeing it is every page of this app. Exporting it and deleting a child's record are
                not built yet, and are on the list for the launch. Until they are, a parent asks us
                and we do it by hand.
            </p>
        </Postcard>
    );
}

/** Paying for lumischool, in words: there is nothing to pay yet, and nothing here asks for a card. */
function Paying(): JSX.Element {
    return (
        <Postcard focus={false} kicker="Your account" title="Paying for lumischool">
            <p class="note">
                lumischool is in development and has no price yet. Nothing is charged, and no card
                is asked for. When there is a price it will be set out here first, and your family
                will be asked before anything changes.
            </p>
        </Postcard>
    );
}

/** The family's PIN on one card, typed twice since nobody sees it. It needs a recent sign-in. */
function SetPin(props: { me: Me; pinSet: boolean; onDone: (set: boolean) => void }): JSX.Element {
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
        <Postcard
            focus={false}
            kicker={familyName(props.me.family.name)}
            title={props.pinSet ? "Change the family PIN" : "Set the family PIN"}
            lead="Four digits to unlock parent access. Choose ones the children do not know, different from the kids’ sign-in PIN."
            corner={<Corner place="meadow" seed={853} />}
            address={
                <form
                    class="form"
                    novalidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                >
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
                        <Button second onClick={() => props.onDone(false)}>
                            Not now
                        </Button>
                    </div>
                </form>
            }
        >
            <p class="note">
                lumischool checks the PIN, and no device keeps it. After too many wrong tries it
                stops working, and a grown-up who forgets it signs in and sets a new one here.
            </p>
        </Postcard>
    );
}

function WeeklyEmail(): JSX.Element {
    const [data, { refetch }] = createResource(api.emailPreferences);
    const [mode, setMode] = createSignal<"off" | "private" | "detailed">("off");
    const [saving, setSaving] = createSignal(false);
    const [message, setMessage] = createSignal("");
    const saved = () => {
        const value = data();
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
            <Show when={!data.loading} fallback={<p>Loading your email choice…</p>}>
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
                    <p class="note">
                        Reminders contain no children’s names or learning details. Full reports send
                        those details through Resend and your email provider, and remain in your
                        inbox after changes in the app. Sign-in emails are unaffected.
                    </p>
                </Show>
            </Show>
            <output aria-live="polite">{message()}</output>
        </section>
    );
}
