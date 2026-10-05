import { Tabs } from "expo-router";
import type { ReactNode } from "react";
import { TabBar, TabHeader } from "../../tabs";
import { COLOR } from "../../ui";

export default function ParentTabs(): ReactNode {
    return (
        <Tabs
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{
                header: (props) => <TabHeader {...props} />,
                sceneStyle: { backgroundColor: COLOR.paper },
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="lessons" options={{ title: "Lessons" }} />
            <Tabs.Screen name="map" options={{ title: "Map" }} />
            <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
            <Tabs.Screen name="games" options={{ title: "Games" }} />
            <Tabs.Screen name="painting" options={{ title: "Painting" }} />
        </Tabs>
    );
}
