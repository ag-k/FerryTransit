const JST_OFFSET_MINUTES = 9 * 60;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, "0");

export type JstDateParts = { year: number; month: number; day: number };

/**
 * 与えられた Date を「JSTの暦日」として年月日に分解する。
 * 端末のタイムゾーンに依存しない。
 */
export function getJstDateParts(date: Date): JstDateParts {
  const jstShifted = new Date(
    date.getTime() + JST_OFFSET_MINUTES * MS_PER_MINUTE
  );
  return {
    year: jstShifted.getUTCFullYear(),
    month: jstShifted.getUTCMonth() + 1,
    day: jstShifted.getUTCDate(),
  };
}

/** Date を JST の YYYY-MM-DD 形式にフォーマットする（端末TZ非依存）。 */
export function formatDateYmdJst(date: Date): string {
  const { year, month, day } = getJstDateParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * YYYY-MM-DD を「JSTの0:00」として Date に変換する（端末TZ非依存）。
 * 例: '2025-06-29' -> 2025-06-28T15:00:00.000Z
 */
export function parseYmdAsJstMidnight(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return new Date(NaN);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const utcMidnightMs = Date.UTC(year, month - 1, day);
  return new Date(utcMidnightMs - JST_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** 現在時刻を基準に「今日のJST 0:00」を返す（端末TZ非依存）。 */
export function getTodayJstMidnight(base: Date = new Date()): Date {
  const { year, month, day } = getJstDateParts(base);
  return new Date(
    Date.UTC(year, month - 1, day) - JST_OFFSET_MINUTES * MS_PER_MINUTE
  );
}

/** JSTの暦日で n 日加算した Date（JST 0:00）を返す。 */
export function addDaysJst(date: Date, days: number): Date {
  const { year, month, day } = getJstDateParts(date);
  const baseMs =
    Date.UTC(year, month - 1, day) - JST_OFFSET_MINUTES * MS_PER_MINUTE;
  return new Date(baseMs + days * MS_PER_DAY);
}
