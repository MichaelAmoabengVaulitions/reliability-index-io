import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { describeScoringWindow } from '@/domain/scoringWindow';
import { useSelection } from '@/selection/SelectionContext';
import { colors, fontSizes } from '@/theme';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { DateField } from './DateField';
import { PrimaryButton } from './PrimaryButton';

export function ScoringWindowSheet({ onClose }: { onClose: () => void }) {
  const { scoringWindowEndDate, selectScoringWindowEndDate } = useSelection();
  // The picked date only takes effect once the analyst confirms it.
  const [draftEndDate, setDraftEndDate] = useState(scoringWindowEndDate);

  function showWindow() {
    selectScoringWindowEndDate(draftEndDate);
    onClose();
  }

  return (
    <BottomSheet title="Scoring window" onClose={onClose}>
      <AppText size={fontSizes.secondary} color={colors.secondaryText} style={styles.description}>
        Pick an end date. The score uses the 6 months up to that date.
      </AppText>
      <AppText size={fontSizes.secondary} color={colors.secondaryText}>
        End date
      </AppText>
      <DateField date={draftEndDate} onDateChange={setDraftEndDate} />
      <AppText style={styles.windowLabel}>
        Window: {describeScoringWindow(draftEndDate).longLabel}
      </AppText>
      <PrimaryButton label="Show this window" onPress={showWindow} />
      <View style={styles.bottomSpace} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  description: { marginTop: 4, marginBottom: 12, lineHeight: 21 },
  windowLabel: { marginVertical: 12 },
  bottomSpace: { height: 24 },
});
