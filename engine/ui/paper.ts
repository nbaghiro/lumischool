import type { WorldView } from "../space";

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
    failed(lesson: string): boolean;
    /** Lets every sheet go and forgets every height: a phone turned draws everything again at its width. */
    forget(): void;
}

/**
 * `draw` draws one lesson's paper and measures it, or null when it cannot be drawn; `drawn` hears
 * when a sheet lands, fails, or goes, so the reader can update without waiting for the batch.
 */
export function nearPaper<P extends { height: number; dispose(): void }>(o: {
    draw(lesson: string): Promise<P | null>;
    drawn(): void;
}): NearPaper<P> {
    const paper = new Map<string, P>();
    const heights = new Map<string, number>();
    const asking = new Map<string, number>();
    const failed = new Set<string>();
    /** What is near as of the last look, so paper that lands once it is no longer near is let go of. */
    let wanted = new Set<string>();
    /** Which look each ask belongs to, so paper that lands after a `forget` is let go of rather than kept. */
    let look = 0;
    const drop = (lesson: string, p: P): void => {
        p.dispose();
        paper.delete(lesson);
    };
    const queue: { id: string; at: number }[] = [];
    let active = 0;
    const pump = (): void => {
        while (active < 2 && queue.length) {
            const next = queue.shift();
            if (!next) break;
            const { id, at } = next;
            if (at !== look || !wanted.has(id)) {
                if (asking.get(id) === at) asking.delete(id);
                continue;
            }
            active += 1;
            failed.delete(id);
            void o
                .draw(id)
                .catch(() => null)
                .then((p) => {
                    if (asking.get(id) === at) asking.delete(id);
                    if (at !== look || !wanted.has(id)) p?.dispose();
                    else {
                        if (p) {
                            paper.set(id, p);
                            heights.set(id, p.height);
                        } else failed.add(id);
                        o.drawn();
                    }
                })
                .finally(() => {
                    active -= 1;
                    pump();
                });
        }
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
            let retrying = false;
            const at = look;
            for (const id of want) {
                if (failed.delete(id)) retrying = true;
                asking.set(id, at);
                queue.push({ id, at });
            }
            pump();
            if (retrying) o.drawn();
        },
        failed: (lesson) => failed.has(lesson),
        sheet: (lesson) => paper.get(lesson) ?? null,
        height: (lesson) => heights.get(lesson) ?? null,
        forget() {
            look += 1;
            for (const [lesson, p] of paper) drop(lesson, p);
            heights.clear();
            failed.clear();
            asking.clear();
            queue.length = 0;
        },
    };
}

/** One speculative job, with a second slot reserved for navigation past a slow background read. */
export function preparedPaper<P extends { dispose(): void }>(
    limit = 6,
    weight: (paper: P) => number = () => 1,
    budget = limit,
): {
    read(key: string, draw: () => Promise<P | null>, take?: boolean): Promise<P | null>;
    keep(keys: readonly string[]): void;
    dispose(): void;
} {
    type Job = {
        key: string;
        draw: () => Promise<P | null>;
        promise: Promise<P | null>;
        resolve: (p: P | null) => void;
        take: boolean;
        started: boolean;
        paper?: P;
    };
    const jobs = new Set<Job>();
    const available = new Map<string, Job>();
    let running = 0;
    let disposed = false;
    const drop = (job: Job): void => {
        jobs.delete(job);
        if (available.get(job.key) === job) available.delete(job.key);
        job.paper?.dispose();
        job.resolve(null);
    };
    const pump = (): void => {
        if (running >= 2 || disposed) return;
        const pending = [...jobs].filter((j) => !j.started);
        const job = pending.find((j) => j.take) ?? (running === 0 ? pending[0] : undefined);
        if (!job) return;
        job.started = true;
        running += 1;
        void (async () => {
            // Let input and the camera paint between synchronous sheet renders.
            await new Promise((done) => setTimeout(done, 0));
            if (disposed || !jobs.has(job)) return;
            const paper = await job.draw().catch(() => null);
            if (disposed || !jobs.has(job)) {
                paper?.dispose();
                return;
            }
            if (paper) job.paper = paper;
            job.resolve(paper);
            if (job.take || !paper) {
                jobs.delete(job);
                if (available.get(job.key) === job) available.delete(job.key);
            }
            const ready = [...jobs].filter((j) => j.paper && !j.take);
            while (
                ready.length > limit ||
                ready.reduce((sum, item) => sum + (item.paper ? weight(item.paper) : 0), 0) > budget
            ) {
                const old = ready.shift();
                if (old) drop(old);
            }
        })().finally(() => {
            running -= 1;
            pump();
        });
        pump();
    };
    return {
        read(key, draw, take = false) {
            if (disposed) return Promise.resolve(null);
            let job = available.get(key);
            if (!job) {
                let resolve: (p: P | null) => void = () => {};
                const promise = new Promise<P | null>((done) => {
                    resolve = done;
                });
                job = { key, draw, promise, resolve, take, started: false };
                jobs.add(job);
                available.set(key, job);
            }
            if (take) {
                job.take = true;
                available.delete(key);
                if (job.paper) jobs.delete(job);
            }
            pump();
            return job.promise;
        },
        keep(keys) {
            for (const job of jobs)
                if (!job.take && !job.paper && !keys.includes(job.key)) drop(job);
        },
        dispose() {
            disposed = true;
            for (const job of jobs) drop(job);
        },
    };
}

/** The same destination for preparation and the camera; no lesson is substituted while loading. */
export function landingRow(
    view: WorldView,
    o: { day?: string; lesson?: string | null; term?: number } = {},
): WorldView["layout"]["rows"][number] | undefined {
    const rows = view.layout.rows;
    const today = rows.find((r) => r.day.state === "today");
    return (
        (o.day ? rows.find((r) => r.day.id === o.day) : undefined) ??
        (o.lesson ? rows.find((r) => r.day.lessons.includes(o.lesson ?? "")) : undefined) ??
        (o.term !== undefined && today?.day.term !== o.term
            ? rows.filter((r) => r.day.term === o.term).at(-1)
            : (today ?? rows.at(-1)))
    );
}
