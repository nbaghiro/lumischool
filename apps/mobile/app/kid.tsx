import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import * as api from "../api";
import { Boxes, Button, Field, Form, Note, Say } from "../form";
import { enterChild } from "../mode";
import { AuthPage, KID_FOOT, Postcard, To } from "../postcard";
import { keep } from "../store";

const TRY_AGAIN =
    "Check your username and kids’ PIN, or ask a grown-up. After several tries, wait 15 minutes before trying again.";

/** A child signs in with the username and kids' PIN a grown-up set (engine/ui/kid-sign-in.tsx). */
export default function KidSignIn(): ReactNode {
    const [username, setUsername] = useState("");
    const [pin, setPin] = useState("");
    const [problem, setProblem] = useState("");
    const [busy, setBusy] = useState(false);

    const signIn = async (): Promise<void> => {
        if (busy) return;
        if (username.trim() === "" || pin.length !== 4) {
            setProblem("Type your username and four-digit kids’ PIN.");
            return;
        }
        setBusy(true);
        setProblem("");
        const r = await api.kidSignIn(username.trim(), pin);
        setBusy(false);
        if (!r.ok) {
            setPin("");
            setProblem(
                r.problem.error === "offline"
                    ? "This needs the internet. Try again when you are connected."
                    : (r.problem.problem ?? TRY_AGAIN),
            );
            return;
        }
        if (r.value.device !== null) await keep({ device: r.value.device });
        await enterChild(r.value.credential, []);
    };

    // the web's link here is /sign-in?shared=1: a grown-up signing in on a child's device
    const grownUps = (): void =>
        router.dismissTo({ pathname: "/sign-in", params: { shared: "1" } });

    return (
        <AuthPage map="kid" who="kids" foot={KID_FOOT}>
            <Postcard
                kicker="The children's view"
                title="Your learning page"
                lead="Type the username and kids’ PIN your grown-up gave you."
                stamp="stamp-kid"
                address={
                    <>
                        <To who="A grown-up in this family" />
                        <Button label="Grown-ups’ sign in" wide onPress={grownUps} />
                        <Note text="A grown-up can set up kids’ sign-in from the account page, or open a view for you." />
                    </>
                }
            >
                <Form>
                    <Field
                        label="Your username"
                        tight
                        value={username}
                        onChangeText={setUsername}
                        maxLength={32}
                        autoCapitalize="none"
                        autoComplete="off"
                        textContentType="none"
                        importantForAutofill="no"
                    />
                    <Note text="Your kids’ PIN" />
                    <Boxes count={4} label="Your kids’ PIN" value={pin} onChange={setPin} />
                    <Button label="Open my page" form busy={busy} onPress={() => void signIn()} />
                    {problem === "" ? null : <Say text={problem} />}
                </Form>
            </Postcard>
        </AuthPage>
    );
}
