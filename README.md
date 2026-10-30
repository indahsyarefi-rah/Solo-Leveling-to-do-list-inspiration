# Iris — Emerald Tide

Aplikasi web RPG pribadi untuk Iris: Daily Quests, EXP/Level, latihan, jadwal, streak, dan achievement. Mengikuti desain dashboard Concept 01 yang disetujui, dengan karakter magician air dan kristal zamrud orisinal.

## Menjalankan

Gunakan Node.js 22+; proyek ini diverifikasi pada Node.js 24.

```sh
npm ci
npm run dev
```

Server berjalan pada port 3000. Pada cloud workspace, gunakan mekanisme port forwarding yang disediakan lingkungan. Mode pengembangan dan build memakai Webpack.

```sh
npm run build
npm start
```

## Fitur

- Dashboard responsif, artwork Iris, EXP bar, target hari, dan umpan balik instan.
- Tombol **Mulai Perjalanan**. Tidak ada progres contoh yang dianggap sebagai aktivitas pengguna.
- Zona waktu WIB, pergantian hari pada 00.00, dan riwayat tugas terlewat.
- Mode PMS manual meniadakan seluruh quest shalat dan puasa dari target hari tersebut tanpa mengubah riwayat mode hari sebelumnya.
- Gym setiap dua hari dengan Upper/Lower bergantian; pencatatan set, repetisi, beban, durasi, dan kondisi latihan.
- Cardio harian dengan durasi, jarak, incline opsional, dan intensitas. Renang juga memenuhi olahraga alternatif mingguan.
- Target awal cardio 30 menit. Usulan +5 menit muncul setelah lima sesi pada target tersebut tanpa intensitas berat; harus disetujui dan berlaku untuk hari berikutnya. Target historis tidak dihitung ulang. Target juga dapat diatur manual di Profil.
- Catatan air menuju 2.000 ml dan makanan dengan batas pilihan pengguna 1.700 kkal. Reward diberikan untuk pencatatan, bukan makan semakin sedikit.
- Core pagi opsional dengan panduan gerakan awal; shalat sunnah opsional di luar Mode PMS.
- EXP berasal dari fakta aktivitas: tidak berlipat saat reload, tidak ada denda EXP, dan koreksi aktivitas membatalkan reward terkait.
- Level global, tiga atribut, streak, statistik tujuh hari, dan lima achievement.
- Challenge bulanan 12 sesi (minimal 30 menit; maksimal satu hitungan/hari), bonus 200 EXP satu kali. Jika sisa bulan tidak cukup, pendaftaran diarahkan secara jelas ke bulan berikutnya.
- Usulan jadwal mempertimbangkan kuliah, perjalanan, jam bangun/tidur, dan pola puasa. Jadwal hanya diterapkan setelah persetujuan; konflik waktu ditampilkan.
- Jadwal kuliah dapat diedit per hari dan memiliki beberapa sesi, versi semester dengan tanggal mulai, serta pengecualian libur/jam khusus. Agenda yang sudah disetujui tetap dipertahankan sampai usulan baru disetujui. Lihat [panduan jadwal](docs/SCHEDULES.md).
- Ekspor/impor cadangan JSON dengan validasi, pengingat browser, dan metadata pemasangan PWA.

## Google dan database lintas perangkat

Integrasi tersedia, tetapi **proyek Supabase dan provider Google harus dikonfigurasi**. Tanpa konfigurasi, aplikasi menyimpan data pada browser perangkat ini dan menandainya dengan jelas; data belum tersinkron lintas perangkat.

Ikuti [panduan Supabase](docs/SUPABASE.md), jalankan migrasi SQL, lalu salin `.env.example` menjadi `.env.local` dan isi:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Jangan gunakan service-role key atau Google Client Secret pada variabel browser. Variabel publik dibutuhkan saat build. Perjalanan perangkat dan akun dipisahkan; untuk memindahkan catatan, ekspor cadangan perangkat, masuk Google, lalu impor secara eksplisit.

Database memakai snapshot JSONB per pengguna, RLS, dan revisi atomik. Konflik antarperangkat menghentikan penimpaan: pengguna dapat mencadangkan versi lokal lalu mengambil versi cloud.

## Batas implementasi

- Login Google dan sinkronisasi nyata belum dapat diverifikasi tanpa konfigurasi proyek. Tes SQL lokal tidak membuktikan konektivitas Supabase.
- Notifikasi dipicu selama aplikasi terbuka dan izin browser tersedia. Belum ada backend Web Push untuk pengiriman saat aplikasi tertutup. Lihat [panduan notifikasi](docs/NOTIFICATIONS.md).
- Waktu shalat/Maghrib tidak diambil dari API. Quest ibadah dicentang manual; waktu Bandung perlu dikonfirmasi. Batas 17.15 pada usulan saat puasa merupakan jendela perencanaan, bukan waktu berbuka.
- Tanggal lampau ditampilkan sebagai riwayat; aktivitas dari antarmuka diubah pada hari berjalan.
- Belum ada integrasi kalender eksternal, estimasi kalori otomatis, timer olahraga, atau deployment otomatis.

## Pemeriksaan

```sh
npm run typecheck
npm test
npm run test:db
npm run test:e2e
```

Tes domain menjalankan aturan melalui Node test runner. Tes database menjalankan migrasi asli di PostgreSQL PGlite terisolasi untuk memeriksa RLS dan revisi.

Browser E2E memerlukan server pada port 3000. Runner memakai Chromium sistem bila tersedia; atur `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` untuk path lain. Tanpa Chromium sistem, pasang browser Playwright melalui `npx playwright install chromium`.

## Struktur

```text
src/app/                 Halaman Next.js, metadata, dan gaya utama
src/components/          Dashboard, formulir, progres, achievement
src/lib/engine.ts        Aturan quest, EXP, level, streak, dan jadwal
src/lib/use-journey.ts   Penyimpanan perangkat dan sinkronisasi
src/lib/cloud.ts         Google OAuth dan operasi Supabase
src/lib/reminders.ts     Notifikasi browser
public/assets/          14 master aset PNG
supabase/migrations/    Skema, RLS, dan penyimpanan atomik
tests/                  Alur browser desktop dan ponsel
```

Artwork dihasilkan dengan AI untuk Iris; tidak mengambil karakter atau logo Solo Leveling. Font sistem dan ikon Lucide dipakai untuk antarmuka.

## Hosting GitHub Pages

Situs dapat ditampilkan melalui GitHub Pages menggunakan workflow yang disertakan. Ikuti [panduan GitHub Pages](docs/GITHUB_PAGES.md). Hosting ini tetap membutuhkan Supabase bila ingin login Google dan sinkronisasi lintas perangkat.
