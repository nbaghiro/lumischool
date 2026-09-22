// What stands in a screen's place while it opens, and when a child is told about a wait: a moment is
// the movement itself and the page says nothing; a wait a child would notice says what is happening;
// and a wait that goes on says so and offers to try again, which loads the page afresh. When the
// lines are said is `openingLine` in opening.ts, which a suite covers.

import { createSignal, Match, onCleanup, Switch, type JSX } from "solid-js";
import { Button } from "../../engine/ui/form";
import { Say } from "../../engine/ui/say";
import { openingLine, SAY_OPENING, TOO_LONG, type OpeningLine } from "./opening";

const OPENING = "Your page is opening.";
const SLOW = "This is taking a long time.";

export function Opening(props: { failed?: boolean }): JSX.Element {
    const began = Date.now();
    const [line, setLine] = createSignal<OpeningLine>(props.failed ? "slow" : "nothing");
    const timers = [SAY_OPENING, TOO_LONG].map((ms) =>
        setTimeout(() => setLine(openingLine(Date.now() - began)), ms),
    );
    onCleanup(() => {
        for (const t of timers) clearTimeout(t);
    });
    return (
        <Switch>
            <Match when={props.failed || line() === "slow"}>
                <div class="kid-map-note">
                    <p>
                        <Say text={SLOW} calm />
                    </p>
                    <Button onClick={() => location.reload()}>Try again</Button>
                </div>
            </Match>
            <Match when={line() === "opening"}>
                <p class="kid-map-note">
                    <Say text={OPENING} calm />
                </p>
            </Match>
        </Switch>
    );
}
