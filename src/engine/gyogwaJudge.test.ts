import { describe, it, expect } from 'vitest'
import { gyogwaLabel } from './gyogwaJudge'

describe('교과·종합전형 판정', () => {
  const margin = 0.5
  // 예: 50%컷 2.0, 70%컷 2.5
  it('내신이 50%컷 이하면 안정', () => {
    expect(gyogwaLabel(1.8, 2.0, 2.5, margin)).toBe('안정')
    expect(gyogwaLabel(2.0, 2.0, 2.5, margin)).toBe('안정')
  })
  it('50%컷과 70%컷 사이면 적정', () => {
    expect(gyogwaLabel(2.3, 2.0, 2.5, margin)).toBe('적정')
    expect(gyogwaLabel(2.5, 2.0, 2.5, margin)).toBe('적정')
  })
  it('70%컷 초과 ~ 여유 이내면 소신', () => {
    expect(gyogwaLabel(2.7, 2.0, 2.5, margin)).toBe('소신')
    expect(gyogwaLabel(3.0, 2.0, 2.5, margin)).toBe('소신')
  })
  it('여유를 넘으면 도전', () => {
    expect(gyogwaLabel(3.1, 2.0, 2.5, margin)).toBe('도전')
  })
  it('내신이나 컷이 없으면 null', () => {
    expect(gyogwaLabel(null, 2.0, 2.5, margin)).toBeNull()
    expect(gyogwaLabel(2.3, null, 2.5, margin)).toBeNull()
    expect(gyogwaLabel(2.3, 2.0, null, margin)).toBeNull()
  })
})
