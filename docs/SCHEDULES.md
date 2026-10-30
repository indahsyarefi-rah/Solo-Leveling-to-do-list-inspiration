# Jadwal kuliah yang dapat diubah

Buka **Jadwal → Atur jadwal kuliah**.

## Rutinitas mingguan dan semester baru

1. Isi nama jadwal/semester dan tanggal **Berlaku mulai**.
2. Buka hari yang ingin diubah. Edit nama kegiatan, waktu mulai, dan selesai.
3. Gunakan **Tambah sesi** untuk beberapa mata kuliah dalam sehari. Matikan **Ada kuliah** atau hapus seluruh sesi untuk menjadikan hari itu libur mingguan.
4. Tekan **Simpan jadwal kuliah**.

Jadwal sebelumnya tetap berlaku sebelum tanggal mulai versi baru. Untuk mengubah tanggal/jam versi mendatang, buka kembali editor dan pilih **Edit** pada jadwal tersimpan. Menyimpan dengan tanggal mulai yang sama memperbarui versi tersebut. Versi yang sudah berada di masa lalu dipertahankan; buat versi baru mulai hari ini untuk mengubah rutinitas aktif.

## Libur sementara dan kuliah pengganti

Buka tab **Libur & tanggal khusus**. Pilih satu tanggal atau rentang maksimal 90 hari, lalu:

- **Libur (tanpa kuliah)**: menghilangkan blok kuliah dan perjalanan kampus untuk tanggal tersebut.
- **Jam kuliah khusus**: menggunakan sesi pengganti untuk tanggal tersebut.
- **Kembali ke jadwal mingguan**: menghapus pengecualian pada rentang yang dipilih.

Pengecualian tidak mengubah rutinitas mingguan, pola puasa, atau quest harian. Hari libur kuliah tetap mengikuti rutinitas olahraga dan Mode PMS yang dipilih. Pengecualian tanggal lebih diutamakan daripada versi semester.

## Menerapkan ke agenda harian

Perubahan jadwal kuliah tidak menimpa agenda harian yang sudah disetujui. Tekan **Buat usulan baru**, tinjau hasilnya, lalu **Setujui jadwal** untuk menerapkan perubahan. Menutup dialog peninjauan tidak mengubah agenda.

Usulan mempertimbangkan seluruh sesi kuliah, waktu perjalanan sebelum sesi pertama dan sesudah sesi terakhir, jam bangun/tidur, serta kegiatan pribadi yang sudah dicatat. Jam antarsesi dapat menjadi slot kosong. Benturan waktu ditampilkan untuk ditinjau; tidak ada pemindahan ke tanggal lain secara otomatis.

## Penyimpanan dan data lama

Pembaruan otomatis membaca data versi sebelumnya dan mempertahankan aktivitas, EXP, mode PMS, serta agenda yang sudah disetujui. Pengaturan jadwal menjadi bagian dari cadangan JSON dan snapshot Supabase jika sinkronisasi diaktifkan. Tidak diperlukan perubahan tabel database.

Schema snapshot dinaikkan ke versi 2. Klien versi lama menolak snapshot baru alih-alih menghapus pengaturan jadwal yang tidak dikenalnya. Muat ulang aplikasi di perangkat lain sebelum melanjutkan penyuntingan.
