import { test } from "node:test";
import assert from "node:assert/strict";
import { paintingAutosave, type PaintingRepository, type PaintingRecovery } from "../painting-save";
import type { Picture } from "../../painting";
const blank = (): Picture => ({
    version: 1,
    id: crypto.randomUUID(),
    title: "My painting",
    painting: { k: "painting", paper: "plain", w: 30, h: 20, marks: [] },
    activity: "draw",
    idea: "butterfly",
    fills: {},
    step: 0,
    guides: true,
});
const coloured = (p: Picture, colour = "#123abc"): Picture => ({
    ...p,
    activity: "colour",
    fills: { "0-0": colour },
});
function fixture(save: PaintingRepository["save"], recovery?: PaintingRecovery) {
    const stored = new Map<string, PaintingRecovery>();
    const statuses: string[] = [];
    const initial = recovery?.document ?? blank();
    const queue = paintingAutosave({
        initial,
        repository: {
            revision: recovery?.revision ?? 0,
            recovery,
            save,
            async keep(item) {
                stored.set(item.document.id, structuredClone(item));
            },
            async forget(id, op) {
                if (stored.get(id)?.operation_id === op) stored.delete(id);
            },
        },
        thumbnail: async () => "preview",
        status: (s) => statuses.push(s),
        identity: () => {},
        delay: 60000,
    });
    return { initial, queue, stored, statuses };
}
test("autosave keeps completed edits locally and serializes edits made during a network save", async () => {
    let release: () => void = () => {};
    const waiting = new Promise<void>((resolve) => {
        release = resolve;
    });
    const revisions: number[] = [];
    let count = 0;
    const f = fixture(async (document, _thumbnail, _op, revision) => {
        revisions.push(revision);
        if (++count === 1) await waiting;
        return { document, revision: count, conflict: false };
    });
    f.queue.change(coloured(f.initial));
    const sending = f.queue.flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(f.stored.size, 1);
    f.queue.change(coloured(f.initial, "#abcdef"));
    release();
    await sending;
    assert.deepEqual(revisions, [0, 1]);
    assert.equal(f.stored.size, 0);
    assert.equal(f.statuses.at(-1), "Saved");
    await f.queue.leave();
});
test("offline failure preserves operation identity for retry and recovery", async () => {
    const ids: string[] = [];
    let offline = true;
    const f = fixture(async (document, _thumb, op) => {
        ids.push(op);
        if (offline) throw new Error("offline");
        return { document, revision: 1, conflict: false };
    });
    f.queue.change(coloured(f.initial));
    await f.queue.flush();
    assert.equal(f.stored.size, 1);
    assert.match(f.statuses.at(-1) ?? "", /waiting to sync/);
    offline = false;
    await f.queue.flush();
    assert.equal(ids[0], ids[1]);
    assert.equal(f.stored.size, 0);
    await f.queue.leave();
});
test("conflict copy identity carries into subsequent queued edits", async () => {
    let release: () => void = () => {};
    const waiting = new Promise<void>((resolve) => {
        release = resolve;
    });
    const copy = crypto.randomUUID();
    const ids: string[] = [];
    const f = fixture(async (document) => {
        ids.push(document.id);
        if (ids.length === 1) await waiting;
        return {
            document: { ...document, id: copy },
            revision: ids.length,
            conflict: ids.length === 1,
        };
    });
    f.queue.change(coloured(f.initial));
    const sending = f.queue.flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
    f.queue.change(coloured(f.initial, "#abcdef"));
    release();
    await sending;
    assert.deepEqual(ids, [f.initial.id, copy]);
    assert.equal(f.stored.size, 0);
    assert.match(f.statuses.at(-1) ?? "", /Both versions/);
    await f.queue.leave();
});
test("untouched sheets and unchanged document settings do not create saves", async () => {
    let calls = 0;
    const f = fixture(async (document) => {
        calls++;
        return { document, revision: 1, conflict: false };
    });
    f.queue.change(f.initial);
    f.queue.change({ ...f.initial, title: "Blank" });
    await f.queue.flush();
    assert.equal(calls, 0);
    await f.queue.leave();
});
test("recovered work retries the original operation after a lost acknowledgement", async () => {
    const p = coloured(blank());
    const operation_id = crypto.randomUUID();
    const seen: string[] = [];
    const f = fixture(
        async (document, _thumb, op) => {
            seen.push(op);
            return { document, revision: 3, conflict: false };
        },
        { document: p, revision: 2, operation_id, updated_at: new Date().toISOString() },
    );
    await f.queue.flush();
    assert.deepEqual(seen, [operation_id]);
    await f.queue.leave();
});

test("leaving is refused if neither device recovery nor server save succeeds", async () => {
    const initial = blank();
    let status = "";
    const queue = paintingAutosave({
        initial,
        repository: {
            revision: 0,
            async keep() {
                throw new Error("quota");
            },
            async forget() {},
            async save() {
                throw new Error("offline");
            },
        },
        thumbnail: async () => "preview",
        status: (text) => {
            status = text;
        },
        identity: () => {},
        delay: 60000,
    });
    queue.change(coloured(initial));
    assert.equal(await queue.leave(), false);
    assert.match(status, /Not saved/);
});
