'use client';

import { useState, type FormEvent } from 'react';
import { CalendarDays, ChevronDown, Plus, Trash2, Check, Info } from 'lucide-react';
import { addDays, dateDiff, dateLabel, type AppState } from '@/lib/engine';
import {
  academicScheduleAt,
  parseAcademicConfig,
  parseClassBlocks,
  WEEKDAYS,
  type AcademicSchedule,
  type AcademicException,
  type ClassBlock,
  type AcademicWeek,
} from '@/lib/academic';
import './academic.css';

function ClassFields({
  blocks,
  change,
  label,
}: {
  blocks: ClassBlock[];
  change: (blocks: ClassBlock[]) => void;
  label: string;
}) {
  const update = (index: number, key: 'title' | 'start' | 'end', value: string) =>
    change(blocks.map((block, i) => (i === index ? { ...block, [key]: value } : block)));
  return (
    <div className="academic-blocks">
      {blocks.map((block, i) => (
        <div className="academic-block" key={block.id}>
          <label>
            Nama kegiatan
            <input
              aria-label={`Nama kuliah ${label} ${i + 1}`}
              value={block.title}
              required
              maxLength={100}
              onChange={(e) => update(i, 'title', e.target.value)}
            />
          </label>
          <div className="academic-times">
            <label>
              Mulai
              <input
                aria-label={`Mulai kuliah ${label} ${i + 1}`}
                type="time"
                value={block.start}
                required
                onChange={(e) => update(i, 'start', e.target.value)}
              />
            </label>
            <label>
              Selesai
              <input
                aria-label={`Selesai kuliah ${label} ${i + 1}`}
                type="time"
                value={block.end}
                required
                onChange={(e) => update(i, 'end', e.target.value)}
              />
            </label>
            <button
              type="button"
              className="icon-button danger-text"
              aria-label={`Hapus sesi ${label} ${i + 1}`}
              onClick={() => change(blocks.filter((b) => b.id !== block.id))}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="text-button"
        disabled={blocks.length >= 12}
        onClick={() =>
          change([
            ...blocks,
            {
              id: crypto.randomUUID(),
              title: 'Kuliah',
              start: blocks.length ? '18:00' : '09:00',
              end: blocks.length ? '19:00' : '12:00',
            },
          ])
        }
      >
        <Plus size={15} />
        Tambah sesi {label}
      </button>
    </div>
  );
}

export default function AcademicEditor({
  state,
  date,
  saveWeekly,
  saveException,
  removeWeekly,
}: {
  state: AppState;
  date: string;
  saveWeekly: (schedule: AcademicSchedule) => void;
  saveException: (from: string, to: string, entry: AcademicException | null) => void;
  removeWeekly: (id: string) => void;
}) {
  const current = academicScheduleAt(state, date);
  const [section, setSection] = useState<'weekly' | 'exception'>('weekly');
  const [name, setName] = useState(current.id === 'default' ? 'Jadwal kuliah' : current.name);
  const [effectiveFrom, setEffectiveFrom] = useState(date);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [week, setWeek] = useState<AcademicWeek>(current.week);
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState(date);
  const [label, setLabel] = useState('Libur kuliah');
  const [mode, setMode] = useState<'holiday' | 'custom' | 'restore'>('holiday');
  const [custom, setCustom] = useState<ClassBlock[]>([
    { id: 'custom', title: 'Kuliah', start: '09:00', end: '12:00' },
  ]);
  const [error, setError] = useState('');
  const weekday = WEEKDAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7].id;
  const scheduled = state.academicSchedules.filter((s) => s.effectiveFrom >= date);
  const ranges: { from: string; to: string; entry: AcademicException }[] = [];
  for (const [key, entry] of Object.entries(state.academicExceptions)
    .filter(([key]) => key >= date)
    .sort(([a], [b]) => a.localeCompare(b))) {
    const previous = ranges.at(-1);
    if (
      previous &&
      addDays(previous.to, 1) === key &&
      JSON.stringify(previous.entry) === JSON.stringify(entry)
    )
      previous.to = key;
    else ranges.push({ from: key, to: key, entry });
  }
  function submitWeekly(e: FormEvent) {
    e.preventDefault();
    if (effectiveFrom < date) {
      setError('Tanggal mulai tidak boleh mengubah jadwal masa lalu.');
      return;
    }
    const schedule = {
      id:
        editingId ??
        state.academicSchedules.find((s) => s.effectiveFrom === effectiveFrom)?.id ??
        crypto.randomUUID(),
      name: name.trim(),
      effectiveFrom,
      week,
    };
    const candidate = {
      ...state,
      academicSchedules: [
        ...state.academicSchedules.filter(
          (s) => s.effectiveFrom !== effectiveFrom && s.id !== schedule.id,
        ),
        schedule,
      ],
    };
    const parsed = parseAcademicConfig(candidate);
    if (!parsed) {
      setError(
        'Periksa nama, tanggal, dan jam kuliah. Jam selesai harus setelah mulai; sesi pada hari yang sama tidak boleh bertumpang tindih.',
      );
      return;
    }
    saveWeekly(parsed.academicSchedules.find((s) => s.id === schedule.id)!);
  }
  function submitException(e: FormEvent) {
    e.preventDefault();
    if (!from || !to || from < date || to < from || dateDiff(from, to) > 89) {
      setError('Pilih rentang mulai hari ini atau tanggal mendatang, maksimal 90 hari.');
      return;
    }
    const blocks = mode === 'custom' ? parseClassBlocks(custom) : [];
    if (
      !blocks ||
      (mode === 'custom' && blocks.length === 0) ||
      (mode !== 'restore' && !label.trim())
    ) {
      setError('Isi keterangan dan sesi khusus yang valid tanpa benturan waktu.');
      return;
    }
    const candidate = { ...state, academicExceptions: { ...state.academicExceptions } };
    for (let key = from; key <= to; key = addDays(key, 1)) {
      if (mode === 'restore') delete candidate.academicExceptions[key];
      else candidate.academicExceptions[key] = { label: label.trim(), classes: blocks };
    }
    if (!parseAcademicConfig(candidate)) {
      setError('Tanggal atau pengecualian tidak valid.');
      return;
    }
    saveException(from, to, mode === 'restore' ? null : { label: label.trim(), classes: blocks });
  }
  return (
    <div className="academic-editor">
      <div className="choice-group" aria-label="Jenis pengaturan kuliah">
        <button
          type="button"
          aria-pressed={section === 'weekly'}
          className={section === 'weekly' ? 'selected' : ''}
          onClick={() => {
            setSection('weekly');
            setError('');
          }}
        >
          Rutinitas mingguan
        </button>
        <button
          type="button"
          aria-pressed={section === 'exception'}
          className={section === 'exception' ? 'selected' : ''}
          onClick={() => {
            setSection('exception');
            setError('');
          }}
        >
          Libur & tanggal khusus
        </button>
      </div>
      <div className="notice">
        <Info size={18} />
        <p>
          Perubahan ini menjadi dasar usulan baru. Jadwal harian yang sudah disetujui dan riwayat
          EXP tetap dipertahankan.
        </p>
      </div>
      {section === 'weekly' ? (
        <form className="form-stack" onSubmit={submitWeekly}>
          <label>
            Nama jadwal / semester
            <input
              value={name}
              required
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Semester genap"
            />
          </label>
          <label>
            Berlaku mulai
            <input
              type="date"
              min={date}
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
            <small className="muted">
              Jadwal lama tetap berlaku sebelum tanggal ini. Menyimpan pada tanggal mulai yang sama
              memperbarui versi tersebut.
            </small>
          </label>
          <div className="academic-week">
            {WEEKDAYS.map(({ id, label }) => (
              <details className="academic-day panel" key={id} open={id === weekday}>
                <summary>
                  <strong>{label}</strong>
                  <span>
                    {week[id].length
                      ? week[id].map((b) => `${b.start}–${b.end}`).join(', ')
                      : 'Libur mingguan'}
                  </span>
                  <ChevronDown size={16} />
                </summary>
                <div className="academic-day-body">
                  <label className="inline-check">
                    <input
                      aria-label={`Ada kuliah ${label}`}
                      type="checkbox"
                      checked={week[id].length > 0}
                      onChange={(e) =>
                        setWeek((prev) => ({
                          ...prev,
                          [id]: e.target.checked
                            ? [
                                {
                                  id: crypto.randomUUID(),
                                  title: 'Kuliah',
                                  start: '09:00',
                                  end: '12:00',
                                },
                              ]
                            : [],
                        }))
                      }
                    />
                    Ada kuliah pada hari {label}
                  </label>
                  <ClassFields
                    label={label}
                    blocks={week[id]}
                    change={(blocks) => setWeek((prev) => ({ ...prev, [id]: blocks }))}
                  />
                </div>
              </details>
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" type="submit">
            Simpan jadwal kuliah <Check size={17} />
          </button>
        </form>
      ) : (
        <form className="form-stack" onSubmit={submitException}>
          <p className="muted">
            Pakai ini untuk hari libur, libur panjang, atau jam kuliah sementara. Rutinitas mingguan
            tidak ikut berubah.
          </p>
          <div className="field-pair">
            <label>
              Mulai libur/perubahan
              <input
                type="date"
                required
                min={date}
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (to < e.target.value) setTo(e.target.value);
                }}
              />
            </label>
            <label>
              Sampai
              <input
                type="date"
                required
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <label>
            Jenis pengecualian
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="holiday">Libur (tanpa kuliah)</option>
              <option value="custom">Jam kuliah khusus</option>
              <option value="restore">Kembali ke jadwal mingguan</option>
            </select>
          </label>
          {mode !== 'restore' && (
            <label>
              Keterangan
              <input
                value={label}
                required
                maxLength={100}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
          )}
          {mode === 'custom' && <ClassFields label="khusus" blocks={custom} change={setCustom} />}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" type="submit">
            Simpan pengecualian <Check size={17} />
          </button>
        </form>
      )}
      {section === 'weekly' && scheduled.length > 0 && (
        <section className="academic-saved">
          <h3>Jadwal mulai hari ini & mendatang</h3>
          {scheduled.map((s) => (
            <div key={s.id}>
              <div>
                <strong>{s.name}</strong>
                <small>Mulai {dateLabel(s.effectiveFrom)}</small>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setEditingId(s.id);
                  setName(s.name);
                  setEffectiveFrom(s.effectiveFrom);
                  setWeek(structuredClone(s.week));
                  setError('');
                }}
              >
                Edit
              </button>
              <button
                className="icon-button danger-text"
                type="button"
                aria-label={`Hapus jadwal ${s.name}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Hapus ${s.name}? Jadwal sebelumnya kembali berlaku pada tanggal tersebut. Jadwal harian yang sudah disetujui tetap dipertahankan.`,
                    )
                  )
                    removeWeekly(s.id);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </section>
      )}
      {section === 'exception' && ranges.length > 0 && (
        <section className="academic-saved">
          <h3>Pengecualian mendatang</h3>
          {ranges.map((r) => (
            <div key={r.from}>
              <div>
                <strong>{r.entry.label}</strong>
                <small>
                  {r.from}
                  {r.to !== r.from ? ` — ${r.to}` : ''} ·{' '}
                  {r.entry.classes.length ? 'Jam khusus' : 'Tanpa kuliah'}
                </small>
              </div>
              <button
                className="icon-button danger-text"
                type="button"
                aria-label={`Hapus pengecualian ${r.from}`}
                onClick={() => saveException(r.from, r.to, null)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function AcademicSummary({
  state,
  date,
  edit,
}: {
  state: AppState;
  date: string;
  edit: () => void;
}) {
  const profile = academicScheduleAt(state, date);
  const exception = state.academicExceptions[date];
  return (
    <section className="academic-summary panel">
      <div className="academic-summary-heading">
        <CalendarDays size={22} />
        <div>
          <h3>Jadwal kuliah</h3>
          <p>
            {exception
              ? `${exception.label} · ${exception.classes.length ? 'Jam khusus hari ini' : 'Hari ini tanpa kuliah'}`
              : profile.name}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={edit}>
          Atur jadwal kuliah
        </button>
      </div>
      <div className="academic-week-preview">
        {WEEKDAYS.map(({ id, label }) => (
          <div key={id}>
            <strong>{label}</strong>
            <span>
              {profile.week[id].length
                ? profile.week[id].map((b) => `${b.start}–${b.end}`).join(' / ')
                : 'Libur'}
            </span>
          </div>
        ))}
      </div>
      <small>
        Ringkasan rutinitas mingguan. Pengecualian tanggal mengutamakan pengaturan libur/jam khusus.
      </small>
    </section>
  );
}
