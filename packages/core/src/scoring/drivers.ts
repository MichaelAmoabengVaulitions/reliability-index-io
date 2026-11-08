export interface DriverPoints {
  // The driver line without its points.
  label: string;
  // Left out when the line carries no points.
  points?: number;
}

/*
 * Finds a points value like "(+5 pts)", "(-10 pts)" or "(+2.5 pts)" at the very
 * end of a driver line, so a value in the middle of a sentence is left alone.
 */
const POINTS_AT_END = /\s*\(([+-]?\d+(?:\.\d+)?)\s*pts\)\s*$/;

// Splits a driver line from the backend into its wording and its points, if it has any.
export function readDriverPoints(line: string): DriverPoints {
  const match = line.match(POINTS_AT_END);
  if (match === null) return { label: line.trim() };
  return { label: line.replace(POINTS_AT_END, '').trim(), points: Number(match[1]) };
}
