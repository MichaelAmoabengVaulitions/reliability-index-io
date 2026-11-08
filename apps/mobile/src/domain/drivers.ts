export interface ParsedDriver {
  label: string;
  // Zero when the driver carries no points.
  points: number;
}

/*
 * Finds a points value like "(+5 pts)", "(-10 pts)" or "(+2.5 pts)" at the very
 * end of a driver line, so a value in the middle of a sentence is left alone.
 */
const pointsAtEnd = /\s*\(([+-]?\d+(?:\.\d+)?)\s*pts\)\s*$/;

export function parseDriver(driver: string): ParsedDriver {
  const match = driver.match(pointsAtEnd);
  if (match === null) return { label: driver.trim(), points: 0 };
  return {
    label: driver.replace(pointsAtEnd, '').trim(),
    points: Number(match[1]),
  };
}
