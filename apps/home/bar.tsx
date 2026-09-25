// The grown-ups' bar, after the mark: which family this is, the places of the app, a stamp for each
// child that goes to their card, Add a child, and the grown-up's own stamp, whose menu holds their
// account and Sign out. A phone keeps the places and the grown-up's stamp. The app mounts it once
// above its screens (main.tsx), and it shows nothing until it knows the family, the one the home last
// read or read here; a fresh read that says the same leaves it as it is, so nothing on it is drawn
// again as a grown-up moves between screens. Add a child is the app's dialog (`AddKidDialog`), over
// whatever screen is open, and a child added there is a change of family every screen hears of.

import "./bar.css";
import {
    createEffect,
    createSignal,
    createUniqueId,
    For,
    on,
    onCleanup,
    Show,
    type JSX,
} from "solid-js";
import * as api from "../../engine/ui/api";
import { Drawing } from "../../engine/ui/art";
import { onThisComputer } from "../../engine/ui/device";
import { Dialog, CloseX } from "../../engine/ui/dialog";
import { failureText } from "../../engine/ui/failure";
import { Check, Field, SelectField } from "../../engine/ui/fields";
import { Button } from "../../engine/ui/form";
import { Portrait } from "../../engine/ui/kids";
import { SignOut } from "../../engine/ui/page";
import { Corner, Postcard, Stamp } from "../../engine/ui/postcard";
import { go, Link, path } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import { isParent } from "../../school/family/access";
import { familyName, gradeName } from "../../school/family/names";
import { GRADES, KID_FIELDS, NOTICE, NOTICE_VERSION } from "../../school/family/privacy";
import { GROWNUPS, type GrownupKind } from "../../engine/parts/apps/grownup";
import type { FamilyView, Me } from "../../server/api";
import { kidHref } from "./routes";

const local = onThisComputer(location.hostname);

/** The app's places, each with the words a phone has room for. */
const PLACES: readonly { href: string; long: string; short: string; at: (p: string) => boolean }[] =
    [
        { href: "/", long: "Home", short: "Home", at: (p) => p === "/" },
        {
            href: "/explore",
            long: "Explore",
            short: "Explore",
            at: (p) => p === "/explore" || p.startsWith("/explore/"),
        },
        { href: "/map", long: "Map", short: "Map", at: (p) => p === "/map" },
        { href: "/painting", long: "Painting", short: "Painting", at: (p) => p === "/painting" },
        { href: "/games", long: "Games", short: "Games", at: (p) => p === "/games" },
        {
            href: "/calendar",
            long: "Calendar",
            short: "Calendar",
            at: (p) => p === "/calendar",
        },
    ];

/** Whose family the bar last read: the person and family this browser is signed in as. */
const whose = (me: Pick<Me, "user" | "family">): string => `${me.user.email}|${me.family.name}`;
const signedInAs = (): string => {
    const h = api.signedIn();
    return h ? `${h.email}|${h.family}` : "";
};

interface Known {
    key: string;
    me: Me;
    view: FamilyView;
}

/** What the bar shows of a family: its name, the children, who is a parent, and the person with their picture. */
const shown = (k: Known): unknown => [k.view.family.name, k.view.kids, k.me.members, k.me.user];

/** Whether two reads would draw the same bar, so the second leaves the first's stamps as they are. */
const sameFamily = (a: Known | null, b: Known | null): boolean =>
    a === b ||
    (a !== null &&
        b !== null &&
        a.key === b.key &&
        JSON.stringify(shown(a)) === JSON.stringify(shown(b)));

const [known, setKnown] = createSignal<Known | null>(null, { equals: sameFamily });
let asking: string | null = null;

/**
 * Counts the changes of family made in the app itself, a child added: every screen's family resource
 * reads again on it, and the bar forgets what it knew so its stamps are read again too.
 */
const [familyChanged, bumpFamily] = createSignal(0);
export { familyChanged };
/** The name of the child last added in the app, for the line a screen says. */
const [added, setAdded] = createSignal("");
export { added };
const changedFamily = (name: string): void => {
    setAdded(name);
    // the screens hear first, so a line one of them says about the change takes the keyboard ahead
    // of the dialog's opener, which the bar's forgetting closes (the dialog stands only while the
    // bar knows the family)
    bumpFamily((n) => n + 1);
    setKnown(null);
    void ask();
};

const [adding, setAdding] = createSignal(false);
/** Opens the Add a child dialog over whatever screen is open. */
export const openAdd = (): void => {
    setAdding(true);
};

/** The family as a screen has just read it, so the bar's children are the ones the page shows. */
export const knowFamily = (me: Me, view: FamilyView): void => {
    setKnown({ key: whose(me), me, view });
};

/**
 * The family the bar shows, read again whenever this browser is signed in as someone else than the
 * family the bar last read, and after a read that failed, at the next move between screens.
 */
async function ask(): Promise<void> {
    const now = signedInAs();
    if (known()?.key === now && now) return;
    if (known() && known()?.key !== now) setKnown(null);
    if (asking === now) return;
    asking = now;
    const [me, view] = await Promise.all([api.me(), api.familyRows()]);
    if (asking === now) asking = null;
    if (me && view && whose(me) === signedInAs()) setKnown({ key: whose(me), me, view });
}

export function GrownBar(): JSX.Element {
    // asked again on every move, which is nothing while the family shown is the one signed in
    createEffect(on(path, () => void ask()));
    return (
        <Show when={known()}>
            {(k) => (
                <div class="gb">
                    <p class="gb-family">
                        <span class="kicker">For grown-ups</span>
                        <b>{familyName(k().view.family.name)}</b>
                    </p>
                    <nav class="gb-places" aria-label="The grown-ups' places">
                        <For
                            each={PLACES.filter(
                                (p) => p.href !== "/painting" || isParent(k().me.members),
                            )}
                        >
                            {(p) => (
                                <a
                                    href={p.href}
                                    aria-current={p.at(path()) ? "page" : undefined}
                                    onClick={(e) => {
                                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey)
                                            return;
                                        e.preventDefault();
                                        if (!p.at(path())) go(p.href);
                                    }}
                                >
                                    <span class="long">{p.long}</span>
                                    <span class="short">{p.short}</span>
                                </a>
                            )}
                        </For>
                    </nav>
                    <Show when={k().view.kids.length > 0}>
                        <nav class="gb-kids" aria-label="Each child">
                            <For each={k().view.kids}>
                                {(kid) => (
                                    <Link href={kidHref(kid)} class="gb-kid">
                                        <Portrait kid={kid} kids={k().view.kids} />
                                        <span class="sr">{`${kid.name}, ${gradeName(kid.grade)}`}</span>
                                    </Link>
                                )}
                            </For>
                        </nav>
                    </Show>
                    <Show when={isParent(k().me.members)}>
                        <button type="button" class="btn second gb-add" onClick={openAdd}>
                            Add a child
                        </button>
                    </Show>
                    <Person me={k().me} />
                </div>
            )}
        </Show>
    );
}

/**
 * Add a child (.docs/auth.md, flow 4) as a card lifted over whatever screen is open, mounted once by
 * the app beside the bar. A child added closes it, tells every screen the family changed, and says
 * so under the bar on a screen that has no line of its own for it.
 */
export function AddKidDialog(): JSX.Element {
    const [said, setSaid] = createSignal("");
    // the line that says the child is added is made before the dialog leaves, so it takes the
    // keyboard ahead of the button that opened the dialog
    const close = (name: string): void => {
        if (name) {
            changedFamily(name);
            if (path() !== "/") setSaid(`${name} is added.`);
        }
        setAdding(false);
    };
    createEffect(on(path, () => setSaid(""), { defer: true }));
    return (
        <>
            <Show when={said()}>
                <div class="gb-said">
                    <Say tone="success" focus text={said()} />
                </div>
            </Show>
            <Show when={adding() ? known() : null}>
                {(k) => (
                    <Dialog two onClose={() => close("")}>
                        <AddKid me={k().me} onDone={close} />
                    </Dialog>
                )}
            </Show>
        </>
    );
}

/** Flow 4 on one card: the notice on the message side, the form on the address side. */
function AddKid(props: { me: Me; onDone: (added: string) => void }): JSX.Element {
    const [name, setName] = createSignal("");
    const [grade, setGrade] = createSignal(String(GRADES[0] ?? 1));
    const [agreed, setAgreed] = createSignal(false);
    const [wrong, setWrong] = createSignal("");
    const [said, setSaid] = createSignal<{ text: string; reload: boolean } | null>(null);
    const [busy, setBusy] = createSignal(false);
    let input: HTMLInputElement | undefined;
    const add = async (): Promise<void> => {
        if (busy()) return;
        const n = name().trim();
        setWrong(n ? "" : "Type what your family calls them.");
        if (!n) {
            input?.focus();
            return;
        }
        if (!agreed()) {
            setSaid({
                text: "Please read the notice and tick the box. We ask so that you decide what is recorded about your child.",
                reload: false,
            });
            return;
        }
        setBusy(true);
        setSaid(null);
        const r = await api.addKid({ name: n, grade: Number(grade()), notice: NOTICE_VERSION });
        setBusy(false);
        if (!("error" in r)) props.onDone(r.kid.name);
        else setSaid({ text: failureText(r, local), reload: r.error === "notice-changed" });
    };
    return (
        <Postcard
            focus={false}
            kicker={familyName(props.me.family.name)}
            title="Add a child"
            lead="We ask for a name and a grade, and nothing else about them."
            corner={<Corner place="meadow" seed={851} />}
            address={
                <form
                    class="form"
                    novalidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void add();
                    }}
                >
                    <Field
                        label="Their name"
                        hint={KID_FIELDS.name}
                        name="kid-name"
                        autocomplete="off"
                        maxlength={40}
                        value={name()}
                        onInput={setName}
                        error={wrong() || undefined}
                        ref={(el) => {
                            input = el;
                            el.dataset.focus = "";
                        }}
                    />
                    <SelectField
                        label="Their grade"
                        hint={KID_FIELDS.grade}
                        name="grade"
                        value={grade()}
                        options={GRADES.map((g) => ({ value: String(g), label: gradeName(g) }))}
                        onChange={setGrade}
                    />
                    <Check
                        label="I have read the notice, and as their parent I agree to it"
                        name="consent"
                        checked={agreed()}
                        onChange={setAgreed}
                    />
                    <Show when={said()}>
                        {(s) => (
                            <Say
                                text={s().text}
                                action={
                                    s().reload
                                        ? {
                                              label: "Load the new notice",
                                              run: () => location.reload(),
                                          }
                                        : undefined
                                }
                            />
                        )}
                    </Show>
                    <div class="acts">
                        <Button submit busy={busy()}>
                            {busy() ? "Adding" : "Add"}
                        </Button>
                        <Button second onClick={() => props.onDone("")}>
                            Not now
                        </Button>
                    </div>
                </form>
            }
        >
            <CloseX onClose={() => props.onDone("")} />
            <div class="notice">
                <strong>What we record, and who sees it</strong>
                <For each={NOTICE}>{(p) => <p>{p}</p>}</For>
                <p class="note">Notice {NOTICE_VERSION}</p>
            </div>
        </Postcard>
    );
}

/** Whether a grown-up has picked the picture on their stamp, rather than having the one their id gave them. */
export const pickedPortrait = (me: Pick<Me, "user">): boolean => {
    const s = me.user.settings;
    const kind = typeof s === "object" && s !== null && "picture" in s ? s.picture : null;
    return GROWNUPS.some((k) => k === kind);
};

/**
 * The portrait on a grown-up's stamp: the one their settings name, when the shelf can draw it, or
 * else one their id gives them, the same for that person every time and spread across people, so
 * every grown-up has a picture from their first sign-in and no row is written for it.
 */
export const portraitOf = (me: Pick<Me, "user">): GrownupKind => {
    const s = me.user.settings;
    const kind = typeof s === "object" && s !== null && "picture" in s ? s.picture : null;
    const chosen = GROWNUPS.find((k) => k === kind);
    if (chosen) return chosen;
    let h = 0;
    for (const c of me.user.id) h = (h * 31 + c.charCodeAt(0)) % 0x7fffffff;
    return GROWNUPS[h % GROWNUPS.length] ?? "short";
};

/**
 * A grown-up as a child is drawn, with a difference: their head and shoulders on a square stamp with
 * a quiet ground, larger than a child's tall one, so the two kinds sit together and read apart.
 */
export function GrownStamp(props: { me: Pick<Me, "user"> }): JSX.Element {
    return (
        <span class="kid-portrait gb-me-stamp" aria-hidden="true">
            <Stamp
                class="kid-stamp-paper"
                picture="none"
                value=""
                ground="sky"
                quiet
                shape="square"
                seed={877}
            />
            <Drawing
                class="kid-stamp-pic"
                id="grownup"
                params={{ kind: portraitOf(props.me) }}
                seed={878}
            />
        </span>
    );
}

/**
 * The grown-up's own stamp at the end of the bar, and the menu under it: who is signed in, their
 * account, and Sign out, which keeps the page's own sign-out with its slip that says why when it
 * fails. The menu opens on a click or Enter, the arrows move within it, Escape closes it and gives
 * the stamp the keyboard back, and a press anywhere else closes it.
 */
function Person(props: { me: Me }): JSX.Element {
    const [open, setOpen] = createSignal(false);
    const id = createUniqueId();
    let stamp: HTMLButtonElement | undefined;
    let pop: HTMLDivElement | undefined;
    const name = (): string => props.me.user.name?.trim() || props.me.user.email;
    const items = (): HTMLElement[] =>
        pop ? [...pop.querySelectorAll<HTMLElement>('[role="menuitem"]')] : [];
    const close = (back: boolean): void => {
        if (!open()) return;
        setOpen(false);
        if (back) stamp?.focus();
    };
    const show = (intoMenu: boolean): void => {
        setOpen(true);
        if (intoMenu) queueMicrotask(() => items()[0]?.focus());
    };
    createEffect(() => {
        if (!open()) return;
        const away = (e: PointerEvent): void => {
            const t = e.target;
            if (t instanceof Node && (pop?.contains(t) || stamp?.contains(t))) return;
            close(false);
        };
        document.addEventListener("pointerdown", away);
        onCleanup(() => document.removeEventListener("pointerdown", away));
    });
    const onKey = (e: KeyboardEvent): void => {
        const list = items();
        const at = list.findIndex((el) => el === document.activeElement);
        if (e.key === "Escape") {
            e.preventDefault();
            close(true);
        } else if (e.key === "Tab") {
            close(false);
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open()) return show(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            list[(at + step + list.length) % list.length]?.focus();
        } else if (e.key === "Home" && open()) {
            e.preventDefault();
            list[0]?.focus();
        } else if (e.key === "End" && open()) {
            e.preventDefault();
            list.at(-1)?.focus();
        }
    };
    return (
        <div class="gb-me">
            <button
                type="button"
                class="gb-me-b"
                aria-haspopup="menu"
                aria-expanded={open()}
                aria-controls={id}
                aria-label={`${name()}: your account, and sign out`}
                ref={(el) => {
                    stamp = el;
                }}
                onClick={(e) => (open() ? close(true) : show(e.detail === 0))}
                onKeyDown={onKey}
            >
                <GrownStamp me={props.me} />
            </button>
            <Show when={open()}>
                <div
                    class="gb-me-pop"
                    id={id}
                    ref={(el) => {
                        pop = el;
                    }}
                >
                    <p class="gb-me-who">
                        <b>{name()}</b>
                        <span>{props.me.user.email}</span>
                    </p>
                    <div
                        role="menu"
                        tabindex={-1}
                        aria-label={`${name()}'s menu`}
                        onKeyDown={onKey}
                    >
                        <a
                            href="/account"
                            role="menuitem"
                            class="gb-me-item"
                            onClick={(e) => {
                                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                                e.preventDefault();
                                close(false);
                                go("/account");
                            }}
                        >
                            Account
                        </a>
                        <SignOut run={api.signOut} role="menuitem" class="gb-me-item" />
                    </div>
                </div>
            </Show>
        </div>
    );
}
