import { describe, expect, it } from 'vitest'
import {
  formatCount,
  formatDuration,
  formatPercent,
  formatRupiah,
  formatRupiahShort,
  parseRupiah,
  relativeTimeId,
} from '@/lib/format'

describe('format', () => {
  it('formatRupiah', () => {
    expect(formatRupiah(185000)).toBe('Rp185.000')
  })

  it('formatRupiahShort rounds up so we never claim cheaper', () => {
    expect(formatRupiahShort(95000)).toBe('Rp95rb')
    expect(formatRupiahShort(95500)).toBe('Rp96rb')
    expect(formatRupiahShort(1250000)).toBe('Rp1,25jt')
    expect(formatRupiahShort(1000000)).toBe('Rp1jt')
  })

  it('parseRupiah', () => {
    expect(parseRupiah('185.000')).toBe(185000)
    expect(parseRupiah('Rp 185.000')).toBe(185000)
    expect(parseRupiah('185.000,00')).toBe(185000)
    expect(parseRupiah('185,000')).toBe(185000)
    expect(parseRupiah('')).toBeNull()
    expect(parseRupiah('abc')).toBeNull()
    expect(parseRupiah('-5000')).toBeNull()
  })

  it('formatCount and formatPercent', () => {
    expect(formatCount(1284)).toBe('1.284')
    expect(formatPercent(0.158)).toBe('15,8%')
    expect(formatPercent(null)).toBe('–')
  })

  it('formatDuration as m:ss', () => {
    expect(formatDuration(12)).toBe('0:12')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(59.6)).toBe('1:00')
  })

  it('relativeTimeId', () => {
    expect(
      relativeTimeId(new Date('2026-10-27T08:00:00Z'), new Date('2026-10-27T10:00:00Z')),
    ).toMatch(/2 jam/)
  })
})
