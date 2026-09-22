import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { resendTransport, type Email } from "../email";

// Whether resendTransport's caller can pass a fourth field is a type question, not a runtime one:
// Email is Omit<Sent, "at">, and this fails to typecheck if a field is ever added to one without the
// other. The pattern is server/db/__tests__/schema.test.ts's.
type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
export type EmailIsExactlyToSubjectAndText = Expect<
    Equal<Email, { to: string; subject: string; text: string }>
>;

describe("the Resend transport", () => {
    const original = globalThis.fetch;
    after(() => {
        globalThis.fetch = original;
    });

    it("posts from, to, subject and text as JSON, with the key as a bearer token", async () => {
        const calls: { url: string; method: string; headers: Headers; body: string }[] = [];
        const stub: typeof fetch = async (input, init) => {
            calls.push({
                url:
                    typeof input === "string"
                        ? input
                        : input instanceof URL
                          ? input.href
                          : input.url,
                method: init?.method ?? "GET",
                headers: new Headers(init?.headers),
                body: typeof init?.body === "string" ? init.body : "",
            });
            return new Response("", { status: 200 });
        };
        globalThis.fetch = stub;

        const send = resendTransport("re_test_key", "code@lumischool.example");
        await send({ to: "anna@example.com", subject: "Your code", text: "1234 5678" });

        assert.equal(calls.length, 1);
        const call = calls[0];
        assert.ok(call);
        assert.equal(call.url, "https://api.resend.com/emails");
        assert.equal(call.method, "POST");
        assert.equal(call.headers.get("authorization"), "Bearer re_test_key");
        assert.equal(call.headers.get("content-type"), "application/json");
        assert.deepEqual(JSON.parse(call.body), {
            from: "code@lumischool.example",
            to: "anna@example.com",
            subject: "Your code",
            text: "1234 5678",
        });
    });

    it("throws with the status and Resend's response text on anything but 2xx", async () => {
        globalThis.fetch = async () => new Response("no such sending domain", { status: 422 });

        const send = resendTransport("re_test_key", "code@lumischool.example");
        await assert.rejects(
            () => send({ to: "anna@example.com", subject: "Your code", text: "1234 5678" }),
            (error: unknown) => {
                assert.ok(error instanceof Error);
                assert.match(error.message, /422/);
                assert.match(error.message, /no such sending domain/);
                return true;
            },
        );
    });

    it("takes only to, subject and text: there is nowhere for a child's name to go", async () => {
        globalThis.fetch = async () => new Response("", { status: 200 });
        const send = resendTransport("re_test_key", "code@lumischool.example");
        const email: Email = { to: "anna@example.com", subject: "Your code", text: "1234 5678" };
        await send(email);
        assert.deepEqual(Object.keys(email).sort(), ["subject", "text", "to"]);
    });
});
