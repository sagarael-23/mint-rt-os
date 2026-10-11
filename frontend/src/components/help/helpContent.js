export const HELP_SECTIONS = [
  {
    id: "what",
    title: "Apa itu MINT RT OS?",
    paragraphs: [
      "MINT RT OS (Mint Real-Time Operating System) adalah dashboard sistem yang berjalan di atas Linux Mint. Aplikasi ini bukan sistem operasi baru dan tidak mengganti kernel Linux.",
      "Backend C membaca process Linux yang sedang berjalan langsung dari /proc, lalu antarmuka React menampilkannya seperti Task Manager, ditambah simulasi penjadwalan EDF.",
    ],
    items: [
      "Data process, CPU, dan memori berasal dari Linux.",
      "Penjadwalan EDF adalah simulasi tingkat aplikasi.",
      "Kernel Linux tidak dimodifikasi, dan sistem ini bukan hard real-time.",
    ],
  },
  {
    id: "rts",
    title: "Apa itu Real-Time System?",
    paragraphs: [
      "Sistem real-time adalah sistem yang kebenarannya bergantung bukan hanya pada hasil perhitungan, tetapi juga pada kapan hasil itu selesai. Pekerjaan yang selesai setelah deadline dianggap gagal atau tidak berguna.",
    ],
    items: [
      "Hard real-time: melewati deadline tidak boleh terjadi (contoh: kontrol rem).",
      "Soft real-time: melewati deadline menurunkan kualitas tetapi tidak fatal (contoh: pemutaran video).",
      "Linux standar bukan sistem hard real-time. MINT RT OS mensimulasikan konsep ini di atas Linux.",
    ],
  },
  {
    id: "edf",
    title: "Apa itu EDF?",
    paragraphs: [
      "Earliest Deadline First (EDF) adalah algoritma penjadwalan yang selalu menjalankan pekerjaan dengan deadline paling dekat.",
      "Contoh: tiga pekerjaan dengan deadline 100 ms (A), 50 ms (B), dan 80 ms (C) dijalankan dengan urutan B, C, lalu A.",
      "Pada satu prosesor, EDF terbukti optimal untuk pekerjaan yang independen: jika ada jadwal yang memenuhi semua deadline, EDF akan menemukannya. Jika total beban melebihi kapasitas, sebagian deadline pasti terlewat.",
    ],
  },
  {
    id: "process",
    title: "Apa itu Process?",
    paragraphs: [
      "Process adalah program yang sedang berjalan. Setiap process punya PID (nomor identitas), ruang memori sendiri, dan sebuah state.",
      "Thread adalah jalur eksekusi di dalam process. Satu process bisa punya banyak thread yang berbagi memori.",
    ],
    items: [
      "RUNNING: sedang memakai CPU.",
      "SLEEPING: menunggu sesuatu (masukan, timer, dan sebagainya).",
      "DISK_WAIT: menunggu disk dan tidak bisa disela.",
      "STOPPED: dihentikan.",
      "ZOMBIE: sudah selesai tetapi belum dibersihkan oleh process induknya.",
      "IDLE: thread kernel yang sedang menganggur.",
    ],
  },
  {
    id: "task",
    title: "Apa itu Task?",
    paragraphs: [
      "Di menu Tasks, 'task' berarti process Linux yang sedang berjalan. Di dalam kernel Linux, 'task' (task_struct) adalah istilah untuk process maupun thread, dan kernel menjadwalkan task.",
      "Di simulasi EDF dipakai istilah job: satu unit pekerjaan untuk setiap process yang aktif pada satu siklus.",
      "Tidak ada fitur membuat task secara manual. Semua berasal dari process yang benar-benar berjalan.",
    ],
  },
  {
    id: "deadline",
    title: "Apa itu Deadline?",
    paragraphs: [
      "Deadline adalah batas waktu sebuah pekerjaan harus selesai. Process Linux biasa tidak punya deadline asli.",
      "Karena itu deadline di MINT RT OS adalah deadline simulasi yang dihitung otomatis. Deadline ini bukan deadline Linux, dan process aslinya tidak diubah.",
    ],
    items: [
      "MET: job selesai paling lambat pada deadline.",
      "MISSED: job selesai setelah deadline.",
      "Slack = deadline dikurangi waktu selesai. Nilai negatif berarti terlambat.",
    ],
  },
  {
    id: "edf-here",
    title: "Bagaimana EDF bekerja di MINT RT OS?",
    items: [
      "Setiap siklus (bawaan 1 detik), backend mencari process yang memakai CPU pada siklus itu.",
      "Waktu CPU nyata process tersebut menjadi waktu eksekusi job.",
      "Deadline job = waktu eksekusi × jumlah job, dibatasi panjang siklus (atau sama dengan waktu eksekusi jika job lebih panjang dari siklus).",
      "Semua job dijalankan berurutan pada satu prosesor simulasi menurut deadline terdekat.",
      "Job yang selesai setelah deadline berstatus MISSED.",
    ],
    paragraphs: [
      "Karena prosesor simulasi hanya satu core, total waktu CPU yang lebih panjang dari siklus membuat job yang berat terlambat. Jadi MISSED bisa muncul walau komputer belum penuh. Ini sifat model simulasi, bukan deadline Linux.",
    ],
  },
  {
    id: "read",
    title: "Bagaimana MINT RT OS membaca process Linux?",
    paragraphs: [
      "Backend memindai folder /proc setiap siklus. Setiap folder yang namanya berupa angka adalah satu process.",
      "Process baru terdeteksi saat PID-nya muncul di pemindaian, dan process yang selesai terdeteksi saat PID-nya hilang. Nama process dipotong kernel hingga 15 karakter.",
    ],
    items: [
      "/proc/[PID]/stat: nama, state, PID induk, jumlah thread, dan waktu CPU.",
      "/proc/[PID]/status: memori fisik yang dipakai (VmRSS).",
      "/proc/stat: total waktu CPU seluruh sistem.",
      "/proc/meminfo: total dan sisa memori.",
      "/proc/loadavg dan /proc/uptime: beban rata-rata dan lama sistem menyala.",
    ],
  },
  {
    id: "monitoring",
    title: "Bagaimana monitoring bekerja?",
    items: [
      "CPU sistem = (selisih total tick − selisih tick idle) ÷ selisih total tick × 100, dari dua pembacaan /proc/stat.",
      "CPU process = selisih waktu CPU process ÷ selisih total tick sistem. Karena dibagi seluruh core, satu process yang memakai penuh satu dari dua core tampil sekitar 50%.",
      "Memori = (total − tersedia) ÷ total, memakai MemAvailable.",
      "Deadline Performance = MET ÷ (MET + MISSED) pada 120 siklus terakhir.",
    ],
  },
  {
    id: "use",
    title: "Cara memakai dashboard",
    items: [
      "Dashboard: ringkasan CPU, jumlah process aktif, status scheduler, dan process teratas.",
      "Tasks: cari berdasarkan nama atau PID, saring menurut state, urutkan dengan mengklik header, dan klik baris untuk melihat detail.",
      "Scheduler: timeline Gantt dan antrean job per siklus. Start dan Stop mengendalikan simulasi.",
      "Monitoring: grafik CPU, memori, dan performa deadline selama 120 siklus. Arahkan mouse ke grafik untuk melihat nilainya.",
      "Logs: peristiwa dari backend, bisa disaring menurut level, kategori, atau kata.",
      "Settings: panjang siklus (backend), tema, dan interval Live.",
      "Tombol Live memperbarui data secara berkala.",
    ],
  },
  {
    id: "limits",
    title: "Keterbatasan",
    items: [
      "EDF di sini adalah simulasi tingkat aplikasi pada 1 prosesor simulasi, bukan scheduler kernel.",
      "Sistem ini bukan hard real-time.",
      "CPU% diukur pada jendela satu siklus sehingga bisa berfluktuasi.",
      "Nama process dipotong 15 karakter oleh kernel.",
      "Tidak ada fitur menghentikan process (Kill), demi keamanan.",
      "Backend hanya mendengarkan 127.0.0.1 dan tidak bisa diakses dari komputer lain.",
    ],
  },
]