# Menampilkan Iris melalui GitHub Pages

Workflow `.github/workflows/pages.yml` membuat situs statis dan menerbitkannya saat branch `main` diperbarui. Di repository GitHub, buka **Settings → Pages → Source → GitHub Actions**.

Alamat untuk repository ini:
`https://indahsyarefi-rah.github.io/Solo-Leveling-to-do-list-inspiration/`

Alamat tersebut baru aktif setelah deployment berhasil. Build menyertakan prefix repository pada gambar, JavaScript, metadata, manifest, service worker, dan callback login.

Untuk build lokal yang sama:

```sh
NEXT_PUBLIC_BASE_PATH=/Solo-Leveling-to-do-list-inspiration npm run build:pages
```

Hasilnya berada di `out/`. GitHub Pages menjalankan berkas statis, bukan `npm start`. Jangan menggunakan server optimasi gambar Next.js pada ekspor ini; PNG asli disertakan.

GitHub Pages menyediakan hosting aplikasi. Data lintas perangkat tetap membutuhkan Supabase. Tanpa konfigurasi, data tersimpan dalam browser perangkat dan tidak otomatis dibagikan dengan ponsel/laptop lain.

Untuk mengaktifkan Supabase, jalankan migrasi sesuai SUPABASE.md dan tambahkan repository variables `NEXT_PUBLIC_SUPABASE_URL` serta `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada **Settings → Secrets and variables → Actions → Variables**. Gunakan public anon/publishable key, bukan service-role key. Lalu jalankan workflow kembali.

Tambahkan URL lengkap GitHub Pages di atas, termasuk nama repository dan trailing slash, pada daftar Redirect URLs Supabase. Site URL juga menggunakan alamat lengkap aplikasi. Google OAuth client tetap memakai callback Supabase, bukan callback langsung GitHub Pages.

Situs dan berkas JavaScript yang diterbitkan dapat diakses publik. Data pribadi tidak dimasukkan ke build; data browser tetap lokal dan database Supabase dilindungi RLS.
