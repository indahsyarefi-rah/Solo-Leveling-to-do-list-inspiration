'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Gem,
  Gift,
  LockKeyhole,
  Plus,
  Sparkles,
  Trash2,
  Waves,
  Footprints,
  CalendarDays,
} from 'lucide-react';
import { addDays, dateLabel, gymType, type AppState, type Stats } from '@/lib/engine';
import {
  canJoinTrial,
  adventureMetrics,
  bookPages,
  hunterTitle,
  MONTHLY,
  monthKind,
  monthlyDates,
  restDay,
  shards,
  SCHOOLS,
  studyDue,
  TRIALS,
  trialFinishedAt,
  UNLOCKS,
  type Book,
  type MonthlyKind,
  type School,
} from '@/lib/long-game';
import { IELTS_STAGES, JAPANESE_STAGES, lessonAt, type IeltsMode } from '@/lib/learning';
import { assetPath } from '@/lib/paths';
import './adventure.css';

export type Commit = (recipe: (draft: AppState) => void, message: string) => void;
interface Props {
  state: AppState;
  date: string;
  stats: Stats;
  commit: Commit;
}
const dayDelta = (a: string, b: string) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export function monthlyStart(state: AppState, kind: MonthlyKind, date: string): string {
  const next = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 1))
    .toISOString()
    .slice(0, 10);
  const end = addDays(next, -1);
  let capacity = 0;
  const weeks = new Set<string>();
  for (let key = date; key <= end; key = addDays(key, 1)) {
    if (kind === 'gym' && !gymType(state, key)) continue;
    if (kind === 'study' && !studyDue(state, key)) continue;
    if (kind === 'swim') {
      const weekday = (new Date(key + 'T12:00:00Z').getUTCDay() + 6) % 7;
      weeks.add(addDays(key, -weekday));
      continue;
    }
    capacity++;
  }
  if (kind === 'swim') capacity = weeks.size;
  return capacity >= MONTHLY[kind].target ? date : next;
}

export function LanguagePanel({ state, date, commit }: Props) {
  const configured = state.adventure.study.startDate;
  const [start, setStart] = useState(
    configured ?? (gymType(state, addDays(date, 1)) ? addDays(date, 2) : addDays(date, 1)),
  );
  const [mode, setMode] = useState<IeltsMode>(state.adventure.study.mode);
  const log = state.adventure.studyLogs[date];
  const [ielts, setIelts] = useState(log?.ielts ?? 20),
    [japanese, setJapanese] = useState(log?.japanese ?? 10);
  const [ieltsNote, setIeltsNote] = useState(log?.ieltsNote ?? ''),
    [jpNote, setJpNote] = useState(log?.japaneseNote ?? '');
  const [repeatEn, setRepeatEn] = useState<number | null>(null),
    [repeatJp, setRepeatJp] = useState<number | null>(null);
  const before = adventureMetrics(state, addDays(date, -1));
  const en = lessonAt('ielts', before.ielts, state.adventure.study.mode, repeatEn),
    jp = lessonAt('japanese', before.japanese, 'academic', repeatJp);
  const active = !!configured && date >= configured;
  return (
    <div className="adventure-stack">
      <div className="adventure-intro panel">
        <p className="eyebrow">TWIN RUNES · EVERY OTHER DAY</p>
        <h2>IELTS 20 menit + Jepang 10 menit</h2>
        <p>
          IELTS Academic: kembali dari riwayat simulasi Band 7 menuju target Band 8. Jepang dimulai
          dari nol. Kemajuan Hunter tidak menilai atau menjamin band/JLPT.
        </p>
      </div>
      {!configured ? (
        <form
          className="panel adventure-form form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            commit(
              (d) => {
                d.adventure.study = {
                  startDate: start,
                  mode,
                  ieltsMinutes: 20,
                  japaneseMinutes: 10,
                };
              },
              'Quest belajar aktif setiap dua hari mulai ' + dateLabel(start) + '.',
            );
          }}
        >
          <h3>Aktifkan rutinitas bahasa</h3>
          <p className="muted">
            Tanggal awal disarankan pada hari tanpa gym. Riwayat sebelum aktivasi tetap sama.
          </p>
          <label>
            Mulai belajar
            <input
              type="date"
              min={addDays(date, 1)}
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Jenis IELTS
            <select value={mode} onChange={(e) => setMode(e.target.value as IeltsMode)}>
              <option value="academic">Academic</option>
              <option value="general">General Training</option>
              <option value="common">Materi bersama dahulu</option>
            </select>
          </label>
          <button className="btn btn-primary" disabled={!state.startedAt} type="submit">
            Aktifkan belajar bahasa <Check size={16} />
          </button>
          {!state.startedAt && (
            <p className="form-footnote">Mulai Perjalanan dari Hari Ini terlebih dahulu.</p>
          )}
        </form>
      ) : (
        <div className="notice">
          <CalendarDays size={18} />
          <p>
            Mulai {dateLabel(configured)} ·{' '}
            {studyDue(state, date)
              ? 'Hari ini jadwal belajar.'
              : 'Hari ini di luar jadwal wajib; latihan tambahan opsional.'}{' '}
            Target tetap 20 + 10 menit.
          </p>
        </div>
      )}
      <div className="field-pair">
        <label>
          Materi IELTS hari ini
          <select
            value={repeatEn ?? 'auto'}
            onChange={(e) => setRepeatEn(e.target.value === 'auto' ? null : Number(e.target.value))}
          >
            <option value="auto">Urutan sesi tercatat</option>
            {IELTS_STAGES.map((stage, i) => (
              <option key={stage.name} value={i}>
                Ulang: {stage.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Materi Jepang hari ini
          <select
            value={repeatJp ?? 'auto'}
            onChange={(e) => setRepeatJp(e.target.value === 'auto' ? null : Number(e.target.value))}
          >
            <option value="auto">Urutan sesi tercatat</option>
            {JAPANESE_STAGES.map((stage, i) => (
              <option key={stage.name} value={i}>
                Ulang: {stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="adventure-grid">
        <section className="panel lesson-card">
          <p className="eyebrow">IELTS · TAHAP {en.index + 1}</p>
          <h3>{en.name}</h3>
          <p>{en.goal}</p>
          <div className="lesson-task">{en.task}</div>
          <small>{en.variant}</small>
          <p className="lesson-checkpoint">Evaluasi: {en.checkpoint}</p>
        </section>
        <section className="panel lesson-card">
          <p className="eyebrow">JEPANG · TAHAP {jp.index + 1}</p>
          <h3>{jp.name}</h3>
          <p>{jp.goal}</p>
          <div className="lesson-task">{jp.task}</div>
          <p className="lesson-checkpoint">Evaluasi: {jp.checkpoint}</p>
        </section>
      </div>
      {active && (
        <form
          className="panel adventure-form form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            commit((d) => {
              d.adventure.studyLogs[date] = { ielts, japanese, ieltsNote, japaneseNote: jpNote };
            }, 'Latihan bahasa tercatat. +30 EXP sekali jika kedua target selesai.');
          }}
        >
          <h3>Catat latihan yang dilakukan</h3>
          <div className="field-pair">
            <label>
              Durasi IELTS (menit)
              <input
                type="number"
                min={0}
                max={300}
                required
                value={ielts}
                onChange={(e) => setIelts(Number(e.target.value))}
              />
            </label>
            <label>
              Durasi Jepang (menit)
              <input
                type="number"
                min={0}
                max={300}
                required
                value={japanese}
                onChange={(e) => setJapanese(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            Error log IELTS
            <textarea
              maxLength={4000}
              rows={3}
              placeholder="Kesalahan, feedback, dan satu perbaikan untuk sesi berikutnya"
              value={ieltsNote}
              onChange={(e) => setIeltsNote(e.target.value)}
            />
          </label>
          <label>
            Catatan Jepang
            <textarea
              maxLength={4000}
              rows={3}
              placeholder="Kana/kata/pola yang dipelajari dan bagian yang masih tertukar"
              value={jpNote}
              onChange={(e) => setJpNote(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Simpan latihan bahasa
          </button>
          {log && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                commit((d) => {
                  delete d.adventure.studyLogs[date];
                }, 'Catatan belajar hari ini dibatalkan beserta reward terkait.');
                setIeltsNote('');
                setJpNote('');
              }}
            >
              Batalkan catatan hari ini
            </button>
          )}
        </form>
      )}
      <div className="notice">
        <BookOpen size={18} />
        <p>
          Materi pendamping:{' '}
          <a href="https://ielts.org/" target="_blank" rel="noreferrer">
            IELTS resmi
          </a>{' '}
          ·{' '}
          <a href="https://www.irodori.jpf.go.jp/en/" target="_blank" rel="noreferrer">
            Irodori Japan Foundation (pemula)
          </a>
          . Gunakan bahan/audio latihan untuk mengerjakan langkah sesi.
        </p>
      </div>
      <details className="panel adventure-roadmap">
        <summary>
          <BookOpen size={18} />
          Roadmap dua tahun
          <ChevronDown size={17} />
        </summary>
        <p>
          Dalam dua tahun: sekitar 365 hari belajar, ±122 jam IELTS dan ±61 jam Jepang. Ini alokasi
          waktu, bukan jaminan hasil ujian. Sesi boleh diulang sebelum lanjut.
        </p>
        {[
          ['IELTS', IELTS_STAGES],
          ['Jepang', JAPANESE_STAGES],
        ].map(([name, stages]) => (
          <section key={String(name)}>
            <h3>{String(name)}</h3>
            {(stages as typeof IELTS_STAGES).map((stage, i) => (
              <div key={stage.name}>
                <strong>
                  {i + 1}. {stage.name}
                </strong>
                <span>
                  {stage.sessions} sesi · {stage.goal}
                </span>
              </div>
            ))}
          </section>
        ))}
        <p>
          Latihan IELTS 20 menit dibagi menjadi blok kecil. Simulasi ujian penuh perlu sesi terpisah
          jika Anda memilih menjadwalkannya. Tahapan aplikasi mengikuti sesi tercatat; gunakan
          checkpoint untuk menilai apakah perlu mengulang.
        </p>
      </details>
    </div>
  );
}

function BookDetail({ book, state, date, commit, stats }: Props & { book: Book }) {
  const pages = bookPages(state, book.id, date);
  const [amount, setAmount] = useState(''),
    [minutes, setMinutes] = useState(10),
    [note, setNote] = useState('');
  const [error, setError] = useState('');
  const readings = state.adventure.readings
    .filter((r) => r.bookId === book.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="panel adventure-form form-stack">
      <div className="adventure-book-heading">
        <BookOpen size={24} />
        <div>
          <h3>{book.title}</h3>
          <p className="muted">
            {book.author || 'Penulis belum diisi'} · {Math.min(pages, book.totalPages)} /{' '}
            {book.totalPages} halaman
          </p>
        </div>
      </div>
      <div className="adventure-meter">
        <span style={{ width: `${Math.min(100, (pages / book.totalPages) * 100)}%` }} />
      </div>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const count = Number(amount);
          if (
            !Number.isInteger(count) ||
            count < 1 ||
            count > book.totalPages ||
            pages + count > book.totalPages
          ) {
            setError('Jumlah halaman melebihi sisa buku. Periksa catatan sebelumnya.');
            return;
          }
          commit((d) => {
            d.adventure.readings.push({
              id: crypto.randomUUID(),
              bookId: book.id,
              date,
              pages: count,
              minutes,
              note,
            });
          }, 'Catatan membaca tersimpan. +15 EXP sekali per hari jika ≥10 menit.');
          setAmount('');
          setNote('');
          setError('');
        }}
      >
        <div className="field-pair">
          <label>
            Halaman dibaca sekarang
            <input
              type="number"
              min={1}
              max={Math.max(1, book.totalPages - pages)}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Durasi membaca (menit)
            <input
              type="number"
              min={1}
              max={600}
              required
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          Satu insight bacaan
          <textarea
            rows={2}
            maxLength={4000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="btn btn-secondary" type="submit" disabled={pages >= book.totalPages}>
          Simpan bacaan
        </button>
      </form>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (pages < book.totalPages) {
            setError('Selesaikan halaman buku dahulu, lalu catat refleksi dan penerapannya.');
            return;
          }
          const form = new FormData(e.currentTarget);
          commit(
            (d) => {
              const target = d.adventure.books.find((b) => b.id === book.id)!;
              target.reflection = String(form.get('reflection'));
              target.application = String(form.get('application'));
              target.finishedAt ??= date;
            },
            'Buku selesai. Skill ' + SCHOOLS[book.school].spell + ' tercatat sebagai dipraktikkan.',
          );
          setError('');
        }}
      >
        <h3>Awaken a spell</h3>
        <p className="muted">
          Buku membuka skill game melalui pemahaman dan penerapan, bukan otomatis membuat ahli.
        </p>
        <label>
          Tiga pelajaran utama
          <textarea
            name="reflection"
            minLength={20}
            maxLength={5000}
            required
            rows={3}
            defaultValue={book.reflection}
          />
        </label>
        <label>
          Satu penerapan nyata yang sudah dicoba
          <textarea
            name="application"
            minLength={10}
            maxLength={5000}
            required
            rows={3}
            defaultValue={book.application}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          {book.finishedAt ? 'Perbarui refleksi' : 'Selesaikan buku & catat skill'}
        </button>
        {book.finishedAt && (
          <button
            className="text-button"
            type="button"
            onClick={() =>
              commit((d) => {
                d.adventure.books.find((b) => b.id === book.id)!.finishedAt = null;
              }, 'Status selesai buku dibatalkan; catatan bacaan tetap disimpan.')
            }
          >
            Batalkan status selesai
          </button>
        )}
      </form>
      {stats.level >= 5 && (
        <div className="form-callout emerald">
          <Sparkles size={21} />
          <span>
            {SCHOOLS[book.school].spell}
            <small>
              {book.finishedAt
                ? 'Applied · refleksi dan penerapan tercatat'
                : pages > 0
                  ? 'Studied · lanjutkan refleksi'
                  : 'Awakened · perjalanan membaca dimulai'}
            </small>
          </span>
        </div>
      )}
      {readings.length > 0 && (
        <details className="adventure-reading-history">
          <summary>
            Riwayat bacaan
            <ChevronDown size={16} />
          </summary>
          {readings.slice(0, 20).map((r) => (
            <div key={r.id}>
              <span>
                {r.date} · {r.pages} halaman · {r.minutes} menit<small>{r.note}</small>
              </span>
              {r.date === date && (
                <button
                  className="icon-button danger-text"
                  aria-label={`Hapus bacaan ${r.pages} halaman`}
                  onClick={() =>
                    commit((d) => {
                      d.adventure.readings = d.adventure.readings.filter((x) => x.id !== r.id);
                      const target = d.adventure.books.find((b) => b.id === book.id)!;
                      if (bookPages(d, book.id, date) < target.totalPages) target.finishedAt = null;
                    }, 'Catatan bacaan dihapus; reward aktivitas terkait menyesuaikan.')
                  }
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

export function SpellbookView(props: Props & { readingOnly?: boolean }) {
  const { state, date, commit, stats, readingOnly } = props;
  const [tab, setTab] = useState<'books' | 'language'>(readingOnly ? 'books' : 'language');
  const [selected, setSelected] = useState(
    state.adventure.books.find((b) => !b.finishedAt)?.id ?? state.adventure.books[0]?.id ?? '',
  );
  const book = state.adventure.books.find((b) => b.id === selected);
  return (
    <div className="adventure-stack">
      {!readingOnly && (
        <div className="choice-group adventure-subtabs">
          <button
            className={tab === 'language' ? 'selected' : ''}
            onClick={() => setTab('language')}
          >
            Bahasa · Twin Runes
          </button>
          <button className={tab === 'books' ? 'selected' : ''} onClick={() => setTab('books')}>
            Buku · Spellbook
          </button>
        </div>
      )}
      {!readingOnly && tab === 'language' ? (
        <LanguagePanel {...props} />
      ) : (
        <>
          <div className="adventure-intro panel">
            <p className="eyebrow">YOUR BOOKS, YOUR MAGIC</p>
            <h2>Spellbook Iris</h2>
            <p>
              Baca, rangkum, lalu praktikkan. Setiap sekolah sihir merepresentasikan bidang belajar;
              bukan sertifikasi keahlian.
            </p>
            <p className="emerald-text">
              {stats.level >= 5
                ? 'Spellcraft terbuka · Water / Crystal / Rune / Tide'
                : 'Jurnal buku tersedia sekarang. Halaman Spellcraft terbuka di Level 5.'}
            </p>
          </div>
          <details className="panel adventure-new-book" open={!state.adventure.books.length}>
            <summary>
              <Plus size={18} />
              Tambah buku
              <ChevronDown size={17} />
            </summary>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const id = crypto.randomUUID();
                commit((d) => {
                  d.adventure.books.push({
                    id,
                    title: String(f.get('title')).trim(),
                    author: String(f.get('author')).trim(),
                    school: String(f.get('school')) as School,
                    totalPages: Number(f.get('pages')),
                    startedAt: date,
                    finishedAt: null,
                    reflection: '',
                    application: '',
                  });
                }, 'Buku masuk Spellbook.');
                setSelected(id);
                e.currentTarget.reset();
              }}
            >
              <label>
                Judul buku
                <input name="title" maxLength={150} required />
              </label>
              <label>
                Penulis
                <input name="author" maxLength={100} />
              </label>
              <div className="field-pair">
                <label>
                  Total halaman
                  <input name="pages" type="number" min={1} max={10000} required />
                </label>
                <label>
                  Sekolah sihir
                  <select name="school">
                    {Object.entries(SCHOOLS).map(([id, item]) => (
                      <option value={id} key={id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="btn btn-primary" disabled={!state.startedAt} type="submit">
                Tambahkan buku
              </button>
              {!state.startedAt && (
                <p className="form-footnote">Mulai Perjalanan terlebih dahulu.</p>
              )}
            </form>
          </details>
          {state.adventure.books.length > 0 && (
            <label>
              Pilih buku
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Pilih buku</option>
                {state.adventure.books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                    {b.finishedAt ? ' · selesai' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {book && <BookDetail {...props} book={book} key={book.id} />}
        </>
      )}
    </div>
  );
}

export function RewardsView({ state, date, stats, commit }: Props) {
  const [forDate, setForDate] = useState(date),
    [self, setSelf] = useState('Movie night'),
    [error, setError] = useState('');
  const available = stats.badges.filter((b) => b.unlocked && !state.adventure.claims[b.id]);
  const balance = shards(state);
  const redeem = (kind: 'rest' | 'self') => {
    const cost = kind === 'rest' ? 100 : 60;
    if (balance < cost) {
      setError('Kristal belum cukup. Klaim achievement yang sudah terbuka.');
      return;
    }
    if (kind === 'rest') {
      if (forDate < date || forDate > addDays(date, 30)) {
        setError('Pilih hari ini sampai 30 hari mendatang.');
        return;
      }
      if (forDate === date && stats.todayTarget > 0 && stats.todayCompleted === stats.todayTarget) {
        setError('Target hari ini sudah selesai. Simpan hadiah untuk hari berikutnya.');
        return;
      }
      if (
        state.adventure.redemptions.some(
          (r) => r.kind === 'rest' && !r.cancelled && Math.abs(dayDelta(r.forDate!, forDate)) < 7,
        )
      ) {
        setError('Rest Day tersedia maksimal satu kali dalam tujuh hari. Pilih tanggal lain.');
        return;
      }
    }
    if (kind === 'self' && !self.trim()) {
      setError('Tulis hadiah pribadi yang diinginkan.');
      return;
    }
    commit(
      (d) => {
        d.adventure.redemptions.push({
          id: crypto.randomUUID(),
          kind,
          label: kind === 'rest' ? 'Rest Day' : self.trim(),
          cost,
          date,
          forDate: kind === 'rest' ? forDate : null,
          cancelled: false,
        });
      },
      kind === 'rest'
        ? 'Rest Day tersimpan. Target dan streak game dibebaskan pada tanggal pilihan.'
        : 'Self reward tercatat. Aplikasi tidak melakukan pembelian.',
    );
    setError('');
  };
  return (
    <div className="adventure-stack">
      <div className="adventure-wallet panel">
        <Gem size={32} />
        <div>
          <p>Emerald Shards</p>
          <strong>{balance}</strong>
          <small>Mata uang game. EXP Hunter tidak dibelanjakan.</small>
        </div>
      </div>
      <div className="panel adventure-form form-stack">
        <h2>Achievement rewards</h2>
        <p className="muted">
          Milestone diklaim satu kali. Koleksi dan kristalnya tetap tersimpan; mengulang atau
          membatalkan quest tidak memberi klaim kedua.
        </p>
        <button
          className="btn btn-primary"
          disabled={!available.length}
          onClick={() =>
            commit((d) => {
              for (const badge of available) {
                if (!d.adventure.claims[badge.id])
                  d.adventure.claims[badge.id] = {
                    date,
                    title: badge.title,
                    shards: badge.reward ?? 0,
                  };
              }
            }, `${available.length} achievement dikoleksi.`)
          }
        >
          Klaim {available.length} achievement · +
          {available.reduce((n, b) => n + (b.reward ?? 0), 0)} kristal
        </button>
      </div>
      <div className="adventure-grid">
        <section className="panel adventure-form form-stack">
          <Gift size={25} />
          <h3>Rest Day · 100 kristal</h3>
          <p className="muted">
            Semua quest menjadi opsional selama sehari. Streak dilewati tanpa putus, tanpa
            bertambah, dan tanpa EXP otomatis. Agenda kuliah tetap ada.
          </p>
          <label>
            Tanggal Rest Day
            <input
              type="date"
              min={date}
              max={addDays(date, 30)}
              value={forDate}
              onChange={(e) => setForDate(e.target.value)}
            />
          </label>
          <button
            className="btn btn-secondary"
            disabled={!state.startedAt || balance < 100}
            onClick={() => redeem('rest')}
          >
            Tukar Rest Day
          </button>
          <small className="muted">
            Maksimal satu per tujuh hari. Istirahat fisik tetap boleh dilakukan kapan pun
            dibutuhkan; voucher ini mengatur target permainan.
          </small>
        </section>
        <section className="panel adventure-form form-stack">
          <Sparkles size={25} />
          <h3>Self reward · 60 kristal</h3>
          <p className="muted">
            Pilih hadiah nyata sesuai anggaran sendiri: waktu santai, film, atau buku yang
            diinginkan.
          </p>
          <label>
            Hadiah pribadiku
            <input maxLength={150} value={self} onChange={(e) => setSelf(e.target.value)} />
          </label>
          <button
            className="btn btn-secondary"
            disabled={!state.startedAt || balance < 60}
            onClick={() => redeem('self')}
          >
            Tukar self reward
          </button>
          <small className="muted">
            Penukaran hanya dicatat. Tidak ada pembayaran atau pembelian otomatis.
          </small>
        </section>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <section className="panel adventure-form">
        <h3>Riwayat hadiah</h3>
        {!state.adventure.redemptions.length && <p className="muted">Belum ada penukaran.</p>}
        {[...state.adventure.redemptions].reverse().map((r) => (
          <div className="reward-history" key={r.id}>
            <div>
              <strong>{r.label}</strong>
              <small>
                {r.forDate ?? r.date} · {r.cancelled ? 'dibatalkan' : r.cost + ' kristal'}
                {r.kind === 'rest' && r.forDate === date && !r.cancelled ? ' · aktif hari ini' : ''}
              </small>
            </div>
            {r.kind === 'rest' && r.forDate! > date && !r.cancelled && (
              <button
                className="text-button"
                onClick={() =>
                  commit((d) => {
                    d.adventure.redemptions.find((x) => x.id === r.id)!.cancelled = true;
                  }, 'Rest Day mendatang dibatalkan; kristal dikembalikan.')
                }
              >
                Batalkan
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function TrialAttemptForm({
  trial,
  state,
  date,
  commit,
}: {
  trial: (typeof TRIALS)[number];
  state: AppState;
  date: string;
  commit: Commit;
}) {
  const [error, setError] = useState('');
  return (
    <details>
      <summary className="text-button">
        Catat percobaan khusus <ChevronDown size={15} />
      </summary>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const distance = Number(f.get('distance')) / (trial.activity === 'swim' ? 1000 : 1);
          const minutes = Number(f.get('minutes'));
          if (
            !Number.isFinite(distance) ||
            distance <= 0 ||
            distance > 100 ||
            !Number.isFinite(minutes) ||
            minutes < 1 ||
            minutes > 600
          ) {
            setError('Periksa jarak dan durasi aktual.');
            return;
          }
          commit((d) => {
            d.adventure.trialAttempts[trial.id] = {
              date,
              minutes,
              distanceKm: distance,
              continuous: f.get('continuous') === 'on',
            };
          }, 'Percobaan trial tercatat. Reward hanya diberikan jika jarak tanpa jeda tercapai.');
          setError('');
        }}
      >
        <label>
          Jarak aktual ({trial.activity === 'swim' ? 'm' : 'km'})
          <input
            name="distance"
            type="number"
            step="any"
            min="0.01"
            max={trial.activity === 'swim' ? 100000 : 100}
            required
          />
        </label>
        <label>
          Durasi percobaan (menit)
          <input name="minutes" type="number" min={1} max={600} required />
        </label>
        <label className="inline-check">
          <input type="checkbox" name="continuous" />
          Tanpa jeda pada percobaan ini
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-secondary" type="submit">
          Simpan percobaan
        </button>
        <small className="muted">
          Catatan mandiri untuk satu percobaan. Tidak mengganti atau otomatis memenuhi target cardio
          harian 30 menit.
        </small>
      </form>
    </details>
  );
}

export function TrialsView({ state, date, stats, commit }: Props) {
  return (
    <div className="adventure-stack">
      <div className="adventure-intro panel">
        <p className="eyebrow">TRIAL GATES · OPTIONAL EXPEDITIONS</p>
        <h2>Level membuka pilihan, latihan membangun kesiapan.</h2>
        <p>
          Tantangan ini opsional dan tidak masuk target harian. Level Hunter adalah syarat game,
          bukan ukuran kesiapan fisik. Pilih jarak yang sesuai, dan naikkan bertahap.
        </p>
      </div>
      <section className="panel adventure-form">
        <h2>
          {hunterTitle(stats.level)} · Level {stats.level}
        </h2>
        <p className="muted">
          Level tidak memiliki batas maksimum atau reset wajib. Target EXP bertambah 50 setiap
          level.
        </p>
        <div className="unlock-roadmap">
          {UNLOCKS.map((u) => (
            <div key={u.level} className={stats.level >= u.level ? 'is-open' : ''}>
              <span>
                {stats.level >= u.level ? <Check size={16} /> : <LockKeyhole size={16} />} Lv{' '}
                {u.level}
              </span>
              <div>
                <strong>{u.name}</strong>
                <small>{u.feature}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="adventure-grid">
        {TRIALS.map((trial) => {
          const finished = trialFinishedAt(state, trial.id, date),
            joined = state.adventure.trials[trial.id];
          const eligible = canJoinTrial(state, trial.id, stats.level, date);
          return (
            <article className={`panel trial-card ${finished ? 'is-complete' : ''}`} key={trial.id}>
              {trial.activity === 'run' ? <Footprints size={25} /> : <Waves size={25} />}
              <span className="status-pill">Level {trial.level}</span>
              <h3>{trial.name}</h3>
              <p>
                {trial.activity === 'run' ? 'Lari' : 'Renang'}{' '}
                {trial.activity === 'swim' ? trial.km * 1000 + ' m' : trial.km + ' km'} tanpa jeda
                dalam satu sesi.
              </p>
              <strong className="emerald-text">+{trial.xp} EXP · satu kali</strong>
              {finished ? (
                <p>
                  <Check size={16} />
                  Selesai {finished}
                  {state.adventure.trialAttempts[trial.id]?.date === date && (
                    <button
                      className="text-button"
                      onClick={() =>
                        commit((d) => {
                          delete d.adventure.trialAttempts[trial.id];
                        }, 'Percobaan hari ini dibatalkan; reward terkait dihitung ulang.')
                      }
                    >
                      Batalkan percobaan
                    </button>
                  )}
                </p>
              ) : joined ? (
                <>
                  <p className="muted">
                    Aktif sejak {joined.joinedAt}. Catat sesi cardio tanpa jeda, atau satu percobaan
                    khusus di bawah.
                  </p>
                  <TrialAttemptForm trial={trial} state={state} date={date} commit={commit} />
                </>
              ) : (
                <>
                  <small className="muted">
                    Memerlukan Level {trial.level}, lima sesi cardio ≥30 menit
                    {trial.requires ? ' dan trial sebelumnya selesai' : ''}. Pencatatan bersifat
                    mandiri.
                  </small>
                  <button
                    className="btn btn-secondary"
                    disabled={!eligible || !state.startedAt}
                    onClick={() =>
                      commit((d) => {
                        d.adventure.trials[trial.id] ??= { joinedAt: date };
                      }, 'Trial aktif. Tidak ada deadline atau denda melewatkannya.')
                    }
                  >
                    {eligible ? 'Ambil tantangan' : 'Belum terbuka'}
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyPanel({
  state,
  date,
  stats,
  onJoin,
}: {
  state: AppState;
  date: string;
  stats: Stats;
  onJoin: (kind: MonthlyKind) => void;
}) {
  const current = date.slice(0, 7),
    next = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 1))
      .toISOString()
      .slice(0, 7);
  const month = state.challenges[current] ? current : state.challenges[next] ? next : null;
  const active = month ? state.challenges[month] : null;
  const kind = active ? monthKind(active) : null;
  const definition = kind ? MONTHLY[kind] : null;
  const count = active && month ? monthlyDates(state, month, active, date).length : 0;
  const done = !!active && count >= active.target;
  return (
    <div className="adventure-stack">
      <p className="eyebrow">ONE CHALLENGE PER MONTH</p>
      <h2>{definition?.name ?? 'Pilih perjalanan bulan ini'}</h2>
      {active && definition ? (
        <>
          <p className="muted">{definition.description}</p>
          <div className="monthly-counter">
            <Image
              src={assetPath('/assets/effects/challenge-water-ring.png')}
              alt=""
              fill
              sizes="240px"
            />
            <strong>
              {count} / {active.target}
              <small>{definition.unit}</small>
            </strong>
          </div>
          <span className="status-pill">
            {done
              ? 'Selesai'
              : active.joinedAt > date
                ? 'Terjadwal mulai ' + active.joinedAt
                : 'Aktif sejak ' + active.joinedAt}
          </span>
          <div className="form-callout emerald">
            <Gem size={21} />
            <span>
              +{active.rewardXp ?? definition.xp} EXP · satu kali
              <small>
                {done
                  ? 'Sudah diperhitungkan.'
                  : 'Reward diberikan setelah seluruh target tercapai.'}
              </small>
            </span>
          </div>
          <p className="muted">
            Target dan jenis challenge disimpan saat bergabung. Sesi maksimal satu hitungan per
            hari; Rest Day tidak memberi hitungan otomatis.
          </p>
        </>
      ) : (
        <>
          <p className="muted">
            Pilih satu fokus. Jika sisa jadwal bulan ini tidak cukup, challenge dimulai bulan depan.
            Challenge aktif tidak diganti diam-diam.
          </p>
          <div className="monthly-options">
            {(Object.entries(MONTHLY) as [MonthlyKind, (typeof MONTHLY)[MonthlyKind]][]).map(
              ([id, item]) => {
                const start = monthlyStart(state, id, date),
                  eligible =
                    stats.level >= item.level &&
                    (id !== 'study' || !!state.adventure.study.startDate);
                return (
                  <section className="panel monthly-option" key={id}>
                    <span className="eyebrow">LEVEL {item.level}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <strong>
                      {item.target} {item.unit} · +{item.xp} EXP
                    </strong>
                    <small>Mulai {start === date ? 'hari ini' : dateLabel(start)}</small>
                    <button
                      className="btn btn-secondary"
                      disabled={!eligible || !state.startedAt}
                      onClick={() => onJoin(id)}
                    >
                      {!eligible
                        ? id === 'study' && !state.adventure.study.startDate
                          ? 'Aktifkan belajar di Spellbook'
                          : 'Level belum cukup'
                        : 'Pilih ' + item.name}
                    </button>
                  </section>
                );
              },
            )}
          </div>
        </>
      )}
      <p className="form-footnote">
        Progres dari sesi yang benar-benar dicatat. Koreksi sesi menyesuaikan reward terkait. Tidak
        ada hukuman EXP.
      </p>
    </div>
  );
}
