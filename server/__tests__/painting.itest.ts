import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { closeApp, open, withFamily } from "../db/client";
import { artworks, paintingSaves } from "../db/schema";
import type { PaintingSave } from "../api";
import { deleteKid, exportFamily } from "../db/events";
import { prepare } from "../db/__tests__/test-db";
import { Browser, local, startFamily, addKid, openView } from "./browser";
import { validPaintingSave } from "../painting";

const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});
const input = (): PaintingSave => ({
    scope: { kid_id: null },
    document: {
        version: 1,
        id: randomUUID(),
        title: "My sky",
        painting: { k: "painting", w: 30, h: 20, paper: "plain", marks: [] },
        activity: "draw",
        idea: "night",
        fills: {},
        step: 0,
        guides: false,
    },
    expected_revision: 0,
    operation_id: randomUUID(),
    thumbnail: "data:image/png;base64,iVBORw0KGgo=",
});

describe("private editable paintings", { skip: reason ?? false }, () => {
    it("saves, replays, preserves concurrent copies, isolates families, exports and deletes", async () => {
        const { config, outbox } = local();
        const a = new Browser(config),
            b = new Browser(config);
        const who = await startFamily(a, outbox, {
            email: "paint-a@example.test",
            name: "A",
            family: "A",
        });
        const other = await startFamily(b, outbox, {
            email: "paint-b@example.test",
            name: "B",
            family: "B",
        });
        const first = input();
        assert.equal(validPaintingSave(first), true);
        assert.equal((await new Browser(config).call("GET", "/api/paintings")).status, 401);
        assert.equal(
            (
                await a.call("POST", "/api/paintings/save", {
                    body: { ...first, thumbnail: "data:image/svg+xml,<svg/>" },
                })
            ).status,
            400,
        );
        const saved = await a.call("POST", "/api/paintings/save", { body: first });
        assert.equal(saved.status, 200);
        assert.deepEqual(
            (await a.call("POST", "/api/paintings/save", { body: first })).body,
            saved.body,
        );
        assert.equal((await b.call("GET", `/api/paintings/${first.document.id}`)).status, 404);
        assert.deepEqual((await b.call("GET", "/api/paintings")).body, {
            artworks: [],
            next: null,
        });
        assert.equal(
            (
                await a.call("POST", "/api/paintings/save", {
                    body: { ...first, scope: { kid_id: randomUUID() }, operation_id: randomUUID() },
                })
            ).status,
            404,
        );
        const edited = {
            ...first,
            document: { ...first.document, title: "Later sky" },
            operation_id: randomUUID(),
            expected_revision: 1,
        };
        assert.equal((await a.call("POST", "/api/paintings/save", { body: edited })).status, 200);
        const stale = {
            ...first,
            document: { ...first.document, title: "Other device" },
            operation_id: randomUUID(),
            expected_revision: 1,
        };
        const copy = await a.call("POST", "/api/paintings/save", { body: stale });
        assert.equal(copy.status, 200);
        assert.deepEqual(
            (await a.call("POST", "/api/paintings/save", { body: stale })).body,
            copy.body,
        );
        const rows = await withFamily({ family: who.family, user: who.user }, (tx) =>
            tx.select().from(artworks),
        );
        assert.equal(rows.length, 2);
        assert.equal(rows.find((r) => r.id === first.document.id)?.title, "Later sky");
        assert.equal(rows.find((r) => r.id !== first.document.id)?.title, "Other device");
        assert.equal(
            (
                await withFamily({ family: other.family, user: other.user }, (tx) =>
                    tx.select().from(artworks),
                )
            ).length,
            0,
        );
        const exported = await withFamily({ family: who.family, user: who.user }, (tx) =>
            exportFamily(tx, who.family),
        );
        assert.equal(exported?.paintings.length, 2);
        assert.equal(
            (
                await a.call("POST", "/api/paintings/delete", {
                    body: { id: first.document.id, revision: 1 },
                })
            ).status,
            409,
        );
        assert.equal(
            (
                await a.call("POST", "/api/paintings/delete", {
                    body: { id: first.document.id, revision: 2 },
                })
            ).status,
            200,
        );
        assert.equal((await a.call("GET", `/api/paintings/${first.document.id}`)).status, 404);
        assert.equal((await a.call("POST", "/api/paintings/save", { body: first })).status, 409);
        assert.equal(
            (
                await withFamily({ family: who.family, user: who.user }, (tx) =>
                    tx.select().from(paintingSaves),
                )
            ).filter((row) => row.artwork_id === first.document.id).length,
            0,
        );
    });
    it("keeps child galleries separate and cascades child deletion", async () => {
        const { config, outbox } = local();
        const a = new Browser(config);
        const who = await startFamily(a, outbox, {
            email: "paint-child@example.test",
            name: "A",
            family: "Child pictures",
        });
        const kid = await addKid(a, "Painter", 1);
        const other = await addKid(a, "Sibling", 1);
        const first = { ...input(), scope: { kid_id: kid } };
        assert.equal((await a.call("POST", "/api/paintings/save", { body: first })).status, 200);
        assert.deepEqual((await a.call("GET", `/api/paintings?kid_id=${other}`)).body, {
            artworks: [],
            next: null,
        });
        assert.deepEqual((await a.call("GET", "/api/paintings")).body, {
            artworks: [],
            next: null,
        });
        await withFamily({ family: who.family, user: who.user }, (tx) => deleteKid(tx, kid));
        assert.equal((await a.call("GET", `/api/paintings/${first.document.id}`)).status, 404);
        assert.equal(
            (
                await withFamily({ family: who.family, user: who.user }, (tx) =>
                    tx.select().from(paintingSaves),
                )
            ).length,
            0,
        );
        await openView(a, [other]);
        assert.equal((await a.call("GET", "/api/paintings")).status, 401);
    });
    it("paginates thumbnails without documents and bounds replay snapshots", async () => {
        const { config, outbox } = local();
        const a = new Browser(config);
        const who = await startFamily(a, outbox, {
            email: "paint-pages@example.test",
            name: "A",
            family: "Many pictures",
        });
        const first = input();
        for (let revision = 0; revision < 22; revision++) {
            assert.equal(
                (
                    await a.call("POST", "/api/paintings/save", {
                        body: { ...first, operation_id: randomUUID(), expected_revision: revision },
                    })
                ).status,
                200,
            );
        }
        assert.equal(
            (
                await withFamily({ family: who.family, user: who.user }, (tx) =>
                    tx.select().from(paintingSaves),
                )
            ).length,
            20,
        );
        for (let n = 0; n < 24; n++)
            assert.equal(
                (await a.call("POST", "/api/paintings/save", { body: input() })).status,
                200,
            );
        const page = await a.call("GET", "/api/paintings");
        assert.equal(page.status, 200);
        const body = page.body;
        if (
            !body ||
            typeof body !== "object" ||
            !("artworks" in body) ||
            !Array.isArray(body.artworks) ||
            !("next" in body) ||
            typeof body.next !== "string"
        )
            throw new Error("Missing gallery page");
        assert.equal(body.artworks.length, 24);
        assert.equal(JSON.stringify(body.artworks).includes('"document"'), false);
        const next = await a.call("GET", `/api/paintings?before=${encodeURIComponent(body.next)}`);
        const second = next.body;
        if (
            !second ||
            typeof second !== "object" ||
            !("artworks" in second) ||
            !Array.isArray(second.artworks) ||
            !("next" in second)
        )
            throw new Error("Missing next page");
        assert.equal(second.artworks.length, 1);
        assert.equal(second.next, null);
    });
});
