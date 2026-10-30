import {
  ACHIEVEMENTS,
  TRIALS,
  shards,
  bookPages,
  restDay,
  studyDue,
  adventureMetrics,
  trialFinishedAt,
  canJoinTrial,
} from './long-game';
import { IELTS_STAGES, JAPANESE_STAGES, lessonAt } from './learning';
import { academicScheduleAt, classesAt, defaultAcademicWeek, parseClassBlocks } from './academic';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  createState,
  dateDiff,
  dateLabel,
  emptyDay,
  getDay,
  getQuests,
  getStats,
  gymType,
  proposeSchedule,
  todayKey,
  validateState,
  type AppState,
  type DayLog,
} from './engine';

function started(date = '2026-11-02', pms = false): AppState {
  const state = createState();
  state.startedAt = date;
  state.pms = pms;
  return state;
}

function day(state: AppState, date: string): DayLog {
  return (state.days[date] ??= emptyDay(state.pms));
}

function finishRequired(state: AppState, date: string): void {
  const log = day(state, date);
  for (const quest of getQuests(state, date)) {
    if (quest.required && quest.kind === 'toggle') log.completions.push(quest.id);
  }
  log.cardio = { activity: 'walk', minutes: 30, distanceKm: 2, incline: null, intensity: 'light' };
  log.waterMl = 2000;
  log.meals = [{ id: `meal-${date}`, name: 'Makan siang', calories: 650, time: '12:00' }];
  const type = gymType(state, date);
  if (type)
    log.gym = {
      type,
      minutes: 35,
      exercises: [{ name: 'Latihan', sets: [{ reps: 10, weight: 5 }] }],
      feeling: 'comfortable',
    };
}

test('new journey has no demo progress or rewards before Start', () => {
  const state = createState();
  assert.equal(state.startedAt, null);
  assert.deepEqual(getQuests(state, '2026-11-02'), []);
  const stats = getStats(state, '2026-11-02');
  assert.equal(stats.xp, 0);
  assert.equal(stats.level, 1);
  assert.equal(stats.nextLevelXp, 100);
  assert.equal(stats.todayTarget, 0);
  assert.equal(stats.monthlyJoined, false);
  assert.ok(stats.badges.every((badge) => !badge.unlocked));
  assert.equal(state.settings.name, 'Iris');
  assert.equal(state.settings.wakeTime, '05:00');
});

test('WIB day boundary and date arithmetic are independent of host timezone', () => {
  assert.equal(todayKey(new Date('2026-11-02T16:59:59Z')), '2026-11-02');
  assert.equal(todayKey(new Date('2026-11-02T17:00:00Z')), '2026-11-03');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dateDiff('2026-10-30', '2026-11-02'), 3);
  assert.match(dateLabel('2026-11-02'), /Senin.*2.*November.*2026/);
  assert.throws(() => addDays('2026-02-30', 1), RangeError);
});

test('gym cadence is every second day across weeks, Upper then Lower', () => {
  const state = started();
  assert.equal(gymType(state, '2026-11-01'), null);
  assert.equal(gymType(state, '2026-11-02'), 'upper');
  assert.equal(gymType(state, '2026-11-03'), null);
  assert.equal(gymType(state, '2026-11-04'), 'lower');
  assert.equal(gymType(state, '2026-11-06'), 'upper');
  assert.equal(gymType(state, '2026-11-08'), 'lower');
  assert.equal(gymType(state, '2026-11-10'), 'upper');
});

test('PMS omits all prayers and fasting, preserves stored facts and other days', () => {
  const state = started();
  finishRequired(state, '2026-11-02');
  const log = day(state, '2026-11-03');
  log.completions = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'fasting', 'dhuha', 'tahajud'];
  const before = getStats(state, '2026-11-03').xp;
  const storedCompletions = [...log.completions];
  log.pms = true;
  const ids = getQuests(state, '2026-11-03').map((quest) => quest.id);
  for (const id of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'fasting', 'dhuha', 'tahajud'])
    assert.ok(!ids.includes(id));
  assert.deepEqual(log.completions, storedCompletions);
  assert.equal(getStats(state, '2026-11-03').xp, before - 100);
  assert.ok(getQuests(state, '2026-11-02').some((quest) => quest.id === 'fajr' && quest.done));
  log.pms = false;
  assert.equal(getStats(state, '2026-11-03').xp, before);
});

test('fasting is weekdays only; optional quests never inflate required target', () => {
  const state = started();
  assert.ok(getQuests(state, '2026-11-06').some((quest) => quest.id === 'fasting'));
  assert.ok(!getQuests(state, '2026-11-07').some((quest) => quest.id === 'fasting'));
  assert.ok(!getQuests(state, '2026-11-08').some((quest) => quest.id === 'fasting'));
  day(state, '2026-11-02').completions.push('core', 'dhuha', 'tahajud');
  const stats = getStats(state, '2026-11-02');
  assert.equal(stats.todayTarget, 10);
  assert.equal(stats.todayCompleted, 0);
  assert.equal(stats.completed, 3);
  assert.equal(stats.todayXp, 35);
});

test('session facts, water and meal logging determine completion, not checkbox abuse', () => {
  const state = started('2026-11-02', true);
  const log = day(state, '2026-11-02');
  log.completions = ['cardio', 'gym', 'water', 'nutrition', 'cardio'];
  log.cardio = {
    activity: 'swim',
    minutes: 29,
    distanceKm: 0.5,
    incline: null,
    intensity: 'light',
  };
  log.gym = {
    type: 'upper',
    minutes: 35,
    exercises: [{ name: 'Chest press', sets: [{ reps: 0, weight: 5 }] }],
    feeling: 'comfortable',
  };
  log.waterMl = 1999;
  assert.equal(getStats(state, '2026-11-02').xp, 0);
  log.cardio.minutes = 42;
  log.gym.exercises[0].sets[0].reps = 10;
  log.waterMl = 2000;
  log.meals.push({ id: 'meal', name: 'Asupan tercatat', calories: 2100, time: '18:30' });
  const stats = getStats(state, '2026-11-02');
  assert.equal(stats.xp, 105); // 50 gym +25 cardio +10 water +10 logging +10 daily bonus.
  assert.equal(stats.level, 2);
  assert.equal(stats.levelXp, 5);
  assert.equal(stats.nextLevelXp, 150);
  assert.equal(stats.attributes.strength.xp, 25);
  assert.equal(stats.attributes.endurance.xp, 13);
  assert.equal(stats.attributes.discipline.xp, 15);
  assert.equal(getQuests(state, '2026-11-02').find((quest) => quest.id === 'cardio')?.progress, 42);
  log.meals[0].calories = 300;
  assert.equal(getStats(state, '2026-11-02').xp, 105, 'lower food intake never earns more EXP');
  assert.equal(getStats(state, '2026-11-02').xp, 105, 'repeated reads never claim rewards again');
});

test('undo reverses only the corresponding earned reward and invalidated day bonus', () => {
  const state = started('2026-11-02', true);
  finishRequired(state, '2026-11-02');
  finishRequired(state, '2026-11-03');
  assert.equal(getStats(state, '2026-11-03').xp, 160);
  day(state, '2026-11-02').waterMl = 1750;
  assert.equal(getStats(state, '2026-11-03').xp, 140);
  day(state, '2026-11-02').waterMl = 2000;
  assert.equal(getStats(state, '2026-11-03').xp, 160);
  assert.equal(getStats(state, '2026-11-04').xp, 160, 'a missed day never removes past rewards');
});

test('facts before start or after the queried day never earn rewards', () => {
  const state = started('2026-11-02', true);
  day(state, '2026-11-01').completions.push('core');
  finishRequired(state, '2026-11-02');
  finishRequired(state, '2026-11-04');
  assert.equal(getStats(state, '2026-11-01').xp, 0);
  assert.equal(getStats(state, '2026-11-02').xp, 105);
  assert.equal(getStats(state, '2026-11-03').xp, 105);
  assert.equal(getStats(state, '2026-11-04').xp, 210);
});

test('perfect-day streak ignores an unfinished today until the next day', () => {
  const state = started('2026-11-02', true);
  finishRequired(state, '2026-11-02');
  finishRequired(state, '2026-11-03');
  assert.equal(getStats(state, '2026-11-03').streak, 2);
  assert.equal(getStats(state, '2026-11-04').streak, 2);
  assert.equal(getStats(state, '2026-11-05').streak, 0);
  assert.equal(getStats(state, '2026-11-05').xp, 160);
});

test('prayer habit streak skips PMS exemption dates, water habit still requires action', () => {
  const state = started();
  day(state, '2026-11-02').completions.push('fajr');
  day(state, '2026-11-02').waterMl = 2000;
  day(state, '2026-11-03').pms = true;
  day(state, '2026-11-04').completions.push('fajr');
  assert.equal(getStats(state, '2026-11-04').habitStreaks.fajr, 2);
  assert.equal(getStats(state, '2026-11-04').habitStreaks.water, 0);
});

test('swimming fulfills weekly alternative only when Sunday is reached', () => {
  const state = started('2026-11-02', true);
  day(state, '2026-11-07').cardio = {
    activity: 'swim',
    minutes: 30,
    distanceKm: 0.5,
    incline: null,
    intensity: 'light',
  };
  assert.equal(getStats(state, '2026-11-07').xp, 25);
  assert.equal(getStats(state, '2026-11-08').xp, 65);
  const alternative = getQuests(state, '2026-11-08').find((quest) => quest.id === 'alternative');
  assert.equal(alternative?.done, true);
  assert.equal(getStats(state, '2026-11-09').xp, 65);
  assert.equal(
    getQuests(state, '2026-11-15').find((quest) => quest.id === 'alternative')?.done,
    false,
  );
});

test('monthly reward is once per month, after joining, and reverses with qualifying facts', () => {
  const state = started('2026-11-01', true);
  state.challenges['2026-11'] = { joinedAt: '2026-11-03', target: 12 };
  for (let i = 0; i < 14; i++)
    day(state, addDays('2026-11-01', i)).cardio = {
      activity: 'walk',
      minutes: 60,
      distanceKm: 5,
      incline: 1,
      intensity: 'medium',
    };
  const prior = getStats(state, '2026-11-13');
  assert.equal(prior.monthlyCount, 11);
  assert.equal(prior.monthlyComplete, false);
  assert.equal(prior.xp, 13 * 25);
  const complete = getStats(state, '2026-11-14');
  assert.equal(complete.monthlyCount, 12);
  assert.equal(complete.monthlyComplete, true);
  assert.equal(complete.xp, 14 * 25 + 200);
  assert.equal(complete.todayXp, 225);
  assert.equal(
    getStats(state, '2026-11-15').todayXp,
    0,
    'completed month does not award again each day',
  );
  day(state, '2026-11-14').cardio!.minutes = 29;
  assert.equal(getStats(state, '2026-11-14').xp, 13 * 25);
  assert.equal(getStats(state, '2026-11-14').monthlyComplete, false);
});

test('past monthly achievements persist in a new month without joining it', () => {
  const state = started('2026-10-01', true);
  state.challenges['2026-10'] = { joinedAt: '2026-10-01', target: 12 };
  for (let i = 0; i < 12; i++)
    day(state, addDays('2026-10-01', i)).cardio = {
      activity: 'walk',
      minutes: 30,
      distanceKm: null,
      incline: null,
      intensity: 'light',
    };
  const stats = getStats(state, '2026-11-01');
  assert.equal(stats.xp, 500);
  assert.equal(stats.monthlyJoined, false);
  assert.equal(stats.monthlyCount, 0);
  assert.equal(stats.badges.find((badge) => badge.id === 'emerald-current')?.unlocked, true);
});

test('seven-day achievement remains unlocked after a later streak break', () => {
  const state = started('2026-11-02', true);
  for (let i = 0; i < 7; i++) finishRequired(state, addDays('2026-11-02', i));
  const stats = getStats(state, '2026-11-10');
  assert.equal(stats.streak, 0);
  const badge = stats.badges.find((item) => item.id === 'seven-day-current');
  assert.equal(badge?.unlocked, true);
  assert.equal(badge?.progress, 7);
});

test('selectors and getDay fallback do not mutate state or share empty arrays', () => {
  const state = started();
  const original = JSON.stringify(state);
  getDay(state, '2026-11-02').completions.push('fajr');
  assert.equal(getDay(state, '2026-11-02').completions.length, 0);
  getQuests(state, '2026-11-02');
  getStats(state, '2026-11-02');
  proposeSchedule(state, '2026-11-02');
  assert.equal(JSON.stringify(state), original);
});

test('import validator accepts valid state, normalizes duplicate toggles and drops unknown fields', () => {
  const state = started('2026-11-02', true);
  finishRequired(state, '2026-11-02');
  state.days['2026-11-02'].completions.push('core', 'core');
  const unknown = { ...state, unexpected: 'ignored' };
  const result = validateState(unknown);
  assert.ok(result);
  assert.equal(result.days['2026-11-02'].completions.filter((id) => id === 'core').length, 1);
  assert.ok(!('unexpected' in result));
  assert.notEqual(result, unknown);
  assert.notEqual(result.days['2026-11-02'], state.days['2026-11-02']);
});

test('import validator rejects corrupt dates, negative/NaN values and malformed sessions', () => {
  assert.equal(validateState(null), null);
  assert.equal(validateState({ version: 2 }), null);
  for (const mutate of [
    (state: AppState) => {
      state.startedAt = '2026-02-30';
    },
    (state: AppState) => {
      state.settings.wakeTime = '25:00';
    },
    (state: AppState) => {
      day(state, '2026-11-02').waterMl = -1;
    },
    (state: AppState) => {
      day(state, '2026-11-02').waterMl = Number.NaN;
    },
    (state: AppState) => {
      day(state, '2026-02-30');
    },
    (state: AppState) => {
      day(state, '2026-11-02').completions.push('invented-quest');
    },
    (state: AppState) => {
      state.challenges['2026-11'] = { target: 0, joinedAt: '2026-11-02' };
    },
    (state: AppState) => {
      state.challenges['2026-11'] = { target: 12, joinedAt: '2026-10-02' };
    },
    (state: AppState) => {
      day(state, '2026-11-02').cardio = {
        activity: 'walk',
        minutes: Infinity,
        distanceKm: null,
        incline: null,
        intensity: 'light',
      };
    },
  ]) {
    const state = started();
    mutate(state);
    assert.equal(validateState(state), null);
  }
});

test('import validator rejects overlapping approved schedules', () => {
  const state = started();
  day(state, '2026-11-02').schedule = [
    { id: 'one', title: 'Kuliah', start: '10:00', end: '17:00', kind: 'class', locked: true },
    { id: 'two', title: 'Gym', start: '16:30', end: '17:05', kind: 'gym', locked: false },
  ];
  assert.equal(validateState(state), null);
});

test('fasting Monday conflict is disclosed; no gym is invented during class or moved', () => {
  const state = started();
  const original = JSON.stringify(state);
  const result = proposeSchedule(state, '2026-11-02');
  assert.ok(!result.items.some((item) => item.kind === 'gym'));
  assert.ok(result.items.some((item) => item.kind === 'cardio'));
  assert.match(result.warning!, /tidak cukup.*gym.*cardio/);
  assert.match(result.warning!, /bukan waktu berbuka/);
  assert.equal(JSON.stringify(state), original);
  assert.equal(state.days['2026-11-02'], undefined);
});

test('fasting Thursday fits gym/cardio before conservative planning cutoff', () => {
  const state = started('2026-11-03');
  const result = proposeSchedule(state, '2026-11-05');
  const gym = result.items.find((item) => item.kind === 'gym')!;
  const cardio = result.items.find((item) => item.kind === 'cardio')!;
  assert.equal(gym.title, 'Lower Body');
  assert.ok(gym.start >= '15:00');
  assert.ok(cardio.end <= '17:15');
  assert.ok(gym.end <= cardio.start);
  assert.match(result.warning!, /Konfirmasikan.*Maghrib Bandung/);
});

test('nonfasting gym is before class, while commute buffers remain protected', () => {
  const state = started('2026-11-03', true);
  const result = proposeSchedule(state, '2026-11-03');
  const gym = result.items.find((item) => item.kind === 'gym')!;
  assert.ok(gym.start >= state.settings.wakeTime);
  assert.ok(gym.end <= '09:30');
  assert.ok(
    result.items.some(
      (item) => item.id === 'commute-out' && item.start === '09:30' && item.end === '10:00',
    ),
  );
  assert.ok(
    result.items.some(
      (item) => item.id === 'commute-home' && item.start === '17:00' && item.end === '17:30',
    ),
  );
  assert.equal(result.warning, null);
});

test('insufficient nonfasting morning does not silently move gym after class', () => {
  const state = started('2026-11-03', true);
  state.settings.wakeTime = '09:10';
  const result = proposeSchedule(state, '2026-11-03');
  assert.ok(!result.items.some((item) => item.kind === 'gym'));
  assert.match(result.warning!, /Gym 35 menit belum muat sebelum kuliah/);
});

test('all representative proposals are ordered, nonoverlapping and keep training inside waking hours', () => {
  for (const pms of [false, true])
    for (const commute of [0, 30, 60]) {
      const state = started('2026-11-02', pms);
      state.settings.commuteMinutes = commute;
      for (let offset = 0; offset < 14; offset++) {
        const date = addDays(state.startedAt!, offset);
        const result = proposeSchedule(state, date);
        for (let i = 0; i < result.items.length; i++) {
          const item = result.items[i];
          assert.ok(item.start < item.end, `${date} ${item.title}`);
          if (i > 0)
            assert.ok(result.items[i - 1].end <= item.start, `${date}: overlapping proposal`);
          if (item.kind === 'gym' || item.kind === 'cardio') {
            assert.ok(item.start >= state.settings.wakeTime);
            assert.ok(item.end <= state.settings.sleepTime);
          }
        }
      }
    }
});

test('locked personal commitments survive proposals and unavailable wake window is explicit', () => {
  const state = started('2026-11-07', true);
  day(state, '2026-11-07').schedule = [
    {
      id: 'personal',
      title: 'Janji pribadi',
      start: '06:00',
      end: '09:00',
      kind: 'personal',
      locked: true,
    },
  ];
  let result = proposeSchedule(state, '2026-11-07');
  assert.ok(result.items.some((item) => item.id === 'personal' && item.start === '06:00'));
  for (let i = 1; i < result.items.length; i++)
    assert.ok(result.items[i - 1].end <= result.items[i].start);
  state.settings.wakeTime = '22:00';
  state.settings.sleepTime = '05:00';
  result = proposeSchedule(state, '2026-11-07');
  assert.ok(result.items.every((item) => item.kind !== 'gym' && item.kind !== 'cardio'));
  assert.match(result.warning!, /lintas tengah malam/);
});

test('an approved higher cardio target preserves historical rewards and keeps challenge minimum independent', () => {
  const today = todayKey();
  const yesterday = addDays(today, -1);
  const state = started(yesterday, true);
  day(state, yesterday).cardio = {
    activity: 'walk',
    minutes: 30,
    distanceKm: 2,
    incline: null,
    intensity: 'light',
  };
  state.settings.cardioTargetMinutes = 35;
  state.days[today] = emptyDay(true, 35);
  state.days[today].cardio = {
    activity: 'walk',
    minutes: 30,
    distanceKm: 2,
    incline: null,
    intensity: 'light',
  };
  state.challenges[today.slice(0, 7)] = { target: 12, joinedAt: today };
  assert.equal(getQuests(state, yesterday).find((quest) => quest.id === 'cardio')?.target, 30);
  assert.equal(getQuests(state, yesterday).find((quest) => quest.id === 'cardio')?.done, true);
  assert.equal(getQuests(state, today).find((quest) => quest.id === 'cardio')?.target, 35);
  assert.equal(getQuests(state, today).find((quest) => quest.id === 'cardio')?.done, false);
  assert.equal(getStats(state, today).xp, 25);
  assert.equal(
    getStats(state, today).monthlyCount,
    1,
    'monthly challenge remains 12 sessions of at least 30 minutes',
  );
  state.days[today].cardio!.minutes = 35;
  assert.equal(getStats(state, today).xp, 50);
  assert.equal(getStats(state, today).monthlyCount, 1);
  assert.equal(getDay(state, addDays(today, 1)).cardioTargetMinutes, 35);
  assert.equal(getDay(state, addDays(yesterday, -1)).cardioTargetMinutes, 30);
});

test('cardio target imports migrate missing fields to 30 and validate both daily and profile bounds', () => {
  const state = started();
  state.days['2026-11-02'] = emptyDay();
  const legacy = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  delete (legacy.settings as Record<string, unknown>).cardioTargetMinutes;
  delete (legacy.days as Record<string, Record<string, unknown>>)['2026-11-02'].cardioTargetMinutes;
  const migrated = validateState(legacy)!;
  assert.equal(migrated.settings.cardioTargetMinutes, 30);
  assert.equal(migrated.days['2026-11-02'].cardioTargetMinutes, 30);
  for (const target of [30, 35, 120]) {
    const valid = structuredClone(state);
    valid.settings.cardioTargetMinutes = target;
    valid.days['2026-11-02'].cardioTargetMinutes = target;
    assert.equal(validateState(valid)?.settings.cardioTargetMinutes, target);
    assert.equal(validateState(valid)?.days['2026-11-02'].cardioTargetMinutes, target);
  }
  for (const target of [29, 121, 30.5, Infinity, null, '35']) {
    const profile = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    (profile.settings as Record<string, unknown>).cardioTargetMinutes = target;
    assert.equal(validateState(profile), null);
    const daily = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    (daily.days as Record<string, Record<string, unknown>>)['2026-11-02'].cardioTargetMinutes =
      target;
    assert.equal(validateState(daily), null);
  }
});

test('schedule duration follows approved cardio target without overlaps or truncated sessions', () => {
  const date = todayKey();
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  for (const target of [35, 60, 120])
    for (const pms of [false, true]) {
      const state = started(date, pms);
      state.settings.cardioTargetMinutes = target;
      for (let offset = 0; offset < 14; offset++) {
        const result = proposeSchedule(state, addDays(date, offset));
        const cardio = result.items.find((item) => item.kind === 'cardio');
        assert.ok(cardio, 'there is sufficient daily free time for the complete cardio session');
        assert.equal(minutes(cardio.end) - minutes(cardio.start), target);
        assert.equal(cardio.title, `Cardio · ${target} menit`);
        for (let index = 0; index < result.items.length; index++) {
          const item = result.items[index];
          if (index > 0) assert.ok(result.items[index - 1].end <= item.start);
          if (item.kind === 'gym' || item.kind === 'cardio') {
            assert.ok(item.start >= state.settings.wakeTime);
            assert.ok(item.end <= state.settings.sleepTime);
          }
        }
      }
    }
});

test('missing historical days infer their preceding mode and target instead of today’s PMS setting', () => {
  const state = started('2026-11-02');
  state.days['2026-11-02'] = emptyDay(false, 30);
  state.days['2026-11-02'].completions.push('fajr');
  state.days['2026-11-04'] = emptyDay(true, 35);
  state.pms = true;
  state.settings.cardioTargetMinutes = 40;
  const missing = getDay(state, '2026-11-03');
  assert.equal(missing.pms, false);
  assert.equal(missing.cardioTargetMinutes, 30);
  assert.equal(
    getStats(state, '2026-11-04').habitStreaks.fajr,
    0,
    'a genuinely missed prayer day must break the streak',
  );
  assert.equal(getDay(state, '2026-11-05').pms, true);
  assert.equal(getDay(state, '2026-11-05').cardioTargetMinutes, 40);
  assert.equal(
    getDay(state, '2026-11-04').cardioTargetMinutes,
    35,
    'stored target wins over current profile',
  );
  assert.equal(
    state.days['2026-11-03'],
    undefined,
    'historical inference never writes invented facts',
  );
});

test('missing history before any known log defaults to non-PMS and 30 while stored exemptions remain stable', () => {
  const state = started('2026-11-01', true);
  state.settings.cardioTargetMinutes = 45;
  state.days['2026-11-03'] = emptyDay(true, 35);
  assert.equal(getDay(state, '2026-11-01').pms, false);
  assert.equal(getDay(state, '2026-11-01').cardioTargetMinutes, 30);
  const original = JSON.stringify(state.days);
  state.pms = false;
  assert.equal(getDay(state, '2026-11-01').pms, false);
  assert.equal(getDay(state, '2026-11-03').pms, true);
  assert.equal(getDay(state, '2026-11-03').cardioTargetMinutes, 35);
  assert.equal(getDay(state, '2026-11-04').pms, false);
  assert.equal(getDay(state, '2026-11-04').cardioTargetMinutes, 45);
  assert.equal(JSON.stringify(state.days), original);
});

test('legacy version1 snapshots migrate without losing activity or changing default classes', () => {
  const state = started('2026-11-02', true);
  finishRequired(state, '2026-11-02');
  const legacy = JSON.parse(JSON.stringify(state));
  legacy.version = 1;
  delete legacy.academicSchedules;
  delete legacy.academicExceptions;
  const restored = validateState(legacy)!;
  assert.ok(restored);
  assert.equal(restored.version, 3);
  assert.deepEqual(restored.days, state.days);
  assert.equal(getStats(restored, '2026-11-02').xp, getStats(state, '2026-11-02').xp);
  assert.equal(classesAt(restored, '2026-11-02')[0].start, '10:00');
  assert.equal(classesAt(restored, '2026-11-05')[0].start, '07:00');
  assert.deepEqual(classesAt(restored, '2026-11-07'), []);
  assert.equal(validateState({ ...state, version: 4 }), null);
});

test('semester changes apply on their effective date and preserve previous dates', () => {
  const state = started('2026-11-02', true);
  const week = defaultAcademicWeek();
  week.mon = [{ id: 'a', title: 'Semester baru', start: '08:00', end: '12:00' }];
  state.academicSchedules = [
    { id: 'semester2', name: 'Semester 2', effectiveFrom: '2026-11-09', week },
  ];
  assert.equal(classesAt(state, '2026-11-02')[0].start, '10:00');
  assert.equal(classesAt(state, '2026-11-09')[0].start, '08:00');
  assert.equal(academicScheduleAt(state, '2026-11-09').name, 'Semester 2');
  assert.equal(classesAt(state, '2026-11-16')[0].end, '12:00');
  assert.ok(
    proposeSchedule(state, '2026-11-09').items.some(
      (i) => i.kind === 'class' && i.title === 'Semester baru',
    ),
  );
});

test('holiday exceptions remove classes and commute only on selected dates', () => {
  const state = started();
  state.academicExceptions['2026-11-02'] = { label: 'Libur kampus', classes: [] };
  const holiday = proposeSchedule(state, '2026-11-02');
  assert.equal(holiday.items.filter((i) => i.kind === 'class').length, 0);
  assert.equal(holiday.items.filter((i) => i.id.startsWith('commute-')).length, 0);
  assert.ok(holiday.items.some((i) => i.kind === 'gym'));
  assert.ok(holiday.items.some((i) => i.kind === 'cardio'));
  assert.equal(classesAt(state, '2026-11-09')[0].start, '10:00');
  delete state.academicExceptions['2026-11-02'];
  assert.equal(classesAt(state, '2026-11-02')[0].start, '10:00');
});

test('special-date hours override a semester without altering its recurring week', () => {
  const state = started('2026-11-02', true);
  const week = defaultAcademicWeek();
  week.mon = [{ id: 'regular', title: 'Kuliah reguler', start: '09:00', end: '13:00' }];
  state.academicSchedules = [{ id: 'term', name: 'Semester', effectiveFrom: '2026-11-02', week }];
  state.academicExceptions['2026-11-02'] = {
    label: 'Kuliah pengganti',
    classes: [{ id: 'special', title: 'Seminar', start: '14:00', end: '16:00' }],
  };
  assert.equal(classesAt(state, '2026-11-02')[0].title, 'Seminar');
  assert.equal(classesAt(state, '2026-11-09')[0].title, 'Kuliah reguler');
  const restored = validateState(JSON.parse(JSON.stringify(state)))!;
  assert.deepEqual(restored.academicSchedules, state.academicSchedules);
  assert.deepEqual(restored.academicExceptions, state.academicExceptions);
});

test('multiple daily classes and saved personal activities keep nonoverlapping proposals', () => {
  const state = started('2026-11-02', true);
  const week = defaultAcademicWeek();
  week.mon = [
    { id: 'morning', title: 'Kuliah pagi', start: '09:00', end: '11:00' },
    { id: 'afternoon', title: 'Kuliah sore', start: '14:00', end: '16:00' },
  ];
  state.academicSchedules = [{ id: 'split', name: 'Dua sesi', effectiveFrom: '2026-11-02', week }];
  day(state, '2026-11-02').schedule = [
    {
      id: 'lunch',
      title: 'Janji siang',
      start: '12:00',
      end: '12:30',
      kind: 'personal',
      locked: false,
    },
  ];
  const original = JSON.stringify(state);
  const result = proposeSchedule(state, '2026-11-02');
  assert.equal(result.items.filter((i) => i.kind === 'class').length, 2);
  assert.equal(result.items.filter((i) => i.id.startsWith('commute-')).length, 2);
  assert.ok(result.items.some((i) => i.id === 'lunch' && i.start === '12:00' && !i.locked));
  assert.equal(result.items.find((i) => i.id === 'commute-out')!.start, '08:30');
  assert.equal(result.items.find((i) => i.id === 'commute-home')!.start, '16:00');
  assert.ok(result.items.find((i) => i.kind === 'gym')!.end <= '08:30');
  for (let i = 1; i < result.items.length; i++)
    assert.ok(result.items[i - 1].end <= result.items[i].start);
  assert.equal(JSON.stringify(state), original);
});

test('academic changes do not replace an approved agenda, logged activity or earned EXP', () => {
  const state = started('2026-11-02', true);
  finishRequired(state, '2026-11-02');
  state.days['2026-11-02'].schedule = proposeSchedule(state, '2026-11-02').items;
  state.days['2026-11-02'].scheduleApproved = true;
  const original = JSON.stringify(state.days);
  const xp = getStats(state, '2026-11-02').xp;
  state.academicExceptions['2026-11-02'] = { label: 'Libur mendadak', classes: [] };
  assert.equal(
    proposeSchedule(state, '2026-11-02').items.filter((i) => i.kind === 'class').length,
    0,
  );
  assert.equal(JSON.stringify(state.days), original);
  assert.equal(getStats(state, '2026-11-02').xp, xp);
  assert.equal(state.days['2026-11-02'].scheduleApproved, true);
});

test('academic imports reject overlaps, ambiguous semesters and invalid exception dates', () => {
  const state = started();
  const week = defaultAcademicWeek();
  week.mon.push({ id: 'collision', title: 'Benturan', start: '16:00', end: '18:00' });
  state.academicSchedules = [
    { id: 'invalid', name: 'Semester', effectiveFrom: '2026-11-02', week },
  ];
  assert.equal(validateState(state), null);
  week.mon = [{ id: 'reversed', title: 'Jam salah', start: '12:00', end: '09:00' }];
  assert.equal(validateState(state), null);
  week.mon = [];
  state.academicSchedules.push({
    id: 'duplicate',
    name: 'Ambigu',
    effectiveFrom: '2026-11-02',
    week,
  });
  assert.equal(validateState(state), null);
  state.academicSchedules = [];
  state.academicExceptions['2026-02-30'] = { label: 'Invalid', classes: [] };
  assert.equal(validateState(state), null);
  assert.equal(
    parseClassBlocks([{ id: 'bad', title: 'Kuliah', start: '24:00', end: '25:00' }]),
    null,
  );
});

test('version2 snapshots require academic fields instead of silently erasing configuration', () => {
  const state = createState();
  const broken = JSON.parse(JSON.stringify(state));
  delete broken.academicSchedules;
  assert.equal(validateState(broken), null);
  broken.version = 1;
  assert.ok(validateState(broken));
});

function giveShards(state: AppState, date: string, minimum = 100) {
  for (const badge of ACHIEVEMENTS) {
    state.adventure.claims[badge.id] = { date, shards: badge.reward, title: badge.title };
    if (shards(state) >= minimum) break;
  }
}
function bookFixture(state: AppState, date = '2026-11-02') {
  state.adventure.books.push({
    id: 'book',
    title: 'Buku latihan',
    author: 'Penulis',
    school: 'rune',
    totalPages: 200,
    startedAt: date,
    finishedAt: null,
    reflection: '',
    application: '',
  });
}

test('long-term catalog contains80 stable milestones through730days and24months', () => {
  assert.equal(ACHIEVEMENTS.length, 80);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 80);
  const stats = getStats(createState(), '2026-11-02');
  assert.equal(stats.badges.length, 80);
  assert.ok(stats.badges.every((b) => !b.unlocked));
  assert.equal(ACHIEVEMENTS.find((a) => a.metric === 'days' && a.target === 730)?.target, 730);
  assert.ok(ACHIEVEMENTS.some((a) => a.metric === 'months' && a.target === 24));
  assert.ok(TRIALS.some((t) => t.km === 5 && t.activity === 'run'));
});

test('legacy v2 migration retains quests, academic schedules and EXP while adding empty adventure', () => {
  const state = started('2026-11-02', true);
  finishRequired(state, '2026-11-02');
  state.academicExceptions['2026-11-03'] = { label: 'Libur', classes: [] };
  const legacy = JSON.parse(JSON.stringify(state));
  legacy.version = 2;
  delete legacy.adventure;
  const parsed = validateState(legacy)!;
  assert.ok(parsed);
  assert.equal(parsed.version, 3);
  assert.deepEqual(parsed.days, state.days);
  assert.deepEqual(parsed.academicExceptions, state.academicExceptions);
  assert.equal(getStats(parsed, '2026-11-02').xp, getStats(state, '2026-11-02').xp);
  assert.equal(parsed.adventure.study.startDate, null);
  const invalid = JSON.parse(JSON.stringify(state));
  delete invalid.adventure;
  assert.equal(validateState(invalid), null);
});

test('language starts prospectively every2days and requires both20+10minutes for one award', () => {
  const state = started('2026-11-02', true);
  state.adventure.study.startDate = '2026-11-04';
  assert.ok(!getQuests(state, '2026-11-02').some((q) => q.id === 'language'));
  assert.ok(studyDue(state, '2026-11-04'));
  assert.ok(!studyDue(state, '2026-11-05'));
  assert.ok(studyDue(state, '2026-11-06'));
  state.adventure.studyLogs['2026-11-04'] = {
    ielts: 20,
    japanese: 0,
    ieltsNote: 'Review',
    japaneseNote: '',
  };
  assert.equal(getStats(state, '2026-11-04').xp, 0);
  assert.equal(getQuests(state, '2026-11-04').find((q) => q.id === 'language')!.progress, 20);
  state.adventure.studyLogs['2026-11-04'].japanese = 10;
  assert.equal(getStats(state, '2026-11-04').xp, 30);
  state.adventure.studyLogs['2026-11-04'].ielts = 60;
  assert.equal(getStats(state, '2026-11-04').xp, 30);
  delete state.adventure.studyLogs['2026-11-04'];
  assert.equal(getStats(state, '2026-11-04').xp, 0);
});

test('language proposals fit30minutes around classes without changing prior targets', () => {
  const state = started('2026-11-02', true);
  state.adventure.study.startDate = '2026-11-02';
  const result = proposeSchedule(state, '2026-11-02');
  const study = result.items.find((i) => i.kind === 'study')!;
  assert.ok(study);
  assert.equal(
    (Date.parse('2026-11-02T' + study.end) - Date.parse('2026-11-02T' + study.start)) / 60000,
    30,
  );
  for (let i = 1; i < result.items.length; i++)
    assert.ok(result.items[i - 1].end <= result.items[i].start);
});

test('reading gives15EXP per actual day and book skills require completed pages plus reflection', () => {
  const state = started('2026-11-02', true);
  bookFixture(state);
  state.adventure.readings.push({
    id: 'read1',
    bookId: 'book',
    date: '2026-11-02',
    minutes: 10,
    pages: 5,
    note: 'Insight',
  });
  assert.equal(getStats(state, '2026-11-02').xp, 15);
  state.adventure.readings.push({
    id: 'read2',
    bookId: 'book',
    date: '2026-11-02',
    minutes: 30,
    pages: 10,
    note: 'More',
  });
  assert.equal(getStats(state, '2026-11-02').xp, 15);
  assert.equal(bookPages(state, 'book', '2026-11-02'), 15);
  state.adventure.books[0].finishedAt = '2026-11-02';
  assert.equal(validateState(state), null);
  state.adventure.books[0].reflection = 'Tiga pelajaran yang berguna';
  state.adventure.books[0].application = 'Satu praktik nyata';
  state.adventure.readings[1].pages = 195;
  assert.ok(validateState(state));
  assert.equal(adventureMetrics(state, '2026-11-02').books, 1);
});

test('Rest Day skips required targets and streak without granting EXP or a perfect-day bonus', () => {
  const state = started('2026-11-02', true);
  finishRequired(state, '2026-11-02');
  finishRequired(state, '2026-11-04');
  giveShards(state, '2026-11-02');
  state.adventure.redemptions.push({
    id: 'rest',
    kind: 'rest',
    label: 'Rest Day',
    cost: 100,
    date: '2026-11-02',
    forDate: '2026-11-03',
    cancelled: false,
  });
  assert.ok(restDay(state, '2026-11-03'));
  assert.equal(getStats(state, '2026-11-03').todayTarget, 0);
  assert.equal(getStats(state, '2026-11-03').todayXp, 0);
  assert.equal(getStats(state, '2026-11-03').streak, 1);
  const after = getStats(state, '2026-11-04');
  assert.equal(after.streak, 2);
  assert.equal(after.xp, 210);
  assert.ok(getQuests(state, '2026-11-03').every((q) => !q.required));
  assert.ok(
    proposeSchedule(state, '2026-11-03').items.every(
      (i) => !['gym', 'cardio', 'study'].includes(i.kind),
    ),
  );
  assert.equal(after.monthlyCount, 0);
});

test('claimed crystals are permanent one-time collections and never increase Hunter EXP', () => {
  const state = started('2026-11-02', true);
  day(state, '2026-11-02').completions = ['core'];
  const first = getStats(state, '2026-11-02').badges.find((b) => b.id === 'first-ripple')!;
  assert.ok(first.unlocked);
  state.adventure.claims[first.id] = {
    date: '2026-11-02',
    title: first.title,
    shards: first.reward!,
  };
  assert.equal(shards(state), 10);
  assert.equal(getStats(state, '2026-11-02').xp, 10);
  day(state, '2026-11-02').completions = [];
  assert.equal(getStats(state, '2026-11-02').xp, 0);
  assert.equal(shards(state), 10);
  assert.ok(getStats(state, '2026-11-02').badges.find((b) => b.id === 'first-ripple')!.unlocked);
  assert.ok(validateState(state));
});

test('reward imports reject negative wallets and overlapping rest-voucher dates', () => {
  const state = started('2026-11-02', true);
  state.adventure.redemptions.push({
    id: 'rest1',
    kind: 'rest',
    label: 'Rest',
    cost: 100,
    date: '2026-11-02',
    forDate: '2026-11-03',
    cancelled: false,
  });
  assert.equal(validateState(state), null);
  giveShards(state, '2026-11-02', 250);
  assert.ok(validateState(state));
  state.adventure.redemptions.push({
    id: 'rest2',
    kind: 'rest',
    label: 'Rest',
    cost: 100,
    date: '2026-11-02',
    forDate: '2026-11-05',
    cancelled: false,
  });
  assert.equal(validateState(state), null);
  state.adventure.redemptions[1].forDate = '2026-11-10';
  assert.ok(validateState(state));
  state.adventure.redemptions[1].cancelled = true;
  assert.equal(
    shards(state),
    Object.values(state.adventure.claims).reduce((n, c) => n + c.shards, 0) - 100,
  );
});

test('varied monthly reading challenge counts unique qualifying days and freezes its reward', () => {
  const state = started('2026-11-01', true);
  bookFixture(state, '2026-11-01');
  state.challenges['2026-11'] = {
    kind: 'reading',
    joinedAt: '2026-11-01',
    target: 12,
    rewardXp: 200,
  };
  for (let i = 0; i < 12; i++)
    state.adventure.readings.push({
      id: 'r' + i,
      bookId: 'book',
      date: addDays('2026-11-01', i),
      minutes: 10,
      pages: 1,
      note: '',
    });
  const stats = getStats(state, '2026-11-12');
  assert.equal(stats.monthlyCount, 12);
  assert.equal(stats.monthlyComplete, true);
  assert.equal(stats.xp, 12 * 15 + 200);
  state.adventure.readings.push({
    id: 'extra',
    bookId: 'book',
    date: '2026-11-12',
    minutes: 20,
    pages: 2,
    note: '',
  });
  assert.equal(getStats(state, '2026-11-12').xp, stats.xp);
  state.adventure.readings = state.adventure.readings.filter((r) => r.date !== '2026-11-01');
  assert.equal(getStats(state, '2026-11-12').monthlyComplete, false);
});

test('nonstop trials require enrollment and explicit continuous-session evidence', () => {
  const state = started('2026-11-02', true);
  day(state, '2026-11-02').cardio = {
    activity: 'run',
    minutes: 15,
    distanceKm: 2,
    incline: null,
    intensity: 'light',
  };
  assert.equal(trialFinishedAt(state, 'run-2', '2026-11-02'), null);
  state.adventure.trials['run-2'] = { joinedAt: '2026-11-02' };
  assert.equal(trialFinishedAt(state, 'run-2', '2026-11-02'), null);
  day(state, '2026-11-02').cardio!.continuous = true;
  assert.equal(trialFinishedAt(state, 'run-2', '2026-11-02'), '2026-11-02');
  assert.equal(getStats(state, '2026-11-02').xp, 150);
  assert.equal(getStats(state, '2026-11-03').xp, 150);
  day(state, '2026-11-02').cardio!.continuous = false;
  assert.equal(getStats(state, '2026-11-02').xp, 0);
});

test('trial eligibility requires level, prior gate and logged cardio readiness', () => {
  const state = started('2026-11-02', true);
  assert.equal(canJoinTrial(state, 'run-1', 5, '2026-11-08'), false);
  for (let i = 0; i < 5; i++)
    day(state, addDays('2026-11-02', i)).cardio = {
      activity: 'walk',
      minutes: 30,
      distanceKm: 2,
      incline: null,
      intensity: 'light',
    };
  assert.equal(canJoinTrial(state, 'run-1', 4, '2026-11-08'), false);
  assert.equal(canJoinTrial(state, 'run-1', 5, '2026-11-08'), true);
  assert.equal(canJoinTrial(state, 'run-2', 12, '2026-11-08'), false);
  state.adventure.trials['run-1'] = { joinedAt: '2026-11-02' };
  day(state, '2026-11-07').cardio = {
    activity: 'run',
    minutes: 12,
    distanceKm: 1,
    incline: null,
    intensity: 'medium',
    continuous: true,
  };
  assert.equal(canJoinTrial(state, 'run-2', 12, '2026-11-08'), true);
});

test('curricula cover365 paired sessions with beginner Japanese and advanced IELTS refresh', () => {
  assert.equal(
    IELTS_STAGES.reduce((n, s) => n + s.sessions, 0),
    365,
  );
  assert.equal(
    JAPANESE_STAGES.reduce((n, s) => n + s.sessions, 0),
    365,
  );
  assert.match(lessonAt('japanese', 0).name, /Hiragana/);
  assert.match(lessonAt('ielts', 0).name, /Return/);
  assert.match(lessonAt('ielts', 80, 'academic').variant, /overview/);
  assert.equal(lessonAt('japanese', 200, 'academic', 0).index, 0);
  assert.equal(lessonAt('ielts', 500).index, IELTS_STAGES.length - 1);
});

test('standalone swim trial evidence does not replace daily cardio or auto-complete30minutes', () => {
  const state = started('2026-11-02', true);
  day(state, '2026-11-02').cardio = {
    activity: 'walk',
    minutes: 30,
    distanceKm: 2,
    incline: null,
    intensity: 'light',
  };
  state.adventure.trials['swim-100'] = { joinedAt: '2026-11-02' };
  state.adventure.trialAttempts['swim-100'] = {
    date: '2026-11-02',
    minutes: 5,
    distanceKm: 0.1,
    continuous: true,
  };
  assert.ok(validateState(state));
  assert.equal(getStats(state, '2026-11-02').xp, 125);
  assert.equal(state.days['2026-11-02'].cardio!.activity, 'walk');
  state.adventure.trialAttempts['swim-100'].continuous = false;
  assert.equal(getStats(state, '2026-11-02').xp, 25);
  state.days['2026-11-02'].cardio = null;
  state.adventure.trialAttempts['swim-100'].continuous = true;
  assert.equal(getStats(state, '2026-11-02').xp, 100);
  assert.equal(getQuests(state, '2026-11-02').find((q) => q.id === 'cardio')!.done, false);
});
