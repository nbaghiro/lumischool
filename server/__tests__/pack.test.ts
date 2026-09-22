import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { loadPack, watchPack } from "../pack";

const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

/** A pack of no lessons written into `dir` under its own digest, made to differ by a lesson id, and named current. */
function writePack(dir: string, salt: string): string {
    const index = JSON.stringify({
        pack: 1,
        lessons: [
            {
                id: `l-${salt}`,
                source: "lessons/x.lumi",
                title: "X",
                goal: null,
                grade: 1,
                unit: 1,
                subject: "maths",
                format: "teach",
                art: [],
                file: `lessons/l-${salt}-0000000000.json`,
                levels: { medium: { hash: "0000000000" } },
                first: null,
                skills: [],
            },
        ],
    });
    const digest = sha256(index);
    mkdirSync(join(dir, digest, "lessons"), { recursive: true });
    writeFileSync(join(dir, digest, "index.json"), index);
    writeFileSync(join(dir, digest, `lessons/l-${salt}-0000000000.json`), "{}");
    writeFileSync(join(dir, "current"), `${digest}\n`);
    return digest;
}

test("the pack served follows `current` as it is rewritten, and stays when the new one cannot be read", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lumischool-pack-"));
    try {
        const first = writePack(dir, "a");
        const loaded = loadPack(dir);
        assert.ok(!("problem" in loaded) && loaded.digest === first);
        const served: string[] = [];
        const lines: string[] = [];
        const stop = watchPack(
            dir,
            (p) => served.push(p.digest),
            (l) => lines.push(l),
            50,
        );
        try {
            const second = writePack(dir, "b");
            await until(() => served.includes(second));
            assert.deepEqual(served, [second]);
            assert.match(lines.at(-1) ?? "", /now served/);
            // a `current` that names nothing keeps the pack being served
            writeFileSync(join(dir, "current"), "not-a-digest\n");
            await until(() => lines.some((l) => /cannot be read/.test(l)));
            assert.deepEqual(served, [second]);
            // the same pack named again is not served again
            writeFileSync(join(dir, "current"), `${second}\n`);
            await new Promise((ok) => setTimeout(ok, 400));
            assert.deepEqual(served, [second]);
        } finally {
            stop();
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

async function until(ok: () => boolean, ms = 20_000): Promise<void> {
    const end = Date.now() + ms;
    while (!ok()) {
        if (Date.now() > end) throw new Error("the watcher did not answer in time");
        await new Promise((done) => setTimeout(done, 25));
    }
}
