import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ChevronIcon } from '@/components/ChevronIcon';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScoreScale } from '@/components/ScoreScale';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SelectionHeader } from '@/components/SelectionHeader';
import { useReliabilityScore } from '@/data/useReliabilityScore';
import type { ReliabilityScore } from '@/domain/score';
import { buildKeyNumbers, buildScoreGroups } from '@/domain/scoreSummary';
import { useSelection } from '@/selection/SelectionContext';
import { colors, fontSizes, layout } from '@/theme';

export function ScoreScreen() {
  const { selectedUserId, scoringWindowEndDate } = useSelection();
  const { status, score, retry } = useReliabilityScore(selectedUserId, scoringWindowEndDate);

  return (
    <ScreenContainer>
      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState onRetry={retry} />}
      {score !== undefined && <ScoreContent score={score} />}
    </ScreenContainer>
  );
}

function ScoreContent({ score }: { score: ReliabilityScore }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SelectionHeader />

      <View style={styles.scoreSection}>
        <View
          accessible
          accessibilityLabel={`Score ${score.score} out of 100, ${score.band} reliability`}
        >
          <View style={styles.scoreRow}>
            <AppText size={fontSizes.scoreNumber} style={styles.scoreNumber}>
              {score.score}
            </AppText>
            <AppText color={colors.secondaryText}>out of 100</AppText>
          </View>
          <AppText size={fontSizes.emphasis} weight="medium" style={styles.band}>
            {score.band} reliability
          </AppText>
        </View>
        <ScoreScale score={score.score} />
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.navigate('/breakdown')}
        style={styles.breakdownLink}
      >
        <AppText weight="medium">See how this score was reached</AppText>
        <ChevronIcon direction="right" color={colors.secondaryText} />
      </Pressable>

      <View style={styles.keyNumbers}>
        {buildKeyNumbers(score).map((keyNumber) => (
          <View
            key={keyNumber.label}
            accessible
            accessibilityLabel={`${keyNumber.label}, ${keyNumber.value}`}
            style={styles.keyNumberRow}
          >
            <AppText color={colors.secondaryText}>{keyNumber.label}</AppText>
            <AppText weight="medium">{keyNumber.value}</AppText>
          </View>
        ))}
      </View>

      {buildScoreGroups(score).map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText
            accessibilityRole="header"
            size={fontSizes.sectionHeading}
            weight="medium"
            style={styles.groupTitle}
          >
            {group.title}
          </AppText>
          {group.items.map((item) => (
            <View
              key={item.text}
              accessible
              accessibilityLabel={item.points === '' ? item.text : `${item.text}, ${item.points}`}
              style={styles.groupRow}
            >
              <AppText style={styles.groupText}>{item.text}</AppText>
              <AppText weight="medium">{item.points}</AppText>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: layout.screenPadding },
  scoreSection: { paddingTop: 8, paddingHorizontal: layout.screenPadding },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  // No fixed line height: on iOS one as tall as the font cuts off the top of the digits.
  scoreNumber: { letterSpacing: -4 },
  band: { marginTop: 6 },
  breakdownLink: {
    minHeight: layout.keyNumberRowHeight,
    marginTop: 8,
    marginHorizontal: layout.screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyNumbers: { marginHorizontal: layout.screenPadding },
  keyNumberRow: {
    minHeight: layout.keyNumberRowHeight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  group: { marginTop: 20, marginHorizontal: layout.screenPadding },
  groupTitle: { marginBottom: 4 },
  groupRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  groupText: { flex: 1 },
});
