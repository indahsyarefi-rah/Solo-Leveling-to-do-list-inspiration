# Hasil verifikasi

Tanggal: 30 Oktober 2026. Runtime: Node.js 24.19.0, Next.js 16.4.3, React 19.3.1.

## Pembaruan perjalanan jangka panjang

- 50 pengujian domain lulus: kompatibilitas snapshot versi 1/2 ke 3, 80 milestone, belajar 20+10 menit, bacaan/refleksi, saldo kristal, Rest Day dan streak, enam challenge bulanan, gerbang level/prasyarat, serta bukti trial terpisah.
- 32 skenario browser desktop/ponsel telah diverifikasi. Pada run utama 30 lulus; dua kasus bahasa berhenti pada locator pilihan materi. Setelah locator diperbaiki, keduanya lulus pada run terpisah. Perilaku aplikasi tidak diubah untuk meloloskan locator.
- Kasus baru memeriksa aktivasi bahasa setiap dua hari, persistensi jurnal, buku dengan penerapan, klaim kristal satu kali, Rest Day tanpa bonus EXP otomatis, trial tanpa menimpa cardio, dan jenis challenge yang tetap setelah reload.
- Build statis GitHub Pages, pemeriksaan TypeScript, dan format lulus. Smoke test ekspor produksi memeriksa path repositori, aset/manifest, navigasi fitur baru, serta penyimpanan versi 3/IELTS Academic; tidak ada error browser atau permintaan gagal.
- Spellbook, Trials, Reward, dan Achievement juga diperiksa pada lebar 320px tanpa overflow horizontal.
- Katalog milestone tersedia di ACHIEVEMENTS.md; aturan dan jalur belajar di LONG_TERM.md.

## Catatan versi awal

## Pemeriksaan yang lulus

- Build produksi (`npm run build`) dan pemeriksaan TypeScript.
- 29 pengujian aturan domain (`npm test`): batas hari WIB, mode PMS, target harian, EXP/level/atribut, pembatalan reward, streak, renang, challenge, impor, target cardio historis, dan konflik penjadwalan.
- 22 assertion PostgreSQL PGlite (`npm run test:db`): migrasi asli, isolasi pemilik melalui RLS, penolakan anonim, larangan penulisan langsung, dan penyimpanan revisi atomik.
- 12 skenario browser produksi: enam alur pada desktop 1440px dan ponsel 390px. Meliputi awal perjalanan, PMS, air/cardio/EXP/pembatalan/reload, navigasi, persetujuan jadwal, serta perubahan target yang baru berlaku keesokan hari.
- Empat skenario browser terfokus pada build produksi terakhir: pengingat sesi belum selesai dikirim satu kali, polling tidak menggandakan pengingat, dan sesi selesai tidak mengirim pengingat; masing-masing pada desktop dan ponsel. Pengiriman diuji melalui mock API browser/service worker, bukan tampilan notifikasi OS.
- Pemeriksaan tampilan progres, achievement, dan challenge juga dilakukan pada lebar 320px tanpa overflow horizontal.
- Format kode dan `git diff --check`.

12 skenario utama dan empat skenario pengingat dijalankan dalam pemeriksaan terpisah; tidak diklaim sebagai satu eksekusi tunggal berisi 16 kasus. Kedua kelompok lulus.

## Yang belum dibuktikan

Tidak ada konfigurasi proyek Supabase/Google pada lingkungan ini, sehingga login OAuth nyata, sinkronisasi jaringan antarperangkat, dan kebijakan proyek Supabase aktual belum diuji. PGlite memeriksa SQL lokal dengan identitas tiruan; bukan pengganti verifikasi proyek nyata.

Pengiriman notifikasi saat aplikasi tertutup belum diimplementasikan. Pada pemeriksaan awal belum ada deployment publik; GitHub Pages kemudian telah diaktifkan. Lihat SUPABASE.md dan NOTIFICATIONS.md untuk pengaktifan dan batas kemampuan.

Tangkapan layar selama pengujian memakai konteks browser sementara. Aktivitas uji tersebut tidak dimasukkan sebagai data awal aplikasi.

## Pembaruan jadwal kuliah

Pembaruan ini menambahkan jadwal mingguan yang dapat diedit, beberapa sesi per hari, versi semester bertanggal mulai, serta libur/jam khusus sementara.

- 37 pengujian domain lulus, termasuk migrasi snapshot versi 1 ke 2, tanggal efektif semester, pengecualian libur, benturan sesi, perjalanan kampus, kegiatan pribadi, dan preservasi EXP/agenda yang sudah disetujui.
- 22 skenario browser desktop/ponsel telah diverifikasi. Dalam run awal 18 lulus; empat kasus baru terhenti karena pencocokan teks/label pada test runner. Setelah locator diperbaiki, empat kasus terkait lulus pada run terpisah tanpa mengubah perilaku produk.
- Kasus baru memeriksa perubahan semester, pemindahan tanggal mulai jadwal mendatang, migrasi data browser lama, libur dua hari, kuliah pengganti, pemulihan rutinitas mingguan, penolakan sesi tumpang tindih, dan persetujuan ulang agenda.
