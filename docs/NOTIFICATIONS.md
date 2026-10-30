# Notifikasi dan pemasangan aplikasi

Iris menggunakan izin notifikasi browser untuk pengingat yang dipicu aplikasi saat halaman terbuka. HTTPS diperlukan pada domain publik; `localhost` juga dianggap secure context oleh browser yang mendukungnya. Keputusan browser dan pengaturan sistem operasi tetap menentukan apakah notifikasi benar-benar ditampilkan.

## API untuk antarmuka

Impor dari `src/lib/reminders.ts`. Semua fungsi aman dipanggil pada lingkungan tanpa browser dan tidak melempar error ketika kemampuan notifikasi tidak tersedia.

- `notificationSupport(): boolean`: memeriksa secure context dan keberadaan Notification API. Ini tidak menjamin izin, pemasangan PWA, atau pengiriman oleh OS.
- `requestNotificationPermission(): Promise<boolean>`: panggil langsung dari klik pengguna pada pengaturan notifikasi. Mengembalikan `true` jika izin diberikan. Izin ditolak tidak diminta lagi; prompt yang ditutup juga tidak diulang pada sesi halaman yang sama. Aktifkan preferensi pengguna hanya setelah hasil `true`.
- `registerServiceWorker(): Promise<void>`: registrasi worker `/sw.js`, scope `/`; dapat dipanggil setelah aplikasi dimuat. Gagal registrasi ditangani tanpa menghentikan aplikasi.
- `showReminder(title, body): Promise<void>`: mencoba menampilkan notifikasi segera hanya jika izin sudah diberikan. Memakai service worker aktif jika tersedia, lalu fallback Notification pada browser desktop. Tidak meminta izin, tidak membuat timer, dan hasil `void` bukan bukti pengiriman.

Penjadwal pada aplikasi harus menghindari pengingat ganda per tanggal/tugas, mematuhi preferensi notifikasi, status penyelesaian, Mode PMS, dan kondisi puasa. Waktu shalat akurat tidak tersedia otomatis dalam implementasi ini; jangan mengirim pengingat dengan jam shalat yang ditebak.

## Batas kemampuan

- Tidak ada Web Push backend, VAPID key, push subscription, server cron, atau event push dalam worker ini.
- Browser dapat menunda timer pada tab di latar belakang. Pengingat tidak dijamin saat tab ditutup, browser dihentikan, perangkat tidur, atau notifikasi OS diblokir.
- Pada beberapa perangkat, khususnya iOS/iPadOS, notifikasi memerlukan PWA yang dipasang ke layar utama serta versi browser/OS yang mendukungnya.
- Setelah pengguna menolak izin, pengaktifan kembali dilakukan melalui pengaturan browser/perangkat; aplikasi tidak dapat memaksa prompt baru.
- Notifikasi dapat menampilkan judul dan isi di layar kunci. Hindari informasi sensitif yang tidak perlu.

Jika pengingat saat aplikasi tertutup menjadi kebutuhan berikutnya, tambahkan layanan Web Push dengan persetujuan pengguna, pengelolaan subscription per akun/perangkat, penjadwal server yang memakai zona waktu WIB, serta penghentian pengingat ketika quest selesai atau mendapat pengecualian. Jangan mengandalkan timer halaman untuk klaim kemampuan tersebut.

## Worker dan manifest

`public/sw.js` hanya menangani aktivasi dan klik notifikasi. Klik memfokuskan jendela Iris pada origin yang sama, atau membuka `/` pada origin tersebut. URL arbitrer dari payload notifikasi tidak dibuka. Worker tidak mencegat fetch dan tidak menyimpan data akun, sesi, respons API, atau halaman ke cache.

`public/manifest.webmanifest` memberi metadata pemasangan standalone. Hubungkan melalui metadata manifest pada layout aplikasi. Ikon memakai master PNG asli `1254x1254`, dengan purpose `any`; ikon tidak diklaim sebagai maskable. Manifest bukan jaminan bahwa semua browser akan menawarkan pemasangan.

## Pemeriksaan manual

1. Buka aplikasi melalui localhost atau HTTPS dan periksa status dukungan.
2. Klik pengaktifan notifikasi; setujui, lalu picu pengingat uji dari aplikasi.
3. Klik notifikasi dan pastikan jendela Iris aktif kembali.
4. Ulangi dengan izin ditolak; aplikasi tetap berjalan dan tidak mengulang prompt.
5. Pastikan pengingat shalat/puasa tidak dikirim saat Mode PMS aktif, dan pengingat minum tidak diberikan selama jendela puasa.
6. Tutup aplikasi dan pastikan produk tidak menjanjikan pengingat latar belakang yang belum diimplementasikan.
