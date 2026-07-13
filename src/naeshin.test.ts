import { describe, it, expect } from 'vitest'
import { emptyNaeshin, NAESHIN_COMBOS } from './naeshin'

describe('emptyNaeshin', () => {
  it('4개 교과조합을 모두 null로 초기화한다', () => {
    const n = emptyNaeshin()
    expect(Object.keys(n)).toEqual(['전교과', '국수영사과', '국수영사', '국수영과'])
    for (const combo of NAESHIN_COMBOS) {
      expect(n[combo]).toBeNull()
    }
  })
})
