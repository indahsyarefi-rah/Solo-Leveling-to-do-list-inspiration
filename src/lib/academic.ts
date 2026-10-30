import type { AppState } from './engine';

export const WEEKDAYS = [
  { id: 'mon', label: 'Senin' },
  { id: 'tue', label: 'Selasa' },
  { id: 'wed', label: 'Rabu' },
  { id: 'thu', label: 'Kamis' },
  { id: 'fri', label: 'Jumat' },
  { id: 'sat', label: 'Sabtu' },
  { id: 'sun', label: 'Minggu' },
] as const;
export type Weekday = (typeof WEEKDAYS)[number]['id'];
export interface ClassBlock {
  id: string;
  title: string;
  start: string;
  end: string;
}
export type AcademicWeek = Record<Weekday, ClassBlock[]>;
export interface AcademicSchedule {
  id: string;
  name: string;
  effectiveFrom: string;
  week: AcademicWeek;
}
export interface AcademicException {
  label: string;
  classes: ClassBlock[];
}

export function defaultAcademicWeek(): AcademicWeek {
  return Object.fromEntries(
    WEEKDAYS.map(({ id }, index) => [
      id,
      index < 5
        ? [
            {
              id: `default-${id}`,
              title: 'Kuliah',
              start: id === 'thu' ? '07:00' : '10:00',
              end: id === 'thu' ? '14:00' : '17:00',
            },
          ]
        : [],
    ]),
  ) as AcademicWeek;
}

export function academicScheduleAt(state: AppState, date: string): AcademicSchedule {
  const chosen = [...state.academicSchedules]
    .filter((s) => s.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return structuredClone(
    chosen ?? {
      id: 'default',
      name: 'Jadwal awal',
      effectiveFrom: '1970-01-01',
      week: defaultAcademicWeek(),
    },
  );
}

export function classesAt(state: AppState, date: string): ClassBlock[] {
  const exception = state.academicExceptions[date];
  if (exception)
    return structuredClone(exception.classes).sort((a, b) => a.start.localeCompare(b.start));
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return academicScheduleAt(state, date).week[WEEKDAYS[(day + 6) % 7].id].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const isText = (x: unknown, max = 100): x is string =>
  typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const isTime = (x: unknown): x is string =>
  typeof x === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x);
const isDate = (x: unknown): x is string =>
  typeof x === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  Number.isFinite(new Date(`${x}T00:00:00Z`).getTime()) &&
  new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x;

export function parseClassBlocks(input: unknown): ClassBlock[] | null {
  if (!Array.isArray(input) || input.length > 12) return null;
  const blocks: ClassBlock[] = [];
  for (const row of input) {
    if (
      !isRecord(row) ||
      !isText(row.id) ||
      !isText(row.title) ||
      !isTime(row.start) ||
      !isTime(row.end) ||
      row.start >= row.end ||
      blocks.some((b) => b.id === row.id)
    )
      return null;
    blocks.push({ id: row.id, title: row.title.trim(), start: row.start, end: row.end });
  }
  blocks.sort((a, b) => a.start.localeCompare(b.start));
  return blocks.some((b, i) => i > 0 && blocks[i - 1].end > b.start) ? null : blocks;
}

/** Normalize legacy snapshots and reject overlapping, ambiguous or malformed schedules. */
export function parseAcademicConfig(
  input: Record<string, unknown>,
): Pick<AppState, 'academicSchedules' | 'academicExceptions'> | null {
  const profiles = input.academicSchedules === undefined ? [] : input.academicSchedules;
  const exceptions = input.academicExceptions === undefined ? {} : input.academicExceptions;
  if (
    !Array.isArray(profiles) ||
    profiles.length > 100 ||
    !isRecord(exceptions) ||
    Object.keys(exceptions).length > 4000
  )
    return null;
  const result: Pick<AppState, 'academicSchedules' | 'academicExceptions'> = {
    academicSchedules: [],
    academicExceptions: {},
  };
  for (const p of profiles) {
    if (
      !isRecord(p) ||
      !isText(p.id) ||
      !isText(p.name, 60) ||
      !isDate(p.effectiveFrom) ||
      !isRecord(p.week) ||
      result.academicSchedules.some((s) => s.id === p.id || s.effectiveFrom === p.effectiveFrom)
    )
      return null;
    const week = {} as AcademicWeek;
    for (const { id } of WEEKDAYS) {
      const blocks = parseClassBlocks(p.week[id]);
      if (!blocks) return null;
      week[id] = blocks;
    }
    result.academicSchedules.push({
      id: p.id,
      name: p.name.trim(),
      effectiveFrom: p.effectiveFrom,
      week,
    });
  }
  result.academicSchedules.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  for (const [date, exception] of Object.entries(exceptions)) {
    if (!isDate(date) || !isRecord(exception) || !isText(exception.label)) return null;
    const classes = parseClassBlocks(exception.classes);
    if (!classes) return null;
    result.academicExceptions[date] = { label: exception.label.trim(), classes };
  }
  return result;
}
