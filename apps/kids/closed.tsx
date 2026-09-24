import { createEffect, type JSX } from "solid-js";
import { KidSignIn } from "../../engine/ui/kid-sign-in";
import { useLook } from "../../engine/ui/page";
import { Loading } from "./loading";

export function Closed(): JSX.Element {
    return <KidSignIn />;
}

export function NotYet(props: { offline: boolean; retry: () => void }): JSX.Element {
    const look = useLook();
    createEffect(() => look({ logo: "none", place: "meadow" }));
    return <Loading failed offline={props.offline} retry={props.retry} />;
}
