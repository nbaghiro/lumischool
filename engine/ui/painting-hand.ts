/**
 * The hand layout's one moving part: the materials sit where the hand last left the paper and go
 * while a stroke is being drawn, so nothing stands between the paper and the hand. Only that layout
 * mounts this. It moves nothing by itself, so there is nothing to stop under reduced motion.
 */
export function materialsUnderHand(paper: HTMLElement, panel: HTMLElement): void {
    const GAP = 18;
    const place = (x: number, y: number) => {
        const room = (panel.offsetParent ?? paper).getBoundingClientRect(),
            card = panel.getBoundingClientRect();
        const left = Math.max(0, Math.min(x - room.left + GAP, room.width - card.width));
        const top = Math.max(0, Math.min(y - room.top + GAP, room.height - card.height));
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    };
    paper.addEventListener("pointerdown", () => panel.setAttribute("data-away", ""));
    const done = (event: PointerEvent) => {
        panel.removeAttribute("data-away");
        place(event.clientX, event.clientY);
    };
    paper.addEventListener("pointerup", done);
    paper.addEventListener("pointercancel", done);
    // the keyboard never hides it, so every control stays reachable without touching the paper
    panel.addEventListener("focusin", () => panel.removeAttribute("data-away"));
}
