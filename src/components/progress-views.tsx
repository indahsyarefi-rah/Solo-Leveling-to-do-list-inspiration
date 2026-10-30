'use client';

import { useState } from 'react';

import { assetPath } from '@/lib/paths';

import Image from 'next/image';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Gem,
  History,
  LockKeyhole,
  Sparkles,
  Trophy,
  Waves,
} from 'lucide-react';
import {
  addDays,
  dateLabel,
  getQuests,
  todayKey,
  type AppState,
  type Attribute,
  type Badge,
  type Stats,
} from '@/lib/engine';
import './progress.css';

const ATTRIBUTE_INFO: Record<
  Attribute,
  { name: string; description: string; Icon: typeof Dumbbell }
> = {
  strength: { name: 'Strength', description: 'Latihan kekuatan dan core', Icon: Dumbbell },
  endurance: { name: 'Endurance', description: 'Cardio dan olahraga alternatif', Icon: Droplets },
  discipline: { name: 'Discipline', description: 'Konsistensi rutinitas harian', Icon: Sparkles },
};

function percent(value: number, target: number) {
  return target > 0 ? Math.max(0, Math.min(100, (value / target) * 100)) : 0;
}

function readableNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

function Meter({
  value,
  target,
  label,
  className = '',
}: {
  value: number;
  target: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`progress-meter ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, target)}
      aria-valuenow={Math.min(Math.max(0, value), Math.max(1, target))}
    >
      <span style={{ width: `${percent(value, target)}%` }} />
    </div>
  );
}

function BadgeArtwork({ badge, priority = false }: { badge: Badge; priority?: boolean }) {
  return (
    <div className={`achievement-artwork ${badge.unlocked ? 'is-unlocked' : 'is-locked'}`}>
      <Image
        src={badge.image}
        alt={`Badge ${badge.title}`}
        fill
        sizes="(max-width: 600px) 150px, 220px"
        priority={priority}
      />
      {!badge.unlocked && (
        <span className="achievement-lock">
          <LockKeyhole size={17} aria-hidden="true" />
          <span className="progress-sr-only">Terkunci</span>
        </span>
      )}
    </div>
  );
}

export function ProgressView({
  state,
  stats,
  date,
  onOpenAchievements,
}: {
  state: AppState;
  stats: Stats;
  date: string;
  onOpenAchievements: () => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(date, index - 6);
    const count = getQuests(state, day).filter((quest) => quest.done).length;
    const label = new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(`${day}T12:00:00Z`));
    return { day, count, label };
  });
  const maxCount = Math.max(4, ...days.map((day) => day.count));
  const weekTotal = days.reduce((total, day) => total + day.count, 0);
  const historyDays = new Set(Object.keys(state.days));
  for (const [day, log] of Object.entries(state.days)) {
    if (
      !log.completions.includes('alternative') &&
      !(log.cardio?.activity === 'swim' && log.cardio.minutes > 0)
    )
      continue;
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    const sunday = addDays(day, (7 - weekday) % 7);
    if (sunday <= date) historyDays.add(sunday);
  }
  const entries = [...historyDays]
    .filter((day) => day <= date && (!state.startedAt || day >= state.startedAt))
    .sort()
    .reverse()
    .flatMap((day) => {
      return getQuests(state, day)
        .filter((quest) => quest.done)
        .map((quest) => ({ date: day, quest }));
    })
    .slice(0, 8);
  const unlockedCount = stats.badges.filter((badge) => badge.unlocked).length;

  return (
    <div className="progress-view">
      <header className="progress-page-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL GROWTH</p>
          <h2 className="progress-intro-title">Kekuatan yang tumbuh bersamamu.</h2>
          <p className="muted">Setiap langkah kecil membentuk perjalananmu.</p>
        </div>
        <span className="progress-date-chip">
          <CalendarDays size={16} aria-hidden="true" /> Tujuh hari terakhir
        </span>
      </header>

      <div className="progress-summary-grid">
        <div className="panel progress-summary-card">
          <Gem className="progress-summary-icon" aria-hidden="true" />
          <div>
            <p>Level Hunter</p>
            <strong className="progress-summary-level">
              {String(stats.level).padStart(2, '0')}
            </strong>
            <span className="progress-summary-detail">
              {readableNumber(stats.xp)} EXP terkumpul
            </span>
          </div>
        </div>
        <div className="panel progress-summary-card">
          <Flame className="progress-summary-icon is-gold" aria-hidden="true" />
          <div>
            <p>Streak hari sempurna</p>
            <strong>
              {stats.streak}
              <span> hari</span>
            </strong>
            <span className="progress-summary-detail">Quest wajib terselesaikan</span>
          </div>
        </div>
        <div className="panel progress-summary-card">
          <Check className="progress-summary-icon is-emerald" aria-hidden="true" />
          <div>
            <p>Quest selesai</p>
            <strong>{readableNumber(stats.completed)}</strong>
            <span className="progress-summary-detail">Seluruh perjalananmu</span>
          </div>
        </div>
      </div>

      <section className="panel progress-attributes">
        <div className="progress-portrait">
          <Image
            src={assetPath('/assets/characters/iris-portrait.png')}
            alt="Iris, magician air dengan kristal zamrud"
            fill
            sizes="(max-width: 700px) 180px, 400px"
          />
          <span className="progress-portrait-aura" />
        </div>
        <div className="progress-attributes-content">
          <div className="progress-attributes-heading">
            <h2>Atribut Hunter</h2>
            <span>Progres aktivitas dalam aplikasi</span>
          </div>
          {(Object.keys(ATTRIBUTE_INFO) as Attribute[]).map((key) => {
            const { name, description, Icon } = ATTRIBUTE_INFO[key];
            const attribute = stats.attributes[key];
            return (
              <div className={`progress-attribute-row is-${key}`} key={key}>
                <Icon size={24} aria-hidden="true" />
                <div className="progress-attribute-name">
                  <strong>{name}</strong>
                  <span>Level {String(attribute.level).padStart(2, '0')}</span>
                  <span className="progress-sr-only">{description}</span>
                </div>
                <div className="progress-attribute-meter">
                  <Meter
                    value={attribute.levelXp}
                    target={attribute.nextLevelXp}
                    label={`EXP ${name}`}
                    className={key === 'discipline' ? 'is-emerald' : ''}
                  />
                </div>
                <span className="progress-attribute-value">
                  {attribute.levelXp} / {attribute.nextLevelXp}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="progress-detail-grid">
        <section className="panel progress-chart-panel">
          <div className="progress-card-heading">
            <h2>Ritme tujuh hari</h2>
            <span>{weekTotal} quest</span>
          </div>
          <div
            className="progress-chart"
            role="img"
            aria-label={`Quest selesai tujuh hari terakhir: ${days.map((day) => `${day.label} ${day.count}`).join(', ')}`}
          >
            <div className="progress-chart-guide">
              <span>{maxCount}</span>
              <span>{Math.ceil(maxCount / 2)}</span>
              <span>0</span>
            </div>
            <div className="progress-chart-columns">
              {days.map((day) => (
                <div
                  className={`progress-chart-column ${day.day === date ? 'is-today' : ''}`}
                  key={day.day}
                >
                  <div className="progress-chart-track">
                    <div
                      className={`progress-chart-bar ${day.count === 0 ? 'is-zero' : ''}`}
                      style={{ height: `${Math.max(2, percent(day.count, maxCount))}%` }}
                    >
                      <span>{day.count}</span>
                    </div>
                  </div>
                  <span className="progress-chart-label">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="progress-chart-caption">
            Quest yang benar-benar selesai, termasuk quest opsional.
          </p>
        </section>

        <section className="panel progress-badges-panel">
          <div className="progress-card-heading">
            <h2>Achievement</h2>
            <button
              type="button"
              className="progress-text-button"
              onClick={onOpenAchievements}
              aria-label="Lihat seluruh achievement"
            >
              <span>
                {unlockedCount} / {stats.badges.length}
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="progress-badge-preview">
            {stats.badges.slice(0, 3).map((badge) => (
              <button
                type="button"
                key={badge.id}
                className={`progress-preview-badge ${badge.unlocked ? 'is-unlocked' : ''}`}
                onClick={onOpenAchievements}
                aria-label={`${badge.title}, ${badge.unlocked ? 'terbuka' : 'terkunci'}`}
              >
                <BadgeArtwork badge={badge} />
                <strong>{badge.title}</strong>
                <span>
                  {badge.unlocked
                    ? 'Terbuka'
                    : `${Math.min(badge.progress, badge.target)} / ${badge.target}`}
                </span>
              </button>
            ))}
          </div>
          <button className="progress-all-badges" type="button" onClick={onOpenAchievements}>
            Jelajahi achievement <ArrowRight size={15} aria-hidden="true" />
          </button>
        </section>
      </div>

      <section className="panel progress-history">
        <div className="progress-card-heading">
          <h2>
            <History size={19} aria-hidden="true" /> Jejak perjalanan
          </h2>
          <span>Aktivitas terbaru</span>
        </div>
        {entries.length > 0 ? (
          <ul className="progress-history-list">
            {entries.map(({ date: entryDate, quest }) => (
              <li key={`${entryDate}-${quest.id}`}>
                <div className="progress-history-icon">
                  {quest.kind === 'gym' ? (
                    <Dumbbell size={19} />
                  ) : quest.kind === 'cardio' ? (
                    <Waves size={19} />
                  ) : (
                    <Check size={19} />
                  )}
                </div>
                <div className="progress-history-description">
                  <strong>{quest.title}</strong>
                  <span>
                    {dateLabel(entryDate)}
                    {quest.kind === 'cardio' && state.days[entryDate]?.cardio
                      ? ` · ${state.days[entryDate].cardio!.minutes} menit`
                      : ''}
                    {quest.kind === 'cardio' && state.days[entryDate]?.cardio?.distanceKm != null
                      ? ` · ${state.days[entryDate].cardio!.distanceKm} km`
                      : ''}
                  </span>
                </div>
                <span className="progress-history-exp">+{quest.xp} EXP</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="progress-empty-history">
            <History size={29} aria-hidden="true" />
            <strong>Perjalanan hebat dimulai dari satu quest.</strong>
            <p>Selesaikan quest pertamamu untuk melihat jejak progres di sini.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function AchievementsView({ stats, onRewards }: { stats: Stats; onRewards?: () => void }) {
  const [category, setCategory] = useState('Semua');
  const [limit, setLimit] = useState(12);
  const visible = stats.badges.filter((b) => category === 'Semua' || b.category === category);
  const categories = [...new Set(stats.badges.map((b) => b.category).filter(Boolean))];
  const unlocked = stats.badges.filter((badge) => badge.unlocked).length;
  return (
    <div className="achievement-view">
      <header className="progress-page-heading">
        <div>
          <p className="eyebrow">MILESTONES OF YOUR JOURNEY</p>
          <h2 className="progress-intro-title">Koleksi pencapaianmu.</h2>
          <p className="muted">Setiap kristal menyimpan jejak usahamu.</p>
        </div>
        <span className="achievement-count">
          <Trophy size={18} aria-hidden="true" /> {unlocked} / {stats.badges.length} terbuka
        </span>
      </header>
      <div className="achievement-filters">
        <label>
          Kategori achievement
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLimit(12);
            }}
          >
            <option>Semua</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {onRewards && (
          <button className="btn btn-secondary" onClick={onRewards}>
            Klaim kristal di Reward
          </button>
        )}
      </div>
      <p className="muted">
        80 milestone bertahap sampai 730 hari, 24 bulan, dan seterusnya. Hari aktif dihitung
        kumulatif; tidak semua target memerlukan streak.
      </p>
      <div className="achievement-grid">
        {visible.slice(0, limit).map((badge) => (
          <article
            key={badge.id}
            className={`panel achievement-card ${badge.unlocked ? 'is-unlocked' : 'is-locked'}`}
          >
            <span className={`achievement-status ${badge.unlocked ? 'is-unlocked' : ''}`}>
              {badge.unlocked ? <Check size={13} /> : <LockKeyhole size={13} />}
              {badge.unlocked ? 'Terbuka' : 'Terkunci'}
            </span>
            <BadgeArtwork badge={badge} />
            <h2>{badge.title}</h2>
            <p>{badge.description}</p>
            <div className="achievement-reward">+{badge.reward ?? 0} Emerald Shards · sekali</div>
            <div className="achievement-card-progress">
              <Meter
                value={badge.progress}
                target={badge.target}
                label={`Progres ${badge.title}`}
                className={badge.unlocked ? 'is-emerald' : ''}
              />
              <span>
                {Math.min(badge.progress, badge.target)} / {badge.target}
              </span>
            </div>
          </article>
        ))}
      </div>
      {visible.length > limit && (
        <button
          className="btn btn-secondary achievement-load-more"
          onClick={() => setLimit((n) => n + 12)}
        >
          Tampilkan lebih banyak ({Math.min(limit, visible.length)} / {visible.length})
        </button>
      )}
      <p className="achievement-footnote">
        <Gem size={16} aria-hidden="true" /> Achievement dihitung dari perjalananmu. Tidak ada klaim
        hadiah berulang.
      </p>
    </div>
  );
}

export function ChallengePanel({
  stats,
  onJoin,
  state,
  date = todayKey(),
}: {
  stats: Stats;
  onJoin: () => void;
  state?: AppState;
  date?: string;
}) {
  const [year, month, dayOfMonth] = date.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remainingDays = daysInMonth - dayOfMonth + 1;
  const nextMonthStart = addDays(`${date.slice(0, 7)}-${daysInMonth}`, 1);
  const nextMonth = nextMonthStart.slice(0, 7);
  const offerNextMonth = !stats.monthlyJoined && remainingDays < 12;
  const scheduledChallenge = offerNextMonth ? state?.challenges[nextMonth] : undefined;
  const startDateLabel = dateLabel(scheduledChallenge?.joinedAt ?? nextMonthStart);
  const monthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(`${offerNextMonth ? nextMonthStart : date}T12:00:00Z`));
  const count = stats.monthlyJoined ? stats.monthlyCount : 0;
  const target = scheduledChallenge?.target ?? (stats.monthlyTarget || 12);
  const todayAlreadyCounted = Boolean(
    stats.monthlyJoined &&
    state?.days[date]?.cardio &&
    state.days[date].cardio!.minutes >= 30 &&
    date >= (state.challenges[date.slice(0, 7)]?.joinedAt ?? date),
  );
  const availableDays = remainingDays - (todayAlreadyCounted ? 1 : 0);
  const cannotFinishCurrent =
    stats.monthlyJoined && !stats.monthlyComplete && target - count > availableDays;
  return (
    <div className="challenge-panel">
      <p className="eyebrow">MONTHLY CHALLENGE · {monthLabel}</p>
      <h2>Emerald Current</h2>
      <p className="challenge-intro">
        Bangun arus kecil yang konsisten. Selesaikan {target} sesi cardio{' '}
        {offerNextMonth ? 'bulan depan' : 'bulan ini'}.
      </p>
      {offerNextMonth && (
        <p className="challenge-timing-note">
          Bulan ini tersisa {remainingDays} hari. Dengan maksimal satu sesi per hari, challenge{' '}
          {target} sesi ditawarkan untuk bulan depan.
        </p>
      )}
      {cannotFinishCurrent && (
        <p className="challenge-timing-note">
          Masih diperlukan {target - count} sesi, sementara hanya {availableDays} hari yang dapat
          menambah sesi baru bulan ini. Target aktif tetap sama; seluruh progresmu tetap dicatat.
        </p>
      )}
      <div className={`challenge-ring ${stats.monthlyComplete ? 'is-complete' : ''}`}>
        <Image
          src={assetPath('/assets/effects/challenge-water-ring.png')}
          alt=""
          fill
          sizes="290px"
        />
        <div>
          <strong>
            {Math.min(count, target)}
            <span> / {target}</span>
          </strong>
          <span>sesi tercatat</span>
        </div>
      </div>
      <span className={`challenge-status ${stats.monthlyComplete ? 'is-complete' : ''}`}>
        {stats.monthlyComplete ? (
          <>
            <Check size={14} /> Challenge selesai
          </>
        ) : stats.monthlyJoined ? (
          <>
            <Waves size={14} /> Sedang berlangsung
          </>
        ) : scheduledChallenge ? (
          <>
            <CalendarDays size={14} /> Terjadwal bulan depan
          </>
        ) : (
          <>
            <Sparkles size={14} /> {offerNextMonth ? 'Mulai bulan depan' : 'Siap memulai?'}
          </>
        )}
      </span>
      <section className="challenge-rewards">
        <h3>Hadiah perjalanan</h3>
        <div>
          <span className="challenge-exp">
            <Sparkles size={22} aria-hidden="true" />
            <strong>+200 EXP</strong>
            <small>
              {stats.monthlyComplete ? 'Sudah diperhitungkan' : 'Setelah target tercapai'}
            </small>
          </span>
          <span className="challenge-badge">
            <Image
              src={assetPath('/assets/badges/emerald-current.png')}
              alt="Badge Emerald Current"
              width={67}
              height={67}
            />
            <span>
              Badge<strong>Emerald Current</strong>
            </span>
          </span>
        </div>
      </section>
      <section className="challenge-rules">
        <h3>Aturan challenge</h3>
        <ul>
          <li>
            <Check size={15} aria-hidden="true" /> Minimal 30 menit per sesi.
          </li>
          <li>
            <Check size={15} aria-hidden="true" /> Maksimal satu sesi dihitung per hari.
          </li>
          <li>
            <Check size={15} aria-hidden="true" /> Renang dihitung sebagai cardio.
          </li>
          <li>
            <Check size={15} aria-hidden="true" />{' '}
            {offerNextMonth
              ? `Sesi mulai dihitung pada ${startDateLabel}.`
              : 'Sesi dihitung sejak kamu bergabung bulan ini.'}
          </li>
        </ul>
      </section>
      {!stats.monthlyJoined && !scheduledChallenge && (
        <button type="button" className="btn btn-primary challenge-join" onClick={onJoin}>
          {offerNextMonth ? 'Mulai challenge bulan depan' : 'Mulai challenge'}{' '}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      )}
      {scheduledChallenge && (
        <p className="challenge-confirmation">
          Challenge sudah dijadwalkan mulai {startDateLabel}. Target {target} sesi tetap tersimpan.
          Sesi sebelum tanggal mulai tidak dihitung untuk challenge ini.
        </p>
      )}
      {stats.monthlyJoined && (
        <p className="challenge-confirmation">
          {stats.monthlyComplete
            ? 'Hadiah ditambahkan satu kali. Pembatalan sesi menyesuaikan progres dan reward terkait.'
            : 'Target tetap selama challenge. Catat sesi cardio dari Daily Quests untuk menambah progres.'}
        </p>
      )}
      <p className="challenge-month-note">Challenge mengikuti bulan kalender dalam WIB.</p>
    </div>
  );
}
