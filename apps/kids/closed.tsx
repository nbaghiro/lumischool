// When the children's view cannot open (.docs/auth.md, flow 5): this browser holds no kid session, so
// a grown-up signs in and opens it from the family's page; or it holds one and lumischool cannot be
// reached yet, and the view waits and asks again by itself.

import { createEffect, type JSX } from "solid-js";
import { useLook } from "../../engine/ui/page";
import { Corner, Postcard, To } from "../../engine/ui/postcard";

const FOOT = ["Children never sign in and have no email."];

export function Closed(): JSX.Element {
    const look = useLook();
    createEffect(() => look({ logo: "none", foot: FOOT, place: "meadow" }));
    return (
        <Postcard
            kicker="The children's view"
            title={
                <>
                    Ask a <span class="nowrap">grown-up</span>
                </>
            }
            lead="A grown-up signs in on this device, then opens your page from the family's page."
            corner={<Corner place="meadow" seed={891} />}
            address={
                <>
                    <To who="A grown-up in this family" />
                    <a class="btn wide" href="/sign-in?shared=1">
                        Sign in
                    </a>
                    <p class="note">
                        Each child a grown-up opens this for gets their own stamp here.
                    </p>
                </>
            }
        />
    );
}

export function NotYet(props: { offline: boolean }): JSX.Element {
    const look = useLook();
    createEffect(() => look({ logo: "none", foot: FOOT, place: "meadow" }));
    return (
        <Postcard
            note
            kicker="The children's view"
            title={props.offline ? "Waiting for the internet" : "Your page is on its way"}
            lead="It opens by itself when it is ready."
        />
    );
}
