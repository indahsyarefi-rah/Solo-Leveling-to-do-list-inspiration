export type IeltsMode = 'academic' | 'general' | 'common';
export interface LearningStage {
  name: string;
  sessions: number;
  goal: string;
  tasks: string[];
  checkpoint: string;
}

export const IELTS_STAGES: LearningStage[] = [
  {
    name: 'Return to English',
    sessions: 8,
    goal: 'Petakan kembali kemampuan setelah jeda dua tahun.',
    tasks: [
      'Listening 12 menit: dengarkan satu bagian latihan, cek transkrip, lalu catat tiga penyebab kesalahan.',
      'Reading 12 menit: kerjakan satu bacaan pendek dengan batas waktu. Bedakan masalah kosakata, inferensi, dan kehabisan waktu.',
      'Writing: tulis paragraf argumentasi 120–150 kata. Sisakan lima menit untuk memeriksa kejelasan, struktur, dan akurasi.',
      'Speaking: rekam jawaban Part 2 selama dua menit. Dengarkan kembali, tulis filler dan kesalahan yang berulang.',
    ],
    checkpoint:
      'Buat catatan kekuatan/kelemahan keempat skill. Band simulasi dua tahun lalu menjadi riwayat, bukan estimasi band saat ini.',
  },
  {
    name: 'Accuracy & Error Repair',
    sessions: 24,
    goal: 'Perbaiki kesalahan yang menghalangi konsistensi menuju Band 8.',
    tasks: [
      'Listening: fokus satu jenis soal. Kerjakan, cek jawaban, lalu ulang bagian yang salah tanpa melihat transkrip.',
      'Reading: latih True/False/Not Given atau matching headings. Tulis bukti kalimat untuk setiap jawaban.',
      'Writing: revisi satu paragraf lama. Periksa satu klaim, alasan, contoh, dan kalimat penghubung; hilangkan kata yang tidak perlu.',
      'Speaking: jawab tiga pertanyaan Part 3. Rekam, transkripsikan satu menit, perbaiki grammar dan ketepatan pilihan kata.',
    ],
    checkpoint:
      'Bandingkan error log dengan asesmen awal. Lanjutkan berdasarkan perubahan kesalahan, bukan hanya jumlah sesi.',
  },
  {
    name: 'Band 8 Skill Blocks',
    sessions: 48,
    goal: 'Latihan terarah pada coherence, lexical precision, grammatical control, dan ketepatan jawaban.',
    tasks: [
      'Listening bertempo ujian: satu set singkat, lalu klasifikasikan salah ejaan, distractor, atau kehilangan fokus.',
      'Reading: satu passage dibagi dua sesi. Sesi pertama menjawab 12 menit; sesi kedua memeriksa alasan dan parafrasa.',
      'Writing Task 2 dibagi sesi: rencana dan satu body paragraph hari ini; paragraf berikutnya dan revisi pada sesi Writing berikutnya.',
      'Speaking: Part 2 lalu dua follow-up Part 3. Nilai sendiri menggunakan deskriptor resmi; simpan contoh kalimat yang perlu dibenahi.',
    ],
    checkpoint:
      'Minta feedback berkala untuk Writing/Speaking bila memungkinkan. Checklist mandiri tidak menghasilkan sertifikasi band.',
  },
  {
    name: 'Timed Practice & Review',
    sessions: 60,
    goal: 'Bangun konsistensi dalam batas waktu tanpa menambah jadwal otomatis.',
    tasks: [
      'Listening: satu bagian timed practice. Gunakan sisa sesi untuk meninjau dua kesalahan paling penting.',
      'Reading: 15 menit timed questions + lima menit analisis. Pantau akurasi dan waktu secara terpisah.',
      'Writing Task 1: satu sesi untuk overview/struktur; sesi berikutnya untuk detail dan pemeriksaan. Sesuaikan format Academic atau General.',
      'Speaking: lakukan simulasi mini 11–14 menit, lalu catat dua sasaran perbaikan untuk sesi berikutnya.',
    ],
    checkpoint:
      'Jika siap, jadwalkan simulasi penuh secara terpisah. Durasi 20 menit tidak mereplikasi ujian penuh.',
  },
  {
    name: 'Refine, Retain, Repeat',
    sessions: 225,
    goal: 'Perbaikan berulang sepanjang dua tahun, dengan materi baru dan evaluasi berkala.',
    tasks: [
      'Ambil topik Listening baru dan ulang pola kesalahan dominan dari error log.',
      'Reading topik baru: prioritaskan jenis soal dengan akurasi terendah, lalu cek bukti jawaban.',
      'Writing: revisi tulisan lama dengan feedback/deskriptor. Bandingkan versi sebelum dan sesudah.',
      'Speaking: topik asing, rekam jawaban, lalu fokus pada kelancaran alami dan ketepatan, bukan hafalan skrip.',
    ],
    checkpoint:
      'Setiap 12 sesi, tinjau catatan. Target Band 8 dinilai melalui asesmen/ujian, tidak otomatis diberikan oleh aplikasi.',
  },
];

export const JAPANESE_STAGES: LearningStage[] = [
  {
    name: 'Bunyi & Hiragana',
    sessions: 15,
    goal: 'Mulai dari nol: bunyi Jepang dan pengenalan hiragana.',
    tasks: [
      'Pelajari 3–5 hiragana baru: baca bunyinya, tulis, lalu uji kembali tanpa melihat contoh.',
      'Ulang kana yang sudah dikenal selama tiga menit. Baca lima kombinasi suku kata dengan suara pelan.',
      'Latih vokal panjang, konsonan ganda, dan perbedaan bunyi. Gunakan contoh audio dari materi pemula.',
      'Review kana tanpa menambah materi. Catat karakter yang masih tertukar untuk pengulangan berikutnya.',
    ],
    checkpoint: 'Coba membaca hiragana acak tanpa romaji. Ulang tahap bila masih banyak tertukar.',
  },
  {
    name: 'Katakana & Salam',
    sessions: 15,
    goal: 'Kenali katakana, salam, perkenalan, dan angka dasar.',
    tasks: [
      'Pelajari 3–5 katakana dan ulang bentuk yang mirip, seperti シ/ツ dan ソ/ン.',
      'Latih salam dan perkenalan satu menit. Tulis nama dengan katakana jika relevan.',
      'Latih angka, waktu sederhana, dan nama hari. Buat lima kartu kosakata kecil.',
      'Review hiragana + katakana campuran. Baca kata pinjaman sederhana tanpa romaji.',
    ],
    checkpoint:
      'Perkenalkan diri singkat dan baca kana campuran. Jumlah sesi tidak otomatis berarti sudah menguasai kana.',
  },
  {
    name: 'Kalimat Pertama',
    sessions: 30,
    goal: 'Susun kalimat sangat sederhana dengan pola dasar.',
    tasks: [
      'Pelajari satu pola A は B です. Buat tiga kalimat tentang diri sendiri.',
      'Latih pertanyaan か serta partikel は/の/も secara bertahap. Buat tiga pasangan tanya-jawab.',
      'Pelajari lima kata benda atau kata kerja yang dekat dengan kegiatan harian.',
      'Dengarkan dialog pemula singkat, ulangi dua kalimat, dan tulis artinya.',
    ],
    checkpoint:
      'Buat perkenalan 5–8 kalimat dan pahami dialog sangat pendek dengan bantuan materi.',
  },
  {
    name: 'Fondasi N5',
    sessions: 60,
    goal: 'Bangun fondasi kosakata, kanji dasar, partikel, dan bentuk sopan.',
    tasks: [
      'Pelajari satu pola tata bahasa pemula dan buat tiga contoh pribadi.',
      'Pelajari 2–3 kanji dasar beserta satu kata yang memakainya; ulang karakter lama.',
      'Latih bentuk ます, negatif, atau lampau dengan beberapa kata kerja; satu perubahan per sesi.',
      'Baca atau dengarkan dialog pemula pendek. Simpan lima kata penting dan satu kalimat contoh.',
    ],
    checkpoint:
      'Gunakan soal latihan dasar untuk menemukan celah. Ini jalur fondasi N5, bukan jaminan kelulusan JLPT.',
  },
  {
    name: 'Reading & Listening Habits',
    sessions: 90,
    goal: 'Perkuat pemahaman dengan teks pendek dan pengulangan.',
    tasks: [
      'Baca 3–5 kalimat mudah. Tandai partikel dan cari arti kata seperlunya.',
      'Dengarkan dialog pendek dua kali: sekali untuk gambaran, sekali untuk detail.',
      'Latih satu pola seperti bentuk て atau ungkapan keinginan, sesuai kesiapan; buat dua contoh.',
      'Review kosakata dan kanji yang paling sering lupa. Uji ingatan sebelum membuka jawaban.',
    ],
    checkpoint:
      'Tinjau pemahaman teks dan dialog yang benar-benar dikerjakan. Ulang fondasi bila diperlukan.',
  },
  {
    name: 'Consolidate & Explore',
    sessions: 155,
    goal: 'Pertahankan fondasi dan mulai materi berikutnya hanya jika siap.',
    tasks: [
      'Baca teks pendek baru lalu ringkas dalam satu kalimat sederhana.',
      'Lakukan shadowing satu dialog pendek; fokus pada ritme dan bunyi.',
      'Tulis jurnal 2–3 kalimat tentang hari ini dan periksa pola yang dipakai.',
      'Review materi yang sulit. Jika fondasi kuat, coba satu pola awal N4 tanpa mengejar label level.',
    ],
    checkpoint:
      'Dengan 10 menit setiap dua hari, perkembangan bertahap. Evaluasi kemampuan secara terpisah dari Level Hunter.',
  },
];

export function lessonAt(
  track: 'ielts' | 'japanese',
  completedSessions: number,
  mode: IeltsMode = 'academic',
  repeatStage: number | null = null,
) {
  const stages = track === 'ielts' ? IELTS_STAGES : JAPANESE_STAGES;
  let offset = completedSessions;
  let index = 0;
  for (; index < stages.length - 1; index++) {
    if (offset < stages[index].sessions) break;
    offset -= stages[index].sessions;
  }
  if (
    repeatStage !== null &&
    Number.isInteger(repeatStage) &&
    repeatStage >= 0 &&
    repeatStage < stages.length
  ) {
    index = repeatStage;
    offset = completedSessions;
  }
  const stage = stages[index];
  const variant =
    track === 'ielts'
      ? mode === 'general'
        ? 'Writing Task 1 General: surat dengan tujuan, register, dan informasi yang jelas.'
        : mode === 'academic'
          ? 'Writing Task 1 Academic: overview, perbandingan data, dan pemilihan detail penting.'
          : 'Sebelum memilih jenis IELTS, fokus Listening, Speaking, dan Writing Task 2; Task 1 ditentukan setelah memilih Academic/General.'
      : '';
  return {
    ...stage,
    index,
    session: offset + 1,
    task: stage.tasks[offset % stage.tasks.length],
    variant,
  };
}
