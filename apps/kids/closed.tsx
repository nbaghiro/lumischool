import { createEffect, type JSX } from "solid-js";
import { KidSignIn } from "../../engine/ui/kid-sign-in";
import { useLook } from "../../engine/ui/page";
import { Postcard } from "../../engine/ui/postcard";

export function Closed(): JSX.Element {
    return <KidSignIn />;
}

export function NotYet(props: { offline: boolean }): JSX.Element {
    const look = useLook();
    createEffect(() => look({ logo: "none", place: "meadow" }));
    return (
        <Postcard
            note
            kicker="The children's view"
            title={props.offline ? "Waiting for the internet" : "Your page is on its way"}
            lead="It opens by itself when it is ready."
        />
    );
}
