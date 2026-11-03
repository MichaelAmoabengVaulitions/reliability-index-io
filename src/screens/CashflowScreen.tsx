import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SelectionHeader } from '@/components/SelectionHeader';
import { ThinBar } from '@/components/ThinBar';
import { summarizeCashflow } from '@/domain/cashflow';
import { dummyCashflowFor } from '@/dummy-data/cashflow';
import { useSelection } from '@/selection/SelectionContext';
import { colors, fontSizes, layout } from '@/theme';

export function CashflowScreen() {
  const { selectedUserId, scoringWindowEndDate } = useSelection();
  const summary = summarizeCashflow(dummyCashflowFor(selectedUserId, scoringWindowEndDate));

  return (
    <ScreenContainer>
      <ScrollView>
        <SelectionHeader />

        <View style={styles.heading}>
          <AppText color={colors.secondaryText}>{summary.heading}</AppText>
          <AppText size={fontSizes.mainNumber} style={styles.mainNumber}>
            {summary.averageText}
          </AppText>
        </View>

        <View style={styles.months}>
          {summary.months.map((month) => (
            <View key={month.label} style={styles.month}>
              <View style={styles.monthTitleRow}>
                <AppText>{month.label}</AppText>
                <AppText weight="medium">{month.resultText}</AppText>
              </View>
              <ThinBar
                widthPercent={month.barWidthPercent}
                color={month.isOverspent ? colors.moneyOverspent : colors.moneyLeftOver}
              />
              <AppText
                size={fontSizes.secondary}
                color={colors.secondaryText}
                style={styles.detail}
              >
                {month.detailText}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { paddingTop: 16, paddingHorizontal: layout.screenPadding },
  mainNumber: { marginTop: 2, lineHeight: 57.2, letterSpacing: -2 },
  months: {
    marginTop: 12,
    marginBottom: 20,
    marginHorizontal: layout.screenPadding,
  },
  month: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  monthTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detail: { marginTop: 6 },
});
