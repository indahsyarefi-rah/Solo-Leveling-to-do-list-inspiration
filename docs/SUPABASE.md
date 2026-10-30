# Google login dan sinkronisasi lintas perangkat

Kode mendukung satu perjalanan per akun Google melalui Supabase. Laptop dan
ponsel yang masuk ke akun yang sama membaca database yang sama. Tanpa konfigurasi
berikut, jangan menganggap pencatatan perangkat sebagai data yang sudah tersinkron.

## 1. Buat proyek dan tabel

1. Buat proyek PostgreSQL di [Supabase](https://supabase.com/dashboard).
2. Buka SQL Editor dan jalankan seluruh isi
   `supabase/migrations/202610300001_iris_state.sql` satu kali. Alternatifnya,
   gunakan migrasi tersebut melalui Supabase CLI yang sudah terhubung ke proyek.
3. Pastikan tabel `public.app_state` dan fungsi `public.save_iris_state` ada.
   RLS harus tetap aktif. Jangan memberi browser kunci `service_role`.

Snapshot perjalanan disimpan sebagai JSONB; satu baris dimiliki satu `auth.uid()`.
Riwayat harian, preferensi, dan progres tetap berada dalam snapshot tersebut.
Pendekatan ini cocok untuk aplikasi pribadi dan membuat perubahan satu quest
beserta reward-nya tersimpan sebagai satu transaksi. Migrasi analitik ke tabel
terpisah dapat dilakukan kemudian tanpa mengubah aturan progres.

## 2. Konfigurasikan Google OAuth

1. Di Google Cloud Console, buat OAuth consent screen dan OAuth client bertipe
   **Web application**. Untuk pemakaian pribadi selama status Testing, masukkan
   alamat Google Iris sebagai test user.
2. Tambahkan URI callback yang ditampilkan oleh provider Google di Supabase,
   biasanya `https://<project-ref>.supabase.co/auth/v1/callback`, pada
   **Authorized redirect URIs** milik OAuth client Google. Ini adalah callback
   Supabase, bukan URL aplikasi Iris.
3. Pada Supabase → Authentication → Sign In / Providers → Google, aktifkan
   provider dan simpan Google Client ID serta Client Secret melalui pengaturan
   layanan. Jangan masukkan Client Secret ke source code atau chat.
4. Pada Supabase → Authentication → URL Configuration, atur **Site URL** ke URL
   aplikasi. Tambahkan origin yang benar ke **Redirect URLs**:
   `http://localhost:3000`, `http://127.0.0.1:3000` jika dipakai, dan origin HTTPS
   produksi. Aplikasi mengarahkan hasil login ke `window.location.origin`.
5. Untuk aplikasi pribadi, batasi pendaftaran akun di pengaturan autentikasi;
   setelah akun Iris dibuat, pendaftaran pengguna baru dapat dinonaktifkan.
   RLS tetap memisahkan data jika lebih dari satu akun pernah dibuat.

Supabase client memakai PKCE, mendeteksi callback URL, dan menyimpan sesi browser.
Setiap perangkat perlu melakukan login Google-nya sendiri. Keluar dari satu
perangkat menggunakan sign-out lokal, sehingga tidak mengeluarkan perangkat lain.

## 3. Isi konfigurasi aplikasi

Salin `.env.example` menjadi `.env.local`. Isi:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL dari Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public legacy `anon` key dari pengaturan API.

Kedua variabel ini dipakai oleh browser; anon key mengidentifikasi proyek dan
bukan kunci administrator. RLS adalah batas akses data. Jangan memakai
`service_role`, database password, Google Client Secret, atau secret API key di
variabel `NEXT_PUBLIC_*`. Simpan nilai pengaturan melalui file lokal yang diabaikan
Git atau environment settings; tidak perlu mengirim nilainya dalam chat.

Setelah mengubah variabel, restart server pengembangan. Untuk build produksi,
variabel `NEXT_PUBLIC_*` harus tersedia **ketika build dijalankan**.

## 4. Publikasi ke Vercel

1. Hubungkan repository di Vercel dan gunakan framework preset Next.js.
2. Tambahkan dua variabel di atas ke environment deployment yang dibutuhkan.
3. Jalankan deployment, lalu tambahkan origin HTTPS hasil deployment ke daftar
   redirect Supabase dan Site URL produksi.
4. Lakukan login Google dari laptop dan ponsel menggunakan akun yang sama.

Paket gratis Supabase, Google OAuth, dan Vercel memiliki kuota/kebijakan masing-
masing; proyek Supabase gratis dapat dijeda bila lama tidak aktif. Tidak ada
langganan berbayar atau deployment yang dibuat otomatis oleh source code ini.

## 5. Validasi sinkronisasi dan konflik

1. Di perangkat A, masuk dan mulai perjalanan. Selesaikan satu quest.
2. Tunggu status sinkronisasi berhasil. Di perangkat B dengan akun yang sama,
   muat data dan pastikan quest, EXP, serta perubahan Mode PMS tampil sesuai.
3. Biarkan dua perangkat membaca revisi yang sama, lalu simpan perubahan di A.
   Simpan perubahan lama dari B: server harus menolak dengan konflik, bukan
   menghapus perubahan A. Tinjau data terbaru sebelum memutuskan perubahan mana
   yang dipakai; jangan otomatis mencoba menyimpan ulang revisi lama.
4. Pembatalan quest membatalkan reward terkait dan tersimpan seperti perubahan
   lainnya; memuat ulang halaman tidak boleh menggandakan EXP.

Semua operasi tulis melalui fungsi atomik `save_iris_state`. `expectedRevision =
null` berarti membuat snapshot pertama hanya jika belum ada; revisi numerik
berarti simpan hanya jika versi server masih sama. Konflik awal dan konflik
perangkat lain ditandai `CloudConflictError`. API REST biasa tidak mendapat hak
insert/update/delete, sehingga tidak bisa melewati pemeriksaan revisi.

Pengujian login, RLS, dan sinkronisasi ke proyek nyata membutuhkan proyek serta
konfigurasi di atas. Build lokal yang sukses tanpa konfigurasi tidak membuktikan
bahwa login atau sinkronisasi cloud sudah bekerja.

## Pengujian SQL lokal

Jalankan `npm run test:db` setelah dependensi pengembangan terpasang. Runner di
`supabase/tests/access.test.mjs` menjalankan migrasi asli pada PostgreSQL PGlite
yang terisolasi, dengan skema autentikasi minimal untuk meniru identitas pemilik
baris. Tidak ada proyek Supabase, kredensial, atau koneksi database produksi yang
dipakai.

Pemeriksaan mencakup isolasi pemilik melalui RLS, penolakan akses anonim,
penolakan insert/update/delete langsung, tabrakan pembuatan snapshot, revisi lama,
compare-and-swap, serta input dan identitas yang tidak valid. Ini menguji perilaku
SQL, bukan penerbitan JWT, login Google, atau sinkronisasi jaringan ke Supabase.
