import type { WorldView } from "../space";

// The paper near the camera on a roll (world.tsx): a sheet is drawn the first time the roll says it is
// near, set aside once it is not and let go of once others have been, and the height it measured is
// kept for good, so the roll lays out round it once and nothing moves under the reader when the paper
// goes and comes back. What a sheet was read from is the caller's to keep, so paper drawn again is not
// fetched twice. The grown-ups' map (apps/home/map.tsx) and the overlay (overlay.tsx) read their
// sheets through it.

export interface NearPaper<P> {
    /**
     * The lessons whose paper is near now, every one of them each time the near set changes: what is
     * new is drawn, what is no longer near is set aside, and what was set aside longest ago goes.
     */
    lookBack(near: readonly string[]): void;
    /**
     * Asks again for what is near and for every lesson that could not be drawn, which the roll may
     * have moved on from as it failed.
     */
    retry(near: readonly string[]): void;
    /** The paper drawn for a lesson, while it is near. */
    sheet(lesson: string): P | null;
    /** The height a lesson's paper measured, in the roll's units, kept once it has been drawn once. */
    height(lesson: string): number | null;
    failed(lesson: string): boolean;
    loading(lesson: string): boolean;
    /** Lets every sheet go and forgets every height: a phone turned draws everything again at its width. */
    forget(): void;
}

/** Where the heights paper measured are kept on the device, and how many are kept. */
const STORED = "lumischool.sheetHeights";
const MOST = 3000;
/** How many sheets no longer near are kept drawn, each a live page of words and pictures. */
const ASIDE = 6;
let stored: Map<string, number> | null = null;
let saving: ReturnType<typeof setTimeout> | 0 = 0;
/**
 * The heights paper has measured on this device, by what the roll said they depend on and the lesson,
 * so a roll opened again, or on another day, lays out round its paper from the first frame and does
 * not move when the paper lands (.docs/map-smoothness-plan.md, phase 1).
 */
function keptHeights(): Map<string, number> {
    if (stored) return stored;
    stored = new Map();
    try {
        const read: unknown = JSON.parse(localStorage.getItem(STORED) ?? "[]");
        if (Array.isArray(read))
            for (const entry of read as unknown[]) {
                const k: unknown = Array.isArray(entry) ? entry.at(0) : undefined,
                    h: unknown = Array.isArray(entry) ? entry.at(1) : undefined;
                if (typeof k === "string" && typeof h === "number" && h > 0) stored.set(k, h);
            }
    } catch {
        /* the heights are measured again */
    }
    return stored;
}
function keepHeight(key: string, height: number): void {
    const kept = keptHeights();
    if (kept.get(key) === height) return;
    kept.delete(key);
    kept.set(key, height);
    for (const oldest of kept.keys()) {
        if (kept.size <= MOST) break;
        kept.delete(oldest);
    }
    if (saving) return;
    saving = setTimeout(() => {
        saving = 0;
        try {
            localStorage.setItem(STORED, JSON.stringify([...kept]));
        } catch {
            /* a full or blocked store keeps the heights for this page only */
        }
    }, 1000);
}

/**
 * `draw` draws one lesson's paper and measures it, or null when it cannot be drawn; `drawn` hears
 * when a sheet queues, lands, fails, or goes, so the reader can update without waiting for the batch.
 * `scope` names what the paper's height depends on besides the lesson (its level, its width, the child
 * it was written by), for the heights kept on the device; without it they are kept for this roll only.
 */
export function nearPaper<P extends { height: number; dispose(): void }>(o: {
    draw(lesson: string): Promise<P | null>;
    drawn(): void;
    scope?: () => string;
}): NearPaper<P> {
    const paper = new Map<string, P>();
    /** Paper no longer near, oldest first, so a child scrolling back and forth does not draw it again. */
    const aside = new Map<string, P>();
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
                            // a height measured before the page's fonts have come is not the sheet's own
                            if (o.scope && document.fonts.status === "loaded")
                                keepHeight(`${o.scope()}|${id}`, p.height);
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
    const self: NearPaper<P> = {
        retry(now) {
            self.lookBack([...new Set([...now, ...failed])]);
        },
        lookBack(near) {
            wanted = new Set(near);
            let went = false;
            for (const [lesson, p] of paper)
                if (!wanted.has(lesson)) {
                    paper.delete(lesson);
                    aside.set(lesson, p);
                    went = true;
                }
            for (const lesson of near) {
                const p = aside.get(lesson);
                if (!p) continue;
                aside.delete(lesson);
                paper.set(lesson, p);
                went = true;
            }
            for (const [lesson, p] of aside) {
                if (aside.size <= ASIDE) break;
                aside.delete(lesson);
                p.dispose();
            }
            if (went) o.drawn();
            const want = near.filter((id) => !paper.has(id) && !asking.has(id));
            if (!want.length) return;
            const at = look;
            for (const id of want) {
                failed.delete(id);
                asking.set(id, at);
                queue.push({ id, at });
            }
            pump();
            o.drawn();
        },
        failed: (lesson) => failed.has(lesson),
        loading: (lesson) => wanted.has(lesson) && asking.has(lesson),
        sheet: (lesson) => paper.get(lesson) ?? null,
        height: (lesson) =>
            heights.get(lesson) ??
            (o.scope ? keptHeights().get(`${o.scope()}|${lesson}`) : null) ??
            null,
        forget() {
            look += 1;
            for (const [lesson, p] of paper) drop(lesson, p);
            for (const p of aside.values()) p.dispose();
            aside.clear();
            heights.clear();
            failed.clear();
            asking.clear();
            queue.length = 0;
        },
    };
    return self;
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
