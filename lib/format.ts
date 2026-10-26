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
