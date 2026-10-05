import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TextInput } from "react-native";
import * as api from "../api";
import { Button, Check, Field, Form, Note, Say, wrongEmail } from "../form";
import { askedFor, said, useMode } from "../mode";
import { AuthPage, GROWN_FOOT, Postcard } from "../postcard";

/**
 * Signing in, the app's first screen while nobody is signed in, and again with `fresh=1` before a step
 * that needs a sign-in from the last few minutes. `shared=1` comes from the children's card.
 */
export default function SignIn(): ReactNode {
    const { fresh, shared: sharedParam } = useLocalSearchParams<{
        fresh?: string;
        shared?: string;
    }>();
    const again = fresh === "1";
    const signedOut = useMode().kind === "signed-out";
    const [email, setEmail] = useState("");
    const [shared, setShared] = useState(sharedParam === "1");
    const [wrong, setWrong] = useState<string | undefined>(undefined);
    const [problem, setProblem] = useState("");
    const [busy, setBusy] = useState(false);
    const input = useRef<TextInput>(null);

    useEffect(() => {
        if (sharedParam === "1") setShared(true);
    }, [sharedParam]);

    useEffect(() => {
        if (!again) return;
        void api.me().then((r) => {
            if (r.ok) setEmail(r.value.email);
        });
    }, [again]);

    const ask = async (): Promise<void> => {
        if (busy) return;
        const address = email.trim();
        const bad = wrongEmail(address);
        setWrong(bad);
        if (bad !== undefined) {
            input.current?.focus();
            return;
        }
        setBusy(true);
        setProblem("");
        const r = await api.startEmail(address, { shared });
        setBusy(false);
        if (!r.ok) {
            if (r.problem.error === "bad-email") {
                setWrong(said(r.problem));
                input.current?.focus();
            } else setProblem(said(r.problem));
            return;
        }
        askedFor({ email: address, challenge: r.value, start: null, shared, families: [] });
        router.push("/code");
    };

    return (
        <AuthPage map="sign-in" who={signedOut ? "grown-ups" : null} foot={GROWN_FOOT}>
            <Postcard
                kicker="For grown-ups"
                title={again ? "Sign in again" : "Sign in"}
                lead={
                    again
                        ? "This needs a sign-in from the last few minutes. We send a new code to your email."
                        : "We send a code to your email. There is no password."
                }
                stamp="stamp-sign-in"
                links={
                    signedOut ? (
                        <Note
                            text="New here?"
                            link={{ label: "Start a family", onPress: () => router.push("/start") }}
                        />
                    ) : undefined
                }
                address={
                    <Form>
                        <Field
                            label="Your email address"
                            inputRef={input}
                            value={email}
                            onChangeText={setEmail}
                            error={wrong}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            returnKeyType="send"
                            onSubmitEditing={() => void ask()}
                        />
                        <Check
                            label="This is a shared device, such as the family's computer"
                            checked={shared}
                            onChange={setShared}
                        />
                        {problem === "" ? null : <Say text={problem} />}
                        <Button
                            label={busy ? "Sending the code" : "Send me a code"}
                            wide
                            form
                            busy={busy}
                            onPress={() => void ask()}
                        />
                    </Form>
                }
            />
        </AuthPage>
    );
}
