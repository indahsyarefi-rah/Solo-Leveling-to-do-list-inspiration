'use client';

import { assetPath } from '@/lib/paths';
import { restDay, MONTHLY, hunterTitle, type MonthlyKind } from '@/lib/long-game';
import {
  SpellbookView,
  LanguagePanel,
  RewardsView,
  TrialsView,
  MonthlyPanel,
  monthlyStart,
} from './adventure-views';
import AcademicEditor, { AcademicSummary } from './academic-editor';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Home,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Trophy,
  UserRound,
  Moon,
  Bell,
  Flame,
  Droplet,
  Utensils,
  Dumbbell,
  Footprints,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  X,
  ArrowRight,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Download,
  Upload,
  Clock,
  ShieldCheck,
  Info,
  RefreshCw,
  Undo2,
  Trash2,
  Sun,
  Waves,
  Sparkles,
  Settings2,
  BookOpen,
  Gift,
  Compass,
} from 'lucide-react';
import {
  todayKey,
  dateLabel,
  addDays,
  emptyDay,
  getDay,
  getQuests,
  getStats,
  gymType,
  proposeSchedule,
  validateState,
  ACTIVITY_LABELS,
  GYM_EXERCISES,
  type AppState,
  type Quest,
  type Activity,
  type CardioSession,
  type GymSession,
  type GymExercise,
  type ScheduledItem,
} from '@/lib/engine';
import { useJourney } from '@/lib/use-journey';
import { cloudAvailable } from '@/lib/cloud';
import {
  notificationSupport,
  requestNotificationPermission,
  showReminder,
  registerServiceWorker,
} from '@/lib/reminders';
import { ProgressView, AchievementsView } from './progress-views';

type Tab =
  | 'today'
  | 'schedule'
  | 'progress'
  | 'achievements'
  | 'profile'
  | 'spellbook'
  | 'trials'
  | 'rewards';
type Modal =
  | 'start'
  | 'water'
  | 'nutrition'
  | 'cardio'
  | 'gym'
  | 'challenge'
  | 'notifications'
  | 'language'
  | 'reading'
  | 'academic'
  | 'schedule'
  | 'conflict'
  | 'training'
  | 'core'
  | null;
const NAV = [
  { id: 'today', label: 'Hari Ini', icon: Home },
  { id: 'schedule', label: 'Jadwal', icon: CalendarDays },
  { id: 'progress', label: 'Progres', icon: ChartNoAxesColumnIncreasing },
  { id: 'achievements', label: 'Achievement', icon: Trophy },
  { id: 'spellbook', label: 'Spellbook', icon: BookOpen },
  { id: 'trials', label: 'Trials', icon: Compass },
  { id: 'rewards', label: 'Reward', icon: Gift },
  { id: 'profile', label: 'Profil', icon: UserRound },
] as const;
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value);
const timeNow = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());

function Dialog({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = ref.current;
    el?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab' || !el) return;
      const elements = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],textarea',
        ),
      );
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === el)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`dialog ${wide ? 'dialog-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" aria-label="Tutup dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QuestIcon({ id }: { id: string }) {
  if (id === 'language' || id === 'reading') return <BookOpen />;
  if (id === 'gym') return <Dumbbell />;
  if (id === 'cardio' || id === 'alternative') return <Footprints />;
  if (id === 'water') return <Droplet />;
  if (id === 'nutrition') return <Utensils />;
  if (id === 'core') return <Sparkles />;
  if (id === 'fasting') return <Moon />;
  return <Sun />;
}

function ProgressBar({
  value,
  max,
  label,
  color = '',
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) {
  return (
    <div
      className={`meter ${color}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%` }} />
    </div>
  );
}

function CardioForm({
  initial,
  target,
  save,
  remove,
}: {
  initial: CardioSession | null;
  target: number;
  save: (session: CardioSession) => void;
  remove: () => void;
}) {
  const [activity, setActivity] = useState<Activity>(initial?.activity ?? 'walk');
  const [minutes, setMinutes] = useState(initial?.minutes ?? target);
  const [distance, setDistance] = useState(
    initial?.distanceKm == null
      ? ''
      : String(initial.distanceKm * (initial.activity === 'swim' ? 1000 : 1)),
  );
  const [incline, setIncline] = useState(initial?.incline?.toString() ?? '');
  const [intensity, setIntensity] = useState<CardioSession['intensity']>(
    initial?.intensity ?? 'light',
  );
  const [continuous, setContinuous] = useState(initial?.continuous ?? false);
  const [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    const distanceKm = distance === '' ? null : Number(distance) / (activity === 'swim' ? 1000 : 1);
    const inclineValue =
      incline === '' || !['walk', 'run'].includes(activity) ? null : Number(incline);
    if (
      !Number.isFinite(minutes) ||
      minutes < 1 ||
      minutes > 600 ||
      (distanceKm !== null &&
        (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > 500)) ||
      (inclineValue !== null &&
        (!Number.isFinite(inclineValue) || inclineValue < 0 || inclineValue > 40))
    ) {
      setError('Periksa durasi, jarak, dan incline yang dimasukkan.');
      return;
    }
    save({ activity, minutes, distanceKm, incline: inclineValue, intensity, continuous });
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="form-callout">
        <Footprints size={21} />
        <span>
          Target hari ini <strong>{target} menit</strong>
        </span>
      </div>
      <label>
        Aktivitas
        <select
          value={activity}
          onChange={(e) => {
            setActivity(e.target.value as Activity);
            setDistance('');
          }}
        >
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="field-pair">
        <label>
          Durasi aktual
          <span className="input-unit">
            <input
              required
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
            <span>menit</span>
          </span>
        </label>
        <label>
          Jarak <span className="muted">(opsional)</span>
          <span className="input-unit">
            <input
              aria-label="Jarak"
              type="number"
              min={0}
              max={activity === 'swim' ? 50000 : 500}
              step={activity === 'swim' ? 1 : 0.01}
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
            <span>{activity === 'swim' ? 'm' : 'km'}</span>
          </span>
        </label>
      </div>
      {['walk', 'run'].includes(activity) && (
        <label>
          Incline <span className="muted">(opsional)</span>
          <span className="input-unit">
            <input
              aria-label="Incline"
              type="number"
              min={0}
              max={40}
              step="0.5"
              value={incline}
              onChange={(e) => setIncline(e.target.value)}
            />
            <span>%</span>
          </span>
        </label>
      )}
      <label className="inline-check">
        <input
          type="checkbox"
          checked={continuous}
          onChange={(e) => setContinuous(e.target.checked)}
        />
        Tanpa jeda (non-stop)
      </label>
      <p className="form-footnote">
        Centang hanya jika sesi benar-benar dilakukan tanpa jeda. Ini catatan mandiri untuk Trial
        Gates.
      </p>
      <fieldset>
        <legend>Intensitas</legend>
        <div className="choice-group">
          {(
            [
              ['light', 'Ringan'],
              ['medium', 'Sedang'],
              ['hard', 'Berat'],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              className={intensity === id ? 'selected' : ''}
              aria-pressed={intensity === id}
              onClick={() => setIntensity(id)}
            >
              {text}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-callout emerald">
        <Check size={20} />
        <span>
          {minutes >= target
            ? `Target tercapai${minutes > target ? ` · ${minutes - target} menit lebih lama` : ''}`
            : `${target - minutes} menit lagi menuju target`}
          {activity === 'swim' && (
            <small>Renang juga dihitung sebagai olahraga alternatif minggu ini.</small>
          )}
        </span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit">
        Simpan sesi <Check size={17} />
      </button>
      <p className="form-footnote">
        +25 EXP saat target tercapai. Target berikutnya tidak naik otomatis.
      </p>
      {initial && (
        <button type="button" className="btn btn-danger" onClick={remove}>
          <Undo2 size={16} />
          Batalkan sesi cardio
        </button>
      )}
    </form>
  );
}

function GymForm({
  initial,
  type,
  save,
  remove,
}: {
  initial: GymSession | null;
  type: 'upper' | 'lower';
  save: (session: GymSession) => void;
  remove: () => void;
}) {
  const [exercises, setExercises] = useState<GymExercise[]>(
    initial?.exercises ??
      GYM_EXERCISES[type].map((name) => ({ name, sets: [{ reps: 10, weight: 0 }] })),
  );
  const [checked, setChecked] = useState<string[]>(initial?.exercises.map((e) => e.name) ?? []);
  const [minutes, setMinutes] = useState(initial?.minutes ?? 35);
  const [feeling, setFeeling] = useState<GymSession['feeling']>(initial?.feeling ?? 'comfortable');
  const [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    const logged = exercises.filter((e) => checked.includes(e.name));
    if (!logged.length) {
      setError('Tandai minimal satu gerakan yang benar-benar sudah dilakukan.');
      return;
    }
    if (
      !Number.isFinite(minutes) ||
      minutes < 1 ||
      minutes > 300 ||
      logged.some((e) =>
        e.sets.some(
          (s) =>
            !Number.isFinite(s.reps) ||
            s.reps < 1 ||
            s.reps > 100 ||
            !Number.isFinite(s.weight) ||
            s.weight < 0 ||
            s.weight > 300,
        ),
      )
    ) {
      setError('Periksa durasi, repetisi, dan beban latihan.');
      return;
    }
    save({ type, minutes, exercises: logged, feeling });
  }
  const changeSet = (
    exerciseIndex: number,
    setIndex: number,
    key: 'reps' | 'weight',
    value: number,
  ) =>
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exerciseIndex
          ? { ...ex, sets: ex.sets.map((s, n) => (n === setIndex ? { ...s, [key]: value } : s)) }
          : ex,
      ),
    );
  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="form-callout">
        <Dumbbell size={20} />
        <span>
          Program pemula · {type === 'upper' ? 'Upper Body' : 'Lower Body'}
          <small>Mulai ringan. Catat gerakan dan set yang sudah dilakukan.</small>
        </span>
      </div>
      <div className="exercise-list">
        {exercises.map((exercise, i) => (
          <details key={exercise.name} className="exercise" open={i === 0}>
            <summary>
              <span>{exercise.name}</span>
              <ChevronDown size={16} />
            </summary>
            <div className="exercise-body">
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={checked.includes(exercise.name)}
                  onChange={(e) =>
                    setChecked((prev) =>
                      e.target.checked
                        ? [...prev, exercise.name]
                        : prev.filter((n) => n !== exercise.name),
                    )
                  }
                />
                Gerakan sudah dilakukan
              </label>
              <div className="set-header">
                <span>Set</span>
                <span>Repetisi</span>
                <span>Beban (kg)</span>
              </div>
              {exercise.sets.map((set, n) => (
                <div className="set-row" key={n}>
                  <span>{n + 1}</span>
                  <input
                    aria-label={`Repetisi ${exercise.name} set ${n + 1}`}
                    type="number"
                    min={1}
                    max={100}
                    value={set.reps}
                    onChange={(e) => changeSet(i, n, 'reps', Number(e.target.value))}
                  />
                  <input
                    aria-label={`Beban ${exercise.name} set ${n + 1}`}
                    type="number"
                    min={0}
                    max={300}
                    step="0.5"
                    value={set.weight}
                    onChange={(e) => changeSet(i, n, 'weight', Number(e.target.value))}
                  />
                </div>
              ))}
              <button
                className="text-button"
                type="button"
                disabled={exercise.sets.length >= 6}
                onClick={() =>
                  setExercises((prev) =>
                    prev.map((ex, index) =>
                      index === i ? { ...ex, sets: [...ex.sets, { reps: 10, weight: 0 }] } : ex,
                    ),
                  )
                }
              >
                <Plus size={15} />
                Tambah set
              </button>
            </div>
          </details>
        ))}
      </div>
      <label>
        Durasi sesi
        <span className="input-unit">
          <input
            type="number"
            min={1}
            max={300}
            required
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
          <span>menit</span>
        </span>
      </label>
      <fieldset>
        <legend>Kondisi latihan</legend>
        <div className="choice-group">
          <button
            type="button"
            className={feeling === 'comfortable' ? 'selected' : ''}
            onClick={() => setFeeling('comfortable')}
          >
            Nyaman
          </button>
          <button
            type="button"
            className={feeling === 'hard' ? 'selected' : ''}
            onClick={() => setFeeling('hard')}
          >
            Terlalu berat
          </button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit">
        Simpan sesi gym <Check size={17} />
      </button>
      <p className="form-footnote">
        +50 EXP untuk sesi tercatat. Peningkatan latihan perlu persetujuanmu.
      </p>
      {initial && (
        <button className="btn btn-danger" type="button" onClick={remove}>
          <Undo2 size={16} />
          Batalkan sesi gym
        </button>
      )}
    </form>
  );
}

function ScheduleEditor({
  items,
  state,
  approve,
}: {
  items: ScheduledItem[];
  state: AppState;
  approve: (items: ScheduledItem[]) => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(items));
  const [error, setError] = useState('');
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  function submit(e: FormEvent) {
    e.preventDefault();
    const sorted = [...draft].sort((a, b) => a.start.localeCompare(b.start));
    if (
      sorted.some(
        (item) =>
          !item.title.trim() ||
          !/^\d{2}:\d{2}$/.test(item.start) ||
          !/^\d{2}:\d{2}$/.test(item.end) ||
          minutes(item.start) >= minutes(item.end),
      )
    ) {
      setError('Isi nama kegiatan dan waktu mulai/selesai yang valid.');
      return;
    }
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      if (i > 0 && minutes(item.start) < minutes(sorted[i - 1].end)) {
        setError('Ada kegiatan yang bertumpang tindih. Pilih waktu lain.');
        return;
      }
      if (
        !item.locked &&
        (minutes(item.start) < minutes(state.settings.wakeTime) ||
          minutes(item.end) > minutes(state.settings.sleepTime))
      ) {
        setError('Kegiatan harus berada di antara waktu bangun dan tidur.');
        return;
      }
      if (
        !item.locked &&
        (() => {
          const classes = sorted.filter((c) => c.kind === 'class');
          if (!classes.length) return false;
          const first = minutes(classes[0].start),
            last = minutes(classes.at(-1)!.end);
          return (
            (minutes(item.start) < first &&
              minutes(item.end) > first - state.settings.commuteMinutes) ||
            (minutes(item.end) > last && minutes(item.start) < last + state.settings.commuteMinutes)
          );
        })()
      ) {
        setError('Sisakan waktu perjalanan sebelum dan sesudah kuliah.');
        return;
      }
    }
    approve(sorted);
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="muted">
        Usulan belum mengubah jadwal. Periksa waktu dan simpan setelah sesuai.
      </p>
      {draft.map((item, index) => (
        <div className="schedule-edit-row panel" key={item.id}>
          <label>
            Kegiatan
            <input
              aria-label={`Kegiatan ${index + 1}`}
              required
              maxLength={80}
              disabled={item.locked}
              value={item.title}
              onChange={(e) =>
                setDraft((prev) =>
                  prev.map((it, n) => (n === index ? { ...it, title: e.target.value } : it)),
                )
              }
            />
          </label>
          <div className="field-pair">
            <label>
              Mulai
              <input
                aria-label={`Mulai ${item.title}`}
                type="time"
                required
                disabled={item.locked}
                value={item.start}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev.map((it, n) => (n === index ? { ...it, start: e.target.value } : it)),
                  )
                }
              />
            </label>
            <label>
              Selesai
              <input
                aria-label={`Selesai ${item.title}`}
                type="time"
                required
                disabled={item.locked}
                value={item.end}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev.map((it, n) => (n === index ? { ...it, end: e.target.value } : it)),
                  )
                }
              />
            </label>
          </div>
          {item.locked ? (
            <small className="muted">
              <ShieldCheck size={13} /> Ubah jam kuliah melalui “Atur jadwal kuliah”.
            </small>
          ) : (
            <button
              type="button"
              className="text-button danger-text"
              onClick={() => setDraft((prev) => prev.filter((it) => it.id !== item.id))}
            >
              <Trash2 size={14} />
              Hapus kegiatan
            </button>
          )}
        </div>
      ))}
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() =>
          setDraft((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              title: '',
              start: '19:00',
              end: '19:30',
              kind: 'personal',
              locked: false,
            },
          ])
        }
      >
        <Plus size={16} />
        Tambah kegiatan
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit">
        Setujui jadwal <Check size={17} />
      </button>
    </form>
  );
}

export default function IrisApp() {
  const journey = useJourney();
  const { state, ready, update, user, syncStatus, syncError } = journey;
  const [date, setDate] = useState(todayKey);
  const [tab, setTab] = useState<Tab>('today');
  const [filter, setFilter] = useState<'all' | 'required' | 'optional'>('all');
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ text: string; xp?: number } | null>(null);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [formError, setFormError] = useState('');
  const [proposal, setProposal] = useState<ScheduledItem[]>([]);
  const [showWeek, setShowWeek] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previousLevel = useRef<number | null>(null);
  const day = getDay(state, date);
  const stats = getStats(state, date);
  const quests = getQuests(state, date);
  const calories = day.meals.reduce((total, meal) => total + meal.calories, 0);
  const currentGym = gymType(state, date);
  const planned = proposeSchedule(state, date);
  const started = Boolean(state.startedAt);
  const comfortableSessions = Object.entries(state.days).filter(
    ([key, log]) =>
      key <= date &&
      key >= (state.startedAt ?? date) &&
      log.cardioTargetMinutes === state.settings.cardioTargetMinutes &&
      log.cardio &&
      log.cardio.minutes >= log.cardioTargetMinutes &&
      log.cardio.intensity !== 'hard',
  ).length;
  const canProgress = comfortableSessions >= 5 && state.settings.cardioTargetMinutes < 120;
  const close = useRef(() => setModal(null)).current;
  const notify = (text: string, xp?: number) => setToast({ text, xp });

  useEffect(() => {
    const timer = setInterval(() => setDate(todayKey()), 20_000);
    const visible = () => setDate(todayKey());
    document.addEventListener('visibilitychange', visible);
    void registerServiceWorker();
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!ready) return;
    if (previousLevel.current !== null && stats.level > previousLevel.current)
      setToast({ text: `Level up! Iris mencapai Level ${String(stats.level).padStart(2, '0')}.` });
    previousLevel.current = stats.level;
  }, [ready, stats.level]);
  useEffect(() => {
    if (!state.settings.notificationsEnabled || !day.scheduleApproved || restDay(state, date))
      return;
    const remind = () => {
      const now = timeNow();
      day.schedule
        .filter((item) => ['gym', 'cardio', 'study'].includes(item.kind) && item.start === now)
        .forEach((item) => {
          if (
            getQuests(state, date).some(
              (quest) =>
                quest.kind === (item.kind === 'study' ? 'language' : item.kind) && quest.done,
            )
          )
            return;
          const key = `iris-reminder:${date}:${item.id}:${item.start}`;
          try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
          } catch {
            return;
          }
          void showReminder(
            `Waktunya ${item.title}`,
            'Jadwal yang sudah kamu setujui akan dimulai. Buka Iris untuk mencatat sesi.',
          );
        });
    };
    remind();
    const timer = setInterval(remind, 30_000);
    return () => clearInterval(timer);
  }, [date, day.schedule, day.scheduleApproved, state.settings.notificationsEnabled]);

  function editDay(
    recipe: (day: ReturnType<typeof emptyDay>) => void,
    message?: string,
    xp?: number,
  ) {
    if (!ready) return;
    if (!started) {
      setModal('start');
      return;
    }
    update((draft) => {
      const key = todayKey();
      draft.days[key] ??= emptyDay(draft.pms, draft.settings.cardioTargetMinutes);
      recipe(draft.days[key]);
    });
    if (message) notify(message, xp);
  }
  function togglePms() {
    const active = !state.pms;
    update((draft) => {
      draft.pms = active;
      if (draft.startedAt) {
        draft.days[date] ??= emptyDay(active, draft.settings.cardioTargetMinutes);
        draft.days[date].pms = active;
        draft.days[date].scheduleApproved = false;
      }
    });
    notify(
      active
        ? 'Mode PMS aktif. Quest shalat dan puasa ditiadakan.'
        : 'Mode PMS nonaktif. Quest hari ini diperbarui.',
    );
  }
  function handleQuest(quest: Quest) {
    if (quest.kind !== 'toggle') {
      setModal(quest.kind);
      return;
    }
    editDay(
      (log) => {
        log.completions = quest.done
          ? log.completions.filter((id) => id !== quest.id)
          : [...log.completions.filter((id) => id !== quest.id), quest.id];
      },
      quest.done ? 'Penyelesaian dibatalkan. Reward terkait dikembalikan.' : 'Quest selesai!',
      quest.done ? undefined : quest.xp,
    );
  }
  function saveCardio(session: CardioSession) {
    const wasDone = Boolean(day.cardio && day.cardio.minutes >= day.cardioTargetMinutes);
    editDay(
      (log) => {
        log.cardio = session;
      },
      'Sesi cardio tersimpan.',
      !wasDone && session.minutes >= day.cardioTargetMinutes ? 25 : undefined,
    );
    setModal(null);
  }
  function saveGym(session: GymSession) {
    const wasDone = Boolean(day.gym);
    editDay(
      (log) => {
        log.gym = session;
      },
      'Sesi gym tersimpan.',
      !wasDone ? 50 : undefined,
    );
    setModal(null);
  }
  function joinChallenge(kind: MonthlyKind = 'cardio') {
    if (!started) {
      setModal('start');
      return;
    }
    if (
      stats.level < MONTHLY[kind].level ||
      (kind === 'study' && !state.adventure.study.startDate)
    ) {
      notify('Lengkapi syarat challenge terlebih dahulu.');
      return;
    }
    const startDate = monthlyStart(state, kind, date),
      definition = MONTHLY[kind];
    update((draft) => {
      draft.challenges[startDate.slice(0, 7)] ??= {
        target: definition.target,
        joinedAt: startDate,
        kind,
        rewardXp: definition.xp,
      };
    });
    notify(definition.name + ' disimpan mulai ' + dateLabel(startDate) + '.');
  }
  const adventureCommit = (recipe: (draft: AppState) => void, message: string) => {
    update((draft) => {
      if (draft.startedAt)
        draft.days[date] ??= emptyDay(draft.pms, draft.settings.cardioTargetMinutes);
      recipe(draft);
    });
    notify(message);
  };

  function downloadBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `iris-backup-${date}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    if (file.size > 5_000_000) {
      notify('Ukuran cadangan terlalu besar. Maksimal 5 MB.');
      return;
    }
    try {
      const parsed = validateState(JSON.parse(await file.text()));
      if (!parsed) throw new Error();
      if (
        !window.confirm(
          'Ganti perjalanan saat ini dengan cadangan ini? Unduh cadangan saat ini terlebih dahulu bila dibutuhkan.',
        )
      )
        return;
      update((draft) => {
        Object.assign(draft, parsed);
      });
      notify('Cadangan berhasil dipulihkan.');
    } catch {
      notify('Cadangan tidak valid. Data saat ini tetap aman.');
    }
  }
  async function enableNotifications() {
    if (state.settings.notificationsEnabled) {
      update((draft) => {
        draft.settings.notificationsEnabled = false;
      });
      notify('Pengingat dinonaktifkan.');
      return;
    }
    const allowed = await requestNotificationPermission();
    if (!allowed) {
      notify('Izin notifikasi belum diberikan. Periksa izin situs di browser.');
      return;
    }
    update((draft) => {
      draft.settings.notificationsEnabled = true;
    });
    await showReminder('Iris siap menemanimu', 'Pengingat jadwal aktif saat aplikasi terbuka.');
    notify('Pengingat diaktifkan.');
  }
  function navigate(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!ready)
    return (
      <main className="loading-screen">
        <Image
          src={assetPath('/assets/brand/iris-crystal-emblem.png')}
          alt=""
          width={72}
          height={72}
          priority
        />
        <h1>IRIS</h1>
        <p>Membangunkan arus zamrud…</p>
        <span className="loading-line" />
      </main>
    );

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Langsung ke konten
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate('today')}
          aria-label="Iris, kembali ke Hari Ini"
        >
          <Image
            src={assetPath('/assets/brand/iris-crystal-emblem.png')}
            alt=""
            width={54}
            height={64}
          />
          <span>IRIS</span>
          <small>EMERALD TIDE</small>
        </button>
        <nav aria-label="Navigasi utama">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              aria-current={tab === item.id ? 'page' : undefined}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-art">
          <Image
            src={assetPath('/assets/decorations/sidebar-water-crystals.png')}
            alt=""
            fill
            sizes="212px"
          />
          <blockquote>
            “Disiplin kecil hari ini,
            <br />
            arus besar untuk nanti.”
          </blockquote>
        </div>
        <div className="sidebar-bottom">
          <span className={`connection-dot ${user && syncStatus === 'synced' ? 'online' : ''}`} />
          {syncStatus === 'synced'
            ? 'Perjalanan tersinkron'
            : user
              ? 'Sinkronisasi akun'
              : 'Perjalanan pribadi'}
        </div>
      </aside>
      <main className="main-content" id="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow mobile-brand">
              <Waves size={15} /> EMERALD TIDE
            </p>
            <h1>
              {tab === 'today'
                ? `Selamat datang, ${state.settings.name}`
                : NAV.find((n) => n.id === tab)?.label === 'Jadwal'
                  ? 'Jadwal Iris'
                  : tab === 'progress'
                    ? 'Perjalanan Iris'
                    : tab === 'achievements'
                      ? 'Achievement Iris'
                      : tab === 'spellbook'
                        ? 'Spellbook Iris'
                        : tab === 'trials'
                          ? 'Trial Gates'
                          : tab === 'rewards'
                            ? 'Reward Iris'
                            : 'Profil Hunter'}
            </h1>
            <p className="header-date">{dateLabel(date)}</p>
          </div>
          <div className="header-actions">
            <button
              className={`pms-switch ${state.pms ? 'is-on' : ''}`}
              role="switch"
              aria-label="Mode PMS"
              aria-checked={state.pms}
              onClick={togglePms}
            >
              <Moon size={16} />
              <span>
                Mode PMS <b>{state.pms ? 'aktif' : 'nonaktif'}</b>
              </span>
              <span className="switch-track">
                <span />
              </span>
            </button>
            <button
              className={`icon-button notification-button ${state.settings.notificationsEnabled ? 'enabled' : ''}`}
              aria-label="Pengaturan notifikasi"
              onClick={() => setModal('notifications')}
            >
              <Bell size={21} />
            </button>
          </div>
        </header>
        {(syncError ||
          syncStatus === 'conflict' ||
          syncStatus === 'error' ||
          syncStatus === 'offline') && (
          <div className="sync-banner" role="status">
            <CloudOff size={19} />
            <span>
              {syncStatus === 'conflict'
                ? 'Ada perubahan dari perangkat lain. Data lokal belum ditimpa.'
                : (syncError ??
                  'Perubahan tersimpan di perangkat. Menunggu koneksi untuk sinkronisasi.')}
            </span>
            <button
              className="text-button"
              onClick={() =>
                syncStatus === 'conflict'
                  ? setModal('conflict')
                  : syncStatus === 'device' || syncStatus === 'sign-in'
                    ? navigate('profile')
                    : void journey.retrySync()
              }
            >
              {syncStatus === 'conflict'
                ? 'Tinjau'
                : syncStatus === 'device' || syncStatus === 'sign-in'
                  ? 'Cadangan'
                  : 'Coba lagi'}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        {tab === 'today' && (
          <>
            <section className="hunter-card panel" aria-label="Status Hunter">
              <Image
                className="hunter-background"
                src={assetPath('/assets/characters/iris-dashboard-hero.png')}
                alt="Iris, magician air dengan kristal zamrud"
                fill
                sizes="(max-width: 700px) 100vw, 1000px"
                priority
              />
              <div className="hunter-shade" />
              <div className="hunter-info">
                <div className="hunter-name">
                  {state.settings.name.toUpperCase()} <span>✧</span>
                </div>
                <p className="hunter-title">{hunterTitle(stats.level)}</p>
                <div className="hunter-level">
                  <div className="level-number">
                    <span>LEVEL</span>
                    <strong>{String(stats.level).padStart(2, '0')}</strong>
                  </div>
                  <div className="hunter-exp">
                    <p>
                      <strong>{number(stats.levelXp)}</strong> / {number(stats.nextLevelXp)} EXP
                    </p>
                    <ProgressBar value={stats.levelXp} max={stats.nextLevelXp} label="EXP Hunter" />
                  </div>
                </div>
              </div>
              <div className="hunter-mantra">
                “Kebiasaan hari ini,
                <br />
                membentuk diriku
                <br />
                di masa depan.”
              </div>
              <div className="daily-target">
                <span>Target hari ini</span>
                <div
                  className="target-ring"
                  style={
                    {
                      '--progress': `${stats.todayTarget ? (stats.todayCompleted / stats.todayTarget) * 100 : 0}%`,
                    } as React.CSSProperties
                  }
                >
                  <strong>
                    {stats.todayCompleted}
                    <small> / {stats.todayTarget}</small>
                  </strong>
                </div>
                <small>target selesai</small>
              </div>
            </section>
            <div className="metric-grid">
              <button className="metric panel" onClick={() => navigate('progress')}>
                <Flame className="metric-gold" size={30} />
                <span>
                  <small>Streak</small>
                  <strong>
                    {stats.streak} <em>hari</em>
                  </strong>
                </span>
                <ChevronRight size={15} />
              </button>
              <button
                className="metric panel"
                onClick={() => (started ? setModal('water') : setModal('start'))}
              >
                <Droplet className="metric-cyan" size={30} />
                <span>
                  <small>Air</small>
                  <strong>
                    {number(day.waterMl)} <em>/ 2.000 ml</em>
                  </strong>
                  <ProgressBar value={day.waterMl} max={2000} label="Air minum" />
                </span>
              </button>
              <button
                className="metric panel"
                onClick={() => (started ? setModal('nutrition') : setModal('start'))}
              >
                <Utensils className="metric-gold" size={29} />
                <span>
                  <small>Kalori</small>
                  <strong>
                    {number(calories)} <em>/ 1.700 kkal</em>
                  </strong>
                  <span className="calorie-caption">
                    {calories > 1700 ? 'Di atas batas catatan' : 'Catatan konsumsi hari ini'}
                  </span>
                </span>
              </button>
            </div>
            <section className="quests-section">
              {restDay(state, date) && (
                <div className="notice rest-banner">
                  <Gift size={21} />
                  <p>
                    <strong>Rest Day aktif.</strong> Semua quest opsional. Streak tetap terlindungi;
                    tidak ada EXP atau hitungan challenge otomatis.
                  </p>
                </div>
              )}
              <div className="section-heading">
                <h2>
                  Daily Quests <span>✧</span>
                </h2>
                <div className="quest-tabs" aria-label="Filter quest">
                  {(
                    [
                      ['all', 'Semua'],
                      ['required', 'Wajib'],
                      ['optional', 'Opsional'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      aria-pressed={filter === id}
                      className={filter === id ? 'selected' : ''}
                      onClick={() => setFilter(id)}
                      key={id}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {!started ? (
                <div className="welcome-card panel">
                  <Image
                    src={assetPath('/assets/illustrations/empty-quests-crystal.png')}
                    loading="eager"
                    width={160}
                    height={160}
                    alt="Kristal zamrud mengambang di atas air"
                  />
                  <div>
                    <p className="eyebrow">YOUR STORY STARTS HERE</p>
                    <h2>Arus pertamamu menanti.</h2>
                    <p>
                      Bangun rutinitas, selesaikan quest, dan lihat dirimu berkembang. Semua dimulai
                      dari satu langkah.
                    </p>
                    <button className="btn btn-primary" onClick={() => setModal('start')}>
                      Mulai Perjalanan <ArrowRight size={17} />
                    </button>
                    <small>Quest dan streak baru dihitung setelah kamu mulai.</small>
                  </div>
                </div>
              ) : (
                <div className="quest-list">
                  {quests
                    .filter(
                      (q) => filter === 'all' || (filter === 'required' ? q.required : !q.required),
                    )
                    .map((quest) => (
                      <article
                        className={`quest-card ${quest.done ? 'is-complete' : ''}`}
                        key={quest.id}
                      >
                        <button
                          className="quest-checkbox"
                          role="checkbox"
                          aria-checked={quest.done}
                          aria-label={quest.title}
                          onClick={() => handleQuest(quest)}
                        >
                          {quest.done && <Check size={17} strokeWidth={3} />}
                        </button>
                        <div className="quest-icon">
                          <QuestIcon id={quest.id} />
                        </div>
                        <div className="quest-copy">
                          <h3>{quest.title}</h3>
                          <p>
                            {quest.kind === 'water'
                              ? `${number(day.waterMl)} / 2.000 ml`
                              : quest.kind === 'nutrition'
                                ? `${day.meals.length} catatan · ${number(calories)} kkal`
                                : quest.kind === 'cardio' && day.cardio
                                  ? `${ACTIVITY_LABELS[day.cardio.activity]} · ${day.cardio.minutes} menit${day.cardio.distanceKm !== null ? ` · ${day.cardio.distanceKm} km` : ''}`
                                  : quest.description}
                          </p>
                        </div>
                        <span className={`quest-badge ${quest.required ? 'required' : ''}`}>
                          {quest.required ? 'Wajib' : 'Opsional'}
                        </span>
                        <span className="quest-xp">+{quest.xp} EXP</span>
                        {quest.kind === 'water' && !quest.done ? (
                          <button
                            className="quest-action water-add"
                            onClick={() =>
                              editDay(
                                (log) => {
                                  log.waterMl = Math.min(10000, log.waterMl + 250);
                                },
                                'Air minum ditambahkan.',
                                day.waterMl < 2000 && day.waterMl + 250 >= 2000 ? 10 : undefined,
                              )
                            }
                          >
                            +250 ml <Droplet size={14} />
                          </button>
                        ) : quest.kind !== 'toggle' ? (
                          <button
                            className="quest-action"
                            onClick={() => {
                              if (quest.kind !== 'toggle') setModal(quest.kind);
                            }}
                          >
                            {quest.done
                              ? 'Lihat catatan'
                              : quest.kind === 'nutrition'
                                ? 'Catat makan'
                                : 'Catat sesi'}
                            <ChevronRight size={15} />
                          </button>
                        ) : (
                          <button
                            className={`quest-action ${quest.done ? 'done-action' : ''}`}
                            onClick={() =>
                              quest.id === 'core' && !quest.done
                                ? setModal('core')
                                : handleQuest(quest)
                            }
                          >
                            {quest.done
                              ? 'Selesai'
                              : quest.id === 'core'
                                ? 'Lihat latihan'
                                : 'Selesaikan'}
                            {quest.done ? <Check size={15} /> : <ChevronRight size={15} />}
                          </button>
                        )}
                      </article>
                    ))}
                  {quests.filter(
                    (q) => filter === 'all' || (filter === 'required' ? q.required : !q.required),
                  ).length === 0 && (
                    <div className="empty-state panel">
                      <p>Belum ada quest pada filter ini.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
            {state.pms && (
              <div className="pms-info">
                <Moon size={18} />
                <span>
                  Mode PMS aktif: quest shalat dan puasa ditiadakan. Target dan streak tetap
                  menyesuaikan.
                </span>
              </div>
            )}
            <div className="secondary-panels">
              <div className="fold-panel panel">
                <button onClick={() => setShowWeek((v) => !v)} aria-expanded={showWeek}>
                  <CalendarDays size={20} />
                  <span>Jadwal minggu ini</span>
                  <ChevronDown className={showWeek ? 'rotated' : ''} size={18} />
                </button>
                {showWeek && (
                  <div className="week-summary">
                    {Array.from({ length: 7 }, (_, i) => addDays(date, i)).map((key) => (
                      <div key={key}>
                        <span>
                          {new Intl.DateTimeFormat('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            timeZone: 'Asia/Jakarta',
                          }).format(new Date(`${key}T12:00:00+07:00`))}
                        </span>
                        <small>
                          {gymType(state, key)
                            ? `${gymType(state, key) === 'upper' ? 'Upper' : 'Lower'} Body`
                            : 'Cardio'}
                        </small>
                      </div>
                    ))}
                    <button className="text-button" onClick={() => navigate('schedule')}>
                      Buka jadwal <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
              <div className="fold-panel panel">
                <button onClick={() => setModal('challenge')}>
                  <Trophy size={20} />
                  <span>Challenge bulanan</span>
                  <small>
                    {stats.monthlyJoined
                      ? `${stats.monthlyCount} / ${stats.monthlyTarget} sesi`
                      : 'Lihat pilihan'}
                  </small>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}

        {tab === 'schedule' && (
          <section className="schedule-view">
            <div className="schedule-hero panel">
              <div>
                <p className="eyebrow">ONE DAY, ONE STEP</p>
                <h2>
                  Rencanakan hari,
                  <br />
                  jalani dengan seimbang.
                </h2>
                <p>Kuliah, latihan, dan waktu untuk diri sendiri dalam satu alur.</p>
              </div>
              <Image
                src={assetPath('/assets/decorations/sidebar-water-crystals.png')}
                width={220}
                height={250}
                alt=""
              />
            </div>
            <AcademicSummary state={state} date={date} edit={() => setModal('academic')} />
            <div className="section-heading">
              <h2>{day.scheduleApproved ? 'Jadwal disetujui' : 'Usulan hari ini'}</h2>
              <span className="status-pill">
                {state.pms
                  ? 'Mode PMS'
                  : quests.some((q) => q.id === 'fasting')
                    ? 'Berpuasa'
                    : 'Tidak berpuasa'}
              </span>
            </div>
            {!started ? (
              <div className="empty-state panel">
                <CalendarDays size={36} />
                <h3>Perjalananmu belum dimulai.</h3>
                <p>Aktifkan perjalanan untuk menyusun jadwal pribadi.</p>
                <button className="btn btn-primary" onClick={() => setModal('start')}>
                  Mulai Perjalanan
                </button>
              </div>
            ) : (
              <>
                <div className="agenda" role="list" aria-label="Agenda harian">
                  {(day.scheduleApproved ? day.schedule : planned.items).map((item) => (
                    <div
                      key={item.id}
                      className={`agenda-item panel ${item.locked ? 'fixed' : ''}`}
                      role="listitem"
                    >
                      <span className="agenda-marker" />
                      {item.kind === 'class' ? (
                        <ShieldCheck size={21} />
                      ) : item.kind === 'gym' ? (
                        <Dumbbell size={21} />
                      ) : item.kind === 'cardio' ? (
                        <Footprints size={21} />
                      ) : (
                        <Clock size={21} />
                      )}
                      <strong>
                        {item.start} – {item.end}
                      </strong>
                      <div>
                        <h3>{item.title}</h3>
                        <p>
                          {item.locked
                            ? 'Waktu tetap · dari jadwal kuliah'
                            : day.scheduleApproved
                              ? 'Jadwal yang kamu setujui'
                              : 'Usulan · belum diterapkan'}
                        </p>
                      </div>
                      {!item.locked && (
                        <span className="quest-badge required">
                          {day.scheduleApproved ? 'Disetujui' : 'Usulan'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {planned.warning && !day.scheduleApproved && (
                  <div className="notice warning">
                    <Info size={19} />
                    <p>{planned.warning}</p>
                  </div>
                )}
                <div className="notice">
                  <Sun size={19} />
                  <p>
                    Quest shalat dicatat manual. Pastikan waktu ibadah berdasarkan jadwal Bandung;
                    jam berbuka tidak diperkirakan sebagai waktu pasti.
                  </p>
                </div>
                <div className="schedule-approval panel">
                  <div>
                    <h3>
                      {day.scheduleApproved ? 'Jadwal hari ini tersimpan' : 'Jadwal belum berubah'}
                    </h3>
                    <p>
                      {day.scheduleApproved
                        ? 'Kamu tetap bisa meninjau dan mengubah waktunya.'
                        : 'Tinjau usulan sebelum diterapkan.'}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setProposal(day.scheduleApproved ? day.schedule : planned.items);
                      setModal('schedule');
                    }}
                  >
                    {day.scheduleApproved ? 'Ubah jadwal' : 'Tinjau usulan'}
                    <ArrowRight size={17} />
                  </button>
                  {day.scheduleApproved && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setProposal(planned.items);
                        setModal('schedule');
                      }}
                    >
                      Buat usulan baru
                    </button>
                  )}
                  <small>
                    <Info size={14} />
                    Perubahan jadwal kuliah tidak mengubah agenda ini otomatis. Tinjau usulan baru
                    untuk menerapkannya. Tugas tidak dipindah ke hari lain tanpa persetujuan.
                  </small>
                </div>
                <details className="missed-days panel">
                  <summary>
                    <Clock size={18} />
                    Riwayat hari terlewat
                    <ChevronDown size={17} />
                  </summary>
                  <div>
                    {Array.from(
                      {
                        length: Math.min(
                          30,
                          Math.max(
                            0,
                            Math.floor(
                              (new Date(`${date}T12:00:00+07:00`).getTime() -
                                new Date(`${state.startedAt}T12:00:00+07:00`).getTime()) /
                                86400000,
                            ),
                          ),
                        ),
                      },
                      (_, i) => addDays(date, -i - 1),
                    ).map((key) => {
                      const past = getQuests(state, key).filter((q) => q.required);
                      const missed = past.filter((q) => !q.done);
                      return (
                        <div className="history-day" key={key}>
                          <span>{dateLabel(key)}</span>
                          <span className={missed.length ? 'muted' : 'emerald-text'}>
                            {missed.length
                              ? `${missed.length} quest terlewat`
                              : 'Semua target selesai'}
                          </span>
                        </div>
                      );
                    })}
                    {state.startedAt === date && (
                      <p className="muted">Belum ada riwayat. Hari ini adalah langkah pertamamu.</p>
                    )}
                  </div>
                </details>
              </>
            )}
          </section>
        )}

        {tab === 'progress' && (
          <>
            <div className="adventure-shortcuts">
              <button className="btn btn-secondary" onClick={() => navigate('spellbook')}>
                <BookOpen size={17} />
                Spellbook & Bahasa
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('trials')}>
                <Compass size={17} />
                Trial Gates
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('rewards')}>
                <Gift size={17} />
                Reward
              </button>
            </div>
            {canProgress && (
              <div className="progression-callout panel">
                <Sparkles size={22} />
                <div>
                  <strong>Siap meninjau langkah berikutnya?</strong>
                  <p>
                    Lima sesi atau lebih tercatat tanpa intensitas berat. Target tetap berubah hanya
                    setelah persetujuanmu.
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={() => setModal('training')}>
                  Tinjau usulan
                </button>
              </div>
            )}
            <ProgressView
              state={state}
              stats={stats}
              date={date}
              onOpenAchievements={() => navigate('achievements')}
            />
          </>
        )}
        {tab === 'achievements' && (
          <AchievementsView stats={stats} onRewards={() => navigate('rewards')} />
        )}
        {tab === 'spellbook' && (
          <SpellbookView state={state} stats={stats} date={date} commit={adventureCommit} />
        )}
        {tab === 'trials' && (
          <TrialsView state={state} stats={stats} date={date} commit={adventureCommit} />
        )}
        {tab === 'rewards' && (
          <RewardsView state={state} stats={stats} date={date} commit={adventureCommit} />
        )}
        {tab === 'profile' && (
          <section className="profile-view">
            <div className="profile-card panel">
              <Image
                src={assetPath('/assets/characters/iris-portrait.png')}
                alt="Karakter Iris"
                width={160}
                height={160}
              />
              <div>
                <p className="eyebrow">YOUR HUNTER IDENTITY</p>
                <h2>{state.settings.name}</h2>
                <p className="emerald-text">{hunterTitle(stats.level)}</p>
                <span className="status-pill">
                  Level {String(stats.level).padStart(2, '0')} · {number(stats.xp)} EXP
                </span>
              </div>
            </div>
            <form
              className="panel settings-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const wakeTime = String(form.get('wakeTime'));
                const sleepTime = String(form.get('sleepTime'));
                if (wakeTime >= sleepTime) {
                  notify('Waktu tidur harus setelah waktu bangun pada hari yang sama.');
                  return;
                }
                update((draft) => {
                  draft.settings.name = String(form.get('name')).trim() || 'Iris';
                  draft.settings.wakeTime = wakeTime;
                  draft.settings.sleepTime = sleepTime;
                  draft.settings.commuteMinutes = Number(form.get('commuteMinutes'));
                  if (draft.startedAt)
                    draft.days[todayKey()] ??= emptyDay(
                      draft.pms,
                      draft.settings.cardioTargetMinutes,
                    );
                  draft.settings.cardioTargetMinutes = Number(form.get('cardioTargetMinutes'));
                });
                notify(
                  'Profil dan waktu luang tersimpan. Jadwal yang disetujui tidak diubah otomatis.',
                );
              }}
            >
              <h2>Ritme harianmu</h2>
              <label>
                Nama Hunter
                <input name="name" maxLength={30} required defaultValue={state.settings.name} />
              </label>
              <div className="field-pair">
                <label>
                  Waktu bangun
                  <input
                    type="time"
                    name="wakeTime"
                    required
                    defaultValue={state.settings.wakeTime}
                  />
                </label>
                <label>
                  Waktu tidur
                  <input
                    type="time"
                    name="sleepTime"
                    required
                    defaultValue={state.settings.sleepTime}
                  />
                </label>
              </div>
              <label>
                Perjalanan kuliah (menit, satu arah)
                <input
                  type="number"
                  name="commuteMinutes"
                  min={0}
                  max={180}
                  required
                  defaultValue={state.settings.commuteMinutes}
                />
              </label>
              <label>
                Target cardio (menit)
                <input
                  type="number"
                  name="cardioTargetMinutes"
                  min={30}
                  max={120}
                  step={5}
                  required
                  defaultValue={state.settings.cardioTargetMinutes}
                />
                <small className="muted">
                  Perubahan berlaku pada hari berikutnya. Target hari yang sudah tercatat tetap
                  sama.
                </small>
              </label>
              <div className="setting-info">
                <Clock size={18} />
                <span>
                  Zona waktu tetap <strong>WIB · Bandung</strong>
                  <small>Hari berganti pukul 00.00 WIB.</small>
                </span>
              </div>
              <button className="btn btn-primary" type="submit">
                Simpan pengaturan <Check size={17} />
              </button>
            </form>
            <div className="panel account-card">
              <h2>Akun & sinkronisasi</h2>
              <div className="account-status">
                {user ? <Cloud size={24} /> : <CloudOff size={24} />}
                <div>
                  <strong>{user?.email ?? 'Tersimpan di perangkat ini'}</strong>
                  <p>
                    {user
                      ? syncStatus === 'synced'
                        ? 'Perubahan sudah disinkronkan.'
                        : 'Status sinkronisasi: ' + syncStatus
                      : cloudAvailable
                        ? 'Masuk untuk mengakses perjalanan akunmu lintas perangkat.'
                        : 'Sinkronisasi Google/Supabase belum diaktifkan.'}
                  </p>
                </div>
              </div>
              {user ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => void journey.logout().catch((e) => notify(e.message))}
                >
                  <LogOut size={17} />
                  Keluar akun
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={!cloudAvailable}
                  onClick={() => void journey.login().catch((e) => notify(e.message))}
                >
                  <LogIn size={17} />
                  Masuk dengan Google
                </button>
              )}
              {!cloudAvailable && (
                <p className="form-footnote">
                  Untuk mengaktifkan akun lintas perangkat, ikuti panduan Supabase yang disertakan
                  bersama proyek. Data di perangkat ini tetap bisa digunakan dan dicadangkan.
                </p>
              )}
              <p className="form-footnote">
                Perjalanan perangkat dan perjalanan akun dipisahkan. Gunakan ekspor/impor jika ingin
                memindahkan catatan.
              </p>
            </div>
            <div className="panel backup-card">
              <h2>Cadangan perjalanan</h2>
              <p className="muted">
                Unduh catatan pribadi sebagai JSON. Cadangan mencakup aktivitas, mode harian, dan
                jadwal.
              </p>
              <div className="button-row">
                <button className="btn btn-secondary" onClick={downloadBackup}>
                  <Download size={17} />
                  Unduh cadangan
                </button>
                <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
                  <Upload size={17} />
                  Pulihkan cadangan
                </button>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    void importBackup(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </section>
        )}
        <footer className="app-footer">
          <span>
            <Waves size={15} /> Kebiasaan hari ini, arus besar untuk nanti.
          </span>
          <button onClick={() => navigate('profile')}>
            <span className={`connection-dot ${syncStatus === 'synced' ? 'online' : ''}`} />
            {syncStatus === 'synced'
              ? 'Tersinkron'
              : syncStatus === 'saving'
                ? 'Menyinkronkan…'
                : 'Penyimpanan perangkat'}
          </button>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="Navigasi ponsel">
        {NAV.filter((n) => ['today', 'schedule', 'progress', 'profile'].includes(n.id)).map(
          (item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={21} />
              <span>{item.label}</span>
            </button>
          ),
        )}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {(toast.xp || toast.text.startsWith('Level up')) && (
            <Image
              className="toast-burst"
              src={assetPath('/assets/effects/quest-complete-burst.png')}
              alt=""
              width={80}
              height={80}
            />
          )}
          <span className="toast-icon">
            <Check size={19} />
          </span>
          <div>
            <strong>{toast.text}</strong>
            {toast.xp !== undefined && <span>+{toast.xp} EXP</span>}
          </div>
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Tutup pemberitahuan"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          title={
            modal === 'start'
              ? 'Mulai perjalananmu'
              : modal === 'cardio'
                ? 'Catat Cardio'
                : modal === 'gym'
                  ? (currentGym ?? day.gym?.type) === 'lower'
                    ? 'Lower Body'
                    : 'Upper Body'
                  : modal === 'water'
                    ? 'Air minum hari ini'
                    : modal === 'nutrition'
                      ? 'Catat makanan'
                      : modal === 'challenge'
                        ? 'Challenge bulanan'
                        : modal === 'language'
                          ? 'Belajar bahasa'
                          : modal === 'reading'
                            ? 'Spellbook Iris'
                            : modal === 'academic'
                              ? 'Atur jadwal kuliah'
                              : modal === 'schedule'
                                ? 'Tinjau jadwal hari ini'
                                : modal === 'conflict'
                                  ? 'Perubahan dari perangkat lain'
                                  : modal === 'training'
                                    ? 'Usulan progres latihan'
                                    : modal === 'core'
                                      ? 'Core pagi'
                                      : 'Pengingat Iris'
          }
          close={close}
          wide={
            modal === 'schedule' ||
            modal === 'academic' ||
            modal === 'language' ||
            modal === 'reading'
          }
        >
          {modal === 'start' && (
            <div className="journey-start">
              <div className="journey-start-art">
                <Image
                  src={assetPath('/assets/characters/iris-onboarding.png')}
                  alt="Iris dengan kekuatan air dan berlian hijau"
                  width={600}
                  height={900}
                />
              </div>
              <p className="eyebrow">EMERALD TIDE INITIATE</p>
              <h3>Perjalananmu dimulai, {state.settings.name}.</h3>
              <p>
                Mulai dari Level 01. Quest hari ini dibuat sesuai rutinitas dan Mode PMS yang kamu
                pilih.
              </p>
              <div className="start-details">
                <span>
                  <Clock size={17} /> WIB · Bandung
                </span>
                <span>
                  <Moon size={17} /> Mode PMS {state.pms ? 'aktif' : 'nonaktif'}
                </span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  update((draft) => {
                    if (!draft.startedAt) {
                      draft.startedAt = todayKey();
                      draft.days[draft.startedAt] = emptyDay(
                        draft.pms,
                        draft.settings.cardioTargetMinutes,
                      );
                    }
                  });
                  setModal(null);
                  notify('Perjalanan dimulai. Selamat datang, Emerald Tide Initiate!');
                }}
              >
                Mulai Perjalanan <ArrowRight size={17} />
              </button>
              <small>
                Quest dan streak dihitung mulai hari ini. Tidak ada denda pengurangan EXP.
              </small>
            </div>
          )}
          {modal === 'cardio' && (
            <CardioForm
              initial={day.cardio}
              target={day.cardioTargetMinutes}
              save={saveCardio}
              remove={() => {
                editDay((log) => {
                  log.cardio = null;
                }, 'Sesi cardio dibatalkan beserta reward terkait.');
                setModal(null);
              }}
            />
          )}
          {modal === 'gym' && (
            <GymForm
              initial={day.gym}
              type={currentGym ?? day.gym?.type ?? 'upper'}
              save={saveGym}
              remove={() => {
                editDay((log) => {
                  log.gym = null;
                }, 'Sesi gym dibatalkan beserta reward terkait.');
                setModal(null);
              }}
            />
          )}
          {modal === 'water' && (
            <div className="form-stack">
              <div className="water-total">
                <Droplet size={45} />
                <strong>
                  {number(day.waterMl)} <small>ml</small>
                </strong>
                <span>Target 2.000 ml</span>
              </div>
              <ProgressBar value={day.waterMl} max={2000} label="Progres air minum" />
              <div className="button-row water-controls">
                <button
                  className="btn btn-secondary"
                  disabled={day.waterMl === 0}
                  onClick={() =>
                    editDay((log) => {
                      log.waterMl = Math.max(0, log.waterMl - 250);
                    }, 'Catatan air diperbarui.')
                  }
                >
                  <Minus size={17} />
                  250 ml
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    editDay(
                      (log) => {
                        log.waterMl = Math.min(10000, log.waterMl + 250);
                      },
                      'Air minum ditambahkan.',
                      day.waterMl < 2000 && day.waterMl + 250 >= 2000 ? 10 : undefined,
                    )
                  }
                >
                  <Plus size={17} />
                  250 ml
                </button>
              </div>
              <p className="form-footnote">
                +10 EXP sekali saat target tercapai. Mengoreksi jumlah air menyesuaikan reward
                terkait.
              </p>
              {!state.pms && quests.some((q) => q.id === 'fasting') && (
                <p className="notice">
                  <Moon size={17} />
                  Catat air yang diminum saat sahur dan setelah berbuka.
                </p>
              )}
            </div>
          )}
          {modal === 'nutrition' && (
            <div className="form-stack">
              <div className="calorie-summary">
                <Utensils size={26} />
                <strong>
                  {number(calories)} <small>/ 1.700 kkal</small>
                </strong>
              </div>
              <p className="muted">
                Reward untuk konsistensi mencatat, bukan semakin sedikit makan.
              </p>
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(mealCalories);
                  if (!mealName.trim() || !Number.isFinite(amount) || amount < 1 || amount > 5000) {
                    setFormError('Isi nama makanan dan kalori antara 1–5.000 kkal.');
                    return;
                  }
                  const first = day.meals.length === 0;
                  editDay(
                    (log) => {
                      log.meals.push({
                        id: crypto.randomUUID(),
                        name: mealName.trim(),
                        calories: amount,
                        time: timeNow(),
                      });
                    },
                    'Makanan tercatat.',
                    first ? 10 : undefined,
                  );
                  setMealName('');
                  setMealCalories('');
                  setFormError('');
                }}
              >
                <label>
                  Makanan
                  <input
                    maxLength={80}
                    required
                    placeholder="Contoh: nasi, ayam, dan sayur"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                  />
                </label>
                <label>
                  Kalori (kkal)
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    required
                    value={mealCalories}
                    onChange={(e) => setMealCalories(e.target.value)}
                  />
                </label>
                {formError && (
                  <p role="alert" className="form-error">
                    {formError}
                  </p>
                )}
                <button type="submit" className="btn btn-primary">
                  <Plus size={17} />
                  Tambah catatan
                </button>
              </form>
              <div className="meal-list">
                {day.meals.map((meal) => (
                  <div key={meal.id}>
                    <div>
                      <strong>{meal.name}</strong>
                      <small>
                        {meal.time} · {number(meal.calories)} kkal
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Hapus ${meal.name}`}
                      onClick={() =>
                        editDay((log) => {
                          log.meals = log.meals.filter((m) => m.id !== meal.id);
                        }, 'Catatan makanan dihapus.')
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {modal === 'training' && (
            <div className="form-stack">
              <div className="form-callout">
                <Footprints size={23} />
                <span>
                  Target saat ini <strong>{state.settings.cardioTargetMinutes} menit</strong>
                  <small>
                    {comfortableSessions} sesi di target ini tercatat tanpa intensitas berat.
                  </small>
                </span>
              </div>
              <h3>Usulan: tambah 5 menit.</h3>
              <p className="muted">
                Ini pilihan, bukan kewajiban. Kamu boleh mempertahankan target. Catatan intensitas
                hanya menjadi petunjuk untuk meninjau progres, bukan penilaian kondisi fisik.
              </p>
              <button
                className="btn btn-primary"
                disabled={!canProgress}
                onClick={() => {
                  update((draft) => {
                    draft.days[todayKey()] ??= emptyDay(
                      draft.pms,
                      draft.settings.cardioTargetMinutes,
                    );
                    draft.settings.cardioTargetMinutes = Math.min(
                      120,
                      draft.settings.cardioTargetMinutes + 5,
                    );
                  });
                  setModal(null);
                  notify(
                    'Target baru disetujui untuk hari berikutnya. Riwayat dan target hari ini tetap sama.',
                  );
                }}
              >
                Setujui {Math.min(120, state.settings.cardioTargetMinutes + 5)} menit mulai besok
              </button>
              <button className="btn btn-secondary" onClick={close}>
                Pertahankan target
              </button>
            </div>
          )}
          {modal === 'core' && (
            <div className="form-stack">
              <div className="form-callout">
                <Sparkles size={22} />
                <span>
                  Sesi singkat · program awal
                  <small>Mulai satu putaran dengan gerakan yang terasa nyaman.</small>
                </span>
              </div>
              <div className="core-movements">
                <div>
                  <strong>Dead bug</strong>
                  <span>6 repetisi per sisi, perlahan</span>
                </div>
                <div>
                  <strong>Bird dog</strong>
                  <span>6 repetisi per sisi</span>
                </div>
                <div>
                  <strong>Plank</strong>
                  <span>10–15 detik, lalu istirahat</span>
                </div>
              </div>
              <p className="muted">
                Durasi bebas. Tambah putaran atau waktu secara bertahap jika nyaman; tidak ada
                kenaikan otomatis maupun denda melewatkan quest opsional.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const quest = quests.find((q) => q.id === 'core');
                  if (quest && !quest.done) handleQuest(quest);
                  setModal(null);
                }}
              >
                Tandai latihan selesai <Check size={17} />
              </button>
            </div>
          )}
          {modal === 'challenge' && (
            <MonthlyPanel stats={stats} state={state} date={date} onJoin={joinChallenge} />
          )}
          {modal === 'language' && (
            <LanguagePanel state={state} stats={stats} date={date} commit={adventureCommit} />
          )}
          {modal === 'reading' && (
            <SpellbookView
              readingOnly
              state={state}
              stats={stats}
              date={date}
              commit={adventureCommit}
            />
          )}
          {modal === 'academic' && (
            <AcademicEditor
              state={state}
              date={date}
              saveWeekly={(schedule) => {
                update((draft) => {
                  draft.academicSchedules = [
                    ...draft.academicSchedules.filter(
                      (s) => s.effectiveFrom !== schedule.effectiveFrom && s.id !== schedule.id,
                    ),
                    schedule,
                  ].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
                });
                setModal(null);
                notify(
                  'Jadwal kuliah tersimpan. Agenda yang sudah disetujui tetap dipertahankan; tinjau usulan baru untuk menerapkannya.',
                );
              }}
              saveException={(from, to, entry) => {
                update((draft) => {
                  for (let key = from; key <= to; key = addDays(key, 1)) {
                    if (entry) draft.academicExceptions[key] = structuredClone(entry);
                    else delete draft.academicExceptions[key];
                  }
                });
                setModal(null);
                notify(
                  entry
                    ? 'Pengecualian tersimpan. Jadwal harian yang sudah disetujui tidak diubah otomatis.'
                    : 'Pengecualian dihapus. Usulan kembali mengikuti rutinitas mingguan.',
                );
              }}
              removeWeekly={(id) => {
                update((draft) => {
                  draft.academicSchedules = draft.academicSchedules.filter(
                    (s) => s.id !== id || s.effectiveFrom < date,
                  );
                });
                notify(
                  'Jadwal mendatang dihapus. Riwayat dan agenda yang sudah disetujui tetap aman.',
                );
              }}
            />
          )}
          {modal === 'schedule' && (
            <ScheduleEditor
              items={proposal}
              state={state}
              approve={(items) => {
                editDay((log) => {
                  log.schedule = items;
                  log.scheduleApproved = true;
                }, 'Jadwal hari ini disetujui.');
                setModal(null);
              }}
            />
          )}
          {modal === 'notifications' && (
            <div className="form-stack">
              <div className="notification-art">
                <Bell size={38} />
              </div>
              <h3>Pengingat untuk langkah berikutnya.</h3>
              <p className="muted">
                Iris mengingatkan sesi gym dan cardio pada jadwal yang sudah kamu setujui, selama
                aplikasi terbuka. Pengiriman saat aplikasi tertutup belum tersedia.
              </p>
              <button
                className="btn btn-primary"
                disabled={!notificationSupport()}
                onClick={() => void enableNotifications()}
              >
                {state.settings.notificationsEnabled
                  ? 'Nonaktifkan pengingat'
                  : 'Aktifkan pengingat'}
                <Bell size={17} />
              </button>
              {!notificationSupport() && (
                <p className="form-footnote">
                  Browser ini belum mendukung notifikasi. Gunakan HTTPS atau localhost pada browser
                  yang mendukung.
                </p>
              )}
              <p className="form-footnote">Tidak ada pengingat shalat/puasa selama Mode PMS.</p>
            </div>
          )}
          {modal === 'conflict' && (
            <div className="form-stack">
              <p>
                Perjalanan berubah di perangkat lain. Agar tidak menimpa perubahan tersebut,
                sinkronisasi dihentikan sementara.
              </p>
              <p className="muted">
                Unduh cadangan lokal sebelum mengambil versi cloud. Salinan lokal juga disimpan
                sebagai cadangan di browser.
              </p>
              <button className="btn btn-secondary" onClick={downloadBackup}>
                <Download size={17} />
                Unduh cadangan lokal
              </button>
              <button
                className="btn btn-primary"
                onClick={() =>
                  void journey
                    .resolveConflict()
                    .then(() => {
                      setModal(null);
                      notify('Versi cloud terbaru sudah dimuat.');
                    })
                    .catch((e) => notify(e.message))
                }
              >
                <RefreshCw size={17} />
                Gunakan versi cloud
              </button>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
