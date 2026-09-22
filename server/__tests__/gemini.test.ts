import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { improveFeedback } from "../../school/assistant/envelope";
import { geminiConfigFrom, improveWithGemini } from "../gemini";

describe("Gemini authoring", () => {
    it("requires a local key and keeps the model configurable", () => {
        assert.deepEqual(geminiConfigFrom({}), {
            problem: "GEMINI_API_KEY is required for Gemini authoring",
        });
        assert.deepEqual(geminiConfigFrom({ GEMINI_API_KEY: "key", GEMINI_MODEL: "test-model" }), {
            key: "key",
            model: "test-model",
        });
    });

    it("sends only the closed authoring envelope and returns untrusted notation", async () => {
        const requests: Request[] = [];
        const fetcher: typeof fetch = async (input, init) => {
            requests.push(new Request(input, init));
            return new Response(
                JSON.stringify({
                    candidates: [
                        { content: { parts: [{ text: '{"source":"item add.one {}"}' }] } },
                    ],
                }),
            );
        };
        const result = await improveWithGemini(
            { key: "key", model: "test-model" },
            improveFeedback("items/add.lumi", "item add.one {}", ["rule is too broad"]),
            fetcher,
        );
        assert.deepEqual(result, { source: "item add.one {}" });
        const request = requests[0];
        assert.ok(request);
        assert.equal(request.url.includes("test-model"), true);
        assert.match(await request.text(), /items\/add\.lumi/);
    });

    it("rejects a provider response that is not the expected JSON", async () => {
        const result = await improveWithGemini(
            { key: "key", model: "test-model" },
            improveFeedback("items/add.lumi", "item add.one {}", []),
            async () => new Response(JSON.stringify({ candidates: [] })),
        );
        assert.deepEqual(result, { problem: "Gemini returned no text" });
    });
});
