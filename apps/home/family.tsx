// The family's page for a signed-in grown-up: the grown-ups' home (home.tsx). Adding a child is the
// app's dialog over it (bar.tsx), and the family's PIN is on the account page.

import {
    createEffect,
    createResource,
    createSignal,
    Match,
    on,
    Show,
    Switch,
    untrack,
    type JSX,
} from "solid-js";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { useLook, Waiting } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";
import { go, search } from "../../engine/ui/router";
import { Say } from "../../engine/ui/say";
import type { Failure } from "../../engine/ui/wire";
import type { FamilyView, Me } from "../../server/api";
import { added, familyChanged, knowFamily, openAdd } from "./bar";
import { GrownHome, toKid } from "./home";
import { signInFor } from "./routes";

const local = onThisComputer(location.hostname);

type Signed = { me: Me; view: FamilyView };
type Seen = Signed | { failure: Failure };

/**
 * Who is signed in and their family. `/` is this screen only because a session cookie came with the
 * request, so the API is asked for both whatever this browser remembers; a session it refuses has had
 * its cookie cleared by that answer, and `/` is then the site's.
 */
async function load(): Promise<Seen | null> {
    const me = await api.me({ ask: true });
    if ("error" in me) {
        // the children's view is open on this browser, and its Grown-ups tab is the way back
        if (me.error === "put-away") {
            location.replace("/sign-in?locked=1");
            return null;
        }
        if (me.error !== "signed-out") return { failure: me };
        if (location.pathname === "/") location.replace("/");
        else go(signInFor("/"), { replace: true });
        return null;
    }
    const view = await api.familyRows({ ask: true });
    if ("error" in view) return { failure: view };
    return { me, view };
}

export function Family(): JSX.Element {
    const look = useLook();
    const [seen, { refetch }] = createResource(load);
    const [said, setSaid] = createSignal("");
    // a child added in the app's dialog: the page reads the family again and says so
    createEffect(
        on(
            familyChanged,
            () => {
                setSaid(`${added()} is added.`);
                void refetch();
            },
            { defer: true },
        ),
    );
    // `latest`, so asking again after a change keeps the page as it is until the answer comes
    const signed = (): Signed | null => {
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
            place: "meadow",
            wide: true,
            foot: s
                ? [
                      `Signed in as ${s.me.user.email}`,
                      "Everything here is your family's, and nobody else's.",
                  ]
                : [],
        });
    });
    // `/?add` opens the dialog over the home, and a child's stamp says which card to go to
    const follow = (q: string): void => {
        const asked = new URLSearchParams(q);
        if (asked.has("add")) {
            go("/", { replace: true });
            openAdd();
        } else if (asked.has("kid")) {
            toKid(asked.get("kid"));
        }
    };
    createEffect(
        on(search, (q) => {
            if (untrack(signed)) follow(q);
        }),
    );
    let followed = false;
    createEffect(() => {
        if (!signed() || followed) return;
        followed = true;
        follow(untrack(search));
    });
    return (
        <Show
            when={seen.latest}
            fallback={<Waiting kicker="For grown-ups" title="Opening your family" />}
        >
            <Switch>
                <Match when={failed()}>
                    {(f) => (
                        <Postcard note kicker="For grown-ups" title="Your family did not load">
                            <Say
                                text={failureText(f(), local)}
                                action={{ label: "Try again", run: () => void refetch() }}
                            />
                        </Postcard>
                    )}
                </Match>
                <Match when={signed()}>
                    {(s) => (
                        <GrownHome
                            me={s().me}
                            view={s().view}
                            said={said()}
                            onAdd={() => {
                                setSaid("");
                                openAdd();
                            }}
                        />
                    )}
                </Match>
            </Switch>
        </Show>
    );
}
