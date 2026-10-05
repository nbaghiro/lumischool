import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TextInput } from "react-native";
import * as api from "../api";
import { Acts, Boxes, Button, Form, Link, Say } from "../form";
import { askedFor, finishSignIn, said, signInAsked } from "../mode";
import { AuthPage, GROWN_FOOT, Postcard, To } from "../postcard";

interface Said {
    text: string;
    calm: boolean;
    /** The code has run out, so the line offers a new one. */
    again: boolean;
}

export default function Code(): ReactNode {
    const [code, setCode] = useState("");
    const [line, setLine] = useState<Said | null>(null);
    const [wrong, setWrong] = useState(false);
    const [busy, setBusy] = useState(false);
    const input = useRef<TextInput>(null);
    const asked = signInAsked();

    // the step is the code, so the boxes take the keyboard as it opens, as the web's take focus
    useEffect(() => input.current?.focus(), []);

    const verify = async (digits: string): Promise<void> => {
        if (busy) return;
        if (asked === null) {
            router.replace("/sign-in");
            return;
        }
        if (digits.length < 8) {
            setLine({
                text: "The code has eight digits. Type all eight.",
                calm: false,
                again: false,
            });
            input.current?.focus();
            return;
        }
        setBusy(true);
        setLine(null);
        const r = await api.verifyCode(asked.challenge, digits);
        setBusy(false);
        if (!r.ok) {
            const e = r.problem.error;
            const over = e === "dead-code" || e === "expired" || e === "no-pending";
            setWrong(e === "wrong-code");
            setLine({ text: said(r.problem), calm: false, again: over });
            return;
        }
        const v = r.value;
        if (v.kind === "in") await finishSignIn(v.signedIn);
        else if (v.kind === "choose") {
            askedFor({ ...asked, families: v.families });
            router.push("/choose");
        } else router.push({ pathname: "/start", params: { after: "code" } });
    };

    const again = async (): Promise<void> => {
        if (asked === null || busy) return;
        setBusy(true);
        const r = await api.startEmail(
            asked.email,
            asked.start === null ? { shared: asked.shared } : { start: asked.start },
        );
        setBusy(false);
        if (!r.ok) {
            setLine({ text: said(r.problem), calm: false, again: false });
            return;
        }
        askedFor({ ...asked, challenge: r.value });
        setCode("");
        setWrong(false);
        setLine({
            text: `We sent a new code to ${asked.email}. Use the newest code.`,
            calm: true,
            again: false,
        });
        input.current?.focus();
    };

    const email = asked?.email ?? "";
    const starting = asked !== null && asked.start !== null;

    return (
        <AuthPage map="code" who={starting ? null : "grown-ups"} foot={GROWN_FOOT}>
            <Postcard
                kicker="Check your email"
                title="Type the code"
                lead={`We sent an 8-digit code to ${email}. It works for ten minutes, once.`}
                stamp="stamp-code"
                links={
                    <Acts>
                        <Link label="Send the code again" onPress={() => void again()} />
                        <Link label="Use a different address" onPress={() => router.back()} />
                    </Acts>
                }
                address={
                    <Form>
                        <To who={email} />
                        <Boxes
                            count={8}
                            code
                            label="The 8-digit code"
                            inputRef={input}
                            value={code}
                            wrong={wrong}
                            onChange={(digits) => {
                                setCode(digits);
                                setWrong(false);
                            }}
                            onFull={(digits) => void verify(digits)}
                        />
                        {line === null ? null : (
                            <Say
                                text={line.text}
                                tone={line.calm ? "info" : "error"}
                                action={
                                    line.again
                                        ? { label: "Send a new code", run: () => void again() }
                                        : undefined
                                }
                            />
                        )}
                        <Button
                            label={
                                busy
                                    ? "Checking the code"
                                    : starting
                                      ? "Start the family"
                                      : "Sign in"
                            }
                            wide
                            form
                            busy={busy}
                            onPress={() => void verify(code)}
                        />
                    </Form>
                }
            />
        </AuthPage>
    );
}
