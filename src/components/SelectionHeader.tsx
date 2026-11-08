import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { describeScoringWindow } from '@/domain/scoringWindow';
import { useSelection } from '@/selection/SelectionContext';
import { fontSizes, layout } from '@/theme';

import { ScoringWindowSheet } from './ScoringWindowSheet';
import { Selector } from './Selector';
import { UserSheet } from './UserSheet';

// The user and scoring window buttons at the top of every tab.
export function SelectionHeader() {
  const { selectedUserId, scoringWindowEndDate } = useSelection();
  const [openSheet, setOpenSheet] = useState<'user' | 'scoringWindow' | null>(null);
  const scoringWindow = describeScoringWindow(scoringWindowEndDate);
  const closeSheet = () => setOpenSheet(null);

  return (
    <View style={styles.header}>
      <Selector
        label="User"
        value={selectedUserId}
        valueWeight="medium"
        accessibilityLabel={`Switch user, current ${selectedUserId}`}
        onPress={() => setOpenSheet('user')}
      />
      <Selector
        label="Scoring window"
        value={scoringWindow.shortLabel}
        valueSize={fontSizes.secondary}
        accessibilityLabel={`Change scoring window, currently ${scoringWindow.longLabel}`}
        onPress={() => setOpenSheet('scoringWindow')}
      />

      {openSheet === 'user' && <UserSheet onClose={closeSheet} />}
      {openSheet === 'scoringWindow' && <ScoringWindowSheet onClose={closeSheet} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: layout.screenPadding,
  },
});
