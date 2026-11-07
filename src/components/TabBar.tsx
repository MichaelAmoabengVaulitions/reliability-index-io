import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors, fontSizes, layout } from '@/theme';

import { AppText } from './AppText';
import { tabIconPaths } from './tabIcons';

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigateToTab: (routeKey: string) => void;
}

const tabLabels: Record<string, string> = {
  index: 'Score',
  breakdown: 'Breakdown',
  cashflow: 'Cashflow',
  transactions: 'Transactions',
};

export function TabBar({ state, navigateToTab }: TabBarProps) {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const bottomSpace = Math.max(bottomInset, layout.tabBarMinimumBottomSpace);

  return (
    <View style={[styles.bar, { height: layout.tabBarContentHeight + bottomSpace }]}>
      {state.routes.map((route, position) => {
        const isActive = position === state.index;
        const inkColor = isActive ? colors.tabSelected : colors.secondaryText;
        const label = tabLabels[route.name];

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            onPress={() => navigateToTab(route.key)}
            style={styles.tab}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill={inkColor}>
              <Path d={tabIconPaths[route.name]} />
            </Svg>
            <AppText
              size={fontSizes.tabLabel}
              weight={isActive ? 'medium' : 'regular'}
              color={inkColor}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  tab: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
