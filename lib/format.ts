const nf = new Intl.NumberFormat('id-ID')
const pf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })
const jtf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'always' })

export function formatRupiah(n: number): string {
  return `Rp${nf.format(n)}`
}

/** Rounds up so a short price never reads cheaper than the real one. */
export function formatRupiahShort(n: number): string {
  if (n < 1_000_000) {
    const rb = Math.ceil(n / 1000)
    if (rb < 1000) return `Rp${rb}rb`
    return 'Rp1jt'
  }
  const jt = Math.ceil(n / 10_000) / 100
  return `Rp${jtf.format(jt)}jt`
}

export function parseRupiah(input: string): number | null {
  let s = input.replace(/rp/gi, '').replace(/\s/g, '')
  s = s.replace(/,\d{2}$/, '')
  s = s.replace(/[.,]/g, '')
  if (!/^\d+$/.test(s)) return null
  return Number(s)
}

export function formatCount(n: number): string {
  return nf.format(n)
}

export function formatPercent(x: number | null): string {
  if (x === null) return '–'
  return `${pf.format(x * 100)}%`
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function relativeTimeId(date: Date, now: Date = new Date()): string {
  const diff = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diff)
  for (const [unit, secs] of UNITS) {
    if (abs >= secs) return rtf.format(Math.trunc(diff / secs), unit)
  }
  return rtf.format(Math.trunc(diff), 'second')
}

/** Video length as m:ss, e.g. 12 → "0:12". */
export function formatDuration(sec: number): string {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const DAY_TZ = 'Asia/Jakarta'

/** "27 Sep – 26 Okt 2026"; the year is shown once at the end when both ends share it. */
export function formatDateRange(from: Date, to: Date): string {
  const f = (d: Date, year: boolean) =>
    new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', timeZone: DAY_TZ, ...(year ? { year: 'numeric' as const } : {}),
    }).format(d)
  const y = (d: Date) => new Intl.DateTimeFormat('id-ID', { year: 'numeric', timeZone: DAY_TZ }).format(d)
  return `${f(from, y(from) !== y(to))} – ${f(to, true)}`
}

/** A calendar day "YYYY-MM-DD" as "27 Sep", or "Sab, 27 Sep" when long. */
export function formatDay(ymd: string, long = false): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  const base = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
  if (!long) return base
  return `${new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(d)}, ${base}`
}
