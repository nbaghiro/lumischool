import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import type { TextInput } from "react-native";
import * as api from "../api";
import { Button, detectedZone, Field, Form, Note, Say, TimeZone, wrongEmail } from "../form";
import { askedFor, finishSignIn, said, settled, signInAsked } from "../mode";
import { AuthPage, GROWN_FOOT, Postcard, Ps } from "../postcard";

const NAMES =
    "Your name is what your family calls you. Your family's name is such as the Okafors, and only your family sees it.";

interface Wrong {
    name?: string;
    family?: string;
    email?: string;
}

const wrongName = (name: string, what: "your" | "family"): string | undefined => {
    if (name === "")
        return what === "your" ? "Type what your family calls you." : "Type your family's name.";
    if (name.length > 80)
        return what === "your"
            ? "Use up to 80 characters for your name."
            : "Use up to 80 characters for your family’s name.";
    return undefined;
};

/**
 * Starts a family: before the code, with the address the code goes to; after a code whose address
 * has no family yet (`after=code`), with the answers alone.
 */
export default function Start(): ReactNode {
    const { after } = useLocalSearchParams<{ after?: string }>();
    const verified = after === "code";
    const [name, setName] = useState("");
    const [family, setFamily] = useState("");
    const [zone, setZone] = useState(detectedZone);
    const [email, setEmail] = useState("");
    const [wrong, setWrong] = useState<Wrong>({});
    const [problem, setProblem] = useState("");
    const [busy, setBusy] = useState(false);
    const inputs = {
        name: useRef<TextInput>(null),
        family: useRef<TextInput>(null),
        email: useRef<TextInput>(null),
    };

    const go = async (): Promise<void> => {
        if (busy) return;
        const start = { name: name.trim(), family: family.trim(), timeZone: zone };
        const address = email.trim();
        const problems: Wrong = {
            name: wrongName(start.name, "your"),
            family: wrongName(start.family, "family"),
            email: verified ? undefined : wrongEmail(address),
        };
        setWrong(problems);
        const first = (["name", "family", "email"] as const).find((k) => problems[k]);
        if (first !== undefined) {
            inputs[first].current?.focus();
            return;
        }
        setBusy(true);
        setProblem("");
        if (verified) {
            const asked = signInAsked();
            if (asked === null) {
                setBusy(false);
                router.replace("/sign-in");
                return;
            }
            const r = await api.chooseFamily(asked.challenge, { start });
            setBusy(false);
            if (r.ok) await finishSignIn(r.value);
            else if (!settled(r.problem)) setProblem(said(r.problem));
            return;
        }
        const r = await api.startEmail(address, { start });
        setBusy(false);
        if (!r.ok) {
            if (r.problem.error === "bad-email") {
                setWrong({ email: said(r.problem) });
                inputs.email.current?.focus();
            } else setProblem(said(r.problem));
            return;
        }
        askedFor({ email: address, challenge: r.value, start, shared: false, families: [] });
        router.push("/code");
    };

    const names = (
        <>
            <Field
                label="Your name"
                inputRef={inputs.name}
                value={name}
                onChangeText={setName}
                error={wrong.name}
                maxLength={80}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={() => inputs.family.current?.focus()}
            />
            <Field
                label="Your family's name"
                inputRef={inputs.family}
                value={family}
                onChangeText={setFamily}
                error={wrong.family}
                maxLength={80}
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType={verified ? "done" : "next"}
                onSubmitEditing={() => (verified ? void go() : inputs.email.current?.focus())}
            />
        </>
    );

    if (verified)
        return (
            <AuthPage map="none" who="grown-ups" foot={GROWN_FOOT}>
                <Postcard
                    kicker="Signed in"
                    title="Start a family"
                    lead="This address has no family yet. Tell us what to call yours."
                    stamp="stamp-start"
                    address={
                        <Form>
                            {names}
                            <TimeZone value={zone} onChange={setZone} />
                            {problem === "" ? null : <Say text={problem} />}
                            <Button
                                label={busy ? "Starting the family" : "Start the family"}
                                wide
                                form
                                busy={busy}
                                onPress={() => void go()}
                            />
                        </Form>
                    }
                >
                    <Ps>{NAMES}</Ps>
                </Postcard>
            </AuthPage>
        );

    return (
        <AuthPage map="start" who={null} foot={GROWN_FOOT}>
            <Postcard
                kicker="Start a family"
                title="Start your family"
                lead="We send a code to your email to check it is yours."
                stamp="stamp-start"
                links={
                    <Note
                        text="Already have a family?"
                        link={{
                            label: "Sign in",
                            onPress: () =>
                                router.canGoBack() ? router.back() : router.replace("/sign-in"),
                        }}
                    />
                }
                address={
                    <Form>
                        {names}
                        <Field
                            label="Your email address"
                            inputRef={inputs.email}
                            value={email}
                            onChangeText={setEmail}
                            error={wrong.email}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            returnKeyType="send"
                            onSubmitEditing={() => void go()}
                        />
                        <TimeZone value={zone} onChange={setZone} />
                        {problem === "" ? null : <Say text={problem} />}
                        <Button
                            label={busy ? "Sending the code" : "Send me a code"}
                            wide
                            form
                            busy={busy}
                            onPress={() => void go()}
                        />
                    </Form>
                }
            >
                <Ps>{NAMES}</Ps>
            </Postcard>
        </AuthPage>
    );
}
