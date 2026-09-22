// The paper near the camera on a roll (world.tsx): a sheet is drawn the first time the roll says it is
// near, let go of once it is not, and the height it measured is kept for good, so the roll lays out
// round it once and nothing moves under the reader when the paper goes and comes back. What a sheet
// was read from is the caller's to keep, so paper drawn again is not fetched twice. The grown-ups'
// map (apps/home/map.tsx) and the overlay (overlay.tsx) read their sheets through it.

export interface NearPaper<P> {
    /**
     * The lessons whose paper is near now, every one of them each time the near set changes: what is
     * new is drawn, what is no longer near is let go of.
     */
    lookBack(near: readonly string[]): void;
    /** The paper drawn for a lesson, while it is near. */
    sheet(lesson: string): P | null;
    /** The height a lesson's paper measured, in the roll's units, kept once it has been drawn once. */
    height(lesson: string): number | null;
    /** Lets every sheet go and forgets every height: a phone turned draws everything again at its width. */
    forget(): void;
}

/**
 * `draw` draws one lesson's paper and measures it, or null when it cannot be drawn; `drawn` hears
 * once paper has landed or gone, so the roll lays itself out again round what it measured.
 */
export function nearPaper<P extends { height: number; dispose(): void }>(o: {
    draw(lesson: string): Promise<P | null>;
    drawn(): void;
}): NearPaper<P> {
    const paper = new Map<string, P>();
    const heights = new Map<string, number>();
    const asking = new Set<string>();
    /** What is near as of the last look, so paper that lands once it is no longer near is let go of. */
    let wanted = new Set<string>();
    /** Which look each ask belongs to, so paper that lands after a `forget` is let go of rather than kept. */
    let look = 0;
    const drop = (lesson: string, p: P): void => {
        p.dispose();
        paper.delete(lesson);
    };
    return {
        lookBack(near) {
            wanted = new Set(near);
            let went = false;
            for (const [lesson, p] of paper)
                if (!wanted.has(lesson)) {
                    drop(lesson, p);
                    went = true;
                }
            if (went) o.drawn();
            const want = near.filter((id) => !paper.has(id) && !asking.has(id));
            if (!want.length) return;
            const at = look;
            for (const id of want) asking.add(id);
            void Promise.all(
                want.map(async (id) => {
                    const p = await o.draw(id).catch(() => null);
                    asking.delete(id);
                    if (!p) return false;
                    // asked for before a forget, or no longer near by the time it landed
                    if (at !== look || !wanted.has(id)) {
                        p.dispose();
                        return false;
                    }
                    paper.set(id, p);
                    heights.set(id, p.height);
                    return true;
                }),
            ).then((landed) => {
                if (landed.some(Boolean)) o.drawn();
            });
        },
        sheet: (lesson) => paper.get(lesson) ?? null,
        height: (lesson) => heights.get(lesson) ?? null,
        forget() {
            look += 1;
            for (const [lesson, p] of paper) drop(lesson, p);
            heights.clear();
            asking.clear();
        },
    };
}
