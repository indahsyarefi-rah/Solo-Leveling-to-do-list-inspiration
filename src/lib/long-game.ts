import type { AppState, Badge } from './engine';
import type { IeltsMode } from './learning';
import { assetPath } from './paths';

export type MonthlyKind = 'cardio' | 'gym' | 'reading' | 'study' | 'swim' | 'balance';
export type School = 'water' | 'crystal' | 'rune' | 'tide';
export interface StudyLog {
  ielts: number;
  japanese: number;
  ieltsNote: string;
  japaneseNote: string;
}
export interface Book {
  id: string;
  title: string;
  author: string;
  school: School;
  totalPages: number;
  startedAt: string;
  finishedAt: string | null;
  reflection: string;
  application: string;
}
export interface ReadingLog {
  id: string;
  bookId: string;
  date: string;
  pages: number;
  minutes: number;
  note: string;
}
export interface Redemption {
  id: string;
  kind: 'rest' | 'self';
  label: string;
  cost: number;
  date: string;
  forDate: string | null;
  cancelled: boolean;
}
export interface Adventure {
  study: {
    startDate: string | null;
    mode: IeltsMode;
    ieltsMinutes: number;
    japaneseMinutes: number;
  };
  studyLogs: Record<string, StudyLog>;
  books: Book[];
  readings: ReadingLog[];
  trials: Record<string, { joinedAt: string }>;
  trialAttempts: Record<
    string,
    { date: string; minutes: number; distanceKm: number; continuous: boolean }
  >;
  claims: Record<string, { date: string; shards: number; title: string }>;
  redemptions: Redemption[];
}
export function emptyAdventure(): Adventure {
  return {
    study: { startDate: null, mode: 'academic', ieltsMinutes: 20, japaneseMinutes: 10 },
    studyLogs: {},
    books: [],
    readings: [],
    trials: {},
    trialAttempts: {},
    claims: {},
    redemptions: [],
  };
}

export const SCHOOLS: Record<School, { name: string; spell: string }> = {
  water: { name: 'Water · emosi & refleksi', spell: 'Stillwater Mind' },
  crystal: { name: 'Crystal · analisis & pengetahuan', spell: 'Crystal Insight' },
  rune: { name: 'Rune · bahasa & belajar', spell: 'Runic Memory' },
  tide: { name: 'Tide · kebiasaan & komunikasi', spell: 'Focused Current' },
};
export function restDay(state: AppState, date: string): boolean {
  return state.adventure.redemptions.some(
    (r) => r.kind === 'rest' && r.forDate === date && !r.cancelled,
  );
}
export function studyDue(state: AppState, date: string): boolean {
  const start = state.adventure.study.startDate;
  return (
    !!start &&
    date >= start &&
    Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) %
      2 ===
      0
  );
}
export function studyComplete(state: AppState, date: string): boolean {
  const log = state.adventure.studyLogs[date];
  return (
    !!log &&
    log.ielts >= state.adventure.study.ieltsMinutes &&
    log.japanese >= state.adventure.study.japaneseMinutes
  );
}
export function readingOn(state: AppState, date: string) {
  return state.adventure.readings
    .filter((r) => r.date === date)
    .reduce((a, r) => ({ minutes: a.minutes + r.minutes, pages: a.pages + r.pages }), {
      minutes: 0,
      pages: 0,
    });
}
export function bookPages(state: AppState, id: string, date: string): number {
  return state.adventure.readings
    .filter((r) => r.bookId === id && r.date <= date)
    .reduce((n, r) => n + r.pages, 0);
}
export function shards(state: AppState): number {
  return (
    Object.values(state.adventure.claims).reduce((n, c) => n + c.shards, 0) -
    state.adventure.redemptions.filter((r) => !r.cancelled).reduce((n, r) => n + r.cost, 0)
  );
}

export const MONTHLY: Record<
  MonthlyKind,
  { name: string; description: string; target: number; level: number; xp: number; unit: string }
> = {
  cardio: {
    name: 'Emerald Current',
    description: 'Cardio minimal 30 menit, maksimal satu sesi dihitung per hari.',
    target: 12,
    level: 1,
    xp: 200,
    unit: 'sesi',
  },
  gym: {
    name: 'Iron Tide',
    description: 'Delapan sesi gym tercatat; ikuti waktu pemulihan dan rutinitasmu.',
    target: 8,
    level: 5,
    xp: 220,
    unit: 'sesi',
  },
  reading: {
    name: 'Scholar’s Tide',
    description: 'Dua belas hari membaca minimal 10 menit dan mencatat halaman.',
    target: 12,
    level: 1,
    xp: 200,
    unit: 'hari',
  },
  study: {
    name: 'Twin Runes',
    description: 'Sepuluh hari menyelesaikan IELTS 20 menit dan Jepang 10 menit.',
    target: 10,
    level: 1,
    xp: 240,
    unit: 'hari',
  },
  swim: {
    name: 'Water Affinity',
    description: 'Empat sesi renang minimal 10 menit, sesuai kemampuanmu.',
    target: 4,
    level: 8,
    xp: 220,
    unit: 'sesi',
  },
  balance: {
    name: 'Balanced Mage',
    description: 'Sepuluh hari berisi setidaknya dua kategori: olahraga, membaca, atau belajar.',
    target: 10,
    level: 10,
    xp: 250,
    unit: 'hari',
  },
};
export function monthKind(challenge: { kind?: MonthlyKind }): MonthlyKind {
  return challenge.kind ?? 'cardio';
}
export function monthlyDates(
  state: AppState,
  month: string,
  challenge: { joinedAt: string; kind?: MonthlyKind },
  date: string,
): string[] {
  const kind = monthKind(challenge);
  const dates = new Set([
    ...Object.keys(state.days),
    ...Object.keys(state.adventure.studyLogs),
    ...state.adventure.readings.map((r) => r.date),
  ]);
  return [...dates]
    .filter((key) => {
      if (
        !state.startedAt ||
        key < state.startedAt ||
        key < challenge.joinedAt ||
        key > date ||
        key.slice(0, 7) !== month
      )
        return false;
      const day = state.days[key];
      const reading = readingOn(state, key);
      const study = studyComplete(state, key);
      const movement =
        !!(day?.cardio && day.cardio.minutes >= 30) ||
        !!(
          day?.gym &&
          day.gym.minutes > 0 &&
          day.gym.exercises.some((e) => e.sets.some((s) => s.reps > 0))
        );
      if (kind === 'cardio') return !!day?.cardio && day.cardio.minutes >= 30;
      if (kind === 'gym')
        return (
          !!day?.gym &&
          day.gym.minutes > 0 &&
          day.gym.exercises.some((e) => e.sets.some((s) => s.reps > 0))
        );
      if (kind === 'reading') return reading.minutes >= 10 && reading.pages > 0;
      if (kind === 'study') return study;
      if (kind === 'swim') return day?.cardio?.activity === 'swim' && day.cardio.minutes >= 10;
      return (
        Number(movement) + Number(reading.minutes >= 10 && reading.pages > 0) + Number(study) >= 2
      );
    })
    .sort();
}

export const TRIALS = [
  {
    id: 'run-1',
    name: 'First Kilometre',
    level: 5,
    activity: 'run',
    km: 1,
    requires: null,
    xp: 100,
  },
  {
    id: 'run-2',
    name: 'Unbroken Current',
    level: 12,
    activity: 'run',
    km: 2,
    requires: 'run-1',
    xp: 150,
  },
  {
    id: 'run-5',
    name: 'Five-K Tide',
    level: 25,
    activity: 'run',
    km: 5,
    requires: 'run-2',
    xp: 250,
  },
  {
    id: 'run-10',
    name: 'Horizon Runner',
    level: 45,
    activity: 'run',
    km: 10,
    requires: 'run-5',
    xp: 400,
  },
  {
    id: 'swim-100',
    name: 'Water Initiate',
    level: 5,
    activity: 'swim',
    km: 0.1,
    requires: null,
    xp: 100,
  },
  {
    id: 'swim-250',
    name: 'Emerald Stream',
    level: 12,
    activity: 'swim',
    km: 0.25,
    requires: 'swim-100',
    xp: 150,
  },
  {
    id: 'swim-500',
    name: 'Deepwater Mage',
    level: 25,
    activity: 'swim',
    km: 0.5,
    requires: 'swim-250',
    xp: 250,
  },
  {
    id: 'swim-1000',
    name: 'Thousand-Metre Tide',
    level: 45,
    activity: 'swim',
    km: 1,
    requires: 'swim-500',
    xp: 400,
  },
] as const;
export function trialFinishedAt(state: AppState, id: string, date: string): string | null {
  const definition = TRIALS.find((t) => t.id === id),
    joined = state.adventure.trials[id];
  if (!definition || !joined || !state.startedAt) return null;
  const fromCardio =
    Object.entries(state.days)
      .filter(
        ([key, day]) =>
          key >= joined.joinedAt &&
          key >= state.startedAt! &&
          key <= date &&
          day.cardio?.activity === definition.activity &&
          day.cardio.minutes > 0 &&
          day.cardio.continuous === true &&
          (day.cardio.distanceKm ?? 0) >= definition.km,
      )
      .map(([key]) => key)
      .sort()[0] ?? null;
  const attempt = state.adventure.trialAttempts[id];
  const recorded =
    attempt &&
    attempt.date >= joined.joinedAt &&
    attempt.date >= state.startedAt &&
    attempt.date <= date &&
    attempt.minutes > 0 &&
    attempt.continuous &&
    attempt.distanceKm >= definition.km
      ? attempt.date
      : null;
  return [fromCardio, recorded].filter((x): x is string => !!x).sort()[0] ?? null;
}
export function canJoinTrial(state: AppState, id: string, level: number, date: string): boolean {
  const t = TRIALS.find((x) => x.id === id);
  return (
    !!t &&
    !!state.startedAt &&
    level >= t.level &&
    adventureMetrics(state, date).cardio >= 5 &&
    (!t.requires || !!trialFinishedAt(state, t.requires, date))
  );
}

export const UNLOCKS = [
  { level: 1, name: 'Emerald Tide Initiate', feature: 'Daily Quests, jurnal buku, belajar bahasa' },
  { level: 5, name: 'Waterweaver', feature: 'Trial Gates dan halaman Spellcraft' },
  { level: 12, name: 'Tide Scholar', feature: 'Trials lari 2 km dan renang 250 m' },
  { level: 25, name: 'Emerald Arcanist', feature: 'Trials lari 5 km dan renang 500 m' },
  { level: 45, name: 'Tidekeeper', feature: 'Trials lari 10 km dan renang 1.000 m' },
  { level: 75, name: 'Verdant Archmage', feature: 'Gelar Verdant Archmage' },
  { level: 100, name: 'Emerald Sovereign', feature: 'Milestone legenda; level tetap berlanjut' },
];
export const hunterTitle = (level: number) =>
  [...UNLOCKS].reverse().find((u) => u.level <= level)!.name;

type Metric =
  | 'quests'
  | 'streak'
  | 'days'
  | 'cardio'
  | 'gym'
  | 'swim'
  | 'books'
  | 'study'
  | 'japanese'
  | 'ielts'
  | 'months';
interface Achievement {
  id: string;
  title: string;
  metric: Metric;
  target: number;
  image: string;
  category: string;
  reward: number;
}
export const ACHIEVEMENTS: Achievement[] = [];
function family(metric: Metric, category: string, name: string, targets: number[], image: string) {
  targets.forEach((target, i) =>
    ACHIEVEMENTS.push({
      id: `${metric}-${target}`,
      title: `${name} ${i + 1}`,
      metric,
      target,
      image,
      category,
      reward: i < 2 ? 10 : i < 4 ? 20 : i < 6 ? 35 : 50,
    }),
  );
}
family(
  'quests',
  'Quest',
  'Emerald Resolve',
  [1, 10, 30, 100, 250, 500, 1000, 2000, 5000, 10000],
  'emerald-resolve',
);
family(
  'streak',
  'Konsistensi',
  'Unbroken Tide',
  [3, 7, 14, 30, 60, 90, 180, 365],
  'seven-day-current',
);
family('days', 'Perjalanan', 'Chronicle', [1, 7, 14, 30, 60, 90, 180, 365, 540, 730], 'tidekeeper');
family('cardio', 'Cardio', 'Flow Walker', [5, 10, 25, 50, 100, 200, 365, 500], 'first-ripple');
family('gym', 'Gym', 'Crystal Strength', [5, 10, 25, 50, 100, 200, 300], 'emerald-resolve');
family('swim', 'Renang', 'Water Affinity', [1, 5, 10, 25, 50, 100], 'emerald-current');
family('books', 'Spellbook', 'Library Keeper', [1, 3, 5, 10, 20, 30], 'tidekeeper');
family('study', 'Bahasa', 'Twin Runes', [5, 15, 30, 60, 120, 180, 270, 365], 'emerald-resolve');
family('japanese', 'Jepang', 'Runic Apprentice', [5, 15, 30, 60, 120, 180], 'first-ripple');
family('ielts', 'IELTS', 'Academic Current', [1, 10, 30, 60, 120], 'seven-day-current');
family('months', 'Challenge', 'Season Keeper', [1, 3, 6, 12, 18, 24], 'emerald-current');
for (const [metric, target, id, title] of [
  ['quests', 1, 'first-ripple', 'First Ripple'],
  ['quests', 30, 'emerald-resolve', 'Emerald Resolve'],
  ['quests', 100, 'tidekeeper', 'Tidekeeper'],
  ['streak', 7, 'seven-day-current', 'Seven-Day Current'],
  ['months', 1, 'emerald-current', 'Emerald Current'],
] as const) {
  const item = ACHIEVEMENTS.find((a) => a.metric === metric && a.target === target)!;
  item.id = id;
  item.title = title;
}
const first = [
  'first-ripple',
  'seven-day-current',
  'emerald-resolve',
  'tidekeeper',
  'emerald-current',
];
ACHIEVEMENTS.sort(
  (a, b) =>
    (first.includes(a.id) ? first.indexOf(a.id) : -1 + 100) -
    (first.includes(b.id) ? first.indexOf(b.id) : -1 + 100),
);

export function adventureMetrics(state: AppState, date: string) {
  const active = (key: string) => !!state.startedAt && key >= state.startedAt && key <= date;
  const days = Object.entries(state.days).filter(([key]) => active(key));
  const ielts = Object.entries(state.adventure.studyLogs).filter(
    ([key, log]) => active(key) && log.ielts >= 20,
  ).length;
  const japanese = Object.entries(state.adventure.studyLogs).filter(
    ([key, log]) => active(key) && log.japanese >= 10,
  ).length;
  const study = Object.keys(state.adventure.studyLogs).filter(
    (key) => active(key) && studyComplete(state, key),
  ).length;
  const activeDates = new Set(
    days
      .filter(
        ([, log]) =>
          log.completions.length > 0 ||
          log.waterMl > 0 ||
          log.meals.length > 0 ||
          !!log.cardio ||
          !!log.gym,
      )
      .map(([key]) => key),
  );
  for (const [key, log] of Object.entries(state.adventure.studyLogs))
    if (active(key) && (log.ielts > 0 || log.japanese > 0)) activeDates.add(key);
  for (const r of state.adventure.readings)
    if (active(r.date) && r.minutes > 0) activeDates.add(r.date);
  return {
    days: activeDates.size,
    cardio: days.filter(([, d]) => d.cardio && d.cardio.minutes >= 30).length,
    gym: days.filter(
      ([, d]) =>
        d.gym && d.gym.minutes > 0 && d.gym.exercises.some((e) => e.sets.some((s) => s.reps > 0)),
    ).length,
    swim: days.filter(([, d]) => d.cardio?.activity === 'swim' && d.cardio.minutes > 0).length,
    books: state.adventure.books.filter((b) => b.finishedAt && active(b.finishedAt)).length,
    study,
    ielts,
    japanese,
  };
}
export function longBadges(
  state: AppState,
  date: string,
  base: { quests: number; streak: number; months: number },
): Badge[] {
  const metrics = { ...adventureMetrics(state, date), ...base };
  const units: Record<Metric, string> = {
    quests: 'quest selesai',
    streak: 'hari aktif berturut-turut',
    days: 'hari beraktivitas (kumulatif)',
    cardio: 'sesi cardio ≥30 menit',
    gym: 'sesi gym tercatat',
    swim: 'sesi renang tercatat',
    books: 'buku selesai dengan refleksi dan penerapan',
    study: 'hari IELTS + Jepang selesai',
    japanese: 'sesi Jepang ≥10 menit',
    ielts: 'sesi IELTS ≥20 menit',
    months: 'challenge bulanan selesai',
  };
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    description: `${a.target} ${units[a.metric]}.`,
    image: assetPath(`/assets/badges/${a.image}.png`),
    progress:
      state.adventure.claims[a.id] && state.adventure.claims[a.id].date <= date
        ? Math.max(a.target, metrics[a.metric])
        : metrics[a.metric],
    target: a.target,
    unlocked:
      metrics[a.metric] >= a.target ||
      !!(state.adventure.claims[a.id] && state.adventure.claims[a.id].date <= date),
    category: a.category,
    reward: a.reward,
  }));
}

const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max;
const num = (x: unknown, max: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;
const date = (x: unknown): x is string =>
  typeof x === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  Number.isFinite(Date.parse(x + 'T00:00:00Z')) &&
  new Date(x + 'T00:00:00Z').toISOString().slice(0, 10) === x;
export function parseAdventure(raw: unknown): Adventure | null {
  if (raw === undefined) return emptyAdventure();
  if (
    !record(raw) ||
    !record(raw.study) ||
    !record(raw.studyLogs) ||
    !Array.isArray(raw.books) ||
    !Array.isArray(raw.readings) ||
    !record(raw.trials) ||
    !record(raw.claims) ||
    !Array.isArray(raw.redemptions)
  )
    return null;
  const result = emptyAdventure();
  const s = raw.study;
  if (
    !(s.startDate === null || date(s.startDate)) ||
    !['academic', 'general', 'common'].includes(String(s.mode)) ||
    s.ieltsMinutes !== 20 ||
    s.japaneseMinutes !== 10
  )
    return null;
  result.study = {
    startDate: s.startDate,
    mode: s.mode as IeltsMode,
    ieltsMinutes: 20,
    japaneseMinutes: 10,
  };
  if (
    Object.keys(raw.studyLogs).length > 20000 ||
    raw.books.length > 500 ||
    raw.readings.length > 20000 ||
    raw.redemptions.length > 3000 ||
    Object.keys(raw.claims).length > 100 ||
    Object.keys(raw.trials).length > TRIALS.length
  )
    return null;
  for (const [key, v] of Object.entries(raw.studyLogs)) {
    if (
      !date(key) ||
      !record(v) ||
      !num(v.ielts, 300) ||
      !num(v.japanese, 300) ||
      !text(v.ieltsNote, 4000) ||
      !text(v.japaneseNote, 4000)
    )
      return null;
    result.studyLogs[key] = {
      ielts: v.ielts,
      japanese: v.japanese,
      ieltsNote: v.ieltsNote,
      japaneseNote: v.japaneseNote,
    };
  }
  for (const b of raw.books) {
    if (
      !record(b) ||
      !text(b.id, 100) ||
      !b.id ||
      !text(b.title, 150) ||
      !b.title.trim() ||
      !text(b.author, 100) ||
      !Object.hasOwn(SCHOOLS, String(b.school)) ||
      !num(b.totalPages, 10000) ||
      b.totalPages < 1 ||
      !Number.isInteger(b.totalPages) ||
      !date(b.startedAt) ||
      !(b.finishedAt === null || date(b.finishedAt)) ||
      !text(b.reflection, 5000) ||
      !text(b.application, 5000) ||
      result.books.some((x) => x.id === b.id)
    )
      return null;
    result.books.push({
      id: b.id,
      title: b.title,
      author: b.author,
      school: b.school as School,
      totalPages: b.totalPages,
      startedAt: b.startedAt,
      finishedAt: b.finishedAt,
      reflection: b.reflection,
      application: b.application,
    });
  }
  for (const r of raw.readings) {
    if (
      !record(r) ||
      !text(r.id, 100) ||
      !r.id ||
      !result.books.some((b) => b.id === r.bookId) ||
      !date(r.date) ||
      !num(r.pages, 10000) ||
      !Number.isInteger(r.pages) ||
      !num(r.minutes, 600) ||
      !text(r.note, 4000) ||
      result.readings.some((x) => x.id === r.id)
    )
      return null;
    result.readings.push({
      id: r.id,
      bookId: String(r.bookId),
      date: r.date,
      pages: r.pages,
      minutes: r.minutes,
      note: r.note,
    });
  }
  for (const [id, t] of Object.entries(raw.trials)) {
    if (!TRIALS.some((x) => x.id === id) || !record(t) || !date(t.joinedAt)) return null;
    result.trials[id] = { joinedAt: t.joinedAt };
  }
  const attempts = raw.trialAttempts === undefined ? {} : raw.trialAttempts;
  if (!record(attempts) || Object.keys(attempts).length > TRIALS.length) return null;
  for (const [id, a] of Object.entries(attempts)) {
    if (
      !result.trials[id] ||
      !record(a) ||
      !date(a.date) ||
      a.date < result.trials[id].joinedAt ||
      !num(a.minutes, 600) ||
      !num(a.distanceKm, 100) ||
      typeof a.continuous !== 'boolean'
    )
      return null;
    result.trialAttempts[id] = {
      date: a.date,
      minutes: a.minutes,
      distanceKm: a.distanceKm,
      continuous: a.continuous,
    };
  }
  for (const [id, c] of Object.entries(raw.claims)) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (
      !a ||
      !record(c) ||
      !date(c.date) ||
      !num(c.shards, 1000) ||
      !Number.isInteger(c.shards) ||
      !text(c.title, 150)
    )
      return null;
    result.claims[id] = { date: c.date, shards: c.shards as number, title: c.title };
  }
  for (const r of raw.redemptions) {
    if (
      !record(r) ||
      !text(r.id, 100) ||
      !r.id ||
      !['rest', 'self'].includes(String(r.kind)) ||
      !text(r.label, 150) ||
      !r.label.trim() ||
      !num(r.cost, 1000) ||
      r.cost < 1 ||
      !Number.isInteger(r.cost) ||
      !date(r.date) ||
      !(r.forDate === null || date(r.forDate)) ||
      typeof r.cancelled !== 'boolean' ||
      (r.kind === 'rest' && !date(r.forDate)) ||
      result.redemptions.some((x) => x.id === r.id)
    )
      return null;
    result.redemptions.push({
      id: r.id,
      kind: r.kind as Redemption['kind'],
      label: r.label,
      cost: r.cost,
      date: r.date,
      forDate: r.forDate,
      cancelled: r.cancelled,
    });
  }
  for (const b of result.books)
    if (
      b.finishedAt &&
      (b.finishedAt < b.startedAt ||
        !b.reflection.trim() ||
        !b.application.trim() ||
        result.readings
          .filter((r) => r.bookId === b.id && r.date <= b.finishedAt!)
          .reduce((n, r) => n + r.pages, 0) < b.totalPages)
    )
      return null;
  for (const r of result.readings)
    if (r.date < result.books.find((b) => b.id === r.bookId)!.startedAt) return null;
  const earned = Object.values(result.claims).reduce((n, c) => n + c.shards, 0),
    spent = result.redemptions.filter((r) => !r.cancelled).reduce((n, r) => n + r.cost, 0);
  if (spent > earned) return null;
  const rests = result.redemptions
    .filter((r) => r.kind === 'rest' && !r.cancelled)
    .map((r) => r.forDate!)
    .sort();
  if (
    rests.some(
      (key, i) => i > 0 && Math.abs(Date.parse(key) - Date.parse(rests[i - 1])) < 7 * 86400000,
    )
  )
    return null;
  return result;
}
