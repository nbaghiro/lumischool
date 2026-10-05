import { useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { WebHost } from "../../web-host";

export default function Lessons(): ReactNode {
    const { to } = useLocalSearchParams<{ to?: string }>();
    const path = to !== undefined && to.startsWith("/explore") ? to : "/explore";
    return (
        <WebHost opening="Opening the lessons" path={path} as="adult" fullScreen={false} titled />
    );
}
