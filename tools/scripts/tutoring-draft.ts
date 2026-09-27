/** Drafts stay outside the shipped material list until reviewed by an adult. */
import { writeFileSync } from "node:fs";
import { readTeachingMaterial } from "../../engine/teaching";
import { teachingMaterial } from "../../school/tutoring-materials";
import { geminiInteraction, tutorConfig } from "../../server/gemini-tutoring";
const source = teachingMaterial(process.argv[2] ?? "");
if (!source)
    throw new Error("Choose making-ten, reading-clues or food-chains as the grounded source.");
const output = process.argv[3];
if (!output || !output.startsWith("/tmp/"))
    throw new Error(
        "Supply a review artifact path under /tmp; drafts are never published directly.",
    );
const config = tutorConfig(process.env);
if (!config.key) throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY.");
const result = await geminiInteraction(
    { ...config, model: process.env.GEMINI_AUTHOR_MODEL ?? config.model },
    {
        source,
        instruction:
            "Draft alternative short captions. Preserve all facts, questions, answers, references, visuals and phases exactly.",
    },
    "Return one teaching material JSON object based strictly on the provided source. Do not invent facts or change the curriculum.",
    {
        type: "object",
        properties: {
            schema: { type: "integer" },
            id: { type: "string" },
            version: { type: "string" },
            title: { type: "string" },
            skill: { type: "string" },
            lessonIds: { type: "array", items: { type: "string" } },
            first: { type: "string" },
            frames: { type: "array", items: { type: "object" } },
        },
        required: ["schema", "id", "version", "title", "skill", "lessonIds", "first", "frames"],
    },
);
const material = readTeachingMaterial(result.output);
writeFileSync(
    output,
    JSON.stringify(
        {
            status: "needs-adult-review",
            validShape: !!material,
            model: result.model,
            problem: result.problem,
            draft: result.output,
        },
        null,
        2,
    ),
);
process.stdout.write(`Draft saved for review at ${output}. It has not been published.\n`);
