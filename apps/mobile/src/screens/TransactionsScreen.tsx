import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SelectField } from '@/components/SelectField';
import { SelectionHeader } from '@/components/SelectionHeader';
import { StreamStatus } from '@/components/StreamStatus';
import { TransactionRow } from '@/components/TransactionRow';
import { useLiveUpdates } from '@/data/LiveUpdates';
import { useTransactions } from '@/data/useTransactions';
import {
  defaultTransactionFilters,
  filterAndSortTransactions,
  listCategories,
  sortOptions,
  type Transaction,
  type TransactionDirection,
  type TransactionFilters,
} from '@/domain/transactionList';
import { useSelection } from '@/selection/SelectionContext';
import { colors, fontFamilies, fontSizes, layout } from '@/theme';

const directionTabs: { direction: TransactionDirection; label: string }[] = [
  { direction: 'all', label: 'All' },
  { direction: 'moneyIn', label: 'Money in' },
  { direction: 'moneyOut', label: 'Money out' },
];

export function TransactionsScreen() {
  const { selectedUserId, scoringWindowEndDate } = useSelection();
  const { status, transactions, retry } = useTransactions(selectedUserId, scoringWindowEndDate);

  return (
    <ScreenContainer>
      {status === 'loading' && <LoadingState label="Loading transactions" />}
      {status === 'error' && (
        <ErrorState title="We couldn't load these transactions" onRetry={retry} />
      )}
      {status === 'ready' && (
        <>
          <SelectionHeader />
          {/* The key gives each user a fresh list with clear filters. */}
          <TransactionList key={selectedUserId} transactions={transactions} />
        </>
      )}
    </ScreenContainer>
  );
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const { isConnected } = useLiveUpdates();
  const [filters, setFilters] = useState(defaultTransactionFilters);
  const updateFilters = (changes: Partial<TransactionFilters>) =>
    setFilters((current) => ({ ...current, ...changes }));

  const categories = useMemo(() => listCategories(transactions), [transactions]);
  const visibleTransactions = useMemo(
    () => filterAndSortTransactions(transactions, filters),
    [transactions, filters],
  );

  return (
    <>
      <View style={styles.controls}>
        <TextInput
          accessibilityLabel="Search by merchant"
          placeholder="Search by merchant"
          placeholderTextColor={colors.secondaryText}
          value={filters.search}
          onChangeText={(search) => updateFilters({ search })}
          style={styles.search}
        />
        <View style={styles.selectRow}>
          <SelectField
            label="Category"
            value={filters.category}
            options={categories}
            onSelect={(category) => updateFilters({ category })}
          />
          <SelectField
            label="Sort"
            value={filters.sort}
            options={sortOptions}
            onSelect={(sort) => updateFilters({ sort })}
          />
        </View>
      </View>

      <View style={styles.directionTabs}>
        {directionTabs.map(({ direction, label }) => {
          const isActive = filters.direction === direction;
          return (
            <Pressable
              key={direction}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => updateFilters({ direction })}
              style={[styles.directionTab, isActive && styles.activeDirectionTab]}
            >
              <AppText
                weight={isActive ? 'medium' : 'regular'}
                color={isActive ? colors.text : colors.secondaryText}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statusRow}>
        <AppText size={fontSizes.secondary} color={colors.secondaryText}>
          {visibleTransactions.length} of {transactions.length} transactions
        </AppText>
        <StreamStatus isConnected={isConnected} />
      </View>

      <View style={styles.list}>
        <FlashList
          data={visibleTransactions}
          keyExtractor={(transaction) => transaction.id}
          renderItem={({ item }) => <TransactionRow transaction={item} />}
          keyboardShouldPersistTaps="handled"
          // On by default. It kept the old top row in view, so a new sort or filter scrolled down the list.
          maintainVisibleContentPosition={{ disabled: true }}
          ListEmptyComponent={
            transactions.length === 0 ? (
              <NoTransactionsInWindow />
            ) : (
              <NoMatchingTransactions onClear={() => setFilters(defaultTransactionFilters)} />
            )
          }
        />
      </View>
    </>
  );
}

// Filters can't help when the window itself is empty, so there is no button here.
function NoTransactionsInWindow() {
  return (
    <View style={styles.emptyState}>
      <AppText size={fontSizes.emphasis}>No transactions in this window</AppText>
    </View>
  );
}

function NoMatchingTransactions({ onClear }: { onClear: () => void }) {
  return (
    <View style={styles.emptyState}>
      <AppText size={fontSizes.emphasis}>No matching transactions</AppText>
      <AppText size={fontSizes.secondary} color={colors.secondaryText} style={styles.emptyHint}>
        Try another search or filter.
      </AppText>
      <Pressable accessibilityRole="button" onPress={onClear} style={styles.clearButton}>
        <AppText>Clear filters</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: layout.screenPadding },
  search: {
    minHeight: layout.controlHeight,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: layout.controlRadius,
    backgroundColor: colors.controlBackground,
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
  },
  selectRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  directionTabs: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    marginHorizontal: layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  directionTab: {
    minHeight: layout.controlHeight,
    marginBottom: -1,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeDirectionTab: { borderBottomColor: colors.text },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginHorizontal: layout.screenPadding,
  },
  list: { flex: 1, marginTop: 8, marginHorizontal: layout.screenPadding },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyHint: { marginTop: 4 },
  clearButton: {
    minHeight: layout.controlHeight,
    marginTop: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: layout.controlRadius,
    backgroundColor: colors.controlBackground,
  },
});
