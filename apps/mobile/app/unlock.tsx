import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import * as api from "../api";
import { Boxes, Button, Form, Link, Say } from "../form";
import { said, settled } from "../mode";
import { AuthPage, GROWN_FOOT, Postcard } from "../postcard";

/**
 * The parent PIN, asked for when the grown-up's session was put away by a children's view, as the
 * web's sign-in page asks for it (apps/home/sign-in.tsx, `ParentUnlock`).
 */
export default function Unlock(): ReactNode {
    const [pin, setPin] = useState("");
    const [problem, setProblem] = useState("");
    const [busy, setBusy] = useState(false);

    const unlock = async (digits: string): Promise<void> => {
        if (busy) return;
        setBusy(true);
        const r = await api.unlock(digits);
        setBusy(false);
        setPin("");
        if (r.ok) {
            router.back();
            return;
        }
        if (r.problem.error !== "put-away" && settled(r.problem)) return;
        setProblem(
            r.problem.error === "no-pin"
                ? "No adult PIN is set. Sign in by email to continue."
                : said(r.problem),
        );
    };

    return (
        <AuthPage map="unlock" who={null} foot={GROWN_FOOT}>
            <Postcard
                kicker="For grown-ups"
                title="Unlock parent access"
                lead="Type the parent PIN. The children’s views stay open."
            >
                <Form>
                    <Boxes
                        count={4}
                        label="Parent PIN"
                        value={pin}
                        onChange={setPin}
                        onFull={(digits) => void unlock(digits)}
                    />
                    <Button
                        label="Unlock parent access"
                        form
                        busy={busy}
                        onPress={() => void unlock(pin)}
                    />
                    {problem === "" ? null : <Say text={problem} />}
                </Form>
                <Link label="Sign in by email instead" onPress={() => router.replace("/sign-in")} />
            </Postcard>
        </AuthPage>
    );
}
