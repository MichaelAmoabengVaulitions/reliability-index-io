import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

import type { Transaction } from '@/api/schemas';
import { config } from '@/config';

import { Row } from './Row';

interface VirtualTableProps {
  transactions: Transaction[];
}

const TABLE_HEIGHT_PX = 480;

/**
 * A long list that only draws the rows currently in view, so scrolling
 * thousands of rows still keeps only about 20 of them on the page at once.
 *
 * Built on TanStack Virtual. The row height comes from src/config.ts so it
 * can be changed in one place.
 */
export function VirtualTable({ transactions }: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = config.ui.virtualRowHeightPx;

  /*
   * TanStack Virtual's useVirtualizer returns functions the React Compiler
   * cannot safely cache. We call them again on every redraw instead, which is
   * the way the library recommends using it.
   */
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: config.ui.virtualOverscan,
    getItemKey: (index) => transactions[index]?.id ?? index,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-[110px_1fr_120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Date</span>
        <span>Merchant</span>
        <span className="text-right">Amount</span>
      </div>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: TABLE_HEIGHT_PX }}
        data-testid="virtual-table-scroll"
      >
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const transaction = transactions[virtualRow.index];
            if (transaction === undefined) return null;
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Row transaction={transaction} height={rowHeight} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
