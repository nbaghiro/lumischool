import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
    tileArtifactVersion,
    tileNames,
    tileSourceHash,
    publishMapTiles,
    type TileRecipe,
} from "../map-tile-artifacts";

test("tile identity covers pixels and source drift, and publication retains older versions", () => {
    const root = mkdtempSync(join(tmpdir(), "map-artifact-test-"));
    try {
        const stage = join(root, "staging");
        const recipe: TileRecipe = {
            bounds: { x: 0, y: 0, w: 100, h: 50 },
            tileSize: 256,
            gutter: 2,
            levels: [{ level: 0, span: 100 }],
        };
        mkdirSync(join(stage, "0"), { recursive: true });
        mkdirSync(join(root, "node_modules/.cache"), { recursive: true });
        mkdirSync(join(root, "engine/ui"), { recursive: true });
        mkdirSync(join(root, "public/assets/map-tiles"), { recursive: true });
        writeFileSync(join(root, "source.ts"), "first recipe");
        const build = {
            sourceFingerprint: "fingerprint",
            sourceHash: tileSourceHash(root, ["source.ts"]),
            sourceFiles: ["source.ts"],
            renderer: "test",
        };
        for (const name of tileNames(recipe)) writeFileSync(join(stage, name), name);
        const first = publishMapTiles(root, stage, recipe, build);
        assert.equal(first, tileArtifactVersion(stage, recipe, build));
        assert.equal(first, publishMapTiles(root, stage, recipe, build));
        const image = "0/0-0-sea.png";
        const original = readFileSync(join(root, "public/assets/map-tiles", first, image), "utf8");
        writeFileSync(join(stage, image), "different encoded pixels");
        const second = publishMapTiles(root, stage, recipe, build);
        assert.notEqual(second, first);
        writeFileSync(join(root, "public/assets/map-tiles", second, image), "corrupted");
        assert.throws(
            () => publishMapTiles(root, stage, recipe, build),
            /Immutable tile collision/,
        );
        assert.equal(
            readFileSync(join(root, "public/assets/map-tiles", first, image), "utf8"),
            original,
        );
        writeFileSync(join(root, "source.ts"), "second recipe");
        const sourceHash = tileSourceHash(root, ["source.ts"]);
        assert.notEqual(sourceHash, build.sourceHash);
        assert.notEqual(tileArtifactVersion(stage, recipe, { ...build, sourceHash }), second);
        assert.throws(() => tileSourceHash(root, ["../outside.ts"]), /Invalid tile source path/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
