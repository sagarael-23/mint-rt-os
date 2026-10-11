// Statistik sederhana untuk satu deret angka (mis. CPU% per detik).
export function seriesStats(values) {
  if (values.length === 0) return { min: 0, max: 0, avg: 0, last: 0 }

  let min = values[0]
  let max = values[0]
  let sum = 0
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { min, max, avg: sum / values.length, last: values[values.length - 1] }
}

// Total met dan missed pada jendela, plus persentase performa deadline.
// Rumus sama dengan backend: met / (met + missed), satu desimal; null jika kosong.
export function windowTotals(samples) {
  let met = 0
  let missed = 0
  for (const s of samples) {
    met += s.met
    missed += s.missed
  }
  const total = met + missed
  return {
    met,
    missed,
    percent: total === 0 ? null : Math.round((met / total) * 1000) / 10,
  }
}

// Menambah satu sampel ke ujung dan membuang yang tertua jika melebihi kapasitas.
// Daftar asli tidak diubah.
export function appendSample(samples, sample, capacity) {
  const next = [...samples, sample]
  return next.length > capacity ? next.slice(next.length - capacity) : next
}