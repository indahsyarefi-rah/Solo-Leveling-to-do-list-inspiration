import { expect, test, type Page } from '@playwright/test';
import { createState, emptyDay, todayKey, addDays, gymType, getStats } from '../src/lib/engine';

type ReminderDelivery = { title: string; body: string; via: 'worker' | 'fallback' };

async function prepareScheduledCardioReminder(page: Page, completed: boolean) {
  const date = todayKey();
  const state = createState();
  state.startedAt = date;
  state.settings.notificationsEnabled = true;
  const day = emptyDay(false, state.settings.cardioTargetMinutes);
  day.scheduleApproved = true;
  day.schedule = [
    {
      id: 'scheduled-cardio-test',
      title: 'Cardio',
      start: '19:00',
      end: '19:30',
      kind: 'cardio',
      locked: false,
    },
  ];
  if (completed) {
    day.cardio = {
      activity: 'walk',
      minutes: 30,
      distanceKm: 2,
      incline: null,
      intensity: 'light',
    };
  }
  state.days[date] = day;
  const cache = JSON.stringify({
    state,
    revision: null,
    dirty: false,
    savedAt: new Date().toISOString(),
  });

  await page.clock.install({ time: new Date(`${date}T19:00:00+07:00`) });
  await page.addInitScript(
    ({ cache }) => {
      localStorage.setItem('iris:journey:v1:device', cache);
      const deliveries: ReminderDelivery[] = [];
      Object.defineProperty(window, '__irisReminderDeliveries', {
        configurable: true,
        value: deliveries,
      });

      class MockNotification {
        static permission = 'granted';
        static async requestPermission() {
          return 'granted';
        }
        constructor(title: string, options?: NotificationOptions) {
          deliveries.push({ title, body: options?.body ?? '', via: 'fallback' });
        }
        close() {}
      }

      const registration = {
        active: {},
        async showNotification(title: string, options?: NotificationOptions) {
          deliveries.push({ title, body: options?.body ?? '', via: 'worker' });
        },
      };
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        value: MockNotification,
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          async register() {
            return registration;
          },
          async getRegistration() {
            return registration;
          },
        },
      });
    },
    { cache },
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Daily Quests/ })).toBeVisible();
}

async function reminderDeliveries(page: Page): Promise<ReminderDelivery[]> {
  return page.evaluate(
    () =>
      (window as unknown as Window & { __irisReminderDeliveries: ReminderDelivery[] })
        .__irisReminderDeliveries,
  );
}

async function startJourney(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai Perjalanan', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Mulai perjalananmu', exact: true })
    .getByRole('button', { name: 'Mulai Perjalanan', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /^Daily Quests/ })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test('a fresh journey starts at zero and keeps the approved responsive dashboard', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Mulai Perjalanan', exact: true })).toBeVisible();
  await expect(page.getByText('Emerald Tide Initiate', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Mulai Perjalanan', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Mulai perjalananmu', exact: true })
    .getByRole('button', { name: 'Mulai Perjalanan', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /^Daily Quests/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expectNoHorizontalOverflow(page);
});

test('PMS removes all prayer quests and restores them without losing other activity', async ({
  page,
}) => {
  await startJourney(page);
  const prayer = page.getByRole('checkbox', { name: /subuh/i });
  await expect(prayer).toBeVisible();
  await page.getByRole('button', { name: '+250 ml', exact: true }).click();

  const pms = page.getByRole('switch', { name: 'Mode PMS', exact: true });
  await pms.click();
  await expect(pms).toBeChecked();
  await expect(
    page.getByRole('checkbox', {
      name: /subuh|dzuhur|zuhur|ashar|asar|maghrib|isya|dhuha|tahajud|puasa/i,
    }),
  ).toHaveCount(0);
  await expect(page.getByText(/250\s*\/\s*2[.,]000\s*ml/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('switch', { name: 'Mode PMS', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /subuh/i })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Mode PMS', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /subuh/i })).toBeVisible();
  await expect(page.getByText(/250\s*\/\s*2[.,]000\s*ml/).first()).toBeVisible();
});

test('water and cardio persist, award EXP once, and undo reverses the cardio reward', async ({
  page,
}) => {
  await startJourney(page);
  for (let count = 0; count < 8; count++) {
    await page.getByRole('button', { name: '+250 ml', exact: true }).click();
  }
  await expect(page.getByRole('checkbox', { name: /minum air/i })).toBeChecked();

  await page.getByRole('checkbox', { name: 'Cardio', exact: true }).click();
  await page.getByRole('combobox', { name: 'Aktivitas', exact: true }).selectOption('walk');
  await page.getByLabel(/Durasi aktual/).fill('42');
  await page.getByLabel(/^Jarak/).fill('3.2');
  await page.getByLabel(/^Incline/).fill('2');
  await page.getByRole('button', { name: 'Simpan sesi', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /cardio/i })).toBeChecked();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '35',
  );

  await page.reload();
  await expect(page.getByRole('checkbox', { name: /cardio/i })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /minum air/i })).toBeChecked();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '35',
  );

  await page.getByRole('checkbox', { name: /cardio/i }).click();
  await page
    .getByRole('dialog', { name: 'Catat Cardio', exact: true })
    .getByRole('button', { name: 'Batalkan sesi cardio', exact: true })
    .click();
  await expect(page.getByRole('checkbox', { name: /cardio/i })).not.toBeChecked();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '10',
  );
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '10',
  );
});

test('the main navigation opens actual screens without horizontal overflow', async ({ page }) => {
  await startJourney(page);
  const screens = [
    { tab: 'Jadwal', heading: /Jadwal/ },
    { tab: 'Progres', heading: /Perjalanan Iris|Progres/ },
    { tab: 'Achievement', heading: /Achievement/ },
    { tab: 'Profil', heading: /Profil/ },
  ];
  for (const screen of screens) {
    const tab = page.getByRole('button', { name: screen.tab, exact: true });
    if (screen.tab === 'Achievement' && !(await tab.isVisible())) {
      await page.getByRole('button', { name: /Jelajahi achievement/ }).click();
    } else {
      await tab.click();
    }
    await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test('schedule proposals require approval and conflicting manual activities are rejected', async ({
  page,
}) => {
  await startJourney(page);
  await page.getByRole('switch', { name: 'Mode PMS', exact: true }).click();
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Usulan hari ini', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tinjau usulan', exact: true }).click();
  await page.getByRole('button', { name: 'Tutup dialog', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Usulan hari ini', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Tinjau usulan', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Tinjau jadwal hari ini', exact: true });
  await editor.getByRole('button', { name: 'Tambah kegiatan', exact: true }).click();
  await editor
    .getByRole('textbox', { name: /^Kegiatan/ })
    .last()
    .fill('Stretching');
  await editor.getByRole('button', { name: 'Tambah kegiatan', exact: true }).click();
  await editor
    .getByRole('textbox', { name: /^Kegiatan/ })
    .last()
    .fill('Jurnal');
  await editor.getByRole('button', { name: 'Setujui jadwal', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('bertumpang tindih');

  await editor.getByLabel('Mulai Jurnal', { exact: true }).fill('19:30');
  await editor.getByLabel('Selesai Jurnal', { exact: true }).fill('20:00');
  await editor.getByRole('button', { name: 'Setujui jadwal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jadwal disetujui', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jadwal disetujui', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("a confirmed cardio target applies tomorrow while preserving today's recorded target", async ({
  page,
}) => {
  await startJourney(page);
  await page.getByRole('button', { name: 'Profil', exact: true }).click();
  await page.getByRole('spinbutton', { name: /^Target cardio \(menit\)/ }).fill('35');
  await page.getByRole('button', { name: 'Simpan pengaturan', exact: true }).click();

  await page.getByRole('button', { name: 'Hari Ini', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Cardio', exact: true }).click();
  const cardio = page.getByRole('dialog', { name: 'Catat Cardio', exact: true });
  await expect(cardio.getByText(/Target hari ini\s*30 menit/)).toBeVisible();
  await expect(cardio.getByRole('spinbutton', { name: /Durasi aktual/ })).toHaveValue('30');
  await cardio.getByRole('button', { name: 'Tutup dialog', exact: true }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Profil', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: /^Target cardio \(menit\)/ })).toHaveValue(
    '35',
  );

  const now = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(new Date(now + 24 * 60 * 60 * 1000));
  await page.reload();
  await page.getByRole('checkbox', { name: 'Cardio', exact: true }).click();
  const tomorrow = page.getByRole('dialog', { name: 'Catat Cardio', exact: true });
  await expect(tomorrow.getByText(/Target hari ini\s*35 menit/)).toBeVisible();
  await expect(tomorrow.getByRole('spinbutton', { name: /Durasi aktual/ })).toHaveValue('35');
});

test('an approved incomplete cardio reminder dispatches once across the same-minute poll', async ({
  page,
}) => {
  await prepareScheduledCardioReminder(page, false);
  await expect(page.getByRole('checkbox', { name: 'Cardio', exact: true })).not.toBeChecked();
  await expect.poll(async () => (await reminderDeliveries(page)).length).toBe(1);
  await expect(reminderDeliveries(page)).resolves.toEqual([
    expect.objectContaining({ title: 'Waktunya Cardio', via: 'worker' }),
  ]);

  await page.clock.runFor(35_000);
  await expect(reminderDeliveries(page)).resolves.toHaveLength(1);
});

test('an already completed cardio session suppresses its approved reminder', async ({ page }) => {
  await prepareScheduledCardioReminder(page, true);
  await expect(page.getByRole('checkbox', { name: 'Cardio', exact: true })).toBeChecked();
  await page.clock.runFor(35_000);
  await expect(reminderDeliveries(page)).resolves.toEqual([]);
});

async function openAcademic(page: Page) {
  await page.getByRole('button', { name: 'Atur jadwal kuliah', exact: true }).click();
  return page.getByRole('dialog', { name: 'Atur jadwal kuliah', exact: true });
}

async function approveAgenda(page: Page, regenerate = false) {
  await page
    .getByRole('button', { name: regenerate ? 'Buat usulan baru' : 'Tinjau usulan', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Setujui jadwal', exact: true })
    .click();
}

test('editable semesters migrate legacy data and apply only from the chosen date', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') });
  await startJourney(page);
  await page.getByRole('switch', { name: 'Mode PMS' }).click();
  await page.getByRole('checkbox', { name: 'Core pagi', exact: true }).click();
  await page.getByRole('button', { name: '+250 ml', exact: true }).click();
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await approveAgenda(page);
  const originalAgenda = await page.getByRole('list', { name: 'Agenda harian' }).innerText();
  await page.evaluate(() => {
    const cache = JSON.parse(localStorage.getItem('iris:journey:v1:device')!);
    cache.state.version = 1;
    delete cache.state.academicSchedules;
    delete cache.state.academicExceptions;
    localStorage.setItem('iris:journey:v1:device', JSON.stringify(cache));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Agenda harian' })).toHaveText(originalAgenda, {
    useInnerText: true,
  });
  let dialog = await openAcademic(page);
  await dialog.getByLabel('Nama jadwal / semester').fill('Semester Genap');
  await dialog.getByLabel('Berlaku mulai').fill('2026-11-09');
  await dialog.getByLabel('Mulai kuliah Senin 1', { exact: true }).fill('09:00');
  await dialog.getByLabel('Selesai kuliah Senin 1', { exact: true }).fill('12:00');
  await dialog.getByRole('button', { name: 'Simpan jadwal kuliah', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Agenda harian' })).toHaveText(originalAgenda, {
    useInnerText: true,
  });
  dialog = await openAcademic(page);
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Berlaku mulai').fill('2026-11-16');
  await dialog.getByRole('button', { name: 'Simpan jadwal kuliah', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '10',
  );
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iris:journey:v1:device')!).state,
  );
  expect(saved.version).toBe(3);
  expect(saved.days['2026-11-02'].waterMl).toBe(250);
  expect(saved.days['2026-11-02'].scheduleApproved).toBe(true);
  expect(saved.academicSchedules).toHaveLength(1);
  expect(saved.academicSchedules[0].effectiveFrom).toBe('2026-11-16');
  await page.clock.setSystemTime(new Date('2026-11-16T08:00:00+07:00'));
  await page.reload();
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await expect(page.getByText('Semester Genap', { exact: true })).toBeVisible();
  const agenda = page.getByRole('list', { name: 'Agenda harian' });
  await expect(agenda).toContainText('09:00 – 12:00');
  await expect(agenda).not.toContainText('10:00 – 17:00');
  await expectNoHorizontalOverflow(page);
});

test('temporary holidays preserve approved agendas until new proposals are accepted', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') });
  await startJourney(page);
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await approveAgenda(page);
  const agenda = page.getByRole('list', { name: 'Agenda harian' });
  await expect(agenda).toContainText('10:00 – 17:00');
  let dialog = await openAcademic(page);
  await dialog.getByRole('button', { name: 'Libur & tanggal khusus', exact: true }).click();
  await dialog.getByLabel('Sampai', { exact: true }).fill('2026-11-03');
  await dialog.getByLabel('Keterangan', { exact: true }).fill('Libur kampus');
  await dialog.getByRole('button', { name: 'Simpan pengecualian', exact: true }).click();
  await expect(agenda).toContainText('10:00 – 17:00');
  await page.getByRole('button', { name: 'Buat usulan baru', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Kegiatan 2', { exact: true })).not.toHaveValue(
    'Kuliah',
  );
  await page.getByRole('button', { name: 'Tutup dialog', exact: true }).click();
  await expect(agenda).toContainText('10:00 – 17:00');
  await approveAgenda(page, true);
  await expect(agenda).not.toContainText('Kuliah');
  await page.reload();
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  await expect(agenda).not.toContainText('Kuliah');
  dialog = await openAcademic(page);
  await dialog.getByRole('button', { name: 'Libur & tanggal khusus', exact: true }).click();
  await dialog.getByRole('button', { name: 'Hapus pengecualian 2026-11-02', exact: true }).click();
  await expect(agenda).not.toContainText('Kuliah');
  await approveAgenda(page, true);
  await expect(agenda).toContainText('10:00 – 17:00');
  dialog = await openAcademic(page);
  await dialog.getByRole('button', { name: 'Libur & tanggal khusus', exact: true }).click();
  await dialog
    .getByRole('combobox', { name: 'Jenis pengecualian', exact: true })
    .selectOption('custom');
  await dialog.getByLabel('Keterangan', { exact: true }).fill('Kuliah pengganti');
  await dialog.getByLabel('Mulai kuliah khusus 1', { exact: true }).fill('14:00');
  await dialog.getByLabel('Selesai kuliah khusus 1', { exact: true }).fill('15:00');
  await dialog.getByRole('button', { name: 'Simpan pengecualian', exact: true }).click();
  await approveAgenda(page, true);
  await expect(agenda).toContainText('14:00 – 15:00');
  await expect(agenda).not.toContainText('10:00 – 17:00');
  await expectNoHorizontalOverflow(page);
});

test('overlapping weekly classes are rejected without saving partial edits', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') });
  await startJourney(page);
  await page.getByRole('button', { name: 'Jadwal', exact: true }).click();
  const dialog = await openAcademic(page);
  await dialog.getByRole('button', { name: 'Tambah sesi Senin', exact: true }).click();
  await dialog.getByLabel('Mulai kuliah Senin 2', { exact: true }).fill('16:00');
  await dialog.getByLabel('Selesai kuliah Senin 2', { exact: true }).fill('18:00');
  await dialog.getByRole('button', { name: 'Simpan jadwal kuliah', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('tidak boleh bertumpang tindih');
  const count = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('iris:journey:v1:device')!).state.academicSchedules.length,
  );
  expect(count).toBe(0);
  await expectNoHorizontalOverflow(page);
});

async function feature(page: Page, name: 'Spellbook' | 'Trials' | 'Reward') {
  const direct = page.getByRole('button', { name, exact: true });
  if (await direct.isVisible()) {
    await direct.click();
    return;
  }
  await page.getByRole('button', { name: 'Progres', exact: true }).click();
  await page
    .getByRole('button', {
      name:
        name === 'Spellbook' ? 'Spellbook & Bahasa' : name === 'Trials' ? 'Trial Gates' : 'Reward',
      exact: true,
    })
    .click();
}
async function historyFixture(page: Page, date = '2026-11-20') {
  await page.clock.install({ time: new Date(date + 'T08:00:00+07:00') });
  const state = createState();
  state.startedAt = addDays(date, -60);
  state.pms = true;
  for (let key = state.startedAt; key <= date; key = addDays(key, 1)) {
    const log = emptyDay(true);
    log.waterMl = 2000;
    log.meals = [{ id: key, name: 'Catatan', calories: 650, time: '12:00' }];
    log.cardio = {
      activity: 'walk',
      minutes: 30,
      distanceKm: 2,
      incline: null,
      intensity: 'light',
    };
    log.completions = ['core', 'alternative'];
    const type = gymType(state, key);
    if (type)
      log.gym = {
        type,
        minutes: 35,
        exercises: [{ name: 'Latihan', sets: [{ reps: 10, weight: 5 }] }],
        feeling: 'comfortable',
      };
    state.days[key] = log;
  }
  await page.addInitScript(
    ({ state }) => {
      if (!localStorage.getItem('iris:journey:v1:device'))
        localStorage.setItem(
          'iris:journey:v1:device',
          JSON.stringify({ state, revision: null, dirty: true, savedAt: new Date().toISOString() }),
        );
    },
    { state },
  );
  await page.goto('/');
  await page.getByRole('heading', { name: /Daily Quests/ }).waitFor();
  return state;
}

test('language setup creates every-other-day20+10minute quests and preserves the journal', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') });
  await startJourney(page);
  await feature(page, 'Spellbook');
  await page.getByLabel('Mulai belajar', { exact: true }).fill('2026-11-03');
  await page.getByRole('button', { name: 'Aktifkan belajar bahasa', exact: true }).click();
  await page.clock.setSystemTime(new Date('2026-11-03T08:00:00+07:00'));
  await page.reload();
  await page.getByRole('checkbox', { name: 'Belajar bahasa', exact: true }).click();
  await page
    .getByLabel('Error log IELTS', { exact: true })
    .fill('Review paraphrase and listening distractors.');
  await page.getByLabel('Catatan Jepang', { exact: true }).fill('あいうえおを練習しました');
  await page.getByRole('button', { name: 'Simpan latihan bahasa', exact: true }).click();
  await page.getByRole('button', { name: 'Tutup dialog', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Belajar bahasa', exact: true })).toBeChecked();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '30',
  );
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Belajar bahasa', exact: true })).toBeChecked();
  await feature(page, 'Spellbook');
  await page
    .getByRole('combobox', { name: 'Materi Jepang hari ini', exact: true })
    .selectOption('0');
  await expect(page.getByRole('heading', { name: 'Bunyi & Hiragana', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('books create reading rewards and require a reflection plus application for completed spells', async ({
  page,
}) => {
  await startJourney(page);
  await feature(page, 'Spellbook');
  await page.getByRole('button', { name: 'Buku · Spellbook', exact: true }).click();
  await page.getByLabel('Judul buku', { exact: true }).fill('Learning Notes');
  await page.getByLabel('Penulis', { exact: true }).fill('Iris');
  await page.getByLabel('Total halaman', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Tambahkan buku', exact: true }).click();
  await page.getByLabel('Halaman dibaca sekarang', { exact: true }).fill('20');
  await page
    .getByLabel('Satu insight bacaan', { exact: true })
    .fill('Practice with retrieval and reflection.');
  await page.getByRole('button', { name: 'Simpan bacaan', exact: true }).click();
  await page
    .getByLabel('Tiga pelajaran utama', { exact: true })
    .fill('Recall without notes, review mistakes, and repeat deliberately.');
  await page
    .getByLabel('Satu penerapan nyata yang sudah dicoba', { exact: true })
    .fill('I reviewed yesterday’s vocabulary without opening the notes.');
  await page.getByRole('button', { name: 'Selesaikan buku & catat skill', exact: true }).click();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iris:journey:v1:device')!).state,
  );
  expect(state.adventure.books[0].finishedAt).toBeTruthy();
  expect(state.adventure.readings).toHaveLength(1);
  await page.getByRole('button', { name: 'Hari Ini', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Baca & catat buku', exact: true }),
  ).toBeChecked();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '15',
  );
  await expectNoHorizontalOverflow(page);
});

test('achievement currency is claimed once and a future Rest Day protects streak without XP inflation', async ({
  page,
}) => {
  await historyFixture(page);
  const before = await page
    .getByRole('progressbar', { name: 'EXP Hunter', exact: true })
    .getAttribute('aria-valuenow');
  await feature(page, 'Reward');
  await page.getByRole('button', { name: /^Klaim \d+ achievement/ }).click();
  await expect(page.getByRole('button', { name: /^Klaim 0 achievement/ })).toBeDisabled();
  await page.getByLabel('Tanggal Rest Day', { exact: true }).fill('2026-11-21');
  await page.getByRole('button', { name: 'Tukar Rest Day', exact: true }).click();
  await page.clock.setSystemTime(new Date('2026-11-21T08:00:00+07:00'));
  await page.reload();
  await expect(page.getByText('Rest Day aktif.', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'EXP Hunter', exact: true })).toHaveAttribute(
    'aria-valuenow',
    before!,
  );
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iris:journey:v1:device')!).state,
  );
  expect(state.adventure.redemptions).toHaveLength(1);
  expect(state.adventure.redemptions[0].cost).toBe(100);
  await expectNoHorizontalOverflow(page);
});

test('level trials open by prerequisites and record standalone non-stop evidence without replacing cardio', async ({
  page,
}) => {
  await historyFixture(page);
  await feature(page, 'Trials');
  const trial = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'First Kilometre', exact: true }) });
  await trial.getByRole('button', { name: 'Ambil tantangan', exact: true }).click();
  await trial.getByText('Catat percobaan khusus', { exact: false }).click();
  await trial.getByLabel('Jarak aktual (km)', { exact: true }).fill('1.2');
  await trial.getByLabel('Durasi percobaan (menit)', { exact: true }).fill('10');
  await trial.getByLabel('Tanpa jeda pada percobaan ini', { exact: true }).check();
  await trial.getByRole('button', { name: 'Simpan percobaan', exact: true }).click();
  await expect(trial).toContainText('Selesai 2026-11-20');
  const next = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Unbroken Current', exact: true }) });
  await expect(next.getByRole('button', { name: 'Ambil tantangan', exact: true })).toBeEnabled();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iris:journey:v1:device')!).state,
  );
  expect(state.days['2026-11-20'].cardio.activity).toBe('walk');
  expect(state.adventure.trialAttempts['run-1'].continuous).toBe(true);
  const future = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Five-K Tide', exact: true }) });
  await expect(future.getByRole('button', { name: 'Belum terbuka', exact: true })).toBeDisabled();
  await expectNoHorizontalOverflow(page);
});

test('monthly challenges allow a reading focus and retain its frozen type after reload', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-01T08:00:00+07:00') });
  await startJourney(page);
  await page.getByRole('button', { name: /Challenge bulanan/ }).click();
  await page.getByRole('button', { name: /Pilih Scholar/ }).click();
  await expect(page.getByRole('heading', { name: 'Scholar’s Tide', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup dialog', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Challenge bulanan/ }).click();
  await expect(page.getByRole('heading', { name: 'Scholar’s Tide', exact: true })).toBeVisible();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iris:journey:v1:device')!).state,
  );
  expect(state.challenges['2026-11'].kind).toBe('reading');
  expect(state.challenges['2026-11'].target).toBe(12);
  await expectNoHorizontalOverflow(page);
});
