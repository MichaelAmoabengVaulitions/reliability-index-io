import { StyleSheet, View } from 'react-native';

import { formatTransactionAmount } from '@/domain/money';
import { formatDate } from '@/domain/scoringWindow';
import type { Transaction } from '@/domain/transactionList';
import { colors, fontSizes, layout } from '@/theme';

import { AppText } from './AppText';

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowDetails}>
        <AppText numberOfLines={1}>{transaction.merchantName}</AppText>
        <AppText size={fontSizes.secondary} color={colors.secondaryText}>
          {formatDate(transaction.date)} · {transaction.category}
        </AppText>
      </View>
      <AppText weight="medium">{formatTransactionAmount(transaction.amount)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.transactionRowHeight,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowDetails: { flex: 1, minWidth: 0, gap: 4 },
});
