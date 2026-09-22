// What the map behind a page keeps its place clear of (page.tsx). The map moves its camera sideways
// past one box at a time, so boxes side by side, such as a row of children's stamps, are joined into
// one box first: otherwise a place between two of them is pushed off one and back onto the next.

/** A box in the window, as `getBoundingClientRect` gives it. */
export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** The boxes top to bottom, with those that share any of the page's height joined into one. */
export function rowsOf(boxes: readonly Box[]): Box[] {
    const rows: Box[] = [];
    const drawn = boxes.filter((b) => b.right > b.left && b.bottom > b.top);
    for (const b of drawn.toSorted((x, y) => x.top - y.top)) {
        const last = rows.at(-1);
        if (last && b.top < last.bottom) {
            rows[rows.length - 1] = {
                left: Math.min(last.left, b.left),
                top: last.top,
                right: Math.max(last.right, b.right),
                bottom: Math.max(last.bottom, b.bottom),
            };
        } else {
            rows.push({ left: b.left, top: b.top, right: b.right, bottom: b.bottom });
        }
    }
    return rows;
}
