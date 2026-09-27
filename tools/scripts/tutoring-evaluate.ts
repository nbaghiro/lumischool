/** Explicit paid evaluation, never ordinary CI. No child records enter this runner. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { startTeaching, DEFAULT_TEACHING, authoredStep } from "../../engine/teaching";
import { TEACHING_MATERIALS } from "../../school/tutoring-materials";
import { tutorConfig, tutorStep, tutorAudio } from "../../server/gemini-tutoring";
import { TUTOR_PROMPT_VERSION } from "../../school/assistant/tutoring";
const config = tutorConfig(process.env);
if (!config.key) throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY in the server environment.");
const mode = process.argv.includes("--live")
    ? "live"
    : process.argv.includes("--smoke")
      ? "smoke"
      : null;
if (!mode)
    throw new Error(
        "Choose --smoke (one text and speech call) or --live (60 cases × 3 repetitions).",
    );
const dir = process.env.TUTOR_REPORT_DIR ?? "/tmp/lumischool-tutoring-evaluation";
mkdirSync(dir, { recursive: true });
const results: unknown[] = [];
for (const material of mode === "smoke" ? TEACHING_MATERIALS.slice(0, 1) : TEACHING_MATERIALS) {
    for (let i = 0; i < (mode === "smoke" ? 1 : 20); i++) {
        const frame = material.frames[i % material.frames.length];
        if (!frame) continue;
        const base = {
            ...startTeaching(material),
            step: authoredStep(frame),
            mistakes: i % 4,
            assisted: i % 3 === 0,
        };
        for (let repetition = 0; repetition < (mode === "smoke" ? 1 : 3); repetition++) {
            const begin = Date.now();
            const result = await tutorStep(config, material, base, {
                ...DEFAULT_TEACHING,
                adaptive: true,
            });
            results.push({
                material: material.id,
                frame: frame.id,
                repetition,
                prompt: TUTOR_PROMPT_VERSION,
                latency: Date.now() - begin,
                model: result.model,
                origin: result.step.origin,
                caption: result.step.caption,
                problem: result.problem,
                reason: result.step.reason,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                review: { accurate: null, helpful: null, appropriate: null },
            });
        }
    }
}
if (mode === "smoke") {
    const audio = await tutorAudio(config, "Eight and two make ten.", "bird");
    if (audio) writeFileSync(join(dir, "narration.wav"), audio);
    results.push({ speech: audio ? "generated; listen and verify transcript" : "unavailable" });
}
writeFileSync(
    join(dir, "results.json"),
    JSON.stringify({ at: new Date().toISOString(), mode, results }, null, 2),
);
process.stdout.write(
    `Wrote ${results.length} results to ${dir}. Human review is still required.\n`,
);
