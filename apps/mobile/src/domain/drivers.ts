import { readDriverPoints } from '@reliability-index/core/scoring/drivers';

export interface ParsedDriver {
  label: string;
  // Zero when the driver carries no points.
  points: number;
}

/*
 * Reads the points off the end of a driver line with the shared reader. A line
 * with no points counts as 0 here.
 */
export function parseDriver(driver: string): ParsedDriver {
  const { label, points = 0 } = readDriverPoints(driver);
  return { label, points };
}
