// Who is learning today (.docs/auth.md, flow 5), in design B: the title on a strip of paper, a stamp
// for each child this view was opened for, in rows that wrap on a narrow screen, and a line while the
// internet is away. A tap opens that child's page; there are no picture keys.

import { createEffect, onMount, type JSX } from "solid-js";
import { Offline, Stamps } from "../../engine/ui/kids";
import { Column, useLook } from "../../engine/ui/page";
import { familyName } from "../../school/family/names";
import type { KidView } from "../../server/api";
import type { Kid } from "../../server/db/schema";

export function Who(props: {
    view: KidView;
    offline: boolean;
    onChoose: (kid: Kid) => void;
    onGrownUps: () => void;
}): JSX.Element {
    const look = useLook();
    createEffect(() =>
        look({
            logo: "none",
            end: { kind: "gate", open: props.onGrownUps },
            foot: [familyName(props.view.family.name)],
            centered: true,
        }),
    );
    let hello: HTMLHeadingElement | undefined;
    onMount(() => hello?.focus({ preventScroll: true }));
    return (
        <Column>
            <div class="strip" data-clear="">
                <h1
                    tabindex={-1}
                    ref={(el) => {
                        hello = el;
                    }}
                >
                    Who is learning today?
                </h1>
            </div>
            <Stamps kids={props.view.kids} onChoose={props.onChoose} />
            <Offline when={props.offline} />
        </Column>
    );
}
