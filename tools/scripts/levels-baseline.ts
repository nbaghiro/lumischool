// Writes what every lesson as written asks, which engine/notation/__tests__/levels.test.ts compares
// the corpus against. Run it only for a change meant to alter a lesson as written, such as a fix to a
// wrong key, and say so in the change; adding or editing a level never needs it.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { mediumBaseline } from "../../engine/notation/lessons";
import { Workspace } from "../../engine/notation/notation";
import { curriculum } from "../pack";

const ws = new Workspace(curriculum());
const baseline = mediumBaseline(ws);
const file = fileURLToPath(
    new URL("../../engine/notation/__tests__/levels-baseline.json", import.meta.url),
);
// written as Prettier keeps it, so the format check passes over a file nobody edits by hand
const text = await format(JSON.stringify(baseline), {
    ...(await resolveConfig(file)),
    filepath: file,
});
writeFileSync(file, text);
process.stdout.write(
    `levels baseline: ${Object.keys(baseline.lessons).length} lessons, ${Object.keys(baseline.items).length} items, ${ws.errors} errors\n`,
);
