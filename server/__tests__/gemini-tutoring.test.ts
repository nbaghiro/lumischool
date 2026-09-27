import { test } from "node:test";
import assert from "node:assert/strict";
import { geminiInteraction, tutorConfig, tutorStep } from "../gemini-tutoring";
import { DEFAULT_TEACHING, startTeaching, teachingObject } from "../../engine/teaching";
import { TEACHING_MATERIALS } from "../../school/tutoring-materials";
const config = tutorConfig({ GEMINI_API_KEY: "fictional-test-key", TUTORING_ENABLED: "1" });
test("Gemini receives a stateless, bounded request with a server-only key header", async () => {
    const fetcher: typeof fetch = async (url, init) => {
        assert.equal(
            (typeof url === "string" ? url : url instanceof URL ? url.href : url.url).includes(
                config.key,
            ),
            false,
        );
        assert.equal(new Headers(init?.headers).get("x-goog-api-key"), config.key);
        assert.equal(typeof init?.body, "string");
        const body: unknown = JSON.parse(typeof init?.body === "string" ? init.body : "null");
        assert.ok(teachingObject(body));
        assert.equal(body.store, false);
        return Response.json({
            status: "completed",
            outputs: [{ type: "text", text: '{"ok":true}' }],
            usage: { total_input_tokens: 12, total_output_tokens: 4 },
        });
    };
    const out = await geminiInteraction(config, { example: 1 }, "Teach", {}, fetcher);
    assert.deepEqual(out.output, { ok: true });
    assert.equal(out.inputTokens, 12);
});
test("missing credentials and rejected model content fall back to the exact authored step", async () => {
    assert.equal((await geminiInteraction(tutorConfig({}), {}, "", {})).problem, "missing-key");
    const material = TEACHING_MATERIALS[0];
    assert.ok(material);
    const state = startTeaching(material);
    let calls = 0;
    const fetcher: typeof fetch = async () => {
        calls++;
        return Response.json({
            outputs: [{ type: "text", text: '{"frameId":"skip-all-checks"}' }],
        });
    };
    const result = await tutorStep(config, material, state, DEFAULT_TEACHING, fetcher);
    assert.equal(calls, 2);
    assert.equal(result.step.caption, state.step.caption);
    assert.equal(result.step.origin, "authored");
});
test("provider failure does not become a rendered model response", async () => {
    const fetcher: typeof fetch = async () => new Response("failure", { status: 401 });
    const result = await geminiInteraction(config, {}, "", {}, fetcher);
    assert.equal(result.output, null);
    assert.equal(result.problem, "http-401");
});
