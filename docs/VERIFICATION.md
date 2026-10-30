# Hasil verifikasi versi awal

Tanggal: 30 Oktober 2026. Runtime: Node.js 24.19.0, Next.js 16.4.3, React 19.3.1.

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

Pengiriman notifikasi saat aplikasi tertutup belum diimplementasikan. Tidak ada deployment publik yang dilakukan. Lihat SUPABASE.md dan NOTIFICATIONS.md untuk pengaktifan dan batas kemampuan.

Tangkapan layar selama pengujian memakai konteks browser sementara. Aktivitas uji tersebut tidak dimasukkan sebagai data awal aplikasi.
