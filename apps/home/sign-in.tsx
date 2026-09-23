import { emailOf } from "../../school/family/login";
import { onThisComputer } from "../../engine/ui/device";
import { inKidMode } from "../../engine/ui/kid-session";
// Signing in and starting a family (.docs/auth.md, flows 1 and 2), in design B: a postcard on the map
// for each step. The address and the code we send to it, then a family to choose when the address
// has several, or one to start when it has none.

import "./sign-in.css";
import { Portal } from "solid-js/web";
import {
    createEffect,
    createSignal,
    createUniqueId,
    For,
    lazy,
    Match,
    onMount,
    Show,
    Switch,
    type JSX,
} from "solid-js";
import * as api from "../../engine/ui/api";
import { failureText } from "../../engine/ui/failure";
import { Check, CodeInput, Field, TextButton, TimeZone } from "../../engine/ui/fields";
import { Button, PinInput, detectedZone } from "../../engine/ui/form";
import { useLook } from "../../engine/ui/page";
import { Addressed, Corner, Postcard, Ps, To, type Place } from "../../engine/ui/postcard";
import { go, Link } from "../../engine/ui/router";
import { focusOnceShown, Say } from "../../engine/ui/say";
import { familyName } from "../../school/family/names";
import type { FamilyChoice, Start } from "../../server/api";
import { nextFrom } from "./routes";

const FOOT = [
    "No passwords. A code works for ten minutes.",
    "Children use a username and kids’ PIN set by their grown-up. No email address needed.",
];

const KidSignIn = lazy(() =>
    import("../../engine/ui/kid-sign-in").then((m) => ({ default: m.KidSignIn })),
);

const NAMES =
    "Your name is what your family calls you. Your family's name is such as the Okafors, and only your family sees it.";

/** What a code was asked for with, so the code step can ask for another the same way. */
interface Asked {
    email: string;
    start: Start | null;
    shared: boolean;
}

type Step =
    | { at: "checking" }
    | { at: "ask"; email: string; said: string }
    | { at: "code"; asked: Asked }
    | { at: "choose"; families: FamilyChoice[] }
    | { at: "none" };

/** `/sign-in` and `/start`, one flow: `start` asks for the new family's answers with the address. */
export function SignIn(props: { start: boolean }): JSX.Element {
    const [bar, setBar] = createSignal<HTMLElement>();
    const look = useLook();
    const query = new URLSearchParams(location.search);
    const [unlock, setUnlock] = createSignal(false);
    const [kids, setKids] = createSignal(!props.start && query.get("for") === "kids");
    const choose = (kid: boolean): void => {
        const url = new URL(location.href);
        if (kid) url.searchParams.set("for", "kids");
        else url.searchParams.delete("for");
        history.replaceState(history.state, "", url);
        setKids(kid);
    };
    const next = nextFrom(location.search, { local: false });
    const [step, setStep] = createSignal<Step>({ at: "checking" });
    /** Each step moves the map a little along the road, and its card's stamp shows where. */
    const place = (): Place => {
        const at = step().at;
        if (at === "code") return "railway";
        return at === "choose" || at === "none" || props.start ? "meadow" : "harbour";
    };
    createEffect(() => {
        if (!kids()) look({ foot: FOOT, place: place() });
    });
    onMount(() => {
        setBar(document.querySelector<HTMLElement>(".page-bar") ?? undefined);
        void (async () => {
            const status = await api.parentStatus();
            if (
                !query.has("again") &&
                "available" in status &&
                status.available &&
                (status.locked || inKidMode())
            )
                setUnlock(true);
            if (!kids() && !query.has("again") && !unlock() && (await api.me()) && !kids())
                go(next, { replace: true });
            else setStep({ at: "ask", email: "", said: "" });
        })();
    });
    const asking = (): Extract<Step, { at: "ask" }> | false => {
        const s = step();
        return s.at === "ask" && s;
    };
    const coding = (): Extract<Step, { at: "code" }> | false => {
        const s = step();
        return s.at === "code" && s;
    };
    const choosing = (): Extract<Step, { at: "choose" }> | false => {
        const s = step();
        return s.at === "choose" && s;
    };
    const lost = (said: string, email = ""): void => {
        setStep({ at: "ask", email, said });
    };
    return (
        <>
            <Show when={!props.start && bar()}>
                {(target) => (
                    <Portal mount={target()} ref={(el) => el.classList.add("sign-in-bar")}>
                        <fieldset class="sign-in-choices">
                            <legend class="sr">Who is signing in?</legend>
                            <button
                                type="button"
                                class="btn"
                                classList={{ second: kids() }}
                                aria-pressed={!kids()}
                                onClick={() => choose(false)}
                            >
                                Grown-ups
                            </button>
                            <button
                                type="button"
                                class="btn"
                                classList={{ second: !kids() }}
                                aria-pressed={kids()}
                                onClick={() => choose(true)}
                            >
                                Kids
                            </button>
                        </fieldset>
                    </Portal>
                )}
            </Show>
            <Show
                when={kids()}
                fallback={
                    <Switch>
                        <Match when={unlock()}>
                            <ParentUnlock next={next} onEmail={() => setUnlock(false)} />
                        </Match>
                        <Match when={asking()}>
                            {(s) => (
                                <Ask
                                    start={props.start}
                                    email={s().email}
                                    said={s().said}
                                    shared={query.has("shared")}
                                    onAsked={(asked) => setStep({ at: "code", asked })}
                                />
                            )}
                        </Match>
                        <Match when={coding()}>
                            {(s) => (
                                <Code
                                    asked={s().asked}
                                    next={next}
                                    onDifferent={() => lost("", s().asked.email)}
                                    onChoose={(families) => setStep({ at: "choose", families })}
                                    onNone={() => setStep({ at: "none" })}
                                />
                            )}
                        </Match>
                        <Match when={choosing()}>
                            {(s) => <Choose families={s().families} next={next} onLost={lost} />}
                        </Match>
                        <Match when={step().at === "none"}>
                            <NoFamily onLost={lost} />
                        </Match>
                    </Switch>
                }
            >
                <KidSignIn />
            </Show>
        </>
    );
}

function Ask(props: {
    start: boolean;
    email: string;
    said: string;
    shared: boolean;
    onAsked: (asked: Asked) => void;
}): JSX.Element {
    const [email, setEmail] = createSignal(props.email);
    const [name, setName] = createSignal("");
    const [family, setFamily] = createSignal("");
    const [zone, setZone] = createSignal(detectedZone());
    const [shared, setShared] = createSignal(props.shared);
    const [wrong, setWrong] = createSignal<{ email?: string; name?: string; family?: string }>({});
    const [said, setSaid] = createSignal(props.said);
    const [busy, setBusy] = createSignal(false);
    const inputs: { email?: HTMLInputElement; name?: HTMLInputElement; family?: HTMLInputElement } =
        {};

    const send = async (): Promise<void> => {
        if (busy()) return;
        const address = email().trim();
        const problems = {
            name: props.start
                ? !name().trim()
                    ? "Type what your family calls you."
                    : name().trim().length > 80
                      ? "Use up to 80 characters for your name."
                      : undefined
                : undefined,
            family: props.start
                ? !family().trim()
                    ? "Type your family's name."
                    : family().trim().length > 80
                      ? "Use up to 80 characters for your family’s name."
                      : undefined
                : undefined,
            email: !address
                ? "Type your email address."
                : emailOf(address)
                  ? undefined
                  : "That does not look like an email address. Check it and try again.",
        };
        setWrong(problems);
        const first = (["name", "family", "email"] as const).find((k) => problems[k]);
        if (first) {
            inputs[first]?.focus();
            return;
        }
        setBusy(true);
        setSaid("");
        const start = props.start
            ? { name: name().trim(), family: family().trim(), timeZone: zone() }
            : null;
        const r = await api.startEmail(address, start ? { start } : { shared: shared() });
        setBusy(false);
        if (r === true) props.onAsked({ email: address, start, shared: !start && shared() });
        else if (r.error === "bad-email") {
            setWrong({ email: failureText(r) });
            inputs.email?.focus();
        } else setSaid(failureText(r));
    };

    const emailField = (): JSX.Element => (
        <Field
            label="Your email address"
            type="email"
            name="email"
            autocomplete="email"
            autocapitalize="none"
            value={email()}
            onInput={setEmail}
            error={wrong().email}
            ref={(el) => {
                inputs.email = el;
            }}
        />
    );

    return (
        <Postcard
            kicker={props.start ? "Start a family" : "For grown-ups"}
            title={props.start ? "Start your family" : "Sign in"}
            lead={
                props.start
                    ? "We send a code to your email to check it is yours."
                    : "We send a code to your email. There is no password."
            }
            corner={
                <Corner place={props.start ? "meadow" : "harbour"} seed={props.start ? 821 : 811} />
            }
            links={
                <Show
                    when={props.start}
                    fallback={
                        <p class="note">
                            New here? <Link href="/start">Start a family</Link>
                        </p>
                    }
                >
                    <p class="note">
                        Already have a family? <Link href="/sign-in">Sign in</Link>
                    </p>
                </Show>
            }
            address={
                <form
                    class="form"
                    novalidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send();
                    }}
                >
                    <Show when={props.start} fallback={emailField()}>
                        <Field
                            label="Your name"
                            name="name"
                            autocomplete="given-name"
                            maxlength={80}
                            value={name()}
                            onInput={setName}
                            error={wrong().name}
                            ref={(el) => {
                                inputs.name = el;
                            }}
                        />
                        <Field
                            label="Your family's name"
                            name="family"
                            autocomplete="family-name"
                            maxlength={80}
                            value={family()}
                            onInput={setFamily}
                            error={wrong().family}
                            ref={(el) => {
                                inputs.family = el;
                            }}
                        />
                        {emailField()}
                        <TimeZone value={zone()} onChange={setZone} />
                    </Show>
                    <Show when={!props.start}>
                        <Check
                            label="This is a shared device, such as the family's computer"
                            name="shared"
                            checked={shared()}
                            onChange={setShared}
                        />
                    </Show>
                    <Show when={said()}>
                        <Say text={said()} />
                    </Show>
                    <Button submit wide busy={busy()}>
                        {busy() ? "Sending the code" : "Send me a code"}
                    </Button>
                </form>
            }
        >
            <Show when={props.start}>
                <Ps>{NAMES}</Ps>
            </Show>
        </Postcard>
    );
}

function Code(props: {
    asked: Asked;
    next: string;
    onDifferent: () => void;
    onChoose: (families: FamilyChoice[]) => void;
    onNone: () => void;
}): JSX.Element {
    const lead = createUniqueId();
    const [code, setCode] = createSignal("");
    const [said, setSaid] = createSignal<{ text: string; calm: boolean; again: boolean } | null>(
        null,
    );
    const [busy, setBusy] = createSignal(false);
    const [wrong, setWrong] = createSignal(false);
    let input: HTMLInputElement | undefined;

    const verify = async (digits: string): Promise<void> => {
        if (busy()) return;
        if (digits.length < 8) {
            setSaid({
                text: "The code has eight digits. Type all eight.",
                calm: false,
                again: false,
            });
            input?.focus();
            return;
        }
        setBusy(true);
        setSaid(null);
        const r = await api.verifyCode(digits);
        setBusy(false);
        if ("me" in r) go(props.next);
        else if ("choose" in r) props.onChoose(r.choose);
        else if ("start" in r) props.onNone();
        else {
            const over =
                r.error === "dead-code" || r.error === "expired" || r.error === "no-pending";
            setWrong(r.error === "wrong-code");
            setSaid({ text: failureText(r), calm: false, again: over });
            if (!over) input?.select();
        }
    };

    const again = async (): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        const a = props.asked;
        const r = await api.startEmail(
            a.email,
            a.start ? { start: a.start } : { shared: a.shared },
        );
        setBusy(false);
        if (r !== true) {
            setSaid({ text: failureText(r), calm: false, again: false });
            return;
        }
        setCode("");
        setWrong(false);
        setSaid({
            text: `We sent a new code to ${a.email}. The one before it no longer works.`,
            calm: true,
            again: false,
        });
        input?.focus();
    };

    return (
        <>
            <Postcard
                under
                kicker={props.asked.start ? "Start a family" : "For grown-ups"}
                title={props.asked.start ? "Start your family" : "Sign in"}
                address={<div />}
            />
            <Postcard
                reply
                kicker="Check your email"
                title="Type the code"
                lead={`We sent an 8-digit code to ${props.asked.email}. It works for ten minutes, once.`}
                leadId={lead}
                focus={false}
                corner={<Corner place="railway" from="lumischool" seed={831} />}
                links={
                    <div class="acts">
                        <TextButton onClick={() => void again()}>Send the code again</TextButton>
                        <TextButton onClick={props.onDifferent}>Use a different address</TextButton>
                    </div>
                }
                address={
                    <form
                        class="form"
                        novalidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            void verify(code());
                        }}
                    >
                        <To who={props.asked.email} />
                        <CodeInput
                            label="The 8-digit code"
                            value={code()}
                            onInput={(digits) => {
                                setCode(digits);
                                setWrong(false);
                            }}
                            onFull={(digits) => void verify(digits)}
                            describedBy={lead}
                            wrong={wrong()}
                            ref={(el) => {
                                input = el;
                                focusOnceShown(el);
                            }}
                        />
                        <Show when={said()}>
                            {(s) => (
                                <Say
                                    text={s().text}
                                    calm={s().calm}
                                    action={
                                        s().again
                                            ? { label: "Send a new code", run: () => void again() }
                                            : undefined
                                    }
                                />
                            )}
                        </Show>
                        <Button submit wide busy={busy()}>
                            {busy()
                                ? "Checking the code"
                                : props.asked.start
                                  ? "Start the family"
                                  : "Sign in"}
                        </Button>
                    </form>
                }
            />
        </>
    );
}

const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function Choose(props: {
    families: FamilyChoice[];
    next: string;
    onLost: (said: string) => void;
}): JSX.Element {
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const n = (): string => COUNT[props.families.length] ?? String(props.families.length);
    const choose = async (f: FamilyChoice): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        setSaid("");
        const r = await api.chooseFamily(f.family_id);
        setBusy(false);
        if ("me" in r) go(props.next);
        else if (r.error === "expired" || r.error === "no-pending") props.onLost(failureText(r));
        else setSaid(failureText(r));
    };
    return (
        <div class="postcard-column">
            <Postcard
                note
                kicker="Signed in"
                title="Which family?"
                lead={`This address belongs to ${n()} families. Choose the one to open. You can switch later.`}
            >
                <Show when={said()}>
                    <Say text={said()} />
                </Show>
            </Postcard>
            <div class="postcard-stack">
                <For each={props.families}>
                    {(f, i) => (
                        <Addressed
                            name={familyName(f.name)}
                            line={f.kid_id ? "You tutor a child here" : "You are a parent here"}
                            stamp={
                                f.kid_id
                                    ? { picture: "tent", ground: "sky" }
                                    : { picture: "cottage", ground: "glow" }
                            }
                            seed={841 + i()}
                            busy={busy()}
                            onChoose={() => void choose(f)}
                        />
                    )}
                </For>
            </div>
        </div>
    );
}

/** A proven address with no family of its own yet, which the code signs in to a new one. */
function NoFamily(props: { onLost: (said: string) => void }): JSX.Element {
    const [name, setName] = createSignal("");
    const [family, setFamily] = createSignal("");
    const [zone, setZone] = createSignal(detectedZone());
    const [wrong, setWrong] = createSignal<{ name?: string; family?: string }>({});
    const [said, setSaid] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const inputs: { name?: HTMLInputElement; family?: HTMLInputElement } = {};
    const start = async (): Promise<void> => {
        if (busy()) return;
        const problems = {
            name: name().trim() ? undefined : "Type what your family calls you.",
            family: family().trim() ? undefined : "Type your family's name.",
        };
        setWrong(problems);
        const first = (["name", "family"] as const).find((k) => problems[k]);
        if (first) {
            inputs[first]?.focus();
            return;
        }
        setBusy(true);
        setSaid("");
        const r = await api.startFamily({
            name: name().trim(),
            family: family().trim(),
            timeZone: zone(),
        });
        setBusy(false);
        if ("me" in r) go("/");
        else if (r.error === "expired" || r.error === "no-pending") props.onLost(failureText(r));
        else setSaid(failureText(r));
    };
    return (
        <Postcard
            kicker="Signed in"
            title="Start a family"
            lead="This address has no family yet. Tell us what to call yours."
            corner={<Corner place="meadow" seed={821} />}
            address={
                <form
                    class="form"
                    novalidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void start();
                    }}
                >
                    <Field
                        label="Your name"
                        name="name"
                        autocomplete="given-name"
                        maxlength={80}
                        value={name()}
                        onInput={setName}
                        error={wrong().name}
                        ref={(el) => {
                            inputs.name = el;
                        }}
                    />
                    <Field
                        label="Your family's name"
                        name="family"
                        autocomplete="family-name"
                        maxlength={80}
                        value={family()}
                        onInput={setFamily}
                        error={wrong().family}
                        ref={(el) => {
                            inputs.family = el;
                        }}
                    />
                    <TimeZone value={zone()} onChange={setZone} />
                    <Show when={said()}>
                        <Say text={said()} />
                    </Show>
                    <Button submit wide busy={busy()}>
                        {busy() ? "Starting the family" : "Start the family"}
                    </Button>
                </form>
            }
        >
            <Ps>{NAMES}</Ps>
        </Postcard>
    );
}

function ParentUnlock(props: { next: string; onEmail: () => void }): JSX.Element {
    const [pin, setPin] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [said, setSaid] = createSignal("");
    const unlock = async (): Promise<void> => {
        if (busy()) return;
        setBusy(true);
        const answer = await api.unlockParent(pin());
        if (answer === true) {
            location.replace(props.next);
            return;
        }
        setBusy(false);
        setPin("");
        setSaid(
            answer.error === "no-pin"
                ? "No adult PIN is set. Sign in by email to continue."
                : failureText(answer, onThisComputer(location.hostname)),
        );
    };
    return (
        <Postcard
            kicker="For grown-ups"
            title="Unlock parent access"
            lead="Type the adult family PIN. The children’s views stay open."
        >
            <form
                class="form"
                onSubmit={(e) => {
                    e.preventDefault();
                    void unlock();
                }}
            >
                <PinInput label="Adult family PIN" value={pin()} onInput={setPin} />
                <Button submit busy={busy()}>
                    Unlock parent access
                </Button>
                <Show when={said()}>
                    <Say text={said()} />
                </Show>
            </form>
            <button type="button" class="link" onClick={props.onEmail}>
                Sign in by email instead
            </button>
        </Postcard>
    );
}
