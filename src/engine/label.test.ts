import { describe, it, expect } from 'vitest'
import { labelOf } from './label'

describe('판정 라벨', () => {
  it('경계값대로 분류', () => {
    expect(labelOf(6)).toBe('안정')
    expect(labelOf(5)).toBe('안정')
    expect(labelOf(2)).toBe('적정')
    expect(labelOf(0)).toBe('적정')
    expect(labelOf(-1)).toBe('소신')
    expect(labelOf(-3)).toBe('소신')
    expect(labelOf(-5)).toBe('도전')
    expect(labelOf(null)).toBeNull()
  })
})
