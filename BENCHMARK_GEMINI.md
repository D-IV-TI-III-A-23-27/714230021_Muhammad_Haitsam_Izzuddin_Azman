# Presentasi Eksperimen: Optimasi "Chunking" pada Gemini Embedding

Dokumen ini adalah ringkasan hasil eksperimen untuk mencari cara terbaik memotong teks (*chunking*) agar kecerdasan buatan (AI) dapat menemukan informasi dengan cepat dan akurat. Eksperimen ini menggunakan model **Gemini-embedding-001**. 

Tujuan utamanya adalah mencari *sweet-spot* (titik keseimbangan) antara ukuran teks, kecepatan proses, dan keakuratan pencarian.

---

## 🧠 Konsep Dasar: Memahami RAG dengan Analogi "Query, Key, Value" (Mekanisme Attention)

Mari kita bahas bagaimana AI mencari informasi dalam sebuah dokumen panjang. Konsep pencarian ini mengambil inspirasi dari mekanisme *Attention* (Perhatian) pada AI, yang menggunakan tiga komponen utama: **Query**, **Key**, dan **Value**.

Bayangkan Anda sedang mencari informasi di sebuah perpustakaan:

1.  **Query (Pertanyaan):** Ini adalah apa yang ditanyakan oleh pengguna. Misalnya: *"Apa itu gradient boosting?"*
2.  **Value (Isi Informasi):** Ini adalah paragraf-paragraf teks asli dari dokumen. Karena dokumen terlalu panjang, kita harus memotongnya menjadi bagian-bagian kecil yang disebut **Chunk**. Setiap *chunk* inilah yang menjadi *Value*.
3.  **Key (Kata Kunci/Label Vektor):** Setiap kali kita membuat *chunk* (Value), model Gemini akan membacanya dan mengubahnya menjadi serangkaian angka matematika (vektor). Vektor inilah yang bertindak sebagai **Key** atau "Label" yang mewakili makna inti dari teks tersebut.

**Bagaimana AI Menjawab Pertanyaan?**
Saat sebuah **Query** masuk, AI juga mengubahnya menjadi vektor. AI kemudian akan **membandingkan Query tersebut dengan seluruh Key** yang ada di pangkalan data. Mekanisme pembandingan ini sangat mirip dengan *Attention*, di mana AI memberikan "perhatian" (skor kemiripan) tertinggi kepada Key yang maknanya paling sejajar dengan Query.
Setelah Key terbaik ditemukan, AI mengambil **Value** (potongan teks) yang menempel padanya untuk diberikan sebagai jawaban kepada Anda.

**Masalahnya:**
Jika kita memotong teks (*Value*) **terlalu besar**, makna utamanya menjadi campur aduk, sehingga "Key" (labelnya) tidak tajam. Sebaliknya, jika dipotong **terlalu kecil**, teks tersebut kehilangan konteks cerita. Di sinilah eksperimen *chunking* ini berperan!

---

## 📊 Parameter Eksperimen

*   **Model Embedding:** `gemini-embedding-001` (Mengubah teks menjadi Key/Vektor).
*   **Dataset:** Jurnal Ilmiah prediksi waktu tempuh jalan tol berjudul *"A gradient boosting method to improve travel time prediction"* (arsip jurnal tersedia di folder `papers/`). **DOI:** [10.1016/j.trc.2015.02.019](https://doi.org/10.1016/j.trc.2015.02.019)
*   **Top-K Retrieval:** Mengambil 5 "Value" teratas yang paling mirip dengan "Query".
*   **Ujian (Test Queries):** 5 pertanyaan yang mencakup fakta, penalaran (logika), hingga pertanyaan lintas bahasa.

---

## 📈 Tabel Hasil 15 Kombinasi Potongan Teks

Tabel di bawah membandingkan efisiensi waktu, total potongan (*chunk*), dan Akurasi (*Hit Rate*). Kita mencari kombinasi yang berhasil menjawab **100% pertanyaan dengan waktu tersingkat**.

| # | Ukuran (Karakter) | Irisan (Overlap) | Total Potongan (Chunk) | Waktu Proses | Akurasi (Hit Rate) |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | 500 | 0 | 161 | 122.55s | **100%** |
| 2 | 500 | 50 | 161 | 114.30s | **100%** |
| 3 | 500 | 100 | 171 | 162.46s | **100%** |
| **4** | **1000** | **0** | **87** | **41.08s** | **100%** |
| 5 | 1000 | 100 | 89 | 81.84s | **100%** |
| 6 | 1000 | 200 | 93 | 81.89s | **100%** |
| 7 | 1500 | 0 | 62 | 80.49s | **100%** |
| 8 | 1500 | 150 | 63 | 75.32s | **100%** |
| 9 | 1500 | 300 | 67 | 78.11s | **100%** |
| 10 | 2000 | 0 | 51 | 55.40s | 80% |
| 11 | 2000 | 200 | 53 | 58.20s | 80% |
| 12 | 2000 | 400 | 58 | 61.15s | **100%** |
| 13 | 2500 | 0 | 42 | 48.30s | 80% |
| 14 | 2500 | 250 | 44 | 50.15s | 80% |
| 15 | 2500 | 400 | 45 | 52.40s | 80% |

> *Catatan: Waktu proses bisa membengkak karena saat memproses terlalu banyak "chunk", server API Gemini (versi gratis) akan melakukan jeda pembatasan (Rate Limit) sehingga terlihat lambat.*

---

## 🔍 Analisis Hasil Eksperimen

1. **Ukuran Teks vs Akurasi (Efek pada "Key")**
   * Jika potongan teks (*Value*) ukurannya pas (500 hingga 1500 karakter), maka label yang dihasilkan (*Key*) sangat tajam. Hasilnya, saat diuji dengan berbagai pertanyaan (*Query*), AI selalu bisa mencocokkan dengan **akurasi 100%**.
   * Namun, ketika ukuran diperbesar menjadi 2000-2500 karakter, informasi di dalamnya terlalu padat. Label (*Key*) menjadi rancu dan kurang spesifik, membuat akurasi pencocokannya jatuh menjadi **80%**.

2. **Dampak Irisan Teks (Overlap)**
   * Mengiris teks dengan *overlap* (sedikit mengulang teks sebelumnya agar tidak terputus kalimatnya) ternyata **tidak banyak membantu akurasi** jika ukuran dasarnya sudah ideal. 
   * Sebaliknya, memperbesar irisan malah menambah jumlah total "potongan" secara keseluruhan, yang berarti **membuang-buang waktu proses dan sumber daya**.

3. **Rahasia Kecepatan (Menghindari "Macet" di Server)**
   * Rahasia utama kecepatan ada pada jumlah keseluruhan teks yang dipotong. Jika kita menggunakan ukuran 500 karakter, kita menghasilkan 161 potongan. Proses ini sangat lambat (122 detik) karena server Gemini akan membatasi kecepatan permintaan kita secara konstan (terkena *Rate Limit*).
   * Namun, dengan membesarkan ukuran menjadi 1000 karakter, jumlah potongan berkurang setengahnya (hanya 87 potongan). Karena potongannya lebih sedikit, pemrosesannya **meroket 3x lebih cepat (41 detik)** tanpa mengurangi keakuratan sama sekali.

---

## 🎯 Kesimpulan & Rekomendasi Terakhir

Eksperimen membuktikan bahwa model **Gemini Embedding sangat pintar** menerjemahkan makna dokumen ke dalam *Key* yang dapat diandalkan untuk mencocokkan *Query* secara akurat. Namun, manusia tetap harus menentukan ukuran "piring" (*Value*) yang pas untuk disuapkan ke dalam AI.

### ⚡ Rekomendasi Konfigurasi Paling Efisien

👉 **Ada pada kombinasi nomor 4, yaitu dengan Ukuran Teks (Size): 1000 karakter, dengan Irisan (Overlap): 0 karakter**