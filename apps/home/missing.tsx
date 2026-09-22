// A path the grown-ups' app has no screen for.

import { createEffect, type JSX } from "solid-js";
import { useLook } from "../../engine/ui/page";
import { Corner, Postcard } from "../../engine/ui/postcard";
import { Link } from "../../engine/ui/router";

export function Missing(): JSX.Element {
    const look = useLook();
    createEffect(() => look({ place: "railway" }));
    return (
        <Postcard
            kicker="For grown-ups"
            title="There is no page here"
            lead="The address may have been mistyped, or the page may have moved."
            corner={<Corner place="railway" seed={881} />}
            links={
                <div class="acts">
                    <Link href="/" class="btn">
                        Go to your family
                    </Link>
                    <Link href="/sign-in" class="btn second">
                        Sign in
                    </Link>
                </div>
            }
        />
    );
}
