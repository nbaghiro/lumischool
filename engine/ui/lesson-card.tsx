import type { JSX } from "solid-js";

/** One catalogue lesson, with its first illustration supplied by the pack's reader. */
export function LessonCard(props: {
    href: string;
    title: string;
    subtitle: string;
    preview: JSX.Element;
    onClick?: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent>;
    onPointerEnter?: JSX.EventHandlerUnion<HTMLAnchorElement, PointerEvent>;
    onFocus?: JSX.EventHandlerUnion<HTMLAnchorElement, FocusEvent>;
}): JSX.Element {
    return (
        <a
            class="explore-tile"
            href={props.href}
            onClick={props.onClick}
            onPointerEnter={props.onPointerEnter}
            onFocus={props.onFocus}
        >
            {props.preview}
            <span class="explore-tile-title">{props.title}</span>
            <span class="explore-tile-sub">{props.subtitle}</span>
        </a>
    );
}
