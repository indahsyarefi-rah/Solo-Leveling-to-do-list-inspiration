import {
  emptyAdventure,
  parseAdventure,
  restDay,
  studyDue,
  studyComplete,
  readingOn,
  monthlyDates,
  monthKind,
  MONTHLY,
  TRIALS,
  trialFinishedAt,
  longBadges,
  type Adventure,
  type MonthlyKind,
} from './long-game';
import {
  classesAt,
  parseAcademicConfig,
  type AcademicSchedule,
  type AcademicException,
} from './academic';

/** Pure domain selectors. Rewards are derived from facts, never incremented counters. */
export type Attribute = 'strength' | 'endurance' | 'discipline';
export type Activity = 'walk' | 'run' | 'cycle' | 'swim' | 'other';
export interface CardioSession {
  activity: Activity;
  minutes: number;
  distanceKm: number | null;
  incline: number | null;
  intensity: 'light' | 'medium' | 'hard';
  continuous?: boolean;
}
export interface GymSet {
  reps: number;
  weight: number;
}
export interface GymExercise {
  name: string;
  sets: GymSet[];
}
export interface GymSession {
  type: 'upper' | 'lower';
  minutes: number;
  exercises: GymExercise[];
  feeling: 'comfortable' | 'hard';
}
export interface Meal {
  id: string;
  name: string;
  calories: number;
  time: string;
}
export interface ScheduledItem {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: 'class' | 'gym' | 'cardio' | 'personal' | 'study';
  locked: boolean;
}
export interface Settings {
  name: string;
  wakeTime: string;
  sleepTime: string;
  commuteMinutes: number;
  notificationsEnabled: boolean;
  cardioTargetMinutes: number;
}
export interface DayLog {
  pms: boolean;
  completions: string[];
  waterMl: number;
  meals: Meal[];
  cardio: CardioSession | null;
  gym: GymSession | null;
  schedule: ScheduledItem[];
  scheduleApproved: boolean;
  cardioTargetMinutes: number;
}
export interface AppState {
  version: 3;
  adventure: Adventure;
  academicSchedules: AcademicSchedule[];
  academicExceptions: Record<string, AcademicException>;
  startedAt: string | null;
  pms: boolean;
  settings: Settings;
  days: Record<string, DayLog>;
  challenges: Record<
    string,
    { target: number; joinedAt: string; kind?: MonthlyKind; rewardXp?: number }
  >;
}
export interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  attribute: Attribute;
  attributeXp: number;
  required: boolean;
  done: boolean;
  kind: 'toggle' | 'cardio' | 'gym' | 'water' | 'nutrition' | 'language' | 'reading';
  progress: number;
  target: number;
  unit: string;
}
export interface Badge {
  category?: string;
  reward?: number;
  id: string;
  title: string;
  description: string;
  image: string;
  unlocked: boolean;
  progress: number;
  target: number;
}
export interface Stats {
  xp: number;
  level: number;
  levelXp: number;
  nextLevelXp: number;
  attributes: Record<
    Attribute,
    { xp: number; level: number; levelXp: number; nextLevelXp: number }
  >;
  completed: number;
  todayCompleted: number;
  todayTarget: number;
  todayXp: number;
  streak: number;
  habitStreaks: Record<string, number>;
  monthlyCount: number;
  monthlyTarget: number;
  monthlyJoined: boolean;
  monthlyComplete: boolean;
  badges: Badge[];
}

export const ACTIVITY_LABELS: Record<Activity, string> = {
  walk: 'Jalan',
  run: 'Lari',
  cycle: 'Bersepeda',
  swim: 'Renang',
  other: 'Olahraga lain',
};
export const GYM_EXERCISES: Record<'upper' | 'lower', string[]> = {
  upper: ['Chest press', 'Seated row', 'Lat pulldown', 'Latihan bahu'],
  lower: ['Leg press / squat sederhana', 'Glute bridge', 'Leg curl', 'Calf raise'],
};

const DAY_MS = 86_400_000;
const IDS = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'fasting',
  'gym',
  'cardio',
  'water',
  'nutrition',
  'core',
  'dhuha',
  'tahajud',
  'alternative',
  'language',
  'reading',
] as const;
const ACTIVITIES = Object.keys(ACTIVITY_LABELS);
const PRAYERS = [
  ['fajr', 'Shalat Subuh'],
  ['dhuhr', 'Shalat Dzuhur'],
  ['asr', 'Shalat Ashar'],
  ['maghrib', 'Shalat Maghrib'],
  ['isha', 'Shalat Isya'],
] as const;

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function utc(date: string): Date {
  if (!validDate(date)) throw new RangeError('Tanggal harus berformat YYYY-MM-DD yang valid.');
  return new Date(`${date}T00:00:00.000Z`);
}

export function todayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utc(date));
}

export function addDays(date: string, offset: number): string {
  if (!Number.isInteger(offset)) throw new RangeError('Selisih hari harus bilangan bulat.');
  const value = utc(date);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function dateDiff(start: string, end: string): number {
  return Math.round((utc(end).getTime() - utc(start).getTime()) / DAY_MS);
}

export function createState(): AppState {
  return {
    version: 3,
    adventure: emptyAdventure(),
    academicSchedules: [],
    academicExceptions: {},
    startedAt: null,
    pms: false,
    settings: {
      name: 'Iris',
      wakeTime: '05:00',
      sleepTime: '22:00',
      commuteMinutes: 30,
      notificationsEnabled: false,
      cardioTargetMinutes: 30,
    },
    days: {},
    challenges: {},
  };
}

export function emptyDay(pms = false, cardioTargetMinutes = 30): DayLog {
  return {
    pms,
    completions: [],
    waterMl: 0,
    meals: [],
    cardio: null,
    gym: null,
    schedule: [],
    scheduleApproved: false,
    cardioTargetMinutes,
  };
}

export function getDay(state: AppState, date: string): DayLog {
  const recorded = state.days[date];
  if (recorded) return recorded;
  // Missing historical days must not inherit today's exemption or training
  // target: use the last known mode before that date. Once past the latest
  // stored day, the current profile supplies the next day's defaults.
  const knownDates = Object.keys(state.days).sort();
  const latest = knownDates.at(-1);
  if (latest && date < latest) {
    const previous = knownDates.reverse().find((day) => day < date);
    const log = previous ? state.days[previous] : undefined;
    return emptyDay(log?.pms ?? false, log?.cardioTargetMinutes ?? 30);
  }
  return emptyDay(state.pms, state.settings.cardioTargetMinutes);
}

export function gymType(state: AppState, date: string): 'upper' | 'lower' | null {
  if (!state.startedAt || date < state.startedAt) return null;
  const offset = dateDiff(state.startedAt, date);
  if (offset % 2 !== 0) return null;
  return (offset / 2) % 2 === 0 ? 'upper' : 'lower';
}

function weekBounds(date: string): { monday: string; sunday: string } {
  const day = utc(date).getUTCDay();
  const monday = addDays(date, -((day + 6) % 7));
  return { monday, sunday: addDays(monday, 6) };
}

function weeklyAlternative(state: AppState, date: string): boolean {
  const { monday } = weekBounds(date);
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    if (day > date || (state.startedAt && day < state.startedAt)) continue;
    const log = state.days[day];
    if (
      log?.completions.includes('alternative') ||
      (log?.cardio?.activity === 'swim' && log.cardio.minutes > 0)
    )
      return true;
  }
  return false;
}

export function getQuests(state: AppState, date: string): Quest[] {
  if (!state.startedAt || date < state.startedAt) return [];
  const log = getDay(state, date);
  const weekday = utc(date).getUTCDay();
  const quests: Quest[] = [];
  const push = (
    id: string,
    title: string,
    description: string,
    xp: number,
    attribute: Attribute,
    required: boolean,
    kind: Quest['kind'] = 'toggle',
    progress?: number,
    target = 1,
    unit = 'kali',
    complete?: boolean,
  ) => {
    const done = complete ?? log.completions.includes(id);
    quests.push({
      id,
      title,
      description,
      xp,
      attribute,
      attributeXp: Math.max(5, Math.round(xp / 2)),
      required,
      done,
      kind,
      progress: progress ?? (done ? 1 : 0),
      target,
      unit,
    });
  };
  if (!log.pms) {
    for (const [id, title] of PRAYERS)
      push(id, title, 'Waktu shalat mengikuti jadwal Bandung', 10, 'discipline', true);
    if (weekday >= 1 && weekday <= 5)
      push('fasting', 'Puasa', 'Senin–Jumat · sesuai kondisi tubuhmu', 25, 'discipline', true);
  }
  const gym = gymType(state, date);
  if (gym) {
    const done = Boolean(
      log.gym &&
      log.gym.minutes > 0 &&
      Number.isFinite(log.gym.minutes) &&
      log.gym.exercises.some((exercise) =>
        exercise.sets.some(
          (set) =>
            set.reps > 0 &&
            Number.isFinite(set.reps) &&
            set.weight >= 0 &&
            Number.isFinite(set.weight),
        ),
      ),
    );
    const description =
      weekday === 0 || weekday === 6
        ? 'Program pemula · catat sesi latihanmu'
        : log.pms
          ? classesAt(state, date).length
            ? 'Sebelum kuliah · program pemula'
            : 'Hari tanpa kuliah · program pemula'
          : 'Sebelum berbuka · waktu perlu dikonfirmasi';
    push(
      'gym',
      gym === 'upper' ? 'Upper Body' : 'Lower Body',
      description,
      50,
      'strength',
      true,
      'gym',
      done ? 1 : 0,
      1,
      'sesi',
      done,
    );
  }
  const minutes = Number.isFinite(log.cardio?.minutes) ? log.cardio!.minutes : 0;
  push(
    'cardio',
    log.cardio?.activity === 'swim' ? 'Cardio · Renang' : 'Cardio',
    `Target ${log.cardioTargetMinutes} menit · renang dapat menggantikan cardio`,
    25,
    'endurance',
    true,
    'cardio',
    minutes,
    log.cardioTargetMinutes,
    'menit',
    minutes >= log.cardioTargetMinutes,
  );
  push(
    'water',
    'Minum air',
    'Target 2 liter · pengingat menyesuaikan puasa',
    10,
    'discipline',
    true,
    'water',
    log.waterMl,
    2000,
    'ml',
    log.waterMl >= 2000,
  );
  push(
    'nutrition',
    'Catat makanan',
    'Catat asupanmu · batas pilihan 1.700 kkal',
    10,
    'discipline',
    true,
    'nutrition',
    log.meals.length,
    1,
    'catatan',
    log.meals.length > 0,
  );
  if (weekday === 0) {
    const done = weeklyAlternative(state, date);
    push(
      'alternative',
      'Olahraga alternatif',
      'Sekali seminggu · renang atau aktivitas lain',
      40,
      'endurance',
      true,
      'toggle',
      done ? 1 : 0,
      1,
      'sesi',
      done,
    );
  }
  push(
    'core',
    'Core pagi',
    'Sesi singkat · naikkan kesulitan setelah disetujui',
    10,
    'strength',
    false,
  );
  if (!log.pms) {
    push('dhuha', 'Shalat Dhuha', 'Quest sunnah · opsional', 10, 'discipline', false);
    push('tahajud', 'Shalat Tahajud', 'Quest sunnah · opsional', 15, 'discipline', false);
  }
  const study = state.adventure.studyLogs[date];
  if (studyDue(state, date) || study)
    push(
      'language',
      'Belajar bahasa',
      'IELTS Academic 20 menit + Jepang 10 menit',
      30,
      'discipline',
      studyDue(state, date),
      'language',
      Math.min(20, study?.ielts ?? 0) + Math.min(10, study?.japanese ?? 0),
      30,
      'menit',
      studyComplete(state, date),
    );
  const reading = readingOn(state, date);
  if (
    state.adventure.books.some(
      (b) => b.startedAt <= date && (!b.finishedAt || b.finishedAt >= date),
    ) ||
    reading.minutes > 0
  )
    push(
      'reading',
      'Baca & catat buku',
      'Minimal 10 menit · isi Spellbook dengan pemahaman',
      15,
      'discipline',
      false,
      'reading',
      reading.minutes,
      10,
      'menit',
      reading.minutes >= 10 && reading.pages > 0,
    );
  if (restDay(state, date))
    quests.forEach((q) => {
      q.required = false;
    });
  return quests;
}

function levelFor(xp: number): { xp: number; level: number; levelXp: number; nextLevelXp: number } {
  // Total EXP before level L is 25 * (L - 1) * (L + 2).
  const level = Math.max(1, Math.floor((-1 + Math.sqrt(9 + xp / 6.25)) / 2));
  const prior = 25 * (level - 1) * (level + 2);
  return { xp, level, levelXp: xp - prior, nextLevelXp: 100 + 50 * (level - 1) };
}

export function getStats(state: AppState, date: string): Stats {
  const active = Boolean(state.startedAt && state.startedAt <= date);
  const since = state.startedAt ?? date;
  const attributeXp: Record<Attribute, number> = { strength: 0, endurance: 0, discipline: 0 };
  const cache = new Map<string, Quest[]>();
  const questsAt = (day: string) => {
    if (!cache.has(day)) cache.set(day, getQuests(state, day));
    return cache.get(day)!;
  };
  const perfect = (day: string) => {
    const required = questsAt(day).filter((quest) => quest.required);
    return required.length > 0 && required.every((quest) => quest.done);
  };

  // Empty unrecorded days cannot earn rewards, except Sunday sport fulfilled by
  // a swim recorded earlier that week. Including only these dates avoids a
  // potentially huge calendar scan for an old imported start date.
  const dates = new Set<string>();
  if (active) {
    for (const [day, log] of Object.entries(state.days)) {
      if (day < since || day > date) continue;
      dates.add(day);
      if (
        log.completions.includes('alternative') ||
        (log.cardio?.activity === 'swim' && log.cardio.minutes > 0)
      ) {
        const { sunday } = weekBounds(day);
        if (sunday >= since && sunday <= date) dates.add(sunday);
      }
    }
  }
  if (active) {
    for (const key of Object.keys(state.adventure.studyLogs))
      if (key >= since && key <= date) dates.add(key);
    for (const r of state.adventure.readings)
      if (r.date >= since && r.date <= date) dates.add(r.date);
  }
  const sortedDates = [...dates].sort();
  let xp = 0;
  let completed = 0;
  let todayXp = 0;
  let bestStreak = 0;
  let run = 0;
  let lastPerfect: string | null = null;
  for (const day of sortedDates) {
    for (const quest of questsAt(day)) {
      if (!quest.done) continue;
      xp += quest.xp;
      attributeXp[quest.attribute] += quest.attributeXp;
      completed++;
      if (day === date) todayXp += quest.xp;
    }
    if (perfect(day)) {
      xp += 10;
      attributeXp.discipline += 5;
      if (day === date) todayXp += 10;
      let uninterrupted = lastPerfect !== null;
      if (lastPerfect)
        for (let key = addDays(lastPerfect, 1); key < day; key = addDays(key, 1))
          if (!restDay(state, key)) {
            uninterrupted = false;
            break;
          }
      run = uninterrupted ? run + 1 : 1;
      lastPerfect = day;
      bestStreak = Math.max(bestStreak, run);
    }
  }

  const currentMonth = date.slice(0, 7);
  const currentChallenge = active ? state.challenges[currentMonth] : undefined;
  let monthlyCount = 0;
  let monthlyTarget = currentChallenge?.target ?? 12;
  let monthlyComplete = false;
  let completedMonths = 0;
  if (active) {
    for (const [month, challenge] of Object.entries(state.challenges)) {
      if (month > currentMonth || challenge.joinedAt > date) continue;
      const sessions = monthlyDates(state, month, challenge, date);
      const complete = sessions.length >= challenge.target;
      if (month === currentMonth) {
        monthlyCount = sessions.length;
        monthlyTarget = challenge.target;
        monthlyComplete = complete;
      }
      if (complete) {
        const award = challenge.rewardXp ?? MONTHLY[monthKind(challenge)].xp;
        xp += award;
        completedMonths++;
        if (sessions[challenge.target - 1] === date)
          todayXp += challenge.rewardXp ?? MONTHLY[monthKind(challenge)].xp;
      }
    }
  }

  let streak = 0;
  if (active) {
    let cursor = perfect(date) || restDay(state, date) ? date : addDays(date, -1);
    while (cursor >= since) {
      if (restDay(state, cursor)) {
        cursor = addDays(cursor, -1);
        continue;
      }
      if (!perfect(cursor)) break;
      streak++;
      cursor = addDays(cursor, -1);
    }
  }
  const habitStreaks: Record<string, number> = {};
  for (const id of IDS) {
    let count = 0;
    if (active) {
      let cursor = date;
      while (cursor >= since) {
        if (restDay(state, cursor)) {
          cursor = addDays(cursor, -1);
          continue;
        }
        const quest = questsAt(cursor).find((item) => item.id === id);
        if (quest) {
          if (quest.done) count++;
          else if (cursor !== date) break;
        }
        cursor = addDays(cursor, -1);
      }
    }
    habitStreaks[id] = count;
  }

  if (active)
    for (const trial of TRIALS) {
      const finished = trialFinishedAt(state, trial.id, date);
      if (finished) {
        xp += trial.xp;
        if (finished === date) todayXp += trial.xp;
      }
    }
  const requiredToday = active ? questsAt(date).filter((quest) => quest.required) : [];
  return {
    ...levelFor(xp),
    attributes: {
      strength: levelFor(attributeXp.strength),
      endurance: levelFor(attributeXp.endurance),
      discipline: levelFor(attributeXp.discipline),
    },
    completed,
    todayCompleted: requiredToday.filter((quest) => quest.done).length,
    todayTarget: requiredToday.length,
    todayXp,
    streak,
    habitStreaks,
    monthlyCount,
    monthlyTarget,
    monthlyJoined: Boolean(currentChallenge && currentChallenge.joinedAt <= date),
    monthlyComplete,
    badges: longBadges(state, date, {
      quests: completed,
      streak: bestStreak,
      months: completedMonths,
    }),
  };
}

type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): value is UnknownRecord =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max: number, empty = false): value is string =>
  typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0);
const number = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const cardioTarget = (value: unknown): value is number =>
  number(value, 120) && value >= 30 && Number.isInteger(value);
const time = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const clock = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const formatClock = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

/** Validate and copy known fields; imported JSON never becomes trusted state as-is. */
export function validateState(input: unknown): AppState | null {
  try {
    if (
      !record(input) ||
      (input.version !== 1 && input.version !== 2 && input.version !== 3) ||
      !(input.startedAt === null || validDate(input.startedAt)) ||
      typeof input.pms !== 'boolean' ||
      !record(input.settings) ||
      !record(input.days) ||
      !record(input.challenges)
    )
      return null;
    if (
      (input.version === 2 || input.version === 3) &&
      (input.academicSchedules === undefined || input.academicExceptions === undefined)
    )
      return null;
    if (input.version === 3 && input.adventure === undefined) return null;
    const adventure = parseAdventure(input.adventure);
    if (!adventure) return null;
    const academic = parseAcademicConfig(input);
    if (!academic) return null;
    const settings = input.settings;
    const settingsTarget =
      settings.cardioTargetMinutes === undefined ? 30 : settings.cardioTargetMinutes;
    if (
      !text(settings.name, 80) ||
      !time(settings.wakeTime) ||
      !time(settings.sleepTime) ||
      !number(settings.commuteMinutes, 240) ||
      !Number.isInteger(settings.commuteMinutes) ||
      typeof settings.notificationsEnabled !== 'boolean' ||
      !cardioTarget(settingsTarget)
    )
      return null;
    if (Object.keys(input.days).length > 20_000 || Object.keys(input.challenges).length > 1200)
      return null;
    const state: AppState = {
      version: 3,
      adventure,
      ...academic,
      startedAt: input.startedAt,
      pms: input.pms,
      settings: {
        name: settings.name,
        wakeTime: settings.wakeTime,
        sleepTime: settings.sleepTime,
        commuteMinutes: settings.commuteMinutes,
        notificationsEnabled: settings.notificationsEnabled,
        cardioTargetMinutes: settingsTarget,
      },
      days: {},
      challenges: {},
    };
    for (const [date, value] of Object.entries(input.days)) {
      if (
        !validDate(date) ||
        !record(value) ||
        typeof value.pms !== 'boolean' ||
        !Array.isArray(value.completions) ||
        !value.completions.every(
          (id) => typeof id === 'string' && (IDS as readonly string[]).includes(id),
        ) ||
        !number(value.waterMl, 30_000) ||
        !Array.isArray(value.meals) ||
        value.meals.length > 100 ||
        !Array.isArray(value.schedule) ||
        value.schedule.length > 100 ||
        typeof value.scheduleApproved !== 'boolean'
      )
        return null;
      const dayTarget = value.cardioTargetMinutes === undefined ? 30 : value.cardioTargetMinutes;
      if (!cardioTarget(dayTarget)) return null;
      const log = emptyDay(value.pms, dayTarget);
      log.completions = [...new Set(value.completions as string[])];
      log.waterMl = value.waterMl;
      log.scheduleApproved = value.scheduleApproved;
      for (const meal of value.meals) {
        if (
          !record(meal) ||
          !text(meal.id, 100) ||
          !text(meal.name, 200) ||
          !number(meal.calories, 20_000) ||
          !time(meal.time) ||
          log.meals.some((item) => item.id === meal.id)
        )
          return null;
        log.meals.push({ id: meal.id, name: meal.name, calories: meal.calories, time: meal.time });
      }
      if (value.cardio !== null) {
        const c = value.cardio;
        if (
          !record(c) ||
          typeof c.activity !== 'string' ||
          !ACTIVITIES.includes(c.activity) ||
          !number(c.minutes, 1440) ||
          !(c.distanceKm === null || number(c.distanceKm, 1500)) ||
          !(c.incline === null || number(c.incline, 100)) ||
          !['light', 'medium', 'hard'].includes(String(c.intensity)) ||
          (c.continuous !== undefined && typeof c.continuous !== 'boolean')
        )
          return null;
        log.cardio = {
          activity: c.activity as Activity,
          minutes: c.minutes,
          distanceKm: c.distanceKm,
          incline: c.incline,
          intensity: c.intensity as CardioSession['intensity'],
          ...(c.continuous !== undefined ? { continuous: c.continuous === true } : {}),
        };
      }
      if (value.gym !== null) {
        const g = value.gym;
        if (
          !record(g) ||
          !['upper', 'lower'].includes(String(g.type)) ||
          !number(g.minutes, 1440) ||
          !['comfortable', 'hard'].includes(String(g.feeling)) ||
          !Array.isArray(g.exercises) ||
          g.exercises.length > 30
        )
          return null;
        const exercises: GymExercise[] = [];
        for (const exercise of g.exercises) {
          if (
            !record(exercise) ||
            !text(exercise.name, 200) ||
            !Array.isArray(exercise.sets) ||
            exercise.sets.length > 50
          )
            return null;
          const sets: GymSet[] = [];
          for (const set of exercise.sets) {
            if (!record(set) || !number(set.reps, 1000) || !number(set.weight, 2000)) return null;
            sets.push({ reps: set.reps, weight: set.weight });
          }
          exercises.push({ name: exercise.name, sets });
        }
        log.gym = {
          type: g.type as GymSession['type'],
          minutes: g.minutes,
          exercises,
          feeling: g.feeling as GymSession['feeling'],
        };
      }
      for (const item of value.schedule) {
        if (
          !record(item) ||
          !text(item.id, 100) ||
          !text(item.title, 200) ||
          !time(item.start) ||
          !time(item.end) ||
          clock(item.end) <= clock(item.start) ||
          !['class', 'gym', 'cardio', 'personal', 'study'].includes(String(item.kind)) ||
          typeof item.locked !== 'boolean' ||
          log.schedule.some((existing) => existing.id === item.id)
        )
          return null;
        log.schedule.push({
          id: item.id,
          title: item.title,
          start: item.start,
          end: item.end,
          kind: item.kind as ScheduledItem['kind'],
          locked: item.locked,
        });
      }
      const ordered = [...log.schedule].sort((a, b) => clock(a.start) - clock(b.start));
      if (
        ordered.some(
          (item, index) => index > 0 && clock(ordered[index - 1].end) > clock(item.start),
        )
      )
        return null;
      state.days[date] = log;
    }
    for (const [month, value] of Object.entries(input.challenges)) {
      if (
        !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month) ||
        !record(value) ||
        !number(value.target, 31) ||
        value.target < 1 ||
        !Number.isInteger(value.target) ||
        !validDate(value.joinedAt) ||
        value.joinedAt.slice(0, 7) !== month ||
        (value.kind !== undefined && !Object.hasOwn(MONTHLY, String(value.kind))) ||
        (value.rewardXp !== undefined &&
          (!number(value.rewardXp, 1000) ||
            value.rewardXp < 1 ||
            !Number.isInteger(value.rewardXp)))
      )
        return null;
      state.challenges[month] = {
        target: value.target,
        joinedAt: value.joinedAt,
        ...(value.kind !== undefined ? { kind: value.kind as MonthlyKind } : {}),
        ...(value.rewardXp !== undefined ? { rewardXp: value.rewardXp as number } : {}),
      };
    }
    return state;
  } catch {
    return null;
  }
}

interface Interval {
  start: number;
  end: number;
}
function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Produce a draft only. No selector ever applies or persists a proposed schedule. */
export function proposeSchedule(
  state: AppState,
  date: string,
): { items: ScheduledItem[]; warning: string | null } {
  if (!state.startedAt || date < state.startedAt)
    return { items: [], warning: 'Mulai Perjalanan terlebih dahulu untuk menyusun jadwal.' };
  const weekday = utc(date).getUTCDay();
  const wake = clock(state.settings.wakeTime);
  const sleep = clock(state.settings.sleepTime);
  const commute = state.settings.commuteMinutes;
  const cardioMinutes = getDay(state, date).cardioTargetMinutes;
  const items: ScheduledItem[] = [];
  const blocked: Interval[] = [];
  const warnings: string[] = [];
  const add = (
    id: string,
    title: string,
    start: number,
    end: number,
    kind: ScheduledItem['kind'],
    locked: boolean,
  ) => {
    items.push({ id, title, start: formatClock(start), end: formatClock(end), kind, locked });
    blocked.push({ start, end });
  };
  const classes = classesAt(state, date);
  const classTime = classes.length
    ? { start: clock(classes[0].start), end: clock(classes.at(-1)!.end) }
    : null;
  if (classTime && commute > 0 && classTime.start > 0)
    add(
      'commute-out',
      'Perjalanan ke kampus',
      Math.max(0, classTime.start - commute),
      classTime.start,
      'personal',
      true,
    );
  for (const block of classes)
    add(`class-${block.id}`, block.title, clock(block.start), clock(block.end), 'class', true);
  if (classTime && commute > 0 && classTime.end < 1439)
    add(
      'commute-home',
      'Perjalanan pulang',
      classTime.end,
      Math.min(1439, classTime.end + commute),
      'personal',
      true,
    );
  if (sleep <= wake)
    return {
      items,
      warning:
        'Atur jam bangun dan tidur dalam satu hari terlebih dahulu; jadwal lintas tengah malam perlu ditinjau manual.',
    };
  if (classTime && (classTime.start - commute < wake || classTime.end + commute > sleep))
    warnings.push(
      'Jam kuliah/perjalanan berada di luar waktu aktif pilihanmu. Tinjau jam bangun dan tidur.',
    );

  // Preserve user-entered personal commitments; generated commute entries
  // are rebuilt from settings to avoid duplicating them on each proposal.
  for (const item of getDay(state, date).schedule) {
    if (item.kind !== 'personal' || ['commute-out', 'commute-home'].includes(item.id)) continue;
    const interval = { start: clock(item.start), end: clock(item.end) };
    if (blocked.some((block) => overlaps(interval, block))) {
      warnings.push(
        `Kegiatan tetap “${item.title}” berbenturan dengan kuliah/perjalanan; sesuaikan secara manual.`,
      );
      continue;
    }
    add(item.id, item.title, interval.start, interval.end, item.kind, item.locked);
  }
  const free = (start: number, end: number): Interval[] => {
    const result: Interval[] = [];
    let cursor = Math.max(wake, start);
    const limit = Math.min(sleep, end);
    for (const block of [...blocked].sort((a, b) => a.start - b.start)) {
      if (block.end <= cursor || block.start >= limit) continue;
      if (block.start > cursor) result.push({ start: cursor, end: Math.min(block.start, limit) });
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < limit) result.push({ start: cursor, end: limit });
    return result;
  };
  const slot = (duration: number, start: number, end: number, latest = false): number | null => {
    const windows = free(start, end).filter((window) => window.end - window.start >= duration);
    const found = latest ? windows.at(-1) : windows[0];
    return found ? (latest ? found.end - duration : found.start) : null;
  };
  if (restDay(state, date)) {
    items.sort((a, b) => clock(a.start) - clock(b.start));
    return {
      items,
      warning:
        'Rest Day aktif. Usulan quest latihan/belajar dilewati; agenda yang sudah disetujui tetap perlu ditinjau sendiri.',
    };
  }
  const fasting = !getDay(state, date).pms && weekday >= 1 && weekday <= 5;
  const gym = gymType(state, date);
  let cardioScheduled = false;
  if (fasting)
    warnings.push(
      'Batas 17.15 hanya jendela perencanaan, bukan waktu berbuka. Konfirmasikan jadwal Maghrib Bandung sebelum menyetujui.',
    );
  if (gym && fasting) {
    const combinedMinutes = 35 + 5 + cardioMinutes;
    const start = slot(combinedMinutes, 15 * 60, 17 * 60 + 15, true);
    if (start === null) {
      warnings.push(
        `Waktu sebelum berbuka tidak cukup untuk gym 35 menit dan cardio ${cardioMinutes} menit setelah kuliah serta perjalanan. Gym belum dijadwalkan; pilih penyesuaian sendiri.`,
      );
    } else {
      add('gym', gym === 'upper' ? 'Upper Body' : 'Lower Body', start, start + 35, 'gym', false);
      add(
        'cardio',
        `Cardio · ${cardioMinutes} menit`,
        start + 40,
        start + combinedMinutes,
        'cardio',
        false,
      );
      cardioScheduled = true;
    }
  } else if (gym) {
    const end = classTime ? Math.min(sleep, classTime.start - commute) : Math.min(sleep, 10 * 60);
    const start = slot(35, wake, end, Boolean(classTime));
    if (start === null)
      warnings.push(
        'Gym 35 menit belum muat sebelum kuliah/waktu aktif. Sesuaikan usulan tanpa memindahkan tugas ke hari lain.',
      );
    else add('gym', gym === 'upper' ? 'Upper Body' : 'Lower Body', start, start + 35, 'gym', false);
  }
  if (!cardioScheduled) {
    const afternoon = fasting ? slot(cardioMinutes, 15 * 60, 17 * 60 + 15, true) : null;
    const preferred = afternoon ?? slot(cardioMinutes, Math.min(wake + 30, sleep), sleep);
    const start = preferred ?? slot(cardioMinutes, wake, sleep);
    if (start === null)
      warnings.push(
        `Cardio ${cardioMinutes} menit belum mendapat slot bebas. Pilih waktu secara manual; tugas tidak dipindahkan otomatis.`,
      );
    else
      add(
        'cardio',
        `Cardio · ${cardioMinutes} menit`,
        start,
        start + cardioMinutes,
        'cardio',
        false,
      );
  }
  if (studyDue(state, date)) {
    const studyStart = slot(30, 18 * 60, sleep) ?? slot(30, wake, sleep);
    if (studyStart === null)
      warnings.push('Belajar bahasa 30 menit belum mendapat slot. Sesuaikan secara manual.');
    else add('study', 'IELTS 20 + Jepang 10', studyStart, studyStart + 30, 'study', false);
  }
  items.sort((a, b) => clock(a.start) - clock(b.start));
  return { items, warning: warnings.length ? warnings.join(' ') : null };
}
