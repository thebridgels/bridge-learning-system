/** Defaults to a July cutover: July–Dec is the start of a new school year. */
export function getCurrentSchoolYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed; 6 = July
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}
