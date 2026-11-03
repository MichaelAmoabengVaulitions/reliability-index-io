import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SelectionHeader } from '@/components/SelectionHeader';
import { ThinBar } from '@/components/ThinBar';
import { useReliabilityScore } from '@/data/useReliabilityScore';
import type { ReliabilityScore } from '@/domain/score';
import { buildBreakdownSteps } from '@/domain/scoreBreakdown';
import { useSelection } from '@/selection/SelectionContext';
import { colors, fontSizes, layout } from '@/theme';

import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

export function BreakdownScreen() {
  const { selectedUserId, scoringWindowEndDate } = useSelection();
  const { status, score, retry } = useReliabilityScore(selectedUserId, scoringWindowEndDate);

  return (
    <ScreenContainer>
      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {score !== undefined && <BreakdownContent score={score} />}
    </ScreenContainer>
  );
}

function BreakdownContent({ score }: { score: ReliabilityScore }) {
  return (
    <ScrollView>
      <SelectionHeader />

      <View style={styles.heading}>
        <AppText color={colors.secondaryText}>How the score was reached</AppText>
        <AppText size={fontSizes.mainNumber} style={styles.mainNumber}>
          {score.score}
        </AppText>
      </View>

      <View style={styles.steps}>
        {buildBreakdownSteps(score).map((step) => (
          <View key={step.name} style={styles.step}>
            <View style={styles.stepTitleRow}>
              <AppText style={styles.stepName}>{step.name}</AppText>
              <AppText weight="medium">{step.points}</AppText>
            </View>
            <ThinBar
              widthPercent={step.barWidthPercent}
              color={step.kind === 'added' ? colors.pointsAdded : colors.pointsTakenAway}
            />
            {step.note !== '' && (
              <AppText size={fontSizes.secondary} color={colors.secondaryText} style={styles.note}>
                {step.note}
              </AppText>
            )}
          </View>
        ))}
        <View style={styles.total}>
          <AppText weight="medium">Score</AppText>
          <AppText weight="medium">{score.score}</AppText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { paddingTop: 16, paddingHorizontal: layout.screenPadding },
  mainNumber: { marginTop: 2, lineHeight: 57.2, letterSpacing: -2 },
  steps: { marginTop: 12, marginHorizontal: layout.screenPadding },
  step: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  stepName: { flex: 1 },
  note: { marginTop: 6, lineHeight: 21 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.text,
  },
});
