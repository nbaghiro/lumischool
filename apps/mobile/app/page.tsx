import { Stack, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { WebHost } from "../web-host";

/** A page of the grown-ups' app that has no tab, such as Games or the account, opened from More. */
export default function Page(): ReactNode {
    const { to, title } = useLocalSearchParams<{ to?: string; title?: string }>();
    const path = to !== undefined && to.startsWith("/") && !to.startsWith("//") ? to : "/";
    return (
        <>
            <Stack.Screen options={{ title: title ?? "" }} />
            <WebHost
                opening={`Opening ${(title ?? "the page").toLowerCase() === "account" ? "your account" : (title ?? "the page")}`}
                path={path}
                as="adult"
                fullScreen={false}
                titled
            />
        </>
    );
}
