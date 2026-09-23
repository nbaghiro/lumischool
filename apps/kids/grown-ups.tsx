// The grown-ups' corner of the children's view (.docs/auth.md, flows 6 and 7), opened by holding the
// tab for two seconds, so that a child's taps do not spend the family's PIN tries. With the family's
// PIN, which lumischool checks, a grown-up leaves the view and gets back the session this browser had
// when the view opened, landing on the family's page with no code to type, or adds another of the
// family's children to it; or they sign in instead, which closes the view on this browser and takes
// the place of that session. Both need the internet, and leaving sends anything not sent yet first.

import { createEffect, createSignal, For, Show, type JSX } from "solid-js";
import { Button, PinInput } from "../../engine/ui/form";
import { add, leave, type Sending } from "../../engine/ui/kid";
import type { Failure } from "../../engine/ui/wire";
import { Column, Part, useLook } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { Say } from "../../engine/ui/say";
import { familyName } from "../../school/family/names";
import type { KidView } from "../../server/api";

const inAWhile = (seconds: number | undefined): string =>
    seconds === undefined || seconds <= 90
        ? "in a minute"
        : `in ${Math.round(seconds / 60)} minutes`;

const answers = (n: number): string => (n === 1 ? "One answer" : `${n} answers`);

const NO_PIN_YET = "Type the family PIN first.";

function words(f: Failure, unsent: number, adding: string | null): string {
    switch (f.error) {
        case "wrong-pin":
            return f.attemptsLeft === undefined
                ? "That PIN is not right."
                : `That PIN is not right. ${f.attemptsLeft === 1 ? "One more try" : `${f.attemptsLeft} more tries`} before it stops working.`;
        case "rate-limited":
            return `There have been too many wrong tries. Try the PIN again ${inAWhile(f.retryAfter)}.`;
        case "no-pin":
            return "The family PIN has stopped working after too many wrong tries. Sign in instead, and set a new PIN on the family's page.";
        case "no-kid-session":
            return "A grown-up has closed the children's view on this device.";
        case "no-consent":
        case "not-found":
            return `${adding ?? "That child"} cannot be added to this view. A grown-up checks the family's page.`;
        case "offline":
            return unsent > 0
                ? `This needs the internet, and this device cannot reach lumischool just now. ${answers(unsent)} waiting to be sent ${unsent === 1 ? "is" : "are"} kept until it is back.`
                : "This needs the internet, and this device cannot reach lumischool just now.";
        default:
            return "Something went wrong on our side. Please try again in a moment.";
    }
}

export function GrownUps(props: {
    view: KidView;
    sending: Sending;
    onBack: () => void;
    /** Another child is in the view now, so the pictures are read again. */
    onAdded: () => void;
}): JSX.Element {
    const look = useLook();
    createEffect(() =>
        look({ logo: "none", foot: [familyName(props.view.family.name)], centered: true }),
    );
    const [pin, setPin] = createSignal("");
    const [said, setSaid] = createSignal("");
    const [wrong, setWrong] = createSignal(false);
    /** What is on its way: leaving, or the id of the child being added. */
    const [busy, setBusy] = createSignal<string | null>(null);
    let input: HTMLInputElement | undefined;
    const failed = (f: Failure, adding: string | null): void => {
        setPin("");
        setWrong(f.error === "wrong-pin");
        setSaid(words(f, props.sending.unsent, adding));
        input?.focus();
    };
    const go = async (): Promise<void> => {
        if (busy()) return;
        if (pin().length !== 4) {
            setSaid(NO_PIN_YET);
            input?.focus();
            return;
        }
        setBusy("leave");
        setSaid("");
        const left = await leave(pin());
        if (left === true) {
            location.assign("/");
            return;
        }
        setBusy(null);
        failed(left, null);
    };
    const join = async (kid: KidView["others"][number]): Promise<void> => {
        if (busy()) return;
        if (pin().length !== 4) {
            setSaid(NO_PIN_YET);
            input?.focus();
            return;
        }
        setBusy(kid.id);
        setSaid("");
        const added = await add(pin(), kid.id);
        setBusy(null);
        if (added === true) props.onAdded();
        else failed(added, kid.name);
    };
    return (
        <Column>
            <Postcard
                note
                kicker={familyName(props.view.family.name)}
                title="For grown-ups"
                lead={
                    props.view.pin
                        ? "Type the family PIN to leave the children's view and go back to the family's page as you were, or to add another child to the view."
                        : "A grown-up signs in with their email to open the family’s page. The kids’ PIN only opens your learning page."
                }
            >
                <Show when={props.view.pin}>
                    <form
                        class="form"
                        novalidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            void go();
                        }}
                    >
                        <PinInput
                            label="The family PIN"
                            value={pin()}
                            onInput={(digits) => {
                                setPin(digits);
                                setWrong(false);
                            }}
                            wrong={wrong()}
                            ref={(el) => {
                                input = el;
                            }}
                        />
                        <div class="acts">
                            <Button submit busy={busy() === "leave"}>
                                Leave the children's view
                            </Button>
                        </div>
                    </form>
                    <Show when={props.view.others.length}>
                        <Part title="Add a child to this view">
                            <p class="note">
                                They get their own picture on this device and see only their own
                                pages.
                            </p>
                            <div class="acts">
                                <For each={props.view.others}>
                                    {(kid) => (
                                        <Button
                                            second
                                            busy={busy() === kid.id}
                                            onClick={() => void join(kid)}
                                        >
                                            {`Add ${kid.name}`}
                                        </Button>
                                    )}
                                </For>
                            </div>
                        </Part>
                    </Show>
                </Show>
                <Show when={said()}>
                    <Say text={said()} />
                </Show>
                <Show when={!said() && props.sending.unsent > 0}>
                    <p class="note">
                        {`${answers(props.sending.unsent)} not sent yet ${props.sending.unsent === 1 ? "is" : "are"} sent before the view closes.`}
                    </p>
                </Show>
                <div class="acts">
                    <a class={props.view.pin ? "btn second" : "btn"} href="/sign-in?shared=1">
                        Sign in instead
                    </a>
                    <Button second onClick={props.onBack}>
                        Back to the children
                    </Button>
                </div>
                <p class="note">
                    This tab becomes a parent page. Other children’s tabs stay as they are.
                </p>
            </Postcard>
        </Column>
    );
}
