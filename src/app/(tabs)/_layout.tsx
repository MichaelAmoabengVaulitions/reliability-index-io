import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(tabBarProps) => <TabBar {...tabBarProps} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="breakdown" />
      <Tabs.Screen name="cashflow" />
      <Tabs.Screen name="transactions" />
    </Tabs>
  );
}
