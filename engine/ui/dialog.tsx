// A postcard lifted off the page in a native dialog shown modal (dialog.css): the room round the card
// closes it on a click, Escape closes it through onCancel, the card's own first thing takes the
// keyboard when it opens (`data-focus`, else its first control), and whatever had the keyboard
// before gets it back once the dialog has left the top layer, since while it is modal the rest of
// the page is inert, unless a line the closing made has taken it first.

import "./dialog.css";
import { onCleanup, type JSX } from "solid-js";
import { focusOnceShown } from "./say";

export function Dialog(props: {
    /** Twice a card's width, for a two-sided postcard. */
    two?: boolean;
    onClose: () => void;
    children: JSX.Element;
}): JSX.Element {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    onCleanup(() => {
        if (opener) focusOnceShown(opener);
    });
    return (
        <dialog
            class="dialog"
            classList={{ two: !!props.two }}
            ref={(el) => {
                // a click on the backdrop lands on the dialog itself; Escape is the keyboard's way,
                // through onCancel
                el.addEventListener("click", (e) => {
                    if (e.target === el) props.onClose();
                });
                queueMicrotask(() => {
                    if (!el.open) el.showModal();
                    (
                        el.querySelector<HTMLElement>("[data-focus]") ??
                        el.querySelector<HTMLElement>(
                            ".postcard :is(input, select, button):not(.dialog-x)",
                        )
                    )?.focus();
                });
            }}
            onCancel={(e) => {
                e.preventDefault();
                props.onClose();
            }}
        >
            {props.children}
        </dialog>
    );
}

/** The X in a lifted card's corner. */
export function CloseX(props: { onClose: () => void }): JSX.Element {
    return (
        <button type="button" class="dialog-x" aria-label="Close" onClick={props.onClose}>
            <span aria-hidden="true">×</span>
        </button>
    );
}
